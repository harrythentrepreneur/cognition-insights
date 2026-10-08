'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { BasePageSection } from '@/components/shared/base/BasePageSection';
import { TimelineDataItem } from '@/components/shared/types/timeline';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { StripeLiveFeed } from './StripeLiveFeed';
import { BaseCircumplex } from '@/components/shared/base/BaseCircumplex';
import { CircumplexDataItem } from '@/components/shared/types/circumplex';
import { useAdTrackerData, type MetaAdSet, type MetaAdCreative, type LiveEvent, type MergedDailyData } from '../hooks/useAdTrackerData';
import { applyLTVForecast } from '../utils/ltvForecast';
import { getSydneyToday } from '../utils/timezone';
import { CreativeVault, type VaultCreative, type CreativeDNA } from './CreativeVault';
import { AdXRayPanel } from './AdXRayPanel';
import { IntelligenceLab } from './IntelligenceLab';
import { BlueprintStudio } from './BlueprintStudio';
import BaseTimeline from '@/components/shared/base/BaseTimeline';
import { AdTrackerBootLoader } from './AdTrackerBootLoader';

// ============================================================================
// AD METRICS
// ============================================================================

const AD_METRICS: Array<{ id: string; name: string; color: string; icon: string }> = [
  { id: 'revenue', name: 'Revenue', color: '#00F5D4', icon: '💰' },
  { id: 'net-revenue', name: 'Net Revenue', color: '#00D4B4', icon: '💵' },
  { id: 'ad-spend', name: 'Ad Spend', color: '#FF6B6B', icon: '🎯' },
  { id: 'cogs', name: 'COGS', color: '#FFD700', icon: '📦' },
  { id: 'profit', name: 'Profit', color: '#A855F7', icon: '📈' },
  { id: 'new-customers', name: 'Leads', color: '#45B7D1', icon: '👥' },
  { id: 'checkouts', name: 'Checkouts', color: '#FF6B9D', icon: '🛒' },
  { id: 'purchases', name: 'Purchases', color: '#F59E0B', icon: '✅' },
  { id: 'successful-charges', name: 'Successful Charges', color: '#06D6A0', icon: '💎' },
  { id: 'cpa', name: 'CPA', color: '#FB8500', icon: '💵' },
  { id: 'roas', name: 'ROAS', color: '#4ECDC4', icon: '🔄' },
  { id: 'aov', name: 'Avg Order Value', color: '#7C3AED', icon: '🧾' },
  { id: 'ltv', name: 'Avg Rev / Customer', color: '#9D4EDD', icon: '⏳' },
  { id: 'refund-rate', name: 'Refund Rate', color: '#E74C3C', icon: '↩️' },
  { id: 'ctr', name: 'CTR', color: '#3B82F6', icon: '👆' },
  { id: 'cpc', name: 'CPC', color: '#F472B6', icon: '💲' },
  { id: 'cpm', name: 'CPM', color: '#818CF8', icon: '📊' },
  { id: 'impressions', name: 'Impressions', color: '#34D399', icon: '👁️' },
  { id: 'reach', name: 'Reach', color: '#FBBF24', icon: '📡' },
  { id: 'frequency', name: 'Ad Frequency', color: '#F87171', icon: '🔁' },
  { id: 'conversion-rate', name: 'Conversion Rate', color: '#10B981', icon: '🎯' },
  { id: 'trial-signups', name: 'Trial Signups', color: '#3B82F6', icon: '🆓' },
  { id: 'cash-pending', name: 'Cash Pending', color: '#F472B6', icon: '⏳' },
  { id: 'business-valuation', name: 'Valuation Estimate', color: '#8B5CF6', icon: '🏦' },
  { id: 'arr', name: 'ARR', color: '#10B981', icon: '💰' },
  { id: 'mrr', name: 'MRR', color: '#34D399', icon: '📅' },
  { id: 'churn', name: 'Churn', color: '#F43F5E', icon: '📉' },
  { id: 'churn-rate', name: 'Churn Rate', color: '#EF4444', icon: '📊' },
  { id: 'remaining-ltv', name: 'Remaining Cohort LTV', color: '#F59E0B', icon: '🔮' },
  { id: 'books-made', name: 'Books Made', color: '#38BDF8', icon: '📚' },
];

// ============================================================================
// MOCK AD CREATIVES
// ============================================================================

interface AdCreative {
  id: string;
  name: string;
  type: 'video' | 'image' | 'carousel';
  platform: string;
  platformColor: string;
  status: 'active' | 'paused';
  thumbnailUrl?: string | null;
  videoSourceUrl?: string | null;
  imageUrl?: string | null;
  fullPictureUrl?: string | null;
  postUrl?: string | null;
  headline?: string | null;
  body?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  metrics: Record<string, number>;
}

function generateCreativeMetrics(seed: number): Record<string, number> {
  const rng = seededRandom(seed);
  const impressions = Math.round(45000 + rng() * 180000);
  const clicks = Math.round(impressions * (0.008 + rng() * 0.035));
  const conversions = Math.round(clicks * (0.02 + rng() * 0.08));
  const adSpend = Math.round(200 + rng() * 2800);
  const revenue = Math.round(adSpend * (1.2 + rng() * 4.5));
  const profit = revenue - adSpend;
  return {
    impressions,
    clicks,
    ctr: clicks / Math.max(1, impressions) * 100,
    conversions,
    'ad-spend': adSpend,
    revenue,
    profit,
    roas: revenue / Math.max(1, adSpend),
    cpa: adSpend / Math.max(1, conversions),
    cpc: adSpend / Math.max(1, clicks),
  };
}

const MOCK_AD_CREATIVES: AdCreative[] = [
  { id: 'cr-1', name: 'Summer Sale — Hero Video', type: 'video', platform: 'TikTok', platformColor: '#FE2C55', status: 'active', metrics: generateCreativeMetrics(101) },
  { id: 'cr-2', name: 'Free Trial — Explainer', type: 'video', platform: 'YouTube', platformColor: '#FF0000', status: 'active', metrics: generateCreativeMetrics(202) },
  { id: 'cr-3', name: 'Product Showcase Carousel', type: 'carousel', platform: 'Meta', platformColor: '#1877F2', status: 'active', metrics: generateCreativeMetrics(303) },
  { id: 'cr-4', name: 'Retarget — Social Proof', type: 'image', platform: 'Meta', platformColor: '#1877F2', status: 'paused', metrics: generateCreativeMetrics(404) },
  { id: 'cr-5', name: 'Brand Awareness — Lifestyle', type: 'image', platform: 'Google', platformColor: '#4285F4', status: 'active', metrics: generateCreativeMetrics(505) },
  { id: 'cr-6', name: 'UGC Testimonial Reel', type: 'video', platform: 'Instagram', platformColor: '#E1306C', status: 'active', metrics: generateCreativeMetrics(606) },
];

// ============================================================================
// AD CREATIVE CARD
// ============================================================================

const CREATIVE_THUMB_GRADIENTS: Record<string, string> = {
  video: 'linear-gradient(145deg, #1a1a3e 0%, #2d1b4e 50%, #1e293b 100%)',
  image: 'linear-gradient(145deg, #1a2e3e 0%, #1b3a4e 50%, #1e293b 100%)',
  carousel: 'linear-gradient(145deg, #1e1a3e 0%, #2e1b4e 50%, #1e293b 100%)',
};

