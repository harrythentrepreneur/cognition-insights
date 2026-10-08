'use client'

import { useEffect, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser, useSignIn, useClerk } from '@clerk/nextjs'
import { CheckCircle, Loader2 } from 'lucide-react'
import { trackContact } from '@/lib/tracking/triple-whale'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const isNewUser = searchParams.get('new_user') === 'true'
  const { user, isLoaded: userLoaded } = useUser()
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { setActive } = useClerk()
  const [isProcessing, setIsProcessing] = useState(true)
  const [statusMessage, setStatusMessage] = useState('Confirming payment...')
  const [hasProcessed, setHasProcessed] = useState(false)

  useEffect(() => {
    async function handlePostPayment() {
      if (!sessionId || !userLoaded || !signInLoaded) return
      
      // Prevent duplicate processing
      if (hasProcessed) return
      
      setHasProcessed(true)

      try {
        // Step 1: Confirm payment
        setStatusMessage('Confirming payment...')
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          throw new Error('Failed to confirm payment')
        }

        const data = await response.json()
        
        // Track contact info after successful payment
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || data.email;
        if (userEmail) {
          trackContact(userEmail);
        }
        
        // Track Facebook Pixel Purchase event
        if (window.fbq && sessionId) {
          // Use session ID as base for event ID (consistent with server-side)
          const eventId = 'purchase_' + sessionId;
          
          // Get Facebook cookies
          const cookies = document.cookie.split(';');
          let fbc = null;
          let fbp = null;
          
          cookies.forEach(function(cookie) {
            const parts = cookie.trim().split('=');
            if (parts[0] === '_fbc') fbc = parts[1];
            if (parts[0] === '_fbp') fbp = parts[1];
          });
          
          // Store for potential debugging
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('fb_purchase_event_id', eventId);
            if (fbc) sessionStorage.setItem('fb_fbc', fbc);
            if (fbp) sessionStorage.setItem('fb_fbp', fbp);
          }
          
          window.fbq('track', 'Purchase', {
            content_name: 'Cognition Lifetime Access',
            content_category: 'Lifetime Access',
            content_ids: ['cognition-lifetime'],
            content_type: 'product',
            value: 79.00,
            currency: 'USD',
            num_items: 1,
            order_id: sessionId // Add order ID
          }, {
            eventID: eventId // Pass event ID for deduplication
          });
          console.log('[Facebook Pixel] Purchase tracked with event_id:', eventId);
        }
        
        // Track Google Ads Purchase conversion
        if (window.gtag) {
          window.gtag('event', 'conversion', {
            'send_to': 'AW-XXXXXXXXXX/your-conversion-label',
            'value': 79.0,
            'currency': 'USD',
            'transaction_id': sessionId || ''
          });
          console.log('[Google Ads] Purchase conversion tracked');
        }
        
        // Track Pinterest Checkout event (represents purchase completion)
        if (window.pintrk && sessionId) {
          // Use Stripe session ID as the event ID for consistent deduplication
          const eventId = 'checkout_stripe_' + sessionId;
          
          const checkoutData = {
            event_id: eventId,
            value: 79.00,
            order_quantity: 1,
            currency: 'USD',
            order_id: sessionId // Also include as order_id for additional tracking
          };
          
          // Store for potential server-side deduplication
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pinterest_checkout_event_id', eventId);
            sessionStorage.setItem('pinterest_checkout_session_id', sessionId);
          }
          
          // Add email for Enhanced Match if available
          if (userEmail) {
            window.pintrk('track', 'checkout', { ...checkoutData, em: userEmail });
          } else {
            window.pintrk('track', 'checkout', checkoutData);
          }
          console.log('[Pinterest Tag] Checkout (Purchase) tracked with event_id:', eventId);
        }
        
        // Track Reddit Pixel Purchase event with deduplication
        if (window.rdt && sessionId) {
          // Use the same conversion ID format as server-side for deduplication
          const conversionId = 'purchase_stripe_' + sessionId;
          
          // Store conversion ID for server-side deduplication
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('reddit_purchase_conversion_id', conversionId);
            sessionStorage.setItem('reddit_purchase_session_id', sessionId);
          }
          
          window.rdt('track', 'Purchase', {
            conversion_id: conversionId,
            currency: 'USD',
            value: 79.00,
            itemCount: 1,
            transactionId: sessionId,
            products: [{
              id: 'cognition-lifetime',
              name: 'Cognition Lifetime Access',
              category: 'Lifetime Access'
            }]
          });
          console.log('[Reddit Pixel] Purchase tracked with conversion_id:', conversionId);
        }
        
        // Track Snapchat Pixel PURCHASE event
        if (window.snaptr && sessionId) {
          // Hash email if available for Snapchat
          let hashedEmail = null;
          if (userEmail) {
            try {
              // Simple SHA256 hashing for email
              hashedEmail = userEmail; // In production, use proper SHA256 hashing
            } catch (e) {
              console.error('Error hashing email for Snapchat:', e);
            }
          }
          
          window.snaptr('track', 'PURCHASE', {
            price: 79.00,
            currency: 'USD',
            transaction_id: sessionId,
            item_ids: ['cognition-lifetime'],
            item_category: 'Lifetime Access',
            number_items: 1,
            ...(userEmail && { user_email: userEmail }),
            ...(hashedEmail && { user_hashed_email: hashedEmail }),
            ...(data.firstName && { firstname: data.firstName })
          });
          console.log('[Snapchat Pixel] PURCHASE tracked');
        }
        
        // Store session ID for purchase tracking on welcome page
        if (sessionId && typeof window !== 'undefined') {
          sessionStorage.setItem('stripe_checkout_session', sessionId);
        }
        
        // Step 2: Handle post-payment redirect
        if (user) {
          // User is already authenticated (either existing user or new user already signed in)
          setStatusMessage('Success! Redirecting...')
          await user.reload()
          // Force a hard redirect to ensure middleware picks up the updated user state
          window.location.href = '/welcome'
        } else if (isNewUser) {
          // New user who needs to sign in
          const pendingSignIn = sessionStorage.getItem('pendingSignIn')
          
          if (pendingSignIn) {
            try {
              setStatusMessage('Signing you in...')
              const { email, password } = JSON.parse(pendingSignIn)
              
              // Check if we're already signed in (can happen with browser back/forward)
              if (signIn.status === 'complete') {
                sessionStorage.removeItem('pendingSignIn')
                setStatusMessage('Success! Redirecting...')
                window.location.href = '/welcome'
                return
              }
              
              // Sign in the user
              const result = await signIn.create({
                identifier: email,
                password: password,
              })

              if (result.status === 'complete') {
                // Set the active session
                await setActive({ session: result.createdSessionId })
                
                // Clear stored credentials
                sessionStorage.removeItem('pendingSignIn')
                setStatusMessage('Success! Redirecting...')
                
                // Force a hard redirect to ensure auth state is refreshed
                window.location.href = '/welcome'
                return
              } else {
                throw new Error('Sign in incomplete')
              }
            } catch (signInError: any) {
              console.error('Auto sign-in failed:', signInError)
              
              // If already signed in, just redirect
              if (signInError?.errors?.[0]?.code === 'session_exists' || 
                  signInError?.message?.includes('already signed in')) {
                sessionStorage.removeItem('pendingSignIn')
                setStatusMessage('Success! Redirecting...')
                window.location.href = '/welcome'
                return
              }
              
              // Fall back to welcome with auth step
              sessionStorage.removeItem('pendingSignIn')
              const params = new URLSearchParams({
                step: 'auth',
                payment_verified: 'true',
                stripe_session: sessionId,
              })
              if (data.email) {
                params.append('email', data.email)
              }
              router.push(`/welcome?${params.toString()}`)
            }
          } else {
            // No stored credentials, redirect to welcome with auth step
            const params = new URLSearchParams({
              step: 'auth',
              payment_verified: 'true',
              stripe_session: sessionId,
            })
            if (data.email) {
              params.append('email', data.email)
            }
            router.push(`/welcome?${params.toString()}`)
          }
        } else if (data.needsSignIn) {
          // Legacy flow - redirect to welcome with auth step
          const params = new URLSearchParams({
            step: 'auth',
            payment_verified: 'true',
            stripe_session: sessionId,
          })
          if (data.email) {
            params.append('email', data.email)
          }
          router.push(`/welcome?${params.toString()}`)
        }
      } catch (error) {
        console.error('Error in post-payment process:', error)
        setStatusMessage('Redirecting...')
        setTimeout(() => {
          router.push('/welcome')
        }, 3000)
      } finally {
        setIsProcessing(false)
      }
    }

    handlePostPayment()
  }, [sessionId, user, userLoaded, signInLoaded, isNewUser, signIn, router, hasProcessed, setActive])

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      width: '100%',
    },
    successCard: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04), 0 12px 24px rgba(0, 0, 0, 0.04)',
      padding: '48px',
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center' as const,
    },
    iconContainer: {
      width: '64px',
      height: '64px',
      margin: '0 auto',
      backgroundColor: '#10b981',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'scaleIn 0.3s ease-out',
    },
    checkIcon: {
      width: '32px',
      height: '32px',
      color: '#fff',
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#0f172a',
      marginTop: '24px',
      marginBottom: '8px',
    },
    description: {
      fontSize: '14px',
      color: '#64748b',
      lineHeight: '20px',
      marginBottom: '24px',
    },
    loader: {
      width: '100%',
      height: '4px',
      backgroundColor: '#e2e8f0',
      borderRadius: '2px',
      overflow: 'hidden',
    },
    loaderBar: {
      height: '100%',
      backgroundColor: '#6366f1',
      animation: 'loadProgress 2s ease-out',
    },
  }

  return (
    <>
      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes loadProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
      
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.successCard}>
            <div style={styles.iconContainer}>
              <CheckCircle style={styles.checkIcon} />
            </div>
            <h2 style={styles.title}>
              {isProcessing ? statusMessage : 'Payment Successful!'}
            </h2>
            <p style={styles.description}>
              {isProcessing 
                ? 'Please wait while we set up your account...'
                : 'Your lifetime access is now active. Get ready to discover your insights!'
              }
            </p>
            {isProcessing ? (
              <Loader2 className="animate-spin mx-auto" size={24} style={{ color: '#6366f1' }} />
            ) : (
              <div style={styles.loader}>
                <div style={styles.loaderBar}></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}