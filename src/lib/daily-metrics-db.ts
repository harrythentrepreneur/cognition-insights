import { sql } from '@/lib/neon'

// ============================================================================
// Daily Metrics DB — Snapshot layer for deterministic Ad Tracker metrics
//
// Days older than the attribution window (7 days) are "settled" and stored
// in the database. Future reads for those days skip Stripe entirely,
// eliminating the cache-race and rolling-rate instability.
// ============================================================================

export interface DailyMetricsRow {
  date: string
  revenue: number
  refunds: number
  refund_count: number
  new_customers: number
  trial_signups: number
  successful_charges: number
  cash_pending: number
  arr: number
  churn_count: number
  active_subs_count: number
  trial_pipeline_monthly: number
  trial_pipeline_yearly: number
  trial_count_monthly: number
  trial_count_yearly: number
  trial_signups_monthly: number
  trial_signups_yearly: number
  ad_spend: number
  impressions: number
  clicks: number
  cpc: number
  cpm: number
  ctr: number
  reach: number
  // Attribution correction fields (computed server-side)
  net_revenue_with_attribution: number | null
  is_attribution_estimate: boolean
  conversion_rate_snapshot: number | null
  settled: boolean
}

/**
 * Idempotent — safe to call on every request.
 * Creates the table if it doesn't exist.
 */
export async function ensureDailyMetricsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS daily_metrics (
      date           TEXT PRIMARY KEY,
      revenue        DOUBLE PRECISION NOT NULL DEFAULT 0,
      refunds        DOUBLE PRECISION NOT NULL DEFAULT 0,
      refund_count   INTEGER NOT NULL DEFAULT 0,
      new_customers  INTEGER NOT NULL DEFAULT 0,
      trial_signups  INTEGER NOT NULL DEFAULT 0,
      successful_charges INTEGER NOT NULL DEFAULT 0,
      cash_pending   DOUBLE PRECISION NOT NULL DEFAULT 0,
      arr            DOUBLE PRECISION NOT NULL DEFAULT 0,
      churn_count    INTEGER NOT NULL DEFAULT 0,
      active_subs_count INTEGER NOT NULL DEFAULT 0,
      trial_pipeline_monthly DOUBLE PRECISION NOT NULL DEFAULT 0,
      trial_pipeline_yearly  DOUBLE PRECISION NOT NULL DEFAULT 0,
      trial_count_monthly    INTEGER NOT NULL DEFAULT 0,
      trial_count_yearly     INTEGER NOT NULL DEFAULT 0,
      trial_signups_monthly  INTEGER NOT NULL DEFAULT 0,
      trial_signups_yearly   INTEGER NOT NULL DEFAULT 0,
      ad_spend       DOUBLE PRECISION NOT NULL DEFAULT 0,
      impressions    INTEGER NOT NULL DEFAULT 0,
      clicks         INTEGER NOT NULL DEFAULT 0,
      cpc            DOUBLE PRECISION NOT NULL DEFAULT 0,
      cpm            DOUBLE PRECISION NOT NULL DEFAULT 0,
      ctr            DOUBLE PRECISION NOT NULL DEFAULT 0,
      reach          INTEGER NOT NULL DEFAULT 0,
      net_revenue_with_attribution DOUBLE PRECISION,
      is_attribution_estimate BOOLEAN NOT NULL DEFAULT FALSE,
      conversion_rate_snapshot DOUBLE PRECISION,
      settled        BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
}

/**
 * Write or update a single day's metrics.
 * Uses INSERT ... ON CONFLICT to safely upsert.
 */
export async function upsertDailyMetrics(row: DailyMetricsRow): Promise<void> {
  await sql`
    INSERT INTO daily_metrics (
      date, revenue, refunds, refund_count, new_customers,
      trial_signups, successful_charges, cash_pending, arr,
      churn_count, active_subs_count,
      trial_pipeline_monthly, trial_pipeline_yearly,
      trial_count_monthly, trial_count_yearly,
      trial_signups_monthly, trial_signups_yearly,
      ad_spend, impressions, clicks, cpc, cpm, ctr, reach,
      net_revenue_with_attribution, is_attribution_estimate,
      conversion_rate_snapshot, settled, updated_at
    ) VALUES (
      ${row.date}, ${row.revenue}, ${row.refunds}, ${row.refund_count},
      ${row.new_customers}, ${row.trial_signups}, ${row.successful_charges},
      ${row.cash_pending}, ${row.arr}, ${row.churn_count}, ${row.active_subs_count},
      ${row.trial_pipeline_monthly}, ${row.trial_pipeline_yearly},
      ${row.trial_count_monthly}, ${row.trial_count_yearly},
      ${row.trial_signups_monthly}, ${row.trial_signups_yearly},
      ${row.ad_spend}, ${row.impressions}, ${row.clicks},
      ${row.cpc}, ${row.cpm}, ${row.ctr}, ${row.reach},
      ${row.net_revenue_with_attribution}, ${row.is_attribution_estimate},
      ${row.conversion_rate_snapshot}, ${row.settled}, NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
      revenue = EXCLUDED.revenue,
      refunds = EXCLUDED.refunds,
      refund_count = EXCLUDED.refund_count,
      new_customers = EXCLUDED.new_customers,
      trial_signups = EXCLUDED.trial_signups,
      successful_charges = EXCLUDED.successful_charges,
      cash_pending = EXCLUDED.cash_pending,
      arr = EXCLUDED.arr,
      churn_count = EXCLUDED.churn_count,
      active_subs_count = EXCLUDED.active_subs_count,
      trial_pipeline_monthly = EXCLUDED.trial_pipeline_monthly,
      trial_pipeline_yearly = EXCLUDED.trial_pipeline_yearly,
      trial_count_monthly = EXCLUDED.trial_count_monthly,
      trial_count_yearly = EXCLUDED.trial_count_yearly,
      trial_signups_monthly = EXCLUDED.trial_signups_monthly,
      trial_signups_yearly = EXCLUDED.trial_signups_yearly,
      ad_spend = EXCLUDED.ad_spend,
      impressions = EXCLUDED.impressions,
      clicks = EXCLUDED.clicks,
      cpc = EXCLUDED.cpc,
      cpm = EXCLUDED.cpm,
      ctr = EXCLUDED.ctr,
      reach = EXCLUDED.reach,
      net_revenue_with_attribution = EXCLUDED.net_revenue_with_attribution,
      is_attribution_estimate = EXCLUDED.is_attribution_estimate,
      conversion_rate_snapshot = EXCLUDED.conversion_rate_snapshot,
      settled = EXCLUDED.settled,
      updated_at = NOW()
  `
}

