// ============================================================================
// In-memory + DB event store for Stripe live feed
// Shared module — imported by both the webhook and the live-events route
//
// Uses NeonDB as the primary store with an in-memory read-through cache.
// Events survive server restarts via the live_events table.
// ============================================================================

import {
  ensureEventsTable,
  insertEvent as dbInsertEvent,
  insertEventsBatch as dbInsertEventsBatch,
  getRecentEvents as dbGetRecentEvents,
  type EventRow,
} from '@/lib/events-db'

export interface LiveEvent {
  id: string
  type: 'payment' | 'signup' | 'trial_start' | 'subscription' | 'churn' | 'refund' | 'upgrade'
  description: string
  amount?: string
  email: string
  timestamp: string  // ISO string
}

const MAX_EVENTS = 100

declare global {
  var __adTrackerLiveEvents: LiveEvent[] | undefined
  var __adTrackerEventsDbReady: boolean | undefined
}

function getEventStore(): LiveEvent[] {
  if (!global.__adTrackerLiveEvents) {
    global.__adTrackerLiveEvents = []
  }
  return global.__adTrackerLiveEvents
}

/**
 * Ensure the DB table exists (idempotent, cached per server lifecycle).
 */
async function ensureDb(): Promise<void> {
  if (global.__adTrackerEventsDbReady) return
  try {
    await ensureEventsTable()
    global.__adTrackerEventsDbReady = true
  } catch (err) {
    console.warn('[event-store] Failed to ensure live_events table:', err)
  }
}

/**
 * Add a live event to both in-memory store and DB.
 */
export function addLiveEvent(event: LiveEvent) {
  const store = getEventStore()
  store.unshift(event)
  if (store.length > MAX_EVENTS) {
    store.length = MAX_EVENTS
  }

  // Fire-and-forget DB write
  ensureDb().then(() => {
    const row: EventRow = {
      id: event.id,
      type: event.type,
      description: event.description,
      amount: event.amount ?? null,
      email: event.email,
      timestamp: event.timestamp,
    }
    dbInsertEvent(row).catch(err =>
      console.warn('[event-store] Failed to persist event to DB:', err)
    )
  }).catch(() => {})
}

/**
 * Add multiple events in batch (used by seed logic).
 */
export function addLiveEventsBatch(events: LiveEvent[]) {
  const store = getEventStore()
  // Add to in-memory store oldest-first (they'll be unshifted)
  for (const event of events) {
    store.unshift(event)
  }
  if (store.length > MAX_EVENTS) {
    store.length = MAX_EVENTS
  }

  // Fire-and-forget batch DB write
  ensureDb().then(() => {
    const rows: EventRow[] = events.map(e => ({
      id: e.id,
      type: e.type,
      description: e.description,
      amount: e.amount ?? null,
      email: e.email,
      timestamp: e.timestamp,
    }))
    dbInsertEventsBatch(rows).catch(err =>
      console.warn('[event-store] Failed to persist events batch to DB:', err)
    )
  }).catch(() => {})
}

/**
 * Get live events. If in-memory store is empty, seeds from DB first.
 */
export function getLiveEvents(): LiveEvent[] {
  return getEventStore()
}

/**
 * Hydrate in-memory store from DB. Called on first request.
 */
export async function hydrateFromDb(): Promise<void> {
  const store = getEventStore()
  if (store.length > 0) return // Already populated

  try {
    await ensureDb()
    const rows = await dbGetRecentEvents(MAX_EVENTS)
    if (rows.length > 0) {
      const events: LiveEvent[] = rows.map(r => ({
        id: r.id,
        type: r.type as LiveEvent['type'],
        description: r.description,
        amount: r.amount ?? undefined,
        email: r.email,
        timestamp: r.timestamp,
      }))
      global.__adTrackerLiveEvents = events
      console.log(`[event-store] Hydrated ${events.length} events from DB`)
    }
  } catch (err) {
    console.warn('[event-store] Failed to hydrate from DB:', err)
  }
}
