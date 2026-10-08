import { RelationshipMetric, CommunicationPattern, RelationshipHabitImpact, RelationshipTimelineEvent } from './constants';
import { HabitImpact } from '../../components/shared/types/insights';
import { TimelineEvent } from '../../components/shared/types/timeline';

export const transformRelationshipToHabitImpact = (metrics: RelationshipMetric[]): HabitImpact[] => {
  return metrics.map(metric => ({
    id: metric.id,
    habit: metric.name,
    impact: metric.trend === 'increasing' ? metric.value : 
            metric.trend === 'decreasing' ? -metric.value : 
            0,
    category: metric.category,
    description: metric.description
  }));
};

export const transformHabitImpactData = (habits: RelationshipHabitImpact[]) => {
  return habits.map(habit => ({
    id: habit.id,
    habitName: habit.habitName,
    impactScore: Math.abs(habit.impactScore),
    impactType: habit.impactType,
    description: habit.description,
    frequency: habit.frequency,
    socialContext: habit.socialContext,
    relationshipMetrics: habit.relationshipMetrics
  }));
};

export const transformRelationshipTimelineEvents = (relationshipEvents: RelationshipTimelineEvent[]): TimelineEvent[] => {
  return relationshipEvents.map(event => ({
    id: event.id,
    title: event.title,
    time: event.time,
    day: event.day,
    emotion: event.relationshipMetric,
    intensity: event.intensity,
    description: event.description,
    participants: event.participants,
    communicationType: event.communicationType
  }));
};

export const calculateNetworkStats = (metrics: RelationshipMetric[]) => {
  const totalMetrics = metrics.length;
  const strongRelationships = metrics.filter(m => m.value >= 75).length;
  const improvingTrends = metrics.filter(m => m.trend === 'increasing').length;
  const concerningTrends = metrics.filter(m => m.trend === 'decreasing').length;
  
  return {
    totalMetrics,
    strongRelationships,
    improvingTrends,
    concerningTrends,
    healthScore: Math.round((strongRelationships / totalMetrics) * 100),
    trendScore: Math.round(((improvingTrends - concerningTrends) / totalMetrics) * 100)
  };
};

export const transformCommunicationToTimelineEvent = (patterns: CommunicationPattern[]): TimelineEvent[] => {
  return patterns.map(pattern => ({
    id: pattern.id,
    title: `From: ${pattern.fromId}, To: ${pattern.toId}`,
    time: '', // Communication patterns don't have a time
    day: pattern.date,
    emotion: pattern.emotionalTone.toString(),
    intensity: pattern.frequency,
    description: `Response time: ${pattern.responseTime}s`,
  }));
};

export const transformRelationshipHabitsToInsights = (habits: RelationshipHabitImpact[]): HabitImpact[] => {
  return habits.map(habit => ({
    id: habit.id,
    habit: habit.habitName,
    impact: habit.impactScore, // Preserve negative values
    category: habit.socialContext,
    description: habit.description
  }));
};

// Enhanced utility functions for new relationship features

import { RelationshipCard, RelationshipScorecard, GhostingEvent, RelationshipTrajectory } from './types';
import { HEALTH_SCORE_COLORS, RELATIONSHIP_ROLES } from './constants';

export const calculateHealthScore = (balance: number, reciprocity: number, frequency: number): number => {
  // Weighted calculation: reciprocity (40%), balance (35%), frequency (25%)
  return Math.round((reciprocity * 0.4) + (balance * 0.35) + (frequency * 0.25));
};

export const getHealthScoreColor = (score: number): string => {
  if (score >= 80) return HEALTH_SCORE_COLORS.excellent;
  if (score >= 60) return HEALTH_SCORE_COLORS.good;
  if (score >= 40) return HEALTH_SCORE_COLORS.moderate;
  if (score >= 20) return HEALTH_SCORE_COLORS.poor;
  return HEALTH_SCORE_COLORS.critical;
};

export const getHealthScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Poor';
  return 'Needs Attention';
};

