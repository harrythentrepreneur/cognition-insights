import crypto from 'crypto'
import {
  ensureCanonicalEntitiesSchema,
  findByFingerprint,
  shortlistByEmbedding,
  insertCanonicalEntity,
  linkAdToEntity,
  logMergeDecision,
  withKindLock,
  type CanonicalEntityWithSimilarity,
  type EntityKind,
} from '@/lib/canonical-entities-db'

// ============================================================================
// Entity Merger
//
// Option 3 pipeline: fingerprint (exact) → embed → shortlist (pgvector) →
// LLM judge → decide. Merges extracted free-text entities into canonical
// rows so the canvas can aggregate metrics across similar avatars/hooks/etc.
//
// A new entity is a plain JSON object describing ONE extracted thing (e.g.
// one persona, one hook phrasing). The merger normalizes it, hashes a
// fingerprint, embeds the canonical text, shortlists top-K neighbours, and
// asks Gemini Flash-Lite whether any candidate is semantically identical
// with no actionable differentiation.
// ============================================================================

export interface EntityCandidate {
  kind: EntityKind
  label: string                    // short human-readable name
  payload: Record<string, any>     // the full extracted payload to persist
  embeddingText: string            // the text we embed/judge on
}

export interface MergeResult {
  kind: EntityKind
  entityId: string
  decision: 'fingerprint' | 'judge_matched' | 'inserted_new'
  confidence: number | null
  label: string
}

// ─── Text normalization + fingerprint ───────────────────────────────────────

function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fingerprintOf(kind: EntityKind, payload: Record<string, any>): string {
  // Deterministic: stable JSON of normalized leaf strings, hashed.
  // Missing fields, empty strings, and nulls all collapse to the same
  // canonical form so {foo:""} and {} fingerprint identically.
  const normalized = JSON.stringify(deepNormalize(payload)) || 'null'
  return crypto
    .createHash('sha256')
    .update(`${kind}::${normalized}`)
    .digest('hex')
    .slice(0, 32)
}

function deepNormalize(v: any): any {
  if (v == null) return undefined
  if (typeof v === 'string') {
    const n = normalizeText(v)
    return n.length > 0 ? n : undefined
  }
  if (Array.isArray(v)) {
    const items = v.map(deepNormalize).filter(x => x !== undefined)
    if (items.length === 0) return undefined
    return items.map(x => JSON.stringify(x)).sort()
  }
  if (typeof v === 'object') {
    const out: Record<string, any> = {}
    let hasContent = false
    for (const k of Object.keys(v).sort()) {
      const nv = deepNormalize(v[k])
      if (nv !== undefined) {
        out[k] = nv
        hasContent = true
      }
    }
    return hasContent ? out : undefined
  }
  return v
}

// ─── Gemini embedding ───────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'text-embedding-004'
const EMBED_MAX_CHARS = 8000
const EMBED_TIMEOUT_MS = 15_000

async function embedOnce(text: string, apiKey: string): Promise<number[] | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: text.slice(0, EMBED_MAX_CHARS) }] },
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn('[entity-merger] embed failed', res.status)
      return null
    }
    const data = await res.json()
    const values: number[] | undefined = data?.embedding?.values
    if (!values || values.length === 0) return null
    return values
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[entity-merger] embed timed out')
    } else {
      console.warn('[entity-merger] embed error', err?.message || err)
    }
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

async function embedText(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) return null
  const apiKey =
    process.env.GEMINI_API_KEY_2 ||
    process.env.GEMINI_API_KEY_3 ||
    process.env.GEMINI_API_KEY
  if (!apiKey) return null

  // One attempt, then one retry after a short backoff. Network flakes are
  // common enough on serverless that a single fallback is cheap insurance
  // against permanently inserting an un-embedable canonical entity.
  const first = await embedOnce(text, apiKey)
  if (first) return first
  await new Promise(r => setTimeout(r, 400))
  return embedOnce(text, apiKey)
}

// ─── LLM judge ──────────────────────────────────────────────────────────────

const JUDGE_MODEL = 'gemini-2.5-flash-lite-preview-06-17'

interface JudgeResult {
  matchedId: string | null
  reason: string
  confidence: number
  rateLimited?: boolean
}

const JUDGE_MAX_PAYLOAD_CHARS = 1200 // per candidate payload JSON
const JUDGE_TIMEOUT_MS = 20_000

function clipJson(obj: any, maxChars: number): string {
  const s = JSON.stringify(obj)
  if (s.length <= maxChars) return s
  return s.slice(0, maxChars - 1) + '…'
}

