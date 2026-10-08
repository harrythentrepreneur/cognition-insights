import { 
  LinguisticPattern, 
  VocabularyMetric, 
  CommunicationStyleData, 
  ComplexityTrend, 
  LanguageInsight 
} from './types';

export const MOCK_LINGUISTIC_PATTERNS: LinguisticPattern[] = [
  { 
    id: '1', 
    pattern: 'Storytelling', 
    category: 'structure', 
    frequency: 78, 
    trend: 'increasing', 
    significance: 0.9, 
    examples: ['Once...', 'So this happened...', 'Picture this...', 'The funny thing is...'], 
    timeframe: 'Last month' 
  },
  { 
    id: '2', 
    pattern: 'Humor & Wit', 
    category: 'pragmatics', 
    frequency: 65, 
    trend: 'stable', 
    significance: 0.85, 
    examples: ['😂', 'lol', 'ironically...', 'plot twist:', 'classic move'], 
    timeframe: 'Last month' 
  },
  { 
    id: '3', 
    pattern: 'Future Vision', 
    category: 'vocabulary', 
    frequency: 72, 
    trend: 'increasing', 
    significance: 0.8, 
    examples: ['imagine if...', 'what if we could...', 'the future of...', 'next level'], 
    timeframe: 'Last month' 
  },
  { 
    id: '4', 
    pattern: 'Empathy Signals', 
    category: 'sentiment', 
    frequency: 88, 
    trend: 'increasing', 
    significance: 0.95, 
    examples: ['I understand...', 'that must be...', 'I can see why...', 'makes sense'], 
    timeframe: 'Last month' 
  },
  { 
    id: '5', 
    pattern: 'Curiosity Drive', 
    category: 'structure', 
    frequency: 85, 
    trend: 'stable', 
    significance: 0.9, 
    examples: ['I wonder...', 'what if...', 'how does...', 'why do you think...'], 
    timeframe: 'Last month' 
  },
  { 
    id: '6', 
    pattern: 'Authentic Voice', 
    category: 'pragmatics', 
    frequency: 82, 
    trend: 'increasing', 
    significance: 0.88, 
    examples: ['honestly...', 'to be real...', 'not gonna lie...', 'straight up'], 
    timeframe: 'Last month' 
  },
  { 
    id: '7', 
    pattern: 'Creative Metaphors', 
    category: 'vocabulary', 
    frequency: 45, 
    trend: 'increasing', 
    significance: 0.75, 
    examples: ['like a...', 'it\'s basically...', 'think of it as...', 'imagine...'], 
    timeframe: 'Last month' 
  },
  { 
    id: '8', 
    pattern: 'Solution Focus', 
    category: 'grammar', 
    frequency: 77, 
    trend: 'increasing', 
    significance: 0.82, 
    examples: ['we could...', 'what about...', 'let\'s try...', 'how about we...'], 
    timeframe: 'Last month' 
  },
  { 
    id: '9', 
    pattern: 'Hype Energy', 
    category: 'sentiment', 
    frequency: 68, 
    trend: 'fluctuating', 
    significance: 0.7, 
    examples: ['amazing!', 'incredible!', 'no way!', 'this is epic!', 'mind blown'], 
    timeframe: 'Last month' 
  },
  { 
    id: '10', 
    pattern: 'Wisdom Sharing', 
    category: 'pragmatics', 
    frequency: 58, 
    trend: 'increasing', 
    significance: 0.78, 
    examples: ['in my experience...', 'I\'ve learned...', 'pro tip:', 'here\'s the thing...'], 
    timeframe: 'Last month' 
  },
  { 
    id: '11', 
    pattern: 'Connection Building', 
    category: 'structure', 
    frequency: 91, 
    trend: 'stable', 
    significance: 0.92, 
    examples: ['we should...', 'let\'s...', 'together we...', 'what do you think?'], 
    timeframe: 'Last month' 
  },
  { 
    id: '12', 
    pattern: 'Innovation Language', 
    category: 'vocabulary', 
    frequency: 52, 
    trend: 'increasing', 
    significance: 0.65, 
    examples: ['revolutionary', 'game-changer', 'breakthrough', 'next-gen', 'cutting-edge'], 
    timeframe: 'Last month' 
  },
  { 
    id: '13', 
    pattern: 'Vulnerability', 
    category: 'sentiment', 
    frequency: 35, 
    trend: 'increasing', 
    significance: 0.85, 
    examples: ['I struggle with...', 'honestly struggling...', 'not perfect but...', 'learning...'], 
    timeframe: 'Last month' 
  },
  { 
    id: '14', 
    pattern: 'Growth Mindset', 
    category: 'pragmatics', 
    frequency: 74, 
    trend: 'increasing', 
    significance: 0.87, 
    examples: ['getting better at...', 'still learning...', 'room to improve...', 'leveling up'], 
    timeframe: 'Last month' 
  },
  { 
    id: '15', 
    pattern: 'Celebration Mode', 
    category: 'sentiment', 
    frequency: 43, 
    trend: 'stable', 
    significance: 0.72, 
    examples: ['so proud!', 'crushing it!', 'nailed it!', 'victory!', 'achievement unlocked'], 
    timeframe: 'Last month' 
  },
  { 
    id: '16', 
    pattern: 'Deep Thinking', 
    category: 'structure', 
    frequency: 62, 
    trend: 'increasing', 
    significance: 0.8, 
    examples: ['the deeper question...', 'fundamentally...', 'at its core...', 'philosophically...'], 
    timeframe: 'Last month' 
  }
];

