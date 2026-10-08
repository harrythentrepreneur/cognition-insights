// Ad Tracking Verification Script for Static HTML Pages
// This script verifies all tracking pixels are loaded and working

(function() {
  'use strict';

  console.log('===== AD TRACKING VERIFICATION STARTING =====');
  
  // Wait for all scripts to load
  window.addEventListener('load', function() {
    setTimeout(verifyTracking, 1000); // Give pixels time to initialize
  });

  function verifyTracking() {
    console.log('\n📊 TRACKING PIXEL STATUS CHECK:');
    console.log('================================');
    
    // Check if each pixel is loaded
    const pixelStatus = {
      'Google (gtag)': typeof window.gtag === 'function',
      'Facebook (fbq)': typeof window.fbq === 'function',
      'Triple Whale': typeof window.TriplePixel === 'function',
      'Pinterest (pintrk)': typeof window.pintrk === 'function',
      'Reddit (rdt)': typeof window.rdt === 'function',
      'Snapchat (snaptr)': typeof window.snaptr === 'function'
    };

    // Display status table
    console.table(pixelStatus);

    // Count loaded pixels
    const loadedCount = Object.values(pixelStatus).filter(v => v).length;
    const totalCount = Object.keys(pixelStatus).length;

    if (loadedCount === totalCount) {
      console.log(`✅ SUCCESS: All ${totalCount} tracking pixels loaded!`);
    } else {
      console.error(`❌ ERROR: Only ${loadedCount}/${totalCount} pixels loaded`);
      console.error('Missing pixels:', 
        Object.entries(pixelStatus)
          .filter(([k,v]) => !v)
          .map(([k]) => k)
          .join(', ')
      );
    }

    // Check for page view events in dataLayer
    console.log('\n📈 PAGE VIEW EVENTS CHECK:');
    console.log('==========================');
    
    if (window.dataLayer) {
      const pageViewEvents = window.dataLayer.filter(item => 
        item[0] === 'config' || 
        (item.event && item.event === 'page_view')
      );
      console.log('Google Analytics events:', pageViewEvents.length > 0 ? '✅ Found' : '❌ Not found');
    }

    // Check network requests
    console.log('\n🌐 NETWORK REQUESTS CHECK:');
    console.log('=========================');
    console.log('Open Network tab and look for these domains:');
    console.log('- facebook.com/tr (Facebook Pixel)');
    console.log('- googletagmanager.com (Google)');
    console.log('- config-security.com (Triple Whale)');
    console.log('- ct.pinterest.com (Pinterest)');
    console.log('- redditstatic.com (Reddit)');
    console.log('- sc-static.net (Snapchat)');

    // Test button tracking
    console.log('\n🔘 BUTTON CLICK TRACKING TEST:');
    console.log('==============================');
    
    // Find Discover buttons
    const discoverButtons = Array.from(document.querySelectorAll('a')).filter(a => {
      const text = (a.textContent || '').toLowerCase();
      return text.includes('discover') && text.includes('hidden patterns');
    });

    if (discoverButtons.length > 0) {
      console.log(`Found ${discoverButtons.length} "Discover" button(s)`);
      console.log('Click any button to test tracking events.');
      
      // Add temporary click listener to verify events
      discoverButtons.forEach((btn, index) => {
        const originalOnClick = btn.onclick;
        btn.addEventListener('click', function(e) {
          console.log(`\n🎯 BUTTON ${index + 1} CLICKED - Tracking Events:`);
          console.log('Check console for:');
          console.log('- [Triple Whale] AddToCart tracked');
          console.log('- [Facebook Pixel] InitiateCheckout tracked');
          console.log('- [Pinterest Tag] AddToCart tracked');
          console.log('- [Reddit Pixel] AddToCart tracked');
          console.log('- [Snapchat Pixel] START_CHECKOUT tracked');
          console.log('- [Google Ads] Begin Checkout conversion tracked');
        }, { once: true });
      });
    } else {
      console.warn('⚠️ No "Discover" buttons found on this page');
    }

    // Provide quick test function
    window.testTracking = function() {
      console.log('\n🧪 MANUAL TRACKING TEST:');
      console.log('=======================');
      
      // Test each pixel manually
      try {
        if (window.fbq) {
          window.fbq('track', 'Test');
          console.log('✅ Facebook test event sent');
        }
        if (window.gtag) {
          window.gtag('event', 'test_event');
          console.log('✅ Google test event sent');
        }
        if (window.TriplePixel) {
          window.TriplePixel('Test', {test: true});
          console.log('✅ Triple Whale test event sent');
        }
        if (window.pintrk) {
          window.pintrk('track', 'custom', {custom_event: 'test'});
          console.log('✅ Pinterest test event sent');
        }
        if (window.rdt) {
          window.rdt('track', 'Custom', {customEventName: 'Test'});
          console.log('✅ Reddit test event sent');
        }
        if (window.snaptr) {
          window.snaptr('track', 'CUSTOM_EVENT_1');
          console.log('✅ Snapchat test event sent');
        }
      } catch (error) {
        console.error('Error during test:', error);
      }
      
      console.log('\n📋 Check Network tab for outgoing requests to verify events were sent.');
    };

    console.log('\n💡 TIP: Run `testTracking()` in console to send test events');
    console.log('===== VERIFICATION COMPLETE =====\n');
  }

  // Auto-run verification if query param is present
  if (window.location.search.includes('verify-tracking=true')) {
    console.log('Auto-verification triggered by URL parameter');
  }

})();