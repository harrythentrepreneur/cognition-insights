// Personality Analysis Constants
// Define page-specific constants and data structures focused on personality psychology

export interface PersonalityTrait {
  id: string;
  name: string;
  score: number;
  description: string;
  category: 'big5' | 'cognitive' | 'motivational' | 'interpersonal' | 'emotional' | 'behavioral';
  color: string;
  facets?: string[];
  implications: string[];
}

export interface CognitiveStyle {
  id: string;
  name: string;
  value: number;
  description: string;
  category: 'thinking' | 'processing' | 'learning' | 'decision';
  color: string;
}

export interface MotivationalDriver {
  id: string;
  name: string;
  strength: number;
  description: string;
  category: 'achievement' | 'affiliation' | 'power' | 'autonomy' | 'growth';
  color: string;
  behaviors: string[];
}

export interface BehavioralPattern {
  id: string;
  pattern: string;
  frequency: number;
  context: string[];
  intensity: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  personalityCorrelations: string[];
}

export interface PersonalityTimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  personalityTrait: string; // Which trait this event reflects
  intensity: number;
  description?: string;
  context?: string;
  behaviorType?: 'cognitive' | 'social' | 'emotional' | 'behavioral';
}

export interface PersonalityInsight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  evidence: string[];
  implications: string[];
  personalityTraits: string[];
}

// Enhanced personality categories with specific colors
export const PERSONALITY_CATEGORY_COLORS: Record<string, string> = {
  big5: '#FF6B6B',           // Coral for Big Five traits
  cognitive: '#4ECDC4',      // Teal for cognitive styles  
  motivational: '#45B7D1',   // Blue for motivational drivers
  interpersonal: '#A855F7',  // Purple for social/interpersonal
  emotional: '#F59E0B',      // Amber for emotional patterns
  behavioral: '#10B981'      // Green for behavioral tendencies
};

export const TREND_COLORS: Record<string, string> = {
  increasing: '#4ECDC4',     // Teal for positive trends
  decreasing: '#FF6B6B',     // Coral for declining trends  
  stable: '#45B7D1',         // Blue for stable patterns
};

