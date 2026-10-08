import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '../meta-cache'
import {
  ensureAdExtractionsTable,
  getAdExtraction,
  upsertClassification,
} from '@/lib/ad-extraction-db'

// ============================================================================
// POST /api/ad-tracker/classify-ad-data
// Step 2 of the deep extraction pipeline.
// Takes the raw extraction text from Step 1 and produces structured
// classification with explanations. This is a TEXT-ONLY call (no media
// re-download needed) so it's fast and cheap.
// Caches results by adId for 30 min.
// ============================================================================

// Classification enums
const VALID_HOOK_TYPES = ['curiosity', 'pain_point', 'bold_claim', 'social_proof', 'pattern_interrupt'] as const
const VALID_ANGLES = ['transformation', 'fear', 'authority', 'comparison', 'urgency', 'education'] as const
const VALID_FORMATS = ['ugc', 'talking_head', 'screen_recording', 'broll_montage', 'meme', 'static_image', 'carousel_story'] as const
const VALID_PACING = ['fast', 'medium', 'slow'] as const
const VALID_VIDEO_TYPES = ['testimonial', 'explainer', 'demo', 'story', 'reaction', 'tutorial', 'unboxing', 'comparison', 'lifestyle', 'n/a'] as const
const VALID_COPY_FRAMEWORKS = ['PAS', 'AIDA', 'BAB', '4Ps', 'storytelling', 'listicle', 'other'] as const
const VALID_AWARENESS = ['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware'] as const
const VALID_CTA_TYPES = ['direct', 'soft', 'implied', 'none'] as const
const VALID_PRODUCTION_TIERS = ['lo-fi', 'mid', 'high-production'] as const
// Image-only subclassifications. Only populated when mediaType === 'image'.
const VALID_IMAGE_SUBTYPES = [
  'product_photo', 'lifestyle_photo', 'ui_screenshot', 'infographic',
  'testimonial_card', 'meme', 'comparison_grid', 'before_after',
  'quote_card', 'advertorial_card', 'n/a',
] as const
const VALID_IMAGE_HOOK_SUBTYPES = [
  'open_loop', 'visual_contrast', 'ui_proof', 'bold_headline',
  'numbered_list', 'unexpected_visual', 'quoted_testimonial',
  'pattern_stat', 'n/a',
] as const

