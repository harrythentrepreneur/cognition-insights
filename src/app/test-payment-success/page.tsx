'use client'

import { useState } from 'react'
import { GradientSpinner } from '@/components/ui/modern-spinner'
import { Button } from '@/components/ui/button'

export default function TestPaymentSuccessPage() {
  const [showLoading, setShowLoading] = useState(true)

  return (
    <>
      {/* Control buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button 
          size="sm"
          variant={showLoading ? 'default' : 'outline'}
          onClick={() => setShowLoading(true)}
        >
          Show Loading
        </Button>
        <Button 
          size="sm"
          variant={!showLoading ? 'default' : 'outline'}
          onClick={() => setShowLoading(false)}
        >
          Hide Loading
        </Button>
      </div>

      {/* Loading screen preview */}
      {showLoading && (
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
      )}

      {/* Info when loading is hidden */}
      {!showLoading && (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Payment Success Loading Screen Test</h1>
            <p className="text-muted-foreground">Click "Show Loading" to preview the loading screen</p>
            <div className="mt-8 p-6 border rounded-lg max-w-md mx-auto text-left space-y-2">
              <p className="font-semibold">This loading screen appears when:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>User completes payment successfully</li>
                <li>System is creating their account</li>
                <li>Automatic sign-in is in progress</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}