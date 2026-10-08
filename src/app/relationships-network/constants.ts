// Relationships Network Constants
// Define page-specific constants and data structures

import { RelationshipCard } from './types';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'user' | 'contact' | 'group';
  weight: number;
  connections: string[];
}

export interface CommunicationPattern {
  id: string;
  fromId: string;
  toId: string;
  frequency: number;
  emotionalTone: number;
  responseTime: number;
  date: string;
}

export interface RelationshipMetric {
  id: string;
  name: string;
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
  color: string;
  category: 'communication' | 'emotional' | 'social' | 'behavioral' | 'network';
}

// Mock data for development (to be replaced with real data)
export const MOCK_NETWORK_NODES: NetworkNode[] = [
  // Add mock data here when implementing
];

export const MOCK_COMMUNICATION_PATTERNS: CommunicationPattern[] = [
  { id: '1', fromId: 'user', toId: 'contact1', frequency: 12, emotionalTone: 8, responseTime: 120, date: '2023-04-01' },
  { id: '2', fromId: 'user', toId: 'contact2', frequency: 5, emotionalTone: 3, responseTime: 300, date: '2023-04-02' },
  { id: '3', fromId: 'contact3', toId: 'user', frequency: 8, emotionalTone: 7, responseTime: 180, date: '2023-04-03' },
];

export const RELATIONSHIP_TREND_COLORS: Record<string, string> = {
  increasing: '#4ECDC4',  // Teal green for positive trends
  decreasing: '#FF6B6B',  // Coral red for negative trends  
  stable: '#45B7D1',      // Blue for stable trends
};

export const RELATIONSHIP_CATEGORY_COLORS: Record<string, string> = {
  communication: '#00B894',  // Green for communication metrics
  emotional: '#0984E3',      // Blue for emotional metrics
  social: '#6C5CE7',         // Purple for social metrics
  behavioral: '#00CEC9',     // Cyan for behavioral metrics
  network: '#E17055',        // Orange for network metrics
};