export interface AdClassification {
  mediaType: string
  hookType: string
  hookExplanation: string
  angle: string
  angleExplanation: string
  format: string
  formatExplanation: string
  visualPacing: string
  trueAngle: string
  videoType: string
  copywritingFramework: string
  awarenessLevel: string
  emotionalDriver: string
  ctaType: string
  productionTier: string
  summary: string
  imageSubtype?: string        // only populated for image ads
  imageHookSubtype?: string    // only populated for image ads
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

function validateClassification(raw: any): AdClassification | null {
  if (!raw || typeof raw !== 'object') return null

  const c = raw.classification || raw

  return {
    mediaType: c.mediaType || 'image',
    hookType: VALID_HOOK_TYPES.includes(c.hookType) ? c.hookType : (c.hookType || 'curiosity'),
    hookExplanation: typeof c.hookExplanation === 'string' ? c.hookExplanation.slice(0, 500) : '',
    angle: VALID_ANGLES.includes(c.angle) ? c.angle : (c.angle || 'transformation'),
    angleExplanation: typeof c.angleExplanation === 'string' ? c.angleExplanation.slice(0, 500) : '',
    format: VALID_FORMATS.includes(c.format) ? c.format : (c.format || 'static_image'),
    formatExplanation: typeof c.formatExplanation === 'string' ? c.formatExplanation.slice(0, 500) : '',
    visualPacing: VALID_PACING.includes(c.visualPacing) ? c.visualPacing : 'medium',
    trueAngle: typeof c.trueAngle === 'string' ? c.trueAngle.slice(0, 400) : '',
    videoType: VALID_VIDEO_TYPES.includes(c.videoType) ? c.videoType : (c.videoType || 'n/a'),
    copywritingFramework: VALID_COPY_FRAMEWORKS.includes(c.copywritingFramework) ? c.copywritingFramework : (c.copywritingFramework || 'other'),
    awarenessLevel: VALID_AWARENESS.includes(c.awarenessLevel) ? c.awarenessLevel : (c.awarenessLevel || 'problem_aware'),
    emotionalDriver: typeof c.emotionalDriver === 'string' ? c.emotionalDriver.slice(0, 300) : '',
    ctaType: VALID_CTA_TYPES.includes(c.ctaType) ? c.ctaType : (c.ctaType || 'direct'),
    productionTier: VALID_PRODUCTION_TIERS.includes(c.productionTier) ? c.productionTier : (c.productionTier || 'mid'),
    summary: typeof c.summary === 'string' ? c.summary.slice(0, 600) : 'Classification complete.',
    imageSubtype: c.mediaType === 'image'
      ? (VALID_IMAGE_SUBTYPES.includes(c.imageSubtype) ? c.imageSubtype : (c.imageSubtype || 'n/a'))
      : undefined,
    imageHookSubtype: c.mediaType === 'image'
      ? (VALID_IMAGE_HOOK_SUBTYPES.includes(c.imageHookSubtype) ? c.imageHookSubtype : (c.imageHookSubtype || 'n/a'))
      : undefined,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { adId, rawExtraction } = body

    if (!adId || !rawExtraction) {
      return NextResponse.json({ error: 'Missing adId or rawExtraction' }, { status: 400 })
    }

    // Check in-memory cache first, then DB
    const cacheKey = `ad-classify:${adId}`
    const cached = getCached<AdClassification>(cacheKey)
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    // Check persistent DB cache
    try {
      await ensureAdExtractionsTable()
      const dbRow = await getAdExtraction(adId)
      if (dbRow?.classification) {
        const validated = validateClassification(dbRow.classification)
        if (validated) {
          setCache(cacheKey, validated)
          return NextResponse.json({ data: validated, cached: true })
        }
      }
    } catch (dbErr) {
      console.warn('[classify-ad-data] DB lookup failed, falling back to Gemini:', dbErr)
    }

    const apiKey = process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
    }

    // Stringify the raw extraction for the prompt
    const rawText = typeof rawExtraction === 'string'
      ? rawExtraction
      : JSON.stringify(rawExtraction, null, 2)

    const prompt = `You are a world-class ad creative strategist with 20 years of experience in direct response advertising, performance marketing, and consumer psychology. You have been given a DEEP RAW EXTRACTION of an ad creative containing every observable detail.

Your task: Carefully analyze all the evidence in the raw extraction, then produce precise, evidence-grounded classifications. Think step by step for each category — first identify the relevant evidence, then determine the best classification.

IMPORTANT: Every explanation must cite SPECIFIC evidence from the extraction (quote exact text, reference specific scenes, mention specific visual details). Generic explanations are unacceptable.

═══════════════════════════════════════════════════════
RAW EXTRACTION DATA (analyze every field carefully):
═══════════════════════════════════════════════════════
${rawText}

═══════════════════════════════════════════════════════
CLASSIFICATION TASK — Think carefully before answering
═══════════════════════════════════════════════════════

Output valid JSON with this EXACT schema:

{
  "classification": {
    "mediaType": "image" | "video" | "carousel",

    "hookType": one of ["curiosity", "pain_point", "bold_claim", "social_proof", "pattern_interrupt"],
    "hookExplanation": "2-3 sentences. CITE the exact opening text/visual/audio that creates the hook. Explain the psychological mechanism. Example: 'The opening line «Stop wasting money on ads that don't convert» directly calls out the viewer's pain point of wasted ad spend, creating immediate relevance and emotional resonance.'",

    "angle": one of ["transformation", "fear", "authority", "comparison", "urgency", "education"],
    "angleExplanation": "2-3 sentences. What is the DOMINANT persuasion strategy? Cite specific ad elements. Example: 'The before/after structure showing the founder going from $0 to $50K/month positions the product as a transformation vehicle, with the persona shift being the core selling proposition.'",

    "format": one of ["ugc", "talking_head", "screen_recording", "broll_montage", "meme", "static_image", "carousel_story"],
    "formatExplanation": "1-2 sentences explaining format with production evidence.",

    "visualPacing": one of ["fast", "medium", "slow"],

    "trueAngle": "ONE sentence (max 35 words) naming the underlying human motivation this ad exploits. Ban the words 'exploit', 'leverages', 'taps into'. Ban generic psychology jargon like 'FOMO', 'status anxiety' on their own — if you use a label, you must anchor it with a concrete detail from THIS ad. Structure: '[Target] actually want [specific unmet need], and this ad frames [product] as [shortcut to that need].' Example: 'K-5 teachers actually want to reclaim their Sunday nights, and this ad frames the product as the 120-second escape from manual worksheet prep.' Bad: 'Exploits aspiration for effortless competence.' — too abstract, ban.",

    "videoType": one of ["testimonial", "explainer", "demo", "story", "reaction", "tutorial", "unboxing", "comparison", "lifestyle", "n/a"],

    "copywritingFramework": one of ["PAS", "AIDA", "BAB", "4Ps", "storytelling", "listicle", "other"],

    "awarenessLevel": one of ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"],

    "emotionalDriver": "Format: '<short_label>: <trigger_mechanism>'. Label must be 2-4 words, specific, not a mood. Good labels: 'Sunday-night prep dread', 'peer-parent comparison shame', 'wasted-hours resentment'. Bad labels: 'happiness', 'fear', 'rage at wasted time' (too generic). Trigger = ONE sentence naming the exact moment in the ad (quote it) that lights that emotion up. Max 30 words total.",

    "ctaType": one of ["direct", "soft", "implied", "none"],

    "productionTier": one of ["lo-fi", "mid", "high-production"],

    "imageSubtype": "ONLY populate if mediaType === 'image'. Otherwise OMIT this field entirely. One of ['product_photo', 'lifestyle_photo', 'ui_screenshot', 'infographic', 'testimonial_card', 'meme', 'comparison_grid', 'before_after', 'quote_card', 'advertorial_card', 'n/a']. Pick the one that most accurately describes what the image IS, structurally.",

    "imageHookSubtype": "ONLY populate if mediaType === 'image'. Otherwise OMIT this field entirely. One of ['open_loop', 'visual_contrast', 'ui_proof', 'bold_headline', 'numbered_list', 'unexpected_visual', 'quoted_testimonial', 'pattern_stat', 'n/a']. This is the IMAGE-SPECIFIC hook mechanism — finer-grained than hookType. 'open_loop' = viewer drops into the middle of a sequence (e.g. '2. Set Level') forcing completion; 'visual_contrast' = side-by-side before/after or us-vs-them; 'ui_proof' = raw UI screenshot proving the product works; 'bold_headline' = giant-text claim is the primary element; 'numbered_list' = ordered list structure; 'unexpected_visual' = visual pattern interrupt unrelated to the hook text; 'quoted_testimonial' = customer quote as the centerpiece; 'pattern_stat' = single huge number/statistic.",

    "summary": "Exactly 3 sentences, max 75 words total. Sentence 1: verdict — is this ad likely effective for its audience, yes/no, with the single sharpest piece of evidence. Sentence 2: the strongest creative choice, named specifically (quote text or describe the visual). Sentence 3: the single biggest weakness or missed opportunity, stated as something a creative director can fix tomorrow. No fluff words ('hyper-targeted', 'respects the viewer', 'lean and functional'). No hedging ('likely', 'potentially', 'seems'). Be concrete."
  }
}

═══════════════════════════════════════════════════════
PRECISE CLASSIFICATION CRITERIA
═══════════════════════════════════════════════════════

HOOK TYPE — Analyze the FIRST 3 seconds (video) or the dominant visual/text element (image):
• curiosity — Opens with a question, incomplete statement, "You won't believe...", "What if...", or reveals an unexpected fact that demands the viewer learn more. The key: there's an OPEN LOOP.
• pain_point — Opens by naming a specific problem the viewer has: "Tired of...", "Struggling with...", "If you're still doing X...". The key: the viewer sees THEIR OWN PROBLEM.
• bold_claim — Opens with a strong, provocative, or contrarian statement: "I made $100K in 30 days", "Everything you know about X is wrong", "The #1 mistake...". The key: the claim is AUDACIOUS enough to demand attention.
• social_proof — Opens with testimonials, user counts, ratings, celebrity/expert endorsement, press mentions, or crowd validation. The key: OTHERS vouch for the product first.
• pattern_interrupt — Opens with something visually or audibly unexpected that breaks the normal feed scroll: unusual visual, strange movement, jarring sound, text that looks different from typical ads. The key: it's PATTERN-BREAKING, not just good — it violates expectations.

ANGLE — The DOMINANT persuasion strategy throughout the ad (not just the hook):
• transformation — Centers on before/after, identity shift, "become a new person". The product is the vehicle for personal change.
• fear — Centers on what the viewer will LOSE, miss out on, or suffer from without action. Loss aversion, FOMO, risk of failure.
• authority — Centers on expertise, credentials, "as seen in", expert recommendations. Trust is the selling mechanism.
• comparison — Centers on us-vs-them, "unlike other products", "compared to alternatives". Competitive positioning is the strategy.
• urgency — Centers on limited time, limited supply, "act now", countdown pressure. Scarcity drives the conversion mechanism.
• education — Centers on teaching something valuable, "how to X", demonstrating knowledge. Value-first approach that builds trust through information.

COPYWRITING FRAMEWORK — Analyze the NARRATIVE STRUCTURE of the ad copy:
• PAS — Problem → Agitate (make it worse/more painful) → Solution. Must have all three stages with clear agitation.
• AIDA — Attention → Interest (features/details) → Desire (emotional want) → Action (CTA). Classic four-stage funnel.
• BAB — Before (current painful state) → After (dream state) → Bridge (the product connects them). Must show explicit contrast.
• 4Ps — Promise (bold outcome) → Picture (paint vivid scenario) → Proof (evidence it works) → Push (CTA with urgency).
• storytelling — Uses a narrative arc with characters, conflict, and resolution. The product is woven into a story.
• listicle — Uses a numbered or bulleted list of reasons, benefits, or features as the primary structure.
• other — Doesn't fit any framework above cleanly.

AWARENESS LEVEL (Eugene Schwartz scale — where is the target audience?):
• unaware — The viewer doesn't know they have a problem. The ad must create awareness of the problem first.
• problem_aware — The viewer knows the problem but doesn't know solutions exist. Ad focuses on agitating the problem.
• solution_aware — The viewer knows solutions exist but hasn't chosen one. Ad positions this as the best solution.
• product_aware — The viewer knows this specific product but hasn't purchased. Ad overcomes objections and builds urgency.
• most_aware — The viewer knows and wants the product. Ad is purely about deal/offer/CTA to close.

RESPOND ONLY WITH VALID JSON. Take your time — accuracy matters more than speed.`

    const modelName = 'gemini-3.1-flash-lite-preview'
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), 60_000)

    let res: Response
    try {
      res = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
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
      const errText = await res.text().catch(() => 'Unknown')
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      return NextResponse.json({ error: `Gemini blocked (${finishReason})` }, { status: 422 })
    }

    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textOutput) {
      throw new Error(data.promptFeedback?.blockReason ? `Blocked: ${data.promptFeedback.blockReason}` : 'No Gemini output')
    }

    const parsed = extractJson(textOutput)
    const classification = validateClassification(parsed)

    if (!classification) {
      return NextResponse.json({
        error: 'Failed to parse classification from AI',
        raw: textOutput.slice(0, 500),
      }, { status: 500 })
    }

    // Cache (in-memory + persistent DB)
    setCache(cacheKey, classification)

    // Persist to DB (fire-and-forget)
    upsertClassification(adId, classification as unknown as Record<string, any>).catch(err =>
      console.warn('[classify-ad-data] Failed to persist classification to DB:', err)
    )

    console.log(`[classify-ad-data] ✅ Classified ad "${adId}" — hook:${classification.hookType} angle:${classification.angle} format:${classification.format}`)

    return NextResponse.json({ data: classification, cached: false })
  } catch (err: any) {
    console.error('Ad Classification Error:', err)
    const message = err.name === 'AbortError'
      ? 'Classification timed out — try again'
      : (err.message || 'Unknown error')
    return NextResponse.json({ error: message }, { status: err.name === 'AbortError' ? 504 : 500 })
  }
}
