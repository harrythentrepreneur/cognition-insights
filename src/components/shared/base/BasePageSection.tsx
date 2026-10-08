import { logger } from '@/lib/utils/logger';
import React, { useState, useMemo, useEffect } from 'react';
import { BaseCircumplex } from './BaseCircumplex';
import { BaseEventsTimeline } from './BaseEventsTimeline';
import { BaseInsightsDelta } from './BaseInsightsDelta';
import BaseHeatmap from './BaseHeatmap';
import { WeeklyHighlights } from './WeeklyHighlights';
import { AnalysisWindowLabel } from '../../../app/emotional-landscapes/components/AnalysisWindowLabel';
// Fix: Use full relative path import
import BaseTimeline from '../../../components/shared/base/BaseTimeline';
import RelationshipStackedTimeline from '../../../app/relationships-network/components/RelationshipStackedTimeline';
import { dashboardLayoutStyles } from '../../../app/emotional-landscapes/styles/dashboard-layout';
import { insightsPanelStyles, getInsightsTabStyle } from '../../../app/emotional-landscapes/styles/insights-panel';
import { EMOTION_COLORS, INSIGHT_TYPES } from '../../../app/emotional-landscapes/constants';

// Import page-specific timeline events
import { EMOTIONAL_TIMELINE_EVENTS } from '../../../app/emotional-landscapes/data/timeline-events';
import { PERSONALITY_TIMELINE_EVENTS } from '../../../app/personality-analysis/data/timeline-events';
import { RELATIONSHIP_TIMELINE_EVENTS } from '../../../app/relationships-network/data/timeline-events';
import { LANGUAGE_TIMELINE_EVENTS } from '../../../app/language-patterns/data/timeline-events';

// Import timeline patterns for each page type
import { EMOTION_DATA_PATTERNS, MOCK_EMOTIONAL_EVENTS, MOCK_EMOTIONAL_INSIGHTS } from '../../../app/emotional-landscapes/data/timeline-patterns';
import { PERSONALITY_DATA_PATTERNS, MOCK_PERSONALITY_EVENTS, MOCK_PERSONALITY_INSIGHTS } from '../../../app/personality-analysis/data/timeline-patterns';
import { RELATIONSHIP_DATA_PATTERNS, MOCK_RELATIONSHIP_EVENTS, MOCK_RELATIONSHIP_INSIGHTS } from '../../../app/relationships-network/data/timeline-patterns';
import { LANGUAGE_DATA_PATTERNS, MOCK_LANGUAGE_EVENTS, MOCK_LANGUAGE_INSIGHTS } from '../../../app/language-patterns/data/timeline-patterns';

// Generate timeline data using the same logic as BaseTimeline
const createTimelineData = (items: any[], dataPatterns?: Record<string, (i: number) => number>) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 1095 }, (_, i) => ({
      // Generate daily timestamps: start from 3 years ago, increment by 1 day
      timestamp: new Date(Date.now() - (1095 - i) * 24 * 60 * 60 * 1000),
      intensity: dataPatterns?.[item.id] ? dataPatterns[item.id](i) : Math.max(0.2, Math.random() * 0.7),
    }))
  }));
};

