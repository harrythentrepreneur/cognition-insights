import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '../meta-cache'

// ============================================================================
// POST /api/ad-tracker/generate-strategy
// Uses Gemini Flash to generate AI-powered creative strategy recommendations
// based on aggregated DNA performance data.
// Caches results for 30 min (via meta-cache).
// ============================================================================

export interface StrategyCard {
  type: 'double_down' | 'test_new' | 'kill' | 'iterate'
  title: string
  hookType: string
  angle: string
  format: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  estimatedImpact: string
  scriptIdea: string
}

interface PerformanceGroup {
  key: string
  count: number
  totalSpend: number
  avgRoas: number
  avgCpa: number
}

interface ComboData {
  hookType: string
  angle: string
  format: string
  count: number
  totalSpend: number
  avgRoas: number
}

const VALID_TYPES = ['double_down', 'test_new', 'kill', 'iterate'] as const
const VALID_PRIORITIES = ['high', 'medium', 'low'] as const

function extractJsonArray(text: string): any[] | null {
  try {
    // Try direct parse first
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
    if (parsed.strategies && Array.isArray(parsed.strategies)) return parsed.strategies
    if (parsed.recommendations && Array.isArray(parsed.recommendations)) return parsed.recommendations
    return null
  } catch (_e) {
    // Find array in text
    try {
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']')
      if (start === -1 || end === -1) return null
      return JSON.parse(text.substring(start, end + 1))
    } catch (_e) {
      return null
    }
  }
}

function validateCard(raw: any): StrategyCard | null {
  if (!raw || typeof raw !== 'object') return null
  const type = VALID_TYPES.includes(raw.type) ? raw.type : 'iterate'
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.slice(0, 100) : null
  const reasoning = typeof raw.reasoning === 'string' ? raw.reasoning.slice(0, 400) : ''
  // Reject cards with no title or reasoning — likely garbled output
  if (!title || !reasoning) return null
  return {
    type,
    title,
    hookType: typeof raw.hookType === 'string' ? raw.hookType : 'curiosity',
    angle: typeof raw.angle === 'string' ? raw.angle : 'transformation',
    format: typeof raw.format === 'string' ? raw.format : 'ugc',
    reasoning,
    priority: VALID_PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
    estimatedImpact: typeof raw.estimatedImpact === 'string' ? raw.estimatedImpact.slice(0, 150) : '',
    scriptIdea: typeof raw.scriptIdea === 'string' ? raw.scriptIdea.slice(0, 500) : '',
  }
}

