'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// SVG Icons for each integration
// ---------------------------------------------------------------------------

const MetaIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="rgb(61, 0, 0)" fillOpacity="0.7"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="rgb(61, 0, 0)" fillOpacity="0.6"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgb(61, 0, 0)" fillOpacity="0.5"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="rgb(61, 0, 0)" fillOpacity="0.55"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgb(61, 0, 0)" fillOpacity="0.65"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.85 4.85 0 01-1-.15z" fill="rgb(61, 0, 0)" fillOpacity="0.7"/>
  </svg>
);

const StripeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.037c0 4.462 2.72 6.426 7.177 7.99 2.81 1.012 3.616 1.781 3.616 2.864 0 1.17-.976 1.896-2.756 1.896-2.096 0-5.072-1.027-7.102-2.4L3.757 23c1.89 1.095 5.178 2 8.408 2 2.612 0 4.788-.627 6.324-1.846 1.693-1.335 2.511-3.276 2.511-5.6 0-4.594-2.754-6.529-7.024-8.404z" fill="rgb(61, 0, 0)" fillOpacity="0.7"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Integration card config
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Facebook & Instagram ad performance',
    icon: <MetaIcon />,
    connected: false,
  },
  {
    id: 'google',
    name: 'Google Ads',
    description: 'Search & display campaign data',
    icon: <GoogleIcon />,
    connected: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    description: 'Short-form video ad metrics',
    icon: <TikTokIcon />,
    connected: false,
  },
  {
    id: 'stripe',
    name: 'Stripe / Shopify',
    description: 'Revenue, subscriptions & orders',
    icon: <StripeIcon />,
    connected: false,
  },
];

// ---------------------------------------------------------------------------
// VIDEO PAGE – intro with subtitle
// ---------------------------------------------------------------------------

