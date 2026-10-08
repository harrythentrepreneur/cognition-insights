'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModernSpinner, DotSpinner, GradientSpinner } from '@/components/ui/modern-spinner'
import { LoginForm } from '@/components/login-form'

export default function TestLoadingPage() {
  const [activeState, setActiveState] = useState<'loading' | 'success' | 'error'>('loading')
  const [spinnerType, setSpinnerType] = useState<'modern' | 'dots' | 'gradient'>('gradient')

  // Loading component from login-form.tsx
  const LoginFormLoading = () => (
    <div className="flex flex-col items-center gap-8 animate-fadeIn">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-125" />
        {spinnerType === 'modern' && <ModernSpinner size="lg" />}
        {spinnerType === 'dots' && <DotSpinner size="lg" />}
        {spinnerType === 'gradient' && <GradientSpinner size="lg" />}
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold font-satoshi">Signing you in</h2>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          Verifying your magic link...
        </p>
      </div>
    </div>
  )

  // Verify page loading state
  const VerifyPageLoading = () => (
    <div className="flex flex-col items-center gap-8 animate-fadeIn">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse scale-125" />
        {spinnerType === 'modern' && <ModernSpinner size="lg" />}
        {spinnerType === 'dots' && <DotSpinner size="lg" />}
        {spinnerType === 'gradient' && <GradientSpinner size="lg" />}
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold font-satoshi">Verifying your email</h1>
        <p className="text-sm text-muted-foreground">
          Please wait while we sign you in...
        </p>
      </div>
    </div>
  )

  // Success state
  const SuccessState = () => (
    <div className="flex flex-col items-center gap-6 animate-fadeIn">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl" />
        <CheckCircle className="relative size-12 text-green-500" strokeWidth={2.5} />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold font-satoshi">Success!</h1>
        <p className="text-sm text-muted-foreground">
          You've been successfully signed in. Redirecting...
        </p>
      </div>
    </div>
  )

  // Error state
  const ErrorState = () => (
    <div className="flex flex-col items-center gap-6 animate-fadeIn">
      <div className="relative">
        <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl" />
        <XCircle className="relative size-12 text-destructive" strokeWidth={2.5} />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold font-satoshi">Verification Failed</h1>
        <p className="text-sm text-destructive">The verification link has expired or is invalid.</p>
        <p className="text-sm text-muted-foreground mt-4">
          Redirecting to sign in page...
        </p>
      </div>
      <Button variant="outline" className="mt-4">
        Back to Sign In
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold font-satoshi">Loading States Preview</h1>
          <p className="text-muted-foreground">Test the different loading states and spinner styles for the magic link sign-in flow</p>
        </div>

        {/* Spinner type switcher */}
        <div className="flex justify-center gap-4 pb-4 border-b">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">Spinner Style:</p>
            <div className="flex gap-2">
              <Button 
                size="sm"
                variant={spinnerType === 'modern' ? 'default' : 'outline'}
                onClick={() => setSpinnerType('modern')}
              >
                Modern Ring
              </Button>
              <Button 
                size="sm"
                variant={spinnerType === 'dots' ? 'default' : 'outline'}
                onClick={() => setSpinnerType('dots')}
              >
                Dots
              </Button>
              <Button 
                size="sm"
                variant={spinnerType === 'gradient' ? 'default' : 'outline'}
                onClick={() => setSpinnerType('gradient')}
              >
                Gradient
              </Button>
            </div>
          </div>
        </div>

        {/* State switcher */}
        <div className="flex justify-center gap-4">
          <Button 
            variant={activeState === 'loading' ? 'default' : 'outline'}
            onClick={() => setActiveState('loading')}
          >
            Loading State
          </Button>
          <Button 
            variant={activeState === 'success' ? 'default' : 'outline'}
            onClick={() => setActiveState('success')}
            className="text-green-500 hover:text-green-500"
          >
            Success State
          </Button>
          <Button 
            variant={activeState === 'error' ? 'default' : 'outline'}
            onClick={() => setActiveState('error')}
            className="text-destructive hover:text-destructive"
          >
            Error State
          </Button>
        </div>

        {/* Spinner showcase (only show when loading) */}
        {activeState === 'loading' && (
          <div className="grid md:grid-cols-3 gap-8 p-8 bg-card/50 rounded-lg border">
            <div className="text-center space-y-4">
              <h3 className="font-semibold">Small</h3>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
                  {spinnerType === 'modern' && <ModernSpinner size="sm" />}
                  {spinnerType === 'dots' && <DotSpinner size="sm" />}
                  {spinnerType === 'gradient' && <GradientSpinner size="sm" />}
                </div>
              </div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="font-semibold">Medium</h3>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
                  {spinnerType === 'modern' && <ModernSpinner size="md" />}
                  {spinnerType === 'dots' && <DotSpinner size="md" />}
                  {spinnerType === 'gradient' && <GradientSpinner size="md" />}
                </div>
              </div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="font-semibold">Large</h3>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-125" />
                  {spinnerType === 'modern' && <ModernSpinner size="lg" />}
                  {spinnerType === 'dots' && <DotSpinner size="lg" />}
                  {spinnerType === 'gradient' && <GradientSpinner size="lg" />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Login Form Loading */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Login Form Loading State</h2>
            <div className="bg-card border rounded-lg p-8">
              <div key={activeState}>
                {activeState === 'loading' && <LoginFormLoading />}
                {activeState === 'success' && <SuccessState />}
                {activeState === 'error' && <ErrorState />}
              </div>
            </div>
          </div>

          {/* Verify Page */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Verify Page</h2>
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-12 shadow-2xl">
              <div key={activeState}>
                {activeState === 'loading' && <VerifyPageLoading />}
                {activeState === 'success' && <SuccessState />}
                {activeState === 'error' && <ErrorState />}
              </div>
            </div>
          </div>
        </div>

        {/* Full page preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Full Page Preview (Verify Page)</h2>
          <div className="relative h-[600px] bg-background rounded-lg border overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-12 shadow-2xl">
                  <div key={activeState}>
                    {activeState === 'loading' && <VerifyPageLoading />}
                    {activeState === 'success' && <SuccessState />}
                    {activeState === 'error' && <ErrorState />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}