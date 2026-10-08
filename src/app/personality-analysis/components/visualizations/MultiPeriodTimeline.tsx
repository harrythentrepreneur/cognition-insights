import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import * as d3 from 'd3';

const { colors, spacing } = DESIGN_TOKENS;

interface TimelineEvent {
  date: Date;
  type: 'milestone' | 'transition' | 'challenge' | 'breakthrough';
  title: string;
  description: string;
  impact: number; // 1-10 scale
}

interface PersonalityPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dominantTraits: string[];
  color: string;
  description: string;
  confidenceLevel: number;
  growthRate: number;
}

interface MultiPeriodTimelineProps {
  data?: {
    periods: PersonalityPeriod[];
    events: TimelineEvent[];
    currentDate?: string;
  };
}

const styles = {
  container: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.lg,
    textAlign: 'center' as const,
  } as CSSProperties,
  
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap' as const,
  } as CSSProperties,
  
  controlButton: {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as CSSProperties,
  
  activeButton: {
    backgroundColor: colors.accent,
    color: colors.background,
    borderColor: colors.accent,
  } as CSSProperties,
  
  svgContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    position: 'relative' as const,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  periodDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: spacing.md,
    marginTop: spacing.xl,
  } as CSSProperties,
  
  periodCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    borderTop: '4px solid',
    transition: 'all 0.2s ease',
  } as CSSProperties,
  
  periodTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  periodDates: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  periodDescription: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    lineHeight: 1.6,
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  traitsList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing.xs,
    marginTop: spacing.sm,
  } as CSSProperties,
  
  trait: {
    fontSize: '0.75rem',
    padding: `2px 8px`,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '12px',
    color: colors.accent,
  } as CSSProperties,
  
  metricsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTop: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  metric: {
    textAlign: 'center' as const,
  } as CSSProperties,
  
  metricValue: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: colors.accent,
  } as CSSProperties,
  
  metricLabel: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  tooltip: {
    position: 'absolute' as const,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '0.875rem',
    pointerEvents: 'none' as const,
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 1000,
    maxWidth: '250px',
  } as CSSProperties,
  
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    flexWrap: 'wrap' as const,
  } as CSSProperties,
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  legendSymbol: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
  } as CSSProperties,
};

