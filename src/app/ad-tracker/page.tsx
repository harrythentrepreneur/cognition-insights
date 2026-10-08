'use client';

import React, { Suspense } from 'react';
import PageLayout from '@/components/shared/PageLayout';
import { AdTrackerSection } from './components/AdTrackerSection';
import ViewportController from '../emotional-landscapes/components/ViewportController';
import '../emotional-landscapes/styles/mobile-desktop-view.css';

/**
 * Ad Tracker Page — exact clone of Emotional Landscapes layout
 * with ad metrics (Revenue, Ad Spend, COGS, etc.) instead of emotions
 */
function AdTrackerContent() {
  return (
    <PageLayout activeSection="emotional-landscapes" hideBottomNav={true}>
      <AdTrackerSection useMockData={false} />
    </PageLayout>
  );
}

export default function AdTrackerPage() {
  return (
    <div id="emotional-landscapes-viewport-wrapper" style={{ background: '#1A1A2E', minHeight: '100vh' }}>
      <ViewportController />
      <Suspense fallback={<div style={{ background: '#1A1A2E', minHeight: '100vh' }}>Loading...</div>}>
        <AdTrackerContent />
      </Suspense>
    </div>
  );
}
