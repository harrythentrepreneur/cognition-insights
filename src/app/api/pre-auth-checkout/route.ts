import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sendFacebookInitiateCheckout } from '@/lib/facebook-conversions-api'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

// Handle CORS preflight requests
export async function OPTIONS(req: Request) {
  // Get the origin from the request
  const origin = req.headers.get('origin') || ''
  
  // Allow cognition.cv and its variations
  const allowedOrigins = [
    'https://cognition.cv',
    'https://www.cognition.cv',
    'http://localhost:3000', // For local testing
  ]
  
  // Check if origin is allowed (or allow any Framer domain for now)
  const isAllowed = allowedOrigins.includes(origin) || 
                    origin.includes('framer.website') ||
                    origin.includes('framerusercontent.com')
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : 'https://cognition.cv',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    },
  })
}

export async function POST(req: Request) {
  // Get the origin from the request
  const origin = req.headers.get('origin') || ''
  
  // Allow cognition.cv and its variations
  const allowedOrigins = [
    'https://cognition.cv',
    'https://www.cognition.cv',
    'http://localhost:3000',
  ]
  
  // Check if origin is allowed (or allow any Framer domain)
  const isAllowed = allowedOrigins.includes(origin) || 
                    origin.includes('framer.website') ||
                    origin.includes('framerusercontent.com')
  
  // CORS headers for Framer
  const headers = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://cognition.cv',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  }
  try {
    const { email, firstName, authMethod, attribution } = await req.json()
    
    // Create or retrieve Stripe customer if email is provided
    let customerId: string | undefined
    if (email) {
      // Check if customer already exists
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      })
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
        console.log('Found existing Stripe customer:', customerId)
        
        // Update existing customer with attribution data from this checkout
        if (attribution) {
          const updates: Record<string, string> = {}
          const attribFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ref'] as const
          for (const key of attribFields) {
            if (attribution?.[key]) updates[key] = String(attribution[key]).substring(0, 500)
          }
          if (Object.keys(updates).length > 0) {
            try {
              await stripe.customers.update(customerId, { metadata: updates })
              console.log('Updated existing customer attribution:', customerId, updates)
            } catch (attribError) {
              console.error('Failed to update existing customer attribution:', attribError)
            }
          }
        }
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: email,
          name: firstName || undefined,
          metadata: {
            source: 'pre-auth-checkout',
            created_at: new Date().toISOString(),
            ...(attribution?.utm_source && { utm_source: attribution.utm_source.substring(0, 500) }),
            ...(attribution?.utm_campaign && { utm_campaign: attribution.utm_campaign.substring(0, 500) }),
            ...(attribution?.fbclid && { fbclid: attribution.fbclid.substring(0, 500) })
          }
        })
        customerId = customer.id
        console.log('Created new Stripe customer:', customerId)
      }
    }
    
    // Create checkout session without authentication
    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          // Use price ID if available, otherwise use price_data
          ...(process.env.STRIPE_PRICE_ID ? {
            price: process.env.STRIPE_PRICE_ID,
          } : {
            price_data: {
              currency: 'usd',
              product: process.env.STRIPE_PRODUCT_ID || undefined, // Use existing product if available
              product_data: !process.env.STRIPE_PRODUCT_ID ? {
                name: 'Cognition Lifetime Access',
                description: 'Unlock comprehensive WhatsApp chat analysis with lifetime access',
              } : undefined,
              unit_amount: 7900, // $79.00
            },
          }),
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verify-payment?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://cognition.cv`,
      metadata: {
        authMethod: authMethod || 'pending',
        plan: 'lifetime',
        ...(attribution?.utm_source && { utm_source: attribution.utm_source.substring(0, 500) }),
        ...(attribution?.utm_medium && { utm_medium: attribution.utm_medium.substring(0, 500) }),
        ...(attribution?.utm_campaign && { utm_campaign: attribution.utm_campaign.substring(0, 500) }),
        ...(attribution?.utm_content && { utm_content: attribution.utm_content.substring(0, 500) }),
        ...(attribution?.utm_term && { utm_term: attribution.utm_term.substring(0, 500) }),
        ...(attribution?.fbclid && { fbclid: attribution.fbclid.substring(0, 500) }),
        ...(attribution?.ref && { ref: attribution.ref.substring(0, 500) }),
      },
      allow_promotion_codes: true,
    }
    
    // Add customer ID if we have one, otherwise fall back to customer_email
    if (customerId) {
      sessionConfig.customer = customerId
    } else if (email) {
      sessionConfig.customer_email = email
    }
    
    // Add email to metadata for tracking
    if (email) {
      sessionConfig.metadata.email = email
    }
    
    // Only add firstName to metadata if provided
    if (firstName) {
      sessionConfig.metadata.firstName = firstName
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    
    // Track InitiateCheckout server-side
    try {
      const headers = req.headers;
      const userAgent = headers.get('user-agent') || undefined;
      const ipAddress = headers.get('x-forwarded-for')?.split(',')[0] || 
                       headers.get('x-real-ip') || 
                       undefined;
      
      // Extract Facebook cookies from Cookie header
      const cookieHeader = headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [key, value] = c.trim().split('=');
          return [key, value];
        })
      );
      
      // Generate consistent event ID
      const timestamp = Date.now();
      const eventId = `initiate_checkout_${timestamp}`;
      
      // Construct event source URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const eventSourceUrl = `${baseUrl}/?modal=open`;
      
      await sendFacebookInitiateCheckout(
        eventId,
        eventSourceUrl,
        {
          email,
          firstName,
          ipAddress,
          userAgent,
          fbc: cookies._fbc,
          fbp: cookies._fbp,
        },
        process.env.FACEBOOK_TEST_EVENT_CODE // Optional test event code
      );
    } catch (fbError) {
      console.error('Facebook Conversions API tracking failed:', fbError);
      // Don't fail the checkout process
    }

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    }, { headers })
  } catch (error: any) {
    console.error('Error creating pre-auth checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Error creating checkout session' },
      { status: 500, headers }
    )
  }
}