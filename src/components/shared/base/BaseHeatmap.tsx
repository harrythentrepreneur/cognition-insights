import { logger } from '@/lib/utils/logger';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

// Define all emotions from the EmotionTimeline component
const EMOTIONS = [
  { id: 'joy', name: 'Joy', color: '#FFD700' },
  { id: 'sadness', name: 'Sadness', color: '#00D4FF' },
  { id: 'anger', name: 'Anger', color: '#FF4757' },
  { id: 'fear', name: 'Fear', color: '#8B5CF6' },
  { id: 'surprise', name: 'Surprise', color: '#F59E0B' },
  { id: 'love', name: 'Love', color: '#FF6B9D' },
  { id: 'disgust', name: 'Disgust', color: '#10B981' },
  { id: 'anticipation', name: 'Anticipation', color: '#9D4EDD' },
  { id: 'trust', name: 'Trust', color: '#06D6A0' },
  { id: 'confusion', name: 'Confusion', color: '#FB8500' },
  { id: 'excitement', name: 'Excitement', color: '#FF006E' },
  { id: 'calm', name: 'Calm', color: '#4ECDC4' },
  { id: 'hope', name: 'Hope', color: '#45B7D1' },
  { id: 'frustration', name: 'Frustration', color: '#E74C3C' },
  { id: 'gratitude', name: 'Gratitude', color: '#F39C12' },
  { id: 'compassion', name: 'Compassion', color: '#A855F7' }
];

// Define relationship metrics for relationships network
const RELATIONSHIP_METRICS = [
  { id: 'conversation-depth', name: 'Depth', color: '#FF6B6B' }, // Bright red
  { id: 'initiative-taking', name: 'Initiative', color: '#4ECDC4' }, // Bright teal
  { id: 'empathy-expression', name: 'Empathy', color: '#45B7D1' }, // Blue
  { id: 'vulnerability-sharing', name: 'Vulnerability', color: '#96CEB4' }, // Sage green
  { id: 'conflict-resolution', name: 'Resolution', color: '#FECA57' }, // Golden yellow
  { id: 'social-influence', name: 'Influence', color: '#A55EEA' }, // Purple
  { id: 'network-bridging', name: 'Bridging', color: '#26D0CE' }, // Cyan
  { id: 'group-harmony', name: 'Harmony', color: '#FD79A8' }, // Hot pink
  { id: 'reliability-consistency', name: 'Reliability', color: '#FD7272' }, // Coral
  { id: 'celebration-support', name: 'Celebration', color: '#7BED9F' }, // Mint
  { id: 'boundary-respect', name: 'Boundaries', color: '#70A1FF' }, // Bright blue
  { id: 'centrality-score', name: 'Centrality', color: '#FF7675' }, // Light red
  { id: 'relationship-diversity', name: 'Diversity', color: '#FDCB6E' }, // Orange
  { id: 'reciprocity-balance', name: 'Reciprocity', color: '#6C5CE7' }, // Indigo
  { id: 'trust-building', name: 'Trust', color: '#FF9FF3' } // Bright pink
];

// Define personality traits for personality analysis
const PERSONALITY_TRAITS = [
  { id: 'openness', name: 'Openness', color: '#FF6B6B' },
  { id: 'conscientiousness', name: 'Conscientiousness', color: '#FF6B6B' },
  { id: 'extraversion', name: 'Extraversion', color: '#FF6B6B' },
  { id: 'agreeableness', name: 'Agreeableness', color: '#FF6B6B' },
  { id: 'neuroticism', name: 'Emotional Stability', color: '#FF6B6B' },
  { id: 'analytical-thinking', name: 'Analytical Thinking', color: '#4ECDC4' },
  { id: 'creative-thinking', name: 'Creative Thinking', color: '#4ECDC4' },
  { id: 'intuitive-processing', name: 'Intuitive Processing', color: '#4ECDC4' },
  { id: 'achievement-motivation', name: 'Achievement Drive', color: '#45B7D1' },
  { id: 'autonomy-motivation', name: 'Autonomy Seeking', color: '#45B7D1' },
  { id: 'social-connection', name: 'Social Connection', color: '#45B7D1' },
  { id: 'empathic-understanding', name: 'Empathic Understanding', color: '#A855F7' },
  { id: 'communication-style', name: 'Communication Style', color: '#A855F7' },
  { id: 'emotional-awareness', name: 'Emotional Awareness', color: '#F59E0B' },
  { id: 'stress-resilience', name: 'Stress Resilience', color: '#F59E0B' },
  { id: 'detail-orientation', name: 'Detail Orientation', color: '#10B981' }
];

