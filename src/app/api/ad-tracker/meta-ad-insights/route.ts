import { NextRequest, NextResponse } from 'next/server'
import { dedupedFetch, isMetaBlocked, safeFetchMeta } from '../meta-cache'

// ============================================================================
// GET /api/ad-tracker/meta-ad-insights
// Fetches PER-AD daily time series from Meta Marketing API
// Query params: ?from=2024-01-01&to=2024-12-31&adIds=123,456,789
// Returns: { [adId]: { timeSeries: [...], metrics: {...} } }
// ============================================================================

const META_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN
const META_AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID?.replace('act_', '')

interface AdDailyMetrics {
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

interface AdInsightsResult {
  [adId: string]: {
    timeSeries: AdDailyMetrics[]
  }
}

export async function GET(req: NextRequest) {
  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
    return NextResponse.json(
      { error: 'Meta Ads API credentials not configured.' },
      { status: 501 }
    )
  }

  const blocked = isMetaBlocked()
  if (blocked.blocked) {
    return NextResponse.json(
      { error: `Meta API blocked: ${blocked.message}` },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
  const adIdsParam = searchParams.get('adIds') || ''
  const adIds = adIdsParam.split(',').filter(Boolean)

  if (adIds.length === 0) {
    return NextResponse.json({ error: 'adIds parameter is required' }, { status: 400 })
  }

  // Cap at 10 ads to keep API calls manageable
  const cappedAdIds = adIds.slice(0, 10)
  const cacheKey = `meta-ad-insights:${from}:${to}:${cappedAdIds.sort().join(',')}`

  try {
    const result = await dedupedFetch<AdInsightsResult>(cacheKey, async () => {
      // Fetch ad-level insights with daily breakdown
      // Using the account insights endpoint with ad_id filtering
      const insightsUrl = new URL(`https://graph.facebook.com/v21.0/act_${META_AD_ACCOUNT_ID}/insights`)
      insightsUrl.searchParams.set('access_token', META_ACCESS_TOKEN!)
      insightsUrl.searchParams.set('time_range', JSON.stringify({ since: from, until: to }))
      insightsUrl.searchParams.set('time_increment', '1')
      insightsUrl.searchParams.set('level', 'ad')
      insightsUrl.searchParams.set('filtering', JSON.stringify([{ field: 'ad.id', operator: 'IN', value: cappedAdIds }]))
      insightsUrl.searchParams.set('fields', 'ad_id,date_start,spend,impressions,clicks,cpc,cpm,ctr,reach,actions,action_values')
      insightsUrl.searchParams.set('limit', '500')

      const allData = await fetchPaginatedSafe(insightsUrl.toString())

      const adInsights: AdInsightsResult = {}
      // Initialize all requested ad IDs
      for (const adId of cappedAdIds) {
        adInsights[adId] = { timeSeries: [] }
      }

      if (allData) {
        for (const row of allData) {
          const adId = row.ad_id
          if (!adInsights[adId]) continue

          const spend = parseFloat(row.spend || '0')
          const impressions = parseInt(row.impressions || '0')
          const clicks = parseInt(row.clicks || '0')
          const conversions = extractAction(row.actions, 'purchase')
            || extractAction(row.actions, 'offsite_conversion.fb_pixel_purchase')
          const conversionValue = extractActionValue(row.action_values, 'purchase')
            || extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase')

          adInsights[adId].timeSeries.push({
            date: row.date_start,
            spend,
            impressions,
            clicks,
            cpc: clicks > 0 ? spend / clicks : parseFloat(row.cpc || '0'),
            cpm: impressions > 0 ? (spend / impressions) * 1000 : parseFloat(row.cpm || '0'),
            ctr: impressions > 0 ? (clicks / impressions) * 100 : parseFloat(row.ctr || '0'),
            conversions,
            conversionValue,
            reach: parseInt(row.reach || '0'),
          })
        }
      }

      // Sort each ad's time series by date
      for (const adId of Object.keys(adInsights)) {
        adInsights[adId].timeSeries.sort((a, b) => a.date.localeCompare(b.date))
      }

      return adInsights
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching per-ad Meta insights:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch per-ad insights' },
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
    if (!res) return allData.length > 0 ? allData : null

    const body: { data?: any[]; paging?: { next?: string } } = await res.json()
    if (body.data) allData.push(...body.data)
    nextUrl = body.paging?.next || null
  }

  return allData
}
