import { NextRequest, NextResponse } from 'next/server'
import { dedupedFetch, isMetaBlocked, safeFetchMeta, getCached, setCache } from '../meta-cache'
import {
  ensureCreativesTable,
  upsertCreativesBatch,
  getCreatives,
  type CreativeRow,
} from '@/lib/creative-db'

// ============================================================================
// GET /api/ad-tracker/meta-creatives
// Fetches individual ad creative performance from Meta Marketing API
// SAFETY: 30-min server-side cache, rate-limit safety, creative detail caching
// Query params: ?from=2024-01-01&to=2024-12-31&limit=50
// ============================================================================

const META_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN
const META_AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID?.replace('act_', '')

export interface MetaAdCreative {
  adId: string
  adName: string
  status: 'active' | 'paused' | 'archived' | string
  creativeType: 'video' | 'image' | 'carousel' | string
  thumbnailUrl: string | null
  videoSourceUrl: string | null
  imageUrl: string | null
  fullPictureUrl: string | null
  postUrl: string | null
  headline: string | null
  body: string | null
  description: string | null
  linkUrl: string | null
  platform: string
  platformColor: string
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    conversions: number
    spend: number
    revenue: number
    roas: number
    cpa: number
    cpc: number
    cpm: number
  }
}

interface CreativesResult {
  creatives: MetaAdCreative[]
  total: number
  meta: { from: string; to: string; adAccountId: string | undefined }
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
  const limit = parseInt(searchParams.get('limit') || '50')
  const cacheKey = `meta-creatives:${from}:${to}:${limit}`

