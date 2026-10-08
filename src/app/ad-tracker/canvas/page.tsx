'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { VaultCreative, CreativeDNA } from '../components/CreativeVault';
import { useAdTrackerData, type MetaAdCreative } from '../hooks/useAdTrackerData';
import { getSydneyToday } from '../utils/timezone';

// Dynamic import to avoid SSR issues with @xyflow/react
const AdLabCanvas = dynamic(
  () => import('../components/canvas/AdLabCanvas'),
  { ssr: false, loading: () => <CanvasLoader /> }
);

// ============================================================================
// CANVAS LOADER
// ============================================================================

function CanvasLoader() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a14', color: '#6B7280',
      fontFamily: "'Inter', sans-serif", fontSize: '13px',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'canvasLoaderPulse 2s ease-in-out infinite',
      }}>
        <img
          src="/logos/cognition.cv.svg"
          alt="Cognition"
          style={{ display: 'block', width: '280px', height: 'auto' }}
        />
      </div>
      <span style={{ letterSpacing: '-0.01em' }}>Loading Ad Creation Lab...</span>
      <style>{`
        @keyframes canvasLoaderPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// DNA CACHE — localStorage (same as CreativeVault)
// ============================================================================

const DNA_CACHE_KEY = 'ad-tracker-dna-cache';

function getDnaCacheAll(): Record<string, CreativeDNA> {
  try {
    const raw = localStorage.getItem(DNA_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ============================================================================
// CONVERT MetaAdCreative → VaultCreative (same logic as AdTrackerSection)
// ============================================================================

function toVaultCreative(c: MetaAdCreative, dnaCache: Record<string, CreativeDNA>): VaultCreative {
  return {
    id: c.adId,
    name: c.adName,
    type: c.creativeType as 'video' | 'image' | 'carousel',
    platform: c.platform,
    platformColor: c.platformColor,
    status: c.status as 'active' | 'paused',
    thumbnailUrl: c.thumbnailUrl,
    videoSourceUrl: c.videoSourceUrl,
    imageUrl: c.imageUrl,
    fullPictureUrl: c.fullPictureUrl,
    postUrl: c.postUrl,
    headline: c.headline,
    body: c.body,
    description: c.description,
    linkUrl: c.linkUrl,
    metrics: {
      impressions: c.metrics.impressions,
      clicks: c.metrics.clicks,
      ctr: c.metrics.ctr,
      conversions: c.metrics.conversions,
      'ad-spend': c.metrics.spend,
      revenue: c.metrics.revenue,
      roas: c.metrics.roas,
      cpa: c.metrics.cpa,
      cpc: c.metrics.cpc,
      cpm: c.metrics.cpm,
      spend: c.metrics.spend,
    },
    dna: dnaCache[c.adId] || null,
  };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function CanvasPage() {
  // Date range: last 90 days
  const to = useMemo(() => getSydneyToday(), []);
  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  }, []);

  const { creatives: rawCreatives, creativesLoading } = useAdTrackerData({
    from, to,
    pollInterval: 60000, // poll less aggressively on canvas page
  });

  // Convert to VaultCreative with DNA cache
  const [dnaCache] = useState(() => getDnaCacheAll());
  const vaultCreatives = useMemo(() =>
    rawCreatives.map(c => toVaultCreative(c, dnaCache)),
    [rawCreatives, dnaCache]
  );

  return <AdLabCanvas creatives={vaultCreatives} isLoading={creativesLoading} />;
}
