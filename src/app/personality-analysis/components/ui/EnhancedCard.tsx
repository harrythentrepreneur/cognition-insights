import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface EnhancedCardProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  glowOnHover?: boolean;
  tiltEffect?: boolean;
  scaleOnHover?: boolean;
  rippleEffect?: boolean;
  borderAnimation?: boolean;
  delay?: number;
}

const styles = {
  card: {
    position: 'relative',
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    cursor: 'pointer',
    transformStyle: 'preserve-3d',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform, box-shadow, border-color',
  } as CSSProperties,

  cardHover: {
    transform: 'translateY(-4px) scale(1.02)',
    boxShadow: '0 20px 40px rgba(0, 255, 230, 0.15)',
    borderColor: `${colors.accent}80`,
  } as CSSProperties,

  cardTilt: {
    transform: 'perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(-4px)',
  } as CSSProperties,

  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${colors.accent}20 0%, transparent 50%)`,
    opacity: 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  } as CSSProperties,

  glowOverlayVisible: {
    opacity: 1,
  } as CSSProperties,

  borderAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '12px',
    background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)`,
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'xor',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    padding: '1px',
    opacity: 0,
    animation: 'borderSweep 2s linear infinite',
  } as CSSProperties,

  borderAnimationActive: {
    opacity: 1,
  } as CSSProperties,

  ripple: {
    position: 'absolute',
    borderRadius: '50%',
    background: `${colors.accent}40`,
    transform: 'scale(0)',
    animation: 'rippleEffect 0.6s linear',
    pointerEvents: 'none',
  } as CSSProperties,

  content: {
    position: 'relative',
    zIndex: 1,
  } as CSSProperties,
};

// CSS animations
const keyframes = `
  @keyframes borderSweep {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes rippleEffect {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes shimmerEffect {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  className = '',
  style = {},
  glowOnHover = true,
  tiltEffect = true,
  scaleOnHover = true,
  rippleEffect = true,
  borderAnimation = false,
  delay = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    // Add keyframes to document
    if (!document.getElementById('enhanced-card-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'enhanced-card-styles';
      styleSheet.textContent = keyframes;
      document.head.appendChild(styleSheet);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glowOnHover) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMousePosition({ x, y });

    // Update CSS custom properties for glow effect
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rippleEffect || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = {
      id: rippleIdRef.current++,
      x,
      y,
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  };

  const getTransform = () => {
    let transform = '';
    
    if (isHovered) {
      if (scaleOnHover) {
        transform += 'translateY(-4px) scale(1.02) ';
      }
      
      if (tiltEffect) {
        const tiltX = (mousePosition.y - 50) * 0.1;
        const tiltY = (mousePosition.x - 50) * 0.1;
        transform += `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) `;
      }
    }

    return transform || 'none';
  };

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        ...styles.card,
        ...style,
        transform: getTransform(),
        boxShadow: isHovered ? '0 20px 40px rgba(0, 255, 230, 0.15)' : 'none',
        borderColor: isHovered ? `${colors.accent}80` : colors.border,
        transitionDelay: `${delay}ms`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Glow overlay */}
      {glowOnHover && (
        <div
          style={{
            ...styles.glowOverlay,
            ...(isHovered ? styles.glowOverlayVisible : {}),
          }}
        />
      )}

      {/* Border animation */}
      {borderAnimation && (
        <div
          style={{
            ...styles.borderAnimation,
            ...(isHovered ? styles.borderAnimationActive : {}),
          }}
        />
      )}

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          style={{
            ...styles.ripple,
            left: ripple.x - 25,
            top: ripple.y - 25,
            width: 50,
            height: 50,
          }}
        />
      ))}

      {/* Content */}
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
};