'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { generateAndCacheTimelineImage, createEmotivePrompt, fetchTimelineData, TimelineData } from '@/lib/runware-api';

interface TimelineHeroImageProps {
  sessionId?: string;
  className?: string;
  fallbackText?: string;
}

/**
 * Hero Image Component that generates a symbolic representation of user's life timeline
 * Uses Runware AI to create beautiful, emotive artwork based on timeline data
 * Auto-loads when component mounts, just like emotional landscapes page
 */
export const TimelineHeroImage: React.FC<TimelineHeroImageProps> = ({
  sessionId,
  className = '',
  fallbackText = "Your Life Story in Art"
}) => {
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');

  // Check if timeline data is available for this session
  const checkTimelineAvailability = useCallback(async (): Promise<TimelineData | null> => {
    if (!sessionId) {
      return null;
    }
    
    setLoadingStage('Checking timeline data...');
    
    try {
      const data = await fetchTimelineData(sessionId);
      if (data) {
        setTimelineData(data);
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error checking timeline availability:', error);
      return null;
    }
  }, [sessionId]);

  // Generate the artistic image from timeline data
  const generateTimelineImage = useCallback(async (providedTimelineData?: TimelineData | boolean) => {
    setLoading(true);
    setLoadingStage('Generating symbolic artwork...');
    
    // Determine which timeline data to use
    const dataToUse = providedTimelineData && typeof providedTimelineData === 'object' 
      ? providedTimelineData 
      : timelineData;
    
    if (!sessionId || !dataToUse) {
      setError('Missing session ID or timeline data');
      setLoading(false);
      setLoadingStage('');
      return;
    }

    try {
      const result = await generateAndCacheTimelineImage(sessionId, dataToUse);
      
      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl);
        if (result.prompt) {
          setPrompt(result.prompt);
        }
        setLoadingStage('');
      } else {
        console.error('❌ Image generation failed:', result.error);
        setError(result.error || 'Failed to generate timeline image');
        setLoadingStage('');
      }
    } catch (err) {
      console.error('❌ Unexpected error during image generation:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error occurred');
      setLoadingStage('');
    } finally {
      setLoading(false);
    }
  }, [sessionId, timelineData]);

  // Auto-load timeline data and generate image when component mounts
  useEffect(() => {
    // Prevent re-execution if there's already an error or if loading
    if (error || loading) {
      return;
    }
    
    const autoLoadAndGenerate = async () => {
      try {
        // Check for timeline data
        const timelineData = await checkTimelineAvailability();
        
        if (timelineData) {
          // Small delay to ensure state is updated, and pass the data directly
          setTimeout(() => {
            generateTimelineImage(timelineData); // Pass the actual timeline data
          }, 100);
        } else {
          setLoadingStage('');
        }
      } catch (error) {
        console.error('❌ Error in auto-load process:', error);
        setError('Failed to load timeline data');
        setLoadingStage('');
      }
    };

    if (sessionId) {
      autoLoadAndGenerate();
    }
  }, [sessionId]);

  // Manual regeneration function
  const handleRegenerate = useCallback(async () => {
    // Clear any existing errors
    setError(null);
    setLoadingStage('');
    
    if (timelineData) {
      await generateTimelineImage(true);
    } else {
      const data = await checkTimelineAvailability();
      if (data) {
        await generateTimelineImage(data);
      }
    }
  }, [timelineData, generateTimelineImage, checkTimelineAvailability]);


  if (loading) {
    return (
      <div style={{
        opacity: 1,
        transform: 'translateY(0px) scale(1)',
        filter: 'blur(0px)',
        transition: 'all 1.8s cubic-bezier(0.075, 0.82, 0.165, 1)',
        marginTop: '0',
        position: 'relative'
      }}>
        <div style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 25px 80px rgba(156, 163, 175, 0.15)',
          opacity: 0.7
        }}>
          {/* Beautiful loading animation */}
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
              borderRadius: '50%',
              margin: '0 auto 1rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.3)',
                animation: 'spin 3s linear infinite'
              }} />
            </div>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              margin: 0,
              fontWeight: 500
            }}>
              Generating your artwork...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        opacity: 1,
        transform: 'translateY(0px) scale(1)',
        filter: 'blur(0px)',
        transition: 'all 1.8s cubic-bezier(0.075, 0.82, 0.165, 1)',
        marginTop: '0',
        position: 'relative'
      }}>
        <div style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 25px 80px rgba(239, 68, 68, 0.15)',
          opacity: 0.9,
          cursor: 'pointer'
        }}
        onClick={handleRegenerate}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: '50%',
              margin: '0 auto 1rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p style={{ 
              color: '#dc2626', 
              fontSize: '14px', 
              margin: '0 0 0.5rem 0',
              fontWeight: 500
            }}>
              Generation failed
            </p>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '12px', 
              margin: 0
            }}>
              Click to retry
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div style={{
        opacity: 1,
        transform: 'translateY(0px) scale(1)',
        filter: 'blur(0px)',
        transition: 'all 1.8s cubic-bezier(0.075, 0.82, 0.165, 1)',
        marginTop: '0',
        position: 'relative'
      }}>
        <div style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 25px 80px rgba(156, 163, 175, 0.15)',
          opacity: 0.7
        }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
              borderRadius: '50%',
              margin: '0 auto 1rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Your artwork will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      opacity: 1,
      transform: 'translateY(0px) scale(1)',
      filter: 'blur(0px)',
      transition: 'all 1.8s cubic-bezier(0.075, 0.82, 0.165, 1)',
      marginTop: '0',
      position: 'relative'
    }}>
      <div 
        style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 25px 80px rgba(0, 150, 255, 0.15)',
          opacity: 0.9,
          filter: 'saturate(1.1) brightness(1.02)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
      >
        {/* Hover overlay with prompt info */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5))',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          padding: '2rem'
        }}
        className="hover-overlay">
          <div style={{ textAlign: 'center', color: 'white' }}>
            <p style={{ 
              fontSize: '12px', 
              margin: '0 0 0.5rem 0',
              fontWeight: 500,
              opacity: 0.9
            }}>
              Generated from your emotional journey
            </p>
            {prompt && (
              <p style={{ 
                fontSize: '11px', 
                margin: 0,
                opacity: 0.7,
                lineHeight: 1.4
              }}>
                &ldquo;{prompt.length > 80 ? prompt.substring(0, 80) + '...' : prompt}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-overlay:hover {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

// Default export for easier importing
export default TimelineHeroImage; 