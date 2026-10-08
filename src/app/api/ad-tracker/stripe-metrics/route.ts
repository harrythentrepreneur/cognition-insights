import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { timestampToSydneyDate, sydneyDateRangeToTimestamps } from '../timezone'
import {
  ensureDailyMetricsTable,
  getSettledMetrics,
  upsertDailyMetricsBatch,
  getLatestConversionRate,
  type DailyMetricsRow,
} from '@/lib/daily-metrics-db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

// Number of days within which data is considered "live" (not yet settled)
const ATTRIBUTION_WINDOW = 7

// ============================================================================
// GET /api/ad-tracker/stripe-metrics
// Returns aggregated revenue, refund rate, customers, LTV over time
// Optimized for ONE-TIME PAYMENT model (not subscriptions)
// Query params: ?from=2024-01-01&to=2024-12-31&interval=day
// ============================================================================

// Server-side cache (same as Meta routes)
interface CacheEntry { data: any; ts: number }
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes — Stripe data is less volatile
declare global { var __stripeMetricsCache: Map<string, CacheEntry> | undefined }
function getCache(): Map<string, CacheEntry> {
  if (!global.__stripeMetricsCache) global.__stripeMetricsCache = new Map()
  return global.__stripeMetricsCache
}

interface DailyBucket {
  date: string
  revenue: number
  refunds: number
  refundCount: number
  newCustomers: number       // new Stripe customers created
  trialSignups: number       // new trial subscriptions started
  successfulCharges: number  // successful charges (purchases)
  avgTransactionValue: number
  cashPending: number
  arr: number
  churnCount: number
  activeSubsCount: number
  // Per-day trial pipeline breakdown
  trialPipelineMonthly: number
  trialPipelineYearly: number
  trialCountMonthly: number
  trialCountYearly: number
  // Per-day NEW trial signups by plan interval (not cumulative)
  trialSignupsMonthly: number
  trialSignupsYearly: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = searchParams.get('to') || timestampToSydneyDate(Math.floor(Date.now() / 1000))
    const interval = searchParams.get('interval') || 'day'
    const attribution = searchParams.get('attribution') || 'charge' // 'trial' or 'charge'
    const cacheKey = `stripe:${from}:${to}:${interval}:attr=${attribution}`

    // Check cache
    const cache = getCache()
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // Ensure DB table exists (idempotent, fast after first call)
    await ensureDailyMetricsTable()

    // Compute the cutoff date: days older than this are "settled" and
    // can be read from DB rather than recomputed from Stripe
    const todaySydney = timestampToSydneyDate(Math.floor(Date.now() / 1000))
    const cutoffDate = new Date(todaySydney)
    cutoffDate.setDate(cutoffDate.getDate() - ATTRIBUTION_WINDOW)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    // Try to read settled days from DB
    // IMPORTANT: Only use settled DB rows for charge-date mode.
    // The DB snapshots are frozen with charge-date revenue values;
    // using them under trial attribution would overwrite the correctly
    // computed trial-start-date revenue (the root cause of the $743 vs $1030 bug).
    let settledRows: DailyMetricsRow[] = []
    if (attribution !== 'trial') {
      try {
        settledRows = await getSettledMetrics(from, cutoffDateStr)
      } catch (dbErr) {
        console.warn('Failed to read settled metrics from DB, falling back to full Stripe fetch:', dbErr)
      }
    }

    // Use Sydney timezone-aware timestamps for the fetch window
    // This widens the UTC range to ensure we capture all records that
    // fall within Sydney-local date boundaries
    const { fromTs, toTs } = sydneyDateRangeToTimestamps(from, to)

    const [charges, refundsList, customers, subscriptions] = await Promise.all([
      fetchAllCharges(fromTs, toTs),
      fetchAllRefunds(fromTs, toTs),
      fetchAllCustomers(fromTs, toTs),
      fetchAllSubscriptions(fromTs, toTs),
    ])

    // Identify customers who are on a 100% off plan
    const freeCustomerIds = new Set<string>()
    for (const sub of subscriptions) {
      // @ts-ignore
      const is100PercentOff = (sub as any).discount?.coupon?.percent_off === 100 || sub.discounts?.[0]?.coupon?.percent_off === 100
      if (is100PercentOff) {
        const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || ''
        if (cid) freeCustomerIds.add(cid)
      }
    }

