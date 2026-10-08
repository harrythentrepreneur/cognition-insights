import React, { useState, useEffect, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface Chapter {
  id: string;
  title: string;
  ref: React.RefObject<HTMLDivElement | null>;
}

interface FloatingProgressProps {
  chapters: Chapter[];
  activeChapter: string;
  onChapterClick: (chapterId: string) => void;
}

const styles = {
  container: {
    position: 'fixed',
    right: spacing.lg,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: `${spacing.sm} ${spacing.xs}`,
    boxShadow: '0 8px 32px rgba(0, 255, 230, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0.9,
  } as CSSProperties,

  progressTrack: {
    width: '4px',
    height: '240px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    position: 'relative',
    margin: `0 ${spacing.sm}`,
  } as CSSProperties,

  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: '2px',
    transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: `0 0 8px ${colors.accent}`,
  } as CSSProperties,

  chapterDots: {
    position: 'absolute',
    left: '50%',
    top: 0,
    transform: 'translateX(-50%)',
    width: '100%',
    height: '100%',
  } as CSSProperties,

  chapterDot: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: `2px solid ${colors.border}`,
    backgroundColor: 'rgba(35, 35, 64, 0.8)',
  } as CSSProperties,

  activeDot: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    boxShadow: `0 0 12px ${colors.accent}`,
    scale: '1.2',
  } as CSSProperties,

  completedDot: {
    backgroundColor: `${colors.accent}80`,
    borderColor: `${colors.accent}80`,
  } as CSSProperties,

  tooltip: {
    position: 'absolute',
    right: '120%',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: '0.75rem',
    color: colors.text,
    whiteSpace: 'nowrap',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  } as CSSProperties,

  tooltipVisible: {
    opacity: 1,
    transform: 'translateY(-50%) translateX(-4px)',
  } as CSSProperties,

  // Mobile responsive
  '@media (max-width: 768px)': {
    container: {
      right: spacing.sm,
      transform: 'translateY(-50%) scale(0.8)',
    },
    progressTrack: {
      height: '180px',
    },
  },
};

export const FloatingProgress: React.FC<FloatingProgressProps> = ({
  chapters,
  activeChapter,
  onChapterClick,
}) => {
  // Disabled - returning null to hide the floating progress dots
  return null;
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const maxScroll = documentHeight - windowHeight;
      
      // Calculate overall scroll progress
      const progress = Math.min(scrollTop / maxScroll, 1);
      setScrollProgress(progress);

      // Show/hide based on scroll position
      setIsVisible(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getChapterProgress = (index: number) => {
    const activeIndex = chapters.findIndex(c => c.id === activeChapter);
    return index <= activeIndex ? 100 : 0;
  };

  const handleChapterClick = (chapterId: string, ref: React.RefObject<HTMLDivElement | null>) => {
    onChapterClick(chapterId);
    
    // Smooth scroll to chapter
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div style={styles.container}>
      <div style={styles.progressTrack}>
        {/* Overall progress fill */}
        <div 
          style={{
            ...styles.progressFill,
            height: `${scrollProgress * 100}%`,
          }}
        />
        
        {/* Chapter dots */}
        <div style={styles.chapterDots}>
          {chapters.map((chapter, index) => {
            const isActive = chapter.id === activeChapter;
            const isCompleted = getChapterProgress(index) > 0;
            const position = (index / (chapters.length - 1)) * 100;
            
            return (
              <div
                key={chapter.id}
                style={{
                  ...styles.chapterDot,
                  ...(isActive ? styles.activeDot : {}),
                  ...(isCompleted && !isActive ? styles.completedDot : {}),
                  top: `${position}%`,
                }}
                onClick={() => handleChapterClick(chapter.id, chapter.ref)}
                onMouseEnter={() => setHoveredChapter(chapter.id)}
                onMouseLeave={() => setHoveredChapter(null)}
              >
                {/* Tooltip */}
                <div
                  style={{
                    ...styles.tooltip,
                    ...(hoveredChapter === chapter.id ? styles.tooltipVisible : {}),
                  }}
                >
                  {chapter.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};