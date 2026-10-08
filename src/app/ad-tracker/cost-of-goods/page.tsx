'use client';

import React, { Suspense } from 'react';
import PageLayout from '@/components/shared/PageLayout';
import CostOfGoodsSheet from '../components/CostOfGoodsSheet';
import './cost-of-goods.css';

function CostOfGoodsContent() {
  return (
    <PageLayout activeSection="ad-tracker" hideBottomNav={true}>
      {/* Hero Header */}
      <div style={{
        position: 'relative',
        padding: '0 0 40px 0',
        minHeight: '100vh',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(0,245,212,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Page Content */}
        <div style={{
          maxWidth: '1792px',
          margin: '0 auto',
          padding: '120px 40px 0 32px',
          position: 'relative',
        }}>
          {/* Header */}
          <div className="cog-page" style={{ marginBottom: '32px' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00F5D4',
                boxShadow: '0 0 8px rgba(0,245,212,0.5)',
                animation: 'cogPulse 2s ease infinite',
              }} />
              <span style={{
                fontSize: '11px',
                fontFamily: "'Inter', 'Lato', sans-serif",
                fontWeight: 600,
                color: '#00F5D4',
                letterSpacing: '1.5px',
                textTransform: 'uppercase' as const,
              }}>
                Financial Tracking
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: '36px',
              fontFamily: "'Inter', 'Lato', sans-serif",
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              Cost of Goods
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: '14px',
              fontFamily: "'Inter', 'Lato', sans-serif",
              fontWeight: 400,
              color: '#6B6B80',
              margin: 0,
              lineHeight: 1.6,
              maxWidth: '520px',
            }}>
              Add expenses by voice, paste a spreadsheet, or type naturally. Your data stays local and syncs instantly.
            </p>
          </div>

          {/* Spreadsheet */}
          <CostOfGoodsSheet />
        </div>
      </div>
    </PageLayout>
  );
}

export default function CostOfGoodsPage() {
  return (
    <div style={{ background: '#1A1A2E', minHeight: '100vh' }}>
      <Suspense fallback={<div style={{ background: '#1A1A2E', minHeight: '100vh' }} />}>
        <CostOfGoodsContent />
      </Suspense>
    </div>
  );
}
