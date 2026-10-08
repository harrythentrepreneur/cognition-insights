import { logger } from '@/lib/utils/logger';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { CircumplexDataItem } from '../types/circumplex';

interface BaseCircumplexProps {
  data: CircumplexDataItem[];
  size?: number;
  timeRange?: { start: Date; end: Date };
  timelineData?: Array<{
    id: string;
    name: string;
    color: string;
    data: Array<{ timestamp: Date; intensity: number }>;
  }>;
}

const BaseCircumplex: React.FC<BaseCircumplexProps> = ({ 
  data,
  size = 900,
  timeRange,
  timelineData,
}) => {
  const d3Container = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const [dimensions, setDimensions] = useState({ width: size, height: size });

  // Calculate time-range-aware data by aggregating intensity within timeRange
  const processedData = useMemo(() => {
    if (!timeRange || !timelineData) {
      return data; // Use static data if no timeline data provided
    }

    // For each item in data, find corresponding timeline data and calculate average intensity in timeRange
    return data.map(item => {
      const correspondingTimelineItem = timelineData.find(tl => tl.id === item.id);
      
      if (correspondingTimelineItem) {
        // Filter timeline data to only include points within timeRange
        const dataInRange = correspondingTimelineItem.data.filter(d => 
          d.timestamp >= timeRange.start && d.timestamp <= timeRange.end
        );
        
        // Calculate average intensity within the time range
        let averageIntensity = item.intensity; // Default fallback
        if (dataInRange.length > 0) {
          averageIntensity = dataInRange.reduce((sum, d) => sum + d.intensity, 0) / dataInRange.length;
        }
        
        return {
          ...item,
          intensity: averageIntensity, // Override with time-range average
          influence: item.influence || (80 + (averageIntensity * 120)) // Update influence based on new intensity
        };
      }
      
      return item; // Return original if no corresponding timeline data
    });
  }, [data, timeRange, timelineData]);

  const drawLayeredEmotions = useCallback(() => {
    if (!d3Container.current) return;

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Add sufficient margin for labels - estimate max text width + intensity extension
    const labelMargin = 120; // Increased margin to prevent any clipping
    const availableRadius = Math.min(width, height) / 2 - labelMargin;
    const baseRadius = Math.max(200, availableRadius); // Ensure minimum usable radius

    // Safer cleanup - only remove D3-created elements
    const container = d3.select(d3Container.current);
    container.select('svg').remove();

    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('overflow', 'visible')
      .style('background', 'transparent')
      .style('overflow', 'visible');

    const defs = svg.append('defs');

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

    const innerGlowFilter = defs.append('filter')
      .attr('id', 'inner-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    innerGlowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'innerBlur');

    const g = svg.append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    const createEmotionLayer = (item: CircumplexDataItem) => {
      const canvas = document.createElement('canvas');
      const resolution = 400;
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(resolution, resolution);
      const canvasData = imageData.data;

      const intensityBoost = Math.pow(item.intensity, 0.7);
      const expansionFactor = 0.6 + (intensityBoost * 0.8);
      const centerPull = (1 - intensityBoost) * 0.3;
      const baseDistance = resolution * 0.3 * expansionFactor;
      
      const itemCenter = {
        x: item.basePosition.x * baseDistance * (1 - centerPull),
        y: item.basePosition.y * baseDistance * (1 - centerPull),
        effectiveRadius: item.influence * intensityBoost * 1.2,
        maxIntensity: item.intensity
      };

      const getOrganicRadius = (angle: number, baseRadius: number, item: CircumplexDataItem) => {
        const itemSeed = item.id.charCodeAt(0) * 0.1;
        const noise1 = Math.sin(angle * 4 + itemSeed) * 0.2;
        const noise2 = Math.sin(angle * 8 + itemSeed + 1) * 0.1;
        const noise3 = Math.sin(angle * 16 + itemSeed + 2) * 0.05;
        
        const intensityFactor = 1 + (item.intensity * 0.4);
        return baseRadius * intensityFactor * (1 + noise1 + noise2 + noise3);
      };

      const maxDistance = resolution * 0.4;

      for (let x = 0; x < resolution; x++) {
        for (let y = 0; y < resolution; y++) {
          const px = x - resolution / 2;
          const py = y - resolution / 2;
          const distanceFromCenter = Math.sqrt(px * px + py * py);
          
          if (distanceFromCenter > maxDistance) {
            const pixelIndex = (y * resolution + x) * 4;
            canvasData[pixelIndex] = 0;
            canvasData[pixelIndex + 1] = 0;
            canvasData[pixelIndex + 2] = 0;
            canvasData[pixelIndex + 3] = 0;
            continue;
          }

          const dx = px - itemCenter.x;
          const dy = py - itemCenter.y;
          const itemDistance = Math.sqrt(dx * dx + dy * dy);

          const angleToCenter = Math.atan2(dy, dx);
          const organicRadius = getOrganicRadius(angleToCenter, itemCenter.effectiveRadius, item);

          let pixelIntensity = 0;
          if (itemDistance < organicRadius) {
            const normalizedDistance = itemDistance / organicRadius;
            pixelIntensity = Math.pow(1 - normalizedDistance, 1.5) * itemCenter.maxIntensity;
            
            const textureAngle = Math.atan2(py, px);
            const texture = (Math.sin(textureAngle * 6) + Math.sin(textureAngle * 13)) * 0.1 + 1;
            pixelIntensity *= Math.max(0.3, texture);
          }

          const globalFalloff = 1 - Math.pow(distanceFromCenter / maxDistance, 1.8);
          pixelIntensity *= Math.max(0, globalFalloff);

          if (pixelIntensity > 0.05) {
            const itemColor = d3.color(item.color)!.rgb();
            const alpha = Math.min(255, pixelIntensity * 255 * 0.8);

            const pixelIndex = (y * resolution + x) * 4;
            canvasData[pixelIndex] = itemColor.r;
            canvasData[pixelIndex + 1] = itemColor.g;
            canvasData[pixelIndex + 2] = itemColor.b;
            canvasData[pixelIndex + 3] = alpha;
          } else {
            const pixelIndex = (y * resolution + x) * 4;
            canvasData[pixelIndex] = 0;
            canvasData[pixelIndex + 1] = 0;
            canvasData[pixelIndex + 2] = 0;
            canvasData[pixelIndex + 3] = 0;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL();
    };

    processedData.forEach((item, index) => {
      const layerDataURL = createEmotionLayer(item);
      
      const pattern = defs.append('pattern')
        .attr('id', `emotion-layer-${item.id}`)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', baseRadius * 2.5)
        .attr('height', baseRadius * 2.5)
        .attr('x', -baseRadius * 1.25)
        .attr('y', -baseRadius * 1.25);

      pattern.append('image')
        .attr('href', layerDataURL)
        .attr('width', baseRadius * 2.5)
        .attr('height', baseRadius * 2.5);

      const skipAnim = hasAnimated.current;

      const emotionLayer = g.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', skipAnim ? baseRadius * 1.2 : 0)
        .style('fill', `url(#emotion-layer-${item.id})`)
        .style('opacity', skipAnim ? 0.7 + (item.intensity * 0.3) : 0)
        .style('mix-blend-mode', index === 0 ? 'normal' : 'screen')
        .style('filter', 'url(#emotion-glow)');

      if (!skipAnim) {
        emotionLayer
          .transition()
          .delay(500 + index * 300)
          .duration(1500 + index * 200)
          .ease(d3.easeBackOut.overshoot(1.1))
          .attr('r', baseRadius * 1.2)
          .style('opacity', 0.7 + (item.intensity * 0.3));
      }
    });

    // Calculate safe label positioning to prevent clipping
    const maxIntensityExtension = Math.max(...processedData.map(d => d.intensity * 30));
    const labelRadius = baseRadius + 60; // Reduced base extension
    const maxLabelDistance = labelRadius + maxIntensityExtension;
    
    // Ensure we don't exceed the available space
    const safeMaxDistance = Math.min(maxLabelDistance, (Math.min(width, height) / 2) - 60);
    const safetyRatio = maxLabelDistance > safeMaxDistance ? safeMaxDistance / maxLabelDistance : 1;

    const labels = g.selectAll('.emotion-label')
      .data(processedData)
      .enter()
      .append('g')
      .attr('class', 'emotion-label')
      .attr('transform', (d: CircumplexDataItem) => {
        // Use the same positioning logic as the emotion blobs for consistency
        const intensityBoost = Math.pow(d.intensity, 0.7);
        const expansionFactor = 0.6 + (intensityBoost * 0.8);
        const centerPull = (1 - intensityBoost) * 0.3;
        const baseDistance = baseRadius * 0.3 * expansionFactor;
        
        // Calculate the emotion center position (same as in createEmotionLayer)
        const emotionCenterX = d.basePosition.x * baseDistance * (1 - centerPull);
        const emotionCenterY = d.basePosition.y * baseDistance * (1 - centerPull);
        
        // Calculate the distance from center to emotion blob
        const distanceFromCenter = Math.sqrt(emotionCenterX * emotionCenterX + emotionCenterY * emotionCenterY);
        
        // Position label outside the emotion blob, extending along the same direction
        const labelDistance = distanceFromCenter + (labelRadius * 0.8) + (d.intensity * 30);
        const safeLabelDistance = labelDistance * safetyRatio;
        
        // Normalize the direction vector and apply the label distance
        if (distanceFromCenter > 0) {
          const directionX = emotionCenterX / distanceFromCenter;
          const directionY = emotionCenterY / distanceFromCenter;
          
          const x = directionX * safeLabelDistance;
          const y = directionY * safeLabelDistance;
          
          return `translate(${x},${y})`;
        } else {
          // Fallback for center-positioned emotions (though unlikely)
          const angle = d.angle * (Math.PI / 180);
          const x = Math.cos(angle - Math.PI/2) * safeLabelDistance;
          const y = Math.sin(angle - Math.PI/2) * safeLabelDistance;
          return `translate(${x},${y})`;
        }
      });

    const skipAnim = hasAnimated.current;
    const circleRadius = (d: CircumplexDataItem) => 12 + d.intensity * 18;
    labels.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', skipAnim ? (circleRadius as any) : 0)
      .style('fill', (d: CircumplexDataItem) => d.color)
      .style('opacity', (d: CircumplexDataItem) => skipAnim ? String(0.85 + d.intensity * 0.15) : '0')
      .style('stroke', 'rgba(255, 255, 255, 0.3)')
      .style('stroke-width', 1)
      .style('filter', 'url(#inner-glow)');

    if (!skipAnim) {
      labels.selectAll('circle')
        .transition()
        .delay((d: any, i: number) => 2000 + i * 200)
        .duration(1000)
        .ease(d3.easeBounceOut)
        .attr('r', (d: any) => 12 + d.intensity * 18)
        .style('opacity', (d: any) => 0.85 + d.intensity * 0.15);
    }

    labels.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 0)
      .style('fill', '#1A1A2E')
      .style('font-family', "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif")
      .style('font-size', (d: CircumplexDataItem) => `${10 + d.intensity * 3}px`)
      .style('font-weight', '700')
      .style('opacity', skipAnim ? 1 : 0)
      .style('letter-spacing', '0.5px')
      .html((d: CircumplexDataItem) => {
        return d.percentLabel || `${Math.round(d.intensity * 100)}%`;
      });

    if (!skipAnim) {
      labels.selectAll('text').filter(function(this: any) { return d3.select(this).attr('y') === '0'; })
        .transition()
        .delay((d: any, i: number) => 2300 + i * 150)
        .duration(800)
        .style('opacity', 1);
    }

    labels.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', (d: CircumplexDataItem) => -(circleRadius(d) + 16))
      .style('fill', '#F0F0F0')
      .style('font-family', "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif")
      .style('font-size', (d: CircumplexDataItem) => `${14 + d.intensity * 2}px`)
      .style('font-weight', (d: CircumplexDataItem) => d.intensity > 0.6 ? '500' : '400')
      .style('opacity', (d: CircumplexDataItem) => skipAnim ? String(0.9 + d.intensity * 0.1) : '0')
      .style('letter-spacing', '0.5px')
      .text((d: CircumplexDataItem) => d.name);

    if (!skipAnim) {
      labels.selectAll('text').filter(function(this: any) { return d3.select(this).attr('y') !== '0'; })
        .transition()
        .delay((d: any, i: number) => 2500 + i * 150)
        .duration(1000)
        .style('opacity', (d: any) => 0.9 + d.intensity * 0.1);
    }

    // Mark animation as complete after first render
    hasAnimated.current = true;

  }, [processedData, dimensions]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (d3Container.current) {
        const containerWidth = d3Container.current.clientWidth;
        const newSize = Math.max(850, Math.min(1300, containerWidth));
        setDimensions({
          width: newSize,
          height: newSize
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (d3Container.current) {
      resizeObserver.observe(d3Container.current);
      handleResize();
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (processedData.length > 0) {
      drawLayeredEmotions();
    }
  }, [processedData, dimensions, drawLayeredEmotions]);

  // Cleanup on unmount to prevent DOM conflicts
  useEffect(() => {
    return () => {
      if (d3Container.current) {
        const container = d3.select(d3Container.current);
        container.select('svg').remove();
      }
    };
  }, []);

  return (
    <div className="w-full flex justify-start" style={{ overflow: 'visible' }}>
      <div className="relative bg-black/50 backdrop-blur-xl rounded-3xl p-16" style={{ overflow: 'visible' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/40 rounded-3xl pointer-events-none"></div>
        
        <div 
          ref={d3Container} 
          className="relative"
          style={{ 
            width: dimensions.width, 
            height: dimensions.height,
            minWidth: dimensions.width,
            minHeight: dimensions.height,
            overflow: 'visible'
          }}
        />
      </div>
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders when props haven't changed
const MemoizedBaseCircumplex = React.memo(BaseCircumplex);

export { MemoizedBaseCircumplex as BaseCircumplex }; 