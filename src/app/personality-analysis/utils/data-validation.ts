import { PersonalityData, PersonalityMetrics, EmotionalInertiaData, ProactiveReactiveData } from '../types/data-types';

/**
 * Comprehensive data validation and sanitization for personality analysis
 */

/**
 * Validates and sanitizes personality metrics
 */
export function validatePersonalityMetrics(metrics: any): PersonalityMetrics {
  if (!metrics || typeof metrics !== 'object') {
    return {};
  }

  const validated: PersonalityMetrics = {};
  
  // Validate each metric is a number between 0-100
  Object.entries(metrics).forEach(([key, value]) => {
    if (typeof value === 'number' && !isNaN(value)) {
      validated[key] = Math.max(0, Math.min(100, value));
    }
  });

  return validated;
}

/**
 * Validates emotional inertia data
 */
export function validateEmotionalInertia(data: any): EmotionalInertiaData {
  const defaultData: EmotionalInertiaData = {
    score: 50,
    by_emotion: {},
    average_duration_hours: 0,
  };

  if (!data || typeof data !== 'object') {
    return defaultData;
  }

  const validated: EmotionalInertiaData = {
    score: typeof data.score === 'number' ? Math.max(0, Math.min(100, data.score)) : 50,
    by_emotion: {},
    average_duration_hours: typeof data.average_duration_hours === 'number' ? Math.max(0, data.average_duration_hours) : 0,
  };

  // Validate by_emotion object
  if (data.by_emotion && typeof data.by_emotion === 'object') {
    Object.entries(data.by_emotion).forEach(([emotion, stats]: [string, any]) => {
      if (stats && typeof stats === 'object') {
        validated.by_emotion![emotion] = {
          average_duration_hours: typeof stats.average_duration_hours === 'number' ? Math.max(0, stats.average_duration_hours) : 0,
          max_duration_hours: typeof stats.max_duration_hours === 'number' ? Math.max(0, stats.max_duration_hours) : 0,
          frequency: typeof stats.frequency === 'number' ? Math.max(0, Math.floor(stats.frequency)) : 0,
        };
      }
    });
  }

  // Validate longest streak
  if (data.longest_streak && typeof data.longest_streak === 'object') {
    validated.longest_streak = {
      emotion: String(data.longest_streak.emotion || 'unknown'),
      duration_hours: typeof data.longest_streak.duration_hours === 'number' ? Math.max(0, data.longest_streak.duration_hours) : 0,
    };
  }

  return validated;
}

/**
 * Validates trigger words array
 */
export function validateTriggerWords(words: any): any[] {
  if (!Array.isArray(words)) {
    return [];
  }

  return words
    .filter(word => word && typeof word === 'object')
    .map(word => ({
      word: String(word.word || ''),
      frequency: typeof word.frequency === 'number' ? Math.max(0, Math.floor(word.frequency)) : 0,
      negative_impact: typeof word.negative_impact === 'number' ? Math.max(0, Math.min(5, word.negative_impact)) : 0,
      category: word.category ? String(word.category) : undefined,
    }))
    .filter(word => word.word.length > 0);
}

/**
 * Validates confidence timeline data
 */
export function validateConfidenceTimeline(timeline: any): any[] {
  if (!Array.isArray(timeline)) {
    return [];
  }

  return timeline
    .filter(point => point && typeof point === 'object')
    .map(point => ({
      timestamp: String(point.timestamp || new Date().toISOString()),
      week: String(point.week || ''),
      assertive_score: typeof point.assertive_score === 'number' ? Math.max(0, Math.min(100, point.assertive_score)) : 50,
      hesitant_score: typeof point.hesitant_score === 'number' ? Math.max(0, Math.min(100, point.hesitant_score)) : 50,
      overall_confidence: typeof point.overall_confidence === 'number' ? Math.max(0, Math.min(100, point.overall_confidence)) : 50,
      message_count: typeof point.message_count === 'number' ? Math.max(0, Math.floor(point.message_count)) : 0,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Validates emotional clock data
 */
export function validateEmotionalClock(clock: any): any[] {
  if (!Array.isArray(clock)) {
    return [];
  }

  return clock
    .filter(hour => hour && typeof hour === 'object')
    .map(hour => ({
      hour: typeof hour.hour === 'number' ? Math.max(0, Math.min(23, Math.floor(hour.hour))) : 0,
      dominant_emotion: String(hour.dominant_emotion || 'neutral'),
      intensity: typeof hour.intensity === 'number' ? Math.max(0, Math.min(100, hour.intensity)) : 50,
      confidence: typeof hour.confidence === 'number' ? Math.max(0, Math.min(100, hour.confidence)) : 50,
      message_count: typeof hour.message_count === 'number' ? Math.max(0, Math.floor(hour.message_count)) : 0,
    }))
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Validates proactive/reactive data
 */
export function validateProactiveReactive(data: any): ProactiveReactiveData {
  const defaultData: ProactiveReactiveData = {
    proactive_score: 50,
    reactive_score: 50,
    initiative_ratio: 0.5,
  };

  if (!data || typeof data !== 'object') {
    return defaultData;
  }

  const proactive = typeof data.proactive_score === 'number' ? Math.max(0, Math.min(100, data.proactive_score)) : 50;
  const reactive = typeof data.reactive_score === 'number' ? Math.max(0, Math.min(100, data.reactive_score)) : 50;
  
  return {
    proactive_score: proactive,
    reactive_score: reactive,
    initiative_ratio: typeof data.initiative_ratio === 'number' ? Math.max(0, Math.min(1, data.initiative_ratio)) : proactive / (proactive + reactive),
    examples: {
      proactive: Array.isArray(data.examples?.proactive) ? data.examples.proactive.filter((s: any) => typeof s === 'string') : [],
      reactive: Array.isArray(data.examples?.reactive) ? data.examples.reactive.filter((s: any) => typeof s === 'string') : [],
    },
  };
}

/**
 * Validates entire personality data object
 */
export function validatePersonalityData(data: any): PersonalityData {
  if (!data || typeof data !== 'object') {
    return {};
  }

  return {
    personality_metrics: validatePersonalityMetrics(data.personality_metrics),
    emotional_inertia: validateEmotionalInertia(data.emotional_inertia),
    trigger_words: validateTriggerWords(data.trigger_words),
    proactive_reactive: validateProactiveReactive(data.proactive_reactive),
    confidence_timeline: validateConfidenceTimeline(data.confidence_timeline),
    emotional_clock: validateEmotionalClock(data.emotional_clock),
    behavioral_insights: Array.isArray(data.behavioral_insights) ? data.behavioral_insights : [],
    summary: data.summary || {},
    social_network: {
      nodes: Array.isArray(data.social_network?.nodes) ? data.social_network.nodes : [],
      links: Array.isArray(data.social_network?.links) ? data.social_network.links : [],
    },
    comparative_analysis: {
      periods: Array.isArray(data.comparative_analysis?.periods) ? data.comparative_analysis.periods : [],
    },
    growth_metrics: data.growth_metrics || undefined,
    // Pass through rich narrative and evidence that are generated by the backend's LLM
    narrative_content: data.narrative_content,
    trait_evidence: data.trait_evidence,
  };
}