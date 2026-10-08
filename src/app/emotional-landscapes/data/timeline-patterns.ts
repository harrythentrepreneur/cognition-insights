// Emotional Landscapes Timeline Data Patterns
// This file contains emotion-specific data patterns and significant events

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

// Emotional patterns that match different types of emotional states - now with weekly cycles
export const EMOTION_DATA_PATTERNS: Record<string, (i: number) => number> = {
  joy: (i) => Math.max(0.1, Math.random() * 0.8 + (Math.sin(i / 12) * 0.2)), // ~3 month cycles
  sadness: (i) => Math.max(0.1, Math.random() * 0.4 + (Math.cos(i / 16) * 0.15)), // ~4 month cycles
  anger: (i) => Math.max(0.05, Math.random() * 0.3),
  fear: (i) => Math.max(0.05, Math.random() * 0.6 + (Math.sin(i / 10) * 0.15)), // ~2.5 month cycles
  surprise: (i) => Math.max(0.05, Math.random() * 0.4 + (Math.sin(i / 14 + 1) * 0.1)), // ~3.5 month cycles
  love: (i) => Math.max(0.1, Math.random() * 0.6 + (Math.sin(i / 10 + 2) * 0.2)), // ~2.5 month cycles
  disgust: (i) => Math.max(0.1, Math.random() * 0.5 + (Math.cos(i / 18) * 0.1)), // ~4.5 month cycles
  anticipation: (i) => Math.max(0.2, Math.random() * 0.7 + (Math.sin(i / 20) * 0.2)), // ~5 month cycles
  trust: (i) => Math.max(0.1, Math.random() * 0.6 + (Math.cos(i / 12) * 0.15)), // ~3 month cycles
  confusion: (i) => Math.max(0.05, Math.random() * 0.4 + (Math.sin(i / 15 + 2) * 0.1)), // ~3.75 month cycles
  excitement: (i) => Math.max(0.1, Math.random() * 0.7 + (Math.sin(i / 8) * 0.2)), // ~2 month cycles
  calm: (i) => Math.max(0.2, Math.random() * 0.5 + (Math.cos(i / 20) * 0.15)), // ~5 month cycles
  hope: (i) => Math.max(0.1, Math.random() * 0.6 + (Math.sin(i / 17) * 0.2)), // ~4.25 month cycles
  frustration: (i) => Math.max(0.05, Math.random() * 0.5 + (Math.cos(i / 10) * 0.15)), // ~2.5 month cycles
  gratitude: (i) => Math.max(0.1, Math.random() * 0.6 + (Math.sin(i / 15 + 3) * 0.15)), // ~3.75 month cycles
  compassion: (i) => Math.max(0.1, Math.random() * 0.5 + (Math.cos(i / 12 + 1) * 0.2)), // ~3 month cycles
};

