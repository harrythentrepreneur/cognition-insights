// Language Patterns Timeline Data Patterns
// This file contains language-specific data patterns and significant events

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

// Language patterns that match different types of communication styles and linguistic trends - now with weekly cycles
export const LANGUAGE_DATA_PATTERNS: Record<string, (i: number) => number> = {
  // Communication Complexity
  'vocabulary-richness': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.sin(i / 18) * 0.2) + (i * 0.0008)), // Vocabulary growth over 4.5 months
  'sentence-complexity': (i) => Math.max(0.2, Math.random() * 0.7 + (Math.cos(i / 15) * 0.25)), // Sentence structure over 3.75 months
  'technical-language': (i) => Math.max(0.3, Math.random() * 0.8 + (Math.sin(i / 20) * 0.2) + (i * 0.0006)), // Technical language growth over 5 months
  'abstract-concepts': (i) => Math.max(0.2, Math.random() * 0.6 + (Math.cos(i / 16) * 0.15) + (i * 0.0007)), // Abstract thinking over 4 months
  
  // Emotional Expression
  'emotional-vocabulary': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 14) * 0.3)), // Emotional expression over 3.5 months
  'sentiment-positivity': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.cos(i / 12) * 0.2) + (i * 0.0005)), // Positivity growth over 3 months
  'empathy-language': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.sin(i / 17) * 0.2)), // Empathetic language over 4.25 months
  'assertiveness-tone': (i) => Math.max(0.2, Math.random() * 0.7 + (Math.cos(i / 19) * 0.25) + (i * 0.0008)), // Assertiveness development over 4.75 months
  
  // Communication Patterns
  'question-frequency': (i) => Math.max(0.3, Math.random() * 0.5 + (Math.sin(i / 13) * 0.2)), // Question asking over 3.25 months
  'active-listening': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.cos(i / 21) * 0.25) + (i * 0.0006)), // Active listening growth over 5.25 months
  'collaborative-language': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.sin(i / 16) * 0.15)), // Collaborative communication over 4 months
  'solution-focused': (i) => Math.max(0.3, Math.random() * 0.8 + (Math.cos(i / 14) * 0.2) + (i * 0.0009)), // Solution-focused language over 3.5 months
  
  // Social Dynamics
  'inclusive-language': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.sin(i / 22) * 0.15) + (i * 0.0007)), // Inclusive language growth over 5.5 months
  'storytelling-skill': (i) => Math.max(0.2, Math.random() * 0.7 + (Math.cos(i / 18) * 0.3)), // Storytelling ability over 4.5 months
  'persuasion-language': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.sin(i / 20) * 0.2) + (i * 0.0008)), // Persuasive communication over 5 months
  'conflict-resolution': (i) => Math.max(0.2, Math.random() * 0.5 + (Math.cos(i / 15) * 0.15) + (i * 0.001)), // Conflict resolution language over 3.75 months
  
  // Linguistic Innovation
  'metaphor-usage': (i) => Math.max(0.3, Math.random() * 0.8 + (Math.sin(i / 11) * 0.25)), // Metaphorical thinking over 2.75 months
  'humor-integration': (i) => Math.max(0.2, Math.random() * 0.6 + (Math.cos(i / 13) * 0.2)), // Humor in communication over 3.25 months
  'cultural-awareness': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 25) * 0.2) + (i * 0.0006)), // Cultural sensitivity over 6.25 months
  'code-switching': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.cos(i / 17) * 0.15)), // Adaptive communication over 4.25 months
  
  // Professional Communication
  'presentation-clarity': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 19) * 0.2) + (i * 0.0008)), // Presentation skills over 4.75 months
  'written-articulation': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.cos(i / 16) * 0.15) + (i * 0.0007)), // Writing clarity over 4 months
  'feedback-quality': (i) => Math.max(0.3, Math.random() * 0.8 + (Math.sin(i / 14) * 0.25) + (i * 0.0009)), // Feedback delivery over 3.5 months
};

