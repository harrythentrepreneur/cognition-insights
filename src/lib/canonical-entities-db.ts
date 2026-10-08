import { sql, getPool } from '@/lib/neon'

// ============================================================================
// Canonical Entities DB — dedup layer on top of ad_extractions
//
// Per-ad raw extraction and classification stay in ad_extractions untouched.
// This layer stores CANONICAL versions of the free-text entities that repeat
// across ads (personas, hooks, angles, desires, feature/benefit pairs) and
// links each ad to the canonical entities it expresses. The canvas uses the
// link table to roll up metrics per canonical entity.
// ============================================================================

export type EntityKind =
  | 'persona'
  | 'hook'
  | 'angle'
  | 'desire'
  | 'feature_benefit'

export interface CanonicalEntity {
  id: string
  kind: EntityKind
  label: string
  payload: Record<string, any>
  fingerprint: string
  created_at: string
  updated_at: string
  link_count?: number
}

export interface CanonicalEntityWithSimilarity extends CanonicalEntity {
  similarity: number
}

export interface AdEntityLink {
  ad_id: string
  entity_id: string
  kind: EntityKind
  confidence: number | null
  created_at: string
}

export interface EntityMergeLogRow {
  id: string
  kind: EntityKind
  ad_id: string | null
  new_payload: Record<string, any>
  matched_entity_id: string | null
  decision: 'fingerprint' | 'judge_matched' | 'judge_new' | 'inserted_new'
  reason: string | null
  candidates: Record<string, any> | null
  created_at: string
}

// Embedding dimension for Gemini text-embedding-004
export const EMBEDDING_DIM = 768

// ─── Advisory locks (per-kind serialization) ────────────────────────────────
//
// When two workers concurrently merge near-duplicate entities of the same
// kind, both can pass the "no match in shortlist" check and insert two
// canonical rows that should have been one. A session-scoped advisory lock
// per kind serializes the embed→shortlist→judge→insert critical section so
// only one worker of a given kind runs it at a time. Lock contention is
// bounded to ~1–2s (the judge call), so throughput stays high in practice.
//
// Uses a dedicated Pool connection (session-scoped advisory locks require a
// persistent session, which the http `sql` client can't provide — every http
// call is a fresh connection). Writes/reads inside fn() still use the http
// `sql` client; they're visible across connections immediately thanks to
// Postgres MVCC + read-committed isolation.
// ────────────────────────────────────────────────────────────────────────────

// Stable per-kind lock keys. Postgres advisory locks take a bigint; using
// small fixed ints is namespace-safe as long as we don't collide with other
// parts of the app. The 0x43454E ('CEN' for 'canonical entities') prefix
// makes collisions astronomically unlikely.
const KIND_LOCK_KEY: Record<EntityKind, number> = {
  persona:         0x43454E01,
  hook:            0x43454E02,
  angle:           0x43454E03,
  desire:          0x43454E04,
  feature_benefit: 0x43454E05,
}

const LOCK_ACQUIRE_TIMEOUT_MS = 30_000
const LOCK_POLL_INTERVAL_MS = 50

/**
 * Run fn() while holding an exclusive session-level advisory lock for the
 * given entity kind. Uses pg_try_advisory_lock in a polling loop so the
 * caller can set a bounded wait without relying on SET LOCAL (which only
 * works inside a transaction).
 *
 * Cleanup rules:
 *   - If the lock was successfully acquired, we always attempt to unlock
 *     before returning the client to the pool.
 *   - If the unlock itself fails (e.g. broken connection), we discard the
 *     client via release(err) so the held lock can't leak to the next user
 *     of the pooled connection.
 *   - Throws if the lock can't be acquired within LOCK_ACQUIRE_TIMEOUT_MS.
 *     Callers should treat this as a transient failure and let the outer
 *     per-entity try/catch drop the candidate for this round.
 */
export async function withKindLock<T>(
  kind: EntityKind,
  fn: () => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  const key = KIND_LOCK_KEY[kind]
  let locked = false
  let unlockFailed = false
  try {
    const deadline = Date.now() + LOCK_ACQUIRE_TIMEOUT_MS
    while (Date.now() < deadline) {
      const res = await client.query<{ ok: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS ok',
        [key]
      )
      if (res.rows[0]?.ok) {
        locked = true
        break
      }
      await new Promise(r => setTimeout(r, LOCK_POLL_INTERVAL_MS))
    }
    if (!locked) {
      throw new Error(`[withKindLock] failed to acquire lock for kind=${kind} within ${LOCK_ACQUIRE_TIMEOUT_MS}ms`)
    }
    return await fn()
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [key])
      } catch (err) {
        unlockFailed = true
        console.warn('[withKindLock] unlock failed — discarding client', err)
      }
    }
    // release(err) tells node-postgres to drop this connection rather than
    // return it to the pool. We only do that when unlock failed, so the
    // stuck lock dies with the connection.
    if (unlockFailed) {
      client.release(new Error('unlock failed, discarding session'))
    } else {
      client.release()
    }
  }
}

