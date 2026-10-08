import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sql } from '@/lib/neon'
import { timestampToSydneyDate, isoToSydneyDate, sydneyDateRangeToTimestamps } from '../timezone'
import {
  ensureFunnelTable,
  upsertFunnelDaysBatch,
  getSettledFunnelDays,
  type FunnelSnapshotRow,
} from '@/lib/funnel-db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

// ============================================================================
// GET /api/ad-tracker/funnel
// Returns funnel stages for ONE-TIME PAYMENT model:
//   Signups (Neon DB) → Checkouts Started → Checkouts Completed → Purchased
// Query params: ?from=2024-01-01&to=2024-12-31
// ============================================================================

// Cache
interface CacheEntry { data: any; ts: number }
const CACHE_TTL = 15 * 60 * 1000
declare global { var __funnelCache: Map<string, CacheEntry> | undefined }
function getCache(): Map<string, CacheEntry> {
  if (!global.__funnelCache) global.__funnelCache = new Map()
  return global.__funnelCache
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
    const cacheKey = `funnel:${from}:${to}`

    const cache = getCache()
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // ================================================================
    // SETTLED DATA — read frozen funnel days from DB to skip Stripe API
    // Days older than 7 days are "settled" and won't change.
    // ================================================================
    const ATTRIBUTION_WINDOW = 7
    const todayStr = new Date().toISOString().split('T')[0]
    const cutoffDate = new Date(todayStr)
    cutoffDate.setDate(cutoffDate.getDate() - ATTRIBUTION_WINDOW)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    let settledFunnelDays: FunnelSnapshotRow[] = []
    try {
      await ensureFunnelTable()
      if (from < cutoffDateStr) {
        settledFunnelDays = await getSettledFunnelDays(from, cutoffDateStr)
      }
    } catch (dbErr) {
      console.warn('[funnel] Failed to read settled funnel days from DB:', dbErr)
    }

    // Check if we have complete settled data for the historical portion
    const settledDates = new Set(settledFunnelDays.map(r => r.date))
    const expectedSettledDays: string[] = []
    if (from < cutoffDateStr) {
      const d = new Date(from)
      const end = new Date(Math.min(new Date(cutoffDateStr).getTime(), new Date(to).getTime()))
      while (d <= end) {
        expectedSettledDays.push(d.toISOString().split('T')[0])
        d.setDate(d.getDate() + 1)
      }
    }
    const hasAllSettled = expectedSettledDays.length > 0 &&
      expectedSettledDays.every(d => settledDates.has(d))

    // Determine fetch window: only fetch live days from Stripe if settled data covers history
    const liveFrom = hasAllSettled
      ? new Date(cutoffDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : from
    const liveTo = to

    // Use Sydney timezone-aware timestamps for the fetch window
    const { fromTs, toTs } = sydneyDateRangeToTimestamps(liveFrom, liveTo)

    // Fetch data — only for the live window (or full range if no settled data)
    const [neonLeads, rawCheckoutSessions, charges] = await Promise.all([
      fetchNeonLeads(liveFrom, liveTo),
      fetchAllCheckoutSessions(fromTs, toTs),
      fetchAllCharges(fromTs, toTs),
    ])

    // Find and exclude 100% off checkout sessions and customers
    const freeCustomerIds = new Set<string>()
    const checkoutSessions = rawCheckoutSessions.filter(s => {
      const sub = s.subscription as Stripe.Subscription | null | undefined
      // @ts-ignore
      const is100PercentOff = sub && (sub.discount?.coupon?.percent_off === 100 || sub.discounts?.[0]?.coupon?.percent_off === 100)
      if (is100PercentOff) {
        const cid = typeof s.customer === 'string' ? s.customer : s.customer?.id || ''
        if (cid) freeCustomerIds.add(cid)
        return false // exclude from funnel
      }
      return true
    })

    // ──────────────────────────────────────────────────────
    // FUNNEL STAGES (designed for one-time payment model)
    // ──────────────────────────────────────────────────────

    // Stage 1: Leads — real user signups from Neon DB (top-of-funnel)
    const liveLeads = neonLeads.length

    // Stage 2: Checkouts Started — total checkout sessions created
    const liveCheckoutsStarted = checkoutSessions.length

    // Stage 3: Checkouts Completed — sessions that completed payment
    const completedSessions = checkoutSessions.filter(
      s => s.payment_status === 'paid' && s.status === 'complete'
    )
    const liveCheckoutsCompleted = completedSessions.length

    // Stage 4: Purchases — successful charges (the real money)
    const successfulCharges = charges.filter(c => {
      const cid = typeof c.customer === 'string' ? c.customer : c.customer?.id || ''
      return c.status === 'succeeded' && !freeCustomerIds.has(cid)
    })
    const livePurchases = successfulCharges.length

    // Sum settled totals from DB
    const settledLeads = settledFunnelDays.reduce((s, r) => s + r.leads, 0)
    const settledCheckoutsStarted = settledFunnelDays.reduce((s, r) => s + r.checkouts_started, 0)
    const settledCheckoutsCompleted = settledFunnelDays.reduce((s, r) => s + r.checkouts_completed, 0)
    const settledPurchases = settledFunnelDays.reduce((s, r) => s + r.purchases, 0)

    // Combined totals
    const leads = settledLeads + liveLeads
    const checkoutsStarted = settledCheckoutsStarted + liveCheckoutsStarted
    const checkoutsCompleted = settledCheckoutsCompleted + liveCheckoutsCompleted
    const purchases = settledPurchases + livePurchases

    // Conversion rates
    const leadsToCheckout = leads > 0
      ? Math.round((checkoutsStarted / leads) * 10000) / 100 : 0
    const checkoutToComplete = checkoutsStarted > 0
      ? Math.round((checkoutsCompleted / checkoutsStarted) * 10000) / 100 : 0
    const completeToPurchase = checkoutsCompleted > 0
      ? Math.round((purchases / checkoutsCompleted) * 10000) / 100 : 0
    const overallConversion = leads > 0
      ? Math.round((purchases / leads) * 10000) / 100 : 0

    // Build daily time series — settled days from DB, live days from API
    const dailyLeads = buildDailyCountFromDates(neonLeads.map(u => u.created_at), liveFrom, liveTo)
    const dailyCheckouts = buildDailyCount(checkoutSessions.map(s => s.created), liveFrom, liveTo)
    const dailyCompleted = buildDailyCount(completedSessions.map(s => s.created), liveFrom, liveTo)
    const dailyPurchases = buildDailyCount(successfulCharges.map(c => c.created), liveFrom, liveTo)

    // Merge settled DB days into the time series (prepend, they're older)
    const settledLeadsSeries = settledFunnelDays.map(r => ({ date: r.date, count: r.leads }))
    const settledCheckoutsSeries = settledFunnelDays.map(r => ({ date: r.date, count: r.checkouts_started }))
    const settledCompletedSeries = settledFunnelDays.map(r => ({ date: r.date, count: r.checkouts_completed }))
    const settledPurchasesSeries = settledFunnelDays.map(r => ({ date: r.date, count: r.purchases }))

    const mergedLeads = [...settledLeadsSeries, ...dailyLeads].sort((a, b) => a.date.localeCompare(b.date))
    const mergedCheckouts = [...settledCheckoutsSeries, ...dailyCheckouts].sort((a, b) => a.date.localeCompare(b.date))
    const mergedCompleted = [...settledCompletedSeries, ...dailyCompleted].sort((a, b) => a.date.localeCompare(b.date))
    const mergedPurchases = [...settledPurchasesSeries, ...dailyPurchases].sort((a, b) => a.date.localeCompare(b.date))

    // Drop-off analysis
    const dropOffs = {
      leadToCheckout: leads - checkoutsStarted,
      checkoutAbandonment: checkoutsStarted - checkoutsCompleted,
      completionToCharge: checkoutsCompleted - purchases,
    }

    const responseData = {
      stages: {
        leads,
        checkoutsStarted,
        checkoutsCompleted,
        purchases,
      },
      conversionRates: {
        leadsToCheckout,
        checkoutToComplete,
        completeToPurchase,
        overallConversion,
      },
      dropOffs,
      timeSeries: {
        leads: mergedLeads,
        checkoutsStarted: mergedCheckouts,
        checkoutsCompleted: mergedCompleted,
        purchases: mergedPurchases,
      },
      meta: { from, to },
    }

    cache.set(cacheKey, { data: responseData, ts: Date.now() });

    // ================================================================
    // SNAPSHOT SETTLED FUNNEL DAYS TO DB (fire-and-forget)
    // Only write LIVE days that are now settled (not already in DB)
    // ================================================================
    void (async () => {
      try {
        await ensureFunnelTable()

        const newSettledRows: FunnelSnapshotRow[] = []

        // Build per-day counts from the LIVE time series only
        const dailyLeadsMap = new Map(dailyLeads.map(d => [d.date, d.count]))
        const dailyCheckoutsMap = new Map(dailyCheckouts.map(d => [d.date, d.count]))
        const dailyCompletedMap = new Map(dailyCompleted.map(d => [d.date, d.count]))
        const dailyPurchasesMap = new Map(dailyPurchases.map(d => [d.date, d.count]))

        for (const item of dailyLeads) {
          // Only snapshot days that are settled AND not already in DB
          if (item.date <= cutoffDateStr && !settledDates.has(item.date)) {
            newSettledRows.push({
              date: item.date,
              leads: dailyLeadsMap.get(item.date) || 0,
              checkouts_started: dailyCheckoutsMap.get(item.date) || 0,
              checkouts_completed: dailyCompletedMap.get(item.date) || 0,
              purchases: dailyPurchasesMap.get(item.date) || 0,
              settled: true,
            })
          }
        }

        if (newSettledRows.length > 0) {
          await upsertFunnelDaysBatch(newSettledRows)
        }
      } catch (err) {
        console.warn('[funnel] Failed to snapshot funnel days to DB:', err)
      }
    })()

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Error fetching funnel data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch funnel data' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PAGINATED FETCHERS
// ============================================================================

async function fetchNeonLeads(from: string, to: string): Promise<Array<{ created_at: string }>> {
  // Use Sydney timezone for date comparison
  const rows = await sql`
    SELECT created_at::text
    FROM users
    WHERE (created_at AT TIME ZONE ${process.env.REPORTING_TIMEZONE || 'UTC'})::date >= ${from}::date
      AND (created_at AT TIME ZONE ${process.env.REPORTING_TIMEZONE || 'UTC'})::date <= ${to}::date
    ORDER BY created_at
  `
  return rows as Array<{ created_at: string }>
}

async function fetchAllCheckoutSessions(fromTs: number, toTs: number): Promise<Stripe.Checkout.Session[]> {
  const all: Stripe.Checkout.Session[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.Checkout.SessionListParams = {
      created: { gte: fromTs, lte: toTs },
      limit: 100,
      expand: ['data.subscription', 'data.subscription.discounts'],
    }
    if (startingAfter) params.starting_after = startingAfter
    const batch = await stripe.checkout.sessions.list(params)
    all.push(...batch.data)
    hasMore = batch.has_more
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
  }
  return all
}

async function fetchAllCharges(fromTs: number, toTs: number): Promise<Stripe.Charge[]> {
  const all: Stripe.Charge[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.ChargeListParams = {
      created: { gte: fromTs, lte: toTs },
      limit: 100,
    }
    if (startingAfter) params.starting_after = startingAfter
    const batch = await stripe.charges.list(params)
    all.push(...batch.data)
    hasMore = batch.has_more
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
  }
  return all
}

function buildDailyCount(timestamps: number[], from: string, to: string): Array<{ date: string; count: number }> {
  const buckets = new Map<string, number>()
  const startDate = new Date(from)
  const endDate = new Date(to)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    buckets.set(d.toISOString().split('T')[0], 0)
  }

  // Bucket by Sydney-local date
  for (const ts of timestamps) {
    const date = timestampToSydneyDate(ts)
    if (buckets.has(date)) {
      buckets.set(date, (buckets.get(date) || 0) + 1)
    }
  }

  return Array.from(buckets.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function buildDailyCountFromDates(isoStrings: string[], from: string, to: string): Array<{ date: string; count: number }> {
  const buckets = new Map<string, number>()
  const startDate = new Date(from)
  const endDate = new Date(to)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    buckets.set(d.toISOString().split('T')[0], 0)
  }

  // Bucket by Sydney-local date
  for (const iso of isoStrings) {
    const date = isoToSydneyDate(iso)
    if (buckets.has(date)) {
      buckets.set(date, (buckets.get(date) || 0) + 1)
    }
  }

  return Array.from(buckets.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
