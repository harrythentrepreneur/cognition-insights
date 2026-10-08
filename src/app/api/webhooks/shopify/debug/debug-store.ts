// Shared debug data store for Shopify webhook debugging
// Separated from the route file to avoid Next.js App Router export constraints

let lastWebhookData: any = null
let webhookHistory: any[] = []

export function updateDebugData(data: any) {
  lastWebhookData = {
    timestamp: new Date().toISOString(),
    ...data
  }
  
  webhookHistory.push({
    timestamp: new Date().toISOString(),
    orderId: data.orderId,
    email: data.email,
    success: data.success,
    error: data.error
  })
  
  // Keep only last 20 webhooks in memory
  if (webhookHistory.length > 20) {
    webhookHistory = webhookHistory.slice(-20)
  }
}

export function getDebugData() {
  return { lastWebhookData, webhookHistory }
}
