'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PageLayout from '@/components/shared/PageLayout';
import { EmotionalLandscapesSection } from './components/EmotionalLandscapesSection';
import { ClearDataButton } from '@/components/debug/ClearDataButton';
import { emptyStateStyles } from './styles/ui-states';
import ViewportController from './components/ViewportController';
import './styles/mobile-desktop-view.css';
import { logger } from '@/lib/utils/logger';

/**
 * Inner component that uses useSearchParams
 */
function EmotionalLandscapesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get session ID directly from search params, with fallback to sessionStorage
  const urlSessionId = searchParams.get('session') || searchParams.get('sessionId') || '';
  const [sessionId, setSessionId] = useState<string>('');
  const [key, setKey] = useState(0); // Force re-render when session changes
  const [isInitialized, setIsInitialized] = useState(false); // Prevent flash
  
  // Track previous session ID to detect changes
  const [prevSessionId, setPrevSessionId] = useState<string>('');
  
  useEffect(() => {
    // Try to get session ID from URL first, then from sessionStorage
    let effectiveSessionId = urlSessionId;
    
    if (!effectiveSessionId) {
      const storedSession = sessionStorage.getItem('emotional-landscapes-session');
      if (storedSession) {
        logger.debug('Recovering session ID from sessionStorage:', storedSession);
        effectiveSessionId = storedSession;
        
        // Restore the URL with the session parameter
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('session', storedSession);
        const newUrl = `${pathname}?${newParams.toString()}`;
        router.replace(newUrl, { scroll: false });
      }
    }
    
    logger.debug('EmotionalLandscapesPage params:', {
      urlSessionId,
      effectiveSessionId,
      prevSessionId,
      searchParams: Object.fromEntries(searchParams.entries())
    });
    
    // Update session ID state
    setSessionId(effectiveSessionId);
    
    // Force re-render if session changed
    if (effectiveSessionId !== prevSessionId) {
      logger.debug('Session ID changed from', prevSessionId, 'to', effectiveSessionId);
      setPrevSessionId(effectiveSessionId);
      setKey(prev => prev + 1);
    }
    
    // Store session ID in sessionStorage as backup
    if (effectiveSessionId) {
      sessionStorage.setItem('emotional-landscapes-session', effectiveSessionId);
    }
    
    // Mark as initialized after a small delay
    setTimeout(() => {
      setIsInitialized(true);
    }, 100);
  }, [urlSessionId, prevSessionId]);
  
  const useMockData = searchParams.get('mock') === 'true';

  logger.debug('EmotionalLandscapesPage render:', {
    sessionId,
    urlSessionId,
    useMockData,
    key
  });

  // Don't render anything until initialized to prevent flash
  if (!isInitialized) {
    return null;
  }
  
  // Show error message only after initialization if no session AND not using mock data
  if (!sessionId && !useMockData) {
    return (
      <PageLayout activeSection="emotional-landscapes" hideBottomNav={true}>
        <div style={emptyStateStyles.container}>
          <div style={emptyStateStyles.message}>No Analysis Session Found</div>
          <div style={emptyStateStyles.subMessage}>
            Please complete the WhatsApp analysis first to view your emotional landscapes.
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activeSection="emotional-landscapes" hideBottomNav={true}>
      <EmotionalLandscapesSection 
        key={`${key}-${sessionId}`} // Force re-render when session changes
        sessionId={sessionId}
        useMockData={useMockData}
      />
      <ClearDataButton />
    </PageLayout>
  );
}

/**
 * Main Emotional Landscapes Page Component
 * 
 * Features:
 * - Navigation between different analysis sections
 * - Emotional Landscapes section with timeline, circumplex, and heatmaps
 * - Real data integration via sessionId URL parameter
 * - Responsive design with backdrop blur effects
 */
export default function EmotionalLandscapesPage() {
  return (
    <div id="emotional-landscapes-viewport-wrapper">
      <ViewportController />
      <Suspense fallback={<div>Loading...</div>}>
        <EmotionalLandscapesContent />
      </Suspense>
    </div>
  );
} 