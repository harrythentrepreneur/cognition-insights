import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '../meta-cache'
import {
  ensureAdExtractionsTable,
  getAdExtraction,
  upsertRawExtraction,
} from '@/lib/ad-extraction-db'

// ============================================================================
// POST /api/ad-tracker/extract-ad-raw
// Step 1 of the deep extraction pipeline.
// Sends actual ad media to Gemini and extracts an EXHAUSTIVE raw analysis:
//   - Scene-by-scene video breakdown with exact dialogue
//   - Ultra-detailed image description
//   - Carousel per-slide analysis
//   - All text overlays captured verbatim
//   - Raw observations (no classification)
//   - Ad copy preserved untouched
// Caches results by adId for 30 min.
// ============================================================================

const MAX_VIDEO_SIZE_MB = 20
const MAX_IMAGE_SIZE_MB = 5
const MEDIA_FETCH_TIMEOUT_MS = 30_000
const GEMINI_TIMEOUT_MS = 120_000 // longer timeout for deep analysis
const VIDEO_POLL_MAX_ATTEMPTS = 20
const VIDEO_POLL_INTERVAL_MS = 2000

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
// AD CONTEXT SANITIZATION
// Meta ads are full of DCO placeholders, test slugs, and hash suffixes.
// If we pipe those raw into Gemini, it treats them as real copy. Strip them.
// ============================================================================

interface SanitizedContext {
  cleanName: string | null
  cleanHeadline: string | null
  cleanBody: string | null
  cleanDescription: string | null
  dctVariant: string | null
  targetingHints: string | null
  stripped: string[]  // notes on what we removed, surfaced to the prompt for transparency
}

function stripPlaceholdersAndHashes(val: string | null | undefined): { clean: string | null; stripped: string[] } {
  if (!val || typeof val !== 'string') return { clean: null, stripped: [] }
  const stripped: string[] = []
  let s = val

  // Meta DCO placeholders like {{product.name}}, {{ad.name}}
  if (/\{\{[^}]+\}\}/.test(s)) {
    stripped.push('Meta DCO placeholder')
    s = s.replace(/\{\{[^}]+\}\}/g, '').trim()
  }

  // Date-hash suffixes like "2026-03-21-f9b94c1f49cf35cf2c80781dce4b2045"
  if (/\b\d{4}-\d{2}-\d{2}-[a-f0-9]{16,}\b/i.test(s)) {
    stripped.push('date-hash suffix')
    s = s.replace(/\b\d{4}-\d{2}-\d{2}-[a-f0-9]{16,}\b/gi, '').trim()
  }

  // Standalone long hex hashes (32+ chars)
  if (/\b[a-f0-9]{32,}\b/i.test(s)) {
    stripped.push('hex hash')
    s = s.replace(/\b[a-f0-9]{32,}\b/gi, '').trim()
  }

  // Collapse whitespace and leftover separators
  s = s.replace(/\s+/g, ' ').replace(/^[\s\-_|/]+|[\s\-_|/]+$/g, '').trim()

  return { clean: s.length > 0 ? s : null, stripped }
}

