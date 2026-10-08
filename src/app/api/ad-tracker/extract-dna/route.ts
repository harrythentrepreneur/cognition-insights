import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '../meta-cache'

// ============================================================================
// POST /api/ad-tracker/extract-dna
// Uses Gemini Flash to extract structured CreativeDNA enums from ad media.
// Caches results by adId for 30 min (via meta-cache).
// ============================================================================

export interface CreativeDNA {
  hookType: 'curiosity' | 'pain_point' | 'bold_claim' | 'social_proof' | 'pattern_interrupt'
  angle: 'transformation' | 'fear' | 'authority' | 'comparison' | 'urgency' | 'education'
  videoFormat: 'ugc' | 'talking_head' | 'screen_recording' | 'broll_montage' | 'meme'
  visualPacing: 'fast' | 'medium' | 'slow'
  summary: string
}

const VALID_HOOK_TYPES = ['curiosity', 'pain_point', 'bold_claim', 'social_proof', 'pattern_interrupt'] as const
const VALID_ANGLES = ['transformation', 'fear', 'authority', 'comparison', 'urgency', 'education'] as const
const VALID_FORMATS = ['ugc', 'talking_head', 'screen_recording', 'broll_montage', 'meme'] as const
const VALID_PACING = ['fast', 'medium', 'slow'] as const

// Limits
const MAX_VIDEO_SIZE_MB = 20
const MAX_IMAGE_SIZE_MB = 5
const VIDEO_DOWNLOAD_TIMEOUT_MS = 30_000
const GEMINI_REQUEST_TIMEOUT_MS = 60_000
const VIDEO_POLL_MAX_ATTEMPTS = 20
const VIDEO_POLL_INTERVAL_MS = 2000

function validateDNA(raw: any): CreativeDNA | null {
  if (!raw || typeof raw !== 'object') return null
  const hookType = VALID_HOOK_TYPES.includes(raw.hookType) ? raw.hookType : null
  const angle = VALID_ANGLES.includes(raw.angle) ? raw.angle : null
  const videoFormat = VALID_FORMATS.includes(raw.videoFormat) ? raw.videoFormat : null
  const visualPacing = VALID_PACING.includes(raw.visualPacing) ? raw.visualPacing : null
  const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.slice(0, 300) : null

  // If Gemini returned garbage for core fields, still produce a result
  // but prefer null fallback to silently defaulting
  return {
    hookType: hookType || 'curiosity',
    angle: angle || 'transformation',
    videoFormat: videoFormat || 'ugc',
    visualPacing: visualPacing || 'medium',
    summary: summary || 'Unable to generate summary',
  }
}

function extractJson(text: string) {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return JSON.parse(text)
    return JSON.parse(text.substring(start, end + 1))
  } catch (_e) {
    return null
  }
}

/**
 * Fetch with a timeout — prevents hanging on slow/dead URLs
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Detect media type from URL and content-type header
 */
