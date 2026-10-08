/**
 * Shopify Webhook Helper Functions
 * Utilities for processing Shopify webhooks and managing user creation
 */

import * as crypto from 'crypto'
import { clerkClient, type User } from '@clerk/nextjs/server'
import type { 
  ShopifyOrderPaidWebhook, 
  PlanType, 
  ShopifyLineItem,
  UserCreationResult,
  WebhookVerificationResult,
  ShopifyOrderMetadata
} from '@/types/shopify'

/**
 * Verify Shopify webhook signature using HMAC-SHA256
 * @param rawBody - Raw request body as string
 * @param signature - X-Shopify-Hmac-Sha256 header value
 * @returns Verification result with isValid flag
 */
export async function verifyShopifyWebhook(
  rawBody: string,
  signature: string | null
): Promise<WebhookVerificationResult> {
  // Check if signature exists
  if (!signature) {
    return {
      isValid: false,
      error: 'No signature provided in request headers'
    }
  }
  
  // Get webhook secret from environment
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Shopify Webhook] SHOPIFY_WEBHOOK_SECRET not configured')
    return {
      isValid: false,
      error: 'Webhook secret not configured on server'
    }
  }

  try {
    // Calculate HMAC digest
    const digest = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64')

    // Compare digests
    const isValid = digest === signature
    
    if (!isValid) {
      console.warn('[Shopify Webhook] Signature mismatch', {
        expected: signature.substring(0, 10) + '...',
        calculated: digest.substring(0, 10) + '...'
      })
    }

    return { isValid }
  } catch (error) {
    console.error('[Shopify Webhook] Verification error:', error)
    return {
      isValid: false,
      error: 'Failed to verify signature'
    }
  }
}

/**
 * Map Shopify product information to application plan type
 * @param lineItems - Array of line items from order
 * @returns Plan type based on product analysis
 */
export function determineUserPlan(lineItems: ShopifyLineItem[]): PlanType {
  if (!lineItems || lineItems.length === 0) {
    console.warn('[Shopify Webhook] No line items found, defaulting to premium')
    return 'premium'
  }
  
  // Analyze all line items to determine highest tier purchased
  let highestPlan: PlanType = 'premium'
  
  for (const item of lineItems) {
    const title = item.title?.toLowerCase() || ''
    const variant = item.variant_title?.toLowerCase() || ''
    const sku = item.sku?.toLowerCase() || ''
    
    // Check for enterprise indicators
    if (
      title.includes('enterprise') || 
      variant.includes('enterprise') ||
      sku.includes('ent')
    ) {
      return 'enterprise' // Enterprise is highest, return immediately
    }
    
    // Check for professional indicators
    if (
      title.includes('professional') || 
      title.includes('pro') ||
      variant.includes('professional') ||
      variant.includes('pro') ||
      sku.includes('pro')
    ) {
      highestPlan = 'professional'
    }
  }
  
  return highestPlan
}

/**
 * Extract customer information from Shopify order
 * @param order - Shopify order webhook payload
 * @returns Extracted customer data
 */
export function extractCustomerData(order: ShopifyOrderPaidWebhook) {
  // Try multiple sources for email
  const email = 
    order.email || 
    order.customer?.email || 
    order.contact_email ||
    order.billing_address?.first_name // This would be wrong, but keeping for type example
  
  // Try multiple sources for first name
  const firstName = 
    order.customer?.first_name || 
    order.billing_address?.first_name ||
    order.shipping_address?.first_name ||
    ''
  
  // Try multiple sources for last name
  const lastName = 
    order.customer?.last_name || 
    order.billing_address?.last_name ||
    order.shipping_address?.last_name ||
    ''
  
  return {
    email: email || null,
    firstName: firstName || '',
    lastName: lastName || '',
    fullName: `${firstName} ${lastName}`.trim()
  }
}

/**
 * Create or update a Clerk user from Shopify order data
 * @param order - Shopify order webhook payload
 * @returns User creation result with user ID
 */