function parseDctSlug(name: string | null | undefined): {
  cleanName: string | null
  dctVariant: string | null
  targetingHints: string | null
  stripped: string[]
} {
  if (!name) return { cleanName: null, dctVariant: null, targetingHints: null, stripped: [] }

  // Typical Meta naming: "Ad #1//DCT #3//Simple Step 1 Step 2 Step 3//22 - 65+//AU//*"
  const parts = name.split(/\s*\/\/\s*/).map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) {
    return { cleanName: name, dctVariant: null, targetingHints: null, stripped: [] }
  }

  const stripped = ['DCT slug structure']
  let dctVariant: string | null = null
  const targetingParts: string[] = []
  const conceptParts: string[] = []

  for (const part of parts) {
    if (/^Ad\s*#?\d+$/i.test(part)) continue                    // "Ad #1"
    if (/^DCT\s*#?\d+$/i.test(part)) { dctVariant = part; continue }  // "DCT #3"
    if (/^\d+\s*-\s*\d+\+?$/.test(part)) { targetingParts.push(`age ${part}`); continue }  // "22 - 65+"
    if (/^[A-Z]{2}(,[A-Z]{2})*$/.test(part)) { targetingParts.push(`geo ${part}`); continue }  // "AU" / "US,CA"
    if (/^\*+$/.test(part)) continue                            // wildcard marker
    conceptParts.push(part)
  }

  return {
    cleanName: conceptParts.length > 0 ? conceptParts.join(' — ') : null,
    dctVariant,
    targetingHints: targetingParts.length > 0 ? targetingParts.join(', ') : null,
    stripped,
  }
}

function sanitizeAdContext(input: {
  adName?: string
  adHeadline?: string
  adBody?: string
  adDescription?: string
}): SanitizedContext {
  const allStripped: string[] = []

  const nameResult = parseDctSlug(input.adName)
  allStripped.push(...nameResult.stripped)

  // Even after parsing the slug, the concept part may contain placeholders/hashes
  const cleanName = stripPlaceholdersAndHashes(nameResult.cleanName)
  allStripped.push(...cleanName.stripped)

  const cleanHeadline = stripPlaceholdersAndHashes(input.adHeadline)
  allStripped.push(...cleanHeadline.stripped)

  const cleanBody = stripPlaceholdersAndHashes(input.adBody)
  allStripped.push(...cleanBody.stripped)

  const cleanDescription = stripPlaceholdersAndHashes(input.adDescription)
  allStripped.push(...cleanDescription.stripped)

  return {
    cleanName: cleanName.clean,
    cleanHeadline: cleanHeadline.clean,
    cleanBody: cleanBody.clean,
    cleanDescription: cleanDescription.clean,
    dctVariant: nameResult.dctVariant,
    targetingHints: nameResult.targetingHints,
    stripped: Array.from(new Set(allStripped)),
  }
}

function detectMediaType(url: string, contentType: string | null): 'video' | 'image' {
  const ct = (contentType || '').toLowerCase()
  if (ct.startsWith('video/')) return 'video'
  if (ct.startsWith('image/')) return 'image'
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext || '')) return 'video'
  return 'image'
}

// ============================================================================
// PROMPTS — media-type specific for MAXIMUM depth
// ============================================================================

