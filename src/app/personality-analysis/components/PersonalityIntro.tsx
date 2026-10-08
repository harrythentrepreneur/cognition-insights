'use client';

import React from 'react';
import { UI_CONSTANTS } from '../constants';

interface PersonalityIntroProps {
  userName?: string;
  sessionId?: string;
  onBeginAnalysis: () => void;
  animationState: {
    isLoaded: boolean;
    imageLoaded: boolean;
    headingLoaded: boolean;
    subtitleLoaded: boolean;
    buttonLoaded: boolean;
    isTransitioning: boolean;
  };
  isTransitioning: boolean;
}

/**
 * PersonalityIntro Component
 * 
 * Displays the welcome content and hero image for the Personality Analysis intro.
 * Handles the cinematic animation sequence and transition to the analysis report.
 */
export default function PersonalityIntro({
  userName = 'there',
  sessionId,
  onBeginAnalysis,
  animationState,
  isTransitioning
}: PersonalityIntroProps) {
  
  // Debug logging
  React.useEffect(() => {
    console.log('[PersonalityIntro] Component mounted');
    console.log('  - sessionId:', sessionId);
    console.log('  - userName:', userName);
  }, [sessionId, userName]);
  
  const handleCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Trigger the beautiful transition animation first
    onBeginAnalysis();
  };

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 700;
        }
        
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 500;
        }
        
        .page-container {
          position: relative;
          min-height: 70vh;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding-top: 5vh;
          padding-left: ${UI_CONSTANTS.SPACING.CONTAINER_PADDING};
          padding-right: ${UI_CONSTANTS.SPACING.CONTAINER_PADDING};
        }

        .content-wrapper {
          width: 100%;
          max-width: none;
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          text-align: left;
          padding: 0;
          padding-bottom: 4rem;
          gap: 0;
          position: relative;
        }

        .text-content {
          flex: 1;
          max-width: 650px;
          z-index: ${UI_CONSTANTS.Z_INDEX.CONTENT};
          padding-top: 3rem;
        }

        .image-content {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-60%);
          z-index: ${UI_CONSTANTS.Z_INDEX.BACKGROUND};
        }

        @media (max-width: ${UI_CONSTANTS.BREAKPOINTS.TABLET}px) {
          .content-wrapper {
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 650px;
            margin: 0 auto;
          }

          .text-content {
            max-width: 100%;
            padding-top: 0;
            z-index: ${UI_CONSTANTS.Z_INDEX.CONTENT};
            margin-bottom: 3rem;
          }

          .image-content {
            position: relative;
            right: auto;
            top: auto;
            transform: none;
            z-index: ${UI_CONSTANTS.Z_INDEX.BACKGROUND};
            opacity: 0.7;
          }

          .page-container {
            padding-left: 2rem;
            padding-right: 2rem;
          }
        }

        @media (max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE}px) {
          .page-container {
            padding-top: 5vh;
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .text-content {
            padding-top: 0;
          }

          .image-content {
            opacity: 0.5;
            margin-top: 2rem;
          }
        }

        @keyframes float {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div className="page-container">
        <div className="content-wrapper">
          {/* Text Content */}
          <div className="text-content">
            {/* Main Content */}
            <div style={{
              fontSize: '18px',
              color: UI_CONSTANTS.COLORS.TEXT_PRIMARY,
              lineHeight: '1.7',
              margin: 0,
              marginBottom: '2rem',
              fontWeight: 400,
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              opacity: animationState.headingLoaded ? 1 : 0,
              transform: animationState.headingLoaded ? 'translateY(0px) scale(1)' : 'translateY(32px) scale(0.96)',
              filter: animationState.headingLoaded ? 'blur(0px) saturate(100%)' : 'blur(3px) saturate(120%)',
              transition: 'all 2.4s cubic-bezier(0.075, 0.82, 0.165, 1)',
              willChange: 'opacity, transform, filter',
              maxWidth: '650px',
              textAlign: 'left',
              width: '100%'
            }}>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '20px', fontWeight: 500 }}>
                Hello, {userName}.
              </p>
              
              <p style={{ margin: '0 0 1.2rem 0' }}>
                You are about to discover the architecture of your mind.<br/>
                This is not just analysis — it is a mirror.
              </p>
              
              <p style={{ margin: '0 0 1.2rem 0' }}>
                A deep reflection of your patterns, tendencies, and the subtle ways<br/>
                you move through the world and connect with others.
              </p>
              
              <p style={{ margin: '0 0 1.2rem 0' }}>
                This exploration reveals your psychological landscape,<br/>
                your emotional rhythms, and the unique signature of your character.<br/>
                Prepare to see yourself with new clarity and understanding.
              </p>
              
              <p style={{ margin: '0 0 2rem 0' }}>
                Your personality analysis awaits below —<br/>
                a comprehensive view of who you are.
              </p>
              
              <p style={{ margin: '0', fontSize: '19px', fontWeight: 500 }}>
                Ready to explore?{' '}
                <a 
                  href="#" 
                  onClick={handleCTAClick}
                  style={{ 
                    color: UI_CONSTANTS.COLORS.PRIMARY,
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '19px',
                    transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    borderBottom: `1px solid rgba(0, 229, 211, 0.4)`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    paddingBottom: '1px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = UI_CONSTANTS.COLORS.TEXT_PRIMARY;
                    const arrow = e.currentTarget.querySelector('span');
                    if (arrow) arrow.style.transform = 'translateX(3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = UI_CONSTANTS.COLORS.PRIMARY;
                    const arrow = e.currentTarget.querySelector('span');
                    if (arrow) arrow.style.transform = 'translateX(0px)';
                  }}
                >
                  Discover Your Personality
                  <span style={{ 
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ 
                        stroke: 'currentColor',
                        strokeWidth: '2',
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round'
                      }}
                    >
                      <path d="M7 13l3 3 7-7"/>
                    </svg>
                  </span>
                </a>
              </p>
            </div>
          </div>

          {/* Hero Image */}
          <div className="image-content">
            <div style={{
              opacity: animationState.imageLoaded ? 1 : 0,
              transform: animationState.imageLoaded ? 'translateY(0px) scale(1)' : 'translateY(20px) scale(0.95)',
              filter: animationState.imageLoaded ? 'blur(0px)' : 'blur(2px)',
              transition: 'all 1.8s cubic-bezier(0.075, 0.82, 0.165, 1)',
              marginTop: '0',
              position: 'relative'
            }}>
              <div style={{
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, rgba(0, 245, 212, 0.3) 0%, rgba(0, 245, 212, 0.1) 40%, transparent 70%)',
                border: '1px solid rgba(0, 245, 212, 0.2)',
                boxShadow: '0 25px 80px rgba(0, 245, 212, 0.15)',
                opacity: '0.9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Subtle animated particles */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 70% 20%, rgba(0, 245, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(0, 245, 212, 0.05) 0%, transparent 50%)',
                  animation: 'float 6s ease-in-out infinite'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}