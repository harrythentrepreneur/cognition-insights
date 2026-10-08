import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { sendEmailWithRetry, getEmailErrorMessage } from '@/lib/email/error-handler'

export async function POST(req: Request) {
  console.log('[Welcome Email] Endpoint called')
  
  try {
    const { userId, email, firstName } = await req.json()
    console.log('[Welcome Email] Request data:', { userId, email, firstName })
    
    if (!userId || !email) {
      console.error('[Welcome Email] Missing required fields:', { userId, email })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const clerk = await clerkClient()
    
    // Create a magic link for future logins
    const magicLinkToken = await clerk.signInTokens.createSignInToken({
      userId: userId,
      expiresInSeconds: 30 * 24 * 60 * 60, // 30 days
    })
    
    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?token=${magicLinkToken.token}`
    
    console.log('[Welcome Email] Sending email to:', email)
    console.log('[Welcome Email] Magic link URL:', magicLinkUrl)
    
    // Send email via Resend with retry logic
    const emailResult = await sendEmailWithRetry({
      to: [email],
      subject: 'Welcome to Cognition! 🌟',
      html: `
        <div style="font-family: Arial, sans-serif; color: #000; font-size: 16px; line-height: 1.5;">
          <p>Hi ${firstName || 'there'},</p>
          
          <p>I'm Harry, founder of Cognition, and I wanted to personally welcome you to our community.</p>
          
          <p>You've just taken the first step toward understanding yourself in a completely new way. Your conversations hold incredible insights about who you are, how you've grown, and where you're heading – and Cognition is here to help you discover them.</p>
          
          <p>As you explore your emotional landscapes and life patterns, remember that this is your journey. Take your time. The insights waiting for you are worth it.</p>
          
          <p>Your conversations never touch our servers. Everything processes locally on your device—we architected it so we architecturally can't see your data. You can verify this yourself in your browser's network tab, or read the technical details at <a href="https://cognition.cv/security" style="color: #007A7A;">cognition.cv/security</a>.</p>
          
          <p>If you have any questions or need support along the way, just reply to this email. Our team and I are here to help.</p>
          
          <p>Here's to discovering the beautiful truth hidden in your messages.</p>
          
          <p>
            Warm regards,<br><br>
            Harry<br>
            <em>Founder, Cognition</em><br><br>
            <span style="font-size: 14px; color: #666;">P.S. If you ever get logged out, <a href="${magicLinkUrl}" style="color: #007A7A;">this link</a> brings you right back.</span>
          </p>
        </div>
      `,
    })
    
    console.log('[Welcome Email] Email send result:', emailResult)
    
    if (!emailResult.success) {
      console.error('[Welcome Email] Failed to send email after retries:', emailResult.error)
      console.error('[Welcome Email] Error details:', JSON.stringify(emailResult.error, null, 2))
      
      // Still mark attempt in user metadata for tracking
      await clerk.users.updateUser(userId, {
        privateMetadata: {
          ...((await clerk.users.getUser(userId)).privateMetadata || {}),
          welcomeEmailFailed: true,
          welcomeEmailError: getEmailErrorMessage(emailResult.error),
          welcomeEmailAttemptedAt: new Date().toISOString(),
        }
      })
      
      return NextResponse.json(
        { 
          error: getEmailErrorMessage(emailResult.error),
          supportMessage: 'You can still access your account. Contact support@cognition.cv if you need help signing in from another device.',
          // In development, still return the magic link
          ...(process.env.NODE_ENV === 'development' && { magicLinkUrl })
        },
        { status: 500 }
      )
    }
    
    // Mark the email as sent in user metadata
    await clerk.users.updateUser(userId, {
      privateMetadata: {
        ...((await clerk.users.getUser(userId)).privateMetadata || {}),
        welcomeEmailSent: true,
        welcomeEmailSentAt: new Date().toISOString(),
        resendEmailId: emailResult.data?.id,
        emailSentWithFallback: emailResult.usedFallback || false,
      }
    })
    
    console.log('[Welcome Email] Success! Email ID:', emailResult.data?.id)
    
    return NextResponse.json({ 
      success: true,
      message: 'Welcome email sent successfully',
      emailId: emailResult.data?.id,
      attempts: emailResult.attempt,
      resendDashboard: emailResult.data?.id ? `https://resend.com/emails/${emailResult.data.id}` : null,
      // In development, also return the magic link for testing
      ...(process.env.NODE_ENV === 'development' && { magicLinkUrl })
    })
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { error: error.message || 'Error sending welcome email' },
      { status: 500 }
    )
  }
}