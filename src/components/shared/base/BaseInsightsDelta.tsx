import { logger } from '@/lib/utils/logger';
import React, { useState } from 'react';
import { 
  insightsDeltaStyles, 
  getHabitCardStyle, 
  getImpactBarStyle, 
  getIconStyle, 
  getImpactValueStyle 
} from '@/app/emotional-landscapes/styles/insights-delta';
import { HabitImpact } from '../types/insights';
import { HabitDetailModal } from './HabitDetailModal';

export interface BaseInsightsDeltaProps {
  data: HabitImpact[];
  title?: string;
  colorScheme?: string;
  timeRange?: { start: Date; end: Date }; // Optional context for time-specific insights (internal use only)
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Base Insights Delta Component
 * 
 * Displays habit impacts and their effects on emotional wellbeing.
 * Sorted with positive impacts at top, negative impacts at bottom.
 * Enhanced modal feature currently disabled but ready for future activation.
 */
export const BaseInsightsDelta: React.FC<BaseInsightsDeltaProps> = ({ 
  data, 
  title, 
  timeRange,
  isLoading,
  error
}) => {
  const [selectedHabit, setSelectedHabit] = useState<HabitImpact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sort data: positive impacts first (highest to lowest), then negative impacts (least negative to most negative)
  const sortedData = [...data].sort((a, b) => {
    // If both are positive or both are negative, sort by impact value (descending)
    if ((a.impact >= 0 && b.impact >= 0) || (a.impact < 0 && b.impact < 0)) {
      return b.impact - a.impact;
    }
    // If one is positive and one is negative, positive comes first
    return a.impact >= 0 ? -1 : 1;
  });

  // Disabled for now - keep for future use
  // const handleHabitClick = (habit: HabitImpact) => {
  //   setSelectedHabit(habit);
  //   setIsModalOpen(true);
  // };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHabit(null);
  };

  if (isLoading) {
    return (
      <div style={{ ...insightsDeltaStyles.container, textAlign: 'center', padding: '20px' }}>
        Loading behavioral insights...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...insightsDeltaStyles.container, textAlign: 'center', padding: '20px', color: '#ff6b6b' }}>
        {error}
      </div>
    );
  }

  return (
    <>
      <div style={insightsDeltaStyles.container}>
        {title && <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>{title}</h3>}
        <div style={insightsDeltaStyles.scaleContainer}>
          <div style={insightsDeltaStyles.centerLine} />
          <div style={insightsDeltaStyles.habitsList}>
            {sortedData.map((habitImpact) => (
              <div 
                key={habitImpact.id} 
                style={getHabitCardStyle(habitImpact.impact)}
                // onClick={() => handleHabitClick(habitImpact)} // Disabled for now
                // title="Click for detailed analysis" // Disabled for now
              >
                <div style={getIconStyle(habitImpact.impact)}>
                  {habitImpact.impact > 0 ? '↗' : '↘'}
                </div>
                <div style={insightsDeltaStyles.habitText}>
                  <div style={insightsDeltaStyles.habitName}>{habitImpact.habit}</div>
                  <div style={insightsDeltaStyles.habitCategory}>{habitImpact.category}</div>
                </div>
                <div style={getImpactBarStyle(habitImpact.impact)} />
                <div style={getImpactValueStyle(habitImpact.impact)}>
                  {habitImpact.impact > 0 ? '+' : ''}{habitImpact.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Modal kept for future use - currently disabled */}
      <HabitDetailModal 
        habit={selectedHabit}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}; 