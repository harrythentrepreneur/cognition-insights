import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    console.log('[Resend Client] Initializing with API key:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 10) || 'not-set'
    })
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export const EMAIL_CONFIG = {
  // Your domain is verified! Using custom domain
  from: 'Cognition <hello@cognition.cv>',
  replyTo: 'support@cognition.cv',
  // Fallback to Resend's test domain if needed
  fallbackFrom: 'Cognition <onboarding@resend.dev>',
}