function AdCreativeCard({ creative, onClickMedia, isMediaModalOpen }: { creative: AdCreative; onClickMedia?: (creative: AdCreative) => void; isMediaModalOpen?: boolean; }) {
  const m = creative.metrics;
  const hasMedia = !!(creative.videoSourceUrl || creative.imageUrl || creative.thumbnailUrl);

  // Compact metric rows — mirrors the reference layout (label left, value right)
  const metricRows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: '#Ads', value: String(Math.ceil(m.conversions / 12) || 1) },
    { label: 'Roas', value: `${m.roas.toFixed(2)}x`, highlight: true },
    { label: 'Cpc', value: `$${m.cpc.toFixed(2)}` },
    { label: 'Cpm', value: `$${(m['ad-spend'] / Math.max(1, m.impressions) * 1000).toFixed(2)}` },
    { label: 'Spend', value: `$${m['ad-spend'].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'Impressions', value: m.impressions.toLocaleString() },
    { label: 'Purchases', value: m.conversions.toLocaleString() },
    { label: 'Conversion', value: `$${m.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  ];

  return (
    <div style={{
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
      transition: 'box-shadow 0.25s ease',
      boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
    }}>
      {/* Thumbnail — shows real image if available, gradient fallback */}
      <div
        onClick={() => hasMedia && onClickMedia?.(creative)}
        style={{
          position: 'relative' as const,
          width: '100%',
          aspectRatio: '1 / 1',
          background: CREATIVE_THUMB_GRADIENTS[creative.type],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: hasMedia ? 'pointer' : 'default',
          transition: 'filter 0.2s ease',
        }}
        onMouseEnter={(e) => { if (hasMedia) (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.15)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1)'; }}
      >
        {/* Real thumbnail or video preview from Meta Ads */}
        {creative.type === 'video' && creative.videoSourceUrl ? (
          <video
            src={isMediaModalOpen ? undefined : creative.videoSourceUrl}
            poster={creative.thumbnailUrl || creative.fullPictureUrl || creative.imageUrl || undefined}
            muted
            loop
            autoPlay
            playsInline
            style={{
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              opacity: isMediaModalOpen ? 0 : 1,
            }}
          />
        ) : (creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl) && (
          <img
            src={(creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl)!}
            alt={creative.name}
            loading="lazy"
            style={{
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              // Hide broken image, show gradient fallback
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {/* Play / type icon overlay */}
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.45)',
          border: '2px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          position: 'relative' as const,
          zIndex: 2,
        }}>
          <span style={{
            fontSize: creative.type === 'video' ? '20px' : '22px',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1,
            marginLeft: creative.type === 'video' ? '3px' : '0',
          }}>
            {creative.type === 'video' ? '▶' : creative.type === 'carousel' ? '⊞' : '🖼'}
          </span>
        </div>

        {/* Platform chip + post link — bottom left */}
        <div style={{
          position: 'absolute' as const,
          bottom: '8px',
          left: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: creative.platformColor,
              fontFamily: "'Lato', sans-serif",
              letterSpacing: '0.2px',
            }}>
              {creative.platform}
            </span>
          </div>
          {creative.postUrl && (
            <a
              href={creative.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="View Facebook post"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(24,119,242,0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(0,0,0,0.5)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>

        {/* Status dot — top right */}
        {creative.status === 'paused' && (
          <div style={{
            position: 'absolute' as const,
            top: '8px',
            right: '8px',
            padding: '2px 7px',
            borderRadius: '5px',
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}>
            <span style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#9CA3AF',
              fontFamily: "'Lato', sans-serif",
              textTransform: 'uppercase' as const,
              letterSpacing: '0.4px',
            }}>
              Paused
            </span>
          </div>
        )}
      </div>

      {/* Compact metric rows */}
      <div style={{
        padding: '6px 12px 8px',
      }}>
        {metricRows.map((row, idx) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '4px 0',
              borderBottom: idx < metricRows.length - 1 ? '1px solid rgba(255,255,255,0.025)' : 'none',
            }}
          >
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#9CA3AF',
              fontFamily: "'Lato', sans-serif",
            }}>
              {row.label}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: row.highlight ? '#4ECDC4' : '#E5E7EB',
              fontFamily: "'Lato', sans-serif",
              letterSpacing: '-0.01em',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CREATIVE MEDIA MODAL — fullscreen lightbox for viewing videos / images
// ============================================================================

interface AnalysisReport {
  script?: string;
  visuals?: string;
  goal?: string;
  hook?: string;
  overallVerdict?: string;
  error?: string;
}

function CreativeMediaModal({ creative, onClose }: { creative: AdCreative; onClose: () => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleCopy = () => {
    if (!report) return;
    const textToCopy = `✨ AI Deep Analysis: ${creative.name}\n\n` +
      (report.overallVerdict ? `Verdict: ${report.overallVerdict}\n\n` : '') +
      (report.hook ? `🪝 The Hook: ${report.hook}\n\n` : '') +
      (report.goal ? `🎯 Objective: ${report.goal}\n\n` : '') +
      (report.script ? `📝 Script / Copy: ${report.script}\n\n` : '') +
      (report.visuals ? `👀 Visuals: ${report.visuals}` : '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = async () => {
    if (isAnalyzing || report) return;
    setIsAnalyzing(true);
    setReport(null);
    try {
      const url = creative.videoSourceUrl || creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl;
      const res = await fetch('/api/ad-tracker/analyze-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          type: creative.type === 'video' ? 'video' : 'image',
          name: creative.name,
          platform: creative.platform
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data.report);
    } catch (err: any) {
      console.error(err);
      setReport({ error: err.message || 'Analysis failed' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isVideo = creative.type === 'video' && creative.videoSourceUrl;
  const imageSrc = creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        animation: 'modalFadeIn 0.2s ease',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.15)',
          backgroundColor: 'rgba(255,255,255,0.08)',
          color: '#E5E7EB',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease',
          zIndex: 10001,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
      >
        ✕
      </button>

      {/* Main Content Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          height: '92vh',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
        }}
      >
        {/* Media Block */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          maxWidth: (report || isAnalyzing) ? 'calc(100% - 400px - 24px)' : '100%',
          transition: 'max-width 0.3s ease',
        }}>
          {isVideo ? (
            <video
              src={creative.videoSourceUrl!}
              controls
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '88vh',
                borderRadius: '12px',
                backgroundColor: '#000',
                objectFit: 'contain',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            />
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={creative.name}
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '88vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            />
          ) : null}

          {/* Caption & Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '1200px',
            padding: '12px 20px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: creative.platformColor,
                fontFamily: "'Inter', sans-serif",
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {creative.platform}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#E5E7EB',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.01em'
              }}>
                {creative.name}
              </span>
            </div>

            {/* Deep Analyze Button */}
            {!report && !isAnalyzing && (
              <button
                onClick={handleAnalyze}
                style={{
                  padding: '8px 20px',
                  borderRadius: '24px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '15px' }}>✨</span> Analyze deeply
              </button>
            )}
          </div>
        </div>

        {/* Analysis Sidebar */}
        {(isAnalyzing || report) && (
          <div style={{
            width: '420px',
            height: '100%',
            maxHeight: '88vh',
            backgroundColor: 'rgba(15, 15, 20, 0.65)',
            borderRadius: '20px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            overflowY: 'auto',
            backdropFilter: 'blur(28px) saturate(1.2)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)',
            animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            // Custom scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            {/* Sidebar Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.01em'
                }}>
                  <span style={{ fontSize: '18px' }}>✨</span> AI Deep Analysis
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#888', fontFamily: "'Inter', sans-serif" }}>Powered by Gemini 1.5 Flash</p>
              </div>
              {report && !report.error && (
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: copied ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${copied ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: copied ? '#34D399' : '#A1A1AA',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!copied) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              )}
            </div>

            {isAnalyzing ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderTopColor: '#FFF',
                  borderRadius: '50%',
                  animation: 'spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite'
                }} />
                <span style={{ fontSize: '14px', color: '#888', textAlign: 'center', whiteSpace: 'pre-wrap', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                  {creative.type === 'video' ? 'Processing video stream...\nRunning Gemini Flash vision' : 'Analyzing creative structure...'}
                </span>
              </div>
            ) : report?.error ? (
              <div style={{ color: '#F87171', fontSize: '13px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontFamily: "'Inter', sans-serif" }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#FCA5A5' }}>Analysis Failed</strong>
                {report.error}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {report?.overallVerdict && (
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px' 
                  }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A1A1AA', fontFamily: "'Inter', sans-serif" }}>Verdict</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#F4F4F5', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{report.overallVerdict}</p>
                  </div>
                )}
                {report?.hook && (
                  <div style={{ padding: '0 4px' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Inter', sans-serif" }}>
                      <span style={{ color: '#A1A1AA' }}>🪝</span> The Hook
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#D4D4D8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{report.hook}</p>
                  </div>
                )}
                {report?.goal && (
                  <div style={{ padding: '0 4px' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Inter', sans-serif" }}>
                      <span style={{ color: '#A1A1AA' }}>🎯</span> Objective
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#D4D4D8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{report.goal}</p>
                  </div>
                )}
                {report?.script && (
                  <div style={{ padding: '0 4px' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Inter', sans-serif" }}>
                      <span style={{ color: '#A1A1AA' }}>📝</span> Script / Copy
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#D4D4D8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{report.script}</p>
                  </div>
                )}
                {report?.visuals && (
                  <div style={{ padding: '0 4px' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Inter', sans-serif" }}>
                      <span style={{ color: '#A1A1AA' }}>👀</span> Visuals
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#D4D4D8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{report.visuals}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes spin { 
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); } 
        }
        @keyframes slideInRight { 
          from { opacity: 0; transform: translateX(30px) scale(0.98); } 
          to { opacity: 1; transform: translateX(0) scale(1); } 
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// MOCK DAILY DATA GENERATOR (seeded for consistency)
// ============================================================================

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// Generate ~3 years of daily data for each metric
function generateMetricData(): Record<string, Array<{ date: Date; value: number }>> {
  const days = 1095; // 3 years of days
  const data: Record<string, Array<{ date: Date; value: number }>> = {};

  AD_METRICS.forEach((metric) => {
    const rng = seededRandom(metric.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const points: Array<{ date: Date; value: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const trendFactor = 1 + (i / days) * 0.4; // upward trend over time
      const seasonality = 1 + 0.1 * Math.sin((i / 365) * 2 * Math.PI); // yearly cycle
      const noise = 0.85 + rng() * 0.3;

      let baseValue: number;
      switch (metric.id) {
        // Sum metrics: divide weekly values by 7 for daily granularity
        case 'revenue':            baseValue = (1200 / 7) * trendFactor * seasonality * noise; break;
        case 'net-revenue':        baseValue = (1100 / 7) * trendFactor * seasonality * noise; break;
        case 'ad-spend':           baseValue = (350 / 7) * trendFactor * seasonality * noise; break;
        case 'cogs':               baseValue = (250 / 7) * trendFactor * seasonality * noise; break;
        case 'profit':             baseValue = (600 / 7) * trendFactor * seasonality * noise; break;
        case 'new-customers':      baseValue = (120 / 7) * trendFactor * seasonality * noise; break;
        case 'checkouts':          baseValue = (55 / 7) * trendFactor * seasonality * noise; break;
        case 'purchases':          baseValue = (32 / 7) * trendFactor * seasonality * noise; break;
        case 'successful-charges': baseValue = (8 / 7) * trendFactor * seasonality * noise; break;
        // Rate/average metrics: keep same daily values
        case 'cpa':                baseValue = 42 * (1 / trendFactor) * noise; break;
        case 'roas':               baseValue = 3.2 * trendFactor * noise; break;
        case 'aov':                baseValue = 85 * trendFactor * noise; break;
        case 'ltv':                baseValue = 260 * trendFactor * noise; break;
        case 'refund-rate':        baseValue = 4.5 * (1 / trendFactor) * noise; break;
        case 'ctr':                baseValue = 2.1 * trendFactor * noise; break;
        case 'cpc':                baseValue = 0.85 * (1 / trendFactor) * noise; break;
        case 'cpm':                baseValue = 12 * trendFactor * noise; break;
        case 'impressions':        baseValue = (15000 / 7) * trendFactor * seasonality * noise; break;
        case 'reach':              baseValue = (8000 / 7) * trendFactor * seasonality * noise; break;
        case 'frequency':          baseValue = 1.8 * trendFactor * noise; break;
        case 'conversion-rate':    baseValue = 12 * trendFactor * noise; break;
        case 'trial-signups':      baseValue = (30 / 7) * trendFactor * seasonality * noise; break;
        case 'cash-pending':       baseValue = 1800 * trendFactor * noise; break;
        case 'arr':                baseValue = 24000 * trendFactor * noise; break;
        case 'mrr':                baseValue = 2000 * trendFactor * noise; break;
        case 'business-valuation': baseValue = 72000 * trendFactor * noise; break;
        case 'churn':              baseValue = (5 / 7) * trendFactor * seasonality * noise; break;
        case 'churn-rate':         baseValue = 4.2 * trendFactor * noise; break;
        default:                   baseValue = (100 / 7) * trendFactor * noise;
      }

      points.push({ date, value: Math.round(baseValue * 100) / 100 });
    }

    data[metric.id] = points;
  });

  // Ensure Business Valuation perfectly mirrors 3x ARR, and MRR = ARR / 12
  if (data['arr']) {
    data['business-valuation'] = data['arr'].map(p => ({
      date: p.date,
      value: Math.round(p.value * 3 * 100) / 100
    }));
    data['mrr'] = data['arr'].map(p => ({
      date: p.date,
      value: Math.round(p.value / 12 * 100) / 100
    }));
  }

  return data;
}

// ============================================================================
// CALCULATE STATS FOR A TIME RANGE
// ============================================================================

type AggType = 'sum' | 'avg' | 'latest';

const METRIC_AGG: Record<string, { agg: AggType; prefix: string; suffix: string }> = {
  'revenue':            { agg: 'sum', prefix: '$', suffix: '' },
  'net-revenue':        { agg: 'sum', prefix: '$', suffix: '' },
  'ad-spend':           { agg: 'sum', prefix: '$', suffix: '' },
  'cogs':               { agg: 'sum', prefix: '$', suffix: '' },
  'profit':             { agg: 'sum', prefix: '$', suffix: '' },
  'new-customers':      { agg: 'sum', prefix: '', suffix: '' },
  'checkouts':          { agg: 'sum', prefix: '', suffix: '' },
  'purchases':          { agg: 'sum', prefix: '', suffix: '' },
  'successful-charges': { agg: 'sum', prefix: '', suffix: '' },
  'cpa':                { agg: 'avg', prefix: '$', suffix: '' },
  'roas':               { agg: 'avg', prefix: '', suffix: 'x' },
  'aov':                { agg: 'avg', prefix: '$', suffix: '' },
  'ltv':                { agg: 'avg', prefix: '$', suffix: '' },
  'refund-rate':        { agg: 'avg', prefix: '', suffix: '%' },
  'ctr':                { agg: 'avg', prefix: '', suffix: '%' },
  'cpc':                { agg: 'avg', prefix: '$', suffix: '' },
  'cpm':                { agg: 'avg', prefix: '$', suffix: '' },
  'impressions':        { agg: 'sum', prefix: '', suffix: '' },
  'reach':              { agg: 'sum', prefix: '', suffix: '' },
  'frequency':          { agg: 'avg', prefix: '', suffix: 'x' },
  'conversion-rate':    { agg: 'avg', prefix: '', suffix: '%' },
  'trial-signups':      { agg: 'sum', prefix: '', suffix: '' },
  'cash-pending':       { agg: 'latest', prefix: '$', suffix: '' },
  'arr':                { agg: 'latest', prefix: '$', suffix: '' },
  'mrr':                { agg: 'latest', prefix: '$', suffix: '' },
  'business-valuation': { agg: 'latest', prefix: '$', suffix: '' },
  'churn':              { agg: 'sum', prefix: '', suffix: '' },
  'churn-rate':         { agg: 'avg', prefix: '', suffix: '%' },
  'remaining-ltv':      { agg: 'sum', prefix: '$', suffix: '' },
  'books-made':         { agg: 'sum', prefix: '', suffix: '' },
};

function calcRangeValue(
  points: Array<{ date: Date; value: number }>,
  start: Date,
  end: Date,
  agg: AggType
): number {
  const inRange = points.filter(p => p.date >= start && p.date <= end);
  if (inRange.length === 0) return 0;
  if (agg === 'latest') {
    return inRange[inRange.length - 1].value;
  }
  if (agg === 'avg') {
    return inRange.reduce((s, p) => s + p.value, 0) / inRange.length;
  }
  return inRange.reduce((s, p) => s + p.value, 0);
}

function formatValue(val: number, prefix: string, suffix: string): string {
  if (prefix === '$') {
    if (val >= 1000) return `${prefix}${(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}`;
    return `${prefix}${val.toFixed(2)}${suffix}`;
  }
  if (suffix === 'x') return `${val.toFixed(2)}${suffix}`;
  if (suffix === '%') return `${val.toFixed(1)}${suffix}`;
  return `${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}`;
}

// ============================================================================
// STAT BOX SPARKLINE — inline mini-chart with hover tooltip
// ============================================================================

function StatBoxSparkline({
  dataPoints,
  color,
  prefix,
  suffix,
  agg,
}: {
  dataPoints: Array<{ date: Date; value: number }>;
  color: string;
  prefix: string;
  suffix: string;
  agg: AggType;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ date: string; value: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || dataPoints.length < 2) return;

    const el = containerRef.current;
    const width = el.clientWidth;
    const height = 40;
    const padding = { top: 4, right: 2, bottom: 4, left: 2 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    // Clear previous
    d3.select(el).selectAll('svg').remove();

    const svg = d3.select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${padding.left},${padding.top})`);

    const xExtent = d3.extent(dataPoints, d => d.date) as [Date, Date];
    const vals = dataPoints.map(d => d.value);
    const yMin = Math.min(...vals);
    const yMax = Math.max(...vals);
    const yPad = (yMax - yMin) * 0.1 || 1;

    const x = d3.scaleTime().domain(xExtent).range([0, innerW]);
    const y = d3.scaleLinear().domain([Math.max(0, yMin - yPad), yMax + yPad]).range([innerH, 0]);

    // Gradient fill
    const gradId = `spark-grad-${color.replace('#', '')}`;
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', gradId)
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', innerH)
      .attr('gradientUnits', 'userSpaceOnUse');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.25);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.02);

    // Area
    const areaGen = d3.area<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y0(innerH)
      .y1(d => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(dataPoints)
      .attr('fill', `url(#${gradId})`)
      .attr('d', areaGen);

    // Line
    const lineGen = d3.line<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', lineGen)
      .style('filter', `drop-shadow(0 0 4px ${color}50)`);

    // Hover overlay
    const hoverLine = g.append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .style('display', 'none');

    const hoverDot = g.append('circle')
      .attr('r', 3)
      .attr('fill', color)
      .attr('stroke', '#1A1A2E')
      .attr('stroke-width', 1.5)
      .style('filter', `drop-shadow(0 0 4px ${color}80)`)
      .style('display', 'none');

    // Invisible overlay for hover detection
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const mouseX = mx - padding.left;
        if (mouseX < 0 || mouseX > innerW) return;

        const hoverDate = x.invert(mouseX);

        // Find closest data point
        let closestIdx = 0;
        let closestDist = Infinity;
        dataPoints.forEach((p, i) => {
          const dist = Math.abs(p.date.getTime() - hoverDate.getTime());
          if (dist < closestDist) { closestDist = dist; closestIdx = i; }
        });

        const pt = dataPoints[closestIdx];
        const px = x(pt.date);
        const py = y(pt.value);

        hoverLine.attr('x1', px).attr('x2', px).style('display', null);
        hoverDot.attr('cx', px).attr('cy', py).style('display', null);

        const dateStr = pt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const valStr = formatValue(pt.value, prefix, suffix);

        // Check if this data point is today (partial/pending data)
        const todayStr = new Date().toISOString().split('T')[0];
        const ptDateStr = pt.date.toISOString().split('T')[0];
        const pendingSuffix = ptDateStr === todayStr ? ' (pending)' : '';

        // Get tooltip position relative to viewport
        const rect = el.getBoundingClientRect();
        setHoverInfo({
          date: dateStr + pendingSuffix,
          value: valStr,
          x: rect.left + padding.left + px,
          y: rect.top + padding.top + py,
        });
      })
      .on('mouseleave', () => {
        hoverLine.style('display', 'none');
        hoverDot.style('display', 'none');
        setHoverInfo(null);
      });

  }, [dataPoints, color, prefix, suffix]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '40px',
          marginTop: '12px',
          cursor: 'crosshair',
        }}
      />
      {hoverInfo && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.x,
            top: hoverInfo.y - 52,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'statTooltipIn 0.12s ease-out',
          }}
        >
          <div style={{
            background: 'rgba(20, 20, 40, 0.92)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${color}30`,
            borderRadius: '10px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${color}15`,
            whiteSpace: 'nowrap' as const,
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 400,
              color: '#A0A0B0',
              fontFamily: "'Lato', sans-serif",
            }}>
              {hoverInfo.date}
            </span>
            <span style={{
              width: '1px',
              height: '12px',
              background: 'rgba(255,255,255,0.1)',
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: color,
              fontFamily: "'Lato', sans-serif",
              letterSpacing: '-0.01em',
            }}>
              {hoverInfo.value}
            </span>
          </div>
        </div>,
        document.body
      )}
      <style>{`
        @keyframes statTooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}

// ============================================================================
// STAT BOX
// ============================================================================

function StatBox({
  metric,
  allData,
  timeRange,
  isPinned,
  onTogglePin,
  isEstimated,
}: {
  metric: typeof AD_METRICS[0];
  allData: Record<string, Array<{ date: Date; value: number }>>;
  timeRange: { start: Date; end: Date };
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  isEstimated?: boolean;
}) {
  const points = allData[metric.id];
  if (!points) return null;

  const cfg = METRIC_AGG[metric.id] || { agg: 'sum' as AggType, prefix: '', suffix: '' };

  // Current period value
  const currentVal = calcRangeValue(points, timeRange.start, timeRange.end, cfg.agg);

  // Previous period of same length for delta
  const rangeDuration = timeRange.end.getTime() - timeRange.start.getTime();
  const prevStart = new Date(timeRange.start.getTime() - rangeDuration);
  const prevEnd = new Date(timeRange.start.getTime());
  const prevVal = calcRangeValue(points, prevStart, prevEnd, cfg.agg);

  // Delta %
  const delta = prevVal !== 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
  const isPositive = delta >= 0;

  // For cost metrics, negative delta is good
  const invertColor = ['ad-spend', 'cogs', 'cpa', 'refund-rate', 'cpc', 'cpm'].includes(metric.id);
  const deltaColor = (isPositive && !invertColor) || (!isPositive && invertColor)
    ? '#00F5D4'
    : '#FF6B6B';

  // Format the period label from the time range
  const daysInRange = Math.round(rangeDuration / (1000 * 60 * 60 * 24));
  let periodLabel: string;
  if (daysInRange <= 1) periodLabel = 'yesterday';
  else if (daysInRange <= 7) periodLabel = `${daysInRange} days`;
  else if (daysInRange <= 14) periodLabel = '2 weeks';
  else if (daysInRange <= 31) periodLabel = `${Math.round(daysInRange / 7)} weeks`;
  else if (daysInRange <= 93) periodLabel = `${Math.round(daysInRange / 30)} months`;
  else if (daysInRange <= 366) periodLabel = `${Math.round(daysInRange / 30)} months`;
  else periodLabel = `${(daysInRange / 365).toFixed(1)} years`;

  // Parse hex color to rgb for border
  const r = parseInt(metric.color.slice(1, 3), 16);
  const g = parseInt(metric.color.slice(3, 5), 16);
  const b = parseInt(metric.color.slice(5, 7), 16);

  // Filter data points to the current time range and aggregate into weekly
  // buckets so the tiny sparkline isn't squiggly from raw daily noise.
  // Filter data points to the current time range
  const sparklineData = useMemo(() => {
    return points.filter(p => p.date >= timeRange.start && p.date <= timeRange.end);
  }, [points, timeRange]);

  return (
    <div style={{
      padding: '8px',
      borderRadius: '12px',
      boxShadow: `0 0 20px ${metric.color}30`,
      border: `.5px solid rgba(${r},${g},${b},0.18)`,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      boxSizing: 'border-box' as const,
      width: '100%',
    }}>
      {/* Header pill — matches heatmap metric header exactly */}
      <div style={{
        fontSize: '13px',
        fontWeight: 500,
        color: metric.color,
        marginBottom: '10px',
        padding: '8px 14px',
        backgroundColor: `${metric.color}06`,
        borderRadius: '8px',
        border: `1px solid ${metric.color}12`,
        textAlign: 'left' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        fontFamily: "'Lato', sans-serif",
        boxSizing: 'border-box' as const,
        letterSpacing: '0.2px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: metric.color,
            filter: `drop-shadow(0 0 4px ${metric.color}60)`,
            flexShrink: 0,
          }} />
          <span>{metric.name}</span>
          {isEstimated && ['revenue', 'net-revenue', 'profit', 'roas', 'ltv', 'aov', 'arr', 'mrr', 'business-valuation'].includes(metric.id) && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#00F5D4', padding: '2px 5px', background: 'rgba(0,245,212,0.15)', borderRadius: '4px', marginLeft: 'auto', flexShrink: 0 }}>
              ✨ Est.
            </span>
          )}
        </div>
        {/* Pin button */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(metric.id); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            width: '24px',
            height: '24px',
            fontSize: '13px',
            opacity: isPinned ? 1 : 0.3,
            transition: 'all 0.2s ease',
            transform: isPinned ? 'rotate(0deg)' : 'rotate(45deg)',
            filter: isPinned ? `drop-shadow(0 0 4px ${metric.color}60)` : 'none',
            lineHeight: 1,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
          title={isPinned ? 'Unpin metric' : 'Pin metric'}
        >
          📌
        </button>
      </div>

      {/* Inner container — matches heatmap inner box */}
      <div style={{
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '20px 16px 12px 16px',
        boxSizing: 'border-box' as const,
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
      }}>
        {/* Value */}
        <div style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#F0F0F0',
          fontFamily: "'Lato', sans-serif",
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '10px',
        }}>
          {formatValue(currentVal, cfg.prefix, cfg.suffix)}
        </div>

        {/* Delta + Period */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: daysInRange < 3 ? '#6B7280' : deltaColor,
            fontFamily: "'Lato', sans-serif",
          }}>
            {daysInRange < 3 ? '—' : `${isPositive ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%`}
          </span>
          <span style={{
            fontSize: '11px',
            color: '#9CA3AF',
            fontFamily: "'Lato', sans-serif",
            opacity: 0.8,
          }}>
            vs prev {periodLabel.toLowerCase()}
          </span>
        </div>

        {/* Inline sparkline with hover tooltip */}
        {sparklineData.length >= 2 && (
          <StatBoxSparkline
            dataPoints={sparklineData}
            color={metric.color}
            prefix={cfg.prefix}
            suffix={cfg.suffix}
            agg={cfg.agg}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STAT BOXES ROW
// ============================================================================

function StatBoxes({
  activeItems,
  allData,
  timeRange,
  pinnedItems,
  onTogglePin,
  isEstimated,
}: {
  activeItems: Record<string, boolean>;
  allData: Record<string, Array<{ date: Date; value: number }>>;
  timeRange: { start: Date; end: Date };
  pinnedItems: Record<string, boolean>;
  onTogglePin: (id: string) => void;
  isEstimated?: boolean;
}) {
  // Show metrics that are either active OR pinned
  const visibleMetrics = AD_METRICS.filter(m => activeItems[m.id] || pinnedItems[m.id]);
  if (visibleMetrics.length === 0) return null;

  return (
    <div style={{
      padding: '12px 58px 8px 58px',
      width: '100%',
      boxSizing: 'border-box' as const,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: visibleMetrics.length <= 3
          ? 'repeat(auto-fill, minmax(300px, 1fr))'
          : visibleMetrics.length === 5
            ? 'repeat(4, 1fr)'
            : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        padding: '0px',
        width: '100%',
        marginBottom: '40px',
        boxSizing: 'border-box' as const,
      }}>
        {visibleMetrics.map(metric => (
          <StatBox
            key={metric.id}
            metric={metric}
            allData={allData}
            timeRange={timeRange}
            isPinned={!!pinnedItems[metric.id]}
            onTogglePin={onTogglePin}
            isEstimated={isEstimated}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SHIMMER SKELETON COMPONENTS — premium loading state
// ============================================================================

function ShimmerBlock({ width = '100%', height = 16, borderRadius = 6, style }: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width,
      height: `${height}px`,
      borderRadius: `${borderRadius}px`,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmerSweep 1.8s ease-in-out infinite',
      ...style,
    }} />
  );
}

function SkeletonKpiCard({ color }: { color: string }) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <div style={{
      padding: '8px',
      borderRadius: '12px',
      boxShadow: `0 0 20px ${color}20`,
      border: `.5px solid rgba(${r},${g},${b},0.12)`,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      boxSizing: 'border-box' as const,
      width: '100%',
      animation: 'skeletonFadeIn 0.4s ease forwards',
    }}>
      {/* Header pill skeleton */}
      <div style={{
        marginBottom: '10px',
        padding: '8px 14px',
        backgroundColor: `${color}06`,
        borderRadius: '8px',
        border: `1px solid ${color}08`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: `${color}30`,
        }} />
        <ShimmerBlock width="80px" height={12} />
      </div>

      {/* Inner container skeleton */}
      <div style={{
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        padding: '20px 16px',
        boxSizing: 'border-box' as const,
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        gap: '12px',
      }}>
        {/* Value */}
        <ShimmerBlock width="120px" height={28} borderRadius={8} />
        {/* Delta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShimmerBlock width="55px" height={12} />
          <ShimmerBlock width="85px" height={10} />
        </div>
        {/* Sparkline placeholder */}
        <ShimmerBlock width="100%" height={40} borderRadius={8} style={{ marginTop: '4px' }} />
      </div>
    </div>
  );
}

function SkeletonStatBox({ color }: { color: string }) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <div style={{
      padding: '8px',
      borderRadius: '12px',
      boxShadow: `0 0 20px ${color}20`,
      border: `.5px solid rgba(${r},${g},${b},0.12)`,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      boxSizing: 'border-box' as const,
      width: '100%',
      animation: 'skeletonFadeIn 0.4s ease forwards',
    }}>
      <div style={{
        marginBottom: '10px',
        padding: '8px 14px',
        backgroundColor: `${color}06`,
        borderRadius: '8px',
        border: `1px solid ${color}08`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: `${color}30`,
        }} />
        <ShimmerBlock width="70px" height={12} />
      </div>
      <div style={{
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        padding: '20px 16px',
        boxSizing: 'border-box' as const,
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '10px',
      }}>
        <ShimmerBlock width="100px" height={28} borderRadius={8} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShimmerBlock width="45px" height={12} />
          <ShimmerBlock width="75px" height={10} />
        </div>
        <ShimmerBlock width="100%" height={40} borderRadius={8} />
      </div>
    </div>
  );
}

function SkeletonFunnelStage({ color, showArrow }: { color: string; showArrow: boolean }) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <>
      {showArrow && (
        <div style={{
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          flexShrink: 0,
          gap: '6px',
        }}>
          <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
            <path d="M0 7H18M18 7L13 2M18 7L13 12" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <ShimmerBlock width="32px" height={9} borderRadius={4} />
        </div>
      )}
      <div style={{
        flex: 1,
        padding: '8px',
        borderRadius: '12px',
        boxShadow: `0 0 20px ${color}20`,
        border: `.5px solid rgba(${r},${g},${b},0.12)`,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'stretch',
        boxSizing: 'border-box' as const,
        animation: 'skeletonFadeIn 0.4s ease forwards',
        position: 'relative' as const,
        overflow: 'hidden',
      }}>
        <div style={{
          marginBottom: '10px',
          padding: '8px 14px',
          backgroundColor: `${color}06`,
          borderRadius: '8px',
          border: `1px solid ${color}08`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: `${color}30`,
          }} />
          <ShimmerBlock width="60px" height={12} />
        </div>
        <div style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '20px 16px',
          boxSizing: 'border-box' as const,
          flex: 1,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: '10px',
        }}>
          <ShimmerBlock width="80px" height={28} borderRadius={8} />
          <ShimmerBlock width="100px" height={12} />
        </div>
        <div style={{
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }} />
      </div>
    </>
  );
}

// ============================================================================
// KPI LINE CHART — expandable D3 chart below clicked KPI card
// ============================================================================

function KpiLineChart({
  dataPoints,
  color,
  prefix,
  suffix,
  name,
  isEstimated = false,
}: {
  dataPoints: Array<{ date: Date; value: number }>;
  color: string;
  prefix: string;
  suffix: string;
  name: string;
  isEstimated?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ date: string; value: string; x: number; y: number } | null>(null);

  // Check if data is meaningful (not all zeros)
  const hasData = dataPoints.length >= 2 && dataPoints.some(d => d.value !== 0);

  useEffect(() => {
    if (!containerRef.current || !hasData) return;

    const el = containerRef.current;
    const width = el.clientWidth;
    const height = 220;
    const margin = { top: 24, right: 30, bottom: 36, left: 64 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // Clear previous
    d3.select(el).selectAll('*').remove();

    const svg = d3.select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const defs = svg.append('defs');

    // Gradient fill
    const gradId = `kpi-grad-${name.replace(/\s/g, '-')}`;
    const grad = defs.append('linearGradient')
      .attr('id', gradId)
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', innerH)
      .attr('gradientUnits', 'userSpaceOnUse');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.6);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.03);

    // Dimmer gradient for estimated zone
    const estGradId = `kpi-grad-est-${name.replace(/\s/g, '-')}`;
    const estGrad = defs.append('linearGradient')
      .attr('id', estGradId)
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', innerH)
      .attr('gradientUnits', 'userSpaceOnUse');
    estGrad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.3);
    estGrad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.01);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xExtent = d3.extent(dataPoints, d => d.date) as [Date, Date];
    const vals = dataPoints.map(d => d.value);
    const yMin = Math.min(...vals);
    const yMax = Math.max(...vals);
    const yPad = (yMax - yMin) * 0.12 || 1;

    const x = d3.scaleTime().domain(xExtent).range([0, innerW]);
    const y = d3.scaleLinear().domain([Math.max(0, yMin - yPad), yMax + yPad]).range([innerH, 0]);

    // Grid lines
    const yTicks = y.ticks(4);
    g.selectAll('.grid')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#374151').attr('stroke-opacity', 0.25).attr('stroke-width', 0.5);

    // Y-axis labels
    g.selectAll('.y-label')
      .data(yTicks)
      .enter()
      .append('text')
      .attr('x', -10)
      .attr('y', d => y(d) + 1)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('fill', color)
      .style('font-size', '10px')
      .style('font-weight', '400')
      .style('font-family', "'Lato', sans-serif")
      .style('opacity', '0.5')
      .text(d => {
        if (prefix === '$') {
          if (Math.abs(d as number) >= 1000) return `${prefix}${((d as number)/1000).toFixed(1)}k${suffix}`;
          return `${prefix}${(d as number).toFixed(0)}${suffix}`;
        }
        if (suffix === 'x') return `${(d as number).toFixed(2)}${suffix}`;
        if (suffix === '%') return `${(d as number).toFixed(1)}${suffix}`;
        return `${(d as number).toFixed(0)}${suffix}`;
      });

    // X-axis
    const weeksInRange = Math.ceil((xExtent[1].getTime() - xExtent[0].getTime()) / (7*24*60*60*1000));
    let tickCount = 5;
    let tickFmt: (d: Date) => string = d3.timeFormat('%b %d');
    if (weeksInRange > 52) { tickCount = 4; tickFmt = d3.timeFormat('%b %Y'); }
    else if (weeksInRange > 12) { tickCount = 6; tickFmt = d3.timeFormat('%b'); }

    const xAxis = d3.axisBottom(x).ticks(tickCount).tickFormat(tickFmt as any).tickSize(0).tickPadding(12);
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#6B7280').style('font-size', '10px').style('font-weight', '300').style('opacity', '0.7');
    g.selectAll('.domain').remove();

    // ── Attribution window boundary ─────────────────────────────
    const todayMs = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00').getTime();
    const attrWindowMs = 7 * 24 * 60 * 60 * 1000;
    const attrCutoff = new Date(todayMs - attrWindowMs);
    const cutoffX = x(attrCutoff);
    const hasCutoff = isEstimated && cutoffX > 0 && cutoffX < innerW;

    // Clip paths for real vs estimated zones
    if (hasCutoff) {
      const clipReal = defs.append('clipPath').attr('id', `clip-real-${name.replace(/\s/g, '-')}`);
      clipReal.append('rect').attr('x', 0).attr('y', -margin.top).attr('width', cutoffX).attr('height', height);

      const clipEst = defs.append('clipPath').attr('id', `clip-est-${name.replace(/\s/g, '-')}`);
      clipEst.append('rect').attr('x', cutoffX).attr('y', -margin.top).attr('width', innerW - cutoffX + margin.right).attr('height', height);
    }

    // ── Generators ──────────────────────────────────────────────
    const areaGen = d3.area<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y0(innerH)
      .y1(d => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.7));

    const lineGen = d3.line<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.7));

    if (hasCutoff) {
      // ── REAL ZONE: solid area + solid line (clipped left) ─────
      g.append('path')
        .datum(dataPoints)
        .attr('fill', `url(#${gradId})`)
        .attr('d', areaGen)
        .attr('clip-path', `url(#clip-real-${name.replace(/\s/g, '-')})`)
        .attr('opacity', 0)
        .transition().duration(800).ease(d3.easeQuadInOut).attr('opacity', 0.85);

      const solidPath = g.append('path')
        .datum(dataPoints)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('d', lineGen)
        .attr('clip-path', `url(#clip-real-${name.replace(/\s/g, '-')})`)
        .style('filter', `drop-shadow(0 0 10px ${color}60)`);

      const solidLen = (solidPath.node() as SVGPathElement).getTotalLength();
      solidPath
        .attr('stroke-dasharray', `${solidLen} ${solidLen}`)
        .attr('stroke-dashoffset', solidLen)
        .transition().duration(1200).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);

      // ── ESTIMATED ZONE: dimmer area + dashed line (clipped right) ──
      g.append('path')
        .datum(dataPoints)
        .attr('fill', `url(#${estGradId})`)
        .attr('d', areaGen)
        .attr('clip-path', `url(#clip-est-${name.replace(/\s/g, '-')})`)
        .attr('opacity', 0)
        .transition().duration(800).ease(d3.easeQuadInOut).attr('opacity', 0.85);

      g.append('path')
        .datum(dataPoints)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '8,5')
        .attr('d', lineGen)
        .attr('clip-path', `url(#clip-est-${name.replace(/\s/g, '-')})`)
        .attr('opacity', 0.6)
        .style('filter', `drop-shadow(0 0 8px ${color}40)`)
        .transition().delay(1000).duration(600).ease(d3.easeCubicInOut).attr('opacity', 0.6);

      // ── BOUNDARY MARKER: subtle vertical line + transition dot ──
      g.append('line')
        .attr('x1', cutoffX).attr('x2', cutoffX)
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', 'rgba(255,255,255,0.08)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0)
        .transition().delay(1200).duration(400).attr('opacity', 1);

      // Find the value at the cutoff point for the dot
      const cutoffIdx = dataPoints.findIndex(p => p.date >= attrCutoff);
      if (cutoffIdx >= 0) {
        const dotPt = dataPoints[cutoffIdx];
        g.append('circle')
          .attr('cx', x(dotPt.date))
          .attr('cy', y(dotPt.value))
          .attr('r', 4)
          .attr('fill', '#1A1A2E')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .style('filter', `drop-shadow(0 0 6px ${color}60)`)
          .attr('opacity', 0)
          .transition().delay(1200).duration(400).attr('opacity', 1);
      }
    } else {
      // ── NO CUTOFF VISIBLE: render normally ────────────────────
      g.append('path')
        .datum(dataPoints)
        .attr('fill', `url(#${gradId})`)
        .attr('d', areaGen)
        .attr('opacity', 0)
        .transition().duration(800).ease(d3.easeQuadInOut).attr('opacity', 0.85);

      const path = g.append('path')
        .datum(dataPoints)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('d', lineGen)
        .style('filter', `drop-shadow(0 0 10px ${color}60)`);

      const totalLen = (path.node() as SVGPathElement).getTotalLength();
      path
        .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
        .attr('stroke-dashoffset', totalLen)
        .transition().duration(1200).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
    }

    // Hover overlay (vertical line)
    const hoverLine = g.append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .style('display', 'none');

    const hoverDot = g.append('circle')
      .attr('r', 4.5)
      .attr('fill', color)
      .attr('stroke', '#1A1A2E')
      .attr('stroke-width', 2)
      .style('filter', `drop-shadow(0 0 6px ${color}80)`)
      .style('display', 'none');

    // Invisible overlay for hover detection
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const mouseX = mx - margin.left;
        if (mouseX < 0 || mouseX > innerW) return;

        const hoverDate = x.invert(mouseX);

        // Find closest data point
        let closestIdx = 0;
        let closestDist = Infinity;
        dataPoints.forEach((p, i) => {
          const dist = Math.abs(p.date.getTime() - hoverDate.getTime());
          if (dist < closestDist) { closestDist = dist; closestIdx = i; }
        });

        const pt = dataPoints[closestIdx];
        const px = x(pt.date);
        const py = y(pt.value);

        hoverLine.attr('x1', px).attr('x2', px).style('display', null);
        hoverDot.attr('cx', px).attr('cy', py).style('display', null);

        const dateStr = pt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        let valStr = '';
        if (prefix === '$') {
          if (Math.abs(pt.value) >= 1000) valStr = `${prefix}${pt.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}`;
          else valStr = `${prefix}${pt.value.toFixed(2)}${suffix}`;
        } else if (suffix === 'x') {
          valStr = `${pt.value.toFixed(2)}${suffix}`;
        } else if (suffix === '%') {
          valStr = `${pt.value.toFixed(1)}${suffix}`;
        } else {
          valStr = `${pt.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}`;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const ptDateStr = pt.date.toISOString().split('T')[0];
        const todayMs = new Date(todayStr + 'T00:00:00').getTime();
        const ptMs = new Date(ptDateStr + 'T00:00:00').getTime();
        const daysAgo = Math.round((todayMs - ptMs) / (24 * 60 * 60 * 1000));
        const isInAttributionWindow = isEstimated && daysAgo >= 0 && daysAgo < 7;
        const pendingSuffix = ptDateStr === todayStr ? ' (pending)' : '';

        const rect = el.getBoundingClientRect();
        setHoverInfo({
          date: dateStr + pendingSuffix,
          value: valStr,
          x: rect.left + margin.left + px,
          y: rect.top + margin.top + py,
        });
      })
      .on('mouseleave', () => {
        hoverLine.style('display', 'none');
        hoverDot.style('display', 'none');
        setHoverInfo(null);
      });

  }, [dataPoints, color, prefix, suffix, name, hasData, isEstimated]);

  if (!hasData) {
    return (
      <div style={{
        width: '100%',
        height: '220px',
        borderRadius: '12px',
        backgroundColor: 'rgba(255,255,255,0.015)',
        border: `1px solid ${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column' as const,
        gap: '8px',
      }}>
        <span style={{
          fontSize: '13px',
          color: '#6B7280',
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
          opacity: 0.7,
        }}>
          No data available for {name}
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '220px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255,255,255,0.015)',
          border: `1px solid ${color}18`,
          boxShadow: `0 0 30px ${color}15`,
          overflow: 'hidden',
          cursor: 'crosshair',
        }}
      />
      {hoverInfo && (
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.x,
            top: hoverInfo.y - 48,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'kpiTooltipIn 0.12s ease-out',
          }}
        >
          <div style={{
            background: 'rgba(20, 20, 40, 0.92)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${color}30`,
            borderRadius: '10px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${color}15`,
            whiteSpace: 'nowrap' as const,
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#A0A0B0',
              fontFamily: "'Lato', sans-serif",
            }}>
              {hoverInfo.date}
            </span>
            <span style={{
              width: '1px',
              height: '14px',
              background: 'rgba(255,255,255,0.1)',
            }} />
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: color,
              fontFamily: "'Lato', sans-serif",
              letterSpacing: '-0.01em',
            }}>
              {hoverInfo.value}
            </span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes kpiTooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface AdTrackerSectionProps {
  useMockData?: boolean;
}

export const AdTrackerSection: React.FC<AdTrackerSectionProps> = ({
  useMockData = false
}) => {
  // ──────────────────────────────────────────────────────────
  // MASTER VIEW RANGE — set by the timeline brush at the top.
  // This only controls client-side filtering (stat boxes, KPI
  // line charts, funnel counts). API data is fetched once for
  // the full 3-year window so the brush always has full context.
  // ──────────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ad-tracker-time-range');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.start && parsed.end) {
            const start = new Date(parsed.start);
            const end = new Date(parsed.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return { start, end };
            }
          }
        }
      } catch (_e) {}
    }
    return {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
  });

  // ──────────────────────────────────────────────────────────
  // REAL DATA HOOK — fetches from Stripe + Meta APIs.
  // Always fetches the full 3-year window so the timeline
  // brush can show all data. Client-side filtering via
  // timeRange handles the zoom/selection.
  // ──────────────────────────────────────────────────────────

  // Trial attribution toggle — maps revenue to trial start date when ON
  const [trialAttribution, setTrialAttribution] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-trial-attribution');
        if (stored) return stored === 'true';
      } catch (_e) {}
    }
    return true; // ON by default
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const { enabled } = (e as CustomEvent).detail;
      setTrialAttribution(!!enabled);
    };
    window.addEventListener('attributionModelChange', handler);
    return () => window.removeEventListener('attributionModelChange', handler);
  }, []);

  // Smooth crossfade when attribution mode changes — data-aware.
  // Fades out immediately on toggle, then fades back in ONLY once
  // the downstream data (projectedTimeSeries) has actually refreshed.
  const [attrFade, setAttrFade] = useState(1);
  const [attrBlur, setAttrBlur] = useState(0);
  const [attrScale, setAttrScale] = useState(1);
  const attrInitRef = useRef(true);
  const pendingAttrFadeIn = useRef(false);

  // Phase 1: on toggle, immediately fade out
  useEffect(() => {
    if (attrInitRef.current) { attrInitRef.current = false; return; }
    setAttrFade(0.15);
    setAttrBlur(3);
    setAttrScale(0.998);
    pendingAttrFadeIn.current = true;
  }, [trialAttribution]);

  const realDataHook = useAdTrackerData({
    from: new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: getSydneyToday(),
    interval: 'day',
    cogsPercent: 20,
    pollInterval: 30000,
    trialAttribution,
  });
  const [shouldRender, setShouldRender] = useState(false);
  
  // Forecast horizon state
  const [forecastHorizon, setForecastHorizon] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-forecast-horizon');
        if (stored) return parseInt(stored, 10);
      } catch (_e) {}
    }
    return 0;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const { days } = (e as CustomEvent).detail;
      setForecastHorizon(days || 0);
    };
    window.addEventListener('forecastHorizonChange', handler);
    return () => window.removeEventListener('forecastHorizonChange', handler);
  }, []);

  const [pinnedItems, setPinnedItems] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('ad-tracker-pinned');
      return stored ? JSON.parse(stored) : {};
    } catch (_e) { return {}; }
  });
  const [isPinnedTimeRange, setIsPinnedTimeRange] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('ad-tracker-pinned-time-range') === 'true';
    } catch (_e) { return false; }
  });
  const [circumplexMode, setCircumplexMode] = useState<'income' | 'adspend'>('income');
  const [expandedKpi, setExpandedKpi] = useState<string | null>('cost-per-trial');
  const [creativeSortBy, setCreativeSortBy] = useState<string>('roas');
  const [creativeSortDir, setCreativeSortDir] = useState<'desc' | 'asc'>('desc');
  const [creativeFilter, setCreativeFilter] = useState<string>('all');
  const [selectedCreative, setSelectedCreative] = useState<AdCreative | null>(null);
  const [creativeView, setCreativeView] = useState<'vault' | 'grid' | 'lab' | 'blueprint'>('vault');
  const [creativeDna, setCreativeDna] = useState<Record<string, CreativeDNA>>(() => {
    if (typeof window === 'undefined') return {};
    try { const s = localStorage.getItem('creative-dna-cache'); return s ? JSON.parse(s) : {}; } catch (_e) { return {}; }
  });
  const [dnaOverrides, setDnaOverrides] = useState<Record<string, Partial<CreativeDNA>>>(() => {
    if (typeof window === 'undefined') return {};
    try { const s = localStorage.getItem('creative-dna-overrides'); return s ? JSON.parse(s) : {}; } catch (_e) { return {}; }
  });
  const [dnaLoadingIds, setDnaLoadingIds] = useState<Set<string>>(new Set());
  const [dnaErrorIds, setDnaErrorIds] = useState<Set<string>>(new Set());
  const [xrayCreativeId, setXrayCreativeId] = useState<string | null>(null);

  // Creative Performance Timeline — which ad creatives are selected for analysis
  const [selectedCreativePills, setSelectedCreativePills] = useState<Record<string, boolean>>({});

  // Per-ad daily insights from Meta — fetched when pills are selected
  const [perAdInsights, setPerAdInsights] = useState<Record<string, { timeSeries: Array<{ date: string; spend: number; impressions: number; clicks: number; cpc: number; cpm: number; ctr: number; conversions: number; conversionValue: number; reach: number }> }>>({});
  const [perAdInsightsLoading, setPerAdInsightsLoading] = useState(false);

  // Fetch per-ad daily insights when selected pills change
  useEffect(() => {
    const selectedIds = Object.entries(selectedCreativePills)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (selectedIds.length === 0) {
      setPerAdInsights({});
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        setPerAdInsightsLoading(true);
        const fromStr = new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const toStr = getSydneyToday();
        const res = await fetch(
          `/api/ad-tracker/meta-ad-insights?from=${fromStr}&to=${toStr}&adIds=${selectedIds.join(',')}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        setPerAdInsights(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error('Failed to fetch per-ad insights:', e);
      } finally {
        setPerAdInsightsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedCreativePills]);

  // DNA override handler — persists to localStorage
  const handleDnaOverride = useCallback((adId: string, category: string, value: string) => {
    setDnaOverrides(prev => {
      const next = { ...prev, [adId]: { ...prev[adId], [category]: value } };
      try { localStorage.setItem('creative-dna-overrides', JSON.stringify(next)); } catch (_e) {}
      return next;
    });
  }, []);

  // DNA extraction trigger — uses ref to avoid stale closure on creativeDna
  const creativeDnaRef = useRef(creativeDna);
  creativeDnaRef.current = creativeDna;
  const dnaRequestedRef = useRef<Set<string>>(new Set());
  const handleRequestDna = useCallback(async (creative: VaultCreative, force?: boolean) => {
    // Allow retry if previously errored — clear error and requested status
    if (dnaErrorIds.has(creative.id)) {
      setDnaErrorIds(prev => { const n = new Set(prev); n.delete(creative.id); return n; });
      dnaRequestedRef.current.delete(creative.id);
    }
    // Forced re-extraction: clear prior cache + requested flag + all xray caches
    if (force) {
      dnaRequestedRef.current.delete(creative.id);
      setCreativeDna(prev => {
        if (!prev[creative.id]) return prev;
        const next = { ...prev };
        delete next[creative.id];
        try { localStorage.setItem('creative-dna-cache', JSON.stringify(next)); } catch (_e) {}
        return next;
      });
      try {
        localStorage.removeItem(`xray-raw:${creative.id}`);
        localStorage.removeItem(`xray-classify:${creative.id}`);
        localStorage.removeItem(`xray-system:${creative.id}`);
      } catch (_e) {}
    }
    if (dnaRequestedRef.current.has(creative.id)) return;
    if (!force && creativeDnaRef.current[creative.id]) return;
    dnaRequestedRef.current.add(creative.id);
    setDnaLoadingIds(prev => new Set(prev).add(creative.id));

    const isVideo = creative.type === 'video';
    const mediaUrl = isVideo
      ? (creative.videoSourceUrl || creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl)
      : (creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl);

    if (!mediaUrl) {
      setDnaLoadingIds(prev => { const n = new Set(prev); n.delete(creative.id); return n; });
      setDnaErrorIds(prev => new Set(prev).add(creative.id));
      return;
    }

    try {
      // ── STEP 1: Raw extraction (downloads media, scene-by-scene description) ──
      const rawRes = await fetch('/api/ad-tracker/extract-ad-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: creative.id,
          mediaUrl,
          mediaType: isVideo ? 'video' : 'image',
          adName: creative.name,
          adHeadline: creative.headline || '',
          adBody: creative.body || '',
          adDescription: creative.description || '',
          linkUrl: creative.linkUrl || '',
        }),
      });
      const rawJson = await rawRes.json();
      if (rawJson.error || !rawJson.data) throw new Error(`Raw extraction: ${rawJson.error || 'no data'}`);
      const rawData = rawJson.data;
      try { localStorage.setItem(`xray-raw:${creative.id}`, JSON.stringify(rawData)); } catch (_e) {}

      // ── STEP 2: Classification (text-only, derives structured fields) ──
      const classifyRes = await fetch('/api/ad-tracker/classify-ad-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: creative.id, rawExtraction: rawData }),
      });
      const classifyJson = await classifyRes.json();
      if (classifyJson.error || !classifyJson.data) throw new Error(`Classification: ${classifyJson.error || 'no data'}`);
      const classification = classifyJson.data;
      try { localStorage.setItem(`xray-classify:${creative.id}`, JSON.stringify(classification)); } catch (_e) {}
      try { localStorage.setItem(`xray-analysis:${creative.id}`, JSON.stringify({ overallVerdict: classification.summary })); } catch (_e) {}

      // Derive CreativeDNA from classification for vault pills
      const dna = {
        hookType: classification.hookType,
        angle: classification.angle,
        videoFormat: classification.format,
        visualPacing: classification.visualPacing,
        summary: classification.summary || '',
      } as any;
      setCreativeDna(prev => {
        const next = { ...prev, [creative.id]: dna };
        try { localStorage.setItem('creative-dna-cache', JSON.stringify(next)); } catch (_e) {}
        return next;
      });

      // ── STEP 3: Creative system (awareness/desires/features framework) ──
      // Non-blocking — if this fails the core DNA is still valid
      try {
        const sysRes = await fetch('/api/ad-tracker/extract-creative-system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adId: creative.id,
            adName: creative.name,
            adBody: creative.body || '',
            adHeadline: creative.headline || '',
            platform: creative.platform,
            hookType: classification.hookType || '',
            angle: classification.angle || '',
            format: classification.format || '',
            awarenessLevel: classification.awarenessLevel || '',
            mediaUrl,
            mediaType: isVideo ? 'video' : 'image',
          }),
        });
        const sysJson = await sysRes.json();
        if (sysJson.data) {
          try { localStorage.setItem(`xray-system:${creative.id}`, JSON.stringify(sysJson.data)); } catch (_e) {}
        }
      } catch (sysErr) {
        console.warn('Creative system extraction failed (non-fatal):', sysErr);
      }
    } catch (err) {
      console.error('Full DNA extraction failed:', err);
      setDnaErrorIds(prev => new Set(prev).add(creative.id));
      dnaRequestedRef.current.delete(creative.id);
    } finally {
      setDnaLoadingIds(prev => { const n = new Set(prev); n.delete(creative.id); return n; });
    }
  }, [dnaErrorIds]);


  const togglePin = useCallback((id: string) => {
    setPinnedItems(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('ad-tracker-pinned', JSON.stringify(next)); } catch (_e) {}
      return next;
    });
  }, []);

  const togglePinTimeRange = useCallback(() => {
    setIsPinnedTimeRange(prev => {
      const next = !prev;
      try { localStorage.setItem('ad-tracker-pinned-time-range', String(next)); } catch (_e) {}
      return next;
    });
  }, []);

  // Generate all mock data once (fallback)
  const mockMetricData = useMemo(() => generateMetricData(), []);

  // Apply LTV Forecast if horizon > 0, using REAL Stripe-derived assumptions
  const projectedTimeSeries = useMemo(() => {
    // Derive real assumptions from Stripe summary data
    const summary = realDataHook.stripeMetrics?.summary;
    const ts = realDataHook.mergedTimeSeries;

    // Real trial conversion rate from Stripe (value-weighted, strict)
    const realConvRate = summary?.trialConversionRate
      ? summary.trialConversionRate / 100  // stored as e.g. 46.99 → 0.4699
      : 0.40;

    // Real avg subscription price from Stripe (blended — used as fallback)
    const realSubPrice = summary?.avgTransactionValue && summary.avgTransactionValue > 0
      ? summary.avgTransactionValue
      : 99;

    // Per-plan prices derived from currently-active trial subscriptions.
    // These are more accurate than the blended avgTransactionValue because
    // they correctly price each cohort by the plan type they signed up for.
    const monthlySubPrice = (summary?.activeMonthlyTrialsCount && summary.activeMonthlyTrialsCount > 0)
      ? summary.activeMonthlyTrialsValue / summary.activeMonthlyTrialsCount
      : undefined;
    const yearlySubPrice = (summary?.activeYearlyTrialsCount && summary.activeYearlyTrialsCount > 0)
      ? summary.activeYearlyTrialsValue / summary.activeYearlyTrialsCount
      : undefined;

    // Observed monthly/yearly trial ratio — used to split cohorts on days
    // where per-plan signup counts aren't available.
    const totalActiveTrials = (summary?.activeMonthlyTrialsCount || 0) + (summary?.activeYearlyTrialsCount || 0);
    const monthlyTrialRatio = totalActiveTrials > 0
      ? (summary?.activeMonthlyTrialsCount || 0) / totalActiveTrials
      : 1.0;

    // Compute trailing monthly churn from the most recent 30 days of data.
    // Each day already has a trailing 7-day churnRate (percentage).
    // Average the last 30 days' churnRate and compound weekly→monthly.
    // The churn stability guard in applyLTVForecast handles per-day outliers;
    // this gives it a reliable baseline to fall back to.
    let realMonthlyChurn = 0.15; // fallback
    if (ts.length > 0) {
      // Only include days with enough active subs to be statistically meaningful
      const recentDays = ts.slice(-30).filter(d => d.activeSubsCount >= 20);
      const daysWithChurn = recentDays.filter(d => d.churnRate > 0);
      if (daysWithChurn.length >= 3) {
        // Trim top 10% outlier days before averaging to reduce noise
        const sorted = [...daysWithChurn].sort((a, b) => a.churnRate - b.churnRate);
        const trimCount = Math.floor(sorted.length * 0.1);
        const trimmed = sorted.slice(0, sorted.length - trimCount);
        const avgWeeklyChurnPct = trimmed.reduce((s, d) => s + d.churnRate, 0) / trimmed.length;
        const weeklyChurnDecimal = avgWeeklyChurnPct / 100;
        realMonthlyChurn = 1 - Math.pow(1 - weeklyChurnDecimal, 4.3);
      }
    }

    return applyLTVForecast(realDataHook.mergedTimeSeries, forecastHorizon, {
      trialConvRate: realConvRate,
      monthlyChurn: realMonthlyChurn,
      defaultSubPrice: realSubPrice,
      monthlySubPrice,
      yearlySubPrice,
      monthlyTrialRatio,
      // Churn stability guards
      minChurnSampleSubs: 20,
      maxMonthlyChurn: 0.40,
      minMonthlyChurn: 0.005,
    });
  }, [realDataHook.mergedTimeSeries, realDataHook.stripeMetrics, forecastHorizon]);

  // Phase 2: fade back in when projectedTimeSeries has refreshed with new data
  useEffect(() => {
    if (!pendingAttrFadeIn.current) return;
    // Data has updated — give a tiny frame for React to commit the new DOM
    const raf = requestAnimationFrame(() => {
      setAttrFade(1);
      setAttrBlur(0);
      setAttrScale(1);
      pendingAttrFadeIn.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [projectedTimeSeries]);

  // Safety: if data never arrives (API down), fade back in after 5s
  useEffect(() => {
    if (!pendingAttrFadeIn.current) return;
    const safety = setTimeout(() => {
      if (pendingAttrFadeIn.current) {
        setAttrFade(1);
        setAttrBlur(0);
        setAttrScale(1);
        pendingAttrFadeIn.current = false;
      }
    }, 5000);
    return () => clearTimeout(safety);
  }, [trialAttribution]);

  // Convert real API data into the same format mock data uses
  const realMetricData = useMemo(() => {
    if (useMockData || !projectedTimeSeries.length) return null;

    const data: Record<string, Array<{ date: Date; value: number }>> = {};
    const toPoint = (ts: MergedDailyData[], getter: (d: MergedDailyData) => number) =>
      ts.map(d => ({ date: new Date(d.date + 'T00:00:00'), value: getter(d) }));

    data['revenue'] = toPoint(projectedTimeSeries, d => d.revenue);
    data['net-revenue'] = toPoint(projectedTimeSeries, d => d.netRevenue);
    data['ad-spend'] = toPoint(projectedTimeSeries, d => d.adSpend);
    data['cogs'] = toPoint(projectedTimeSeries, d => d.cogs);
    data['profit'] = toPoint(projectedTimeSeries, d => d.profit);
    data['new-customers'] = toPoint(projectedTimeSeries, d => d.newCustomers);
    data['checkouts'] = toPoint(projectedTimeSeries, d => d.checkouts);
    data['purchases'] = toPoint(projectedTimeSeries, d => d.purchases);
    data['successful-charges'] = toPoint(projectedTimeSeries, d => d.successfulCharges);
    data['cpa'] = toPoint(projectedTimeSeries, d => d.cpa);
    data['roas'] = toPoint(projectedTimeSeries, d => d.roas);
    data['aov'] = toPoint(projectedTimeSeries, d => d.aov);
    data['ltv'] = toPoint(projectedTimeSeries, d => d.ltv);
    data['refund-rate'] = toPoint(projectedTimeSeries, d => d.refundRate);
    data['ctr'] = toPoint(projectedTimeSeries, d => d.ctr);
    data['cpc'] = toPoint(projectedTimeSeries, d => d.cpc);
    data['cpm'] = toPoint(projectedTimeSeries, d => d.cpm);
    data['impressions'] = toPoint(projectedTimeSeries, d => d.impressions);
    data['reach'] = toPoint(projectedTimeSeries, d => d.reach);
    data['frequency'] = toPoint(projectedTimeSeries, d => d.frequency);
    data['conversion-rate'] = toPoint(projectedTimeSeries, d => d.conversionRate);
    data['trial-signups'] = toPoint(projectedTimeSeries, d => d.trialSignups);
    data['cash-pending'] = toPoint(projectedTimeSeries, d => d.cashPending);
    data['arr'] = toPoint(projectedTimeSeries, d => d.arr);
    data['mrr'] = toPoint(projectedTimeSeries, d => d.mrr);
    data['business-valuation'] = toPoint(projectedTimeSeries, d => d.businessValuation);
    data['churn'] = toPoint(projectedTimeSeries, d => d.churn);
    data['churn-rate'] = toPoint(projectedTimeSeries, d => d.churnRate);
    data['remaining-ltv'] = toPoint(projectedTimeSeries, d => d.remainingCohortLTV);

    // Books Made — inject daily time series from the dedicated API
    data['books-made'] = realDataHook.booksTimeSeries.map(b => ({
      date: new Date(b.date + 'T00:00:00'),
      value: b.count,
    }));

    return data;
  }, [useMockData, projectedTimeSeries, realDataHook.booksTimeSeries]);

  // Use real data when available; only fall back to mock when explicitly requested
  const allMetricData = useMockData ? mockMetricData : (realMetricData || {});
  const hasRealData = !useMockData && Object.keys(allMetricData).some(k => (allMetricData[k]?.length ?? 0) > 0);
  const showSkeletons = !useMockData && realDataHook.isLoading && !hasRealData;

  // --- Scoped AdSets for Circumplex ---
  const [debouncedTimeRange, setDebouncedTimeRange] = useState(timeRange);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTimeRange(timeRange), 850);
    return () => clearTimeout(t);
  }, [timeRange]);

  const [scopedAdSets, setScopedAdSets] = useState<MetaAdSet[]>([]);
  
  useEffect(() => {
    if (useMockData) return;
    const controller = new AbortController();
    const fetchScoped = async () => {
      try {
        const fromStr = debouncedTimeRange.start.toISOString().split('T')[0];
        const toStr = debouncedTimeRange.end.toISOString().split('T')[0];
        const res = await fetch(`/api/ad-tracker/meta-ads?from=${fromStr}&to=${toStr}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data.adsets) {
          setScopedAdSets(data.adsets);
        }
      } catch (e) {
        // Ignore abort errors
      }
    };
    fetchScoped();
    return () => controller.abort();
  }, [debouncedTimeRange, useMockData]);

  // Use real creatives when available, otherwise mock
  const activeCreatives: AdCreative[] = useMemo(() => {
    if (useMockData || realDataHook.creatives.length === 0) return MOCK_AD_CREATIVES;
    return realDataHook.creatives.map((c: MetaAdCreative): AdCreative => ({
      id: c.adId,
      name: c.adName,
      type: c.creativeType as 'video' | 'image' | 'carousel',
      platform: c.platform,
      platformColor: c.platformColor,
      status: c.status === 'active' ? 'active' : 'paused',
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
        profit: c.metrics.revenue - c.metrics.spend,
        roas: c.metrics.roas,
        cpa: c.metrics.cpa,
        cpc: c.metrics.cpc,
      },
    }));
  }, [useMockData, realDataHook.creatives]);

  // Map activeCreatives to VaultCreative[] enriched with DNA
  const vaultCreatives: VaultCreative[] = useMemo(() => {
    return activeCreatives.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      platform: c.platform,
      platformColor: c.platformColor,
      status: c.status,
      thumbnailUrl: c.thumbnailUrl,
      videoSourceUrl: c.videoSourceUrl,
      imageUrl: c.imageUrl,
      fullPictureUrl: c.fullPictureUrl,
      postUrl: c.postUrl,
      headline: c.headline,
      body: c.body,
      description: c.description,
      linkUrl: c.linkUrl,
      metrics: c.metrics,
      dna: creativeDna[c.id] || null,
      dnaLoading: dnaLoadingIds.has(c.id),
      dnaError: dnaErrorIds.has(c.id),
      dnaOverride: dnaOverrides[c.id] || undefined,
    }));
  }, [activeCreatives, creativeDna, dnaLoadingIds, dnaErrorIds, dnaOverrides]);

  // Derive xrayCreative from vaultCreatives so overrides are always fresh
  const xrayCreative = useMemo(() => {
    if (!xrayCreativeId) return null;
    return vaultCreatives.find(c => c.id === xrayCreativeId) || null;
  }, [xrayCreativeId, vaultCreatives]);


  // Use real Meta adset data — perfectly responsive to time range
  // X-axis = normalized spend volume, Y-axis = ROAS efficiency
  const realChannelItems: CircumplexDataItem[] | null = useMemo(() => {
    if (!scopedAdSets?.length) return null;
    // Filter out adsets with no spend or archived adsets
    const allAdSets = scopedAdSets.filter(a =>
      a.spend > 0 && !a.adsetName.toLowerCase().includes('archive')
    );
    if (allAdSets.length === 0) return null;

    const maxSpend = Math.max(...allAdSets.map(a => a.spend), 1);
    const maxRevenue = Math.max(...allAdSets.map(a => a.conversionValue), 1);

    // Pre-filter: only keep adsets with meaningful data (>5% of max in current mode)
    const adsets = allAdSets.filter(a => {
      const revenueShare = a.conversionValue / maxRevenue;
      const spendShare = a.spend / maxSpend;
      const intensity = circumplexMode === 'income' ? revenueShare : spendShare;
      return intensity > 0.05;
    });
    if (adsets.length === 0) return null;

    // Recompute maxes after filtering
    const filteredMaxSpend = Math.max(...adsets.map(a => a.spend), 1);
    const filteredMaxRevenue = Math.max(...adsets.map(a => a.conversionValue), 1);
    const roasValues = adsets.map(a => a.spend > 0 ? a.conversionValue / a.spend : 0);
    const maxRoas = Math.max(...roasValues, 1);

    // Color palette for adsets — warm-to-cool spectrum
    const adsetColors = [
      '#00F5D4', '#4ECDC4', '#45B7D1', '#A855F7',
      '#F59E0B', '#FF6B6B', '#06D6A0', '#8B5CF6',
    ];

    const totalSpend = adsets.reduce((sum, a) => sum + a.spend, 0);
    const totalRev = adsets.reduce((sum, a) => sum + a.conversionValue, 0);

    return adsets.slice(0, 10).map((adset, i) => {
      // Spend volume (0→1) drives X position (low spend left, high spend right)
      const spendNorm = adset.spend / filteredMaxSpend;
      // ROAS efficiency drives Y position (low ROAS bottom, high ROAS top)
      const roas = adset.spend > 0 ? adset.conversionValue / adset.spend : 0;
      const roasNorm = roas / maxRoas;

      // Map to circular layout: spread adsets perfectly evenly around the circle
      const angle = (i / Math.min(adsets.length, 10)) * 360;
      const rad = (angle * Math.PI) / 180;

      // Intensity driven by mode toggle
      const revenueShare = adset.conversionValue / filteredMaxRevenue;
      const spendShare = adset.spend / filteredMaxSpend;
      const intensity = circumplexMode === 'income' ? revenueShare : spendShare;

      const truePct = circumplexMode === 'income'
        ? (totalRev > 0 ? adset.conversionValue / totalRev : 0)
        : (totalSpend > 0 ? adset.spend / totalSpend : 0);

      const valueAmt = circumplexMode === 'income' ? adset.conversionValue : adset.spend;

      // Clean heavily parameterized names (e.g. DCT #1//Audience//Geo)
      const segments = adset.adsetName.split('//');
      let cleanName = adset.adsetName;
      if (segments.length > 1) {
        cleanName = segments[0] + (segments[1] ? ' - ' + segments[1] : '');
      }
      if (cleanName.length > 28) {
        cleanName = cleanName.substring(0, 26).trim() + '...';
      }
      
      const formattedName = `${cleanName} — $${Math.round(valueAmt).toLocaleString()}`;

      return {
        id: adset.adsetId,
        name: formattedName,
        color: adsetColors[i % adsetColors.length],
        intensity: Math.max(0.15, intensity),
        basePosition: { x: Math.cos(rad), y: Math.sin(rad) },
        angle: ((angle % 360) + 360) % 360,
        influence: 80 + intensity * 120,
        valueLabel: `$${Math.round(valueAmt).toLocaleString()}`,
        percentLabel: `${Math.round(truePct * 100)}%`,
      };
    });
  }, [scopedAdSets, circumplexMode]);

  useEffect(() => {
    const timer = setTimeout(() => setShouldRender(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleTimeRangeChange = useCallback((newTimeRange: { start: Date; end: Date }) => {
    setTimeRange(newTimeRange);
    try {
      localStorage.setItem('ad-tracker-time-range', JSON.stringify({
        start: newTimeRange.start.toISOString(),
        end: newTimeRange.end.toISOString(),
      }));
    } catch (_e) {}
  }, []);

  // Listen for global date range changes from the hamburger menu
  const [cropRange, setCropRange] = useState<{ start: Date; end: Date } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.start && parsed.end) {
            const start = new Date(parsed.start);
            const end = new Date(parsed.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return { start, end };
            }
          }
        }
      } catch (_e) {}
    }
    return null;
  });

  // Sync timeRange with cropRange if it falls completely out of bounds or needs clamping
  useEffect(() => {
    if (!cropRange) return;
    const tStart = timeRange.start.getTime();
    const tEnd = timeRange.end.getTime();
    const cStart = cropRange.start.getTime();
    const cEnd = cropRange.end.getTime();

    if (tEnd < cStart || tStart > cEnd) {
      // Completely out of bounds, reset to cropRange
      handleTimeRangeChange({ start: cropRange.start, end: cropRange.end });
    } else if (tStart < cStart || tEnd > cEnd) {
      // Partially out of bounds, clamp
      handleTimeRangeChange({
        start: new Date(Math.max(tStart, cStart)),
        end: new Date(Math.min(tEnd, cEnd))
      });
    }
  }, [cropRange, timeRange, handleTimeRangeChange]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail;
      if (start && end) {
        const newRange = { start: new Date(start), end: new Date(end) };
        handleTimeRangeChange(newRange);
        setCropRange(newRange);
      }
    };
    window.addEventListener('dateRangeChange', handler);
    return () => window.removeEventListener('dateRangeChange', handler);
  }, [handleTimeRangeChange]);

  const defaultActiveItems = useMemo(() => {
    // Try to restore from localStorage first
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ad-tracker-active-items');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate it has the right shape (at least one key from AD_METRICS)
          if (parsed && typeof parsed === 'object' && AD_METRICS.some(m => m.id in parsed)) {
            return parsed;
          }
        }
      } catch (_e) {}
    }
    // Fall back to hardcoded defaults
    const defaults = ['net-revenue', 'ad-spend', 'profit', 'new-customers'];
    return AD_METRICS.reduce((acc, item) => {
      acc[item.id] = defaults.includes(item.id);
      return acc;
    }, {} as Record<string, boolean>);
  }, []);

  const [currentActiveItems, setCurrentActiveItems] = useState<Record<string, boolean>>(defaultActiveItems);

  const timelineData: TimelineDataItem[] = useMemo(() => {
    // ── Step 1: Collect RAW values per metric ────────────────────────
    const rawValues: Record<string, number[]> = {};
    for (const metric of AD_METRICS) {
      const points = allMetricData[metric.id];
      if (!points || points.length === 0) continue;
      rawValues[metric.id] = points.map(p => p.value);
    }

    // ── Step 2: Shared normalisation across same-unit active metrics ─
    // Metrics that share the same unit (prefix+suffix, e.g. all "$" metrics)
    // are normalised together against a shared maximum. This ensures that
    // Ad Spend at $335 visually appears lower than Revenue at $950, matching
    // the actual data proportions. Metrics with different units (%, x, counts)
    // normalise within their own unit group so they remain readable.
    //
    // Build a map of unit-key → shared max across active metrics in that unit.
    const unitMaxes: Record<string, number> = {};
    for (const metric of AD_METRICS) {
      if (!currentActiveItems[metric.id]) continue;
      const vals = rawValues[metric.id];
      if (!vals || vals.length === 0) continue;
      const cfg = METRIC_AGG[metric.id] || { prefix: '', suffix: '' };
      const unitKey = `${cfg.prefix}|${cfg.suffix}`;
      const metricMax = Math.max(...vals);
      unitMaxes[unitKey] = Math.max(unitMaxes[unitKey] || 0, metricMax);
    }

    return AD_METRICS.map(metric => {
      const points = allMetricData[metric.id];
      const vals = rawValues[metric.id];
      if (!points || points.length === 0 || !vals) {
        return { ...metric, data: [] };
      }

      // Use shared max for same-unit active metrics, fall back to own max
      const cfg = METRIC_AGG[metric.id] || { prefix: '', suffix: '' };
      const unitKey = `${cfg.prefix}|${cfg.suffix}`;
      const maxVal = currentActiveItems[metric.id]
        ? (unitMaxes[unitKey] || Math.max(...vals))
        : Math.max(...vals);

      return {
        ...metric,
        data: points.map((p, i) => ({
          timestamp: p.date instanceof Date ? p.date : new Date(p.date + 'T00:00:00'),
          intensity: maxVal === 0 || !currentActiveItems[metric.id] ? 0 : vals[i] / maxVal,
        })),
      };
    });
  }, [allMetricData, currentActiveItems]);

  // Persist active pill selections to localStorage
  const handleActiveItemsChange = useCallback((activeItems: Record<string, boolean>) => {
    setCurrentActiveItems(activeItems);
    try {
      localStorage.setItem('ad-tracker-active-items', JSON.stringify(activeItems));
    } catch (_e) {}
  }, []);

  const colorScheme = {
    0: '#FF6B6B',
    1: '#FFD700',
    2: '#4ECDC4',
    3: '#45B7D1',
    4: '#8B5CF6',
  };

  // Render stat boxes — uses timeRange from state (updates when brush changes)
  const renderBelowTimeline = useCallback((activeItems: Record<string, boolean>) => {
    // Check if the selected time range includes any attribution-estimated days
    const hasAttributionEstimates = projectedTimeSeries.some(d => {
      const dDate = new Date(d.date + 'T00:00:00');
      return d.isAttributionEstimate && dDate >= timeRange.start && dDate <= timeRange.end;
    });

    return (
      <StatBoxes
        activeItems={activeItems}
        allData={allMetricData}
        timeRange={timeRange}
        pinnedItems={pinnedItems}
        onTogglePin={togglePin}
        isEstimated={forecastHorizon > 0 || (trialAttribution && hasAttributionEstimates)}
      />
    );
  }, [allMetricData, timeRange, pinnedItems, togglePin, forecastHorizon, projectedTimeSeries, trialAttribution]);

  // No hardcoded channel fallback — circumplex shows only real data

  // ============================================================================
  // DERIVED KPI ROWS
  // ============================================================================

  const kpiRowData = useMemo(() => {
    const get = (id: string) => calcRangeValue(
      allMetricData[id] || [],
      timeRange.start,
      timeRange.end,
      METRIC_AGG[id]?.agg || 'sum'
    );

    const getPrev = (id: string) => {
      const rangeDuration = timeRange.end.getTime() - timeRange.start.getTime();
      const prevStart = new Date(timeRange.start.getTime() - rangeDuration);
      const prevEnd = new Date(timeRange.start.getTime());
      return calcRangeValue(
        allMetricData[id] || [],
        prevStart,
        prevEnd,
        METRIC_AGG[id]?.agg || 'sum'
      );
    };

    const revenue = get('revenue');
    const adSpend = get('ad-spend');
    const cogs = get('cogs');
    const profit = get('profit');
    const newCustomers = get('new-customers');
    const purchases = get('purchases');
    const successfulCharges = get('successful-charges');

    const netRevenue = get('net-revenue');
    const prevNetRevenue = getPrev('net-revenue');
    const prevAdSpend = getPrev('ad-spend');
    const prevCogs = getPrev('cogs');
    const prevProfit = getPrev('profit');
    const prevNewCustomers = getPrev('new-customers');
    const prevPurchases = getPrev('purchases');
    const prevSuccessfulCharges = getPrev('successful-charges');

    // Row 1: Revenue & Profit KPIs
    const row1 = [
      {
        id: 'total-revenue',
        name: 'Total Net Revenue',
        icon: '💵',
        color: '#00D4B4',
        value: netRevenue,
        prevValue: prevNetRevenue,
        prefix: '$',
        suffix: '',
        invertDelta: false,
      },
      {
        id: 'net-profit',
        name: 'Net Profit',
        icon: '📈',
        color: '#A855F7',
        value: netRevenue - adSpend - cogs,
        prevValue: prevNetRevenue - prevAdSpend - prevCogs,
        prefix: '$',
        suffix: '',
        invertDelta: false,
      },
      {
        id: 'roas',
        name: 'ROAS',
        icon: '🔄',
        color: '#4ECDC4',
        value: adSpend > 0 ? netRevenue / adSpend : 0,
        prevValue: prevAdSpend > 0 ? prevNetRevenue / prevAdSpend : 0,
        prefix: '',
        suffix: 'x',
        invertDelta: false,
      },
      {
        id: 'gross-profit-per-txn',
        name: 'Gross Profit / Transaction',
        icon: '💎',
        color: '#06D6A0',
        value: successfulCharges > 0 ? (netRevenue - cogs) / successfulCharges : 0,
        prevValue: prevSuccessfulCharges > 0 ? (prevNetRevenue - prevCogs) / prevSuccessfulCharges : 0,
        prefix: '$',
        suffix: '',
        invertDelta: false,
      },
    ];

    // Row 2: Acquisition Costs
    const row2 = [
      {
        id: 'cost-per-lead',
        name: 'Cost Per Lead',
        icon: '📧',
        color: '#45B7D1',
        value: newCustomers > 0 ? adSpend / newCustomers : 0,
        prevValue: prevNewCustomers > 0 ? prevAdSpend / prevNewCustomers : 0,
        prefix: '$',
        suffix: '',
        invertDelta: true,
      },
      {
        id: 'cost-per-trial',
        name: 'Cost Per New Trial',
        icon: '🎁',
        color: '#F59E0B',
        value: purchases > 0 ? adSpend / purchases : 0,
        prevValue: prevPurchases > 0 ? prevAdSpend / prevPurchases : 0,
        prefix: '$',
        suffix: '',
        invertDelta: true,
      },
      {
        id: 'cost-per-converted',
        name: 'Cost Per Converted Trial',
        icon: '💵',
        color: '#FB8500',
        value: successfulCharges > 0 ? adSpend / successfulCharges : 0,
        prevValue: prevSuccessfulCharges > 0 ? prevAdSpend / prevSuccessfulCharges : 0,
        prefix: '$',
        suffix: '',
        invertDelta: true,
      },
    ];

    return { row1, row2 };
  }, [allMetricData, timeRange]);

  // ============================================================================
  // DAILY TIME SERIES FOR EACH DERIVED KPI
  // ============================================================================

  const kpiTimeSeries = useMemo(() => {
    // Build date-keyed maps for safe cross-metric lookups (no index alignment bugs)
    const buildDateMap = (points: Array<{ date: Date; value: number }>) => {
      const map = new Map<string, number>();
      for (const p of points) {
        const key = p.date instanceof Date ? p.date.toISOString().split('T')[0] : String(p.date);
        map.set(key, p.value);
      }
      return map;
    };

    const rev = allMetricData['revenue'] || [];
    const ads = allMetricData['ad-spend'] || [];
    const cgs = allMetricData['cogs'] || [];
    const customers = allMetricData['new-customers'] || [];
    const checkoutsArr = allMetricData['checkouts'] || [];
    const purchasesArr = allMetricData['purchases'] || [];
    const charges = allMetricData['successful-charges'] || [];

    const adsMap = buildDateMap(ads);
    const cgsMap = buildDateMap(cgs);
    const customersMap = buildDateMap(customers);
    const checkoutsMap = buildDateMap(checkoutsArr);
    const purchasesMap = buildDateMap(purchasesArr);
    const chargesMap = buildDateMap(charges);

    const dateKey = (d: Date) => d instanceof Date ? d.toISOString().split('T')[0] : String(d);

    const series: Record<string, Array<{ date: Date; value: number }>> = {};

    series['total-revenue'] = rev.map(p => ({ date: p.date, value: p.value }));
    series['net-profit'] = rev.map(p => {
      const k = dateKey(p.date);
      return { date: p.date, value: p.value - (adsMap.get(k) || 0) - (cgsMap.get(k) || 0) };
    });
    series['roas'] = rev.map(p => {
      const k = dateKey(p.date);
      const adVal = adsMap.get(k) || 0;
      return { date: p.date, value: adVal > 0 ? p.value / adVal : 0 };
    });
    series['gross-profit-per-txn'] = rev.map(p => {
      const k = dateKey(p.date);
      const chargeVal = chargesMap.get(k) || 0;
      const cogVal = cgsMap.get(k) || 0;
      return { date: p.date, value: chargeVal > 0 ? (p.value - cogVal) / chargeVal : 0 };
    });
    series['cost-per-lead'] = ads.map(p => {
      const k = dateKey(p.date);
      const custVal = customersMap.get(k) || 0;
      return { date: p.date, value: custVal > 0 ? p.value / custVal : 0 };
    });
    series['cost-per-trial'] = ads.map(p => {
      const k = dateKey(p.date);
      const purchVal = purchasesMap.get(k) || 0;
      return { date: p.date, value: purchVal > 0 ? p.value / purchVal : 0 };
    });
    series['cost-per-converted'] = ads.map(p => {
      const k = dateKey(p.date);
      const chargeVal = chargesMap.get(k) || 0;
      return { date: p.date, value: chargeVal > 0 ? p.value / chargeVal : 0 };
    });

    // Funnel conversion rate time series (date-keyed)
    // Leads — show raw count over time
    series['funnel-leads'] = customers.map(p => ({ date: p.date, value: p.value }));

    // Checkouts — step rate: checkouts / new customers %
    series['funnel-signups'] = checkoutsArr.map(p => {
      const k = dateKey(p.date);
      const custVal = customersMap.get(k) || 0;
      return { date: p.date, value: custVal > 0 ? (p.value / custVal) * 100 : 0 };
    });

    // Purchases — step rate: purchases / checkouts %
    series['funnel-trials'] = purchasesArr.map(p => {
      const k = dateKey(p.date);
      const checkVal = checkoutsMap.get(k) || 0;
      return { date: p.date, value: checkVal > 0 ? (p.value / checkVal) * 100 : 0 };
    });

    // Charges — step rate: charges / purchases %
    series['funnel-paid'] = charges.map(p => {
      const k = dateKey(p.date);
      const purchVal = purchasesMap.get(k) || 0;
      return { date: p.date, value: purchVal > 0 ? (p.value / purchVal) * 100 : 0 };
    });

    // Filter out series where all values are zero — no meaningful data to chart
    for (const key of Object.keys(series)) {
      if (series[key].every(p => p.value === 0)) {
        series[key] = [];
      }
    }

    return series;
  }, [allMetricData]);

  // Period label for the KPI rows
  const periodLabel = useMemo(() => {
    const daysInRange = Math.round(
      (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysInRange <= 1) return 'yesterday';
    if (daysInRange <= 7) return `${daysInRange} days`;
    if (daysInRange <= 14) return '2 weeks';
    if (daysInRange <= 31) return `${Math.round(daysInRange / 7)} weeks`;
    if (daysInRange <= 93) return `${Math.round(daysInRange / 30)} months`;
    if (daysInRange <= 366) return `${Math.round(daysInRange / 30)} months`;
    return `${(daysInRange / 365).toFixed(1)} years`;
  }, [timeRange]);

  if (!shouldRender) return null;

  return (
    <>
      {!useMockData && (
        <AdTrackerBootLoader
          steps={[
            { id: 'meta-ads', label: 'Meta ads', loading: realDataHook.metaAdsLoading, error: realDataHook.metaAdsError },
            { id: 'creatives', label: 'Ad creatives', loading: realDataHook.creativesLoading, error: realDataHook.creativesError },
            { id: 'stripe', label: 'Stripe metrics', loading: realDataHook.stripeLoading, error: realDataHook.stripeError },
            { id: 'funnel', label: 'Funnel data', loading: realDataHook.funnelLoading, error: realDataHook.funnelError },
          ]}
        />
      )}
      <div className="relative" style={{
        opacity: attrFade,
        filter: `blur(${attrBlur}px)`,
        transform: `scale(${attrScale})`,
        transition: attrFade < 1
          ? 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), filter 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'opacity 0.5s cubic-bezier(0, 0, 0.2, 1), filter 0.5s cubic-bezier(0, 0, 0.2, 1), transform 0.5s cubic-bezier(0, 0, 0.2, 1)',
        willChange: attrFade < 1 ? 'opacity, filter, transform' : 'auto',
      }}>
      <BasePageSection
        data={timelineData}
        insights={[]}
        defaultActiveItems={defaultActiveItems}
        generateHeatmapData={() => []}
        colorScheme={colorScheme}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        timelineEvents={[]}
        timelineLoading={false}
        timelineError={null}
        weeklyHighlights={[]}
        realDataWeeks={new Set()}
        renderBelowTimeline={renderBelowTimeline}
        onActiveItemsChangeExternal={handleActiveItemsChange}
        isPinnedTimeRange={isPinnedTimeRange}
        onTogglePinTimeRange={togglePinTimeRange}
        cropExtent={cropRange}
        isEstimated={trialAttribution}
        renderHeatmapGrid={() => {
          return (
          <div style={{
            padding: '12px 58px 48px 58px',
            width: '100%',
            boxSizing: 'border-box' as const,
          }}>

            {/* View toggle — Vault vs Grid */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '18px' }}>🧬</span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#F4F4F5',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.01em',
                }}>
                  Creative Vault
                </span>
                <a
                  href="/ad-tracker/canvas"
                  style={{
                    padding: '5px 12px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(78,205,196,0.08) 100%)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    color: '#C084FC', fontSize: '11px', fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.2s ease',
                    marginLeft: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(78,205,196,0.15) 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,85,247,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(78,205,196,0.08) 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '12px' }}>⬡</span> Open Canvas
                </a>
              </div>
              <div style={{
                display: 'inline-flex',
                padding: '3px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                position: 'relative' as const,
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute' as const,
                  top: '3px',
                  left: creativeView === 'vault' ? '3px' : creativeView === 'lab' ? 'calc(25% + 1px)' : creativeView === 'blueprint' ? 'calc(50% + 1px)' : 'calc(75% + 1px)',
                  width: 'calc(25% - 4px)',
                  height: 'calc(100% - 6px)',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.06) 100%)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: 'none',
                }} />
                {([['vault', '📊', 'Vault'], ['lab', '🧪', 'Lab'], ['blueprint', '🏗️', 'Blueprint'], ['grid', '⊞', 'Grid']] as const).map(([view, icon, label]) => (
                  <button
                    key={view}
                    onClick={() => setCreativeView(view)}
                    style={{
                      position: 'relative' as const,
                      padding: '6px 16px',
                      borderRadius: '7px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '11px',
                      fontWeight: creativeView === view ? 600 : 400,
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                      color: creativeView === view ? '#D4D4D8' : '#6B7280',
                      zIndex: 1,
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Views */}
            {creativeView === 'vault' ? (
              <CreativeVault
                creatives={vaultCreatives}
                onSelectCreative={(vc) => setXrayCreativeId(vc.id)}
                selectedCreativeId={xrayCreative?.id}
                onDnaOverride={handleDnaOverride}
                onRequestDna={handleRequestDna}
                isLoading={realDataHook.creativesLoading && activeCreatives.length === 0}
              />
            ) : creativeView === 'lab' ? (
              <IntelligenceLab creatives={vaultCreatives} />
            ) : creativeView === 'blueprint' ? (
              <BlueprintStudio creatives={vaultCreatives} />
            ) : (
              /* Grid View — original card layout */
              <>
                {/* Type filter tabs */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  marginBottom: '20px',
                }}>
                  {[
                    { id: 'all', label: 'All Ads' },
                    { id: 'video', label: 'Videos' },
                    { id: 'image', label: 'Images' },
                    { id: 'carousel', label: 'Carousel' },
                  ].map(tab => {
                    const isActive = creativeFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setCreativeFilter(tab.id)}
                        style={{
                          padding: '8px 20px 10px',
                          border: 'none',
                          borderBottom: isActive ? '2px solid #4ECDC4' : '2px solid transparent',
                          background: 'none',
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 400,
                          fontFamily: "'Lato', sans-serif",
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          color: isActive ? '#E5E7EB' : '#6B7280',
                          outline: 'none',
                          whiteSpace: 'nowrap' as const,
                          marginBottom: '-1px',
                          letterSpacing: '0.1px',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sort controls row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  marginBottom: '28px',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', fontFamily: "'Lato', sans-serif", letterSpacing: '0.6px', textTransform: 'uppercase' as const, flexShrink: 0 }}>Order by</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {[
                      { id: 'roas', label: 'ROAS' }, { id: 'ad-spend', label: 'Spend' }, { id: 'revenue', label: 'Net Revenue' },
                      { id: 'impressions', label: 'Impressions' }, { id: 'conversions', label: 'Purchases' },
                      { id: 'cpc', label: 'CPC' }, { id: 'ctr', label: 'CTR' },
                    ].map(opt => (
                      <button key={opt.id} onClick={() => setCreativeSortBy(opt.id)} style={{
                        padding: '6px 14px 8px', border: 'none', borderBottom: creativeSortBy === opt.id ? '2px solid #A855F7' : '2px solid transparent',
                        background: 'none', fontSize: '12px', fontWeight: creativeSortBy === opt.id ? 600 : 400,
                        fontFamily: "'Lato', sans-serif", cursor: 'pointer', transition: 'all 0.2s ease',
                        color: creativeSortBy === opt.id ? '#E5E7EB' : '#6B7280', outline: 'none', whiteSpace: 'nowrap' as const, marginBottom: '-1px',
                      }}>{opt.label}</button>
                    ))}
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'inline-flex', padding: '2px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' as const, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute' as const, top: '2px', left: creativeSortDir === 'desc' ? '2px' : 'calc(50% + 1px)', width: 'calc(50% - 3px)', height: 'calc(100% - 4px)', borderRadius: '6px', backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.18)', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', pointerEvents: 'none' }} />
                    {(['desc', 'asc'] as const).map(dir => (
                      <button key={dir} onClick={() => setCreativeSortDir(dir)} style={{ position: 'relative' as const, padding: '5px 14px', borderRadius: '6px', border: 'none', background: 'none', fontSize: '11px', fontWeight: 500, fontFamily: "'Lato', sans-serif", cursor: 'pointer', transition: 'color 0.2s ease', color: creativeSortDir === dir ? '#D4D4D8' : '#6B7280', zIndex: 1, outline: 'none', whiteSpace: 'nowrap' as const }}>
                        {dir === 'desc' ? '↓ Desc' : '↑ Asc'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', width: '100%', boxSizing: 'border-box' as const }}>
                  {(() => {
                    const gridFiltered = creativeFilter === 'all' ? activeCreatives : activeCreatives.filter(c => c.type === creativeFilter);
                    const gridSorted = [...gridFiltered].sort((a, b) => {
                      const va = a.metrics[creativeSortBy] ?? 0;
                      const vb = b.metrics[creativeSortBy] ?? 0;
                      return creativeSortDir === 'desc' ? vb - va : va - vb;
                    });
                    return gridSorted.map(creative => (
                      <AdCreativeCard
                        key={creative.id}
                        creative={creative}
                        onClickMedia={setSelectedCreative}
                        isMediaModalOpen={selectedCreative?.id === creative.id}
                      />
                    ));
                  })()}
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* CREATIVE PERFORMANCE TIMELINE — per-ad real Meta data         */}
            {/* ============================================================ */}
            <div style={{
              marginTop: '48px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              paddingTop: '24px',
            }}>
              {/* Section header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 0 8px 8px',
              }}>
                <span style={{ fontSize: '18px' }}>🎨</span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#F4F4F5',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.01em',
                }}>Creative Performance</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 400,
                  color: '#6B7280',
                  fontFamily: "'Lato', sans-serif",
                  marginLeft: '8px',
                }}>Select ads to compare</span>
              </div>

              {/* Ad creative pills — matches BaseTimeline pill strip */}
              {(() => {
                const PILL_COLORS = ['#FF6B6B','#00F5D4','#A855F7','#45B7D1','#F59E0B','#34D399','#F472B6','#818CF8','#FBBF24','#4ECDC4'];
                const perfCreatives = activeCreatives.slice(0, 15);
                return (
                  <>
                    <style>{`
                      .creative-pills-strip {
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                      }
                      .creative-pills-strip::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    <div
                      className="creative-pills-strip"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        gap: '8px',
                        padding: '6px 15px 14px 8px',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        cursor: 'grab',
                        userSelect: 'none',
                        mask: 'linear-gradient(90deg, black calc(100% - 15px), transparent 100%)',
                        WebkitMask: 'linear-gradient(90deg, black calc(100% - 15px), transparent 100%)',
                      }}
                    >
                      {perfCreatives.map((c, i) => {
                        const isActive = !!selectedCreativePills[c.id];
                        const pillColor = PILL_COLORS[i % PILL_COLORS.length];
                        const dName = c.name.length > 22 ? c.name.substring(0, 20).trim() + '…' : c.name;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCreativePills(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '18px',
                              border: `1px solid ${pillColor}${isActive ? '60' : '30'}`,
                              backgroundColor: isActive ? `${pillColor}15` : `${pillColor}08`,
                              color: isActive ? pillColor : `${pillColor}80`,
                              backdropFilter: 'blur(10px)',
                              boxShadow: isActive ? `0 2px 8px rgba(0,0,0,0.2), 0 0 12px ${pillColor}30` : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              opacity: isActive ? 1 : 0.65,
                              transform: isActive ? 'scale(1)' : 'scale(0.98)',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              outline: 'none',
                              fontFamily: "'Lato', sans-serif",
                              fontSize: '12px',
                              fontWeight: isActive ? 500 : 400,
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.transform = isActive ? 'scale(1.02)' : 'scale(1)';
                              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.transform = isActive ? 'scale(1)' : 'scale(0.98)';
                              (e.currentTarget as HTMLButtonElement).style.opacity = isActive ? '1' : '0.65';
                            }}
                          >
                            {/* Thumbnail only — no colored dot since chart shows aggregate lines */}
                            {(c.thumbnailUrl || c.fullPictureUrl || c.imageUrl) ? (
                              <img
                                src={(c.thumbnailUrl || c.fullPictureUrl || c.imageUrl)!}
                                alt=""
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  border: `1.5px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
                                  boxShadow: isActive ? '0 0 6px rgba(255,255,255,0.15)' : 'none',
                                  opacity: isActive ? 1 : 0.6,
                                  transition: 'all 0.25s ease',
                                }}
                              />
                            ) : null}
                            <span style={{ flexShrink: 0 }}>{dName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* Per-ad performance chart */}
              {(() => {
                const PILL_COLORS = ['#FF6B6B','#00F5D4','#A855F7','#45B7D1','#F59E0B','#34D399','#F472B6','#818CF8','#FBBF24','#4ECDC4'];
                const perfCreatives = activeCreatives.slice(0, 15);
                const selCreatives = perfCreatives.filter(c => selectedCreativePills[c.id]);

                if (selCreatives.length === 0) {
                  return (
                    <div style={{
                      width: '100%', height: '180px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#6B7280', fontSize: '13px',
                      fontFamily: "'Lato', sans-serif", fontWeight: 400, opacity: 0.7,
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.015)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      Select one or more ads above to compare their performance
                    </div>
                  );
                }

                if (perAdInsightsLoading && Object.keys(perAdInsights).length === 0) {
                  return (
                    <div style={{
                      width: '100%', height: '180px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#A855F7', fontSize: '13px',
                      fontFamily: "'Lato', sans-serif", fontWeight: 500, opacity: 0.8,
                    }}>
                      Loading per-ad insights from Meta…
                    </div>
                  );
                }

                // Metric definitions
                const AD_PERF_METRICS = [
                  { id: 'p-spend', name: 'Ad Spend', color: '#FF6B6B', field: 'spend', prefix: '$', suffix: '', agg: 'sum' as const },
                  { id: 'p-revenue', name: 'Revenue', color: '#00F5D4', field: 'conversionValue', prefix: '$', suffix: '', agg: 'sum' as const },
                  { id: 'p-impressions', name: 'Impressions', color: '#34D399', field: 'impressions', prefix: '', suffix: '', agg: 'sum' as const },
                  { id: 'p-clicks', name: 'Clicks', color: '#45B7D1', field: 'clicks', prefix: '', suffix: '', agg: 'sum' as const },
                  { id: 'p-conversions', name: 'Conversions', color: '#F59E0B', field: 'conversions', prefix: '', suffix: '', agg: 'sum' as const },
                  { id: 'p-reach', name: 'Reach', color: '#FBBF24', field: 'reach', prefix: '', suffix: '', agg: 'sum' as const },
                  { id: 'p-roas', name: 'ROAS', color: '#4ECDC4', field: '_roas', prefix: '', suffix: 'x', agg: 'avg' as const },
                  { id: 'p-cpa', name: 'CPA', color: '#FB8500', field: '_cpa', prefix: '$', suffix: '', agg: 'avg' as const },
                  { id: 'p-ctr', name: 'CTR', color: '#3B82F6', field: 'ctr', prefix: '', suffix: '%', agg: 'avg' as const },
                  { id: 'p-cpc', name: 'CPC', color: '#F472B6', field: 'cpc', prefix: '$', suffix: '', agg: 'avg' as const },
                  { id: 'p-cpm', name: 'CPM', color: '#818CF8', field: 'cpm', prefix: '$', suffix: '', agg: 'avg' as const },
                ];

                // Collect all unique dates
                const dateSet = new Set<string>();
                for (const c of selCreatives) {
                  (perAdInsights[c.id]?.timeSeries || []).forEach(d => dateSet.add(d.date));
                }
                const allDates = Array.from(dateSet).sort();
                const dateObjs = allDates.map(d => new Date(d + 'T00:00:00'));

                // Per-ad lookup: adId -> date -> raw daily row
                const adDateMap: Record<string, Record<string, any>> = {};
                for (const c of selCreatives) {
                  adDateMap[c.id] = {};
                  (perAdInsights[c.id]?.timeSeries || []).forEach(d => { adDateMap[c.id][d.date] = d; });
                }

                // Build aggregated metric data: metricId -> Array<{date, value}>
                const perfMetricData: Record<string, Array<{ date: Date; value: number }>> = {};
                // Per-ad breakdown for tooltips
                const perfPerAdData: Record<string, Array<Record<string, number>>> = {};

                for (const m of AD_PERF_METRICS) {
                  perfMetricData[m.id] = [];
                  perfPerAdData[m.id] = [];

                  for (let di = 0; di < allDates.length; di++) {
                    const dateStr = allDates[di];
                    let combined = 0;
                    let totalSpend = 0, totalRevenue = 0, totalConversions = 0;
                    const adVals: Record<string, number> = {};

                    // Pre-compute totals
                    for (const c of selCreatives) {
                      const dd = adDateMap[c.id]?.[dateStr];
                      totalSpend += dd?.spend ?? 0;
                      totalRevenue += dd?.conversionValue ?? 0;
                      totalConversions += dd?.conversions ?? 0;
                    }

                    if (m.field === '_roas') {
                      combined = totalSpend > 0 ? totalRevenue / totalSpend : 0;
                      for (const c of selCreatives) {
                        const dd = adDateMap[c.id]?.[dateStr];
                        adVals[c.id] = (dd?.spend ?? 0) > 0 ? (dd?.conversionValue ?? 0) / dd.spend : 0;
                      }
                    } else if (m.field === '_cpa') {
                      combined = totalConversions > 0 ? totalSpend / totalConversions : 0;
                      for (const c of selCreatives) {
                        const dd = adDateMap[c.id]?.[dateStr];
                        adVals[c.id] = (dd?.conversions ?? 0) > 0 ? (dd?.spend ?? 0) / dd.conversions : 0;
                      }
                    } else if (m.agg === 'sum') {
                      for (const c of selCreatives) {
                        const dd = adDateMap[c.id]?.[dateStr];
                        const v = dd ? ((dd as any)[m.field] ?? 0) : 0;
                        adVals[c.id] = v;
                        combined += v;
                      }
                    } else {
                      // weighted avg by spend
                      let wSum = 0;
                      for (const c of selCreatives) {
                        const dd = adDateMap[c.id]?.[dateStr];
                        const v = dd ? ((dd as any)[m.field] ?? 0) : 0;
                        const s = dd?.spend ?? 0;
                        adVals[c.id] = v;
                        combined += v * s;
                        wSum += s;
                      }
                      combined = wSum > 0 ? combined / wSum : 0;
                    }

                    perfMetricData[m.id].push({ date: dateObjs[di], value: combined });
                    perfPerAdData[m.id].push(adVals);
                  }
                }

                // Build normalised timeline data (same as hero)
                const perfTimeline: TimelineDataItem[] = AD_PERF_METRICS.map(m => {
                  const pts = perfMetricData[m.id];
                  if (!pts || pts.length === 0) return { id: m.id, name: m.name, color: m.color, data: [] };
                  const vals = pts.map(p => p.value);
                  const maxVal = Math.max(...vals, 0.001);
                  return {
                    id: m.id, name: m.name, color: m.color,
                    data: pts.map((p, i) => ({
                      timestamp: p.date,
                      intensity: vals[i] / maxVal,
                    })),
                  };
                });

                const perfActive: Record<string, boolean> = {};
                AD_PERF_METRICS.forEach(m => {
                  perfActive[m.id] = ['p-spend', 'p-revenue', 'p-roas'].includes(m.id);
                });

                const subtitleText = selCreatives.length === 1
                  ? `${selCreatives[0].name.length > 30 ? selCreatives[0].name.substring(0, 28).trim() + '…' : selCreatives[0].name} — Meta Ads`
                  : `${selCreatives.length} Ads Combined — Meta Ads`;

                return (
                  <div style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
                    <BaseTimeline
                      data={perfTimeline}
                      timeRange={timeRange}
                      onTimeRangeChange={handleTimeRangeChange}
                      initialActiveItems={perfActive}
                      preGeneratedTimelineData={perfTimeline}
                      significantEvents={[]}
                      tooltipInsights={[]}
                      tooltipSubtitle={subtitleText}
                      cropExtent={cropRange}
                      isEstimated={false}
                      tooltipValueFormatter={(itemId: string, _intensity: number, granularity: string, hoverDate: Date) => {
                        const m = AD_PERF_METRICS.find(x => x.id === itemId);
                        if (!m) return `${(_intensity * 100).toFixed(0)}%`;
                        const metricData = perfMetricData[m.id];
                        if (!metricData || metricData.length === 0) return formatValue(0, m.prefix, m.suffix);

                        if (granularity === 'daily' || granularity === 'daily-detailed') {
                          let closestIdx = 0;
                          let closestDist = Infinity;
                          metricData.forEach((p, i) => {
                            const dist = Math.abs(p.date.getTime() - hoverDate.getTime());
                            if (dist < closestDist) { closestDist = dist; closestIdx = i; }
                          });
                          return formatValue(metricData[closestIdx].value, m.prefix, m.suffix);
                        }

                        // For non-daily granularities, find closest point
                        let closestIdx = 0;
                        let closestDist = Infinity;
                        metricData.forEach((p, i) => {
                          const dist = Math.abs(p.date.getTime() - hoverDate.getTime());
                          if (dist < closestDist) { closestDist = dist; closestIdx = i; }
                        });
                        return formatValue(metricData[closestIdx].value, m.prefix, m.suffix);
                      }}
                      tooltipCustomDetails={selCreatives.length > 1
                        ? (itemId: string, _value: number, hoverDate: Date) => {
                            const m = AD_PERF_METRICS.find(x => x.id === itemId);
                            if (!m) return null;
                            const metricData = perfMetricData[m.id];
                            if (!metricData || metricData.length === 0) return null;

                            // Find closest index
                            let closestIdx = 0;
                            let closestDist = Infinity;
                            metricData.forEach((p, i) => {
                              const dist = Math.abs(p.date.getTime() - hoverDate.getTime());
                              if (dist < closestDist) { closestDist = dist; closestIdx = i; }
                            });

                            const adVals = perfPerAdData[m.id]?.[closestIdx];
                            if (!adVals) return null;

                            // Filter out ads with $0 values to reduce noise
                            const lines = selCreatives
                              .filter(c => (adVals[c.id] ?? 0) > 0.001)
                              .map(c => {
                              const pillColor = PILL_COLORS[perfCreatives.indexOf(c) % PILL_COLORS.length];
                              // Clean ad name: strip // separators, trim, and truncate cleanly
                              const cleanName = c.name.replace(/\/\//g, ' / ').replace(/\s+/g, ' ').trim();
                              const adName = cleanName.length > 25 ? cleanName.substring(0, 23).trim() + '…' : cleanName;
                              const val = adVals[c.id] ?? 0;
                              return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:3px 0;">
                                <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
                                  <div style="width:6px;height:6px;border-radius:50%;background:${pillColor};flex-shrink:0;"></div>
                                  <span style="font-size:11px;color:#9CA3AF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${adName}</span>
                                </div>
                                <span style="font-size:11px;font-weight:600;color:${pillColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;flex-shrink:0;font-variant-numeric:tabular-nums;text-align:right;">${formatValue(val, m.prefix, m.suffix)}</span>
                              </div>`;
                            }).join('');

                            if (!lines) return null;
                            return `<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;margin-top:4px;">${lines}</div>`;
                          }
                        : undefined
                      }
                      yAxisValueRange={(activeItems: Record<string, boolean>) => {
                        const activeMetricIds = Object.keys(activeItems).filter(id => activeItems[id]);
                        if (activeMetricIds.length === 0) return undefined;

                        const firstActiveId = activeMetricIds[0];
                        const firstMeta = AD_PERF_METRICS.find(x => x.id === firstActiveId);
                        const allSamePrefix = activeMetricIds.every(id => {
                          const mm = AD_PERF_METRICS.find(x => x.id === id);
                          return mm && mm.prefix === (firstMeta?.prefix || '');
                        });
                        const prefix = allSamePrefix ? (firstMeta?.prefix || '') : '';
                        const suffix = allSamePrefix ? (firstMeta?.suffix || '') : '';

                        let allValues: number[] = [];
                        for (const id of activeMetricIds) {
                          const data = perfMetricData[id];
                          if (data && data.length > 0) {
                            allValues = allValues.concat(data.map(d => d.value));
                          }
                        }
                        if (allValues.length === 0) return undefined;

                        return {
                          min: 0,
                          max: Math.max(...allValues),
                          prefix,
                          suffix,
                          color: firstMeta?.color || '#00F5D4',
                        };
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
          );
        }}
        renderLeftPanel={() => (
          <div style={{ position: 'relative' }}>
            {/* Mode toggle — top left */}
            <div style={{
              position: 'absolute',
              top: '24px',
              left: '24px',
              zIndex: 10,
              display: 'flex',
              width: '210px',
              padding: '3px',
              borderRadius: '12px',
              backgroundColor: 'rgba(15,15,30,0.85)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}>
              {/* Sliding indicator */}
              <div style={{
                position: 'absolute',
                top: '3px',
                left: circumplexMode === 'income' ? '3px' : 'calc(50% + 1px)',
                width: 'calc(50% - 4px)',
                height: 'calc(100% - 6px)',
                borderRadius: '9px',
                background: circumplexMode === 'income'
                  ? 'linear-gradient(135deg, rgba(0,245,212,0.12) 0%, rgba(0,245,212,0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(255,107,107,0.12) 0%, rgba(255,107,107,0.05) 100%)',
                border: `1px solid ${circumplexMode === 'income' ? 'rgba(0,245,212,0.20)' : 'rgba(255,107,107,0.20)'}`,
                boxShadow: circumplexMode === 'income'
                  ? '0 0 10px rgba(0,245,212,0.08)'
                  : '0 0 10px rgba(255,107,107,0.08)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: 'none',
              }} />
              {(['income', 'adspend'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCircumplexMode(mode)}
                  style={{
                    position: 'relative' as const,
                    flex: 1,
                    minWidth: 0,
                    padding: '6px 8px',
                    borderRadius: '9px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '11px',
                    fontWeight: circumplexMode === mode ? 600 : 400,
                    fontFamily: DESIGN_TOKENS.fonts.body,
                    letterSpacing: '0.01em',
                    cursor: 'pointer',
                    transition: 'color 0.25s ease',
                    color: circumplexMode === mode
                      ? (mode === 'income' ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.error)
                      : 'rgba(160,160,176,0.5)',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    whiteSpace: 'nowrap' as const,
                    outline: 'none',
                    WebkitAppearance: 'none' as any,
                  }}
                >
                  {mode === 'income' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill={circumplexMode === mode ? DESIGN_TOKENS.colors.accent : 'rgba(160,160,176,0.4)'} style={{ transition: 'fill 0.25s ease' }} />
                      <path d="M12.5 6.5h-1v2.05A4.48 4.48 0 009 10.5c0 1.57.88 2.84 2.12 3.52l.38.18v3.3h-1a.5.5 0 00-.5.5.5.5 0 00.5.5h3a.5.5 0 00.5-.5.5.5 0 00-.5-.5h-1v-2.8c1.24-.68 2.12-1.95 2.12-3.52 0-1.03-.43-1.96-1.12-2.65V6.5zm-.5 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill={circumplexMode === mode ? DESIGN_TOKENS.colors.accent : 'rgba(160,160,176,0.4)'} style={{ transition: 'fill 0.25s ease' }} />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" stroke={circumplexMode === mode ? DESIGN_TOKENS.colors.error : 'rgba(160,160,176,0.4)'} strokeWidth="1.5" fill="none" style={{ transition: 'stroke 0.25s ease' }} />
                      <circle cx="12" cy="12" r="6" stroke={circumplexMode === mode ? DESIGN_TOKENS.colors.error : 'rgba(160,160,176,0.4)'} strokeWidth="1.5" fill="none" style={{ transition: 'stroke 0.25s ease' }} />
                      <circle cx="12" cy="12" r="2" fill={circumplexMode === mode ? DESIGN_TOKENS.colors.error : 'rgba(160,160,176,0.4)'} style={{ transition: 'fill 0.25s ease' }} />
                    </svg>
                  )}
                  {mode === 'income' ? 'Net Revenue' : 'Spend'}
                </button>
              ))}
            </div>
            <BaseCircumplex
              data={realChannelItems || []}
              timeRange={timeRange}
            />
          </div>
        )}
        renderRightPanel={() => <StripeLiveFeed events={useMockData ? undefined : realDataHook.liveEvents} />}
        renderAboveHeatmap={() => {
          // Helper to get raw KPI time-series sparkline data (daily)
          const computeSparkline = (kpiId: string) => {
            const raw = kpiTimeSeries[kpiId];
            if (!raw || raw.length < 2) return [];
            return raw.filter(p => p.date >= timeRange.start && p.date <= timeRange.end);
          };

          return (
          <>

            {/* ============================================================ */}
            {/* KPI ROW 1 — Revenue & Profit                                 */}
            {/* ============================================================ */}
            <div style={{
              padding: '0 58px',
              marginTop: '48px',
              width: '100%',
              boxSizing: 'border-box' as const,
            }}>
              {showSkeletons ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '30px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}>
                  {['#00D4B4', '#A855F7', '#4ECDC4', '#06D6A0'].map((c, i) => (
                    <SkeletonKpiCard key={`sk-r1-${i}`} color={c} />
                  ))}
                </div>
              ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '30px',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}>
                {kpiRowData.row1.map(kpi => {
                  const delta = kpi.prevValue !== 0
                    ? ((kpi.value - kpi.prevValue) / Math.abs(kpi.prevValue)) * 100
                    : 0;
                  const isPositive = delta >= 0;
                  const deltaColor =
                    (isPositive && !kpi.invertDelta) || (!isPositive && kpi.invertDelta)
                      ? '#00F5D4'
                      : '#FF6B6B';
                  const r = parseInt(kpi.color.slice(1, 3), 16);
                  const g = parseInt(kpi.color.slice(3, 5), 16);
                  const b = parseInt(kpi.color.slice(5, 7), 16);

                  const isSelected = expandedKpi === kpi.id;
                  return (
                    <div
                      key={kpi.id}
                      onClick={() => setExpandedKpi(prev => prev === kpi.id ? null : kpi.id)}
                      style={{
                        padding: '8px',
                        borderRadius: '12px',
                        boxShadow: isSelected ? `0 0 32px ${kpi.color}50` : `0 0 20px ${kpi.color}30`,
                        border: isSelected ? `1px solid rgba(${r},${g},${b},0.45)` : `.5px solid rgba(${r},${g},${b},0.18)`,
                        display: 'flex',
                        flexDirection: 'column' as const,
                        alignItems: 'stretch',
                        boxSizing: 'border-box' as const,
                        width: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      {/* Header pill */}
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: kpi.color,
                        marginBottom: '10px',
                        padding: '8px 14px',
                        backgroundColor: `${kpi.color}06`,
                        borderRadius: '8px',
                        border: `1px solid ${kpi.color}12`,
                        textAlign: 'left' as const,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: "'Lato', sans-serif",
                        boxSizing: 'border-box' as const,
                        letterSpacing: '0.2px',
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: kpi.color,
                          filter: `drop-shadow(0 0 4px ${kpi.color}60)`,
                          flexShrink: 0,
                        }} />
                        <span>{kpi.name}</span>
                      </div>

                      {/* Inner container */}
                      <div style={{
                        width: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '20px 16px',
                        boxSizing: 'border-box' as const,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column' as const,
                        justifyContent: 'center',
                      }}>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: 700,
                          color: '#F0F0F0',
                          fontFamily: "'Lato', sans-serif",
                          letterSpacing: '-0.02em',
                          lineHeight: 1.1,
                          marginBottom: '10px',
                        }}>
                          {formatValue(kpi.value, kpi.prefix, kpi.suffix)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: deltaColor,
                            fontFamily: "'Lato', sans-serif",
                          }}>
                            {isPositive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#9CA3AF',
                            fontFamily: "'Lato', sans-serif",
                            opacity: 0.8,
                          }}>
                            vs prev {periodLabel.toLowerCase()}
                          </span>
                        </div>

                        {/* Inline sparkline with hover tooltip */}
                        {(() => {
                          const sparkData = computeSparkline(kpi.id);
                          return sparkData.length >= 2 ? (
                            <StatBoxSparkline
                              dataPoints={sparkData}
                              color={kpi.color}
                              prefix={kpi.prefix}
                              suffix={kpi.suffix}
                              agg={'avg' as AggType}
                            />
                          ) : null;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Expanded chart below row 1 */}
            {expandedKpi && kpiRowData.row1.some(k => k.id === expandedKpi) && (() => {
              const kpi = kpiRowData.row1.find(k => k.id === expandedKpi)!;
              const series = kpiTimeSeries[kpi.id];
              if (!series) return null;
              return (
                <div style={{
                  padding: '0 58px',
                  marginTop: '20px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  animation: 'kpiChartFadeIn 0.35s ease forwards',
                }}>
                  <style>{`@keyframes kpiChartFadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
                  <KpiLineChart
                    dataPoints={series.filter(p => p.date >= timeRange.start && p.date <= timeRange.end)}
                    color={kpi.color}
                    prefix={kpi.prefix}
                    suffix={kpi.suffix}
                    name={kpi.name}
                    isEstimated={trialAttribution}
                  />
                </div>
              );
            })()}

            {/* ============================================================ */}
            {/* KPI ROW 2 — Acquisition Costs                                */}
            {/* ============================================================ */}
            <div style={{
              padding: '0 58px',
              marginTop: '30px',
              marginBottom: '48px',
              width: '100%',
              boxSizing: 'border-box' as const,
            }}>
              {showSkeletons ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '30px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}>
                  {['#45B7D1', '#F59E0B', '#FB8500'].map((c, i) => (
                    <SkeletonKpiCard key={`sk-r2-${i}`} color={c} />
                  ))}
                </div>
              ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '30px',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}>
                {kpiRowData.row2.map(kpi => {
                  const delta = kpi.prevValue !== 0
                    ? ((kpi.value - kpi.prevValue) / Math.abs(kpi.prevValue)) * 100
                    : 0;
                  const isPositive = delta >= 0;
                  const deltaColor =
                    (isPositive && !kpi.invertDelta) || (!isPositive && kpi.invertDelta)
                      ? '#00F5D4'
                      : '#FF6B6B';
                  const r = parseInt(kpi.color.slice(1, 3), 16);
                  const g = parseInt(kpi.color.slice(3, 5), 16);
                  const b = parseInt(kpi.color.slice(5, 7), 16);

                  const isSelected = expandedKpi === kpi.id;
                  return (
                    <div
                      key={kpi.id}
                      onClick={() => setExpandedKpi(prev => prev === kpi.id ? null : kpi.id)}
                      style={{
                        padding: '8px',
                        borderRadius: '12px',
                        boxShadow: isSelected ? `0 0 32px ${kpi.color}50` : `0 0 20px ${kpi.color}30`,
                        border: isSelected ? `1px solid rgba(${r},${g},${b},0.45)` : `.5px solid rgba(${r},${g},${b},0.18)`,
                        display: 'flex',
                        flexDirection: 'column' as const,
                        alignItems: 'stretch',
                        boxSizing: 'border-box' as const,
                        width: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      {/* Header pill */}
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: kpi.color,
                        marginBottom: '10px',
                        padding: '8px 14px',
                        backgroundColor: `${kpi.color}06`,
                        borderRadius: '8px',
                        border: `1px solid ${kpi.color}12`,
                        textAlign: 'left' as const,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: "'Lato', sans-serif",
                        boxSizing: 'border-box' as const,
                        letterSpacing: '0.2px',
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: kpi.color,
                          filter: `drop-shadow(0 0 4px ${kpi.color}60)`,
                          flexShrink: 0,
                        }} />
                        <span>{kpi.name}</span>
                      </div>

                      {/* Inner container */}
                      <div style={{
                        width: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '20px 16px',
                        boxSizing: 'border-box' as const,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column' as const,
                        justifyContent: 'center',
                      }}>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: 700,
                          color: '#F0F0F0',
                          fontFamily: "'Lato', sans-serif",
                          letterSpacing: '-0.02em',
                          lineHeight: 1.1,
                          marginBottom: '10px',
                        }}>
                          {formatValue(kpi.value, kpi.prefix, kpi.suffix)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: deltaColor,
                            fontFamily: "'Lato', sans-serif",
                          }}>
                            {isPositive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#9CA3AF',
                            fontFamily: "'Lato', sans-serif",
                            opacity: 0.8,
                          }}>
                            vs prev {periodLabel.toLowerCase()}
                          </span>
                        </div>

                        {/* Inline sparkline with hover tooltip */}
                        {(() => {
                          const sparkData = computeSparkline(kpi.id);
                          return sparkData.length >= 2 ? (
                            <StatBoxSparkline
                              dataPoints={sparkData}
                              color={kpi.color}
                              prefix={kpi.prefix}
                              suffix={kpi.suffix}
                              agg={'avg' as AggType}
                            />
                          ) : null;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Expanded chart below row 2 — also handles funnel stage clicks */}
            {expandedKpi && (() => {
              // Check row2 KPIs first
              const row2Kpi = kpiRowData.row2.find(k => k.id === expandedKpi);
              if (row2Kpi) {
                const series = kpiTimeSeries[row2Kpi.id];
                if (!series) return null;
                return (
                  <div style={{
                    padding: '0 58px',
                    marginTop: '20px',
                    marginBottom: '48px',
                    width: '100%',
                    boxSizing: 'border-box' as const,
                    animation: 'kpiChartFadeIn 0.35s ease forwards',
                  }}>
                    <KpiLineChart
                      dataPoints={series.filter(p => p.date >= timeRange.start && p.date <= timeRange.end)}
                      color={row2Kpi.color}
                      prefix={row2Kpi.prefix}
                      suffix={row2Kpi.suffix}
                      name={row2Kpi.name}
                      isEstimated={false}
                    />
                  </div>
                );
              }
              // Check funnel stage IDs
              const funnelMap: Record<string, { seriesId: string; color: string; prefix: string; suffix: string; chartLabel: string }> = {
                'leads':   { seriesId: 'funnel-leads',   color: '#45B7D1', prefix: '', suffix: '',  chartLabel: 'Email Leads' },
                'signups': { seriesId: 'funnel-signups', color: '#00F5D4', prefix: '', suffix: '%', chartLabel: 'Leads → Signups Rate' },
                'trials':  { seriesId: 'funnel-trials',  color: '#F59E0B', prefix: '', suffix: '%', chartLabel: 'Signups → Trials Rate' },
                'paid':    { seriesId: 'funnel-paid',    color: '#A855F7', prefix: '', suffix: '%', chartLabel: 'Trials → Paid Rate' },
              };
              const funnel = funnelMap[expandedKpi];
              if (funnel) {
                const series = kpiTimeSeries[funnel.seriesId];
                if (!series) return null;
                return (
                  <div style={{
                    padding: '0 58px',
                    marginTop: '20px',
                    marginBottom: '48px',
                    width: '100%',
                    boxSizing: 'border-box' as const,
                    animation: 'kpiChartFadeIn 0.35s ease forwards',
                  }}>
                    <KpiLineChart
                      dataPoints={series.filter(p => p.date >= timeRange.start && p.date <= timeRange.end)}
                      color={funnel.color}
                      prefix={funnel.prefix}
                      suffix={funnel.suffix}
                      name={funnel.chartLabel}
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* ============================================================ */}
            {/* CONVERSION FUNNEL                                             */}
            {/* ============================================================ */}
            {(() => {
              if (showSkeletons) {
                const funnelColors = ['#45B7D1', '#00F5D4', '#F59E0B', '#A855F7'];
                return (
                  <div style={{
                    padding: '0 58px',
                    marginTop: '30px',
                    marginBottom: '48px',
                    width: '100%',
                    boxSizing: 'border-box' as const,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      width: '100%',
                      gap: '0px',
                    }}>
                      {funnelColors.map((c, i) => (
                        <SkeletonFunnelStage key={`sk-fn-${i}`} color={c} showArrow={i > 0} />
                      ))}
                    </div>
                  </div>
                );
              }

              const get = (id: string) => calcRangeValue(
                allMetricData[id] || [], timeRange.start, timeRange.end,
                METRIC_AGG[id]?.agg || 'sum'
              );

              const stages = [
                { id: 'leads',   label: 'Leads',          count: Math.round(get('new-customers')),      color: '#45B7D1', icon: '📧', seriesId: 'funnel-leads',   prefix: '', suffix: '', chartLabel: 'Leads' },
                { id: 'signups', label: 'Checkouts',      count: Math.round(get('checkouts')),          color: '#00F5D4', icon: '✍️', seriesId: 'funnel-signups', prefix: '', suffix: '%', chartLabel: 'Customers → Checkouts Rate' },
                { id: 'trials',  label: 'Purchases',      count: Math.round(get('purchases')),          color: '#F59E0B', icon: '🎁', seriesId: 'funnel-trials',  prefix: '', suffix: '%', chartLabel: 'Checkouts → Purchases Rate' },
                { id: 'paid',    label: 'Charges',        count: Math.round(get('successful-charges')), color: '#A855F7', icon: '💎', seriesId: 'funnel-paid',    prefix: '', suffix: '%', chartLabel: 'Purchases → Charges Rate' },
              ];

              const firstCount = stages[0].count;

              return (
                <div style={{
                  padding: '0 58px',
                  marginTop: '30px',
                  marginBottom: '48px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    width: '100%',
                    gap: '0px',
                  }}>
                    {stages.map((stage, idx) => {
                      const prev = idx > 0 ? stages[idx - 1] : null;
                      const stepRate = prev && prev.count > 0 ? (stage.count / prev.count) * 100 : null;
                      const cumRate = idx > 0 && firstCount > 0 ? (stage.count / firstCount) * 100 : null;
                      const dropOff = stepRate !== null ? 100 - stepRate : null;

                      const r = parseInt(stage.color.slice(1, 3), 16);
                      const g = parseInt(stage.color.slice(3, 5), 16);
                      const b = parseInt(stage.color.slice(5, 7), 16);

                      const fillPct = firstCount > 0 ? Math.min((stage.count / firstCount) * 100, 100) : 0;

                      return (
                        <React.Fragment key={stage.id}>
                          {/* Drop-off connector */}
                          {prev && dropOff !== null && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column' as const,
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '56px',
                              flexShrink: 0,
                              gap: '6px',
                            }}>
                              <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                                <path d="M0 7H18M18 7L13 2M18 7L13 12" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                color: '#FF6B6B',
                                fontFamily: "'Lato', sans-serif",
                                opacity: 0.7,
                                letterSpacing: '0.2px',
                              }}>
                                −{dropOff.toFixed(0)}%
                              </span>
                            </div>
                          )}

                          {/* Stage card — clickable, same structure as KPI cards */}
                          <div
                            onClick={() => setExpandedKpi(prev => prev === stage.id ? null : stage.id)}
                            style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '12px',
                            boxShadow: expandedKpi === stage.id ? `0 0 32px ${stage.color}50` : `0 0 20px ${stage.color}30`,
                            border: expandedKpi === stage.id ? `1px solid rgba(${r},${g},${b},0.45)` : `.5px solid rgba(${r},${g},${b},0.18)`,
                            display: 'flex',
                            flexDirection: 'column' as const,
                            alignItems: 'stretch',
                            boxSizing: 'border-box' as const,
                            width: '100%',
                            position: 'relative' as const,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                          }}>
                            {/* Header pill */}
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: stage.color,
                              marginBottom: '10px',
                              padding: '8px 14px',
                              backgroundColor: `${stage.color}06`,
                              borderRadius: '8px',
                              border: `1px solid ${stage.color}12`,
                              textAlign: 'left' as const,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontFamily: "'Lato', sans-serif",
                              boxSizing: 'border-box' as const,
                              letterSpacing: '0.2px',
                            }}>
                              <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: stage.color,
                                filter: `drop-shadow(0 0 4px ${stage.color}60)`,
                                flexShrink: 0,
                              }} />
                              <span>{stage.label}</span>
                            </div>

                            {/* Inner container */}
                            <div style={{
                              width: '100%',
                              backgroundColor: 'rgba(255, 255, 255, 0.01)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '12px',
                              padding: '20px 16px',
                              boxSizing: 'border-box' as const,
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column' as const,
                              justifyContent: 'center',
                            }}>
                              {/* Count */}
                              <div style={{
                                fontSize: '28px',
                                fontWeight: 700,
                                color: '#F0F0F0',
                                fontFamily: "'Lato', sans-serif",
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                                marginBottom: '10px',
                              }}>
                                {stage.count.toLocaleString('en-US')}
                              </div>

                              {/* Conversion info */}
                              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                                {stepRate !== null && prev ? (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: stage.color,
                                        fontFamily: "'Lato', sans-serif",
                                      }}>
                                        {stepRate.toFixed(1)}%
                                      </span>
                                      <span style={{
                                        fontSize: '11px',
                                        color: '#9CA3AF',
                                        fontFamily: "'Lato', sans-serif",
                                        opacity: 0.8,
                                      }}>
                                        {prev.label.toLowerCase()} → {stage.label.toLowerCase()}
                                      </span>
                                    </div>
                                    {cumRate !== null && idx > 1 && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: 500,
                                          color: 'rgba(255,255,255,0.35)',
                                          fontFamily: "'Lato', sans-serif",
                                        }}>
                                          {cumRate.toFixed(1)}%
                                        </span>
                                        <span style={{
                                          fontSize: '10px',
                                          color: '#6B7280',
                                          fontFamily: "'Lato', sans-serif",
                                          opacity: 0.7,
                                        }}>
                                          from {stages[0].label.toLowerCase()}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span style={{
                                    fontSize: '11px',
                                    color: '#9CA3AF',
                                    fontFamily: "'Lato', sans-serif",
                                    opacity: 0.8,
                                  }}>
                                    top of funnel
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bottom fill bar */}
                            <div style={{
                              position: 'absolute' as const,
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '2px',
                              backgroundColor: 'rgba(255,255,255,0.02)',
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${fillPct}%`,
                                background: `linear-gradient(90deg, ${stage.color}60, ${stage.color}20)`,
                                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                              }} />
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>


                </div>
              );
            })()}
          </>
          );
        }}
        yAxisValueRange={(activeItems: Record<string, boolean>) => {
          // Find the active metric IDs
          const activeMetricIds = Object.keys(activeItems).filter(id => activeItems[id]);
          if (activeMetricIds.length === 0) return undefined;

          // Determine the best prefix/suffix/color based on active metrics
          // Priority: use the formatting of the first active metric
          const firstActiveId = activeMetricIds[0];
          const firstCfg = METRIC_AGG[firstActiveId] || { prefix: '', suffix: '' };
          const firstMetric = AD_METRICS.find(m => m.id === firstActiveId);

          // If all active metrics share the same prefix, use it; otherwise use the first's
          const allSamePrefix = activeMetricIds.every(id => (METRIC_AGG[id]?.prefix || '') === firstCfg.prefix);
          const prefix = allSamePrefix ? firstCfg.prefix : '';
          const suffix = allSamePrefix ? firstCfg.suffix : '';

          // Compute the value range from all active metrics' data
          let allValues: number[] = [];
          for (const id of activeMetricIds) {
            const data = allMetricData[id];
            if (data && data.length > 0) {
              allValues = allValues.concat(data.map(d => d.value));
            }
          }
          if (allValues.length === 0) return undefined;

          return {
            min: 0,
            max: Math.max(...allValues),
            prefix,
            suffix,
            color: firstMetric?.color || '#00F5D4',
          };
        }}
        tooltipCustomDetails={(itemId: string, value: number, hoverDate: Date) => {
          if (itemId === 'cash-pending' && value > 0) {
            const s = realDataHook.stripeMetrics?.summary;
            const convRate = s?.trialConversionRate || 0;
            const convRateByCount = s?.trialConversionRateByCount || 0;
            const histTotal = s?.historicalTrialsTotal || 0;
            const histConverted = s?.historicalTrialsConverted || 0;
            const histFailed = s?.historicalTrialsFailed || 0;

            // Look up per-day trial pipeline from merged time series
            // Fall back to summary-level data (live current state) when per-day data is empty
            const hoverDateStr = hoverDate.getFullYear() + '-' + String(hoverDate.getMonth() + 1).padStart(2, '0') + '-' + String(hoverDate.getDate()).padStart(2, '0');
            const dayData = realDataHook.mergedTimeSeries.find(d => d.date === hoverDateStr);
            const dayYearlyCount = dayData?.trialCountYearly || 0;
            const dayYearlyVal = dayData?.trialPipelineYearly || 0;
            const dayMonthlyCount = dayData?.trialCountMonthly || 0;
            const dayMonthlyVal = dayData?.trialPipelineMonthly || 0;
            const dayGrossPipeline = dayYearlyVal + dayMonthlyVal;

            // If per-day pipeline is 0, fall back to live summary values
            const useSummaryFallback = dayGrossPipeline === 0 && (s?.activeTrialsValue || 0) > 0;
            const yearlyCount = useSummaryFallback ? (s?.activeYearlyTrialsCount || 0) : dayYearlyCount;
            const yearlyVal = useSummaryFallback ? (s?.activeYearlyTrialsValue || 0) : dayYearlyVal;
            const monthlyCount = useSummaryFallback ? (s?.activeMonthlyTrialsCount || 0) : dayMonthlyCount;
            const monthlyVal = useSummaryFallback ? (s?.activeMonthlyTrialsValue || 0) : dayMonthlyVal;
            const grossPipeline = yearlyVal + monthlyVal;
            const displayPendingCash = useSummaryFallback ? (s?.estimatedPendingCash || value) : value;

            const fmtUSD = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const rowStyle = 'display: flex; justify-content: space-between; margin-bottom: 2px; gap: 16px;';
            const labelStyle = 'color: #9CA3AF;';
            const valStyle = 'font-weight: 500; font-family: \'SF Pro Display\', sans-serif; white-space: nowrap;';
            const dimValStyle = valStyle + ' color: rgba(255,255,255,0.4);';
            const sepStyle = 'border-top: 1px solid rgba(255,255,255,0.06); margin: 5px 0;';
            return `
              <div style="font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.5; background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 6px; margin-top: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 10px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Active Trials Pipeline</div>
                ${yearlyCount > 0 ? `<div style="${rowStyle}">
                  <span style="${labelStyle}">Yearly subs (${yearlyCount}):</span>
                  <span style="${valStyle}">${fmtUSD(yearlyVal)}</span>
                </div>` : ''}
                ${monthlyCount > 0 ? `<div style="${rowStyle}">
                  <span style="${labelStyle}">Monthly subs (${monthlyCount}):</span>
                  <span style="${valStyle}">${fmtUSD(monthlyVal)}</span>
                </div>` : ''}
                <div style="${rowStyle}">
                  <span style="${labelStyle}">Gross Pipeline:</span>
                  <span style="${valStyle}">${fmtUSD(grossPipeline)}</span>
                </div>
                <div style="${sepStyle}"></div>
                <div style="${rowStyle}">
                  <span style="${labelStyle}">× Conversion (value):</span>
                  <span style="${valStyle}">${convRate.toFixed(1)}%</span>
                </div>
                <div style="${rowStyle}">
                  <span style="${labelStyle}">× Conversion (count):</span>
                  <span style="${dimValStyle}">${convRateByCount.toFixed(1)}%</span>
                </div>
                ${histTotal > 0 ? `<div style="${sepStyle}"></div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Historical (excl. 100% off)</div>
                <div style="${rowStyle}">
                  <span style="${labelStyle}">${histConverted} converted / ${histTotal} trials</span>
                  <span style="${dimValStyle}">${histFailed} failed</span>
                </div>` : ''}
              </div>
            `;
          }
          return null;
        }}
        tooltipValueFormatter={(itemId: string, _intensity: number, granularity: string, hoverDate: Date) => {
          const metricData = allMetricData[itemId];
          const cfg = METRIC_AGG[itemId] || { agg: 'sum' as AggType, prefix: '', suffix: '' };
          if (!metricData || metricData.length === 0) {
            return formatValue(0, cfg.prefix, cfg.suffix);
          }

          // Determine the date range for the hovered period based on granularity
          let periodStart: Date;
          let periodEnd: Date;

          if (granularity === 'daily' || granularity === 'daily-detailed') {
            // Single day — find the closest data point's date
            let closestIdx = 0;
            let closestDist = Infinity;
            metricData.forEach((p, i) => {
              const dist = Math.abs(p.date.getTime() - hoverDate.getTime());
              if (dist < closestDist) { closestDist = dist; closestIdx = i; }
            });
            return formatValue(metricData[closestIdx].value, cfg.prefix, cfg.suffix);
          } else if (granularity === 'weekly') {
            // Week containing hoverDate (Mon–Sun)
            periodStart = new Date(hoverDate);
            const day = periodStart.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            periodStart.setDate(periodStart.getDate() + mondayOffset);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 7);
          } else if (granularity === 'biweekly') {
            // 2-week window centered on hoverDate
            periodStart = new Date(hoverDate);
            const day = periodStart.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            periodStart.setDate(periodStart.getDate() + mondayOffset - 7);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 14);
          } else if (granularity === 'monthly') {
            // Calendar month containing hoverDate
            periodStart = new Date(hoverDate.getFullYear(), hoverDate.getMonth(), 1);
            periodEnd = new Date(hoverDate.getFullYear(), hoverDate.getMonth() + 1, 1);
          } else {
            // Fallback: single day
            periodStart = new Date(hoverDate);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 1);
          }

          // Filter data points within the period
          const pointsInPeriod = metricData.filter(p =>
            p.date >= periodStart && p.date < periodEnd
          );

          if (pointsInPeriod.length === 0) {
            // Fallback: find nearest single point
            let closestIdx = 0;
            let closestDist = Infinity;
            metricData.forEach((p, i) => {
              const dist = Math.abs(p.date.getTime() - hoverDate.getTime());
              if (dist < closestDist) { closestDist = dist; closestIdx = i; }
            });
            return formatValue(metricData[closestIdx].value, cfg.prefix, cfg.suffix);
          }

          // Aggregate based on metric type
          let aggregatedValue: number;
          if (cfg.agg === 'sum') {
            aggregatedValue = pointsInPeriod.reduce((sum, p) => sum + p.value, 0);
          } else {
            // avg
            aggregatedValue = pointsInPeriod.reduce((sum, p) => sum + p.value, 0) / pointsInPeriod.length;
          }

          return formatValue(aggregatedValue, cfg.prefix, cfg.suffix);
        }}
      />
      {selectedCreative && typeof document !== 'undefined' && createPortal(
        <CreativeMediaModal
          creative={selectedCreative}
          onClose={() => setSelectedCreative(null)}
        />,
        document.body
      )}
      {xrayCreative && typeof document !== 'undefined' && createPortal(
        <AdXRayPanel
          creative={xrayCreative}
          onClose={() => setXrayCreativeId(null)}
          onDnaOverride={handleDnaOverride}
        />,
        document.body
      )}
      <style>{`
        @keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes skeletonFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      </div>
    </>
  );
};
