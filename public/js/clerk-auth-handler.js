// Clerk Authentication Handler for Post-Payment Flow
(function() {
  'use strict';

  console.log('[Clerk Auth Handler] Script loaded');

  // Check if we need to trigger Clerk auth after payment
  function checkAuthTrigger() {
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('auth');
    const paymentStatus = urlParams.get('payment');
    
    console.log('[Clerk Auth Handler] URL params:', { authType, paymentStatus });
    
    if (authType === 'signup' && paymentStatus === 'success') {
      console.log('[Clerk Auth Handler] Payment success detected, triggering auth flow');
      
      // Clean URL
      const cleanUrl = new URL(window.location);
      cleanUrl.searchParams.delete('auth');
      cleanUrl.searchParams.delete('payment');
      window.history.replaceState({}, '', cleanUrl);
      
      // Wait for Clerk to load then open signup
      waitForClerk(() => {
        openClerkSignUp();
      });
    }
  }

  // Wait for Clerk to be available
  function waitForClerk(callback, attempts = 0) {
    if (window.Clerk) {
      console.log('[Clerk Auth Handler] Clerk is loaded');
      callback();
    } else if (attempts < 50) { // Wait up to 5 seconds
      console.log('[Clerk Auth Handler] Waiting for Clerk...', attempts);
      setTimeout(() => waitForClerk(callback, attempts + 1), 100);
    } else {
      console.error('[Clerk Auth Handler] Clerk failed to load after 5 seconds');
    }
  }

  // Open Clerk signup modal
  function openClerkSignUp() {
    console.log('[Clerk Auth Handler] Opening Clerk signup modal');
    if (window.Clerk) {
      try {
        window.Clerk.openSignUp({
        afterSignUpUrl: '/welcome',
        appearance: {
          elements: {
            rootBox: {
              backgroundColor: 'rgba(26, 26, 58, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(79, 79, 160, 0.3)',
              borderRadius: '24px',
            },
            card: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
            },
            headerTitle: {
              color: '#FFFFFF',
              fontSize: '28px',
              fontWeight: 'bold',
            },
            headerSubtitle: {
              color: '#9CA3AF',
            },
            formButtonPrimary: {
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5558E3 0%, #7C4FE8 100%)',
              },
            },
            formFieldInput: {
              backgroundColor: 'rgba(17, 24, 39, 0.5)',
              border: '1px solid rgba(79, 79, 160, 0.3)',
              color: '#FFFFFF',
              '&:focus': {
                borderColor: '#6366F1',
                boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
              },
            },
            formFieldLabel: {
              color: '#E5E7EB',
            },
            footerActionLink: {
              color: '#6366F1',
            },
          },
        },
      });
        console.log('[Clerk Auth Handler] Signup modal opened successfully');
      } catch (error) {
        console.error('[Clerk Auth Handler] Error opening signup modal:', error);
      }
    } else {
      console.error('[Clerk Auth Handler] Clerk not available when trying to open modal');
    }
  }

  // Make function globally available for manual triggering
  window.openClerkAuth = openClerkSignUp;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthTrigger);
  } else {
    checkAuthTrigger();
  }
})();