async function judgeMatch(
  kind: EntityKind,
  candidate: EntityCandidate,
  shortlist: CanonicalEntityWithSimilarity[]
): Promise<JudgeResult> {
  if (shortlist.length === 0) {
    return { matchedId: null, reason: 'no candidates', confidence: 0 }
  }

  const apiKey =
    process.env.GEMINI_API_KEY_2 ||
    process.env.GEMINI_API_KEY_3 ||
    process.env.GEMINI_API_KEY
  if (!apiKey) {
    // No key — fall back to strict embedding threshold.
    const best = shortlist[0]
    if (best.similarity >= 0.94) {
      return { matchedId: best.id, reason: 'embedding-only fallback', confidence: best.similarity }
    }
    return { matchedId: null, reason: 'no api key, similarity below 0.94', confidence: 0 }
  }

  const candidatesBlock = shortlist
    .map(
      (c, i) => `[${i + 1}] id=${c.id}
label: ${c.label.slice(0, 120)}
similarity: ${c.similarity.toFixed(3)}
payload: ${clipJson(c.payload, JUDGE_MAX_PAYLOAD_CHARS)}`
    )
    .join('\n\n')

  const prompt = `You are a strict deduplication judge for marketing ad entities of kind "${kind}".

A NEW entity was just extracted:
label: ${candidate.label.slice(0, 120)}
payload: ${clipJson(candidate.payload, JUDGE_MAX_PAYLOAD_CHARS)}

These are the top-${shortlist.length} existing canonical candidates ranked by embedding similarity:

${candidatesBlock}

TASK: Decide whether the NEW entity is semantically IDENTICAL to any ONE of the existing candidates, such that merging them would lose NO actionable differentiation for a marketing strategist.

Rules:
- Only merge if every meaningful field is the same thing (synonyms/paraphrasing OK).
- DO NOT merge if any field introduces a distinction a performance marketer would want to track separately (different age band, different core pain, different format, different desire phrasing that points to a different underlying need).
- When in doubt, return null — creating a new canonical is always safer than a wrong merge.

Return STRICT JSON only:
{
  "matchedId": "<uuid of the existing candidate>" | null,
  "reason": "<one sentence explaining the decision>",
  "confidence": <float 0..1>
}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${JUDGE_MODEL}:generateContent?key=${apiKey}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
          response_mime_type: 'application/json',
        },
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      // Surface rate-limit signal so callers (backfill) can back off.
      const rateLimited = res.status === 429
      return {
        matchedId: null,
        reason: `judge http ${res.status}`,
        confidence: 0,
        rateLimited,
      }
    }
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return { matchedId: null, reason: 'judge empty output', confidence: 0 }
    }
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      const s = text.indexOf('{')
      const e = text.lastIndexOf('}')
      if (s === -1 || e === -1) {
        return { matchedId: null, reason: 'judge parse failed', confidence: 0 }
      }
      try {
        parsed = JSON.parse(text.slice(s, e + 1))
      } catch {
        return { matchedId: null, reason: 'judge parse failed (inner)', confidence: 0 }
      }
    }
    const matchedId =
      typeof parsed.matchedId === 'string' && parsed.matchedId.length > 0 ? parsed.matchedId : null
    const reason = typeof parsed.reason === 'string' ? parsed.reason.slice(0, 300) : ''
    const confidence =
      typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0

    // Safety: the returned id must be in the shortlist.
    if (matchedId && !shortlist.some(c => c.id === matchedId)) {
      return { matchedId: null, reason: `judge returned unknown id ${matchedId}`, confidence: 0 }
    }
    return { matchedId, reason, confidence }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { matchedId: null, reason: 'judge timed out', confidence: 0 }
    }
    return { matchedId: null, reason: `judge error ${err?.message || 'unknown'}`, confidence: 0 }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── Core merge ─────────────────────────────────────────────────────────────

/**
 * Merge a single candidate into the canonical store and link the ad.
 * Returns null if the candidate is empty / unusable (missing label or
 * embeddingText) so the caller can simply skip it.
 *
 * Concurrency model:
 *   - The fingerprint fast path runs WITHOUT a lock so byte-identical
 *     re-runs stay cheap.
 *   - Embedding also runs without a lock (expensive, idempotent).
 *   - The shortlist → judge → insert critical section runs INSIDE a
 *     per-kind advisory lock so two concurrent workers with near-duplicate
 *     entities of the same kind can't both fail to see each other in the
 *     shortlist and both insert "new". Inside the lock we re-check the
 *     fingerprint in case another worker committed the same-fingerprint
 *     row between our fast path and lock acquisition.
 */
export async function mergeEntity(
  adId: string,
  candidate: EntityCandidate
): Promise<MergeResult | null> {
  // Empty/junk candidate — skip rather than pollute the canonical store.
  const label = (candidate.label || '').trim()
  const embedSource = (candidate.embeddingText || '').trim()
  if (!label || !embedSource) return null
  // Also skip if the payload has no content at all after normalization.
  if (deepNormalize(candidate.payload) === undefined) return null

  await ensureCanonicalEntitiesSchema()

  const fingerprint = fingerprintOf(candidate.kind, candidate.payload)

  // 1) Fingerprint fast path (no lock — idempotent, cheap, common case).
  const fpMatch = await findByFingerprint(candidate.kind, fingerprint)
  if (fpMatch) {
    return linkFingerprintMatch(adId, candidate, fpMatch)
  }

  // 2) Embed outside the lock — expensive (~100–500ms) and idempotent.
  const embedding = await embedText(candidate.embeddingText)

  // 3) Critical section: shortlist → judge → insert, serialized per kind
  //    so racing workers can't both insert near-duplicates.
  return withKindLock(candidate.kind, async () => {
    // 3a) Re-check fingerprint inside the lock. A concurrent worker may
    //     have committed the same-fingerprint row between our outer fast
    //     path and the moment we got the lock.
    const fpMatch2 = await findByFingerprint(candidate.kind, fingerprint)
    if (fpMatch2) {
      return linkFingerprintMatch(adId, candidate, fpMatch2)
    }

    // 3b) Shortlist (inside the lock so we see any row another worker
    //     committed just before us).
    const shortlist = embedding
      ? await shortlistByEmbedding(candidate.kind, embedding, 0.75, 5)
      : []

    // 3c) Judge.
    const judgement = await judgeMatch(candidate.kind, candidate, shortlist)

    if (judgement.matchedId) {
      await linkAdToEntity({
        adId,
        entityId: judgement.matchedId,
        kind: candidate.kind,
        confidence: judgement.confidence,
      })
      await logMergeDecision({
        kind: candidate.kind,
        adId,
        newPayload: candidate.payload,
        matchedEntityId: judgement.matchedId,
        decision: 'judge_matched',
        reason: judgement.reason,
        candidates: { shortlist: shortlist.map(s => ({ id: s.id, similarity: s.similarity })) },
      })
      const matched = shortlist.find(s => s.id === judgement.matchedId)!
      return {
        kind: candidate.kind,
        entityId: judgement.matchedId,
        decision: 'judge_matched' as const,
        confidence: judgement.confidence,
        label: matched.label,
      }
    }

    // 3d) Insert new. Race-safe: the ON CONFLICT path in
    //     insertCanonicalEntity returns the existing row without
    //     overwriting, so even if the lock ever fails we degrade to
    //     correct (if noisier) behavior.
    const inserted = await insertCanonicalEntity({
      kind: candidate.kind,
      label: candidate.label,
      payload: candidate.payload,
      fingerprint,
      embedding,
    })
    await linkAdToEntity({
      adId,
      entityId: inserted.id,
      kind: candidate.kind,
      confidence: null,
    })
    await logMergeDecision({
      kind: candidate.kind,
      adId,
      newPayload: candidate.payload,
      matchedEntityId: inserted.id,
      decision: 'inserted_new',
      reason: judgement.reason || 'no match',
      candidates: { shortlist: shortlist.map(s => ({ id: s.id, similarity: s.similarity })) },
    })
    return {
      kind: candidate.kind,
      entityId: inserted.id,
      decision: 'inserted_new' as const,
      confidence: null,
      label: inserted.label,
    }
  })
}

/**
 * Shared helper for the fingerprint-match happy path. Used by both the
 * fast path and the re-check inside the lock.
 */
async function linkFingerprintMatch(
  adId: string,
  candidate: EntityCandidate,
  fpMatch: { id: string; label: string }
): Promise<MergeResult> {
  await linkAdToEntity({
    adId,
    entityId: fpMatch.id,
    kind: candidate.kind,
    confidence: 1.0,
  })
  await logMergeDecision({
    kind: candidate.kind,
    adId,
    newPayload: candidate.payload,
    matchedEntityId: fpMatch.id,
    decision: 'fingerprint',
    reason: 'exact fingerprint match',
    candidates: null,
  })
  return {
    kind: candidate.kind,
    entityId: fpMatch.id,
    decision: 'fingerprint',
    confidence: 1.0,
    label: fpMatch.label,
  }
}

// ─── Extraction adapters ────────────────────────────────────────────────────

/**
 * Build the list of entity candidates from an ad_extractions row +
 * (optionally) a creative-system extraction. Called by the merge-entities
 * route and the backfill script.
 */
export function buildCandidates(args: {
  classification?: Record<string, any> | null
  creativeSystem?: Record<string, any> | null
}): EntityCandidate[] {
  const candidates: EntityCandidate[] = []
  const { classification, creativeSystem } = args

  // Hook — from classification's hookType + hookExplanation.
  if (classification?.hookType && classification?.hookExplanation) {
    const payload = {
      hookType: classification.hookType,
      explanation: classification.hookExplanation,
    }
    candidates.push({
      kind: 'hook',
      label: `${classification.hookType}: ${String(classification.hookExplanation).slice(0, 60)}`,
      payload,
      embeddingText: `HOOK TYPE: ${classification.hookType}\n${classification.hookExplanation}`,
    })
  }

  // Angle — from classification.angle + angleExplanation + trueAngle.
  if (classification?.angle && (classification?.angleExplanation || classification?.trueAngle)) {
    const payload = {
      angle: classification.angle,
      explanation: classification.angleExplanation || '',
      trueAngle: classification.trueAngle || '',
    }
    candidates.push({
      kind: 'angle',
      label: `${classification.angle}: ${String(classification.trueAngle || classification.angleExplanation).slice(0, 60)}`,
      payload,
      embeddingText: `ANGLE: ${classification.angle}\n${payload.trueAngle}\n${payload.explanation}`,
    })
  }

  // Persona — from creativeSystem.persona.
  const persona = creativeSystem?.persona
  if (persona && typeof persona === 'object') {
    const p = persona as Record<string, any>
    const hasContent = Object.values(p).some(v => typeof v === 'string' && v.trim().length > 0)
    if (hasContent) {
      candidates.push({
        kind: 'persona',
        label: String(p.ageGenderLocation || 'Unnamed persona').slice(0, 80),
        payload: p,
        embeddingText: [
          p.ageGenderLocation,
          p.visibleCharacteristics,
          p.beliefs,
          p.desiredStatus,
          p.dailyStruggles,
          p.failedSolutions,
        ]
          .filter(Boolean)
          .join('\n'),
      })
    }
  }

  // Desire — from creativeSystem.marketDesires.primaryDesire.
  const primaryDesire = creativeSystem?.marketDesires?.primaryDesire
  if (primaryDesire && typeof primaryDesire === 'string' && primaryDesire.trim()) {
    const secondary: string[] = Array.isArray(creativeSystem?.marketDesires?.secondaryDesires)
      ? creativeSystem.marketDesires.secondaryDesires
      : []
    candidates.push({
      kind: 'desire',
      label: primaryDesire.slice(0, 80),
      payload: { primaryDesire, secondaryDesires: secondary },
      embeddingText: [primaryDesire, ...secondary].join('\n'),
    })
  }

  // Feature/benefit — one canonical entity per row.
  const fbs = creativeSystem?.featuresBenefits
  if (Array.isArray(fbs)) {
    for (const fb of fbs) {
      if (!fb || typeof fb !== 'object') continue
      const feature = String(fb.feature || '').trim()
      const benefit = String(fb.benefit || '').trim()
      if (!feature && !benefit) continue
      candidates.push({
        kind: 'feature_benefit',
        label: `${feature} → ${benefit}`.slice(0, 80),
        payload: {
          feature,
          benefit,
          matchingDesire: fb.matchingDesire || '',
          coreUSP: fb.coreUSP || '',
        },
        embeddingText: `FEATURE: ${feature}\nBENEFIT: ${benefit}\nUSP: ${fb.coreUSP || ''}`,
      })
    }
  }

  return candidates
}

/**
 * Run the merger over every candidate derived from an ad.
 */
export async function mergeAdEntities(args: {
  adId: string
  classification?: Record<string, any> | null
  creativeSystem?: Record<string, any> | null
}): Promise<MergeResult[]> {
  const candidates = buildCandidates(args)
  const results: MergeResult[] = []
  for (const c of candidates) {
    try {
      const r = await mergeEntity(args.adId, c)
      if (r) results.push(r)
    } catch (err) {
      console.warn(`[entity-merger] failed to merge ${c.kind} for ${args.adId}`, err)
    }
  }
  return results
}