function buildImagePrompt(adContext: string): string {
  return `You are a senior direct-response ad strategist reverse-engineering this image ad. Your goal: extract everything needed so a creative team could replicate this ad's strategy for a different product.

Focus on the AD STRATEGY, not generic image description. What is the hook? What is the offer? Who is the avatar? What copy framework is used? What makes someone stop scrolling and click?

${adContext}

Output valid JSON matching this schema. Be detailed and specific:

{
  "mediaType": "image",
  "adType": "The type of ad: product photo, lifestyle, testimonial card, before-after, infographic, meme, UGC screenshot, quote card, comparison, carousel, advertorial, or other. Be specific.",
  "adStructure": {
    "hook": "The ACTUAL hook line, verbatim, as if you were writing it into a creative brief. Quote the biggest headline / bold claim / opening text EXACTLY as it appears — a copywriter should be able to paste this directly into a new ad. Do NOT describe it ('a bold claim about...'), do NOT paraphrase. 1-2 sentences, max 30 words. If the hook is purely visual (no text), give a single-line description of the specific visual moment that stops the scroll.",
    "body": "What is the main message after the hook? How does the ad build interest or desire? What copy, visuals, or proof elements carry the middle of the ad?",
    "offer": "What is being offered? Product, service, lead magnet, free trial? What's the value proposition? Quote any pricing, discounts, or deal terms exactly.",
    "cta": "The call to action — button text, spoken/written CTA, link preview text. Quote exactly. If implied (no explicit CTA), describe what action the viewer is expected to take.",
    "copyFramework": "What copywriting framework is used? PAS (Problem-Agitate-Solution), AIDA (Attention-Interest-Desire-Action), BAB (Before-After-Bridge), testimonial, listicle, comparison, educational, or other. Explain which parts of the ad map to which stage."
  },
  "script": {
    "allTextInAd": ["VERBATIM text only. Each entry must be a COMPLETE readable chunk you can see clearly (a full headline, a full button label, a full sentence of body copy). STRICT RULES: (1) Copy letter-for-letter — if you can't confidently read a character, omit the whole chunk. (2) Never output partial words, phonetic guesses, OCR-style fragments, or reconstructions. Outputs like 'l'mma', 'e is n', 'nework' are FORBIDDEN — if you catch yourself producing a broken fragment, drop the entry. (3) Preserve original casing, punctuation, and line breaks. (4) Prefer an empty array [] over guessing. (5) Do not invent text you 'think' is probably there based on the product. Only transcribe what is actually rendered on the image."],
    "headlineCopy": "The primary headline or biggest text element — verbatim.",
    "bodyCopy": "Secondary text / supporting copy — verbatim.",
    "ctaCopy": "CTA button or action text — verbatim."
  },
  "creativeDetails": {
    "peopleInAd": "Role (founder / real customer / actor / influencer / none), demographics (age band + gender + apparent ethnicity), and what they do on camera in ONE line. If none, write 'None'. Do NOT describe clothing or lighting unless it's doing strategic work (e.g. 'deliberately frumpy to signal real customer').",
    "productShown": "How the product appears, in ONE line. Format: '<type of display> — <what it proves>'. Example: 'in-hand unboxing — proves physical existence and tactile quality', or 'web UI screenshot — proves speed of the core action'. If not shown, write 'Not shown' and stop.",
    "proofElements": "List ONLY concrete proof: verbatim testimonial quotes, star ratings with numbers, user counts with numbers, named press logos, before/after numbers, specific statistical claims. No vague 'professional tone' entries. If none, write 'None' — do not pad.",
    "urgency": "Concrete scarcity/urgency device only: countdown timer, stock count, dated discount, seasonal deadline. Quote the exact text. If none, write 'None' — do not invent implied urgency."
  },
  "visualCraft": {
    "scrollStopper": "The ONE element that breaks feed scroll. Format: '<specific element> because <mechanism>'. Concrete, not generic. Example: 'Mid-sequence numbered step (2 of 3) because it creates an open loop forcing the viewer to mentally fill in steps 1 and 3.' Ban vague entries like 'bold colors', 'eye-catching design'.",
    "visualHierarchy": ["Ordered list of what the eye lands on 1st, 2nd, 3rd. Max 3 items. Each item format: '<element> — <strategic role>'. Example: 'Big numeral \"2\" — pattern interrupt / open loop'."],
    "layoutTemplate": "The replicable recipe in ONE line so a designer could rebuild this ad for a different product. Name the structural slots, not the specific content. Example: 'Numbered step card (N of 3) + real UI screenshot per step + single specific example label per step'. This is the single most reusable output — treat it as a template a junior designer could execute.",
    "colorAndContrast": "Dominant palette in 3-5 words + where contrast is weaponized, in ONE line. Example: 'Muted pastels; high-contrast black numeral against white UI — draws eye to hook'. If unremarkable, write 'Unremarkable' and stop.",
    "textToVisualRatio": "minimal / balanced / text-heavy — one word + ONE line explaining why it suits this ad's job.",
    "nativeness": "native_ugc / polished_ad / obviously_ad — ONE word + ONE line on how much it blends into a feed vs. announces itself as paid media."
  },
  "avatarAndMarket": {
    "targetAvatar": "Who this ad is for, INFERRED from ALL signals (copy vocabulary, UI content, proof, visual language, implied problem, placement). Be specific — not 'millennials' but 'parents of 8-14yo kids struggling with school math who don't trust generic tutoring apps'. Even if no person appears in the ad, triangulate. If signals genuinely conflict, write 'Unclear — <name the conflict>'.",
    "avatarEvidence": "The specific signals you used to infer the avatar, in 1-2 lines. Name each signal. Example: 'UI shows \"Build confidence in Math\" + ad name flags AU 22-65+ + \"build confidence\" is parent-speak not student-speak + no gamification = skews parent-of-struggling-kid rather than self-directed adult learner.'",
    "marketSophistication": "Schwartz level 1-5 (1=direct claim, 2=bigger claim, 3=mechanism, 4=unique mechanism, 5=identity/experience). Format: '<level> — <one-line justification>'.",
    "awarenessAssumed": "unaware / problem_aware / solution_aware / product_aware / most_aware — what state this ad assumes the viewer is in, with ONE-line evidence from the ad itself.",
    "implicitPromise": "The core emotional promise, NOT the literal feature. Literal example: 'personalized curriculum'. Implicit example: 'You'll finally feel in control of your kid's learning without begging a tutor.' ONE sentence.",
    "coreDesire": "The underlying human desire being tapped — status, control, belonging, ease, certainty, novelty, identity, etc. ONE word + ONE-line justification tied to a specific ad element."
  }
}

Rules:
- Capture ALL text EXACTLY as written — verbatim, no paraphrasing.
- Focus on AD STRATEGY, not pixel-level visual description.
- Be specific about WHO this targets and WHY the hook works.
- For avatar inference: triangulate from copy, UI content, proof, tone, and placement. Do not refuse to infer just because no person is shown — a skilled strategist can read the avatar off a UI screenshot. Only say 'Unclear' if signals genuinely conflict.
- Every field must be concrete. If you catch yourself writing generic filler ('engaging', 'eye-catching', 'professional tone', 'modern design'), delete it and either be specific or write 'None' / 'Unremarkable'.

RESPOND ONLY WITH VALID JSON.`
}

