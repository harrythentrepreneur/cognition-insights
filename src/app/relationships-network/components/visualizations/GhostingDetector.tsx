import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { GhostingEvent, RelationshipCard } from '../../types';
import { GHOSTING_SEVERITY_COLORS } from '../../constants';

interface GhostingDetectorProps {
  cards: RelationshipCard[];
  ghostingEvents: GhostingEvent[];
  className?: string;
}

const GhostingDetector: React.FC<GhostingDetectorProps> = ({
  cards,
  ghostingEvents,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<GhostingEvent | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  // Generate mock timeline data for demonstration
  const generateTimelineData = (card: RelationshipCard) => {
    const data: Array<{date: Date, intensity: number, messageCount: number}> = [];
    const now = new Date();
    
    // Generate 90 days of data
    for (let i = 90; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Simulate communication patterns with some relationships having drops
      let baseIntensity = 0.7;
      
      // Add some variation
      const dayVariation = Math.sin(i / 7) * 0.2; // Weekly pattern
      const randomVariation = (Math.random() - 0.5) * 0.3;
      
      // Simulate ghosting for certain relationships
      if (card.scorecard.trajectory === 'negative' && i < 30) {
        baseIntensity *= 0.3; // Significant drop in recent period
      }
      
      const intensity = Math.max(0, Math.min(1, baseIntensity + dayVariation + randomVariation));
      const messageCount = Math.round(intensity * 10);
      
      data.push({
        date,
        intensity,
        messageCount
      });
    }
    
    return data;
  };

  useEffect(() => {
    if (!svgRef.current || cards.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 150, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const container = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Generate timeline data for all cards
    const allTimelineData = cards.map(card => ({
      card,
      data: generateTimelineData(card)
    }));

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(allTimelineData[0].data, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0.02, 1.2])
      .range([innerHeight, 0]);

    // Add subtle background gradient
    const defs = svg.append('defs');
    const backgroundGradient = defs.append('linearGradient')
      .attr('id', 'background-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    backgroundGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#1A1A2E')
      .attr('stop-opacity', 0.2);

    backgroundGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10172A')
      .attr('stop-opacity', 0.1);

    container.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'url(#background-gradient)')
      .attr('rx', 8);

    // Add grid lines
    const yTicks = [0.2, 0.4, 0.6, 0.8, 1.0];
    yTicks.forEach(tick => {
      container.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', '#303040')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.3);
    });

    // Create line generator
    const line = d3.line<{date: Date, intensity: number, messageCount: number}>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.intensity))
      .curve(d3.curveCardinal.tension(0.2));

    // Create area generator for fading effect
    const area = d3.area<{date: Date, intensity: number, messageCount: number}>()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(d.intensity))
      .curve(d3.curveCardinal.tension(0.2));

    // Draw timeline for each relationship
    allTimelineData.forEach((timeline, index) => {
      const { card, data } = timeline;
      const isHovered = hoveredPersonId === card.id;
      const isGhosting = card.scorecard.trajectory === 'negative';

      // Create gradient for this relationship
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${card.id}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');

      if (isGhosting) {
        // Fading gradient for ghosting relationships
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', card.color)
          .attr('stop-opacity', 0.8);
        
        gradient.append('stop')
          .attr('offset', '70%')
          .attr('stop-color', card.color)
          .attr('stop-opacity', 0.4);
          
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', card.color)
          .attr('stop-opacity', 0.1);
      } else {
        // Normal gradient for healthy relationships
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', card.color)
          .attr('stop-opacity', 0.6);
          
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', card.color)
          .attr('stop-opacity', 0.3);
      }

      // Draw area first
      container.append('path')
        .datum(data)
        .attr('d', area)
        .attr('fill', `url(#gradient-${card.id})`)
        .attr('opacity', isHovered ? 0.8 : 0.4)
        .style('transition', 'opacity 0.3s ease');

      // Draw line
      container.append('path')
        .datum(data)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', card.color)
        .attr('stroke-width', isHovered ? 3 : 2)
        .attr('stroke-opacity', isHovered ? 1 : 0.8)
        .style('filter', isHovered ? `drop-shadow(0 0 8px ${card.color}60)` : 'none')
        .style('transition', 'all 0.3s ease');

      // Add ghosting indicators for relationships with significant drops
      if (isGhosting) {
        const recentData = data.slice(-30); // Last 30 days
        const ghostingPoint = recentData[Math.floor(recentData.length * 0.7)];
        
        if (ghostingPoint) {
          const x = xScale(ghostingPoint.date);
          const y = yScale(ghostingPoint.intensity);

          // Ghosting alert marker
          container.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 6)
            .attr('fill', GHOSTING_SEVERITY_COLORS.moderate)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('filter', `drop-shadow(0 0 8px ${GHOSTING_SEVERITY_COLORS.moderate}80)`)
            .append('title')
            .text(`Communication drop detected for ${card.name}`);

          // Pulsing animation
          container.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 6)
            .attr('fill', 'none')
            .attr('stroke', GHOSTING_SEVERITY_COLORS.moderate)
            .attr('stroke-width', 2)
            .attr('opacity', 0.8)
            .style('animation', 'pulse 2s infinite ease-in-out');
        }
      }
    });

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%m/%d') as any);

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${Math.round((d as number) * 100)}%`);

    container.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#9CA3AF')
      .style('font-size', '11px');

    container.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#9CA3AF')
      .style('font-size', '11px');

    // Remove axis lines
    container.selectAll('.domain').remove();

    // Add Y-axis label
    container.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#9CA3AF')
      .style('font-size', '12px')
      .text('Communication Intensity');

    // Add legend
    const legend = container.append('g')
      .attr('transform', `translate(${innerWidth + 20}, 20)`);

    allTimelineData.forEach((timeline, index) => {
      const { card } = timeline;
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${index * 25})`)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredPersonId(card.id))
        .on('mouseleave', () => setHoveredPersonId(null));

      legendItem.append('circle')
        .attr('cx', 6)
        .attr('cy', 6)
        .attr('r', 4)
        .attr('fill', card.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      legendItem.append('text')
        .attr('x', 16)
        .attr('y', 10)
        .attr('fill', '#F0F0F0')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .text(card.name);

      // Add ghosting indicator
      if (card.scorecard.trajectory === 'negative') {
        legendItem.append('circle')
          .attr('cx', 100)
          .attr('cy', 6)
          .attr('r', 3)
          .attr('fill', GHOSTING_SEVERITY_COLORS.moderate)
          .append('title')
          .text('Communication declining');
      }
    });

    // Add CSS for pulsing animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { r: 6; opacity: 0.8; }
        50% { r: 10; opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);

  }, [cards, hoveredPersonId]);

  const ghostingCount = cards.filter(card => card.scorecard.trajectory === 'negative').length;
  const healthyCount = cards.filter(card => card.scorecard.trajectory === 'positive').length;
  const stableCount = cards.filter(card => card.scorecard.trajectory === 'stable').length;

  return (
    <div className={`w-full py-8 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Ghosting & Fading Detector</h3>
        <p className="text-white/70 text-sm">
          Monitor communication patterns and detect relationships that may be fading away
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="text-lg font-bold text-green-400">{healthyCount}</div>
          <div className="text-xs text-green-300">Growing Strong</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="text-lg font-bold text-blue-400">{stableCount}</div>
          <div className="text-xs text-blue-300">Stable & Steady</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="text-lg font-bold text-orange-400">{ghostingCount}</div>
          <div className="text-xs text-orange-300">Needs Attention</div>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
        
        <div className="relative">
          <svg
            ref={svgRef}
            className="w-full overflow-visible"
            style={{ background: 'transparent' }}
          />
        </div>
      </div>

      {/* Insights */}
      {ghostingCount > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <h4 className="text-orange-400 font-medium mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            Relationship Attention Needed
          </h4>
          <p className="text-orange-200 text-sm">
            {ghostingCount} relationship{ghostingCount > 1 ? 's' : ''} showing declining communication patterns. 
            Consider reaching out to maintain these valuable connections.
          </p>
        </div>
      )}

      {/* Recovery Suggestions */}
      {ghostingCount > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <h4 className="text-blue-400 font-medium mb-2 flex items-center">
            <span className="mr-2">💡</span>
            Relationship Recovery Tips
          </h4>
          <ul className="text-blue-200 text-sm space-y-1">
            <li>• Send a thoughtful message asking how they&apos;re doing</li>
            <li>• Share a memory or something that reminded you of them</li>
            <li>• Suggest a low-pressure activity you could do together</li>
            <li>• Acknowledge the gap and express genuine interest in reconnecting</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default GhostingDetector;