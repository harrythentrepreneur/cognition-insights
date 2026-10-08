import React from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

export interface Emotion {
  id: string;
  name: string;
  color: string;
  icon?: string;
  valence?: number;
  arousal?: number;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType;
}

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  emotion: string;
  intensity: number;
  description?: string;
}

export interface HabitImpact {
  id: string;
  habit: string;
  impact: number;
  category: string;
  description?: string;
}

export interface InsightType {
  id: string;
  title: string;
  icon: string;
  label: string;
  color: string;
  opposite: string | null;
}

export interface EmotionPair {
  id: string;
  label: string;
  emotions: Emotion[];
}

export const EMOTIONS: Emotion[] = [
  // Core emotional states - reordered to spread out default selections
  { id: 'fear', name: 'Fear', color: '#8B5CF6', icon: '😨' },
  { id: 'joy', name: 'Joy', color: '#FFD700', icon: '😊' },
  { id: 'sadness', name: 'Sadness', color: '#00D4FF', icon: '😢' },
  { id: 'surprise', name: 'Surprise', color: '#F59E0B', icon: '😲' },
  { id: 'anger', name: 'Anger', color: '#FF4757', icon: '😠' },
  { id: 'disgust', name: 'Disgust', color: '#10B981', icon: '🤢' },
  { id: 'anticipation', name: 'Anticipation', color: '#9D4EDD', icon: '🤔' },
  { id: 'trust', name: 'Trust', color: '#06D6A0', icon: '🤝' },
  { id: 'love', name: 'Love', color: '#FF6B9D', icon: '😍' },
  { id: 'confusion', name: 'Confusion', color: '#FB8500', icon: '😕' },
  { id: 'excitement', name: 'Excitement', color: '#FF006E', icon: '🤩' },
  { id: 'calm', name: 'Calm', color: '#4ECDC4', icon: '😌' },
  { id: 'hope', name: 'Hope', color: '#45B7D1', icon: '🌟' },
  { id: 'frustration', name: 'Frustration', color: '#E74C3C', icon: '😤' },
  { id: 'gratitude', name: 'Gratitude', color: '#F39C12', icon: '🙏' },
  { id: 'compassion', name: 'Compassion', color: '#A855F7', icon: '💝' },

  // Growth & personal development traits
  { id: 'mental-strength', name: 'Mental Strength', color: '#8B5CF6', icon: '💪' },
  { id: 'mindfulness', name: 'Mindfulness', color: '#9013FE', icon: '🧘' },
  { id: 'impulse-control', name: 'Impulse Control', color: '#FF4757', icon: '⏸️' },
  { id: 'willpower', name: 'Willpower', color: '#E74C3C', icon: '🔥' },
  { id: 'deep-focus', name: 'Deep Focus', color: '#3498DB', icon: '🎯' },
  { id: 'daily-habits', name: 'Daily Habits', color: '#2ECC71', icon: '📅' },
  { id: 'emotional-mastery', name: 'Emotional Mastery', color: '#FF6B9D', icon: '🎭' },
  { id: 'stress-control', name: 'Stress Control', color: '#4ECDC4', icon: '🌊' },
  { id: 'authenticity', name: 'Authenticity', color: '#F39C12', icon: '✨' },
  { id: 'empathy', name: 'Empathy', color: '#A855F7', icon: '💗' },
  { id: 'boundaries', name: 'Boundaries', color: '#95A5A6', icon: '🚧' },
  { id: 'flow-state', name: 'Flow State', color: '#1ABC9C', icon: '🌀' },
  { id: 'learning-speed', name: 'Learning Speed', color: '#9D4EDD', icon: '⚡' },
  { id: 'resilience', name: 'Resilience', color: '#10B981', icon: '🛡️' },
  { id: 'inner-wisdom', name: 'Inner Wisdom', color: '#6C5CE7', icon: '🔮' },
  { id: 'self-discipline', name: 'Self Discipline', color: '#74B9FF', icon: '⚖️' },
  { id: 'creativity', name: 'Creativity', color: '#FD79A8', icon: '🎨' },
  { id: 'patience', name: 'Patience', color: '#81ECEC', icon: '⌛' },
  { id: 'confidence', name: 'Confidence', color: '#FDCB6E', icon: '👑' },
  { id: 'adaptability', name: 'Adaptability', color: '#6C5CE7', icon: '🦎' }
];

export const INSIGHT_TYPES: InsightType[] = [
  { id: 'events', title: 'Timeline', icon: '📅', label: 'Events Timeline', color: DESIGN_TOKENS.colors.accent, opposite: null },
  { id: 'delta', title: 'Reflections', icon: '📊', label: 'Insights Delta', color: DESIGN_TOKENS.colors.accent, opposite: null }
];

