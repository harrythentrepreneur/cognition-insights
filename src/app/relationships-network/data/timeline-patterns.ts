// Relationships Network Timeline Data Patterns
// This file contains relationship-specific data patterns and significant events

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

// Relationship patterns that match different types of social dynamics and communication patterns - now with weekly cycles
export const RELATIONSHIP_DATA_PATTERNS: Record<string, (i: number) => number> = {
  // Communication Metrics
  'communication-frequency': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 12) * 0.3)), // Variable communication over 3 months
  'communication-depth': (i) => Math.max(0.2, Math.random() * 0.8 + (Math.cos(i / 17) * 0.2)), // Deep conversation quality over 4.25 months
  'communication-empathy': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.sin(i / 15) * 0.25)), // Empathetic responses over 3.75 months
  'communication-clarity': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.cos(i / 20) * 0.15)), // Clear communication over 5 months
  
  // Social Network Metrics
  'network-expansion': (i) => Math.max(0.2, Math.random() * 0.5 + (Math.sin(i / 25) * 0.15) + (i * 0.0005)), // Growing network over 6.25 months
  'network-maintenance': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.cos(i / 15) * 0.2)), // Maintaining connections over 3.75 months
  'network-quality': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.sin(i / 20) * 0.15)), // Quality relationships over 5 months
  'network-diversity': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.cos(i / 22) * 0.2)), // Diverse connections over 5.5 months
  
  // Emotional Intelligence in Relationships
  'empathy-expression': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 17) * 0.25)), // Showing empathy over 4.25 months
  'emotional-support': (i) => Math.max(0.4, Math.random() * 0.6 + (Math.cos(i / 12) * 0.2)), // Providing support over 3 months
  'boundary-setting': (i) => Math.max(0.2, Math.random() * 0.6 + (Math.sin(i / 20) * 0.2)), // Healthy boundaries over 5 months
  'conflict-resolution': (i) => Math.max(0.2, Math.random() * 0.5 + (Math.cos(i / 15) * 0.15)), // Resolving conflicts over 3.75 months
  
  // Trust and Vulnerability
  'trust-building': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.sin(i / 22) * 0.2) + (i * 0.0008)), // Building trust over 5.5 months
  'vulnerability-sharing': (i) => Math.max(0.2, Math.random() * 0.5 + (Math.cos(i / 17) * 0.15)), // Sharing vulnerability over 4.25 months
  'trust-maintenance': (i) => Math.max(0.4, Math.random() * 0.5 + (Math.sin(i / 15) * 0.15)), // Maintaining trust over 3.75 months
  
  // Social Influence and Leadership
  'social-influence': (i) => Math.max(0.3, Math.random() * 0.6 + (Math.cos(i / 20) * 0.2)), // Positive influence over 5 months
  'community-building': (i) => Math.max(0.3, Math.random() * 0.7 + (Math.sin(i / 25) * 0.2)), // Building community over 6.25 months
  'mentorship-giving': (i) => Math.max(0.2, Math.random() * 0.6 + (Math.cos(i / 22) * 0.15)), // Mentoring others over 5.5 months
  'mentorship-receiving': (i) => Math.max(0.3, Math.random() * 0.5 + (Math.sin(i / 17) * 0.2)), // Learning from mentors over 4.25 months
};

