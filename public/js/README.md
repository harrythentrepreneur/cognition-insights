# JavaScript Integration Scripts

This directory contains client-side JavaScript integrations for the Cognition landing pages.

## Scripts Overview

### 1. `modal-integration.js`
**Purpose**: Intercepts "Discover My Hidden Patterns" buttons and redirects to Stripe checkout
- Automatically finds buttons/links with specific text
- Tracks analytics events (AddToCart, InitiateCheckout)
- Handles direct-to-Stripe payment flow
- No modal popup - goes straight to payment

### 2. `login-integration.js`
**Purpose**: Intercepts login links and redirects to the `/login` page
- Automatically finds all login links and buttons
- Redirects from `cognition.cv/login` to `/login`
- Tracks login attempt events across all analytics platforms
- Stores return URL for post-login redirect
- Supports dynamically added content

### 3. `clerk-auth-handler.js`
**Purpose**: Handles Clerk authentication state and redirects
- Manages authentication tokens
- Handles post-payment account creation
- Manages session persistence

### 4. `tracking-pixels.js`
**Purpose**: Initializes and manages analytics tracking pixels
- Sets up Triple Whale, Facebook, Pinterest, Reddit, Snapchat pixels
- Handles event tracking and conversions
- Manages pixel initialization

### 5. `verify-tracking.js`
**Purpose**: Debug script for verifying tracking implementation
- Logs tracking events to console
- Helps verify pixel firing
- Should be removed in production

## Integration Order

Always include scripts in this order:
```html
<!-- Clerk Authentication (Required) -->
<script 
  async
  crossorigin="anonymous"
  data-clerk-publishable-key="pk_live_your_clerk_publishable_key"
  onload="window.Clerk.load()"
  src="https://cognition.cv/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
  type="text/javascript">
</script>

<!-- Tracking Pixels (Optional but recommended) -->
<script src="/js/tracking-pixels.js"></script>

<!-- Payment Integration -->
<script src="/js/modal-integration.js"></script>

<!-- Login Integration -->
<script src="/js/login-integration.js"></script>

<!-- Clerk Auth Handler -->
<script src="/js/clerk-auth-handler.js"></script>

<!-- Debug Only - Remove in Production -->
<script src="/js/verify-tracking.js"></script>
```

## Login Integration Details

The `login-integration.js` script provides seamless login redirection:

### Features:
- **Automatic Detection**: Finds links containing "login" or "log in"
- **URL Interception**: Redirects `cognition.cv/login` → `/login`
- **Analytics Tracking**: Records login attempts across all platforms
- **Return URL**: Stores current page for post-login redirect
- **Dynamic Support**: Works with AJAX-loaded content

### Tracked Events:
- Triple Whale: `LoginAttempt`
- Facebook Pixel: `ViewContent` (login page)
- Pinterest: `viewcategory` (authentication)
- Reddit: `ViewContent` (login_page)
- Snapchat: `VIEW_CONTENT` (login_page)
- Google Analytics: `login_navigation`

### Example Usage:
```html
<!-- These will all redirect to /login -->
<a href="https://cognition.cv/login">Login</a>
<a href="/login">Sign In</a>
<a href="#" class="login-link">Log in to Your Account</a>
<button>Login Now</button>
```

## Payment Integration Details

The `modal-integration.js` script handles payment flows:

### Features:
- **Button Detection**: Finds "Discover My Hidden Patterns" CTAs
- **Direct to Stripe**: No modal, straight to checkout
- **Analytics Tracking**: Full funnel tracking
- **Error Handling**: Graceful failure states

### Tracked Events:
- Triple Whale: `AddToCart`
- Facebook Pixel: `InitiateCheckout`
- Pinterest: `addtocart`
- Reddit: `AddToCart`
- Snapchat: `START_CHECKOUT`
- Google Ads: Begin Checkout conversion

## Development Guidelines

1. **Testing**: Use browser console to verify script loading
2. **Debugging**: Add `?debug=true` to URL for verbose logging
3. **Analytics**: Check Network tab for pixel fires
4. **Errors**: All scripts have try-catch for graceful failures

## Common Issues

### Login Links Not Working
- Check if `login-integration.js` is loaded
- Verify link contains "login" or "log in" text
- Check browser console for errors

### Payment Buttons Not Working
- Ensure `modal-integration.js` is loaded
- Verify button text includes "Discover" and "Hidden Patterns"
- Check if Stripe checkout endpoint is accessible

### Analytics Not Tracking
- Verify `tracking-pixels.js` loads first
- Check for ad blockers
- Use Network tab to see pixel requests

## Support

For issues or questions:
- Email: support@cognition.cv
- Include browser console logs
- Mention which script is affected