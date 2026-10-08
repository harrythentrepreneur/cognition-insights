import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

export async function GET(req: Request) {
  // Get base URL for redirects
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://cognition.cv'
    : new URL(req.url).origin;
    
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.redirect(new URL('/?error=no_session', baseUrl))
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    // Check if payment was successful
    if (session.payment_status === 'paid') {
      // Store payment info in cookies for Clerk signup
      const cookieStore = await cookies()
      cookieStore.set('payment_completed', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 30, // 30 minutes
      })
      
      cookieStore.set('payment_email', session.customer_email || '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 30, // 30 minutes
      })
      
      cookieStore.set('stripe_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 30, // 30 minutes
      })
      
      // Redirect to payment success page which will handle Clerk signup
      return NextResponse.redirect(new URL(`/payment-success?session_id=${sessionId}`, baseUrl))
    } else {
      return NextResponse.redirect(new URL('/?error=payment_failed', baseUrl))
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.redirect(new URL('/?error=verification_failed', baseUrl))
  }
}