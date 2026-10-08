import React, { useEffect, useRef, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import * as d3 from 'd3';

const { colors, spacing } = DESIGN_TOKENS;

interface LinguisticHeatmapProps {
  data?: {
    categories: string[];
    timeSlots: string[];
    values: number[][]; // [category][timeSlot] = intensity
    wordFrequencies?: {
      positive: { word: string; frequency: number }[];
      negative: { word: string; frequency: number }[];
      questions: { word: string; frequency: number }[];
      assertive: { word: string; frequency: number }[];
    };
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
  
  heatmapWrapper: {
    position: 'relative' as const,
    width: '100%',
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  svgContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  wordFrequencyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    marginTop: spacing.xl,
  } as CSSProperties,
  
  wordCategory: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  categoryTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.sm,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  } as CSSProperties,
  
  wordList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as CSSProperties,
  
  wordItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.xs} 0`,
    fontSize: '0.875rem',
    color: colors.textSecondary,
    borderBottom: `1px solid ${colors.border}20`,
  } as CSSProperties,
  
  wordText: {
    fontWeight: 500,
  } as CSSProperties,
  
  wordFreq: {
    fontSize: '0.75rem',
    color: colors.accentDark,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    padding: `2px 8px`,
    borderRadius: '12px',
  } as CSSProperties,
  
  legend: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    fontSize: '0.875rem',
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
  } as CSSProperties,
};

export const LinguisticHeatmap: React.FC<LinguisticHeatmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Default data if not provided
  const defaultData = {
    categories: ['Emotional', 'Assertive', 'Questions', 'Social', 'Analytical', 'Creative'],
    timeSlots: ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'],
    values: [
      [30, 45, 60, 75, 40], // Emotional
      [70, 85, 75, 50, 30], // Assertive
      [40, 55, 65, 60, 35], // Questions
      [50, 70, 80, 85, 60], // Social
      [80, 90, 70, 45, 25], // Analytical
      [35, 50, 65, 70, 55], // Creative
    ],
    wordFrequencies: {
      positive: [
        { word: 'love', frequency: 145 },
        { word: 'great', frequency: 132 },
        { word: 'happy', frequency: 98 },
        { word: 'amazing', frequency: 87 },
        { word: 'wonderful', frequency: 76 },
      ],
      negative: [
        { word: 'worried', frequency: 45 },
        { word: 'stressed', frequency: 38 },
        { word: 'tired', frequency: 32 },
        { word: 'frustrated', frequency: 28 },
        { word: 'anxious', frequency: 24 },
      ],
      questions: [
        { word: 'how', frequency: 234 },
        { word: 'what', frequency: 189 },
        { word: 'why', frequency: 156 },
        { word: 'when', frequency: 123 },
        { word: 'where', frequency: 98 },
      ],
      assertive: [
        { word: 'will', frequency: 178 },
        { word: 'must', frequency: 145 },
        { word: 'definitely', frequency: 112 },
        { word: 'certainly', frequency: 89 },
        { word: 'absolutely', frequency: 76 },
      ],
    },
  };

  const heatmapData = data || defaultData;

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 60, right: 60, bottom: 60, left: 120 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(heatmapData.timeSlots)
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(heatmapData.categories)
      .range([0, height])
      .padding(0.1);

    // Color scale
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateViridis);

    // Add cells
    const cells = g.selectAll('.cell')
      .data(heatmapData.categories.flatMap((cat, i) => 
        heatmapData.timeSlots.map((time, j) => ({
          category: cat,
          timeSlot: time,
          value: heatmapData.values[i][j],
          i,
          j,
        }))
      ))
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.timeSlot)!)
      .attr('y', d => yScale(d.category)!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease');

    // Add interactivity
    cells
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('filter', 'brightness(1.2)')
          .style('transform', 'scale(1.05)');

        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '1';
          tooltipRef.current.innerHTML = `
            <strong>${d.category}</strong><br/>
            ${d.timeSlot}: ${d.value}% intensity
          `;
          
          const rect = svgRef.current!.getBoundingClientRect();
          tooltipRef.current.style.left = `${event.clientX - rect.left + 10}px`;
          tooltipRef.current.style.top = `${event.clientY - rect.top - 40}px`;
        }
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('filter', 'brightness(1)')
          .style('transform', 'scale(1)');

        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      });

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .style('color', colors.textSecondary)
      .selectAll('text')
      .style('font-size', '12px');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .style('color', colors.textSecondary)
      .selectAll('text')
      .style('font-size', '12px');

    // Add title
    svg.append('text')
      .attr('x', width / 2 + margin.left)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', colors.accent)
      .text('Linguistic Pattern Intensity by Time of Day');

    // Add axis labels
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', margin.left / 2)
      .attr('x', -(height / 2 + margin.top))
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', colors.textSecondary)
      .text('Communication Pattern');

    svg.append('text')
      .attr('x', width / 2 + margin.left)
      .attr('y', height + margin.top + margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', colors.textSecondary)
      .text('Time of Day');

  }, [heatmapData]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'positive': return '✨';
      case 'negative': return '⚡';
      case 'questions': return '❓';
      case 'assertive': return '💪';
      default: return '📝';
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Linguistic Fingerprint Analysis</h3>
      
      <div style={styles.heatmapWrapper}>
        <div style={styles.svgContainer}>
          <svg ref={svgRef}></svg>
        </div>
        <div ref={tooltipRef} style={styles.tooltip}></div>
      </div>

      <div style={styles.legend}>
        <span>Low Intensity</span>
        <div style={{ 
          width: '100px', 
          height: '16px', 
          background: 'linear-gradient(to right, #440154, #3b528b, #21908c, #5dc863, #fde725)',
          borderRadius: '4px',
          margin: '0 8px'
        }} />
        <span>High Intensity</span>
      </div>

      {heatmapData.wordFrequencies && (
        <div style={styles.wordFrequencyGrid}>
          {Object.entries(heatmapData.wordFrequencies).map(([category, words]) => (
            <div key={category} style={styles.wordCategory}>
              <div style={styles.categoryTitle}>
                <span>{getCategoryIcon(category)}</span>
                <span>{category.charAt(0).toUpperCase() + category.slice(1)} Words</span>
              </div>
              <ul style={styles.wordList}>
                {words.slice(0, 5).map((item, index) => (
                  <li key={index} style={styles.wordItem}>
                    <span style={styles.wordText}>{item.word}</span>
                    <span style={styles.wordFreq}>{item.frequency}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};