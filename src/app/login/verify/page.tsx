'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import { CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GradientSpinner } from '@/components/ui/modern-spinner'
import { trackContact } from '@/lib/tracking/triple-whale'

export default function EmailVerificationPage() {
  const router = useRouter()
  const { handleEmailLinkVerification } = useClerk()
  const { user } = useUser()
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false)
  const [hasTrackedContact, setHasTrackedContact] = useState(false)

  useEffect(() => {
    // Only attempt verification once to prevent infinite loops
    if (hasAttemptedVerification) {
      return
    }

    async function verify() {
      setHasAttemptedVerification(true)
      
      try {
        // Clerk automatically handles the email link verification
        // when the user lands on this page with the proper params
        const verified = await handleEmailLinkVerification({
          redirectUrl: '/welcome',
          redirectUrlComplete: '/welcome',
        })

        if (verified) {
          setVerificationStatus('success')
          
          // Track contact for returning users signing in with magic link
          if (user?.emailAddresses?.[0]?.emailAddress) {
            trackContact(user.emailAddresses[0].emailAddress);
          }
          
          // Redirect happens automatically via Clerk
        }
      } catch (error: any) {
        console.error('Email verification error:', error)
        
        // Check if this is specifically a "token already used" error
        const errorMessage = error.errors?.[0]?.message || error.message || ''
        const errorCode = error.errors?.[0]?.code
        
        if (errorCode === 'verification_expired' || 
            errorCode === 'verification_failed' ||
            errorMessage.includes('already been used') ||
            errorMessage.includes('Invalid ticket')) {
          // For already-used tokens, silently redirect
          router.push('/login')
        } else {
          // For other errors (like signup flow), show error and let Clerk handle it
          setVerificationStatus('error')
          setErrorMessage(
            error.errors?.[0]?.message || 
            error.message || 
            'Failed to verify email link.'
          )
        }
      }
    }

    verify()
  }, [hasAttemptedVerification, handleEmailLinkVerification, router])

  // Track contact once user data is available after successful verification
  useEffect(() => {
    if (verificationStatus === 'success' && user?.emailAddresses?.[0]?.emailAddress && !hasTrackedContact) {
      trackContact(user.emailAddresses[0].emailAddress);
      setHasTrackedContact(true);
    }
  }, [verificationStatus, user, hasTrackedContact])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-12 shadow-2xl">
          {verificationStatus === 'loading' && (
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-125" />
                <GradientSpinner size="lg" />
              </div>
              <div className="space-y-3 text-center">
                <h1 className="text-3xl font-bold font-satoshi">Verifying your email</h1>
                <p className="text-base text-muted-foreground">
                  Please wait while we sign you in...
                </p>
              </div>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl" />
                <CheckCircle className="relative size-12 text-green-500" strokeWidth={2.5} />
              </div>
              <div className="space-y-3 text-center">
                <h1 className="text-3xl font-bold font-satoshi">Success!</h1>
                <p className="text-base text-muted-foreground">
                  You've been successfully signed in. Redirecting...
                </p>
              </div>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl" />
                <XCircle className="relative size-12 text-destructive" strokeWidth={2.5} />
              </div>
              <div className="space-y-3 text-center">
                <h1 className="text-3xl font-bold font-satoshi">Verification Failed</h1>
                <p className="text-base text-destructive">{errorMessage}</p>
                <p className="text-base text-muted-foreground mt-4">
                  Redirecting to sign in page...
                </p>
              </div>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}