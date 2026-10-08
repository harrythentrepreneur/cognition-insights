import React from 'react';
import { CSSProperties } from 'react';

interface ComingSoonOverlayProps {
  feature?: string;
  subMessage?: string;
}

/**
 * Coming Soon Overlay Component
 * Displays a full-screen overlay indicating a feature is being enhanced
 */
export default function ComingSoonOverlay({ 
  feature = "This feature", 
  subMessage = "We're enhancing this feature to provide you with even better insights."
}: ComingSoonOverlayProps) {
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(26, 26, 46, 0.95)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    } as CSSProperties,
    
    container: {
      maxWidth: '500px',
      textAlign: 'center',
      animation: 'fadeIn 0.8s ease-out',
    } as CSSProperties,
    
    icon: {
      width: '80px',
      height: '80px',
      margin: '0 auto 24px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 255, 230, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid rgba(0, 255, 230, 0.3)',
    } as CSSProperties,
    
    iconSvg: {
      width: '40px',
      height: '40px',
      color: '#00FFE6',
    } as CSSProperties,
    
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: '16px',
      lineHeight: '1.3',
    } as CSSProperties,
    
    subtitle: {
      fontSize: '18px',
      color: '#B8B8D0',
      marginBottom: '32px',
      lineHeight: '1.5',
    } as CSSProperties,
    
    badge: {
      display: 'inline-block',
      padding: '8px 20px',
      backgroundColor: 'rgba(0, 255, 230, 0.1)',
      border: '1px solid rgba(0, 255, 230, 0.3)',
      borderRadius: '24px',
      color: '#00FFE6',
      fontSize: '14px',
      fontWeight: '500',
      letterSpacing: '0.5px',
    } as CSSProperties,
  };

  // Add keyframe animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.icon}>
          <svg style={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path d="M9 16h6M9 12h6" strokeLinecap="round" />
          </svg>
        </div>
        
        <h2 style={styles.title}>
          {feature} is Being Enhanced
        </h2>
        
        <p style={styles.subtitle}>
          {subMessage}
        </p>
        
        <div style={styles.badge}>
          Coming Soon
        </div>
      </div>
    </div>
  );
}