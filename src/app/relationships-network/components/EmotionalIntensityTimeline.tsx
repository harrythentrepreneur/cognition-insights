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

// Determine optimal data density based on zoom level
const getOptimalDataDensity = (timeRange: { start: Date; end: Date }) => {
  const weeksInRange = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7));

  if (weeksInRange > 104) return { maxPoints: 30, granularity: 'monthly' };    // 2+ years - show monthly aggregates
  if (weeksInRange > 52) return { maxPoints: 45, granularity: 'biweekly' };   // 1-2 years - show biweekly aggregates  
  if (weeksInRange > 26) return { maxPoints: 65, granularity: 'weekly' };     // 6+ months - show weekly
  if (weeksInRange > 12) return { maxPoints: 85, granularity: 'weekly' };     // 3+ months - all weekly
  return { maxPoints: 120, granularity: 'weekly-detailed' };                  // < 3 months - all weekly + interpolation
};

// Aggregates data to a maximum number of points for clean visualization
const aggregateData = (
  data: Array<{ timestamp: Date; intensity: number }>,
  maxPoints: number
) => {
  if (!data || data.length === 0 || data.length <= maxPoints) {
    return data;
  }

  const aggregationSize = Math.ceil(data.length / maxPoints);
  const aggregated: Array<{ timestamp: Date; intensity: number }> = [];

  for (let i = 0; i < data.length; i += aggregationSize) {
    const chunk = data.slice(i, i + aggregationSize);
    if (chunk.length === 0) continue;

    // Use edge timestamps for first and last points to prevent boundary issues
    let timestamp: Date;
    if (i === 0) {
      // First chunk: use the first timestamp (left boundary)
      timestamp = chunk[0].timestamp;
    } else if (i + aggregationSize >= data.length) {
      // Last chunk: use the last timestamp (right boundary)
      timestamp = chunk[chunk.length - 1].timestamp;
    } else {
      // Middle chunks: use middle timestamp
      const middleIndex = Math.floor(chunk.length / 2);
      timestamp = chunk[middleIndex].timestamp;
    }

    const avgIntensity = chunk.reduce((sum, d) => sum + d.intensity, 0) / chunk.length;

    aggregated.push({
      timestamp,
      intensity: avgIntensity
    });
  }

  return aggregated;
};

// Real relationship data structure using our people data
const createRelationshipsData = (apiData?: any) => {
  // Our people data with relationship strength over time
  const mockData = [
    {
      id: 'alex',
      name: 'Alex',
      color: '#FF6B9D',
      data: Array.from({ length: 156 }, (_, i) => ({
        timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.8 + (Math.sin(i / 5) * 0.2)),
      })),
    },
    {
      id: 'jordan',
      name: 'Jordan',
      color: '#4ECDC4',
      data: Array.from({ length: 156 }, (_, i) => ({
        timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.7 + (Math.cos(i / 6) * 0.15)),
      })),
    },
    {
      id: 'sam',
      name: 'Sam',
      color: '#FFD700',
      data: Array.from({ length: 156 }, (_, i) => ({
        timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.05, Math.random() * 0.6 + (Math.sin(i / 4) * 0.15)),
      })),
    },
    {
      id: 'casey',
      name: 'Casey',
      color: '#FF4757',
      data: Array.from({ length: 156 }, (_, i) => ({
        timestamp: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.05, Math.random() * 0.5 + (Math.sin(i / 6 + 1) * 0.1)),
      })),
    },
  ];

  // If API data is provided, transform it to our format
  if (apiData) {
    // Transform API data to match our relationship structure
    // This will be updated based on your actual API response format
    return mockData.map(relationship => ({
      ...relationship,
      data: apiData[relationship.id] || relationship.data
    }));
  }

  return mockData;
};

const margin = { top: 20, right: 40, bottom: 80, left: 60 };

interface RelationshipTimelineProps {
  sessionId?: string;
  useMockData?: boolean;
  onActiveRelationshipsChange?: (activeRelationships: Record<string, boolean>) => void;
}