    // Build daily buckets
    const buckets = new Map<string, DailyBucket>()
    const startDate = new Date(from)
    const endDate = new Date(to)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      buckets.set(key, {
        date: key,
        revenue: 0,
        refunds: 0,
        refundCount: 0,
        newCustomers: 0,
        trialSignups: 0,
        successfulCharges: 0,
        cashPending: 0,
        avgTransactionValue: 0,
        arr: 0,
        churnCount: 0,
        activeSubsCount: 0,
        trialPipelineMonthly: 0,
        trialPipelineYearly: 0,
        trialCountMonthly: 0,
        trialCountYearly: 0,
        trialSignupsMonthly: 0,
        trialSignupsYearly: 0,
      })
    }

    // Aggregate charges — these are your actual PURCHASES
    // Use balance_transaction.amount for settled USD value (not charge.amount which may be AUD/other)
    // Bucket by Sydney-local date
    const successfulCharges = charges.filter(c => {
      const cid = typeof c.customer === 'string' ? c.customer : c.customer?.id || ''
      return c.status === 'succeeded' && !freeCustomerIds.has(cid)
    })

    // ── Derive live AUD→USD exchange rate from actual balance transactions ──
    // Stripe balance_transaction.exchange_rate gives us the real rate used at
    // settlement time.  We grab the most recent one so ARR / cash-pending
    // values stay in sync with the settlement currency (USD).
    let audToUsd = 0.6657 // sensible fallback
    for (const charge of successfulCharges) {
      if (charge.currency === 'aud') {
        const bt = charge.balance_transaction as Stripe.BalanceTransaction | null
        if (bt && typeof bt !== 'string' && (bt as any).exchange_rate) {
          audToUsd = (bt as any).exchange_rate as number
          break // most-recent charge first (Stripe returns newest-first)
        }
      }
    }

    // Helper: convert any subscription amount to USD
    const toUSD = (amountLocal: number, currency: string): number => {
      if (currency === 'usd') return amountLocal
      if (currency === 'aud') return amountLocal * audToUsd
      // For any other currency, fall back to returning the raw value
      return amountLocal
    }

    // Build customer → subscription map for attribution lookup (only when trial attribution is ON)
    // When attribution='trial', revenue is bucketed under the trial_start date
    // so that revenue aligns with the ad spend that generated the trial.
    const useTrialAttribution = attribution === 'trial'
    const custSubsMap = new Map<string, Stripe.Subscription[]>()
    if (useTrialAttribution) {
      for (const sub of subscriptions) {
        const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || ''
        if (!cid) continue
        if (!custSubsMap.has(cid)) custSubsMap.set(cid, [])
        custSubsMap.get(cid)!.push(sub)
      }
    }

    for (const charge of successfulCharges) {
      const chargeDate = timestampToSydneyDate(charge.created)
      const bt = charge.balance_transaction as Stripe.BalanceTransaction | null
      let chargeAmount = 0
      if (bt && typeof bt !== 'string') {
        chargeAmount = bt.amount / 100
      } else if (charge.currency === 'usd') {
        chargeAmount = charge.amount / 100
      }

      let revenueDate = chargeDate

      // When trial attribution is ON, map charge to trial_start date
      if (useTrialAttribution) {
        const chargeCid = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id || ''
        const custSubs = custSubsMap.get(chargeCid) || []

        let bestSub: Stripe.Subscription | null = null
        for (const sub of custSubs) {
          if (sub.trial_start !== null && sub.trial_start !== undefined && sub.trial_end) {
            if (sub.trial_end <= charge.created + 86400) {
              if (!bestSub || (bestSub.trial_end && sub.trial_end > bestSub.trial_end)) {
                bestSub = sub
              }
            }
          }
        }

        if (bestSub && bestSub.trial_start) {
          revenueDate = timestampToSydneyDate(bestSub.trial_start)
        }
      }

      // Bucket revenue under the resolved date
      const targetBucket = buckets.get(revenueDate) || buckets.get(chargeDate)
      if (targetBucket) {
        targetBucket.revenue += chargeAmount
        targetBucket.successfulCharges++
      }
    }

    // Aggregate refunds — use balance_transaction for settled USD amount
    // Bucket by Sydney-local date
    for (const refund of refundsList) {
      const date = timestampToSydneyDate(refund.created)
      const bucket = buckets.get(date)
      if (bucket) {
        const bt = refund.balance_transaction as Stripe.BalanceTransaction | null
        if (bt && typeof bt !== 'string') {
          // Refund balance_transaction amount is negative, so use Math.abs
          bucket.refunds += Math.abs(bt.amount) / 100
        } else if (refund.currency === 'usd') {
          bucket.refunds += refund.amount / 100
        }
        bucket.refundCount++
      }
    }

    // Aggregate new customers — bucket by Sydney-local date
    for (const customer of customers) {
      if (freeCustomerIds.has(customer.id)) continue
      const date = timestampToSydneyDate(customer.created)
      const bucket = buckets.get(date)
      if (bucket) {
        bucket.newCustomers++
      }
    }

    // Aggregate trial signups and churn — bucket by Sydney-local date
    for (const sub of subscriptions) {
      // @ts-ignore
      const is100PercentOff = (sub as any).discount?.coupon?.percent_off === 100 || sub.discounts?.[0]?.coupon?.percent_off === 100
      if (is100PercentOff) continue

      if (sub.trial_start !== null) {
        const date = timestampToSydneyDate(sub.created)
        const bucket = buckets.get(date)
        if (bucket) {
          bucket.trialSignups++
          // Track per-day new signups by plan interval
          const subInterval = sub.items?.data?.[0]?.price?.recurring?.interval || (sub as any).plan?.interval || 'month'
          if (subInterval === 'year') {
            bucket.trialSignupsYearly++
          } else {
            bucket.trialSignupsMonthly++
          }
        }
      }
      if (sub.status === 'canceled' && sub.canceled_at) {
        const date = timestampToSydneyDate(sub.canceled_at)
        const bucket = buckets.get(date)
        if (bucket) {
          bucket.churnCount++
        }
      }
    }

    // Convert and optionally aggregate weekly
    let results = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))
    if (interval === 'week') {
      results = aggregateToWeekly(results)
    }

    // Summary stats
    const totalRevenue = results.reduce((s, b) => s + b.revenue, 0)
    const totalRefunds = results.reduce((s, b) => s + b.refunds, 0)
    const totalRefundCount = results.reduce((s, b) => s + b.refundCount, 0)
    const totalCharges = results.reduce((s, b) => s + b.successfulCharges, 0)
    const totalNewCustomers = results.reduce((s, b) => s + b.newCustomers, 0)
    const totalTrialSignups = results.reduce((s, b) => s + b.trialSignups, 0)

    // LTV: total revenue / unique paying customers
    const uniquePayingCustomers = new Set(
      successfulCharges.map(c => c.customer).filter(Boolean)
    ).size
    const ltv = uniquePayingCustomers > 0 ? totalRevenue / uniquePayingCustomers : 0

    // Refund rate — by dollar (matches Stripe dashboard)
    // Stripe counts refund rate as refund_volume / gross_volume
    const refundRateByDollar = totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0
    const refundRateByCount = totalCharges > 0 ? (totalRefundCount / totalCharges) * 100 : 0

    // Also check charges that have amount_refunded > 0 for more accurate count
    const chargesWithRefunds = successfulCharges.filter(c => c.amount_refunded > 0).length
    const refundRateByChargesRefunded = totalCharges > 0 ? (chargesWithRefunds / totalCharges) * 100 : 0

    // --- TRIAL PENDING CASH ESTIMATE ---
    let activeTrialsCount = 0
    let activeTrialsValue = 0
    let totalHistoricalTrialsValue = 0
    let convertedTrialsValueStrict = 0
    const nowTs = Math.floor(Date.now() / 1000)

    // Per-interval breakdown for active trials
    let activeMonthlyTrialsCount = 0
    let activeMonthlyTrialsValue = 0
    let activeYearlyTrialsCount = 0
    let activeYearlyTrialsValue = 0

    // Historical stats per interval
    let historicalTrialsTotal = 0
    let historicalTrialsConverted = 0
    let historicalTrialsFailed = 0

    for (const sub of subscriptions) {
      if (sub.trial_start !== null) {
        // Exclude 100% discount
        // @ts-ignore - Stripe type definitions may use discount or discounts array depending on API version
        const is100PercentOff = (sub as any).discount?.coupon?.percent_off === 100 || sub.discounts?.[0]?.coupon?.percent_off === 100
        if (is100PercentOff) continue

        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || ''
        const amountCents = sub.items?.data?.[0]?.price?.unit_amount || (sub as any).plan?.amount || 0
        let amount = amountCents / 100
        const currency = sub.items?.data?.[0]?.price?.currency || (sub as any).plan?.currency || 'usd'
        if (currency === 'aud') amount *= 0.6657 // Convert AUD to USD approximate
        const subInterval = sub.items?.data?.[0]?.price?.recurring?.interval || (sub as any).plan?.interval || 'month'

        if (sub.status === 'trialing') {
          activeTrialsCount++
          activeTrialsValue += amount
          if (subInterval === 'year') {
            activeYearlyTrialsCount++
            activeYearlyTrialsValue += amount
          } else {
            activeMonthlyTrialsCount++
            activeMonthlyTrialsValue += amount
          }
        } else if (sub.trial_end && sub.trial_end < nowTs) {
          totalHistoricalTrialsValue += amount
          historicalTrialsTotal++
          // STRICT CONVERSION: Must have a successful charge after trialstart!
          // Account for card failures at end of trial by relying exclusively on captured money
          const hasConvertedStrict = successfulCharges.some(c => {
            const chargeCustomerId = typeof c.customer === 'string' ? c.customer : c.customer?.id || ''
            return chargeCustomerId === customerId && c.created >= sub.trial_start!
          })
          if (hasConvertedStrict) {
            convertedTrialsValueStrict += amount
            historicalTrialsConverted++
          } else {
            historicalTrialsFailed++
          }
        }
      }
    }

    const trialConversionRateValueBased = totalHistoricalTrialsValue > 0 ? convertedTrialsValueStrict / totalHistoricalTrialsValue : 0
    const trialConversionRateByCount = historicalTrialsTotal > 0 ? historicalTrialsConverted / historicalTrialsTotal : 0
    const estimatedPendingCash = activeTrialsValue * trialConversionRateValueBased

    // Backfill historical pending cash and ARR for each day
    // Use Sydney timezone for todayKey to match backend date bucketing
    const todayKey = todaySydney
    Array.from(buckets.values()).forEach(bucket => {
      // For today's bucket, use the current timestamp so currently-active trials
      // are properly detected. For past days use midnight; for future days use
      // end-of-day so trials active "right now" still count.
      let bTs: number
      if (bucket.date === todayKey) {
        bTs = Math.floor(Date.now() / 1000)
      } else if (bucket.date > todayKey) {
        bTs = Math.floor(Date.now() / 1000) // future dates use current time too
      } else {
        bTs = new Date(bucket.date).getTime() / 1000
      }
      let dailyActiveTrialsValue = 0;
      let dailyArr = 0;
      let dailyActiveSubs = 0;
      let dailyMonthlyTrialValue = 0;
      let dailyYearlyTrialValue = 0;
      let dailyMonthlyTrialCount = 0;
      let dailyYearlyTrialCount = 0;
      
      for (const sub of subscriptions) {
        // @ts-ignore
        const is100PercentOff = (sub as any).discount?.coupon?.percent_off === 100 || sub.discounts?.[0]?.coupon?.percent_off === 100;
        if (is100PercentOff) continue;
        
        const amountCents = sub.items?.data?.[0]?.price?.unit_amount || (sub as any).plan?.amount || 0;
        const currency = sub.items?.data?.[0]?.price?.currency || (sub as any).plan?.currency || 'usd';
        let amount = toUSD(amountCents / 100, currency);
        const subInterval = sub.items?.data?.[0]?.price?.recurring?.interval || (sub as any).plan?.interval || 'month';
        
        // Apply partial discounts (Stripe MRR accounts for coupons)
        // @ts-ignore - discount shape varies by API version
        const coupon = (sub as any).discount?.coupon || sub.discounts?.[0]?.coupon;
        if (coupon) {
          if (coupon.percent_off && coupon.percent_off < 100) {
            amount = amount * (1 - coupon.percent_off / 100);
          } else if (coupon.amount_off) {
            const discountCurrency = coupon.currency || currency;
            const discountAmount = toUSD(coupon.amount_off / 100, discountCurrency);
            amount = Math.max(0, amount - discountAmount);
          }
        }
        
        const trialStart = sub.trial_start;
        const subStart = sub.start_date || sub.created;
        
        // --- 1. Pending Cash calculations ---
        if (trialStart !== null && sub.trial_end !== null) {
          if (trialStart <= bTs && sub.trial_end > bTs) {
            // Check if it was canceled BEFORE this day
            if (!sub.canceled_at || sub.canceled_at > bTs) {
              dailyActiveTrialsValue += amount;
              if (subInterval === 'year') {
                dailyYearlyTrialValue += amount;
                dailyYearlyTrialCount++;
              } else {
                dailyMonthlyTrialValue += amount;
                dailyMonthlyTrialCount++;
              }
            }
          }
        }
        
        // --- 2. True ARR/MRR calculations ---
        // Only count subscriptions with status='active' to match Stripe's MRR
        // (excludes past_due, unpaid, incomplete, etc.)
        if (subStart <= bTs && (!sub.canceled_at || sub.canceled_at > bTs)) {
          dailyActiveSubs++;
          
          // Only active (paying) subs count toward ARR — matches Stripe MRR
          if (sub.status === 'active' && (!sub.trial_end || sub.trial_end <= bTs)) {
             let annualizedAmount = 0;
             if (subInterval === 'month') {
               annualizedAmount = amount * 12;
             } else if (subInterval === 'year') {
               annualizedAmount = amount;
             } else if (subInterval === 'week') {
               annualizedAmount = amount * 52;
             } else if (subInterval === 'day') {
               annualizedAmount = amount * 365;
             }
             dailyArr += annualizedAmount;
          }
        }
      }
      bucket.cashPending = Math.round((dailyActiveTrialsValue * trialConversionRateValueBased) * 100) / 100;
      bucket.arr = Math.round(dailyArr * 100) / 100;
      bucket.activeSubsCount = dailyActiveSubs;
      bucket.trialPipelineMonthly = Math.round(dailyMonthlyTrialValue * 100) / 100;
      bucket.trialPipelineYearly = Math.round(dailyYearlyTrialValue * 100) / 100;
      bucket.trialCountMonthly = dailyMonthlyTrialCount;
      bucket.trialCountYearly = dailyYearlyTrialCount;
    });

    // ================================================================
    // SERVER-SIDE ATTRIBUTION CORRECTION
    // Previously done on the frontend (causing instability). Now computed
    // once here with a stable conversion rate.
    // ================================================================
    const useTrialAttr = attribution === 'trial'

    // Use stored conversion rate for consistency within a day, fall back to live
    let stableConvRate = trialConversionRateByCount
    try {
      const dbRate = await getLatestConversionRate()
      if (dbRate !== null && dbRate > 0) {
        // Use DB rate for stability; update it only if live rate changed significantly
        const livePct = trialConversionRateByCount * 100
        const dbPct = dbRate
        // If they differ by less than 5%, use the DB snapshot for stability
        if (Math.abs(livePct - dbPct) < 5) {
          stableConvRate = dbRate / 100
        } else {
          stableConvRate = trialConversionRateByCount
        }
      }
    } catch (_e) {
      // DB read failed, use live rate
    }

    // Add isAttributionEstimate flag to results
    const resultsWithAttribution = results.map(bucket => {
      const entryMs = new Date(bucket.date + 'T00:00:00').getTime()
      const todayMs = new Date(todayKey + 'T00:00:00').getTime()
      const daysAgo = Math.round((todayMs - entryMs) / (24 * 60 * 60 * 1000))
      const isWithinWindow = daysAgo >= 0 && daysAgo < ATTRIBUTION_WINDOW

      let netRevenueWithAttribution: number | null = null
      let isEstimate = false

      if (useTrialAttr && isWithinWindow) {
        // Compute estimated pending revenue from this day's trial signups
        const convRate = stableConvRate

        // Per-plan pricing from live data (these are stable within a request)
        const monthlyPrice = activeMonthlyTrialsCount > 0
          ? activeMonthlyTrialsValue / activeMonthlyTrialsCount : 0
        const yearlyPrice = activeYearlyTrialsCount > 0
          ? activeYearlyTrialsValue / activeYearlyTrialsCount : 0
        const fallbackPrice = totalCharges > 0 ? totalRevenue / totalCharges : 0

        const dailyMonthly = bucket.trialSignupsMonthly || 0
        const dailyYearly = bucket.trialSignupsYearly || 0

        if (convRate > 0 && (monthlyPrice > 0 || yearlyPrice > 0 || fallbackPrice > 0)) {
          const monthlyPending = dailyMonthly * convRate * (monthlyPrice || fallbackPrice)
          const yearlyPending = dailyYearly * convRate * (yearlyPrice || fallbackPrice)
          const perDayCashPending = monthlyPending + yearlyPending
          const actualNetRevenue = bucket.revenue - bucket.refunds

          if (perDayCashPending > 0) {
            netRevenueWithAttribution = Math.round((actualNetRevenue + perDayCashPending) * 100) / 100
            isEstimate = true
          }
        }
      }

      return {
        ...bucket,
        netRevenueWithAttribution,
        isAttributionEstimate: isEstimate,
        conversionRateSnapshot: Math.round(stableConvRate * 10000) / 100,
      }
    })

    // ================================================================
    // SNAPSHOT SETTLED DAYS TO DB (fire-and-forget, don't block response)
    // ================================================================
    const settledToWrite: DailyMetricsRow[] = []
    const settledDates = new Set(settledRows.map(r => r.date))

    for (const bucket of resultsWithAttribution) {
      // Only snapshot days that are older than the attribution window AND not already settled
      if (bucket.date <= cutoffDateStr && !settledDates.has(bucket.date)) {
        settledToWrite.push({
          date: bucket.date,
          revenue: bucket.revenue,
          refunds: bucket.refunds,
          refund_count: bucket.refundCount,
          new_customers: bucket.newCustomers,
          trial_signups: bucket.trialSignups,
          successful_charges: bucket.successfulCharges,
          cash_pending: bucket.cashPending,
          arr: bucket.arr,
          churn_count: bucket.churnCount,
          active_subs_count: bucket.activeSubsCount,
          trial_pipeline_monthly: bucket.trialPipelineMonthly,
          trial_pipeline_yearly: bucket.trialPipelineYearly,
          trial_count_monthly: bucket.trialCountMonthly,
          trial_count_yearly: bucket.trialCountYearly,
          trial_signups_monthly: bucket.trialSignupsMonthly,
          trial_signups_yearly: bucket.trialSignupsYearly,
          ad_spend: 0, // Will be filled by Meta route
          impressions: 0,
          clicks: 0,
          cpc: 0,
          cpm: 0,
          ctr: 0,
          reach: 0,
          net_revenue_with_attribution: bucket.netRevenueWithAttribution,
          is_attribution_estimate: bucket.isAttributionEstimate,
          conversion_rate_snapshot: bucket.conversionRateSnapshot,
          settled: true,
        })
      }
    }

    // Write to DB in background (don't await — response goes out immediately)
    // Only snapshot under charge-date mode to avoid corrupting DB with trial-attributed values
    if (settledToWrite.length > 0 && attribution !== 'trial') {
      upsertDailyMetricsBatch(settledToWrite).catch(err =>
        console.warn('Failed to snapshot settled metrics to DB:', err)
      )
    }

    // ================================================================
    // MERGE SETTLED DB ROWS INTO RESULTS
    // For days that were read from DB, use those values (they're frozen)
    // This ensures historical data NEVER changes between refreshes
    // ================================================================
    const liveResultsMap = new Map(resultsWithAttribution.map(r => [r.date, r]))
    for (const dbRow of settledRows) {
      // Override any live-computed value with the frozen DB snapshot
      liveResultsMap.set(dbRow.date, {
        date: dbRow.date,
        revenue: dbRow.revenue,
        refunds: dbRow.refunds,
        refundCount: dbRow.refund_count,
        newCustomers: dbRow.new_customers,
        trialSignups: dbRow.trial_signups,
        successfulCharges: dbRow.successful_charges,
        avgTransactionValue: 0,
        cashPending: dbRow.cash_pending,
        arr: dbRow.arr,
        churnCount: dbRow.churn_count,
        activeSubsCount: dbRow.active_subs_count,
        trialPipelineMonthly: dbRow.trial_pipeline_monthly,
        trialPipelineYearly: dbRow.trial_pipeline_yearly,
        trialCountMonthly: dbRow.trial_count_monthly,
        trialCountYearly: dbRow.trial_count_yearly,
        trialSignupsMonthly: dbRow.trial_signups_monthly,
        trialSignupsYearly: dbRow.trial_signups_yearly,
        netRevenueWithAttribution: dbRow.net_revenue_with_attribution ?? null,
        isAttributionEstimate: dbRow.is_attribution_estimate ?? false,
        conversionRateSnapshot: dbRow.conversion_rate_snapshot ?? null,
      } as any)
    }
    const finalResults = Array.from(liveResultsMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    const responseData = {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalRefunds: Math.round(totalRefunds * 100) / 100,
        netRevenue: Math.round((totalRevenue - totalRefunds) * 100) / 100,
        totalCharges,
        totalNewCustomers,
        totalTrialSignups,
        activeTrialsCount,
        activeTrialsValue: Math.round(activeTrialsValue * 100) / 100,
        trialConversionRate: Math.round(trialConversionRateValueBased * 10000) / 100,
        estimatedPendingCash: Math.round(estimatedPendingCash * 100) / 100,
        totalRefundCount,
        chargesWithRefunds,
        uniquePayingCustomers,
        ltv: Math.round(ltv * 100) / 100,
        refundRate: Math.round(refundRateByDollar * 100) / 100,       // primary: by dollar (matches Stripe)
        refundRateByCount: Math.round(refundRateByCount * 100) / 100, // secondary: by count
        refundRateByCharges: Math.round(refundRateByChargesRefunded * 100) / 100, // charges that got refunded
        avgTransactionValue: totalCharges > 0 ? Math.round((totalRevenue / totalCharges) * 100) / 100 : 0,
        // Trial breakdown by interval
        activeMonthlyTrialsCount,
        activeMonthlyTrialsValue: Math.round(activeMonthlyTrialsValue * 100) / 100,
        activeYearlyTrialsCount,
        activeYearlyTrialsValue: Math.round(activeYearlyTrialsValue * 100) / 100,
        // Historical trial stats
        historicalTrialsTotal,
        historicalTrialsConverted,
        historicalTrialsFailed,
        trialConversionRateByCount: Math.round(trialConversionRateByCount * 10000) / 100,
      },
      timeSeries: finalResults,
      meta: { from, to, interval },
    }

    cache.set(cacheKey, { data: responseData, ts: Date.now() })
    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Error fetching Stripe metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Stripe metrics' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PAGINATED FETCHERS
