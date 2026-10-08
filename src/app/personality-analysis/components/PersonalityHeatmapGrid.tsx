import React from 'react';
import { getHeatmapGridStyle, getHeatmapItemStyle } from '../../emotional-landscapes/styles/heatmap';

interface EmotionHeatmapGridProps {
  items: Array<{
    id: string;
    title: string;
    emotionColor: string;
    content: React.ReactNode;
  }>;
}

/**
 * Grid Component for Emotion-based Heatmap Visualizations
 * 
 * Renders a responsive grid of emotion-themed cards with color-coded
 * borders and shadows based on the associated emotion.
 */
export const EmotionHeatmapGrid: React.FC<EmotionHeatmapGridProps> = ({ items }) => {
  return (
    <div style={getHeatmapGridStyle(items.length)}>
      {items.map((item) => (
        <div 
          key={item.id} 
          style={getHeatmapItemStyle(item.emotionColor)}
        >
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#E0E0E0',
            marginBottom: '12px',
            textAlign: 'center',
            borderBottom: `1px solid ${item.emotionColor}40`,
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