interface BasePageSectionProps {
  data: any[];
  insights: Array<{ id: string; title: string; content: React.ReactNode; }>;
  defaultActiveItems?: Record<string, boolean>;
  generateHeatmapData: (itemId: string) => any[];
  colorScheme: Record<string, string>;
  timeRange: { start: Date; end: Date };
  onTimeRangeChange?: (timeRange: { start: Date; end: Date }) => void;
  metricType?: 'emotion' | 'relationship' | 'personality' | 'growth' | 'language';
  // New props for real timeline events
  timelineEvents?: any[];
  timelineLoading?: boolean;
  timelineError?: string | null;
  // New prop for weekly highlights
  weeklyHighlights?: Array<{
    week: string;
    range?: string;
    weekly_summary: string[];
    weekly_topics: string[];
  }>;
  // Track which weeks have real data (not interpolated)
  realDataWeeks?: Set<string>;
  // Emotion heatmap data
  emotionHeatmapData?: Record<string, any[]>;
  // Analysis window props
  analysisWindowLabel?: string;
  analysisWindowSubtext?: string;
  // Callback for external active items tracking
  onActiveItemsChangeExternal?: (activeItems: Record<string, boolean>) => void;
  // Render prop for content below the timeline
  renderBelowTimeline?: (activeItems: Record<string, boolean>) => React.ReactNode;
  // Render prop to replace the right-side insights panel entirely
  renderRightPanel?: () => React.ReactNode;
  // Render prop to replace the left-side circumplex entirely
  renderLeftPanel?: () => React.ReactNode;
  // Render prop for content between circumplex/insights and heatmap grid
  renderAboveHeatmap?: () => React.ReactNode;
  // Render prop to replace the entire heatmap grid section
  renderHeatmapGrid?: (activeItems: any[]) => React.ReactNode;
  // Optional currency labels for Y-axis (e.g. $$$ for revenue)
  yAxisValueRange?: { min: number; max: number; prefix?: string; suffix?: string; color?: string } | ((activeItems: Record<string, boolean>) => { min: number; max: number; prefix?: string; suffix?: string; color?: string } | undefined);
  // Optional formatter for tooltip values (maps metric id + intensity to display string)
  tooltipValueFormatter?: (itemId: string, intensity: number, granularity: string, hoverDate: Date) => string;
  tooltipCustomDetails?: (itemId: string, value: number, hoverDate: Date) => string | null;
  // Pin the timeline brush selection
  isPinnedTimeRange?: boolean;
  onTogglePinTimeRange?: () => void;
  /** When set, crops the brush/scrubber to only show this date range */
  cropExtent?: { start: Date; end: Date } | null;
  /** When true, show dashed lines / dimmer area for revenue metrics in the attribution window */
  isEstimated?: boolean;
}

