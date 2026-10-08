import React, { useRef, useEffect, useState, CSSProperties } from 'react';
import * as d3 from 'd3';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
const { colors, spacing } = DESIGN_TOKENS;

interface TriggerContext {
  trigger_message: string;
  trigger_timestamp: string;
  response_message: string;
  response_timestamp: string;
  negative_indicators_found: string[];
}

interface TriggerWord {
  word: string;
  frequency: number;
  negative_impact: number;
  contexts?: TriggerContext[];
}

interface TriggerWordCloudProps {
  data: TriggerWord[];
  width?: number;
  height?: number;
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '800px',
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
    pointerEvents: 'none' as const,
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 10,
    maxWidth: '400px',
    minWidth: '300px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  } as CSSProperties,
  
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  button: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.textSecondary,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as CSSProperties,
  
  buttonActive: {
    backgroundColor: colors.accent,
    color: colors.background,
    borderColor: colors.accent,
  } as CSSProperties,
  
  legend: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  } as CSSProperties,
  
  legendGradient: {
    width: '80px',
    height: '12px',
    borderRadius: '6px',
    background: 'linear-gradient(to right, #4ECDC4, #FFD700, #FF4757)',
  } as CSSProperties,
};

export const TriggerWordCloud: React.FC<TriggerWordCloudProps> = ({ 
  data, 
  width = 700, 
  height = 400 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [sortMode, setSortMode] = useState<'frequency' | 'impact'>('impact');
  const [hoveredWord, setHoveredWord] = useState<TriggerWord | null>(null);
  
  // Simple word cloud layout (since d3-cloud might not be available)
  const generateWordPositions = (words: TriggerWord[]) => {
    const positions: Array<TriggerWord & { x: number; y: number; size: number }> = [];
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Sort words by the selected mode
    const sortedWords = [...words].sort((a, b) => {
      if (sortMode === 'frequency') {
        return b.frequency - a.frequency;
      }
      return b.negative_impact - a.negative_impact;
    });
    
    // Calculate sizes
    const maxValue = sortedWords[0] ? (sortMode === 'frequency' ? sortedWords[0].frequency : sortedWords[0].negative_impact) : 1;
    const minValue = sortedWords[sortedWords.length - 1] ? (sortMode === 'frequency' ? sortedWords[sortedWords.length - 1].frequency : sortedWords[sortedWords.length - 1].negative_impact) : 1;
    
    const sizeScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([12, 40]);
    
    // Simple spiral positioning
    let angle = 0;
    let radius = 0;
    const radiusIncrement = 5;
    const angleIncrement = 0.5;
    
    sortedWords.forEach((word, index) => {
      const size = sizeScale(sortMode === 'frequency' ? word.frequency : word.negative_impact);
      
      let x: number, y: number;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
        
        // Check for overlaps with existing words
        const overlaps = positions.some(existing => {
          const dx = x - existing.x;
          const dy = y - existing.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (size + existing.size) / 2 + 5; // padding
          return distance < minDistance;
        });
        
        if (!overlaps || attempts >= maxAttempts) {
          break;
        }
        
        angle += angleIncrement;
        if (angle > 2 * Math.PI) {
          angle = 0;
          radius += radiusIncrement;
        }
        attempts++;
      } while (attempts < maxAttempts);
      
      positions.push({ ...word, x, y, size });
      
      // Update spiral for next word
      angle += angleIncrement;
      if (angle > 2 * Math.PI) {
        angle = 0;
        radius += radiusIncrement;
      }
    });
    
    return positions;
  };
  
  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    
    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    const wordPositions = generateWordPositions(data);
    
    // Color scale based on negative impact
    const colorScale = d3.scaleLinear<string>()
      .domain([0, d3.max(data, d => d.negative_impact) || 1])
      .range(['#4ECDC4', '#FF4757']);
    
    // Create words
    const words = svg.selectAll('.word')
      .data(wordPositions)
      .enter()
      .append('text')
      .attr('class', 'word')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', d => `${d.size}px`)
      .style('font-weight', '600')
      .style('fill', d => colorScale(d.negative_impact))
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .text(d => d.word)
      .on('mouseover', function(event, d) {
        // Highlight word
        d3.select(this)
          .style('fill', colors.accent)
          .style('font-size', `${d.size + 4}px`);
        
        setHoveredWord(d);
        
        // Position tooltip
        if (tooltipRef.current) {
          const tooltip = tooltipRef.current;
          tooltip.style.opacity = '1';
          tooltip.style.left = `${event.pageX + 10}px`;
          tooltip.style.top = `${event.pageY - 10}px`;
        }
      })
      .on('mouseout', function(event, d) {
        // Return to normal
        d3.select(this)
          .style('fill', colorScale(d.negative_impact))
          .style('font-size', `${d.size}px`);
        
        setHoveredWord(null);
        
        // Hide tooltip
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      })
      .on('click', function(event, d) {
        // Show detailed analysis (placeholder)
        console.log('Clicked word:', d.word);
      });
    
    // Add entrance animation
    words
      .style('opacity', 0)
      .style('transform', 'scale(0)')
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .ease(d3.easeElastic)
      .style('opacity', 1)
      .style('transform', 'scale(1)');
      
  }, [data, sortMode, width, height]);
  
  const getSortModeText = () => {
    return sortMode === 'frequency' ? 'Frequency' : 'Negative Impact';
  };
  
  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Emotional Trigger Words</h4>
      
      {/* Controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.button,
            ...(sortMode === 'frequency' ? styles.buttonActive : {}),
          }}
          onClick={() => setSortMode('frequency')}
        >
          Sort by Frequency
        </button>
        <button
          style={{
            ...styles.button,
            ...(sortMode === 'impact' ? styles.buttonActive : {}),
          }}
          onClick={() => setSortMode('impact')}
        >
          Sort by Impact
        </button>
      </div>
      
      <div style={styles.svgContainer}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ overflow: 'visible' }}
        />
        
        {/* Tooltip */}
        <div ref={tooltipRef} style={styles.tooltip}>
          {hoveredWord && (
            <>
              <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '1rem', color: colors.accent }}>
                &quot;{hoveredWord.word}&quot;
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginBottom: '12px' }}>
                <div>Frequency: {hoveredWord.frequency} times</div>
                <div>Impact: {hoveredWord.negative_impact.toFixed(1)}/5</div>
                <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                  {hoveredWord.negative_impact > 2 ? 'High trigger potential' : 
                   hoveredWord.negative_impact > 1 ? 'Moderate trigger' : 'Low trigger potential'}
                </div>
              </div>
              
              {/* Show message context if available */}
              {hoveredWord.contexts && hoveredWord.contexts.length > 0 && (
                <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
                    Example from your chats:
                  </div>
                  {hoveredWord.contexts.slice(0, 1).map((context, idx) => (
                    <div key={idx} style={{ fontSize: '0.75rem' }}>
                      <div style={{ 
                        padding: '8px', 
                        backgroundColor: 'rgba(0, 255, 230, 0.05)',
                        borderRadius: '4px',
                        marginBottom: '6px'
                      }}>
                        <div style={{ color: colors.textSecondary, marginBottom: '4px' }}>Message containing &quot;{hoveredWord.word}&quot;:</div>
                        <div style={{ fontStyle: 'italic', color: colors.text }}>
                          "{context.trigger_message.substring(0, 100)}..."
                        </div>
                      </div>
                      <div style={{ 
                        padding: '8px', 
                        backgroundColor: 'rgba(255, 71, 87, 0.05)',
                        borderRadius: '4px'
                      }}>
                        <div style={{ color: colors.textSecondary, marginBottom: '4px' }}>Your emotional response:</div>
                        <div style={{ fontStyle: 'italic', color: colors.text }}>
                          "{context.response_message.substring(0, 100)}..."
                        </div>
                        {context.negative_indicators_found.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#FF4757' }}>
                            Emotions detected: {context.negative_indicators_found.join(', ')}
                          </div>
                        )}
                      </div>
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
        <div style={styles.legendItem}>
          <span>Size by {getSortModeText()}</span>
        </div>
        <div style={styles.legendItem}>
          <span>Color by Impact:</span>
          <div style={styles.legendGradient} />
          <span>High</span>
        </div>
      </div>
      
      {data.length === 0 && (
        <div style={{ 
          textAlign: 'center' as const, 
          color: colors.textSecondary, 
          padding: spacing.xl 
        }}>
          No trigger words identified in your communication patterns.
        </div>
      )}
    </div>
  );
};