// Comprehensive personality traits covering multiple psychological frameworks
export const MOCK_PERSONALITY_TRAITS: PersonalityTrait[] = [
  // Big Five Personality Traits
  { 
    id: 'openness', 
    name: 'Openness', 
    score: 85, 
    description: 'High creativity, curiosity, and intellectual engagement',
    category: 'big5',
    color: '#FF6B6B',
    facets: ['Imagination', 'Aesthetic Sensitivity', 'Intellectual Curiosity'],
    implications: ['Seeks novel experiences', 'Values creative expression', 'Open to new ideas']
  },
  { 
    id: 'conscientiousness', 
    name: 'Conscientiousness', 
    score: 78, 
    description: 'Strong self-discipline, organization, and goal-oriented behavior',
    category: 'big5',
    color: '#FF6B6B',
    facets: ['Self-Discipline', 'Orderliness', 'Achievement Striving'],
    implications: ['Reliable in commitments', 'Plans ahead effectively', 'Values structure']
  },
  { 
    id: 'extraversion', 
    name: 'Extraversion', 
    score: 65, 
    description: 'Moderate sociability and energy in social situations',
    category: 'big5',
    color: '#FF6B6B',
    facets: ['Sociability', 'Assertiveness', 'Positive Emotionality'],
    implications: ['Comfortable in groups', 'Draws some energy from interaction', 'Balanced social needs']
  },
  { 
    id: 'agreeableness', 
    name: 'Agreeableness', 
    score: 82, 
    description: 'High empathy, cooperation, and consideration for others',
    category: 'big5',
    color: '#FF6B6B',
    facets: ['Compassion', 'Trust', 'Cooperation'],
    implications: ['Values harmony', 'Considers others first', 'Natural mediator']
  },
  { 
    id: 'neuroticism', 
    name: 'Emotional Stability', 
    score: 70, 
    description: 'Good emotional regulation with occasional stress responses',
    category: 'big5',
    color: '#FF6B6B',
    facets: ['Anxiety Management', 'Mood Regulation', 'Stress Resilience'],
    implications: ['Generally calm under pressure', 'Manages emotions well', 'Occasional worry patterns']
  },

  // Cognitive Styles
  { 
    id: 'analytical-thinking', 
    name: 'Analytical Thinking', 
    score: 88, 
    description: 'Strong logical reasoning and systematic problem-solving',
    category: 'cognitive',
    color: '#4ECDC4',
    facets: ['Logical Reasoning', 'Pattern Recognition', 'Critical Analysis'],
    implications: ['Breaks down complex problems', 'Values evidence-based decisions', 'Systematic approach']
  },
  { 
    id: 'creative-thinking', 
    name: 'Creative Thinking', 
    score: 79, 
    description: 'High capacity for innovative and divergent thinking',
    category: 'cognitive',
    color: '#4ECDC4',
    facets: ['Divergent Thinking', 'Innovation', 'Conceptual Flexibility'],
    implications: ['Generates novel solutions', 'Sees unconventional connections', 'Values originality']
  },
  { 
    id: 'intuitive-processing', 
    name: 'Intuitive Processing', 
    score: 72, 
    description: 'Strong reliance on gut feelings and holistic understanding',
    category: 'cognitive',
    color: '#4ECDC4',
    facets: ['Pattern Sensing', 'Holistic Processing', 'Gut Decision Making'],
    implications: ['Trusts first impressions', 'Sees big picture quickly', 'Values intuitive insights']
  },

  // Motivational Drivers
  { 
    id: 'achievement-motivation', 
    name: 'Achievement Drive', 
    score: 84, 
    description: 'Strong drive for excellence and personal accomplishment',
    category: 'motivational',
    color: '#45B7D1',
    facets: ['Goal Pursuit', 'Excellence Standards', 'Personal Mastery'],
    implications: ['Sets challenging goals', 'Persists through obstacles', 'Values competence']
  },
  { 
    id: 'autonomy-motivation', 
    name: 'Autonomy Seeking', 
    score: 76, 
    description: 'High need for independence and self-direction',
    category: 'motivational',
    color: '#45B7D1',
    facets: ['Self-Direction', 'Independence', 'Personal Agency'],
    implications: ['Values freedom of choice', 'Prefers self-management', 'Resists micromanagement']
  },
  { 
    id: 'social-connection', 
    name: 'Social Connection', 
    score: 68, 
    description: 'Moderate need for belonging and meaningful relationships',
    category: 'motivational',
    color: '#45B7D1',
    facets: ['Belonging', 'Meaningful Bonds', 'Social Support'],
    implications: ['Values close relationships', 'Seeks emotional connection', 'Builds trust gradually']
  },

  // Interpersonal Styles
  { 
    id: 'empathic-understanding', 
    name: 'Empathic Understanding', 
    score: 91, 
    description: 'Exceptional ability to understand and share others\' emotions',
    category: 'interpersonal',
    color: '#A855F7',
    facets: ['Emotional Recognition', 'Perspective Taking', 'Compassionate Response'],
    implications: ['Reads emotions accurately', 'Responds with compassion', 'Natural counselor']
  },
  { 
    id: 'communication-style', 
    name: 'Communication Style', 
    score: 73, 
    description: 'Clear and thoughtful communication with attention to nuance',
    category: 'interpersonal',
    color: '#A855F7',
    facets: ['Clarity', 'Active Listening', 'Nuanced Expression'],
    implications: ['Expresses ideas clearly', 'Listens actively', 'Considers word choice']
  },

  // Emotional Patterns
  { 
    id: 'emotional-awareness', 
    name: 'Emotional Awareness', 
    score: 86, 
    description: 'High self-awareness of emotional states and triggers',
    category: 'emotional',
    color: '#F59E0B',
    facets: ['Self-Monitoring', 'Trigger Recognition', 'Emotional Literacy'],
    implications: ['Recognizes emotional patterns', 'Understands triggers', 'Names feelings accurately']
  },
  { 
    id: 'stress-resilience', 
    name: 'Stress Resilience', 
    score: 74, 
    description: 'Good ability to bounce back from challenges and setbacks',
    category: 'emotional',
    color: '#F59E0B',
    facets: ['Recovery Speed', 'Adaptive Coping', 'Growth Mindset'],
    implications: ['Recovers from setbacks', 'Learns from challenges', 'Maintains perspective']
  },

  // Behavioral Tendencies
  { 
    id: 'detail-orientation', 
    name: 'Detail Orientation', 
    score: 81, 
    description: 'Strong attention to accuracy and thoroughness in tasks',
    category: 'behavioral',
    color: '#10B981',
    facets: ['Accuracy Focus', 'Thoroughness', 'Quality Standards'],
    implications: ['Catches small errors', 'Values precision', 'Takes time for quality']
  }
];

