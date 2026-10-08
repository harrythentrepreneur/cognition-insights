// Personality Analysis Timeline Data Patterns
// This file contains personality-specific data patterns and significant events

export interface SignificantEvent {
  id: string;
  timestamp: Date;
  targetEmotion: string;
  title: string;
  description: string;
  category: string;
  emotionalImpact: number;
  relatedEmotions: string[];
  messageCount: number;
  color: string;
}

// Personality patterns that match different types of psychological traits and behavioral patterns - now with weekly cycles
export const PERSONALITY_DATA_PATTERNS: Record<string, (i: number) => number> = {
  // Big Five Personality Traits
  'openness-experience': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.sin(i / 20) * 0.2)), // Openness cycles over 5 months
  'conscientiousness': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.cos(i / 15) * 0.25) + (i * 0.0008)), // Conscientiousness growth over 3.75 months
  'extraversion': (i) => Math.max(0.2, Math.random() * 0.8 + (Math.sin(i / 12) * 0.3)), // Extraversion cycles over 3 months
  'agreeableness': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.cos(i / 18) * 0.2)), // Agreeableness over 4.5 months
  'neuroticism': (i) => Math.max(0.1, Math.random() * 0.5 + (Math.sin(i / 25) * -0.15) + (i * -0.0005)), // Decreasing neuroticism over 6.25 months
  
  // Cognitive Styles
  'analytical-thinking': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 16) * 0.25) + (i * 0.0006)), // Analytical growth over 4 months
  'creative-thinking': (i) => Math.max(0.3, Math.random() * 0.8 + (Math.cos(i / 14) * 0.3)), // Creative thinking over 3.5 months
  'strategic-planning': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.sin(i / 22) * 0.2) + (i * 0.0007)), // Strategic development over 5.5 months
  'intuitive-processing': (i) => Math.max(0.2, Math.random() * 0.7 + (Math.cos(i / 10) * 0.25)), // Intuitive processing over 2.5 months
  
  // Emotional Patterns
  'emotional-stability': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.sin(i / 18) * 0.2) + (i * 0.0008)), // Emotional stability growth over 4.5 months
  'stress-tolerance': (i) => Math.max(0.2, Math.random() * 0.7 + (Math.cos(i / 15) * 0.25) + (i * 0.001)), // Stress tolerance improvement over 3.75 months
  'optimism-level': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.sin(i / 13) * 0.2)), // Optimism cycles over 3.25 months
  'self-awareness': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.cos(i / 20) * 0.2) + (i * 0.0009)), // Self-awareness growth over 5 months
  
  // Behavioral Traits
  'adaptability': (i) => Math.max(0.3, Math.random() * 0.8 + (Math.sin(i / 11) * 0.3)), // Adaptability over 2.75 months
  'assertiveness': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.cos(i / 17) * 0.2) + (i * 0.0006)), // Assertiveness development over 4.25 months
  'independence': (i) => Math.max(0.4, Math.random() * 0.5 + (Math.sin(i / 19) * 0.15) + (i * 0.0007)), // Independence growth over 4.75 months
  'empathy-level': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.cos(i / 14) * 0.2)), // Empathy levels over 3.5 months
  
  // Leadership & Social Traits
  'leadership-style': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 21) * 0.25) + (i * 0.0008)), // Leadership development over 5.25 months
  'social-confidence': (i) => Math.max(0.2, Math.random() * 0.8 + (Math.cos(i / 12) * 0.3) + (i * 0.001)), // Social confidence growth over 3 months
  'communication-style': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 16) * 0.2)), // Communication style over 4 months
  'influence-capacity': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.cos(i / 23) * 0.2) + (i * 0.0006)), // Influence development over 5.75 months
};

