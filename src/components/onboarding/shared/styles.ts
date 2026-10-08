// Shared styles and constants for onboarding components

export const FONTS = {
  SATOSHI_700_URL: 'https://framerusercontent.com/third-party-assets/fontshare/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2',
  SATOSHI_500_URL: 'https://framerusercontent.com/third-party-assets/fontshare/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2',
  INTER_URL: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap'
};

export const COLORS = {
  PRIMARY_TEXT: 'rgb(61, 0, 0)',
  BACKGROUND: '#F5F2F0',
  WHITE: '#fffffc',
  GRADIENT_START: '#ffeded',
  GRADIENT_END: 'rgb(255, 224, 224)',
  PARTICLE_COLOR: 'rgba(61, 0, 0, 0.3)',
  CARD_BACKGROUND: 'rgba(61, 0, 0, 0.05)',
  CARD_BORDER: 'rgba(61, 0, 0, 0.1)'
};

export const ANIMATIONS = {
  EASE_OUT: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  SMOOTH: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

export const SPACING = {
  PAGE_PADDING: '40px 24px',
  SECTION_GAP: '48px',
  CARD_GAP: '24px',
  ELEMENT_GAP: '16px'
};

// Font face CSS generation
export const generateFontFaces = () => `
  @import url('${FONTS.SATOSHI_700_URL}');
  @import url('${FONTS.SATOSHI_500_URL}');
  @import url('${FONTS.INTER_URL}');

  @font-face {
    font-family: 'Satoshi';
    src: url('${FONTS.SATOSHI_700_URL}') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Satoshi';
    src: url('${FONTS.SATOSHI_500_URL}') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }
`;

// Common base styles
export const basePageStyle: React.CSSProperties = {
  backgroundColor: COLORS.BACKGROUND,
  minHeight: '100vh',
  width: '100vw',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  margin: 0,
  padding: SPACING.PAGE_PADDING,
  fontFamily: '"Inter", sans-serif',
  fontSize: '12px',
  lineHeight: '1.15',
  textSizeAdjust: '100%',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  boxSizing: 'border-box'
};

export const fullScreenStyle: React.CSSProperties = {
  backgroundColor: COLORS.WHITE,
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  margin: 0,
  padding: 0,
  fontFamily: 'sans-serif',
  fontSize: '12px',
  lineHeight: '1.15',
  textSizeAdjust: '100%',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  boxSizing: 'border-box',
  position: 'fixed',
  top: 0,
  left: 0
};

export const gradientSectionStyle: React.CSSProperties = {
  alignContent: 'center',
  alignItems: 'center',
  background: `linear-gradient(180deg, ${COLORS.GRADIENT_START} 0%, ${COLORS.GRADIENT_END} 100%)`,
  borderBottomLeftRadius: '40px',
  borderBottomRightRadius: '40px',
  display: 'flex',
  flex: 'none',
  flexDirection: 'column',
  flexWrap: 'nowrap',
  gap: '0px',
  height: '100vh',
  justifyContent: 'center',
  overflow: 'hidden',
  padding: '140px 0 0',
  position: 'relative',
  width: '100%'
};

export const centerContentStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0
};

// Text styles
export const headingStyle: React.CSSProperties = {
  fontSize: 'clamp(28px, 6vw, 48px)',
  fontWeight: 400,
  color: COLORS.PRIMARY_TEXT,
  lineHeight: '1.2',
  margin: '0 0 16px 0',
  fontFamily: '"Inter", sans-serif',
  WebkitFontSmoothing: 'antialiased',
  textAlign: 'center'
};

export const bodyTextStyle: React.CSSProperties = {
  fontSize: '20px',
  color: COLORS.PRIMARY_TEXT,
  lineHeight: '1.4',
  margin: 0,
  fontWeight: 400,
  fontFamily: '"Inter", sans-serif',
  WebkitFontSmoothing: 'antialiased',
  textAlign: 'center'
};

export const logoStyle: React.CSSProperties = {
  height: '24px',
  width: 'auto',
  objectFit: 'contain',
  filter: 'brightness(0) saturate(100%)'
};

// Button styles
export const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '16px 32px',
  backgroundColor: COLORS.PRIMARY_TEXT,
  color: 'white',
  textDecoration: 'none',
  borderRadius: '187px',
  fontFamily: 'Satoshi, sans-serif',
  fontWeight: 700,
  fontSize: '16px',
  border: 'none',
  cursor: 'pointer',
  transition: `all 0.3s ${ANIMATIONS.SMOOTH}`,
  textAlign: 'center'
};

export const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: 'transparent',
  color: COLORS.PRIMARY_TEXT,
  border: `2px solid ${COLORS.PRIMARY_TEXT}`
}; 