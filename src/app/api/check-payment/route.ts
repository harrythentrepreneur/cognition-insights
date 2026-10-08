import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID provided' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    // Return payment status
    return NextResponse.json({ 
      success: session.payment_status === 'paid',
      email: session.customer_email,
      metadata: session.metadata,
      customerDetails: session.customer_details,
    })
  } catch (error: any) {
    console.error('Error checking payment:', error)
    return NextResponse.json(
      { error: error.message || 'Error checking payment', success: false },
      { status: 500 }
    )
  }
}