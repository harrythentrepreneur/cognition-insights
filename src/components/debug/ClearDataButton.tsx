'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { clearAllIndexedDBData } from '@/utils/clear-indexed-db';
import { toast } from 'sonner';

export function ClearDataButton() {
  const router = useRouter();
  
  const handleReanalyze = async () => {
    if (window.confirm('This will clear your current analysis and allow you to start fresh. Continue?')) {
      try {
        await clearAllIndexedDBData();
        toast.success('Data cleared! Redirecting to start new analysis...');
        // Clear session from localStorage too
        localStorage.removeItem('analysisSessionId');
        // Redirect to welcome page
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } catch (error) {
        console.error('Failed to clear data:', error);
        toast.error('Failed to clear data');
      }
    }
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <button
      onClick={handleReanalyze}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 20px',
        backgroundColor: '#00F5D4',
        color: '#1A1A2E',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        zIndex: 9999,
        opacity: 0.9,
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(0, 245, 212, 0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 245, 212, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.9';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 245, 212, 0.3)';
      }}
    >
      Reanalyze
    </button>
  );
}