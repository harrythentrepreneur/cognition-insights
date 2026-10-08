'use client';

import React, { useEffect, useState } from 'react';

interface DarkLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export default function DarkLoadingScreen({ message = "Loading your journey...", subMessage }: DarkLoadingScreenProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsActive(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getAnimationStyle = (isActive: boolean) => ({
    opacity: isActive ? 1 : 0.001,
    transform: isActive ? 'translate(-50%, -50%) translateY(0px)' : 'translate(-50%, -50%) translateY(-24px)',
    transition: 'opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    willChange: 'transform, opacity'
  });

  return (
    <>
      <style jsx>{`
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

        * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
      
      <div style={{
        backgroundColor: '#1A1A2E',
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
        zIndex: 9999
      }}>
        <section style={{
          alignContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #1A1A2E 0%, #232340 100%)',
          borderBottomLeftRadius: '40px',
          borderBottomRightRadius: '40px',
          display: 'flex',
          flex: 'none',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          gap: '0px',
          height: '100vh',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '0px',
          position: 'relative',
          width: '100%',
          willChange: 'transform'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                ...getAnimationStyle(isActive)
              }}
            >
              <div style={{
                fontSize: '24px',
                color: '#B8B8D0',
                lineHeight: '1.3',
                margin: 0,
                fontWeight: 400,
                fontFamily: 'Satoshi, sans-serif',
                opacity: 0.8,
                WebkitFontSmoothing: 'antialiased',
                textAlign: 'center',
                maxWidth: '600px'
              }}>
                {message}
              </div>
              {subMessage && (
                <div style={{
                  fontSize: '16px',
                  color: '#8888A0',
                  lineHeight: '1.4',
                  margin: 0,
                  marginTop: '16px',
                  fontWeight: 400,
                  fontFamily: 'Satoshi, sans-serif',
                  opacity: 0.6,
                  WebkitFontSmoothing: 'antialiased',
                  textAlign: 'center',
                  maxWidth: '500px'
                }}>
                  {subMessage}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}