function detectMediaType(url: string, contentType: string | null): 'video' | 'image' {
  const ct = (contentType || '').toLowerCase()
  if (ct.startsWith('video/')) return 'video'
  if (ct.startsWith('image/')) return 'image'
  // Fallback: check URL extension
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext || '')) return 'video'
  return 'image'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { adId, url, type: clientType, name } = body

    if (!adId || !url) {
      return NextResponse.json({ error: 'Missing adId or media URL' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (_e) {
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 })
    }

    // Check cache first
    const cacheKey = `creative-dna:${adId}`
    const cached = getCached<CreativeDNA>(cacheKey)
    if (cached) {
      return NextResponse.json({ dna: cached, cached: true })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
    }

    // Use gemini-2.0-flash (latest fast model with vision)
    const modelName = 'gemini-3.1-flash-lite-preview'
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const prompt = `You are an expert ad creative analyst. Analyze this ad creative ("${name || 'Unknown'}") and classify it into the following STRICT categories.

You MUST respond with valid JSON matching this exact schema. Use ONLY the enum values listed — never invent new ones.

{
  "hookType": one of ["curiosity", "pain_point", "bold_claim", "social_proof", "pattern_interrupt"],
  "angle": one of ["transformation", "fear", "authority", "comparison", "urgency", "education"],
  "videoFormat": one of ["ugc", "talking_head", "screen_recording", "broll_montage", "meme"],
  "visualPacing": one of ["fast", "medium", "slow"],
  "summary": "A concise 1-2 sentence summary of WHY this ad works or doesn't work based on its creative DNA."
}

Definitions:
- hookType: What technique does the first 3 seconds use to grab attention?
  - curiosity: Creates an open loop or poses a question
  - pain_point: Highlights a problem the viewer experiences
  - bold_claim: Makes a strong/provocative statement
  - social_proof: Uses testimonials, numbers, or authority
  - pattern_interrupt: Uses unexpected visuals/audio to stop scrolling

- angle: What psychological lever does the ad pull?
  - transformation: Before/after, identity shift
  - fear: Loss aversion, fear of missing out
  - authority: Expert positioning, credentials
  - comparison: Us vs them, competitor contrast
  - urgency: Time-limited, scarcity
  - education: Teaching, how-to, informational

- videoFormat: What production style is used?
  - ugc: User-generated content, casual/authentic
  - talking_head: Person speaking directly to camera
  - screen_recording: Screen capture, product demo
  - broll_montage: Edited clips/footage compilation
  - meme: Meme-style, trending format

- visualPacing: How fast do visual cuts/transitions happen?
  - fast: Cuts every 1-2 seconds
  - medium: Cuts every 3-5 seconds
  - slow: Long takes, 5+ seconds per shot

Respond ONLY with valid JSON, no markdown, no explanation.`

    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        response_mime_type: 'application/json',
      },
    }

    // ── Download media and determine type ──
    const mediaRes = await fetchWithTimeout(url, {}, VIDEO_DOWNLOAD_TIMEOUT_MS)
    if (!mediaRes.ok) {
      return NextResponse.json({
        error: `Failed to fetch media (${mediaRes.status}): ${url.substring(0, 80)}...`,
      }, { status: 502 })
    }

    const contentType = mediaRes.headers.get('content-type')
    const mediaType = clientType === 'video' ? 'video' : detectMediaType(url, contentType)
    const buffer = Buffer.from(await mediaRes.arrayBuffer())
    const sizeMB = buffer.byteLength / (1024 * 1024)

    // ── Attach media based on type ──
    if (mediaType === 'video') {
      // Size guard
      if (sizeMB > MAX_VIDEO_SIZE_MB) {
        return NextResponse.json({
          error: `Video too large (${sizeMB.toFixed(1)}MB). Max: ${MAX_VIDEO_SIZE_MB}MB.`,
        }, { status: 413 })
      }

      const mimeType = contentType || 'video/mp4'

      // Upload video to Gemini File API (resumable upload)
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
          body: JSON.stringify({ file: { display_name: `ad_${adId}` } }),
        },
        15000
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

      // Poll for readiness with exponential backoff
      let isReady = false
      let attempts = 0
      while (!isReady && attempts < VIDEO_POLL_MAX_ATTEMPTS) {
        const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`)
        if (!checkRes.ok) {
          throw new Error(`Video status check failed (${checkRes.status})`)
        }
        const checkData = await checkRes.json()
        if (checkData.state === 'ACTIVE') {
          isReady = true
        } else if (checkData.state === 'FAILED') {
          throw new Error(`Video processing failed: ${checkData.error?.message || 'Unknown'}`)
        } else {
          // Exponential backoff: 2s, 2s, 3s, 4s, 5s...
          const delay = Math.min(VIDEO_POLL_INTERVAL_MS * Math.pow(1.3, Math.max(0, attempts - 2)), 8000)
          await new Promise((r) => setTimeout(r, delay))
          attempts++
        }
      }
      if (!isReady) {
        throw new Error(`Video processing timed out after ${attempts} attempts (~${Math.round(attempts * 3)}s)`)
      }

      payload.contents[0].parts.unshift({
        fileData: { mimeType: fileData.file.mimeType, fileUri: fileData.file.uri },
      })

      // Schedule async cleanup of the uploaded file (non-blocking)
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

      payload.contents[0].parts.unshift({
        inlineData: { mimeType, data: base64 },
      })
    }

    // ── Call Gemini ──
    const generateRes = await fetchWithTimeout(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, GEMINI_REQUEST_TIMEOUT_MS)

    if (!generateRes.ok) {
      const errText = await generateRes.text().catch(() => 'Unknown error')
      throw new Error(`Gemini API error (${generateRes.status}): ${errText.slice(0, 200)}`)
    }

    const generateData = await generateRes.json()

    // Handle safety blocks
    const finishReason = generateData.candidates?.[0]?.finishReason
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      return NextResponse.json({
        error: `Gemini blocked analysis (${finishReason}). This ad may contain flagged content.`,
      }, { status: 422 })
    }

    const textOutput = generateData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
      const blockReason = generateData.promptFeedback?.blockReason
      throw new Error(blockReason ? `Prompt blocked: ${blockReason}` : 'No output from Gemini')
    }

    const rawDna = extractJson(textOutput)
    const dna = validateDNA(rawDna)

    if (!dna) {
      return NextResponse.json({ error: 'Failed to parse DNA from AI response', raw: textOutput }, { status: 500 })
    }

    // Cache the result
    setCache(cacheKey, dna)

    return NextResponse.json({ dna, cached: false })
  } catch (err: any) {
    console.error('DNA Extraction Error:', err)
    // Provide specific error messages
    const message = err.name === 'AbortError'
      ? 'Request timed out — media may be too large or server too slow'
      : (err.message || 'Unknown error')
    return NextResponse.json({ error: message }, { status: err.name === 'AbortError' ? 504 : 500 })
  }
}

/**
 * Cleanup uploaded Gemini file after analysis (fire-and-forget)
 */
async function cleanupGeminiFile(fileName: string, apiKey: string): Promise<void> {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      { method: 'DELETE' }
    )
  } catch (_e) {
    // Non-critical — files expire automatically
  }
}
