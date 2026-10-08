import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '../meta-cache'

// ============================================================================
// POST /api/ad-tracker/synthesize-brief
// Synthesizes an ad script brief from framework + DNA tag constraints via Gemini
// ============================================================================

export interface BriefSection {
  startSec: number
  endSec: number
  slotType: string
  tagUsed: string
  visual: string
  audio: string
}

export interface SynthesizedBrief {
  justification: string
  sections: BriefSection[]
}

interface SlotInput {
  slotType: string
  tagCategory: string
  tagValue: string
  startSec: number
  endSec: number
}

function safeFixed(val: any, digits: number): string {
  const n = Number(val)
  return isNaN(n) || !isFinite(n) ? '0' : n.toFixed(digits)
}

function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      frameworkName,
      slots,
      rerollSectionIndex,
      existingSections,
      // New enriched inputs
      hookType,
      angle,
      format,
      persona,
      desires,
      features,
      customPrompts,
      extractedContext,
      brandContext,
      // Canvas overrides
      model: modelOverride,
      promptOverride,
    } = body as {
      frameworkName: string
      slots?: SlotInput[]
      rerollSectionIndex?: number
      existingSections?: BriefSection[]
      hookType?: string
      angle?: string
      format?: string
      persona?: { ageGenderLocation: string; beliefs: string; desiredStatus: string; dailyStruggles: string; howProductHelps: string }
      desires?: string[]
      features?: Array<{ feature: string; benefit: string; coreUSP?: string }>
      customPrompts?: string[]
      extractedContext?: Array<{ category: string; label: string; value: string; explanation?: string; avgRoas?: number; creativeName?: string }>
      brandContext?: { productName: string; targetAudience: string; brandVoice: string }
      model?: string
      promptOverride?: string
    }

    if (!frameworkName) {
      return NextResponse.json({ error: 'Missing framework name' }, { status: 400 })
    }

    const hasSlots = slots && slots.length > 0
    const hasEnrichment = hookType || angle || format || persona || desires?.length || features?.length || customPrompts?.length || extractedContext?.length || brandContext

    if (!hasSlots && !hasEnrichment) {
      return NextResponse.json({ error: 'No inputs provided' }, { status: 400 })
    }

    const isReroll = typeof rerollSectionIndex === 'number' && existingSections?.length
    const cacheKey = isReroll ? null : `brief:${hashCode(JSON.stringify({ frameworkName, slots, hookType, angle, format, persona, desires, features, customPrompts }))}`

    if (cacheKey) {
      const cached = getCached<SynthesizedBrief>(cacheKey)
      if (cached) return NextResponse.json({ brief: cached, cached: true })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
    }

    let prompt: string

    if (isReroll && existingSections) {
      const keepSections = existingSections
        .filter((_, i) => i !== rerollSectionIndex)
        .map(s => `[${s.startSec}s-${s.endSec}s] ${s.slotType}: Visual: "${s.visual}" | Audio: "${s.audio}"`)
        .join('\n')
      const target = existingSections[rerollSectionIndex!]

      prompt = `You are a world-class ad creative director. Rewrite ONLY the section at [${target.startSec}s-${target.endSec}s] (${target.slotType}) while keeping these other sections intact:

${keepSections}

The section to rewrite uses: "${slots?.[rerollSectionIndex!]?.tagValue?.replace(/_/g, ' ') || target.tagUsed}" ${slots?.[rerollSectionIndex!]?.tagCategory || target.slotType}

Framework: "${frameworkName}"

Respond with a JSON object: { "visual": "...", "audio": "..." }
Be specific, cinematic, and actionable. No markdown wrapping.`
    } else {
      // Build context sections for enriched prompt
      const contextParts: string[] = []

      if (brandContext?.productName) {
        contextParts.push(`BRAND:\n  Product: ${brandContext.productName}\n  Target: ${brandContext.targetAudience}\n  Voice: ${brandContext.brandVoice}`)
      }

      if (hookType) contextParts.push(`HOOK STYLE: "${hookType.replace(/_/g, ' ')}"`)
      if (angle) contextParts.push(`PERSUASION ANGLE: "${angle.replace(/_/g, ' ')}"`)
      if (format) contextParts.push(`VIDEO FORMAT: "${format.replace(/_/g, ' ')}"`)

      if (persona) {
        contextParts.push(`TARGET PERSONA:\n  Demographics: ${persona.ageGenderLocation}\n  Beliefs: ${persona.beliefs}\n  Desires: ${persona.desiredStatus}\n  Struggles: ${persona.dailyStruggles}\n  How Product Helps: ${persona.howProductHelps}`)
      }

      if (desires?.length) {
        contextParts.push(`MARKET DESIRES:\n${desires.map(d => `  - ${d}`).join('\n')}`)
      }

      if (features?.length) {
        contextParts.push(`FEATURES → BENEFITS:\n${features.map(f => `  - ${f.feature} → ${f.benefit}${f.coreUSP ? ` (USP: ${f.coreUSP})` : ''}`).join('\n')}`)
      }

      if (customPrompts?.length) {
        contextParts.push(`CUSTOM INSTRUCTIONS:\n${customPrompts.map(p => `  ${p}`).join('\n')}`)
      }

      if (extractedContext?.length) {
        // Group by label so multiple values for the same category appear together
        const byLabel = new Map<string, typeof extractedContext>()
        for (const d of extractedContext) {
          const arr = byLabel.get(d.label) || []
          arr.push(d)
          byLabel.set(d.label, arr)
        }
        const lines: string[] = []
        for (const [label, items] of byLabel) {
          if (items.length === 1) {
            const d = items[0]
            const source = d.creativeName ? ` — from "${d.creativeName}"` : ''
            const explain = d.explanation ? `\n      (context: ${d.explanation})` : ''
            lines.push(`  • ${label}: "${d.value}"${source}${explain}`)
          } else {
            lines.push(`  • ${label}:`)
            for (const d of items) {
              const source = d.creativeName ? ` — from "${d.creativeName}"` : ''
              lines.push(`      - "${d.value}"${source}`)
            }
          }
        }
        contextParts.push(`EXTRACTED DATAPOINTS (the authoritative creative data — use these directly and do not invent alternatives):\n${lines.join('\n')}`)
      }

      const context = contextParts.length > 0 ? `\n${contextParts.join('\n\n')}\n` : ''

      if (hasSlots) {
        const slotDescriptions = slots!.map(s =>
          `  - [${s.startSec}s - ${s.endSec}s] ${s.slotType.toUpperCase()}: Use "${s.tagValue.replace(/_/g, ' ')}" ${s.tagCategory}`
        ).join('\n')

        prompt = `You are a world-class performance ad creative director. Generate a complete Creative Brief using ONLY the inputs below.

STRICT GROUNDING RULES:
- Use ONLY the product, audience, claims, copy, and datapoints provided in the CONTEXT below.
- Do NOT invent product names, features, testimonials, statistics, or audience attributes that are not listed.
- If the context contains real copy (Headline, Body Copy, Hook Text, Spoken Hook, CTA Copy), reuse those exact phrasings in the relevant sections rather than paraphrasing away from them.
- If a datapoint is missing, write "N/A" for that element rather than fabricating one.
${context}
TIMELINE SLOTS:
${slotDescriptions}

Generate a brief with:
1. A "justification" string (2-3 sentences explaining the strategic rationale, referencing the persona and desires if provided)
2. A "sections" array matching EXACTLY the timeline slots above

Respond with a JSON object matching this schema EXACTLY:
{
  "justification": "Strategy explanation referencing target audience and key messaging direction...",
  "sections": [
    {
      "startSec": 0,
      "endSec": 3,
      "slotType": "hook",
      "tagUsed": "the tag value used",
      "visual": "Specific visual direction (camera angles, actions, props)",
      "audio": "Exact script/voiceover text or sound design notes"
    }
  ]
}

Rules:
- Be SPECIFIC and CINEMATIC in visual directions, but only with details derivable from the context.
- Write ACTUAL script lines for audio, not descriptions. Prefer the exact copy provided in the context.
- Each section must feel natural flowing into the next.
- If a persona is provided, tailor language and visuals to that audience exactly.
- If custom instructions are provided, follow them closely.
- Respond ONLY with the JSON object. No markdown.`
      } else {
        // No skeleton — generate a standard 4-section brief from enrichment data only
        prompt = `You are a world-class performance ad creative director. Generate a complete Creative Brief for a performance ad using ONLY the following strategic inputs.

STRICT GROUNDING RULES:
- Use ONLY the product, audience, claims, copy, and datapoints provided in the CONTEXT below.
- Do NOT invent product names, features, testimonials, statistics, or audience attributes that are not listed.
- If the context contains real copy (Headline, Body Copy, Hook Text, Spoken Hook, CTA Copy), reuse those exact phrasings in the relevant sections rather than paraphrasing away from them.
- If a datapoint is missing, write "N/A" for that element rather than fabricating one.
${context}
Generate a 4-section ad brief (Hook → Angle → Body → CTA) with:
1. A "justification" string (2-3 sentences explaining the strategic rationale)
2. A "sections" array with exactly 4 entries

Respond with a JSON object matching this schema EXACTLY:
{
  "justification": "Strategy explanation referencing target audience and key messaging direction...",
  "sections": [
    {
      "startSec": 0,
      "endSec": 3,
      "slotType": "hook",
      "tagUsed": "hook style used",
      "visual": "Specific visual direction (camera angles, actions, props)",
      "audio": "Exact script/voiceover text"
    },
    {
      "startSec": 3,
      "endSec": 15,
      "slotType": "angle",
      "tagUsed": "angle used",
      "visual": "Visual direction for the angle/problem section",
      "audio": "Script text for establishing the problem or angle"
    },
    {
      "startSec": 15,
      "endSec": 25,
      "slotType": "body",
      "tagUsed": "solution presentation",
      "visual": "Visual direction for demonstrating the solution",
      "audio": "Script text for the solution/body section"
    },
    {
      "startSec": 25,
      "endSec": 30,
      "slotType": "cta",
      "tagUsed": "call to action",
      "visual": "Visual direction for the CTA",
      "audio": "Exact CTA script text"
    }
  ]
}

Rules:
- Be SPECIFIC and CINEMATIC in visual directions
- Write ACTUAL script lines for audio, not descriptions
- If a persona is provided, tailor language and visuals to that exact audience
- If features/benefits are provided, weave them into the body section
- If custom instructions are provided, follow them closely
- Respond ONLY with the JSON object. No markdown.`
      }
    }

    // If canvas sent a full promptOverride, replace the auto-built prompt
    if (promptOverride && typeof promptOverride === 'string' && promptOverride.trim()) {
      prompt = promptOverride
    }

    const modelName = modelOverride || 'gemini-3.1-flash-lite-preview'
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), 30000)

    let res: Response
    try {
      res = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
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
    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse brief from AI', raw: textOutput }, { status: 500 })
    }

    // Handle re-roll response (just visual + audio for one section)
    if (isReroll && existingSections) {
      const updatedSections = [...existingSections]
      const target = updatedSections[rerollSectionIndex!]
      updatedSections[rerollSectionIndex!] = {
        ...target,
        visual: typeof parsed.visual === 'string' ? parsed.visual : target.visual,
        audio: typeof parsed.audio === 'string' ? parsed.audio : target.audio,
      }
      return NextResponse.json({
        brief: {
          justification: `Re-rolled section ${rerollSectionIndex! + 1}`,
          sections: updatedSections,
        },
        cached: false,
      })
    }

    // Validate full brief
    const brief: SynthesizedBrief = {
      justification: typeof parsed.justification === 'string' ? parsed.justification : 'AI-generated creative brief',
      sections: Array.isArray(parsed.sections) ? parsed.sections.map((s: any, i: number) => ({
        startSec: typeof s.startSec === 'number' ? s.startSec : slots?.[i]?.startSec ?? 0,
        endSec: typeof s.endSec === 'number' ? s.endSec : slots?.[i]?.endSec ?? 0,
        slotType: typeof s.slotType === 'string' ? s.slotType : slots?.[i]?.slotType ?? 'body',
        tagUsed: typeof s.tagUsed === 'string' ? s.tagUsed : slots?.[i]?.tagValue ?? '',
        visual: typeof s.visual === 'string' ? s.visual.slice(0, 500) : 'Visual direction pending',
        audio: typeof s.audio === 'string' ? s.audio.slice(0, 500) : 'Audio script pending',
      })) : [],
    }

    if (brief.sections.length === 0) {
      return NextResponse.json({ error: 'No sections generated' }, { status: 500 })
    }

    if (cacheKey) setCache(cacheKey, brief)

    return NextResponse.json({ brief, cached: false })
  } catch (err: any) {
    console.error('Brief Synthesis Error:', err)
    const message = err.name === 'AbortError'
      ? 'Synthesis timed out after 30s — try again'
      : (err.message || 'Unknown error')
    return NextResponse.json({ error: message }, { status: err.name === 'AbortError' ? 504 : 500 })
  }
}
