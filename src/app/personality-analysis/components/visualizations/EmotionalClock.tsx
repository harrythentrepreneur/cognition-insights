import React, { useRef, useEffect, useState, CSSProperties } from 'react';
import * as d3 from 'd3';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface MessageExample {
  message: string;
  timestamp: string;
  detected_emotions: string[];
}

interface EmotionalClockData {
  hour: number;
  dominant_emotion: string;
  intensity: number;
  confidence: number;
  message_count: number;
  example_messages?: MessageExample[];
  typical_topics?: string[];
}

interface EmotionalClockProps {
  data: EmotionalClockData[];
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
    fontSize: '1.25rem',
    fontWeight: 500,
    color: colors.text,
    marginBottom: '1rem',
  } as CSSProperties,
  
  svgContainer: {
    display: 'flex',
    justifyContent: 'center',
    position: 'relative' as const,
  } as CSSProperties,
  
  tooltip: {
    position: 'absolute' as const,
    background: 'rgba(35, 35, 64, 0.98)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    padding: '16px',
    color: colors.text,
    fontSize: '0.875rem',
    maxWidth: '350px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'none' as const,
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 10,
  } as CSSProperties,
  
  legend: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    gap: spacing.md,
    marginTop: spacing.lg,
  } as CSSProperties,
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  } as CSSProperties,
};

// Emotion color mapping
const emotionColors = {
  joy: '#FFD700',      // Gold
  energy: '#FF6B35',   // Orange-red
  calm: '#4ECDC4',     // Teal
  stress: '#FF4757',   // Red
  tired: '#A55EEA',    // Purple
  neutral: '#95A5A6',  // Gray
};

const emotionEmojis = {
  joy: '😊',
  energy: '⚡',
  calm: '😌',
  stress: '😰',
  tired: '😴',
  neutral: '😐',
};

