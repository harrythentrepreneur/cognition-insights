import { getResendClient, EMAIL_CONFIG } from '../resend'

export const welcomeEmailTemplate = {
  subject: 'Welcome to Cognition! 🌟',
  html: (firstName?: string, magicLinkUrl?: string) => `
    <div style="font-family: Arial, sans-serif; color: #000; font-size: 16px; line-height: 1.5;">
      <p>Hi ${firstName || 'there'},</p>
      
      <p>I'm Harry, founder of Cognition, and I wanted to personally welcome you to our community.</p>
      
      <p>You've just taken the first step toward understanding yourself in a completely new way. Your conversations hold incredible insights about who you are, how you've grown, and where you're heading.</p>
      
      <div style="margin: 30px 0;">
        <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 30px; background-color: rgb(48, 100, 255); color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Your Cognition Dashboard</a>
        <p style="margin-top: 10px; font-size: 14px; color: #666;">(Click the link above to complete your setup and begin exploring)</p>
      </div>
      
      <p>As you explore your emotional landscapes and life patterns, remember that this is your journey. Take your time. The insights waiting for you are worth it.</p>
      
      <p>One thing I'm proud of: your conversations never leave your browser. Everything processes locally on your device—we architected it so we literally can't see your data.</p>
      
      <p>You can verify this yourself in your browser's network tab, or read the technical details at <a href="https://cognition.cv/security" style="color: #007A7A;">cognition.cv/security</a>.</p>
      
      <p>If you have any questions or need support along the way, just reply to this email. Our team and I are here to help.</p>
      
      <p>Here's to discovering the beautiful truth hidden in your messages.</p>
      
      <p>
        Warm regards,<br><br>
        Harry<br>
        <em>Founder, Cognition</em><br><br>
        <span style="font-size: 14px; color: #666;">P.S. Save this email – if you ever get logged out, the link above brings you right back to your dashboard.</span>
      </p>
    </div>
  `,
  text: (firstName?: string, magicLinkUrl?: string) => `Welcome to Cognition! 🌟

Hi ${firstName || 'there'},

I'm Harry, founder of Cognition, and I wanted to personally welcome you to our community.

You've just taken the first step toward understanding yourself in a completely new way. Your conversations hold incredible insights about who you are, how you've grown, and where you're heading.

[Access Your Cognition Dashboard]
${magicLinkUrl}
(Click the link above to complete your setup and begin exploring)

As you explore your emotional landscapes and life patterns, remember that this is your journey. Take your time. The insights waiting for you are worth it.

One thing I'm proud of: your conversations never leave your browser. Everything processes locally on your device—we architected it so we literally can't see your data.

You can verify this yourself in your browser's network tab, or read the technical details at https://cognition.cv/security.

If you have any questions or need support along the way, just reply to this email. Our team and I are here to help.

Here's to discovering the beautiful truth hidden in your messages.

Warm regards,

Harry
Founder, Cognition

P.S. Save this email – if you ever get logged out, the link above brings you right back to your dashboard.`
}

export async function sendWelcomeEmail(email: string, firstName?: string, magicLinkUrl?: string) {
  try {
    const resend = getResendClient()
    
    console.log('[Welcome Template] Attempting to send email:', {
      from: EMAIL_CONFIG.from,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo
    })
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: email,
      subject: welcomeEmailTemplate.subject,
      html: welcomeEmailTemplate.html(firstName, magicLinkUrl),
      text: welcomeEmailTemplate.text(firstName, magicLinkUrl),
      replyTo: EMAIL_CONFIG.replyTo,
    })
    
    console.log('[Welcome Template] Direct Resend result:', result)
    
    return { success: true, data: result.data || result }
  } catch (error: any) {
    console.error('[Welcome Template] Failed to send welcome email:', error)
    
    // Try with fallback email if domain not verified
    if (error.message?.includes('domain') || error.message?.includes('verified')) {
      try {
        const resend = getResendClient()
        const fallbackResult = await resend.emails.send({
          from: EMAIL_CONFIG.fallbackFrom,
          to: email,
          subject: welcomeEmailTemplate.subject,
          html: welcomeEmailTemplate.html(firstName),
          text: welcomeEmailTemplate.text(firstName),
          replyTo: EMAIL_CONFIG.replyTo,
        })
        
        return { success: true, data: fallbackResult, usedFallback: true }
      } catch (fallbackError) {
        console.error('Failed to send with fallback email:', fallbackError)
        return { success: false, error: fallbackError }
      }
    }
    
    return { success: false, error }
  }
}