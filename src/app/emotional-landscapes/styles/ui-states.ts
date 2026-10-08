import { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

// ============================================================================
// UI STATE STYLES - Loading, Error, Empty States
// ============================================================================

const { colors, fonts, spacing, effects, animations } = DESIGN_TOKENS;

// Loading State Styles
export const loadingStateStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
    minHeight: '400px',
  } as CSSProperties,

  spinner: {
    width: '60px',
    height: '60px',
    border: `3px solid ${colors.border}`,
    borderTopColor: colors.accent,
    borderRadius: '50%',
    animation: 'spin 1s ease-in-out infinite',
  } as CSSProperties,

  text: {
    fontSize: '18px',
    color: colors.text,
    fontFamily: fonts.body,
    textAlign: 'center',
    lineHeight: '1.6',
  } as CSSProperties,

  subtext: {
    fontSize: '14px',
    color: colors.textSecondary,
    fontFamily: fonts.body,
    marginTop: spacing.sm,
  } as CSSProperties,
} as const;

// Error State Styles
export const errorStateStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
    minHeight: '400px',
    backgroundColor: colors.cardBg,
    borderRadius: effects.cardBorderRadius,
    backdropFilter: effects.backdropBlur,
  } as CSSProperties,

  iconWrapper: {
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: colors.errorLight,
    border: `2px solid ${colors.error}`,
  } as CSSProperties,

  icon: {
    fontSize: '40px',
    color: colors.error,
  } as CSSProperties,

  message: {
    fontSize: '18px',
    color: colors.text,
    fontFamily: fonts.body,
    textAlign: 'center',
    maxWidth: '500px',
    lineHeight: '1.6',
  } as CSSProperties,

  details: {
    fontSize: '14px',
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    textAlign: 'center',
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.shadowLight,
    borderRadius: effects.borderRadius,
    maxWidth: '600px',
    wordBreak: 'break-word',
  } as CSSProperties,
} as const;

// Empty State Styles
export const emptyStateStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
    minHeight: '400px',
  } as CSSProperties,

  icon: {
    fontSize: '60px',
    color: colors.textSecondary,
    opacity: 0.5,
  } as CSSProperties,

  message: {
    fontSize: '20px',
    color: colors.text,
    fontFamily: fonts.body,
    textAlign: 'center',
  } as CSSProperties,

  subMessage: {
    fontSize: '16px',
    color: colors.textSecondary,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  } as CSSProperties,
} as const;

// Analysis Window Label Styles
export const analysisWindowStyles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    background: `linear-gradient(135deg, ${colors.accent}15 0%, ${colors.accentDark}10 100%)`,
    borderRadius: effects.borderRadius,
    border: `1px solid ${colors.border}`,
    backdropFilter: effects.backdropBlur,
    marginBottom: spacing.lg,
  } as CSSProperties,

  icon: {
    width: '16px',
    height: '16px',
    color: colors.accent,
  } as CSSProperties,

  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.body,
    letterSpacing: '0.5px',
  } as CSSProperties,

  subtext: {
    fontSize: '12px',
    color: colors.textSecondary,
    fontFamily: fonts.body,
    marginLeft: spacing.xs,
  } as CSSProperties,
} as const;

// CSS Keyframes for animations
export const animationKeyframes = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;