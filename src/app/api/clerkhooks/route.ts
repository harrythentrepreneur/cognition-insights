import { createWebhooksHandler } from '@brianmmdev/clerk-webhooks-handler'
import { Stripe } from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

const handler = createWebhooksHandler({
  onUserCreated: async (user) => {
    try {
      const email = user.email_addresses[0]?.email_address
      if (!email) return

      // Since we do payment-first, check for recent successful payment
      // Search for checkout sessions with this email from the last hour
      const sessions = await stripe.checkout.sessions.list({
        limit: 10,
        created: {
          gte: Math.floor(Date.now() / 1000) - (60 * 60), // Last hour
        },
      })

      const userSession = sessions.data.find(session => 
        session.customer_email === email && 
        session.payment_status === 'paid' &&
        session.metadata?.plan === 'lifetime'
      )

      if (userSession) {
        // Get or create Stripe customer
        let customerId = userSession.customer as string

        if (!customerId && userSession.customer_details?.email) {
          // Create a new customer if one doesn't exist
          const customer = await stripe.customers.create({
            email: userSession.customer_details.email,
            name: userSession.customer_details.name || undefined,
            metadata: {
              clerkUserId: user.id,
            },
          })
          customerId = customer.id
        }

        // Get clerk client instance
        const clerk = await clerkClient()
        
        // Extract attribution
        const attribution = {
          ...(userSession.metadata?.utm_source && { utm_source: userSession.metadata.utm_source }),
          ...(userSession.metadata?.utm_medium && { utm_medium: userSession.metadata.utm_medium }),
          ...(userSession.metadata?.utm_campaign && { utm_campaign: userSession.metadata.utm_campaign }),
          ...(userSession.metadata?.utm_content && { utm_content: userSession.metadata.utm_content }),
          ...(userSession.metadata?.utm_term && { utm_term: userSession.metadata.utm_term }),
          ...(userSession.metadata?.fbclid && { fbclid: userSession.metadata.fbclid }),
          ...(userSession.metadata?.ref && { ref: userSession.metadata.ref }),
        };

        // Update user metadata with Stripe info and lifetime access
        await clerk.users.updateUser(user.id, {
          publicMetadata: {
            ...attribution,
            stripeCustomerId: customerId,
            stripePurchaseId: `lifetime_${userSession.id}`,
            subscriptionStatus: 'active',
            subscriptionPlan: 'lifetime',
          },
          privateMetadata: {
            stripeCheckoutSessionId: userSession.id,
            purchasedAt: new Date().toISOString(),
          },
        })

        console.log(`Associated lifetime purchase for user ${user.id} with session ${userSession.id}`)
        
        // Note: Welcome email is sent from create-user-after-payment endpoint
        // to avoid duplicate emails and race conditions
        
        // Return success response that triggers redirect
        return new Response(JSON.stringify({ 
          success: true, 
          redirectUrl: '/welcome' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        // In payment-first flow, this shouldn't happen
        // Log error as all users should have completed payment before signup
        console.error(`WARNING: User ${user.id} created without payment. Email: ${email}`)
        
        // As a fallback, check if there's a stored session ID
        // This could happen if webhook is delayed
        const storedSessionId = await stripe.checkout.sessions.list({
          limit: 50,
          created: {
            gte: Math.floor(Date.now() / 1000) - (24 * 60 * 60), // Last 24 hours
          },
        }).then(sessions => 
          sessions.data.find(s => 
            s.customer_email === email && 
            s.payment_status === 'paid'
          )
        )
        
        if (storedSessionId) {
          // Extract attribution
          const storedAttribution = {
            ...(storedSessionId.metadata?.utm_source && { utm_source: storedSessionId.metadata.utm_source }),
            ...(storedSessionId.metadata?.utm_medium && { utm_medium: storedSessionId.metadata.utm_medium }),
            ...(storedSessionId.metadata?.utm_campaign && { utm_campaign: storedSessionId.metadata.utm_campaign }),
            ...(storedSessionId.metadata?.utm_content && { utm_content: storedSessionId.metadata.utm_content }),
            ...(storedSessionId.metadata?.utm_term && { utm_term: storedSessionId.metadata.utm_term }),
            ...(storedSessionId.metadata?.fbclid && { fbclid: storedSessionId.metadata.fbclid }),
            ...(storedSessionId.metadata?.ref && { ref: storedSessionId.metadata.ref }),
          };

          // Update user with found session
          const clerk = await clerkClient()
          await clerk.users.updateUser(user.id, {
            publicMetadata: {
              ...storedAttribution,
              stripeCustomerId: storedSessionId.customer as string,
              stripePurchaseId: `lifetime_${storedSessionId.id}`,
              subscriptionStatus: 'active',
              subscriptionPlan: 'lifetime',
            },
          })
          console.log(`Found and associated payment for user ${user.id}`)
          
          // Note: Welcome email is sent from create-user-after-payment endpoint
        }
      }
    } catch (error) {
      console.error('Error processing user creation:', error)
    }
  },
})

export const POST = handler.POST