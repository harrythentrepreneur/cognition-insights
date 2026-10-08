import { 
  LinguisticPattern, 
  VocabularyMetric, 
  CommunicationStyleData, 
  ComplexityTrend, 
  LanguageInsight 
} from './types';
import { 
  MOCK_LINGUISTIC_PATTERNS,
  MOCK_VOCABULARY_METRICS,
  MOCK_COMMUNICATION_STYLES,
  MOCK_COMPLEXITY_TRENDS,
  MOCK_LANGUAGE_INSIGHTS,
  MOCK_LANGUAGE_TIMELINE_EVENTS
} from './constants';
import { HabitImpact } from '../../components/shared/types/insights';
import { TimelineEvent } from '../../components/shared/types/timeline';

export const transformLinguisticToHabitImpact = (patterns: LinguisticPattern[]): HabitImpact[] => {
  return patterns.map(pattern => {
    let impact = 0;
    if (pattern.trend === 'increasing') {
      impact = pattern.frequency;
    } else if (pattern.trend === 'decreasing') {
      impact = -pattern.frequency;
    }
    
    return {
      id: pattern.id,
      habit: pattern.pattern,
      impact: impact,
      category: pattern.category,
      description: `Frequency: ${pattern.frequency}%, Trend: ${pattern.trend}`,
    };
  });
};

export const transformLinguisticToTimelineEvent = (patterns: LinguisticPattern[]): TimelineEvent[] => {
  return patterns.map(pattern => ({
    id: pattern.id,
    title: pattern.pattern,
    time: '', // Linguistic patterns don't have a time
    day: pattern.timeframe,
    emotion: pattern.trend,
    intensity: pattern.frequency,
    description: `Category: ${pattern.category}`,
  }));
};

export const transformVocabularyToHabitImpact = (metrics: VocabularyMetric[]): HabitImpact[] => {
  return metrics.map(metric => ({
    id: metric.id,
    habit: `Vocabulary in ${metric.period}`,
    impact: metric.complexityScore * 10,
    category: 'vocabulary',
    description: `${metric.uniqueWords} unique words, ${metric.diversityIndex.toFixed(2)} diversity index`,
  }));
};

export const transformCommunicationStylesToHabitImpact = (styles: CommunicationStyleData[]): HabitImpact[] => {
  return styles.map(style => ({
    id: style.id,
    habit: `${style.style.charAt(0).toUpperCase() + style.style.slice(1)} communication`,
    impact: style.frequency,
    category: 'communication_style',
    description: `${style.frequency}% usage, ${style.effectiveness.toFixed(1)} effectiveness score`,
  }));
};

export const transformComplexityTrendsToHabitImpact = (trends: ComplexityTrend[]): HabitImpact[] => {
  return trends.map(trend => ({
    id: trend.id,
    habit: trend.metric,
    impact: trend.change * 10,
    category: 'complexity',
    description: `${trend.trend} trend, ${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)} change`,
  }));
};

export const transformLanguageInsightsToHabitImpact = (insights: LanguageInsight[]): HabitImpact[] => {
  return insights.map(insight => ({
    id: insight.id,
    habit: insight.title,
    impact: insight.confidence * 100,
    category: insight.category,
    description: `${insight.type} - ${insight.confidence * 100}% confidence`,
  }));
};

export const transformLanguageTimelineEvents = (events: any[]): TimelineEvent[] => {
  return events.map(event => ({
    id: event.id,
    title: event.title,
    time: event.time,
    day: event.day,
    emotion: event.emotion,
    intensity: event.intensity,
    description: event.description,
  }));
};

// Helper function to get comprehensive language data
export const getLanguageAnalysisData = () => {
  return {
    patterns: MOCK_LINGUISTIC_PATTERNS,
    vocabulary: MOCK_VOCABULARY_METRICS,
    styles: MOCK_COMMUNICATION_STYLES,
    trends: MOCK_COMPLEXITY_TRENDS,
    insights: MOCK_LANGUAGE_INSIGHTS,
    timelineEvents: MOCK_LANGUAGE_TIMELINE_EVENTS,
  };
};

// Helper function to generate language pattern insights
export const generateLanguageInsights = (patterns: LinguisticPattern[]) => {
  const increasingPatterns = patterns.filter(p => p.trend === 'increasing');
  const decreasingPatterns = patterns.filter(p => p.trend === 'decreasing');
  const highFrequencyPatterns = patterns.filter(p => p.frequency > 70);
  
  return {
    growingPatterns: increasingPatterns.length,
    decliningPatterns: decreasingPatterns.length,
    dominantPatterns: highFrequencyPatterns.length,
    averageSignificance: patterns.reduce((sum, p) => sum + p.significance, 0) / patterns.length,
  };
};

// Transform language habit impacts to insights format for clearer reflections
export const transformLanguageHabitsToInsights = (habits: any[]): HabitImpact[] => {
  return habits.map(habit => ({
    id: habit.id,
    habit: habit.habit,
    impact: habit.impact,
    category: habit.category,
    description: habit.description
  }));
}; 