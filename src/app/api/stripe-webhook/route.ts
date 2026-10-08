import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'
import { addLiveEvent, type LiveEvent } from '../ad-tracker/event-store'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Helper to push a live event to the ad-tracker feed
function pushLiveEvent(
  type: LiveEvent['type'],
  description: string,
  email: string,
  amount?: string,
) {
  addLiveEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    description,
    email,
    amount,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session completed:', session.id)
        
        // Only process if payment was successful
        if (session.payment_status === 'paid') {
          const customerId = session.customer as string
          const customerEmail = session.customer_email || session.customer_details?.email
          
          // ── Copy attribution metadata from session → customer record ──
          // The Customer Origins table reads from customer.metadata,
          // so we must ensure UTM/click data lands there.
          if (customerId && session.metadata) {
            const attribFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ref']
            const attrib: Record<string, string> = {}
            for (const key of attribFields) {
              if (session.metadata[key]) attrib[key] = session.metadata[key]
            }
            if (Object.keys(attrib).length > 0) {
              try {
                await stripe.customers.update(customerId, { metadata: attrib })
                console.log('Copied attribution metadata to customer:', customerId, attrib)
              } catch (attribError) {
                console.error('Failed to copy attribution metadata to customer:', attribError)
              }
            }
          }
          
          // Push to live feed
          const amountTotal = session.amount_total ? `$${(session.amount_total / 100).toFixed(0)}` : undefined
          pushLiveEvent('payment', customerEmail || 'Customer', customerEmail || '', amountTotal)
          
          // Log customer creation/association
          console.log('Customer associated with payment:', {
            customerId,
            email: customerEmail,
            sessionId: session.id
          })
          
          // If we have metadata with userId, update Clerk user
          if (session.metadata?.userId) {
            try {
              const clerk = await clerkClient()
              await clerk.users.updateUser(session.metadata.userId, {
                publicMetadata: {
                  stripeCustomerId: customerId,
                  lastStripeSync: new Date().toISOString()
                }
              })
              console.log('Updated Clerk user with Stripe customer ID')
            } catch (clerkError) {
              console.error('Failed to update Clerk user:', clerkError)
            }
          }
        }
        break
      }
      
      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer
        console.log('New customer created:', {
          id: customer.id,
          email: customer.email,
          metadata: customer.metadata
        })
        // Push to live feed
        pushLiveEvent('signup', customer.email || 'New signup', customer.email || '')
        break
      }
      
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer
        console.log('Customer updated:', customer.id)
        
        if (customer.metadata?.clerkUserId) {
          try {
            const clerk = await clerkClient()
            await clerk.users.updateUser(customer.metadata.clerkUserId, {
              publicMetadata: {
                stripeCustomerId: customer.id,
                lastStripeSync: new Date().toISOString()
              }
            })
          } catch (clerkError) {
            console.error('Failed to sync customer update to Clerk:', clerkError)
          }
        }
        break
      }
      
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const isTrialing = subscription.status === 'trialing'
        pushLiveEvent(
          isTrialing ? 'trial_start' : 'subscription',
          `Customer ${(subscription.customer as string).slice(-6)}`,
          '',
        )
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        let amount = 0
        if (subscription.items && subscription.items.data) {
          for (const item of subscription.items.data) {
            if (item.plan && item.plan.amount) {
              amount += item.plan.amount * (item.quantity || 1)
            }
          }
        }
        const amountStr = amount > 0 ? `$${(amount / 100).toFixed(0)}` : undefined

        pushLiveEvent(
          'churn',
          `Customer ${(subscription.customer as string).slice(-6)}`,
          '',
          amountStr
        )
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        // Detect upgrades (plan change)
        if (subscription.status === 'active') {
          pushLiveEvent(
            'upgrade',
            `Customer ${(subscription.customer as string).slice(-6)}`,
            '',
          )
        }
        break
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', {
          id: paymentIntent.id,
          customer: paymentIntent.customer,
          amount: paymentIntent.amount
        })
        // Push to live feed
        const amount = `$${(paymentIntent.amount / 100).toFixed(0)}`
        pushLiveEvent('payment', `Customer`, '', amount)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const refundAmount = `$${(charge.amount_refunded / 100).toFixed(0)}`
        pushLiveEvent('refund', charge.billing_details?.email || 'Customer', charge.billing_details?.email || '', refundAmount)
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}
