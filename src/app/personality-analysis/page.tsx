'use client';

import React, { useRef } from 'react';
import PageLayout from '@/components/shared/PageLayout';
import PersonalityIntro from './components/PersonalityIntro';
import { PersonalityAnalysisSection } from './components/PersonalityAnalysisSection';
import { usePersonalityIntroAnimations } from './hooks/useIntroAnimations';
import ComingSoonOverlay from '@/components/shared/ComingSoonOverlay';

/**
 * Personality Analysis Page
 * 
 * Features:
 * - Beautiful intro section with growth journey styling
 * - Personality trait analysis
 * - Behavioral patterns
 * - Psychological insights
 * - Character development tracking
 */
export default function PersonalityAnalysisPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ session?: string; sessionId?: string }> 
}) {
  const params = React.use(searchParams);
  const sessionId = params.session || params.sessionId;
  const { animationState, startTransition } = usePersonalityIntroAnimations();
  const analysisRef = useRef<HTMLDivElement>(null);
  
  // Debug logging
  React.useEffect(() => {
    console.log('[DEBUG] PersonalityAnalysisPage mounted');
    console.log('  - Search params:', params);
    console.log('  - Session ID:', sessionId);
    console.log('  - Full URL:', window.location.href);
    console.log('  - Has valid session ID:', !!sessionId && sessionId !== 'demo-session');
  }, [params, sessionId]);
  
  const handleBeginAnalysis = () => {
    console.log('[DEBUG] Begin analysis clicked');
    startTransition();
    
    // Smooth scroll to analysis section after brief delay
    setTimeout(() => {
      console.log('[DEBUG] Scrolling to analysis section');
      analysisRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 800);
  };

  return (
    <PageLayout 
        activeSection="personality-analysis"
        hideBlurEffects={true}
        hideBottomNav={true}
        navigationTransition={{
          isTransitioning: animationState.isTransitioning
        }}
      >
        {/* Intro Section */}
        <div style={{
          minHeight: 'auto',
          opacity: animationState.isTransitioning ? 0 : 1,
          transform: animationState.isTransitioning ? 'scale(0.98) translateY(-10px)' : 'scale(1) translateY(0px)',
          filter: animationState.isTransitioning ? 'blur(8px) brightness(0.7) saturate(0.8)' : 'blur(0px) brightness(1) saturate(1)',
          transition: 'all 2.2s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'opacity, transform, filter'
        }}>
          <PersonalityIntro
            sessionId={sessionId}
            onBeginAnalysis={handleBeginAnalysis}
            animationState={animationState}
            isTransitioning={animationState.isTransitioning}
          />
        </div>

        {/* Analysis Section */}
        <div ref={analysisRef}>
          <PersonalityAnalysisSection 
            sessionId={sessionId} 
            useMockData={!sessionId || sessionId === 'demo-session'} 
          />
        </div>
        
      </PageLayout>
  );
} 