// Define growth milestones for growth journey
const GROWTH_MILESTONES = [
  { id: 'impulse-mastery', name: 'Impulse Control', color: '#FF4757' },
  { id: 'willpower-forge', name: 'Willpower', color: '#8B5CF6' },
  { id: 'focus-flow', name: 'Deep Focus', color: '#9D4EDD' },
  { id: 'habit-architect', name: 'Daily Habits', color: '#FFD700' },
  { id: 'mental-fortress', name: 'Mental Strength', color: '#FF6B9D' },
  { id: 'mindful-presence', name: 'Mindfulness', color: '#FF6B9D' },
  { id: 'inner-compass', name: 'Inner Wisdom', color: '#9D4EDD' },
  { id: 'emotional-alchemy', name: 'Emotional Mastery', color: '#FF6B9D' },
  { id: 'stress-sculptor', name: 'Stress Control', color: '#FF6B9D' },
  { id: 'authentic-voice', name: 'Authenticity', color: '#00F5D4' },
  { id: 'empathy-bridge', name: 'Empathy', color: '#00F5D4' },
  { id: 'boundary-wisdom', name: 'Boundaries', color: '#00F5D4' },
  { id: 'flow-state', name: 'Flow State', color: '#9D4EDD' },
  { id: 'growth-velocity', name: 'Learning Speed', color: '#9D4EDD' },
  { id: 'resilience-core', name: 'Resilience', color: '#FF6B9D' },
  { id: 'vision-clarity', name: 'Vision', color: '#9D4EDD' },
  { id: 'influence-mastery', name: 'Influence', color: '#00F5D4' },
  { id: 'wisdom-integration', name: 'Wisdom', color: '#9D4EDD' },
  { id: 'energy-mastery', name: 'Energy', color: '#FFD700' },
  { id: 'purpose-alignment', name: 'Purpose', color: '#9D4EDD' },
  { id: 'transcendent-growth', name: 'Transcendence', color: '#00F5D4' }
];

// Define language patterns for language patterns analysis
const LANGUAGE_PATTERNS = [
  { id: '1', name: 'Storytelling', color: '#FF6B6B' },
  { id: '2', name: 'Humor & Wit', color: '#4ECDC4' },
  { id: '3', name: 'Future Vision', color: '#45B7D1' },
  { id: '4', name: 'Empathy Signals', color: '#A855F7' },
  { id: '5', name: 'Curiosity Drive', color: '#F59E0B' },
  { id: '6', name: 'Authentic Voice', color: '#10B981' },
  { id: '7', name: 'Creative Metaphors', color: '#FF6B9D' },
  { id: '8', name: 'Solution Focus', color: '#FFD700' },
  { id: '9', name: 'Hype Energy', color: '#8B5CF6' },
  { id: '10', name: 'Wisdom Sharing', color: '#00F5D4' },
  { id: '11', name: 'Connection Building', color: '#9D4EDD' },
  { id: '12', name: 'Innovation Language', color: '#E17055' },
  { id: '13', name: 'Vulnerability', color: '#FF4757' },
  { id: '14', name: 'Growth Mindset', color: '#06D6A0' },
  { id: '15', name: 'Celebration Mode', color: '#F39C12' },
  { id: '16', name: 'Deep Thinking', color: '#6C5CE7' }
];