function buildVideoPrompt(adContext: string): string {
  return `You are a senior direct-response ad strategist reverse-engineering this video ad. Watch the ENTIRE video carefully. Your goal: extract the full script, ad structure with timestamps, hook strategy, target avatar, and everything needed so a creative team could replicate this ad's strategy for a different product.

Focus on AD STRATEGY: the script, the structure, who it targets, how it sells. Not generic video description.

${adContext}

WATCH THE FULL VIDEO. Output valid JSON matching this schema:

{
  "mediaType": "video",
  "adType": "The type of video ad: UGC testimonial, talking head, product demo, screen recording, lifestyle/B-roll montage, explainer, reaction, tutorial, unboxing, story/narrative, comparison, slideshow, or other. Be specific.",
  "totalDuration": "Exact or estimated duration (e.g., '0:32')",
  "adStructure": {
    "hook": {
      "timestamp": "0:00-0:03 (or however long the hook runs)",
      "script": "The ACTUAL hook line, verbatim, as if you were writing it into a creative brief. This is the single most important field — a copywriter should be able to paste this directly into a new ad. If the hook is spoken, quote the exact words said (or the opening line + any essential second sentence that completes the thought). If the hook is a title card / text overlay with no voiceover, quote that text verbatim. Do NOT describe the hook ('the founder says she was tired'), do NOT paraphrase, do NOT summarize ('hook about teacher burnout'). Give the literal words. 1-2 sentences, max 30 words.",
      "visual": "ONE sentence (max 25 words) naming the specific visual moment that stops the scroll. Format: '<subject> <action> <setting/prop>'. Be concrete: name the person's role, the prop/product, the action. Example: 'Burned-out teacher holding a stack of crumpled phonics worksheets, staring at laptop'. Ban vague phrases like 'engaging visuals', 'compelling imagery', 'eye-catching'.",
      "whyItWorks": "ONE sentence (max 25 words) naming the specific psychological trigger. Format: '<viewer feeling> because <ad element>'. Be concrete. Example: 'Teachers recognize their own Sunday-night prep exhaustion because the worksheet prop mirrors their desk'. Ban generic terms: 'curiosity', 'engaging', 'grabs attention' — name a real emotion + the exact evidence."
    },
    "body": [
      {
        "timestamp": "0:03-0:15",
        "section": "Problem / Agitation / Story / Demo / Proof — what role does this section play?",
        "script": "EXACT words spoken — verbatim.",
        "textOnScreen": "On-screen text for THIS section ONLY, verbatim. Same anti-hallucination rules as allTextOverlays: complete readable chunks only, no partial fragments, no phonetic guesses, empty string is fine if nothing readable is on screen.",
        "visual": "What's happening visually."
      }
    ],
    "cta": {
      "timestamp": "When the CTA appears",
      "script": "Exact spoken CTA — verbatim.",
      "textOnScreen": "Exact CTA text on screen — verbatim.",
      "offer": "What is being offered? Free trial, discount, product, lead magnet?"
    },
    "copyFramework": "What copywriting framework does the full ad follow? PAS, AIDA, BAB, 4Ps, storytelling, listicle, tutorial, or other. Map each section of the ad to the framework stages."
  },
  "script": {
    "fullTranscript": "COMPLETE verbatim transcript — every word spoken from start to finish. Speaker labels if multiple. Include [pauses], [music cues], [sound effects].",
    "allTextOverlays": ["VERBATIM on-screen text only. Each entry must be a COMPLETE readable chunk (a full headline card, a full caption line, a full UI label, a full spoken-sentence subtitle). STRICT RULES: (1) Copy letter-for-letter — if a chunk is blurred, moving too fast to read confidently, or partially obscured, OMIT IT ENTIRELY. Do not guess. (2) Never output partial words, phonetic reconstructions, broken fragments, or mid-word slices. Outputs like 'l'mma', 'e is n', 'nework', 'to be going to' (when it's actually part of a longer phrase you couldn't catch) are FORBIDDEN. If you can't read the whole chunk confidently, drop the entry. (3) Preserve original casing, punctuation, and line breaks. (4) Deduplicate — if the same overlay appears multiple times, list it once. (5) Prefer a short but accurate list (or empty []) over a long list containing any hallucinated fragments. (6) Do not invent text you 'think' is probably on screen based on what the product does."],
    "spokenHook": "The exact first sentence or phrase spoken — verbatim.",
    "spokenCTA": "The exact CTA words spoken — verbatim. If none spoken, say 'No spoken CTA'."
  },
  "creativeDetails": {
    "peopleInAd": "Role (founder / real customer / paid actor / influencer / none), demographics (age band + gender + apparent ethnicity), and what they DO on camera in ONE line. If none, write 'None'. Ban wardrobe/lighting commentary unless it's doing strategic work (e.g. 'deliberately frumpy to signal authenticity').",
    "productShown": "How the product appears across the video, in ONE line. Format: '<type of display> at <timestamp> — <what it proves>'. Example: 'live UI screen-record at 0:03 — proves the 120-second claim is real'. If not shown, write 'Not shown' and stop.",
    "musicAndAudio": "ONE line. Format: '<music style or Silent> / <voiceover: gender + tone + accent, or None> / <notable SFX, or None>'. Example: 'Upbeat lo-fi / female US conversational VO / keyboard-tap SFX'. If fully silent, write 'Silent / None / None'.",
    "subtitles": "'Burned-in' or 'None'. If burned-in, add 4-word style note (e.g. 'Burned-in — bold white w/ yellow highlight keywords'). Stop there.",
    "proofElements": "ONLY concrete proof: verbatim testimonial quotes with speaker role, star ratings with numbers, named press logos, before/after numbers, specific statistical claims. If none, write 'None' — do not pad with 'professional tone' or similar non-proof.",
    "urgency": "Concrete scarcity/urgency device only: countdown, stock count, dated discount, seasonal deadline. Quote the exact text or timestamp. If none, write 'None' — do not invent implied urgency."
  }
}

CRITICAL RULES:
- WATCH THE FULL VIDEO — do not just analyze the first frame or thumbnail.
- Transcribe EVERY word spoken — the full script is the most important output.
- Break the ad structure into timed sections (hook, body segments, CTA) with timestamps.
- Create a body section entry for EVERY distinct section/topic change in the ad.
- Capture ALL text overlays EXACTLY as written.
- Focus on ad strategy, not generic video description.

RESPOND ONLY WITH VALID JSON.`
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      adId, mediaUrl, mediaType: clientMediaType,
      adName, adHeadline, adBody, adDescription, linkUrl,
    } = body

    if (!adId || !mediaUrl) {
      return NextResponse.json({ error: 'Missing adId or mediaUrl' }, { status: 400 })
    }

    try { new URL(mediaUrl) } catch (_e) {
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 })
    }

    // Check in-memory cache first, then DB
    const cacheKey = `ad-raw:${adId}`
    const cached = getCached<any>(cacheKey)
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    // Check persistent DB cache (survives restarts, never expires for extractions)
    try {
      await ensureAdExtractionsTable()
      const dbRow = await getAdExtraction(adId)
      if (dbRow?.raw_extraction) {
        // Populate in-memory cache for subsequent requests
        setCache(cacheKey, dbRow.raw_extraction)
        return NextResponse.json({ data: dbRow.raw_extraction, cached: true })
      }
    } catch (dbErr) {
      console.warn('[extract-ad-raw] DB lookup failed, falling back to Gemini:', dbErr)
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
    }

    // ── Download media ──
    const mediaRes = await fetchWithTimeout(mediaUrl, {}, MEDIA_FETCH_TIMEOUT_MS)
    if (!mediaRes.ok) {
      return NextResponse.json({
        error: `Failed to fetch media (${mediaRes.status}): ${mediaUrl.substring(0, 80)}...`,
      }, { status: 502 })
    }

    const contentType = mediaRes.headers.get('content-type')
    const detectedType = detectMediaType(mediaUrl, contentType)
    const mediaType = clientMediaType === 'video' ? 'video' : detectedType
    const buffer = Buffer.from(await mediaRes.arrayBuffer())
    const sizeMB = buffer.byteLength / (1024 * 1024)

    // Warn if client says video but the actual content is an image
    if (clientMediaType === 'video' && detectedType === 'image') {
      console.warn(`[extract-ad-raw] ⚠️ Client sent mediaType=video but content-type is "${contentType}" — likely a thumbnail fallback, not actual video. Analysis will be image-based.`)
    }

    // Sanitize Meta metadata before feeding to Gemini — strips DCO placeholders,
    // date-hash suffixes, and DCT naming-convention slugs that would otherwise
    // pollute the creative analysis.
    const sanitized = sanitizeAdContext({ adName, adHeadline, adBody, adDescription })

    const adContext = [
      `═══ AD METADATA ═══`,
      sanitized.cleanName ? `Ad Concept: "${sanitized.cleanName}"` : 'Ad Concept: (none provided)',
      sanitized.cleanHeadline ? `Headline: "${sanitized.cleanHeadline}"` : '',
      sanitized.cleanBody ? `Body Copy: "${sanitized.cleanBody}"` : '',
      sanitized.cleanDescription ? `Description: "${sanitized.cleanDescription}"` : '',
      linkUrl ? `Destination URL: ${linkUrl}` : '',
      sanitized.dctVariant ? `Test Variant: ${sanitized.dctVariant} (Dynamic Creative Test — this ad is one of several variants being A/B tested)` : '',
      sanitized.targetingHints ? `Targeting: ${sanitized.targetingHints}` : '',
      sanitized.stripped.length > 0
        ? `Note: the following was stripped from raw metadata before analysis — ${sanitized.stripped.join(', ')}. Do NOT try to reconstruct or guess at stripped content. Only analyze what is actually rendered in the media.`
        : '',
    ].filter(Boolean).join('\n')

    const modelName = 'gemini-3.1-flash-lite-preview'
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const prompt = mediaType === 'video'
      ? buildVideoPrompt(adContext)
      : buildImagePrompt(adContext)

    const payload: any = {
      contents: [{ parts: [] as any[] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16384,
        response_mime_type: 'application/json',
      },
    }

    // ── Attach media ──
    if (mediaType === 'video') {
      if (sizeMB > MAX_VIDEO_SIZE_MB) {
        return NextResponse.json({
          error: `Video too large (${sizeMB.toFixed(1)}MB). Max: ${MAX_VIDEO_SIZE_MB}MB.`,
        }, { status: 413 })
      }

      const mimeType = contentType || 'video/mp4'

      // Upload video to Gemini File API
      const initRes = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': buffer.byteLength.toString(),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file: { display_name: `ad_raw_${adId}` } }),
        },
        15000,
      )
      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => 'Unknown')
        throw new Error(`Video upload init failed (${initRes.status}): ${errText.slice(0, 200)}`)
      }

      const uploadUrl = initRes.headers.get('x-goog-upload-url')
      if (!uploadUrl) throw new Error('Gemini did not return upload URL')

      const uploadRes = await fetchWithTimeout(uploadUrl, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'upload, finalize',
          'X-Goog-Upload-Offset': '0',
          'Content-Length': buffer.byteLength.toString(),
        },
        body: buffer,
      }, 30000)
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => 'Unknown')
        throw new Error(`Video upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`)
      }

      const fileData = await uploadRes.json()
      const fileName = fileData?.file?.name
      if (!fileName) throw new Error('Gemini did not return file name after upload')

      // Poll for readiness
      let isReady = false
      let attempts = 0
      while (!isReady && attempts < VIDEO_POLL_MAX_ATTEMPTS) {
        const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`)
        if (!checkRes.ok) throw new Error(`Video status check failed (${checkRes.status})`)
        const checkData = await checkRes.json()
        if (checkData.state === 'ACTIVE') {
          isReady = true
        } else if (checkData.state === 'FAILED') {
          throw new Error(`Video processing failed: ${checkData.error?.message || 'Unknown'}`)
        } else {
          const delay = Math.min(VIDEO_POLL_INTERVAL_MS * Math.pow(1.3, Math.max(0, attempts - 2)), 8000)
          await new Promise((r) => setTimeout(r, delay))
          attempts++
        }
      }
      if (!isReady) throw new Error(`Video processing timed out after ${attempts} attempts`)

      payload.contents[0].parts.push({
        fileData: { mimeType: fileData.file.mimeType, fileUri: fileData.file.uri },
      })

      // Schedule cleanup
      cleanupGeminiFile(fileName, apiKey).catch(() => {})
    } else {
      // Image
      if (sizeMB > MAX_IMAGE_SIZE_MB) {
        return NextResponse.json({
          error: `Image too large (${sizeMB.toFixed(1)}MB). Max: ${MAX_IMAGE_SIZE_MB}MB.`,
        }, { status: 413 })
      }
      const base64 = buffer.toString('base64')
      const mimeType = contentType || 'image/jpeg'
      payload.contents[0].parts.push({
        inlineData: { mimeType, data: base64 },
      })
    }

    // Add the text prompt after media
    payload.contents[0].parts.push({ text: prompt })

    // ── Call Gemini ──
    console.log(`[extract-ad-raw] Calling Gemini for ${mediaType} ad "${adName}" (${sizeMB.toFixed(1)}MB) — contentType: ${contentType}, url: ${mediaUrl.substring(0, 80)}...`)

    const generateRes = await fetchWithTimeout(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, GEMINI_TIMEOUT_MS)

    if (!generateRes.ok) {
      const errText = await generateRes.text().catch(() => 'Unknown')
      throw new Error(`Gemini API error (${generateRes.status}): ${errText.slice(0, 200)}`)
    }

    const generateData = await generateRes.json()
    const finishReason = generateData.candidates?.[0]?.finishReason
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      return NextResponse.json({
        error: `Analysis blocked by safety filter (${finishReason}). This ad may contain flagged content.`,
      }, { status: 422 })
    }

    const textOutput = generateData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textOutput) {
      const blockReason = generateData.promptFeedback?.blockReason
      throw new Error(blockReason ? `Prompt blocked: ${blockReason}` : 'No output from Gemini')
    }

    const rawData = extractJson(textOutput)
    if (!rawData) {
      return NextResponse.json({
        error: 'Failed to parse raw extraction from AI',
        raw: textOutput.slice(0, 500),
      }, { status: 500 })
    }

    // Attach ad copy — merge Meta API fields with anything Gemini extracted from the media
    const script = rawData.script || {}
    const structure = rawData.adStructure || {}
    rawData.rawAdCopy = {
      // From Meta API (sanitized — DCO placeholders and hash suffixes removed)
      headline: sanitized.cleanHeadline,
      body: sanitized.cleanBody,
      description: sanitized.cleanDescription,
      linkUrl: linkUrl || null,
      // From Gemini's analysis of the creative itself
      fullTranscript: script.fullTranscript || script.fullScript || null,
      allTextOverlays: script.allTextOverlays || script.allTextInAd || [],
      spokenHook: script.spokenHook || structure.hook?.script || null,
      spokenCTA: script.spokenCTA || structure.cta?.script || null,
      ctaOffer: structure.cta?.offer || null,
      hookText: structure.hook?.script || script.headlineCopy || null,
    }

    // Persist parsed Meta metadata (DCT variant, targeting) alongside the extraction
    rawData.metaContext = {
      adConcept: sanitized.cleanName,
      dctVariant: sanitized.dctVariant,
      targetingHints: sanitized.targetingHints,
      strippedNoise: sanitized.stripped,
    }

    // Cache the result (in-memory + persistent DB)
    setCache(cacheKey, rawData)

    // Persist to DB (fire-and-forget — don't block the response)
    upsertRawExtraction(adId, rawData).catch(err =>
      console.warn('[extract-ad-raw] Failed to persist extraction to DB:', err)
    )

    console.log(`[extract-ad-raw] ✅ Complete for "${adName}" — ${mediaType}, ${Object.keys(rawData.rawMediaAnalysis || {}).length} fields extracted`)

    return NextResponse.json({ data: rawData, cached: false })
  } catch (err: any) {
    console.error('Raw Extraction Error:', err)
    const message = err.name === 'AbortError'
      ? 'Extraction timed out — media may be too large'
      : (err.message || 'Unknown error')
    return NextResponse.json({ error: message }, { status: err.name === 'AbortError' ? 504 : 500 })
  }
}

async function cleanupGeminiFile(fileName: string, apiKey: string): Promise<void> {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      { method: 'DELETE' },
    )
  } catch (_e) { /* files expire automatically */ }
}
