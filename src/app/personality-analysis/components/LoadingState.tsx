import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface LoadingStateProps {
  message?: string;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: spacing.xxl,
    textAlign: 'center',
  } as CSSProperties,
  
  spinner: {
    width: '60px',
    height: '60px',
    border: `3px solid ${colors.border}`,
    borderTop: `3px solid ${colors.accent}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  message: {
    fontSize: '1.125rem',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  submessage: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    opacity: 0.7,
  } as CSSProperties,
  
  pulseContainer: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.lg,
  } as CSSProperties,
  
  pulseDot: {
    width: '8px',
    height: '8px',
    backgroundColor: colors.accent,
    borderRadius: '50%',
    animation: 'pulse 1.4s ease-in-out infinite',
  } as CSSProperties,
};

// Add keyframes for animations
const styleSheet = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 60%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    30% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .pulse-dot:nth-child(1) { animation-delay: 0s; }
  .pulse-dot:nth-child(2) { animation-delay: 0.2s; }
  .pulse-dot:nth-child(3) { animation-delay: 0.4s; }
`;

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Analyzing your personality...' 
}) => {
  React.useEffect(() => {
    // Inject keyframes if not already present
    if (!document.getElementById('personality-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'personality-loading-styles';
      style.textContent = styleSheet;
      document.head.appendChild(style);
    }
    
    return () => {
      // Cleanup on unmount
      const style = document.getElementById('personality-loading-styles');
      if (style) {
        style.remove();
      }
    };
  }, []);
  
  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
      <div style={styles.message}>{message}</div>
      <div style={styles.submessage}>
        This may take 30-60 seconds as we generate personalized insights
      </div>
      <div style={styles.pulseContainer}>
        <div style={styles.pulseDot} className="pulse-dot" />
        <div style={styles.pulseDot} className="pulse-dot" />
        <div style={styles.pulseDot} className="pulse-dot" />
      </div>
    </div>
  );
};