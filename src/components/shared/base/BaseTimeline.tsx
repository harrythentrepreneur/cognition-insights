import { logger } from '@/lib/utils/logger';
// NOTE: Requires 'lucide-react' for icons. Install with: npm install lucide-react
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { TimelineDataItem } from '../types/timeline';

// Intelligent data aggregation based on time range
const getOptimalDataDensity = (timeRange: { start: Date; end: Date }) => {
  const daysInRange = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));

  if (daysInRange > 730) return { maxPoints: 30, granularity: 'monthly' };       // 2+ years - show monthly aggregates
  if (daysInRange > 365) return { maxPoints: 45, granularity: 'biweekly' };      // 1-2 years - show biweekly aggregates  
  if (daysInRange > 180) return { maxPoints: 65, granularity: 'weekly' };        // 6+ months - show weekly
  if (daysInRange > 90) return { maxPoints: 90, granularity: 'weekly' };         // 3-6 months - weekly
  if (daysInRange > 21) return { maxPoints: 90, granularity: 'daily' };          // 3 weeks to 3 months - daily
  return { maxPoints: 21, granularity: 'daily-detailed' };                       // < 3 weeks - all daily points
};

// Calendar-period key generators for grouping data by real time boundaries
const getWeekKey = (d: Date): string => {
  // ISO week: Monday as start of week
  const date = new Date(d);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
};

const getBiweeklyKey = (d: Date, epochStart: Date): string => {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceEpoch = Math.floor((d.getTime() - epochStart.getTime()) / msPerWeek);
  const biweekIndex = Math.floor(weeksSinceEpoch / 2);
  return `bw-${biweekIndex}`;
};

const getMonthKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Aggregates data points by calendar boundaries (week, biweekly, month) or by
// equal-size chunks for daily granularity. Calendar-aware grouping ensures that
// each data point on the chart represents an actual time period (e.g. a real
// week Mon–Sun or a real calendar month) rather than an arbitrary slice of N days.
const aggregateData = (
  data: Array<{ timestamp: Date; intensity: number }>,
  maxPoints: number,
  granularity: string = 'daily'
) => {
  if (!data || data.length === 0) return data;

  // For daily / daily-detailed granularity, use simple chunking as before
  if (granularity === 'daily' || granularity === 'daily-detailed') {
    if (data.length <= maxPoints) return data;

    const aggregationSize = Math.ceil(data.length / maxPoints);
    const aggregated: Array<{ timestamp: Date; intensity: number }> = [];

    for (let i = 0; i < data.length; i += aggregationSize) {
      const chunk = data.slice(i, i + aggregationSize);
      if (chunk.length === 0) continue;

      let timestamp: Date;
      if (i === 0) {
        timestamp = chunk[0].timestamp;
      } else if (i + aggregationSize >= data.length) {
        timestamp = chunk[chunk.length - 1].timestamp;
      } else {
        const middleIndex = Math.floor(chunk.length / 2);
        timestamp = chunk[middleIndex].timestamp;
      }

      const avgIntensity = chunk.reduce((sum, d) => sum + d.intensity, 0) / chunk.length;
      aggregated.push({ timestamp, intensity: avgIntensity });
    }
    return aggregated;
  }

  // Calendar-aware aggregation for weekly / biweekly / monthly
  const epochStart = data[0].timestamp;
  const getKey = granularity === 'monthly'
    ? (d: Date) => getMonthKey(d)
    : granularity === 'biweekly'
      ? (d: Date) => getBiweeklyKey(d, epochStart)
      : (d: Date) => getWeekKey(d); // weekly

  const groups = new Map<string, Array<{ timestamp: Date; intensity: number }>>();

  for (const point of data) {
    const key = getKey(point.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(point);
  }

  const aggregated: Array<{ timestamp: Date; intensity: number }> = [];

  for (const [, points] of groups) {
    if (points.length === 0) continue;
    // Use the middle point's timestamp so the dot sits in the centre of the period
    const midIdx = Math.floor(points.length / 2);
    const avgIntensity = points.reduce((sum, d) => sum + d.intensity, 0) / points.length;
    aggregated.push({ timestamp: points[midIdx].timestamp, intensity: avgIntensity });
  }

  // Groups from Map iterate in insertion order (chronological since input is sorted)
  return aggregated;
};

// Generic timeline data creation function
const createTimelineData = (items: TimelineDataItem[], dataPatterns?: Record<string, (i: number) => number>) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 1095 }, (_, i) => ({
      // Generate daily timestamps: start from 3 years ago, increment by 1 day
      timestamp: new Date(Date.now() - (1095 - i) * 24 * 60 * 60 * 1000),
      intensity: dataPatterns?.[item.id] ? dataPatterns[item.id](i) : Math.max(0.2, Math.random() * 0.7),
    }))
  }));
};

