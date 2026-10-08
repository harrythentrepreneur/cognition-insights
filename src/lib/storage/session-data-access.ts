/**
 * Session Data Access Helper
 * Provides unified access to analysis data stored in IndexedDB
 * Replaces the old backend API calls
 */

import { EnhancedIndexedDBStorage } from './enhanced-indexed-db';

export class SessionDataAccess {
  private static instance: SessionDataAccess;
  private storage: EnhancedIndexedDBStorage;

  private constructor() {
    this.storage = new EnhancedIndexedDBStorage();
  }

  static getInstance(): SessionDataAccess {
    if (!SessionDataAccess.instance) {
      SessionDataAccess.instance = new SessionDataAccess();
    }
    return SessionDataAccess.instance;
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  /**
   * Get emotional timeline data for a session
   */
  async getEmotionalTimeline(sessionId: string): Promise<any> {
    try {
      const segments = await this.storage.getSegmentsBySession(sessionId);
      if (!segments || segments.length === 0) {
        return null;
      }

      // Transform segments into emotional timeline format
      const emotions = this.extractEmotionalData(segments);
      return {
        status: 'completed',
        emotions,
        total_weeks: segments.length,
        original_date_range: this.getDateRange(segments)
      };
    } catch (error) {
      console.error('Error fetching emotional timeline:', error);
      return null;
    }
  }

  /**
   * Get life story events for a session
   */
  async getLifeStoryEvents(sessionId: string): Promise<any> {
    try {
      const segments = await this.storage.getSegmentsBySession(sessionId);
      if (!segments || segments.length === 0) {
        return null;
      }

      const lifeEvents = this.extractLifeEvents(segments);
      return {
        status: 'completed',
        life_story_data: {
          life_events: lifeEvents,
          chapters: {}
        }
      };
    } catch (error) {
      console.error('Error fetching life story events:', error);
      return null;
    }
  }

  /**
   * Get social/relationship data for a session
   */
  async getSocialData(sessionId: string): Promise<any> {
    try {
      const segments = await this.storage.getSegmentsBySession(sessionId);
      if (!segments || segments.length === 0) {
        return null;
      }

      return this.extractSocialData(segments);
    } catch (error) {
      console.error('Error fetching social data:', error);
      return null;
    }
  }

  /**
   * Get personality analysis data for a session
   */
  async getPersonalityData(sessionId: string): Promise<any> {
    try {
      const segments = await this.storage.getSegmentsBySession(sessionId);
      if (!segments || segments.length === 0) {
        return null;
      }

      return this.extractPersonalityData(segments);
    } catch (error) {
      console.error('Error fetching personality data:', error);
      return null;
    }
  }

  /**
   * Get trigger analysis data for a session
   */
  async getTriggerData(sessionId: string): Promise<any> {
    try {
      const segments = await this.storage.getSegmentsBySession(sessionId);
      if (!segments || segments.length === 0) {
        return null;
      }

      return this.extractTriggerData(segments);
    } catch (error) {
      console.error('Error fetching trigger data:', error);
      return null;
    }
  }

  // Helper methods to transform segment data into specific formats

  private extractEmotionalData(segments: any[]): any[] {
    const emotionsMap = new Map<string, any>();
    
    segments.forEach(segment => {
      if (segment.analysis?.emotional) {
        Object.entries(segment.analysis.emotional).forEach(([emotion, value]: [string, any]) => {
          if (!emotionsMap.has(emotion)) {
            emotionsMap.set(emotion, {
              id: emotion,
              name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
              color: this.getEmotionColor(emotion),
              data: []
            });
          }
          
          emotionsMap.get(emotion)!.data.push({
            timestamp: new Date(segment.start_date),
            intensity: typeof value === 'number' ? value : value.intensity || 0
          });
        });
      }
    });

    return Array.from(emotionsMap.values());
  }

  private extractLifeEvents(segments: any[]): any[] {
    const events: any[] = [];
    
    segments.forEach((segment, index) => {
      if (segment.analysis?.key_moments) {
        segment.analysis.key_moments.forEach((moment: any) => {
          events.push({
            id: `event-${index}-${events.length}`,
            title: moment.title || 'Life Event',
            time: new Date(segment.start_date).toLocaleDateString(),
            day: `Week ${index + 1}`,
            emotion: moment.emotion || 'growth',
            intensity: moment.intensity || 5,
            description: moment.description || 'A significant moment'
          });
        });
      }
    });

    return events;
  }

  private extractSocialData(segments: any[]): any {
    const relationships = new Map<string, any>();
    
    segments.forEach(segment => {
      if (segment.analysis?.social) {
        Object.entries(segment.analysis.social).forEach(([person, data]: [string, any]) => {
          if (!relationships.has(person)) {
            relationships.set(person, {
              name: person,
              messages: [],
              sentiment: []
            });
          }
          
          const rel = relationships.get(person)!;
          rel.messages.push({
            date: segment.weekStart,
            count: data.message_count || 0
          });
          rel.sentiment.push({
            date: segment.weekStart,
            value: data.sentiment || 0
          });
        });
      }
    });

    return {
      relationships: Array.from(relationships.values()),
      total_participants: relationships.size
    };
  }

  private extractPersonalityData(segments: any[]): any {
    const traits: any = {};
    let count = 0;
    
    segments.forEach(segment => {
      if (segment.analysis?.personality) {
        Object.entries(segment.analysis.personality).forEach(([trait, value]) => {
          if (!traits[trait]) {
            traits[trait] = 0;
            count = 0;
          }
          traits[trait] += value as number;
          count++;
        });
      }
    });

    // Average the traits
    Object.keys(traits).forEach(trait => {
      traits[trait] = traits[trait] / Math.max(count, 1);
    });

    return { traits, segment_count: segments.length };
  }

  private extractTriggerData(segments: any[]): any {
    const triggers: any[] = [];
    
    segments.forEach(segment => {
      if (segment.analysis?.triggers) {
        segment.analysis.triggers.forEach((trigger: any) => {
          triggers.push({
            ...trigger,
            date: segment.weekStart
          });
        });
      }
    });

    return { triggers, total_count: triggers.length };
  }

  private getDateRange(segments: any[]): string {
    if (segments.length === 0) return '';
    const firstDate = new Date(segments[0].start_date);
    const lastDate = new Date(segments[segments.length - 1].end_date);
    return `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`;
  }

  private getEmotionColor(emotion: string): string {
    const colors: { [key: string]: string } = {
      joy: '#FFD700',
      sadness: '#4169E1',
      anger: '#FF4500',
      fear: '#8B008B',
      surprise: '#FF69B4',
      disgust: '#228B22',
      trust: '#00CED1',
      anticipation: '#FF8C00',
      love: '#FF1493',
      anxiety: '#9370DB',
      excitement: '#FFB6C1',
      gratitude: '#98FB98',
      hope: '#87CEEB',
      contentment: '#F0E68C',
      frustration: '#DC143C'
    };
    return colors[emotion.toLowerCase()] || '#808080';
  }
}

// Export singleton instance getter for convenience
export const getSessionData = async () => {
  const instance = SessionDataAccess.getInstance();
  await instance.initialize();
  return instance;
};