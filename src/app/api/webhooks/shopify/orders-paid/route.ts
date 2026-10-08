/**
 * Shopify Orders/Paid Webhook Handler
 * 
 * This endpoint receives webhooks from Shopify when an order is paid.
 * It automatically creates a Clerk user account and sends a welcome email
 * with a magic link for passwordless authentication.
 * 
 * Required environment variables:
 * - SHOPIFY_WEBHOOK_SECRET: Secret for verifying webhook signatures
 * - NEXT_PUBLIC_APP_URL: Base URL of the application
 * - CLERK_SECRET_KEY: Clerk API key (should be set already)
 * - RESEND_API_KEY: Resend API key (should be set already)
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ShopifyOrderPaidWebhook } from '@/types/shopify'
import {
  verifyShopifyWebhook,
  createOrUpdateClerkUser,
  generateMagicLink,
  determineUserPlan,
  extractCustomerData
} from '@/lib/shopify/webhook-helpers'
import { sendWelcomeEmail } from '@/lib/email/templates/welcome'
import { updateDebugData } from '../debug/debug-store'

/**
 * POST /api/webhooks/shopify/orders-paid
 * 
 * Handle paid order notifications from Shopify
 */
export async function POST(req: NextRequest) {
  console.log('[Shopify Webhook] Received orders/paid webhook')
  
  try {
    // Step 1: Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('X-Shopify-Hmac-Sha256')
    
    // Step 2: Verify webhook authenticity
    const verificationResult = await verifyShopifyWebhook(rawBody, signature)
    
    if (!verificationResult.isValid) {
      console.error('[Shopify Webhook] Verification failed:', verificationResult.error)
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          details: verificationResult.error 
        },
        { status: 401 }
      )
    }
    
    // Step 3: Parse the webhook payload
    let orderData: ShopifyOrderPaidWebhook
    try {
      orderData = JSON.parse(rawBody) as ShopifyOrderPaidWebhook
    } catch (parseError) {
      console.error('[Shopify Webhook] Failed to parse payload:', parseError)
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }
    
    // Log order details for debugging
    console.log('[Shopify Webhook] Processing order:', {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      email: orderData.email,
      customerName: `${orderData.customer?.first_name} ${orderData.customer?.last_name}`,
      totalPrice: orderData.total_price,
      currency: orderData.currency,
      lineItems: orderData.line_items?.length || 0
    })
    
    // Step 4: Extract customer information
    const customerData = extractCustomerData(orderData)
    
    if (!customerData.email) {
      console.error('[Shopify Webhook] No email found in order')
      // Return 200 to prevent Shopify retries for data issues
      return NextResponse.json({
        success: false,
        error: 'No email address in order',
        note: 'Webhook processed but skipped due to missing email'
      })
    }
    
    // Step 5: Check for test orders (optional - remove in production)
    if (orderData.test === true) {
      console.warn('[Shopify Webhook] Test order detected, processing anyway')
    }
    
    // Step 6: Create or update Clerk user
    const userResult = await createOrUpdateClerkUser(orderData)
    
    if (!userResult.success) {
      console.error('[Shopify Webhook] User creation failed:', userResult.error)
      // Still return 200 to prevent retries, but log the error
      return NextResponse.json({
        success: false,
        error: userResult.error,
        note: 'User creation failed but webhook acknowledged'
      })
    }
    
    console.log('[Shopify Webhook] User processed:', {
      userId: userResult.userId,
      email: userResult.email,
      isNew: userResult.isNewUser
    })
    
    // Step 7: Generate magic link for authentication
    const magicLinkUrl = await generateMagicLink(
      customerData.email,
      userResult.userId
    )
    
    if (!magicLinkUrl) {
      console.warn('[Shopify Webhook] Could not generate magic link')
    }
    
    // Step 8: Determine user plan from products
    const userPlan = determineUserPlan(orderData.line_items)
    
    // Step 9: Send welcome email with Harry's personal message
    if (magicLinkUrl) {
      try {
        const emailResult = await sendWelcomeEmail(
          customerData.email,
          customerData.firstName || undefined,
          magicLinkUrl
        )
        
        if (emailResult.success) {
          console.log('[Shopify Webhook] Welcome email sent successfully')
        } else {
          console.error('[Shopify Webhook] Email send failed:', emailResult.error)
        }
      } catch (emailError) {
        // Don't fail the webhook for email errors
        console.error('[Shopify Webhook] Email exception:', emailError)
      }
    }
    
    // Step 10: Log to debug endpoint
    const debugData = {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      userId: userResult.userId,
      email: customerData.email,
      isNewUser: userResult.isNewUser,
      plan: userPlan,
      emailSent: !!magicLinkUrl,
      success: true
    }
    
    // Update debug data for monitoring
    updateDebugData(debugData)
    
    // Step 11: Return success response
    console.log('[Shopify Webhook] Order processed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Order processed successfully',
      data: debugData
    })
    
  } catch (error: any) {
    // Catch-all error handler
    console.error('[Shopify Webhook] Unexpected error:', {
      message: error.message,
      stack: error.stack
    })
    
    // Return 200 to prevent Shopify from retrying on our errors
    // This prevents webhook spam if we have a bug
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      note: 'Returning 200 to acknowledge webhook despite error'
    })
  }
}

/**
 * GET /api/webhooks/shopify/orders-paid
 * 
 * Health check endpoint for testing
 */
export async function GET(req: NextRequest) {
  // Simple health check for the webhook endpoint
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/shopify/orders-paid',
    timestamp: new Date().toISOString(),
    configured: {
      hasWebhookSecret: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      hasClerkKey: !!process.env.CLERK_SECRET_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL
    }
  })
}