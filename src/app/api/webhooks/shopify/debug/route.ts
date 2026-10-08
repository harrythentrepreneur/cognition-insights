/**
 * Debug endpoint to check webhook processing
 * Only use in development!
 */

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getDebugData } from './debug-store'

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const checkUser = searchParams.get('checkUser') === 'true'
    
    // If email provided, check if user exists in Clerk
    let userInfo = null
    if (email && checkUser) {
      try {
        const clerk = await clerkClient()
        const users = await clerk.users.getUserList({
          emailAddress: [email]
        })
        
        if (users.totalCount > 0) {
          const user = users.data[0]
          userInfo = {
            found: true,
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt,
            publicMetadata: user.publicMetadata,
            privateMetadata: {
              hasShopifyOrders: !!(user.privateMetadata as any)?.shopifyOrders,
              orderCount: ((user.privateMetadata as any)?.shopifyOrders as any[])?.length || 0
            }
          }
        } else {
          userInfo = { found: false, email }
        }
      } catch (error: any) {
        userInfo = { error: error.message, email }
      }
    }

    const { lastWebhookData, webhookHistory } = getDebugData()
    
    return NextResponse.json({
      status: 'Debug Info',
      lastWebhook: lastWebhookData || 'No webhooks received yet',
      webhookCount: webhookHistory.length,
      recentWebhooks: webhookHistory.slice(-5).map((w: any) => ({
        timestamp: w.timestamp,
        orderId: w.orderId,
        email: w.email,
        success: w.success
      })),
      userCheck: userInfo,
      instructions: {
        checkUser: 'Add ?email=user@example.com&checkUser=true to check if user was created',
        example: '/api/webhooks/shopify/debug?email=test@example.com&checkUser=true'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error.message
    }, { status: 500 })
  }
}