// Significant Emotional Events - updated for 3-year weekly timeline
export const MOCK_EMOTIONAL_EVENTS: SignificantEvent[] = [
  {
    id: 'emotion-event-1',
    timestamp: new Date(Date.now() - 25 * 7 * 24 * 60 * 60 * 1000), // 25 weeks ago
    targetEmotion: 'joy',                    // Marker will appear on the joy emotion line
    title: 'Career Breakthrough',
    description: 'Got promoted to senior position after months of hard work. This moment marked a significant shift in confidence and professional growth.',
    category: 'achievement',
    emotionalImpact: 0.85,
    relatedEmotions: ['joy', 'excitement', 'gratitude'],
    messageCount: 12,
    color: '#FFD700'
  },
  {
    id: 'emotion-event-2', 
    timestamp: new Date(Date.now() - 18 * 7 * 24 * 60 * 60 * 1000), // 18 weeks ago
    targetEmotion: 'love',                   // Marker will appear on the love emotion line
    title: 'Family Reunion',
    description: 'Long-awaited family gathering brought everyone together. Reconnecting with loved ones after months of separation created lasting emotional memories.',
    category: 'relationship',
    emotionalImpact: 0.78,
    relatedEmotions: ['love', 'joy', 'gratitude'],
    messageCount: 8,
    color: '#FF6B9D'
  },
  {
    id: 'emotion-event-3',
    timestamp: new Date(Date.now() - 10 * 7 * 24 * 60 * 60 * 1000), // 10 weeks ago
    targetEmotion: 'hope',                   // Marker will appear on the hope emotion line
    title: 'Health Scare Resolution',
    description: 'Medical test results came back clear after weeks of anxiety. The relief and renewed appreciation for health created a profound emotional shift.',
    category: 'health',
    emotionalImpact: 0.72,
    relatedEmotions: ['hope', 'gratitude', 'calm'],
    messageCount: 6,
    color: '#45B7D1'
  },
  {
    id: 'emotion-event-4',
    timestamp: new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000), // 5 weeks ago
    targetEmotion: 'excitement',             // Marker will appear on the excitement emotion line
    title: 'Creative Project Launch',
    description: 'Successfully launched a personal creative project that had been in development for months. The accomplishment brought renewed sense of purpose.',
    category: 'creativity',
    emotionalImpact: 0.68,
    relatedEmotions: ['excitement', 'anticipation', 'joy'],
    messageCount: 9,
    color: '#9D4EDD'
  },
  {
    id: 'emotion-event-5',
    timestamp: new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000), // 1 year ago
    targetEmotion: 'gratitude',
    title: 'Life-Changing Decision',
    description: 'Made a significant life decision that opened new opportunities and perspectives. Looking back, this was a pivotal moment in personal growth.',
    category: 'milestone',
    emotionalImpact: 0.82,
    relatedEmotions: ['gratitude', 'hope', 'excitement'],
    messageCount: 15,
    color: '#F39C12'
  },
  {
    id: 'emotion-event-6',
    timestamp: new Date(Date.now() - 78 * 7 * 24 * 60 * 60 * 1000), // 1.5 years ago
    targetEmotion: 'calm',
    title: 'Meditation Practice Milestone',
    description: 'Completed 100 days of consistent meditation practice. The journey brought profound inner peace and emotional regulation skills.',
    category: 'wellness',
    emotionalImpact: 0.75,
    relatedEmotions: ['calm', 'gratitude', 'trust'],
    messageCount: 7,
    color: '#4ECDC4'
  },
  {
    id: 'emotion-event-7',
    timestamp: new Date(Date.now() - 104 * 7 * 24 * 60 * 60 * 1000), // 2 years ago
    targetEmotion: 'trust',
    title: 'Deep Friendship Formation',
    description: 'Developed a meaningful friendship that provided emotional support during challenging times. Trust and vulnerability created lasting bonds.',
    category: 'relationship',
    emotionalImpact: 0.73,
    relatedEmotions: ['trust', 'love', 'joy'],
    messageCount: 11,
    color: '#06D6A0'
  },
  {
    id: 'emotion-event-8',
    timestamp: new Date(Date.now() - 130 * 7 * 24 * 60 * 60 * 1000), // 2.5 years ago
    targetEmotion: 'hope',
    title: 'Recovery and Renewal',
    description: 'Overcame a challenging period of personal struggle. The experience taught resilience and renewed faith in positive change.',
    category: 'growth',
    emotionalImpact: 0.79,
    relatedEmotions: ['hope', 'gratitude', 'trust'],
    messageCount: 13,
    color: '#45B7D1'
  }
];

// Emotional insights for tooltips
export const MOCK_EMOTIONAL_INSIGHTS = [
  "Feeling grateful for family time this weekend",
  "Work stress is getting overwhelming lately", 
  "Excited about the new project launch",
  "Found peace in morning meditation practice",
  "Navigated difficult conversation with empathy",
  "Celebrated small victory with genuine joy"
];

// Function to create emotional timeline data - now generates 156 weekly data points
export const createEmotionalTimelineData = (items: any[]) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 156 }, (_, i) => ({
      // Generate weekly timestamps: start from 3 years ago, increment by 1 week
      timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
      intensity: EMOTION_DATA_PATTERNS[item.id] ? EMOTION_DATA_PATTERNS[item.id](i) : Math.max(0.1, Math.random() * 0.6),
    }))
  }));
}; 