// Personality-focused timeline events showing trait manifestations in daily life
export const MOCK_PERSONALITY_TIMELINE_EVENTS: PersonalityTimelineEvent[] = [
  { 
    id: 'trait-1', 
    title: 'Explored New Art Gallery', 
    time: '14:30', 
    day: 'Saturday', 
    personalityTrait: 'openness', 
    intensity: 9, 
    description: 'Spent hours discovering contemporary art, felt energized by novel aesthetic experiences',
    context: 'leisure',
    behaviorType: 'cognitive'
  },
  { 
    id: 'trait-2', 
    title: 'Organized Weekly Schedule', 
    time: '19:00', 
    day: 'Sunday', 
    personalityTrait: 'conscientiousness', 
    intensity: 8, 
    description: 'Carefully planned week ahead, set priorities and created detailed task list',
    context: 'planning',
    behaviorType: 'behavioral'
  },
  { 
    id: 'trait-3', 
    title: 'Group Brainstorming Session', 
    time: '10:00', 
    day: 'Monday', 
    personalityTrait: 'extraversion', 
    intensity: 7, 
    description: 'Led productive team discussion, energized by collaborative idea generation',
    context: 'work',
    behaviorType: 'social'
  },
  { 
    id: 'trait-4', 
    title: 'Mediated Team Conflict', 
    time: '15:45', 
    day: 'Tuesday', 
    personalityTrait: 'agreeableness', 
    intensity: 9, 
    description: 'Successfully helped colleagues find common ground and restore harmony',
    context: 'work',
    behaviorType: 'social'
  },
  { 
    id: 'trait-5', 
    title: 'Stress Management Practice', 
    time: '07:30', 
    day: 'Wednesday', 
    personalityTrait: 'emotional-stability', 
    intensity: 6, 
    description: 'Used mindfulness techniques during challenging morning, maintained emotional balance',
    context: 'personal',
    behaviorType: 'emotional'
  },
  { 
    id: 'trait-6', 
    title: 'Complex Problem Analysis', 
    time: '11:15', 
    day: 'Thursday', 
    personalityTrait: 'analytical-thinking', 
    intensity: 9, 
    description: 'Broke down intricate technical challenge into manageable components',
    context: 'work',
    behaviorType: 'cognitive'
  },
  { 
    id: 'trait-7', 
    title: 'Creative Solution Breakthrough', 
    time: '16:20', 
    day: 'Friday', 
    personalityTrait: 'creative-thinking', 
    intensity: 8, 
    description: 'Developed innovative approach that surprised and delighted the team',
    context: 'work',
    behaviorType: 'cognitive'
  }
];

// Enhanced behavioral patterns with personality correlations
export const MOCK_BEHAVIORAL_PATTERNS: BehavioralPattern[] = [
  { 
    id: 'pattern-1', 
    pattern: 'Deep Research Before Decisions', 
    frequency: 8, 
    context: ['major purchases', 'career choices', 'learning new skills'], 
    intensity: 9, 
    trend: 'stable',
    personalityCorrelations: ['conscientiousness', 'analytical-thinking']
  },
  { 
    id: 'pattern-2', 
    pattern: 'Seeking Novel Experiences', 
    frequency: 7, 
    context: ['weekends', 'travel', 'learning opportunities'], 
    intensity: 8, 
    trend: 'increasing',
    personalityCorrelations: ['openness', 'creative-thinking']
  },
  { 
    id: 'pattern-3', 
    pattern: 'Supporting Others First', 
    frequency: 9, 
    context: ['team projects', 'friend crises', 'family situations'], 
    intensity: 9, 
    trend: 'stable',
    personalityCorrelations: ['agreeableness', 'empathic-understanding']
  },
  { 
    id: 'pattern-4', 
    pattern: 'Perfectionist Tendencies', 
    frequency: 6, 
    context: ['work deliverables', 'personal projects', 'creative endeavors'], 
    intensity: 7, 
    trend: 'decreasing',
    personalityCorrelations: ['conscientiousness', 'achievement-motivation']
  },
  { 
    id: 'pattern-5', 
    pattern: 'Intuitive Decision Making', 
    frequency: 7, 
    context: ['personal relationships', 'creative choices', 'quick decisions'], 
    intensity: 8, 
    trend: 'increasing',
    personalityCorrelations: ['intuitive-processing', 'emotional-awareness']
  }
];

