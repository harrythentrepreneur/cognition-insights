import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

// ============================================================================
// INSIGHTS PANEL STYLES
// ============================================================================

interface EmotionStyle {
  color: string;
}

export const insightsPanelStyles = {
  panel: {
    width: '100%',
    height: '840px',
    display: 'flex',
    flexDirection: 'column' as const
  },

  container: {
    backgroundColor: DESIGN_TOKENS.colors.cardBg,
    border: `1px solid ${DESIGN_TOKENS.colors.border}`,
    borderRadius: DESIGN_TOKENS.effects.cardBorderRadius,
    backdropFilter: DESIGN_TOKENS.effects.backdropBlur,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const
  },

  tabBar: {
    display: 'flex',
    borderBottom: `1px solid ${DESIGN_TOKENS.colors.border}`,
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },

  content: {
    flex: 1,
    padding: '24px',
    color: DESIGN_TOKENS.colors.text,
    fontSize: '14px',
    lineHeight: 1.6,
    overflow: 'auto'
  },

  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    backgroundColor: DESIGN_TOKENS.colors.background,
    border: `1px solid ${DESIGN_TOKENS.colors.border}`,
    borderRadius: DESIGN_TOKENS.effects.borderRadius,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    minWidth: '280px',
    backdropFilter: DESIGN_TOKENS.effects.backdropBlur,
    overflow: 'hidden',
    maxHeight: '400px',
    overflowY: 'auto' as const
  },

  emotionPair: {
    padding: '8px 12px',
    borderBottom: `1px solid ${DESIGN_TOKENS.colors.border}40`,
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },

  pairLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.text,
    opacity: 0.6,
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },

  emotionRow: {
    display: 'flex',
    gap: '4px'
  }
} as const;

export const getInsightsTabStyle = (isActive: boolean) => ({
  flex: 1,
  padding: '16px 20px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  color: isActive ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.text,
  backgroundColor: isActive ? 'rgba(0, 245, 212, 0.1)' : 'transparent',
  borderBottom: isActive ? `2px solid ${DESIGN_TOKENS.colors.accent}` : '2px solid transparent',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  transition: `color ${DESIGN_TOKENS.effects.transitionSpeed} ease, background-color ${DESIGN_TOKENS.effects.transitionSpeed} ease, border-bottom ${DESIGN_TOKENS.effects.transitionSpeed} ease`,
  position: 'relative' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  margin: 0,
  boxShadow: 'none',
  textDecoration: 'none',
  fontFamily: 'inherit',
  lineHeight: 1.4,
  appearance: 'none' as any,
  WebkitAppearance: 'none' as any,
  MozAppearance: 'none' as any
});

export const getDropdownItemStyle = (isSelected: boolean, emotion: EmotionStyle) => ({
  flex: 1,
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: '12px',
  color: isSelected ? emotion.color : DESIGN_TOKENS.colors.text,
  backgroundColor: isSelected ? `${emotion.color}15` : 'transparent',
  borderRadius: '4px',
  border: `1px solid ${isSelected ? emotion.color + '40' : 'transparent'}`,
  transition: `all ${DESIGN_TOKENS.effects.transitionSpeed} ease`,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  textAlign: 'center' as const,
  justifyContent: 'center'
}); 