export const BasePageSection: React.FC<BasePageSectionProps> = ({
  data,
  insights,
  defaultActiveItems,
  generateHeatmapData,
  colorScheme,
  timeRange,
  onTimeRangeChange,
  metricType = 'emotion',
  // New timeline props
  timelineEvents,
  timelineLoading,
  timelineError,
  weeklyHighlights = [],
  realDataWeeks,
  emotionHeatmapData,
  analysisWindowLabel,
  analysisWindowSubtext,
  onActiveItemsChangeExternal,
  renderBelowTimeline,
  renderRightPanel,
  renderLeftPanel,
  renderAboveHeatmap,
  renderHeatmapGrid,
  yAxisValueRange,
  tooltipValueFormatter,
  tooltipCustomDetails,
  isPinnedTimeRange,
  onTogglePinTimeRange,
  cropExtent,
  isEstimated
}) => {
  const [activeItems, setActiveItems] = useState<Record<string, boolean>>(
    defaultActiveItems || data.slice(0, 5).reduce((acc: Record<string, boolean>, item: any) => {
      acc[item.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const [activeTab, setActiveTab] = useState<string>('events');

  // Inject CSS to prevent font weight changes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      button[role="tab"] {
        font-weight: 500 !important;
      }
      button[role="tab"]:hover {
        font-weight: 500 !important;
      }
      button[role="tab"]:focus {
        font-weight: 500 !important;
      }
      button[role="tab"]:active {
        font-weight: 500 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleActiveItemsChange = (newActiveItems: Record<string, boolean>) => {
    logger.debug('Page section received item state update:', newActiveItems);
    setActiveItems(newActiveItems);
    onActiveItemsChangeExternal?.(newActiveItems);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Get page-specific timeline events based on metricType
  const timelineEventsConfig = useMemo(() => {
    // Use real timeline events if provided, otherwise fall back to mock data
    if (timelineEvents && timelineEvents.length > 0) {
      return timelineEvents;
    }

    switch (metricType) {
      case 'growth':
        // Growth timeline now integrated into emotional landscapes
        return EMOTIONAL_TIMELINE_EVENTS;
      case 'personality':
        return PERSONALITY_TIMELINE_EVENTS;
      case 'relationship':
        return RELATIONSHIP_TIMELINE_EVENTS;
      case 'language':
        return LANGUAGE_TIMELINE_EVENTS;
      case 'emotion':
      default:
        return EMOTIONAL_TIMELINE_EVENTS;
    }
  }, [metricType, timelineEvents]);

  // Get page-specific data patterns based on metricType - separate from config for stable reference
  const dataPatterns = useMemo(() => {
    switch (metricType) {
      case 'growth':
        return EMOTION_DATA_PATTERNS;
      case 'personality':
        return PERSONALITY_DATA_PATTERNS;
      case 'relationship':
        return RELATIONSHIP_DATA_PATTERNS;
      case 'language':
        return LANGUAGE_DATA_PATTERNS;
      case 'emotion':
      default:
        return EMOTION_DATA_PATTERNS;
    }
  }, [metricType]);

  // Get page-specific timeline config based on metricType
  const timelineConfig = useMemo(() => {
    switch (metricType) {
      case 'growth':
        return {
          significantEvents: MOCK_EMOTIONAL_EVENTS,
          tooltipInsights: MOCK_EMOTIONAL_INSIGHTS,
          tooltipSubtitle: "Growth Insights",
          impactLabel: "Growth Impact",
          relatedItemsLabel: "Related Areas"
        };
      case 'personality':
        return {
          significantEvents: MOCK_PERSONALITY_EVENTS,
          tooltipInsights: MOCK_PERSONALITY_INSIGHTS,
          tooltipSubtitle: "Personality Insights",
          impactLabel: "Personality Impact",
          relatedItemsLabel: "Related Traits"
        };
      case 'relationship':
        return {
          significantEvents: MOCK_RELATIONSHIP_EVENTS,
          tooltipInsights: MOCK_RELATIONSHIP_INSIGHTS,
          tooltipSubtitle: "Relationship Insights",
          impactLabel: "Social Impact",
          relatedItemsLabel: "Related Connections"
        };
      case 'language':
        return {
          significantEvents: MOCK_LANGUAGE_EVENTS,
          tooltipInsights: MOCK_LANGUAGE_INSIGHTS,
          tooltipSubtitle: "Language Insights",
          impactLabel: "Communication Impact",
          relatedItemsLabel: "Related Patterns"
        };
      case 'emotion':
      default:
        return {
          significantEvents: MOCK_EMOTIONAL_EVENTS,
          tooltipInsights: MOCK_EMOTIONAL_INSIGHTS,
          tooltipSubtitle: "Emotional Insights",
          impactLabel: "Emotional Impact",
          relatedItemsLabel: "Related Emotions"
        };
    }
  }, [metricType]);

  // Generate timeline data using the same patterns as BaseTimeline
  const timelineData = useMemo(() => {
    // Check if the data already contains real timeline data (has data arrays with actual timestamps)
    const hasRealData = data.length > 0 && data[0].data && Array.isArray(data[0].data) &&
      data[0].data.length > 0 && (data[0].data[0].timestamp instanceof Date ||
        (data[0].data[0].intensity !== undefined && data[0].data[0].timestamp));

    logger.debug('🎭 [BasePageSection] Timeline data processing:', {
      hasRealData,
      dataLength: data.length,
      firstItemHasData: !!data[0]?.data,
      firstDataPointsCount: data[0]?.data?.length || 0,
      firstTimestamp: data[0]?.data?.[0]?.timestamp,
      usingMockPatterns: !hasRealData
    });

    if (hasRealData) {
      // Use the real data that was passed in (already in correct format)
      logger.debug('✅ [BasePageSection] Using real emotional timeline data');
      return data;
    } else {
      // Generate mock data using patterns (fallback for when real data isn't available)
      logger.debug('📝 [BasePageSection] Generating mock timeline data using patterns');
      return createTimelineData(data, dataPatterns);
    }
  }, [data, dataPatterns]);

  // Memoize the processed timeline data for BaseCircumplex to prevent unnecessary re-renders
  const processedTimelineData = useMemo(() => {
    return timelineData.map(item => ({
      id: item.id,
      name: item.name,
      color: item.color,
      data: item.data
    }));
  }, [timelineData]);

  // Get currently active items for the grid - memoize to prevent unnecessary recalculations
  const activeItemsList = useMemo(() => {
    return data.filter(item => activeItems[item.id]);
  }, [data, activeItems]);

  // Memoize circumplexData to prevent unnecessary re-renders of the circumplex
  // Only recalculate when activeItemsList actually changes, not when tabs change
  const circumplexData = useMemo(() => {
    // Calculate min/max intensity values to normalize them to the optimal range (0.3-0.7)
    const intensityValues = activeItemsList.map(item => item.intensity || 0).filter(v => v > 0);
    const minIntensity = intensityValues.length > 0 ? Math.min(...intensityValues) : 0;
    const maxIntensity = intensityValues.length > 0 ? Math.max(...intensityValues) : 1;

    return activeItemsList.map((item, index) => {
      // Create stable random values based on item ID to prevent changes on re-render
      const seed = item.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const pseudoRandom1 = ((seed * 9301 + 49297) % 233280) / 233280;
      const pseudoRandom2 = ((seed * 17 + 23) % 100) / 100;

      // Normalize intensity to optimal range (0.3-0.7) like the perfect emotional landscapes
      let normalizedIntensity;
      if (item.intensity !== undefined && intensityValues.length > 0) {
        // Scale from actual range to optimal range (0.3-0.7)
        const normalizedRatio = (item.intensity - minIntensity) / (maxIntensity - minIntensity);
        normalizedIntensity = 0.3 + (normalizedRatio * 0.4); // Scale to 0.3-0.7 range
      } else {
        // Use pseudoRandom for emotional landscapes (already in good range)
        normalizedIntensity = 0.3 + (pseudoRandom1 * 0.4); // Ensure pseudoRandom is also in 0.3-0.7 range
      }

      return {
        ...item,
        basePosition: {
          x: Math.cos(index * 2 * Math.PI / activeItemsList.length),
          y: Math.sin(index * 2 * Math.PI / activeItemsList.length)
        },
        angle: index * 360 / activeItemsList.length,
        intensity: normalizedIntensity,
        influence: item.influence || (80 + (pseudoRandom2 * 120))
      };
    });
  }, [activeItemsList]);

  return (
    <div>
      {/* Timeline - Full Width Top */}
      <div style={{
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        marginBottom: '60px', // Increased from 40px for more breathing room
      }}>
        <div style={dashboardLayoutStyles.timelineContainer}>
        {metricType === 'relationship' ? (
          <RelationshipStackedTimeline
            data={data}
            timeRange={timeRange}
            onActiveItemsChange={handleActiveItemsChange}
            initialActiveItems={defaultActiveItems}
            dataPatterns={dataPatterns}
            preGeneratedTimelineData={timelineData}
            significantEvents={timelineConfig.significantEvents}
            tooltipInsights={timelineConfig.tooltipInsights}
            tooltipSubtitle={timelineConfig.tooltipSubtitle}
            impactLabel={timelineConfig.impactLabel}
            relatedItemsLabel={timelineConfig.relatedItemsLabel}
            onTimeRangeChange={onTimeRangeChange}
            weeklyHighlights={weeklyHighlights}
            cropExtent={cropExtent}
          />
        ) : (
          <BaseTimeline
            data={data}
            timeRange={timeRange}
            onActiveItemsChange={handleActiveItemsChange}
            initialActiveItems={defaultActiveItems}
            dataPatterns={dataPatterns}
            preGeneratedTimelineData={timelineData}
            significantEvents={timelineConfig.significantEvents}
            tooltipInsights={timelineConfig.tooltipInsights}
            tooltipSubtitle={timelineConfig.tooltipSubtitle}
            impactLabel={timelineConfig.impactLabel}
            relatedItemsLabel={timelineConfig.relatedItemsLabel}
            onTimeRangeChange={onTimeRangeChange}
            weeklyHighlights={weeklyHighlights}
            realDataWeeks={realDataWeeks}
            yAxisValueRange={yAxisValueRange}
            tooltipValueFormatter={tooltipValueFormatter}
            tooltipCustomDetails={tooltipCustomDetails}
            isPinnedTimeRange={isPinnedTimeRange}
            onTogglePinTimeRange={onTogglePinTimeRange}
            cropExtent={cropExtent}
            isEstimated={isEstimated}
          />
        )}
        </div>
      </div>

      {/* Custom content below timeline */}
      {renderBelowTimeline && renderBelowTimeline(activeItems)}

      {/* Analysis Window Label - Positioned after Timeline */}
      {analysisWindowLabel && (
        <div style={{ 
          maxWidth: '1792px', 
          margin: '0 auto', 
          paddingTop: '20px',
          marginBottom: '40px' // Add space after the label
        }}>
          <AnalysisWindowLabel 
            label={analysisWindowLabel}
            subtext={analysisWindowSubtext}
          />
        </div>
      )}

      {/* Content Container - 70% Circumplex + 30% Insights */}
      <div style={dashboardLayoutStyles.contentContainer}>
        <div style={dashboardLayoutStyles.circumplexInsightsWrapper}>
          <div style={dashboardLayoutStyles.circumplexContainer}>
            {renderLeftPanel ? (
              renderLeftPanel()
            ) : (
              <BaseCircumplex
                data={circumplexData}
                timeRange={timeRange}
                timelineData={processedTimelineData}
              />
            )}
          </div>
          <div style={dashboardLayoutStyles.insightsContainer}>
            {renderRightPanel ? (
              renderRightPanel()
            ) : (
              /* Default Insights Panel matching original structure */
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
                            events={timelineEventsConfig}
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
            )}
          </div>
        </div>
      </div>

      {/* Custom content above heatmap */}
      {renderAboveHeatmap && renderAboveHeatmap()}

      {/* Dynamic Heatmaps Grid - Shows only active items (or custom override) */}
      {renderHeatmapGrid ? (
        renderHeatmapGrid(activeItemsList)
      ) : (
        <div style={{
          ...dashboardLayoutStyles.heatmapSection,
          padding: activeItemsList.length <= 2
            ? '12px 58px 8px 58px'
            : '12px 40px 8px 58px',
          width: '100%',
          boxSizing: 'border-box' as const
        }}>
          {activeItemsList.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: activeItemsList.length <= 3
                ? 'repeat(auto-fill, minmax(300px, 1fr))'
                : activeItemsList.length === 5
                  ? 'repeat(4, 1fr)'
                  : 'repeat(auto-fit, minmax(300px, 1fr))',
              justifyContent: activeItemsList.length <= 2 ? 'center' : 'stretch',
              placeItems: activeItemsList.length <= 2 ? 'center' : 'stretch',
              gap: '30px',
              padding: '0px',
              width: '100%',
              marginRight: activeItemsList.length <= 2 ? '0' : '8%',
              margin: activeItemsList.length <= 2 ? '0 auto' : '0 8% 0 0',
              boxSizing: 'border-box' as const
            }}>
              {activeItemsList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '8px',
                    borderRadius: '12px',
                    boxShadow: `0 0 20px ${item.color}30`,
                    border: `.5px solid rgba(${parseInt(item.color.slice(1, 3), 16)},${parseInt(item.color.slice(3, 5), 16)},${parseInt(item.color.slice(5, 7), 16)},0.18)`,
                    display: 'flex',
                    flexDirection: 'column' as const,
                    alignItems: 'stretch',
                    minHeight: '350px',
                    boxSizing: 'border-box' as const,
                    width: '100%'
                  }}
                >
                  <BaseHeatmap
                    key={item.id}
                    fixedEmotion={item.id}
                    fillParent={true}
                    hideLegend={true}
                    metricType={metricType}
                    isActive={true}
                    itemColor={item.color}
                    timeRange={timeRange}
                    emotionData={emotionHeatmapData}
                    useMockData={!emotionHeatmapData || Object.keys(emotionHeatmapData).length === 0}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Weekly Highlights Section - Full Width */}
      <div style={{
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
      }}>
        {/* <WeeklyHighlights highlights={weeklyHighlights} /> */}
      </div>
    </div>
  );
}; 