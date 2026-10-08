// NOTE: Requires 'lucide-react' for icons. Install with: npm install lucide-react
import React, { useState, useEffect, useRef, useCallback } from 'react';
// Backend API removed - using IndexedDB storage
import * as d3 from 'd3';
import { Plus, Minus, Layers, Columns, CalendarDays, Search, ZoomIn, ZoomOut } from 'lucide-react';

// Helper function to generate a luminous glow color
const getGlowColor = (hexColor: string) => {
  const color = d3.color(hexColor);
  if (!color) return '#00F5D4';
  return color.brighter(0.8).formatHex();
};

// Replace the emotion data structure with relationship metrics
const RELATIONSHIP_METRICS = [
  { id: 'trust', name: 'Trust', color: '#00B894' },
  { id: 'quality', name: 'Quality', color: '#0984E3' },
  { id: 'activity', name: 'Activity', color: '#6C5CE7' },
  { id: 'support', name: 'Support', color: '#00CEC9' },
  { id: 'conflict', name: 'Conflict', color: '#D63031' },
  { id: 'growth', name: 'Growth', color: '#E17055' },
  { id: 'openness', name: 'Openness', color: '#FDCB6E' },
  { id: 'tension', name: 'Tension', color: '#636E72' },
  { id: 'intimacy', name: 'Intimacy', color: '#FD79A8' },
  { id: 'reciprocity', name: 'Reciprocity', color: '#00B8D4' },
  { id: 'closeness', name: 'Closeness', color: '#A29BFE' },
  { id: 'harmony', name: 'Harmony', color: '#81ECEC' },
  { id: 'alignment', name: 'Alignment', color: '#FAB1A0' },
  { id: 'warmth', name: 'Warmth', color: '#FFEAA7' },
  { id: 'respect', name: 'Respect', color: '#636EFA' },
  { id: 'depth', name: 'Depth', color: '#B2BEC3' },
];

// Helper to generate mock data for each metric
const createRelationshipMetricsData = () =>
  RELATIONSHIP_METRICS.map(metric => ({
    ...metric,
    data: Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      intensity: Math.max(0.1, Math.random() * 0.8 + (Math.sin(i / 5) * 0.2)),
    })),
  }));

const margin = { top: 20, right: 40, bottom: 80, left: 60 };

interface EmotionTimelineProps {
  sessionId?: string;
  useMockData?: boolean;
  onActiveEmotionsChange?: (activeEmotions: Record<string, boolean>) => void;
}