function VideoPage({ onContinue }: { onContinue: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setIsLoaded(true), 300);
    const timer2 = setTimeout(() => setVideoLoaded(true), 600);
    const timer3 = setTimeout(() => setButtonVisible(true), 2000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const subtitle = 'Your growth story awaits. Let\u2019s begin by connecting the data behind your best-performing campaigns.';

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
        {/* Background Color Overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: '#F5F2F0', zIndex: -2,
          opacity: videoLoaded ? 0 : 1,
          transition: 'opacity 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'opacity'
        }} />

        {/* Video Background */}
        <video
          src="/videos/background-video.mp4"
          autoPlay loop muted playsInline
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover', zIndex: -1,
            opacity: videoLoaded ? 1 : 0,
            transform: videoLoaded ? 'scale(1)' : 'scale(1.05)',
            transition: 'all 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform, opacity'
          }}
        />

        {/* Overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
          zIndex: 0, opacity: isLoaded ? 1 : 0, transition: 'opacity 2s ease-out'
        }} />

        {/* Subtitle + Button container */}
        <div style={{
          position: 'absolute', top: '70%', left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '24px', zIndex: 1, width: '90%', maxWidth: '520px',
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            lineHeight: '1.5',
            textAlign: 'center',
            margin: 0,
            opacity: buttonVisible ? 1 : 0,
            transform: buttonVisible ? 'translateY(0px)' : 'translateY(15px)',
            transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform, opacity',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}>
            {subtitle}
          </p>

          <button
            onClick={buttonVisible ? onContinue : undefined}
            disabled={!buttonVisible}
            style={{
              opacity: buttonVisible ? 1 : 0.001,
              transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform',
              padding: '12px 20px', backgroundColor: 'rgb(61, 0, 0)', color: 'rgb(255, 255, 255)',
              border: '2px solid rgb(61, 0, 0)', borderRadius: '187px',
              fontSize: '16px', fontWeight: 700,
              cursor: buttonVisible ? 'pointer' : 'default',
              fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
              lineHeight: '1.3', textDecoration: 'none',
              display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: '10px', overflow: 'hidden', width: 'min-content', height: 'min-content',
              whiteSpace: 'nowrap', boxSizing: 'border-box',
              transform: buttonVisible ? 'translateY(0px)' : 'translateY(-24px)',
            }}
            onMouseEnter={(e) => {
              if (!buttonVisible) return;
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(61, 0, 0, 0.3)';
              e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }}
            onMouseLeave={(e) => {
              if (!buttonVisible) return;
              e.currentTarget.style.transform = 'translateY(0px) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }}
          >
            <strong style={{ fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif' }}>
              Continue
            </strong>
          </button>
        </div>

        {/* Floating particles */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 0,
          opacity: isLoaded ? 0.6 : 0, transition: 'opacity 3s ease-out'
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute', width: '4px', height: '4px',
              background: 'rgba(255, 255, 255, 0.3)', borderRadius: '50%',
              left: `${20 + i * 15}%`, top: `${30 + i * 10}%`,
              animation: `float${i} ${4 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`
            }} />
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// INTEGRATION CARD
// ---------------------------------------------------------------------------

function IntegrationCard({ integration, index, visible }: {
  integration: Integration;
  index: number;
  visible: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [connected, setConnected] = useState(integration.connected);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    if (connected || connecting) return;
    setConnecting(true);
    // Simulate connection
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1200);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleConnect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 24px',
        borderRadius: '16px',
        border: `1px solid ${connected ? 'rgba(61, 0, 0, 0.15)' : 'rgba(61, 0, 0, 0.08)'}`,
        backgroundColor: hovered && !connected
          ? 'rgba(61, 0, 0, 0.03)'
          : connected
            ? 'rgba(61, 0, 0, 0.02)'
            : 'transparent',
        cursor: connected ? 'default' : 'pointer',
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: visible
          ? hovered && !connected ? 'translateY(-2px)' : 'translateY(0px)'
          : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        transitionDelay: visible ? `${index * 120}ms` : '0ms',
        boxShadow: hovered && !connected
          ? '0 4px 20px rgba(61, 0, 0, 0.06)'
          : '0 1px 3px rgba(61, 0, 0, 0.02)',
        willChange: 'transform, opacity',
      }}
    >
      {/* Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: 'rgba(61, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.3s ease',
        transform: hovered && !connected ? 'scale(1.05)' : 'scale(1)',
      }}>
        {integration.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'rgb(61, 0, 0)',
          fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
          lineHeight: '1.3',
        }}>
          {integration.name}
        </div>
        <div style={{
          fontSize: '13px',
          color: 'rgba(61, 0, 0, 0.5)',
          fontFamily: '"Inter", sans-serif',
          lineHeight: '1.4',
          marginTop: '2px',
        }}>
          {integration.description}
        </div>
      </div>

      {/* Status / Button */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
      }}>
        {connected ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '100px',
            backgroundColor: 'rgba(61, 0, 0, 0.06)',
            transition: 'all 0.4s ease',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(61, 0, 0)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'rgb(61, 0, 0)',
              fontFamily: '"Satoshi", sans-serif',
              opacity: 0.7,
            }}>
              Connected
            </span>
          </div>
        ) : connecting ? (
          <div style={{
            padding: '6px 14px',
            borderRadius: '100px',
            backgroundColor: 'rgba(61, 0, 0, 0.06)',
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(61, 0, 0, 0.15)',
              borderTopColor: 'rgb(61, 0, 0)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : (
          <div style={{
            padding: '6px 14px',
            borderRadius: '100px',
            border: '1.5px solid rgba(61, 0, 0, 0.15)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'rgb(61, 0, 0)',
            fontFamily: '"Satoshi", sans-serif',
            transition: 'all 0.3s ease',
            backgroundColor: hovered ? 'rgb(61, 0, 0)' : 'transparent',
            ...(hovered ? { color: '#fff', borderColor: 'rgb(61, 0, 0)' } : {}),
          }}>
            Connect
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ALL-IN-ONE INTEGRATIONS PAGE
// ---------------------------------------------------------------------------

function IntegrationsPage({ onContinue }: { onContinue: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [headingVisible, setHeadingVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setIsLoaded(true), 200);
    const t2 = setTimeout(() => setLogoVisible(true), 400);
    const t3 = setTimeout(() => setHeadingVisible(true), 600);
    const t4 = setTimeout(() => setCardsVisible(true), 900);
    const t5 = setTimeout(() => setButtonVisible(true), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap');

        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2') format('woff2');
          font-display: swap; font-style: normal; font-weight: 700;
        }
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2') format('woff2');
          font-display: swap; font-style: normal; font-weight: 500;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 520px) {
          .integrations-grid {
            padding: 0 16px !important;
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
        WebkitFontSmoothing: 'antialiased' as any,
        MozOsxFontSmoothing: 'grayscale' as any,
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
      }}>
        {/* Animated background */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #F5F2F0 0%, #F8F5F3 50%, #F5F2F0 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease-in-out infinite',
          zIndex: -1,
        }} />

        {/* Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          width: '100%',
          maxWidth: '480px',
          padding: '0 24px',
          boxSizing: 'border-box',
          transform: isLoaded ? 'translateY(0px)' : 'translateY(15px)',
          opacity: isLoaded ? 1 : 0,
          transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}>
          {/* Logo */}
          <div style={{
            opacity: logoVisible ? 0.8 : 0,
            transform: logoVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <img src="/logos/cognition.cv.svg" alt="Cognition.CV" style={{
              height: '22px', width: 'auto', objectFit: 'contain',
              filter: 'brightness(0) saturate(100%)',
            }} />
          </div>

          {/* Heading */}
          <div style={{
            textAlign: 'center',
            opacity: headingVisible ? 1 : 0,
            transform: headingVisible ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 300,
              color: 'rgb(61, 0, 0)',
              lineHeight: '1.2',
              margin: '0 0 8px',
              fontFamily: '"Inter", sans-serif',
              letterSpacing: '-0.02em',
            }}>
              Connect your tools
            </h1>
            <p style={{
              fontSize: '15px',
              color: 'rgba(61, 0, 0, 0.5)',
              lineHeight: '1.5',
              margin: 0,
              fontFamily: '"Inter", sans-serif',
              fontWeight: 400,
            }}>
              Read-only access · Your data stays safe
            </p>
          </div>

          {/* Integration cards */}
          <div className="integrations-grid" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
          }}>
            {INTEGRATIONS.map((integration, i) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                index={i}
                visible={cardsVisible}
              />
            ))}
          </div>

          {/* Continue button */}
          <button
            onClick={onContinue}
            style={{
              padding: '12px 28px',
              backgroundColor: 'rgb(61, 0, 0)',
              color: '#fff',
              border: '2px solid rgb(61, 0, 0)',
              borderRadius: '187px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
              lineHeight: '1.3',
              whiteSpace: 'nowrap',
              opacity: buttonVisible ? 1 : 0,
              transform: buttonVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform, opacity',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgb(61, 0, 0)';
              e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(61, 0, 0)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            }}
          >
            <strong style={{ fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif' }}>
              Continue
            </strong>
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Wrapper – Video page first, then all-in-one integrations page
// ---------------------------------------------------------------------------

interface StepConnectIntegrationsProps {
  onContinue: () => void;
}

export default function StepConnectIntegrations({ onContinue }: StepConnectIntegrationsProps) {
  const [showIntegrations, setShowIntegrations] = useState(false);

  if (!showIntegrations) {
    return <VideoPage onContinue={() => setShowIntegrations(true)} />;
  }

  return <IntegrationsPage onContinue={onContinue} />;
}
