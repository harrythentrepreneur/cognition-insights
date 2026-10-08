'use client';

import { useEffect } from 'react';

export default function ViewportController() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if viewport has already been modified to prevent unnecessary updates
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta?.getAttribute('data-modified') === 'true') {
      return;
    }

    // Check if mobile or tablet (up to 1024px which covers most tablets)
    const actualDeviceWidth = window.innerWidth;
    const isMobileOrTablet = actualDeviceWidth <= 1024;
    
    if (isMobileOrTablet) {
      // Get the viewport meta tag
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      
      if (viewportMeta) {
        // Save original content
        const originalContent = viewportMeta.getAttribute('content') || 'width=device-width, initial-scale=1';
        
        // Mark as modified to prevent re-runs
        viewportMeta.setAttribute('data-modified', 'true');
        viewportMeta.setAttribute('data-original', originalContent);
        
        // Set desktop viewport width
        const desktopWidth = 1440;
        
        // Calculate scale immediately
        const scale = actualDeviceWidth / desktopWidth;
        
        // Set the viewport to desktop width with initial scale
        viewportMeta.setAttribute('content', `width=${desktopWidth}, initial-scale=${scale}, minimum-scale=${scale * 0.5}, maximum-scale=2, user-scalable=yes`);
        
        // Override window.innerWidth for chart libraries
        Object.defineProperty(window.screen, 'width', {
          configurable: true,
          get: function() { return desktopWidth; }
        });
        
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          get: function() { return desktopWidth; }
        });

        // Override Element.prototype.clientWidth for D3 charts
        const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');
        Object.defineProperty(Element.prototype, 'clientWidth', {
          configurable: true,
          get: function() {
            if (this.classList && this.classList.contains('emotion-timeline-container')) {
              return desktopWidth - 100; // Account for margins
            }
            return originalClientWidth?.get?.call(this) || 0;
          }
        });

        // Override getBoundingClientRect for proper positioning
        const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function() {
          const rect = originalGetBoundingClientRect.call(this);
          if (this.classList && this.classList.contains('emotion-timeline-container')) {
            return {
              ...rect,
              width: desktopWidth - 100,
              right: rect.left + (desktopWidth - 100)
            };
          }
          return rect;
        };
        
        // Dispatch resize events immediately
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('orientationchange'));
        
        // Cleanup function
        return () => {
          const originalContentStored = viewportMeta.getAttribute('data-original') || originalContent;
          viewportMeta.setAttribute('content', originalContentStored);
          viewportMeta.removeAttribute('data-modified');
          viewportMeta.removeAttribute('data-original');
          
          // Restore original window.innerWidth
          delete (window as any).innerWidth;
          delete (window.screen as any).width;
          
          // Restore original clientWidth
          if (originalClientWidth) {
            Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth);
          }
          
          // Restore original getBoundingClientRect
          Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
          
          window.dispatchEvent(new Event('resize'));
        };
      }
    }
  }, []);

  return null;
}