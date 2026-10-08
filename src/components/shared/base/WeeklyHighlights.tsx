import { logger } from '@/lib/utils/logger';
import React, { useState } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

interface WeeklyHighlight {
  week: string;
  range?: string;
  weekly_summary: string[];
  weekly_topics: string[];
}

interface WeeklyHighlightsProps {
  highlights: WeeklyHighlight[];
}

const { colors, fonts, spacing, effects } = DESIGN_TOKENS;

const styles = {
  container: {
    margin: '90px 0 60px', // Added 10px to top margin (was 80px)
    background: `linear-gradient(135deg, ${colors.accentLight} 0%, ${colors.cardBg} 100%)`,
    borderRadius: effects.cardBorderRadius,
    border: `1px solid ${colors.border}`,
    backdropFilter: effects.backdropBlur,
    boxShadow: `0 8px 32px ${colors.shadowLight}`,
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  
  header: {
    padding: spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.cardBg,
    cursor: 'pointer',
  },
  
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.text,
    fontFamily: fonts.heading,
    letterSpacing: '0.2px',
  },
  
  toggleButton: {
    background: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '6px 12px',
    color: colors.accent,
    fontSize: '14px',
    fontFamily: fonts.body,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  toggleButtonHover: {
    background: colors.accentLight,
    border: `1px solid ${colors.accent}`,
    transform: 'scale(1.02)',
  },
  
  content: {
    padding: spacing.lg,
    maxHeight: '500px',
    overflowY: 'auto' as const,
    background: 'rgba(0, 0, 0, 0.2)',
  },
  
  weekItem: {
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  
  weekRange: {
    fontWeight: 600,
    color: colors.accent,
    fontSize: '15px',
    fontFamily: fonts.body,
  },
  
  topicsContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    margin: '4px 0',
  },
  
  topicBadge: {
    background: `linear-gradient(135deg, ${colors.accentLight} 0%, ${colors.surfaceLight} 100%)`,
    color: colors.text,
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.1px',
    fontFamily: fonts.body,
    border: `1px solid ${colors.border}`,
    backdropFilter: 'blur(10px)',
  },
  
  summaryText: {
    color: colors.text,
    fontSize: '15px',
    marginTop: '2px',
    lineHeight: '1.6',
    fontFamily: fonts.body,
  },
  
  divider: {
    borderBottom: `1px solid ${colors.border}`,
  },
  
  expandIcon: {
    transition: 'transform 0.3s ease',
  },
  
  expandIconRotated: {
    transform: 'rotate(180deg)',
  },
};

export const WeeklyHighlights: React.FC<WeeklyHighlightsProps> = ({ highlights }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredButton, setHoveredButton] = useState(false);

  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div 
        style={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={styles.title}>Weekly Highlights</h3>
        <button
          style={{
            ...styles.toggleButton,
            ...(hoveredButton ? styles.toggleButtonHover : {}),
          }}
          onMouseEnter={() => setHoveredButton(true)}
          onMouseLeave={() => setHoveredButton(false)}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            style={{
              ...styles.expandIcon,
              ...(isExpanded ? {} : styles.expandIconRotated),
            }}
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {isExpanded && (
        <div style={styles.content}>
          {highlights.map((week, idx) => (
            <div 
              key={week.week + idx} 
              style={{
                ...styles.weekItem,
                ...(idx < highlights.length - 1 ? styles.divider : {}),
              }}
            >
              <div style={styles.weekRange}>
                {week.range || week.week}
              </div>
              
              {week.weekly_topics && week.weekly_topics.length > 0 && (
                <div style={styles.topicsContainer}>
                  {week.weekly_topics.map((topic: string, i: number) => (
                    <span key={topic + i} style={styles.topicBadge}>
                      {topic}
                    </span>
                  ))}
                </div>
              )}
              
              {week.weekly_summary && week.weekly_summary.length > 0 && (
                <div>
                  {week.weekly_summary.map((summary: string, i: number) => (
                    <div key={i} style={styles.summaryText}>
                      {summary}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};