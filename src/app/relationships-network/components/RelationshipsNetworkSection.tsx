import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BaseInsightsDelta } from '../../../components/shared/base/BaseInsightsDelta';
import { BaseEventsTimeline } from '../../../components/shared/base/BaseEventsTimeline';
import BaseHeatmap from '../../../components/shared/base/BaseHeatmap';
// Backend API removed - using IndexedDB storage
import { MOCK_RELATIONSHIP_METRICS, MOCK_RELATIONSHIP_TIMELINE_EVENTS, MOCK_RELATIONSHIP_HABIT_IMPACTS } from '../constants';
import { RELATIONSHIP_TIMELINE_EVENTS } from '../data/timeline-events';
import type { TimelineEvent } from '../data/timeline-events';
import RelationshipCards from './cards/RelationshipCards';
import { useRelationshipScoring } from '../hooks/useRelationshipScoring';
import { useMessageActivity } from '../hooks/useMessageActivity';
import { HabitImpact } from '../../../components/shared/types/insights';
import { RelationshipRadarChart, PEOPLE_DATA } from './visualizations/RelationshipRadarChart';
import { RelationshipStrengthFlow } from './visualizations/RelationshipStrengthFlow';
import { DeepInsightsSection } from './deep-insights';
import { RelationshipCard } from '../types';
import RelationshipStackedTimeline from './RelationshipStackedTimeline';
import { dashboardLayoutStyles } from '../../../app/emotional-landscapes/styles/dashboard-layout';
import { insightsPanelStyles, getInsightsTabStyle } from '../../../app/emotional-landscapes/styles/insights-panel';
import { EMOTION_COLORS, INSIGHT_TYPES } from '../../../app/emotional-landscapes/constants';
import { RELATIONSHIP_DATA_PATTERNS, MOCK_RELATIONSHIP_EVENTS, MOCK_RELATIONSHIP_INSIGHTS } from '../data/timeline-patterns';

// Transform habit impacts to the format expected by BaseInsightsDelta
const transformHabitImpacts = (habits: any[]): HabitImpact[] => {
  return habits.map(habit => ({
    id: habit.id,
    habit: habit.habitName,
    impact: habit.impactScore,
    category: habit.impactType === 'positive' ? 'Positive' : habit.impactType === 'negative' ? 'Negative' : 'Neutral',
    description: habit.description
  }));
};

// Generate timeline data using the same logic as BaseTimeline
const createTimelineData = (items: any[], dataPatterns?: Record<string, (i: number) => number>) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 156 }, (_, i) => ({
      // Generate weekly timestamps: start from 3 years ago, increment by 1 week
      timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
      intensity: dataPatterns?.[item.id] ? dataPatterns[item.id](i) : Math.max(0.2, Math.random() * 0.7),
    }))
  }));
};

// Generate heatmap data for a relationship metric
const generateRelationshipHeatmapData = (metricId: string) => {
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getFullYear() - 1, 0, 1);

  let currentWeek = new Date(startDate);
  const endWeek = new Date(today);

  while (currentWeek <= endWeek) {
    const intensity = Math.random();
    data.push({
      date: new Date(currentWeek),
      intensity: intensity,
      level: Math.floor(intensity * 5),
    });
    currentWeek = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return data;
};

interface RelationshipsNetworkSectionProps {
  sessionId?: string;
  useMockData?: boolean;
}

/**
 * Main relationships network section component
 * Uses BasePageSection for consistent layout with emotional landscapes
 */
