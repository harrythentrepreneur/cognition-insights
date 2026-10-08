'use client';

import { useEffect } from 'react';

/**
 * Fix for D3.js non-passive event listener warnings
 * This component should be included once in the app to patch D3's event handling
 */
export function BaseTimelinePassiveFix() {
  useEffect(() => {
    // Override addEventListener to make touch/wheel events passive by default
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
      // Check if this is a touch or wheel event that should be passive
      const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel'];
      
      if (passiveEvents.includes(type)) {
        // If options is a boolean (capturing), convert to object
        if (typeof options === 'boolean') {
          options = { capture: options, passive: true };
        } else if (typeof options === 'object' && options !== null) {
          // Add passive: true if not explicitly set to false
          if (!('passive' in options)) {
            options.passive = true;
          }
        } else {
          // No options provided, create with passive: true
          options = { passive: true };
        }
      }
      
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Cleanup on unmount
    return () => {
      EventTarget.prototype.addEventListener = originalAddEventListener;
    };
  }, []);
  
  return null;
}

/**
 * CSS styles to improve touch handling performance
 */
export const passiveTouchStyles = `
  .brush .selection,
  .brush .handle,
  .overlay {
    touch-action: none;
  }
  
  .d3-container {
    /* Prevent default touch behaviors that might interfere */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
`;