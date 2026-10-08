import { logger } from '@/lib/utils/logger';
import React from 'react';
import { getHeatmapGridStyle, getHeatmapItemStyle } from '@/app/emotional-landscapes/styles/heatmap';
import { GridItem } from '../types/grid';

interface BaseHeatmapGridProps {
  items: GridItem[];
}

/**
 * Base Grid Component for Heatmap-style Visualizations
 * 
 * Renders a responsive grid of cards with color-coded
 * borders and shadows.
 */
export const BaseHeatmapGrid: React.FC<BaseHeatmapGridProps> = ({ items }) => {
  return (
    <div style={getHeatmapGridStyle(0)}> {/* itemCount no longer affects grid layout - always uses consistent columns */}
      {items.map((item) => (
        <div 
          key={item.id} 
          style={getHeatmapItemStyle(item.color)}
        >
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#E0E0E0',
            marginBottom: '12px',
            textAlign: 'center',
            borderBottom: `1px solid ${item.color}40`,
            paddingBottom: '8px'
          }}>
            {item.title}
          </h4>
          {item.content}
        </div>
      ))}
    </div>
  );
}; 