import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '../meta-cache'
import {
  ensureAdExtractionsTable,
  getAdExtraction,
  upsertCreativeSystem,
} from '@/lib/ad-extraction-db'

// ============================================================================
// POST /api/ad-tracker/extract-creative-system
// Uses Gemini to generate structured creative advertising framework data
// for a single ad creative. Sends the actual ad media (video/image) to Gemini
// so analysis is grounded in observable content — not hallucinated.
// Returns awareness questions, market desires, features/benefits matrix,
// persona profile, and creative testing notes.
// Caches by adId for 30 min.
// ============================================================================

export interface AwarenessQA {
  question: string
  answer: string
}

export interface AwarenessColumn {
  level: string
  qaPairs: AwarenessQA[]
}

export interface MarketDesires {
  primaryDesire: string
  secondaryDesires: string[]
}

export interface FeatureBenefit {
  feature: string
  benefit: string
  matchingDesire: string
  coreUSP: string
}

export interface PersonaProfile {
  ageGenderLocation: string
  visibleCharacteristics: string
  beliefs: string
  desiredStatus: string
  howProductHelps: string
  failedSolutions: string
  failureReasons: string
  failedProducts: string
  productFailureReasons: string
  dailyStruggles: string
}

export interface CreativeTestingNotes {
  testHypothesis: string
  adVariable: string
  angleUSP: string
}

export interface CreativeSystemData {
  detectedAwarenessLevel: string
  awarenessQuestions: AwarenessColumn[]
  marketDesires: MarketDesires
  featuresBenefits: FeatureBenefit[]
  persona: PersonaProfile
  testingNotes: CreativeTestingNotes
}

function extractJson(text: string): any | null {
  try {
    return JSON.parse(text)
  } catch (_e) {
    try {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end === -1) return null
      return JSON.parse(text.substring(start, end + 1))
    } catch (_e2) {
      return null
    }
  }
}

function validateSystemData(raw: any): CreativeSystemData | null {
  if (!raw || typeof raw !== 'object') return null

  const detectedAwarenessLevel: string = typeof raw.detectedAwarenessLevel === 'string'
    ? raw.detectedAwarenessLevel.slice(0, 40)
    : ''

  // Only keep Q&A columns for the detected level ± 1 (max 3 columns, max 3 Q&As each)
  const awarenessQuestions: AwarenessColumn[] = Array.isArray(raw.awarenessQuestions)
    ? raw.awarenessQuestions.map((col: any) => ({
        level: typeof col.level === 'string' ? col.level : 'Unknown',
        qaPairs: Array.isArray(col.qaPairs)
          ? col.qaPairs.slice(0, 3).map((qa: any) => ({
              question: typeof qa.question === 'string' ? qa.question.slice(0, 300) : '',
              answer: typeof qa.answer === 'string' ? qa.answer.slice(0, 500) : '',
            }))
          : [],
      })).slice(0, 3)
    : []

  const md = raw.marketDesires || {}
  const marketDesires: MarketDesires = {
    primaryDesire: typeof md.primaryDesire === 'string' ? md.primaryDesire.slice(0, 300) : '',
    secondaryDesires: Array.isArray(md.secondaryDesires)
      ? md.secondaryDesires
          .slice(0, 2)
          .map((d: any) => (typeof d === 'string' ? d.slice(0, 250) : ''))
          .filter(Boolean)
      : [],
  }

  const featuresBenefits: FeatureBenefit[] = Array.isArray(raw.featuresBenefits)
    ? raw.featuresBenefits.slice(0, 10).map((fb: any) => ({
        feature: typeof fb.feature === 'string' ? fb.feature.slice(0, 250) : '',
        benefit: typeof fb.benefit === 'string' ? fb.benefit.slice(0, 250) : '',
        matchingDesire: typeof fb.matchingDesire === 'string' ? fb.matchingDesire.slice(0, 250) : '',
        coreUSP: typeof fb.coreUSP === 'string' ? fb.coreUSP.slice(0, 250) : '',
      }))
    : []

  const p = raw.persona || {}
  const persona: PersonaProfile = {
    ageGenderLocation: typeof p.ageGenderLocation === 'string' ? p.ageGenderLocation.slice(0, 300) : '',
    visibleCharacteristics: typeof p.visibleCharacteristics === 'string' ? p.visibleCharacteristics.slice(0, 400) : '',
    beliefs: typeof p.beliefs === 'string' ? p.beliefs.slice(0, 500) : '',
    desiredStatus: typeof p.desiredStatus === 'string' ? p.desiredStatus.slice(0, 300) : '',
    howProductHelps: typeof p.howProductHelps === 'string' ? p.howProductHelps.slice(0, 400) : '',
    failedSolutions: typeof p.failedSolutions === 'string' ? p.failedSolutions.slice(0, 500) : '',
    failureReasons: typeof p.failureReasons === 'string' ? p.failureReasons.slice(0, 500) : '',
    failedProducts: typeof p.failedProducts === 'string' ? p.failedProducts.slice(0, 400) : '',
    productFailureReasons: typeof p.productFailureReasons === 'string' ? p.productFailureReasons.slice(0, 400) : '',
    dailyStruggles: typeof p.dailyStruggles === 'string' ? p.dailyStruggles.slice(0, 500) : '',
  }

  const t = raw.testingNotes || {}
  const testingNotes: CreativeTestingNotes = {
    testHypothesis: typeof t.testHypothesis === 'string' ? t.testHypothesis.slice(0, 500) : '',
    adVariable: typeof t.adVariable === 'string' ? t.adVariable.slice(0, 150) : '',
    angleUSP: typeof t.angleUSP === 'string' ? t.angleUSP.slice(0, 400) : '',
  }

  if (
    awarenessQuestions.length === 0 &&
    !marketDesires.primaryDesire &&
    featuresBenefits.length === 0
  ) {
    return null
  }

  return {
    detectedAwarenessLevel,
    awarenessQuestions,
    marketDesires,
    featuresBenefits,
    persona,
    testingNotes,
  }
}

