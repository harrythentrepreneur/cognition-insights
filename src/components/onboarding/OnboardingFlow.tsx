
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { OnboardingStep, OnboardingFlowProps } from './shared/types';
import WelcomeStep from './Step1Welcome';
import JourneyStep from './Step2Journey';
import StepConnectIntegrations from './StepConnectIntegrations';
import UploadFilesStep from './Step4UploadFiles';
import ProcessingStep from './Step5Processing';
import ResultsStep from './Step6Results';
import { logger } from '@/lib/utils/logger';
import StoryReadyStep from './Step7StoryReady';

const stepComponents = [
  WelcomeStep,
  JourneyStep,
  UploadFilesStep,
  ProcessingStep,
  ResultsStep,
  StoryReadyStep,
];

export default function OnboardingFlow({ 
  initialStep = 'welcome'
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [hasProcessingStarted, setHasProcessingStarted] = useState(false);

  logger.debug(`[OnboardingFlow] Current state:`, {
    currentStep,
    sessionId,
    hasProcessingStarted
  });

  // Helper function to handle transitions - NO DELAYS
  const transitionToStep = useCallback((newStep: OnboardingStep) => {
    logger.debug(`[OnboardingFlow-Transition] Immediate transition to: ${newStep}`);
    setCurrentStep(newStep);
  }, []);

  const handleWelcomeContinue = useCallback(() => {
    transitionToStep('connectIntegrations');
  }, [transitionToStep]);

  const handleIntegrationsContinue = useCallback(() => {
    window.location.href = '/ad-tracker';
  }, []);

  const handleJourneyContinue = useCallback(() => {
    transitionToStep('uploadFiles');
  }, [transitionToStep]);


  const handleProcessingComplete = useCallback((sessionId: string) => {
    logger.debug(`[OnboardingFlow] handleProcessingComplete called with sessionId: ${sessionId}`);
    
    // Prevent duplicate processing
    if (hasProcessingStarted) {
      logger.warn(`[OnboardingFlow] Processing already started, ignoring duplicate call`);
      return;
    }
    
    setHasProcessingStarted(true);
    setSessionId(sessionId);
    logger.debug(`[OnboardingFlow] SessionId state set to: ${sessionId}`);
    transitionToStep('processing');
  }, [transitionToStep, hasProcessingStarted]);

  const handleProcessingFinish = useCallback(() => {
    // Go to Step7StoryReady to show the video
    logger.debug('[OnboardingFlow] Processing finished, transitioning to storyReady step');
    transitionToStep('storyReady');
  }, [transitionToStep]);

  const handleStoryReadyComplete = useCallback(() => {
    // If we somehow end up here, go to emotional landscapes
    if (sessionId) {
      window.location.href = `/emotional-landscapes?session=${sessionId}`;
    } else {
      transitionToStep('results');
    }
  }, [transitionToStep, sessionId]);

  const handleStartOver = useCallback(() => {
    transitionToStep('welcome');
    setSessionId(undefined);
    setHasProcessingStarted(false);
  }, [transitionToStep]);

  // Render the current step with transition wrapper
  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onContinue={handleWelcomeContinue} />;
      
      case 'connectIntegrations':
        return <StepConnectIntegrations onContinue={handleIntegrationsContinue} />;

      case 'journey':
        return <JourneyStep onContinue={handleJourneyContinue} />;
      
      
      case 'uploadFiles':
        return <UploadFilesStep onProcessingComplete={handleProcessingComplete} />;
      
      case 'processing':
        return <ProcessingStep sessionId={sessionId} onComplete={handleProcessingFinish} />;
      
      case 'storyReady':
        logger.debug(`[OnboardingFlow-renderStep] Rendering StoryReadyStep with sessionId: ${sessionId}`);
        // Determine if we should verify - real sessions need verification
        const shouldVerify = Boolean(sessionId && !sessionId.startsWith('mock-session-'));
        logger.debug(`[OnboardingFlow-renderStep] Should verify ready state: ${shouldVerify}`);
        return (
          <StoryReadyStep 
            sessionId={sessionId}
            onComplete={handleStoryReadyComplete}
            verifyReady={shouldVerify}
          />
        );
      
      case 'results':
        logger.debug(`[OnboardingFlow-renderStep] Rendering ResultsStep with sessionId: ${sessionId}`);
        return <ResultsStep sessionId={sessionId} onStartOver={handleStartOver} />;
      
      default:
        return <WelcomeStep onContinue={handleWelcomeContinue} />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#F5F2F0'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 1
      }}>
        {renderStep()}
      </div>
    </div>
  );
} 