  // Check if the entire date range is settled (>7 days old)
  // If so, serve from DB without hitting Meta API at all
  const ATTRIBUTION_WINDOW = 7
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - ATTRIBUTION_WINDOW)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]
  const isFullySettled = to < cutoffDateStr

  if (isFullySettled) {
    try {
      await ensureCreativesTable()
      const dbCreatives = await getCreatives(from, to)
      if (dbCreatives.length > 0) {
        const creatives: MetaAdCreative[] = dbCreatives.map(c => ({
          adId: c.ad_id,
          adName: c.ad_name,
          status: c.status,
          creativeType: c.creative_type,
          thumbnailUrl: c.thumbnail_url,
          videoSourceUrl: c.video_source_url,
          imageUrl: c.image_url,
          fullPictureUrl: null,
          postUrl: null,
          headline: c.headline,
          body: c.body,
          description: c.description,
          linkUrl: c.link_url,
          platform: c.platform,
          platformColor: '#1877F2',
          metrics: (c.metrics_json || {}) as MetaAdCreative['metrics'],
        }))
        return NextResponse.json({
          creatives,
          total: creatives.length,
          meta: { from, to, adAccountId: META_AD_ACCOUNT_ID },
        })
      }
    } catch (dbErr) {
      console.warn('[meta-creatives] DB read failed for settled range, falling back to API:', dbErr)
    }
  }

  try {
    const result = await dedupedFetch<CreativesResult>(cacheKey, async () => {
      const insightsUrl = new URL(`https://graph.facebook.com/v21.0/act_${META_AD_ACCOUNT_ID}/insights`)
      insightsUrl.searchParams.set('access_token', META_ACCESS_TOKEN!)
      insightsUrl.searchParams.set('time_range', JSON.stringify({ since: from, until: to }))
      insightsUrl.searchParams.set('level', 'ad')
      insightsUrl.searchParams.set('fields', 'ad_id,ad_name,spend,impressions,clicks,cpc,cpm,ctr,actions,action_values')
      insightsUrl.searchParams.set('limit', String(limit))
      insightsUrl.searchParams.set('sort', 'spend_descending')

      const insightsRes = await safeFetchMeta(insightsUrl.toString())
      if (!insightsRes) {
        return { creatives: [], total: 0, meta: { from, to, adAccountId: META_AD_ACCOUNT_ID } }
      }

      const insightsJson = await insightsRes.json()
      const adInsights = insightsJson.data || []

      // Fetch creative details with caching per ad ID
      const adIds: string[] = adInsights.map((row: any) => row.ad_id).filter(Boolean)
      const creativeDetails = await fetchCreativeDetailsCached(adIds)

      const creatives: MetaAdCreative[] = adInsights.map((row: any) => {
        const spend = parseFloat(row.spend || '0')
        const impressions = parseInt(row.impressions || '0')
        const clicks = parseInt(row.clicks || '0')
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : parseFloat(row.ctr || '0')
        const cpc = clicks > 0 ? spend / clicks : parseFloat(row.cpc || '0')
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : parseFloat(row.cpm || '0')

        const conversions = extractAction(row.actions, 'purchase')
          || extractAction(row.actions, 'offsite_conversion.fb_pixel_purchase')
        const revenue = extractActionValue(row.action_values, 'purchase')
          || extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase')

        const creative = creativeDetails.get(row.ad_id)
        return {
          adId: row.ad_id,
          adName: row.ad_name || 'Untitled Ad',
          status: creative?.effectiveStatus || 'unknown',
          creativeType: creative?.objectType || 'image',
          thumbnailUrl: creative?.thumbnailUrl || null,
          videoSourceUrl: creative?.videoSourceUrl || null,
          imageUrl: creative?.imageUrl || null,
          fullPictureUrl: creative?.fullPictureUrl || null,
          postUrl: creative?.postUrl || null,
          headline: creative?.headline || null,
          body: creative?.body || null,
          description: creative?.description || null,
          linkUrl: creative?.linkUrl || null,
          platform: 'Meta',
          platformColor: '#1877F2',
          metrics: {
            impressions, clicks, ctr, conversions,
            spend: Math.round(spend * 100) / 100,
            revenue: Math.round(revenue * 100) / 100,
            roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
            cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
            cpc: Math.round(cpc * 100) / 100,
            cpm: Math.round(cpm * 100) / 100,
          },
        }
      })

      return { creatives, total: creatives.length, meta: { from, to, adAccountId: META_AD_ACCOUNT_ID } }
    })

    // ================================================================
    // SNAPSHOT CREATIVES TO DB (fire-and-forget)
    // Persists creative performance data so it survives server restarts.
    // ================================================================
    if (result.creatives.length > 0) {
      (async () => {
        try {
          await ensureCreativesTable()
          const rows: CreativeRow[] = result.creatives.map(c => ({
            ad_id: c.adId,
            ad_name: c.adName,
            status: c.status,
            creative_type: c.creativeType,
            thumbnail_url: c.thumbnailUrl,
            image_url: c.imageUrl,
            video_source_url: c.videoSourceUrl,
            headline: c.headline,
            body: c.body,
            description: c.description,
            link_url: c.linkUrl,
            platform: c.platform,
            metrics_json: c.metrics as Record<string, number>,
            snapshot_from: from,
            snapshot_to: to,
          }))
          await upsertCreativesBatch(rows)
        } catch (err) {
          console.warn('[meta-creatives] Failed to snapshot creatives to DB:', err)
        }
      })()
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching Meta ad creatives:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ad creatives' },
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

interface CreativeInfo {
  effectiveStatus: string
  objectType: string
  thumbnailUrl: string | null
  videoSourceUrl: string | null
  imageUrl: string | null
  fullPictureUrl: string | null
  postUrl: string | null
  headline: string | null
  body: string | null
  description: string | null
  linkUrl: string | null
}

/**
 * Fetch creative details with per-ad caching.
 * Uses a two-step approach:
 *   1. Fetch the ad to get creative.id and effective_status
 *   2. Fetch the creative directly by ID for media fields
 * This is necessary because sub-field expansion (creative{...}) on the ad
 * endpoint only returns the creative's ID, not the requested sub-fields.
 */
async function fetchCreativeDetailsCached(adIds: string[]): Promise<Map<string, CreativeInfo>> {
  const details = new Map<string, CreativeInfo>()
  if (!META_ACCESS_TOKEN || adIds.length === 0) return details

  const uncachedIds: string[] = []

  // Check cache first for each ad
  for (const adId of adIds) {
    const cached = getCached<CreativeInfo>(`creative-detail:${adId}`)
    if (cached) {
      details.set(adId, cached)
    } else {
      uncachedIds.push(adId)
    }
  }

  // Only fetch uncached ad details (sequential, not parallel, to be gentle on API)
  for (const adId of uncachedIds) {
    try {
      // Step 1: Fetch the ad to get creative.id and effective_status
      const adUrl = new URL(`https://graph.facebook.com/v21.0/${adId}`)
      adUrl.searchParams.set('access_token', META_ACCESS_TOKEN!)
      adUrl.searchParams.set('fields', 'effective_status,creative,preview_shareable_link')

      const adRes = await safeFetchMeta(adUrl.toString())
      if (!adRes) break // Stop on rate limit

      const adData = await adRes.json()
      const creativeId = adData.creative?.id

      // Step 2: Fetch the creative directly by its ID to get all media fields
      let creativeData: any = {}
      if (creativeId) {
        try {
          const creativeUrl = new URL(`https://graph.facebook.com/v21.0/${creativeId}`)
          creativeUrl.searchParams.set('access_token', META_ACCESS_TOKEN!)
          creativeUrl.searchParams.set('fields', 'object_type,thumbnail_url,image_url,video_id,object_story_spec,name')
          const creativeRes = await safeFetchMeta(creativeUrl.toString())
          if (creativeRes) {
            creativeData = await creativeRes.json()
          }
        } catch {
          // Skip creative detail fetch errors — we'll fall back to empty
        }
      }

      // If creative has a video_id, fetch the video source URL
      let videoSourceUrl: string | null = null
      if (creativeData.video_id) {
        try {
          const videoUrl = new URL(`https://graph.facebook.com/v21.0/${creativeData.video_id}`)
          videoUrl.searchParams.set('access_token', META_ACCESS_TOKEN!)
          videoUrl.searchParams.set('fields', 'source')
          const videoRes = await safeFetchMeta(videoUrl.toString())
          if (videoRes) {
            const videoData = await videoRes.json()
            videoSourceUrl = videoData.source || null
          }
        } catch {
          // Skip video source fetch errors
        }
      }

      // Extract full-resolution image from object_story_spec
      const oss = creativeData.object_story_spec
      const fullImageUrl =
        oss?.link_data?.picture ||          // Link ads — full image
        oss?.photo_data?.url ||             // Photo ads — original upload
        oss?.video_data?.image_url ||       // Video ads — poster image
        creativeData.image_url ||           // Creative-level image
        null

      // Extract ad copy details from object_story_spec
      const headline =
        oss?.link_data?.name ||             // Link ads — headline
        oss?.video_data?.title ||            // Video ads — title
        creativeData.name ||                 // Creative-level name
        null
      const body =
        oss?.link_data?.message ||           // Link ads — primary text
        oss?.video_data?.message ||          // Video ads — primary text
        oss?.photo_data?.message ||          // Photo ads — primary text
        null
      const adDescription =
        oss?.link_data?.description ||       // Link ads — description line
        oss?.video_data?.link_description || // Video ads — description
        null
      const linkUrl =
        oss?.link_data?.link ||              // Link ads — destination URL
        oss?.video_data?.call_to_action?.value?.link || // Video ads — CTA link
        null

      const info: CreativeInfo = {
        effectiveStatus: mapStatus(adData.effective_status),
        objectType: mapObjectType(creativeData.object_type),
        thumbnailUrl: creativeData.thumbnail_url || creativeData.image_url || null,
        videoSourceUrl,
        imageUrl: fullImageUrl || creativeData.thumbnail_url || null,
        fullPictureUrl: null,
        postUrl: adData.preview_shareable_link || null,
        headline,
        body,
        description: adDescription,
        linkUrl,
      }
      details.set(adId, info)
      setCache(`creative-detail:${adId}`, info)
    } catch {
      // Skip individual errors
    }
  }

  return details
}

function mapStatus(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'active'
    case 'PAUSED': return 'paused'
    case 'CAMPAIGN_PAUSED': return 'paused'
    case 'ADSET_PAUSED': return 'paused'
    case 'ARCHIVED': return 'archived'
    default: return status?.toLowerCase() || 'unknown'
  }
}

function mapObjectType(objectType: string): string {
  switch (objectType) {
    case 'VIDEO': return 'video'
    case 'PHOTO': return 'image'
    case 'CAROUSEL': return 'carousel'
    case 'SHARE': return 'image'
    default: return objectType?.toLowerCase() || 'image'
  }
}