// Generate mock data for multiple years (3 years of data) - weekly aggregated
const generateYearData = (itemId: string, metricType: 'emotion' | 'relationship' | 'personality' | 'growth' | 'language' = 'emotion') => {
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getFullYear() - 3, 0, 1); // Start 3 years ago

  // Generate weekly data instead of daily
  let currentWeek = d3.timeWeek(startDate);
  const endWeek = d3.timeWeek(today);

  while (currentWeek <= endWeek) {
    let intensity;

    // Generate different patterns based on metric type
    if (metricType === 'relationship') {
      // Relationship metrics have different patterns
      if (itemId.includes('communication') || itemId.includes('empathy')) {
        intensity = Math.random() * 0.6 + 0.3; // Higher baseline for communication
      } else if (itemId.includes('network') || itemId.includes('social')) {
        intensity = Math.random() * 0.8 + 0.1; // Variable network activity
      } else {
        intensity = Math.random(); // Normal distribution for other metrics
      }
    } else if (metricType === 'personality') {
      // Personality traits have more stable patterns with gradual changes
      if (itemId.includes('big5') || itemId.includes('openness') || itemId.includes('conscientiousness')) {
        intensity = Math.random() * 0.4 + 0.5; // Stable high patterns for core traits
      } else if (itemId.includes('cognitive') || itemId.includes('thinking')) {
        intensity = Math.random() * 0.6 + 0.3; // Moderate variability for cognitive styles
      } else {
        intensity = Math.random() * 0.8 + 0.2; // Higher baseline for personality metrics
      }
    } else if (metricType === 'growth') {
      // Growth milestones show progression over time
      if (itemId.includes('impulse') || itemId.includes('willpower') || itemId.includes('habit')) {
        intensity = Math.random() * 0.5 + 0.3; // Building patterns for discipline
      } else if (itemId.includes('flow') || itemId.includes('focus') || itemId.includes('energy')) {
        intensity = Math.random() * 0.7 + 0.2; // Variable high performance states
      } else {
        intensity = Math.random() * 0.6 + 0.3; // Moderate growth patterns
      }
    } else if (metricType === 'language') {
      // Language patterns show communication style consistency
      if (itemId.includes('storytelling') || itemId.includes('humor') || itemId.includes('creative')) {
        intensity = Math.random() * 0.6 + 0.2; // Variable creative expression
      } else if (itemId.includes('analytical') || itemId.includes('practical') || itemId.includes('assertive')) {
        intensity = Math.random() * 0.5 + 0.4; // More consistent analytical patterns
      } else {
        intensity = Math.random() * 0.7 + 0.2; // General language patterns
      }
    } else {
      // Emotion metrics with realistic patterns
      if (itemId.includes('joy') || itemId.includes('happiness')) {
        intensity = Math.random() * 0.6 + 0.3; // Generally positive baseline
      } else if (itemId.includes('sadness') || itemId.includes('grief')) {
        intensity = Math.random() * 0.4 + 0.1; // Lower baseline with spikes
      } else if (itemId.includes('anger') || itemId.includes('frustration')) {
        intensity = Math.random() * 0.5 + 0.05; // Low baseline with occasional spikes
      } else if (itemId.includes('love') || itemId.includes('affection')) {
        intensity = Math.random() * 0.5 + 0.4; // High stable baseline
      } else if (itemId.includes('fear') || itemId.includes('anxiety')) {
        intensity = Math.random() * 0.4 + 0.15; // Moderate baseline
      } else if (itemId.includes('excitement') || itemId.includes('enthusiasm')) {
        intensity = Math.random() * 0.7 + 0.2; // Variable high energy
      } else if (itemId.includes('calm') || itemId.includes('peace')) {
        intensity = Math.random() * 0.3 + 0.5; // Stable moderate-high
      } else {
        // Default emotion pattern with better variance
        const base = Math.random() * 0.4 + 0.3; // Base between 0.3-0.7
        const variation = (Math.random() - 0.5) * 0.3; // ±0.15 variation
        intensity = Math.max(0, Math.min(1, base + variation));
      }
    }

    data.push({
      date: new Date(currentWeek),
      intensity: intensity,
      level: Math.floor(intensity * 5), // 0-4 intensity levels
      item: itemId // Use 'item' instead of 'emotion' for generic support
    });
    currentWeek = d3.timeWeek.offset(currentWeek, 1);
  }
  return data;
};

