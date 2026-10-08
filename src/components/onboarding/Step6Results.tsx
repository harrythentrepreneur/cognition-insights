'use client';

import React, { useState, useEffect } from 'react';
import { AnimationState } from './shared/types';
import { 
  basePageStyle, 
  headingStyle, 
  bodyTextStyle, 
  logoStyle, 
  buttonStyle, 
  secondaryButtonStyle,
  generateFontFaces,
  SPACING,
  COLORS 
} from './shared/styles';
import { 
  celebrationKeyframes, 
  createCelebrationParticleStyle, 
  createLoadedElementStyle 
} from './shared/animations';

interface ResultsStepProps {
  sessionId?: string;
  onStartOver: () => void;
}

export default function ResultsStep({ sessionId, onStartOver }: ResultsStepProps) {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isLoaded: false,
    logoLoaded: false,
    headerLoaded: false,
    cardsLoaded: false,
    buttonsLoaded: false
  });

  // Debug logging
  useEffect(() => {
    console.log('[Step6Results] Component mounted with sessionId:', sessionId);
    console.log('[Step6Results] Type of sessionId:', typeof sessionId);
    console.log('[Step6Results] Is valid sessionId:', !!sessionId && sessionId !== 'demo-session');
  }, [sessionId]);

  useEffect(() => {
    // Staggered celebration animations
    const timers = [
      setTimeout(() => setAnimationState(prev => ({ ...prev, isLoaded: true })), 200),
      setTimeout(() => setAnimationState(prev => ({ ...prev, logoLoaded: true })), 500),
      setTimeout(() => setAnimationState(prev => ({ ...prev, headerLoaded: true })), 800),
      setTimeout(() => setAnimationState(prev => ({ ...prev, cardsLoaded: true })), 1200),
      setTimeout(() => setAnimationState(prev => ({ ...prev, buttonsLoaded: true })), 1600)
    ];
    
    return () => timers.forEach(clearTimeout);
  }, []);

  const animationStyles = `
    ${generateFontFaces()}
    ${celebrationKeyframes}
  `;

  const celebrationParticles = Array.from({ length: 8 }, (_, i) => (
    <div
      key={i}
      style={createCelebrationParticleStyle(i, animationState.headerLoaded)}
    />
  ));

  const analysisCards = [
    {
      title: "Emotional Landscapes",
      description: "Explore the emotional terrain of your conversations through beautiful, interactive visualizations.",
      link: `/emotional-landscapes?session=${sessionId || 'demo-session'}`,
      gradient: "linear-gradient(135deg, rgba(61, 0, 0, 0.1) 0%, rgba(255, 224, 224, 0.3) 100%)"
    },
    {
      title: "Language Patterns",
      description: "Discover the unique patterns and rhythms in your communication style.",
      link: `/language-patterns?session=${sessionId || 'demo-session'}`,
      gradient: "linear-gradient(135deg, rgba(61, 0, 0, 0.08) 0%, rgba(255, 240, 240, 0.3) 100%)"
    },
    {
      title: "Personality Analysis",
      description: "Uncover insights into your personality traits through conversation analysis.",
      link: `/personality-analysis?session=${sessionId || 'demo-session'}`,
      gradient: "linear-gradient(135deg, rgba(61, 0, 0, 0.12) 0%, rgba(255, 230, 230, 0.3) 100%)"
    },
    {
      title: "Growth Journey",
      description: "Track your personal development through conversation evolution over time.",
      link: `/growth-journey?session=${sessionId || 'demo-session'}`,
      gradient: "linear-gradient(135deg, rgba(61, 0, 0, 0.06) 0%, rgba(255, 250, 250, 0.3) 100%)"
    },
    {
      title: "Relationships Network",
      description: "Visualize your communication network and relationship dynamics.",
      link: `/relationships-network?session=${sessionId || 'demo-session'}`,
      gradient: "linear-gradient(135deg, rgba(61, 0, 0, 0.1) 0%, rgba(255, 235, 235, 0.3) 100%)"
    }
  ];

  return (
    <>
      <style jsx>{animationStyles}</style>

      <div style={{
        ...basePageStyle,
        position: 'relative',
        ...createLoadedElementStyle(animationState.isLoaded)
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
          {celebrationParticles}
        </div>

        {/* Header */}
        <header style={{
          width: '100%',
          maxWidth: '800px',
          textAlign: 'center',
          marginBottom: SPACING.SECTION_GAP,
          position: 'relative',
          zIndex: 1
        }}>
          {/* Logo */}
          <div style={{
            marginBottom: '32px',
            ...createLoadedElementStyle(animationState.logoLoaded, 0, 'scaleIn')
          }}>
            <img 
              src="/logos/cognition.cv.svg"
              alt="Cognition.CV"
              style={logoStyle}
            />
          </div>

          {/* Success Message */}
          <h1 style={{
            ...headingStyle,
            ...createLoadedElementStyle(animationState.headerLoaded)
          }}>
            Your Analysis is Complete
          </h1>

          <p style={{
            ...bodyTextStyle,
            opacity: 0.8,
            ...createLoadedElementStyle(animationState.headerLoaded, 0.2)
          }}>
            We&apos;ve uncovered fascinating insights about your emotional journey and communication patterns.
          </p>
        </header>

        {/* Analysis Cards */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: SPACING.CARD_GAP,
          width: '100%',
          maxWidth: '1000px',
          marginBottom: SPACING.SECTION_GAP,
          position: 'relative',
          zIndex: 1
        }}>
          {analysisCards.map((card, index) => (
            <a 
              key={card.title}
              href={card.link}
              style={{
                textDecoration: 'none',
                display: 'block',
                ...createLoadedElementStyle(animationState.cardsLoaded, index * 0.1, 'scaleIn')
              }}
            >
              <article style={{
                padding: '32px',
                background: card.gradient,
                borderRadius: '16px',
                border: `1px solid ${COLORS.CARD_BORDER}`,
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                height: '100%',
                boxShadow: '0 4px 20px rgba(61, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.background = card.gradient.replace('0.1', '0.15').replace('0.08', '0.12');
                target.style.transform = 'translateY(-4px)';
                target.style.boxShadow = '0 8px 32px rgba(61, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.background = card.gradient;
                target.style.transform = 'translateY(0px)';
                target.style.boxShadow = '0 4px 20px rgba(61, 0, 0, 0.08)';
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 500,
                  color: COLORS.PRIMARY_TEXT,
                  margin: '0 0 16px 0',
                  fontFamily: 'Satoshi, sans-serif'
                }}>
                  {card.title}
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: COLORS.PRIMARY_TEXT,
                  opacity: 0.8,
                  lineHeight: '1.5',
                  margin: 0,
                  fontFamily: '"Inter", sans-serif'
                }}>
                  {card.description}
                </p>
              </article>
            </a>
          ))}
        </section>

        {/* Action Buttons */}
        <footer style={{
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.ELEMENT_GAP,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          ...createLoadedElementStyle(animationState.buttonsLoaded)
        }}>
          {/* Secondary action buttons */}
          <div style={{
            display: 'flex',
            gap: SPACING.ELEMENT_GAP,
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <a 
              href={`/emotional-landscapes?session=${sessionId || 'demo-session'}`}
              style={{
                ...buttonStyle,
                marginBottom: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.PRIMARY_TEXT;
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = COLORS.PRIMARY_TEXT;
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              Explore Your Insights
            </a>
            
            <button 
              onClick={onStartOver}
              style={{
                ...buttonStyle,
                marginBottom: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.PRIMARY_TEXT;
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = COLORS.PRIMARY_TEXT;
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              Start New Analysis
            </button>
          </div>
        </footer>
      </div>
    </>
  );
} 