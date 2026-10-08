import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface ChapterTransitionProps {
  children: React.ReactNode;
  chapterId: string;
  title: string;
  isActive: boolean;
  delay?: number;
}

const styles = {
  container: {
    position: 'relative',
    marginBottom: '80px',
    scrollMarginTop: '80px',
  } as CSSProperties,

  chapterHeader: {
    position: 'relative',
    marginBottom: spacing.xxl,
    overflow: 'hidden',
  } as CSSProperties,

  titleContainer: {
    position: 'relative',
    display: 'inline-block',
  } as CSSProperties,

  title: {
    fontSize: '2.5rem',
    fontWeight: 300,
    color: colors.accent,
    marginBottom: spacing.xl,
    borderBottom: `2px solid ${colors.accent}`,
    paddingBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  } as CSSProperties,

  titleUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '2px',
    backgroundColor: colors.accent,
    transform: 'translateX(-100%)',
    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  } as CSSProperties,

  titleUnderlineActive: {
    transform: 'translateX(0%)',
  } as CSSProperties,

  content: {
    opacity: 0,
    transform: 'translateY(30px)',
    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  } as CSSProperties,

  contentVisible: {
    opacity: 1,
    transform: 'translateY(0px)',
  } as CSSProperties,

  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    overflow: 'hidden',
  } as CSSProperties,

  particle: {
    position: 'absolute',
    width: '4px',
    height: '4px',
    backgroundColor: colors.accent,
    borderRadius: '50%',
    opacity: 0,
    animation: 'floatUp 3s ease-out infinite',
  } as CSSProperties,

  glowEffect: {
    position: 'absolute',
    top: '50%',
    left: '0%',
    width: '200px',
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)`,
    transform: 'translateY(-50%)',
    opacity: 0,
    transition: 'all 1s ease-out',
  } as CSSProperties,

  glowEffectActive: {
    opacity: 1,
    left: '100%',
    transition: 'left 2s ease-out, opacity 1s ease-out',
  } as CSSProperties,
};

// CSS animations
const keyframes = `
  @keyframes floatUp {
    0% {
      opacity: 0;
      transform: translateY(20px) scale(0);
    }
    20% {
      opacity: 1;
      transform: translateY(0px) scale(1);
    }
    80% {
      opacity: 1;
      transform: translateY(-60px) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-80px) scale(0);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100vw);
    }
  }

  @keyframes fadeInScale {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0px);
    }
  }
`;

export const ChapterTransition: React.FC<ChapterTransitionProps> = ({
  children,
  chapterId,
  title,
  isActive,
  delay = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add keyframes to document
    if (!document.getElementById('chapter-transition-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'chapter-transition-styles';
      styleSheet.textContent = keyframes;
      document.head.appendChild(styleSheet);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisible) {
          setTimeout(() => {
            setIsVisible(true);
            setHasBeenVisible(true);
            
            // Trigger particle effect
            setTimeout(() => {
              setShowParticles(true);
            }, 300);
          }, delay);
        }
      },
      {
        threshold: 0.2,
        rootMargin: '-50px 0px -50px 0px',
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [delay, hasBeenVisible]);

  const generateParticles = () => {
    return Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        style={{
          ...styles.particle,
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${2 + Math.random() * 2}s`,
        }}
      />
    ));
  };

  return (
    <div
      ref={containerRef}
      id={chapterId}
      style={styles.container}
    >
      {/* Removed Chapter Header with Animations - titles are now in individual components */}

      {/* Content with fade-in animation */}
      <div
        ref={contentRef}
        style={{
          ...styles.content,
          ...(isVisible ? styles.contentVisible : {}),
          transitionDelay: `${delay + 200}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
};