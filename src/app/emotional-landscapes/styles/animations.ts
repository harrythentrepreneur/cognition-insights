import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

const { animations, effects } = DESIGN_TOKENS;

// Smooth transition for hover effects
export const smoothTransition = `all ${effects.transitionSpeed} ${animations.easeInOutCubic}`;

// Glass morphism transition
export const glassTransition = `backdrop-filter ${effects.transitionSpeed} ${animations.smoothElastic}, background-color ${effects.transitionSpeed} ${animations.easeInOutCubic}`;

// Scale animation for interactive elements
export const scaleTransition = `transform 0.2s ${animations.springBounce}`;

// Common animation patterns
export const animationPatterns = {
  // Hover lift effect
  hoverLift: {
    transition: smoothTransition,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 24px ${DESIGN_TOKENS.colors.shadowMedium}`,
    }
  },
  
  // Glow effect
  glowPulse: {
    animation: 'glow 2s ease-in-out infinite',
  },
  
  // Fade in animation
  fadeIn: {
    animation: 'fadeInUp 0.6s ease-out',
  },
  
  // Glass hover effect
  glassHover: {
    transition: glassTransition,
    '&:hover': {
      backgroundColor: DESIGN_TOKENS.colors.accentLight,
      backdropFilter: 'blur(24px)',
    }
  }
} as const;

// Animation keyframes for smooth interactions
export const interactionKeyframes = `
  @keyframes hoverPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }
  
  @keyframes glassShimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }
  
  @keyframes smoothFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Utility function to apply smooth transitions
export const withSmoothTransition = (styles: any) => ({
  ...styles,
  transition: smoothTransition,
});

// Utility function to apply glass effect with smooth transitions
export const withGlassEffect = (styles: any) => ({
  ...styles,
  backdropFilter: effects.backdropBlur,
  transition: glassTransition,
  border: `1px solid ${DESIGN_TOKENS.colors.border}`,
});