export const calculateBalanceScore = (sentMessages: number, receivedMessages: number, initiationRatio: number): number => {
  // Guard: if there are no messages, return neutral balance
  if (sentMessages === 0 && receivedMessages === 0) return 0;

  // 1. Message balance (0–1). Always positive.
  const messageBalance = Math.min(sentMessages, receivedMessages) / Math.max(sentMessages, receivedMessages);

  // 2. Clamp initiationRatio to the expected 0-1 range to avoid negative values
  const clampedRatio = Math.max(0, Math.min(1, initiationRatio));

  // 3. Initiation balance based on deviation from perfect 0.5 split (0–1)
  const initiationBalance = 1 - Math.abs(clampedRatio - 0.5) * 2;

  // 4. Weighted composite score (0-100)
  const rawScore = (messageBalance * 0.6 + initiationBalance * 0.4) * 100;

  // 5. Ensure final score is within 0-100 range
  return Math.round(Math.max(0, Math.min(100, rawScore)));
};

export const calculateReciprocityScore = (supportGiven: number, supportReceived: number, emotionalAlignment: number): number => {
  if (supportGiven === 0 && supportReceived === 0) return 0;
  
  const supportBalance = Math.min(supportGiven, supportReceived) / Math.max(supportGiven, supportReceived);
  const alignmentScore = emotionalAlignment || 0.5;
  return Math.round((supportBalance * 0.7 + alignmentScore * 0.3) * 100);
};

export const calculateFrequencyScore = (averageDaily: number, consistency: number): number => {
  // Normalize frequency score based on reasonable daily message averages
  const frequencyNormalized = Math.min(averageDaily / 10, 1); // Cap at 10 messages per day = 100%
  const consistencyNormalized = consistency || 0.5;
  return Math.round((frequencyNormalized * 0.6 + consistencyNormalized * 0.4) * 100);
};

export const detectGhosting = (messageActivity: Array<{date: Date, count: number}>): GhostingEvent[] => {
  const events: GhostingEvent[] = [];
  
  // Look for significant drops in communication over 30-day windows
  for (let i = 30; i < messageActivity.length; i++) {
    const recentPeriod = messageActivity.slice(i - 30, i);
    const previousPeriod = messageActivity.slice(i - 60, i - 30);
    
    const recentAverage = recentPeriod.reduce((sum, day) => sum + day.count, 0) / 30;
    const previousAverage = previousPeriod.reduce((sum, day) => sum + day.count, 0) / 30;
    
    if (previousAverage > 0) {
      const dropPercentage = ((previousAverage - recentAverage) / previousAverage) * 100;
      
      if (dropPercentage >= 50) {
        const severity = dropPercentage >= 80 ? 'severe' : dropPercentage >= 65 ? 'moderate' : 'mild';
        
        events.push({
          id: `ghosting-${i}`,
          personId: 'unknown', // This would be filled in with actual person data
          startDate: messageActivity[i - 30].date,
          detectionDate: messageActivity[i].date,
          severityLevel: severity,
          communicationDrop: dropPercentage,
          currentStatus: recentAverage < previousAverage * 0.2 ? 'ongoing' : 'recovered'
        });
      }
    }
  }
  
  return events;
};

export const calculateRelationshipTrajectory = (
  timelineData: Array<{date: Date, sentiment: number, strength: number}>
): RelationshipTrajectory['trajectory'] => {
  if (timelineData.length < 2) return 'stable';
  
  const start = timelineData[0];
  const end = timelineData[timelineData.length - 1];
  
  const sentimentChange = end.sentiment - start.sentiment;
  const strengthChange = end.strength - start.strength;
  
  // Consider both sentiment and strength for trajectory
  const overallChange = (sentimentChange + strengthChange) / 2;
  
  if (overallChange > 0.1) return 'positive';
  if (overallChange < -0.1) return 'negative';
  return 'stable';
};

export const formatResponseTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
};

export const getRelationshipRole = (roleKey: string) => {
  return RELATIONSHIP_ROLES[roleKey as keyof typeof RELATIONSHIP_ROLES] || RELATIONSHIP_ROLES.supporter;
};

export const generatePersonalityPrompt = (communicationPatterns: any) => {
  return `Based on this person's communication patterns:
- Message frequency: ${communicationPatterns.frequency}
- Emotional tone: ${communicationPatterns.emotionalProfile}
- Communication style: ${communicationPatterns.style}
- Response patterns: ${communicationPatterns.responseTime}

Generate a 2-3 sentence personality description that captures their essence as a communicator and friend.
Focus on their positive qualities and how they contribute to relationships.
Style: Warm, insightful, and appreciative.`;
};

