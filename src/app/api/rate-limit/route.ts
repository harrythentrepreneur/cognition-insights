import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

const RATE_LIMIT = 1000
const WARNING_THRESHOLD = 7

interface RateLimitData {
  reportGeneration?: {
    count: number
    firstUsedAt: string
    lastUsedAt: string
    sessions: string[]
  }
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)

    const privateMetadata = user.privateMetadata as RateLimitData
    const reportGeneration = privateMetadata?.reportGeneration || {
      count: 0,
      firstUsedAt: '',
      lastUsedAt: '',
      sessions: []
    }

    const remaining = Math.max(0, RATE_LIMIT - reportGeneration.count)
    const showWarning = reportGeneration.count >= WARNING_THRESHOLD && reportGeneration.count < RATE_LIMIT
    const isBlocked = reportGeneration.count >= RATE_LIMIT

    return NextResponse.json({
      count: reportGeneration.count,
      limit: RATE_LIMIT,
      remaining,
      showWarning,
      isBlocked,
      warningThreshold: WARNING_THRESHOLD,
      sessions: reportGeneration.sessions
    })
  } catch (error) {
    console.error('Error checking rate limit:', error)
    return NextResponse.json(
      { error: 'Error checking rate limit' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)

    const privateMetadata = user.privateMetadata as RateLimitData
    const reportGeneration = privateMetadata?.reportGeneration || {
      count: 0,
      firstUsedAt: '',
      lastUsedAt: '',
      sessions: []
    }

    // Check if already at limit
    if (reportGeneration.count >= RATE_LIMIT) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        count: reportGeneration.count,
        limit: RATE_LIMIT,
        isBlocked: true
      }, { status: 429 })
    }

    // Update the count and metadata
    const now = new Date().toISOString()
    const updatedData = {
      count: reportGeneration.count + 1,
      firstUsedAt: reportGeneration.firstUsedAt || now,
      lastUsedAt: now,
      sessions: [...reportGeneration.sessions, sessionId]
    }

    await clerk.users.updateUser(userId, {
      privateMetadata: {
        ...privateMetadata,
        reportGeneration: updatedData
      }
    })

    const remaining = Math.max(0, RATE_LIMIT - updatedData.count)
    const showWarning = updatedData.count >= WARNING_THRESHOLD && updatedData.count < RATE_LIMIT
    const isBlocked = updatedData.count >= RATE_LIMIT

    return NextResponse.json({
      success: true,
      count: updatedData.count,
      limit: RATE_LIMIT,
      remaining,
      showWarning,
      isBlocked,
      warningThreshold: WARNING_THRESHOLD
    })
  } catch (error) {
    console.error('Error updating rate limit:', error)
    return NextResponse.json(
      { error: 'Error updating rate limit' },
      { status: 500 }
    )
  }
}