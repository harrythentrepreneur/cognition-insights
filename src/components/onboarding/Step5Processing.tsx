'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProcessingStepProps, ProcessingStats, ProcessingStage } from './shared/types';
import { WhatsAppParser } from '@/lib/parsers/whatsapp-parser';
import { ComprehensiveAnalyzerEnhanced } from '@/lib/analyzers/comprehensive-analyzer-enhanced';
import { useIndexedDB } from '@/hooks/useIndexedDB';
// TEMPORARY: Clerk bypassed
// import { useUser } from '@clerk/nextjs';
import OptimizedImage from '@/components/OptimizedImage';
import { logger } from '@/lib/utils/logger';
import { preloadOnboardingImages } from '@/lib/preload-images';

// Define all processing stages with their configuration
const PROCESSING_STAGES = [
  {
    id: 'stats',
    type: 'stats' as const,
    duration: 10000,
  },
  {
    id: 'reading',
    type: 'standard' as const,
    image: '/onboarding/every-message.png',
    text: 'Every message you\'ve sent holds a piece of your heart...',
    duration: 10000,
  },
  {
    id: 'chapters',
    type: 'standard' as const,
    image: '/onboarding/creating-chapters.png',
    text: 'Creating the chapters of your story...',
    duration: 10000,
  },
  {
    id: 'emotions',
    type: 'standard' as const,
    image: '/onboarding/ai-feeling-emotions.png',
    text: 'Our AI is feeling the emotions between your lines...',
    duration: 10000,
  },
  {
    id: 'triggers',
    type: 'standard' as const,
    image: '/onboarding/identifying-moments.png',
    text: 'Identifying the moments that sparked change...',
    duration: 10000,
  },
  {
    id: 'insights',
    type: 'standard' as const,
    image: '/onboarding/preparing-insights.png',
    text: 'Preparing insights that will help you see yourself in a whole new light...',
    duration: 10000,
  },
  {
    id: 'connections',
    type: 'standard' as const,
    image: '/onboarding/discovering-relationships.png',
    text: 'Discovering how your relationships have shaped your journey...',
    duration: 10000,
  },
  {
    id: 'voice',
    type: 'standard' as const,
    image: '/onboarding/watching-expression.png',
    text: 'Watching how your way of expressing yourself has grown and changed...',
    duration: 10000,
  },
  {
    id: 'dreams',
    type: 'standard' as const,
    image: '/onboarding/discovering-dreams.png',
    text: 'Discovering the dreams you\'ve chased and the victories you\'ve achieved...',
    duration: 10000,
  },
  {
    id: 'patterns',
    type: 'standard' as const,
    image: '/onboarding/uncovering-patterns.png',
    text: 'Uncovering the beautiful patterns that make you uniquely you...',
    duration: 10000,
  },
  {
    id: 'strength',
    type: 'standard' as const,
    image: '/onboarding/recognizing-growth.png',
    text: 'Recognizing how you\'ve grown stronger through life\'s challenges...',
    duration: 10000,
  },
  {
    id: 'narrative',
    type: 'standard' as const,
    image: '/onboarding/crafting-narrative.png',
    text: 'Crafting the beautiful narrative of your life\'s most meaningful chapters...',
    duration: 10000,
  },
  {
    id: 'finalTouch',
    type: 'standard' as const,
    image: '/onboarding/completing-portrait.png',
    text: 'Like an artist putting final touches on a masterpiece...',
    duration: 10000,
  },
  {
    id: 'ready',
    type: 'standard' as const,
    image: '/onboarding/journey-ready.png',
    text: 'Your incredible journey of self-discovery is ready to explore!',
    duration: 10000,
  },
];

// Define stage categories for smart progression
const LOOP_STAGES_END = 11; // Stages 1-11 are the main processing loop
const COMPLETION_STAGES_START = 12; // Stages 12-13 are completion stages
const FINAL_STAGE_INDEX = 13; // The final "ready" stage