interface BaseHeatmapProps {
  // Legacy props for backward compatibility
  data?: any;
  sessionId?: string;
  useMockData?: boolean;
  emotionData?: { [key: string]: Array<{ date: Date; intensity: number }> };
  fixedEmotion?: string; // Lock to a specific emotion/metric
  fillParent?: boolean;
  hideLegend?: boolean;
  colorScheme?: Record<string, string>;
  timeRange?: { start: Date; end: Date };
  metricType?: 'emotion' | 'relationship' | 'personality' | 'growth' | 'language';
  isActive?: boolean;
  itemColor?: string;

  // New props for the updated interface
  items?: any[];
  insights?: Array<{ id: string; title: string; content: React.ReactNode; }>;
  defaultActiveItems?: Record<string, boolean>;
  generateHeatmapData?: (itemId: string) => any[];
  onTimeRangeChange?: (timeRange: { start: Date; end: Date }) => void;
  timelineEvents?: any[];
  timelineLoading?: boolean;
  timelineError?: string | null;
  weeklyHighlights?: Array<{
    week: string;
    range?: string;
    weekly_summary: string[];
    weekly_topics: string[];
  }>;
  realDataWeeks?: Set<string>;
  emotionHeatmapData?: Record<string, any[]>;
  analysisWindowLabel?: string;
  analysisWindowSubtext?: string;
}

