import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

// ============================================================================
// EVENTS TIMELINE STYLES
// ============================================================================

export const eventsTimelineStyles = {
  timeline: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    padding: '0'
  },

  dayColumn: {
    marginBottom: '24px',
    borderBottom: `1px solid ${DESIGN_TOKENS.colors.border}`,
    paddingBottom: '16px'
  },

  dayColumnLast: {
    borderBottom: 'none',
    marginBottom: '0'
  },

  dayHeader: {
    fontSize: '13px',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.accent,
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 245, 212, 0.1)',
    borderRadius: '6px',
    border: `1px solid rgba(0, 245, 212, 0.2)`,
    textAlign: 'center' as const
  },

  time: {
    fontSize: '11px',
    color: DESIGN_TOKENS.colors.accent,
    fontWeight: 500,
    marginBottom: '4px'
  },

  title: {
    fontSize: '12px',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.text,
    marginBottom: '3px',
    lineHeight: 1.3
  },

  description: {
    fontSize: '11px',
    color: DESIGN_TOKENS.colors.text,
    opacity: 0.7,
    lineHeight: 1.3
  }
} as const;

export const getEventCardStyle = (emotion: string, intensity: number, emotionColors: Record<string, string>) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${emotionColors[emotion] || DESIGN_TOKENS.colors.border}40`,
  borderRadius: '8px',
  padding: '10px 12px',
  marginBottom: '8px',
  position: 'relative' as const,
  transition: `all ${DESIGN_TOKENS.effects.transitionSpeed} ease`,
  cursor: 'pointer',
  boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px ${emotionColors[emotion] || DESIGN_TOKENS.colors.border}20`
});

export const getIntensityBarStyle = (emotion: string, intensity: number, emotionColors: Record<string, string>) => ({
  position: 'absolute' as const,
  left: 0,
  top: 0,
  bottom: 0,
  width: `${(intensity / 10) * 4}px`,
  backgroundColor: emotionColors[emotion] || DESIGN_TOKENS.colors.accent,
  borderTopLeftRadius: '8px',
  borderBottomLeftRadius: '8px',
  opacity: 0.6
}); 