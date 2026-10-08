import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/neon'
import { ensureAdExtractionsTable } from '@/lib/ad-extraction-db'
import { ensureCanonicalEntitiesSchema } from '@/lib/canonical-entities-db'
import { mergeAdEntities } from '@/lib/entity-merger'

// ============================================================================
// POST /api/ad-tracker/backfill-entities
//
// Reads every row from ad_extractions and runs it through the entity merger.
// Idempotent — re-running is safe because:
//   (a) fingerprint fast path returns existing canonical entities
//   (b) ad_entity_links has a unique PK (ad_id, entity_id)
//
// Body (all optional):
//   { limit?: number, offset?: number, dryRun?: boolean }
//
// limit defaults to 50 so a single call doesn't hog serverless time. Call
// repeatedly bumping offset (or pass ?limit=999 if you're running locally).
// ============================================================================

interface BackfillRow {
  ad_id: string
  classification: Record<string, any> | null
  creative_system: Record<string, any> | null
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.ENABLE_ENTITY_MERGE !== 'true') {
      return NextResponse.json(
        { error: 'ENABLE_ENTITY_MERGE must be true to run backfill' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const limit = Math.max(1, Math.min(500, Number(body?.limit) || 50))
    const offset = Math.max(0, Number(body?.offset) || 0)
    const dryRun = body?.dryRun === true

    await ensureAdExtractionsTable()
    await ensureCanonicalEntitiesSchema()

    const rows = (await sql`
      SELECT ad_id, classification, creative_system
      FROM ad_extractions
      WHERE classification IS NOT NULL OR creative_system IS NOT NULL
      ORDER BY ad_id
      LIMIT ${limit}
      OFFSET ${offset}
    `) as unknown as BackfillRow[]

    const [{ count: totalCount }] = (await sql`
      SELECT COUNT(*)::int AS count
      FROM ad_extractions
      WHERE classification IS NOT NULL OR creative_system IS NOT NULL
    `) as unknown as { count: number }[]

    if (dryRun) {
      return NextResponse.json({
        data: {
          totalCount,
          wouldProcess: rows.length,
          offset,
          limit,
          sampleAdIds: rows.slice(0, 5).map(r => r.ad_id),
        },
      })
    }

    const processed: { adId: string; count: number }[] = []
    const failed: { adId: string; error: string }[] = []

    // Per-row timeout so a single stuck ad doesn't block the whole batch
    // (Vercel/Coolify route execution has a hard wall-clock budget).
    const ROW_TIMEOUT_MS = 90_000
    const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        p.then(
          v => { clearTimeout(t); resolve(v) },
          e => { clearTimeout(t); reject(e) }
        )
      })

    for (const row of rows) {
      try {
        const results = await withTimeout(
          mergeAdEntities({
            adId: row.ad_id,
            classification: row.classification,
            creativeSystem: row.creative_system,
          }),
          ROW_TIMEOUT_MS,
          `mergeAdEntities(${row.ad_id})`
        )
        processed.push({ adId: row.ad_id, count: results.length })
      } catch (err: any) {
        failed.push({ adId: row.ad_id, error: err?.message || 'unknown' })
      }
    }

    return NextResponse.json({
      data: {
        totalCount,
        processedCount: processed.length,
        failedCount: failed.length,
        nextOffset: offset + rows.length,
        done: offset + rows.length >= totalCount,
        processed,
        failed,
      },
    })
  } catch (err: any) {
    console.error('[backfill-entities] error', err)
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