export const generatePersonalityDescription = (name: string, category: string, supportType: string): string => {
  // Generate a default personality description based on category and support type
  const categoryDescriptions: Record<string, string> = {
    family: 'A caring and supportive family member who brings warmth and stability to your life.',
    romantic_partner: 'A loving partner who shares deep emotional connection and understanding.',
    close_friend: 'A trusted confidant who offers genuine friendship and meaningful conversations.',
    friend: 'An enjoyable companion who brings lightness and fun to social interactions.',
    colleague: 'A professional contact who balances work discussions with personal connection.',
    acquaintance: 'A pleasant connection who adds variety to your social circle.',
    professional: 'A knowledgeable advisor who provides valuable insights and guidance.',
    service_provider: 'A helpful contact who assists with practical matters efficiently.',
    other: 'An interesting person who contributes unique perspectives to your life.'
  };
  
  const supportTypeEnhancements: Record<string, string> = {
    emotional: 'They excel at providing emotional support and understanding during both good times and challenges.',
    practical: 'They\'re always ready to help with practical matters and offer concrete solutions.',
    social: 'They bring energy and connection to social situations, making gatherings more enjoyable.',
    intellectual: 'They stimulate thoughtful discussions and share interesting perspectives.'
  };
  
  const base = categoryDescriptions[category] || categoryDescriptions.other;
  const enhancement = supportTypeEnhancements[supportType] || '';
  
  return `${base} ${enhancement}`.trim();
};

export const transformApiDataToRelationshipCards = (apiData: any): RelationshipCard[] => {
  // Transform real API data to RelationshipCard format
  
  console.log('[TRANSFORM-API] Input data:', {
    hasData: !!apiData,
    hasRelationships: !!apiData?.relationships,
    relationshipsCount: apiData?.relationships?.length || 0
  });
  
  if (!apiData || !apiData.relationships) {
    console.log('[TRANSFORM-API] No relationships data found in API response');
    return [];
  }
  
  return apiData.relationships.map((person: any, index: number) => {
    console.log(`[TRANSFORM-API] Person ${index}:`, {
      name: person.name,
      totalMessages: person.totalMessages,
      message_count: person.message_count,
      messageCount: person.messageCount,
      messagesSent: person.messagesSent,
      messagesReceived: person.messagesReceived
    });
    // Generate a personality description if not provided
    const personality = person.personality || 
      generatePersonalityDescription(person.name, person.category, person.supportType);
    
    return {
      id: person.id || `rel-${Math.random().toString(36).substr(2, 9)}`,
      name: person.name,
      color: person.color || '#4ECDC4',
      personality: personality,
      role: person.role || 'supporter',
      scorecard: {
        id: `score-${person.id}`,
        personId: person.id,
        balance: person.balance || calculateBalanceScore(
          person.messagesSent || 0,
          person.messagesReceived || 0,
          person.initiationRatio || 0.5
        ),
        reciprocity: person.reciprocity || calculateReciprocityScore(
          person.supportGiven || 0,
          person.supportReceived || 0,
          person.emotionalAlignment || 0.5
        ),
        frequency: person.frequency || calculateFrequencyScore(
          person.averageDailyMessages || 0,
          person.consistencyScore || 0.5
        ),
        trajectory: person.trajectory || calculateRelationshipTrajectory(person.timelineData || []),
        healthScore: person.healthScore || 0, // Will be calculated if not provided
        lastUpdated: new Date()
      },
      recentActivity: {
        lastContact: new Date(person.lastContact || Date.now()),
        messageCount: person.totalMessages || person.message_count || person.messageCount || 0,
        averageResponseTime: person.averageResponseTime || 300
      },
      emotionalProfile: {
        primaryEmotion: person.primaryEmotion || 'joy',
        emotionalIntensity: person.emotionalIntensity || 0.5,
        supportType: person.supportType || 'emotional'
      }
    };
  }).map((card: any) => ({
    ...card,
    scorecard: {
      ...card.scorecard,
      healthScore: card.scorecard.healthScore || calculateHealthScore(
        card.scorecard.balance,
        card.scorecard.reciprocity,
        card.scorecard.frequency
      )
    }
  }));
}; 