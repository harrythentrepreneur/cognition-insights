import { sql } from '@/lib/neon'

// ============================================================================
// Creative Performance DB — Persists Meta ad creative snapshots to NeonDB
//
// Stores creative-level metrics so that historical creative performance
// survives server restarts and reduces Meta API call volume.
// ============================================================================

export interface CreativeRow {
  ad_id: string
  ad_name: string
  status: string
  creative_type: string
  thumbnail_url: string | null
  image_url: string | null
  video_source_url: string | null
  headline: string | null
  body: string | null
  description: string | null
  link_url: string | null
  platform: string
  metrics_json: Record<string, number>
  snapshot_from: string
  snapshot_to: string
}

/**
 * Idempotent — safe to call on every request.
 */
export async function ensureCreativesTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ad_creatives (
      ad_id            TEXT NOT NULL,
      ad_name          TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'unknown',
      creative_type    TEXT NOT NULL DEFAULT 'image',
      thumbnail_url    TEXT,
      image_url        TEXT,
      video_source_url TEXT,
      headline         TEXT,
      body             TEXT,
      description      TEXT,
      link_url         TEXT,
      platform         TEXT NOT NULL DEFAULT 'Meta',
      metrics_json     JSONB NOT NULL DEFAULT '{}',
      snapshot_from    TEXT NOT NULL,
      snapshot_to      TEXT NOT NULL,
      updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (ad_id, snapshot_from, snapshot_to)
    )
  `
}

/**
 * Upsert a single creative row.
 */
export async function upsertCreative(row: CreativeRow): Promise<void> {
  await sql`
    INSERT INTO ad_creatives (
      ad_id, ad_name, status, creative_type,
      thumbnail_url, image_url, video_source_url,
      headline, body, description, link_url,
      platform, metrics_json, snapshot_from, snapshot_to, updated_at
    ) VALUES (
      ${row.ad_id}, ${row.ad_name}, ${row.status}, ${row.creative_type},
      ${row.thumbnail_url}, ${row.image_url}, ${row.video_source_url},
      ${row.headline}, ${row.body}, ${row.description}, ${row.link_url},
      ${row.platform}, ${JSON.stringify(row.metrics_json)}::jsonb,
      ${row.snapshot_from}, ${row.snapshot_to}, NOW()
    )
    ON CONFLICT (ad_id, snapshot_from, snapshot_to) DO UPDATE SET
      ad_name = EXCLUDED.ad_name,
      status = EXCLUDED.status,
      creative_type = EXCLUDED.creative_type,
      thumbnail_url = EXCLUDED.thumbnail_url,
      image_url = EXCLUDED.image_url,
      video_source_url = EXCLUDED.video_source_url,
      headline = EXCLUDED.headline,
      body = EXCLUDED.body,
      description = EXCLUDED.description,
      link_url = EXCLUDED.link_url,
      platform = EXCLUDED.platform,
      metrics_json = EXCLUDED.metrics_json,
      updated_at = NOW()
  `
}

/**
 * Batch upsert creatives.
 */
export async function upsertCreativesBatch(rows: CreativeRow[]): Promise<void> {
  await Promise.all(rows.map(row => upsertCreative(row)))
}

/**
 * Read creatives for a date range.
 */
export async function getCreatives(from: string, to: string): Promise<CreativeRow[]> {
  const rows = await sql`
    SELECT * FROM ad_creatives
    WHERE snapshot_from = ${from} AND snapshot_to = ${to}
    ORDER BY (metrics_json->>'spend')::float DESC NULLS LAST
  `
  return rows as unknown as CreativeRow[]
}

/**
 * Get table row count for health checks.
 */
export async function getCreativesCount(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM ad_creatives`
  return rows[0]?.count ?? 0
}
