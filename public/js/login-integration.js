// Login Integration Script
// This script intercepts login links and redirects to the proper sign-in page

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

  // Setup Login link clicks
  function setupLoginLinks() {
    // Find all login links pointing to cognition.cv/login
    const loginLinks = document.querySelectorAll('a[href*="cognition.cv/login"], a[href*="/login"]');
    
    loginLinks.forEach(link => {
      // Check if this is a login link
      const href = link.getAttribute('href') || '';
      const textContent = link.textContent || link.innerText || '';
      
      if (href.includes('login') || textContent.toLowerCase().includes('login') || textContent.toLowerCase().includes('log in')) {
        // Override the click behavior
        link.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Track login attempt events for various pixels
          // Track Triple Whale event
          if (window.TriplePixel) {
            window.TriplePixel('LoginAttempt', {
              action: 'navigation_click',
              source: 'header_nav'
            });
            console.log('[Triple Whale] LoginAttempt tracked: User clicked login link');
          }
          
          // Track Facebook Pixel ViewContent event for login page
          if (window.fbq) {
            window.fbq('track', 'ViewContent', {
              content_name: 'Login Page',
              content_category: 'Authentication',
              content_type: 'page'
            });
            console.log('[Facebook Pixel] ViewContent tracked for login page');
          }
          
          // Track Pinterest ViewCategory event
          if (window.pintrk) {
            window.pintrk('track', 'viewcategory', {
              category: 'Authentication'
            });
            console.log('[Pinterest Tag] ViewCategory tracked for authentication');
          }
          
          // Track Reddit Pixel ViewContent event
          if (window.rdt) {
            window.rdt('track', 'ViewContent', {
              contentType: 'login_page'
            });
            console.log('[Reddit Pixel] ViewContent tracked for login page');
          }
          
          // Track Snapchat Pixel VIEW_CONTENT event
          if (window.snaptr) {
            window.snaptr('track', 'VIEW_CONTENT', {
              content_type: 'login_page'
            });
            console.log('[Snapchat Pixel] VIEW_CONTENT tracked for login page');
          }
          
          // Track Google Analytics event
          if (window.gtag) {
            window.gtag('event', 'login_navigation', {
              'event_category': 'engagement',
              'event_label': 'header_login_click'
            });
            console.log('[Google Analytics] login_navigation event tracked');
          }
          
          // Store the intended redirect URL in sessionStorage
          // This can be used after successful login to redirect back
          const currentPath = window.location.pathname;
          if (currentPath && currentPath !== '/' && currentPath !== '/login') {
            sessionStorage.setItem('after_sign_in_url', window.location.href);
          }
          
          // Redirect to the login page
          window.location.href = '/login';
        });
        
        // Update the href to prevent accidental navigation
        link.setAttribute('href', '/login');
        // Remove target="_blank" if present
        link.removeAttribute('target');
        link.removeAttribute('rel');
        // Ensure pointer cursor
        link.style.cursor = 'pointer';
      }
    });

    // Also look for any elements with text containing "Login" or "Log in"
    const allElements = document.querySelectorAll('a, button');
    allElements.forEach(element => {
      const textContent = element.textContent || element.innerText || '';
      const href = element.getAttribute('href') || '';
      
      if ((textContent.toLowerCase().includes('login') || textContent.toLowerCase().includes('log in')) &&
          !element.hasAttribute('data-login-setup') &&
          !href.includes('login')) {
        
        element.setAttribute('data-login-setup', 'true');
        element.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Track login attempt events
          if (window.TriplePixel) {
            window.TriplePixel('LoginAttempt', {
              action: 'button_click',
              source: 'page_content'
            });
            console.log('[Triple Whale] LoginAttempt tracked: User clicked login button');
          }
          
          // Track Facebook Pixel
          if (window.fbq) {
            window.fbq('track', 'ViewContent', {
              content_name: 'Login Page',
              content_category: 'Authentication',
              content_type: 'page'
            });
          }
          
          // Store current URL for post-login redirect
          const currentPath = window.location.pathname;
          if (currentPath && currentPath !== '/' && currentPath !== '/login') {
            sessionStorage.setItem('after_sign_in_url', window.location.href);
          }
          
          // Redirect to login
          window.location.href = '/login';
        });
        
        element.style.cursor = 'pointer';
      }
    });
  }

  // Initialize when DOM is ready
  ready(function() {
    setupLoginLinks();
    
    // Also set up a MutationObserver in case the content changes dynamically
    const observer = new MutationObserver(function(mutations) {
      // Debounce to avoid too many calls
      clearTimeout(observer.timeout);
      observer.timeout = setTimeout(setupLoginLinks, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();