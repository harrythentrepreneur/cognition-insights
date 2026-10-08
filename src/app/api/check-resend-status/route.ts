import { NextResponse } from 'next/server'
import { getResendClient } from '@/lib/email/resend'

export async function GET() {
  try {
    const resend = getResendClient()
    
    // Try to get domains to check API key permissions
    let domains, apiKeys
    try {
      domains = await resend.domains.list()
    } catch (e: any) {
      console.log('Failed to fetch domains:', e.message)
    }
    
    // Check if we can send a test email
    const testResult = await resend.emails.send({
      from: 'onboarding@resend.dev', // Always allowed test domain
      to: 'delivered@resend.dev', // Test recipient
      subject: 'Cognition - API Key Test',
      html: '<p>Testing Resend API key status</p>'
    })
    
    return NextResponse.json({
      status: 'API Key is valid',
      apiKeyInfo: {
        configured: !!process.env.RESEND_API_KEY,
        length: process.env.RESEND_API_KEY?.length || 0,
        prefix: process.env.RESEND_API_KEY?.substring(0, 10) || 'not-set',
        isTestKey: process.env.RESEND_API_KEY?.startsWith('re_') && process.env.RESEND_API_KEY?.includes('_test_'),
      },
      testEmail: {
        success: !!testResult.data?.id,
        emailId: testResult.data?.id || null,
        error: testResult.error || null
      },
      domains: domains?.data || 'Unable to fetch (likely test key)',
      instructions: [
        'If emailId is null, the API key might be in test mode',
        'Test mode keys start with "re_" and contain "_test_"',
        'Production keys start with "re_" without "_test_"',
        'To send real emails, you need:',
        '1. A production API key from https://resend.com/api-keys',
        '2. A verified domain in Resend dashboard',
        '3. Or use the fallback domain (onboarding@resend.dev) for testing'
      ]
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      details: error,
      suggestion: 'Check if your API key is valid at https://resend.com/api-keys'
    }, { status: 500 })
  }
}