// ============================================================================
// MEDIA HELPERS
// ============================================================================

const MAX_VIDEO_SIZE_MB = 20
const MAX_IMAGE_SIZE_MB = 5
const MEDIA_FETCH_TIMEOUT_MS = 30_000
const GEMINI_TIMEOUT_MS = 90_000

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`)
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { adId, adName, adBody, adHeadline, platform, hookType, angle, format, awarenessLevel, mediaUrl, mediaType } = body

    if (!adId) {
      return NextResponse.json({ error: 'Missing adId' }, { status: 400 })
    }

    // Check cache (in-memory, then DB)
    const cacheKey = `creative-system:${adId}`
    const cached = getCached<CreativeSystemData>(cacheKey)
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    try {
      await ensureAdExtractionsTable()
      const dbRow = await getAdExtraction(adId)
      if (dbRow?.creative_system) {
        const validated = validateSystemData(dbRow.creative_system)
        if (validated) {
          setCache(cacheKey, validated)
          return NextResponse.json({ data: validated, cached: true })
        }
      }
    } catch (dbErr) {
      console.warn('[extract-creative-system] DB lookup failed, falling back to Gemini:', dbErr)
    }

    const apiKey = process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
    }

    // ================================================================
    // DOWNLOAD MEDIA — so Gemini can actually SEE the ad
    // ================================================================
    let mediaPart: { inlineData: { mimeType: string; data: string } } | null = null

    if (mediaUrl) {
      try {
        new URL(mediaUrl) // validate

        const mediaRes = await fetchWithTimeout(mediaUrl, {}, MEDIA_FETCH_TIMEOUT_MS)
        if (mediaRes.ok) {
          const buffer = Buffer.from(await mediaRes.arrayBuffer())
          const sizeMB = buffer.byteLength / (1024 * 1024)
          const contentType = mediaRes.headers.get('content-type') || ''
          const isVideo = mediaType === 'video' || contentType.startsWith('video/')
          const maxSize = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB

          if (sizeMB <= maxSize) {
            mediaPart = {
              inlineData: {
                mimeType: contentType || (isVideo ? 'video/mp4' : 'image/jpeg'),
                data: buffer.toString('base64'),
              },
            }
            console.log(`[extract-creative-system] Media downloaded: ${sizeMB.toFixed(1)}MB ${isVideo ? 'video' : 'image'}`)
          } else {
            console.log(`[extract-creative-system] Media too large (${sizeMB.toFixed(1)}MB), proceeding with text only`)
          }
        }
      } catch (mediaErr: any) {
        console.log(`[extract-creative-system] Media download error: ${mediaErr.message}, proceeding with text only`)
      }
    }

    // ================================================================
    // BUILD PROMPT
    // ================================================================
    const adContext = [
      `Ad Name: "${adName || 'Unknown'}"`,
      platform ? `Platform: ${platform}` : '',
      adHeadline ? `Headline: "${adHeadline}"` : '',
      adBody ? `Body Copy: "${adBody}"` : '',
      hookType ? `Hook Type: ${hookType.replace(/_/g, ' ')}` : '',
      angle ? `Angle: ${angle.replace(/_/g, ' ')}` : '',
      format ? `Format: ${format.replace(/_/g, ' ')}` : '',
      awarenessLevel ? `Detected Awareness Level: ${awarenessLevel.replace(/_/g, ' ')}` : '',
    ].filter(Boolean).join('\n')

    // Compute which awareness levels to generate (detected ± 1)
    const LEVELS = ['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware'] as const
    const LEVEL_LABELS: Record<string, string> = {
      unaware: 'Unaware',
      problem_aware: 'Problem Aware',
      solution_aware: 'Solution Aware',
      product_aware: 'Product Aware',
      most_aware: 'Most Aware',
    }
    const normalized = (awarenessLevel || '').toLowerCase().replace(/\s+/g, '_')
    const detectedIdx = LEVELS.indexOf(normalized as any)
    const targetLevels = detectedIdx >= 0
      ? LEVELS.slice(Math.max(0, detectedIdx - 1), Math.min(LEVELS.length, detectedIdx + 2))
      : ['problem_aware', 'solution_aware'] as const
    const targetLevelLabels = targetLevels.map(l => LEVEL_LABELS[l])

    const mediaGroundingRule = mediaPart
      ? `
