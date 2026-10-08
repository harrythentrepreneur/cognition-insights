import { sql } from '@/lib/neon'

// ============================================================================
// Ad Extraction DB — Persists Gemini extraction & classification results
//
// Stores the expensive AI analysis results (raw extraction + classification)
// permanently in the database so they survive server restarts and don't need
// to be re-computed. This replaces the 30-min in-memory cache with durable
// storage — extractions that cost ~$0.05+ each in Gemini API calls are
// computed once and cached forever (ad content doesn't change).
// ============================================================================

export interface AdExtractionRow {
  ad_id: string
  raw_extraction: Record<string, any> | null
  classification: Record<string, any> | null
  creative_system: Record<string, any> | null
  extracted_at: string | null
  classified_at: string | null
  system_at: string | null
}

/**
 * Idempotent — safe to call on every request.
 */
export async function ensureAdExtractionsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ad_extractions (
      ad_id           TEXT PRIMARY KEY,
      raw_extraction  JSONB,
      classification  JSONB,
      creative_system JSONB,
      extracted_at    TIMESTAMP WITH TIME ZONE,
      classified_at   TIMESTAMP WITH TIME ZONE,
      system_at       TIMESTAMP WITH TIME ZONE,
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  // Additive column migration for existing deployments.
  await sql`ALTER TABLE ad_extractions ADD COLUMN IF NOT EXISTS creative_system JSONB`
  await sql`ALTER TABLE ad_extractions ADD COLUMN IF NOT EXISTS system_at TIMESTAMP WITH TIME ZONE`
}

/**
 * Get stored extraction + classification for an ad.
 * Returns null if the ad has no stored data.
 */
export async function getAdExtraction(adId: string): Promise<AdExtractionRow | null> {
  const rows = await sql`
    SELECT ad_id, raw_extraction, classification, creative_system,
           extracted_at::text, classified_at::text, system_at::text
    FROM ad_extractions
    WHERE ad_id = ${adId}
    LIMIT 1
  `
  if (rows.length === 0) return null
  return rows[0] as unknown as AdExtractionRow
}

/**
 * Get stored extraction + classification for a batch of ad ids.
 * Returns rows keyed by ad_id — missing ids are simply absent.
 */
export async function listAdExtractions(adIds: string[]): Promise<AdExtractionRow[]> {
  if (adIds.length === 0) return []
  const rows = await sql`
    SELECT ad_id, raw_extraction, classification, creative_system,
           extracted_at::text, classified_at::text, system_at::text
    FROM ad_extractions
    WHERE ad_id = ANY(${adIds})
  `
  return rows as unknown as AdExtractionRow[]
}

/**
 * Store or update the raw extraction for an ad.
 */
export async function upsertRawExtraction(adId: string, rawExtraction: Record<string, any>): Promise<void> {
  await sql`
    INSERT INTO ad_extractions (ad_id, raw_extraction, extracted_at, updated_at)
    VALUES (${adId}, ${JSON.stringify(rawExtraction)}::jsonb, NOW(), NOW())
    ON CONFLICT (ad_id) DO UPDATE SET
      raw_extraction = ${JSON.stringify(rawExtraction)}::jsonb,
      extracted_at = NOW(),
      updated_at = NOW()
  `
}

/**
 * Store or update the classification for an ad.
 */
export async function upsertClassification(adId: string, classification: Record<string, any>): Promise<void> {
  await sql`
    INSERT INTO ad_extractions (ad_id, classification, classified_at, updated_at)
    VALUES (${adId}, ${JSON.stringify(classification)}::jsonb, NOW(), NOW())
    ON CONFLICT (ad_id) DO UPDATE SET
      classification = ${JSON.stringify(classification)}::jsonb,
      classified_at = NOW(),
      updated_at = NOW()
  `
}

/**
 * Store or update the creative-system framework for an ad.
 */
export async function upsertCreativeSystem(adId: string, creativeSystem: Record<string, any>): Promise<void> {
  await sql`
    INSERT INTO ad_extractions (ad_id, creative_system, system_at, updated_at)
    VALUES (${adId}, ${JSON.stringify(creativeSystem)}::jsonb, NOW(), NOW())
    ON CONFLICT (ad_id) DO UPDATE SET
      creative_system = ${JSON.stringify(creativeSystem)}::jsonb,
      system_at = NOW(),
      updated_at = NOW()
  `
}
