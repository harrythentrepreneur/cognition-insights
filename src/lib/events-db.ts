import { sql } from '@/lib/neon'

// ============================================================================
// Live Events DB — Persists Stripe live-feed events to NeonDB
//
// Replaces the in-memory event store so live events survive server restarts.
// The event-store.ts module wraps this with an in-memory read-through cache.
// ============================================================================

export interface EventRow {
  id: string
  type: 'payment' | 'signup' | 'trial_start' | 'subscription' | 'churn' | 'refund' | 'upgrade'
  description: string
  amount: string | null
  email: string
  timestamp: string  // ISO string
}

/**
 * Idempotent — safe to call on every request.
 */
export async function ensureEventsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS live_events (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount      TEXT,
      email       TEXT NOT NULL DEFAULT '',
      timestamp   TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  // Index for fast "newer than" queries used by polling
  await sql`
    CREATE INDEX IF NOT EXISTS idx_live_events_timestamp
    ON live_events (timestamp DESC)
  `
}

/**
 * Insert a single event. Ignores duplicates (ON CONFLICT DO NOTHING).
 */
export async function insertEvent(event: EventRow): Promise<void> {
  await sql`
    INSERT INTO live_events (id, type, description, amount, email, timestamp)
    VALUES (
      ${event.id}, ${event.type}, ${event.description},
      ${event.amount}, ${event.email}, ${event.timestamp}
    )
    ON CONFLICT (id) DO NOTHING
  `
}

/**
 * Batch insert events. Ignores duplicates.
 */
export async function insertEventsBatch(events: EventRow[]): Promise<void> {
  await Promise.all(events.map(e => insertEvent(e)))
}

/**
 * Get recent events, newest first.
 * Optionally filter to events newer than `afterId`.
 */
export async function getRecentEvents(limit: number = 50, afterTimestamp?: string): Promise<EventRow[]> {
  let rows
  if (afterTimestamp) {
    rows = await sql`
      SELECT id, type, description, amount, email, timestamp::text
      FROM live_events
      WHERE timestamp > ${afterTimestamp}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `
  } else {
    rows = await sql`
      SELECT id, type, description, amount, email, timestamp::text
      FROM live_events
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `
  }
  return rows as unknown as EventRow[]
}

/**
 * Get table row count for health checks.
 */
export async function getEventsCount(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM live_events`
  return rows[0]?.count ?? 0
}

/**
 * Get the most recent event timestamp for health checks.
 */
export async function getLatestEventTimestamp(): Promise<string | null> {
  const rows = await sql`
    SELECT timestamp::text FROM live_events
    ORDER BY timestamp DESC LIMIT 1
  `
  return rows[0]?.timestamp ?? null
}

/**
 * Prune old events to prevent unbounded table growth.
 * Keeps only the most recent `keep` events.
 */
export async function pruneOldEvents(keep: number = 500): Promise<number> {
  const result = await sql`
    DELETE FROM live_events
    WHERE id NOT IN (
      SELECT id FROM live_events
      ORDER BY timestamp DESC
      LIMIT ${keep}
    )
  `
  return (result as any)?.length ?? 0
}