// Comprehensive personality insights based on trait combinations
export const MOCK_PERSONALITY_INSIGHTS: PersonalityInsight[] = [
  {
    id: 'insight-1',
    category: 'Cognitive Style',
    insight: 'Your combination of high openness and analytical thinking creates a unique "Explorer-Analyst" cognitive style, allowing you to both discover new possibilities and rigorously evaluate them.',
    confidence: 92,
    evidence: ['High scores in both openness (85) and analytical thinking (88)', 'Pattern of researching before major decisions', 'Tendency to seek novel experiences while maintaining systematic approach'],
    implications: ['Excel in roles requiring both innovation and critical evaluation', 'May occasionally over-analyze creative impulses', 'Strong potential for breakthrough thinking in structured environments'],
    personalityTraits: ['openness', 'analytical-thinking', 'creative-thinking']
  },
  {
    id: 'insight-2',
    category: 'Interpersonal Dynamics',
    insight: 'Your high agreeableness combined with empathic understanding makes you a natural "Harmony Builder" who creates positive environments while maintaining authentic relationships.',
    confidence: 89,
    evidence: ['Agreeableness score of 82 and empathic understanding of 91', 'Consistent pattern of supporting others first', 'Success in mediating team conflicts'],
    implications: ['Others seek you out for emotional support and conflict resolution', 'May need to balance others\' needs with your own well-being', 'Natural leadership potential in collaborative environments'],
    personalityTraits: ['agreeableness', 'empathic-understanding', 'social-connection']
  },
  {
    id: 'insight-3',
    category: 'Motivation Pattern',
    insight: 'Your high achievement drive balanced with autonomy seeking suggests a "Self-Directed Achiever" motivation pattern, thriving when pursuing meaningful goals with independence.',
    confidence: 87,
    evidence: ['Achievement motivation (84) paired with autonomy seeking (76)', 'Pattern of setting challenging personal goals', 'Preference for self-management over external direction'],
    implications: ['Perform best in roles with clear outcomes but flexible methods', 'May struggle in highly controlled environments', 'Strong potential for entrepreneurial or leadership roles'],
    personalityTraits: ['achievement-motivation', 'autonomy-motivation', 'conscientiousness']
  }
];

// Legacy constants for backward compatibility  
export const BEHAVIORAL_TREND_COLORS = TREND_COLORS;

// Add concrete personality-related habit impacts for clearer reflections
export interface PersonalityHabitImpact {
  id: string;
  habit: string;
  impact: number;
  category: string;
  description: string;
}

export const MOCK_PERSONALITY_HABIT_IMPACTS: PersonalityHabitImpact[] = [
  { id: '1', habit: 'Daily Reflection Practice', impact: +82, category: 'Self-Awareness', description: 'Regular self-reflection enhances emotional intelligence and decision-making' },
  { id: '2', habit: 'Seeking Feedback Actively', impact: +75, category: 'Growth Mindset', description: 'Asking for input from others accelerates personal development' },
  { id: '3', habit: 'Avoiding Difficult Conversations', impact: -68, category: 'Communication', description: 'Sidestepping tough discussions limits personal and professional growth' },
  { id: '4', habit: 'Trying New Experiences', impact: +88, category: 'Openness', description: 'Embracing novelty builds adaptability and creative thinking' },
  { id: '5', habit: 'Overthinking Decisions', impact: -54, category: 'Analysis Paralysis', description: 'Excessive rumination leads to delayed action and missed opportunities' },
  { id: '6', habit: 'Building Consistent Routines', impact: +76, category: 'Conscientiousness', description: 'Structured habits improve productivity and reduce decision fatigue' },
  { id: '7', habit: 'Comparing Yourself to Others', impact: -71, category: 'Self-Worth', description: 'Social comparison undermines confidence and authentic self-expression' },
  { id: '8', habit: 'Practicing Active Listening', impact: +84, category: 'Empathy', description: 'Focused attention in conversations strengthens relationships and understanding' },
  { id: '9', habit: 'Procrastinating on Goals', impact: -63, category: 'Self-Discipline', description: 'Delaying important tasks creates stress and hampers achievement' },
  { id: '10', habit: 'Celebrating Small Wins', impact: +79, category: 'Positivity', description: 'Acknowledging progress builds motivation and resilience' }
];

// UI Constants for Personality Analysis Page
export const UI_CONSTANTS = {
  // Breakpoints
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1440
  },
  
  // Z-Index Layers
  Z_INDEX: {
    BACKGROUND: 1,
    CONTENT: 10,
    NAVIGATION: 100,
    OVERLAY: 1000,
    MODAL: 10000
  },
  
  // Colors (referencing design system)
  COLORS: {
    PRIMARY: '#00E5D3',
    BACKGROUND: '#000000',
    TEXT_PRIMARY: '#ffffff',
    TEXT_SECONDARY: 'rgba(255, 255, 255, 0.8)',
    ACCENT: '#00E5D3'
  },
  
  // Spacing
  SPACING: {
    LOGO_MARGIN: '54px',
    CONTAINER_PADDING: '54px',
    SECTION_GAP: '2rem'
  }
} as const; 