interface SignificantEvent {
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

interface BaseTimelineProps {
  data: TimelineDataItem[];
  timeRange: { start: Date; end: Date };
  onActiveItemsChange?: (activeItems: Record<string, boolean>) => void;
  onTimeRangeChange?: (timeRange: { start: Date; end: Date }) => void;
  initialActiveItems?: Record<string, boolean>;
  dataPatterns?: Record<string, (i: number) => number>;
  preGeneratedTimelineData?: TimelineDataItem[];
  significantEvents?: SignificantEvent[];
  tooltipInsights?: string[];
  tooltipSubtitle?: string;
  tooltipCustomDetails?: (itemId: string, value: number, hoverDate: Date) => string | null;
  impactLabel?: string;
  relatedItemsLabel?: string;
  weeklyHighlights?: Array<{
    week: string;
    weekly_summary: string[];
    weekly_topics: string[];
  }>;
  realDataWeeks?: Set<string>;
  yAxisValueRange?: { min: number; max: number; prefix?: string; suffix?: string; color?: string } | ((activeItems: Record<string, boolean>) => { min: number; max: number; prefix?: string; suffix?: string; color?: string } | undefined);
  tooltipValueFormatter?: (itemId: string, intensity: number, granularity: string, hoverDate: Date) => string;
  isPinnedTimeRange?: boolean;
  onTogglePinTimeRange?: () => void;
  /** When set, crops the brush/scrubber to only show this date range instead of the full data extent */
  cropExtent?: { start: Date; end: Date } | null;
  /** When true, show dashed lines / dimmer area for revenue metrics in the attribution window */
  isEstimated?: boolean;
}

const BaseTimeline: React.FC<BaseTimelineProps> = ({
  data,
  timeRange: initialTimeRange,
  onActiveItemsChange,
  onTimeRangeChange,
  initialActiveItems,
  dataPatterns,
  preGeneratedTimelineData,
  significantEvents = [],
  tooltipInsights = ["Analyzing patterns in data...", "Tracking progress over time", "Monitoring key metrics"],
  tooltipSubtitle = "Weekly Data Insights",
  tooltipCustomDetails,
  impactLabel = "Impact",
  cropExtent,
  relatedItemsLabel = "Related Items",
  weeklyHighlights = [],
  realDataWeeks,
  yAxisValueRange,
  tooltipValueFormatter,
  isEstimated = false,
  isPinnedTimeRange = false,
  onTogglePinTimeRange
}) => {
  // Use pre-generated timeline data if provided, otherwise generate it
  const [timelineData, setTimelineData] = useState(() =>
    preGeneratedTimelineData || createTimelineData(data, dataPatterns)
  );

  const [activeItems, setActiveItems] = useState<Record<string, boolean>>(() => {
    // Use provided initial active items or default to 5 random items
    if (initialActiveItems) {
      return initialActiveItems;
    }

    const initial: Record<string, boolean> = {};

    // Get 5 random items as default
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    const randomSelected = shuffled.slice(0, 5).map(item => item.id);

    data.forEach(item => {
      initial[item.id] = randomSelected.includes(item.id);
    });

    return initial;
  });

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [tooltip, setTooltip] = useState<any>(null);
  const [lastValidTooltip, setLastValidTooltip] = useState<any>(null);
  const [timeRange, setTimeRange] = useState(() => {
    // Always trust the parent's time range — the parent (e.g. AdTrackerSection)
    // is responsible for restoring from localStorage.
    if (initialTimeRange) {
      logger.debug('🕐 [BaseTimeline] Using parent-provided time range:', initialTimeRange);
      return initialTimeRange;
    }

    // Fallback: use real data extent if available
    if (preGeneratedTimelineData && preGeneratedTimelineData.length > 0 && preGeneratedTimelineData[0].data?.length > 0) {
      const firstItem = preGeneratedTimelineData[0];
      return {
        start: firstItem.data[0].timestamp,
        end: firstItem.data[firstItem.data.length - 1].timestamp
      };
    }

    // Final fallback
    logger.debug('🕐 [BaseTimeline] No data available, using 30-day fallback range');
    return {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const d3Container = useRef<HTMLDivElement>(null);
  const dimensions = useRef({ width: 0, height: 600 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Single guard: once the time range is established (from parent or first data load),
  // the useEffect never overrides it — only brush interactions change it.
  const hasInitialized = useRef(!!initialTimeRange);

  // Sync internal timeRange when the parent pushes a new range
  // (e.g. from the hamburger menu date-range picker).
  useEffect(() => {
    if (!initialTimeRange) return;
    // Only update if the values actually changed (avoids infinite loops)
    setTimeRange(prev => {
      const sameStart = prev.start.getTime() === initialTimeRange.start.getTime();
      const sameEnd = prev.end.getTime() === initialTimeRange.end.getTime();
      if (sameStart && sameEnd) return prev;
      return initialTimeRange;
    });
  }, [initialTimeRange]);

  const [lastRealDataWeek, setLastRealDataWeek] = useState<{ weekId: string, highlights: string[] } | null>(null);

  const toggleItem = (itemId: string) => {
    setActiveItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Create event tooltip content
  const createEventTooltip = (event: any) => {
    const impactPercentage = (event.emotionalImpact * 100).toFixed(0);
    const relatedAreas = event.relatedEmotions.join(', ');

    return `
      <div class="event-tooltip-container">
        <div class="event-tooltip-header" style="background: linear-gradient(135deg, ${event.color}15, ${event.color}08);">
          <div class="event-category" style="color: ${event.color};">${event.category.toUpperCase()}</div>
          <div class="event-title">${event.title}</div>
          <div class="event-date">${event.timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</div>
        </div>
        <div class="event-divider" style="background: linear-gradient(90deg, transparent, ${event.color}40, transparent);"></div>
        <div class="event-content">
          <div class="event-description">${event.description}</div>
          <div class="event-metrics">
            <div class="metric-row">
              <span class="metric-label">${impactLabel}</span>
              <span class="metric-value" style="color: ${event.color};">${impactPercentage}%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Related Messages</span>
              <span class="metric-value" style="color: ${event.color};">${event.messageCount}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${relatedItemsLabel}</span>
              <span class="metric-value" style="color: ${event.color};">${relatedAreas}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };



  // Update timeline data when input data or pre-generated data changes.
  // CRITICAL: Once the time range has been initialized (from parent localStorage or
  // first data load), this effect NEVER overrides it. Only brush interactions change
  // the time range after initialization.
  useEffect(() => {
    if (preGeneratedTimelineData) {
      logger.debug('🕐 [BaseTimeline] Loading real timeline data with', preGeneratedTimelineData.length, 'items');
      setTimelineData(preGeneratedTimelineData);

      // Only set the time range on FIRST data arrival when no persisted range exists.
      if (!hasInitialized.current && preGeneratedTimelineData.length > 0 && preGeneratedTimelineData[0].data?.length > 0) {
        const firstItem = preGeneratedTimelineData[0];
        const fullRange = {
          start: firstItem.data[0].timestamp,
          end: firstItem.data[firstItem.data.length - 1].timestamp
        };

        logger.debug('🕐 [BaseTimeline] First data load — setting full extent time range:', fullRange);
        setTimeRange(fullRange);
        hasInitialized.current = true;

        if (onTimeRangeChange) {
          onTimeRangeChange(fullRange);
        }
      } else if (!hasInitialized.current) {
        // Data arrived but is empty — still mark initialized so we don't loop
        hasInitialized.current = true;
      }
    } else {
      // Generate data internally if not provided (mock mode)
      logger.debug('🕐 [BaseTimeline] Generating mock timeline data');
      setTimelineData(createTimelineData(data, dataPatterns));
    }
  }, [data, dataPatterns, preGeneratedTimelineData]); // Intentionally excludes onTimeRangeChange

  const drawChart = useCallback(() => {
    if (!d3Container.current || dimensions.current.width === 0) return;

    // Safety check to ensure container is still mounted
    if (!d3Container.current.isConnected) return;

    const { width, height } = dimensions.current;
    const brushHeight = 60;
    const mainChartHeight = height - brushHeight - 20;

    // Use consistent margins for perfect alignment between main chart and brush
    const margin = {
      top: 20,
      right: 40, // Reduced margin to extend timeline further right for better alignment
      bottom: 80,
      left: 58   // Fixed margin for consistent alignment
    };

    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = mainChartHeight - margin.top - margin.bottom;

    // Clear any existing content with safer cleanup
    const container = d3.select(d3Container.current);

    // Safety check before removing elements
    if (d3Container.current && d3Container.current.isConnected) {
      container.selectAll('svg').remove();
      container.selectAll('.clean-tooltip-container').remove();
    }

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Add gradient definitions
    const defs = svg.append('defs');

    timelineData.forEach(item => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${item.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', innerHeight);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', item.color)
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', item.color)
        .attr('stop-opacity', 0.1);

      // Dimmer gradient for estimated (attribution window) zone
      const estGradient = defs.append('linearGradient')
        .attr('id', `gradient-est-${item.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', innerHeight);

      estGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', item.color)
        .attr('stop-opacity', 0.4);

      estGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', item.color)
        .attr('stop-opacity', 0.05);

      // Mini gradient for brush area
      const miniGradient = defs.append('linearGradient')
        .attr('id', `mini-gradient-${item.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', brushHeight - 20);

      miniGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', item.color)
        .attr('stop-opacity', 0.4);

      miniGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', item.color)
        .attr('stop-opacity', 0.05);
    });

    // Define a clip path to prevent chart from drawing outside its boundaries
    defs.append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const { maxPoints, granularity } = getOptimalDataDensity(timeRange);

    // Prepare data for the main chart to ensure it fills the container seamlessly.
    // This is the core fix for the "cropping" issue.
    const filteredData = timelineData
      .filter(item => activeItems[item.id])
      .map(item => {
        const rawItemData = item.data;

        // Find data slice that extends just beyond the visible timeRange.
        // This ensures the line/area chart connects smoothly to the edges of the viewport.
        const bisect = d3.bisector((d: { timestamp: Date }) => d.timestamp).left;
        const startIndex = bisect(rawItemData, timeRange.start);
        const endIndex = bisect(rawItemData, timeRange.end);

        // Extend the slice by a small amount to ensure seamless edges
        // But keep the extension minimal to prevent scale distortion
        const extendedStartIndex = Math.max(0, startIndex - 1);
        const extendedEndIndex = Math.min(rawItemData.length, endIndex + 1);

        let dataSlice = rawItemData.slice(extendedStartIndex, extendedEndIndex);

        // CRITICAL FIX: Ensure we always have data at the exact timeRange boundaries
        // This prevents the visual scaling bug
        if (dataSlice.length > 0) {
          // If our extended data doesn't reach the timeRange start, add a boundary point
          if (dataSlice[0].timestamp > timeRange.start) {
            dataSlice.unshift({
              timestamp: timeRange.start,
              intensity: dataSlice[0].intensity
            });
          }

          // If our extended data doesn't reach the timeRange end, add a boundary point
          if (dataSlice[dataSlice.length - 1].timestamp < timeRange.end) {
            dataSlice.push({
              timestamp: timeRange.end,
              intensity: dataSlice[dataSlice.length - 1].intensity
            });
          }

          // ADDITIONAL FIX: After aggregation, ensure boundary alignment is preserved
          const aggregatedData = aggregateData(dataSlice, maxPoints, granularity);

          // Double-check that our aggregated data still covers the full timeRange
          if (aggregatedData.length > 0) {
            // Force first point to be exactly at timeRange.start
            if (aggregatedData[0].timestamp > timeRange.start) {
              aggregatedData[0] = {
                timestamp: timeRange.start,
                intensity: aggregatedData[0].intensity
              };
            }

            // Force last point to be exactly at timeRange.end
            const lastIndex = aggregatedData.length - 1;
            if (aggregatedData[lastIndex].timestamp < timeRange.end) {
              aggregatedData[lastIndex] = {
                timestamp: timeRange.end,
                intensity: aggregatedData[lastIndex].intensity
              };
            }
          }

          return {
            ...item,
            data: aggregatedData
          };
        }

        return {
          ...item,
          // Aggregate the prepared slice to maintain performance
          data: aggregateData(dataSlice, maxPoints, granularity)
        };
      });

    // Full data for brush (this remains unchanged, showing all data)
    let fullData = timelineData.filter(item => activeItems[item.id]);

    // When cropExtent is set, filter brush data to only show that range
    // and ensure it reaches exactly to the left and right edges.
    if (cropExtent) {
      fullData = fullData.map(item => {
        const rawItemData = item.data;
        const bisect = d3.bisector((d: { timestamp: Date }) => d.timestamp).left;
        const startIndex = bisect(rawItemData, cropExtent.start);
        const endIndex = bisect(rawItemData, cropExtent.end);

        // Extend by 1 point on each side to ensure interpolation reaches the edge smoothly
        const extendedStartIndex = Math.max(0, startIndex - 1);
        const extendedEndIndex = Math.min(rawItemData.length, endIndex + 1);
        
        let dataSlice = rawItemData.slice(extendedStartIndex, extendedEndIndex);
        
        // Pin the very first and last point to exact cropExtent boundaries to avoid spilling or gaps
        if (dataSlice.length > 0) {
          if (dataSlice[0].timestamp.getTime() < cropExtent.start.getTime()) {
            // Interpolate the intensity at the exact start boundary
            const d0 = { ...dataSlice[0] }; // Clone to avoid mutating original data
            const d1 = dataSlice.length > 1 ? dataSlice[1] : d0;
            if (d0.timestamp.getTime() !== d1.timestamp.getTime() && d1.timestamp.getTime() >= cropExtent.start.getTime()) {
               const t = (cropExtent.start.getTime() - d0.timestamp.getTime()) / (d1.timestamp.getTime() - d0.timestamp.getTime());
               d0.intensity = d0.intensity + t * (d1.intensity - d0.intensity);
            }
            d0.timestamp = cropExtent.start;
            dataSlice[0] = d0;
          } else if (dataSlice[0].timestamp.getTime() > cropExtent.start.getTime()) {
            dataSlice.unshift({
               timestamp: cropExtent.start,
               intensity: dataSlice[0].intensity
            });
          }

          const lastIdx = dataSlice.length - 1;
          if (dataSlice[lastIdx].timestamp.getTime() > cropExtent.end.getTime()) {
            // Interpolate the intensity at the exact end boundary
            const d1 = { ...dataSlice[lastIdx] }; // Clone to avoid mutating original data
            const d0 = dataSlice.length > 1 ? dataSlice[lastIdx - 1] : d1;
            if (d0.timestamp.getTime() !== d1.timestamp.getTime() && d0.timestamp.getTime() <= cropExtent.end.getTime()) {
               const t = (cropExtent.end.getTime() - d0.timestamp.getTime()) / (d1.timestamp.getTime() - d0.timestamp.getTime());
               d1.intensity = d0.intensity + t * (d1.intensity - d0.intensity);
            }
            d1.timestamp = cropExtent.end;
            dataSlice[lastIdx] = d1;
          } else if (dataSlice[lastIdx].timestamp.getTime() < cropExtent.end.getTime()) {
            dataSlice.push({
               timestamp: cropExtent.end,
               intensity: dataSlice[lastIdx].intensity
            });
          }
        }

        return {
          ...item,
          data: dataSlice
        };
      });
    }

    // Main chart scales - CRITICAL: Domain must always be exactly the timeRange
    // This ensures consistent visual width regardless of data density
    const xScale = d3.scaleTime()
      .domain([timeRange.start, timeRange.end])  // Fixed domain - never changes
      .range([0, innerWidth]);                   // Fixed range - always full width

    // Calculate local bounds dynamically to rest graph gracefully if there's no negative dip
    const localIntensities = filteredData.flatMap(item => item.data.map(d => d.intensity));
    const localMinIntensity = localIntensities.length > 0 ? Math.min(...localIntensities) : 0;

    // We keep global max to prevent the chart top from bouncing violently while scrubbing
    const activeData = timelineData.filter(item => activeItems[item.id]);
    const globalIntensities = activeData.flatMap(item => item.data.map(d => d.intensity));
    const globalMinIntensity = globalIntensities.length > 0 ? Math.min(...globalIntensities) : 0;
    const globalMaxIntensity = globalIntensities.length > 0 ? Math.max(...globalIntensities) : 0.6;

    // Main Chart Y-Domain: Only drop below 0 if the local view has a significant dip
    const isSignificantLocalDip = localMinIntensity < -globalMaxIntensity * 0.05;
    const yMin = isSignificantLocalDip ? localMinIntensity * 1.1 : 0;
    const yDomain = [yMin, Math.max(globalMaxIntensity * 1.1, 0.8)];

    // Brush Y-Domain: Must use global minimum so it never warps while scrubbing
    const brushYMin = globalMinIntensity < -globalMaxIntensity * 0.05 ? globalMinIntensity * 1.1 : 0;
    const brushYDomain = [brushYMin, Math.max(globalMaxIntensity * 1.1, 0.8)];

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([innerHeight, 0]);

    // Brush scales - use cropExtent if set, otherwise full data range
    const dataTimeExtent = d3.extent(timelineData.flatMap(e => e.data), d => d.timestamp) as [Date, Date];
    const fullTimeExtent: [Date, Date] = cropExtent
      ? [cropExtent.start, cropExtent.end]
      : dataTimeExtent;
    const brushXScale = d3.scaleTime()
      .domain(fullTimeExtent)
      .range([0, innerWidth]);

    const brushYScale = d3.scaleLinear()
      .domain(brushYDomain)
      .range([brushHeight - 20, 0]);

    // Apply the clip path to a new group that will contain the chart elements
    const mainChartGroup = g.append('g')
      .attr('clip-path', 'url(#clip)');

    // Ultra-clean responsive labeling for minimal aesthetic
    const timeSpanWeeks = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7));

    // X-axis formatting complete

    let tickCount: number;
    let tickFormat: (date: Date) => string;

    if (timeSpanWeeks > 104) {
      // 2+ years: Minimal year labels only
      tickCount = 3;
      tickFormat = d3.timeFormat('%Y');
    } else if (timeSpanWeeks > 52) {
      // 1-2 years: Clean year labels
      tickCount = 4;
      tickFormat = d3.timeFormat('%Y');
    } else if (timeSpanWeeks > 12) {
      // 3+ months: Show ALL months in the range
      const monthsInRange = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      tickCount = Math.min(monthsInRange + 1, 12); // Show all months, but cap at 12
      tickFormat = d3.timeFormat('%B'); // Full month names: January, February, etc.
    } else if (timeSpanWeeks > 3) {
      // 3 weeks to 3 months: Month + day for context
      tickCount = 4;
      tickFormat = d3.timeFormat('%b %d'); // Jan 15, Feb 20, etc.
    } else {
      // < 3 weeks: Show individual days
      tickCount = Math.min(7, Math.max(2, Math.ceil(timeSpanWeeks * 7)));
      tickFormat = d3.timeFormat('%b %d'); // Mar 15, Mar 16, etc.
    }

    const xAxis = d3.axisBottom(xScale)
      .ticks(tickCount)
      .tickFormat(tickFormat as any)
      .tickSize(0)
      .tickPadding(20); // More padding for ultra-clean spacing

    // Subtle grid lines - add before axes for proper layering
    const yTicks = yScale.ticks(4);
    g.selectAll('.grid-line-y')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d: number) => yScale(d))
      .attr('y2', (d: number) => yScale(d))
      .attr('stroke', '#374151')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 0.5);

    // Add a distinct zero-line only if the current domain goes below zero
    if (yDomain[0] < 0) {
      g.append('line')
        .attr('class', 'zero-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', '#4B5563')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    }

    // Render value labels on the left Y-axis mapped to actual data range
    const resolvedYAxisValueRange = typeof yAxisValueRange === 'function' ? yAxisValueRange(activeItems) : yAxisValueRange;
    if (resolvedYAxisValueRange) {
      const { min: rangeMin, max: rangeMax, prefix = '', suffix = '', color: labelColor = '#00F5D4' } = resolvedYAxisValueRange;
      const [domainMin, domainMax] = yScale.domain();

      const labelsToRender = yTicks.map(tick => {
        // Map this intensity tick to a real value within the data range
        const t = (tick - domainMin) / (domainMax - domainMin);
        const realValue = rangeMin + t * (rangeMax - rangeMin);
        // Format the label
        let label: string;
        if (Math.abs(realValue) >= 1000) {
          label = `${prefix}${(realValue / 1000).toFixed(1)}k${suffix}`;
        } else {
          label = `${prefix}${Math.round(realValue)}${suffix}`;
        }
        return { tick, label };
      });

      g.selectAll('.currency-label')
        .data(labelsToRender)
        .enter()
        .append('text')
        .attr('class', 'currency-label')
        .attr('x', -12)
        .attr('y', (d: { tick: number; label: string }) => yScale(d.tick) + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('fill', labelColor)
        .style('font-size', '10px')
        .style('font-weight', '400')
        .style('font-family', "'Lato', sans-serif")
        .style('opacity', '0.4')
        .style('letter-spacing', '0.3px')
        .text((d: { tick: number; label: string }) => d.label);
    }

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#6B7280')           // Lighter, more subtle color
      .style('font-size', '11px')         // Smaller, more elegant
      .style('font-weight', '300')        // Lighter weight for elegance
      .style('text-anchor', 'middle')     // Center align for cleaner look
      .style('opacity', '0.7');           // Subtle transparency for minimal look

    // Remove axis lines for cleaner look
    g.selectAll('.domain').remove();

    // Line generator - smooth continuous lines
    const line = d3.line<any>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.intensity))
      .curve(d3.curveCatmullRom.alpha(0.7)); // Smoother curves

    // Area generator - smooth continuous areas
    const area = d3.area<any>()
      .x(d => xScale(d.timestamp))
      .y0(yScale(0)) // Anchor dynamically to zero line
      .y1(d => yScale(d.intensity))
      .curve(d3.curveCatmullRom.alpha(0.7)); // Match line smoothness

    // Mini line generator for brush
    const miniLine = d3.line<any>()
      .x(d => brushXScale(d.timestamp))
      .y(d => brushYScale(d.intensity))
      .curve(d3.curveCatmullRom.alpha(0.7)); // Match main chart

    // Mini area generator for brush
    const miniArea = d3.area<any>()
      .x(d => brushXScale(d.timestamp))
      .y0(brushYScale(0)) // Anchor dynamically to zero line
      .y1(d => brushYScale(d.intensity))
      .curve(d3.curveCatmullRom.alpha(0.7)); // Match main chart

    // ── Attribution window boundary for hero timeline ──────────
    const heroTodayMs = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00').getTime();
    const heroAttrWindowMs = 7 * 24 * 60 * 60 * 1000;
    const heroAttrCutoff = new Date(heroTodayMs - heroAttrWindowMs);
    const heroCutoffX = xScale(heroAttrCutoff);
    const heroHasCutoff = heroCutoffX > 0 && heroCutoffX < innerWidth;

    // Attribution clip paths (real vs estimated zones)
    if (heroHasCutoff) {
      defs.append('clipPath').attr('id', 'clip-hero-real')
        .append('rect').attr('x', 0).attr('y', -margin.top).attr('width', heroCutoffX).attr('height', mainChartHeight + margin.top);

      defs.append('clipPath').attr('id', 'clip-hero-est')
        .append('rect').attr('x', heroCutoffX).attr('y', -margin.top).attr('width', innerWidth - heroCutoffX + margin.right).attr('height', mainChartHeight + margin.top);
    }

    // Metrics whose values include estimated revenue (affected by attribution window)
    // Everything else (ad spend, CPC, CPM, CTR, impressions, reach, etc.) is accurate
    const ESTIMATED_METRIC_IDS = new Set([
      'revenue', 'net-revenue', 'profit', 'roas', 'ltv', 'aov',
      'arr', 'mrr', 'business-valuation', 'cash-pending', 'refund-rate',
    ]);

    // Only animate on first mount — skip entrance animations on data updates
    // (e.g. forecast switch) to prevent charts appearing blank during 1.8s animation
    const isFirstDraw = !hasInitialized.current || !d3Container.current?.querySelector('svg');

    // Draw lines and areas INSIDE the clipped group
    filteredData.forEach((item, index) => {
      if (item.data.length < 2) return;

      const isEstimatedMetric = isEstimated && heroHasCutoff && ESTIMATED_METRIC_IDS.has(item.id);

      if (isEstimatedMetric) {
        // ── REAL ZONE: solid area + solid line (clipped left of cutoff) ──
        const realArea = mainChartGroup.append('path')
          .datum(item.data)
          .attr('fill', `url(#gradient-${item.id})`)
          .attr('d', area)
          .attr('clip-path', 'url(#clip-hero-real)');

        if (isFirstDraw) {
          realArea.attr('opacity', 0).transition().delay(index * 100).duration(1200).ease(d3.easeQuadInOut).attr('opacity', 0.85);
        } else {
          realArea.attr('opacity', 0.85);
        }

        const realLine = mainChartGroup.append('path')
          .datum(item.data)
          .attr('fill', 'none')
          .attr('stroke', item.color)
          .attr('stroke-width', 3.5)
          .attr('d', line)
          .attr('clip-path', 'url(#clip-hero-real)')
          .style('filter', `drop-shadow(0 0 12px ${item.color}70)`);

        if (isFirstDraw) {
          realLine
            .attr('stroke-dasharray', function () { const l = (this as SVGPathElement).getTotalLength(); return `${l} ${l}`; })
            .attr('stroke-dashoffset', function () { return (this as SVGPathElement).getTotalLength(); })
            .transition().delay(index * 100).duration(1800).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
        }

        // ── ESTIMATED ZONE: dimmer area + dashed line (clipped right of cutoff) ──
        const estArea = mainChartGroup.append('path')
          .datum(item.data)
          .attr('fill', `url(#gradient-est-${item.id})`)
          .attr('d', area)
          .attr('clip-path', 'url(#clip-hero-est)');

        if (isFirstDraw) {
          estArea.attr('opacity', 0).transition().delay(index * 100).duration(1200).ease(d3.easeQuadInOut).attr('opacity', 0.85);
        } else {
          estArea.attr('opacity', 0.85);
        }

        mainChartGroup.append('path')
          .datum(item.data)
          .attr('fill', 'none')
          .attr('stroke', item.color)
          .attr('stroke-width', 3.5)
          .attr('stroke-dasharray', '10,6')
          .attr('d', line)
          .attr('clip-path', 'url(#clip-hero-est)')
          .attr('opacity', 0.55)
          .style('filter', `drop-shadow(0 0 8px ${item.color}40)`);
      } else {
        // ── NO CUTOFF VISIBLE: render normally ──
        const normalArea = mainChartGroup.append('path')
          .datum(item.data)
          .attr('fill', `url(#gradient-${item.id})`)
          .attr('d', area);

        if (isFirstDraw) {
          normalArea.attr('opacity', 0).transition().delay(index * 100).duration(1200).ease(d3.easeQuadInOut).attr('opacity', 0.85);
        } else {
          normalArea.attr('opacity', 0.85);
        }

        const normalLine = mainChartGroup.append('path')
          .datum(item.data)
          .attr('fill', 'none')
          .attr('stroke', item.color)
          .attr('stroke-width', 3.5)
          .attr('d', line)
          .style('filter', `drop-shadow(0 0 12px ${item.color}70)`);

        if (isFirstDraw) {
          normalLine
            .attr('stroke-dasharray', function () { const l = (this as SVGPathElement).getTotalLength(); return `${l} ${l}`; })
            .attr('stroke-dashoffset', function () { return (this as SVGPathElement).getTotalLength(); })
            .transition().delay(index * 100).duration(1800).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
        }
      }
    });

    // ── BOUNDARY MARKER on hero timeline (after all metric lines) ──
    if (isEstimated && heroHasCutoff) {
      // Subtle vertical separator (only in attribution-estimated mode)
      mainChartGroup.append('line')
        .attr('x1', heroCutoffX).attr('x2', heroCutoffX)
        .attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', 'rgba(255,255,255,0.07)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0)
        .transition().delay(1600).duration(400).attr('opacity', 1);
    }

    // Add significant events markers ON TOP of emotion lines INSIDE the clipped group
    const eventsGroup = mainChartGroup.append('g').attr('class', 'events-markers');

    // Filter events that are within the current time range AND have active target emotions
    const eventsInRange = significantEvents.filter(event =>
      event.timestamp >= timeRange.start &&
      event.timestamp <= timeRange.end &&
      activeItems[event.targetEmotion] // Only show if target emotion is active
    );

    // Remove any existing pulse animations to prevent conflicts
    eventsInRange.forEach(event => {
      const existingStyle = document.getElementById(`pulse-style-${event.id}`);
      if (existingStyle) existingStyle.remove();
    });

    eventsInRange.forEach((event, index) => {
      const x = xScale(event.timestamp);

      // Find the PRIMARY TARGET emotion where marker should appear (must be active)
      const targetEmotion = filteredData.find(emotion =>
        emotion.id === event.targetEmotion
      );

      if (targetEmotion && targetEmotion.data.length > 0) {
        // Find the EXACT data point using more precise interpolation
        const bisect = d3.bisector((d: { timestamp: Date; intensity: number }) => d.timestamp).left;
        const i = bisect(targetEmotion.data, event.timestamp, 1);

        // Get the two surrounding points for better interpolation
        const d0 = targetEmotion.data[i - 1];
        const d1 = targetEmotion.data[i];

        // Choose the closest point, or interpolate if both exist
        let intensity: number;
        if (!d0) {
          intensity = d1.intensity;
        } else if (!d1) {
          intensity = d0.intensity;
        } else {
          // Linear interpolation between the two points for exact positioning
          const t = (event.timestamp.getTime() - d0.timestamp.getTime()) /
            (d1.timestamp.getTime() - d0.timestamp.getTime());
          intensity = d0.intensity + t * (d1.intensity - d0.intensity);
        }

        // Position marker EXACTLY on the center/tip of the target emotion line
        const markerY = yScale(intensity);
        const markerColor = event.color || targetEmotion.color;

        // Create marker group positioned exactly on the emotion line center
        const markerGroup = eventsGroup.append('g')
          .attr('class', 'event-marker')
          .attr('data-event-id', event.id)
          .attr('transform', `translate(${x}, ${markerY})`)
          .style('cursor', 'pointer');

        // Outer glow circle - positioned on the line tip
        markerGroup.append('circle')
          .attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', markerColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.5)
          .style('filter', `drop-shadow(0 0 12px ${markerColor}60)`);

        // Inner filled diamond - exactly on the line center/tip
        markerGroup.append('rect')
          .attr('x', -2.5)
          .attr('y', -2.5)
          .attr('width', 5)
          .attr('height', 5)
          .attr('fill', markerColor)
          .attr('transform', 'rotate(45)')
          .style('filter', `drop-shadow(0 0 6px ${markerColor}80)`)
          .attr('opacity', 0)
          .transition()
          .delay(index * 150 + 1500) // Animate well after lines are drawn
          .duration(800)
          .attr('opacity', 1);

        // Subtle pulsing glow on the line
        markerGroup.append('circle')
          .attr('r', 3)
          .attr('fill', markerColor)
          .attr('fill-opacity', 0.7)
          .attr('stroke', 'none')
          .style('animation', `pulse-${event.id} 4s infinite ease-in-out`);

        // Add CSS animation for subtle pulsing (only once per event)
        if (!document.getElementById(`pulse-style-${event.id}`)) {
          const style = document.createElement('style');
          style.id = `pulse-style-${event.id}`;
          style.textContent = `
            @keyframes pulse-${event.id} {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.3); opacity: 0.3; }
            }
          `;
          document.head.appendChild(style);
        }

        // Event marker interactions - keep marker perfectly on the line
        markerGroup
          .on('mouseenter', function () {
            d3.select(this).select('rect')
              .transition()
              .duration(200)
              .ease(d3.easeQuadOut)
              .attr('transform', 'rotate(45) scale(1.3)')
              .attr('x', -3.5)
              .attr('y', -3.5)
              .attr('width', 7)
              .attr('height', 7);

            d3.select(this).select('circle:first-child')
              .transition()
              .duration(200)
              .ease(d3.easeQuadOut)
              .attr('r', 10)
              .attr('stroke-opacity', 0.8);
          })
          .on('mouseleave', function () {
            if (selectedEvent?.id !== event.id) {
              d3.select(this).select('rect')
                .transition()
                .duration(250)
                .ease(d3.easeQuadOut)
                .attr('transform', 'rotate(45) scale(1)')
                .attr('x', -2.5)
                .attr('y', -2.5)
                .attr('width', 5)
                .attr('height', 5);

              d3.select(this).select('circle:first-child')
                .transition()
                .duration(250)
                .ease(d3.easeQuadOut)
                .attr('r', 8)
                .attr('stroke-opacity', 0.5);
            }
          })
          .on('click', function (clickEvent) {
            clickEvent.stopPropagation();
            setSelectedEvent(event);

            // Create detailed event tooltip with smart positioning
            const containerRect = d3Container.current!.getBoundingClientRect();

            // Smart positioning for event tooltip to prevent clipping
            const tooltipWidth = 320; // Max width from CSS
            const tooltipHeight = 250; // Estimated height for event tooltip (larger than regular tooltip)
            const padding = 20; // Desired padding from marker

            // Calculate marker position relative to viewport
            const markerScreenX = containerRect.left + margin.left + x;
            const markerScreenY = containerRect.top + margin.top + markerY;

            // Check available space on right and left
            const containerRightEdge = containerRect.right - margin.right; // Timeline's right boundary
            const containerLeftEdge = containerRect.left + margin.left; // Timeline's left boundary

            // Check available space within timeline boundaries
            const spaceOnRight = containerRightEdge - markerScreenX;
            const spaceOnLeft = markerScreenX - containerLeftEdge;

            let tooltipX: number;
            let tooltipY = markerScreenY - 10;

            // Position tooltip based on available space within timeline margins
            if (spaceOnRight >= tooltipWidth + padding) {
              // Enough space on the right within timeline margins - position normally
              tooltipX = markerScreenX + padding;
            } else if (spaceOnLeft >= tooltipWidth + padding) {
              // Not enough space on right but enough on left within timeline margins - flip to left
              tooltipX = markerScreenX - tooltipWidth - padding;
            } else {
              // Not enough space on either side within margins - use best available
              if (spaceOnRight > spaceOnLeft) {
                // More space on right - use right but clamp to container boundary
                tooltipX = Math.min(markerScreenX + padding, containerRightEdge - tooltipWidth);
              } else {
                // More space on left - use left but clamp to container boundary  
                tooltipX = Math.max(markerScreenX - tooltipWidth - padding, containerLeftEdge);
              }
            }

            // Ensure tooltip doesn't go off-screen vertically (still use viewport for vertical)
            if (tooltipY + tooltipHeight > window.innerHeight) {
              tooltipY = markerScreenY - tooltipHeight - 20; // Position above cursor
            }

            // Final bounds check - respect both container margins and viewport
            tooltipX = Math.max(containerLeftEdge, Math.min(tooltipX, containerRightEdge - tooltipWidth));
            tooltipY = Math.max(10, Math.min(tooltipY, window.innerHeight - tooltipHeight - 10));

            const eventTooltip = {
              x: tooltipX,
              y: tooltipY,
              content: createEventTooltip(event),
              visible: true,
              isEvent: true
            };
            setTooltip(eventTooltip);
            setLastValidTooltip(eventTooltip); // Save as last valid tooltip
          });
      }
    });

    // Timeline brush area setup - using exact same margin for perfect alignment
    const brushG = svg.append('g')
      .attr('class', 'brush-area')
      .attr('transform', `translate(${margin.left},${mainChartHeight + 0})`);

    // Add item pills between main graph and brush using foreign object
    const pillsContainer = svg.append('foreignObject')
      .attr('x', margin.left) // Use exact same margin as chart and brush
      .attr('y', mainChartHeight - 54) // Start higher for vertical glow room
      .attr('width', innerWidth) // Use exact same width as chart and brush
      .attr('height', 60); // Increase height for vertical glow room

    const pillsDiv = pillsContainer.append('xhtml:div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('flex-wrap', 'nowrap') // Prevent wrapping to keep horizontal
      .style('gap', '8px')
      .style('padding', `10px 15px 10px 0px`) // Start flush with container edge
      .style('width', '100%')
      .style('height', '100%')
      .style('box-sizing', 'border-box')
      .style('overflow-x', 'auto') // Enable horizontal scrolling
      .style('overflow-y', 'hidden') // Hide vertical overflow only
      .style('position', 'relative') // For fade effect positioning
      .style('mask', `linear-gradient(90deg, black calc(100% - 15px), transparent 100%)`) // Only fade on right side
      .style('-webkit-mask', `linear-gradient(90deg, black calc(100% - 15px), transparent 100%)`) // Webkit support
      .style('cursor', 'grab') // Show grab cursor initially
      .style('user-select', 'none'); // Prevent text selection during drag

    // Add drag-to-scroll functionality with ultra-smooth momentum
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let velocity = 0;
    let lastX = 0;
    let lastTime = 0;
    let animationFrame: number | null = null;
    let hasDragged = false; // Track if user has actually dragged
    let dragThreshold = 5; // Minimum pixels to consider it a drag
    let smoothedVelocity = 0; // Exponentially smoothed velocity
    let lastMovementTime = 0; // Track when last meaningful movement occurred

    const pillsElement = pillsDiv.node() as HTMLElement;

    // Ultra-smooth momentum scrolling optimized for 60fps
    const momentumScroll = () => {
      if (Math.abs(velocity) > 0.05) {
        const currentScrollLeft = pillsElement.scrollLeft;
        const maxScrollLeft = pillsElement.scrollWidth - pillsElement.clientWidth;

        // Single calculation for new position
        pillsElement.scrollLeft = Math.max(0, Math.min(currentScrollLeft + velocity, maxScrollLeft));

        // Check boundaries only after setting position
        if (pillsElement.scrollLeft === 0 || pillsElement.scrollLeft === maxScrollLeft) {
          velocity = 0;
          animationFrame = null;
        } else {
          velocity *= 0.985; // Ultra-light friction
          animationFrame = requestAnimationFrame(momentumScroll);
        }
      } else {
        velocity = 0;
        animationFrame = null;
      }
    };

    pillsDiv
      .on('mousedown', function (event: MouseEvent) {
        isDragging = true;
        hasDragged = false; // Reset drag flag
        startX = event.pageX;
        lastX = event.pageX;
        lastTime = Date.now();
        lastMovementTime = Date.now(); // Initialize movement time
        scrollLeft = pillsElement.scrollLeft;
        velocity = 0;
        smoothedVelocity = 0; // Reset smoothed velocity for clean start

        // Cancel any ongoing momentum
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }

        d3.select(this)
          .style('cursor', 'grabbing');
        event.preventDefault();
      })
      .on('mouseleave', function () {
        if (isDragging) {
          isDragging = false;
          d3.select(this)
            .style('cursor', 'grab');
          // Start momentum scrolling
          requestAnimationFrame(momentumScroll);
        }
      })
      .on('mouseup', function () {
        if (isDragging) {
          isDragging = false;
          d3.select(this)
            .style('cursor', 'grab');

          // Check if momentum should be applied (movement within last 100ms)
          const currentTime = Date.now();
          const timeSinceMovement = currentTime - lastMovementTime;

          if (timeSinceMovement > 100) {
            velocity = 0; // No momentum if stopped for 100ms+
          }

          // Start momentum scrolling only if velocity exists
          if (Math.abs(velocity) > 0.1) {
            requestAnimationFrame(momentumScroll);
          }

          // Add a small delay to prevent immediate clicks after drag
          if (hasDragged) {
            setTimeout(() => {
              hasDragged = false;
            }, 100);
          }
        }
      })
      .on('mousemove', function (event: MouseEvent) {
        if (!isDragging) return;
        event.preventDefault();

        const currentTime = Date.now();
        const currentX = event.pageX;
        const deltaX = currentX - lastX;
        const deltaTime = currentTime - lastTime;

        // Check if user has dragged beyond threshold
        if (!hasDragged && Math.abs(currentX - startX) > dragThreshold) {
          hasDragged = true;
        }

        // Optimized direct scrolling
        const dragDistance = currentX - startX;
        const targetScrollLeft = scrollLeft - dragDistance * 0.8;
        const maxScrollLeft = pillsElement.scrollWidth - pillsElement.clientWidth;

        // Single DOM update with clamped value
        pillsElement.scrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));

        // Simplified velocity calculation for 60fps
        if (deltaTime > 8) { // Only update velocity every ~8ms for smoother performance
          // Track meaningful movement
          if (Math.abs(deltaX) > 1) {
            lastMovementTime = currentTime;
          }

          // Simple velocity calculation
          const instantVelocity = -(deltaX / deltaTime) * 12;
          velocity = instantVelocity * 0.8; // Direct assignment with damping

          lastX = currentX;
          lastTime = currentTime;
        }
      });

    // Custom styling - no scrollbar, drag only
    pillsDiv.append('xhtml:style')
      .text(`
        /* Completely hide scrollbar for drag-only interaction */
        .pills-container {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .pills-container::-webkit-scrollbar {
          display: none; /* Chrome/Safari - completely hidden */
        }
        
        /* Ultra-smooth scrolling */
        .pills-container {
          scroll-behavior: auto; /* We handle smooth scrolling via JS */
        }
      `);

    // Add class for webkit scrollbar styling
    pillsDiv.attr('class', 'pills-container');

    timelineData.forEach(item => {
      const isActive = activeItems[item.id];
      const pill = pillsDiv.append('xhtml:div')
        .style('background-color', isActive ? `${item.color}15` : `${item.color}08`)
        .style('border', `1px solid ${item.color}${isActive ? '60' : '30'}`)
        .style('color', isActive ? item.color : `${item.color}80`)
        .style('padding', '6px 14px')
        .style('border-radius', '18px')
        .style('font-size', '12px')
        .style('font-weight', isActive ? '500' : '400')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '6px')
        .style('backdrop-filter', 'blur(10px)')
        .style('box-shadow', isActive ? `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 12px ${item.color}30` : 'none')
        .style('font-family', "'Lato', sans-serif")
        .style('transition', 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)')
        .style('cursor', 'pointer')
        .style('opacity', isActive ? '1' : '0.65')
        .style('transform', isActive ? 'scale(1)' : 'scale(0.98)')
        .style('flex-shrink', '0') // Prevent pills from shrinking
        .style('white-space', 'nowrap') // Keep text on one line
        .on('click', function (event: MouseEvent) {
          // Prevent click if user has dragged
          if (hasDragged) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          toggleItem(item.id);
        })
        .on('mouseenter', function () {
          d3.select(this)
            .style('transform', isActive ? 'scale(1.02)' : 'scale(1)')
            .style('opacity', '1');
        })
        .on('mouseleave', function () {
          d3.select(this)
            .style('transform', isActive ? 'scale(1)' : 'scale(0.98)')
            .style('opacity', isActive ? '1' : '0.65');
        });

      // Thumbnail or color dot
      if (item.thumbnail) {
        pill.append('xhtml:img')
          .attr('src', item.thumbnail)
          .attr('alt', '')
          .style('width', '20px')
          .style('height', '20px')
          .style('border-radius', '50%')
          .style('object-fit', 'cover')
          .style('flex-shrink', '0')
          .style('border', `1.5px solid ${isActive ? item.color : 'rgba(255,255,255,0.12)'}`)
          .style('box-shadow', isActive ? `0 0 6px ${item.color}60` : 'none')
          .style('opacity', isActive ? '1' : '0.6')
          .style('transition', 'all 0.25s ease');
      } else {
        pill.append('xhtml:div')
          .style('width', '8px')
          .style('height', '8px')
          .style('border-radius', '50%')
          .style('background-color', item.color)
          .style('box-shadow', isActive ? `0 0 8px ${item.color}90, inset 0 0 4px ${item.color}` : 'none')
          .style('opacity', isActive ? '1' : '0.5')
          .style('flex-shrink', '0');
      }

      pill.append('xhtml:span')
        .text(item.name)
        .style('flex-shrink', '0'); // Prevent text from shrinking
    });

    // Brush area background
    brushG.append('rect')
      .attr('width', innerWidth)
      .attr('height', brushHeight)
      .attr('fill', 'transparent')
      .attr('stroke', '#374151')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.3)
      .attr('rx', 4);

    const miniG = brushG.append('g')
      .attr('transform', 'translate(0, 10)');

    // Draw mini charts for brush
    fullData.forEach((item, index) => {
      if (item.data.length < 2) return;

      miniG.append('path')
        .datum(item.data)
        .attr('fill', `url(#mini-gradient-${item.id})`)
        .attr('d', miniArea)
        .attr('opacity', 0.6);

      miniG.append('path')
        .datum(item.data)
        .attr('fill', 'none')
        .attr('stroke', item.color)
        .attr('stroke-width', 1)
        .attr('d', miniLine)
        .attr('opacity', 0.8);
    });

    // Brush functionality with improved event handling
    const brush = d3.brushX()
      .extent([[0, 0], [innerWidth, brushHeight - 10]])
      .on('start', () => {
        // Add visual feedback on drag start
        brushSelection.selectAll('.handle')
          .transition()
          .duration(100)
          .attr('opacity', 1);
      })
      .on('brush', (event: any) => {
        if (!event.sourceEvent) return;
        if (!event.selection) return;

        // Provide immediate visual feedback during brush
        const [x0, x1] = event.selection;

        // Optional: Add real-time feedback here if needed
        // For now, keep it smooth by not updating timeRange during brush
      })
      .on('end', (event: any) => {
        if (!event.sourceEvent) return;

        // Reset handle opacity
        brushSelection.selectAll('.handle')
          .transition()
          .duration(200)
          .attr('opacity', 0.9);

        if (!event.selection) {
          // Brush was cleared — if pinned, restore the current time range instead of resetting
          if (isPinnedTimeRange) {
            const pinnedSelection = [
              brushXScale(timeRange.start),
              brushXScale(timeRange.end)
            ];
            if (pinnedSelection.every(v => !isNaN(v) && isFinite(v))) {
              brushSelection.call(brush.move, pinnedSelection as [number, number]);
            }
            return;
          }
          // Reset to crop extent if set, otherwise full data extent
          const resetExtent = cropExtent || { start: fullTimeExtent[0], end: fullTimeExtent[1] };
          const newTimeRange = {
            start: resetExtent.start,
            end: resetExtent.end
          };
          setTimeRange(newTimeRange);
          // Emit timeRange change to parent
          if (onTimeRangeChange) {
            onTimeRangeChange(newTimeRange);
          }
          return;
        }

        const [x0, x1] = event.selection;
        const newStart = brushXScale.invert(x0);
        const newEnd = brushXScale.invert(x1);

        const newTimeRange = { start: newStart, end: newEnd };
        setTimeRange(newTimeRange);
        // Emit timeRange change to parent
        if (onTimeRangeChange) {
          onTimeRangeChange(newTimeRange);
        }
      });

    const brushSelection = miniG.append('g')
      .attr('class', 'brush')
      .call(brush);

    brushSelection.selectAll('.selection')
      .attr('fill', '#00F5D4')
      .attr('fill-opacity', 0.15)
      .attr('stroke', '#00F5D4')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)
      .attr('rx', 2)
      .style('cursor', 'move');

    brushSelection.selectAll('.handle')
      .attr('fill', '#00F5D4')
      .attr('stroke', 'none')
      .attr('rx', 2)
      .attr('width', 12) // Make handles wider for easier grabbing
      .attr('height', brushHeight - 10)
      .attr('opacity', 0.9)
      .style('cursor', 'ew-resize');

    // Remove problematic invisible hit areas that interfere with D3's event system
    // Instead, the larger handles above provide better interaction

    // Set initial brush selection
    // Clamp the initial selection to technically valid brush coordinates
    // This prevents the brush handle from flying off-screen if timeRange diverges from cropExtent
    const initialSelection = [
      Math.max(0, Math.min(innerWidth, brushXScale(timeRange.start))),
      Math.max(0, Math.min(innerWidth, brushXScale(timeRange.end)))
    ];

    if (initialSelection.every(v => !isNaN(v) && isFinite(v))) {
      brushSelection.call(brush.move, initialSelection as [number, number]);
    }

    // Interactive overlay for main chart - Restrict to actual chart area only
    const overlay = g.append('rect')
      .attr('width', innerWidth) // Use exact chart width, no expansion
      .attr('height', innerHeight) // Use exact chart height, no expansion
      .attr('x', 0) // Start at chart boundary
      .attr('y', 0) // Start at chart boundary
      .attr('fill', 'none')
      .attr('pointer-events', 'all');

    overlay
      .on('mouseover', () => {
        // Clear any pending hide timeout IMMEDIATELY
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      })
      .on('mouseout', () => {
        // IMPROVED: Hide tooltip when leaving chart area
        hoverTimeoutRef.current = setTimeout(() => {
          setTooltip(null);
          setLastValidTooltip(null); // Clear last valid tooltip when leaving chart
          hoverTimeoutRef.current = null;
        }, 150); // Revert to original delay
      })
      .on('mousemove', (event) => {
        // Clear any pending hide timeout since we're actively moving
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }

        const [mouseX] = d3.pointer(event);

        // STRICT: Only show tooltip when mouse is within actual chart boundaries
        if (mouseX < 0 || mouseX > innerWidth) return;

        // Don't show tooltips when no emotions/items are selected
        const hasActiveItems = Object.values(activeItems).some(isActive => isActive);
        if (!hasActiveItems) return;

        const x0 = xScale.invert(mouseX);

        // Validate x0 date
        if (!x0 || isNaN(x0.getTime())) {
          logger.warn('Invalid date from xScale.invert:', x0, 'mouseX:', mouseX);
          return;
        }

        // IMPROVED: Debounced tooltip update to prevent excessive updates
        if (!tooltip || !tooltip.visible || Math.abs(tooltip.lastMouseX - mouseX) > 5) {
          // Only update tooltip if mouse moved significantly (5px+)

          if (d3Container.current) {
            const containerRect = d3Container.current.getBoundingClientRect();

            // Find the date/week containing this point
            const weekStart = new Date(x0);

            // Validate weekStart before manipulation
            if (!weekStart || isNaN(weekStart.getTime())) {
              logger.warn('Invalid weekStart date:', weekStart);
              return;
            }

            // Determine if we should show daily or weekly date in tooltip
            const isDailyGranularity = granularity === 'daily' || granularity === 'daily-detailed';
            const isWeeklyGranularity = granularity === 'weekly';
            const isMonthlyGranularity = granularity === 'monthly' || granularity === 'biweekly';
            const hoverTime = new Date(mouseX ? xScale.invert(mouseX) : weekStart).getTime();
            const hoverDateForFormatter = new Date(hoverTime);

            let dateLabel: string;
            // For daily granularity, snap to the nearest actual data point's date
            let snappedDate: Date | null = null;
            if (isDailyGranularity && timelineData.length > 0) {
              // Find the nearest data point across all active items to snap the date
              let minDist = Infinity;
              timelineData.forEach(item => {
                if (activeItems[item.id] && item.data.length > 0) {
                  item.data.forEach((d: { timestamp: Date; intensity: number }) => {
                    const dist = Math.abs(new Date(d.timestamp).getTime() - hoverTime);
                    if (dist < minDist) {
                      minDist = dist;
                      snappedDate = new Date(d.timestamp);
                    }
                  });
                }
              });
              if (snappedDate) {
                dateLabel = (snappedDate as Date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              } else {
                dateLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
            } else if (isMonthlyGranularity) {
              // Really zoomed out: show month + year, e.g. "March 2026"
              const hoverDate = new Date(hoverTime);
              dateLabel = hoverDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } else {
              // Show week range: "Mar 22 - Mar 28"
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              dateLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }

            // Dynamic subtitle based on granularity
            // Check if hovered date is today (partial/pending data)
            const isHoveredDateToday = isDailyGranularity && (() => {
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const hDate = snappedDate ? (snappedDate as Date) : weekStart;
              const hoveredStr = `${hDate.getFullYear()}-${String(hDate.getMonth() + 1).padStart(2, '0')}-${String(hDate.getDate()).padStart(2, '0')}`;
              return hoveredStr === todayStr;
            })();
            const dynamicSubtitle = isHoveredDateToday ? 'Day in Progress ⏳'
              : isDailyGranularity ? 'Daily Metrics'
              : isMonthlyGranularity ? 'Monthly Metrics'
              : isWeeklyGranularity ? 'Weekly Metrics'
              : tooltipSubtitle;

            // Create enhanced tooltip content with weekly summary
            let tooltipContent = `
                <div class="clean-tooltip-container">
                  <div class="clean-tooltip-header">
                    <div class="clean-tooltip-date">${dateLabel}</div>
                    <div class="clean-tooltip-subtitle">${dynamicSubtitle}</div>

            </div>
                  <div class="clean-tooltip-content">
                    <div class="clean-emotion-grid">`;

            // Calculate data values and create metric entries
            // Always snap to the nearest actual data point for exact values
            const weeklyData: Array<{ item: string, itemId: string, avgIntensity: number, color: string, trend: string }> = [];

            timelineData.forEach(item => {
              if (activeItems[item.id] && item.data.length > 0) {
                // Find the nearest actual data point to the hover position
                let closestIdx = 0;
                let closestDist = Infinity;

                item.data.forEach((d: { timestamp: Date; intensity: number }, idx: number) => {
                  const dist = Math.abs(new Date(d.timestamp).getTime() - hoverTime);
                  if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = idx;
                  }
                });

                const avgIntensity = item.data[closestIdx].intensity;

                if (avgIntensity > 0) {
                  // Calculate trend by comparing with the previous data point
                  let trend = '→';
                  if (closestIdx > 0) {
                    const prevIntensity = item.data[closestIdx - 1].intensity;
                    if (prevIntensity > 0) {
                      trend = avgIntensity > prevIntensity ? '↗' : avgIntensity < prevIntensity ? '↘' : '→';
                    }
                  }

                  weeklyData.push({
                    item: item.name,
                    itemId: item.id,
                    avgIntensity,
                    color: item.color,
                    trend
                  });
                }
              }
            });

            // Sort by intensity (highest first)
            weeklyData.sort((a, b) => b.avgIntensity - a.avgIntensity);

            // Add data metric entries to tooltip with clean styling
            // We'll check for weekly highlights later when we find the weekHighlights variable
            if (weeklyData.length > 0) {
              weeklyData.forEach((data) => {
                const displayValue = tooltipValueFormatter
                  ? tooltipValueFormatter(data.itemId, data.avgIntensity, granularity, hoverDateForFormatter)
                  : `${(data.avgIntensity * 100).toFixed(0)}%`;

                const customDetails = tooltipCustomDetails
                  ? tooltipCustomDetails(data.itemId, data.avgIntensity, hoverDateForFormatter)
                  : null;

                tooltipContent += `
                    <div class="clean-emotion-item" style="flex-direction: column; align-items: flex-start;">
                      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                        <div class="clean-emotion-left">
                          <div class="clean-emotion-indicator" style="background-color: ${data.color};"></div>
                          <span class="clean-emotion-name">${data.item}</span>
                        </div>
                        <div class="clean-emotion-right">
                          <span class="clean-emotion-trend">${data.trend}</span>
                          <span class="clean-emotion-value">${displayValue}</span>
                        </div>
                      </div>
                      ${customDetails ? `<div style="margin-top: 6px; padding-left: 14px; width: 100%; box-sizing: border-box;">${customDetails}</div>` : ''}
                    </div>`;
              });
            }

            // STABLE weekly highlights lookup - normalize to Monday of the week to prevent flashing
            const getStableWeekId = (date: Date): string => {
              // Validate date before processing
              if (!date || isNaN(date.getTime())) {
                logger.warn('Invalid date passed to getStableWeekId:', date);
                return '';
              }

              const mondayOfWeek = new Date(date);
              // Normalize to Monday of the week (start of week)
              mondayOfWeek.setDate(mondayOfWeek.getDate() - mondayOfWeek.getDay() + 1);
              // Normalize to start of day to ensure consistency
              mondayOfWeek.setHours(0, 0, 0, 0);

              // Additional validation after manipulation
              if (isNaN(mondayOfWeek.getTime())) {
                logger.warn('Invalid date after normalization:', mondayOfWeek);
                return '';
              }

              return mondayOfWeek.toISOString().split('T')[0];
            };

            // Enhanced helper to parse different week formats (weekly, monthly, bi-weekly, daily, consolidated)
            const parseWeekFormat = (weekStr: string): Date | null => {
              if (!weekStr) return null;

              // Handle consolidated format (e.g., '2024-W45-to-W47')
              if (weekStr.includes('-to-W')) {
                const match = weekStr.match(/^(\d{4})-W(\d{2})-to-W(\d{2})$/);
                if (match) {
                  const [, yearStr, startWeek, endWeek] = match;
                  const year = parseInt(yearStr);
                  const middleWeek = Math.floor((parseInt(startWeek) + parseInt(endWeek)) / 2);
                  const date = new Date(year, 0, 1);
                  const dayOfWeek = date.getDay();
                  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  date.setDate(date.getDate() - daysToMonday + (middleWeek - 1) * 7);
                  return date;
                }
              }

              // Handle batch format (e.g., '2025-batch-1')
              if (weekStr.includes('-batch-')) {
                const batchMatch = weekStr.match(/(\d{4})-batch-(\d+)/);
                if (batchMatch) {
                  const [, yearStr, batchStr] = batchMatch;
                  const year = parseInt(yearStr);
                  const batchNum = parseInt(batchStr);
                  // Place batches throughout the year
                  const weeksIntoBatch = (batchNum - 1) * 4; // Each batch represents ~4 weeks
                  const date = new Date(year, 0, 1);
                  date.setDate(date.getDate() + weeksIntoBatch * 7);
                  return date;
                }
              }

              // Handle daily format (e.g., '2024-07-15-daily')
              if (weekStr.includes('-daily')) {
                const dateStr = weekStr.replace('-daily', '');
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? null : date;
              }

              // Handle monthly format (e.g., '2023-M01')
              if (weekStr.includes('-M')) {
                const match = weekStr.match(/^(\d{4})-M(\d{2})$/);
                if (match) {
                  const [, yearStr, monthStr] = match;
                  const year = parseInt(yearStr);
                  const month = parseInt(monthStr) - 1; // JavaScript months are 0-indexed
                  return new Date(year, month, 1);
                }
              }

              // Handle bi-weekly format (e.g., '2023-BiW01')
              if (weekStr.includes('-BiW')) {
                const match = weekStr.match(/^(\d{4})-BiW(\d{2})$/);
                if (match) {
                  const [, yearStr, biWeekStr] = match;
                  const year = parseInt(yearStr);
                  const biWeekNum = parseInt(biWeekStr);
                  const date = new Date(year, 0, 1);
                  const dayOfWeek = date.getDay();
                  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  date.setDate(date.getDate() - daysToMonday + (biWeekNum - 1) * 14); // Bi-weekly = 14 days
                  return date;
                }
              }

              // Handle standard ISO week format (2024-W28)
              if (weekStr.includes('-W')) {
                const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
                if (match) {
                  const [, year, week] = match;
                  const date = new Date(parseInt(year), 0, 1);
                  const dayOfWeek = date.getDay();
                  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  date.setDate(date.getDate() - daysToMonday + (parseInt(week) - 1) * 7);
                  return date;
                }
              }

              // Try standard date parsing (YYYY-MM-DD)
              const date = new Date(weekStr);
              return isNaN(date.getTime()) ? null : date;
            };

            // Use stable week identifier that doesn't change as mouse moves within the week
            const stableWeekId = getStableWeekId(weekStart);

            // Skip if we couldn't get a valid week ID
            if (!stableWeekId) {
              return;
            }

            // Debug: Log if no data found for this week
            if (weeklyData.length === 0) {
              logger.debug(`🔍 [BaseTimeline] No data points found for ${stableWeekId}`, {
                dateLabel,
                activeItems: Object.keys(activeItems).filter(k => activeItems[k]),
                totalDataPoints: timelineData[0]?.data?.length || 0
              });
            }

            // Check if we're still in the same week as the last tooltip to prevent flashing
            if (tooltip && tooltip.lastWeekId === stableWeekId) {
              // Same week - reuse existing tooltip content but update position
              const tooltipWidth = 320;
              const tooltipHeight = 200;
              const padding = 20;

              const mouseScreenX = containerRect.left + margin.left + mouseX;
              const mouseScreenY = containerRect.top + margin.top + 40;
              const containerRightEdge = containerRect.right - margin.right;
              const containerLeftEdge = containerRect.left + margin.left;

              let tooltipX: number;
              let tooltipY = mouseScreenY;

              const spaceOnRight = containerRightEdge - mouseScreenX;
              const spaceOnLeft = mouseScreenX - containerLeftEdge;

              if (spaceOnRight >= tooltipWidth + padding) {
                tooltipX = mouseScreenX + padding;
              } else if (spaceOnLeft >= tooltipWidth + padding) {
                tooltipX = mouseScreenX - tooltipWidth - padding;
              } else {
                tooltipX = spaceOnRight > spaceOnLeft
                  ? Math.min(mouseScreenX + padding, containerRightEdge - tooltipWidth)
                  : Math.max(mouseScreenX - tooltipWidth - padding, containerLeftEdge);
              }

              if (tooltipY + tooltipHeight > window.innerHeight) {
                tooltipY = mouseScreenY - tooltipHeight - 20;
              }

              tooltipX = Math.max(containerLeftEdge, Math.min(tooltipX, containerRightEdge - tooltipWidth));
              tooltipY = Math.max(10, Math.min(tooltipY, window.innerHeight - tooltipHeight - 10));

              // Update position without recalculating content
              setTooltip((prev: any) => ({
                ...prev!,
                x: tooltipX,
                y: tooltipY
              }));
              return; // Skip content recalculation
            }

            // New week or first tooltip - calculate fresh content

            let weekHighlights = weeklyHighlights.find(w => {
              if (!w.week) return false;

              // Try exact match first
              if (w.week === stableWeekId) return true;

              // Try parsing the stored week using our enhanced parser
              const storedWeekDate = parseWeekFormat(w.week);
              if (!storedWeekDate) {
                logger.warn('Invalid stored week date:', w.week);
                return false;
              }

              const storedWeekMonday = getStableWeekId(storedWeekDate);
              if (storedWeekMonday === stableWeekId) return true;

              // Try within same week range (for cases where date format differs)
              const stableDate = new Date(stableWeekId);

              // Validate both dates before calculating difference
              if (!storedWeekDate || !stableDate || isNaN(stableDate.getTime())) {
                return false;
              }

              const timeDiff = Math.abs(stableDate.getTime() - storedWeekDate.getTime());
              const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

              // For consolidated segments (e.g., '2024-W45-to-W47'), check if hover date falls within range
              if (w.week.includes('-to-W')) {
                const match = w.week.match(/^\d{4}-W\d{2}-to-W\d{2}$/);
                if (match) {
                  const [, yearStr, startWeekStr, endWeekStr] = match;
                  const year = parseInt(yearStr);
                  const startWeek = parseInt(startWeekStr);
                  const endWeek = parseInt(endWeekStr);

                  // Calculate start and end dates
                  const startDate = new Date(year, 0, 1);
                  const dayOfWeek = startDate.getDay();
                  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  startDate.setDate(startDate.getDate() - daysToMonday + (startWeek - 1) * 7);

                  const endDate = new Date(year, 0, 1);
                  endDate.setDate(endDate.getDate() - daysToMonday + endWeek * 7);

                  // Check if hover date is within the consolidated range
                  return stableDate >= startDate && stableDate <= endDate;
                }
              }

              // For batch segments, be more lenient with matching (within 28 days)
              if (w.week.includes('-batch-')) {
                return daysDiff < 28;
              }

              // For monthly segments, check if we're within the same month
              if (w.week.includes('-M')) {
                return storedWeekDate.getMonth() === stableDate.getMonth() &&
                  storedWeekDate.getFullYear() === stableDate.getFullYear();
              }

              // For bi-weekly segments, check if we're within 14 days
              if (w.week.includes('-BiW')) {
                return daysDiff < 14;
              }

              // For daily segments, check if we're within the same day
              if (w.week.includes('-daily')) {
                return daysDiff < 1;
              }

              // For weekly segments, check if we're within 7 days
              return daysDiff < 7;
            });

            // --- ENHANCED LOGIC: Always find the nearest available weekly analysis ---
            let fallbackHighlights = null;
            let isNearbyFallback = false;

            // Check if current week highlights contain generic messages
            const isGenericHighlight = (highlight: string) =>
              highlight.includes('Minimal conversation activity') ||
              highlight.includes('Baseline emotional state') ||
              highlight.includes('Quiet period in communication');

            const hasGenericHighlights = weekHighlights && weekHighlights.weekly_summary &&
              weekHighlights.weekly_summary.every(h => isGenericHighlight(h));

            // If no highlights, generic highlights, or empty highlights, find nearest real analysis
            if (!weekHighlights || !weekHighlights.weekly_summary || weekHighlights.weekly_summary.length === 0 || hasGenericHighlights) {
              const stableDate = new Date(stableWeekId);

              // Looking for nearest real analysis

              // Find ALL weeks with real (non-generic) highlights, sorted by distance
              const allRealHighlights = weeklyHighlights
                .map(w => ({
                  ...w,
                  parsedDate: parseWeekFormat(w.week)
                }))
                .filter(w => {
                  if (!w.parsedDate || !w.weekly_summary || w.weekly_summary.length === 0) {
                    return false;
                  }

                  // Only include if it has real data (not generic fallbacks)
                  return w.weekly_summary.some(h => !isGenericHighlight(h));
                })
                .map(w => {
                  const timeDiff = Math.abs(stableDate.getTime() - w.parsedDate!.getTime());
                  const weeksDiff = timeDiff / (1000 * 60 * 60 * 24 * 7);
                  return {
                    ...w,
                    weeksDiff
                  };
                })
                .sort((a, b) => a.weeksDiff - b.weeksDiff); // Sort by closest first

              // Found real highlights

              if (allRealHighlights.length > 0) {
                // Always use the closest week with real data, regardless of distance
                const closestWeek = allRealHighlights[0];
                const direction = closestWeek.parsedDate!.getTime() < stableDate.getTime() ? 'before' : 'after';
                const weeksAgo = Math.round(closestWeek.weeksDiff);

                // Selected nearest real analysis

                fallbackHighlights = closestWeek;
                isNearbyFallback = true;

                // Adjust the fallback message based on time distance
                if (weeksAgo > 4) {
                  // For distant weeks, modify the summary to indicate time distance
                  fallbackHighlights = {
                    ...closestWeek,
                    weekly_summary: closestWeek.weekly_summary.map(s =>
                      `${weeksAgo} weeks ${direction}: ${s}`
                    )
                  };
                }
              } else {
                logger.debug('❌ [BaseTimeline] No real analysis found in entire timeline');
              }
            }

            // --- Tooltip always shows logic ---
            // Check if we have real data for this week
            const hasEmotionalData = weeklyData.length > 0 && weeklyData.some(item => item.avgIntensity > 0);
            const hasRealHighlights = weekHighlights && weekHighlights.weekly_summary && weekHighlights.weekly_summary.length > 0;

            // Determine if this week has any meaningful data
            const hasAnyData = hasEmotionalData || hasRealHighlights;

            // If realDataWeeks is provided, use it as the source of truth
            if (realDataWeeks && realDataWeeks.size > 0) {
              // Check if this week is in the set of real data weeks
              const isRealDataWeek = realDataWeeks.has(stableWeekId);
              // --- CHANGED: Do not hide tooltip, just show 0% values if not real data week ---
              // (No return here)
            } else {
              // Fallback to the original logic if realDataWeeks is not provided
              // --- CHANGED: Do not hide tooltip, just show 0% values if no data ---
              // (No return here)
            }

            let insights: string[] = [];
            if (weekHighlights && weekHighlights.weekly_summary && weekHighlights.weekly_summary.length > 0 && !hasGenericHighlights) {
              // Use real weekly highlights (limit to 3 items max)
              insights = weekHighlights.weekly_summary.slice(0, 3);
              // Using REAL weekly highlights
            } else if (fallbackHighlights && isNearbyFallback) {
              // Use nearby fallback highlights - they already include time prefix if distant
              insights = fallbackHighlights.weekly_summary.slice(0, 3);
              // Using nearest available analysis
            } else if (fallbackHighlights) {
              // Use fallback previous highlights (legacy case)
              insights = fallbackHighlights.weekly_summary.slice(0, 3);
              // Using fallback previous highlights
            } else {
              // Use default insights if nothing else (this should rarely happen now)
              insights = tooltipInsights;
              // Using default insights
            }

            // If we have highlights but no emotional data, show 0% values for a sample of emotions
            if ((weekHighlights && weekHighlights.weekly_summary && weekHighlights.weekly_summary.length > 0 && weeklyData.length === 0) || (fallbackHighlights && weeklyData.length === 0)) {
              // Get a sample of emotions to display with 0% values
              const sampleEmotions = ['Joy', 'Contentment', 'Curiosity', 'Social Energy', 'Hope'];
              const sampleColors = ['#FFD700', '#87CEEB', '#9370DB', '#FF6B9D', '#45B7D1'];

              sampleEmotions.forEach((emotion, idx) => {
                tooltipContent += `
                    <div class="clean-emotion-item">
                      <div class="clean-emotion-left">
                        <div class="clean-emotion-indicator" style="background-color: ${sampleColors[idx]};"></div>
                        <span class="clean-emotion-name">${emotion}</span>
                </div>
                      <div class="clean-emotion-right">
                        <span class="clean-emotion-trend">→</span>
                        <span class="clean-emotion-value">${tooltipValueFormatter ? tooltipValueFormatter(emotion, 0, granularity, hoverDateForFormatter) : '0%'}</span>
                </div>
              </div>`;
              });
            } else if (weeklyData.length === 0) {
              // --- CHANGED: Always show something, interpolate from closest available point ---
              // Find the closest data point for each active item
              timelineData.forEach(item => {
                if (activeItems[item.id] && item.data.length > 0) {
                  // Find the closest point in time to the hovered week
                  let closest = item.data.reduce((prev, curr) => {
                    const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - weekStart.getTime());
                    const currDiff = Math.abs(new Date(curr.timestamp).getTime() - weekStart.getTime());
                    return currDiff < prevDiff ? curr : prev;
                  });
                  const displayValue = tooltipValueFormatter
                    ? tooltipValueFormatter(item.id, closest.intensity, granularity, hoverDateForFormatter)
                    : `${(closest.intensity * 100).toFixed(0)}%`;
                  tooltipContent += `
                    <div class="clean-emotion-item">
                      <div class="clean-emotion-left">
                        <div class="clean-emotion-indicator" style="background-color: ${item.color};"></div>
                        <span class="clean-emotion-name">${item.name}</span>
                </div>
                      <div class="clean-emotion-right">
                        <span class="clean-emotion-trend">→</span>
                        <span class="clean-emotion-value">${displayValue}</span>
                </div>
              </div>`;
                }
              });
            }

            // Close emotion grid
            tooltipContent += `
            </div>`;

            // Weekly highlights commented out for now
            /*
            if (insights.length > 0) {
              tooltipContent += `
                    <div class="clean-insights-section">
                      <div class="clean-insights-header">Weekly Highlights</div>
                      <div class="clean-message-list">`;

              // Add insights for this week
              insights.slice(0, 3).forEach((insight) => {
                tooltipContent += `
                    <div class="clean-message-item">"${insight}"</div>`;
              });

              tooltipContent += `
                      </div>
              </div>`;
            }
            */

            tooltipContent += `
            </div>
          </div>`;

            // IMPROVED: Smart tooltip positioning to prevent clipping
            const tooltipWidth = 320; // Max width from CSS (max-width: 320px)
            const tooltipHeight = 200; // Estimated height
            const padding = 20; // Desired padding from cursor

            // Calculate mouse position relative to viewport
            const mouseScreenX = containerRect.left + margin.left + mouseX;
            const mouseScreenY = containerRect.top + margin.top + 40;

            // Check available space on right and left
            const containerRightEdge = containerRect.right - margin.right; // Timeline's right boundary
            const containerLeftEdge = containerRect.left + margin.left; // Timeline's left boundary

            // Check available space within timeline boundaries
            const spaceOnRight = containerRightEdge - mouseScreenX;
            const spaceOnLeft = mouseScreenX - containerLeftEdge;

            let tooltipX: number;
            let tooltipY = mouseScreenY;

            // Position tooltip based on available space within timeline margins
            if (spaceOnRight >= tooltipWidth + padding) {
              // Enough space on the right within timeline margins - position normally
              tooltipX = mouseScreenX + padding;
            } else if (spaceOnLeft >= tooltipWidth + padding) {
              // Not enough space on right but enough on left within timeline margins - flip to left
              tooltipX = mouseScreenX - tooltipWidth - padding;
            } else {
              // Not enough space on either side within margins - use best available
              if (spaceOnRight > spaceOnLeft) {
                // More space on right - use right but clamp to container boundary
                tooltipX = Math.min(mouseScreenX + padding, containerRightEdge - tooltipWidth);
              } else {
                // More space on left - use left but clamp to container boundary  
                tooltipX = Math.max(mouseScreenX - tooltipWidth - padding, containerLeftEdge);
              }
            }

            // Ensure tooltip doesn't go off-screen vertically (still use viewport for vertical)
            if (tooltipY + tooltipHeight > window.innerHeight) {
              tooltipY = mouseScreenY - tooltipHeight - 20; // Position above cursor
            }

            // Final bounds check - respect both container margins and viewport
            tooltipX = Math.max(containerLeftEdge, Math.min(tooltipX, containerRightEdge - tooltipWidth));
            tooltipY = Math.max(10, Math.min(tooltipY, window.innerHeight - tooltipHeight - 10));

            const newTooltip = {
              x: tooltipX,
              y: tooltipY,
              content: tooltipContent,
              visible: true,
              lastMouseX: mouseX, // Track last mouse position for debouncing
              lastWeekId: stableWeekId // Cache week ID to prevent recalculation
            };
            setTooltip(newTooltip);
            setLastValidTooltip(newTooltip); // Save as last valid tooltip
          }
        }
      });

  }, [timelineData, activeItems, timeRange, loading, significantEvents, selectedEvent, yAxisValueRange, tooltipValueFormatter, isPinnedTimeRange, cropExtent, isEstimated]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries.length > 0) {
        dimensions.current.width = entries[0].contentRect.width;
        drawChart();
      }
    });

    if (d3Container.current) {
      dimensions.current.width = d3Container.current.clientWidth;
      observer.observe(d3Container.current);
    }

    return () => {
      if (d3Container.current) {
        observer.unobserve(d3Container.current);
      }
    };
  }, [drawChart]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  useEffect(() => {
    if (onActiveItemsChange) {
      onActiveItemsChange(activeItems);
    }
  }, [activeItems, onActiveItemsChange]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      // Clean up D3 elements to prevent DOM conflicts
      if (d3Container.current) {
        const container = d3.select(d3Container.current);
        container.selectAll('svg').remove();
        container.selectAll('.clean-tooltip-container').remove();
      }
      // Clean up any lingering tooltips
      d3.select('body').selectAll('.clean-tooltip-container').remove();
    };
  }, []);

  useEffect(() => {
    if (!d3Container.current || data.length === 0) return;

    // Safety check to ensure container is still mounted
    if (!d3Container.current.isConnected) return;
  }, [data]);

  return (
    <div className="w-full py-16">
      {/* Glassmorphic container with breathing room */}
      <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"></div>

        {/* Error display */}
        {error && (
          <div className="text-red-400 text-sm mb-4 text-center">
            Error loading data: {error}. Using mock data.
          </div>
        )}

        {/* Pure visualization with generous spacing */}
        <div
          ref={d3Container}
          className="w-full relative"
          style={{ height: dimensions.current.height }}
        >
          {/* Clean Tooltip matching reflection tab design */}
          {tooltip && tooltip.visible && typeof document !== 'undefined' && createPortal(
            <div
              className="fixed pointer-events-none z-50"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                animation: 'tooltip-appear 0.2s ease-out'
              }}
            >
              <style>{`
                @keyframes tooltip-appear {
                  from {
                    opacity: 0;
                    transform: translateY(4px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                
                /* Clean Design System Tooltip */
                .clean-tooltip-container {
                  background-color: rgba(255, 255, 255, 0.04);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 25px;
                  backdrop-filter: blur(40px);
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                  overflow: hidden;
                  max-width: 320px;
                  min-width: 280px;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                
                .clean-tooltip-header {
                  padding: 16px 20px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                  background: rgba(255, 255, 255, 0.05);
                  }
                
                .clean-tooltip-date {
                    font-size: 14px;
                    font-weight: 600;
                    color: #00F5D4;
                    margin-bottom: 2px;
                  }
                
                .clean-tooltip-subtitle {
                  font-size: 12px;
                    font-weight: 400;
                    color: #A0A0B0;
                  opacity: 0.8;
                  }
                
                .clean-tooltip-content {
                  padding: 15px;
                  }
                
                .clean-emotion-grid {
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                  margin-bottom: 15px;
                  }
                
                .clean-emotion-item {
                    display: flex;
                    align-items: center;
                  justify-content: space-between;
                  padding: 8px 12px;
                  background: rgba(255, 255, 255, 0.02);
                  border: 1px solid rgba(255, 255, 255, 0.05);
                  border-radius: 12px;
                  transition: all 0.3s ease;
                  overflow: hidden;
                  box-sizing: border-box;
                  }
                
                .clean-emotion-item:hover {
                  background: rgba(255, 255, 255, 0.03);
                  border-color: rgba(255, 255, 255, 0.1);
                }
                
                .clean-emotion-left {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  min-width: 0;
                  overflow: hidden;
                  }
                
                .clean-emotion-indicator {
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  flex-shrink: 0;
                }
                
                .clean-emotion-name {
                  font-size: 13px;
                  font-weight: 400;
                  color: #A0A0B0;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  }
                
                .clean-emotion-right {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                }
                
                .clean-emotion-trend {
                  font-size: 12px;
                  color: #A0A0B0;
                  opacity: 0.7;
                  width: 16px;
                  text-align: center;
                }
                
                .clean-emotion-value {
                  font-size: 13px;
                  font-weight: 500;
                    color: #00F5D4;
                  min-width: 32px;
                  text-align: right;
                  }
                
                .clean-insights-section {
                  padding-top: 12px;
                  border-top: 1px solid rgba(255, 255, 255, 0.06);
                  }
                  
                .clean-insights-header {
                    font-size: 11px;
                  font-weight: 500;
                    color: #A0A0B0;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 8px;
                  opacity: 0.7;
                }
                
                .clean-message-list {
                    display: flex;
                    flex-direction: column;
                  gap: 6px;
                  }
                
                .clean-message-item {
                  font-size: 12px;
                    color: #A0A0B0;
                  line-height: 1.4;
                  padding: 6px 8px;
                  background: rgba(255, 255, 255, 0.01);
                  border-left: 2px solid rgba(0, 245, 212, 0.2);
                  border-radius: 4px;
                  font-style: italic;
                  opacity: 0.8;
                  }
              `}
              </style>
              <div dangerouslySetInnerHTML={{ __html: tooltip.content }} />
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
};

export default BaseTimeline; 