const RelationshipMetricsTimeline: React.FC<EmotionTimelineProps> = ({
  sessionId,
  useMockData = false,
  onActiveEmotionsChange
}) => {
  const [relationshipMetricsData, setRelationshipMetricsData] = useState(() => createRelationshipMetricsData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Significant Events - API-ready structure for LLM-generated monthly events
  const [significantEvents, setSignificantEvents] = useState(() => {
    // Mock data - replace with API call that gets LLM-analyzed significant events
    // 
    // EXPECTED API FORMAT FROM LLM ANALYSIS:
    // {
    //   id: string,
    //   timestamp: Date | string,           // Exact date of the significant moment
    //   targetEmotion: string,              // Specific emotion ID where marker should appear (e.g., 'joy', 'sadness')
    //   title: string,                      // Brief title of the event
    //   description: string,                // Detailed description of what happened
    //   category: string,                   // Event category (achievement, relationship, health, etc.)
    //   emotionalImpact: number,            // 0-1 scale of emotional significance
    //   relatedEmotions?: string[],         // Optional: other emotions affected
    //   messageCount?: number,              // Optional: number of related messages
    //   color?: string                      // Optional: will use targetEmotion color if not provided
    // }
    //
    // Example API call:
    // const response = await fetch(`/api/significant-events/${sessionId}`);
    // const events = await response.json(); // LLM returns 3 events per month with exact emotion/date

    const events = [
      {
        id: 'event-1',
        timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        targetEmotion: 'joy',                    // Marker will appear on the 'joy' emotion line
        title: 'Career Breakthrough',
        description: 'Got promoted to senior position after months of hard work. This moment marked a significant shift in confidence and professional growth.',
        category: 'achievement',
        emotionalImpact: 0.85,
        relatedEmotions: ['joy', 'excitement', 'gratitude'],
        messageCount: 12,
        color: '#FFD700'
      },
      {
        id: 'event-2',
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        targetEmotion: 'love',                   // Marker will appear on the 'love' emotion line
        title: 'Family Reunion',
        description: 'Long-awaited family gathering brought everyone together. Reconnecting with loved ones after months of separation created lasting emotional memories.',
        category: 'relationship',
        emotionalImpact: 0.78,
        relatedEmotions: ['love', 'joy', 'gratitude'],
        messageCount: 8,
        color: '#FF6B9D'
      },
      {
        id: 'event-3',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        targetEmotion: 'hope',                   // Marker will appear on the 'hope' emotion line
        title: 'Health Scare Resolution',
        description: 'Medical test results came back clear after weeks of anxiety. The relief and renewed appreciation for health created a profound emotional shift.',
        category: 'health',
        emotionalImpact: 0.72,
        relatedEmotions: ['hope', 'gratitude', 'calm'],
        messageCount: 6,
        color: '#45B7D1'
      },
      {
        id: 'event-4',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        targetEmotion: 'excitement',             // Marker will appear on the 'excitement' emotion line
        title: 'Creative Project Launch',
        description: 'Successfully launched a personal creative project that had been in development for months. The accomplishment brought renewed sense of purpose.',
        category: 'creativity',
        emotionalImpact: 0.68,
        relatedEmotions: ['excitement', 'anticipation', 'joy'],
        messageCount: 9,
        color: '#9D4EDD'
      }
    ];

    return events;
  });

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Track which emotions are active (clicked) - only 5 random emotions selected by default
  const [activeEmotions, setActiveEmotions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const metrics = createRelationshipMetricsData();

    // Get 5 random emotions
    const shuffled = [...metrics].sort(() => 0.5 - Math.random());
    const randomSelected = shuffled.slice(0, 5).map(e => e.id);

    metrics.forEach(metric => {
      initial[metric.id] = randomSelected.includes(metric.id);
    });
    return initial;
  });

  const [tooltip, setTooltip] = useState<any>(null);
  const [timeRange, setTimeRange] = useState({
    start: relationshipMetricsData[0].data[0].timestamp,
    end: relationshipMetricsData[0].data[relationshipMetricsData[0].data.length - 1].timestamp,
  });

  const d3Container = useRef<HTMLDivElement>(null);
  const dimensions = useRef({ width: 0, height: 600 });

  // Handle emotion pill clicks
  const toggleEmotion = (emotionId: string) => {
    setActiveEmotions(prev => ({
      ...prev,
      [emotionId]: !prev[emotionId]
    }));
  };

  // Create event tooltip content
  const createEventTooltip = (event: any) => {
    const impactPercentage = (event.emotionalImpact * 100).toFixed(0);
    const relatedEmotionsText = event.relatedEmotions.join(', ');

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
              <span class="metric-label">Emotional Impact</span>
              <span class="metric-value" style="color: ${event.color};">${impactPercentage}%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Related Messages</span>
              <span class="metric-value" style="color: ${event.color};">${event.messageCount}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Key Emotions</span>
              <span class="metric-value" style="color: ${event.color};">${relatedEmotionsText}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Fetch data from API
  const fetchRelationshipMetricsData = useCallback(async () => {
    if (useMockData || !sessionId) {
      setRelationshipMetricsData(createRelationshipMetricsData());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${''/* Backend removed */}/api/results/${sessionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData = await response.json();
      const transformedData = createRelationshipMetricsData();
      setRelationshipMetricsData(transformedData);

      // Update time range based on real data
      if (transformedData.length > 0 && transformedData[0].data.length > 0) {
        setTimeRange({
          start: transformedData[0].data[0].timestamp,
          end: transformedData[0].data[transformedData[0].data.length - 1].timestamp,
        });
      }
    } catch (err) {
      console.error('Error fetching emotion data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Fallback to mock data on error
      setRelationshipMetricsData(createRelationshipMetricsData());
    } finally {
      setLoading(false);
    }
  }, [sessionId, useMockData]);

  // Fetch data on component mount and when sessionId changes
  useEffect(() => {
    fetchRelationshipMetricsData();
  }, [fetchRelationshipMetricsData]);

  const drawChart = useCallback(() => {
    if (!d3Container.current || dimensions.current.width === 0) return;

    const { width, height } = dimensions.current;
    const brushHeight = 60;
    const mainChartHeight = height - brushHeight - 20;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = mainChartHeight - margin.top - margin.bottom;

    // Improved cleanup to prevent removeChild errors
    const container = d3.select(d3Container.current);
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Add gradient definitions
    const defs = svg.append('defs');

    relationshipMetricsData.forEach(metric => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${metric.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', innerHeight);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', metric.color)
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', metric.color)
        .attr('stop-opacity', 0.1);

      // Mini gradient for brush area
      const miniGradient = defs.append('linearGradient')
        .attr('id', `mini-gradient-${metric.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', brushHeight - 20);

      miniGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', metric.color)
        .attr('stop-opacity', 0.4);

      miniGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', metric.color)
        .attr('stop-opacity', 0.05);
    });

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const filteredData = relationshipMetricsData
      .filter(metric => activeEmotions[metric.id])
      .map(metric => ({
        ...metric,
        data: metric.data.filter((d: { timestamp: Date; intensity: number }) => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      }));

    // Full data for brush
    const fullData = relationshipMetricsData.filter(metric => activeEmotions[metric.id]);

    if (filteredData.every(e => e.data.length === 0)) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#6B7280')
        .style('font-size', '16px')
        .style('font-weight', '300')
        .text(loading ? 'Loading emotion data...' : 'No data in selected range');
      return;
    }

    // Main chart scales
    const xScale = d3.scaleTime()
      .domain([timeRange.start, timeRange.end])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0.02, 1.2])
      .range([innerHeight, 0]);

    // Brush scales (for full data range)
    const fullTimeExtent = d3.extent(relationshipMetricsData.flatMap(e => e.data), d => d.timestamp) as [Date, Date];
    const brushXScale = d3.scaleTime()
      .domain(fullTimeExtent)
      .range([0, innerWidth]);

    const brushYScale = d3.scaleLinear()
      .domain([0.02, 1.2])
      .range([brushHeight - 20, 0]);

    // Subtle grid lines
    g.selectAll('.grid-line-y')
      .data(yScale.ticks(4))
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

    // Clean axes with minimal styling
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%m/%d') as any)
      .tickSize(0)
      .tickPadding(12);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#9CA3AF')
      .style('font-size', '11px')
      .style('font-weight', '400');

    // Remove axis lines for cleaner look
    g.selectAll('.domain').remove();

    // Line generator
    const line = d3.line<any>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.intensity))
      .curve(d3.curveCardinal.tension(0.2));

    // Area generator
    const area = d3.area<any>()
      .x(d => xScale(d.timestamp))
      .y0(innerHeight)
      .y1(d => yScale(d.intensity))
      .curve(d3.curveCardinal.tension(0.2));

    // Mini line generator for brush
    const miniLine = d3.line<any>()
      .x(d => brushXScale(d.timestamp))
      .y(d => brushYScale(d.intensity))
      .curve(d3.curveCardinal.tension(0.2));

    // Mini area generator for brush
    const miniArea = d3.area<any>()
      .x(d => brushXScale(d.timestamp))
      .y0(brushHeight - 20)
      .y1(d => brushYScale(d.intensity))
      .curve(d3.curveCardinal.tension(0.2));

    // Draw emotion lines and areas with staggered animation
    filteredData.forEach((metric, index) => {
      if (metric.data.length < 2) return;

      // Area fill with gradient
      g.append('path')
        .datum(metric.data)
        .attr('fill', `url(#gradient-${metric.id})`)
        .attr('d', area)
        .attr('opacity', 0)
        .transition()
        .delay(index * 150)
        .duration(1000)
        .attr('opacity', 0.7);

      // Luminous line with glow effect
      g.append('path')
        .datum(metric.data)
        .attr('fill', 'none')
        .attr('stroke', metric.color)
        .attr('stroke-width', 2.5)
        .attr('d', line)
        .style('filter', `drop-shadow(0 0 8px ${metric.color}60)`)
        .attr('stroke-dasharray', function () {
          const length = (this as SVGPathElement).getTotalLength();
          return `${length} ${length}`;
        })
        .attr('stroke-dashoffset', function () {
          return (this as SVGPathElement).getTotalLength();
        })
        .transition()
        .delay(index * 150)
        .duration(1500)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
    });

    // Add significant events markers ON TOP of emotion lines
    const eventsGroup = g.append('g').attr('class', 'events-markers');

    // Filter events that are within the current time range AND have active target emotions
    const eventsInRange = significantEvents.filter(event =>
      event.timestamp >= timeRange.start &&
      event.timestamp <= timeRange.end &&
      activeEmotions[event.targetEmotion] // Only show if target emotion is active
    );

    // Remove any existing pulse animations to prevent conflicts
    eventsInRange.forEach(event => {
      const existingStyle = document.getElementById(`pulse-style-${event.id}`);
      if (existingStyle) existingStyle.remove();
    });

    eventsInRange.forEach((event, index) => {
      const x = xScale(event.timestamp);

      // Find the PRIMARY TARGET emotion where marker should appear (must be active)
      const targetEmotion = filteredData.find(metric =>
        metric.id === event.targetEmotion
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
              .duration(150)
              .attr('transform', 'rotate(45) scale(1.6)')
              .attr('x', -4)
              .attr('y', -4)
              .attr('width', 8)
              .attr('height', 8);

            d3.select(this).select('circle:first-child')
              .transition()
              .duration(150)
              .attr('r', 12)
              .attr('stroke-opacity', 0.8);
          })
          .on('mouseleave', function () {
            if (selectedEvent?.id !== event.id) {
              d3.select(this).select('rect')
                .transition()
                .duration(150)
                .attr('transform', 'rotate(45) scale(1)')
                .attr('x', -2.5)
                .attr('y', -2.5)
                .attr('width', 5)
                .attr('height', 5);

              d3.select(this).select('circle:first-child')
                .transition()
                .duration(150)
                .attr('r', 8)
                .attr('stroke-opacity', 0.5);
            }
          })
          .on('click', function (clickEvent) {
            clickEvent.stopPropagation();
            setSelectedEvent(event);

            // Create detailed event tooltip
            const rect = d3Container.current!.getBoundingClientRect();
            setTooltip({
              x: rect.left + margin.left + x + 20,
              y: rect.top + margin.top + markerY - 10,
              content: createEventTooltip(event),
              visible: true,
              isEvent: true
            });
          });
      }
    });

    // Timeline brush area setup
    const brushG = svg.append('g')
      .attr('class', 'brush-area')
      .attr('transform', `translate(${margin.left},${mainChartHeight + 0})`);

    // Add emotion pills between main graph and brush using foreign object
    const pillsContainer = svg.append('foreignObject')
      .attr('x', 0)
      .attr('y', mainChartHeight - 44)
      .attr('width', width)
      .attr('height', 40);

    const pillsDiv = pillsContainer.append('xhtml:div')
      .style('display', 'flex')
      .style('justify-content', 'space-between')
      .style('align-items', 'center')
      .style('flex-wrap', 'wrap')
      .style('gap', '8px')
      .style('padding', `0 ${margin.right}px 0 ${margin.left}px`)
      .style('width', '100%')
      .style('height', '100%')
      .style('box-sizing', 'border-box');

    relationshipMetricsData.forEach(metric => {
      const isActive = activeEmotions[metric.id];
      const pill = pillsDiv.append('xhtml:div')
        .style('background-color', isActive ? `${metric.color}15` : `${metric.color}08`)
        .style('border', `1px solid ${metric.color}${isActive ? '60' : '30'}`)
        .style('color', isActive ? metric.color : `${metric.color}80`)
        .style('padding', '6px 14px')
        .style('border-radius', '18px')
        .style('font-size', '12px')
        .style('font-weight', isActive ? '500' : '400')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '6px')
        .style('backdrop-filter', 'blur(10px)')
        .style('box-shadow', isActive ? `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 12px ${metric.color}30` : 'none')
        .style('font-family', "'Lato', sans-serif")
        .style('transition', 'all 0.3s ease')
        .style('cursor', 'pointer')
        .style('opacity', isActive ? '1' : '0.45')
        .style('transform', isActive ? 'scale(1)' : 'scale(0.95)')
        .on('click', function () {
          toggleEmotion(metric.id);
        })
        .on('mouseenter', function () {
          d3.select(this).style('transform', isActive ? 'scale(1.05)' : 'scale(1)');
        })
        .on('mouseleave', function () {
          d3.select(this).style('transform', isActive ? 'scale(1)' : 'scale(0.95)');
        });

      pill.append('xhtml:div')
        .style('width', '8px')
        .style('height', '8px')
        .style('border-radius', '50%')
        .style('background-color', metric.color)
        .style('box-shadow', isActive ? `0 0 8px ${metric.color}90, inset 0 0 4px ${metric.color}` : 'none')
        .style('opacity', isActive ? '1' : '0.55')
        .style('flex-shrink', '0');

      pill.append('xhtml:span')
        .text(metric.name);
    });

    // Minimal brush background
    brushG.append('rect')
      .attr('width', innerWidth)
      .attr('height', brushHeight)
      .attr('fill', 'transparent')
      .attr('stroke', '#374151')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.3)
      .attr('rx', 4);

    // Mini chart group
    const miniG = brushG.append('g')
      .attr('transform', 'translate(0, 10)');

    // Draw mini emotion lines in brush
    fullData.forEach((metric, index) => {
      if (metric.data.length < 2) return;

      // Mini area
      miniG.append('path')
        .datum(metric.data)
        .attr('fill', `url(#mini-gradient-${metric.id})`)
        .attr('d', miniArea)
        .attr('opacity', 0.6);

      // Mini line
      miniG.append('path')
        .datum(metric.data)
        .attr('fill', 'none')
        .attr('stroke', metric.color)
        .attr('stroke-width', 1)
        .attr('d', miniLine)
        .attr('opacity', 0.8);
    });

    // Brush functionality
    const brush = d3.brushX()
      .extent([[0, 0], [innerWidth, brushHeight - 10]])
      .on('brush end', (event: any) => {
        if (!event.sourceEvent) return;
        if (!event.selection) {
          setTimeRange({
            start: fullTimeExtent[0],
            end: fullTimeExtent[1]
          });
          return;
        }

        const [x0, x1] = event.selection;
        const newStart = brushXScale.invert(x0);
        const newEnd = brushXScale.invert(x1);

        setTimeRange({ start: newStart, end: newEnd });
      });

    const brushSelection = miniG.append('g')
      .attr('class', 'brush')
      .call(brush);

    // Style brush selection with teal accent
    brushSelection.selectAll('.selection')
      .attr('fill', '#00F5D4')
      .attr('fill-opacity', 0.15)
      .attr('stroke', '#00F5D4')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)
      .attr('rx', 2);

    brushSelection.selectAll('.handle')
      .attr('fill', '#00F5D4')
      .attr('stroke', 'none')
      .attr('rx', 1)
      .attr('width', 4)
      .attr('opacity', 0.8);

    // Set initial brush selection
    const initialSelection = [
      brushXScale(timeRange.start),
      brushXScale(timeRange.end)
    ];

    if (initialSelection.every(v => !isNaN(v) && isFinite(v))) {
      brushSelection.call(brush.move, initialSelection as [number, number]);
    }

    // Interactive overlay for main chart
    const overlay = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all');

    const focus = g.append('g').style('display', 'none');

    const focusLine = focus.append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#00F5D4')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.7);

    overlay
      .on('mouseover', () => {
        focus.style('display', null);
      })
      .on('mouseout', () => {
        focus.style('display', 'none');
        setTooltip(null);
      })
      .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        if (mouseX < 0 || mouseX > innerWidth) return;

        const x0 = xScale.invert(mouseX);
        focusLine.attr('transform', `translate(${mouseX},0)`);

        // Find the week containing this date
        const weekStart = new Date(x0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Saturday)

        // Create enhanced tooltip content with weekly summary
        let tooltipContent = `
          <div class="tooltip-container">
            <div class="tooltip-header">
              <div class="tooltip-date">${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div class="tooltip-subtitle">Weekly Emotional Landscape</div>
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-emotions">`;

        // Calculate weekly averages and create emotion entries
        const weeklyData: Array<{ emotion: string, avgIntensity: number, color: string, trend: string }> = [];

        filteredData.forEach(metric => {
          if (metric.data.length > 0) {
            // Get data points within this week
            const weekData = metric.data.filter((d: { timestamp: Date; intensity: number }) => d.timestamp >= weekStart && d.timestamp <= weekEnd);

            if (weekData.length > 0) {
              const avgIntensity = weekData.reduce((sum: number, d: { timestamp: Date; intensity: number }) => sum + d.intensity, 0) / weekData.length;

              // Calculate trend (simple comparison with previous week if available)
              const prevWeekStart = new Date(weekStart);
              prevWeekStart.setDate(prevWeekStart.getDate() - 7);
              const prevWeekEnd = new Date(weekEnd);
              prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

              const prevWeekData = metric.data.filter((d: { timestamp: Date; intensity: number }) => d.timestamp >= prevWeekStart && d.timestamp <= prevWeekEnd);
              let trend = '→';
              if (prevWeekData.length > 0) {
                const prevAvg = prevWeekData.reduce((sum: number, d: { timestamp: Date; intensity: number }) => sum + d.intensity, 0) / prevWeekData.length;
                trend = avgIntensity > prevAvg ? '↗' : avgIntensity < prevAvg ? '↘' : '→';
              }

              weeklyData.push({
                emotion: metric.name,
                avgIntensity,
                color: metric.color,
                trend
              });
            }
          }
        });

        // Sort by intensity (highest first)
        weeklyData.sort((a, b) => b.avgIntensity - a.avgIntensity);

        // Add emotion entries to tooltip
        weeklyData.forEach((data, index) => {
          const intensity = (data.avgIntensity * 100).toFixed(0);
          const barWidth = Math.max(12, data.avgIntensity * 80); // Minimum 12px width

          tooltipContent += `
            <div class="emotion-entry" style="margin-bottom: ${index === weeklyData.length - 1 ? '0' : '8px'};">
              <div class="emotion-header">
                <span class="emotion-name" style="color: ${data.color};">${data.emotion}</span>
                <span class="emotion-trend" style="color: ${data.color};">${data.trend}</span>
                <span class="emotion-intensity" style="color: ${data.color};">${intensity}%</span>
              </div>
              <div class="emotion-bar-container">
                <div class="emotion-bar" style="width: ${barWidth}px; background: linear-gradient(90deg, ${data.color}80, ${data.color}40); box-shadow: 0 0 8px ${data.color}30;"></div>
              </div>
            </div>`;
        });

        // Add sample message snippets (mock data for now)
        const mockMessages = [
          "Feeling grateful for family time this weekend",
          "Work stress is getting overwhelming lately",
          "Excited about the new project launch",
          "Missing friends during this busy period"
        ];

        tooltipContent += `
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-insights">
              <div class="insights-header">Key Moments</div>
              <div class="message-snippets">`;

        // Add 2-3 random messages for this week
        const weekMessages = mockMessages.slice(0, Math.min(3, mockMessages.length));
        weekMessages.forEach((message, index) => {
          tooltipContent += `
            <div class="message-snippet" style="margin-bottom: ${index === weekMessages.length - 1 ? '0' : '6px'};">
              "${message}"
            </div>`;
        });

        tooltipContent += `
              </div>
            </div>
          </div>`;

        const rect = d3Container.current!.getBoundingClientRect();
        setTooltip({
          x: rect.left + margin.left + mouseX + 20,
          y: rect.top + margin.top + 40,
          content: tooltipContent,
          visible: true
        });
      });

  }, [relationshipMetricsData, activeEmotions, timeRange, loading, significantEvents, selectedEvent]);

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
    if (onActiveEmotionsChange) {
      onActiveEmotionsChange(activeEmotions);
    }
  }, [activeEmotions, onActiveEmotionsChange]);

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
          {/* Enhanced luminous tooltip */}
          {tooltip && tooltip.visible && (
            <div
              className="fixed pointer-events-none z-50"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                maxWidth: '320px',
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 245, 212, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 245, 212, 0.1)',
                padding: '0',
                overflow: 'hidden'
              }}
            >
              <style>{`
                .tooltip-container {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                  color: #F0F0F0;
                }
                .tooltip-header {
                  padding: 16px 20px 12px 20px;
                  background: linear-gradient(135deg, rgba(0, 245, 212, 0.08), rgba(157, 78, 221, 0.08));
                }
                .tooltip-date {
                  font-size: 14px;
                  font-weight: 600;
                  color: #00F5D4;
                  margin-bottom: 2px;
                }
                .tooltip-subtitle {
                  font-size: 11px;
                  font-weight: 400;
                  color: #A0A0B0;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .tooltip-divider {
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(0, 245, 212, 0.3), transparent);
                  margin: 0 12px;
                }
                .tooltip-emotions {
                  padding: 16px 20px;
                }
                .emotion-entry {
                  margin-bottom: 8px;
                }
                .emotion-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 4px;
                }
                .emotion-name {
                  font-size: 12px;
                  font-weight: 500;
                }
                .emotion-trend {
                  font-size: 11px;
                  font-weight: 600;
                }
                .emotion-intensity {
                  font-size: 11px;
                  font-weight: 600;
                }
                .emotion-bar-container {
                  height: 3px;
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 2px;
                  overflow: hidden;
                }
                .emotion-bar {
                  height: 100%;
                  border-radius: 2px;
                  transition: width 0.3s ease;
                }
                .tooltip-insights {
                  padding: 12px 20px 16px 20px;
                  background: rgba(0, 0, 0, 0.2);
                }
                .insights-header {
                  font-size: 11px;
                  font-weight: 600;
                  color: #00F5D4;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 8px;
                }
                .message-snippet {
                  font-size: 11px;
                  color: #A0A0B0;
                  font-style: italic;
                  line-height: 1.4;
                  padding-left: 8px;
                  border-left: 2px solid rgba(0, 245, 212, 0.2);
                }
                
                /* Event Tooltip Styles */
                .event-tooltip-container {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                  color: #F0F0F0;
                  max-width: 350px;
                }
                .event-tooltip-header {
                  padding: 16px 20px;
                  border-radius: 12px 12px 0 0;
                }
                .event-category {
                  font-size: 10px;
                  font-weight: 700;
                  letter-spacing: 1px;
                  margin-bottom: 4px;
                }
                .event-title {
                  font-size: 16px;
                  font-weight: 600;
                  color: #F0F0F0;
                  margin-bottom: 6px;
                  line-height: 1.3;
                }
                .event-date {
                  font-size: 11px;
                  color: #A0A0B0;
                  font-weight: 400;
                }
                .event-divider {
                  height: 1px;
                  margin: 0 12px;
                }
                .event-content {
                  padding: 16px 20px;
                }
                .event-description {
                  font-size: 12px;
                  color: #E0E0E0;
                  line-height: 1.5;
                  margin-bottom: 16px;
                }
                .event-metrics {
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                }
                .metric-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .metric-label {
                  font-size: 11px;
                  color: #A0A0B0;
                  font-weight: 400;
                }
                .metric-value {
                  font-size: 11px;
                  font-weight: 600;
                }
              `}</style>
              <div dangerouslySetInnerHTML={{ __html: tooltip.content }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipMetricsTimeline; 