import React, { useEffect, useRef, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface ProactiveReactiveScaleProps {
  data: {
    proactive_score: number;
    reactive_score: number;
    initiative_ratio: number;
    examples?: {
      proactive: string[];
      reactive: string[];
    };
  };
}

const styles = {
  container: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.lg,
    textAlign: 'center',
  } as CSSProperties,
  
  scaleContainer: {
    position: 'relative',
    height: '80px',
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: '40px',
    overflow: 'hidden',
    border: `2px solid ${colors.border}`,
  } as CSSProperties,
  
  scaleTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
  } as CSSProperties,
  
  proactiveSection: {
    background: `linear-gradient(90deg, ${colors.accent}20, ${colors.accent}80)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: spacing.lg,
    color: colors.accent,
    fontWeight: 600,
    transition: 'all 0.8s ease',
  } as CSSProperties,
  
  reactiveSection: {
    background: `linear-gradient(90deg, ${colors.accentDark}80, ${colors.accentDark}20)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: spacing.lg,
    color: colors.accentDark,
    fontWeight: 600,
    transition: 'all 0.8s ease',
  } as CSSProperties,
  
  indicator: {
    position: 'absolute',
    top: '50%',
    width: '16px',
    height: '16px',
    backgroundColor: colors.text,
    borderRadius: '50%',
    transform: 'translateY(-50%)',
    border: `3px solid ${colors.accent}`,
    boxShadow: `0 0 12px ${colors.accent}40`,
    transition: 'all 0.8s ease',
    zIndex: 2,
  } as CSSProperties,
  
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  statCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    textAlign: 'center',
  } as CSSProperties,
  
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: colors.accent,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  statLabel: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  examplesSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg,
    marginTop: spacing.xl,
  } as CSSProperties,
  
  exampleCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  exampleTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: spacing.sm,
    color: colors.accent,
  } as CSSProperties,
  
  exampleText: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
    padding: spacing.xs,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderRadius: '4px',
    borderLeft: `3px solid ${colors.accent}`,
  } as CSSProperties,

  '@media (max-width: 768px)': {
    statsGrid: {
      gridTemplateColumns: '1fr',
    },
    examplesSection: {
      gridTemplateColumns: '1fr',
    },
    scaleContainer: {
      height: '60px',
    },
  },
};

export const ProactiveReactiveScale: React.FC<ProactiveReactiveScaleProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const indicator = container.querySelector('.scale-indicator') as HTMLElement;
    const proactiveSection = container.querySelector('.proactive-section') as HTMLElement;
    const reactiveSection = container.querySelector('.reactive-section') as HTMLElement;

    if (!indicator || !proactiveSection || !reactiveSection) return;

    // Animate the scale
    const animate = () => {
      const proactivePercentage = data.proactive_score || 50;
      const reactivePercentage = 100 - proactivePercentage;
      
      // Position indicator
      const indicatorPosition = (proactivePercentage / 100) * 100;
      indicator.style.left = `calc(${indicatorPosition}% - 8px)`;
      
      // Size sections
      proactiveSection.style.width = `${proactivePercentage}%`;
      reactiveSection.style.width = `${reactivePercentage}%`;
    };

    // Start animation after a short delay
    setTimeout(animate, 300);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data]);

  const proactiveScore = data.proactive_score || 50;
  const reactiveScore = data.reactive_score || 50;

  return (
    <div ref={containerRef} style={styles.container}>
      <h3 style={styles.title}>Proactive vs Reactive Communication</h3>
      
      <div style={styles.labels}>
        <span>← Reactive (Responds)</span>
        <span>Proactive (Initiates) →</span>
      </div>
      
      <div style={styles.scaleContainer}>
        <div style={styles.scaleTrack}>
          <div 
            className="proactive-section"
            style={{
              ...styles.proactiveSection,
              width: `${proactiveScore}%`
            }}
          >
            Proactive
          </div>
          <div 
            className="reactive-section"
            style={{
              ...styles.reactiveSection,
              width: `${reactiveScore}%`
            }}
          >
            Reactive
          </div>
        </div>
        <div 
          className="scale-indicator"
          style={{
            ...styles.indicator,
            left: `calc(${proactiveScore}% - 8px)`
          }}
        />
      </div>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{proactiveScore}%</div>
          <div style={styles.statLabel}>Proactive Score</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{reactiveScore}%</div>
          <div style={styles.statLabel}>Reactive Score</div>
        </div>
      </div>

      {data.examples && (
        <div style={styles.examplesSection}>
          <div style={styles.exampleCard}>
            <div style={styles.exampleTitle}>Proactive Examples</div>
            {data.examples.proactive?.slice(0, 3).map((example, index) => (
              <div key={index} style={styles.exampleText}>
                "{example}"
              </div>
            ))}
          </div>
          <div style={styles.exampleCard}>
            <div style={styles.exampleTitle}>Reactive Examples</div>
            {data.examples.reactive?.slice(0, 3).map((example, index) => (
              <div key={index} style={styles.exampleText}>
                "{example}"
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};