import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { LOVE_EMOTIONS } from '../../constants';

// Enhanced relationship metrics for radar chart (love-focused)
const RELATIONSHIP_METRICS = Object.values(LOVE_EMOTIONS);

// Different people with their colors - luminous, vibrant colors for dark theme
export const PEOPLE_DATA = [
  {
    id: 'person1',
    name: 'Alex',
    color: '#FF6B9D', // Luminous pink
    scores: { love: 90, trust: 95, comfort: 85, joy: 70, support: 80, growth: 75, adventure: 60 }
  },
  {
    id: 'person2', 
    name: 'Jordan',
    color: '#00F5D4', // Electric teal
    scores: { love: 65, trust: 70, comfort: 75, joy: 95, support: 85, growth: 80, adventure: 90 }
  },
  {
    id: 'person3',
    name: 'Sam',
    color: '#FFD60A', // Vibrant gold
    scores: { love: 75, trust: 85, comfort: 60, joy: 80, support: 90, growth: 95, adventure: 70 }
  },
  {
    id: 'person4',
    name: 'Casey',
    color: '#9D4EDD', // Electric amethyst
    scores: { love: 80, trust: 75, comfort: 90, joy: 65, support: 70, growth: 60, adventure: 85 }
  }
];

interface RelationshipRadarChartProps {
  width?: number;
  height?: number;
  activePeople: Record<string, boolean>;
  peopleData?: typeof PEOPLE_DATA;
}

