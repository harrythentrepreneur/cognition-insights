import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/neon'

// ============================================================================
// GET /api/ad-tracker/books-today
// Returns daily book generation counts from user_generations.
// Uses Australia/Sydney timezone for date bucketing to match the rest of the
// Ad Tracker dashboard.
// Query params: ?from=2024-01-01&to=2024-12-31
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0]

    // Bucket by Sydney-local date to match all other ad tracker metrics.
    // created_at is stored as "timestamp without time zone" but holds UTC values,
    // so we first cast to timestamptz (interpreted as UTC), then convert to Sydney.
    const rows = await sql`
      SELECT
        ((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${process.env.REPORTING_TIMEZONE || 'UTC'})::date::text AS date,
        COUNT(*) AS count
      FROM user_generations
      WHERE ((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${process.env.REPORTING_TIMEZONE || 'UTC'})::date >= ${from}::date
        AND ((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${process.env.REPORTING_TIMEZONE || 'UTC'})::date <= ${to}::date
      GROUP BY ((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${process.env.REPORTING_TIMEZONE || 'UTC'})::date
      ORDER BY date ASC
    `

    const timeSeries = rows.map((r: any) => ({
      date: r.date,
      count: Number(r.count),
    }))

    return NextResponse.json({ timeSeries })
  } catch (error: any) {
    console.error('Error fetching books-today:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch books count' },
      { status: 500 }
    )
  }
}
