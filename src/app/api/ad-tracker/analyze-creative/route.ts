import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '../meta-cache';

// ============================================================================
// POST /api/ad-tracker/analyze-creative
// Deep analysis of a single ad creative — used by the X-Ray panel.
// Returns structured analysis (script, visuals, goal, hook, verdict).
// Caches results by URL hash for 30 min.
// ============================================================================

const MAX_VIDEO_SIZE_MB = 20;
const MAX_IMAGE_SIZE_MB = 5;
const MEDIA_FETCH_TIMEOUT_MS = 30_000;
const GEMINI_TIMEOUT_MS = 60_000;

function extractJson(text: string) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return JSON.parse(text);
    return JSON.parse(text.substring(start, end + 1));
  } catch (_e) {
    return null;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}


export async function POST(req: NextRequest) {
  try {
    const { url, type, name, platform } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing media URL' }, { status: 400 });
    }

    // Validate URL
    try { new URL(url); } catch (_e) {
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
    }

    // Check cache
    const cacheKey = `analyze:${hashUrl(url)}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ report: cached, cached: true });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3;
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 });
    }

    const modelName = 'gemini-3.1-flash-lite-preview';
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const prompt = `Analyze this ad creative ("${name || 'Unknown'}" from ${platform || 'unknown platform'}).
Provide a deep, structural analysis focusing on the following areas:
1. Script & Copy: What is the main message or script? Summarize it.
2. Visuals & Action: What is happening on screen? Describe the visual elements.
3. Goal & Objective: What is the psychological or business goal of this ad?
4. The Hook: What is the opening hook, and why is it effective?

Respond strictly in JSON format matching this schema:
{
  "script": "Summary of the script or copy",
  "visuals": "Description of visuals and action",
  "goal": "The primary goal of the ad",
  "hook": "Analysis of the hook",
  "overallVerdict": "A 1-2 sentence overall verdict"
}`;

    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        response_mime_type: 'application/json',
      },
    };

    // Download media
    const mediaRes = await fetchWithTimeout(url, {}, MEDIA_FETCH_TIMEOUT_MS);
    if (!mediaRes.ok) {
      return NextResponse.json({
        error: `Failed to fetch media (${mediaRes.status})`,
      }, { status: 502 });
    }

    const buffer = Buffer.from(await mediaRes.arrayBuffer());
    const sizeMB = buffer.byteLength / (1024 * 1024);
    const contentType = mediaRes.headers.get('content-type');

    if (type === 'image' || (!type && !(contentType || '').startsWith('video/'))) {
      // Image path
      if (sizeMB > MAX_IMAGE_SIZE_MB) {
        return NextResponse.json({ error: `Image too large (${sizeMB.toFixed(1)}MB)` }, { status: 413 });
      }
      const base64 = buffer.toString('base64');
      const mimeType = contentType || 'image/jpeg';
      payload.contents[0].parts.unshift({
        inlineData: { mimeType, data: base64 },
      });
    } else {
      // Video path — use inline base64 (avoids File API permission issues)
      if (sizeMB > MAX_VIDEO_SIZE_MB) {
        return NextResponse.json({ error: `Video too large (${sizeMB.toFixed(1)}MB)` }, { status: 413 });
      }
      const base64 = buffer.toString('base64');
      const mimeType = contentType || 'video/mp4';
      payload.contents[0].parts.unshift({
        inlineData: { mimeType, data: base64 },
      });
    }

    // Call Gemini
    const generateRes = await fetchWithTimeout(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, GEMINI_TIMEOUT_MS);

    if (!generateRes.ok) {
      const errText = await generateRes.text().catch(() => 'Unknown');
      throw new Error(`Gemini API error (${generateRes.status}): ${errText.slice(0, 200)}`);
    }

    const generateData = await generateRes.json();

    // Handle safety blocks
    const finishReason = generateData.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      return NextResponse.json({
        error: `Analysis blocked by safety filter (${finishReason})`,
      }, { status: 422 });
    }

    const textOutput = generateData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      const blockReason = generateData.promptFeedback?.blockReason;
      throw new Error(blockReason ? `Prompt blocked: ${blockReason}` : 'No output from Gemini');
    }

    const report = extractJson(textOutput) || { error: 'Failed to parse JSON', raw: textOutput };

    // Cache for 30 min
    setCache(cacheKey, report);

    return NextResponse.json({ report, cached: false });
  } catch (err: any) {
    console.error('Creative Analysis Error:', err);
    const message = err.name === 'AbortError'
      ? 'Analysis timed out — try again'
      : (err.message || 'Unknown error');
    return NextResponse.json({ error: message }, { status: err.name === 'AbortError' ? 504 : 500 });
  }
}
