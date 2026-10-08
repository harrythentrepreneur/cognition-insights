import { logger } from '@/lib/utils/logger';
import React from 'react';
import { HabitImpact } from '../types/insights';

export interface HabitDetailModalProps {
  habit: HabitImpact | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Ultra-Clean Habit Detail Modal
 * 
 * Minimal, beautiful modal with refined design
 */
export const HabitDetailModal: React.FC<HabitDetailModalProps> = ({ 
  habit, 
  isOpen, 
  onClose 
}) => {
  if (!isOpen || !habit) return null;

  // Refined design tokens
  const COLORS = {
    background: '#1A1A2E',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    border: 'rgba(255, 255, 255, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    overlay: 'rgba(0, 0, 0, 0.8)'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    backdropFilter: 'blur(24px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px'
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: COLORS.background,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '20px',
    padding: '20px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '65vh',
    overflowY: 'auto',
    color: COLORS.text,
    position: 'relative',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)'
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '16px',
    background: 'none',
    border: 'none',
    color: COLORS.textMuted,
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '16px',
    paddingRight: '32px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '4px',
    color: habit.impact > 0 ? '#10B981' : '#EF4444',
    lineHeight: '1.2',
    letterSpacing: '-0.02em'
  };

  const impactStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '500',
    color: habit.impact > 0 ? '#10B981' : '#EF4444',
    marginBottom: '2px',
    opacity: 0.8
  };

  const categoryStyle: React.CSSProperties = {
    fontSize: '10px',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontWeight: '500'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: COLORS.cardBg,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '600',
    marginBottom: '8px',
    color: COLORS.text,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const contentStyle: React.CSSProperties = {
    fontSize: '11px',
    lineHeight: '1.4',
    color: COLORS.textSecondary
  };

  const confidenceBarStyle: React.CSSProperties = {
    width: '100%',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '6px'
  };

  const confidenceFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: (habit.confidence || 0) >= 7 ? '#10B981' : (habit.confidence || 0) >= 5 ? '#F59E0B' : '#EF4444',
    width: `${((habit.confidence || 0) / 10) * 100}%`,
    borderRadius: '2px',
    transition: 'width 0.4s ease'
  };

  const tagStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '6px',
    fontSize: '9px',
    marginRight: '4px',
    marginBottom: '4px',
    color: COLORS.textSecondary,
    fontWeight: '500',
    border: `1px solid rgba(255, 255, 255, 0.05)`
  };

  const statsRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    color: COLORS.textMuted,
    fontWeight: '500'
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '10px',
    color: COLORS.textSecondary,
    fontWeight: '600'
  };

  // Extract enhanced data
  const temporalPatterns = habit.temporal_patterns || {};
  const emotionalTriggers = habit.emotional_triggers || {};
  const confidenceExplanation = habit.confidence_explanation || '';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button 
          style={closeButtonStyle} 
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = COLORS.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = COLORS.textMuted;
          }}
        >
          ×
        </button>

        <div style={headerStyle}>
          <h2 style={titleStyle}>{habit.habit}</h2>
          <div style={impactStyle}>
            {habit.impact > 0 ? '+' : ''}{habit.impact} Impact
          </div>
          <div style={categoryStyle}>{habit.category}</div>
        </div>

        {/* Smart Description */}
        {habit.description && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              <span style={{ fontSize: '10px' }}>💡</span>
              Insight
            </h3>
            <div style={contentStyle}>
              {habit.description}
            </div>
          </div>
        )}

        {/* Confidence Score */}
        {habit.confidence && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              <span style={{ fontSize: '10px' }}>🎯</span>
              Confidence {habit.confidence}/10
            </h3>
            <div style={confidenceBarStyle}>
              <div style={confidenceFillStyle} />
            </div>
            {confidenceExplanation && (
              <div style={contentStyle}>{confidenceExplanation}</div>
            )}
          </div>
        )}

        {/* Combined Patterns & Context */}
        {((temporalPatterns.dominant_days && temporalPatterns.dominant_days.length > 0) || 
          (emotionalTriggers.primary_triggers && emotionalTriggers.primary_triggers.length > 0)) && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              <span style={{ fontSize: '10px' }}>📊</span>
              Patterns
            </h3>
            <div style={contentStyle}>
              {/* Timing */}
              {temporalPatterns.dominant_days && temporalPatterns.dominant_days.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '3px' }}>
                    When:
                  </div>
                  {temporalPatterns.dominant_days.slice(0, 2).map((dayInfo: any, index: number) => (
                    <span key={index} style={tagStyle}>
                      {dayInfo[0]} {dayInfo[1].toFixed(0)}%
                    </span>
                  ))}
                  {temporalPatterns.time_pattern && temporalPatterns.time_pattern !== 'varied' && (
                    <span style={tagStyle}>
                      {temporalPatterns.time_pattern}s
                    </span>
                  )}
                </div>
              )}
              
              {/* Emotions */}
              {emotionalTriggers.primary_triggers && emotionalTriggers.primary_triggers.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '3px' }}>
                    Triggered by:
                  </div>
                  {emotionalTriggers.primary_triggers.slice(0, 3).map((trigger: string, index: number) => (
                    <span key={index} style={tagStyle}>
                      {trigger}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            <span style={{ fontSize: '10px' }}>📈</span>
            Stats
          </h3>
          <div style={contentStyle}>
            <div style={statsRowStyle}>
              <span style={statLabelStyle}>Activity</span>
              <span style={statValueStyle}>
                {habit.frequency ? (habit.frequency * 100).toFixed(0) + '%' : 'N/A'}
              </span>
            </div>
            {temporalPatterns.total_instances && (
              <div style={statsRowStyle}>
                <span style={statLabelStyle}>Mentions</span>
                <span style={statValueStyle}>{temporalPatterns.total_instances}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 