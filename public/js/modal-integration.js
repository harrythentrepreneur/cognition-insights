// Modal Integration Script
// This script adds event listeners for the Discover button to open the modal

(function() {
  'use strict';

  // Wait for DOM to be ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // Setup Discover button clicks
  function setupDiscoverButtons() {
    // Find the "Discover My Hidden Patterns Now" button
    const discoverLinks = document.querySelectorAll('a[href="https://framer.link/sbOJsNi"]');
    
    discoverLinks.forEach(link => {
      // Check if this contains the Discover text
      const textContent = link.textContent || link.innerText || '';
      if (textContent.toLowerCase().includes('discover') && textContent.includes('hidden patterns')) {
        // Override the click behavior
        link.addEventListener('click', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Track AddToCart event when user initiates checkout
          if (window.TriplePixel) {
            window.TriplePixel('AddToCart', {
              item: 'cognition-lifetime-access',
              q: 1,
              v: 'lifetime-79'
            });
            console.log('[Triple Whale] AddToCart tracked: User clicked Discover button');
          }
          
          // Track Facebook Pixel InitiateCheckout event
          if (window.fbq) {
            // Generate event ID for deduplication
            const timestamp = Date.now();
            const eventId = 'initiate_checkout_' + timestamp;
            
            // Store for server-side deduplication
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('fb_initiate_checkout_event_id', eventId);
              sessionStorage.setItem('fb_initiate_checkout_timestamp', timestamp.toString());
              
              // Store Facebook cookies
              const cookies = document.cookie.split(';');
              let fbc = null;
              let fbp = null;
              
              cookies.forEach(function(cookie) {
                const parts = cookie.trim().split('=');
                if (parts[0] === '_fbc') fbc = parts[1];
                if (parts[0] === '_fbp') fbp = parts[1];
              });
              
              if (fbc) sessionStorage.setItem('fb_fbc', fbc);
              if (fbp) sessionStorage.setItem('fb_fbp', fbp);
            }
            
            window.fbq('track', 'InitiateCheckout', {
              content_name: 'Cognition Lifetime Access',
              content_category: 'Lifetime Access',
              content_ids: ['cognition-lifetime'],
              content_type: 'product',
              currency: 'USD',
              num_items: 1,
              value: 79.00 // Add value for better tracking
            }, {
              eventID: eventId // Pass event ID for deduplication
            });
            console.log('[Facebook Pixel] InitiateCheckout tracked with event_id:', eventId);
          }
          
          // Track Pinterest AddToCart event
          if (window.pintrk) {
            // Generate deterministic event ID that can be recreated server-side
            const timestamp = Date.now();
            const eventId = 'addtocart_' + timestamp;
            
            // Store event ID for potential server-side tracking
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('pinterest_addtocart_event_id', eventId);
              sessionStorage.setItem('pinterest_addtocart_timestamp', timestamp.toString());
            }
            
            window.pintrk('track', 'addtocart', {
              event_id: eventId,
              value: 79.00,
              order_quantity: 1,
              currency: 'USD'
            });
            console.log('[Pinterest Tag] AddToCart tracked with event_id:', eventId);
          }
          
          // Track Reddit Pixel AddToCart event with deduplication
          if (window.rdt) {
            // Generate a unique conversion ID for deduplication
            const timestamp = Date.now();
            const conversionId = 'addtocart_' + timestamp;
            
            // Store conversion ID for potential server-side tracking
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('reddit_addtocart_conversion_id', conversionId);
              sessionStorage.setItem('reddit_addtocart_timestamp', timestamp.toString());
            }
            
            window.rdt('track', 'AddToCart', {
              conversion_id: conversionId,
              currency: 'USD',
              value: 79.00,
              itemCount: 1,
              products: [{
                id: 'cognition-lifetime',
                name: 'Cognition Lifetime Access',
                category: 'Lifetime Access'
              }]
            });
            console.log('[Reddit Pixel] AddToCart tracked with conversion_id:', conversionId);
          }
          
          
          // Track Snapchat Pixel START_CHECKOUT event
          if (window.snaptr) {
            window.snaptr('track', 'START_CHECKOUT', {
              price: 79.00,
              currency: 'USD',
              item_ids: ['cognition-lifetime'],
              item_category: 'Lifetime Access',
              number_items: 1,
              payment_info_available: 0 // Set to 0 since payment info not available yet
            });
            console.log('[Snapchat Pixel] START_CHECKOUT tracked');
          }
          
          // Go directly to Stripe checkout
          try {
            const response = await fetch('/api/pre-auth-checkout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                authMethod: 'pending' 
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to create checkout session');
            }

            // Redirect to Stripe checkout
            if (data.checkoutUrl) {
              // Track Begin Checkout conversion before redirecting
              if (window.gtag) {
                window.gtag('event', 'conversion', {
                  'send_to': 'AW-XXXXXXXXXX/your-conversion-label'
                });
                console.log('[Google Ads] Begin Checkout conversion tracked');
              }
              
              // Redirect to Stripe checkout
              window.location.href = data.checkoutUrl;
            }
          } catch (error) {
            alert(error.message || 'Failed to start checkout process');
          }
        });
        
        // Remove the target attribute to prevent opening in new tab
        link.removeAttribute('target');
        link.removeAttribute('rel');
        // Keep the href for SEO but prevent default navigation
        link.style.cursor = 'pointer';
      }
    });

    // Also look for any elements with text containing "Discover" and "Hidden Patterns"
    const allElements = document.querySelectorAll('a, button');
    allElements.forEach(element => {
      const textContent = element.textContent || element.innerText || '';
      if (textContent.toLowerCase().includes('discover') && 
          textContent.toLowerCase().includes('hidden patterns') &&
          !element.hasAttribute('data-modal-setup')) {
        element.setAttribute('data-modal-setup', 'true');
        element.addEventListener('click', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Track AddToCart event when user initiates checkout
          if (window.TriplePixel) {
            window.TriplePixel('AddToCart', {
              item: 'cognition-lifetime-access',
              q: 1,
              v: 'lifetime-79'
            });
            console.log('[Triple Whale] AddToCart tracked: User clicked Discover button');
          }
          
          // Track Facebook Pixel InitiateCheckout event
          if (window.fbq) {
            // Generate event ID for deduplication
            const timestamp = Date.now();
            const eventId = 'initiate_checkout_' + timestamp;
            
            // Store for server-side deduplication
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('fb_initiate_checkout_event_id', eventId);
              sessionStorage.setItem('fb_initiate_checkout_timestamp', timestamp.toString());
              
              // Store Facebook cookies
              const cookies = document.cookie.split(';');
              let fbc = null;
              let fbp = null;
              
              cookies.forEach(function(cookie) {
                const parts = cookie.trim().split('=');
                if (parts[0] === '_fbc') fbc = parts[1];
                if (parts[0] === '_fbp') fbp = parts[1];
              });
              
              if (fbc) sessionStorage.setItem('fb_fbc', fbc);
              if (fbp) sessionStorage.setItem('fb_fbp', fbp);
            }
            
            window.fbq('track', 'InitiateCheckout', {
              content_name: 'Cognition Lifetime Access',
              content_category: 'Lifetime Access',
              content_ids: ['cognition-lifetime'],
              content_type: 'product',
              currency: 'USD',
              num_items: 1,
              value: 79.00 // Add value for better tracking
            }, {
              eventID: eventId // Pass event ID for deduplication
            });
            console.log('[Facebook Pixel] InitiateCheckout tracked with event_id:', eventId);
          }
          
          // Track Pinterest AddToCart event
          if (window.pintrk) {
            // Generate deterministic event ID that can be recreated server-side
            const timestamp = Date.now();
            const eventId = 'addtocart_' + timestamp;
            
            // Store event ID for potential server-side tracking
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('pinterest_addtocart_event_id', eventId);
              sessionStorage.setItem('pinterest_addtocart_timestamp', timestamp.toString());
            }
            
            window.pintrk('track', 'addtocart', {
              event_id: eventId,
              value: 79.00,
              order_quantity: 1,
              currency: 'USD'
            });
            console.log('[Pinterest Tag] AddToCart tracked with event_id:', eventId);
          }
          
          // Track Reddit Pixel AddToCart event with deduplication
          if (window.rdt) {
            // Generate a unique conversion ID for deduplication
            const timestamp = Date.now();
            const conversionId = 'addtocart_' + timestamp;
            
            // Store conversion ID for potential server-side tracking
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('reddit_addtocart_conversion_id', conversionId);
              sessionStorage.setItem('reddit_addtocart_timestamp', timestamp.toString());
            }
            
            window.rdt('track', 'AddToCart', {
              conversion_id: conversionId,
              currency: 'USD',
              value: 79.00,
              itemCount: 1,
              products: [{
                id: 'cognition-lifetime',
                name: 'Cognition Lifetime Access',
                category: 'Lifetime Access'
              }]
            });
            console.log('[Reddit Pixel] AddToCart tracked with conversion_id:', conversionId);
          }
          
          
          // Track Snapchat Pixel START_CHECKOUT event
          if (window.snaptr) {
            window.snaptr('track', 'START_CHECKOUT', {
              price: 79.00,
              currency: 'USD',
              item_ids: ['cognition-lifetime'],
              item_category: 'Lifetime Access',
              number_items: 1,
              payment_info_available: 0 // Set to 0 since payment info not available yet
            });
            console.log('[Snapchat Pixel] START_CHECKOUT tracked');
          }
          
          // Go directly to Stripe checkout
          try {
            const response = await fetch('/api/pre-auth-checkout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                authMethod: 'pending' 
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to create checkout session');
            }

            // Redirect to Stripe checkout
            if (data.checkoutUrl) {
              // Track Begin Checkout conversion before redirecting
              if (window.gtag) {
                window.gtag('event', 'conversion', {
                  'send_to': 'AW-XXXXXXXXXX/your-conversion-label'
                });
                console.log('[Google Ads] Begin Checkout conversion tracked');
              }
              
              // Redirect to Stripe checkout
              window.location.href = data.checkoutUrl;
            }
          } catch (error) {
            alert(error.message || 'Failed to start checkout process');
          }
        });
        element.style.cursor = 'pointer';
      }
    });
  }


  // Initialize when DOM is ready
  ready(function() {
    setupDiscoverButtons();
    
    // Also set up a MutationObserver in case the content changes dynamically
    const observer = new MutationObserver(function(mutations) {
      // Debounce to avoid too many calls
      clearTimeout(observer.timeout);
      observer.timeout = setTimeout(setupDiscoverButtons, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();