export const MOCK_VOCABULARY_METRICS: VocabularyMetric[] = [
  {
    id: 'vocab_1',
    period: 'January 2024',
    uniqueWords: 1847,
    totalWords: 12543,
    averageWordLength: 4.8,
    complexityScore: 7.2,
    formalityLevel: 6.1,
    diversityIndex: 0.78
  },
  {
    id: 'vocab_2',
    period: 'February 2024',
    uniqueWords: 1923,
    totalWords: 13102,
    averageWordLength: 5.1,
    complexityScore: 7.6,
    formalityLevel: 6.4,
    diversityIndex: 0.81
  },
  {
    id: 'vocab_3',
    period: 'March 2024',
    uniqueWords: 2156,
    totalWords: 14367,
    averageWordLength: 5.3,
    complexityScore: 8.1,
    formalityLevel: 6.8,
    diversityIndex: 0.84
  },
  {
    id: 'vocab_4',
    period: 'April 2024',
    uniqueWords: 2034,
    totalWords: 13889,
    averageWordLength: 5.0,
    complexityScore: 7.8,
    formalityLevel: 6.5,
    diversityIndex: 0.82
  }
];

export const MOCK_COMMUNICATION_STYLES: CommunicationStyleData[] = [
  {
    id: 'style_1',
    style: 'casual',
    frequency: 65,
    contexts: ['personal chats', 'friends', 'informal meetings'],
    examples: ['Hey!', 'What\'s up?', 'No worries', 'Sounds good!'],
    emotionalTone: 7.2,
    effectiveness: 8.1
  },
  {
    id: 'style_2',
    style: 'formal',
    frequency: 25,
    contexts: ['work emails', 'presentations', 'official documents'],
    examples: ['Dear Sir/Madam', 'Please find attached', 'I would like to inform'],
    emotionalTone: 5.1,
    effectiveness: 7.8
  },
  {
    id: 'style_3',
    style: 'technical',
    frequency: 15,
    contexts: ['work discussions', 'problem solving', 'documentation'],
    examples: ['API endpoint', 'database schema', 'optimization algorithm'],
    emotionalTone: 4.5,
    effectiveness: 8.9
  },
  {
    id: 'style_4',
    style: 'emotional',
    frequency: 45,
    contexts: ['personal relationships', 'celebrations', 'support'],
    examples: ['So excited!', 'I\'m really sorry', 'You\'re amazing!'],
    emotionalTone: 8.7,
    effectiveness: 7.5
  },
  {
    id: 'style_5',
    style: 'analytical',
    frequency: 35,
    contexts: ['decision making', 'planning', 'reviews'],
    examples: ['Based on the data', 'The analysis shows', 'Considering the factors'],
    emotionalTone: 4.8,
    effectiveness: 8.3
  },
  {
    id: 'style_6',
    style: 'creative',
    frequency: 30,
    contexts: ['brainstorming', 'storytelling', 'inspiration'],
    examples: ['Imagine if...', 'What if we tried...', 'Picture this...'],
    emotionalTone: 7.8,
    effectiveness: 7.9
  }
];

