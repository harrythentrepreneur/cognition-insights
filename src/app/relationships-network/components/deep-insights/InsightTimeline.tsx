import React, { useState } from 'react';
import { InsightCard } from './InsightCard';
import { timelineStyles as styles } from '../../styles/timeline-styles';

interface InsightTimelineProps {
  insights: any;
}

export const InsightTimeline: React.FC<InsightTimelineProps> = ({ insights }) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  if (!insights || !insights.insights) {
    return <div style={styles.emptyState}>No insights available</div>;
  }

  const toggleCard = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  // Extract pivotal moments for timeline
  const pivotalMoments = insights.insights.pivotal_moments?.pivotal_moments || [];
  
  // Create timeline events from different insight categories
  const timelineEvents = [
    ...pivotalMoments.map((moment: any) => ({
      id: `pivotal-${moment.timestamp}`,
      date: moment.timestamp,
      title: moment.title,
      description: moment.why_pivotal,
      snippet: moment.conversation_snippet,
      type: 'pivotal',
      significance: moment.significance_score,
      impact: moment.relationship_impact
    })),
    // Add communication evolution milestones
    ...insights.insights.communication_evolution?.communication_phases?.map((phase: any, index: number) => ({
      id: `phase-${index}`,
      date: `Phase ${index + 1}`,
      title: phase.phase,
      description: phase.characteristics.join(', '),
      snippet: phase.example_exchanges.join(' | '),
      type: 'evolution',
      significance: 5 + index * 1.5
    })) || []
  ].sort((a, b) => {
    // Sort by date if available, otherwise by significance
    if (a.date.includes('-') && b.date.includes('-')) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return a.significance - b.significance;
  });

  return (
    <div style={styles.container}>
      <div style={styles.timelineLine} />
      
      {timelineEvents.map((event, index) => (
        <div
          key={event.id}
          style={{
            ...styles.timelineItem,
            ...(index % 2 === 0 ? styles.timelineItemLeft : styles.timelineItemRight)
          }}
        >
          <div style={styles.timelineMarker}>
            <div style={{
              ...styles.markerDot,
              backgroundColor: event.type === 'pivotal' ? '#FFD700' : '#00F5D4',
              width: `${12 + (event.significance || 5) * 0.8}px`,
              height: `${12 + (event.significance || 5) * 0.8}px`
            }} />
          </div>
          
          <InsightCard
            id={event.id}
            date={event.date}
            title={event.title}
            description={event.description}
            snippet={event.snippet}
            impact={event.impact}
            significance={event.significance}
            type={event.type}
            isExpanded={expandedCards.has(event.id)}
            onToggle={() => toggleCard(event.id)}
          />
        </div>
      ))}
      
      {/* Add the relationship essence at the end */}
      <div style={styles.essenceContainer}>
        <div style={styles.essenceTitle}>Relationship Essence</div>
        <div style={styles.essenceText}>
          {insights.insights.synthesis?.essence_statement || 
           "A unique connection that defies simple categorization"}
        </div>
        <div style={styles.visualMetaphor}>
          {insights.insights.synthesis?.visual_metaphor}
        </div>
      </div>
    </div>
  );
};