// Safe toFixed that handles NaN/undefined/null
function safeFixed(val: any, digits: number): string {
  const n = Number(val)
  return isNaN(n) || !isFinite(n) ? '0' : n.toFixed(digits)
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export async function POST(req: NextRequest) {
  try {
    const {
      hookPerformance,
      anglePerformance,
      formatPerformance,
      topCombos,
      totalCreatives,
      totalAnalyzed,
      overallRoas,
      totalSpend,
    } = await req.json() as {
      hookPerformance: PerformanceGroup[]
      anglePerformance: PerformanceGroup[]
      formatPerformance: PerformanceGroup[]
      topCombos: ComboData[]
      totalCreatives: number
      totalAnalyzed: number
      overallRoas: number
      totalSpend: number
    }

    if (!hookPerformance?.length && !anglePerformance?.length) {
      return NextResponse.json({ error: 'No performance data provided' }, { status: 400 })
    }

    // Build a deterministic cache key from the data fingerprint
    const dataFingerprint = JSON.stringify({
      hooks: (hookPerformance || []).map(h => `${h.key}:${h.count}:${safeFixed(h.avgRoas, 1)}`).sort(),
      angles: (anglePerformance || []).map(a => `${a.key}:${a.count}:${safeFixed(a.avgRoas, 1)}`).sort(),
      n: totalAnalyzed || 0,
    })
    const cacheKey = `strategy:${hashCode(dataFingerprint)}`
    const cached = getCached<StrategyCard[]>(cacheKey)
    if (cached) {
      return NextResponse.json({ strategies: cached, cached: true })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
    }

    // Build context for Gemini — all numbers use safeFixed to prevent NaN crashes
    const formatGroup = (groups: PerformanceGroup[]) =>
      (groups || []).map(g => `  - ${g.key}: ${g.count || 0} ads, ${safeFixed(g.avgRoas, 2)}x ROAS, $${safeFixed(g.totalSpend, 0)} spend, $${safeFixed(g.avgCpa, 0)} CPA`).join('\n')

    const formatCombos = (cbs: ComboData[]) =>
      (cbs || []).map((c, i) => `  ${i + 1}. ${c.hookType} × ${c.angle} × ${c.format}: ${c.count || 0} ads, ${safeFixed(c.avgRoas, 2)}x ROAS, $${safeFixed(c.totalSpend, 0)} spend`).join('\n')

    const allHookTypes = ['curiosity', 'pain_point', 'bold_claim', 'social_proof', 'pattern_interrupt']
    const allAngles = ['transformation', 'fear', 'authority', 'comparison', 'urgency', 'education']
    const allFormats = ['ugc', 'talking_head', 'screen_recording', 'broll_montage', 'meme']

    const testedHooks = new Set(hookPerformance?.map(h => h.key) || [])
    const testedAngles = new Set(anglePerformance?.map(a => a.key) || [])
    const testedFormats = new Set(formatPerformance?.map(f => f.key) || [])

    const untestedHooks = allHookTypes.filter(h => !testedHooks.has(h))
    const untestedAngles = allAngles.filter(a => !testedAngles.has(a))
    const untestedFormats = allFormats.filter(f => !testedFormats.has(f))

    const prompt = `You are a world-class performance marketing strategist. Analyze the following ad creative performance data and generate exactly 5 strategic recommendations.

PORTFOLIO OVERVIEW:
- Total creatives: ${totalCreatives || 0} (${totalAnalyzed || 0} analyzed with AI DNA)
- Overall ROAS: ${safeFixed(overallRoas, 2)}x
- Total spend: $${safeFixed(totalSpend, 0)}

PERFORMANCE BY HOOK TYPE:
${formatGroup(hookPerformance || [])}

PERFORMANCE BY ANGLE:
${formatGroup(anglePerformance || [])}

PERFORMANCE BY FORMAT:
${formatGroup(formatPerformance || [])}

TOP DNA COMBINATIONS (hook × angle × format):
${formatCombos(topCombos || [])}

UNTESTED GAPS:
- Untested hooks: ${untestedHooks.length > 0 ? untestedHooks.join(', ') : 'None — all tested'}
- Untested angles: ${untestedAngles.length > 0 ? untestedAngles.join(', ') : 'None — all tested'}
- Untested formats: ${untestedFormats.length > 0 ? untestedFormats.join(', ') : 'None — all tested'}

Generate exactly 5 strategy cards. You MUST include at least one of each type if the data supports it:
- "double_down": Scale winning combos (high ROAS + meaningful spend)
- "test_new": Test untested or underexplored combos (low ad count but interesting potential)
- "iterate": Improve decent combos by swapping one dimension (e.g. try a different hook on a winning angle)
- "kill": Stop spending on low-ROAS combos with significant spend

You MUST respond with a valid JSON array of exactly 5 objects, each matching this schema:
{
  "type": one of ["double_down", "test_new", "kill", "iterate"],
  "title": "Short punchy title (max 8 words)",
  "hookType": one of ["curiosity", "pain_point", "bold_claim", "social_proof", "pattern_interrupt"],
  "angle": one of ["transformation", "fear", "authority", "comparison", "urgency", "education"],
  "format": one of ["ugc", "talking_head", "screen_recording", "broll_montage", "meme"],
  "reasoning": "2-3 sentence explanation of WHY this strategy, referencing the data above",
  "priority": one of ["high", "medium", "low"],
  "estimatedImpact": "Brief impact statement, e.g. 'Your top combo at 3.2x ROAS'",
  "scriptIdea": "A concrete 2-3 sentence ad concept or opening hook script that uses this DNA combo"
}

Respond ONLY with the JSON array. No markdown, no wrapping.`

    const modelName = 'gemini-3.1-flash-lite-preview'
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    // Request with 30s timeout to prevent hanging
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
            temperature: 0.7,
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

    // Handle Gemini safety blocks and empty responses
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      return NextResponse.json({ error: `Gemini blocked response (${finishReason}). Try regenerating.` }, { status: 422 })
    }

    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
      const blockReason = data.promptFeedback?.blockReason
      throw new Error(blockReason ? `Prompt blocked: ${blockReason}` : 'No output from Gemini')
    }

    const rawCards = extractJsonArray(textOutput)
    if (!rawCards || rawCards.length === 0) {
      return NextResponse.json({ error: 'Failed to parse strategies from AI response', raw: textOutput }, { status: 500 })
    }

    const strategies = rawCards
      .map(validateCard)
      .filter((c): c is StrategyCard => c !== null)
      .slice(0, 6)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))

    if (strategies.length === 0) {
      return NextResponse.json({ error: 'All strategy cards failed validation — try regenerating' }, { status: 500 })
    }

    // Cache for 30 min
    setCache(cacheKey, strategies)

    return NextResponse.json({ strategies, cached: false })
  } catch (err: any) {
    console.error('Strategy Generation Error:', err)
    // Differentiate timeout from other errors
    const message = err.name === 'AbortError'
      ? 'Strategy generation timed out after 30s — try again'
      : (err.message || 'Unknown error')
    return NextResponse.json({ error: message }, { status: err.name === 'AbortError' ? 504 : 500 })
  }
}

// Simple string hash for cache key
function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