// ============================================================================

async function fetchAllCharges(fromTs: number, toTs: number): Promise<Stripe.Charge[]> {
  const all: Stripe.Charge[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.ChargeListParams = {
      created: { gte: fromTs, lte: toTs },
      limit: 100,
      expand: ['data.balance_transaction'],
    }
    if (startingAfter) params.starting_after = startingAfter
    const batch = await stripe.charges.list(params)
    all.push(...batch.data)
    hasMore = batch.has_more
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
  }
  return all
}

async function fetchAllRefunds(fromTs: number, toTs: number): Promise<Stripe.Refund[]> {
  const all: Stripe.Refund[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.RefundListParams = {
      created: { gte: fromTs, lte: toTs },
      limit: 100,
      expand: ['data.balance_transaction'],
    }
    if (startingAfter) params.starting_after = startingAfter
    const batch = await stripe.refunds.list(params)
    all.push(...batch.data)
    hasMore = batch.has_more
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
  }
  return all
}

async function fetchAllCustomers(fromTs: number, toTs: number): Promise<Stripe.Customer[]> {
  const all: Stripe.Customer[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.CustomerListParams = {
      created: { gte: fromTs, lte: toTs },
      limit: 100,
    }
    if (startingAfter) params.starting_after = startingAfter
    const batch = await stripe.customers.list(params)
    all.push(...batch.data)
    hasMore = batch.has_more
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
  }
  return all
}