═══════════════════════════════════════════
GROUNDING RULES (CRITICAL — READ CAREFULLY)
═══════════════════════════════════════════

You have been given the ACTUAL ad creative media (video or image). You MUST:
1. Base ALL analysis on what you can OBSERVE in the media — the visuals, text overlays, people, settings, products shown, emotions displayed, tone of voice, pacing, colors, and messaging.
2. DO NOT invent features the product doesn't have. Only reference what is shown or strongly implied by the ad.
3. If the product or brand is unclear from the ad, say so — do not guess brand names or product specifics you cannot verify.
4. For the persona, build it from the target audience IMPLIED by the ad's content, visuals, and messaging style — not from generic templates.
5. Every claim in your output must be traceable to something observable in the ad creative or its copy.
6. If you're uncertain about something, flag it as "inferred" rather than stating it as fact.`
      : `
═══════════════════════════════════════════
GROUNDING RULES
═══════════════════════════════════════════

NOTE: No media file was provided. You are working from ad copy and metadata only.
1. Be transparent about what you can and cannot determine from copy alone.
2. Where the product is ambiguous, provide your best analysis but note what would need verification.
3. Focus heavily on the messaging angle, copy structure, and implied positioning rather than visual elements.`

    const prompt = `You are a world-class direct-response advertising strategist with deep expertise in Eugene Schwartz's "Breakthrough Advertising" framework, customer psychology, and performance creative testing. You've managed $50M+ in ad spend across DTC brands.

You are analyzing a SPECIFIC ad creative to reverse-engineer the complete strategic framework behind it. Your output must be so specific and insightful that a media buyer could use it to write 10 new winning ads.
${mediaGroundingRule}

═══════════════════════════════════════════
AD CREATIVE BEING ANALYZED:
═══════════════════════════════════════════
${adContext}
${mediaPart ? '\n[The actual ad media has been provided above for you to analyze directly]' : ''}

═══════════════════════════════════════════
YOUR TASK — Generate ALL 5 Sections Below
═══════════════════════════════════════════

STEP 0: DETECTED AWARENESS LEVEL

The ad's awareness level has been identified as: ${awarenessLevel ? LEVEL_LABELS[normalized] || awarenessLevel : 'not yet provided — infer it from the ad itself'}.

Echo this back in the \`detectedAwarenessLevel\` field of your output.

SECTION 1: AWARENESS-LEVEL QUESTIONS (scoped — NOT all 5 levels)

Do NOT generate Q&As for every awareness level — that is noise. Generate Q&As ONLY for these levels (the detected level plus its immediate neighbours):
${targetLevelLabels.map(l => `• ${l}`).join('\n')}

Max 3 Q&A pairs per level. These are the EXACT questions a real prospect at that stage would ask — conversational, specific, emotional, no marketing jargon. Every answer must be something this ad actually delivers or implies.

Level semantics:
• Unaware: Doesn't know they have a problem. Questions are generic life questions; answer creates a pattern interrupt.
• Problem Aware: Feels the pain, hasn't searched. Questions validate the struggle.
• Solution Aware: Knows solutions exist, hasn't picked one. Questions compare categories.
• Product Aware: Knows your product, isn't convinced. Questions demand proof and differentiation.
• Most Aware: Ready to buy. Questions are about price, deals, final objections.

SECTION 2: MARKET DESIRES (ONE primary, 0–2 secondary — NOT a list of 10)

Do NOT generate a laundry list of desires. Ten rephrased wants is hallucination, not insight. Instead commit:

• primaryDesire: The SINGLE desire this ad is channeling hardest. One sentence starting with "I want to...". The hook, body, and CTA should all point at it. If two desires both fit, pick the one with the strongest evidence in the ad — don't hedge.
• secondaryDesires: 0–2 additional desires the ad also touches. Only include a secondary desire if (a) it is structurally distinct from the primary (not a rephrase) and (b) you can point to a specific ad element that addresses it. If you can't justify two, return one or zero. Empty array is better than filler.

Every desire must be specific to THIS ad's market. Channel desires that already exist in the viewer's head; don't invent them.

SECTION 3: FEATURES → BENEFITS → DESIRES MATRIX

For each feature, trace the complete chain:
• Feature: The literal product feature or capability OBSERVABLE in the ad
• Benefit: "So you can..." — the practical outcome
• Matching Desire: DEFAULT to the primaryDesire verbatim. Only use a secondary desire when the feature clearly serves it instead.
• Core USP: Why THIS product delivers this benefit better than the alternatives

Generate 4–6 features. Quality over quantity — every entry must be grounded in something the ad actually shows.

SECTION 4: TARGET PERSONA (Identity-Based, Not Demographic)

Build from what the ad REVEALS about its intended audience through its visual choices, language register, pain points referenced, aspirations implied, and platform choices. This should feel like a real person you've interviewed. This is the ONLY persona block in the whole pipeline — everything downstream reads from here — so make it load-bearing.

SECTION 5: CREATIVE TESTING NOTES (DCT Framework, trimmed)

Only three fields. No ad concept (the hook and format already describe the concept). No ad type tag (it's noise).

• testHypothesis: "We believe that [the specific creative choice in THIS ad] will [measurable outcome — CTR, CPA, hook rate, etc.] because [reasoning grounded in the persona's psychology]". Must reference a specific element of the ad, not a generic principle.
• adVariable: What is THIS ad testing? One of: 💬 Messaging | 🎨 Visual | 🪝 Hook | 🎯 Angle | 📐 Format | 👤 Persona | 📢 CTA | 🎭 Tone
• angleUSP: The specific angle tied back to the primaryDesire from Section 2

═══════════════════════════════════════════
OUTPUT FORMAT — Valid JSON only
═══════════════════════════════════════════

{
  "detectedAwarenessLevel": "Problem Aware",
  "awarenessQuestions": [
    // 1–3 columns: only the detected level + immediate neighbours listed above
    { "level": "${targetLevelLabels[0] || 'Problem Aware'}", "qaPairs": [{ "question": "...", "answer": "..." }] }
  ],
  "marketDesires": {
    "primaryDesire": "I want to ...",
    "secondaryDesires": []  // 0–2 items, must be structurally distinct from primaryDesire
  },
  "featuresBenefits": [
    { "feature": "...", "benefit": "...", "matchingDesire": "...", "coreUSP": "..." }
    // 4–6 items
  ],
  "persona": {
    "ageGenderLocation": "...", "visibleCharacteristics": "...", "beliefs": "...",
    "desiredStatus": "...", "howProductHelps": "...", "failedSolutions": "...",
    "failureReasons": "...", "failedProducts": "...", "productFailureReasons": "...",
    "dailyStruggles": "..."
  },
  "testingNotes": {
    "testHypothesis": "...",
    "adVariable": "...",
    "angleUSP": "..."
  }
}`

    // ================================================================
    // CALL GEMINI — with media if available
    // ================================================================
    const modelName = 'gemini-3.1-flash-lite-preview'
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const parts: any[] = []
    if (mediaPart) {
      parts.push(mediaPart) // media first so Gemini processes it before text
    }
    parts.push({ text: prompt })

    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), GEMINI_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            response_mime_type: 'application/json',
          },
        }),
        signal: timeoutController.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error')
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      return NextResponse.json({ error: `Gemini blocked (${finishReason}). Try again.` }, { status: 422 })
    }

    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textOutput) {
      throw new Error(data.promptFeedback?.blockReason ? `Blocked: ${data.promptFeedback.blockReason}` : 'No Gemini output')
    }

    const parsed = extractJson(textOutput)
    const systemData = validateSystemData(parsed)

    if (!systemData) {
      return NextResponse.json({ error: 'Failed to parse creative system data from AI', raw: textOutput }, { status: 500 })
    }

    // Cache for 30 min
    setCache(cacheKey, systemData)

    // Persist to DB (fire-and-forget)
    upsertCreativeSystem(adId, systemData as unknown as Record<string, any>).catch(err =>
      console.warn('[extract-creative-system] Failed to persist to DB:', err)
    )

    return NextResponse.json({ data: systemData, cached: false })
  } catch (err: any) {
    console.error('Creative System Extraction Error:', err)
    const message = err.name === 'AbortError'
      ? 'Extraction timed out — try again'
      : (err.message || 'Unknown error')
    return NextResponse.json({ error: message }, { status: err.name === 'AbortError' ? 504 : 500 })
  }
}
