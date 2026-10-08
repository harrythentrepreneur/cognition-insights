'use client';

import React from 'react';
import PageLayout from '@/components/shared/PageLayout';
import { LanguagePatternsSection } from './components/LanguagePatternsSection';
import ComingSoonOverlay from '@/components/shared/ComingSoonOverlay';

/**
 * Language Patterns Page
 * 
 * Features:
 * - Linguistic analysis
 * - Communication style evolution
 * - Vocabulary patterns
 * - Language complexity metrics
 */
export default function LanguagePatternsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ session?: string; sessionId?: string }> 
}) {
  const params = React.use(searchParams);
  const sessionId = params.session || params.sessionId;
  
  return (
    <PageLayout activeSection="language-patterns" hideBottomNav={true}>
      <LanguagePatternsSection sessionId={sessionId} />
      <ComingSoonOverlay 
        feature="Language Patterns" 
        subMessage="We're enhancing the linguistic analysis to reveal deeper insights into your communication style and vocabulary evolution."
      />
    </PageLayout>
  );
} 