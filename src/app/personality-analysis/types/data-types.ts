/**
 * Type definitions for personality analysis data structures
 * These types ensure proper null safety and data structure consistency
 */

export interface PersonalityMetrics {
  extraversion?: number;
  openness?: number;
  conscientiousness?: number;
  agreeableness?: number;
  emotional_stability?: number;
  optimism?: number;
  resilience?: number;
  adaptability?: number;
  leadership_tendency?: number;
  analytical_thinking?: number;
  creativity?: number;
  empathy?: number;
  spontaneity?: number;
  perfectionism?: number;
  social_confidence?: number;
  expressiveness?: number;
  responsiveness?: number;
  [key: string]: number | undefined; // Allow additional metrics
}

export interface EmotionalInertiaData {
  score: number;
  by_emotion?: {
    [emotion: string]: {
      average_duration_hours: number;
      max_duration_hours: number;
      frequency: number;
    };
  };
  average_duration_hours?: number;
  longest_streak?: {
    emotion: string;
    duration_hours: number;
  };
}

export interface TriggerWord {
  word: string;
  frequency: number;
  negative_impact: number;
  category?: string;
}

export interface ProactiveReactiveData {
  proactive_score: number;
  reactive_score: number;
  initiative_ratio: number;
  examples?: {
    proactive?: string[];
    reactive?: string[];
  };
}

export interface ConfidenceDataPoint {
  timestamp: string;
  week: string;
  assertive_score: number;
  hesitant_score: number;
  overall_confidence: number;
  message_count: number;
}

export interface EmotionalClockData {
  hour: number;
  dominant_emotion: string;
  intensity: number;
  confidence: number;
  message_count: number;
}

export interface BehavioralInsight {
  id: string;
  type: 'strength' | 'growth-area' | 'insight';
  title: string;
  description: string;
  confidence: number;
  evidence?: string[];
  implications?: string[];
  actionable: boolean;
}

export interface NetworkNode {
  id: string;
  name: string;
  group: 'self' | 'close' | 'frequent' | 'occasional';
  messageCount: number;
  relationshipStrength: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  value: number;
  messageCount: number;
}

export interface ComparativePeriod {
  name: string;
  startDate: string;
  endDate: string;
  metrics: {
    confidence?: number;
    assertiveness?: number;
    proactivity?: number;
    emotional_stability?: number;
    social_engagement?: number;
    message_count?: number;
    [key: string]: number | undefined;
  };
}

export interface PersonalitySummary {
  total_messages_analyzed?: number;
  user_message_count?: number;
  dominant_trait?: string;
  analysis_timestamp?: string;
  chat_duration_days?: number;
}

export interface PersonalityData {
  personality_metrics?: PersonalityMetrics;
  emotional_inertia?: EmotionalInertiaData;
  trigger_words?: TriggerWord[];
  proactive_reactive?: ProactiveReactiveData;
  confidence_timeline?: ConfidenceDataPoint[];
  emotional_clock?: EmotionalClockData[];
  behavioral_insights?: BehavioralInsight[];
  summary?: PersonalitySummary;
  social_network?: {
    nodes?: NetworkNode[];
    links?: NetworkLink[];
  };
  comparative_analysis?: {
    periods?: ComparativePeriod[];
  };
  growth_metrics?: {
    growthRate?: number;
    averageConfidence?: number;
    peakConfidence?: number;
    troughConfidence?: number;
    volatility?: number;
    trend?: 'upward' | 'downward' | 'stable';
  };
  /**
   * Rich narrative strings and AI-generated sections for the report.
   * The structure is loosely typed (any) so backend can evolve without
   * breaking the front-end. Each chapter (executive_summary, life_narrative…)
   * may live under this object.
   */
  narrative_content?: any;

  /**
   * Evidence snippets and confidence scores used to justify trait scores.
   *  { traitName: { evidence: string[]; confidence: number } }
   */
  trait_evidence?: Record<string, { evidence?: string[]; confidence?: number }>;
}

// Default values for safe initialization
export const DEFAULT_PERSONALITY_METRICS: PersonalityMetrics = {
  extraversion: 50,
  openness: 50,
  conscientiousness: 50,
  agreeableness: 50,
  emotional_stability: 50,
};

export const DEFAULT_EMOTIONAL_INERTIA: EmotionalInertiaData = {
  score: 50,
  by_emotion: {},
  average_duration_hours: 0,
};

export const DEFAULT_PROACTIVE_REACTIVE: ProactiveReactiveData = {
  proactive_score: 50,
  reactive_score: 50,
  initiative_ratio: 0.5,
  examples: {
    proactive: [],
    reactive: [],
  },
};

// Type guards
export function isValidPersonalityData(data: any): data is PersonalityData {
  return data && typeof data === 'object';
}

export function hasPersonalityMetrics(data: PersonalityData): boolean {
  return Boolean(data.personality_metrics && Object.keys(data.personality_metrics).length > 0);
}

export function hasEmotionalData(data: PersonalityData): boolean {
  return Boolean(data.emotional_inertia || data.emotional_clock?.length);
}

export function hasSocialData(data: PersonalityData): boolean {
  return Boolean(data.social_network?.nodes?.length && data.social_network?.links?.length);
}