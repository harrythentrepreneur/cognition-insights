'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSignIn, useClerk } from '@clerk/nextjs'
import { GradientSpinner } from '@/components/ui/modern-spinner'


// Error types for better handling
const ErrorType = {
  NETWORK: 'NETWORK',
  INVALID_SESSION: 'INVALID_SESSION',
  TICKET_EXPIRED: 'TICKET_EXPIRED',
  UNKNOWN: 'UNKNOWN'
} as const

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { signIn, setActive, isLoaded } = useSignIn()
  const [attempt, setAttempt] = useState(0)
  const attemptedRef = useRef(false)

  useEffect(() => {
    // Guards
    if (!isLoaded || attemptedRef.current) return
    
    if (!sessionId) {
      router.push('/')
      return
    }

    const processPayment = async () => {
      attemptedRef.current = true
      setAttempt(prev => prev + 1)
      
      try {
        // Step 1: Create/update user with timeout
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout for production
        
        const response = await fetch('/api/create-user-after-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          signal: controller.signal
        })
        
        clearTimeout(timeout)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        const { signInTicket, email } = data
        
        if (!signInTicket) {
          throw new Error('No sign-in ticket received')
        }

        // Step 2: Sign in with ticket (with verification)
        const result = await signIn.create({
          strategy: "ticket",
          ticket: signInTicket,
        })
        
        if (result.status !== "complete") {
          throw new Error('Sign-in incomplete')
        }

        // Step 3: Activate session with verification
        await setActive({ session: result.createdSessionId })
        
        // Step 4: Quick verification that session is active
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Step 5: Use window.location for most reliable redirect
        window.location.href = '/welcome'
        
      } catch (error: any) {
        console.error('[Payment Success] Error:', error)
        console.error('[Payment Success] Error stack:', error.stack)
        console.error('[Payment Success] Session ID:', sessionId)
        console.error('[Payment Success] Attempt:', attempt)
        
        // Categorize error
        const errorType = categorizeError(error)
        console.error('[Payment Success] Error type:', errorType)
        
        // Handle based on error type
        switch (errorType) {
          case ErrorType.NETWORK:
            if (attempt < 2) {
              // Network error - retry once quickly
              console.log('[Payment Success] Retrying after network error...')
              setTimeout(() => {
                attemptedRef.current = false
                setAttempt(prev => prev + 1)
              }, 1000)
            } else {
              // After retry, go to sign-in

              console.log('[Payment Success] Max retries reached, redirecting to sign-in')
              router.push('/login')
            }
            break
            
          case ErrorType.TICKET_EXPIRED:
          case ErrorType.INVALID_SESSION:
            // These are unrecoverable - go to sign-in

            console.log('[Payment Success] Unrecoverable error, redirecting to sign-in')
            router.push('/login')

            break
            
          default:
            // Unknown error - go to sign-in

            console.log('[Payment Success] Unknown error, redirecting to sign-in')
            router.push('/login')
        }
      }
    }

    processPayment()
  }, [sessionId, router, signIn, setActive, isLoaded, attempt])

  // Helper to categorize errors
  function categorizeError(error: any): string {
    if (error.name === 'AbortError' || error.message?.includes('fetch')) {
      return ErrorType.NETWORK
    }
    if (error.message?.includes('ticket') || error.message?.includes('expired')) {
      return ErrorType.TICKET_EXPIRED
    }
    if (error.message?.includes('session')) {
      return ErrorType.INVALID_SESSION
    }
    return ErrorType.UNKNOWN
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-125" />
          <GradientSpinner size="lg" />
        </div>
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold font-satoshi">Setting up your account</h1>
          <p className="text-base text-muted-foreground">
            You'll be redirected in just a moment...
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-125" />
            <GradientSpinner size="lg" />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold font-satoshi">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}