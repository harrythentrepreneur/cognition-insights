import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { extractStripeFirstName } from '@/lib/utils/name-formatter'
import { sendEmailWithRetry } from '@/lib/email/error-handler'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID provided' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription']
    })
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    const email = session.customer_email || session.customer_details?.email
    if (!email) {
      return NextResponse.json({ error: 'No email found in payment session' }, { status: 400 })
    }

    // Extract customer name from Stripe session
    const customerName = session.customer_details?.name
    const firstName = extractStripeFirstName(customerName || email.split('@')[0])

    const clerk = await clerkClient()
    
    // Extract attribution metadata from Stripe session
    const attribution = {
      ...(session.metadata?.utm_source && { utm_source: session.metadata.utm_source }),
      ...(session.metadata?.utm_medium && { utm_medium: session.metadata.utm_medium }),
      ...(session.metadata?.utm_campaign && { utm_campaign: session.metadata.utm_campaign }),
      ...(session.metadata?.utm_content && { utm_content: session.metadata.utm_content }),
      ...(session.metadata?.utm_term && { utm_term: session.metadata.utm_term }),
      ...(session.metadata?.fbclid && { fbclid: session.metadata.fbclid }),
      ...(session.metadata?.ref && { ref: session.metadata.ref }),
    };
    
    // Check if user already exists
    let existingUsers
    try {
      existingUsers = await clerk.users.getUserList({
        emailAddress: [email]
      })
    } catch (error) {
      console.error('Error checking existing users:', error)
      existingUsers = { totalCount: 0, data: [] }
    }

    let userId: string
    let signInTicket: string | null = null
    let isNewUser = false

    if (existingUsers.totalCount > 0) {
      // User exists - this is NOT an error, it's expected for returning customers
      userId = existingUsers.data[0].id
      console.log('Existing user found, updating metadata for:', email)
      
      const existingUser = existingUsers.data[0]
      const currentMetadata = existingUser.publicMetadata || {}
      const privateMetadata = existingUser.privateMetadata || {}
      
      // Track purchase history
      const purchaseHistory = (privateMetadata.purchaseHistory || []) as any[]
      purchaseHistory.push({
        sessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        purchasedAt: new Date().toISOString(),
        customerName: session.customer_details?.name,
      })
      
      await clerk.users.updateUser(userId, {
        publicMetadata: {
          ...currentMetadata,
          ...attribution,
          stripeCustomerId: session.customer as string,
          stripePurchaseId: `lifetime_${session.id}`,
          subscriptionStatus: 'active',
          subscriptionPlan: 'lifetime',
          lastPaymentAt: new Date().toISOString(),
          totalPurchases: purchaseHistory.length,
        },
        privateMetadata: {
          ...privateMetadata,
          stripeCheckoutSessionId: session.id,
          lastPurchasedAt: new Date().toISOString(),
          purchaseHistory: purchaseHistory.slice(-10), // Keep last 10 purchases
        },
      })
      
      // Send a different email for returning customers
      if (purchaseHistory.length > 1) {
        console.log('Returning customer detected, will send special email')
      }
    } else {
      // Create new user without password (passwordless flow)
      console.log('Creating new user for:', email)
      isNewUser = true
      
      const user = await clerk.users.createUser({
        emailAddress: [email],
        firstName: firstName,
        publicMetadata: {
          ...attribution,
          stripeCustomerId: session.customer as string,
          stripePurchaseId: `lifetime_${session.id}`,
          subscriptionStatus: 'active',
          subscriptionPlan: 'lifetime',
          paidViaStripe: true,
        },
        privateMetadata: {
          stripeCheckoutSessionId: session.id,
          purchasedAt: new Date().toISOString(),
          emailVerifiedViaPayment: true,
        },
      })
      userId = user.id
    }
    
    // Always create sign-in token for immediate access
    const signInTokenResponse = await clerk.signInTokens.createSignInToken({
      userId: userId,
      expiresInSeconds: 300, // 5 minutes
    })
    signInTicket = signInTokenResponse.token

    // Send welcome email (now direct function call for better reliability)
    if (isNewUser) {
      console.log('[Create User] Triggering welcome email for new user:', email)
      try {
        // Create a magic link for future logins
        const magicLinkToken = await clerk.signInTokens.createSignInToken({
          userId: userId,
          expiresInSeconds: 30 * 24 * 60 * 60, // 30 days
        })
        
        // Get the correct base URL for the magic link
        const origin = req.headers.get('origin') || req.headers.get('host') || 'http://localhost:3000'
        const protocol = origin.includes('localhost') ? 'http' : 'https'
        const baseUrl = origin.includes('://') ? origin : `${protocol}://${origin}`
        const magicLinkUrl = `${baseUrl}/login?token=${magicLinkToken.token}`
        
        // Send email directly without HTTP call
        const emailResult = await sendEmailWithRetry({
          to: [email],
          subject: 'Welcome to Cognition! 🌟',
          from: 'Harry from Cognition <hello@cognition.cv>',
          html: `
            <div style="font-family: Arial, sans-serif; color: #000; font-size: 16px; line-height: 1.5;">
              <p>Hi ${firstName || 'there'},</p>
              
              <p>I'm Harry, founder of Cognition, and I wanted to personally welcome you to our community.</p>
              
              <p>You've just taken the first step toward understanding yourself in a completely new way. Your conversations hold incredible insights about who you are, how you've grown, and where you're heading – and Cognition is here to help you discover them.</p>
              
              <p>As you explore your emotional landscapes and life patterns, remember that this is your journey. Take your time. The insights waiting for you are worth it.</p>
              
              <p>Your conversations never touch our servers. Everything processes locally on your device—we architected it so we architecturally can't see your data. You can verify this yourself in your browser's network tab, or read the technical details at <a href="https://cognition.cv/security" style="color: #007A7A;">cognition.cv/security</a>.</p>
              
              <p>If you have any questions or need support along the way, just reply to this email. Our team and I are here to help.</p>
              
              <p>Here's to discovering the beautiful truth hidden in your messages.</p>
              
              <p>
              <strong>Harry</strong><br>
              Founder, Cognition<br>
              <a href="${magicLinkUrl}" style="color: #007A7A;">Access Your Account</a>
              </p>
            </div>
          `,
        })
        
        console.log('[Create User] Welcome email sent successfully:', emailResult)
      } catch (emailError) {
        console.error('[Create User] Failed to send welcome email:', emailError)
        // Don't fail the user creation if email fails
      }
    } else {
      console.log('[Create User] Existing user, skipping welcome email')
    }
    
    return NextResponse.json({ 
      success: true,
      userId,
      signInTicket,
      email,
      message: 'User created/updated successfully'
    })
  } catch (error: any) {
    console.error('Error creating user after payment:', error)
    return NextResponse.json(
      { error: error.message || 'Error creating user' },
      { status: 500 }
    )
  }
}