// Significant Relationship Events - updated for 3-year weekly timeline
export const MOCK_RELATIONSHIP_EVENTS: SignificantEvent[] = [
  {
    id: 'relationship-event-1',
    timestamp: new Date(Date.now() - 25 * 7 * 24 * 60 * 60 * 1000), // 25 weeks ago
    targetEmotion: 'communication-depth',
    title: 'Breakthrough Conversation',
    description: 'Had a deeply meaningful conversation that strengthened a key relationship. This moment demonstrated improved communication depth and emotional connection.',
    category: 'communication',
    emotionalImpact: 0.85,
    relatedEmotions: ['communication-depth', 'empathy-expression', 'trust-building'],
    messageCount: 16,
    color: '#FF6B9D'
  },
  {
    id: 'relationship-event-2', 
    timestamp: new Date(Date.now() - 18 * 7 * 24 * 60 * 60 * 1000), // 18 weeks ago
    targetEmotion: 'conflict-resolution',
    title: 'Successful Conflict Resolution',
    description: 'Navigated a challenging interpersonal conflict with grace and achieved mutual understanding. Demonstrated strong conflict resolution and mediation skills.',
    category: 'conflict-management',
    emotionalImpact: 0.78,
    relatedEmotions: ['conflict-resolution', 'empathy-expression', 'communication-clarity'],
    messageCount: 12,
    color: '#45B7D1'
  },
  {
    id: 'relationship-event-3',
    timestamp: new Date(Date.now() - 10 * 7 * 24 * 60 * 60 * 1000), // 10 weeks ago
    targetEmotion: 'network-expansion',
    title: 'Meaningful New Connection',
    description: 'Made a significant new professional connection that opened doors to collaboration. Showcased networking skills and relationship-building abilities.',
    category: 'network-growth',
    emotionalImpact: 0.72,
    relatedEmotions: ['network-expansion', 'social-influence', 'communication-clarity'],
    messageCount: 8,
    color: '#00F5D4'
  },
  {
    id: 'relationship-event-4',
    timestamp: new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000), // 5 weeks ago
    targetEmotion: 'mentorship-giving',
    title: 'Mentoring Milestone',
    description: 'Provided valuable mentorship that made a significant impact on someone\'s development. Demonstrated leadership and knowledge-sharing capabilities.',
    category: 'mentorship',
    emotionalImpact: 0.68,
    relatedEmotions: ['mentorship-giving', 'empathy-expression', 'social-influence'],
    messageCount: 10,
    color: '#FFD700'
  },
  {
    id: 'relationship-event-5',
    timestamp: new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000), // 1 year ago
    targetEmotion: 'trust-building',
    title: 'Foundation of Deep Trust',
    description: 'Established profound trust with a key colleague through consistent reliability and authenticity. This became the foundation for future collaboration.',
    category: 'trust-development',
    emotionalImpact: 0.83,
    relatedEmotions: ['trust-building', 'vulnerability-sharing', 'communication-depth'],
    messageCount: 18,
    color: '#06D6A0'
  },
  {
    id: 'relationship-event-6',
    timestamp: new Date(Date.now() - 78 * 7 * 24 * 60 * 60 * 1000), // 1.5 years ago
    targetEmotion: 'community-building',
    title: 'Community Leadership',
    description: 'Took leadership role in building a supportive community initiative. United diverse groups around common purpose and created lasting connections.',
    category: 'leadership',
    emotionalImpact: 0.79,
    relatedEmotions: ['community-building', 'social-influence', 'empathy-expression'],
    messageCount: 24,
    color: '#9D4EDD'
  },
  {
    id: 'relationship-event-7',
    timestamp: new Date(Date.now() - 104 * 7 * 24 * 60 * 60 * 1000), // 2 years ago
    targetEmotion: 'vulnerability-sharing',
    title: 'Courageous Vulnerability',
    description: 'Shared personal struggles openly with team, creating space for authentic connection. This vulnerability transformed team dynamics and deepened relationships.',
    category: 'authenticity',
    emotionalImpact: 0.86,
    relatedEmotions: ['vulnerability-sharing', 'trust-building', 'empathy-expression'],
    messageCount: 15,
    color: '#FF6B9D'
  },
  {
    id: 'relationship-event-8',
    timestamp: new Date(Date.now() - 130 * 7 * 24 * 60 * 60 * 1000), // 2.5 years ago
    targetEmotion: 'network-quality',
    title: 'Relationship Investment Strategy',
    description: 'Implemented systematic approach to nurturing high-quality relationships. Focused on depth over breadth, creating meaningful, lasting connections.',
    category: 'relationship-strategy',
    emotionalImpact: 0.74,
    relatedEmotions: ['network-quality', 'network-maintenance', 'trust-maintenance'],
    messageCount: 13,
    color: '#F39C12'
  }
];

// Relationship insights for tooltips
export const MOCK_RELATIONSHIP_INSIGHTS = [
  "Deepened connection through vulnerable conversation",
  "Successfully mediated challenging team conflict",
  "Expanded professional network with strategic connections",
  "Provided meaningful mentorship to junior colleague",
  "Strengthened trust through consistent follow-through",
  "Demonstrated empathy in difficult situation"
];

// Function to create relationship timeline data - now generates 156 weekly data points
export const createRelationshipTimelineData = (items: any[]) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 156 }, (_, i) => ({
      // Generate weekly timestamps: start from 3 years ago, increment by 1 week
      timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
      intensity: RELATIONSHIP_DATA_PATTERNS[item.id] ? RELATIONSHIP_DATA_PATTERNS[item.id](i) : Math.max(0.3, Math.random() * 0.6),
    }))
  }));
}; 