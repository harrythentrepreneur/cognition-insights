/**
 * Shopify Webhook Types
 * Type definitions for Shopify webhook payloads
 */

/**
 * Customer object from Shopify
 */
export interface ShopifyCustomer {
  id: number
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
  tags: string
  note: string | null
  total_spent: string
  accepts_marketing: boolean
  accepts_marketing_updated_at: string | null
}

/**
 * Address object used in billing and shipping
 */
export interface ShopifyAddress {
  first_name: string | null
  last_name: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  country: string | null
  zip: string | null
  phone: string | null
  company: string | null
  province_code: string | null
  country_code: string | null
}

/**
 * Line item in an order
 */
export interface ShopifyLineItem {
  id: number
  variant_id: number
  title: string
  quantity: number
  price: string
  sku: string | null
  variant_title: string | null
  vendor: string | null
  fulfillment_service: string
  product_id: number
  requires_shipping: boolean
  taxable: boolean
  gift_card: boolean
  name: string
  variant_inventory_management: string | null
  properties: Array<{ name: string; value: string }>
  product_exists: boolean
  fulfillable_quantity: number
  grams: number
  total_discount: string
  fulfillment_status: string | null
}

/**
 * Main order object from orders/paid webhook
 */
export interface ShopifyOrderPaidWebhook {
  id: number
  email: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  number: number
  note: string | null
  token: string
  gateway: string | null
  test: boolean
  total_price: string
  subtotal_price: string
  total_weight: number
  total_tax: string
  taxes_included: boolean
  currency: string
  financial_status: 'paid' | 'pending' | 'refunded' | 'partially_refunded'
  confirmed: boolean
  total_discounts: string
  total_line_items_price: string
  cart_token: string | null
  buyer_accepts_marketing: boolean
  name: string
  referring_site: string | null
  landing_site: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  reference: string | null
  user_id: number | null
  location_id: number | null
  source_identifier: string | null
  source_url: string | null
  processed_at: string
  device_id: string | null
  customer: ShopifyCustomer | null
  billing_address: ShopifyAddress | null
  shipping_address: ShopifyAddress | null
  line_items: ShopifyLineItem[]
  fulfillments: any[]
  refunds: any[]
  customer_locale: string | null
  browser_ip: string | null
  landing_site_ref: string | null
  order_number: number
  discount_codes: any[]
  note_attributes: any[]
  payment_gateway_names: string[]
  processing_method: string
  checkout_id: number | null
  source_name: string
  fulfillment_status: string | null
  tax_lines: any[]
  tags: string
  contact_email: string | null
  order_status_url: string
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  isValid: boolean
  error?: string
}

/**
 * User creation result from our handler
 */
export interface UserCreationResult {
  success: boolean
  userId?: string
  email: string
  isNewUser: boolean
  error?: string
}

/**
 * Plan types available in the application
 */
export type PlanType = 'free' | 'premium' | 'professional' | 'enterprise'

/**
 * Shopify order metadata to store in Clerk
 */
export interface ShopifyOrderMetadata {
  orderId: number
  amount: string
  currency: string
  createdAt: string
  lineItems: Array<{
    title: string
    variant: string | null
    quantity: number
    price: string
  }>
}