async function fetchAllSubscriptions(fromTs: number, toTs: number): Promise<Stripe.Subscription[]> {
  const all: Stripe.Subscription[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.SubscriptionListParams = {
      limit: 100,
      status: 'all',
      expand: ['data.discounts'],
    }
    if (startingAfter) params.starting_after = startingAfter
    const batch = await stripe.subscriptions.list(params)
    all.push(...batch.data)
    hasMore = batch.has_more
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
  }
  return all
}

function aggregateToWeekly(daily: DailyBucket[]): DailyBucket[] {
  const weekly: DailyBucket[] = []
  let current: DailyBucket | null = null

  for (const day of daily) {
    const d = new Date(day.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!current || current.date !== weekKey) {
      if (current) weekly.push(current)
      current = { ...day, date: weekKey }
    } else {
      current.revenue += day.revenue
      current.refunds += day.refunds
      current.refundCount += day.refundCount
      current.newCustomers += day.newCustomers
      current.trialSignups += day.trialSignups
      current.successfulCharges += day.successfulCharges
      // Use the last day's pending cash as the week's pending cash, or an average
      current.cashPending = day.cashPending
      current.arr = day.arr // Use the latest day's ARR for the week bucket
    }
  }
  if (current) weekly.push(current)
  return weekly
}
