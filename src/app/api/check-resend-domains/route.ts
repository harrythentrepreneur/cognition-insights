import { NextResponse } from 'next/server'
import { getResendClient } from '@/lib/email/resend'

export async function GET() {
  try {
    const resend = getResendClient()
    
    // Try to list domains
    let domains
    try {
      domains = await resend.domains.list()
    } catch (e: any) {
      console.error('Failed to fetch domains:', e)
      domains = { data: [], error: e.message }
    }
    
    // Try to send a test email with each domain configuration
    const testResults = []
    
    // Test 1: Resend's test domain (should always work)
    try {
      const test1 = await resend.emails.send({
        from: 'Cognition <onboarding@resend.dev>',
        to: 'delivered@resend.dev',
        subject: 'Test 1: Resend Test Domain',
        html: '<p>Testing from onboarding@resend.dev</p>'
      })
      testResults.push({
        from: 'onboarding@resend.dev',
        success: !!test1.data?.id,
        emailId: test1.data?.id,
        error: test1.error
      })
    } catch (e: any) {
      testResults.push({
        from: 'onboarding@resend.dev',
        success: false,
        error: e.message
      })
    }
    
    // Test 2: Your custom domain
    try {
      const test2 = await resend.emails.send({
        from: 'Cognition <hello@cognition.cv>',
        to: 'delivered@resend.dev',
        subject: 'Test 2: Custom Domain',
        html: '<p>Testing from hello@cognition.cv</p>'
      })
      testResults.push({
        from: 'hello@cognition.cv',
        success: !!test2.data?.id,
        emailId: test2.data?.id,
        error: test2.error
      })
    } catch (e: any) {
      testResults.push({
        from: 'hello@cognition.cv',
        success: false,
        error: e.message
      })
    }
    
    return NextResponse.json({
      domains: domains.data || [],
      domainError: domains.error,
      testResults,
      recommendations: [
        'If hello@cognition.cv fails, the domain is not verified',
        'Use onboarding@resend.dev for immediate email delivery',
        'To verify cognition.cv:',
        '1. Go to https://resend.com/domains',
        '2. Add cognition.cv domain',
        '3. Add the DNS records to your domain provider',
        '4. Wait for verification (can take up to 48 hours)'
      ]
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}