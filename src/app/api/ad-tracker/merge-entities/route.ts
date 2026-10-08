import { NextRequest, NextResponse } from 'next/server'
import { mergeAdEntities } from '@/lib/entity-merger'
import { ensureCanonicalEntitiesSchema, getEntityLinksForAd } from '@/lib/canonical-entities-db'
import { getAdExtraction, ensureAdExtractionsTable } from '@/lib/ad-extraction-db'

// ============================================================================
// POST /api/ad-tracker/merge-entities
//
// Runs the canonical entity merger for a single ad. Accepts classification
// and/or creativeSystem in the body; if absent, falls back to whatever is
// stored in ad_extractions for the ad.
//
// Gated by ENABLE_ENTITY_MERGE env var — if not set to "true", returns a
// no-op response so callers can wire this in without flipping behavior.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const enabled = process.env.ENABLE_ENTITY_MERGE === 'true'
    const body = await req.json()
    const { adId } = body
    let { classification, creativeSystem } = body

    if (!adId || typeof adId !== 'string') {
      return NextResponse.json({ error: 'Missing adId' }, { status: 400 })
    }

    if (!enabled) {
      return NextResponse.json({ data: { adId, disabled: true, results: [] } })
    }

    // Fall back to DB-stored classification / creative_system when not provided.
    if (!classification || !creativeSystem) {
      try {
        await ensureAdExtractionsTable()
        const row = await getAdExtraction(adId)
        if (!classification && row?.classification) classification = row.classification
        if (!creativeSystem && row?.creative_system) creativeSystem = row.creative_system
      } catch (err) {
        console.warn('[merge-entities] DB lookup failed', err)
      }
    }

    await ensureCanonicalEntitiesSchema()

    const results = await mergeAdEntities({ adId, classification, creativeSystem })
    const links = await getEntityLinksForAd(adId)

    return NextResponse.json({
      data: {
        adId,
        results,
        links,
      },
    })
  } catch (err: any) {
    console.error('[merge-entities] error', err)
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