/**
 * Batch upsert multiple days at once for efficiency.
 */
export async function upsertDailyMetricsBatch(rows: DailyMetricsRow[]): Promise<void> {
  // Neon serverless driver doesn't support batch natively,
  // so we run upserts concurrently (they're fast individual queries)
  await Promise.all(rows.map(row => upsertDailyMetrics(row)))
}

/**
 * Read settled metrics for a date range.
 * Returns only rows where settled = true.
 */
export async function getSettledMetrics(from: string, to: string): Promise<DailyMetricsRow[]> {
  const rows = await sql`
    SELECT * FROM daily_metrics
    WHERE date >= ${from} AND date <= ${to} AND settled = TRUE
    ORDER BY date ASC
  `
  return rows as unknown as DailyMetricsRow[]
}

/**
 * Read ALL metrics for a date range (settled or not).
 * Used when we want to check what's already been snapshot.
 */
export async function getAllMetrics(from: string, to: string): Promise<DailyMetricsRow[]> {
  const rows = await sql`
    SELECT * FROM daily_metrics
    WHERE date >= ${from} AND date <= ${to}
    ORDER BY date ASC
  `
  return rows as unknown as DailyMetricsRow[]
}

/**
 * Get the latest stored conversion rate snapshot.
 * Returns the most recent non-null conversion_rate_snapshot.
 */
export async function getLatestConversionRate(): Promise<number | null> {
  const rows = await sql`
    SELECT conversion_rate_snapshot FROM daily_metrics
    WHERE conversion_rate_snapshot IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `
  if (rows.length > 0 && rows[0].conversion_rate_snapshot != null) {
    return rows[0].conversion_rate_snapshot as number
  }
  return null
}

/**
 * Update ONLY the ad-spend columns for a given date.
 * Used by the Meta Ads route to fill in the previously-empty ad spend fields.
 * Uses INSERT ... ON CONFLICT to safely handle both new and existing rows.
 */
export async function updateAdSpendForDate(
  date: string,
  adSpend: number,
  impressions: number,
  clicks: number,
  cpc: number,
  cpm: number,
  ctr: number,
  reach: number,
): Promise<void> {
  await sql`
    INSERT INTO daily_metrics (date, ad_spend, impressions, clicks, cpc, cpm, ctr, reach, updated_at)
    VALUES (${date}, ${adSpend}, ${impressions}, ${clicks}, ${cpc}, ${cpm}, ${ctr}, ${reach}, NOW())
    ON CONFLICT (date) DO UPDATE SET
      ad_spend = ${adSpend},
      impressions = ${impressions},
      clicks = ${clicks},
      cpc = ${cpc},
      cpm = ${cpm},
      ctr = ${ctr},
      reach = ${reach},
      updated_at = NOW()
  `
}

/**
 * Batch update ad spend for multiple dates.
 */
export async function updateAdSpendBatch(
  rows: Array<{
    date: string
    adSpend: number
    impressions: number
    clicks: number
    cpc: number
    cpm: number
    ctr: number
    reach: number
  }>
): Promise<void> {
  await Promise.all(
    rows.map(r =>
      updateAdSpendForDate(r.date, r.adSpend, r.impressions, r.clicks, r.cpc, r.cpm, r.ctr, r.reach)
    )
  )
}

/**
 * Read settled ad-spend metrics for a date range.
 * Returns rows that have non-zero ad_spend for dates within the settled window.
 * Used by Meta Ads route to skip API calls for historical days.
 */
export async function getSettledAdSpend(from: string, to: string): Promise<Array<{
  date: string
  ad_spend: number
  impressions: number
  clicks: number
  cpc: number
  cpm: number
  ctr: number
  reach: number
}>> {
  const rows = await sql`
    SELECT date, ad_spend, impressions, clicks, cpc, cpm, ctr, reach
    FROM daily_metrics
    WHERE date >= ${from} AND date <= ${to}
      AND ad_spend > 0
    ORDER BY date ASC
  `
  return rows as unknown as Array<{
    date: string; ad_spend: number; impressions: number; clicks: number
    cpc: number; cpm: number; ctr: number; reach: number
  }>
}

/**
 * Get table row count and last updated timestamp for health checks.
 */
export async function getMetricsHealth(): Promise<{ count: number; lastUpdated: string | null }> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count,
           MAX(updated_at)::text AS last_updated
    FROM daily_metrics
  `
  return {
    count: rows[0]?.count ?? 0,
    lastUpdated: rows[0]?.last_updated ?? null,
  }
}