// Enhanced relationship metrics focusing on social dynamics and communication patterns
export const MOCK_RELATIONSHIP_METRICS: RelationshipMetric[] = [
  // Communication Category - Very distinct colors
  { 
    id: 'conversation-depth', 
    name: 'Depth', 
    value: 65, 
    trend: 'stable', 
    description: 'Quality and meaningfulness of conversations',
    color: '#FF6B6B', // Bright red
    category: 'communication'
  },
  { 
    id: 'initiative-taking', 
    name: 'Initiative', 
    value: 72, 
    trend: 'increasing', 
    description: 'Frequency of starting conversations and interactions',
    color: '#4ECDC4', // Bright teal
    category: 'communication'
  },
  
  // Emotional Category - Distinct contrasting colors
  { 
    id: 'empathy-expression', 
    name: 'Empathy', 
    value: 85, 
    trend: 'increasing', 
    description: 'Demonstration of understanding and emotional support',
    color: '#45B7D1', // Blue
    category: 'emotional'
  },
  { 
    id: 'vulnerability-sharing', 
    name: 'Vulnerability', 
    value: 58, 
    trend: 'stable', 
    description: 'Openness in sharing personal thoughts and feelings',
    color: '#96CEB4', // Sage green
    category: 'emotional'
  },
  { 
    id: 'conflict-resolution', 
    name: 'Resolution', 
    value: 69, 
    trend: 'increasing', 
    description: 'Effectiveness in resolving disagreements and tensions',
    color: '#FECA57', // Golden yellow
    category: 'emotional'
  },
  { 
    id: 'trust-building', 
    name: 'Trust', 
    value: 82, 
    trend: 'increasing', 
    description: 'Consistency in building and maintaining trust',
    color: '#FF9FF3', // Bright pink
    category: 'emotional'
  },
  
  // Social Category - High contrast colors
  { 
    id: 'social-influence', 
    name: 'Influence', 
    value: 71, 
    trend: 'stable', 
    description: 'Impact on group decisions and social dynamics',
    color: '#A55EEA', // Purple
    category: 'social'
  },
  { 
    id: 'network-bridging', 
    name: 'Bridging', 
    value: 64, 
    trend: 'increasing', 
    description: 'Ability to connect different social groups',
    color: '#26D0CE', // Cyan
    category: 'social'
  },
  { 
    id: 'group-harmony', 
    name: 'Harmony', 
    value: 77, 
    trend: 'stable', 
    description: 'Contribution to positive group atmosphere',
    color: '#FD79A8', // Hot pink
    category: 'social'
  },
  
  // Behavioral Category - Earth tones and distinct colors
  { 
    id: 'reliability-consistency', 
    name: 'Reliability', 
    value: 88, 
    trend: 'stable', 
    description: 'Consistency in following through on commitments',
    color: '#FD7272', // Coral
    category: 'behavioral'
  },
  { 
    id: 'celebration-support', 
    name: 'Celebration', 
    value: 73, 
    trend: 'increasing', 
    description: 'Participation in celebrating achievements and milestones',
    color: '#7BED9F', // Mint
    category: 'behavioral'
  },
  { 
    id: 'boundary-respect', 
    name: 'Boundaries', 
    value: 81, 
    trend: 'stable', 
    description: 'Respect for personal boundaries and privacy',
    color: '#70A1FF', // Bright blue
    category: 'behavioral'
  },
  
  // Network Category - Warm colors
  { 
    id: 'centrality-score', 
    name: 'Centrality', 
    value: 66, 
    trend: 'increasing', 
    description: 'Position and importance within social networks',
    color: '#FF7675', // Light red
    category: 'network'
  },
  { 
    id: 'relationship-diversity', 
    name: 'Diversity', 
    value: 59, 
    trend: 'stable', 
    description: 'Variety in types and depths of relationships',
    color: '#FDCB6E', // Orange
    category: 'network'
  },
  { 
    id: 'reciprocity-balance', 
    name: 'Reciprocity', 
    value: 75, 
    trend: 'stable', 
    description: 'Balance of giving and receiving in relationships',
    color: '#6C5CE7', // Indigo
    category: 'network'
  }
];

// Color scheme for trends (used by BasePageSection)
export const EMOTIONAL_TONE_COLORS: Record<string, string> = {
  increasing: '#4ECDC4',  // Teal green for positive trends
  decreasing: '#FF6B6B',  // Coral red for negative trends  
  stable: '#45B7D1',      // Blue for stable trends
};

// Relationship-specific timeline events focusing on social interactions and communication
export interface RelationshipTimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  relationshipMetric: string; // Instead of 'emotion', we use relationship metrics
  intensity: number;
  description?: string;
  participants?: string[];
  communicationType?: 'direct' | 'group' | 'public' | 'family';
}

