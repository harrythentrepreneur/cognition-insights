'use client';

import React, { useState, useEffect } from 'react';

interface JourneyStepProps {
  onContinue: () => void;
}

export default function JourneyStep({ onContinue }: JourneyStepProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);

  // Trigger animations after a short delay
  useEffect(() => {
    const timer1 = setTimeout(() => setIsLoaded(true), 300);
    const timer2 = setTimeout(() => setVideoLoaded(true), 600);
    const timer3 = setTimeout(() => setButtonVisible(true), 2000); // Matches the original delay
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
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
        
        @keyframes float0 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-15px) translateX(5px); opacity: 0.6; }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
          50% { transform: translateY(-20px) translateX(-8px); opacity: 0.7; }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-12px) translateX(10px); opacity: 0.5; }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.35; }
          50% { transform: translateY(-18px) translateX(-5px); opacity: 0.65; }
        }
        @keyframes float4 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.25; }
          50% { transform: translateY(-14px) translateX(8px); opacity: 0.55; }
        }
        @keyframes float5 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-16px) translateX(-3px); opacity: 0.6; }
        }
      `}</style>

      <div style={{
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
        {/* Background Color Overlay - Smooth transition from Step1Welcome */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#F5F2F0', // Exact same color as Step1Welcome
          zIndex: -2,
          opacity: videoLoaded ? 0 : 1,
          transition: 'opacity 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'opacity'
        }} />

        {/* Video Background with enhanced transitions */}
        <video
          src="/videos/background-video.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1,
            opacity: videoLoaded ? 1 : 0,
            transform: videoLoaded ? 'scale(1)' : 'scale(1.05)',
            transition: 'all 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform, opacity'
          }}
        />

        {/* Overlay for better contrast */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
          zIndex: 0,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 2s ease-out'
        }} />

        {/* Animated Button - Updated to match HTML exactly with hover effects */}
        <button
          onClick={buttonVisible ? onContinue : undefined}
          disabled={!buttonVisible}
          style={{
            position: 'absolute',
            top: '80%',
            left: '50%',
            transform: buttonVisible 
              ? 'translateX(-50%) translateY(-50%)' 
              : 'translateX(-50%) translateY(calc(-50% - 24px))',
            opacity: buttonVisible ? 1 : 0.001,
            transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform', // Exact match from HTML
            
            // Exact styling matching the HTML example
            padding: '12px 20px',
            backgroundColor: 'rgb(61, 0, 0)',
            color: 'rgb(255, 255, 255)',
            border: '2px solid rgb(61, 0, 0)',
            borderRadius: '187px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: buttonVisible ? 'pointer' : 'default',
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
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            // Only apply hover effect when button is visible
            if (!buttonVisible) return;
            
            // Exact hover effect from HTML example
            e.currentTarget.style.transform = 'translateX(-50%) translateY(calc(-50% - 2px)) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(61, 0, 0, 0.3)';
            e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          }}
          onMouseLeave={(e) => {
            // Only apply hover effect when button is visible
            if (!buttonVisible) return;
            
            // Return to normal state
            e.currentTarget.style.transform = 'translateX(-50%) translateY(-50%) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          }}
        >
          <strong style={{ fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif' }}>
            Upload Your Life&apos;s Journey
          </strong>
        </button>

        {/* Floating particles for added visual interest */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: isLoaded ? 0.6 : 0,
          transition: 'opacity 3s ease-out'
        }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '4px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
                animation: `float${i} ${4 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
} 