export default function ProcessingStep({ sessionId, onComplete }: ProcessingStepProps) {
  const user = { firstName: 'Demo', emailAddresses: [{ emailAddress: 'demo@example.com' }] }; // Stub
  const { saveResults, updateSessionProgress, isReady: isStorageReady } = useIndexedDB();

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [stats, setStats] = useState<ProcessingStats>({
    dateRange: '',
    messagesFound: 0,
    conversationsDetected: 0,
    filesProcessed: 0,
    processingComplete: false,
  });
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [animationsComplete, setAnimationsComplete] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const stageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingStartedRef = useRef(false);
  const completionStartedRef = useRef(false);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analysisResultsRef = useRef<any>(null);
  const activeSessionIdRef = useRef<string>('');

  // Preload all images on component mount
  useEffect(() => {
    preloadOnboardingImages().catch(() => {
      // Silently ignore - images will load on demand if preload fails
    });
  }, []);

  // Start client-side processing
  useEffect(() => {
    if (!sessionId || !isStorageReady || processingStartedRef.current) return;

    processingStartedRef.current = true;
    startClientSideProcessing();
  }, [sessionId, isStorageReady]);

  const startClientSideProcessing = async () => {
    try {
      // Get stored data from sessionStorage
      const pendingFiles = sessionStorage.getItem('pendingFiles');
      const pendingUserName = sessionStorage.getItem('pendingUserName');
      const storedSessionId = sessionStorage.getItem('pendingSessionId') || sessionId;

      if (!pendingFiles) {
        throw new Error('No files found for processing');
      }
      
      // Use the stored sessionId for all operations
      const activeSessionId = storedSessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      logger.debug('Using sessionId for processing:', activeSessionId);

      const fileData = JSON.parse(pendingFiles);
      const userName = pendingUserName || user?.firstName || 'You';

      // Parse messages
      let allMessages: any[] = [];
      let totalMessages = 0;
      let dateRange = '';

      for (const file of fileData) {
        const parser = new WhatsAppParser();
        // Create a File object from the stored content
        const blob = new Blob([file.content], { type: 'text/plain' });
        const fileObj = new File([blob], file.name, { type: 'text/plain' });
        const parseResult = await parser.parseFile(fileObj);
        allMessages = [...allMessages, ...parseResult.messages];
        totalMessages += parseResult.totalMessages;
      }

      // Calculate date range
      if (allMessages.length > 0) {
        const dates = allMessages.map(m => m.timestamp);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        dateRange = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
      }

      // Update stats
      setStats({
        dateRange,
        messagesFound: totalMessages,
        conversationsDetected: fileData.length,
        filesProcessed: fileData.length,
        processingComplete: false,
      });

      // Run comprehensive analysis with enhanced features in background while showing animation
      // For emotional landscapes, we only need 3 analyzers to reduce API calls
      const analyzer = new ComprehensiveAnalyzerEnhanced();
      const analysisPromise = analyzer.analyzeComprehensive(
        allMessages,
        userName,
        totalMessages,
        (stage, percent, message) => {
          // Only update progress if storage is ready
          if (isStorageReady) {
            updateSessionProgress(activeSessionId, percent).catch(err => {
              logger.warn('Failed to update session progress:', err);
            });
          }
        },
        {
          // Only run analyzers needed for emotional landscapes page
          runEmotional: true,
          runTriggers: false, // Not needed for emotional landscapes
          runPersonality: false, // Not needed for emotional landscapes  
          runRelationships: false, // Not needed for emotional landscapes
          runTimelineEvents: true,
          runBehavioralReflections: true
        }
      );

      // Store the promise and session info
      (window as any).pendingAnalysis = analysisPromise;
      (window as any).pendingSessionId = activeSessionId;
      (window as any).pendingUserEmail = user?.emailAddresses[0]?.emailAddress || 'anonymous';
      activeSessionIdRef.current = activeSessionId;
      
      // Also immediately store in sessionStorage for Step7
      sessionStorage.setItem('story-ready-session', activeSessionId);
      logger.debug('Pre-emptively stored sessionId for Step7:', activeSessionId);

      // Handle analysis completion but wait for animations
      analysisPromise.then(async (results) => {
        logger.debug('Analysis completed - waiting for animations to complete');
        logger.debug('SessionId for navigation:', activeSessionId);

        // Store the results
        (window as any).analysisResults = results;
        analysisResultsRef.current = results;

        // Save to IndexedDB
        try {
          const finalResults = {
            ...results,
            sessionId: activeSessionId,
            userEmail: user?.emailAddresses[0]?.emailAddress || 'anonymous',
          };
          
          await saveResults(finalResults);
          logger.debug('Results saved successfully!');
        } catch (saveError) {
          logger.error('Failed to save to IndexedDB:', saveError);
        }

        // Mark analysis as complete and immediately trigger completion
        setAnalysisComplete(true);
        setAnimationsComplete(true); // Skip remaining animations
        logger.debug('Analysis complete, skipping to video transition');
      }).catch(error => {
        logger.error('Analysis failed:', error);
        // Still mark as complete to allow navigation
        setAnalysisComplete(true);
        setAnimationsComplete(true);
      });

      // Emergency timeout: if processing takes more than 5 minutes, force completion
      emergencyTimeoutRef.current = setTimeout(() => {
        logger.warn('Emergency timeout triggered - forcing completion after 5 minutes');
        setAnalysisComplete(true);
      }, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
      logger.error('Processing error:', error);
      setProcessingError(error instanceof Error ? error.message : 'Processing failed');
    }
  };

  // Simple animation management per stage
  useEffect(() => {
    const stageIndex = currentStageIndex;

    // Reset animations when stage changes
    setIsImageVisible(false);
    setIsTextVisible(false);

    // Clear any existing timeout
    if (stageTimeoutRef.current) {
      clearTimeout(stageTimeoutRef.current);
    }

    // Start both animations at the same time
    const animationTimer = setTimeout(() => {
      setIsImageVisible(true);
      setIsTextVisible(true);
    }, 500);

    // Move to next stage after full duration
    const stageTimer = setTimeout(() => {
      if (stageIndex >= PROCESSING_STAGES.length - 1) {
        // Loop back to stage 1
        setCurrentStageIndex(1);
      } else {
        setCurrentStageIndex(prev => prev + 1);
      }
    }, PROCESSING_STAGES[stageIndex]?.duration || 10000);

    stageTimeoutRef.current = stageTimer;

    // Cleanup all timers
    return () => {
      clearTimeout(animationTimer);
      clearTimeout(stageTimer);
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
    };
  }, [currentStageIndex]); // Simple dependency on stage index only

  // New effect to handle navigation when both analysis and animations are complete
  useEffect(() => {
    if (analysisComplete && animationsComplete && !readyToNavigate) {
      logger.debug('Both analysis and animations complete, ready to navigate');
      setReadyToNavigate(true);
      completeProcessing();
    }
  }, [analysisComplete, animationsComplete, readyToNavigate]);

  const completeProcessing = async () => {
    logger.debug('completeProcessing called');

    // Prevent multiple calls
    if (completionStartedRef.current) {
      logger.debug('Completion already in progress, skipping...');
      return;
    }
    completionStartedRef.current = true;

    // Declare pendingSessionId outside try block so it's accessible in finally
    let pendingSessionId: string | undefined;

    try {
      // Wait for analysis to complete
      const analysisPromise = (window as any).pendingAnalysis;
      pendingSessionId = (window as any).pendingSessionId;
      const pendingUserEmail = (window as any).pendingUserEmail;

      logger.debug('Pending data:', {
        hasAnalysisPromise: !!analysisPromise,
        sessionId: pendingSessionId,
        userEmail: pendingUserEmail
      });

      // Get the results that were stored when analysis completed
      const results = (window as any).analysisResults;

      if (results) {
        logger.debug('Using stored analysis results:', {
          hasEmotional: !!results.emotional,
          hasTriggers: !!results.triggers,
          hasPersonality: !!results.personality,
          sessionId: results.sessionId
        });

        // Save results to IndexedDB
        const finalResults = {
          ...results,
          sessionId: pendingSessionId,
          userEmail: pendingUserEmail,
        };

        logger.debug('Saving results to IndexedDB...');
        try {
          await saveResults(finalResults);
          logger.debug('Results saved successfully!');
        } catch (saveError) {
          logger.error('Failed to save to IndexedDB, but continuing:', saveError);
          // Continue with the flow even if storage fails
        }

        // Increment rate limit usage count
        try {
          logger.debug('Updating rate limit usage...');
          const rateLimitResponse = await fetch('/api/rate-limit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId: pendingSessionId }),
          });

          if (!rateLimitResponse.ok) {
            logger.warn('Failed to update rate limit, but continuing...');
          } else {
            const rateLimitData = await rateLimitResponse.json();
            logger.debug('Rate limit updated:', rateLimitData);
          }
        } catch (rateLimitError) {
          logger.error('Error updating rate limit:', rateLimitError);
          // Don't block the user from seeing their results even if rate limit update fails
        }

        // Clean up
        delete (window as any).pendingAnalysis;
        delete (window as any).pendingSessionId;
        delete (window as any).pendingUserEmail;
        delete (window as any).analysisResults;
        sessionStorage.removeItem('pendingFiles');
        sessionStorage.removeItem('pendingUserName');
        sessionStorage.removeItem('pendingSessionId');
      } else {
        logger.warn('No analysis results found!');
      }

      setStats((prev) => ({ ...prev, processingComplete: true }));
    } catch (error) {
      logger.error('Error completing processing:', error);
      // Even if there's an error, we should still proceed to show some results
      // The user has been waiting and deserves to see something
    } finally {
      // Store session ID for Step7 to use
      const sessionIdToUse = activeSessionIdRef.current || pendingSessionId || sessionId;
      logger.debug('Processing complete with session:', sessionIdToUse);
      
      if (sessionIdToUse) {
        sessionStorage.setItem('story-ready-session', sessionIdToUse);
        logger.debug('Stored sessionId in sessionStorage as story-ready-session:', sessionIdToUse);
      } else {
        logger.warn('No sessionId available to store for Step7!');
      }
      
      // Call onComplete to trigger the flow to Step7StoryReady
      logger.debug('Processing complete, calling onComplete callback to transition to Step7');
      onComplete();
    }
  };


  const currentStage = PROCESSING_STAGES[currentStageIndex] || PROCESSING_STAGES[PROCESSING_STAGES.length - 1];

  // Render stats stage (simple text format like target commit)
  const renderStatsStage = () => {
    if (!stats || currentStage.type !== 'stats') return null;

    return (
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: `translate(-50%, -50%) translateY(${isTextVisible ? '0' : '20px'})`,
          opacity: isTextVisible ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div style={{
          fontSize: '24px',
          color: 'rgb(61, 0, 0)',
          lineHeight: '1.3',
          margin: 0,
          fontWeight: 400,
          fontFamily: 'Satoshi, sans-serif',
          opacity: 0.8,
          WebkitFontSmoothing: 'antialiased',
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          {stats.dateRange}<br />
          Messages Found: {stats.messagesFound.toLocaleString()}<br />
          Conversations Detected: {stats.filesProcessed || 1}
        </div>
      </div>
    );
  };

  // Render standard stage (centered vertical layout like original)
  const renderStandardStage = () => (
    <div 
      className="processing-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
        height: '100%',
        padding: '40px 20px',
      }}>
      <div style={{
        opacity: isImageVisible ? 1 : 0,
        transform: isImageVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 6s ease-in-out',
        animation: isImageVisible ? 'breathe 4s ease-in-out infinite' : 'none',
        marginBottom: '0',
      }}>
        {'image' in currentStage && currentStage.image && (
          <OptimizedImage
            src={currentStage.image}
            alt="Processing visualization"
            style={{
              width: '582px',
              height: '582px',
              objectFit: 'contain',
            }}
            priority
          />
        )}
      </div>

      <p style={{
        fontSize: '24px',
        fontWeight: '400',
        color: 'rgb(61, 0, 0)',
        lineHeight: '1.4',
        maxWidth: '800px',
        textAlign: 'center',
        fontFamily: 'Satoshi, sans-serif',
        opacity: isTextVisible ? 1 : 0,
        transform: isTextVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 6s ease-in-out',
        animation: isTextVisible ? 'breathe 4s ease-in-out infinite' : 'none',
        margin: 0,
        padding: '0 20px',
      }}>
        {'text' in currentStage ? currentStage.text : ''}
      </p>
    </div>
  );

  if (processingError) {
    return (
      <div style={{
        backgroundColor: '#F5F2F0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '500px',
        }}>
          <h2 style={{
            fontSize: '24px',
            color: '#ff4444',
            marginBottom: '16px',
          }}>
            Processing Error
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'rgba(61, 0, 0, 0.8)',
            marginBottom: '24px',
          }}>
            {processingError}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgb(61, 0, 0)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 700;
        }
        
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2') format('woff2');
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
        
        @keyframes colorShift {
          0% { color: rgb(61, 0, 0); }
          50% { color: rgb(80, 20, 20); }
          100% { color: rgb(61, 0, 0); }
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 768px) {
          .processing-content img {
            width: 400px !important;
            height: 400px !important;
          }
          
          .processing-content p {
            font-size: 20px !important;
            max-width: 90% !important;
          }
        }

        @media (max-width: 480px) {
          .processing-content img {
            width: 280px !important;
            height: 280px !important;
          }
          
          .processing-content p {
            font-size: 18px !important;
            padding: 0 10px !important;
          }
        }
      `}</style>

      <div style={{
        backgroundColor: '#F5F2F0',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        fontFamily: '"Inter", sans-serif',
        fontSize: '12px',
        lineHeight: '1.15',
        textSizeAdjust: '100%',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0
      }}>
        <section style={{
          alignContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #F5F2F0 0%, #F8F5F3 50%, #F5F2F0 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease-in-out infinite',
          borderBottomLeftRadius: '40px',
          borderBottomRightRadius: '40px',
          display: 'flex',
          flex: 'none',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          gap: '0px',
          height: '100vh',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '0px',
          position: 'relative',
          width: '100%',
          willChange: 'transform'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (isImageVisible || isTextVisible) ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
          }}>
            {currentStage.type === 'stats' ? renderStatsStage() : renderStandardStage()}
          </div>
        </section>
      </div>
    </>
  );
}