export const MOCK_RELATIONSHIP_TIMELINE_EVENTS: RelationshipTimelineEvent[] = [
  { 
    id: 'rel-1', 
    title: 'Deep Conversation with Sarah', 
    time: '19:30', 
    day: 'Monday', 
    relationshipMetric: 'vulnerability-sharing', 
    intensity: 8, 
    description: 'Shared personal challenges and received genuine support',
    participants: ['Sarah'],
    communicationType: 'direct'
  },
  { 
    id: 'rel-2', 
    title: 'Team Collaboration Success', 
    time: '14:45', 
    day: 'Tuesday', 
    relationshipMetric: 'group-harmony', 
    intensity: 9, 
    description: 'Led productive meeting that resolved conflicts and aligned goals',
    participants: ['Team Members'],
    communicationType: 'group'
  },
  { 
    id: 'rel-3', 
    title: 'Missed Call from Mom', 
    time: '11:20', 
    day: 'Wednesday', 
    relationshipMetric: 'reciprocity-balance', 
    intensity: 4, 
    description: 'Realized need to be more proactive in family communication',
    participants: ['Mom'],
    communicationType: 'family'
  },
  { 
    id: 'rel-4', 
    title: 'Network Event Introduction', 
    time: '18:00', 
    day: 'Thursday', 
    relationshipMetric: 'network-bridging', 
    intensity: 7, 
    description: 'Connected two colleagues who started a valuable collaboration',
    participants: ['Alex', 'Jordan'],
    communicationType: 'group'
  },
  { 
    id: 'rel-5', 
    title: 'Quick Response to Crisis', 
    time: '22:15', 
    day: 'Friday', 
    relationshipMetric: 'empathy-expression', 
    intensity: 9, 
    description: 'Provided immediate emotional support during friend\'s emergency',
    participants: ['Chris'],
    communicationType: 'direct'
  },
  { 
    id: 'rel-6', 
    title: 'Weekend Planning Success', 
    time: '16:30', 
    day: 'Saturday', 
    relationshipMetric: 'reliability-consistency', 
    intensity: 8, 
    description: 'Organized group outing that everyone enjoyed and appreciated',
    participants: ['Friend Group'],
    communicationType: 'group'
  },
  { 
    id: 'rel-7', 
    title: 'Boundary Setting Discussion', 
    time: '20:00', 
    day: 'Sunday', 
    relationshipMetric: 'boundary-respect', 
    intensity: 6, 
    description: 'Had honest conversation about work-life balance expectations',
    participants: ['Roommate'],
    communicationType: 'direct'
  }
];

// Relationship-focused habit impact data for insights
export interface RelationshipHabitImpact {
  id: string;
  habitName: string;
  impactScore: number;
  impactType: 'positive' | 'negative' | 'neutral';
  relationshipMetrics: string[];
  description: string;
  frequency: string;
  socialContext: string;
}

export const MOCK_RELATIONSHIP_HABIT_IMPACTS: RelationshipHabitImpact[] = [
  {
    id: 'habit-1',
    habitName: 'Daily Check-ins with Close Friends',
    impactScore: 85,
    impactType: 'positive',
    relationshipMetrics: ['empathy-expression', 'reliability-consistency', 'trust-building'],
    description: 'Regular communication strengthens bonds and builds mutual support',
    frequency: 'Daily',
    socialContext: 'Close friendships'
  },
  {
    id: 'habit-2', 
    habitName: 'Active Listening in Conversations',
    impactScore: 92,
    impactType: 'positive',
    relationshipMetrics: ['conversation-depth', 'empathy-expression', 'vulnerability-sharing'],
    description: 'Focused attention creates deeper connections and understanding',
    frequency: 'Ongoing',
    socialContext: 'All relationships'
  },
  {
    id: 'habit-3',
    habitName: 'Overcommitting to Social Events',
    impactScore: -42,
    impactType: 'negative', 
    relationshipMetrics: ['reliability-consistency', 'boundary-respect', 'reciprocity-balance'],
    description: 'Saying yes to everything leads to burnout and disappointing others',
    frequency: 'Weekly',
    socialContext: 'Social activities'
  },
  {
    id: 'habit-4',
    habitName: 'Celebrating Others\' Achievements',
    impactScore: 78,
    impactType: 'positive',
    relationshipMetrics: ['celebration-support', 'empathy-expression', 'group-harmony'],
    description: 'Acknowledging milestones strengthens bonds and shows genuine care',
    frequency: 'As needed',
    socialContext: 'Professional and personal'
  },
  {
    id: 'habit-5',
    habitName: 'Phone Usage During Conversations',
    impactScore: -38,
    impactType: 'negative',
    relationshipMetrics: ['conversation-depth', 'boundary-respect', 'empathy-expression'],
    description: 'Divided attention signals disinterest and reduces connection quality',
    frequency: 'Often',
    socialContext: 'Face-to-face interactions'
  },
  {
    id: 'habit-6',
    habitName: 'Expressing Gratitude Regularly',
    impactScore: 88,
    impactType: 'positive',
    relationshipMetrics: ['empathy-expression', 'celebration-support', 'trust-building'],
    description: 'Showing appreciation deepens relationships and builds positive momentum',
    frequency: 'Daily',
    socialContext: 'All relationships'
  },
  {
    id: 'habit-7',
    habitName: 'Gossiping About Others',
    impactScore: -67,
    impactType: 'negative',
    relationshipMetrics: ['trust-building', 'group-harmony', 'reliability-consistency'],
    description: 'Speaking negatively about others damages trust and creates toxic dynamics',
    frequency: 'Occasionally',
    socialContext: 'Social groups'
  },
  {
    id: 'habit-8',
    habitName: 'Canceling Plans Last Minute',
    impactScore: -54,
    impactType: 'negative',
    relationshipMetrics: ['reliability-consistency', 'boundary-respect', 'reciprocity-balance'],
    description: 'Frequent cancellations erode trust and make others feel undervalued',
    frequency: 'Monthly',
    socialContext: 'Social activities'
  },
  {
    id: 'habit-9',
    habitName: 'Being Defensive in Disagreements',
    impactScore: -73,
    impactType: 'negative',
    relationshipMetrics: ['conversation-depth', 'vulnerability-sharing', 'group-harmony'],
    description: 'Defensive responses shut down communication and prevent resolution',
    frequency: 'During conflicts',
    socialContext: 'Close relationships'
  },
  {
    id: 'habit-10',
    habitName: 'Making Time for One-on-One Connections',
    impactScore: 81,
    impactType: 'positive',
    relationshipMetrics: ['conversation-depth', 'vulnerability-sharing', 'trust-building'],
    description: 'Individual attention strengthens personal bonds and creates intimacy',
    frequency: 'Weekly',
    socialContext: 'Close relationships'
  }
];

