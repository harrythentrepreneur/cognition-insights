'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageLayout from '@/components/shared/PageLayout';
import { RelationshipsNetworkSection } from './components/RelationshipsNetworkSection';

/**
 * Relationships Network Page Content
 * Separated to use hooks inside Suspense boundary
 */
function RelationshipsNetworkContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || searchParams.get('sessionId') || undefined;
  
  console.log('[RELATIONSHIPS-PAGE] URL params:', {
    session: searchParams.get('session'),
    sessionId: searchParams.get('sessionId'),
    finalSessionId: sessionId
  });
  
  return (
    <RelationshipsNetworkSection sessionId={sessionId} />
  );
}

/**
 * Relationships Network Page
 * 
 * Features:
 * - Social network analysis
 * - Relationship dynamics
 * - Communication patterns
 * - Network visualization
 */
export default function RelationshipsNetworkPage() {
  return (
    <PageLayout activeSection="relationships-network" hideBottomNav={true}>
      <Suspense fallback={<div>Loading...</div>}>
        <RelationshipsNetworkContent />
      </Suspense>
    </PageLayout>
  );
} 