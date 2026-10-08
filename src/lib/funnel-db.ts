import { sql } from '@/lib/neon'

// ============================================================================
// Funnel Snapshots DB — Persists daily funnel stage counts to NeonDB
//
// Settled days (older than 7 days) are frozen into the database so that
// historical funnel data never changes and reduces Stripe API call volume.
// ============================================================================

export interface FunnelSnapshotRow {
  date: string
  leads: number
  checkouts_started: number
  checkouts_completed: number
  purchases: number
  settled: boolean
}

/**
 * Idempotent — safe to call on every request.
 */
export async function ensureFunnelTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS funnel_snapshots (
      date                TEXT PRIMARY KEY,
      leads               INTEGER NOT NULL DEFAULT 0,
      checkouts_started   INTEGER NOT NULL DEFAULT 0,
      checkouts_completed INTEGER NOT NULL DEFAULT 0,
      purchases           INTEGER NOT NULL DEFAULT 0,
      settled             BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
}

/**
 * Upsert a single day's funnel snapshot.
 */
export async function upsertFunnelDay(row: FunnelSnapshotRow): Promise<void> {
  await sql`
    INSERT INTO funnel_snapshots (
      date, leads, checkouts_started, checkouts_completed,
      purchases, settled, updated_at
    ) VALUES (
      ${row.date}, ${row.leads}, ${row.checkouts_started},
      ${row.checkouts_completed}, ${row.purchases}, ${row.settled}, NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
      leads = EXCLUDED.leads,
      checkouts_started = EXCLUDED.checkouts_started,
      checkouts_completed = EXCLUDED.checkouts_completed,
      purchases = EXCLUDED.purchases,
      settled = EXCLUDED.settled,
      updated_at = NOW()
  `
}

/**
 * Batch upsert funnel days.
 */
export async function upsertFunnelDaysBatch(rows: FunnelSnapshotRow[]): Promise<void> {
  await Promise.all(rows.map(row => upsertFunnelDay(row)))
}

/**
 * Read settled funnel days for a date range.
 */
export async function getSettledFunnelDays(from: string, to: string): Promise<FunnelSnapshotRow[]> {
  const rows = await sql`
    SELECT * FROM funnel_snapshots
    WHERE date >= ${from} AND date <= ${to} AND settled = TRUE
    ORDER BY date ASC
  `
  return rows as unknown as FunnelSnapshotRow[]
}

/**
 * Get table row count for health checks.
 */
export async function getFunnelCount(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM funnel_snapshots`
  return rows[0]?.count ?? 0
}
