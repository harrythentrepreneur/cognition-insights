'use client';

import React, { useState, useEffect } from 'react';
// TEMPORARY: Clerk bypassed
// import { useUser } from '@clerk/nextjs';

interface WelcomeStepProps {
  onContinue: () => void;
}

export default function WelcomeStep({ onContinue }: WelcomeStepProps) {
  const user = { firstName: 'there', emailAddresses: [] as { emailAddress: string }[] }; // Stub
  const [isLoaded, setIsLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [headingLoaded, setHeadingLoaded] = useState(false);
  const [subtitleLoaded, setSubtitleLoaded] = useState(false);
  const [buttonLoaded, setButtonLoaded] = useState(false);

  useEffect(() => {
    // Staggered animation sequence
    const timer1 = setTimeout(() => setIsLoaded(true), 200);
    const timer2 = setTimeout(() => setLogoLoaded(true), 400);
    const timer3 = setTimeout(() => setHeadingLoaded(true), 700);
    const timer4 = setTimeout(() => setSubtitleLoaded(true), 1000);
    const timer5 = setTimeout(() => setButtonLoaded(true), 1300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

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
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @media (max-width: 768px) {
          .welcome-subtitle {
            padding: 0 20px;
            font-size: 18px !important;
            line-height: 1.3 !important;
          }
          
          .desktop-break {
            display: none;
          }
        }
      `}</style>

      <div style={{
        backgroundColor: '#F5F2F0',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        fontFamily: '"Inter", sans-serif',
        fontSize: '12px',
        lineHeight: '1.15',
        textSizeAdjust: '100%' as any,
        WebkitFontSmoothing: 'antialiased' as any,
        MozOsxFontSmoothing: 'grayscale' as any,
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        willChange: 'transform'
      }}>
        {/* Background Gradient Animation */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #F5F2F0 0%, #F8F5F3 50%, #F5F2F0 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease-in-out infinite',
          zIndex: -1
        }} />

        {/* Main Content Container */}
        <div style={{
          alignContent: 'center',
          alignItems: 'center',
          display: 'flex',
          flex: 'none',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          gap: '16px',
          height: 'min-content',
          justifyContent: 'center',
          overflow: 'visible',
          padding: 0,
          position: 'relative',
          width: '100%',
          transform: isLoaded ? 'translateY(0px)' : 'translateY(20px)',
          opacity: isLoaded ? 1 : 0,
          transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform, opacity'
        }}>
          {/* Logo */}
          <div style={{
            opacity: logoLoaded ? 0.8 : 0,
            transform: logoLoaded ? 'translateY(0px) scale(1)' : 'translateY(15px) scale(0.95)',
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

          {/* Main Content */}
          <div style={{
            alignContent: 'center',
            alignItems: 'center',
            display: 'flex',
            flex: 'none',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            gap: '16px',
            height: 'min-content',
            justifyContent: 'center',
            overflow: 'visible',
            padding: 0,
            position: 'relative',
            width: '100%',
            textAlign: 'center',
            maxWidth: '600px'
          }}>
            {/* Main Heading */}
            <h1 style={{
              fontSize: 'clamp(36px, 7vw, 72px)',
              fontWeight: 400,
              color: 'rgb(61, 0, 0)',
              lineHeight: '1.15',
              margin: 0,
              fontFamily: '"Inter", sans-serif',
              WebkitFontSmoothing: 'antialiased' as any,
              MozOsxFontSmoothing: 'grayscale' as any,
              textSizeAdjust: '100%' as any,
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              opacity: headingLoaded ? 1 : 0,
              transform: headingLoaded ? 'translateY(0px)' : 'translateY(25px)',
              transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              willChange: 'transform, opacity'
            }}>
              Welcome, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'there'}
            </h1>

            {/* Subtitle - Updated to match HTML format */}
            <div className="welcome-subtitle" style={{
              fontSize: '20px',
              color: 'rgb(61, 0, 0)',
              lineHeight: '1.15',
              margin: 0,
              fontWeight: 400,
              fontFamily: '"Inter", sans-serif',
              opacity: subtitleLoaded ? 0.8 : 0,
              WebkitFontSmoothing: 'antialiased' as any,
              MozOsxFontSmoothing: 'grayscale' as any,
              textSizeAdjust: '100%' as any,
              boxSizing: 'border-box',
              transform: subtitleLoaded ? 'translateY(0px)' : 'translateY(20px)',
              transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              willChange: 'transform, opacity',
              textAlign: 'center'
            }}>
              Your emotional story awaits. Let&apos;s begin the journey of<br className="desktop-break" />
              discovering the narrative woven into your conversations.
            </div>

            {/* CTA Button - Updated to match HTML exactly */}
            <button
              onClick={onContinue}
              style={{
                padding: '12px 20px',
                backgroundColor: 'rgb(61, 0, 0)',
                color: 'rgb(255, 255, 255)',
                border: '2px solid rgb(61, 0, 0)',
                borderRadius: '187px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
                lineHeight: '1.3',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                overflow: 'hidden',
                width: 'min-content',
                height: 'min-content',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: buttonLoaded ? 1 : 0.001,
                transform: buttonLoaded ? 'translateY(0px)' : 'translateY(-24px)',
                willChange: 'transform'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgb(61, 0, 0)';
                e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(61, 0, 0)';
                e.currentTarget.style.color = 'rgb(255, 255, 255)';
                e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
              }}
            >
              <strong style={{ fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif' }}>
                Continue Journey
              </strong>
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 