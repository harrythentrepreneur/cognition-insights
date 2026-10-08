import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from Clerk
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses[0].emailAddress

    // Check if user already has purchase in metadata
    if (user.publicMetadata?.stripePurchaseId) {
      return NextResponse.json({ hasSubscription: true, source: 'clerk' })
    }

    // Search for existing Stripe customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    })

    if (customers.data.length > 0) {
      // Check if any customer has a successful payment
      for (const customer of customers.data) {
        // Check for successful payments
        const payments = await stripe.paymentIntents.list({
          customer: customer.id,
          limit: 100,
        })

        const hasSuccessfulPayment = payments.data.some(
          payment => payment.status === 'succeeded' && payment.amount === 7900 // $79.00
        )

        if (hasSuccessfulPayment) {
          // Update user metadata to restore access
          await clerk.users.updateUser(userId, {
            publicMetadata: {
              stripeCustomerId: customer.id,
              stripePurchaseId: payments.data[0].id,
              lifetimeAccess: true,
              restoredAt: new Date().toISOString(),
            },
          })

          return NextResponse.json({ 
            hasSubscription: true, 
            source: 'stripe',
            restored: true 
          })
        }
      }
    }

    return NextResponse.json({ hasSubscription: false })
  } catch (error) {
    console.error('Error checking subscription:', error)
    return NextResponse.json(
      { error: 'Error checking subscription' },
      { status: 500 }
    )
  }
}