export const RelationshipsNetworkSection: React.FC<RelationshipsNetworkSectionProps> = ({
  sessionId,
  useMockData = false
}) => {
  // Timeline events state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(RELATIONSHIP_TIMELINE_EVENTS);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Relationship habits state
  const [relationshipHabits, setRelationshipHabits] = useState<HabitImpact[]>(
    transformHabitImpacts(MOCK_RELATIONSHIP_HABIT_IMPACTS)
  );
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [habitsError, setHabitsError] = useState<string | null>(null);

  // Relationship cards state
  console.log('[RELATIONSHIPS-SECTION] Props:', { sessionId, useMockData });

  const {
    cards,
    loading: cardsLoading,
    error: cardsError,
    selectedCard,
    setSelectedCard
  } = useRelationshipScoring(
    sessionId,
    useMockData
  );

  // Time range state
  const [timeRange, setTimeRange] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.start && parsed.end) {
            const start = new Date(parsed.start);
            const end = new Date(parsed.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return { start, end };
            }
          }
        }
      } catch {}
    }
    return {
      start: new Date(Date.now() - 156 * 7 * 24 * 60 * 60 * 1000), // 3 years ago
      end: new Date()
    };
  });

  // Active people state for radar and timeline charts
  const [activePeople, setActivePeople] = useState<Record<string, boolean>>({});

  // Deep insights state
  const [deepInsightsContact, setDeepInsightsContact] = useState<string | null>(null);


  const handleDeepInsightsClick = (card: RelationshipCard) => {
    setDeepInsightsContact(card.name);
  };

  const closeDeepInsights = () => {
    setDeepInsightsContact(null);
  };

  // Fetch real data when sessionId is available
  useEffect(() => {
    const fetchAllData = async () => {
      if (!sessionId || useMockData) {
        // Use mock data
        setTimelineEvents(RELATIONSHIP_TIMELINE_EVENTS);
        setRelationshipHabits(transformHabitImpacts(MOCK_RELATIONSHIP_HABIT_IMPACTS));
        return;
      }

      // Fetch timeline events
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const response = await fetch(`${''/* Backend removed */}/api/relationships-timeline/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'completed' && data.timeline_events) {
            setTimelineEvents(data.timeline_events);
          }
        }
      } catch (err) {
        console.error('Error fetching relationship timeline:', err);
        setTimelineError('Failed to fetch timeline data');
      } finally {
        setTimelineLoading(false);
      }

      // Fetch relationship habits
      setHabitsLoading(true);
      setHabitsError(null);
      try {
        const response = await fetch(`${''/* Backend removed */}/api/relationship-habits/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'completed' && data.habits) {
            setRelationshipHabits(transformHabitImpacts(data.habits));
          }
        }
      } catch (err) {
        console.error('Error fetching relationship habits:', err);
        setHabitsError('Failed to fetch habits data');
      } finally {
        setHabitsLoading(false);
      }
    };

    fetchAllData();
  }, [sessionId, useMockData]);

  const handleTimeRangeChange = (newTimeRange: { start: Date; end: Date }) => {
    setTimeRange(newTimeRange);
  };

  // Listen for global date range changes from the hamburger menu
  const [cropRange, setCropRange] = useState<{ start: Date; end: Date } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.start && parsed.end) {
            const start = new Date(parsed.start);
            const end = new Date(parsed.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return { start, end };
            }
          }
        }
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail;
      if (start && end) {
        const newRange = { start: new Date(start), end: new Date(end) };
        handleTimeRangeChange(newRange);
        setCropRange(newRange);
      }
    };
    window.addEventListener('dateRangeChange', handler);
    return () => window.removeEventListener('dateRangeChange', handler);
  }, []);

  // Create insights for the insights panel
  const insights = [
    {
      id: 'cards',
      title: 'Relationship Cards',
      content: (
        <div style={{ height: '100%', overflow: 'auto' }}>
          <RelationshipCards
            cards={cards}
            onCardSelect={setSelectedCard}
            selectedCardId={selectedCard?.id}
            compact={true}
            onDeepInsightsClick={handleDeepInsightsClick}
          />
        </div>
      )
    },
    {
      id: 'delta',
      title: 'Relationship Habits',
      content: (
        <BaseInsightsDelta
          data={relationshipHabits}
          timeRange={timeRange}
          isLoading={habitsLoading}
          error={habitsError}
        />
      )
    }
  ];

  // Color scheme for relationship metrics
  const colorScheme: { [key: number]: string } = {
    0: '#FF6B9D',
    1: '#4ECDC4',
    2: '#FFD700',
    3: '#9D4EDD',
    4: '#10B981',
  };

  // Fetch real message activity data
  const { transformedData: messageActivityData, loading: activityLoading } = useMessageActivity(
    sessionId,
    useMockData
  );

  // Use real message activity data if available, otherwise fall back to mock data
  const relationshipMetrics = useMemo(() => {
    console.log('[RelationshipsNetwork] Message activity data:', {
      hasData: !!messageActivityData,
      dataLength: messageActivityData?.length || 0,
      firstItem: messageActivityData?.[0],
      activityLoading
    });

    if (messageActivityData && messageActivityData.length > 0) {
      // Use real message activity data for the timeline
      console.log('[RelationshipsNetwork] Using real message activity data with conversations:',
        messageActivityData.map(d => d.name));
      return messageActivityData;
    }

    // Fall back to mock data if no real data available
    console.log('[RelationshipsNetwork] Falling back to mock relationship metrics');
    return MOCK_RELATIONSHIP_METRICS.slice(0, 10).map((metric, index) => ({
      id: metric.id,
      name: metric.name,
      color: metric.color,
      description: metric.description,
      intensity: metric.value / 100,
      data: generateRelationshipHeatmapData(metric.id)
    }));
  }, [messageActivityData]); // Re-compute when message activity data changes

  // Default to first 5 metrics active – memoized to maintain stable reference and
  // avoid triggering "Maximum update depth exceeded" loops downstream when it is
  // passed as a prop to child components (e.g., RelationshipStackedTimeline).
  const defaultActiveItems = useMemo(() => {
    return relationshipMetrics.slice(0, 5).reduce((acc, item) => {
      acc[item.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }, [relationshipMetrics]);

  // Extract relationship scores from transformed data for radar chart
  const peopleWithScores = useMemo(() => {
    if (!messageActivityData || messageActivityData.length === 0) {
      console.log('[RELATIONSHIP-FLOW] No messageActivityData, using mock data');
      return PEOPLE_DATA; // Use mock data as fallback
    }

    console.log('[RELATIONSHIP-FLOW] Transforming', messageActivityData.length, 'people for radar chart');
    // Transform the real data to match PEOPLE_DATA format
    const transformed = messageActivityData.slice(0, 4).map((person: any, index) => ({
      id: `person${index + 1}`,
      name: person.name,
      color: person.color,
      scores: person.scores || {
        love: 50,
        trust: 50,
        comfort: 50,
        joy: 50,
        support: 50,
        growth: 50,
        adventure: 50
      }
    }));

    console.log('[RELATIONSHIP-FLOW] People with scores for radar chart:', transformed.map(p => ({
      name: p.name,
      scores: p.scores
    })));

    return transformed;
  }, [messageActivityData]);

  // Synchronize activePeople with relationship metrics and peopleWithScores
  useEffect(() => {
    const activeRelationshipNames = relationshipMetrics
      .filter(metric => defaultActiveItems[metric.id])
      .map(metric => metric.name);

    const updatedActivePeople: Record<string, boolean> = {};

    // Initialize all people in peopleWithScores
    peopleWithScores.forEach(person => {
      updatedActivePeople[person.id] = activeRelationshipNames.includes(person.name);
    });

    // If no specific selection, show first 3 people by default
    if (Object.values(updatedActivePeople).every(v => !v) && peopleWithScores.length > 0) {
      peopleWithScores.slice(0, 3).forEach(person => {
        updatedActivePeople[person.id] = true;
      });
    }

    setActivePeople(updatedActivePeople);
  }, [defaultActiveItems, relationshipMetrics, peopleWithScores]);

  // States for custom implementation
  const [activeTab, setActiveTab] = useState<string>('events');
  const [activeItems, setActiveItems] = useState<Record<string, boolean>>(() => {
    // Default to first 5 metrics active
    const initial: Record<string, boolean> = {};
    relationshipMetrics.slice(0, 5).forEach(metric => {
      initial[metric.id] = true;
    });
    return initial;
  });

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleActiveItemsChange = useCallback((newActiveItems: Record<string, boolean>) => {
    setActiveItems(newActiveItems);

    // Update activePeople based on activeItems from timeline
    const updatedActivePeople: Record<string, boolean> = {};

    // Get active relationship names from timeline
    const activeRelationshipNames = Object.entries(newActiveItems)
      .filter(([id, isActive]) => isActive)
      .map(([id]) => {
        const metric = relationshipMetrics.find(m => m.id === id);
        return metric?.name;
      })
      .filter(Boolean);

    // Map to peopleWithScores based on matching names
    peopleWithScores.forEach(person => {
      // Check if this person's name matches any active relationship
      updatedActivePeople[person.id] = activeRelationshipNames.includes(person.name);
    });

    setActivePeople(updatedActivePeople);
  }, [relationshipMetrics, peopleWithScores]);

  // Get currently active items for the heatmap grid
  const activeItemsList = useMemo(() => {
    return relationshipMetrics.filter(item => activeItems[item.id]);
  }, [relationshipMetrics, activeItems]);

  // Generate timeline data using the same patterns as BaseTimeline
  const timelineData = useMemo(() => {
    // Check if the data already contains real timeline data (has data arrays with actual timestamps)
    const hasRealData = relationshipMetrics.length > 0 && relationshipMetrics[0].data && Array.isArray(relationshipMetrics[0].data) &&
      relationshipMetrics[0].data.length > 0 && (('timestamp' in relationshipMetrics[0].data[0] && relationshipMetrics[0].data[0].timestamp instanceof Date) ||
        ('date' in relationshipMetrics[0].data[0] && relationshipMetrics[0].data[0].date instanceof Date));

    if (hasRealData) {
      // Use the real data that was passed in (already in correct format)
      return relationshipMetrics;
    } else {
      // Generate mock data using patterns (fallback for when real data isn't available)
      return createTimelineData(relationshipMetrics, RELATIONSHIP_DATA_PATTERNS);
    }
  }, [relationshipMetrics]);

  // Supplementary sections container style - matching emotional landscapes padding
  const supplementarySectionsStyle = {
    padding: '24px 32px',
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const
  };

  // Individual section style for proper spacing
  const sectionStyle = {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto 32px',
  };

  return (
    <>
      {/* Custom implementation without BaseCircumplex */}
      <div>
        {/* Timeline - Full Width Top */}
        <div style={dashboardLayoutStyles.timelineContainer}>
          <RelationshipStackedTimeline
            data={relationshipMetrics}
            timeRange={timeRange}
            onActiveItemsChange={handleActiveItemsChange}
            initialActiveItems={defaultActiveItems}
            dataPatterns={RELATIONSHIP_DATA_PATTERNS}
            preGeneratedTimelineData={timelineData}
            significantEvents={MOCK_RELATIONSHIP_EVENTS}
            tooltipInsights={MOCK_RELATIONSHIP_INSIGHTS}
            tooltipSubtitle="Relationship Insights"
            impactLabel="Social Impact"
            relatedItemsLabel="Related Connections"
            onTimeRangeChange={handleTimeRangeChange}
            weeklyHighlights={[]}
            cropExtent={cropRange}
          />
        </div>

        {/* Content Container - Empty space on left, Insights on right */}
        <div style={dashboardLayoutStyles.contentContainer}>
          <div style={dashboardLayoutStyles.circumplexInsightsWrapper}>
            {/* Relationship Radar Chart - Left Side */}
            <div style={dashboardLayoutStyles.circumplexContainer}>
              <div style={{
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                width: '100%',
                gap: '24px'
              }}>
                {/* Radar Chart with proper responsive container */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  height: '720px',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '100%',
                    maxWidth: '960px',
                    height: '720px',
                    position: 'relative'
                  }}>
                    <RelationshipRadarChart width={960} height={720} activePeople={activePeople} peopleData={peopleWithScores} />
                  </div>
                </div>

              </div>
            </div>

            {/* Insights Panel */}
            <div style={dashboardLayoutStyles.insightsContainer}>
              <div style={insightsPanelStyles.panel}>
                <div style={insightsPanelStyles.container}>
                  <div style={insightsPanelStyles.tabBar}>
                    {INSIGHT_TYPES.map((insight) => (
                      <button
                        key={insight.id}
                        style={getInsightsTabStyle(activeTab === insight.id) as React.CSSProperties}
                        onClick={() => handleTabClick(insight.id)}
                        onMouseDown={(e) => e.preventDefault()}
                        onFocus={(e) => (e.target as HTMLElement).blur()}
                        aria-selected={activeTab === insight.id}
                        role="tab"
                        tabIndex={-1}
                      >
                        {insight.title}
                      </button>
                    ))}
                  </div>

                  <div style={insightsPanelStyles.content}>
                    {activeTab === 'events' && (
                      <>
                        {timelineLoading && (
                          <div style={{
                            padding: '20px',
                            textAlign: 'center' as const,
                            color: '#6B7280',
                            fontStyle: 'italic'
                          }}>
                            Loading life story events...
                          </div>
                        )}
                        {timelineError && !timelineLoading && (
                          <div style={{
                            padding: '20px',
                            textAlign: 'center' as const,
                            color: '#EF4444',
                            fontSize: '14px',
                            marginBottom: '10px'
                          }}>
                            {timelineError}
                          </div>
                        )}
                        {!timelineLoading && (
                          <BaseEventsTimeline
                            events={timelineEvents}
                            emotionColors={EMOTION_COLORS}
                            timeRange={timeRange}
                          />
                        )}
                      </>
                    )}
                    {activeTab === 'delta' && (
                      insights[0]?.content || <div>No insights available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Heatmaps Grid - Shows only active items */}
        <div style={{
          ...dashboardLayoutStyles.heatmapSection,
          padding: activeItemsList.length <= 2
            ? '12px 58px 8px 58px'
            : '12px 32px 8px 32px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: activeItemsList.length === 1
              ? '1fr'
              : activeItemsList.length === 2
                ? 'repeat(2, 1fr)'
                : activeItemsList.length <= 6
                  ? 'repeat(3, 1fr)'
                  : 'repeat(4, 1fr)',
            gap: '20px',
            justifyContent: activeItemsList.length <= 2 ? 'center' : 'stretch',
            maxWidth: activeItemsList.length === 1 ? '800px' : activeItemsList.length === 2 ? '1200px' : '100%',
            margin: '0 auto'
          }}>
            {activeItemsList.map((item) => (
              <BaseHeatmap
                key={item.id}
                fixedEmotion={item.id}
                metricType="relationship"
                itemColor={colorScheme[Object.keys(colorScheme).indexOf(item.id)]}
                timeRange={timeRange}
                useMockData={useMockData}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Supplementary sections with proper container */}
      <div style={supplementarySectionsStyle}>
        {/* Relationship Cards Section - Full display */}
        <section style={sectionStyle}>
          <div style={{
            backgroundColor: 'rgba(35, 35, 64, 0.4)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#FFFFFF', marginBottom: '8px' }}>
                Relationship Network
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                Beautiful cards showcasing your meaningful connections
              </p>
            </div>
            <RelationshipCards
              cards={cards}
              onCardSelect={setSelectedCard}
              selectedCardId={selectedCard?.id}
              onDeepInsightsClick={handleDeepInsightsClick}
            />
          </div>
        </section>


        {/* Stacked Relationship Timeline */}
        <section style={{ ...sectionStyle, marginBottom: '48px' }}>
          <div style={{
            backgroundColor: 'rgba(35, 35, 64, 0.4)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#FFFFFF', marginBottom: '8px' }}>
                Relationship Strength Over Time
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                Track how your relationships have evolved and strengthened over the past two years
              </p>
            </div>
            <RelationshipStrengthFlow activePeople={activePeople} />
          </div>
        </section>
      </div>

      {/* Deep Insights Overlay */}
      {deepInsightsContact && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={closeDeepInsights}
        >
          <div
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '1200px',
              height: '90vh',
              maxHeight: '800px',
              backgroundColor: '#1A1A2E',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeDeepInsights}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              ×
            </button>

            {/* Deep Insights Content */}
            <DeepInsightsSection
              sessionId={sessionId || 'default-session'}
              contactName={deepInsightsContact}
              onClose={closeDeepInsights}
            />
          </div>
        </div>
      )}
    </>
  );
};