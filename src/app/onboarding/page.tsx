'use client';

import React from 'react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

/**
 * Onboarding Page
 * 
 * Dedicated onboarding route that displays the complete flow.
 * This page provides the full step-by-step experience:
 * 1. Welcome introduction
 * 2. Journey explanation  
 * 3. File upload process
 * 4. Processing & analysis
 * 5. Story ready notification
 * 6. Results presentation
 */
export default function OnboardingPage() {
  return <OnboardingFlow initialStep="welcome" />;
} 