'use client';

import React, { useState, useEffect } from 'react';

interface ResultsStepProps {
  sessionId?: string;
  onStartOver?: () => void;
}

export default function ResultsStep({ sessionId, onStartOver }: ResultsStepProps) {
  // Animation states
  const [isLoaded, setIsLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [headerLoaded, setHeaderLoaded] = useState(false);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [buttonsLoaded, setButtonsLoaded] = useState(false);

  useEffect(() => {
    // Staggered celebration animations
    const timer1 = setTimeout(() => setIsLoaded(true), 200);
    const timer2 = setTimeout(() => setLogoLoaded(true), 500);
    const timer3 = setTimeout(() => setHeaderLoaded(true), 800);
    const timer4 = setTimeout(() => setCardsLoaded(true), 1200);
    const timer5 = setTimeout(() => setButtonsLoaded(true), 1600);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

  return (
    <div style={{
      backgroundColor: '#F5F2F0',
      minHeight: '100vh',
      width: '100vw',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      margin: 0,
      padding: '40px 24px',
      fontFamily: '"Inter", sans-serif',
      fontSize: '12px',
      lineHeight: '1.15',
      textSizeAdjust: '100%' as any,
      WebkitFontSmoothing: 'antialiased' as any,
      MozOsxFontSmoothing: 'grayscale' as any,
      boxSizing: 'border-box',
      position: 'relative',
      transform: isLoaded ? 'translateY(0px)' : 'translateY(15px)',
      opacity: isLoaded ? 1 : 0,
      transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      willChange: 'transform, opacity'
    }}>
      {/* Celebration particles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0
      }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              background: 'rgba(61, 0, 0, 0.3)',
              borderRadius: '50%',
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              opacity: headerLoaded ? 0.6 : 0,
              animation: headerLoaded ? `celebrate${i} ${3 + i * 0.3}s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        textAlign: 'center',
        marginBottom: '48px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo */}
        <div style={{
          marginBottom: '32px',
          opacity: logoLoaded ? 0.8 : 0,
          transform: logoLoaded ? 'translateY(0px) scale(1)' : 'translateY(20px) scale(0.9)',
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform, opacity'
        }}>
          <img 
            src="/logos/cognition.cv.svg"
            alt="Cognition.CV"
            style={{
              height: '24px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'brightness(0) saturate(100%)'
            }}
          />
        </div>

        {/* Success Message */}
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 48px)',
          fontWeight: 400,
          color: 'rgb(61, 0, 0)',
          lineHeight: '1.2',
          margin: '0 0 16px 0',
          fontFamily: '"Inter", sans-serif',
          WebkitFontSmoothing: 'antialiased' as any,
          MozOsxFontSmoothing: 'grayscale' as any,
          textSizeAdjust: '100%' as any,
          boxSizing: 'border-box',
          opacity: headerLoaded ? 1 : 0,
          transform: headerLoaded ? 'translateY(0px)' : 'translateY(25px)',
          transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform, opacity'
        }}>
          Your Analysis is Complete
        </h1>

        <p style={{
          fontSize: '20px',
          color: 'rgb(61, 0, 0)',
          lineHeight: '1.4',
          margin: 0,
          fontWeight: 400,
          fontFamily: '"Inter", sans-serif',
          WebkitFontSmoothing: 'antialiased' as any,
          MozOsxFontSmoothing: 'grayscale' as any,
          textSizeAdjust: '100%' as any,
          boxSizing: 'border-box',
          opacity: headerLoaded ? 0.8 : 0,
          transform: headerLoaded ? 'translateY(0px)' : 'translateY(20px)',
          transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s',
          willChange: 'transform, opacity'
        }}>
                      We&apos;ve uncovered fascinating insights about your emotional journey and communication patterns.
        </p>
      </div>

      {/* Analysis Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '1000px',
        marginBottom: '48px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Emotional Landscapes Card */}
        <a 
          href={`/emotional-landscapes?session=${sessionId || 'demo-session'}`}
          style={{
            textDecoration: 'none',
            display: 'block',
            opacity: cardsLoaded ? 1 : 0,
            transform: cardsLoaded ? 'translateY(0px) scale(1)' : 'translateY(30px) scale(0.95)',
            transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, opacity'
          }}
        >
          <div style={{
            padding: '32px',
            backgroundColor: 'rgba(61, 0, 0, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(61, 0, 0, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            height: '100%',
            boxShadow: '0 4px 20px rgba(61, 0, 0, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.08)';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(61, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.05)';
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(61, 0, 0, 0.08)';
          }}
          >
            {/* Card shimmer effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
              animation: cardsLoaded ? 'shimmer 2s ease-in-out 0.5s' : 'none'
            }} />
            
            <h3 style={{
              fontSize: '24px',
              fontWeight: 500,
              color: 'rgb(61, 0, 0)',
              margin: '0 0 16px 0',
              fontFamily: '"Inter", sans-serif',
              position: 'relative',
              zIndex: 1
            }}>
              🌅 Emotional Landscapes
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgb(61, 0, 0)',
              opacity: 0.7,
              margin: '0 0 20px 0',
              fontFamily: '"Inter", sans-serif',
              lineHeight: '1.5',
              position: 'relative',
              zIndex: 1
            }}>
              Explore the visual representation of your emotional journey through time. See how your moods and feelings have evolved.
            </p>
            <div style={{
              fontSize: '14px',
              color: 'rgb(61, 0, 0)',
              fontWeight: 500,
              opacity: 0.8,
              position: 'relative',
              zIndex: 1
            }}>
              View Analysis →
            </div>
          </div>
        </a>

        {/* Coming Soon Cards */}
        <div style={{
          padding: '32px',
          backgroundColor: 'rgba(61, 0, 0, 0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(61, 0, 0, 0.08)',
          opacity: cardsLoaded ? 0.6 : 0,
          transform: cardsLoaded ? 'translateY(0px) scale(1)' : 'translateY(30px) scale(0.95)',
          transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
          willChange: 'transform, opacity',
          boxShadow: '0 2px 12px rgba(61, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'rgb(61, 0, 0)',
            margin: '0 0 16px 0',
            fontFamily: '"Inter", sans-serif'
          }}>
            💬 Language Patterns
          </h3>
          <p style={{
            fontSize: '16px',
            color: 'rgb(61, 0, 0)',
            opacity: 0.7,
            margin: '0 0 20px 0',
            fontFamily: '"Inter", sans-serif',
            lineHeight: '1.5'
          }}>
            Discover your unique communication style and how your language use has changed over time.
          </p>
          <div style={{
            fontSize: '14px',
            color: 'rgb(61, 0, 0)',
            fontWeight: 500,
            opacity: 0.5
          }}>
            Coming Soon
          </div>
        </div>

        <div style={{
          padding: '32px',
          backgroundColor: 'rgba(61, 0, 0, 0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(61, 0, 0, 0.08)',
          opacity: cardsLoaded ? 0.6 : 0,
          transform: cardsLoaded ? 'translateY(0px) scale(1)' : 'translateY(30px) scale(0.95)',
          transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s',
          willChange: 'transform, opacity',
          boxShadow: '0 2px 12px rgba(61, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'rgb(61, 0, 0)',
            margin: '0 0 16px 0',
            fontFamily: '"Inter", sans-serif'
          }}>
            🔗 Relationship Networks
          </h3>
          <p style={{
            fontSize: '16px',
            color: 'rgb(61, 0, 0)',
            opacity: 0.7,
            margin: '0 0 20px 0',
            fontFamily: '"Inter", sans-serif',
            lineHeight: '1.5'
          }}>
            Visualize your social connections and see how your relationships have developed over time.
          </p>
          <div style={{
            fontSize: '14px',
            color: 'rgb(61, 0, 0)',
            fontWeight: 500,
            opacity: 0.5
          }}>
            Coming Soon
          </div>
        </div>

        <div style={{
          padding: '32px',
          backgroundColor: 'rgba(61, 0, 0, 0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(61, 0, 0, 0.08)',
          opacity: cardsLoaded ? 0.6 : 0,
          transform: cardsLoaded ? 'translateY(0px) scale(1)' : 'translateY(30px) scale(0.95)',
          transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
          willChange: 'transform, opacity',
          boxShadow: '0 2px 12px rgba(61, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'rgb(61, 0, 0)',
            margin: '0 0 16px 0',
            fontFamily: '"Inter", sans-serif'
          }}>
            🧠 Personality Analysis
          </h3>
          <p style={{
            fontSize: '16px',
            color: 'rgb(61, 0, 0)',
            opacity: 0.7,
            margin: '0 0 20px 0',
            fontFamily: '"Inter", sans-serif',
            lineHeight: '1.5'
          }}>
            Understand your personality traits and how they manifest in your digital communications.
          </p>
          <div style={{
            fontSize: '14px',
            color: 'rgb(61, 0, 0)',
            fontWeight: 500,
            opacity: 0.5
          }}>
            Coming Soon
          </div>
        </div>

        <div style={{
          padding: '32px',
          backgroundColor: 'rgba(61, 0, 0, 0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(61, 0, 0, 0.08)',
          opacity: cardsLoaded ? 0.6 : 0,
          transform: cardsLoaded ? 'translateY(0px) scale(1)' : 'translateY(30px) scale(0.95)',
          transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s',
          willChange: 'transform, opacity',
          boxShadow: '0 2px 12px rgba(61, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'rgb(61, 0, 0)',
            margin: '0 0 16px 0',
            fontFamily: '"Inter", sans-serif'
          }}>
            📈 Growth Journey
          </h3>
          <p style={{
            fontSize: '16px',
            color: 'rgb(61, 0, 0)',
            opacity: 0.7,
            margin: '0 0 20px 0',
            fontFamily: '"Inter", sans-serif',
            lineHeight: '1.5'
          }}>
            Track your personal development and emotional growth through your conversation history.
          </p>
          <div style={{
            fontSize: '14px',
            color: 'rgb(61, 0, 0)',
            fontWeight: 500,
            opacity: 0.5
          }}>
            Coming Soon
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        opacity: buttonsLoaded ? 1 : 0,
        transform: buttonsLoaded ? 'translateY(0px)' : 'translateY(20px)',
        transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform, opacity',
        position: 'relative',
        zIndex: 1
      }}>
        {onStartOver && (
          <button
            onClick={onStartOver}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: 'rgb(61, 0, 0)',
              border: '2px solid rgba(61, 0, 0, 0.3)',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: '"Inter", sans-serif',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(61, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.3)';
              e.currentTarget.style.transform = 'translateY(0px)';
            }}
          >
            Start New Analysis
          </button>
        )}
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        @keyframes celebrate0 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px) rotate(180deg); opacity: 0.8; }
        }
        @keyframes celebrate1 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-15px) translateX(-8px) rotate(-180deg); opacity: 0.7; }
        }
        @keyframes celebrate2 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.2; }
          50% { transform: translateY(-25px) translateX(5px) rotate(270deg); opacity: 0.6; }
        }
        @keyframes celebrate3 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.35; }
          50% { transform: translateY(-18px) translateX(-12px) rotate(-90deg); opacity: 0.75; }
        }
        @keyframes celebrate4 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.25; }
          50% { transform: translateY(-22px) translateX(15px) rotate(360deg); opacity: 0.65; }
        }
        @keyframes celebrate5 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-12px) translateX(-5px) rotate(45deg); opacity: 0.7; }
        }
        @keyframes celebrate6 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-28px) translateX(8px) rotate(-45deg); opacity: 0.8; }
        }
        @keyframes celebrate7 {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.2; }
          50% { transform: translateY(-16px) translateX(-10px) rotate(135deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
} 