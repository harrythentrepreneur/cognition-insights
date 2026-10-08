import { useState, useEffect, useMemo, useCallback } from 'react';
import { GhostingEvent, RelationshipCard } from '../types';
import { detectGhosting } from '../utils';

interface UseGhostingDetectionProps {
  cards: RelationshipCard[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

interface UseGhostingDetectionReturn {
  ghostingEvents: GhostingEvent[];
  ghostingStatistics: {
    totalEvents: number;
    severityBreakdown: {
      mild: number;
      moderate: number;
      severe: number;
    };
    recoveredRelationships: number;
    ongoingIssues: number;
  };
  getPersonGhostingStatus: (personId: string) => GhostingEvent | null;
  isPersonGhosting: (personId: string) => boolean;
  refreshDetection: () => void;
}

export const useGhostingDetection = ({
  cards,
  timeRange
}: UseGhostingDetectionProps): UseGhostingDetectionReturn => {
  const [ghostingEvents, setGhostingEvents] = useState<GhostingEvent[]>([]);

  // Generate mock activity data for demonstration
  const generateActivityData = (card: RelationshipCard) => {
    const data: Array<{date: Date, count: number}> = [];
    const now = new Date();
    
    // Generate 120 days of data for better ghosting detection
    for (let i = 120; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Base activity based on relationship health
      let baseActivity = card.scorecard.frequency / 10; // Convert percentage to daily messages
      
      // Add weekly patterns
      const dayOfWeek = date.getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
      
      // Add seasonal variations
      const seasonalVariation = Math.sin((i / 30) * Math.PI) * 0.3;
      
      // Simulate relationship trajectory effects
      if (card.scorecard.trajectory === 'negative') {
        // Simulate gradual decline over the last 60 days
        if (i <= 60) {
          const declineRatio = (60 - i) / 60; // 0 to 1 over 60 days
          baseActivity *= (1 - declineRatio * 0.8); // Up to 80% decline
        }
      } else if (card.scorecard.trajectory === 'positive') {
        // Simulate gradual increase
        if (i <= 30) {
          const growthRatio = (30 - i) / 30;
          baseActivity *= (1 + growthRatio * 0.5); // Up to 50% increase
        }
      }
      
      // Add random variation
      const randomVariation = (Math.random() - 0.5) * 0.4;
      
      const finalActivity = Math.max(0, baseActivity * weekendMultiplier * (1 + seasonalVariation + randomVariation));
      const messageCount = Math.round(finalActivity);
      
      data.push({
        date,
        count: messageCount
      });
    }
    
    return data;
  };

  const refreshDetection = useCallback(() => {
    const allEvents: GhostingEvent[] = [];
    
    cards.forEach(card => {
      const activityData = generateActivityData(card);
      const personEvents = detectGhosting(activityData);
      
      // Add person ID to events
      const enhancedEvents = personEvents.map(event => ({
        ...event,
        personId: card.id
      }));
      
      allEvents.push(...enhancedEvents);
    });
    
    setGhostingEvents(allEvents);
  }, [cards]);

  // Refresh detection when cards change
  useEffect(() => {
    refreshDetection();
  }, [refreshDetection]);

  // Calculate statistics
  const ghostingStatistics = useMemo(() => {
    const severityBreakdown = {
      mild: ghostingEvents.filter(e => e.severityLevel === 'mild').length,
      moderate: ghostingEvents.filter(e => e.severityLevel === 'moderate').length,
      severe: ghostingEvents.filter(e => e.severityLevel === 'severe').length
    };

    const recoveredRelationships = ghostingEvents.filter(e => e.currentStatus === 'recovered').length;
    const ongoingIssues = ghostingEvents.filter(e => e.currentStatus === 'ongoing').length;

    return {
      totalEvents: ghostingEvents.length,
      severityBreakdown,
      recoveredRelationships,
      ongoingIssues
    };
  }, [ghostingEvents]);

  // Helper functions
  const getPersonGhostingStatus = (personId: string): GhostingEvent | null => {
    const personEvents = ghostingEvents.filter(event => event.personId === personId);
    if (personEvents.length === 0) return null;
    
    // Return the most recent event
    return personEvents.reduce((latest, current) => 
      current.detectionDate > latest.detectionDate ? current : latest
    );
  };

  const isPersonGhosting = (personId: string): boolean => {
    const ghostingStatus = getPersonGhostingStatus(personId);
    return ghostingStatus !== null && ghostingStatus.currentStatus === 'ongoing';
  };

  return {
    ghostingEvents,
    ghostingStatistics,
    getPersonGhostingStatus,
    isPersonGhosting,
    refreshDetection
  };
};

// Additional hook for real-time ghosting alerts
export const useGhostingAlerts = (ghostingEvents: GhostingEvent[]) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const activeAlerts = useMemo(() => {
    return ghostingEvents.filter(event => 
      event.currentStatus === 'ongoing' && 
      !dismissedAlerts.has(event.id)
    );
  }, [ghostingEvents, dismissedAlerts]);

  const dismissAlert = (eventId: string) => {
    setDismissedAlerts(prev => new Set([...prev, eventId]));
  };

  const clearAllAlerts = () => {
    const allEventIds = ghostingEvents.map(event => event.id);
    setDismissedAlerts(new Set(allEventIds));
  };

  return {
    activeAlerts,
    dismissAlert,
    clearAllAlerts,
    hasActiveAlerts: activeAlerts.length > 0
  };
};