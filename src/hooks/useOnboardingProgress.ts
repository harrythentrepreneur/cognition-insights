'use client';

import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export type OnboardingStep = 'signup' | 'payment' | 'welcome';

interface StepConfig {
  id: string;
  label: string;
  path: string;
  encouragingMessage: string;
  subMessage?: string;
}

const STEPS: Record<OnboardingStep, StepConfig> = {
  signup: {
    id: 'signup',
    label: 'Create Account',
    path: '/after-sign-up',
    encouragingMessage: 'Welcome! You\'re just 2 steps away from your insights',
    subMessage: 'Let\'s get you set up',
  },
  payment: {
    id: 'payment',
    label: 'Complete Payment',
    path: '/purchase-success',
    encouragingMessage: 'Almost there! Securing your journey',
    subMessage: 'Processing your payment...',
  },
  welcome: {
    id: 'welcome',
    label: 'Start Journey',
    path: '/welcome',
    encouragingMessage: 'Welcome aboard! Let\'s begin your discovery',
    subMessage: 'Your insights await',
  },
};

export function useOnboardingProgress() {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Determine current step based on pathname and user state
  const getCurrentStep = (): OnboardingStep => {
    if (pathname === '/after-sign-up') return 'signup';
    if (pathname === '/purchase-success' || pathname === '/payment-success') return 'payment';
    if (pathname === '/welcome') return 'welcome';
    
    // Default to signup if on any other page
    return 'signup';
  };

  const currentStep = getCurrentStep();
  const stepOrder: OnboardingStep[] = ['signup', 'payment', 'welcome'];
  const currentStepIndex = stepOrder.indexOf(currentStep);

  // Generate progress steps for the progress bar
  const progressSteps = stepOrder.map((stepKey, index) => {
    const step = STEPS[stepKey];
    const isCompleted = index < currentStepIndex;
    const isCurrent = stepKey === currentStep;
    
    // Special handling for signup step - it's completed if user exists
    const isSignupCompleted = stepKey === 'signup' && !!user && currentStepIndex > 0;
    
    return {
      id: step.id,
      label: step.label,
      completed: isCompleted || isSignupCompleted,
      current: isCurrent,
    };
  });

  const currentStepConfig = STEPS[currentStep];
  
  return {
    currentStep,
    progressSteps,
    encouragingMessage: currentStepConfig.encouragingMessage,
    subMessage: currentStepConfig.subMessage,
    progress: ((currentStepIndex + 1) / stepOrder.length) * 100,
  };
}