const BaseHeatmap: React.FC<BaseHeatmapProps> = ({
  // Legacy props
  data,
  sessionId = 'mock-session',
  useMockData = false,
  emotionData,
  fixedEmotion,
  fillParent = false,
  hideLegend = false,
  colorScheme,
  timeRange,
  metricType = 'emotion',
  isActive = true,
  itemColor,

  // New props
  items,
  insights,
  defaultActiveItems = {},
  generateHeatmapData,
  onTimeRangeChange,
  timelineEvents = [],
  timelineLoading = false,
  timelineError = null,
  weeklyHighlights = [],
  realDataWeeks = new Set(),
  emotionHeatmapData = {},
  analysisWindowLabel,
  analysisWindowSubtext
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400 });

  // Get the appropriate metrics based on metricType
  const METRICS = useMemo(() => {
    switch (metricType) {
      case 'relationship':
        return RELATIONSHIP_METRICS;
      case 'personality':
        return PERSONALITY_TRAITS;
      case 'growth':
        return GROWTH_MILESTONES;
      case 'language':
        return LANGUAGE_PATTERNS;
      case 'emotion':
      default:
        return EMOTIONS;
    }
  }, [metricType]);

  // Determine which metric to display
  const selectedMetric = fixedEmotion || METRICS[0]?.id || 'joy';
  const metric = METRICS.find(m => m.id === selectedMetric) || METRICS[0];

  // Determine which data to use based on props
  const heatmapData = useMemo(() => {
    // If we have emotionHeatmapData and a fixedEmotion, use that
    if (emotionHeatmapData && fixedEmotion && emotionHeatmapData[fixedEmotion]) {
      return emotionHeatmapData[fixedEmotion];
    }

    // If we have emotionData and a fixedEmotion, use that
    if (emotionData && fixedEmotion && emotionData[fixedEmotion]) {
      return emotionData[fixedEmotion];
    }

    // If we have generateHeatmapData and items, use that
    if (generateHeatmapData && items && items.length > 0) {
      const item = items.find(i => i.id === fixedEmotion) || items[0];
      return generateHeatmapData(item.id);
    }

    // Fallback to generating mock data
    return generateYearData(fixedEmotion || 'joy', metricType);
  }, [emotionHeatmapData, emotionData, fixedEmotion, generateHeatmapData, items, metricType]);

  // Filter data by timeRange if provided
  const filteredHeatmapData = useMemo(() => {
    if (!timeRange) {
      return heatmapData; // No filtering if no timeRange
    }

    // Filter to only show weeks within the selected timeRange
    return heatmapData.filter(weekData =>
      weekData.date >= timeRange.start && weekData.date <= timeRange.end
    );
  }, [heatmapData, timeRange]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        setContainerSize({ width: svgRef.current.parentElement.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
      handleResize();
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !filteredHeatmapData.length) return;

    const svg = d3.select(svgRef.current);
    // Safer cleanup - only remove D3-created elements
    svg.selectAll('g').remove();
    svg.selectAll('defs').remove();

    // Dynamic sizing based on container
    const parentWidth = svgRef.current?.parentElement?.clientWidth || 400;
    const containerWidth = fillParent ? parentWidth - 20 : Math.min(parentWidth, 600);
    const maxWidth = fillParent ? containerWidth - 20 : containerWidth - 80;

    const margin = fillParent
      ? { top: 8, right: 8, bottom: 32, left: 8 }
      : { top: 12, right: 12, bottom: 40, left: 12 };

    const availableWidth = maxWidth - margin.left - margin.right;

    // Calculate grid layout - 4 weeks per column, 13 columns per year
    const weeksPerCol = 4;
    const weeksPerYear = 52;
    const colsPerYear = Math.ceil(weeksPerYear / weeksPerCol);

    const cellPadding = fillParent ? 1.5 : 1;
    const totalPaddingWidth = cellPadding * (colsPerYear - 1);
    const availableForCells = availableWidth - totalPaddingWidth - 10;

    const cellSize = fillParent
      ? Math.max(20, Math.min(36, availableForCells / colsPerYear))
      : Math.max(16, Math.min(32, availableForCells / colsPerYear));

    // Enhanced color scale with MORE DRAMATIC variance
    // Now uses continuous intensity (0-1) for better granularity
    const colorScale = d3.scaleSequential()
      .domain([0, 1])
      .interpolator((t) => {
        if (t < 0.01) return 'rgba(255, 255, 255, 0.01)'; // Almost invisible for near-zero
        
        // Use itemColor if provided, otherwise fall back to metric.color for backward compatibility
        const baseColor = d3.color(itemColor || metric.color)!;
        const hsl = d3.hsl(baseColor);
        
        // Apply more aggressive non-linear scaling for dramatic visual distribution
        // Use exponential scaling to really separate low/medium/high values
        const scaledT = Math.pow(t, 0.4); // More aggressive power scaling
        
        // MUCH wider opacity range for dramatic visibility differences
        const baseOpacity = isActive ? 0.05 : 0.03;  // Very low base
        const maxOpacity = isActive ? 1.0 : 0.85;    // High max
        
        // Calculate opacity with dramatic contrast
        let opacity;
        let finalHsl = hsl.copy();
        
        if (t < 0.2) {
          // Very low intensity: Almost invisible
          opacity = baseOpacity + (t * 0.5);
          finalHsl.l = Math.min(0.9, hsl.l * 1.4); // Much lighter
          finalHsl.s = Math.max(0.1, hsl.s * 0.3); // Very desaturated
        } else if (t < 0.4) {
          // Low intensity: Still quite faint
          opacity = 0.15 + (t * 0.3);
          finalHsl.l = Math.min(0.8, hsl.l * 1.2);
          finalHsl.s = Math.max(0.2, hsl.s * 0.5);
        } else if (t < 0.6) {
          // Medium intensity: Noticeable
          opacity = 0.3 + (t * 0.4);
          finalHsl.s = hsl.s * 0.9;
          finalHsl.l = hsl.l;
        } else if (t < 0.8) {
          // High intensity: Strong color
          opacity = 0.5 + (t * 0.5);
          finalHsl.s = Math.min(1, hsl.s * 1.2);
          finalHsl.l = Math.max(0.4, hsl.l * 0.9);
        } else {
          // Very high intensity: Full saturation and opacity
          opacity = 0.8 + (t * 0.2);
          finalHsl.s = Math.min(1, hsl.s * 1.5);
          finalHsl.l = Math.max(0.35, Math.min(0.65, hsl.l * 0.85));
        }
        
        // Apply active/inactive modifier
        if (!isActive) {
          opacity *= 0.7;
        }
        
        return finalHsl.copy({ opacity }).toString();
      });

    // Group data by year
    const yearBlocks = [];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 2; year <= currentYear; year++) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearWeeks = filteredHeatmapData.filter(weekData => {
        return weekData.date >= yearStart && weekData.date <= yearEnd;
      }).slice(0, 52);

      if (yearWeeks.length > 0) {
        yearBlocks.push({
          year: year,
          weeks: yearWeeks
        });
      }
    }

    // Calculate total height including year separators
    const rowHeight = cellSize + cellPadding;
    const totalRows = weeksPerCol;
    const yearSeparatorHeight = fillParent ? 24 : 28;
    const totalYearBlocks = yearBlocks.length;
    const height = (totalYearBlocks * totalRows * rowHeight) + ((totalYearBlocks - 1) * yearSeparatorHeight) + margin.top + margin.bottom;

    const actualGridWidth = colsPerYear * (cellSize + cellPadding);
    const totalGridWidth = actualGridWidth;
    const svgWidth = totalGridWidth + margin.left + margin.right;

    const svgHeight = height;

    svg.attr('width', svgWidth);
    svg.attr('height', svgHeight);

    const container = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create tooltip
    const tooltip = d3.select('body').selectAll('.heatmap-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'heatmap-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', '#1F2937')
      .style('color', '#F9FAFB')
      .style('padding', '8px 12px')
      .style('border-radius', '8px')
      .style('font-family', "'Lato', sans-serif")
      .style('font-size', '12px')
      .style('border', '1px solid rgba(255, 255, 255, 0.1)')
      .style('box-shadow', '0 10px 25px rgba(0, 0, 0, 0.3)')
      .style('pointer-events', 'none')
      .style('z-index', 1000)
      .style('max-width', '160px');

    let currentY = 0;

    // Draw each year block
    yearBlocks.forEach((yearBlock, yearIndex) => {
      // Add year separator (except for first year)
      if (yearIndex > 0) {
        container.append('text')
          .attr('x', 0)
          .attr('y', currentY + (fillParent ? 15 : 18))
          .attr('text-anchor', 'start')
          .style('fill', '#9CA3AF')
          .style('font-family', "'Lato', sans-serif")
          .style('font-size', fillParent ? '12px' : '13px')
          .style('font-weight', '500')
          .style('opacity', '0.9')
          .style('letter-spacing', '0.5px')
          .text(yearBlock.year.toString());

        currentY += yearSeparatorHeight;
      } else {
        container.append('text')
          .attr('x', 0)
          .attr('y', currentY + (fillParent ? 12 : 15))
          .attr('text-anchor', 'start')
          .style('fill', '#9CA3AF')
          .style('font-family', "'Lato', sans-serif")
          .style('font-size', fillParent ? '12px' : '13px')
          .style('font-weight', '500')
          .style('opacity', '0.9')
          .style('letter-spacing', '0.5px')
          .text(yearBlock.year.toString());

        currentY += fillParent ? 22 : 25;
      }

      // Draw weeks for this year in a grid (vertically first)
      yearBlock.weeks.forEach((weekData, weekIndex) => {
        const row = weekIndex % weeksPerCol;
        const col = Math.floor(weekIndex / weeksPerCol);

        const x = col * (cellSize + cellPadding);
        const y = currentY + (row * rowHeight);

        container.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('rx', fillParent ? 3 : 2)
          .style('fill', colorScale(weekData.intensity || weekData.level / 4))
          .style('stroke', (weekData.intensity || weekData.level / 4) > 0.1 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)')
          .style('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .style('transition', 'all 0.2s ease')
          .on('mouseover', function (event) {
            d3.select(this)
              .style('stroke', itemColor || metric.color)
              .style('stroke-width', 1.5)
              .style('filter', `drop-shadow(0 0 8px ${itemColor || metric.color}40)`);

            tooltip
              .style('visibility', 'visible')
              .html(`
                <div style="font-weight: 500; margin-bottom: 4px; color: #F0F0F0;">
                  ${weekData.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
                </div>
                <div style="color: ${itemColor || metric.color}; font-size: 13px;">
                  ${metric.name}: ${(weekData.intensity * 100).toFixed(0)}%
                </div>
              `);
          })
          .on('mousemove', function (event) {
            const tooltipWidth = 180;
            const tooltipHeight = 50;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.pageX + 10;
            let top = event.pageY - 10;

            if (left + tooltipWidth > viewportWidth) {
              left = event.pageX - tooltipWidth - 10;
            }

            if (top + tooltipHeight > viewportHeight) {
              top = event.pageY - tooltipHeight - 10;
            }

            left = Math.max(10, left);
            top = Math.max(10, top);

            tooltip
              .style('left', left + 'px')
              .style('top', top + 'px');
          })
          .on('mouseout', function () {
            d3.select(this)
              .style('stroke', weekData.level > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)')
              .style('stroke-width', 0.5)
              .style('filter', 'none');

            tooltip.style('visibility', 'hidden');
          });
      });

      currentY += weeksPerCol * rowHeight;
    });

    // Add legend at the bottom
    if (!hideLegend) {
      const legendData = [0, 1, 2, 3, 4];
      const legendCellSize = fillParent ? Math.min(cellSize * 0.8, 14) : Math.min(cellSize * 0.8, 12);
      const legendSpacing = 2;
      const legendX = 0;

      const legend = container.append('g')
        .attr('transform', `translate(${legendX}, ${currentY + (fillParent ? 20 : 25)})`);

      legend.append('text')
        .attr('x', 0)
        .attr('y', legendCellSize / 2)
        .attr('dy', '0.35em')
        .style('fill', '#9CA3AF')
        .style('font-family', "'Lato', sans-serif")
        .style('font-size', fillParent ? '10px' : '11px')
        .style('font-weight', '400')
        .style('opacity', '0.8')
        .text('Less');

      legendData.forEach((level, i) => {
        legend.append('rect')
          .attr('x', 30 + i * (legendCellSize + legendSpacing))
          .attr('y', 0)
          .attr('width', legendCellSize)
          .attr('height', legendCellSize)
          .attr('rx', 1)
          .style('fill', colorScale(level / 4))
          .style('stroke', 'rgba(255, 255, 255, 0.1)')
          .style('stroke-width', 0.5);
      });

      legend.append('text')
        .attr('x', 30 + legendData.length * (legendCellSize + legendSpacing) + 8)
        .attr('y', legendCellSize / 2)
        .attr('dy', '0.35em')
        .style('fill', '#9CA3AF')
        .style('font-family', "'Lato', sans-serif")
        .style('font-size', fillParent ? '10px' : '11px')
        .style('font-weight', '400')
        .style('opacity', '0.8')
        .text('More');
    }

  }, [filteredHeatmapData, selectedMetric, metric, fillParent, hideLegend, containerSize, isActive]);

  // Cleanup on unmount to prevent DOM conflicts
  useEffect(() => {
    return () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('g').remove();
        svg.selectAll('defs').remove();
      }
      // Clean up any lingering tooltips
      d3.select('body').selectAll('.heatmap-tooltip').remove();
    };
  }, []);

  return (
    <div style={{ width: '100%', height: 'auto', minHeight: fillParent ? '350px' : 'auto' }}>
      {/* Fixed metric header when locked to specific metric */}
      {fixedEmotion && (
        <div style={{ marginBottom: '12px', padding: '0' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: itemColor || metric.color,
            marginBottom: '10px',
            padding: '8px 14px',
            backgroundColor: `${itemColor || metric.color}06`,
            borderRadius: '8px',
            border: `1px solid ${itemColor || metric.color}12`,
            textAlign: 'left' as const,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            fontFamily: "'Lato', sans-serif",
            width: 'fit-content',
            letterSpacing: '0.2px'
          }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: itemColor || metric.color,
                filter: `drop-shadow(0 0 4px ${itemColor || metric.color}60)`,
                flexShrink: 0
              }}
            />
            <span>{metric.name}</span>
          </div>
        </div>
      )}

      {/* Heatmap Container */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: fillParent ? '16px 8px' : '20px 12px',
          boxSizing: 'border-box' as const,
          flex: fillParent ? 1 : undefined,
          display: fillParent ? 'flex' : undefined,
          flexDirection: fillParent ? 'column' : undefined
        }}
      >
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            flex: fillParent ? 1 : undefined
          }}
        />
      </div>
    </div>
  );
};

export default BaseHeatmap;