// Fetch timeline events from IndexedDB instead of backend API
import { IndexedDBStorage } from '@/lib/storage/indexed-db';

export interface TimelineEvent {
  id: string;
  week_start: string;
  week_end: string;
  event_type: 'milestone' | 'breakthrough' | 'challenge' | 'realization' | 'growth';
  title: string;
  description: string;
  significance_score: number;
  related_emotions: string[];
  key_messages?: string[];
  timestamp?: string;
  day?: number;
  date?: string;
}

export async function fetchLifeStoryEventsFromDB(sessionId: string): Promise<TimelineEvent[]> {
  try {
    const storage = new IndexedDBStorage();
    await storage.initialize();
    
    // Get all analysis results
    const allResults = await storage.getAnalysisByEmail('anonymous'); // Or use actual email
    
    // Find the result with matching sessionId
    const result = allResults.find(r => r.sessionId === sessionId);
    
    if (!result || !result.emotional) {
      console.log('No analysis results found for session:', sessionId);
      return getMockTimelineEvents(); // Return mock data for now
    }
    
    // Generate timeline events from emotional analysis
    const events: TimelineEvent[] = [];
    const weeklyAnalyses = result.emotional.weeklyAnalyses || [];
    
    weeklyAnalyses.forEach((week: any, index: number) => {
      // Create events based on dominant emotions
      const dominantEmotions = week.dominantEmotions || [];
      const intensity = week.emotionalIntensity || 50;
      
      if (intensity > 80) {
        events.push({
          id: `event-${index}-high`,
          week_start: week.week,
          week_end: week.week,
          event_type: 'breakthrough',
          title: `Intense ${dominantEmotions[0] || 'Emotional'} Period`,
          description: week.summary || 'A week of significant emotional intensity',
          significance_score: intensity,
          related_emotions: dominantEmotions,
          timestamp: week.week
        });
      } else if (dominantEmotions.includes('joy') || dominantEmotions.includes('love')) {
        events.push({
          id: `event-${index}-positive`,
          week_start: week.week,
          week_end: week.week,
          event_type: 'milestone',
          title: `Joyful Moments`,
          description: week.summary || 'A week filled with positive emotions',
          significance_score: intensity,
          related_emotions: dominantEmotions,
          timestamp: week.week
        });
      } else if (dominantEmotions.includes('sadness') || dominantEmotions.includes('anxiety')) {
        events.push({
          id: `event-${index}-challenge`,
          week_start: week.week,
          week_end: week.week,
          event_type: 'challenge',
          title: `Challenging Times`,
          description: week.summary || 'A week of emotional challenges',
          significance_score: intensity,
          related_emotions: dominantEmotions,
          timestamp: week.week
        });
      }
    });
    
    return events;
  } catch (error) {
    console.error('Error fetching timeline events from IndexedDB:', error);
    return getMockTimelineEvents();
  }
}

export function getMockTimelineEvents(): TimelineEvent[] {
  return [
    {
      id: 'mock-1',
      week_start: '2025-W01',
      week_end: '2025-W01',
      event_type: 'milestone',
      title: 'New Beginnings',
      description: 'Starting fresh with new opportunities',
      significance_score: 85,
      related_emotions: ['hope', 'excitement'],
      timestamp: '2025-01-01'
    },
    {
      id: 'mock-2',
      week_start: '2025-W02',
      week_end: '2025-W02',
      event_type: 'growth',
      title: 'Personal Growth',
      description: 'Learning and evolving',
      significance_score: 75,
      related_emotions: ['curiosity', 'confidence'],
      timestamp: '2025-01-08'
    }
  ];
}