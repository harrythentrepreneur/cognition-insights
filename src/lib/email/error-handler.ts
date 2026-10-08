import { getResendClient, EMAIL_CONFIG } from './resend'

interface EmailRetryOptions {
  maxRetries?: number
  retryDelay?: number
  fallbackToTestDomain?: boolean
}

export async function sendEmailWithRetry(
  emailData: {
    to: string[]
    subject: string
    html: string
    replyTo?: string
    from?: string
  },
  options: EmailRetryOptions = {}
) {
  const { 
    maxRetries = 3, 
    retryDelay = 2000, 
    fallbackToTestDomain = true 
  } = options
  
  console.log('[Email Handler] Starting email send:', {
    to: emailData.to,
    subject: emailData.subject,
    hasApiKey: !!process.env.RESEND_API_KEY,
    apiKeyLength: process.env.RESEND_API_KEY?.length || 0
  })
  
  const resend = getResendClient()
  let lastError: any
  
  // Try with primary domain first
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: emailData.from || EMAIL_CONFIG.from,
        replyTo: emailData.replyTo || EMAIL_CONFIG.replyTo,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      })
      
      console.log('[Email Handler] Resend API response:', {
        data: result.data,
        error: result.error,
        fullResult: JSON.stringify(result, null, 2)
      })
      
      if (result.error) {
        throw new Error(result.error.message || 'Resend API error')
      }
      
      // Log the email ID for tracking
      if (result.data?.id) {
        console.log(`[Email Handler] ✅ Email sent successfully! Check Resend dashboard: https://resend.com/emails/${result.data.id}`)
      } else {
        console.log('[Email Handler] ⚠️ Email sent but no ID returned. Check Resend logs.')
      }
      
      return { success: true, data: result.data, attempt }
    } catch (error: any) {
      lastError = error
      console.error(`Email send attempt ${attempt} failed:`, error)
      
      // Check for specific error types (including 401 unauthorized)
      if ((error.message?.includes('domain') || error.message?.includes('invalid') || error.statusCode === 401) 
          && fallbackToTestDomain && attempt === maxRetries) {
        // Try with Resend's test domain as final attempt
        try {
          console.log('[Email Handler] Falling back to test domain due to error:', error.message)
          const fallbackResult = await resend.emails.send({
            from: EMAIL_CONFIG.fallbackFrom,
            replyTo: emailData.replyTo || EMAIL_CONFIG.replyTo,
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
          })
          
          return { 
            success: true, 
            data: fallbackResult.data, 
            attempt: attempt + 1,
            usedFallback: true 
          }
        } catch (fallbackError) {
          lastError = fallbackError
        }
      }
      
      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    }
  }
  
  // All attempts failed
  return { 
    success: false, 
    error: lastError, 
    attempts: maxRetries 
  }
}

export function getEmailErrorMessage(error: any): string {
  if (!error) return 'Unknown email error'
  
  // Resend-specific error messages
  if (error.message?.includes('domain')) {
    return 'Email domain verification issue. Please contact support.'
  }
  if (error.message?.includes('rate')) {
    return 'Too many email requests. Please try again later.'
  }
  if (error.message?.includes('invalid')) {
    return 'Invalid email address format.'
  }
  if (error.statusCode === 401) {
    return 'Email service configuration error. Please contact support.'
  }
  
  // Generic error
  return error.message || 'Failed to send email. Please try again.'
}