import { ANIMATIONS } from './styles';

// Shared animation keyframes
export const fadeInUpKeyframes = `
  @keyframes fadeInUp {
    0% {
      opacity: 0.001;
      transform: translateY(-24px);
    }
    100% {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

export const celebrationKeyframes = `
  @keyframes celebrate0 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.3; }
    50% { transform: translateY(-20px) translateX(5px) rotate(180deg); opacity: 0.7; }
  }
  @keyframes celebrate1 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.4; }
    50% { transform: translateY(-25px) translateX(-8px) rotate(-180deg); opacity: 0.8; }
  }
  @keyframes celebrate2 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.2; }
    50% { transform: translateY(-15px) translateX(10px) rotate(90deg); opacity: 0.6; }
  }
  @keyframes celebrate3 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.35; }
    50% { transform: translateY(-30px) translateX(-5px) rotate(-90deg); opacity: 0.75; }
  }
  @keyframes celebrate4 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.25; }
    50% { transform: translateY(-18px) translateX(8px) rotate(270deg); opacity: 0.65; }
  }
  @keyframes celebrate5 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.3; }
    50% { transform: translateY(-22px) translateX(-3px) rotate(135deg); opacity: 0.7; }
  }
  @keyframes celebrate6 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.4; }
    50% { transform: translateY(-16px) translateX(6px) rotate(-45deg); opacity: 0.8; }
  }
  @keyframes celebrate7 {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.3; }
    50% { transform: translateY(-28px) translateX(-7px) rotate(225deg); opacity: 0.7; }
  }
`;

// Animation style generators
export const createFadeInUpStyle = (delay: number = 0): React.CSSProperties => ({
  opacity: 1,
  transform: 'translateY(0px)',
  animationName: 'fadeInUp',
  animationDuration: '0.8s',
  animationTimingFunction: ANIMATIONS.EASE_OUT,
  animationDelay: `${delay}s`,
  animationFillMode: 'forwards'
});

export const createStageTransitionStyle = (delay: number = 0): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  ...createFadeInUpStyle(delay)
});

export const createImageAnimationStyle = (delay: number = 0): React.CSSProperties => ({
  opacity: 1,
  transform: 'translateY(0px)',
  animationName: 'fadeInUp',
  animationDuration: '0.8s',
  animationTimingFunction: ANIMATIONS.EASE_OUT,
  animationDelay: `${delay}s`,
  animationFillMode: 'forwards'
});

export const createTextAnimationStyle = (delay: number = 0): React.CSSProperties => ({
  fontSize: '24px',
  color: 'rgb(61, 0, 0)',
  lineHeight: '1.3',
  margin: 0,
  fontWeight: 400,
  fontFamily: 'Satoshi, sans-serif',
  opacity: 0.8,
  WebkitFontSmoothing: 'antialiased',
  textAlign: 'center',
  transform: 'translateY(0px)',
  animationName: 'fadeInUp',
  animationDuration: '0.8s',
  animationTimingFunction: ANIMATIONS.EASE_OUT,
  animationDelay: `${delay}s`,
  animationFillMode: 'forwards'
});

// Animation timing utilities
export const createStaggeredAnimations = (baseDelay: number = 0.4) => ({
  container: createStageTransitionStyle(baseDelay),
  image: createImageAnimationStyle(baseDelay + 0.2),
  text: createTextAnimationStyle(baseDelay + 0.4)
});

// Common animation styles for specific components
export const createCelebrationParticleStyle = (index: number, isActive: boolean): React.CSSProperties => ({
  position: 'absolute',
  width: '6px',
  height: '6px',
  background: 'rgba(61, 0, 0, 0.3)',
  borderRadius: '50%',
  left: `${10 + index * 12}%`,
  top: `${20 + (index % 3) * 25}%`,
  opacity: isActive ? 0.6 : 0,
  animationName: isActive ? `celebrate${index}` : 'none',
  animationDuration: isActive ? `${3 + index * 0.3}s` : '0s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  animationDelay: `${index * 0.2}s`
});

export const createLoadedElementStyle = (
  isLoaded: boolean, 
  delay: number = 0, 
  animationType: 'fadeInUp' | 'scaleIn' = 'fadeInUp'
): React.CSSProperties => {
  const transitionDelay = `${delay}s`;
  
  const baseStyle = {
    transitionProperty: 'transform, opacity',
    transitionDuration: `${0.8 + delay * 0.2}s`,
    transitionTimingFunction: ANIMATIONS.SPRING,
    transitionDelay,
    willChange: 'transform, opacity'
  };

  if (animationType === 'scaleIn') {
    return {
      ...baseStyle,
      opacity: isLoaded ? 1 : 0,
      transform: isLoaded ? 'translateY(0px) scale(1)' : 'translateY(20px) scale(0.9)'
    };
  }

  return {
    ...baseStyle,
    opacity: isLoaded ? 1 : 0,
    transform: isLoaded ? 'translateY(0px)' : 'translateY(25px)'
  };
}; 