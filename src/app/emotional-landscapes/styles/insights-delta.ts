import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

// ============================================================================
// INSIGHTS DELTA STYLES
// ============================================================================

export const insightsDeltaStyles = {
  container: {
    width: '100%',
    height: '100%',
    overflow: 'visible',
    padding: '0'
  },

  scaleContainer: {
    position: 'relative' as const,
    width: '100%',
    minHeight: 'auto',
    background: `linear-gradient(180deg, 
      rgba(255, 215, 0, 0.1) 0%, 
      rgba(255, 215, 0, 0.05) 20%, 
      transparent 45%, 
      transparent 55%, 
      rgba(0, 212, 255, 0.05) 80%, 
      rgba(0, 212, 255, 0.1) 100%)`,
    borderRadius: '12px',
    border: `1px solid ${DESIGN_TOKENS.colors.border}`,
    padding: '16px',
    boxSizing: 'border-box' as const
  },

  centerLine: {
    position: 'absolute' as const,
    top: '50%',
    left: '16px',
    right: '16px',
    height: '1px',
    backgroundColor: DESIGN_TOKENS.colors.border,
    opacity: 0.5,
    transform: 'translateY(-50%)'
  },

  habitsList: {
    paddingTop: '4px',
    paddingBottom: '4px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },

  habitText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px'
  },

  habitName: {
    fontSize: '12px',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.text,
    lineHeight: 1.3
  },

  habitCategory: {
    fontSize: '10px',
    color: DESIGN_TOKENS.colors.text,
    opacity: 0.6
  }
} as const;

export const getHabitCardStyle = (impact: number) => {
  const isPositive = impact > 0;
  
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: `all ${DESIGN_TOKENS.effects.transitionSpeed} ease`,
    cursor: 'pointer',
    position: 'relative' as const,
    boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1)`,
    borderLeft: `4px solid ${isPositive ? '#10B981' : '#EF4444'}`
  };
};

export const getImpactBarStyle = (impact: number) => {
  const isPositive = impact > 0;
  const width = (Math.abs(impact) / 100) * 60; // Max 60px width
  
  return {
    width: `${width}px`,
    height: '4px',
    backgroundColor: isPositive ? '#10B981' : '#EF4444',
    borderRadius: '2px',
    opacity: 0.8
  };
};

export const getIconStyle = (impact: number) => ({
  width: '20px',
  height: '20px',
  color: impact > 0 ? '#10B981' : '#EF4444',
  flexShrink: 0
});

export const getImpactValueStyle = (impact: number) => ({
  fontSize: '14px',
  fontWeight: 700,
  color: impact > 0 ? '#10B981' : '#EF4444',
  minWidth: '45px',
  textAlign: 'right' as const
}); 