import React, { useEffect, useRef, CSSProperties, useState } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import * as d3 from 'd3';

const { colors, spacing } = DESIGN_TOKENS;

interface HeroJourneyStage {
  id: string;
  name: string;
  phase: 'departure' | 'initiation' | 'return';
  description: string;
  userMapping: string;
  completionScore: number;
  keywords: string[];
}

interface HeroJourneyArcProps {
  data?: {
    stages: HeroJourneyStage[];
    currentStage: string;
    overallProgress: number;
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
  
  svgContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative' as const,
  } as CSSProperties,
  
  stageDetails: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    marginTop: spacing.lg,
    minHeight: '200px',
    transition: 'all 0.3s ease',
  } as CSSProperties,
  
  stageTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.md,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  } as CSSProperties,
  
  phaseIndicator: {
    fontSize: '0.875rem',
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: '16px',
    fontWeight: 500,
  } as CSSProperties,
  
  stageDescription: {
    fontSize: '1rem',
    color: colors.text,
    lineHeight: 1.6,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  userMapping: {
    fontSize: '0.95rem',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderLeft: `3px solid ${colors.accent}`,
    borderRadius: '0 4px 4px 0',
  } as CSSProperties,
  
  keywords: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing.xs,
    marginTop: spacing.md,
  } as CSSProperties,
  
  keyword: {
    fontSize: '0.75rem',
    padding: `4px 12px`,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '12px',
    color: colors.accent,
  } as CSSProperties,
  
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: colors.border,
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: spacing.sm,
  } as CSSProperties,
  
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: '4px',
    transition: 'width 0.6s ease',
  } as CSSProperties,
  
  phaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
    marginTop: spacing.xl,
  } as CSSProperties,
  
  phaseCard: {
    backgroundColor: 'rgba(35, 35, 64, 0.3)',
    padding: spacing.md,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    textAlign: 'center' as const,
  } as CSSProperties,
  
  phaseTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  phaseProgress: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginTop: spacing.sm,
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
};

