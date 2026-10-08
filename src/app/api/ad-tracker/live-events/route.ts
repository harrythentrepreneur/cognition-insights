import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { addLiveEvent, addLiveEventsBatch, getLiveEvents, hydrateFromDb } from '../event-store'
import { pruneOldEvents } from '@/lib/events-db'

// ============================================================================
// GET /api/ad-tracker/live-events
// Returns recent Stripe events for the live feed
// Query params: ?limit=30&after=evt_123 (for polling)
//
// Auto-seeds from Stripe history when the in-memory store is empty.
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

// Track whether we've already seeded this server lifecycle
declare global {
  var __liveEventsSeeded: boolean | undefined
}

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------

/** Capitalise first letter of each word */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

/** Strip trailing digits/noise from email usernames: "Michelle72e" → "Michelle" */
function cleanToken(s: string): string {
  return s.replace(/[\d]+[a-z]?$/i, '').replace(/[_]+$/, '') || s
}

/**
 * Build a privacy-shortened display name from raw Stripe fields.
 * Handles: proper names, email usernames, dot-separated emails.
 *
 * "Harry Edwards"        → "Harry E."
 * "christie"             → "Christie"
 * "jacqueline.hutchinson" → "Jacqueline H."
 * "michelle72e"          → "Michelle"
 * null / ""              → "Customer"
 */
function formatName(raw: string | null | undefined, email?: string | null): string {
  let name = (raw || '').trim()

  // Strip "undefined" tokens that Stripe sometimes stores
  name = name.replace(/\bundefined\b/gi, '').trim()

  // Fallback to email local-part
  if (!name && email) {
    name = email.split('@')[0]
  }
  if (!name) return 'Customer'

  // If the name contains dots (email-style), split on dots to extract first/last
  if (name.includes('.') && !name.includes(' ')) {
    const dotParts = name.split('.').map(p => cleanToken(p)).filter(Boolean)
    if (dotParts.length >= 2) {
      const first = titleCase(dotParts[0])
      const last = titleCase(dotParts[dotParts.length - 1])
      return `${first} ${last[0]}.`
    }
    if (dotParts.length === 1) {
      return titleCase(dotParts[0])
    }
  }

  // Title-case
  name = titleCase(name)

  // Split on spaces
  const parts = name.split(/\s+/).filter(Boolean)

  // Multi-word: "Harry Edwards" → "Harry E."
  if (parts.length > 1) {
    const last = parts[parts.length - 1]
    return `${parts.slice(0, -1).join(' ')} ${last[0]}.`
  }

  // Single word — clean trailing numbers and truncate long usernames
  let single = cleanToken(parts[0])
  single = titleCase(single)
  if (single.length > 14) {
    single = single.slice(0, 12) + '…'
  }
  return single || 'Customer'
}

// ---------------------------------------------------------------------------
// Seed from Stripe history
// ---------------------------------------------------------------------------