export const EMOTION_PAIRS: EmotionPair[] = [
  { id: 'joy-trust', label: 'Valence', emotions: [EMOTIONS[0], EMOTIONS[8]] },
  { id: 'anger-calm', label: 'Activation', emotions: [EMOTIONS[2], EMOTIONS[11]] },
  { id: 'fear-trust', label: 'Security', emotions: [EMOTIONS[3], EMOTIONS[8]] },
  { id: 'love-disgust', label: 'Connection', emotions: [EMOTIONS[5], EMOTIONS[6]] },
  { id: 'anticipation-surprise', label: 'Expectation', emotions: [EMOTIONS[7], EMOTIONS[4]] },
  { id: 'excitement-calm', label: 'Stimulation', emotions: [EMOTIONS[10], EMOTIONS[11]] }
];

export const EMOTION_COLORS: Record<string, string> = {
  joy: '#FFD700',
  anxiety: '#FF6B6B',
  excitement: '#FF006E',
  frustration: '#E74C3C',
  calm: '#4ECDC4',
  gratitude: '#F39C12',
  disappointment: '#8E44AD'
};

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DEFAULT_ACTIVE_EMOTIONS = EMOTIONS.slice(0, 6).reduce((acc, emotion) => {
  acc[emotion.id] = true;
  return acc;
}, {} as Record<string, boolean>);

export const MOCK_HABIT_IMPACTS: HabitImpact[] = [
  {
    id: 'habit-1',
    habit: 'Morning Routine',
    impact: 25,
    category: 'Productivity',
    description: 'Consistent morning habits improve daily mood and energy levels'
  },
  {
    id: 'habit-2',
    habit: 'Digital Detox',
    impact: 15,
    category: 'Wellness',
    description: 'Reducing screen time leads to better sleep and reduced anxiety'
  },
  {
    id: 'habit-3',
    habit: 'Exercise',
    impact: 30,
    category: 'Health',
    description: 'Regular physical activity boosts mood and reduces stress'
  },
  {
    id: 'habit-4',
    habit: 'Social Connection',
    impact: 20,
    category: 'Relationships',
    description: 'Maintaining meaningful relationships supports emotional well-being'
  },
  {
    id: 'habit-5',
    habit: 'Mindfulness',
    impact: 18,
    category: 'Mental Health',
    description: 'Daily mindfulness practices improve emotional regulation'
  },
  {
    id: 'habit-6',
    habit: 'Learning',
    impact: 12,
    category: 'Growth',
    description: 'Continuous learning and skill development boost confidence'
  }
];

export const NavigationIcons = {
  EmotionalLandscapes: () => React.createElement('svg', { viewBox: '0 0 24 24', style: { width: '100%', height: '100%' } }, React.createElement('path', { d: 'M3 3v18h18M9 18V5l7 4-7 4' })),
  RelationshipsNetwork: () => React.createElement('svg', { viewBox: '0 0 24 24', style: { width: '100%', height: '100%' } }, React.createElement('circle', { cx: '12', cy: '7.5', r: '2.5' }), React.createElement('circle', { cx: '17.5', cy: '15.5', r: '2.5' }), React.createElement('circle', { cx: '6.5', cy: '15.5', r: '2.5' }), React.createElement('path', { d: 'M12 10v3.5m4.5 0L12 13.5m-4.5 0L12 13.5' })),
  LanguagePatterns: () => React.createElement('svg', { viewBox: '0 0 24 24', style: { width: '100%', height: '100%' } }, React.createElement('path', { d: 'M4 7V4h16v3M9 20h6M12 4v16M17 7h2M19 10h-2M17 13h2M19 16h-2M5 7H3M3 10h2M5 13H3M3 16h2' })),
  PersonalityAnalysis: () => React.createElement('svg', { viewBox: '0 0 24 24', style: { width: '100%', height: '100%' } }, React.createElement('path', { d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' }), React.createElement('path', { d: 'M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0' })),
  GrowthJourney: () => React.createElement('svg', { viewBox: '0 0 24 24', style: { width: '100%', height: '100%' } }, React.createElement('path', { d: 'M10 3h4v18h-4zM3 10h4v11H3zM17 10h4v11h-4zM3 3h18v5H3z' }))
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'emotional-landscapes', label: 'Emotional Landscapes', icon: NavigationIcons.EmotionalLandscapes },
  { id: 'relationships-network', label: 'Relationships Network', icon: NavigationIcons.RelationshipsNetwork },
  { id: 'language-patterns', label: 'Language Patterns', icon: NavigationIcons.LanguagePatterns },
  { id: 'personality-analysis', label: 'Personality Analysis', icon: NavigationIcons.PersonalityAnalysis },
  { id: 'growth-journey', label: 'Growth Journey', icon: NavigationIcons.GrowthJourney }
]; 