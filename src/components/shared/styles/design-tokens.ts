// ============================================================================
// DESIGN SYSTEM CONSTANTS
// ============================================================================

export const DESIGN_TOKENS = {
  colors: {
    background: '#1A1A2E',
    text: '#A0A0B0',
    textSecondary: '#8A8A9A',
    accent: '#00F5D4',
    accentDark: '#00D9CC',
    overlay: 'rgba(26, 26, 46, 0.8)',
    border: 'rgba(255, 255, 255, 0.1)',
    cardBg: 'rgba(255, 255, 255, 0.02)',
    surface: 'rgba(35, 35, 64, 0.5)',
    success: '#6BCF7F',
    successLight: 'rgba(107, 207, 127, 0.1)',
    warning: '#FFD93D',
    error: '#FF6B6B',
    errorLight: 'rgba(255, 107, 107, 0.1)',
    info: '#4ECDC4',
    // Opacity variations
    accentLight: 'rgba(0, 245, 212, 0.1)',
    accentMedium: 'rgba(0, 245, 212, 0.3)',
    accentHeavy: 'rgba(0, 245, 212, 0.6)',
    shadowLight: 'rgba(0, 0, 0, 0.2)',
    shadowMedium: 'rgba(0, 0, 0, 0.3)',
    shadowDark: 'rgba(0, 0, 0, 0.4)',
    surfaceLight: 'rgba(255, 255, 255, 0.03)',
    // Additional colors for consistency
    gold: '#FFD700',
    cyan: '#00D4FF'
  },
  fonts: {
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace'
  },
  spacing: {
    headerHeight: '85px',
    bottomNavHeight: '120px',
    sectionPadding: '32px',
    cardPadding: '15px',
    gridGap: '30px',
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  layout: {
    logoPosition: { top: '108px', left: '56px' },
    hamburgerPosition: { top: '108px', right: '36px' },
    maxContentWidth: '100%'
  },
  effects: {
    borderRadius: '12px',
    cardBorderRadius: '25px',
    transitionSpeed: '0.3s',
    blurIntensity: 'blur(80px)',
    backdropBlur: 'blur(20px)'
  },
  animations: {
    springBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smoothElastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
    easeInOutCubic: 'cubic-bezier(0.4, 0, 0.2, 1)',
    glassBlur: '20px',
    glowIntensity: '0 0 40px',
  },
  gradients: {
    personality: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    growth: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    mesh: 'radial-gradient(at 47% 33%, hsl(162, 77%, 40%) 0, transparent 59%)',
    cosmic: 'radial-gradient(ellipse at center, rgba(0, 255, 230, 0.1) 0%, transparent 70%)',
    aurora: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7)',
  }
} as const;

// Enhanced animation keyframes for advanced components
export const ANIMATION_KEYFRAMES = {
  fadeInUp: `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  
  pulse: `
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.05);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `,
  
  float: `
    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }
  `,
  
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `,
  
  glow: `
    @keyframes glow {
      0%, 100% {
        box-shadow: 0 0 5px #00F5D4;
      }
      50% {
        box-shadow: 0 0 20px #00F5D4, 0 0 30px #00F5D4;
      }
    }
  `,
};

// Utility function to inject keyframes into document
export const injectAnimationKeyframes = () => {
  if (typeof document === 'undefined') return;
  
  const styleId = 'design-tokens-animations';
  if (document.getElementById(styleId)) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = styleId;
  styleSheet.textContent = Object.values(ANIMATION_KEYFRAMES).join('\n');
  document.head.appendChild(styleSheet);
}; 