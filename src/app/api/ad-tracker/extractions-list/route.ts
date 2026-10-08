import { NextRequest, NextResponse } from 'next/server';
import { ensureAdExtractionsTable, listAdExtractions } from '@/lib/ad-extraction-db';

// ============================================================================
// POST /api/ad-tracker/extractions-list
// Returns stored raw extraction + classification + creative-system rows for
// a batch of ad ids. The canvas uses this as a DB fallback when the user
// opens a creative that wasn't extracted via the X-Ray panel (which writes to
// localStorage).
// Request body: { adIds: string[] }
// Response: { data: Record<adId, { classification, rawExtraction, creativeSystem }> }
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adIds = Array.isArray(body?.adIds) ? body.adIds.filter((s: unknown) => typeof s === 'string') : [];
    if (adIds.length === 0) return NextResponse.json({ data: {} });

    await ensureAdExtractionsTable();
    const rows = await listAdExtractions(adIds);

    const data: Record<string, { classification: any; rawExtraction: any; creativeSystem: any }> = {};
    for (const row of rows) {
      data[row.ad_id] = {
        classification: row.classification || null,
        rawExtraction: row.raw_extraction || null,
        creativeSystem: row.creative_system || null,
      };
    }
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[extractions-list] error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list extractions' }, { status: 500 });
  }
}