// Enhanced constants for new relationship features

// Love-focused emotions for enhanced radar chart
export const LOVE_EMOTIONS = {
  love: { name: 'Love', color: '#FF6B9D', angle: 0 },
  trust: { name: 'Trust', color: '#06D6A0', angle: 51.43 },
  comfort: { name: 'Comfort', color: '#4ECDC4', angle: 102.86 },
  joy: { name: 'Joy', color: '#FFD700', angle: 154.29 },
  support: { name: 'Support', color: '#9D4EDD', angle: 205.72 },
  growth: { name: 'Growth', color: '#10B981', angle: 257.15 },
  adventure: { name: 'Adventure', color: '#F59E0B', angle: 308.58 }
};

// Relationship role types with colors and descriptions
export const RELATIONSHIP_ROLES = {
  supporter: { 
    name: 'The Supporter', 
    color: '#10B981', 
    description: 'Always there with emotional support and encouragement' 
  },
  advisor: { 
    name: 'The Advisor', 
    color: '#06D6A0', 
    description: 'Provides wise counsel and practical guidance' 
  },
  cheerleader: { 
    name: 'The Cheerleader', 
    color: '#FFD700', 
    description: 'Celebrates your wins and motivates you forward' 
  },
  confidant: { 
    name: 'The Confidant', 
    color: '#9D4EDD', 
    description: 'Your trusted keeper of secrets and deepest thoughts' 
  },
  catalyst: { 
    name: 'The Catalyst', 
    color: '#F59E0B', 
    description: 'Pushes you out of your comfort zone for growth' 
  },
  anchor: { 
    name: 'The Anchor', 
    color: '#45B7D1', 
    description: 'Provides stability and grounding in chaotic times' 
  },
  connector: { 
    name: 'The Connector', 
    color: '#FF6B9D', 
    description: 'Bridges you to new people and opportunities' 
  },
  mirror: { 
    name: 'The Mirror', 
    color: '#A855F7', 
    description: 'Reflects your true self and helps with self-awareness' 
  }
};

