'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import { useSignIn } from '@clerk/nextjs'
import { toast } from '@/lib/toast-config'
import Link from 'next/link'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Logo from "@/components/Logo"

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { signIn, isLoaded, setActive } = useSignIn()
  
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [isLoading, setIsLoading] = useState(false)

  const [emailSent, setEmailSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isVerifyingToken, setIsVerifyingToken] = useState(false)
  const attemptedTokenRef = useRef<string | null>(null)
  
  const redirectUrl = searchParams.get('redirect_url') || '/welcome'
  const fromPayment = searchParams.get('from') === 'payment'
  const forceRedirectUrl = searchParams.get('force_redirect_url') || redirectUrl
  const signInToken = searchParams.get('token')
  const shouldAutoSignIn = searchParams.get('auto_signin') === 'true'

  const handleEmailLinkSignIn = async () => {
    if (!isLoaded || !signIn || !email) return

    setIsLoading(true)
    setErrors({})

    try {
      // Create a sign-in attempt with email link
      const result = await signIn.create({
        identifier: email,
      })

      // Send the email link
      const emailLinkFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_link'
      )
      
      if (!emailLinkFactor?.emailAddressId) {
        throw new Error('Email link authentication is not available for this account')
      }
      
      const emailLinkResult = await signIn.prepareFirstFactor({
        strategy: 'email_link',
        emailAddressId: emailLinkFactor.emailAddressId,
        redirectUrl: `${window.location.origin}/login/verify`,
      })

      setEmailSent(true)
      toast.success('Check your email for the sign-in link!')
      
      // Store the sign-in attempt ID for verification
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('clerk_sign_in_attempt', signIn.id || '')
      }
    } catch (error: any) {
      console.error('Email link error:', error)
      
      if (error.errors) {
        const firstError = error.errors[0]
        if (firstError.code === 'form_identifier_not_found') {
          setErrors({ email: 'No account found with this email address. Please sign up first.' })
        } else if (firstError.code === 'strategy_not_allowed') {
          toast.error('Email link sign-in is not enabled. Please use password sign-in.')
        } else {
          toast.error(firstError.message || 'Failed to send sign-in email')
        }
      } else {
        toast.error('Failed to send sign-in email. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle sign-in token from magic link
  useEffect(() => {
    // Only process if we haven't already attempted this token
    if (signInToken && isLoaded && signIn && !isVerifyingToken && attemptedTokenRef.current !== signInToken) {
      setIsVerifyingToken(true)
      attemptedTokenRef.current = signInToken
      
      const verifyToken = async () => {
        try {
          const result = await signIn.create({
            strategy: 'ticket',
            ticket: signInToken,
          })
          
          if (result.status === 'complete') {
            await setActive({ session: result.createdSessionId })
            toast.success('Successfully signed in!')
            router.push(forceRedirectUrl)
          }
        } catch (error: any) {
          console.error('Token verification error:', error)
          
          // Check if this is specifically a "token already used" error
          const errorMessage = error.errors?.[0]?.message || error.message || ''
          const errorCode = error.errors?.[0]?.code
          
          // Only silently handle truly expired/used tokens from email links
          if ((errorCode === 'verification_expired' || 
               errorCode === 'verification_failed' ||
               errorMessage.includes('already been used')) &&
              errorMessage.includes('ticket')) {
            // For already-used tokens, just clear URL and continue
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('token')
            router.replace(newUrl.pathname + newUrl.search)
          } else {
            // For other errors, show toast
            toast.error(error.errors?.[0]?.message || 'Failed to sign in')
          }
          
          setIsVerifyingToken(false)
        }
      }
      
      verifyToken()
    }
  }, [signInToken, isLoaded, signIn, isVerifyingToken, setActive, router, forceRedirectUrl])

  // Auto-trigger email sign-in if coming from payment
  useEffect(() => {
    if (shouldAutoSignIn && email && isLoaded && signIn && !isLoading && !emailSent) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        handleEmailLinkSignIn()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [shouldAutoSignIn, email, isLoaded, signIn])

  // Show loading state while verifying token
  if (isVerifyingToken) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-16 animate-spin text-primary" />
          <h2 className="text-xl font-bold">Verifying your sign-in link...</h2>
          <p className="text-center text-sm text-muted-foreground">
            Please wait while we sign you in.
          </p>
        </div>
      </div>
    )
  }

  if (emailSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2">
          <Mail className="size-16 text-primary" />
          <h2 className="text-xl font-bold">Check your email</h2>
          <p className="text-center text-sm text-muted-foreground">
            We've sent a sign-in link to<br />
            <strong>{email}</strong>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Didn't receive it? Check your spam folder or click below to go back.
          </p>
          <Button
            variant="outline"
            onClick={() => setEmailSent(false)}
            className="w-full mt-4"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={(e) => {
        e.preventDefault()
        handleEmailLinkSignIn()
      }}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-2 font-medium">
              <Logo size="medium" />
              <span className="sr-only">Cognition</span>
            </div>
            <h1 className="text-xl font-bold">Welcome back</h1>
            <p className="text-center text-sm text-muted-foreground">
              Sign in with the same email you paid with
            </p>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Having trouble? Contact support at{' '}
              <a href="mailto:support@cognition.cv" className="text-primary underline underline-offset-4">
                support@cognition.cv
              </a>
              {' '}and we're here to help
            </p>
            <div className="text-center text-sm mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/" className="underline underline-offset-4">
                Get started
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors({})
                }}
                required
                disabled={isLoading}
              />
              {errors.email && <span className="text-sm text-destructive">{errors.email}</span>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !email}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 size-4" />
                  Send sign-in link
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}