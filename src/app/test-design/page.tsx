'use client';

import React, { useState, useEffect } from 'react';

// Processing stages from the original component
const PROCESSING_STAGES = [
  {
    id: 'reading',
    image: '/onboarding/every-message.png',
    text: 'Every message you\'ve sent holds a piece of your heart...',
  },
  {
    id: 'chapters',
    image: '/onboarding/creating-chapters.png',
    text: 'Creating the chapters of your story...',
  },
  {
    id: 'emotions',
    image: '/onboarding/ai-feeling-emotions.png',
    text: 'Our AI is feeling the emotions between your lines...',
  },
  {
    id: 'triggers',
    image: '/onboarding/identifying-moments.png',
    text: 'Identifying the moments that sparked change...',
  },
  {
    id: 'insights',
    image: '/onboarding/preparing-insights.png',
    text: 'Preparing insights that will help you see yourself in a whole new light...',
  },
  {
    id: 'connections',
    image: '/onboarding/discovering-relationships.png',
    text: 'Discovering how your relationships have shaped your journey...',
  },
  {
    id: 'voice',
    image: '/onboarding/watching-expression.png',
    text: 'Watching how your way of expressing yourself has grown and changed...',
  },
  {
    id: 'dreams',
    image: '/onboarding/discovering-dreams.png',
    text: 'Discovering the dreams you\'ve chased and the victories you\'ve achieved...',
  },
  {
    id: 'patterns',
    image: '/onboarding/uncovering-patterns.png',
    text: 'Uncovering the beautiful patterns that make you uniquely you...',
  },
  {
    id: 'strength',
    image: '/onboarding/recognizing-growth.png',
    text: 'Recognizing how you\'ve grown stronger through life\'s challenges...',
  },
  {
    id: 'narrative',
    image: '/onboarding/crafting-narrative.png',
    text: 'Crafting the beautiful narrative of your life\'s most meaningful chapters...',
  },
  {
    id: 'finalTouch',
    image: '/onboarding/completing-portrait.png',
    text: 'Like an artist putting final touches on a masterpiece...',
  },
  {
    id: 'ready',
    image: '/onboarding/journey-ready.png',
    text: 'Your incredible journey of self-discovery is ready to explore!',
  },
];

export default function TestDesignPage() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  const currentStage = PROCESSING_STAGES[currentStageIndex];

  // Animation effects when stage changes
  useEffect(() => {
    // Reset states immediately
    setImageLoaded(false);
    setTextVisible(false);
    
    // Animate in both image and text at the same time
    const animationTimer = setTimeout(() => {
      setImageLoaded(true);
      setTextVisible(true);
    }, 500);

    // Cleanup function to clear timers if component unmounts or stage changes
    return () => {
      clearTimeout(animationTimer);
    };
  }, [currentStageIndex]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStageIndex((prev) => 
          prev === PROCESSING_STAGES.length - 1 ? 0 : prev + 1
        );
        setIsVisible(true);
      }, 800);
    }, 10000); // 10 seconds per stage

    return () => clearTimeout(timer);
  }, [currentStageIndex, isPlaying]);

  const nextStage = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentStageIndex((prev) => 
        prev === PROCESSING_STAGES.length - 1 ? 0 : prev + 1
      );
      setIsVisible(true);
    }, 800);
  };

  const prevStage = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentStageIndex((prev) => 
        prev === 0 ? PROCESSING_STAGES.length - 1 : prev - 1
      );
      setIsVisible(true);
    }, 800);
  };

  const toggleAutoPlay = () => {
    setIsPlaying(!isPlaying);
  };

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

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 768px) {
          .processing-content img {
            width: 400px !important;
            height: 400px !important;
          }
          
          .processing-content p {
            font-size: 20px !important;
            max-width: 90% !important;
          }
        }

        @media (max-width: 480px) {
          .processing-content img {
            width: 280px !important;
            height: 280px !important;
          }
          
          .processing-content p {
            font-size: 18px !important;
            padding: 0 10px !important;
          }
        }
      `}</style>

      {/* Main processing view */}
      <div style={{
        backgroundColor: '#F5F2F0',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        fontFamily: 'Satoshi, sans-serif',
      }}>
        <section style={{
          alignContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #F5F2F0 0%, #F8F5F3 50%, #F5F2F0 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease-in-out infinite',
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
            justifyContent: 'center',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}>
            <div 
              className="processing-content"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                width: '100%',
                height: '100%',
                padding: '40px 20px',
              }}>
              <div style={{
                opacity: imageLoaded ? 1 : 0,
                transform: imageLoaded ? 'scale(1)' : 'scale(0.8)',
                transition: 'all 6s ease-in-out',
                animation: imageLoaded ? 'breathe 4s ease-in-out infinite' : 'none',
                marginBottom: '0',
              }}>
                <img
                  src={currentStage.image}
                  alt="Processing visualization"
                  style={{
                    width: '582px',
                    height: '582px',
                    objectFit: 'contain',
                  }}
                  onLoad={() => {
                    // Image is loaded but don't start animation yet - handled by setTimeout above
                  }}
                />
              </div>

              <p style={{
                fontSize: '24px',
                fontWeight: '400',
                color: 'rgb(61, 0, 0)',
                lineHeight: '1.4',
                maxWidth: '800px',
                textAlign: 'center',
                fontFamily: 'Satoshi, sans-serif',
                opacity: textVisible ? 1 : 0,
                transform: textVisible ? 'scale(1)' : 'scale(0.8)',
                transition: 'all 6s ease-in-out',
                animation: textVisible ? 'breathe 4s ease-in-out infinite' : 'none',
                margin: 0,
                padding: '0 20px',
              }}>
                {currentStage.text}
              </p>
            </div>
          </div>
        </section>

        {/* Controls */}
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '16px 24px',
          borderRadius: '50px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
        }}>
          <button
            onClick={prevStage}
            disabled={isPlaying}
            style={{
              padding: '8px 16px',
              backgroundColor: isPlaying ? '#ccc' : 'rgb(61, 0, 0)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              fontFamily: 'Satoshi, sans-serif',
            }}
          >
            ← Previous
          </button>

          <button
            onClick={toggleAutoPlay}
            style={{
              padding: '8px 16px',
              backgroundColor: isPlaying ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Satoshi, sans-serif',
            }}
          >
            {isPlaying ? 'Stop Auto' : 'Auto Play'}
          </button>

          <button
            onClick={nextStage}
            disabled={isPlaying}
            style={{
              padding: '8px 16px',
              backgroundColor: isPlaying ? '#ccc' : 'rgb(61, 0, 0)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              fontFamily: 'Satoshi, sans-serif',
            }}
          >
            Next →
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            color: 'rgb(61, 0, 0)',
            fontFamily: 'Satoshi, sans-serif',
            marginLeft: '16px',
          }}>
            {currentStageIndex + 1} / {PROCESSING_STAGES.length}
          </div>
        </div>
      </div>
    </>
  );
}