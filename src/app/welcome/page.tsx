'use client';

import React, { Suspense } from 'react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

/**
 * Welcome Page (TEMPORARY - Clerk bypassed)
 */
function WelcomePageContent() {
  return (
    <div>
      <OnboardingFlow 
        initialStep={'welcome'} 
      />
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WelcomePageContent />
    </Suspense>
  );
} 