// Significant Language Events - updated for 3-year weekly timeline
export const MOCK_LANGUAGE_EVENTS: SignificantEvent[] = [
  {
    id: 'language-event-1',
    timestamp: new Date(Date.now() - 25 * 7 * 24 * 60 * 60 * 1000), // 25 weeks ago
    targetEmotion: 'presentation-clarity',
    title: 'Presentation Mastery',
    description: 'Delivered a complex technical presentation with exceptional clarity and engagement. Demonstrated significant growth in public speaking and communication structure.',
    category: 'public-speaking',
    emotionalImpact: 0.85,
    relatedEmotions: ['presentation-clarity', 'technical-language', 'storytelling-skill'],
    messageCount: 13,
    color: '#9D4EDD'
  },
  {
    id: 'language-event-2', 
    timestamp: new Date(Date.now() - 18 * 7 * 24 * 60 * 60 * 1000), // 18 weeks ago
    targetEmotion: 'conflict-resolution',
    title: 'Diplomatic Language Success',
    description: 'Successfully mediated team conflict using careful, diplomatic language that honored all perspectives. Showcased advanced conflict resolution communication skills.',
    category: 'mediation',
    emotionalImpact: 0.78,
    relatedEmotions: ['conflict-resolution', 'empathy-language', 'collaborative-language'],
    messageCount: 10,
    color: '#45B7D1'
  },
  {
    id: 'language-event-3',
    timestamp: new Date(Date.now() - 10 * 7 * 24 * 60 * 60 * 1000), // 10 weeks ago
    targetEmotion: 'emotional-vocabulary',
    title: 'Emotional Articulation Breakthrough',
    description: 'Found precise words to express complex emotional experiences in team discussion. Demonstrated expanded emotional vocabulary and self-expression abilities.',
    category: 'emotional-expression',
    emotionalImpact: 0.72,
    relatedEmotions: ['emotional-vocabulary', 'empathy-language', 'abstract-concepts'],
    messageCount: 8,
    color: '#FF6B9D'
  },
  {
    id: 'language-event-4',
    timestamp: new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000), // 5 weeks ago
    targetEmotion: 'storytelling-skill',
    title: 'Compelling Narrative Creation',
    description: 'Crafted engaging story that effectively communicated project vision to stakeholders. Demonstrated advanced storytelling and narrative structure abilities.',
    category: 'storytelling',
    emotionalImpact: 0.68,
    relatedEmotions: ['storytelling-skill', 'metaphor-usage', 'persuasion-language'],
    messageCount: 12,
    color: '#00F5D4'
  },
  {
    id: 'language-event-5',
    timestamp: new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000), // 1 year ago
    targetEmotion: 'cultural-awareness',
    title: 'Cross-Cultural Communication Mastery',
    description: 'Successfully navigated complex multicultural business negotiations with culturally appropriate language and sensitivity. Achieved breakthrough understanding.',
    category: 'cultural-communication',
    emotionalImpact: 0.83,
    relatedEmotions: ['cultural-awareness', 'inclusive-language', 'code-switching'],
    messageCount: 16,
    color: '#F39C12'
  },
  {
    id: 'language-event-6',
    timestamp: new Date(Date.now() - 78 * 7 * 24 * 60 * 60 * 1000), // 1.5 years ago
    targetEmotion: 'feedback-quality',
    title: 'Transformative Feedback Delivery',
    description: 'Provided developmental feedback that genuinely inspired team member growth. Mastered the art of constructive, empowering communication.',
    category: 'coaching-communication',
    emotionalImpact: 0.79,
    relatedEmotions: ['feedback-quality', 'empathy-language', 'solution-focused'],
    messageCount: 15,
    color: '#4ECDC4'
  },
  {
    id: 'language-event-7',
    timestamp: new Date(Date.now() - 104 * 7 * 24 * 60 * 60 * 1000), // 2 years ago
    targetEmotion: 'persuasion-language',
    title: 'Influential Communication Achievement',
    description: 'Successfully influenced major organizational decision through compelling, ethical persuasion. Demonstrated mastery of influence without manipulation.',
    category: 'influential-communication',
    emotionalImpact: 0.86,
    relatedEmotions: ['persuasion-language', 'storytelling-skill', 'solution-focused'],
    messageCount: 19,
    color: '#FFD700'
  },
  {
    id: 'language-event-8',
    timestamp: new Date(Date.now() - 130 * 7 * 24 * 60 * 60 * 1000), // 2.5 years ago
    targetEmotion: 'vocabulary-richness',
    title: 'Vocabulary Expansion Milestone',
    description: 'Achieved significant expansion in professional vocabulary through dedicated learning. Enhanced ability to express nuanced ideas with precision.',
    category: 'vocabulary-development',
    emotionalImpact: 0.74,
    relatedEmotions: ['vocabulary-richness', 'technical-language', 'abstract-concepts'],
    messageCount: 11,
    color: '#E74C3C'
  }
];

// Language insights for tooltips
export const MOCK_LANGUAGE_INSIGHTS = [
  "Enhanced clarity in technical explanations",
  "Improved emotional vocabulary in difficult conversations",
  "Demonstrated cultural sensitivity in global communications",
  "Applied storytelling to make complex ideas accessible",
  "Used inclusive language to build team cohesion",
  "Delivered constructive feedback with empathy and precision"
];

// Function to create language timeline data - now generates 156 weekly data points
export const createLanguageTimelineData = (items: any[]) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 156 }, (_, i) => ({
      // Generate weekly timestamps: start from 3 years ago, increment by 1 week
      timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
      intensity: LANGUAGE_DATA_PATTERNS[item.id] ? LANGUAGE_DATA_PATTERNS[item.id](i) : Math.max(0.3, Math.random() * 0.6),
    }))
  }));
}; 