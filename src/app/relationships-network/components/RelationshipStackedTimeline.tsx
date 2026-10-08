// NOTE: Requires 'lucide-react' for icons. Install with: npm install lucide-react
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { TimelineDataItem } from '../types/timeline';

// Helper function to extract date from data point
const getDateFromDataPoint = (d: any): Date | null => {
  if ('timestamp' in d && d.timestamp) return d.timestamp;
  if ('date' in d && d.date) return d.date;
  return null;
};

// Intelligent data aggregation based on time range
const getOptimalDataDensity = (timeRange: { start: Date; end: Date }) => {
  const weeksInRange = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  
  if (weeksInRange > 104) return { maxPoints: 30, granularity: 'monthly' };    // 2+ years - show monthly aggregates
  if (weeksInRange > 52) return { maxPoints: 45, granularity: 'biweekly' };   // 1-2 years - show biweekly aggregates  
  if (weeksInRange > 26) return { maxPoints: 65, granularity: 'weekly' };     // 6+ months - show weekly
  if (weeksInRange > 12) return { maxPoints: 85, granularity: 'weekly' };     // 3+ months - all weekly
  return { maxPoints: 120, granularity: 'weekly-detailed' };                  // < 3 months - all weekly + interpolation
};

// Ensures percentages sum to exactly 100% by distributing rounding errors
const ensureExact100Percent = (values: number[]): number[] => {
  if (values.length === 0) return values;
  
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    // If all values are 0, distribute 100% evenly
    const equalShare = 100 / values.length;
    return values.map(() => equalShare);
  }
  
  // Normalize to 100%
  const normalized = values.map(v => (v / sum) * 100);
  
  // Calculate the sum after normalization
  const normalizedSum = normalized.reduce((a, b) => a + b, 0);
  const diff = 100 - normalizedSum;
  
  // If there's a rounding error, distribute it to the largest value
  // This ensures we don't create visible artifacts
  if (Math.abs(diff) > 0.0001) {
    const maxIndex = normalized.reduce((maxIdx, val, idx, arr) => 
      val > arr[maxIdx] ? idx : maxIdx, 0);
    normalized[maxIndex] += diff;
  }
  
  return normalized;
};

// Aggregates data to a maximum number of points without filtering by time.
// This allows us to feed it a data slice that extends beyond the viewport for seamless edges.
const aggregateData = (
  data: Array<any>,
  maxPoints: number
) => {
  if (!data || data.length === 0 || data.length <= maxPoints) {
    return data;
  }
  
  const aggregationSize = Math.ceil(data.length / maxPoints);
  const aggregated: Array<any> = [];
  
  for (let i = 0; i < data.length; i += aggregationSize) {
    const chunk = data.slice(i, i + aggregationSize);
    if (chunk.length === 0) continue;
    
    // CRITICAL FIX: Use edge timestamps for first and last points to prevent boundary issues
    let timestamp: Date;
    if (i === 0) {
      // First chunk: use the first timestamp (left boundary)
      timestamp = getDateFromDataPoint(chunk[0])!;
    } else if (i + aggregationSize >= data.length) {
      // Last chunk: use the last timestamp (right boundary)
      timestamp = getDateFromDataPoint(chunk[chunk.length - 1])!;
    } else {
      // Middle chunks: use middle timestamp as before
      const middleIndex = Math.floor(chunk.length / 2);
      timestamp = getDateFromDataPoint(chunk[middleIndex])!;
    }
    
    const avgIntensity = chunk.reduce((sum, d) => sum + d.intensity, 0) / chunk.length;
    
    aggregated.push({
      timestamp,
      intensity: avgIntensity
    });
  }
  
  return aggregated;
};

