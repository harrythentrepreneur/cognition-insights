import React from 'react';
import { PersonalityData } from '../types/data-types';

interface SafeDataProviderProps {
  data: any;
  children: (safeData: PersonalityData) => React.ReactNode;
  fallbackData?: Partial<PersonalityData>;
}

/**
 * Higher-order component that ensures data safety for all child components
 * Provides default values and null safety
 */
export const SafeDataProvider: React.FC<SafeDataProviderProps> = ({ 
  data, 
  children, 
  fallbackData = {} 
}) => {
  // Ensure data is always an object
  const safeData: PersonalityData = {
    personality_metrics: data?.personality_metrics || fallbackData.personality_metrics || {},
    emotional_inertia: data?.emotional_inertia || fallbackData.emotional_inertia || {
      score: 50,
      by_emotion: {},
      average_duration_hours: 0,
    },
    trigger_words: Array.isArray(data?.trigger_words) ? data.trigger_words : [],
    proactive_reactive: data?.proactive_reactive || fallbackData.proactive_reactive || {
      proactive_score: 50,
      reactive_score: 50,
      initiative_ratio: 0.5,
    },
    confidence_timeline: Array.isArray(data?.confidence_timeline) ? data.confidence_timeline : [],
    emotional_clock: Array.isArray(data?.emotional_clock) ? data.emotional_clock : [],
    behavioral_insights: Array.isArray(data?.behavioral_insights) ? data.behavioral_insights : [],
    summary: data?.summary || fallbackData.summary || {},
    social_network: {
      nodes: Array.isArray(data?.social_network?.nodes) ? data.social_network.nodes : [],
      links: Array.isArray(data?.social_network?.links) ? data.social_network.links : [],
    },
    comparative_analysis: {
      periods: Array.isArray(data?.comparative_analysis?.periods) ? data.comparative_analysis.periods : [],
    },
    growth_metrics: data?.growth_metrics || fallbackData.growth_metrics,
  };

  return <>{children(safeData)}</>;
};

/**
 * Hook to ensure component receives safe data
 */
export function withSafeData<P extends { data: any }>(
  Component: React.ComponentType<P>,
  fallbackData?: Partial<PersonalityData>
): React.FC<P> {
  const WrappedComponent = (props: P) => (
    <SafeDataProvider data={props.data} fallbackData={fallbackData}>
      {(safeData) => <Component {...props} data={safeData} />}
    </SafeDataProvider>
  );
  
  WrappedComponent.displayName = `withSafeData(${Component.displayName || Component.name})`;
  return WrappedComponent;
}