async function seedFromStripeHistory() {
  if (global.__liveEventsSeeded) return

  // First, try to hydrate from DB — events that survived a restart
  await hydrateFromDb()

  if (getLiveEvents().length > 0) {
    global.__liveEventsSeeded = true
    return
  }

  global.__liveEventsSeeded = true // Set early to prevent concurrent seeds

  try {
    // Fetch multiple data sources in parallel
    const [charges, refunds, checkoutSessions, subscriptions] = await Promise.all([
      stripe.charges.list({
        limit: 30,
        expand: ['data.customer', 'data.balance_transaction'],
      }),
      stripe.refunds.list({
        limit: 10,
        expand: ['data.charge', 'data.balance_transaction'],
      }),
      stripe.checkout.sessions.list({
        limit: 30,
      }),
      stripe.subscriptions.list({
        limit: 20,
        expand: ['data.customer', 'data.discounts'],
        status: 'all',
      }),
    ])

    // Collect all events into a unified list
    const allEvents: Array<{
      created: number
      build: () => {
        id: string
        type: 'payment' | 'signup' | 'trial_start' | 'subscription' | 'churn' | 'refund' | 'upgrade'
        description: string
        amount?: string
        email: string
        timestamp: string
      }
    }> = []

    // Track which customer IDs we've generated signup events for (dedup)
    const seenCustomerSignups = new Set<string>()

    // ── Charges → payment + signup events ───────────────────
    for (const charge of charges.data) {
      if (charge.status !== 'succeeded') continue

      const customer = charge.customer as Stripe.Customer | null
      const email = charge.billing_details?.email
        || (customer && typeof customer !== 'string' ? customer.email : null)
        || ''
      const rawName = charge.billing_details?.name
        || (customer && typeof customer !== 'string' ? customer.name : null)
      const shortName = formatName(rawName, email)

      // Use balance_transaction.amount for settled USD value (consistent with revenue charts)
      const bt = charge.balance_transaction as Stripe.BalanceTransaction | null
      const usdAmount = (bt && typeof bt !== 'string')
        ? Math.abs(bt.amount) / 100
        : charge.amount / 100

      allEvents.push({
        created: charge.created,
        build: () => ({
          id: `seed_${charge.id}`,
          type: 'payment',
          description: shortName,
          amount: `$${usdAmount.toFixed(0)}`,
          email,
          timestamp: new Date(charge.created * 1000).toISOString(),
        }),
      })

      // Generate a "signup" event for the customer if they were created near this charge
      if (customer && typeof customer !== 'string' && !seenCustomerSignups.has(customer.id)) {
        const gap = charge.created - customer.created
        if (gap >= 0 && gap < 300) {
          seenCustomerSignups.add(customer.id)
          allEvents.push({
            created: customer.created,
            build: () => ({
              id: `seed_cust_${customer.id}`,
              type: 'signup' as const,
              description: shortName,
              email,
              timestamp: new Date(customer.created * 1000).toISOString(),
            }),
          })
        }
      }
    }

    // ── Refunds → refund events ─────────────────────────────
    for (const refund of refunds.data) {
      const charge = refund.charge as Stripe.Charge | null
      const email = charge?.billing_details?.email || ''
      const rawName = charge?.billing_details?.name
      const shortName = formatName(rawName, email)

      // Use balance_transaction.amount for settled USD value (consistent with revenue charts)
      const bt = refund.balance_transaction as Stripe.BalanceTransaction | null
      const usdAmount = (bt && typeof bt !== 'string')
        ? Math.abs(bt.amount) / 100
        : refund.amount / 100

      allEvents.push({
        created: refund.created,
        build: () => ({
          id: `seed_${refund.id}`,
          type: 'refund' as const,
          description: shortName,
          amount: `$${usdAmount.toFixed(0)}`,
          email,
          timestamp: new Date(refund.created * 1000).toISOString(),
        }),
      })
    }

    // ── Checkout sessions → checkout initiated / abandoned ────
    for (const session of checkoutSessions.data) {
      const email = session.customer_email || session.customer_details?.email || ''
      const rawName = session.customer_details?.name
      const shortName = formatName(rawName, email)

      if (session.payment_status === 'unpaid' || session.status === 'open') {
        // Checkout initiated but not completed → signup type
        allEvents.push({
          created: session.created,
          build: () => ({
            id: `seed_sess_${session.id}`,
            type: 'signup' as const,
            description: shortName,
            email,
            timestamp: new Date(session.created * 1000).toISOString(),
          }),
        })
      } else if (session.status === 'expired') {
        // Abandoned checkout
        allEvents.push({
          created: session.created,
          build: () => ({
            id: `seed_sess_${session.id}`,
            type: 'churn' as const,
            description: shortName,
            email,
            timestamp: new Date(session.created * 1000).toISOString(),
          }),
        })
      }
    }

    // ── Subscriptions → trial / subscription events ─────────
    for (const sub of subscriptions.data) {
      // Skip 100%-off (free) subscriptions from live feed
      const is100PercentOff = (sub as any).discount?.coupon?.percent_off === 100 || (sub as any).discounts?.[0]?.coupon?.percent_off === 100
      if (is100PercentOff) continue

      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const customerObj = (typeof sub.customer !== 'string' && !('deleted' in sub.customer)) ? sub.customer as Stripe.Customer : null
      const email = customerObj?.email || ''
      const shortName = formatName(customerObj?.name, email)

      if (sub.status === 'trialing') {
        allEvents.push({
          created: sub.created,
          build: () => ({
            id: `seed_sub_${sub.id}`,
            type: 'trial_start' as const,
            description: shortName,
            email,
            timestamp: new Date(sub.created * 1000).toISOString(),
          }),
        })
      } else if (sub.status === 'active') {
        allEvents.push({
          created: sub.created,
          build: () => ({
            id: `seed_sub_${sub.id}`,
            type: 'subscription' as const,
            description: shortName,
            email,
            timestamp: new Date(sub.created * 1000).toISOString(),
          }),
        })
      } else if (sub.status === 'canceled') {
        const canceledAt = sub.canceled_at || sub.created
        let amount = 0
        if (sub.items && sub.items.data) {
          for (const item of sub.items.data) {
            if (item.plan && item.plan.amount) {
              amount += item.plan.amount * (item.quantity || 1)
            }
          }
        }
        const amountStr = amount > 0 ? `$${(amount / 100).toFixed(0)}` : undefined

        allEvents.push({
          created: canceledAt,
          build: () => ({
            id: `seed_sub_cancel_${sub.id}`,
            type: 'churn' as const,
            description: shortName,
            amount: amountStr,
            email,
            timestamp: new Date(canceledAt * 1000).toISOString(),
          }),
        })
      }
    }

    // Sort newest first and build all events, then batch-add to store + DB
    allEvents.sort((a, b) => b.created - a.created)
    const builtEvents = allEvents.map(e => e.build())
    // Reverse so oldest are first (addLiveEventsBatch unshifts each)
    addLiveEventsBatch(builtEvents.reverse())

    console.log(`[live-events] Seeded ${builtEvents.length} events from Stripe history`)

    // Prune old events periodically (fire-and-forget)
    pruneOldEvents(500).catch(() => {})
  } catch (error) {
    console.error('[live-events] Failed to seed from Stripe history:', error)
    global.__liveEventsSeeded = false
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auto-seed on first request if the store is empty
    await seedFromStripeHistory()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    const after = searchParams.get('after')

    let events = getLiveEvents()

    // If 'after' is provided, return only events newer than that ID
    if (after) {
      const afterIdx = events.findIndex(e => e.id === after)
      if (afterIdx > 0) {
        events = events.slice(0, afterIdx)
      } else if (afterIdx === 0) {
        events = []
      }
    }

    return NextResponse.json({
      events: events.slice(0, limit),
      total: getLiveEvents().length,
    })
  } catch (error: any) {
    console.error('Error fetching live events:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch live events' },
      { status: 500 }
    )
  }
}
