import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { sessionId, email } = await req.json()
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID provided' }, { status: 400 })
    }

    // Verify the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = session.customer as string

    if (!customerId && session.customer_details?.email) {
      // Create a new customer if one doesn't exist
      const customer = await stripe.customers.create({
        email: session.customer_details.email,
        name: session.customer_details.name || undefined,
        metadata: {
          clerkUserId: userId,
        },
      })
      customerId = customer.id
    }

    // Update user metadata with Stripe info and lifetime access
    const clerk = await clerkClient()
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        stripeCustomerId: customerId,
        stripePurchaseId: `lifetime_${session.id}`,
        subscriptionStatus: 'active',
        subscriptionPlan: 'lifetime',
      },
      privateMetadata: {
        stripeCheckoutSessionId: session.id,
        purchasedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Signup completed successfully'
    })
  } catch (error: any) {
    console.error('Error completing signup:', error)
    return NextResponse.json(
      { error: error.message || 'Error completing signup' },
      { status: 500 }
    )
  }
}