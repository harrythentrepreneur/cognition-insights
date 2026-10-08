import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { smoothTransition, glassTransition } from './animations';

// ============================================================================
// NAVIGATION STYLES
// ============================================================================

export const navigationStyles = {
  navigation: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: DESIGN_TOKENS.colors.overlay,
    backdropFilter: DESIGN_TOKENS.effects.backdropBlur,
    borderTop: `1px solid ${DESIGN_TOKENS.colors.border}`,
    display: 'flex',
    justifyContent: 'center',
    padding: '20px',
    gap: '10px',
    flexWrap: 'wrap' as const
  },

  buttonIcon: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
} as const;

// ============================================================================
// NAVIGATION BUTTON STYLES
// ============================================================================

export const getNavigationButtonBaseStyle = (isActive: boolean) => ({
  padding: '12px 20px',
  borderRadius: DESIGN_TOKENS.effects.cardBorderRadius,
  fontSize: '14px',
  fontWeight: isActive ? 500 : 400,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: smoothTransition,
  outline: 'none',
  backdropFilter: 'blur(3px)',
  border: 'none'
});

export const getNavigationButtonActiveStyle = () => ({
  backgroundColor: DESIGN_TOKENS.colors.accent,
  border: `1px solid ${DESIGN_TOKENS.colors.accent}`,
  color: DESIGN_TOKENS.colors.background,
  boxShadow: `0 0 15px ${DESIGN_TOKENS.colors.accentHeavy}`
});

export const getNavigationButtonInactiveStyle = () => ({
  backgroundColor: DESIGN_TOKENS.colors.cardBg,
  border: `1px solid ${DESIGN_TOKENS.colors.border}`,
  color: DESIGN_TOKENS.colors.text,
  boxShadow: `0 4px 15px ${DESIGN_TOKENS.colors.shadowLight}`
});

export const navigationButtonIconStyle = {
  width: '16px',
  height: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'inherit'
}; 