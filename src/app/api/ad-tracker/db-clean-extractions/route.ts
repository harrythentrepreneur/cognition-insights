import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/neon'
import { ensureAdExtractionsTable } from '@/lib/ad-extraction-db'

// ============================================================================
// POST /api/ad-tracker/db-clean-extractions
//
// Targeted cleanup of the `ad_extractions` table. Deletes rows whose cached
// Gemini output still contains fields from the legacy extraction schema
// (pre-2026-04 cleanup). Those rows would otherwise keep short-circuiting the
// Gemini re-run and pollute the X-Ray panel with retired fields.
//
// Legacy markers checked:
//   raw_extraction.freeformAnalysis               → old "Deep Analysis" block
//   raw_extraction.avatar                         → old Avatar block
//   raw_extraction.creativeDetails.visualStyle    → duplicated Classification.format
//   raw_extraction.creativeDetails.pacing         → duplicated Classification.visualPacing
//   raw_extraction.creativeDetails.emotionalTone  → duplicated Classification.emotionalDriver
//
// Also flags image ads missing the 2026-04 image-prompt fields:
//   raw_extraction.visualCraft                    → new Visual Craft section
//   raw_extraction.avatarAndMarket                → new Avatar & Market block
//   raw_extraction.metaContext                    → sanitized Meta metadata (DCT variant, targeting)
//
// Dry-run by default — pass `{ "apply": true }` to actually delete.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    await ensureAdExtractionsTable()

    let apply = false
    try {
      const body = await req.json()
      apply = body?.apply === true
    } catch (_e) {
      // No body — treat as dry run
    }

    // Find all rows whose cached output carries any legacy marker.
    // Uses jsonb_extract_path / -> navigation with IS NOT NULL to avoid the
    // jsonb `?` existence operator (which collides with SQL param binding).
    const staleRows = await sql`
      SELECT ad_id
      FROM ad_extractions
      WHERE
        (raw_extraction -> 'freeformAnalysis') IS NOT NULL
        OR (raw_extraction -> 'avatar') IS NOT NULL
        OR (raw_extraction -> 'rawMediaAnalysis') IS NOT NULL
        OR (raw_extraction -> 'rawObservations') IS NOT NULL
        OR (raw_extraction -> 'additionalDetails') IS NOT NULL
        OR (raw_extraction -> 'dominantColors') IS NOT NULL
        OR (raw_extraction -> 'creativeDetails' -> 'visualStyle') IS NOT NULL
        OR (raw_extraction -> 'creativeDetails' -> 'pacing') IS NOT NULL
        OR (raw_extraction -> 'creativeDetails' -> 'emotionalTone') IS NOT NULL
        OR (raw_extraction -> 'creativeDetails' -> 'brandElements') IS NOT NULL
        OR (
          (raw_extraction ->> 'mediaType') = 'image'
          AND (raw_extraction -> 'visualCraft') IS NULL
        )
        OR (raw_extraction -> 'avatarAndMarket') IS NULL
        OR (raw_extraction -> 'metaContext') IS NULL
    `

    const staleIds = (staleRows as Array<{ ad_id: string }>).map(r => r.ad_id)

    let deleted = 0
    if (apply && staleIds.length > 0) {
      const res = await sql`
        DELETE FROM ad_extractions
        WHERE ad_id = ANY(${staleIds})
        RETURNING ad_id
      `
      deleted = (res as Array<{ ad_id: string }>).length
    }

    const totalRows = await sql`SELECT COUNT(*)::int AS n FROM ad_extractions`
    const total = (totalRows[0] as { n: number }).n

    return NextResponse.json({
      mode: apply ? 'apply' : 'dry-run',
      totalRows: total,
      staleCount: staleIds.length,
      sampleStaleIds: staleIds.slice(0, 20),
      deleted,
      note: apply
        ? `Deleted ${deleted} legacy rows. Re-open an ad in the X-Ray panel to re-extract under the new prompts.`
        : 'Dry run. POST again with {"apply": true} to actually delete.',
    })
  } catch (err: any) {
    console.error('[db-clean-extractions] error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
