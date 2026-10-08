import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { getBlurMask } from './utils';

// ============================================================================
// MAIN LAYOUT STYLES
// ============================================================================

export const dashboardLayoutStyles = {
  page: {
    backgroundColor: DESIGN_TOKENS.colors.background,
    margin: 0,
    paddingTop: '60px', // Reduced from 85px for better visual balance
    paddingBottom: DESIGN_TOKENS.spacing.bottomNavHeight,
    fontFamily: DESIGN_TOKENS.fonts.body,
    color: DESIGN_TOKENS.colors.text
  },

  logoBlurBackdrop: {
    position: 'fixed' as const,
    top: '125px',
    left: '168px',
    transform: 'translate(-50%, -50%)',
    zIndex: 99,
    pointerEvents: 'none' as const,
    width: '1200px',
    height: '600px',
    backgroundColor: DESIGN_TOKENS.colors.background,
    mask: getBlurMask('logo'),
    WebkitMask: getBlurMask('logo'),
    backdropFilter: DESIGN_TOKENS.effects.blurIntensity,
    opacity: 5,
    transition: `opacity 0s ease, backdrop-filter 0s ease`
  },

  hamburgerBlurBackdrop: {
    position: 'fixed' as const,
    top: '124px',
    right: '56px',
    transform: 'translate(50%, -50%)',
    zIndex: 99,
    pointerEvents: 'none' as const,
    width: '300px',
    height: '300px',
    backgroundColor: DESIGN_TOKENS.colors.background,
    mask: getBlurMask('hamburger'),
    WebkitMask: getBlurMask('hamburger'),
    backdropFilter: 'blur(15px)',
    opacity: 1.2,
    transition: 'opacity 0s ease, backdrop-filter 0s ease'
  },

  mainContent: {
    padding: '20px 0px 0px 0px',
    width: '100%',
    maxWidth: '1792px', // equivalent to max-w-7xl in Tailwind
    margin: '0 auto',
  },

  timelineContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
  },

  contentContainer: {
    padding: '40px 40px 40px 32px', // Increased top and bottom padding
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const
  },

  circumplexInsightsWrapper: {
    display: 'flex',
    gap: '30px', // Increased gap between circumplex and insights
    width: '100%',
    alignItems: 'flex-start',
    paddingTop: '20px',
    paddingBottom: '60px', // Added bottom padding for spacing
    marginBottom: '60px' // Added margin for separation from heatmap
  },

  circumplexContainer: {
    width: '70%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center'
  },

  insightsContainer: {
    width: '30%',
    display: 'flex',
    flexDirection: 'column' as const
  },

  heatmapSection: {
    clear: 'both' as const,
    width: '100%',
    paddingTop: '40px', // Added top padding
    marginBottom: '60px' // Added bottom margin
  }
} as const; 