export const EmotionalClock: React.FC<EmotionalClockProps> = ({ 
  data, 
  width = 500, 
  height = 500 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<EmotionalClockData | null>(null);
  
  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    
    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 40;
    const innerRadius = outerRadius * 0.3;
    
    // Create the pie layout
    const pie = d3.pie<EmotionalClockData>()
      .value(1) // Each hour gets equal space
      .sort(null)
      .startAngle(-Math.PI / 2) // Start at 12 o'clock
      .endAngle(3 * Math.PI / 2);
    
    const arc = d3.arc<d3.PieArcDatum<EmotionalClockData>>()
      .innerRadius(innerRadius)
      .outerRadius((d) => {
        const intensity = d.data.intensity || 0;
        return innerRadius + (outerRadius - innerRadius) * (intensity / 100);
      });
    
    const arcHover = d3.arc<d3.PieArcDatum<EmotionalClockData>>()
      .innerRadius(innerRadius)
      .outerRadius((d) => {
        const intensity = d.data.intensity || 0;
        return innerRadius + (outerRadius - innerRadius) * (intensity / 100) + 5;
      });
    
    // Create the main group
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);
    
    // Generate the pie data
    const pieData = pie(data);
    
    // Create segments
    const segments = g.selectAll('.segment')
      .data(pieData)
      .enter()
      .append('g')
      .attr('class', 'segment');
    
    // Add the arcs
    segments.append('path')
      .attr('d', arc)
      .attr('fill', (d) => {
        const emotion = d.data.dominant_emotion;
        return emotionColors[emotion as keyof typeof emotionColors] || emotionColors.neutral;
      })
      .attr('stroke', colors.background)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseover', function(event, d) {
        // Expand segment on hover
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover as any);
        
        setHoveredSegment(d.data);
        
        // Position tooltip
        if (tooltipRef.current) {
          const tooltip = tooltipRef.current;
          tooltip.style.opacity = '1';
          tooltip.style.left = `${event.pageX + 10}px`;
          tooltip.style.top = `${event.pageY - 10}px`;
        }
      })
      .on('mouseout', function() {
        // Return to normal size
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any);
        
        setHoveredSegment(null);
        
        // Hide tooltip
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      });
    
    // Add hour labels
    segments.append('text')
      .attr('transform', (d) => {
        const angle = (d.startAngle + d.endAngle) / 2;
        const radius = outerRadius + 20;
        const x = Math.cos(angle - Math.PI / 2) * radius;
        const y = Math.sin(angle - Math.PI / 2) * radius;
        return `translate(${x}, ${y})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', colors.textSecondary)
      .text((d) => d.data.hour === 0 ? '12' : d.data.hour > 12 ? d.data.hour - 12 : d.data.hour);
    
    // Add AM/PM indicators
    segments.append('text')
      .attr('transform', (d) => {
        const angle = (d.startAngle + d.endAngle) / 2;
        const radius = outerRadius + 35;
        const x = Math.cos(angle - Math.PI / 2) * radius;
        const y = Math.sin(angle - Math.PI / 2) * radius;
        return `translate(${x}, ${y})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '8px')
      .style('fill', colors.textSecondary)
      .text((d) => d.data.hour < 12 ? 'AM' : 'PM');
    
    // Add center circle with title
    g.append('circle')
      .attr('r', innerRadius - 10)
      .attr('fill', 'rgba(35, 35, 64, 0.8)')
      .attr('stroke', colors.border)
      .attr('stroke-width', 1);
    
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', colors.accent)
      .text('24 Hour')
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.2em')
      .style('font-size', '14px')
      .style('font-weight', '400')
      .text('Emotions');
      
  }, [data, width, height]);
  
  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Daily Emotional Patterns</h4>
      
      <div style={styles.svgContainer}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ overflow: 'visible' }}
        />
        
        {/* Tooltip */}
        <div ref={tooltipRef} style={styles.tooltip}>
          {hoveredSegment && (
            <>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                {hoveredSegment.hour === 0 ? '12' : hoveredSegment.hour > 12 ? hoveredSegment.hour - 12 : hoveredSegment.hour}:00 {hoveredSegment.hour < 12 ? 'AM' : 'PM'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <span>{emotionEmojis[hoveredSegment.dominant_emotion as keyof typeof emotionEmojis]}</span>
                <span style={{ textTransform: 'capitalize' }}>{hoveredSegment.dominant_emotion}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                <div>Intensity: {Math.round(hoveredSegment.intensity)}%</div>
                <div>Confidence: {Math.round(hoveredSegment.confidence)}%</div>
                <div>Messages: {hoveredSegment.message_count}</div>
              </div>
              
              {/* Show typical topics if available */}
              {hoveredSegment.typical_topics && hoveredSegment.typical_topics.length > 0 && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Typical topics at this time:
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.accent }}>
                    {hoveredSegment.typical_topics.join(', ')}
                  </div>
                </div>
              )}
              
              {/* Show example messages if available */}
              {hoveredSegment.example_messages && hoveredSegment.example_messages.length > 0 && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Example message:
                  </div>
                  {hoveredSegment.example_messages.slice(0, 1).map((msg, idx) => (
                    <div key={idx} style={{ 
                      padding: '6px 8px', 
                      backgroundColor: 'rgba(0, 255, 230, 0.05)',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ fontStyle: 'italic', color: colors.text, marginBottom: '4px' }}>
                        &quot;{msg.message.substring(0, 100)}...&quot;
                      </div>
                      {msg.detected_emotions.length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: colors.textSecondary }}>
                          Emotions: {msg.detected_emotions.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(emotionColors).map(([emotion, color]) => (
          <div key={emotion} style={styles.legendItem}>
            <div
              style={{
                ...styles.legendColor,
                backgroundColor: color,
              }}
            />
            <span style={{ textTransform: 'capitalize' }}>
              {emotionEmojis[emotion as keyof typeof emotionEmojis]} {emotion}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};