const RelationshipRadarChartComponent = ({ 
  width = 960, 
  height = 960, 
  activePeople,
  peopleData = PEOPLE_DATA 
}: RelationshipRadarChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear the SVG safely with D3's remove method
    const svgElement = svgRef.current;
    d3.select(svgElement).selectAll('*').interrupt();
    d3.select(svgElement).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);

    const margin = 120;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;

    // Filter active people - use provided peopleData or fallback to PEOPLE_DATA
    const activePeopleData = peopleData.filter(person => activePeople[person.id]);
    
    console.log('[RELATIONSHIP-FLOW-10] Rendering radar chart with', activePeopleData.length, 'active people:', 
      activePeopleData.map(p => ({ name: p.name, scores: p.scores })));

    // Create defs for sophisticated filters and effects
    const defs = svg.append('defs');

    // Main glow filter for data elements
    const glowFilter = defs.append('filter')
      .attr('id', 'emotion-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '15')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Inner glow filter for labels
    const innerGlowFilter = defs.append('filter')
      .attr('id', 'inner-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    innerGlowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'innerBlur');

    // Create organic blob texture for each person using canvas
    const createOrganicBlob = (person: typeof PEOPLE_DATA[0], angle: number, distance: number) => {
      const canvas = document.createElement('canvas');
      const resolution = 200;
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(resolution, resolution);
      const canvasData = imageData.data;

      // Calculate average intensity for this person
      const avgIntensity = Object.values(person.scores).reduce((a, b) => a + b, 0) / Object.values(person.scores).length / 100;
      const intensityBoost = Math.pow(avgIntensity, 0.7);
      const expansionFactor = 0.4 + (intensityBoost * 0.6);
      
      const blobCenter = {
        x: Math.cos(angle) * distance * 0.6,
        y: Math.sin(angle) * distance * 0.6,
        effectiveRadius: 40 * intensityBoost * expansionFactor,
        maxIntensity: avgIntensity
      };

      // Organic radius function with noise
      const getOrganicRadius = (angle: number, baseRadius: number) => {
        const personSeed = person.id.charCodeAt(person.id.length - 1) * 0.1;
        const noise1 = Math.sin(angle * 3 + personSeed) * 0.25;
        const noise2 = Math.sin(angle * 7 + personSeed + 1) * 0.15;
        const noise3 = Math.sin(angle * 12 + personSeed + 2) * 0.08;
        
        const intensityFactor = 1 + (avgIntensity * 0.5);
        return baseRadius * intensityFactor * (1 + noise1 + noise2 + noise3);
      };

      const maxDistance = resolution * 0.45;

      for (let x = 0; x < resolution; x++) {
        for (let y = 0; y < resolution; y++) {
          const px = x - resolution / 2;
          const py = y - resolution / 2;
          const distanceFromCenter = Math.sqrt(px * px + py * py);
          
          if (distanceFromCenter > maxDistance) continue;

          const dx = px - blobCenter.x;
          const dy = py - blobCenter.y;
          const blobDistance = Math.sqrt(dx * dx + dy * dy);

          const angleToCenter = Math.atan2(dy, dx);
          const organicRadius = getOrganicRadius(angleToCenter, blobCenter.effectiveRadius);

          let pixelIntensity = 0;
          if (blobDistance < organicRadius) {
            const normalizedDistance = blobDistance / organicRadius;
            pixelIntensity = Math.pow(1 - normalizedDistance, 1.8) * blobCenter.maxIntensity;
            
            // Add texture
            const textureAngle = Math.atan2(py, px);
            const texture = (Math.sin(textureAngle * 8) + Math.sin(textureAngle * 15)) * 0.12 + 1;
            pixelIntensity *= Math.max(0.4, texture);
          }

          const globalFalloff = 1 - Math.pow(distanceFromCenter / maxDistance, 2.0);
          pixelIntensity *= Math.max(0, globalFalloff);

          if (pixelIntensity > 0.08) {
            const personColor = d3.color(person.color)!.rgb();
            const alpha = Math.min(255, pixelIntensity * 255 * 0.9);

            const pixelIndex = (y * resolution + x) * 4;
            canvasData[pixelIndex] = personColor.r;
            canvasData[pixelIndex + 1] = personColor.g;
            canvasData[pixelIndex + 2] = personColor.b;
            canvasData[pixelIndex + 3] = alpha;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL();
    };

    const container = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Create scales
    const angleScale = d3.scaleLinear()
      .domain([0, 360])
      .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius]);

    // Draw concentric circles (grid) with sophisticated styling
    const gridLevels = [20, 40, 60, 80, 100];
    gridLevels.forEach((level, index) => {
      container.append('circle')
        .attr('r', 0)
        .attr('fill', 'none')
        .attr('stroke', level === 100 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)')
        .attr('stroke-width', level === 100 ? 2 : 1)
        .attr('opacity', 0)
        .transition()
        .delay(200 + index * 100)
        .duration(1000)
        .ease(d3.easeCircleOut)
        .attr('r', radiusScale(level))
        .attr('opacity', 1);
    });

    // Draw axis lines and labels with animations
    RELATIONSHIP_METRICS.forEach((metric, index) => {
      const angle = angleScale(metric.angle - 90); // -90 to start from top
      const x1 = 0;
      const y1 = 0;
      const x2 = Math.cos(angle) * radius;
      const y2 = Math.sin(angle) * radius;

      // Draw axis line with animation
      const axisLine = container.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x1)
        .attr('y2', y1)
        .attr('stroke', 'rgba(255, 255, 255, 0.12)')
        .attr('stroke-width', 1)
        .attr('opacity', 0);

      axisLine
        .transition()
        .delay(500 + index * 150)
        .duration(800)
        .ease(d3.easeQuadOut)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('opacity', 1);

      // Add label with sophisticated typography and positioning
      const labelDistance = radius + 50;
      const labelX = Math.cos(angle) * labelDistance;
      const labelY = Math.sin(angle) * labelDistance;

      const label = container.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#F0F0F0')
        .attr('font-size', '16px')
        .attr('font-weight', '500')
        .attr('font-family', "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif")
        .style('letter-spacing', '0.5px')
        .style('opacity', 0)
        .text(metric.name);

      label
        .transition()
        .delay(800 + index * 100)
        .duration(1000)
        .ease(d3.easeBackOut)
        .style('opacity', 0.9);
    });

    // Draw organic blob layers for each active person
    activePeopleData.forEach((person, personIndex) => {
      // Calculate person's position based on their strongest relationship metric
      const maxScore = Math.max(...Object.values(person.scores));
      const strongestMetric = Object.entries(person.scores).find(([_, score]) => score === maxScore)?.[0];
      const metricData = RELATIONSHIP_METRICS.find(m => m.name.toLowerCase() === strongestMetric);
      
      if (metricData) {
        const personAngle = angleScale(metricData.angle - 90);
        const avgIntensity = Object.values(person.scores).reduce((a, b) => a + b, 0) / Object.values(person.scores).length;
        const personDistance = radiusScale(avgIntensity * 0.7);
        
        // Create organic blob texture
        const blobDataURL = createOrganicBlob(person, personAngle, personDistance);
        
        const pattern = defs.append('pattern')
          .attr('id', `person-blob-${person.id}`)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('width', radius * 1.5)
          .attr('height', radius * 1.5)
          .attr('x', -radius * 0.75)
          .attr('y', -radius * 0.75);

        pattern.append('image')
          .attr('href', blobDataURL)
          .attr('width', radius * 1.5)
          .attr('height', radius * 1.5);

        // Create the organic blob layer
        const blobLayer = container.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 0)
          .style('fill', `url(#person-blob-${person.id})`)
          .style('opacity', 0)
          .style('mix-blend-mode', personIndex === 0 ? 'normal' : 'screen')
          .style('filter', 'url(#emotion-glow)');

        blobLayer
          .transition()
          .delay(1000 + personIndex * 400)
          .duration(2000 + personIndex * 300)
          .ease(d3.easeBackOut.overshoot(1.1))
          .attr('r', radius * 0.8)
          .style('opacity', 0.6 + (avgIntensity / 100 * 0.3));
      }
    });

    // Draw traditional radar chart with organic styling for active people
    activePeopleData.forEach((person, personIndex) => {
      const lineGenerator = d3.line<{ angle: number; value: number }>()
        .x(d => {
          const angle = angleScale(d.angle - 90);
          return Math.cos(angle) * radiusScale(d.value);
        })
        .y(d => {
          const angle = angleScale(d.angle - 90);
          return Math.sin(angle) * radiusScale(d.value);
        })
        .curve(d3.curveCardinalClosed.tension(0.3)); // Organic curve

      const dataPoints = RELATIONSHIP_METRICS.map(metric => ({
        angle: metric.angle,
        value: person.scores[metric.name.toLowerCase() as keyof typeof person.scores] || 0
      }));

      // Draw filled area with sophisticated glow and animation
      const path = container.append('path')
        .datum(dataPoints)
        .attr('d', lineGenerator)
        .attr('fill', person.color)
        .attr('fill-opacity', 0)
        .attr('stroke', person.color)
        .attr('stroke-width', 0)
        .attr('stroke-opacity', 0)
        .style('filter', 'url(#emotion-glow)')
        .style('mix-blend-mode', 'screen');

      // Animate the path appearance
      path
        .transition()
        .delay(1800 + personIndex * 400)
        .duration(1500)
        .ease(d3.easeBackOut.overshoot(1.1))
        .attr('fill-opacity', 0.08)
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.7);
    });

  }, [width, height, activePeople, peopleData]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      className="overflow-visible"
      style={{ background: 'transparent' }}
    />
  );
};

RelationshipRadarChartComponent.displayName = 'RelationshipRadarChart';

export const RelationshipRadarChart = React.memo(RelationshipRadarChartComponent);