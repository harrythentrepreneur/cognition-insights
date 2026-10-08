'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { VaultCreative } from './CreativeVault';
import {
  HOOK_TYPE_COLORS, ANGLE_COLORS, FORMAT_COLORS,
} from './CreativeVault';

// ============================================================================
// TYPES
// ============================================================================

interface GroupedMetrics {
  key: string;
  count: number;
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  avgRoas: number;
  avgCpa: number;
  avgCtr: number;
}

interface ComboEntry {
  hookType: string;
  angle: string;
  format: string;
  count: number;
  totalSpend: number;
  avgRoas: number;
  avgCpa: number;
}

interface HeatmapCell {
  hookType: string;
  angle: string;
  avgRoas: number;
  count: number;
}

interface StrategyCard {
  type: 'double_down' | 'test_new' | 'kill' | 'iterate';
  title: string;
  hookType: string;
  angle: string;
  format: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  scriptIdea: string;
}

const STRATEGY_CONFIG: Record<string, { icon: string; label: string; color: string; gradient: string }> = {
  double_down: { icon: '🚀', label: 'Scale', color: '#06D6A0', gradient: 'linear-gradient(135deg, rgba(6,214,160,0.10) 0%, rgba(6,214,160,0.02) 100%)' },
  test_new: { icon: '🧪', label: 'Test', color: '#A855F7', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0.02) 100%)' },
  iterate: { icon: '⚡', label: 'Iterate', color: '#F59E0B', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.02) 100%)' },
  kill: { icon: '💀', label: 'Kill', color: '#EF4444', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.02) 100%)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'High', color: '#EF4444' },
  medium: { label: 'Med', color: '#F59E0B' },
  low: { label: 'Low', color: '#6B7280' },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatLabel(val: string): string {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtUSD(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
}

function groupBy(
  creatives: VaultCreative[],
  getKey: (c: VaultCreative) => string | undefined,
): GroupedMetrics[] {
  const map = new Map<string, { spend: number; revenue: number; conversions: number; ctr: number; count: number }>();
  for (const c of creatives) {
    const key = getKey(c);
    if (!key) continue;
    const existing = map.get(key) || { spend: 0, revenue: 0, conversions: 0, ctr: 0, count: 0 };
    existing.spend += c.metrics['ad-spend'] || 0;
    existing.revenue += c.metrics.revenue || 0;
    existing.conversions += c.metrics.conversions || 0;
    existing.ctr += c.metrics.ctr || 0;
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([key, d]) => ({
    key,
    count: d.count,
    totalSpend: d.spend,
    totalRevenue: d.revenue,
    totalConversions: d.conversions,
    avgRoas: d.spend > 0 ? d.revenue / d.spend : 0,
    avgCpa: d.conversions > 0 ? d.spend / d.conversions : 0,
    avgCtr: d.count > 0 ? d.ctr / d.count : 0,
  })).sort((a, b) => b.avgRoas - a.avgRoas);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface IntelligenceLabProps {
  creatives: VaultCreative[];
}

export function IntelligenceLab({ creatives }: IntelligenceLabProps) {
  // Only include creatives with DNA extracted
  const dnaCreatives = useMemo(() =>
    creatives.filter(c => c.dna || c.dnaOverride),
  [creatives]);

  const hookData = useMemo(() =>
    groupBy(dnaCreatives, c => c.dnaOverride?.hookType || c.dna?.hookType),
  [dnaCreatives]);

  const angleData = useMemo(() =>
    groupBy(dnaCreatives, c => c.dnaOverride?.angle || c.dna?.angle),
  [dnaCreatives]);

  const formatData = useMemo(() =>
    groupBy(dnaCreatives, c => c.dnaOverride?.videoFormat || c.dna?.videoFormat),
  [dnaCreatives]);

  // Top DNA combos — hookType × angle × format
  const combos = useMemo((): ComboEntry[] => {
    const map = new Map<string, { hookType: string; angle: string; format: string; spend: number; revenue: number; conversions: number; count: number }>();
    for (const c of dnaCreatives) {
      const h = c.dnaOverride?.hookType || c.dna?.hookType;
      const a = c.dnaOverride?.angle || c.dna?.angle;
      const f = c.dnaOverride?.videoFormat || c.dna?.videoFormat;
      if (!h || !a || !f) continue;
      const key = `${h}|${a}|${f}`;
      const existing = map.get(key) || { hookType: h, angle: a, format: f, spend: 0, revenue: 0, conversions: 0, count: 0 };
      existing.spend += c.metrics['ad-spend'] || 0;
      existing.revenue += c.metrics.revenue || 0;
      existing.conversions += c.metrics.conversions || 0;
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values())
      .map(d => ({
        hookType: d.hookType,
        angle: d.angle,
        format: d.format,
        count: d.count,
        totalSpend: d.spend,
        avgRoas: d.spend > 0 ? d.revenue / d.spend : 0,
        avgCpa: d.conversions > 0 ? d.spend / d.conversions : 0,
      }))
      .sort((a, b) => b.avgRoas - a.avgRoas)
      .slice(0, 10);
  }, [dnaCreatives]);

  // Heatmap: hook × angle
  const heatmapData = useMemo((): { cells: HeatmapCell[]; hooks: string[]; angles: string[] } => {
    const map = new Map<string, { spend: number; revenue: number; count: number }>();
    const hooksSet = new Set<string>();
    const anglesSet = new Set<string>();

    for (const c of dnaCreatives) {
      const h = c.dnaOverride?.hookType || c.dna?.hookType;
      const a = c.dnaOverride?.angle || c.dna?.angle;
      if (!h || !a) continue;
      hooksSet.add(h);
      anglesSet.add(a);
      const key = `${h}|${a}`;
      const existing = map.get(key) || { spend: 0, revenue: 0, count: 0 };
      existing.spend += c.metrics['ad-spend'] || 0;
      existing.revenue += c.metrics.revenue || 0;
      existing.count += 1;
      map.set(key, existing);
    }

    const cells: HeatmapCell[] = [];
    for (const [key, d] of map) {
      const [hookType, angle] = key.split('|');
      cells.push({
        hookType, angle,
        avgRoas: d.spend > 0 ? d.revenue / d.spend : 0,
        count: d.count,
      });
    }

    return { cells, hooks: Array.from(hooksSet), angles: Array.from(anglesSet) };
  }, [dnaCreatives]);

  // Totals for header
  const totalAnalyzed = dnaCreatives.length;
  const totalCreatives = creatives.length;
  const totalSpend = dnaCreatives.reduce((s, c) => s + (c.metrics['ad-spend'] || 0), 0);
  const totalRevenue = dnaCreatives.reduce((s, c) => s + (c.metrics.revenue || 0), 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // --- Strategy state ---
  const [strategies, setStrategies] = useState<StrategyCard[]>(() => {
    if (typeof window === 'undefined') return [];
    try { const s = localStorage.getItem('cse-strategies'); return s ? JSON.parse(s) : []; } catch (_e) { return []; }
  });
  const [strategyTimestamp, setStrategyTimestamp] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try { const t = localStorage.getItem('cse-strategies-ts'); return t ? Number(t) : null; } catch (_e) { return null; }
  });
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const strategyAbortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => { strategyAbortRef.current?.abort(); };
  }, []);

  const handleGenerateStrategy = useCallback(async () => {
    if (strategyLoading) return;
    setStrategyLoading(true);
    setStrategyError(null);
    strategyAbortRef.current?.abort();
    const controller = new AbortController();
    strategyAbortRef.current = controller;

    try {
      const res = await fetch('/api/ad-tracker/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hookPerformance: hookData.map(d => ({ key: d.key, count: d.count, totalSpend: d.totalSpend, avgRoas: d.avgRoas, avgCpa: d.avgCpa })),
          anglePerformance: angleData.map(d => ({ key: d.key, count: d.count, totalSpend: d.totalSpend, avgRoas: d.avgRoas, avgCpa: d.avgCpa })),
          formatPerformance: formatData.map(d => ({ key: d.key, count: d.count, totalSpend: d.totalSpend, avgRoas: d.avgRoas, avgCpa: d.avgCpa })),
          topCombos: combos.map(c => ({ hookType: c.hookType, angle: c.angle, format: c.format, count: c.count, totalSpend: c.totalSpend, avgRoas: c.avgRoas })),
          totalCreatives,
          totalAnalyzed,
          overallRoas,
          totalSpend,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.strategies) {
        const ts = Date.now();
        setStrategies(data.strategies);
        setStrategyTimestamp(ts);
        setExpandedCards(new Set());
        setAllExpanded(false);
        try {
          localStorage.setItem('cse-strategies', JSON.stringify(data.strategies));
          localStorage.setItem('cse-strategies-ts', String(ts));
        } catch (_e) {}
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setStrategyError(err.message || 'Failed to generate strategies');
    } finally {
      setStrategyLoading(false);
      strategyAbortRef.current = null;
    }
  }, [hookData, angleData, formatData, combos, totalCreatives, totalAnalyzed, overallRoas, totalSpend, strategyLoading]);

  const toggleCardExpand = useCallback((idx: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const toggleAllExpanded = useCallback(() => {
    setAllExpanded(prev => {
      const next = !prev;
      if (next) {
        setExpandedCards(new Set(strategies.map((_, i) => i)));
      } else {
        setExpandedCards(new Set());
      }
      return next;
    });
  }, [strategies]);

  // Format relative time
  const formatAgo = (ts: number | null): string => {
    if (!ts) return '';
    const minutes = Math.floor((Date.now() - ts) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (totalAnalyzed === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px', gap: '16px',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'linear-gradient(145deg, rgba(168,85,247,0.1), rgba(168,85,247,0.03))',
          border: '1px solid rgba(168,85,247,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px',
        }}>🧪</div>
        <div style={{
          fontSize: '16px', fontWeight: 600, color: '#E5E7EB',
          fontFamily: "'Inter', sans-serif",
        }}>Intelligence Lab</div>
        <div style={{
          fontSize: '13px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
          textAlign: 'center', maxWidth: '320px', lineHeight: 1.6,
        }}>
          No creative DNA has been extracted yet. Switch to the Vault view to trigger DNA extraction, then come back here to see pattern analysis.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header stats */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const,
      }}>
        <LabStatPill icon="🧪" label={`${totalAnalyzed}/${totalCreatives}`} sublabel="analyzed" color="#A855F7" />
        <LabStatPill icon="💰" label={fmtUSD(totalSpend)} sublabel="total spend" color="#FF6B6B" />
        <LabStatPill icon="📈" label={`${overallRoas.toFixed(2)}x`} sublabel="avg ROAS" color={overallRoas >= 2 ? '#06D6A0' : overallRoas >= 1 ? '#F59E0B' : '#EF4444'} />
      </div>

      {/* ======== AI STRATEGY SECTION ======== */}
      <div style={{
        borderRadius: '16px', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>🎯</span>
            <span style={{
              fontSize: '13px', fontWeight: 600, color: '#F4F4F5',
              fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
            }}>AI Strategy Recommendations</span>
            {strategies.length > 0 && (
              <span style={{
                fontSize: '9px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
                padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(255,255,255,0.03)',
              }}>{strategies.length} strategies{strategyTimestamp ? ` · ${formatAgo(strategyTimestamp)}` : ''}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {strategies.length > 0 && strategies.some(c => c.scriptIdea) && (
              <button
                onClick={toggleAllExpanded}
                style={{
                  padding: '5px 10px', borderRadius: '7px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#6B7280', fontSize: '9.5px', fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer', outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                {allExpanded ? '▴ Collapse All' : '▾ Expand All'}
              </button>
            )}
          <button
            onClick={handleGenerateStrategy}
            disabled={strategyLoading}
            style={{
              padding: '7px 16px', borderRadius: '10px',
              background: strategyLoading
                ? 'rgba(168,85,247,0.08)'
                : 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.08) 100%)',
              border: '1px solid rgba(168,85,247,0.25)',
              color: strategyLoading ? '#6B7280' : '#C084FC',
              fontSize: '11px', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: strategyLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease', outline: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => {
              if (!strategyLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0.12) 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,85,247,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!strategyLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.08) 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {strategyLoading ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Analyzing...</>
            ) : (
              <>{strategies.length > 0 ? '↻ Regenerate' : '✨ Generate Strategy'}</>
            )}
          </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {strategyError && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              color: '#EF4444', fontSize: '12px', fontFamily: "'Inter', sans-serif",
              marginBottom: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>⚠️ {strategyError}</span>
              <button
                onClick={handleGenerateStrategy}
                style={{
                  padding: '4px 12px', borderRadius: '6px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#EF4444', fontSize: '10px', fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer', outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
              >
                ↻ Retry
              </button>
            </div>
          )}

          {strategyLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <StrategyCardSkeleton key={i} />
              ))}
            </div>
          ) : strategies.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {strategies.map((card, idx) => {
                const config = STRATEGY_CONFIG[card.type] || STRATEGY_CONFIG.iterate;
                const prioConfig = PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.medium;
                const isExpanded = expandedCards.has(idx);
                return (
                  <div
                    key={idx}
                    style={{
                      borderRadius: '14px', overflow: 'hidden',
                      background: config.gradient,
                      border: `1px solid ${config.color}18`,
                      transition: 'all 0.25s ease',
                      animation: `strategyCardIn 0.4s ${idx * 0.08}s cubic-bezier(0.16, 1, 0.3, 1) both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${config.color}35`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 32px ${config.color}12`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${config.color}18`;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Card header */}
                    <div style={{
                      padding: '14px 16px 12px',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{
                          fontSize: '18px',
                          width: '32px', height: '32px', borderRadius: '10px',
                          background: `${config.color}12`, border: `1px solid ${config.color}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>{config.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{
                              fontSize: '8px', fontWeight: 700, color: config.color,
                              textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                              fontFamily: "'Inter', sans-serif",
                              padding: '2px 6px', borderRadius: '4px',
                              background: `${config.color}12`,
                            }}>{config.label}</span>
                            <span style={{
                              fontSize: '7px', fontWeight: 600, color: prioConfig.color,
                              textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                              fontFamily: "'Inter', sans-serif",
                              padding: '1px 5px', borderRadius: '3px',
                              border: `1px solid ${prioConfig.color}30`,
                            }}>{prioConfig.label}</span>
                          </div>
                          <div style={{
                            fontSize: '12.5px', fontWeight: 600, color: '#F4F4F5',
                            fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
                            lineHeight: 1.3,
                          }}>{card.title}</div>
                        </div>
                      </div>
                    </div>

                    {/* DNA combo pills */}
                    <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' as const }}>
                      <ComboPill value={card.hookType} colorMap={HOOK_TYPE_COLORS} />
                      <span style={{ color: '#3F3F46', fontSize: '9px' }}>×</span>
                      <ComboPill value={card.angle} colorMap={ANGLE_COLORS} />
                      <span style={{ color: '#3F3F46', fontSize: '9px' }}>×</span>
                      <ComboPill value={card.format} colorMap={FORMAT_COLORS} />
                    </div>

                    {/* Impact badge */}
                    {card.estimatedImpact && (
                      <div style={{ padding: '0 16px 10px' }}>
                        <span style={{
                          fontSize: '10px', color: config.color, fontWeight: 500,
                          fontFamily: "'Inter', sans-serif",
                          padding: '3px 8px', borderRadius: '6px',
                          background: `${config.color}08`, border: `1px solid ${config.color}12`,
                          display: 'inline-block',
                        }}>
                          {card.estimatedImpact}
                        </span>
                      </div>
                    )}

                    {/* Reasoning */}
                    <div style={{
                      padding: '0 16px 12px',
                      fontSize: '11px', color: '#9CA3AF', lineHeight: 1.6,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {card.reasoning}
                    </div>

                    {/* Script idea — collapsible */}
                    {card.scriptIdea && (
                      <div style={{
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <button
                          onClick={() => toggleCardExpand(idx)}
                          style={{
                            width: '100%', padding: '10px 16px',
                            background: 'transparent', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', outline: 'none',
                          }}
                        >
                          <span style={{
                            fontSize: '9px', fontWeight: 600, color: '#52525B',
                            textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                            fontFamily: "'Inter', sans-serif",
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>
                            <span style={{ fontSize: '11px' }}>💡</span> Script Idea
                          </span>
                          <span style={{
                            fontSize: '10px', color: '#52525B',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s ease',
                          }}>▾</span>
                        </button>
                        {isExpanded && (
                          <div style={{
                            padding: '0 16px 14px',
                            fontSize: '11px', color: '#A1A1AA', lineHeight: 1.7,
                            fontFamily: "'Inter', sans-serif",
                            fontStyle: 'italic',
                            animation: 'strategyCardIn 0.2s ease',
                          }}>
                            "{card.scriptIdea}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '32px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'linear-gradient(145deg, rgba(168,85,247,0.08), rgba(168,85,247,0.02))',
                border: '1px solid rgba(168,85,247,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
              }}>🎯</div>
              <div style={{
                fontSize: '13px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
                lineHeight: 1.6, maxWidth: '280px',
              }}>
                Click <strong style={{ color: '#C084FC' }}>Generate Strategy</strong> to get AI-powered recommendations based on your creative DNA performance data.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======== CREATIVE AD COPY DETAILS ======== */}
      {dnaCreatives.some(c => c.headline || c.body || c.linkUrl) && (
        <CreativeAdCopyPanel creatives={dnaCreatives} />
      )}

      {/* Three bar chart panels */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
      }}>
        <BarChartPanel
          title="By Hook Type"
          icon="🪝"
          data={hookData}
          colorMap={HOOK_TYPE_COLORS}
        />
        <BarChartPanel
          title="By Angle"
          icon="🎯"
          data={angleData}
          colorMap={ANGLE_COLORS}
        />
        <BarChartPanel
          title="By Format"
          icon="🎬"
          data={formatData}
          colorMap={FORMAT_COLORS}
        />
      </div>

      {/* Top DNA Combos Leaderboard */}
      {combos.length > 0 && (
        <div style={{
          borderRadius: '16px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <span style={{ fontSize: '16px' }}>🏆</span>
            <span style={{
              fontSize: '13px', fontWeight: 600, color: '#F4F4F5',
              fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
            }}>Top DNA Combinations</span>
            <span style={{
              fontSize: '10px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
              padding: '2px 8px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.03)',
            }}>hook × angle × format</span>
          </div>

          {/* Table */}
          <table style={{
            width: '100%', borderCollapse: 'collapse' as const,
            fontFamily: "'Inter', sans-serif",
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={comboTh}>#</th>
                <th style={{ ...comboTh, textAlign: 'left' }}>Combination</th>
                <th style={comboTh}>Ads</th>
                <th style={comboTh}>Avg ROAS</th>
                <th style={comboTh}>Total Spend</th>
                <th style={comboTh}>Avg CPA</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((combo, idx) => {
                const roasColor = combo.avgRoas >= 3 ? '#06D6A0' : combo.avgRoas >= 2 ? '#34D399' : combo.avgRoas >= 1 ? '#F59E0B' : '#EF4444';
                return (
                  <tr key={idx} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.025)',
                    background: idx === 0 ? 'rgba(168,85,247,0.04)' : idx % 2 === 1 ? 'rgba(255,255,255,0.008)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx === 0 ? 'rgba(168,85,247,0.04)' : idx % 2 === 1 ? 'rgba(255,255,255,0.008)' : 'transparent'; }}
                  >
                    <td style={{
                      padding: '12px 16px', textAlign: 'center',
                      fontSize: idx === 0 ? '16px' : '12px',
                      color: idx === 0 ? '#F59E0B' : '#6B7280',
                      fontWeight: 600,
                    }}>
                      {idx === 0 ? '👑' : idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
                        <ComboPill value={combo.hookType} colorMap={HOOK_TYPE_COLORS} />
                        <span style={{ color: '#3F3F46', fontSize: '10px' }}>×</span>
                        <ComboPill value={combo.angle} colorMap={ANGLE_COLORS} />
                        <span style={{ color: '#3F3F46', fontSize: '10px' }}>×</span>
                        <ComboPill value={combo.format} colorMap={FORMAT_COLORS} />
                      </div>
                    </td>
                    <td style={{
                      padding: '12px 16px', textAlign: 'center',
                      fontSize: '11.5px', color: '#9CA3AF',
                      fontFamily: "'SF Mono', monospace",
                    }}>{combo.count}</td>
                    <td style={{
                      padding: '12px 16px', textAlign: 'center',
                      fontSize: '12px', fontWeight: 700, color: roasColor,
                      fontFamily: "'SF Mono', monospace", letterSpacing: '-0.02em',
                    }}>{combo.avgRoas.toFixed(2)}x</td>
                    <td style={{
                      padding: '12px 16px', textAlign: 'center',
                      fontSize: '11.5px', color: '#D4D4D8',
                      fontFamily: "'SF Mono', monospace",
                    }}>{fmtUSD(combo.totalSpend)}</td>
                    <td style={{
                      padding: '12px 16px', textAlign: 'center',
                      fontSize: '11.5px', color: '#D4D4D8',
                      fontFamily: "'SF Mono', monospace",
                    }}>{combo.avgCpa > 0 ? fmtUSD(combo.avgCpa) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap Matrix — Hook × Angle */}
      {heatmapData.hooks.length > 0 && heatmapData.angles.length > 0 && (
        <div style={{
          borderRadius: '16px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <span style={{ fontSize: '16px' }}>🔥</span>
            <span style={{
              fontSize: '13px', fontWeight: 600, color: '#F4F4F5',
              fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
            }}>Hook × Angle Performance Matrix</span>
            <span style={{
              fontSize: '10px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
              padding: '2px 8px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.03)',
            }}>avg ROAS</span>
          </div>

          <div style={{ padding: '20px', overflowX: 'auto' }}>
            <table style={{
              borderCollapse: 'collapse' as const, width: '100%',
              fontFamily: "'Inter', sans-serif",
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '8px 12px', fontSize: '9px', fontWeight: 600,
                    color: '#52525B', textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em', textAlign: 'left',
                  }} />
                  {heatmapData.angles.map(angle => (
                    <th key={angle} style={{
                      padding: '8px 10px', fontSize: '9px', fontWeight: 600,
                      color: ANGLE_COLORS[angle] || '#6B7280',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.04em', textAlign: 'center',
                      whiteSpace: 'nowrap' as const,
                    }}>
                      {formatLabel(angle)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.hooks.map(hook => (
                  <tr key={hook}>
                    <td style={{
                      padding: '8px 12px', fontSize: '10px', fontWeight: 600,
                      color: HOOK_TYPE_COLORS[hook] || '#6B7280',
                      whiteSpace: 'nowrap' as const,
                    }}>
                      {formatLabel(hook)}
                    </td>
                    {(() => {
                      const heatmapMaxRoas = Math.max(...heatmapData.cells.map(c => c.avgRoas), 1);
                      return heatmapData.angles.map(angle => {
                      const cell = heatmapData.cells.find(c => c.hookType === hook && c.angle === angle);
                      if (!cell || cell.count === 0) {
                        return (
                          <td key={angle} style={{
                            padding: '10px', textAlign: 'center',
                            borderRadius: '6px',
                          }}>
                            <span style={{ fontSize: '10px', color: '#27272A' }}>—</span>
                          </td>
                        );
                      }
                      const intensity = Math.min(1, cell.avgRoas / heatmapMaxRoas);
                      const hue = cell.avgRoas >= 2 ? 160 : cell.avgRoas >= 1 ? 45 : 0; // green / yellow / red
                      const sat = 70 + intensity * 30;
                      const light = 40 + intensity * 15;
                      const alpha = 0.08 + intensity * 0.18;

                      return (
                        <td key={angle} style={{
                          padding: '6px', textAlign: 'center',
                        }}>
                          <div style={{
                            padding: '10px 8px',
                            borderRadius: '8px',
                            background: `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`,
                            border: `1px solid hsla(${hue}, ${sat}%, ${light}%, ${alpha * 1.5})`,
                            transition: 'all 0.2s ease',
                          }}>
                            <div style={{
                              fontSize: '13px', fontWeight: 700,
                              color: `hsl(${hue}, ${sat}%, ${Math.min(light + 30, 85)}%)`,
                              fontFamily: "'SF Mono', monospace",
                              letterSpacing: '-0.02em',
                            }}>
                              {cell.avgRoas.toFixed(2)}x
                            </div>
                            <div style={{
                              fontSize: '9px', color: '#6B7280',
                              marginTop: '2px',
                            }}>
                              {cell.count} ad{cell.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                      );
                    });
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <span style={{ fontSize: '9px', color: '#52525B', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              Intensity
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[
                { label: '< 1x', bg: 'hsla(0, 70%, 45%, 0.12)', color: 'hsl(0, 70%, 65%)' },
                { label: '1-2x', bg: 'hsla(45, 80%, 50%, 0.12)', color: 'hsl(45, 80%, 65%)' },
                { label: '2x+', bg: 'hsla(160, 80%, 45%, 0.15)', color: 'hsl(160, 80%, 65%)' },
                { label: '3x+', bg: 'hsla(160, 90%, 50%, 0.22)', color: 'hsl(160, 90%, 70%)' },
              ].map(l => (
                <div key={l.label} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '4px',
                    background: l.bg, border: `1px solid ${l.bg}`,
                  }} />
                  <span style={{ fontSize: '9px', color: '#6B7280' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes labBarGrow {
          from { width: 0; }
        }
        @keyframes strategyCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes strategyShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// CREATIVE AD COPY PANEL
// ============================================================================

function CreativeAdCopyPanel({ creatives }: { creatives: VaultCreative[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const creativesWithCopy = useMemo(() =>
    creatives.filter(c => c.headline || c.body || c.linkUrl || c.description),
  [creatives]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  if (creativesWithCopy.length === 0) return null;

  return (
    <div style={{
      borderRadius: '16px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.01)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>📝</span>
          <span style={{
            fontSize: '13px', fontWeight: 600, color: '#F4F4F5',
            fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
          }}>Creative Ad Copy</span>
          <span style={{
            fontSize: '10px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
            padding: '2px 8px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
          }}>{creativesWithCopy.length} with copy</span>
        </div>
      </div>

      {/* Creative cards */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {creativesWithCopy.map(creative => {
          const isExpanded = expandedIds.has(creative.id);
          const dna = creative.dna;
          const override = creative.dnaOverride || {};
          const hookType = override.hookType || dna?.hookType;
          const angle = override.angle || dna?.angle;
          const format = override.videoFormat || dna?.videoFormat;
          const roasColor = (creative.metrics.roas || 0) >= 3 ? '#06D6A0'
            : (creative.metrics.roas || 0) >= 2 ? '#34D399'
            : (creative.metrics.roas || 0) >= 1 ? '#F59E0B' : '#EF4444';
          const thumbSrc = creative.thumbnailUrl || creative.imageUrl || creative.fullPictureUrl;

          return (
            <div
              key={creative.id}
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.012)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.012)';
              }}
            >
              {/* Card header — ad name, thumbnail, DNA pills, metrics */}
              <div
                onClick={() => toggleExpand(creative.id)}
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  overflow: 'hidden', flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {thumbSrc ? (
                    <img src={thumbSrc} alt="" style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                    }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', background: 'linear-gradient(145deg, #1a1a3e, #2d1b4e)',
                    }}>
                      {creative.type === 'video' ? '▶' : '🖼'}
                    </div>
                  )}
                </div>

                {/* Name + DNA */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12.5px', fontWeight: 600, color: '#E5E7EB',
                    fontFamily: "'Inter', sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  }}>{creative.name}</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    marginTop: '4px', flexWrap: 'wrap' as const,
                  }}>
                    {hookType && <ComboPill value={hookType} colorMap={HOOK_TYPE_COLORS} />}
                    {hookType && angle && <span style={{ color: '#3F3F46', fontSize: '8px' }}>×</span>}
                    {angle && <ComboPill value={angle} colorMap={ANGLE_COLORS} />}
                    {angle && format && <span style={{ color: '#3F3F46', fontSize: '8px' }}>×</span>}
                    {format && <ComboPill value={format} colorMap={FORMAT_COLORS} />}
                  </div>
                </div>

                {/* Metrics */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '12px', fontWeight: 700, color: roasColor,
                      fontFamily: "'SF Mono', monospace", letterSpacing: '-0.02em',
                    }}>{(creative.metrics.roas || 0).toFixed(2)}x</div>
                    <div style={{
                      fontSize: '9px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
                    }}>ROAS</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '11px', fontWeight: 600, color: '#D4D4D8',
                      fontFamily: "'SF Mono', monospace",
                    }}>{fmtUSD(creative.metrics['ad-spend'] || 0)}</div>
                    <div style={{
                      fontSize: '9px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
                    }}>spend</div>
                  </div>
                  <span style={{
                    fontSize: '11px', color: '#52525B',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s ease',
                  }}>▾</span>
                </div>
              </div>

              {/* Expanded content — ad copy details */}
              {isExpanded && (
                <div style={{
                  padding: '0 16px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  paddingTop: '14px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  animation: 'strategyCardIn 0.2s ease',
                }}>
                  {/* Headline */}
                  {creative.headline && (
                    <div>
                      <div style={{
                        fontSize: '9px', fontWeight: 600, color: '#52525B',
                        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                        fontFamily: "'Inter', sans-serif", marginBottom: '4px',
                      }}>Headline</div>
                      <div style={{
                        fontSize: '13px', fontWeight: 600, color: '#F4F4F5',
                        fontFamily: "'Inter', sans-serif", lineHeight: 1.5,
                      }}>{creative.headline}</div>
                    </div>
                  )}

                  {/* Body / Ad Copy */}
                  {creative.body && (
                    <div>
                      <div style={{
                        fontSize: '9px', fontWeight: 600, color: '#52525B',
                        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                        fontFamily: "'Inter', sans-serif", marginBottom: '4px',
                      }}>Ad Copy</div>
                      <div style={{
                        fontSize: '12px', color: '#A1A1AA', lineHeight: 1.7,
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
                      }}>{creative.body}</div>
                    </div>
                  )}

                  {/* Description */}
                  {creative.description && (
                    <div>
                      <div style={{
                        fontSize: '9px', fontWeight: 600, color: '#52525B',
                        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                        fontFamily: "'Inter', sans-serif", marginBottom: '4px',
                      }}>Description</div>
                      <div style={{
                        fontSize: '11.5px', color: '#9CA3AF', lineHeight: 1.6,
                        fontFamily: "'Inter', sans-serif",
                      }}>{creative.description}</div>
                    </div>
                  )}

                  {/* Landing Page URL */}
                  {creative.linkUrl && (
                    <div>
                      <div style={{
                        fontSize: '9px', fontWeight: 600, color: '#52525B',
                        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                        fontFamily: "'Inter', sans-serif", marginBottom: '4px',
                      }}>Landing Page URL</div>
                      <a
                        href={creative.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: '11.5px', color: '#818CF8',
                          fontFamily: "'SF Mono', monospace",
                          textDecoration: 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap' as const, display: 'block',
                          maxWidth: '100%',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#A5B4FC'; e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#818CF8'; e.currentTarget.style.textDecoration = 'none'; }}
                      >
                        {creative.linkUrl}
                      </a>
                    </div>
                  )}

                  {/* Post URL */}
                  {creative.postUrl && (
                    <div>
                      <div style={{
                        fontSize: '9px', fontWeight: 600, color: '#52525B',
                        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                        fontFamily: "'Inter', sans-serif", marginBottom: '4px',
                      }}>Ad Preview</div>
                      <a
                        href={creative.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: '11px', color: '#6B7280',
                          fontFamily: "'Inter', sans-serif",
                          textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '6px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#9CA3AF';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#6B7280';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>↗</span> View on Meta
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// BAR CHART PANEL
// ============================================================================

interface BarChartPanelProps {
  title: string;
  icon: string;
  data: GroupedMetrics[];
  colorMap: Record<string, string>;
}

function BarChartPanel({ title, icon, data, colorMap }: BarChartPanelProps) {
  const maxRoas = Math.max(...data.map(d => d.avgRoas), 0.01);

  return (
    <div style={{
      borderRadius: '16px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(255,255,255,0.01)',
      }}>
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span style={{
          fontSize: '12px', fontWeight: 600, color: '#F4F4F5',
          fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
        }}>{title}</span>
      </div>

      {/* Bars */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {data.length === 0 ? (
          <div style={{
            padding: '20px', textAlign: 'center',
            fontSize: '11px', color: '#4B5563', fontFamily: "'Inter', sans-serif",
          }}>No data yet</div>
        ) : (
          data.map(d => {
            const color = colorMap[d.key] || '#6B7280';
            const pct = (d.avgRoas / maxRoas) * 100;
            const roasColor = d.avgRoas >= 3 ? '#06D6A0' : d.avgRoas >= 2 ? '#34D399' : d.avgRoas >= 1 ? '#F59E0B' : '#EF4444';
            return (
              <div key={d.key}>
                {/* Label row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      backgroundColor: color, flexShrink: 0,
                      boxShadow: `0 0 6px ${color}40`,
                    }} />
                    <span style={{
                      fontSize: '11px', fontWeight: 500, color: '#D4D4D8',
                      fontFamily: "'Inter', sans-serif",
                    }}>{formatLabel(d.key)}</span>
                    <span style={{
                      fontSize: '9px', color: '#52525B', fontFamily: "'Inter', sans-serif",
                    }}>({d.count})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px', color: '#6B7280',
                      fontFamily: "'SF Mono', monospace",
                    }}>{fmtUSD(d.totalSpend)}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: roasColor,
                      fontFamily: "'SF Mono', monospace",
                      letterSpacing: '-0.02em',
                    }}>{d.avgRoas.toFixed(2)}x</span>
                  </div>
                </div>
                {/* Bar */}
                <div style={{
                  height: '6px', borderRadius: '3px',
                  background: 'rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: '3px',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}AA)`,
                    boxShadow: `0 0 8px ${color}30`,
                    animation: 'labBarGrow 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LabStatPill({ icon, label, sublabel, color }: { icon: string; label: string; sublabel: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '6px 14px', borderRadius: '20px',
      background: `${color}08`, border: `1px solid ${color}18`,
    }}>
      <span style={{ fontSize: '13px' }}>{icon}</span>
      <span style={{
        fontSize: '11.5px', fontWeight: 600, color,
        fontFamily: "'SF Mono', monospace", letterSpacing: '-0.02em',
      }}>{label}</span>
      <span style={{
        fontSize: '9.5px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
      }}>{sublabel}</span>
    </div>
  );
}

function StrategyCardSkeleton() {
  const shimmerBg = 'linear-gradient(90deg, rgba(168,85,247,0.04) 25%, rgba(168,85,247,0.08) 50%, rgba(168,85,247,0.04) 75%)';
  return (
    <div style={{
      borderRadius: '14px', overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(168,85,247,0.04) 0%, rgba(168,85,247,0.01) 100%)',
      border: '1px solid rgba(168,85,247,0.08)',
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: shimmerBg, backgroundSize: '200% 100%',
          animation: 'strategyShimmer 1.8s ease-in-out infinite',
        }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            height: '10px', width: '45%', borderRadius: '4px',
            background: shimmerBg, backgroundSize: '200% 100%',
            animation: 'strategyShimmer 1.8s ease-in-out infinite',
          }} />
          <div style={{
            height: '14px', width: '70%', borderRadius: '4px',
            background: shimmerBg, backgroundSize: '200% 100%',
            animation: 'strategyShimmer 1.8s 0.1s ease-in-out infinite',
          }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[55, 65, 50].map((w, i) => (
          <div key={i} style={{
            height: '20px', width: `${w}px`, borderRadius: '10px',
            background: shimmerBg, backgroundSize: '200% 100%',
            animation: `strategyShimmer 1.8s ${0.1 * i}s ease-in-out infinite`,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{
          height: '10px', width: '100%', borderRadius: '4px',
          background: shimmerBg, backgroundSize: '200% 100%',
          animation: 'strategyShimmer 1.8s 0.2s ease-in-out infinite',
        }} />
        <div style={{
          height: '10px', width: '80%', borderRadius: '4px',
          background: shimmerBg, backgroundSize: '200% 100%',
          animation: 'strategyShimmer 1.8s 0.3s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

function ComboPill({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  const color = colorMap[value] || '#6B7280';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 9px', borderRadius: '16px',
      background: `${color}12`, border: `1px solid ${color}25`,
      fontSize: '10px', fontWeight: 600, color,
      fontFamily: "'Inter', sans-serif",
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap' as const,
    }}>
      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        backgroundColor: color,
      }} />
      {formatLabel(value)}
    </span>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const comboTh: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: '9px',
  fontWeight: 600,
  color: '#52525B',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: "'Inter', sans-serif",
  textAlign: 'center',
  whiteSpace: 'nowrap',
};