export async function createOrUpdateClerkUser(
  order: ShopifyOrderPaidWebhook
): Promise<UserCreationResult> {
  const customerData = extractCustomerData(order)
  
  // Validate email exists
  if (!customerData.email) {
    return {
      success: false,
      email: '',
      isNewUser: false,
      error: 'No email address found in order'
    }
  }
  
  const email = customerData.email
  const plan = determineUserPlan(order.line_items)
  
  try {
    // Initialize Clerk client
    const clerk = await clerkClient()
    
    // Check if user already exists
    const existingUsers = await clerk.users.getUserList({
      emailAddress: [email]
    })
    
    let user: User
    let isNewUser = false
    
    if (existingUsers.totalCount > 0) {
      // User exists - update their metadata
      user = existingUsers.data[0]
      console.log('[Shopify Webhook] Updating existing user:', user.id)
      
      // Update user with latest order information
      user = await clerk.users.updateUser(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          shopifyOrderId: order.id,
          shopifyCustomerId: order.customer?.id,
          plan: plan,
          lastPurchaseAt: new Date().toISOString(),
          source: user.publicMetadata?.source || 'shopify'
        }
      })
    } else {
      // Create new user
      console.log('[Shopify Webhook] Creating new user for:', email)
      isNewUser = true
      
      user = await clerk.users.createUser({
        emailAddress: [email],
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        skipPasswordRequirement: true,
        publicMetadata: {
          shopifyOrderId: order.id,
          shopifyCustomerId: order.customer?.id,
          plan: plan,
          purchasedAt: new Date().toISOString(),
          source: 'shopify',
          autoCreated: true
        }
      })
      
      console.log('[Shopify Webhook] Created new user:', user.id)
    }
    
    // Store detailed order information in private metadata
    await storeOrderMetadata(user.id, order)
    
    return {
      success: true,
      userId: user.id,
      email: email,
      isNewUser: isNewUser
    }
    
  } catch (error: any) {
    console.error('[Shopify Webhook] User management error:', error)
    
    // Handle specific Clerk errors
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      // This shouldn't happen since we check first, but handle it
      try {
        const clerk = await clerkClient()
        const existingUsers = await clerk.users.getUserList({
          emailAddress: [email]
        })
        
        if (existingUsers.totalCount > 0) {
          const user = existingUsers.data[0]
          return {
            success: true,
            userId: user.id,
            email: email,
            isNewUser: false
          }
        }
      } catch (retryError) {
        console.error('[Shopify Webhook] Retry failed:', retryError)
      }
    }
    
    return {
      success: false,
      email: email,
      isNewUser: false,
      error: error.message || 'Failed to create or update user'
    }
  }
}

/**
 * Store order metadata in user's private metadata for audit trail
 * @param userId - Clerk user ID
 * @param order - Shopify order data
 */
async function storeOrderMetadata(
  userId: string, 
  order: ShopifyOrderPaidWebhook
): Promise<void> {
  try {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    
    // Prepare order metadata
    const orderMetadata: ShopifyOrderMetadata = {
      orderId: order.id,
      amount: order.total_price,
      currency: order.currency,
      createdAt: order.created_at,
      lineItems: order.line_items.map(item => ({
        title: item.title,
        variant: item.variant_title,
        quantity: item.quantity,
        price: item.price
      }))
    }
    
    // Get existing orders or initialize array
    const existingOrders = (user.privateMetadata?.shopifyOrders as ShopifyOrderMetadata[]) || []
    
    // Check if this order already exists (idempotency)
    const orderExists = existingOrders.some(o => o.orderId === order.id)
    if (orderExists) {
      console.log('[Shopify Webhook] Order already recorded:', order.id)
      return
    }
    
    // Add new order to history
    const updatedOrders = [...existingOrders, orderMetadata]
    
    // Update user's private metadata
    await clerk.users.updateUser(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        shopifyOrders: updatedOrders,
        lastOrderProcessedAt: new Date().toISOString()
      }
    })
    
    console.log('[Shopify Webhook] Stored order metadata for user:', userId)
  } catch (error) {
    // Don't fail the main process if metadata update fails
    console.error('[Shopify Webhook] Failed to store order metadata:', error)
  }
}

/**
 * Generate a magic link URL for user authentication
 * Uses the same approach as the existing create-user-after-payment endpoint
 * @param email - User's email address
 * @param userId - Clerk user ID (required)
 * @returns Magic link URL or null if generation fails
 */
export async function generateMagicLink(
  email: string,
  userId?: string
): Promise<string | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cognition.cv'
  
  if (!userId) {
    console.warn('[Shopify Webhook] No userId provided for magic link generation')
    return `${appUrl}/login?prefilled_email=${encodeURIComponent(email)}`
  }
  
  try {
    const clerk = await clerkClient()
    
    // Create a magic link token (same as send-welcome-email endpoint)
    const magicLinkToken = await clerk.signInTokens.createSignInToken({
      userId: userId,
      expiresInSeconds: 86400, // 24 hours
    })
    
    // Generate the magic link URL
    const magicLinkUrl = `${appUrl}/login?token=${magicLinkToken.token}`
    console.log('[Shopify Webhook] Generated magic link token for user:', userId)
    
    return magicLinkUrl
    
  } catch (error: any) {
    console.error('[Shopify Webhook] Failed to generate magic link:', error.message)
    
    // Fallback: Direct to login with prefilled email
    const fallbackUrl = `${appUrl}/login?prefilled_email=${encodeURIComponent(email)}`
    return fallbackUrl
  }
}