const EmotionalIntensityTimeline: React.FC<RelationshipTimelineProps> = ({
  sessionId,
  useMockData = false,
  onActiveRelationshipsChange
}) => {
  const [relationshipsData, setRelationshipsData] = useState(() => createRelationshipsData());
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
    //   targetRelationship: string,              // Specific relationship ID where marker should appear (e.g., 'joy', 'sadness')
    //   title: string,                      // Brief title of the event
    //   description: string,                // Detailed description of what happened
    //   category: string,                   // Event category (achievement, relationship, health, etc.)
    //   relationshipalImpact: number,            // 0-1 scale of relationshipal significance
    //   relatedRelationships?: string[],         // Optional: other relationships affected
    //   messageCount?: number,              // Optional: number of related messages
    //   color?: string                      // Optional: will use targetRelationship color if not provided
    // }
    //
    // Example API call:
    // const response = await fetch(`/api/significant-events/${sessionId}`);
    // const events = await response.json(); // LLM returns 3 events per month with exact relationship/date

    const events = [
      {
        id: 'event-1',
        timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        targetRelationship: 'joy',                    // Marker will appear on the 'joy' relationship line
        title: 'Career Breakthrough',
        description: 'Got promoted to senior position after months of hard work. This moment marked a significant shift in confidence and professional growth.',
        category: 'achievement',
        relationshipalImpact: 0.85,
        relatedRelationships: ['joy', 'excitement', 'gratitude'],
        messageCount: 12,
        color: '#FFD700'
      },
      {
        id: 'event-2',
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        targetRelationship: 'love',                   // Marker will appear on the 'love' relationship line
        title: 'Family Reunion',
        description: 'Long-awaited family gathering brought everyone together. Reconnecting with loved ones after months of separation created lasting relationshipal memories.',
        category: 'relationship',
        relationshipalImpact: 0.78,
        relatedRelationships: ['love', 'joy', 'gratitude'],
        messageCount: 8,
        color: '#FF6B9D'
      },
      {
        id: 'event-3',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        targetRelationship: 'hope',                   // Marker will appear on the 'hope' relationship line
        title: 'Health Scare Resolution',
        description: 'Medical test results came back clear after weeks of anxiety. The relief and renewed appreciation for health created a profound relationshipal shift.',
        category: 'health',
        relationshipalImpact: 0.72,
        relatedRelationships: ['hope', 'gratitude', 'calm'],
        messageCount: 6,
        color: '#45B7D1'
      },
      {
        id: 'event-4',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        targetRelationship: 'excitement',             // Marker will appear on the 'excitement' relationship line
        title: 'Creative Project Launch',
        description: 'Successfully launched a personal creative project that had been in development for months. The accomplishment brought renewed sense of purpose.',
        category: 'creativity',
        relationshipalImpact: 0.68,
        relatedRelationships: ['excitement', 'anticipation', 'joy'],
        messageCount: 9,
        color: '#9D4EDD'
      }
    ];

    return events;
  });

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Track which relationships are active (clicked) - only 5 random relationships selected by default
  const [activeRelationships, setActiveRelationships] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const relationships = createRelationshipsData();

    // Get 5 random relationships
    const shuffled = [...relationships].sort(() => 0.5 - Math.random());
    const randomSelected = shuffled.slice(0, 5).map(e => e.id);

    relationships.forEach(relationship => {
      initial[relationship.id] = randomSelected.includes(relationship.id);
    });
    return initial;
  });

  const [tooltip, setTooltip] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | null>(() => {
    // Initialize with null if using real data, or mock data range if using mock data
    if (!useMockData && sessionId) {
      return null; // Will be set when real data loads
    }
    return {
      start: relationshipsData[0].data[0].timestamp,
      end: relationshipsData[0].data[relationshipsData[0].data.length - 1].timestamp,
    };
  });

  const d3Container = useRef<HTMLDivElement>(null);
  const dimensions = useRef({ width: 0, height: 600 });

  // Handle relationship pill clicks
  const toggleRelationship = (relationshipId: string) => {
    setActiveRelationships(prev => ({
      ...prev,
      [relationshipId]: !prev[relationshipId]
    }));
  };

  // Create event tooltip content
  const createEventTooltip = (event: any) => {
    const impactPercentage = (event.relationshipalImpact * 100).toFixed(0);
    const relatedRelationshipsText = event.relatedRelationships.join(', ');

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
              <span class="metric-label">Relationshipal Impact</span>
              <span class="metric-value" style="color: ${event.color};">${impactPercentage}%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Related Messages</span>
              <span class="metric-value" style="color: ${event.color};">${event.messageCount}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Key Relationships</span>
              <span class="metric-value" style="color: ${event.color};">${relatedRelationshipsText}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Fetch data from API
  const fetchRelationshipData = useCallback(async () => {
    console.log('🎭 [FRONTEND DEBUG] fetchRelationshipData called:', { useMockData, sessionId });

    if (useMockData || !sessionId) {
      console.log('🎭 [FRONTEND DEBUG] Using mock data because:', { useMockData, hasSessionId: !!sessionId });
      setRelationshipsData(createRelationshipsData());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🎭 [FRONTEND DEBUG] Fetching real message activity data for session:', sessionId);
      const response = await fetch(`${''/* Backend removed */}/api/message-activity/${sessionId}`);
      console.log('🎭 [FRONTEND DEBUG] Response status:', response.status, response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData = await response.json();
      console.log('🎭 [FRONTEND DEBUG] API response:', {
        status: apiData.status,
        hasMessageActivityData: !!apiData.message_activity_data,
        peopleCount: apiData.message_activity_data?.people?.length,
        totalMessages: apiData.message_activity_data?.totalMessages,
        granularity: apiData.message_activity_data?.granularity
      });

      if (apiData.status === 'completed' && apiData.message_activity_data?.people) {
        // Transform API data to match our component's expected format
        const transformedData = apiData.message_activity_data.people.map((person: any) => ({
          id: person.id,
          name: person.name,
          color: person.color,
          data: person.data.map((point: any) => ({
            timestamp: new Date(point.timestamp),
            intensity: point.count / 100, // Keep for compatibility
            count: point.count, // Original message count
            messageCount: point.count // Explicit message count for clarity
          })),
          totalMessages: person.totalMessages
        }));

        console.log('🎭 [FRONTEND DEBUG] Transformed data:', {
          relationshipCount: transformedData.length,
          firstRelationshipId: transformedData[0]?.id,
          dataPointsPerRelationship: transformedData[0]?.data?.length || 0,
          firstDataPoint: transformedData[0]?.data?.[0]
        });

        setRelationshipsData(transformedData);

        // Update active relationships to show all loaded people by default
        const newActiveRelationships: Record<string, boolean> = {};
        transformedData.forEach((person: any) => {
          newActiveRelationships[person.id] = true; // Show all people by default
        });
        setActiveRelationships(newActiveRelationships);

        // Update time range based on real data
        if (transformedData.length > 0 && transformedData[0].data.length > 0) {
          // Get the full time range across all people
          let minDate = new Date(8640000000000000); // Max date
          let maxDate = new Date(-8640000000000000); // Min date

          transformedData.forEach((person: any) => {
            if (person.data.length > 0) {
              const firstDate = person.data[0].timestamp;
              const lastDate = person.data[person.data.length - 1].timestamp;
              if (firstDate < minDate) minDate = firstDate;
              if (lastDate > maxDate) maxDate = lastDate;
            }
          });

          setTimeRange({
            start: minDate,
            end: maxDate,
          });
          console.log('🎭 [FRONTEND DEBUG] Updated time range:', {
            start: minDate,
            end: maxDate
          });
        }

        console.log('✅ [FRONTEND DEBUG] Successfully loaded real relationshipal data!');
      } else {
        console.log('⚠️ [FRONTEND DEBUG] API response not completed or no relationships:', apiData);
        setRelationshipsData(createRelationshipsData());
      }
    } catch (err) {
      console.error('❌ [FRONTEND DEBUG] Error fetching relationship data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Fallback to mock data on error
      setRelationshipsData(createRelationshipsData());
    } finally {
      setLoading(false);
    }
  }, [sessionId, useMockData]);

  // Fetch data on component mount and when sessionId changes
  useEffect(() => {
    fetchRelationshipData();
  }, [fetchRelationshipData]);

  const drawChart = useCallback(() => {
    if (!d3Container.current || dimensions.current.width === 0) return;

    // If no time range is set yet (waiting for data), don't draw
    if (!timeRange) return;

    const { width, height } = dimensions.current;
    const brushHeight = 60;
    const mainChartHeight = height - brushHeight - 20;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = mainChartHeight - margin.top - margin.bottom;

    // Improved cleanup to prevent removeChild errors
    const container = d3.select(d3Container.current);

    // First, interrupt any ongoing transitions to prevent conflicts
    container.selectAll('*').interrupt();

    // Remove any existing pulse animation styles
    document.querySelectorAll('[id^="pulse-style-"]').forEach(el => {
      try {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch (e) {
        // Ignore errors if element is already removed
      }
    });

    // Use D3's remove method which is React-safe
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Add gradient definitions
    const defs = svg.append('defs');

    relationshipsData.forEach(relationship => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${relationship.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', innerHeight);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', relationship.color)
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', relationship.color)
        .attr('stop-opacity', 0.1);

      // Mini gradient for brush area
      const miniGradient = defs.append('linearGradient')
        .attr('id', `mini-gradient-${relationship.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', brushHeight - 20);

      miniGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', relationship.color)
        .attr('stop-opacity', 0.4);

      miniGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', relationship.color)
        .attr('stop-opacity', 0.05);
    });

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const filteredData = relationshipsData
      .filter(relationship => activeRelationships[relationship.id])
      .map(relationship => ({
        ...relationship,
        data: relationship.data.filter((d: { timestamp: Date; intensity: number }) => {
          return d.timestamp >= timeRange.start && d.timestamp <= timeRange.end;
        })
      }));

    // Full data for brush
    const fullData = relationshipsData.filter(relationship => activeRelationships[relationship.id]);

    if (filteredData.every(e => e.data.length === 0)) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#6B7280')
        .style('font-size', '16px')
        .style('font-weight', '300')
        .text(loading ? 'Loading relationship data...' : 'No data in selected range');
      return;
    }

    // Prepare data for stacking
    // First, get all unique timestamps across all people
    const allTimestamps = new Set<string>();
    filteredData.forEach(person => {
      person.data.forEach((d: any) => {
        allTimestamps.add(d.timestamp.toISOString());
      });
    });

    // Convert to array and sort
    const timestamps = Array.from(allTimestamps).sort();

    // Create data points for each timestamp with all people
    const stackData = timestamps.map(timestamp => {
      const point: any = { timestamp: new Date(timestamp) };
      filteredData.forEach(person => {
        const dataPoint = person.data.find((d: any) => d.timestamp.toISOString() === timestamp);
        point[person.id] = dataPoint ? dataPoint.count || 0 : 0;
      });
      return point;
    });

    // Create stack generator
    const stack = d3.stack()
      .keys(filteredData.map(p => p.id))
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(stackData);

    // Main chart scales
    const xScale = d3.scaleTime()
      .domain([timeRange.start, timeRange.end])
      .range([0, innerWidth]);

    // Update y scale to accommodate stacked values
    const maxY = d3.max(series, layer => d3.max(layer, d => d[1])) || 0;
    const yScale = d3.scaleLinear()
      .domain([Math.max(0.02, maxY * 0.02), maxY * 1.2]) // Add minimum base value and 20% padding
      .range([innerHeight, 0]);

    // Brush scales (for full data range)
    const fullTimeExtent = d3.extent(relationshipsData.flatMap(e => e.data), d => d.timestamp) as [Date, Date];
    const brushXScale = d3.scaleTime()
      .domain(fullTimeExtent)
      .range([0, innerWidth]);

    const brushYScale = d3.scaleLinear()
      .domain([0.02, 1])
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

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat((d: any) => d > 999 ? `${(d / 1000).toFixed(1)}k` : d.toString())
      .tickSize(0)
      .tickPadding(12);

    // Add X-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#9CA3AF')
      .style('font-size', '11px')
      .style('font-weight', '400');

    // Add Y-axis with message count labels
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#9CA3AF')
      .style('font-size', '11px')
      .style('font-weight', '400');

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#9CA3AF')
      .style('font-size', '12px')
      .style('font-weight', '400')
      .text('Messages');

    // Remove axis lines for cleaner look
    g.selectAll('.domain').remove();

    // Area generator for stacked areas
    const area = d3.area<any>()
      .x(d => xScale(d.data.timestamp))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveMonotoneX);

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

    // Draw stacked areas
    if (series.length > 0) {
      // Create a map for quick person lookup
      const personMap = new Map(filteredData.map(p => [p.id, p]));

      // Draw each layer of the stack
      series.forEach((layer, index) => {
        const person = personMap.get(layer.key);
        if (!person) return;

        // Draw the area
        g.append('path')
          .datum(layer)
          .attr('fill', `url(#gradient-${person.id})`)
          .attr('stroke', person.color)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.8)
          .attr('d', area)
          .style('filter', `drop-shadow(0 2px 4px rgba(0,0,0,0.2))`)
          .attr('opacity', 0)
          .transition()
          .delay(index * 200)
          .duration(1200)
          .ease(d3.easeBackOut.overshoot(1.2))
          .attr('opacity', 1);
      });
    }

    // Add significant events markers ON TOP of relationship lines
    const eventsGroup = g.append('g').attr('class', 'events-markers');

    // Filter events that are within the current time range AND have active target relationships
    const eventsInRange = significantEvents.filter(event =>
      event.timestamp >= timeRange.start &&
      event.timestamp <= timeRange.end &&
      activeRelationships[event.targetRelationship] // Only show if target relationship is active
    );

    // Remove any existing pulse animations to prevent conflicts
    eventsInRange.forEach(event => {
      const existingStyle = document.getElementById(`pulse-style-${event.id}`);
      if (existingStyle) existingStyle.remove();
    });

    eventsInRange.forEach((event, index) => {
      const x = xScale(event.timestamp);

      // Find the PRIMARY TARGET relationship where marker should appear (must be active)
      const targetRelationship = filteredData.find(relationship =>
        relationship.id === event.targetRelationship
      );

      if (targetRelationship && targetRelationship.data.length > 0) {
        // Find the EXACT data point using more precise interpolation
        const bisect = d3.bisector((d: { timestamp: Date; intensity: number }) => d.timestamp).left;
        const i = bisect(targetRelationship.data, event.timestamp, 1);

        // Get the two surrounding points for better interpolation
        const d0 = targetRelationship.data[i - 1];
        const d1 = targetRelationship.data[i];

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

        // Position marker EXACTLY on the center/tip of the target relationship line
        const markerY = yScale(intensity);
        const markerColor = event.color || targetRelationship.color;

        // Create marker group positioned exactly on the relationship line center
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

    // Draw mini stacked areas in brush (consistent with main chart)
    if (fullData.length > 0) {
      // Prepare normalized data for mini stacked chart
      const miniTimePoints = fullData[0].data.map((d: any) => d.timestamp);
      const miniStackData = miniTimePoints.map((timestamp: Date) => {
        const dataPoint: any = { timestamp };

        // Get raw intensities for all relationships at this timestamp
        const rawValues: Record<string, number> = {};
        let totalIntensity = 0;

        fullData.forEach(relationship => {
          const point = relationship.data.find((d: any) => d.timestamp.getTime() === timestamp.getTime());
          const intensity = point ? point.intensity : 0;
          rawValues[relationship.id] = intensity;
          totalIntensity += intensity;
        });

        // Normalize to proportions (0-1) so they stack to 100%
        fullData.forEach(relationship => {
          if (totalIntensity > 0) {
            dataPoint[relationship.id] = rawValues[relationship.id] / totalIntensity;
          } else {
            // If no intensity, distribute equally
            dataPoint[relationship.id] = 1 / fullData.length;
          }
        });

        return dataPoint;
      });

      // Create the mini stack with normalized data
      const miniStack = d3.stack()
        .keys(fullData.map((d: any) => d.id))
        .value((d: any, key: string) => d[key] || 0);

      const miniSeries = miniStack(miniStackData);

      // Mini stacked area generator
      const miniStackedArea = d3.area<any>()
        .x(d => brushXScale(d.data.timestamp))
        .y0(d => brushYScale(d[0]))
        .y1(d => brushYScale(d[1]))
        .curve(d3.curveCardinal.tension(0.2));

      // Draw mini stacked areas
      miniSeries.forEach((relationshipSeries, index) => {
        const relationship = fullData.find(d => d.id === relationshipSeries.key);
        if (!relationship) return;

        // Mini stacked area
        miniG.append('path')
          .datum(relationshipSeries)
          .attr('fill', `url(#mini-gradient-${relationship.id})`)
          .attr('stroke', relationship.color)
          .attr('stroke-width', 0.5)
          .attr('stroke-opacity', 0.6)
          .attr('d', miniStackedArea)
          .attr('opacity', 0.7);
      });
    }

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
              <div class="tooltip-subtitle">Weekly Relationshipal Landscape</div>
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-relationships">`;

        // Calculate weekly message counts from real data
        const weeklyData: Array<{ relationship: string, messageCount: number, color: string, trend: string, totalMessages: number }> = [];

        // Get all weekly data points first to calculate total messages
        const weekData = filteredData.map(person => {
          // Find the data point for this week (or interpolate if needed)
          const weekPoint = person.data.find((d: any) => {
            const dWeekStart = new Date(d.timestamp);
            dWeekStart.setDate(dWeekStart.getDate() - dWeekStart.getDay());
            return dWeekStart.getTime() === weekStart.getTime();
          });

          const weeklyCount = weekPoint ? (weekPoint.count || weekPoint.messageCount || 0) : 0;

          return {
            person,
            weekPoint,
            weeklyCount
          };
        });

        // Calculate total messages for the week
        const totalWeekMessages = weekData.reduce((sum, data) => sum + data.weeklyCount, 0);

        weekData.forEach(data => {
          if (data.weeklyCount > 0) {
            // Calculate trend (simple comparison with previous week if available)
            const prevWeekStart = new Date(weekStart);
            prevWeekStart.setDate(prevWeekStart.getDate() - 7);
            const prevWeekEnd = new Date(weekEnd);
            prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

            const prevWeekData = data.person.data.filter((d: any) => d.timestamp >= prevWeekStart && d.timestamp <= prevWeekEnd);
            let trend = '→';
            if (prevWeekData.length > 0) {
              const prevCount = prevWeekData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
              trend = data.weeklyCount > prevCount ? '↗' : data.weeklyCount < prevCount ? '↘' : '→';
            }

            weeklyData.push({
              relationship: data.person.name,
              messageCount: data.weeklyCount,
              color: data.person.color,
              trend,
              totalMessages: (data.person as any).totalMessages || 0
            });
          }
        });

        // Sort by message count (highest first)
        weeklyData.sort((a, b) => b.messageCount - a.messageCount);

        // Add relationship entries to tooltip
        weeklyData.forEach((data, index) => {
          const percentage = totalWeekMessages > 0 ? ((data.messageCount / totalWeekMessages) * 100).toFixed(0) : '0';
          const barWidth = Math.max(12, (data.messageCount / totalWeekMessages) * 120); // Minimum 12px width

          tooltipContent += `
            <div class="relationship-entry" style="margin-bottom: ${index === weeklyData.length - 1 ? '0' : '8px'};">
              <div class="relationship-header">
                <span class="relationship-name" style="color: ${data.color};">${data.relationship}</span>
                <span class="relationship-trend" style="color: ${data.color};">${data.trend}</span>
                <span class="relationship-intensity" style="color: ${data.color};">${data.messageCount} msgs (${percentage}%)</span>
              </div>
              <div class="relationship-bar-container">
                <div class="relationship-bar" style="width: ${barWidth}px; background: linear-gradient(90deg, ${data.color}80, ${data.color}40); box-shadow: 0 0 8px ${data.color}30;"></div>
              </div>
            </div>`;
        });

        // Add weekly summary statistics
        const topPerson = weeklyData[0];
        const avgMessages = weeklyData.length > 0 ? Math.round(totalWeekMessages / weeklyData.length) : 0;

        tooltipContent += `
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-insights">
              <div class="insights-header">Weekly Summary</div>
              <div class="message-stats">`;

        // Add summary statistics
        tooltipContent += `
            <div class="stat-item" style="margin-bottom: 6px;">
              <span style="color: #A0A0B0;">Total Messages:</span> <span style="color: #00F5D4; font-weight: 600;">${totalWeekMessages}</span>
            </div>
            <div class="stat-item" style="margin-bottom: 6px;">
              <span style="color: #A0A0B0;">Most Active:</span> <span style="color: ${topPerson ? topPerson.color : '#00F5D4'}; font-weight: 600;">${topPerson ? topPerson.relationship : 'N/A'}</span>
            </div>
            <div class="stat-item">
              <span style="color: #A0A0B0;">Average per Person:</span> <span style="color: #00F5D4; font-weight: 600;">${avgMessages}</span>
            </div>`;

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

  }, [relationshipsData, activeRelationships, timeRange, loading, significantEvents, selectedEvent, tooltip]);

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
    // Use a ref to track if component is mounted
    let isMounted = true;
    let animationFrameId: number | null = null;

    // Use animation frame for smoother rendering
    animationFrameId = requestAnimationFrame(() => {
      if (isMounted && d3Container.current) {
        drawChart();
      }
    });

    // Cleanup function to prevent DOM manipulation errors
    return () => {
      isMounted = false;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Remove any style elements added for pulse animations
      const styleElements = document.querySelectorAll('[id^="pulse-style-"]');
      styleElements.forEach(el => {
        try {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {
          // Ignore if already removed
        }
      });

      // Completely empty the container using React-safe method
      if (d3Container.current) {
        // Stop all D3 transitions
        d3.selectAll('*').interrupt();

        // Create a new empty div to replace the current content
        const newContainer = document.createElement('div');
        newContainer.style.width = '100%';
        newContainer.style.height = '100%';

        // Replace the content
        if (d3Container.current.parentNode) {
          d3Container.current.innerHTML = '';
        }
      }
    };
  }, [drawChart]);

  useEffect(() => {
    if (onActiveRelationshipsChange) {
      onActiveRelationshipsChange(activeRelationships);
    }
  }, [activeRelationships, onActiveRelationshipsChange]);

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
        <div className="w-full relative">
          <div
            ref={d3Container}
            className="w-full"
            style={{ height: dimensions.current.height }}
            suppressHydrationWarning
          />
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
                .tooltip-relationships {
                  padding: 16px 20px;
                }
                .relationship-entry {
                  margin-bottom: 8px;
                }
                .relationship-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 4px;
                }
                .relationship-name {
                  font-size: 12px;
                  font-weight: 500;
                }
                .relationship-trend {
                  font-size: 11px;
                  font-weight: 600;
                }
                .relationship-intensity {
                  font-size: 11px;
                  font-weight: 600;
                }
                .relationship-bar-container {
                  height: 3px;
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 2px;
                  overflow: hidden;
                }
                .relationship-bar {
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

        {/* People toggle pills - React component instead of foreignObject */}
        <div className="mt-4 flex justify-center items-center flex-wrap gap-2">
          {relationshipsData.map((relationship) => {
            const isActive = activeRelationships[relationship.id];

            return (
              <button
                key={relationship.id}
                onClick={() => toggleRelationship(relationship.id)}
                className="flex items-center cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: isActive ? `${relationship.color}15` : `${relationship.color}08`,
                  border: `1px solid ${relationship.color}${isActive ? '60' : '30'}`,
                  color: isActive ? relationship.color : `${relationship.color}80`,
                  padding: '6px 14px',
                  borderRadius: '18px',
                  fontSize: '12px',
                  fontWeight: isActive ? '500' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: isActive ? `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 12px ${relationship.color}30` : 'none',
                  fontFamily: "'Lato', sans-serif",
                  opacity: isActive ? '1' : '0.45',
                  transform: isActive ? 'scale(1)' : 'scale(0.95)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = isActive ? 'scale(1)' : 'scale(0.95)';
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: relationship.color,
                    boxShadow: isActive ? `0 0 8px ${relationship.color}90, inset 0 0 4px ${relationship.color}` : 'none',
                    opacity: isActive ? '1' : '0.55',
                    flexShrink: '0'
                  }}
                />
                <span>{relationship.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmotionalIntensityTimeline; 