// Significant Personality Events - updated for 3-year weekly timeline
export const MOCK_PERSONALITY_EVENTS: SignificantEvent[] = [
  {
    id: 'personality-event-1',
    timestamp: new Date(Date.now() - 25 * 7 * 24 * 60 * 60 * 1000), // 25 weeks ago
    targetEmotion: 'self-awareness',
    title: 'Self-Discovery Breakthrough',
    description: 'Had a profound moment of self-reflection that revealed core personality patterns and motivations. This insight led to significant behavioral changes.',
    category: 'self-development',
    emotionalImpact: 0.85,
    relatedEmotions: ['self-awareness', 'emotional-stability', 'strategic-planning'],
    messageCount: 14,
    color: '#9D4EDD'
  },
  {
    id: 'personality-event-2', 
    timestamp: new Date(Date.now() - 18 * 7 * 24 * 60 * 60 * 1000), // 18 weeks ago
    targetEmotion: 'leadership-style',
    title: 'Leadership Evolution',
    description: 'Discovered authentic leadership style through challenging team situation. Learned to balance assertiveness with empathy and collaborative decision-making.',
    category: 'leadership-growth',
    emotionalImpact: 0.78,
    relatedEmotions: ['leadership-style', 'assertiveness', 'empathy-level'],
    messageCount: 11,
    color: '#FFD700'
  },
  {
    id: 'personality-event-3',
    timestamp: new Date(Date.now() - 10 * 7 * 24 * 60 * 60 * 1000), // 10 weeks ago
    targetEmotion: 'stress-tolerance',
    title: 'Stress Mastery Achievement',
    description: 'Successfully managed high-pressure situation without compromising values or well-being. Demonstrated significant growth in stress tolerance and emotional regulation.',
    category: 'emotional-mastery',
    emotionalImpact: 0.72,
    relatedEmotions: ['stress-tolerance', 'emotional-stability', 'adaptability'],
    messageCount: 9,
    color: '#45B7D1'
  },
  {
    id: 'personality-event-4',
    timestamp: new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000), // 5 weeks ago
    targetEmotion: 'creative-thinking',
    title: 'Creative Problem-Solving Win',
    description: 'Solved complex challenge through innovative thinking and creative approach. Showcased enhanced cognitive flexibility and creative problem-solving abilities.',
    category: 'cognitive-development',
    emotionalImpact: 0.68,
    relatedEmotions: ['creative-thinking', 'analytical-thinking', 'adaptability'],
    messageCount: 7,
    color: '#FF6B9D'
  },
  {
    id: 'personality-event-5',
    timestamp: new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000), // 1 year ago
    targetEmotion: 'conscientiousness',
    title: 'Discipline Transformation',
    description: 'Achieved major breakthrough in personal discipline and organization. Implemented systems that transformed productivity and goal achievement.',
    category: 'behavioral-change',
    emotionalImpact: 0.82,
    relatedEmotions: ['conscientiousness', 'strategic-planning', 'independence'],
    messageCount: 16,
    color: '#00F5D4'
  },
  {
    id: 'personality-event-6',
    timestamp: new Date(Date.now() - 78 * 7 * 24 * 60 * 60 * 1000), // 1.5 years ago
    targetEmotion: 'social-confidence',
    title: 'Social Confidence Milestone',
    description: 'Overcame social anxiety and developed genuine confidence in group settings. This transformation opened new opportunities for connection and leadership.',
    category: 'social-development',
    emotionalImpact: 0.79,
    relatedEmotions: ['social-confidence', 'extraversion', 'communication-style'],
    messageCount: 19,
    color: '#F39C12'
  },
  {
    id: 'personality-event-7',
    timestamp: new Date(Date.now() - 104 * 7 * 24 * 60 * 60 * 1000), // 2 years ago
    targetEmotion: 'emotional-stability',
    title: 'Emotional Equilibrium',
    description: 'Achieved remarkable emotional stability through mindfulness and self-regulation practices. Developed ability to maintain calm center in all situations.',
    category: 'emotional-intelligence',
    emotionalImpact: 0.88,
    relatedEmotions: ['emotional-stability', 'neuroticism', 'self-awareness'],
    messageCount: 21,
    color: '#4ECDC4'
  },
  {
    id: 'personality-event-8',
    timestamp: new Date(Date.now() - 130 * 7 * 24 * 60 * 60 * 1000), // 2.5 years ago
    targetEmotion: 'openness-experience',
    title: 'Curiosity Renaissance',
    description: 'Embraced radical openness to new experiences and perspectives. This shift catalyzed personal growth and expanded worldview significantly.',
    category: 'cognitive-expansion',
    emotionalImpact: 0.76,
    relatedEmotions: ['openness-experience', 'adaptability', 'creative-thinking'],
    messageCount: 12,
    color: '#E74C3C'
  }
];

// Personality insights for tooltips
export const MOCK_PERSONALITY_INSIGHTS = [
  "Demonstrated increased emotional intelligence in challenging situation",
  "Showed enhanced creative problem-solving under pressure",
  "Maintained calm assertiveness during team conflict",
  "Adapted communication style to match audience needs",
  "Balanced analytical thinking with intuitive insights",
  "Exhibited growth in stress tolerance and resilience"
];

// Function to create personality timeline data - now generates 156 weekly data points
export const createPersonalityTimelineData = (items: any[]) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 156 }, (_, i) => ({
      // Generate weekly timestamps: start from 3 years ago, increment by 1 week
      timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
      intensity: PERSONALITY_DATA_PATTERNS[item.id] ? PERSONALITY_DATA_PATTERNS[item.id](i) : Math.max(0.3, Math.random() * 0.6),
    }))
  }));
}; 