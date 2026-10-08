import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PEOPLE_DATA } from './RelationshipRadarChart';

interface RelationshipStrengthFlowProps {
  activePeople: Record<string, boolean>;
}

export const RelationshipStrengthFlow: React.FC<RelationshipStrengthFlowProps> = ({ 
  activePeople 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear the SVG safely with D3's remove method
    const svgElement = svgRef.current;
    d3.select(svgElement).selectAll('*').interrupt();
    d3.select(svgElement).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);

    // Chart dimensions - clean and proportional
    const containerWidth = svgRef.current.parentElement?.clientWidth || 1000;
    const width = Math.min(containerWidth, 1000);
    const height = 400;
    const marginTop = 30;
    const marginRight = 100;
    const marginBottom = 50;
    const marginLeft = 70;

    // Get active people
    const activePeopleData = PEOPLE_DATA.filter(person => activePeople[person.id]);
    
    if (activePeopleData.length === 0) {
      // Show message when no people are selected
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#F0F0F0')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-size', '16px')
        .text('Select people to see relationship timeline');
      return;
    }

    // Simple timeline data - 24 months of data
    const months: Date[] = [];
    for (let i = 0; i < 24; i++) {
      const date = new Date(2022, i, 1);
      months.push(date);
    }

    // Scales
    const xScale = d3.scaleTime()
      .domain([new Date(2022, 0, 1), new Date(2023, 11, 31)])
      .range([marginLeft, width - marginRight]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height - marginBottom, marginTop]);

    // Add subtle background with gradient
    const defs = svg.append('defs');
    
    const backgroundGradient = defs.append('linearGradient')
      .attr('id', 'background-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    backgroundGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#1A1A2E')
      .attr('stop-opacity', 0.3);

    backgroundGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10172A')
      .attr('stop-opacity', 0.1);

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#background-gradient)')
      .attr('rx', 8);

    // Add grid lines
    const yTicks = [0, 20, 40, 60, 80, 100];
    yTicks.forEach(tick => {
      svg.append('line')
        .attr('x1', marginLeft)
        .attr('x2', width - marginRight)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', '#303040')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.3);
    });

    // Generate data for each person
    const allData = months.map((date, i) => {
      const dataPoint: any = { date };
      activePeopleData.forEach(person => {
        const baseValue = Object.values(person.scores).reduce((a, b) => a + b, 0) / Object.values(person.scores).length;
        const variation = Math.sin(i * 0.3) * 10 + Math.random() * 5;
        // Normalize values to be smaller for proper stacking
        dataPoint[person.id] = Math.max(10, Math.min(30, (baseValue + variation) / 3));
      });
      return dataPoint;
    });

    // Create stack generator
    const stack = d3.stack()
      .keys(activePeopleData.map(p => p.id))
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stackedData = stack(allData);

    // Create area generator
    const area = d3.area<any>()
      .x(d => xScale(d.data.date))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveCardinal.tension(0.2));

    // Draw areas for each person
    activePeopleData.forEach((person, index) => {
      const personStack = stackedData.find(s => s.key === person.id);
      if (!personStack) return;

      // Create gradient
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${person.id}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', person.color)
        .attr('stop-opacity', 0.7);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', person.color)
        .attr('stop-opacity', 0.1);

      // Draw area with enhanced styling
      svg.append('path')
        .datum(personStack)
        .attr('fill', `url(#gradient-${person.id})`)
        .attr('stroke', person.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.8)
        .attr('d', area)
        .style('opacity', 0)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))')
        .transition()
        .delay(index * 200)
        .duration(1200)
        .ease(d3.easeBackOut.overshoot(1.2))
        .style('opacity', 1);
    });

    // Add axes
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => d + '%');

    svg.append('g')
      .attr('transform', `translate(${marginLeft},0)`)
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').remove())
      .call(g => g.selectAll('.tick text')
        .attr('fill', '#F0F0F0')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-size', '12px'));

    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeMonth.every(3) as any)
      .tickFormat(d3.timeFormat('%b %Y') as any);

    svg.append('g')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(xAxis as any)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').remove())
      .call(g => g.selectAll('.tick text')
        .attr('fill', '#F0F0F0')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-size', '12px'));

    // Add Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', marginLeft - 50)
      .attr('x', -(height / 2))
      .attr('text-anchor', 'middle')
      .attr('fill', '#F0F0F0')
      .attr('font-family', "'Inter', sans-serif")
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .text('Relationship Strength');

    // Add legend with better positioning
    const legend = svg.append('g')
      .attr('transform', `translate(${width - marginRight + 15}, ${marginTop + 10})`);

    // Legend background
    const legendBg = legend.append('rect')
      .attr('x', -10)
      .attr('y', -8)
      .attr('width', 90)
      .attr('height', activePeopleData.length * 22 + 16)
      .attr('fill', 'rgba(0, 0, 0, 0.4)')
      .attr('rx', 6)
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1);

    activePeopleData.forEach((person, index) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${index * 22})`);

      legendItem.append('circle')
        .attr('cx', 6)
        .attr('cy', 6)
        .attr('r', 5)
        .attr('fill', person.color)
        .attr('stroke', person.color)
        .attr('stroke-width', 1)
        .style('filter', `drop-shadow(0 0 4px ${person.color}40)`);

      legendItem.append('text')
        .attr('x', 16)
        .attr('y', 10)
        .attr('fill', '#F0F0F0')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .text(person.name);
    });

    // Return cleanup function
    return () => {
      // Remove any transitions and elements
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').interrupt();
      }
    };
  }, [activePeople]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up any D3 selections when component unmounts
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').interrupt();
        d3.select(svgRef.current).selectAll('*').remove();
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Pure visualization container */}
      <div className="w-full relative flex justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 1000 400"
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible w-full h-auto"
          style={{ background: 'transparent', maxWidth: '1000px', height: '400px' }}
        />
      </div>
    </div>
  );
};