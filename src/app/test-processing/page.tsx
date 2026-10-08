'use client';

import React, { useState } from 'react';
import ProcessingStep from '@/components/onboarding/Step5Processing';

export default function TestProcessingPage() {
  const [sessionType, setSessionType] = useState<'mock' | 'real'>('mock');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartProcessing = () => {
    setIsProcessing(true);
  };

  const handleProcessingComplete = () => {
    console.log('Processing completed!');
    setIsProcessing(false);
    alert('Processing completed! Check console for details.');
  };

  const generateSessionId = () => {
    if (sessionType === 'mock') {
      return `mock-session-${Date.now()}`;
    }
    return `test-session-${Date.now()}`;
  };

  if (isProcessing) {
    return (
      <ProcessingStep 
        sessionId={generateSessionId()}
        onComplete={handleProcessingComplete}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F2F0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'Satoshi, sans-serif',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          color: 'rgb(61, 0, 0)',
          marginBottom: '24px',
          fontFamily: 'Satoshi, sans-serif',
        }}>
          Processing Test Page
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: 'rgba(61, 0, 0, 0.7)',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          Test the loading animations and processing stages. Choose between mock data (fast) or real processing.
        </p>

        <div style={{
          marginBottom: '32px',
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setSessionType('mock')}
            style={{
              padding: '12px 24px',
              backgroundColor: sessionType === 'mock' ? 'rgb(61, 0, 0)' : 'transparent',
              color: sessionType === 'mock' ? 'white' : 'rgb(61, 0, 0)',
              border: '2px solid rgb(61, 0, 0)',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontFamily: 'Satoshi, sans-serif',
              transition: 'all 0.3s ease',
            }}
          >
            Mock Session (Fast)
          </button>
          
          <button
            onClick={() => setSessionType('real')}
            style={{
              padding: '12px 24px',
              backgroundColor: sessionType === 'real' ? 'rgb(61, 0, 0)' : 'transparent',
              color: sessionType === 'real' ? 'white' : 'rgb(61, 0, 0)',
              border: '2px solid rgb(61, 0, 0)',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontFamily: 'Satoshi, sans-serif',
              transition: 'all 0.3s ease',
            }}
          >
            Real Session (Slow)
          </button>
        </div>

        <button
          onClick={handleStartProcessing}
          style={{
            padding: '16px 32px',
            backgroundColor: 'rgb(61, 0, 0)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'Satoshi, sans-serif',
            transition: 'transform 0.2s ease',
            width: '100%',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Start Processing Test
        </button>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'rgba(61, 0, 0, 0.05)',
          borderRadius: '8px',
          fontSize: '14px',
          color: 'rgba(61, 0, 0, 0.6)',
          textAlign: 'left',
        }}>
          <strong>Mock Session:</strong> Shows all 14 processing stages with beautiful animations (3.5s each stage)<br/>
          <strong>Real Session:</strong> Uses actual backend polling - requires a real session with uploaded files
        </div>
      </div>

      <div style={{
        marginTop: '40px',
        textAlign: 'center',
        color: 'rgba(61, 0, 0, 0.6)',
        fontSize: '14px',
      }}>
        Navigate to: <code>/test-processing</code>
      </div>
    </div>
  );
}