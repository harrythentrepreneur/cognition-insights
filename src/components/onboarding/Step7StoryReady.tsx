import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FONTS, ANIMATIONS } from './shared/styles';
import { IndexedDBStorage } from '@/lib/storage/indexed-db';
import { logger } from '@/lib/utils/logger';

interface Step7StoryReadyProps {
  onComplete: () => void;
  sessionId?: string;
  verifyReady?: boolean;
}

const Step7StoryReady: React.FC<Step7StoryReadyProps> = ({ onComplete, sessionId: propSessionId, verifyReady = false }) => {
  const router = useRouter();
  
  // Get sessionId from props or sessionStorage - enhanced retrieval logic
  const getSessionId = () => {
    const id = propSessionId || 
               sessionStorage.getItem('story-ready-session') || 
               sessionStorage.getItem('pendingSessionId') || 
               '';
    if (id) {
      logger.debug('[Step7-StoryReady] SessionId retrieved:', id);
    } else {
      logger.warn('[Step7-StoryReady] No sessionId found!');
    }
    return id;
  };
  
  const sessionId = getSessionId();
  
  const [videoVisible, setVideoVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [textWhite, setTextWhite] = useState(false);
  const [fadeOutStarted, setFadeOutStarted] = useState(false);
  const [isVerified, setIsVerified] = useState(!verifyReady); // If no verification needed, consider it verified
  // Removed verification error display per user request
  const MAX_ATTEMPTS = 3; // Maximum verification attempts
  
  // Add refs to prevent duplicate verification processes
  const verificationInProgressRef = useRef<boolean>(false);
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTriggeredRef = useRef<boolean>(false);

  // Verification effect for real sessions
  useEffect(() => {
    if (!verifyReady || isVerified) return;
    
    // Prevent duplicate verification processes
    if (verificationInProgressRef.current) {
      logger.debug('[Step7-StoryReady] Verification already in progress, skipping duplicate call');
      return;
    }

    const verifyResults = async (attemptNumber: number = 0) => {
      if (!sessionId || sessionId.startsWith('mock-session-')) {
        logger.debug('[Step7-StoryReady] Mock session, skipping verification');
        setIsVerified(true);
        verificationInProgressRef.current = false;
        return;
      }
      
      // Mark verification as in progress
      verificationInProgressRef.current = true;

      logger.debug(`[Step7-StoryReady] Verifying results for session: ${sessionId} (attempt ${attemptNumber + 1})`);
      
      try {
        // Initialize IndexedDB storage
        const storage = new IndexedDBStorage();
        await storage.initialize();
        
        // Try to get the analysis result directly by sessionId
        let result = await storage.getAnalysisResult(sessionId);
        
        // If not found by sessionId, try looking up by email
        if (!result) {
          const allResults = await storage.getAnalysisByEmail('anonymous'); // TODO: Use actual email from auth
          result = allResults.find(r => r.sessionId === sessionId);
        }
        
        const hasData = result && (result.emotional || result.triggers || result.personality);
        
        if (hasData) {
          logger.debug('[Step7-StoryReady] Results verified from IndexedDB! Story is truly ready.');
          setIsVerified(true);
          verificationInProgressRef.current = false;
        } else {
          throw new Error('No results data found in IndexedDB');
        }
      } catch (error) {
        logger.error('[Step7-StoryReady] Verification check failed:', error);
        
        // Use the passed attempt number instead of state
        const nextAttempt = attemptNumber + 1;
        
        // After a few quick attempts, just continue (backend ensures data is ready)
        if (nextAttempt >= MAX_ATTEMPTS) {
          logger.debug('[Step7-StoryReady] Proceeding after verification attempts.');
          setIsVerified(true);
          verificationInProgressRef.current = false;
          return;
        }
        
        // Quick retry with minimal delay
        const delay = 1000; // 1 second delay between attempts
        logger.debug(`[Step7-StoryReady] Retrying verification in ${delay} ms (attempt ${nextAttempt})`);
        
        // Clear any existing timeout
        if (verificationTimeoutRef.current) {
          clearTimeout(verificationTimeoutRef.current);
        }
        
        // Schedule retry
        verificationTimeoutRef.current = setTimeout(() => {
          verifyResults(nextAttempt);
        }, delay);
      }
    };

    // Start verification
    verifyResults(0);
    
    // Cleanup function
    return () => {
      logger.debug('[Step7-StoryReady] Cleaning up verification effect');
      verificationInProgressRef.current = false;
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
    };
  }, [sessionId, verifyReady, isVerified]); // Removed verificationAttempts from dependencies

  // Removed continue anyway handler - no longer needed

  useEffect(() => {
    // Only start animations after verification (if required)
    if (!isVerified) {
      logger.debug('[Step7-StoryReady] Waiting for verification before starting animations...');
      return;
    }

    // Prevent duplicate redirects
    if (redirectTriggeredRef.current) {
      logger.debug('[Step7-StoryReady] Redirect already triggered, skipping animation setup');
      return;
    }

    logger.debug('[Step7-StoryReady] Starting animation sequence...');
    
    // Create redirect function with enhanced sessionId handling
    const performRedirect = () => {
      if (redirectTriggeredRef.current) {
        logger.debug('[Step7-StoryReady] Redirect already performed, skipping');
        return;
      }
      
      // Try to get sessionId one more time in case it was set late
      const finalSessionId = sessionId || 
                           sessionStorage.getItem('story-ready-session') || 
                           sessionStorage.getItem('pendingSessionId');
      
      redirectTriggeredRef.current = true;
      
      // Always include completed=true for first-time users coming from onboarding
      const targetUrl = finalSessionId 
        ? `/emotional-landscapes?sessionId=${finalSessionId}&completed=true`
        : '/emotional-landscapes?completed=true';  // Still mark as completed even without sessionId
        
      logger.debug('[Step7-StoryReady] Final redirect with sessionId:', finalSessionId, 'to:', targetUrl);
      router.push(targetUrl);
    };
    
    // Animation sequence with faster color fade - less pause between video and overlay
    const timer1 = setTimeout(() => setVideoVisible(true), 1500); // Video fade in after 1.5s delay
    const timer2 = setTimeout(() => setTextVisible(true), 1900); // Text fade in after 0.4s delay from video
    const timer3 = setTimeout(() => setOverlayVisible(true), 2500); // Overlay starts much earlier at 2.5s (faster)
    const timer4 = setTimeout(() => setTextWhite(true), 4000); // Text turns white earlier when overlay starts getting strong
    const timer5 = setTimeout(() => setFadeOutStarted(true), 10000); // Start fade out at 10s
    const timer6 = setTimeout(performRedirect, 11500); // Redirect after 11.5s total
    
    // Removed problematic fallback timer that was causing premature redirects

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
    };
  }, [router, sessionId, isVerified]); // Removed onComplete from dependencies

  // Show a subtle loading state while verifying
  if (verifyReady && !isVerified) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#F5F2F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Satoshi, sans-serif',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          maxWidth: '500px',
          padding: '0 20px',
        }}>
          <div style={{
            fontSize: '24px',
            color: 'rgb(61, 0, 0)',
            opacity: 0.8,
            textAlign: 'center',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.8; }
              }
            `}</style>
            Preparing your story...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Font face definitions matching onboarding style */}
      <style jsx>{`
        @font-face {
          font-family: 'Satoshi';
          src: url('${FONTS.SATOSHI_700_URL}') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 700;
        }
        
        @font-face {
          font-family: 'Satoshi';
          src: url('${FONTS.SATOSHI_500_URL}') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 500;
        }

        * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-size: 12px;
          font-family: sans-serif;
          line-height: 1.15;
        }
      `}</style>
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#F5F2F0', // Keep consistent background with other onboarding steps
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        fontFamily: '"Inter", sans-serif', // Match onboarding font
        fontSize: '12px',
        lineHeight: '1.15',
        textSizeAdjust: '100%' as any,
        WebkitFontSmoothing: 'antialiased' as any,
        MozOsxFontSmoothing: 'grayscale' as any,
        boxSizing: 'border-box'
      }}>
        {/* Video background container */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: fadeOutStarted ? 'translate(-50%, -50%) scale(0.95)' : 'translate(-50%, -50%)',
          width: '100%',
          height: '100vh',
          opacity: videoVisible ? (fadeOutStarted ? 0 : 1) : 0.001,
          transition: `opacity ${fadeOutStarted ? '1.5s' : '2s'} ${ANIMATIONS.EASE_OUT}, transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)`,
          willChange: 'opacity, transform',
          zIndex: 1
        }}>
          <video
            src="/videos/story-ready-video.mp4"
            autoPlay
            loop
            preload="metadata"
            muted
            playsInline
            onError={(e) => {
              logger.warn('Video failed to load, trying fallback:', e);
              // Fallback to remote URL if local fails
              (e.target as HTMLVideoElement).src = "https://framerusercontent.com/assets/pacJqATLLsF8sgfhIyyoERqRZlQ.mp4";
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: 'rgba(0, 0, 0, 0)',
              objectPosition: '50% 50%',
              cursor: 'auto',
              display: 'block',
              borderRadius: '0px',
            }}
          />
        </div>

        {/* Faster overlay transition to emotional landscapes background color */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#1A1A2E', // Emotional landscapes background color
          opacity: overlayVisible ? (fadeOutStarted ? 1 : 1) : 0, // Keep overlay visible during fade out
          transition: `opacity 4s ${ANIMATIONS.EASE_OUT}`, // Faster 4-second transition instead of 6s
          willChange: 'transform',
          zIndex: 2
        }} />

        {/* Text element with exact user-specified styling */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          maxWidth: '600px', // Reasonable width for readable text
          width: '600px',
          height: 'auto',
          zIndex: 3,
          flexShrink: 0,
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          opacity: textVisible ? (fadeOutStarted ? 0 : 1) : 0.001,
          transition: `opacity ${fadeOutStarted ? '1s' : '0.6s'} ${ANIMATIONS.EASE_OUT}, transform ${fadeOutStarted ? '1s' : '0.6s'} ${ANIMATIONS.EASE_OUT}`,
          transform: textVisible 
            ? (fadeOutStarted ? 'translate(-50%, -50%) translateY(-10px)' : 'translate(-50%, -50%) translateY(0px)')
            : 'translate(-50%, -50%) translateY(-24px)',
          willChange: 'opacity, transform'
        }}>
          <div style={{
            fontSize: '24px',
            color: textWhite ? '#ffffff' : 'rgb(61, 0, 0)', 
            lineHeight: '1.3',
            margin: 0,
            fontWeight: 400,
            fontFamily: 'Satoshi, sans-serif',
            opacity: textWhite ? 1 : 0.8, // Use 0.8 opacity for dark text, full opacity for white
            WebkitFontSmoothing: 'antialiased' as any,
            textSizeAdjust: '100%' as any,
            boxSizing: 'border-box',
            textAlign: 'center',
            whiteSpace: 'normal' as any,
            transition: `color 1.5s ${ANIMATIONS.EASE_OUT}, opacity 1.5s ${ANIMATIONS.EASE_OUT}`,
          }}>
            Welcome to your story. It&apos;s ready for you.
          </div>
        </div>
      </div>
    </>
  );
};

export default Step7StoryReady; 