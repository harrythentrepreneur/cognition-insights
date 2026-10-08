'use client';

import React from 'react';
import { JourneyCanvasProps } from '../types';
import ScrollDrivenExperience from './ScrollDrivenExperience';

/**
 * JourneyCanvas Component
 * 
 * The main container for the Growth Journey experience after the intro transition.
 * Now integrates the scroll-driven page transitions template.
 */
export default function JourneyCanvas({
  sessionId,
  onStageComplete,
  onJourneyComplete
}: JourneyCanvasProps) {

  const handleStageComplete = (stageId: string) => {
    console.log(`Stage completed: ${stageId}`);
    // Call the parent callback if provided
    onStageComplete?.(stageId);
  };

  const handleJourneyComplete = () => {
    console.log('Journey completed!');
    // Call the parent callback if provided
    onJourneyComplete?.();
  };

  return (
    <ScrollDrivenExperience
      onStageComplete={handleStageComplete}
      onJourneyComplete={handleJourneyComplete}
    />
  );
} 