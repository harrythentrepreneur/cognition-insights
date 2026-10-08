// Emotional Landscapes Timeline Events
// Significant emotional milestones and breakthroughs

import { getSessionData } from '../../../lib/storage/session-data-access';

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  emotion: string;
  intensity: number;
  description?: string;
}

/**
 * Fetches real life story events from the API
 */
export async function fetchLifeStoryEvents(sessionId: string): Promise<TimelineEvent[]> {
  try {
    const dataAccess = await getSessionData();
    const apiData = await dataAccess.getLifeStoryEvents(sessionId);

    if (apiData && apiData.status === 'completed' && apiData.life_story_data) {
      const lifeEvents = apiData.life_story_data.life_events || [];
      console.log('📖 Life Story Data from IndexedDB:', {
        status: apiData.status,
        eventCount: lifeEvents.length,
        chapters: Object.keys(apiData.life_story_data.chapters || {}).length
      });

      return lifeEvents.map((event: any) => ({
        id: event.id || `event-${Math.random().toString(36).substr(2, 9)}`,
        title: event.title || 'Life Event',
        time: event.time || 'Unknown Date',
        day: event.day || 'Life Journey',
        emotion: event.emotion || 'growth',
        intensity: event.intensity || 5,
        description: event.description || 'A significant moment in the journey.'
      }));
    }

    console.log('📖 Life Story data not available, using mock data');
    return EMOTIONAL_TIMELINE_EVENTS;

  } catch (error) {
    console.error('Error fetching life story events:', error);
    return EMOTIONAL_TIMELINE_EVENTS;
  }
}

// =============================================================================
// Life Story Timeline Events - Beautiful Chronological Journey
// =============================================================================
// 
// Format follows the "Life Story" concept with chapter-style organization:
// - Day field now represents the chapter title (largest text)
// - Time field shows the actual date (replaces time slot)  
// - Title shows the event type/category
// - Description tells the story of what happened
//
// This transforms the timeline into a beautiful life story organized by meaningful chapters

export const EMOTIONAL_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'event-1',
    title: 'Career Milestone',
    time: '10:30 AM',
    day: 'Monday, Jan 15',
    emotion: 'joy',
    intensity: 85,
    description: 'Achieved a significant professional goal after months of hard work'
  },
  {
    id: 'event-2',
    title: 'Family Reunion',
    time: '2:15 PM',
    day: 'Wednesday, Jan 17',
    emotion: 'love',
    intensity: 78,
    description: 'Reconnected with loved ones after a long separation'
  },
  {
    id: 'event-3',
    title: 'Health Breakthrough',
    time: '9:45 AM',
    day: 'Friday, Jan 19',
    emotion: 'hope',
    intensity: 72,
    description: 'Received positive health news after weeks of uncertainty'
  },
  {
    id: 'event-4',
    title: 'Creative Success',
    time: '4:20 PM',
    day: 'Sunday, Jan 21',
    emotion: 'excitement',
    intensity: 68,
    description: 'Launched a personal project that had been in development'
  },
  {
    id: 'event-5',
    title: 'Personal Growth',
    time: '11:30 AM',
    day: 'Tuesday, Jan 23',
    emotion: 'gratitude',
    intensity: 75,
    description: 'Reflected on personal progress and felt deep appreciation'
  }
]; 