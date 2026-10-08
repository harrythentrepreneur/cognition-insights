import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'
import { extractStripeFirstName } from '@/lib/utils/name-formatter'
import { sendPinterestPurchase } from '@/lib/pinterest-api'
import { sendRedditPurchase } from '@/lib/reddit-api'
import { sendFacebookPurchase } from '@/lib/facebook-conversions-api'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()

    // Retrieve the checkout session from Stripe with expanded customer details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer'],
    })
    
    if (session.payment_status === 'paid') {
      // For one-time payment, use payment intent ID as subscription ID
      const paymentId = session.payment_intent as string
      
      // Check if user is authenticated (existing flow)
      const { userId: authUserId } = await auth()
      
      // Determine which user ID to use
      const userId = authUserId || session.metadata?.userId
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 400 })
      }
      
      // Get the current user data from Clerk first
      const clerk = await clerkClient()
      const currentUser = await clerk.users.getUser(userId)
      
      // Only update firstName if the user doesn't already have one
      let updateData: any = {
        publicMetadata: {
          stripeCustomerId: session.customer as string,
          stripePurchaseId: paymentId, // Payment ID for lifetime access purchase
          lifetimeAccess: true,
        },
      }
      
      // Check if user already has a firstName (e.g., from Google OAuth or previous update)
      if (!currentUser.firstName) {
        // Try to get customer name from Stripe
        let firstName = 'Friend'; // Default fallback
        if (session.customer && typeof session.customer === 'object' && 'name' in session.customer) {
          const customerName = session.customer.name;
          if (customerName) {
            firstName = extractStripeFirstName(customerName);
          }
        }
        updateData.firstName = firstName;
      }
      
      // Update user metadata with payment info and name (if needed)
      await clerk.users.updateUser(userId, updateData)
      
      // Get common tracking data
      const headers = req.headers;
      const userAgent = headers.get('user-agent') || undefined;
      const ipAddress = headers.get('x-forwarded-for')?.split(',')[0] || 
                       headers.get('x-real-ip') || 
                       undefined;
      
      // Send Pinterest Conversions API event
      try {
        const referer = headers.get('referer') || undefined;
        
        // Construct the success page URL (where the conversion happened)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const eventSourceUrl = `${baseUrl}/purchase-success?session_id=${sessionId}`;
        
        await sendPinterestPurchase(
          sessionId,
          session.customer_email || undefined,
          userAgent,
          ipAddress,
          eventSourceUrl,
          false // Set to true for testing
        );
      } catch (pinterestError) {
        // Log but don't fail the payment confirmation
        console.error('Pinterest API tracking failed:', pinterestError);
      }
      
      // Send Reddit Conversions API event
      try {
        await sendRedditPurchase(
          sessionId,
          session.customer_email || undefined,
          userAgent,
          ipAddress,
          false // Set to true for testing
        );
      } catch (redditError) {
        // Log but don't fail the payment confirmation
        console.error('Reddit API tracking failed:', redditError);
      }
      
      // Send Facebook Conversions API event
      try {
        // Extract Facebook cookies
        const cookieHeader = headers.get('cookie') || '';
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map(c => {
            const [key, value] = c.trim().split('=');
            return [key, value];
          })
        );
        
        // Construct the success page URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const eventSourceUrl = `${baseUrl}/purchase-success?session_id=${sessionId}`;
        
        // Get user's first name if available
        const firstName = currentUser?.firstName || undefined;
        
        await sendFacebookPurchase(
          sessionId,
          eventSourceUrl,
          {
            email: session.customer_email || undefined,
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
        // Don't fail the payment confirmation
      }
      
      // If this is from the unified signup flow, create a sign-in token
      if (!authUserId && session.metadata?.userId) {
        // Return success with a flag indicating the user needs to sign in
        return NextResponse.json({ 
          success: true,
          needsSignIn: true,
          email: session.customer_email
        })
      }
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  } catch (error) {
    console.error('Error confirming subscription:', error)
    return NextResponse.json(
      { error: 'Error confirming subscription' },
      { status: 500 }
    )
  }
}