export const MOCK_COMPLEXITY_TRENDS: ComplexityTrend[] = [
  {
    id: 'trend_1',
    metric: 'Average sentence length',
    values: [
      { period: 'Jan', value: 12.3 },
      { period: 'Feb', value: 13.1 },
      { period: 'Mar', value: 14.2 },
      { period: 'Apr', value: 13.8 },
      { period: 'May', value: 14.5 },
      { period: 'Jun', value: 15.1 }
    ],
    trend: 'increasing',
    change: 2.8
  },
  {
    id: 'trend_2',
    metric: 'Vocabulary diversity',
    values: [
      { period: 'Jan', value: 0.74 },
      { period: 'Feb', value: 0.78 },
      { period: 'Mar', value: 0.81 },
      { period: 'Apr', value: 0.79 },
      { period: 'May', value: 0.83 },
      { period: 'Jun', value: 0.85 }
    ],
    trend: 'increasing',
    change: 0.11
  },
  {
    id: 'trend_3',
    metric: 'Formality score',
    values: [
      { period: 'Jan', value: 5.8 },
      { period: 'Feb', value: 6.1 },
      { period: 'Mar', value: 6.4 },
      { period: 'Apr', value: 6.2 },
      { period: 'May', value: 6.7 },
      { period: 'Jun', value: 6.9 }
    ],
    trend: 'increasing',
    change: 1.1
  },
  {
    id: 'trend_4',
    metric: 'Emotional intensity',
    values: [
      { period: 'Jan', value: 6.2 },
      { period: 'Feb', value: 6.8 },
      { period: 'Mar', value: 6.5 },
      { period: 'Apr', value: 7.1 },
      { period: 'May', value: 6.9 },
      { period: 'Jun', value: 7.3 }
    ],
    trend: 'fluctuating',
    change: 1.1
  }
];

export const MOCK_LANGUAGE_INSIGHTS: LanguageInsight[] = [
  {
    id: 'insight_1',
    type: 'evolution',
    title: 'Growing vocabulary sophistication',
    description: 'Your vocabulary has become 23% more sophisticated over the past 6 months, with increased use of complex terminology and nuanced expressions.',
    confidence: 0.87,
    evidence: ['Unique word count increased', 'Average word length grew', 'Technical terms usage up 34%'],
    category: 'vocabulary'
  },
  {
    id: 'insight_2',
    type: 'pattern',
    title: 'Shift toward more personal communication',
    description: 'There\'s a notable 40% increase in personal pronouns and subjective expressions, indicating more authentic and personal communication style.',
    confidence: 0.92,
    evidence: ['Personal pronoun usage up 40%', 'Opinion expressions increased', 'Emotional language more frequent'],
    category: 'pragmatics'
  },
  {
    id: 'insight_3',
    type: 'anomaly',
    title: 'Reduced use of uncertain language',
    description: 'Uncertainty expressions have decreased by 28%, suggesting increased confidence in communication.',
    confidence: 0.79,
    evidence: ['Maybe/perhaps usage down', 'Definitive statements up', 'Question hedging reduced'],
    category: 'sentiment'
  },
  {
    id: 'insight_4',
    type: 'recommendation',
    title: 'Balance formal and casual styles',
    description: 'Consider incorporating more formal structures in professional contexts while maintaining your authentic casual voice in personal communications.',
    confidence: 0.71,
    evidence: ['Casual style dominates 65%', 'Formal context needs attention', 'Style switching opportunities'],
    category: 'structure'
  },
  {
    id: 'insight_5',
    type: 'evolution',
    title: 'Increased technical communication',
    description: 'Technical vocabulary usage has grown by 45%, indicating expanding expertise and professional development.',
    confidence: 0.85,
    evidence: ['Technical terms up 45%', 'Domain-specific language increased', 'Professional jargon adoption'],
    category: 'vocabulary'
  },
  {
    id: 'insight_6',
    type: 'pattern',
    title: 'Consistent positive sentiment',
    description: 'Positive sentiment expressions remain stable at 92%, indicating a consistently optimistic communication style.',
    confidence: 0.94,
    evidence: ['Positive words maintain high frequency', 'Encouraging language patterns', 'Supportive expressions stable'],
    category: 'sentiment'
  }
];

