import { NextRequest, NextResponse } from 'next/server'
import { dedupedFetch, isMetaBlocked, safeFetchMeta } from '../meta-cache'
import {
  ensureDailyMetricsTable,
  updateAdSpendBatch,
  getSettledAdSpend,
} from '@/lib/daily-metrics-db'

// ============================================================================
// GET /api/ad-tracker/meta-ads
// Fetches campaign-level ad metrics from Meta Marketing API
// SAFETY: 30-min server-side cache, deduped requests, rate-limit detection
// Query params: ?from=2024-01-01&to=2024-12-31
//
// DB PERSISTENCE: After fetching, snapshots daily ad spend to daily_metrics
// table so the ad_spend columns are populated (previously always 0).
// ============================================================================

const META_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN
const META_AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID?.replace('act_', '')

interface MetaDailyMetrics {
  date: string
  spend: number
  impressions: number
  clicks: number
  cpc: number
  cpm: number
  ctr: number
  conversions: number
  conversionValue: number
  reach: number
}

interface MetaAdSetBreakdown {
  adsetId: string
  adsetName: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversionValue: number
}

interface MetaAdsResult {
  summary: Record<string, number>
  timeSeries: MetaDailyMetrics[]
  adsets: MetaAdSetBreakdown[]
  meta: { from: string; to: string; adAccountId: string | undefined; cached: boolean }
}