// Health score color mapping
export const HEALTH_SCORE_COLORS = {
  excellent: '#10B981', // 80-100
  good: '#06D6A0',      // 60-79
  moderate: '#F59E0B',  // 40-59
  poor: '#EF4444',      // 20-39
  critical: '#DC2626'   // 0-19
};

// Ghosting severity colors
export const GHOSTING_SEVERITY_COLORS = {
  mild: '#F59E0B',      // Warning orange
  moderate: '#EF4444',  // Alert red
  severe: '#DC2626'     // Critical red
};

// Mock data for relationship cards (to be replaced with real data)
export const MOCK_RELATIONSHIP_CARDS: RelationshipCard[] = [
  {
    id: 'card-1',
    name: 'Alex Chen',
    color: '#FF6B9D',
    personality: 'Thoughtful and empathetic communicator who brings depth to every conversation. Natural problem-solver with a gift for seeing multiple perspectives.',
    role: 'advisor',
    scorecard: {
      id: 'score-1',
      personId: 'alex',
      balance: 85,
      reciprocity: 92,
      frequency: 78,
      trajectory: 'positive' as const,
      healthScore: 85,
      lastUpdated: new Date('2024-01-15')
    },
    recentActivity: {
      lastContact: new Date('2024-01-14'),
      messageCount: 156,
      averageResponseTime: 120 // seconds
    },
    emotionalProfile: {
      primaryEmotion: 'trust',
      emotionalIntensity: 0.8,
      supportType: 'emotional'
    }
  },
  {
    id: 'card-2',
    name: 'Jordan Rivers',
    color: '#4ECDC4',
    personality: 'Energetic and spontaneous spirit who brings joy and adventure to life. Master of lifting moods and creating memorable experiences.',
    role: 'cheerleader',
    scorecard: {
      id: 'score-2',
      personId: 'jordan',
      balance: 72,
      reciprocity: 68,
      frequency: 85,
      trajectory: 'stable' as const,
      healthScore: 75,
      lastUpdated: new Date('2024-01-15')
    },
    recentActivity: {
      lastContact: new Date('2024-01-13'),
      messageCount: 203,
      averageResponseTime: 300
    },
    emotionalProfile: {
      primaryEmotion: 'joy',
      emotionalIntensity: 0.9,
      supportType: 'social'
    }
  },
  {
    id: 'card-3',
    name: 'Sam Taylor',
    color: '#FFD700',
    personality: 'Wise and grounded presence who offers practical solutions and steady support. Values deep connections and meaningful growth.',
    role: 'anchor',
    scorecard: {
      id: 'score-3',
      personId: 'sam',
      balance: 90,
      reciprocity: 85,
      frequency: 65,
      trajectory: 'positive' as const,
      healthScore: 80,
      lastUpdated: new Date('2024-01-15')
    },
    recentActivity: {
      lastContact: new Date('2024-01-12'),
      messageCount: 89,
      averageResponseTime: 180
    },
    emotionalProfile: {
      primaryEmotion: 'support',
      emotionalIntensity: 0.7,
      supportType: 'practical'
    }
  },
  {
    id: 'card-4',
    name: 'Casey Morgan',
    color: '#9D4EDD',
    personality: 'Creative and introspective soul who challenges conventional thinking. Brings artistic perspective and emotional depth to relationships.',
    role: 'catalyst',
    scorecard: {
      id: 'score-4',
      personId: 'casey',
      balance: 68,
      reciprocity: 75,
      frequency: 52,
      trajectory: 'negative' as const,
      healthScore: 65,
      lastUpdated: new Date('2024-01-15')
    },
    recentActivity: {
      lastContact: new Date('2024-01-10'),
      messageCount: 45,
      averageResponseTime: 480
    },
    emotionalProfile: {
      primaryEmotion: 'growth',
      emotionalIntensity: 0.6,
      supportType: 'intellectual'
    }
  }
]; 