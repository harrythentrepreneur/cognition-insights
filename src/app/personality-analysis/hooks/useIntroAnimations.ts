import { useState, useEffect, useCallback, useRef } from 'react';

interface AnimationState {
  isLoaded: boolean;
  imageLoaded: boolean;
  headingLoaded: boolean;
  subtitleLoaded: boolean;
  buttonLoaded: boolean;
  isTransitioning: boolean;
  showAnalysisReport: boolean;
}

// Animation timing sequences - matching growth journey
const INTRO_ANIMATION_DELAYS = {
  INITIAL_LOAD: 300,
  IMAGE_LOAD: 600,
  HEADING_LOAD: 1200,
  SUBTITLE_LOAD: 1800,
  BUTTON_LOAD: 2400
} as const;

// Animation Management Hook for Personality Intro
export function usePersonalityIntroAnimations() {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isLoaded: false,
    imageLoaded: false,
    headingLoaded: false,
    subtitleLoaded: false,
    buttonLoaded: false,
    isTransitioning: false,
    showAnalysisReport: false
  });

  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear any existing timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    // Vertical cinematic animation sequence
    const timeouts = [
      setTimeout(() => setAnimationState(prev => ({ ...prev, isLoaded: true })), INTRO_ANIMATION_DELAYS.INITIAL_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, imageLoaded: true })), INTRO_ANIMATION_DELAYS.IMAGE_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, headingLoaded: true })), INTRO_ANIMATION_DELAYS.HEADING_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, subtitleLoaded: true })), INTRO_ANIMATION_DELAYS.SUBTITLE_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, buttonLoaded: true })), INTRO_ANIMATION_DELAYS.BUTTON_LOAD)
    ];

    timeoutRefs.current = timeouts;

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const startTransition = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isTransitioning: true }));
    
    // Show analysis report after transition
    setTimeout(() => {
      setAnimationState(prev => ({ ...prev, showAnalysisReport: true }));
    }, 1000);
  }, []);

  const resetAnimations = useCallback(() => {
    setAnimationState({
      isLoaded: false,
      imageLoaded: false,
      headingLoaded: false,
      subtitleLoaded: false,
      buttonLoaded: false,
      isTransitioning: false,
      showAnalysisReport: false
    });
  }, []);

  return {
    animationState,
    startTransition,
    resetAnimations
  };
}