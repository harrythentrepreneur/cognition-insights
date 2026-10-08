/**
 * Shopify Magic Link Authentication Handler
 * 
 * This endpoint handles magic link authentication for Shopify customers.
 * It accepts a token parameter and signs the user in automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    const userId = searchParams.get('uid')
    
    if (!token && !email) {
      return NextResponse.json(
        { error: 'Missing authentication parameters' },
        { status: 400 }
      )
    }
    
    // If we have a token, verify it and redirect
    if (token) {
      // The token should be used on the client side to authenticate
      // Redirect to a client page that will handle the authentication
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}&redirect=/welcome`
      )
    }
    
    // If we only have email, redirect to sign-in with prefilled email
    if (email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?prefilled_email=${encodeURIComponent(email)}`
      )
    }
    
  } catch (error: any) {
    console.error('[Magic Link] Error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', message: error.message },
      { status: 500 }
    )
  }
}