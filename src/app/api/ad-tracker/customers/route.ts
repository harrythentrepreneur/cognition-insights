import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripe
}

// ============================================================================
// GET /api/ad-tracker/customers
// Returns all Stripe customers with their metadata (attribution data)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const customers: Array<{
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
      metadata: Record<string, any>;
    }> = []

    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const params: Stripe.CustomerListParams = {
        limit: 100,
      }
      if (startingAfter) params.starting_after = startingAfter
      const batch = await getStripe().customers.list(params)

      for (const c of batch.data) {
        if (c.deleted) continue
        customers.push({
          id: c.id,
          email: c.email || '',
          name: c.name || null,
          createdAt: new Date(c.created * 1000).toISOString(),
          metadata: c.metadata || {},
        })
      }

      hasMore = batch.has_more
      if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
    }

    return NextResponse.json({ customers })
  } catch (error: any) {
    console.error('Error fetching Stripe customers:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