export const HeroJourneyArc: React.FC<HeroJourneyArcProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedStage, setSelectedStage] = useState<HeroJourneyStage | null>(null);

  // Default Hero's Journey data
  const defaultData = {
    currentStage: 'crossing-threshold',
    overallProgress: 45,
    stages: [
      {
        id: 'ordinary-world',
        name: 'Ordinary World',
        phase: 'departure' as const,
        description: 'The starting point of your journey, representing your comfort zone and familiar patterns.',
        userMapping: 'Your early communication patterns show comfort in familiar relationships and established routines.',
        completionScore: 100,
        keywords: ['comfort', 'routine', 'familiar', 'baseline'],
      },
      {
        id: 'call-to-adventure',
        name: 'Call to Adventure',
        phase: 'departure' as const,
        description: 'The moment when change beckons, presenting new challenges or opportunities.',
        userMapping: 'Emerging patterns suggest growing awareness of the need for personal growth and change.',
        completionScore: 100,
        keywords: ['awakening', 'restlessness', 'desire', 'possibility'],
      },
      {
        id: 'refusal-of-call',
        name: 'Refusal of the Call',
        phase: 'departure' as const,
        description: 'Initial resistance to change, driven by fear or uncertainty.',
        userMapping: 'Periods of hesitation and self-doubt evident in your communication patterns.',
        completionScore: 80,
        keywords: ['doubt', 'fear', 'hesitation', 'resistance'],
      },
      {
        id: 'meeting-mentor',
        name: 'Meeting the Mentor',
        phase: 'departure' as const,
        description: 'Finding guidance, wisdom, or inspiration to begin the journey.',
        userMapping: 'Key relationships emerge as sources of support and wisdom in your narrative.',
        completionScore: 60,
        keywords: ['guidance', 'wisdom', 'support', 'inspiration'],
      },
      {
        id: 'crossing-threshold',
        name: 'Crossing the Threshold',
        phase: 'initiation' as const,
        description: 'Taking the first real step into the unknown, leaving the familiar behind.',
        userMapping: 'Your communication shows increasing confidence and willingness to explore new territories.',
        completionScore: 40,
        keywords: ['courage', 'commitment', 'action', 'breakthrough'],
      },
      {
        id: 'tests-allies-enemies',
        name: 'Tests, Allies, and Enemies',
        phase: 'initiation' as const,
        description: 'Facing challenges that reveal true friends and obstacles.',
        userMapping: 'Your social dynamics reveal who supports your growth and what holds you back.',
        completionScore: 20,
        keywords: ['challenge', 'discernment', 'loyalty', 'conflict'],
      },
      {
        id: 'approach-innermost-cave',
        name: 'Approach to the Innermost Cave',
        phase: 'initiation' as const,
        description: 'Preparing for the greatest challenge, facing deepest fears.',
        userMapping: 'Patterns show you building courage to confront your most significant personal challenges.',
        completionScore: 0,
        keywords: ['preparation', 'depth', 'confrontation', 'truth'],
      },
      {
        id: 'ordeal',
        name: 'The Ordeal',
        phase: 'initiation' as const,
        description: 'The supreme test, facing your greatest fear or most difficult challenge.',
        userMapping: 'Your journey approaches its most transformative and challenging phase.',
        completionScore: 0,
        keywords: ['crisis', 'transformation', 'death-rebirth', 'breakthrough'],
      },
      {
        id: 'reward',
        name: 'Reward',
        phase: 'return' as const,
        description: 'Surviving the ordeal and gaining the reward - new wisdom, power, or understanding.',
        userMapping: 'The insights and growth from your challenges begin to manifest in your personality.',
        completionScore: 0,
        keywords: ['achievement', 'wisdom', 'power', 'insight'],
      },
      {
        id: 'road-back',
        name: 'The Road Back',
        phase: 'return' as const,
        description: 'Beginning the journey back to ordinary life with new knowledge.',
        userMapping: 'Integration of lessons learned as you apply new insights to daily life.',
        completionScore: 0,
        keywords: ['integration', 'return', 'application', 'balance'],
      },
      {
        id: 'resurrection',
        name: 'Resurrection',
        phase: 'return' as const,
        description: 'Final test using all lessons learned, emerging transformed.',
        userMapping: 'Your evolved personality shows mastery of integrated lessons and authentic self-expression.',
        completionScore: 0,
        keywords: ['mastery', 'transformation', 'authenticity', 'wholeness'],
      },
      {
        id: 'return-with-elixir',
        name: 'Return with the Elixir',
        phase: 'return' as const,
        description: 'Bringing wisdom back to help others, completing the cycle.',
        userMapping: 'Your growth enables you to guide and inspire others on their journeys.',
        completionScore: 0,
        keywords: ['service', 'teaching', 'completion', 'legacy'],
      },
    ],
  };

  const journeyData = data || defaultData;

  useEffect(() => {
    if (!svgRef.current) return;

    // Set initial selected stage
    const current = journeyData.stages.find(s => s.id === journeyData.currentStage);
    if (current && !selectedStage) {
      setSelectedStage(current);
    }

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 800;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    // Create arc generator
    const arc = d3.arc<any>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    // Create pie layout
    const pie = d3.pie<HeroJourneyStage>()
      .value(() => 1)
      .sort(null);

    const data = pie(journeyData.stages);

    // Color scale by phase
    const phaseColors = {
      departure: colors.accent,
      initiation: colors.accentDark,
      return: '#6BCF7F',
    };

    // Add arcs
    const arcs = g.selectAll('.arc')
      .data(data)
      .enter().append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => {
        const stage = d.data;
        const baseColor = phaseColors[stage.phase];
        const opacity = stage.completionScore / 100;
        return d3.color(baseColor)!.copy({ opacity: Math.max(0.3, opacity) }).toString();
      })
      .attr('stroke', d => phaseColors[d.data.phase])
      .attr('stroke-width', d => d.data.id === journeyData.currentStage ? 3 : 1)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 3)
          .style('filter', 'brightness(1.2)');

        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '1';
          tooltipRef.current.innerHTML = `
            <strong>${d.data.name}</strong><br/>
            <em>${d.data.phase} phase</em><br/>
            Progress: ${d.data.completionScore}%
          `;
          
          const rect = svgRef.current!.getBoundingClientRect();
          tooltipRef.current.style.left = `${event.clientX - rect.left}px`;
          tooltipRef.current.style.top = `${event.clientY - rect.top - 60}px`;
        }
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke-width', d.data.id === journeyData.currentStage ? 3 : 1)
          .style('filter', 'brightness(1)');

        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      })
      .on('click', (event, d) => {
        setSelectedStage(d.data);
      });

    // Add labels
    arcs.append('text')
      .attr('transform', d => {
        const [x, y] = arc.centroid(d);
        const angle = (d.startAngle + d.endAngle) / 2;
        const rotation = angle * 180 / Math.PI - 90;
        return `translate(${x},${y}) rotate(${rotation > 90 ? rotation + 180 : rotation})`;
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', colors.text)
      .style('pointer-events', 'none')
      .text(d => d.data.name);

    // Add center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .style('font-size', '24px')
      .style('font-weight', '600')
      .style('fill', colors.accent)
      .text("Your Hero's");

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .style('font-size', '24px')
      .style('font-weight', '600')
      .style('fill', colors.accent)
      .text('Journey');

    // Add phase labels
    const phaseArcs = [
      { phase: 'departure', start: 0, end: Math.PI * 2 / 3 },
      { phase: 'initiation', start: Math.PI * 2 / 3, end: Math.PI * 4 / 3 },
      { phase: 'return', start: Math.PI * 4 / 3, end: Math.PI * 2 },
    ];

    phaseArcs.forEach(phase => {
      const angle = (phase.start + phase.end) / 2 - Math.PI / 2;
      const x = Math.cos(angle) * (radius + 30);
      const y = Math.sin(angle) * (radius + 30);
      
      g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', phaseColors[phase.phase as keyof typeof phaseColors])
        .style('text-transform', 'uppercase')
        .text(phase.phase);
    });

  }, [journeyData, selectedStage]);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'departure': return colors.accent;
      case 'initiation': return colors.accentDark;
      case 'return': return '#6BCF7F';
      default: return colors.accent;
    }
  };

  const getPhaseProgress = (phase: string) => {
    const stages = journeyData.stages.filter(s => s.phase === phase);
    const totalProgress = stages.reduce((sum, stage) => sum + stage.completionScore, 0);
    return Math.round(totalProgress / stages.length);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Your Hero's Journey Mapping</h3>
      
      <div style={styles.svgContainer}>
        <svg ref={svgRef}></svg>
        <div ref={tooltipRef} style={styles.tooltip}></div>
      </div>

      {selectedStage && (
        <div style={styles.stageDetails}>
          <div style={styles.stageTitle}>
            <span>{selectedStage.name}</span>
            <span style={{
              ...styles.phaseIndicator,
              backgroundColor: `${getPhaseColor(selectedStage.phase)}20`,
              color: getPhaseColor(selectedStage.phase),
            }}>
              {selectedStage.phase}
            </span>
          </div>
          
          <div style={styles.stageDescription}>
            {selectedStage.description}
          </div>
          
          <div style={styles.userMapping}>
            <strong>Your Journey:</strong> {selectedStage.userMapping}
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                Stage Progress
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.accent }}>
                {selectedStage.completionScore}%
              </span>
            </div>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${selectedStage.completionScore}%`,
              }} />
            </div>
          </div>
          
          <div style={styles.keywords}>
            {selectedStage.keywords.map((keyword, index) => (
              <span key={index} style={styles.keyword}>{keyword}</span>
            ))}
          </div>
        </div>
      )}

      <div style={styles.phaseGrid}>
        <div style={styles.phaseCard}>
          <div style={{
            ...styles.phaseTitle,
            color: getPhaseColor('departure'),
          }}>
            Departure
          </div>
          <div style={{
            ...styles.phaseProgress,
            color: getPhaseColor('departure'),
          }}>
            {getPhaseProgress('departure')}%
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
            Leaving the known
          </div>
        </div>
        
        <div style={styles.phaseCard}>
          <div style={{
            ...styles.phaseTitle,
            color: getPhaseColor('initiation'),
          }}>
            Initiation
          </div>
          <div style={{
            ...styles.phaseProgress,
            color: getPhaseColor('initiation'),
          }}>
            {getPhaseProgress('initiation')}%
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
            Facing challenges
          </div>
        </div>
        
        <div style={styles.phaseCard}>
          <div style={{
            ...styles.phaseTitle,
            color: getPhaseColor('return'),
          }}>
            Return
          </div>
          <div style={{
            ...styles.phaseProgress,
            color: getPhaseColor('return'),
          }}>
            {getPhaseProgress('return')}%
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
            Bringing wisdom back
          </div>
        </div>
      </div>
    </div>
  );
};