export const MultiPeriodTimeline: React.FC<MultiPeriodTimelineProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'comparison'>('timeline');
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  // Default data
  const defaultData = {
    currentDate: new Date().toISOString(),
    periods: [
      {
        id: 'exploration',
        name: 'Exploration Phase',
        startDate: '2023-01-01',
        endDate: '2023-06-30',
        dominantTraits: ['Curiosity', 'Openness', 'Adaptability'],
        color: colors.accent,
        description: 'A period of discovery and experimentation with new ideas and approaches.',
        confidenceLevel: 45,
        growthRate: 15,
      },
      {
        id: 'foundation',
        name: 'Foundation Building',
        startDate: '2023-07-01',
        endDate: '2023-12-31',
        dominantTraits: ['Determination', 'Focus', 'Resilience'],
        color: colors.accentDark,
        description: 'Establishing core competencies and building sustainable habits.',
        confidenceLevel: 62,
        growthRate: 22,
      },
      {
        id: 'acceleration',
        name: 'Acceleration Period',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        dominantTraits: ['Leadership', 'Confidence', 'Innovation'],
        color: '#6BCF7F',
        description: 'Rapid growth and expansion of capabilities with increasing confidence.',
        confidenceLevel: 78,
        growthRate: 35,
      },
      {
        id: 'integration',
        name: 'Integration Phase',
        startDate: '2024-07-01',
        endDate: '2024-12-31',
        dominantTraits: ['Wisdom', 'Balance', 'Mastery'],
        color: '#FFD93D',
        description: 'Synthesizing lessons learned and achieving balanced growth.',
        confidenceLevel: 85,
        growthRate: 18,
      },
    ],
    events: [
      {
        date: new Date('2023-03-15'),
        type: 'milestone' as const,
        title: 'First Major Breakthrough',
        description: 'Discovered authentic voice in communication',
        impact: 8,
      },
      {
        date: new Date('2023-08-22'),
        type: 'challenge' as const,
        title: 'Confidence Challenge',
        description: 'Faced and overcame imposter syndrome',
        impact: 7,
      },
      {
        date: new Date('2024-02-10'),
        type: 'breakthrough' as const,
        title: 'Leadership Emergence',
        description: 'Stepped into natural leadership role',
        impact: 9,
      },
      {
        date: new Date('2024-09-05'),
        type: 'transition' as const,
        title: 'Evolution Complete',
        description: 'Achieved integration of all growth phases',
        impact: 10,
      },
    ],
  };

  const timelineData = data || defaultData;

  useEffect(() => {
    if (!svgRef.current || viewMode !== 'timeline') return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const width = 900 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const allDates = [
      ...timelineData.periods.map(p => new Date(p.startDate)),
      ...timelineData.periods.map(p => new Date(p.endDate)),
      ...timelineData.events.map(e => e.date),
    ];

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(allDates) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%b %Y') as any))
      .style('color', colors.textSecondary);

    // Add periods as colored bands
    const periods = g.selectAll('.period')
      .data(timelineData.periods)
      .enter().append('g')
      .attr('class', 'period');

    periods.append('rect')
      .attr('x', d => xScale(new Date(d.startDate)))
      .attr('y', 0)
      .attr('width', d => xScale(new Date(d.endDate)) - xScale(new Date(d.startDate)))
      .attr('height', height)
      .attr('fill', d => d.color)
      .attr('opacity', 0.2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 0.3);
        
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '1';
          tooltipRef.current.innerHTML = `
            <strong>${d.name}</strong><br/>
            ${d.description}<br/>
            <em>Confidence: ${d.confidenceLevel}%</em>
          `;
          
          const rect = svgRef.current!.getBoundingClientRect();
          tooltipRef.current.style.left = `${event.clientX - rect.left}px`;
          tooltipRef.current.style.top = `${event.clientY - rect.top - 60}px`;
        }
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.2);
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      });

    // Add period labels
    periods.append('text')
      .attr('x', d => xScale(new Date(d.startDate)) + 
        (xScale(new Date(d.endDate)) - xScale(new Date(d.startDate))) / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', d => d.color)
      .text(d => d.name);

    // Add confidence line
    const confidenceLine = d3.line<PersonalityPeriod>()
      .x(d => xScale(new Date(d.startDate)) + 
        (xScale(new Date(d.endDate)) - xScale(new Date(d.startDate))) / 2)
      .y(d => yScale(d.confidenceLevel))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(timelineData.periods)
      .attr('fill', 'none')
      .attr('stroke', colors.accent)
      .attr('stroke-width', 3)
      .attr('d', confidenceLine);

    // Add confidence points
    g.selectAll('.confidence-point')
      .data(timelineData.periods)
      .enter().append('circle')
      .attr('cx', d => xScale(new Date(d.startDate)) + 
        (xScale(new Date(d.endDate)) - xScale(new Date(d.startDate))) / 2)
      .attr('cy', d => yScale(d.confidenceLevel))
      .attr('r', 6)
      .attr('fill', colors.accent)
      .attr('stroke', colors.background)
      .attr('stroke-width', 2);

    // Add events
    const eventSymbols = {
      milestone: d3.symbolStar,
      challenge: d3.symbolTriangle,
      breakthrough: d3.symbolDiamond,
      transition: d3.symbolCircle,
    };

    const events = g.selectAll('.event')
      .data(timelineData.events)
      .enter().append('g')
      .attr('class', 'event')
      .attr('transform', d => `translate(${xScale(d.date)},${height - 20})`);

    events.append('path')
      .attr('d', d => d3.symbol().type(eventSymbols[d.type]).size(150)() || '')
      .attr('fill', d => {
        switch (d.type) {
          case 'milestone': return colors.accent;
          case 'challenge': return '#FF6B6B';
          case 'breakthrough': return '#6BCF7F';
          case 'transition': return '#FFD93D';
          default: return colors.accent;
        }
      })
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('transform', 'scale(1.2)');
        
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '1';
          tooltipRef.current.innerHTML = `
            <strong>${d.title}</strong><br/>
            ${d.description}<br/>
            <em>Impact: ${d.impact}/10</em>
          `;
          
          const rect = svgRef.current!.getBoundingClientRect();
          tooltipRef.current.style.left = `${event.clientX - rect.left}px`;
          tooltipRef.current.style.top = `${event.clientY - rect.top - 60}px`;
        }
      })
      .on('mouseout', function() {
        d3.select(this).attr('transform', 'scale(1)');
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      });

    // Add Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', colors.textSecondary)
      .text('Confidence Level (%)');

  }, [timelineData, viewMode]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Personality Evolution Timeline</h3>
      
      <div style={styles.controls}>
        <button
          style={{
            ...styles.controlButton,
            ...(viewMode === 'timeline' ? styles.activeButton : {}),
          }}
          onClick={() => setViewMode('timeline')}
        >
          Timeline View
        </button>
        <button
          style={{
            ...styles.controlButton,
            ...(viewMode === 'comparison' ? styles.activeButton : {}),
          }}
          onClick={() => setViewMode('comparison')}
        >
          Period Details
        </button>
      </div>

      {viewMode === 'timeline' ? (
        <>
          <div style={styles.svgContainer}>
            <svg ref={svgRef}></svg>
            <div ref={tooltipRef} style={styles.tooltip}></div>
          </div>
          
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendSymbol, backgroundColor: colors.accent }}>
                <svg width="16" height="16">
                  <path d={d3.symbol().type(d3.symbolStar).size(100)() || ''} 
                    transform="translate(8,8)" fill={colors.background} />
                </svg>
              </div>
              <span>Milestone</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendSymbol, backgroundColor: '#FF6B6B' }}>
                <svg width="16" height="16">
                  <path d={d3.symbol().type(d3.symbolTriangle).size(100)() || ''} 
                    transform="translate(8,8)" fill={colors.background} />
                </svg>
              </div>
              <span>Challenge</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendSymbol, backgroundColor: '#6BCF7F' }}>
                <svg width="16" height="16">
                  <path d={d3.symbol().type(d3.symbolDiamond).size(100)() || ''} 
                    transform="translate(8,8)" fill={colors.background} />
                </svg>
              </div>
              <span>Breakthrough</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendSymbol, backgroundColor: '#FFD93D' }}>
                <svg width="16" height="16">
                  <circle cx="8" cy="8" r="5" fill={colors.background} />
                </svg>
              </div>
              <span>Transition</span>
            </div>
          </div>
        </>
      ) : (
        <div style={styles.periodDetails}>
          {timelineData.periods.map(period => (
            <div 
              key={period.id} 
              style={{
                ...styles.periodCard,
                borderTopColor: period.color,
              }}
            >
              <div style={{ ...styles.periodTitle, color: period.color }}>
                {period.name}
              </div>
              <div style={styles.periodDates}>
                {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
              </div>
              <div style={styles.periodDescription}>
                {period.description}
              </div>
              <div style={styles.traitsList}>
                {period.dominantTraits.map((trait, index) => (
                  <span key={index} style={styles.trait}>{trait}</span>
                ))}
              </div>
              <div style={styles.metricsRow}>
                <div style={styles.metric}>
                  <div style={styles.metricValue}>{period.confidenceLevel}%</div>
                  <div style={styles.metricLabel}>Confidence</div>
                </div>
                <div style={styles.metric}>
                  <div style={{ ...styles.metricValue, color: period.color }}>
                    +{period.growthRate}%
                  </div>
                  <div style={styles.metricLabel}>Growth Rate</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};