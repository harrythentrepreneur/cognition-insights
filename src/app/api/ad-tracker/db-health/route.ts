import { NextResponse } from 'next/server'
import { getMetricsHealth } from '@/lib/daily-metrics-db'
import { getCreativesCount } from '@/lib/creative-db'
import { getEventsCount, getLatestEventTimestamp } from '@/lib/events-db'
import { getFunnelCount } from '@/lib/funnel-db'

// ============================================================================
// GET /api/ad-tracker/db-health
// Returns table counts, last updated timestamps, and connection status.
// Useful for debugging and monitoring the NeonDB persistence layer.
// ============================================================================

export async function GET() {
  const results: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    tables: {},
  }

  // Check each table independently — one failure shouldn't block others
  try {
    const metrics = await getMetricsHealth()
    results.tables.daily_metrics = {
      count: metrics.count,
      lastUpdated: metrics.lastUpdated,
      status: 'ok',
    }
  } catch (err: any) {
    results.tables.daily_metrics = { status: 'error', error: err.message }
  }

  try {
    const count = await getCreativesCount()
    results.tables.ad_creatives = { count, status: 'ok' }
  } catch (err: any) {
    results.tables.ad_creatives = { status: 'error', error: err.message }
  }

  try {
    const count = await getEventsCount()
    const latest = await getLatestEventTimestamp()
    results.tables.live_events = { count, latestEvent: latest, status: 'ok' }
  } catch (err: any) {
    results.tables.live_events = { status: 'error', error: err.message }
  }

  try {
    const count = await getFunnelCount()
    results.tables.funnel_snapshots = { count, status: 'ok' }
  } catch (err: any) {
    results.tables.funnel_snapshots = { status: 'error', error: err.message }
  }

  // Overall status
  const hasErrors = Object.values(results.tables).some((t: any) => t.status === 'error')
  if (hasErrors) {
    results.status = 'degraded'
  }

  return NextResponse.json(results)
}
