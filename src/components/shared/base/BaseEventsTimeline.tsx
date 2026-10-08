import { logger } from '@/lib/utils/logger';
import React, { useMemo } from 'react';
import { eventsTimelineStyles, getEventCardStyle, getIntensityBarStyle } from '@/app/emotional-landscapes/styles/events-timeline';
import { TimelineEvent } from '../types/timeline';

interface BaseEventsTimelineProps {
  events: TimelineEvent[];
  emotionColors: Record<string, string>;
  title?: string;
  timeRange?: { start: Date; end: Date };
}

// Helper function to parse date strings like "March 15th, 2024"
const parseEventDate = (timeString: string): Date | null => {
  try {
    // Remove ordinal suffixes (1st, 2nd, 3rd, etc.) and parse
    const cleanedDate = timeString.replace(/(\d+)(st|nd|rd|th)/, '$1');
    const parsed = new Date(cleanedDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

/**
 * Base Events Timeline Component
 * 
 * Displays a timeline of events, optionally filtered by time range.
 */
export const BaseEventsTimeline: React.FC<BaseEventsTimelineProps> = ({ 
  events, 
  emotionColors, 
  title,
  timeRange 
}) => {
  logger.debug('🎭 [BaseEventsTimeline] Component rendered with:', {
    eventCount: events.length,
    title: title,
    titleType: typeof title,
    titleLength: title?.length,
    willRenderTitle: !!title
  });

  // Filter and sort events based on timeRange if provided
  const filteredEvents = useMemo(() => {
    let eventsToProcess = timeRange 
      ? events.filter(event => {
          const eventDate = parseEventDate(event.time);
          if (!eventDate) return true; // Include events with unparseable dates
          
          return eventDate >= timeRange.start && eventDate <= timeRange.end;
        })
      : events;
    
    // Sort events chronologically by their parsed date
    return eventsToProcess.sort((a, b) => {
      const dateA = parseEventDate(a.time);
      const dateB = parseEventDate(b.time);
      
      // If either date can't be parsed, maintain original order
      if (!dateA || !dateB) return 0;
      
      return dateA.getTime() - dateB.getTime();
    });
  }, [events, timeRange]);

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    // Group by a combination of time and day for unique grouping
    const groupKey = `${event.time}|${event.day}`;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div style={eventsTimelineStyles.timeline}>
      {title && <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>{title}</h3>}
      {Object.keys(groupedEvents).length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center' as const,
          color: '#6B7280',
          fontStyle: 'italic'
        }}>
          No events in selected time range
        </div>
      ) : (
        Object.entries(groupedEvents)
          .sort(([keyA], [keyB]) => {
            // Sort grouped events chronologically by parsing the time part of the key
            const [timeA] = keyA.split('|');
            const [timeB] = keyB.split('|');
            const dateA = parseEventDate(timeA);
            const dateB = parseEventDate(timeB);
            
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
          })
          .map(([groupKey, dayEvents], index, array) => {
          // Split the group key back into time and day
          const [, day] = groupKey.split('|');
          const isLast = index === array.length - 1;
          return (
            <div key={groupKey} style={{
              ...eventsTimelineStyles.dayColumn,
              ...(isLast ? eventsTimelineStyles.dayColumnLast : {})
            }}>
              <div style={eventsTimelineStyles.dayHeader}>{day}</div>
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  style={getEventCardStyle(event.emotion, event.intensity, emotionColors)}
                >
                  <div style={getIntensityBarStyle(event.emotion, event.intensity, emotionColors)} />
                  <div style={eventsTimelineStyles.time}>{event.time}</div>
                  <div style={eventsTimelineStyles.title}>{event.title}</div>
                  {event.description && (
                    <div style={eventsTimelineStyles.description}>{event.description}</div>
                  )}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}; 