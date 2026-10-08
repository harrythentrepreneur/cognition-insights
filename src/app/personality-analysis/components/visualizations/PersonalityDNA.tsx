import React, { useRef, useEffect, useState, CSSProperties } from 'react';
import * as d3 from 'd3';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface DNATraitPair {
  trait1: string;
  trait2: string;
  value1: number;
  value2: number;
  color1: string;
  color2: string;
  description: string;
}

interface PersonalityDNAProps {
  data: Record<string, number>;
  width?: number;
  height?: number;
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    background: 'radial-gradient(ellipse at center, rgba(0, 255, 230, 0.1) 0%, transparent 70%)',
    borderRadius: '16px',
    padding: spacing.xl,
    overflow: 'hidden',
  } as CSSProperties,

  title: {
    textAlign: 'center',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.lg,
    textShadow: `0 0 10px ${colors.accent}40`,
  } as CSSProperties,

  svgContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  } as CSSProperties,

  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  } as CSSProperties,

  controlButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}40`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as CSSProperties,

  controlButtonActive: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
    boxShadow: `0 0 10px ${colors.accent}30`,
  } as CSSProperties,

  legendContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    marginTop: spacing.lg,
  } as CSSProperties,

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(35, 35, 64, 0.3)',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,

  legendColors: {
    display: 'flex',
    gap: '4px',
  } as CSSProperties,

  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  } as CSSProperties,

  legendText: {
    fontSize: '0.8rem',
    color: colors.text,
  } as CSSProperties,

  legendDescription: {
    fontSize: '0.7rem',
    color: colors.textSecondary,
    marginTop: '2px',
  } as CSSProperties,

  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    padding: spacing.sm,
    color: colors.text,
    fontSize: '0.875rem',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    maxWidth: '250px',
  } as CSSProperties,
};

export const PersonalityDNA: React.FC<PersonalityDNAProps> = ({
  data,
  width = 700,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isAnimating, setIsAnimating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [hoveredPair, setHoveredPair] = useState<DNATraitPair | null>(null);

  // Define trait pairs that form the DNA structure
  const traitPairs: DNATraitPair[] = [
    {
      trait1: 'Openness',
      trait2: 'Conscientiousness',
      value1: data.openness || 50,
      value2: data.conscientiousness || 50,
      color1: '#FF6B6B',
      color2: '#4ECDC4',
      description: 'Creativity vs Structure',
    },
    {
      trait1: 'Extraversion',
      trait2: 'Agreeableness',
      value1: data.extraversion || 50,
      value2: data.agreeableness || 50,
      color1: '#45B7D1',
      color2: '#96CEB4',
      description: 'Social Energy vs Harmony',
    },
    {
      trait1: 'Emotional Stability',
      trait2: 'Empathy',
      value1: data.emotional_stability || 50,
      value2: data.empathy || 50,
      color1: '#FFEAA7',
      color2: '#DDA0DD',
      description: 'Resilience vs Sensitivity',
    },
    {
      trait1: 'Analytical',
      trait2: 'Intuitive',
      value1: data.analytical || 50,
      value2: data.intuitive || 50,
      color1: '#74B9FF',
      color2: '#FD79A8',
      description: 'Logic vs Instinct',
    },
    {
      trait1: 'Assertiveness',
      trait2: 'Adaptability',
      value1: data.assertiveness || 50,
      value2: data.adaptability || 50,
      color1: '#FDCB6E',
      color2: '#6C5CE7',
      description: 'Leadership vs Flexibility',
    },
  ];

  // Generate DNA helix points
  const generateHelixPoints = (time: number) => {
    const points: Array<{
      x: number;
      y: number;
      z: number;
      strand: 'left' | 'right';
      pairIndex: number;
      trait: string;
      value: number;
      color: string;
    }> = [];

    const helixRadius = 80;
    const helixHeight = height - 100;
    const turns = 3;
    const pointsPerTurn = 20;
    const totalPoints = turns * pointsPerTurn;

    for (let i = 0; i < totalPoints; i++) {
      const progress = i / totalPoints;
      const angle = (progress * turns * 2 * Math.PI) + (time * rotationSpeed * 0.02);
      const y = 50 + progress * helixHeight;
      
      // Determine which trait pair this point belongs to
      const pairIndex = Math.floor(progress * traitPairs.length);
      const pair = traitPairs[pairIndex] || traitPairs[0];
      
      // Left strand
      const leftX = width / 2 + Math.cos(angle) * helixRadius;
      const leftZ = Math.sin(angle) * helixRadius;
      
      points.push({
        x: leftX,
        y,
        z: leftZ,
        strand: 'left',
        pairIndex,
        trait: pair.trait1,
        value: pair.value1,
        color: pair.color1,
      });

      // Right strand (180 degrees out of phase)
      const rightX = width / 2 + Math.cos(angle + Math.PI) * helixRadius;
      const rightZ = Math.sin(angle + Math.PI) * helixRadius;
      
      points.push({
        x: rightX,
        y,
        z: rightZ,
        strand: 'right',
        pairIndex,
        trait: pair.trait2,
        value: pair.value2,
        color: pair.color2,
      });
    }

    return points;
  };

  // Generate connecting base pairs
  const generateBasePairs = (points: ReturnType<typeof generateHelixPoints>, time: number) => {
    const basePairs: Array<{
      leftPoint: any;
      rightPoint: any;
      pairIndex: number;
      strength: number;
    }> = [];

    // Group points by height and find pairs
    for (let i = 0; i < points.length - 1; i += 2) {
      const leftPoint = points[i];
      const rightPoint = points[i + 1];
      
      if (leftPoint && rightPoint && leftPoint.strand !== rightPoint.strand) {
        // Calculate connection strength based on trait values
        const pair = traitPairs[leftPoint.pairIndex];
        const avgValue = (pair.value1 + pair.value2) / 2;
        const strength = avgValue / 100;
        
        // Add some animation to the connection strength
        const animatedStrength = strength * (0.8 + 0.2 * Math.sin(time * 0.01 + i * 0.1));
        
        basePairs.push({
          leftPoint,
          rightPoint,
          pairIndex: leftPoint.pairIndex,
          strength: animatedStrength,
        });
      }
    }

    return basePairs;
  };

  // Render the DNA visualization
  const render = (time: number) => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    svg.selectAll('*').remove();

    const points = generateHelixPoints(time);
    const basePairs = generateBasePairs(points, time);

    // Create gradients for each trait
    const defs = svg.append('defs');
    traitPairs.forEach((pair, index) => {
      const gradient1 = defs.append('linearGradient')
        .attr('id', `gradient-${index}-1`)
        .attr('gradientUnits', 'userSpaceOnUse');
      
      gradient1.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', pair.color1)
        .attr('stop-opacity', 0.8);
      
      gradient1.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', pair.color1)
        .attr('stop-opacity', 0.3);

      const gradient2 = defs.append('linearGradient')
        .attr('id', `gradient-${index}-2`)
        .attr('gradientUnits', 'userSpaceOnUse');
      
      gradient2.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', pair.color2)
        .attr('stop-opacity', 0.8);
      
      gradient2.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', pair.color2)
        .attr('stop-opacity', 0.3);
    });

    // Draw connecting lines (base pairs)
    svg.selectAll('.base-pair')
      .data(basePairs.filter((_, i) => i % 3 === 0)) // Sample every 3rd pair for clarity
      .enter()
      .append('line')
      .attr('class', 'base-pair')
      .attr('x1', d => d.leftPoint.x)
      .attr('y1', d => d.leftPoint.y)
      .attr('x2', d => d.rightPoint.x)
      .attr('y2', d => d.rightPoint.y)
      .attr('stroke', d => {
        const pair = traitPairs[d.pairIndex];
        return d3.interpolateRgb(pair.color1, pair.color2)(0.5);
      })
      .attr('stroke-width', d => 1 + d.strength * 2)
      .attr('stroke-opacity', d => 0.3 + d.strength * 0.4)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const pair = traitPairs[d.pairIndex];
        setHoveredPair(pair);
        
        if (tooltipRef.current) {
          tooltipRef.current.style.left = `${event.pageX + 10}px`;
          tooltipRef.current.style.top = `${event.pageY - 10}px`;
          tooltipRef.current.style.opacity = '1';
        }
      })
      .on('mouseout', () => {
        setHoveredPair(null);
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      });

    // Draw helix strands
    const leftStrandPoints = points.filter(p => p.strand === 'left');
    const rightStrandPoints = points.filter(p => p.strand === 'right');

    const lineGenerator = d3.line<any>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveCatmullRom);

    // Left strand
    svg.append('path')
      .datum(leftStrandPoints)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'url(#leftStrandGradient)')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);

    // Right strand
    svg.append('path')
      .datum(rightStrandPoints)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'url(#rightStrandGradient)')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);

    // Add strand gradients
    const leftStrandGradient = defs.append('linearGradient')
      .attr('id', 'leftStrandGradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', height);

    leftStrandGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colors.accent)
      .attr('stop-opacity', 0.8);

    leftStrandGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colors.accent)
      .attr('stop-opacity', 0.3);

    const rightStrandGradient = defs.append('linearGradient')
      .attr('id', 'rightStrandGradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', height);

    rightStrandGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#00D9CC')
      .attr('stop-opacity', 0.8);

    rightStrandGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#00D9CC')
      .attr('stop-opacity', 0.3);

    // Draw trait indicators
    svg.selectAll('.trait-indicator')
      .data(points.filter((_, i) => i % 8 === 0)) // Sample points for indicators
      .enter()
      .append('circle')
      .attr('class', 'trait-indicator')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => 3 + (d.value / 100) * 3)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer');
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (isAnimating) {
        setCurrentTime(prev => prev + 1);
      }
      
      render(currentTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentTime, isAnimating, rotationSpeed]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Personality DNA Helix</h3>
      
      <div style={styles.svgContainer}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ overflow: 'visible' }}
        />
      </div>

      {/* Tooltip */}
      <div ref={tooltipRef} style={styles.tooltip}>
        {hoveredPair && (
          <>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              {hoveredPair.description}
            </div>
            <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              <span style={{ color: hoveredPair.color1 }}>
                {hoveredPair.trait1}: {hoveredPair.value1}%
              </span>
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: hoveredPair.color2 }}>
                {hoveredPair.trait2}: {hoveredPair.value2}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.controlButton,
            ...(isAnimating ? styles.controlButtonActive : {}),
          }}
          onClick={() => setIsAnimating(!isAnimating)}
        >
          {isAnimating ? 'Pause' : 'Play'}
        </button>
        <button
          style={styles.controlButton}
          onClick={() => setRotationSpeed(prev => prev === 1 ? 2 : prev === 2 ? 0.5 : 1)}
        >
          Speed: {rotationSpeed}x
        </button>
        <button
          style={styles.controlButton}
          onClick={() => setCurrentTime(0)}
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div style={styles.legendContainer}>
        {traitPairs.map((pair, index) => (
          <div key={index} style={styles.legendItem}>
            <div style={styles.legendColors}>
              <div
                style={{
                  ...styles.legendColor,
                  backgroundColor: pair.color1,
                }}
              />
              <div
                style={{
                  ...styles.legendColor,
                  backgroundColor: pair.color2,
                }}
              />
            </div>
            <div>
              <div style={styles.legendText}>
                {pair.trait1} ↔ {pair.trait2}
              </div>
              <div style={styles.legendDescription}>
                {pair.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};