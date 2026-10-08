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
import { GradientSpinner } from "@/components/ui/modern-spinner"
import { InlineError } from "@/components/ui/error-message"

export function LoginForm({
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
  const forceRedirectUrl = searchParams.get('force_redirect_url') || redirectUrl
  const signInToken = searchParams.get('token')
  const shouldAutoSignIn = searchParams.get('auto_signin') === 'true'

  const handleEmailLinkSignIn = async () => {
    if (!isLoaded || !signIn || !email) return

    setIsLoading(true)
    setErrors({})

    try {
      const result = await signIn.create({
        identifier: email,
      })

      const emailLinkFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_link'
      )
      
      if (!emailLinkFactor?.emailAddressId) {
        throw new Error('Email link authentication is not available for this account')
      }
      
      const prepareResult = await signIn.prepareFirstFactor({
        strategy: 'email_link',
        emailAddressId: emailLinkFactor.emailAddressId,
        redirectUrl: `${window.location.origin}/login/verify`,
      })
      
      console.log('Email link prepare result:', prepareResult)

      setEmailSent(true)
      toast.success('Email sent! Check your inbox.')
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('clerk_sign_in_attempt', signIn.id || '')
      }
    } catch (error: any) {
      console.error('Email link error:', error)
      
      if (error.errors) {
        const firstError = error.errors[0]
        if (firstError.code === 'form_identifier_not_found') {
          setErrors({ email: 'No account found with this email address. Please sign up or use the email associated with your payment.' })
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
          const errorMessage = error.errors?.[0]?.message || error.message || ''
          const errorCode = error.errors?.[0]?.code
          
          if ((errorCode === 'verification_expired' || 
               errorCode === 'verification_failed' ||
               errorMessage.includes('already been used'))) {
            toast.error('Link expired. Enter your email below to continue.')
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('token')
            router.replace(newUrl.pathname + newUrl.search)
          } else {
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
      const timer = setTimeout(() => {
        handleEmailLinkSignIn()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [shouldAutoSignIn, email, isLoaded, signIn])

  // Show loading state while verifying token
  if (isVerifyingToken) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-125" />
            <GradientSpinner size="lg" />
          </div>
          <div className="space-y-3 text-center">
            <h2 className="text-3xl font-bold font-satoshi">Signing you in</h2>
            <p className="text-base text-muted-foreground max-w-[280px]">
              Verifying your magic link...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (emailSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-start lg:items-center gap-2">
            <h1 className="text-4xl font-bold font-satoshi">Check your email</h1>
            <div className="text-left lg:text-center text-base mt-2">
              We've sent a sign-in link to
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Input
                type="email"
                value={email}
                readOnly
                className="text-center cursor-default"
              />
            </div>
            <p className="text-left lg:text-center text-base text-muted-foreground">
              Didn't receive it? Check your spam folder.
            </p>
            <Button
              variant="outline"
              onClick={() => setEmailSent(false)}
              className="w-full"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to sign in
            </Button>
          </div>
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
          <div className="flex flex-col items-start lg:items-center gap-2">
            <h1 className="text-5xl font-bold font-satoshi">Welcome back!</h1>
            <div className="text-left lg:text-center text-base">
              Don&apos;t have an account?{" "}
              <Link href="/" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="account@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors({})
                }}
                required
                disabled={isLoading}
                className="rounded-md"
              />
              {errors.email && <InlineError message={errors.email} />}
            </div>
            <Button 
              type="submit" 
              className={cn(
                "w-full rounded-md",
                (!email && !isLoading) && [
                  "disabled:opacity-100",
                  "disabled:bg-neutral-200", 
                  "disabled:text-neutral-600",
                  "disabled:border",
                  "disabled:border-neutral-300",
                  "hover:disabled:bg-neutral-200"
                ]
              )} 
              disabled={isLoading || !email}>
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
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          </div>
        </div>
      </form>
      <div className="text-left lg:text-center text-xs text-foreground/60 max-w-lg lg:mx-auto px-0 lg:px-4">
        By clicking continue, you agree to our{" "}
        <Link 
          href="/tos" 
          className="text-foreground/60 hover:text-foreground/80 transition-colors"
          style={{ textDecoration: 'underline', textDecorationColor: 'rgba(0, 0, 0, 0.2)', textUnderlineOffset: '4px' }}
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link 
          href="/privacy-policy" 
          className="text-foreground/60 hover:text-foreground/80 transition-colors"
          style={{ textDecoration: 'underline', textDecorationColor: 'rgba(0, 0, 0, 0.2)', textUnderlineOffset: '4px' }}
        >
          Privacy Policy
        </Link>
        . Need help? Contact us at{" "}
        <a 
          href="mailto:support@cognition.cv" 
          className="text-foreground/60 hover:text-foreground/80 transition-colors"
          style={{ textDecoration: 'underline', textDecorationColor: 'rgba(0, 0, 0, 0.2)', textUnderlineOffset: '4px' }}
        >
          support@cognition.cv
        </a>
        .
      </div>
    </div>
  )
}