/**
 * Idempotent schema init — safe to call on every request.
 * Enables pgvector and creates the three tables + indexes.
 */
export async function ensureCanonicalEntitiesSchema(): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`

  await sql`
    CREATE TABLE IF NOT EXISTS canonical_entities (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kind         TEXT NOT NULL,
      label        TEXT NOT NULL,
      payload      JSONB NOT NULL,
      fingerprint  TEXT NOT NULL,
      embedding    vector(768),
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS canonical_entities_kind_fingerprint_idx ON canonical_entities (kind, fingerprint)`
  await sql`CREATE INDEX IF NOT EXISTS canonical_entities_kind_idx ON canonical_entities (kind)`
  await sql`CREATE INDEX IF NOT EXISTS canonical_entities_embedding_idx ON canonical_entities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`

  await sql`
    CREATE TABLE IF NOT EXISTS ad_entity_links (
      ad_id       TEXT NOT NULL,
      entity_id   UUID NOT NULL REFERENCES canonical_entities(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL,
      confidence  REAL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (ad_id, entity_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS ad_entity_links_entity_idx ON ad_entity_links (entity_id)`
  await sql`CREATE INDEX IF NOT EXISTS ad_entity_links_ad_idx ON ad_entity_links (ad_id)`
  await sql`CREATE INDEX IF NOT EXISTS ad_entity_links_kind_idx ON ad_entity_links (kind)`

  await sql`
    CREATE TABLE IF NOT EXISTS entity_merge_log (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kind               TEXT NOT NULL,
      ad_id              TEXT,
      new_payload        JSONB NOT NULL,
      matched_entity_id  UUID,
      decision           TEXT NOT NULL,
      reason             TEXT,
      candidates         JSONB,
      created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS entity_merge_log_ad_idx ON entity_merge_log (ad_id)`
  await sql`CREATE INDEX IF NOT EXISTS entity_merge_log_entity_idx ON entity_merge_log (matched_entity_id)`
}

/**
 * Fingerprint lookup — fast-path exact match before embedding + judge.
 */
export async function findByFingerprint(
  kind: EntityKind,
  fingerprint: string
): Promise<CanonicalEntity | null> {
  const rows = await sql`
    SELECT id, kind, label, payload, fingerprint,
           created_at::text, updated_at::text
    FROM canonical_entities
    WHERE kind = ${kind} AND fingerprint = ${fingerprint}
    LIMIT 1
  `
  if (rows.length === 0) return null
  return rows[0] as unknown as CanonicalEntity
}

/**
 * Cosine-similarity shortlist via pgvector. Returns top N candidates whose
 * similarity >= threshold, ordered by similarity descending.
 */
export async function shortlistByEmbedding(
  kind: EntityKind,
  embedding: number[],
  threshold: number = 0.75,
  limit: number = 5
): Promise<CanonicalEntityWithSimilarity[]> {
  const vectorLiteral = `[${embedding.join(',')}]`
  const rows = await sql`
    SELECT id, kind, label, payload, fingerprint,
           created_at::text, updated_at::text,
           1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM canonical_entities
    WHERE kind = ${kind} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `
  return (rows as unknown as CanonicalEntityWithSimilarity[])
    .filter(r => r.similarity >= threshold)
}

/**
 * Insert a new canonical entity. Race-safe: on a concurrent insert of the
 * same (kind, fingerprint), returns the existing row WITHOUT overwriting
 * its embedding/payload/label. The DO UPDATE is a no-op that just lets
 * RETURNING yield the existing row.
 */
export async function insertCanonicalEntity(args: {
  kind: EntityKind
  label: string
  payload: Record<string, any>
  fingerprint: string
  embedding: number[] | null
}): Promise<CanonicalEntity> {
  const { kind, label, payload, fingerprint, embedding } = args
  const vectorLiteral = embedding ? `[${embedding.join(',')}]` : null
  const rows = await sql`
    INSERT INTO canonical_entities (kind, label, payload, fingerprint, embedding)
    VALUES (
      ${kind},
      ${label},
      ${JSON.stringify(payload)}::jsonb,
      ${fingerprint},
      ${vectorLiteral}::vector
    )
    ON CONFLICT (kind, fingerprint) DO UPDATE SET
      updated_at = canonical_entities.updated_at
    RETURNING id, kind, label, payload, fingerprint,
              created_at::text, updated_at::text
  `
  return rows[0] as unknown as CanonicalEntity
}

/**
 * Backfill an embedding for an existing row (used when a prior insert
 * happened without one and we later want to make it searchable).
 */
export async function setEntityEmbedding(
  entityId: string,
  embedding: number[]
): Promise<void> {
  const vectorLiteral = `[${embedding.join(',')}]`
  await sql`
    UPDATE canonical_entities
    SET embedding = ${vectorLiteral}::vector, updated_at = NOW()
    WHERE id = ${entityId} AND embedding IS NULL
  `
}

/**
 * Link an ad to a canonical entity. Idempotent.
 */
export async function linkAdToEntity(args: {
  adId: string
  entityId: string
  kind: EntityKind
  confidence: number | null
}): Promise<void> {
  const { adId, entityId, kind, confidence } = args
  await sql`
    INSERT INTO ad_entity_links (ad_id, entity_id, kind, confidence)
    VALUES (${adId}, ${entityId}, ${kind}, ${confidence})
    ON CONFLICT (ad_id, entity_id) DO UPDATE SET
      confidence = EXCLUDED.confidence
  `
}

/**
 * Append a decision row to the merge log for auditability.
 */
export async function logMergeDecision(args: {
  kind: EntityKind
  adId: string | null
  newPayload: Record<string, any>
  matchedEntityId: string | null
  decision: EntityMergeLogRow['decision']
  reason: string | null
  candidates: Record<string, any> | null
}): Promise<void> {
  const { kind, adId, newPayload, matchedEntityId, decision, reason, candidates } = args
  await sql`
    INSERT INTO entity_merge_log
      (kind, ad_id, new_payload, matched_entity_id, decision, reason, candidates)
    VALUES (
      ${kind},
      ${adId},
      ${JSON.stringify(newPayload)}::jsonb,
      ${matchedEntityId},
      ${decision},
      ${reason},
      ${candidates ? JSON.stringify(candidates) : null}::jsonb
    )
  `
}

/**
 * List canonical entities (optionally filtered by kind), with link counts.
 */
export async function listCanonicalEntities(
  kind?: EntityKind
): Promise<CanonicalEntity[]> {
  const rows = kind
    ? await sql`
        SELECT ce.id, ce.kind, ce.label, ce.payload, ce.fingerprint,
               ce.created_at::text, ce.updated_at::text,
               COUNT(l.ad_id)::int AS link_count
        FROM canonical_entities ce
        LEFT JOIN ad_entity_links l ON l.entity_id = ce.id
        WHERE ce.kind = ${kind}
        GROUP BY ce.id
        ORDER BY link_count DESC, ce.updated_at DESC
      `
    : await sql`
        SELECT ce.id, ce.kind, ce.label, ce.payload, ce.fingerprint,
               ce.created_at::text, ce.updated_at::text,
               COUNT(l.ad_id)::int AS link_count
        FROM canonical_entities ce
        LEFT JOIN ad_entity_links l ON l.entity_id = ce.id
        GROUP BY ce.id
        ORDER BY link_count DESC, ce.updated_at DESC
      `
  return rows as unknown as CanonicalEntity[]
}

// Meta metrics_json contains both ADDITIVE fields (spend, revenue, impressions…)
// and RATIO fields (roas, ctr, cpc, cpm, cpa). Summing ratios across ads is
// meaningless — the ratios must be re-derived from the summed base fields.
const RATIO_METRIC_KEYS = new Set(['roas', 'ctr', 'cpc', 'cpm', 'cpa'])

/**
 * Aggregate performance metrics across all ads linked to a canonical entity.
 * Reads ad_creatives.metrics_json (latest snapshot per ad) and sums the
 * additive fields, then re-derives the ratio metrics.
 */
export async function getEntityMetrics(entityId: string): Promise<{
  entity_id: string
  ad_count: number
  totals: Record<string, number>
  derived: { roas: number; ctr: number; cpc: number; cpm: number; cpa: number }
  linked_ad_ids: string[]
}> {
  // Take the latest snapshot per ad (snapshot_to is TEXT 'YYYY-MM-DD' so
  // lexical ordering matches date ordering). NULLS LAST keeps any rows
  // without a snapshot date from being chosen over dated snapshots.
  const rows = await sql`
    SELECT DISTINCT ON (c.ad_id) c.ad_id, c.metrics_json
    FROM ad_entity_links l
    JOIN ad_creatives c ON c.ad_id = l.ad_id
    WHERE l.entity_id = ${entityId}
    ORDER BY c.ad_id, c.snapshot_to DESC NULLS LAST
  `

  const totals: Record<string, number> = {}
  const seen = new Set<string>()
  for (const r of rows as any[]) {
    seen.add(r.ad_id)
    const m = r.metrics_json || {}
    for (const [k, v] of Object.entries(m)) {
      if (RATIO_METRIC_KEYS.has(k)) continue
      if (typeof v === 'number' && Number.isFinite(v)) {
        totals[k] = (totals[k] || 0) + v
      }
    }
  }

  const spend = totals.spend || 0
  const revenue = totals.revenue || 0
  const impressions = totals.impressions || 0
  const clicks = totals.clicks || 0
  const conversions = totals.conversions || 0

  return {
    entity_id: entityId,
    ad_count: seen.size,
    totals,
    derived: {
      roas: spend > 0 ? revenue / spend : 0,
      ctr: impressions > 0 ? clicks / impressions : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
    },
    linked_ad_ids: Array.from(seen),
  }
}

/**
 * Fetch all ad→entity links for a given ad.
 */
export async function getEntityLinksForAd(adId: string): Promise<AdEntityLink[]> {
  const rows = await sql`
    SELECT ad_id, entity_id, kind, confidence, created_at::text
    FROM ad_entity_links
    WHERE ad_id = ${adId}
  `
  return rows as unknown as AdEntityLink[]
}