export async function GET(req: NextRequest) {
  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
    return NextResponse.json(
      { error: 'Meta Ads API credentials not configured. Set FB_ACCESS_TOKEN and FB_AD_ACCOUNT_ID.' },
      { status: 501 }
    )
  }

  // Safety check — if Meta flagged an account issue, stop all calls
  const blocked = isMetaBlocked()
  if (blocked.blocked) {
    return NextResponse.json(
      { error: `Meta API blocked: ${blocked.message}. Will retry in 1 hour.` },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
  const cacheKey = `meta-ads:${from}:${to}`

  // Compute the settled cutoff: days older than 7 days won't change
  const ATTRIBUTION_WINDOW = 7
  const todayStr = new Date().toISOString().split('T')[0]
  const cutoffDate = new Date(todayStr)
  cutoffDate.setDate(cutoffDate.getDate() - ATTRIBUTION_WINDOW)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

  try {
    // Try to read settled ad spend from DB for historical days
    let settledAdSpend: Array<{
      date: string; ad_spend: number; impressions: number; clicks: number
      cpc: number; cpm: number; ctr: number; reach: number
    }> = []
    try {
      await ensureDailyMetricsTable()
      if (from < cutoffDateStr) {
        settledAdSpend = await getSettledAdSpend(from, cutoffDateStr)
      }
    } catch (dbErr) {
      console.warn('[meta-ads] Failed to read settled ad spend from DB:', dbErr)
    }

    // Build a set of dates we have settled data for
    const settledDates = new Set(settledAdSpend.map(r => r.date))

    // Count how many settled dates we SHOULD have
    const expectedSettledDays: string[] = []
    if (from < cutoffDateStr) {
      const d = new Date(from)
      const end = new Date(Math.min(new Date(cutoffDateStr).getTime(), new Date(to).getTime()))
      while (d <= end) {
        expectedSettledDays.push(d.toISOString().split('T')[0])
        d.setDate(d.getDate() + 1)
      }
    }

    // Determine the Meta API fetch window
    // If we have all settled data, only fetch the live window
    const hasAllSettled = expectedSettledDays.length > 0 &&
      expectedSettledDays.every(d => settledDates.has(d))

    // The live window starts from cutoff+1 day (or `from` if no settled data)
    const liveFrom = hasAllSettled
      ? new Date(cutoffDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : from
    const needsLiveFetch = liveFrom <= to

    const result = await dedupedFetch<MetaAdsResult>(cacheKey, async () => {
      // Build time series from settled DB data
      const settledTimeSeries: MetaDailyMetrics[] = hasAllSettled
        ? settledAdSpend.map(r => ({
            date: r.date,
            spend: r.ad_spend,
            impressions: r.impressions,
            clicks: r.clicks,
            cpc: r.cpc,
            cpm: r.cpm,
            ctr: r.ctr,
            conversions: 0,
            conversionValue: 0,
            reach: r.reach,
          }))
        : []

      // Fetch from Meta API only for the live window (or full range if no settled data)
      let liveTimeSeries: MetaDailyMetrics[] = []
      let adsetRaw: any[] = []

      if (needsLiveFetch) {
        const insightsUrl = new URL(`https://graph.facebook.com/v21.0/act_${META_AD_ACCOUNT_ID}/insights`)
        insightsUrl.searchParams.set('access_token', META_ACCESS_TOKEN!)
        insightsUrl.searchParams.set('time_range', JSON.stringify({ since: liveFrom, until: to }))
        insightsUrl.searchParams.set('time_increment', '1')
        insightsUrl.searchParams.set('fields', 'date_start,spend,impressions,clicks,cpc,cpm,ctr,reach,actions,action_values')
        insightsUrl.searchParams.set('limit', '500')

        const adsetUrlObj = new URL(`https://graph.facebook.com/v21.0/act_${META_AD_ACCOUNT_ID}/insights`)
        adsetUrlObj.searchParams.set('access_token', META_ACCESS_TOKEN!)
        adsetUrlObj.searchParams.set('time_range', JSON.stringify({ since: liveFrom, until: to }))
        adsetUrlObj.searchParams.set('level', 'adset')
        adsetUrlObj.searchParams.set('fields', 'adset_id,adset_name,spend,impressions,clicks,actions,action_values')
        adsetUrlObj.searchParams.set('limit', '500')

        const [insightsRaw, adsetRawResult] = await Promise.all([
          fetchPaginatedSafe(insightsUrl.toString()),
          fetchPaginatedSafe(adsetUrlObj.toString()),
        ])

        adsetRaw = adsetRawResult || []

        if (insightsRaw) {
          liveTimeSeries = insightsRaw.map((row: any) => {
            const purchases = extractAction(row.actions, 'purchase') || extractAction(row.actions, 'offsite_conversion.fb_pixel_purchase')
            const purchaseValue = extractActionValue(row.action_values, 'purchase') || extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase')
            const spend = parseFloat(row.spend || '0')
            const impressions = parseInt(row.impressions || '0')
            const clicks = parseInt(row.clicks || '0')
            return {
              date: row.date_start,
              spend,
              impressions,
              clicks,
              cpc: clicks > 0 ? spend / clicks : parseFloat(row.cpc || '0'),
              cpm: impressions > 0 ? (spend / impressions) * 1000 : parseFloat(row.cpm || '0'),
              ctr: impressions > 0 ? (clicks / impressions) * 100 : parseFloat(row.ctr || '0'),
              conversions: purchases,
              conversionValue: purchaseValue,
              reach: parseInt(row.reach || '0'),
            }
          })
        }
      } else if (!needsLiveFetch && !hasAllSettled) {
        // No live fetch needed and no settled data — entire range is settled but DB is empty
        // Return empty gracefully
        return {
          summary: { totalSpend: 0, totalImpressions: 0, totalClicks: 0, avgCpc: 0, avgCpm: 0, avgCtr: 0, totalConversions: 0, totalConversionValue: 0, roas: 0 },
          timeSeries: [],
          adsets: [],
          meta: { from, to, adAccountId: META_AD_ACCOUNT_ID, cached: false },
        }
      }

      // Merge settled + live time series
      const timeSeries: MetaDailyMetrics[] = [...settledTimeSeries, ...liveTimeSeries]
        .sort((a, b) => a.date.localeCompare(b.date))

      // If we had no settled data and the API was rate-limited, return empty
      if (timeSeries.length === 0 && !hasAllSettled) {
        return {
          summary: { totalSpend: 0, totalImpressions: 0, totalClicks: 0, avgCpc: 0, avgCpm: 0, avgCtr: 0, totalConversions: 0, totalConversionValue: 0, roas: 0 },
          timeSeries: [],
          adsets: [],
          meta: { from, to, adAccountId: META_AD_ACCOUNT_ID, cached: false },
        }
      }

      // NOTE: conversion data for settled days is 0 since it's not stored in daily_metrics.
      // This is acceptable — conversions are tracked separately via Stripe revenue data.

      const adsets: MetaAdSetBreakdown[] = adsetRaw.map((row: any) => {
        const purchases = extractAction(row.actions, 'purchase') || extractAction(row.actions, 'offsite_conversion.fb_pixel_purchase')
        const purchaseValue = extractActionValue(row.action_values, 'purchase') || extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase')
        return {
          adsetId: row.adset_id,
          adsetName: row.adset_name,
          spend: parseFloat(row.spend || '0'),
          impressions: parseInt(row.impressions || '0'),
          clicks: parseInt(row.clicks || '0'),
          conversions: purchases,
          conversionValue: purchaseValue,
        }
      }).filter(a => a.spend > 0)

      const totalSpend = timeSeries.reduce((s, d) => s + d.spend, 0)
      const totalImpressions = timeSeries.reduce((s, d) => s + d.impressions, 0)
      const totalClicks = timeSeries.reduce((s, d) => s + d.clicks, 0)
      const totalConversions = timeSeries.reduce((s, d) => s + d.conversions, 0)
      const totalConversionValue = timeSeries.reduce((s, d) => s + d.conversionValue, 0)

      return {
        summary: {
          totalSpend: Math.round(totalSpend * 100) / 100,
          totalImpressions,
          totalClicks,
          avgCpc: totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0,
          avgCpm: totalImpressions > 0 ? Math.round((totalSpend / totalImpressions * 1000) * 100) / 100 : 0,
          avgCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions * 100) * 100) / 100 : 0,
          totalConversions,
          totalConversionValue: Math.round(totalConversionValue * 100) / 100,
          roas: totalSpend > 0 ? Math.round((totalConversionValue / totalSpend) * 100) / 100 : 0,
        },
        timeSeries,
        adsets,
        meta: { from, to, adAccountId: META_AD_ACCOUNT_ID, cached: false },
      }
    })

    // ================================================================
    // SNAPSHOT AD SPEND TO DB (fire-and-forget)
    // Only writes data that came from the live API fetch (not DB-sourced settled data)
    // ================================================================
    const liveData = result.timeSeries.filter(d => !settledDates.has(d.date))
    if (liveData.length > 0) {
      (async () => {
        try {
          await ensureDailyMetricsTable()
          await updateAdSpendBatch(
            liveData.map(d => ({
              date: d.date,
              adSpend: d.spend,
              impressions: d.impressions,
              clicks: d.clicks,
              cpc: d.cpc,
              cpm: d.cpm,
              ctr: d.ctr,
              reach: d.reach,
            }))
          )
        } catch (err) {
          console.warn('[meta-ads] Failed to snapshot ad spend to DB:', err)
        }
      })()
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching Meta Ads metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Meta Ads metrics' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function extractAction(actions: any[] | undefined, actionType: string): number {
  if (!actions) return 0
  const action = actions.find((a: any) => a.action_type === actionType)
  return action ? parseInt(action.value) : 0
}

function extractActionValue(actionValues: any[] | undefined, actionType: string): number {
  if (!actionValues) return 0
  const action = actionValues.find((a: any) => a.action_type === actionType)
  return action ? parseFloat(action.value) : 0
}

async function fetchPaginatedSafe(url: string): Promise<any[] | null> {
  const allData: any[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const res = await safeFetchMeta(nextUrl)
    if (!res) return allData.length > 0 ? allData : null // Rate limited

    const body: { data?: any[]; paging?: { next?: string } } = await res.json()
    if (body.data) allData.push(...body.data)
    nextUrl = body.paging?.next || null
  }

  return allData
}