export const MOCK_LANGUAGE_TIMELINE_EVENTS = [
  {
    id: 'lang_event_1',
    title: 'Started using more technical terms',
    time: '2:30 PM',
    day: 'March 15',
    emotion: 'analytical',
    intensity: 75,
    description: 'Notable increase in technical vocabulary during work discussions',
    type: 'pattern_change',
    examples: ['API integration', 'database optimization', 'scalable architecture']
  },
  {
    id: 'lang_event_2',
    title: 'Shift to more casual tone',
    time: '6:45 PM',
    day: 'March 18',
    emotion: 'relaxed',
    intensity: 60,
    description: 'Communication style became more informal and conversational',
    type: 'style_shift',
    examples: ['Hey there!', 'No worries', 'Sounds good to me']
  },
  {
    id: 'lang_event_3',
    title: 'Increased emotional expression',
    time: '11:20 AM',
    day: 'March 22',
    emotion: 'enthusiasm',
    intensity: 85,
    description: 'More frequent use of emotional and expressive language',
    type: 'sentiment_change',
    examples: ['So excited!', 'This is amazing!', 'Love this idea!']
  },
  {
    id: 'lang_event_4',
    title: 'Complex sentence structures',
    time: '3:15 PM',
    day: 'March 25',
    emotion: 'focused',
    intensity: 70,
    description: 'Adoption of more sophisticated grammatical structures',
    type: 'complexity_increase',
    examples: ['Given that...', 'Not only... but also...', 'Despite the fact that...']
  },
  {
    id: 'lang_event_5',
    title: 'Reduced uncertainty language',
    time: '9:30 AM',
    day: 'March 28',
    emotion: 'confident',
    intensity: 80,
    description: 'Decrease in hedging and uncertainty expressions',
    type: 'confidence_boost',
    examples: ['I believe', 'Definitely', 'Clearly demonstrates']
  },
  {
    id: 'lang_event_6',
    title: 'Emoji usage spike',
    time: '7:20 PM',
    day: 'April 2',
    emotion: 'playful',
    intensity: 65,
    description: 'Significant increase in emoji and emoticon usage',
    type: 'expression_style',
    examples: ['😊', '🎉', '❤️', '😂', '👍']
  }
];

export const LINGUISTIC_TREND_COLORS: Record<string, string> = {
  increasing: '#4ECDC4',
  decreasing: '#FF6B6B',
  stable: '#45B7D1',
  fluctuating: '#F39C12',
}; 

export const LINGUISTIC_CATEGORY_COLORS: Record<string, string> = {
  grammar: '#9D4EDD',
  vocabulary: '#06D6A0',
  sentiment: '#FFD700',
  structure: '#FF6B9D',
  pragmatics: '#4ECDC4',
};

export const COMMUNICATION_STYLE_COLORS: Record<string, string> = {
  formal: '#2C3E50',
  casual: '#E74C3C',
  technical: '#3498DB',
  emotional: '#F39C12',
  analytical: '#9B59B6',
  creative: '#1ABC9C',
};

// Add concrete language-related habit impacts for clearer reflections
export interface LanguageHabitImpact {
  id: string;
  habit: string;
  impact: number;
  category: string;
  description: string;
}

export const MOCK_LANGUAGE_HABIT_IMPACTS: LanguageHabitImpact[] = [
  { id: '1', habit: 'Reading Daily for 30+ Minutes', impact: +89, category: 'Vocabulary Building', description: 'Consistent reading expands vocabulary and improves written expression' },
  { id: '2', habit: 'Practicing Public Speaking', impact: +81, category: 'Oral Communication', description: 'Regular speaking practice builds confidence and clarity in presentations' },
  { id: '3', habit: 'Using Filler Words Excessively', impact: -58, category: 'Speech Clarity', description: 'Overuse of "um", "like", "you know" reduces perceived competence' },
  { id: '4', habit: 'Writing in a Journal', impact: +76, category: 'Written Expression', description: 'Daily writing practice improves thought organization and clarity' },
  { id: '5', habit: 'Interrupting Others in Conversation', impact: -67, category: 'Listening Skills', description: 'Cutting people off damages relationships and reduces understanding' },
  { id: '6', habit: 'Learning New Words Weekly', impact: +84, category: 'Vocabulary Expansion', description: 'Actively studying new vocabulary enhances communication precision' },
  { id: '7', habit: 'Speaking Too Fast When Nervous', impact: -43, category: 'Delivery Style', description: 'Rapid speech under pressure reduces comprehension and connection' },
  { id: '8', habit: 'Asking Clarifying Questions', impact: +88, category: 'Active Listening', description: 'Seeking understanding shows engagement and prevents miscommunication' },
  { id: '9', habit: 'Avoiding Eye Contact While Speaking', impact: -52, category: 'Nonverbal Communication', description: 'Poor eye contact undermines credibility and connection' },
  { id: '10', habit: 'Using Storytelling in Presentations', impact: +92, category: 'Persuasive Communication', description: 'Narrative structure makes messages more memorable and engaging' },
  { id: '11', habit: 'Checking Phone During Conversations', impact: -74, category: 'Attention & Respect', description: 'Divided attention signals disrespect and harms relationship quality' },
  { id: '12', habit: 'Practicing Empathetic Responses', impact: +85, category: 'Emotional Intelligence', description: 'Thoughtful responses build trust and deeper connections' }
]; 