// Generic timeline data creation function
const createTimelineData = (items: TimelineDataItem[], dataPatterns?: Record<string, (i: number) => number>) => {
  return items.map(item => ({
    ...item,
    data: Array.from({ length: 156 }, (_, i) => ({
      // Generate weekly timestamps: start from 3 years ago, increment by 1 week
      timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
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

interface RelationshipStackedTimelineProps {
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
  impactLabel?: string;
  relatedItemsLabel?: string;
  weeklyHighlights?: Array<{
    week: string;
    weekly_summary: string[];
    weekly_topics: string[];
  }>;
  /** When set, crops the brush/scrubber to only show this date range */
  cropExtent?: { start: Date; end: Date } | null;
}

const RelationshipStackedTimeline: React.FC<RelationshipStackedTimelineProps> = ({ 
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
  impactLabel = "Impact",
  relatedItemsLabel = "Related Items",
  weeklyHighlights = [],
  cropExtent
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
  
  // Sync activeItems state when the parent supplies a new initialActiveItems object
  useEffect(() => {
    if (initialActiveItems) {
      setActiveItems(initialActiveItems);
    }
  }, [initialActiveItems]);
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  const [tooltip, setTooltip] = useState<any>(null);
  const [timeRange, setTimeRange] = useState(() => {
    // If we have real data (pre-generated timeline data), use its actual time range
    if (preGeneratedTimelineData && preGeneratedTimelineData.length > 0 && preGeneratedTimelineData[0].data && preGeneratedTimelineData[0].data.length > 0) {
      const firstItem = preGeneratedTimelineData[0];
      const firstPoint = firstItem.data[0];
      const lastPoint = firstItem.data[firstItem.data.length - 1];
      const actualStart = 'timestamp' in firstPoint && firstPoint.timestamp ? firstPoint.timestamp : ('date' in firstPoint && firstPoint.date ? firstPoint.date : null);
      const actualEnd = 'timestamp' in lastPoint && lastPoint.timestamp ? lastPoint.timestamp : ('date' in lastPoint && lastPoint.date ? lastPoint.date : null);
      
      if (!actualStart || !actualEnd) {
        // Fall back to mock range if dates are missing
        console.log('🕐 [BaseTimeline] Real data missing dates, falling back to mock range');
        return {
          start: new Date(Date.now() - 156 * 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        };
      }
      
      console.log('🕐 [BaseTimeline] Using real data time range:', {
        start: actualStart,
        end: actualEnd,
        totalWeeks: firstItem.data.length
      });
      return {
        start: actualStart,
        end: actualEnd
      };
    }
    
    // Fall back to initial time range passed from parent if available
    if (initialTimeRange) {
      console.log('🕐 [BaseTimeline] Using parent-provided time range:', initialTimeRange);
      return initialTimeRange;
    }
    
    // Last resort: use mock 3-year range (for pure mock data scenarios)
    console.log('🕐 [BaseTimeline] Falling back to 3-year mock range');
    return {
      start: new Date(Date.now() - 156 * 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const d3Container = useRef<HTMLDivElement>(null);
  const dimensions = useRef({ width: 0, height: 600 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add ref to track if we've already set the initial time range
  const hasSetInitialTimeRange = useRef(false);
  const lastTimeRangeRef = useRef<{ start: Date; end: Date } | null>(null);

  // Sync internal timeRange when the parent pushes a new range
  // (e.g. from the hamburger menu date-range picker).
  useEffect(() => {
    if (!initialTimeRange) return;
    setTimeRange(prev => {
      const sameStart = prev.start.getTime() === initialTimeRange.start.getTime();
      const sameEnd = prev.end.getTime() === initialTimeRange.end.getTime();
      if (sameStart && sameEnd) return prev;
      return initialTimeRange;
    });
  }, [initialTimeRange]);

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

  // Update timeline data when input data or pre-generated data changes
  useEffect(() => {
    if (preGeneratedTimelineData) {
      // Use the pre-generated data from parent
      console.log('🕐 [BaseTimeline] Loading real timeline data with', preGeneratedTimelineData.length, 'emotions');
      setTimelineData(preGeneratedTimelineData);
      
      // Only update time range if it actually changes and we haven't set it yet, or if this is the first time with real data
      if (preGeneratedTimelineData.length > 0 && preGeneratedTimelineData[0].data && preGeneratedTimelineData[0].data.length > 0) {
        const firstItem = preGeneratedTimelineData[0];
        const actualStart = getDateFromDataPoint(firstItem.data[0]);
        const actualEnd = getDateFromDataPoint(firstItem.data[firstItem.data.length - 1]);
        
        // Check if this time range is actually different from what we already have
        const isSameTimeRange = lastTimeRangeRef.current && 
          lastTimeRangeRef.current.start.getTime() === actualStart?.getTime() &&
          lastTimeRangeRef.current.end.getTime() === actualEnd?.getTime();
        
        if ((!hasSetInitialTimeRange.current || !isSameTimeRange) && actualStart && actualEnd) {
          console.log('🕐 [BaseTimeline] Setting time range for real data:', {
            start: actualStart,
            end: actualEnd,
            dataPoints: firstItem.data.length,
            isInitial: !hasSetInitialTimeRange.current,
            hasChanged: !isSameTimeRange
          });
          
          const newTimeRange = {
            start: actualStart,
            end: actualEnd
          };
          
          setTimeRange(newTimeRange);
          lastTimeRangeRef.current = newTimeRange;
          hasSetInitialTimeRange.current = true;
          
          // Only notify parent if this is actually a change
          if (onTimeRangeChange && !isSameTimeRange) {
            onTimeRangeChange(newTimeRange);
          }
        }
      }
    } else {
      // Generate data internally if not provided
      console.log('🕐 [BaseTimeline] Generating mock timeline data');
      setTimelineData(createTimelineData(data, dataPatterns));
      
      // Reset the flag when switching back to mock data
      if (hasSetInitialTimeRange.current) {
        hasSetInitialTimeRange.current = false;
        lastTimeRangeRef.current = null;
      }
    }
  }, [data, dataPatterns, preGeneratedTimelineData]); // Remove onTimeRangeChange from dependencies

  const drawChart = useCallback(() => {
    if (!d3Container.current || dimensions.current.width === 0) return;
    
    // Safety check to ensure container is still mounted
    if (!d3Container.current.isConnected) return;

    const { width, height } = dimensions.current;
    const brushHeight = 60;
    const mainChartHeight = height - brushHeight - 20;
    
    // Use consistent margins for perfect alignment between main chart and brush
    const margin = { 
      top: 25,    // Balanced for better top spacing
      right: 40,  // Reduced margin to extend timeline further right for better alignment
      bottom: 80, 
      left: 58    // Fixed margin for consistent alignment
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
        const bisect = d3.bisector((d: any) => getDateFromDataPoint(d)!).left;
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
          const firstTimestamp = getDateFromDataPoint(dataSlice[0]);
          if (firstTimestamp && firstTimestamp > timeRange.start) {
            dataSlice.unshift({
              timestamp: timeRange.start,
              intensity: dataSlice[0].intensity
            });
          }
          
          // If our extended data doesn't reach the timeRange end, add a boundary point
          const lastTimestamp = getDateFromDataPoint(dataSlice[dataSlice.length - 1]);
          if (lastTimestamp && lastTimestamp < timeRange.end) {
            dataSlice.push({
              timestamp: timeRange.end,
              intensity: dataSlice[dataSlice.length - 1].intensity
            });
          }
          
          // ADDITIONAL FIX: After aggregation, ensure boundary alignment is preserved
          const aggregatedData = aggregateData(dataSlice, maxPoints);
          
          // Double-check that our aggregated data still covers the full timeRange
          if (aggregatedData.length > 0) {
            // Force first point to be exactly at timeRange.start
            const firstAggTimestamp = getDateFromDataPoint(aggregatedData[0]);
            if (firstAggTimestamp && firstAggTimestamp > timeRange.start) {
              aggregatedData[0] = {
                timestamp: timeRange.start,
                intensity: aggregatedData[0].intensity
              };
            }
            
            // Force last point to be exactly at timeRange.end
            const lastIndex = aggregatedData.length - 1;
            const lastAggTimestamp = getDateFromDataPoint(aggregatedData[lastIndex]);
            if (lastAggTimestamp && lastAggTimestamp < timeRange.end) {
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
          data: aggregateData(dataSlice, maxPoints)
        };
      });

    // Full data for brush (this remains unchanged, showing all data)
    let fullData = timelineData.filter(item => activeItems[item.id]);

    // When cropExtent is set, filter brush data to only show that range
    if (cropExtent) {
      fullData = fullData.map(item => ({
        ...item,
        data: item.data.filter(d => {
          const t = getDateFromDataPoint(d);
          if (!t) return false;
          return t.getTime() >= cropExtent.start.getTime() && t.getTime() <= cropExtent.end.getTime();
        })
      }));
    }

    if (filteredData.every(e => e.data.length === 0)) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#6B7280')
        .style('font-size', '16px')
        .style('font-weight', '300')
        .text(loading ? 'Loading data...' : 'No data in selected range');
      return;
    }

    // Main chart scales - CRITICAL: Domain must always be exactly the timeRange
    // This ensures consistent visual width regardless of data density
    const xScale = d3.scaleTime()
      .domain([timeRange.start, timeRange.end])  // Fixed domain - never changes
      .range([0, innerWidth]);                   // Fixed range - always full width

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Brush scales - use cropExtent if set, otherwise full data range
    const dataTimeExtent = d3.extent(timelineData.flatMap(e => e.data), d => getDateFromDataPoint(d)) as [Date, Date];
    const fullTimeExtent: [Date, Date] = cropExtent
      ? [cropExtent.start, cropExtent.end]
      : dataTimeExtent;
    const brushXScale = d3.scaleTime()
      .domain(fullTimeExtent)
      .range([0, innerWidth]); // Exact same range as main chart

    const brushYScale = d3.scaleLinear()
      .domain([0, 100])
      .range([brushHeight - 20, 0]);

    // Apply the original clip path to a new group that will contain the chart elements
    // This prevents overflow outside chart boundaries
    const mainChartGroup = g.append('g')
      .attr('clip-path', 'url(#clip)');

    // Ultra-clean responsive labeling for minimal aesthetic
    const timeSpanWeeks = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
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
      // < 3 weeks: Show weeks (Week 1, Week 2, etc.)
      tickCount = Math.max(2, Math.ceil(timeSpanWeeks));
      tickFormat = (date: Date) => {
        const weekNumber = Math.ceil((date.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
        return `W${weekNumber}`;
      };
    }

    const xAxis = d3.axisBottom(xScale)
      .ticks(tickCount)
      .tickFormat(tickFormat as any)
      .tickSize(0)
      .tickPadding(20); // More padding for ultra-clean spacing

    // Subtle grid lines - add before axes for proper layering
    g.selectAll('.grid-line-y')
      .data([0, 25, 50, 75, 100])
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

    // Create x-axis first (doesn't depend on stacked data)
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#6B7280')           // Lighter, more subtle color
      .style('font-size', '11px')         // Smaller, more elegant
      .style('font-weight', '300')        // Lighter weight for elegance
      .style('text-anchor', 'middle')     // Center align for cleaner look
      .style('opacity', '0.7');           // Subtle transparency for minimal look

    // Prepare data for stacking
    // First, create a unified dataset with all timestamps
    const allTimestamps = new Set<number>();
    filteredData.forEach(item => {
      item.data.forEach(d => {
        const date = getDateFromDataPoint(d);
        if (date) allTimestamps.add(date.getTime());
      });
    });
    
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Create data points for stacking with normalized values
    const stackData = sortedTimestamps.map(timestamp => {
      const point: any = { timestamp: new Date(timestamp) };
      const values: number[] = [];
      const ids: string[] = [];
      
      // Collect all values for this timestamp
      filteredData.forEach(item => {
        const dataPoint = item.data.find(d => {
          const time = getDateFromDataPoint(d);
          return time && time.getTime() === timestamp;
        });
        if (dataPoint) {
          values.push(dataPoint.intensity);
          ids.push(item.id);
        } else {
          values.push(0);
          ids.push(item.id);
        }
      });
      
      // Apply strict normalization to ensure exact 100% sum
      const normalizedValues = ensureExact100Percent(values);
      
      // Debug: Check if sum is exactly 100%
      const sum = normalizedValues.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.0001) {
        console.warn(`[RelationshipStackedTimeline] Normalization error at ${timestamp}: sum = ${sum}%`);
      }
      
      // Assign normalized values to the point
      ids.forEach((id, index) => {
        point[id] = normalizedValues[index];
      });
      
      return point;
    });

    // Create stack generator
    const stack = d3.stack()
      .keys(filteredData.map(d => d.id))
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stackedData = stack(stackData);

    // Validate and clamp stacked data to ensure no values exceed [0, 100] bounds
    let hasViolations = false;
    const violations: string[] = [];
    
    stackedData.forEach((layer, layerIndex) => {
      layer.forEach((d, pointIndex) => {
        const timestampValue = (d as any).data.timestamp;
        const timestamp = timestampValue instanceof Date ? timestampValue : new Date(timestampValue);
        const itemId = filteredData[layerIndex]?.id || `layer-${layerIndex}`;
        
        if (d[0] < 0 || d[1] < 0 || d[0] > 100 || d[1] > 100) {
          hasViolations = true;
          violations.push(`${itemId} at ${timestamp.toISOString()}: [${d[0].toFixed(2)}, ${d[1].toFixed(2)}]`);
          
          // Clamp values to valid range
          const oldValues = [d[0], d[1]];
          d[0] = Math.max(0, Math.min(100, d[0]));
          d[1] = Math.max(0, Math.min(100, d[1]));
          // Ensure d[1] is always >= d[0]
          if (d[1] < d[0]) {
            d[1] = d[0];
          }
          
          console.debug(`[RelationshipStackedTimeline] Clamped ${itemId}: [${oldValues[0].toFixed(2)}, ${oldValues[1].toFixed(2)}] → [${d[0].toFixed(2)}, ${d[1].toFixed(2)}]`);
        }
      });
    });

    if (hasViolations) {
      console.warn('[RelationshipStackedTimeline] Stacked values exceeded bounds and were clamped to [0, 100]');
      console.debug('Violations found:', violations.slice(0, 5)); // Log first 5 violations
    }

    // FIXED: Lock y-scale domain to exactly [0, 100] to prevent rendering outside bounds
    // No dynamic adjustment based on data - this ensures visual consistency
    yScale.domain([0, 100]);
    brushYScale.domain([0, 100]);

    // Now create and render the y-axis with fixed 0-100% scale
    // Generate tick values at regular intervals
    const tickValues = [0, 25, 50, 75, 100]; // Fixed tick values for 0-100% scale
    
    const yAxis = d3.axisLeft(yScale)
      .tickValues(tickValues)
      .tickFormat((d: any) => `${Math.round(d)}%`)
      .tickSize(0)
      .tickPadding(10);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#6B7280')
      .style('font-size', '11px')
      .style('font-weight', '300')
      .style('opacity', '0.7');

    // Remove axis lines for cleaner look
    g.selectAll('.domain').remove();

    // Area generator for stacked data
    const area = d3.area<any>()
      .x(d => xScale(d.data.timestamp))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveMonotoneX); // Prevents overshoot beyond data points

    // Line generator for the top of each stack
    const line = d3.line<any>()
      .x(d => xScale(d.data.timestamp))
      .y(d => yScale(d[1]))
      .curve(d3.curveMonotoneX); // Prevents overshoot beyond data points

    // Mini area generator for brush (also stacked)
    const miniArea = d3.area<any>()
      .x(d => brushXScale(d.data.timestamp))
      .y0(d => brushYScale(d[0]))
      .y1(d => brushYScale(d[1]))
      .curve(d3.curveMonotoneX); // Prevents overshoot beyond data points

    // Draw stacked areas with animation
    stackedData.forEach((layer, index) => {
      const item = filteredData.find(d => d.id === layer.key);
      if (!item || layer.length < 2) return;

      // Area fill with gradient
      mainChartGroup.append('path')
        .datum(layer)
        .attr('fill', `url(#gradient-${item.id})`)
        .attr('d', area)
        .attr('opacity', 0)
        .transition()
        .delay(index * 150)
        .duration(1000)
        .attr('opacity', 0.8);

      // Top line with glow effect
      mainChartGroup.append('path')
        .datum(layer)
        .attr('fill', 'none')
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('d', line)
        .style('filter', `drop-shadow(0 0 8px ${item.color}60)`)
        .attr('stroke-dasharray', function() {
          const length = (this as SVGPathElement).getTotalLength();
          return `${length} ${length}`;
        })
        .attr('stroke-dashoffset', function() {
          return (this as SVGPathElement).getTotalLength();
        })
        .transition()
        .delay(index * 150)
        .duration(1500)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
    });

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
      
      // Find the stack layer for the target relationship
      const targetLayer = stackedData.find(layer => layer.key === event.targetEmotion);
      
      if (targetLayer && targetLayer.length > 0) {
        // Find the data point at the event timestamp
        const dataPoint = targetLayer.find(d => {
          const timestampValue = (d as any).data.timestamp;
          const timestamp = timestampValue instanceof Date ? timestampValue : new Date(timestampValue);
          return Math.abs(timestamp.getTime() - event.timestamp.getTime()) < 24 * 60 * 60 * 1000; // within a day
        });
        
        let markerY: number;
        if (dataPoint) {
          // Position marker at the top of the stack layer
          markerY = yScale(dataPoint[1]);
        } else {
          // Fallback: interpolate position
          const bisect = d3.bisector((d: any) => d.data.timestamp).left;
          const i = bisect(targetLayer, event.timestamp, 1);
          
          if (i === 0) {
            markerY = yScale(targetLayer[0][1]);
          } else if (i >= targetLayer.length) {
            markerY = yScale(targetLayer[targetLayer.length - 1][1]);
          } else {
            const d0 = targetLayer[i - 1];
            const d1 = targetLayer[i];
            const d0timestamp = (d0 as any).data.timestamp instanceof Date ? (d0 as any).data.timestamp : new Date((d0 as any).data.timestamp);
            const d1timestamp = (d1 as any).data.timestamp instanceof Date ? (d1 as any).data.timestamp : new Date((d1 as any).data.timestamp);
            const t = (event.timestamp.getTime() - d0timestamp.getTime()) / 
                     (d1timestamp.getTime() - d0timestamp.getTime());
            const interpolatedY = d0[1] + t * (d1[1] - d0[1]);
            markerY = yScale(interpolatedY);
          }
        }
        const targetItem = filteredData.find(item => item.id === event.targetEmotion);
        const markerColor = event.color || targetItem?.color || '#999';

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
          .on('mouseenter', function() {
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
          .on('mouseleave', function() {
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
          .on('click', function(clickEvent) {
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
            
            setTooltip({
              x: tooltipX,
              y: tooltipY,
              content: createEventTooltip(event),
              visible: true,
              isEvent: true
            });
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
      .on('mousedown', function(event: MouseEvent) {
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
      .on('mouseleave', function() {
        if (isDragging) {
          isDragging = false;
          d3.select(this)
            .style('cursor', 'grab');
          // Start momentum scrolling
          requestAnimationFrame(momentumScroll);
        }
      })
      .on('mouseup', function() {
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
      .on('mousemove', function(event: MouseEvent) {
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
        .on('click', function(event: MouseEvent) {
          // Prevent click if user has dragged
          if (hasDragged) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          toggleItem(item.id);
        })
        .on('mouseenter', function() {
          d3.select(this)
            .style('transform', isActive ? 'scale(1.02)' : 'scale(1)')
            .style('opacity', '1');
        })
        .on('mouseleave', function() {
          d3.select(this)
            .style('transform', isActive ? 'scale(1)' : 'scale(0.98)')
            .style('opacity', isActive ? '1' : '0.65');
        });

      pill.append('xhtml:div')
        .style('width', '8px')
        .style('height', '8px')
        .style('border-radius', '50%')
        .style('background-color', item.color)
        .style('box-shadow', isActive ? `0 0 8px ${item.color}90, inset 0 0 4px ${item.color}` : 'none')
        .style('opacity', isActive ? '1' : '0.5')
        .style('flex-shrink', '0');

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

    // Prepare brush data for stacking
    const brushAllTimestamps = new Set<number>();
    fullData.forEach(item => {
      item.data.forEach(d => {
        const time = 'timestamp' in d ? d.timestamp : ('date' in d ? d.date : undefined);
        if (time) brushAllTimestamps.add(time.getTime());
      });
    });
    
    const brushSortedTimestamps = Array.from(brushAllTimestamps).sort((a, b) => a - b);
    
    const brushStackData = brushSortedTimestamps.map(timestamp => {
      const point: any = { timestamp: new Date(timestamp) };
      const values: number[] = [];
      const ids: string[] = [];
      
      // Collect all values for this timestamp
      fullData.forEach(item => {
        const dataPoint = item.data.find(d => {
          const time = getDateFromDataPoint(d);
          return time && time.getTime() === timestamp;
        });
        if (dataPoint) {
          values.push(dataPoint.intensity);
          ids.push(item.id);
        } else {
          values.push(0);
          ids.push(item.id);
        }
      });
      
      // Apply strict normalization to ensure exact 100% sum
      const normalizedValues = ensureExact100Percent(values);
      
      // Debug: Check if sum is exactly 100%
      const sum = normalizedValues.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.0001) {
        console.warn(`[RelationshipStackedTimeline] Normalization error at ${timestamp}: sum = ${sum}%`);
      }
      
      // Assign normalized values to the point
      ids.forEach((id, index) => {
        point[id] = normalizedValues[index];
      });
      
      return point;
    });

    // Create stack for brush
    const brushStack = d3.stack()
      .keys(fullData.map(d => d.id))
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const brushStackedData = brushStack(brushStackData);

    // Validate brush stacked data
    brushStackedData.forEach(layer => {
      layer.forEach(d => {
        if (d[0] < 0 || d[1] < 0 || d[0] > 100 || d[1] > 100) {
          // Clamp values to valid range
          d[0] = Math.max(0, Math.min(100, d[0]));
          d[1] = Math.max(0, Math.min(100, d[1]));
          // Ensure d[1] is always >= d[0]
          if (d[1] < d[0]) {
            d[1] = d[0];
          }
        }
      });
    });

    // Draw stacked areas for brush
    brushStackedData.forEach((layer, index) => {
      const item = fullData.find(d => d.id === layer.key);
      if (!item || layer.length < 2) return;

      // Mini area for brush
      const miniAreaPath = d3.area<any>()
        .x(d => brushXScale(d.data.timestamp))
        .y0(d => brushYScale(d[0]))
        .y1(d => brushYScale(d[1]))
        .curve(d3.curveMonotoneX); // Prevents overshoot beyond data points

      miniG.append('path')
        .datum(layer)
        .attr('fill', `url(#mini-gradient-${item.id})`)
        .attr('d', miniAreaPath)
        .attr('opacity', 0.7);
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
          const newTimeRange = {
            start: fullTimeExtent[0],
            end: fullTimeExtent[1]
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
    const initialSelection = [
      brushXScale(timeRange.start),
      brushXScale(timeRange.end)
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
        // IMPROVED: Longer delay and better cleanup
        hoverTimeoutRef.current = setTimeout(() => {
        setTooltip(null);
          hoverTimeoutRef.current = null;
        }, 150); // Increased delay to prevent flashing
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

        const x0 = xScale.invert(mouseX);

        // IMPROVED: Debounced tooltip update to prevent excessive updates
        if (!tooltip || !tooltip.visible || Math.abs(tooltip.lastMouseX - mouseX) > 5) {
          // Only update tooltip if mouse moved significantly (5px+)
          
            if (d3Container.current) {
              const containerRect = d3Container.current.getBoundingClientRect();

        // Find the week containing this date
        const weekStart = new Date(x0);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);

        // Create enhanced tooltip content with weekly summary
        let tooltipContent = `
                <div class="clean-tooltip-container">
                  <div class="clean-tooltip-header">
                    <div class="clean-tooltip-date">${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div class="clean-tooltip-subtitle">${tooltipSubtitle}</div>
            </div>
                  <div class="clean-tooltip-content">
                    <div class="clean-emotion-grid">`;
        
        // Calculate weekly percentages for stacked data
        const weeklyData: Array<{item: string, avgIntensity: number, color: string, trend: string, messageCount: number}> = [];
        
        // Use original timeline data to ensure we have data for every week
        // First, calculate the total messages for this week across all active relationships
        let weekTotalMessages = 0;
        const weeklyMessagesByItem: Map<string, number> = new Map();
        
        // Calculate messages for each active relationship in this week
        timelineData.forEach(item => {
          if (activeItems[item.id]) {
            const weekItemData = item.data.filter(d => 
              getDateFromDataPoint(d)! >= weekStart && getDateFromDataPoint(d)! <= weekEnd
            );
            
            let itemWeeklyMessages = 0;
            weekItemData.forEach(d => {
              itemWeeklyMessages += d.intensity; // intensity contains the raw message count
            });
            
            if (itemWeeklyMessages > 0) {
              weeklyMessagesByItem.set(item.id, itemWeeklyMessages);
              weekTotalMessages += itemWeeklyMessages;
            }
          }
        });
        
        // Now create weekly data with calculated percentages
        if (weekTotalMessages > 0) {
          timelineData.forEach(item => {
            if (activeItems[item.id] && weeklyMessagesByItem.has(item.id)) {
              const weeklyMessageCount = weeklyMessagesByItem.get(item.id) || 0;
              const percentage = (weeklyMessageCount / weekTotalMessages) * 100;
                
              // Calculate trend by comparing with previous week
              const prevWeekStart = new Date(weekStart);
              prevWeekStart.setDate(prevWeekStart.getDate() - 7);
              const prevWeekEnd = new Date(weekEnd);
              prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
              
              // Calculate previous week's messages for this item
              let prevWeekMessages = 0;
              const prevWeekItemData = item.data.filter(d => 
                getDateFromDataPoint(d)! >= prevWeekStart && getDateFromDataPoint(d)! <= prevWeekEnd
              );
              prevWeekItemData.forEach(d => {
                prevWeekMessages += d.intensity;
              });
              
              // Calculate previous week's total and percentage
              let prevWeekTotal = 0;
              timelineData.forEach(otherItem => {
                if (activeItems[otherItem.id]) {
                  const prevData = otherItem.data.filter(d => 
                    getDateFromDataPoint(d)! >= prevWeekStart && getDateFromDataPoint(d)! <= prevWeekEnd
                  );
                  prevData.forEach(d => {
                    prevWeekTotal += d.intensity;
                  });
                }
              });
              
              let trend = '→';
              if (prevWeekTotal > 0) {
                const prevPercentage = (prevWeekMessages / prevWeekTotal) * 100;
                trend = percentage > prevPercentage ? '↗' : percentage < prevPercentage ? '↘' : '→';
              }
              
              weeklyData.push({
                item: item.name,
                avgIntensity: percentage / 100, // Convert to 0-1 for display
                color: item.color,
                trend,
                messageCount: Math.round(weeklyMessageCount)
              });
            }
          });
        }

        // Sort by intensity (highest first)
        weeklyData.sort((a, b) => b.avgIntensity - a.avgIntensity);

              // Add data metric entries to tooltip with clean styling
        weeklyData.forEach((data, index) => {
          const intensity = (data.avgIntensity * 100).toFixed(0);
          
          tooltipContent += `
                  <div class="clean-emotion-item">
                    <div class="clean-emotion-left">
                      <div class="clean-emotion-indicator" style="background-color: ${data.color};"></div>
                      <span class="clean-emotion-name">${data.item}</span>
              </div>
                    <div class="clean-emotion-right">
                      <span class="clean-emotion-trend">${data.trend}</span>
                      <span class="clean-emotion-value">${intensity}%</span>
                      <span class="clean-emotion-messages" style="color: #A0A0B0; font-size: 11px; margin-left: 8px;">(${data.messageCount} msgs)</span>
              </div>
            </div>`;
        });

              // STABLE weekly highlights lookup - normalize to Monday of the week to prevent flashing
        const getStableWeekId = (date: Date): string => {
          const mondayOfWeek = new Date(date);
          // Normalize to Monday of the week (start of week)
          mondayOfWeek.setDate(mondayOfWeek.getDate() - mondayOfWeek.getDay() + 1);
          // Normalize to start of day to ensure consistency
          mondayOfWeek.setHours(0, 0, 0, 0);
          return mondayOfWeek.toISOString().split('T')[0];
        };
        
        // Use stable week identifier that doesn't change as mouse moves within the week
        const stableWeekId = getStableWeekId(weekStart);
        
        // Check if we're still in the same week as the last tooltip to prevent flashing
        if (tooltip && tooltip.lastWeekId === stableWeekId) {
          // Same week - reuse existing tooltip content but update position
          const tooltipWidth = 320;
          const tooltipHeight = 150; // Reduced height without 
          
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
        
        // Close the tooltip content divs
        tooltipContent += `
            </div>
          </div>
        </div>`;

            // IMPROVED: Smart tooltip positioning to prevent clipping
            const tooltipWidth = 320; // Max width from CSS (max-width: 320px)
            const tooltipHeight = 150; // Reduced height without weekly highlights
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

        setTooltip({
              x: tooltipX,
              y: tooltipY,
          content: tooltipContent,
              visible: true,
              lastMouseX: mouseX, // Track last mouse position for debouncing
              lastWeekId: stableWeekId // Cache week ID to prevent recalculation
        });
            }
        }
      });

  }, [timelineData, activeItems, timeRange, loading, significantEvents, selectedEvent]);

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
          {tooltip && tooltip.visible && (
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
                  margin-bottom: 0;
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
                  }
                
                .clean-emotion-item:hover {
                  background: rgba(255, 255, 255, 0.03);
                  border-color: rgba(255, 255, 255, 0.1);
                }
                
                .clean-emotion-left {
                  display: flex;
                  align-items: center;
                  gap: 8px;
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
                
                .clean-emotion-messages {
                  font-size: 11px;
                  color: #A0A0B0;
                  opacity: 0.8;
                  white-space: nowrap;
                }
              `}
              </style>
              <div dangerouslySetInnerHTML={{ __html: tooltip.content }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipStackedTimeline; 