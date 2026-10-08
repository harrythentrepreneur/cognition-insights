import { NextRequest, NextResponse } from 'next/server'
import {
  ensureCanonicalEntitiesSchema,
  listCanonicalEntities,
  getEntityMetrics,
  type EntityKind,
} from '@/lib/canonical-entities-db'

// ============================================================================
// GET /api/ad-tracker/canonical-entities?kind=<persona|hook|...>&withMetrics=1
//
// Returns canonical entities filtered by kind (optional), each with a
// link_count. When withMetrics=1 is passed, also aggregates spend/impressions/
// revenue/etc. across every ad linked to the entity (by reading
// ad_creatives.metrics_json).
// ============================================================================

const VALID_KINDS: EntityKind[] = ['persona', 'hook', 'angle', 'desire', 'feature_benefit']

export async function GET(req: NextRequest) {
  try {
    await ensureCanonicalEntitiesSchema()

    const { searchParams } = new URL(req.url)
    const kindParam = searchParams.get('kind')
    const withMetrics = searchParams.get('withMetrics') === '1'

    let kind: EntityKind | undefined
    if (kindParam) {
      if (!VALID_KINDS.includes(kindParam as EntityKind)) {
        return NextResponse.json({ error: `Invalid kind. Expected one of ${VALID_KINDS.join(', ')}` }, { status: 400 })
      }
      kind = kindParam as EntityKind
    }

    const entities = await listCanonicalEntities(kind)

    if (!withMetrics) {
      return NextResponse.json({ data: entities })
    }

    // Hydrate metrics per entity — sequential keeps Neon from throttling.
    const hydrated = []
    for (const e of entities) {
      const metrics = await getEntityMetrics(e.id)
      hydrated.push({ ...e, metrics })
    }

    return NextResponse.json({ data: hydrated })
  } catch (err: any) {
    console.error('[canonical-entities] error', err)
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
