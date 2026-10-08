import React, { useRef, useEffect, CSSProperties, useState } from 'react';
import * as d3 from 'd3';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { EnhancedCard } from '../ui/EnhancedCard';

const { colors, fonts, spacing, effects, animations } = DESIGN_TOKENS;

interface EmotionalInertiaData {
  score: number;
  by_emotion: Record<string, {
    average_duration_hours: number;
    max_duration_hours: number;
    frequency: number;
  }>;
  average_duration_hours: number;
  longest_streak: {
    emotion: string;
    duration_hours: number;
  };
}

interface EmotionalInertiaGaugeProps {
  data: EmotionalInertiaData;
  width?: number;
  height?: number;
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    position: 'relative' as const,
  } as CSSProperties,
  
  title: {
    textAlign: 'center' as const,
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#FFFFFF',
    marginBottom: spacing.xl,
    textShadow: `0 0 20px ${colors.accent}40`,
    fontFamily: fonts.heading,
  } as CSSProperties,
  
  gaugeContainer: {
    position: 'relative' as const,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  svgContainer: {
    position: 'relative' as const,
    display: 'flex',
    justifyContent: 'center',
  } as CSSProperties,
  
  scoreText: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center' as const,
    pointerEvents: 'none' as const,
  } as CSSProperties,
  
  scoreNumber: {
    fontSize: 'clamp(2.5rem, 8vw, 4rem)',
    fontWeight: 700,
    color: colors.accent,
    textShadow: `0 0 30px ${colors.accent}60`,
    fontFamily: fonts.heading,
    lineHeight: 1,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  scoreLabel: {
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    color: colors.text,
    fontWeight: 500,
    opacity: 0.9,
  } as CSSProperties,
  
  scoreSubtitle: {
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    maxWidth: '120px',
    lineHeight: 1.3,
  } as CSSProperties,
  
  breakdown: {
    marginTop: spacing.xl,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: spacing.md,
  } as CSSProperties,
  
  emotionCard: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: effects.borderRadius,
    padding: spacing.md,
    textAlign: 'center' as const,
    transition: `all ${effects.transitionSpeed} ${animations.easeInOutCubic}`,
    cursor: 'pointer',
    position: 'relative' as const,
    overflow: 'hidden',
  } as CSSProperties,
  
  emotionCardHover: {
    transform: 'translateY(-2px)',
    borderColor: `${colors.accent}60`,
    boxShadow: `0 8px 32px ${colors.accent}20`,
  } as CSSProperties,
  
  emotionName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textTransform: 'capitalize' as const,
  } as CSSProperties,
  
  emotionStat: {
    fontSize: '0.8rem',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 1.4,
  } as CSSProperties,
  
  streakInfo: {
    marginTop: spacing.xl,
    textAlign: 'center' as const,
    padding: spacing.lg,
    backgroundColor: `${colors.accent}10`,
    borderRadius: effects.borderRadius,
    border: `1px solid ${colors.accent}30`,
    position: 'relative' as const,
    overflow: 'hidden',
  } as CSSProperties,
  
  streakText: {
    fontSize: '0.95rem',
    color: '#FFFFFF',
    fontWeight: 500,
    position: 'relative' as const,
    zIndex: 1,
  } as CSSProperties,
  
  streakGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at center, ${colors.accent}15 0%, transparent 70%)`,
    pointerEvents: 'none' as const,
  } as CSSProperties,
};

const emotionColors = {
  joy: '#FFD700',
  energy: '#FF6B35',
  calm: '#4ECDC4',
  stress: '#FF4757',
  tired: '#A55EEA',
  sadness: '#3742FA',
  anger: '#FF3838',
  fear: '#FFA726',
  neutral: '#95A5A6',
};

export const EmotionalInertiaGauge: React.FC<EmotionalInertiaGaugeProps> = ({ 
  data, 
  width = 300, 
  height = 300 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Default data if not provided
  const defaultData: EmotionalInertiaData = {
    score: 65,
    by_emotion: {
      joy: { average_duration_hours: 4.5, max_duration_hours: 12, frequency: 15 },
      calm: { average_duration_hours: 6.2, max_duration_hours: 18, frequency: 12 },
      stress: { average_duration_hours: 3.1, max_duration_hours: 8, frequency: 8 }
    },
    average_duration_hours: 4.6,
    longest_streak: { emotion: 'calm', duration_hours: 18 }
  };
  
  const safeData = data || defaultData;
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;
    const strokeWidth = 20;
    
    // Create circular progress background
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);
    
    // Background circle
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', colors.border)
      .attr('stroke-width', strokeWidth)
      .attr('opacity', 0.2);
    
    // Glow background
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', `${colors.accent}30`)
      .attr('stroke-width', strokeWidth + 4)
      .attr('opacity', 0.5)
      .style('filter', 'blur(3px)');
    
    // Create gradients
    const defs = svg.append('defs');
    
    // Progress gradient based on score
    const progressGradient = defs.append('linearGradient')
      .attr('id', 'progressGradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    if (safeData.score < 30) {
      progressGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colors.info); // Low - good
      progressGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colors.accent);
    } else if (safeData.score < 70) {
      progressGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colors.warning); // Medium
      progressGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colors.accent);
    } else {
      progressGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colors.error); // High - concerning
      progressGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#FF8A80');
    }
    
    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    
    // Progress circle
    const circumference = 2 * Math.PI * radius;
    const progress = (safeData.score / 100) * circumference;
    
    const progressCircle = g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', 'url(#progressGradient)')
      .attr('stroke-width', strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', circumference)
      .attr('stroke-dashoffset', circumference)
      .attr('transform', 'rotate(-90)')
      .style('filter', 'url(#glow)');
    
    // Animate progress
    progressCircle
      .transition()
      .duration(2000)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', circumference - progress)
      .on('end', () => setIsLoaded(true));
    
    // Add floating particles effect
    const particles = g.selectAll('.particle')
      .data(d3.range(8))
      .enter()
      .append('circle')
      .attr('class', 'particle')
      .attr('r', 1.5)
      .attr('fill', colors.accent)
      .attr('opacity', 0.6)
      .style('filter', 'blur(0.5px)');
    
    particles.each(function(d, i) {
      const angle = (i / 8) * 2 * Math.PI;
      const particleRadius = radius + 25;
      
      d3.select(this)
        .attr('cx', Math.cos(angle) * particleRadius)
        .attr('cy', Math.sin(angle) * particleRadius)
        .transition()
        .duration(3000 + Math.random() * 2000)
        .ease(d3.easeSinInOut)
        .attr('opacity', 0.2)
        .attr('r', 0.8)
        .on('end', function repeat() {
          d3.select(this)
            .attr('opacity', 0.6)
            .attr('r', 1.5)
            .transition()
            .duration(3000 + Math.random() * 2000)
            .ease(d3.easeSinInOut)
            .attr('opacity', 0.2)
            .attr('r', 0.8)
            .on('end', repeat);
        });
    });
    
    // Add inner circle decoration
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radius - strokeWidth - 15)
      .attr('fill', 'none')
      .attr('stroke', `${colors.accent}20`)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,3');
      
  }, [safeData, width, height]);
  
  const getInterpretation = () => {
    if (safeData.score < 30) {
      return 'Quick emotional transitions';
    } else if (safeData.score < 60) {
      return 'Balanced emotional flow';
    } else if (safeData.score < 80) {
      return 'Emotions tend to persist';
    } else {
      return 'Strong emotional stickiness';
    }
  };
  
  const getScoreColor = () => {
    if (safeData.score < 30) return colors.info;
    if (safeData.score < 70) return colors.warning;
    return colors.error;
  };
  
  const handleCardHover = (emotion: string, isHovering: boolean) => {
    setHoveredCard(isHovering ? emotion : null);
  };
  
  const getTopEmotions = () => {
    if (!data?.by_emotion) return [];
    return Object.entries(data.by_emotion)
      .sort(([,a], [,b]) => b.average_duration_hours - a.average_duration_hours)
      .slice(0, 5);
  };
  
  return (
    <EnhancedCard glowOnHover={true} tiltEffect={true} scaleOnHover={false}>
      <div style={styles.container}>
        <h2 style={styles.title}>Emotional Stickiness</h2>
        
        <div style={styles.gaugeContainer}>
          <div style={styles.svgContainer}>
            <svg
              ref={svgRef}
              width={width}
              height={height}
              style={{ overflow: 'visible' }}
            />
            <div style={styles.scoreText}>
              <div 
                style={{
                  ...styles.scoreNumber,
                  color: getScoreColor(),
                  textShadow: `0 0 30px ${getScoreColor()}60`,
                }}
              >
                {isLoaded ? safeData.score : 0}
              </div>
              <div style={styles.scoreLabel}>Inertia Score</div>
              <div style={styles.scoreSubtitle}>{getInterpretation()}</div>
            </div>
          </div>
        </div>
        
        {/* Emotion breakdown */}
        <div style={styles.breakdown}>
          {getTopEmotions().map(([emotion, stats]) => {
            const isHovered = hoveredCard === emotion;
            const emotionColor = emotionColors[emotion as keyof typeof emotionColors] || colors.accent;
            
            return (
              <div 
                key={emotion} 
                style={{
                  ...styles.emotionCard,
                  ...(isHovered ? styles.emotionCardHover : {}),
                  borderColor: isHovered ? `${emotionColor}60` : colors.border,
                }}
                onMouseEnter={() => handleCardHover(emotion, true)}
                onMouseLeave={() => handleCardHover(emotion, false)}
              >
                <div style={{
                  ...styles.emotionName,
                  color: isHovered ? emotionColor : '#FFFFFF',
                }}>
                  {emotion}
                </div>
                <div style={styles.emotionStat}>
                  <strong>Avg:</strong> {stats.average_duration_hours.toFixed(1)}h
                </div>
                <div style={styles.emotionStat}>
                  <strong>Max:</strong> {stats.max_duration_hours.toFixed(1)}h
                </div>
                <div style={styles.emotionStat}>
                  <strong>Frequency:</strong> {stats.frequency}
                </div>
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `radial-gradient(circle at center, ${emotionColor}15 0%, transparent 70%)`,
                      pointerEvents: 'none',
                      borderRadius: effects.borderRadius,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Longest streak info */}
        {safeData.longest_streak && (
          <div style={styles.streakInfo}>
            <div style={styles.streakGlow} />
            <div style={styles.streakText}>
              <strong>Longest Emotional Streak:</strong>{' '}
              {safeData.longest_streak.duration_hours.toFixed(1)} hours of{' '}
              <span style={{ 
                color: emotionColors[safeData.longest_streak.emotion as keyof typeof emotionColors] || colors.accent,
                fontWeight: 600 
              }}>
                {safeData.longest_streak.emotion}
              </span>
            </div>
          </div>
        )}
      </div>
    </EnhancedCard>
  );
};