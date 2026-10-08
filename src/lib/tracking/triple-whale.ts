/**
 * Triple Whale tracking utility for Cognition
 * Handles all tracking events for the lifetime access product
 */

interface TriplePixelWindow extends Window {
  TriplePixel?: (event: string, data: any) => void;
}

/**
 * Track when user commits to purchasing lifetime access
 * Called when user clicks "Continue to payment" on subscription page
 */
export const trackAddToCart = () => {
  if (typeof window !== 'undefined') {
    const win = window as TriplePixelWindow;
    if (win.TriplePixel) {
      win.TriplePixel('AddToCart', {
        item: 'cognition-lifetime-access',
        q: 1,
        v: 'lifetime-79' // variant: lifetime access at $79
      });
      console.log('[Triple Whale] AddToCart tracked: Lifetime Access');
    }
  }
};

/**
 * Track contact information when we have user email
 * Called after successful payment and during magic link logins
 */
export const trackContact = (email: string, phone?: string) => {
  if (typeof window !== 'undefined' && email) {
    const win = window as TriplePixelWindow;
    if (win.TriplePixel) {
      const data: any = { email };
      if (phone) {
        data.phone = phone;
      }
      
      // Use the recommended self-executing function pattern for reliability
      (function TP() {
        if (!win.TriplePixel) {
          setTimeout(TP, 400);
          return;
        }
        win.TriplePixel!('Contact', data);
        console.log('[Triple Whale] Contact tracked:', email);
      })();
    }
  }
};

/**
 * Track completed purchase
 * Called after payment is confirmed on success page
 */
export const trackPurchase = (sessionId: string, email: string) => {
  if (typeof window !== 'undefined') {
    const win = window as TriplePixelWindow;
    if (win.TriplePixel) {
      win.TriplePixel('Purchase', {
        orderId: sessionId,
        amount: 79.00,
        currency: 'USD',
        items: [{
          id: 'cognition-lifetime-access',
          quantity: 1,
          price: 79.00
        }]
      });
      console.log('[Triple Whale] Purchase tracked:', sessionId);
      
      // Also track contact with purchase to ensure attribution
      trackContact(email);
    }
  }
};

/**
 * Check if Triple Whale is loaded and ready
 */
export const isTripleWhaleReady = (): boolean => {
  if (typeof window !== 'undefined') {
    const win = window as TriplePixelWindow;
    return !!win.TriplePixel;
  }
  return false;
};