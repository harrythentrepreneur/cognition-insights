'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface CreativeDNA {
  hookType: 'curiosity' | 'pain_point' | 'bold_claim' | 'social_proof' | 'pattern_interrupt';
  angle: 'transformation' | 'fear' | 'authority' | 'comparison' | 'urgency' | 'education';
  videoFormat: 'ugc' | 'talking_head' | 'screen_recording' | 'broll_montage' | 'meme';
  visualPacing: 'fast' | 'medium' | 'slow';
  summary: string;
}

export interface VaultCreative {
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
  dna?: CreativeDNA | null;
  dnaLoading?: boolean;
  dnaError?: boolean;
  dnaOverride?: Partial<CreativeDNA>;
}

// ============================================================================
// DNA TAG COLORS & LABELS
// ============================================================================

const HOOK_TYPE_COLORS: Record<string, string> = {
  curiosity: '#4ECDC4',
  pain_point: '#FF6B6B',
  bold_claim: '#F59E0B',
  social_proof: '#A855F7',
  pattern_interrupt: '#06D6A0',
};

const ANGLE_COLORS: Record<string, string> = {
  transformation: '#00F5D4',
  fear: '#EF4444',
  authority: '#8B5CF6',
  comparison: '#F472B6',
  urgency: '#FB8500',
  education: '#3B82F6',
};

const FORMAT_COLORS: Record<string, string> = {
  ugc: '#45B7D1',
  talking_head: '#FFD700',
  screen_recording: '#818CF8',
  broll_montage: '#34D399',
  meme: '#FE2C55',
};

const PACING_COLORS: Record<string, string> = {
  fast: '#FF6B6B',
  medium: '#F59E0B',
  slow: '#4ECDC4',
};

function formatLabel(val: string): string {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// DNA TAG PILL — clickable with dropdown override
// ============================================================================

interface DnaPillProps {
  value: string;
  colorMap: Record<string, string>;
  options: readonly string[];
  category: string;
  onOverride: (category: string, value: string) => void;
  isOverridden?: boolean;
}

function DnaPill({ value, colorMap, options, category, onOverride, isOverridden }: DnaPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const color = colorMap[value] || '#6B7280';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          padding: '4px 10px',
          borderRadius: '20px',
          border: `1px solid ${color}30`,
          background: `${color}12`,
          color: color,
          fontSize: '10.5px',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          letterSpacing: '0.02em',
          lineHeight: 1.4,
          whiteSpace: 'nowrap' as const,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${color}22`;
          e.currentTarget.style.borderColor = `${color}50`;
          e.currentTarget.style.transform = 'scale(1.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = `${color}12`;
          e.currentTarget.style.borderColor = `${color}30`;
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isOverridden && (
          <span style={{ fontSize: '8px', opacity: 0.7 }}>✎</span>
        )}
        {formatLabel(value)}
        <span style={{ fontSize: '7px', opacity: 0.45, marginLeft: '1px' }}>▾</span>
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '0',
            zIndex: 1000,
            minWidth: '170px',
            padding: '6px',
            borderRadius: '12px',
            backgroundColor: 'rgba(15, 15, 28, 0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: 'dnaDropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{
            padding: '5px 10px 6px',
            fontSize: '9px',
            fontWeight: 600,
            color: '#52525B',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            fontFamily: "'Inter', sans-serif",
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            marginBottom: '4px',
          }}>
            {formatLabel(category)}
          </div>
          {options.map(opt => {
            const optColor = colorMap[opt] || '#6B7280';
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                onClick={() => { onOverride(category, opt); setIsOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isSelected ? `${optColor}15` : 'transparent',
                  color: isSelected ? optColor : '#D4D4D8',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 600 : 400,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  textAlign: 'left' as const,
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = optColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#D4D4D8';
                  }
                }}
              >
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: optColor, flexShrink: 0,
                  boxShadow: isSelected ? `0 0 6px ${optColor}60` : 'none',
                }} />
                {formatLabel(opt)}
                {isSelected && <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.7 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function SkeletonRow({ cols }: { cols: number }) {
  const widths = useMemo(() => Array.from({ length: cols }).map((_, i) =>
    i === 0 ? 36 : Math.round(40 + Math.random() * 50)
  ), [cols]);
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
      {widths.map((w, i) => (
        <td key={i} style={{ padding: '14px 12px' }}>
          <div style={{
            height: i === 0 ? '36px' : '14px',
            width: i === 0 ? '36px' : `${w}%`,
            borderRadius: i === 0 ? '8px' : '6px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.025) 25%, rgba(255,255,255,0.055) 50%, rgba(255,255,255,0.025) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 1.8s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  );
}

// ============================================================================
// EXTRACT BUTTON — clean idle / loading button for DNA extraction
// ============================================================================

interface ExtractButtonProps {
  onClick: (e: React.MouseEvent) => void;
  loading?: boolean;
  label?: string;
}

function ExtractButton({ onClick, loading, label = 'Extract' }: ExtractButtonProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!loading) onClick(e); }}
      disabled={loading}
      style={{
        padding: '5px 11px',
        borderRadius: '8px',
        background: loading
          ? 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(139,92,246,0.18))'
          : 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(139,92,246,0.10))',
        border: `1px solid ${loading ? 'rgba(168,85,247,0.45)' : 'rgba(168,85,247,0.25)'}`,
        color: '#C4B5FD',
        fontSize: '10px',
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.02em',
        cursor: loading ? 'wait' : 'pointer',
        outline: 'none',
        transition: 'all 0.18s ease',
        whiteSpace: 'nowrap' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: loading
          ? '0 0 0 1px rgba(168,85,247,0.15), 0 2px 8px rgba(168,85,247,0.18)'
          : '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      onMouseEnter={(e) => {
        if (loading) return;
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.26), rgba(139,92,246,0.20))';
        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)';
        e.currentTarget.style.color = '#E9D5FF';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(168,85,247,0.25), inset 0 1px 0 rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(e) => {
        if (loading) return;
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(139,92,246,0.10))';
        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.25)';
        e.currentTarget.style.color = '#C4B5FD';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)';
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: '9px', height: '9px', borderRadius: '50%',
            border: '1.5px solid rgba(196,181,253,0.25)',
            borderTopColor: '#C4B5FD',
            animation: 'extractSpin 0.7s linear infinite',
            display: 'inline-block',
          }} />
          <span>Extracting</span>
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M3 5.5C3 3 5 2 8 2s5 1 5 3.5-5 2-5 5 2 3.5 5 3.5-5 1-5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// ============================================================================
// DNA DONE BADGE — shown when DNA extracted; hover reveals re-extract
// ============================================================================

function DnaDoneBadge({ onReExtract, rowHovered }: { onReExtract: (e: React.MouseEvent) => void; rowHovered: boolean }) {
  const [btnHover, setBtnHover] = useState(false);
  const showRetry = rowHovered && btnHover;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onReExtract(e); }}
      onMouseEnter={() => setBtnHover(true)}
      onMouseLeave={() => setBtnHover(false)}
      title={showRetry ? 'Re-extract DNA' : 'DNA extracted'}
      style={{
        width: '18px', height: '18px', borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: showRetry ? 'rgba(168,85,247,0.18)' : 'rgba(6,214,160,0.12)',
        border: `1px solid ${showRetry ? 'rgba(168,85,247,0.4)' : 'rgba(6,214,160,0.3)'}`,
        color: showRetry ? '#C4B5FD' : '#06D6A0',
        cursor: 'pointer', outline: 'none',
        transition: 'all 0.18s ease',
        flexShrink: 0,
        boxShadow: showRetry ? '0 0 10px rgba(168,85,247,0.25)' : 'none',
      }}
    >
      {showRetry ? (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 3v3h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

// ============================================================================
// ROAS BAR — tiny color bar in the ROAS cell
// ============================================================================

function RoasBar({ roas, maxRoas }: { roas: number; maxRoas: number }) {
  const pct = Math.min(100, (roas / Math.max(maxRoas, 0.01)) * 100);
  const color = roas >= 3 ? '#06D6A0' : roas >= 2 ? '#34D399' : roas >= 1 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
        fontSize: '11.5px', fontWeight: 600, color,
        minWidth: '40px', letterSpacing: '-0.02em',
      }}>
        {roas.toFixed(2)}x
      </span>
      <div style={{
        flex: 1, height: '4px', borderRadius: '2px',
        background: 'rgba(255,255,255,0.04)', overflow: 'hidden',
        minWidth: '32px', maxWidth: '60px',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: '2px',
          background: color, transition: 'width 0.5s ease',
          boxShadow: `0 0 6px ${color}40`,
        }} />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CREATIVE VAULT COMPONENT
// ============================================================================

const HOOK_TYPES = ['curiosity', 'pain_point', 'bold_claim', 'social_proof', 'pattern_interrupt'] as const;
const ANGLES = ['transformation', 'fear', 'authority', 'comparison', 'urgency', 'education'] as const;
const FORMATS = ['ugc', 'talking_head', 'screen_recording', 'broll_montage', 'meme'] as const;
const PACINGS = ['fast', 'medium', 'slow'] as const;

type SortColumn = 'ad-spend' | 'roas' | 'cpa' | 'cpc' | 'ctr' | 'impressions' | 'conversions';

const SORT_COLUMNS: Array<{ id: SortColumn; label: string; format: 'usd' | 'roas' | 'pct' | 'int' }> = [
  { id: 'ad-spend', label: 'Spend', format: 'usd' },
  { id: 'roas', label: 'ROAS', format: 'roas' },
  { id: 'cpa', label: 'CPA', format: 'usd' },
  { id: 'cpc', label: 'CPC', format: 'usd' },
  { id: 'ctr', label: 'CTR', format: 'pct' },
  { id: 'impressions', label: 'Impr.', format: 'int' },
  { id: 'conversions', label: 'Purch.', format: 'int' },
];

interface CreativeVaultProps {
  creatives: VaultCreative[];
  onSelectCreative: (creative: VaultCreative) => void;
  selectedCreativeId?: string | null;
  onDnaOverride: (adId: string, category: string, value: string) => void;
  onRequestDna: (creative: VaultCreative, force?: boolean) => void;
  isLoading?: boolean;
}

export function CreativeVault({
  creatives,
  onSelectCreative,
  selectedCreativeId,
  onDnaOverride,
  onRequestDna,
  isLoading,
}: CreativeVaultProps) {
  const [sortBy, setSortBy] = useState<SortColumn>('ad-spend');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterHook, setFilterHook] = useState<string>('all');
  const [filterAngle, setFilterAngle] = useState<string>('all');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // DNA extraction is user-initiated (per-creative button click) to keep API costs low.
  // No auto-trigger — users click "Extract DNA" on individual creatives.

  const filtered = useMemo(() => {
    let result = [...creatives];
    if (filterType !== 'all') result = result.filter(c => c.type === filterType);
    if (filterHook !== 'all') result = result.filter(c => {
      const hook = c.dnaOverride?.hookType || c.dna?.hookType;
      return hook === filterHook;
    });
    if (filterAngle !== 'all') result = result.filter(c => {
      const angle = c.dnaOverride?.angle || c.dna?.angle;
      return angle === filterAngle;
    });
    return result;
  }, [creatives, filterType, filterHook, filterAngle]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = a.metrics[sortBy] ?? 0;
      const vb = b.metrics[sortBy] ?? 0;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [filtered, sortBy, sortDir]);

  // Aggregate stats for the summary row
  const totals = useMemo(() => {
    const totalSpend = sorted.reduce((s, c) => s + (c.metrics['ad-spend'] || 0), 0);
    const totalRevenue = sorted.reduce((s, c) => s + (c.metrics.revenue || 0), 0);
    const totalConversions = sorted.reduce((s, c) => s + (c.metrics.conversions || 0), 0);
    const totalImpressions = sorted.reduce((s, c) => s + (c.metrics.impressions || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    return { totalSpend, totalRevenue, totalConversions, totalImpressions, avgRoas, avgCpa };
  }, [sorted]);

  const maxRoas = useMemo(() => {
    const vals = sorted.map(c => c.metrics.roas || 0).filter(v => isFinite(v));
    return Math.max(...vals, 1);
  }, [sorted]);

  const handleSort = useCallback((column: SortColumn) => {
    if (sortBy === column) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  }, [sortBy]);

  // CSV Export
  const handleExportCSV = useCallback(() => {
    const csvEscape = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headers = [
      'Name', 'Platform', 'Type', 'Status',
      'Spend', 'ROAS', 'CPA', 'CPC', 'CTR (%)', 'Impressions', 'Purchases', 'Revenue',
      'Hook Type', 'Angle', 'Format', 'Pacing', 'AI Summary',
    ];

    const rows = sorted.map(c => {
      const m = c.metrics;
      const dna = c.dna;
      const override = c.dnaOverride || {};
      return [
        csvEscape(c.name),
        csvEscape(c.platform),
        c.type,
        c.status,
        (m['ad-spend'] || 0).toFixed(2),
        (m.roas || 0).toFixed(2),
        (m.cpa || 0).toFixed(2),
        (m.cpc || 0).toFixed(2),
        (m.ctr || 0).toFixed(2),
        String(m.impressions || 0),
        String(m.conversions || 0),
        (m.revenue || 0).toFixed(2),
        dna ? formatLabel(override.hookType || dna.hookType) : '',
        dna ? formatLabel(override.angle || dna.angle) : '',
        dna ? formatLabel(override.videoFormat || dna.videoFormat) : '',
        dna ? formatLabel(override.visualPacing || dna.visualPacing) : '',
        dna ? csvEscape(dna.summary || '') : '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creative-vault-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sorted]);

  const fmtUSD = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
  const fmtUSDFull = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtInt = (v: number) => v >= 10000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString('en-US');
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;

  const activeCount = creatives.filter(c => c.status === 'active').length;
  const withDna = creatives.filter(c => !!c.dna).length;

  const formatCell = (col: typeof SORT_COLUMNS[number], v: number) => {
    if (col.format === 'usd') return fmtUSD(v);
    if (col.format === 'pct') return fmtPct(v);
    if (col.format === 'int') return fmtInt(v);
    return String(v);
  };

  const COL_COUNT = 2 + SORT_COLUMNS.length + 3; // Ad + Status + sorts + 3 DNA

  return (
    <div style={{ width: '100%' }}>
      {/* Stats + Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap' as const,
        gap: '12px',
      }}>
        {/* Summary stat pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
          <StatPill
            label={`${creatives.length} ads`}
            sublabel={`${activeCount} active`}
            color="#06D6A0"
          />
          <StatPill
            label={fmtUSDFull(totals.totalSpend)}
            sublabel="total spend"
            color="#FF6B6B"
          />
          <StatPill
            label={`${totals.avgRoas.toFixed(2)}x`}
            sublabel="avg ROAS"
            color={totals.avgRoas >= 2 ? '#06D6A0' : totals.avgRoas >= 1 ? '#F59E0B' : '#EF4444'}
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '20px',
            background: 'rgba(168,85,247,0.06)',
            border: '1px solid rgba(168,85,247,0.12)',
          }}>
            <span style={{ fontSize: '12px' }}>🧬</span>
            <span style={{
              fontSize: '10.5px', color: '#A855F7',
              fontFamily: "'Inter', sans-serif", fontWeight: 600,
            }}>
              {withDna}/{creatives.length}
            </span>
          </div>
        </div>

        {/* Filter dropdowns + Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FilterDropdown label="Type" value={filterType} options={[
            { id: 'all', label: 'All Types' },
            { id: 'video', label: '▶ Video' },
            { id: 'image', label: '🖼 Image' },
            { id: 'carousel', label: '⊞ Carousel' },
          ]} onChange={setFilterType} />
          <FilterDropdown label="Hook" value={filterHook} options={[
            { id: 'all', label: 'All Hooks' },
            ...HOOK_TYPES.map(h => ({ id: h, label: formatLabel(h) })),
          ]} onChange={setFilterHook} colorMap={HOOK_TYPE_COLORS} />
          <FilterDropdown label="Angle" value={filterAngle} options={[
            { id: 'all', label: 'All Angles' },
            ...ANGLES.map(a => ({ id: a, label: formatLabel(a) })),
          ]} onChange={setFilterAngle} colorMap={ANGLE_COLORS} />

          {/* Extract All missing DNA */}
          {(() => {
            const missing = creatives.filter(c => !c.dna && !c.dnaLoading && !c.dnaError);
            const loadingCount = creatives.filter(c => c.dnaLoading).length;
            const busy = loadingCount > 0;
            const disabled = missing.length === 0 && !busy;
            return (
              <button
                onClick={() => { missing.forEach(c => onRequestDna(c)); }}
                disabled={disabled}
                title={busy ? `Extracting ${loadingCount}…` : missing.length > 0 ? `Extract DNA for ${missing.length} creative${missing.length === 1 ? '' : 's'}` : 'All creatives extracted'}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${disabled ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.3)'}`,
                  background: disabled
                    ? 'rgba(168,85,247,0.04)'
                    : 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(139,92,246,0.10))',
                  color: disabled ? '#3F3F46' : '#C4B5FD',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  opacity: disabled ? 0.5 : 1,
                  boxShadow: disabled ? 'none' : '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                onMouseEnter={(e) => {
                  if (disabled) return;
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.26), rgba(139,92,246,0.18))';
                  e.currentTarget.style.borderColor = 'rgba(168,85,247,0.55)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(168,85,247,0.25), inset 0 1px 0 rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  if (disabled) return;
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(139,92,246,0.10))';
                  e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
                }}
              >
                {busy ? (
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    border: '1.5px solid rgba(196,181,253,0.25)',
                    borderTopColor: '#C4B5FD',
                    animation: 'extractSpin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1v14M3 5.5C3 3 5 2 8 2s5 1 5 3.5-5 2-5 5 2 3.5 5 3.5-5 1-5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
                  </svg>
                )}
                {busy ? `Extracting ${loadingCount}` : missing.length > 0 ? `Extract ${missing.length}` : 'All extracted'}
              </button>
            );
          })()}

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={sorted.length === 0}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(6,214,160,0.2)',
              background: 'rgba(6,214,160,0.06)',
              color: sorted.length === 0 ? '#3F3F46' : '#06D6A0',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: sorted.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s ease',
              outline: 'none',
              marginLeft: '4px',
              opacity: sorted.length === 0 ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              if (sorted.length > 0) {
                e.currentTarget.style.background = 'rgba(6,214,160,0.12)';
                e.currentTarget.style.borderColor = 'rgba(6,214,160,0.35)';
                e.currentTarget.style.transform = 'scale(1.03)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(6,214,160,0.06)';
              e.currentTarget.style.borderColor = 'rgba(6,214,160,0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1v9m0 0L5 7m3 3l3-3M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={{
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse' as const,
            fontFamily: "'Inter', sans-serif",
          }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.015)',
              }}>
                <th style={{ ...thStyle, minWidth: '200px' }}>Creative</th>
                <th style={thStyle}>Status</th>
                {SORT_COLUMNS.map(col => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id)}
                    style={{
                      ...thStyle,
                      cursor: 'pointer',
                      userSelect: 'none' as const,
                      color: sortBy === col.id ? '#E5E7EB' : '#6B7280',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {col.label}
                      {sortBy === col.id ? (
                        <span style={{
                          fontSize: '9px',
                          color: '#A855F7',
                          fontWeight: 700,
                        }}>
                          {sortDir === 'desc' ? '↓' : '↑'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '8px', opacity: 0.25 }}>⇅</span>
                      )}
                    </span>
                  </th>
                ))}
                <th style={thStyle}>Hook</th>
                <th style={thStyle}>Angle</th>
                <th style={thStyle}>Format</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={COL_COUNT} />)
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} style={{
                    padding: '64px 24px',
                    textAlign: 'center' as const,
                  }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '12px',
                    }}>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: 'linear-gradient(145deg, rgba(168,85,247,0.08), rgba(168,85,247,0.02))',
                        border: '1px solid rgba(168,85,247,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px',
                      }}>
                        🔍
                      </div>
                      <div style={{
                        fontSize: '14px', fontWeight: 500, color: '#9CA3AF',
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        No creatives match your filters
                      </div>
                      <button
                        onClick={() => { setFilterType('all'); setFilterHook('all'); setFilterAngle('all'); }}
                        style={{
                          padding: '6px 16px', borderRadius: '8px',
                          background: 'rgba(168,85,247,0.08)',
                          border: '1px solid rgba(168,85,247,0.15)',
                          color: '#A855F7', fontSize: '12px', fontWeight: 500,
                          cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                          outline: 'none', transition: 'all 0.2s ease',
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((creative, idx) => {
                  const m = creative.metrics;
                  const dna = creative.dna;
                  const override = creative.dnaOverride || {};
                  const isSelected = selectedCreativeId === creative.id;
                  const isHovered = hoveredRow === creative.id;
                  const thumbSrc = creative.thumbnailUrl || creative.imageUrl || creative.fullPictureUrl;

                  return (
                    <tr
                      key={creative.id}
                      onClick={() => onSelectCreative(creative)}
                      onMouseEnter={() => setHoveredRow(creative.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.025)',
                        cursor: 'pointer',
                        background: isSelected
                          ? 'rgba(168,85,247,0.08)'
                          : isHovered
                            ? 'rgba(255,255,255,0.025)'
                            : idx % 2 === 1 ? 'rgba(255,255,255,0.008)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Ad thumbnail + name */}
                      <td style={{ ...tdStyle, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '10px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            overflow: 'hidden', flexShrink: 0,
                            position: 'relative' as const,
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}>
                            {thumbSrc ? (
                              <img src={thumbSrc} alt="" style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                              }} onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }} />
                            ) : (
                              <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '16px',
                                background: 'linear-gradient(145deg, #1a1a3e, #2d1b4e)',
                              }}>
                                {creative.type === 'video' ? '▶' : '🖼'}
                              </div>
                            )}
                            {/* Video badge */}
                            {creative.type === 'video' && thumbSrc && (
                              <div style={{
                                position: 'absolute', bottom: '2px', right: '2px',
                                width: '14px', height: '14px', borderRadius: '4px',
                                background: 'rgba(0,0,0,0.7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '7px', color: '#fff',
                              }}>▶</div>
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              fontSize: '12.5px', fontWeight: 500, color: '#E5E7EB',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap' as const, maxWidth: '180px',
                              lineHeight: 1.3,
                            }}>
                              {creative.name}
                            </div>
                            <div style={{
                              fontSize: '10px', color: creative.platformColor,
                              fontWeight: 500, marginTop: '2px',
                              letterSpacing: '0.02em', opacity: 0.8,
                            }}>
                              {creative.platform} · {creative.type}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          fontSize: '10.5px', fontWeight: 500,
                          color: creative.status === 'active' ? '#06D6A0' : '#6B7280',
                        }}>
                          <span style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            backgroundColor: creative.status === 'active' ? '#06D6A0' : '#6B7280',
                            boxShadow: creative.status === 'active' ? '0 0 6px rgba(6,214,160,0.5)' : 'none',
                          }} />
                          {creative.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </td>

                      {/* Metric columns */}
                      {SORT_COLUMNS.map(col => {
                        const v = m[col.id] || 0;
                        if (col.id === 'roas') {
                          return <td key={col.id} style={{ ...tdStyle, padding: '12px 8px' }}>
                            <RoasBar roas={v} maxRoas={maxRoas} />
                          </td>;
                        }
                        return (
                          <td key={col.id} style={tdStyleMono}>
                            {col.format === 'usd' && v === 0 ? '—' : formatCell(col, v)}
                          </td>
                        );
                      })}

                      {/* DNA Tags — Hook column (also hosts Extract button when idle) */}
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        {creative.dnaLoading ? (
                          <ExtractButton onClick={() => {}} loading />
                        ) : dna ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <DnaPill value={override.hookType || dna.hookType}
                              colorMap={HOOK_TYPE_COLORS} options={HOOK_TYPES} category="hookType"
                              onOverride={(cat, val) => onDnaOverride(creative.id, cat, val)}
                              isOverridden={!!override.hookType} />
                            <DnaDoneBadge
                              rowHovered={isHovered}
                              onReExtract={() => onRequestDna(creative, true)}
                            />
                          </div>
                        ) : creative.dnaError ? (
                          <DnaErrorRetry onRetry={() => onRequestDna(creative)} />
                        ) : (
                          <ExtractButton onClick={() => onRequestDna(creative)} />
                        )}
                      </td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        {creative.dnaLoading ? <DnaSkeleton /> : dna ? (
                          <DnaPill value={override.angle || dna.angle}
                            colorMap={ANGLE_COLORS} options={ANGLES} category="angle"
                            onOverride={(cat, val) => onDnaOverride(creative.id, cat, val)}
                            isOverridden={!!override.angle} />
                        ) : creative.dnaError ? (
                          <DnaErrorRetry onRetry={() => onRequestDna(creative)} />
                        ) : <span style={{ fontSize: '10px', color: '#3F3F46' }}>—</span>}
                      </td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        {creative.dnaLoading ? <DnaSkeleton /> : dna ? (
                          <DnaPill value={override.videoFormat || dna.videoFormat}
                            colorMap={FORMAT_COLORS} options={FORMATS} category="videoFormat"
                            onOverride={(cat, val) => onDnaOverride(creative.id, cat, val)}
                            isOverridden={!!override.videoFormat} />
                        ) : creative.dnaError ? (
                          <DnaErrorRetry onRetry={() => onRequestDna(creative)} />
                        ) : <span style={{ fontSize: '10px', color: '#3F3F46' }}>—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        {sorted.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '24px',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.012)',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#52525B', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              {sorted.length} results
            </span>
            <span style={{ fontSize: '10px', color: '#3F3F46' }}>•</span>
            <span style={{ fontSize: '10.5px', color: '#9CA3AF', fontFamily: "'SF Mono', monospace" }}>
              Σ Spend: {fmtUSDFull(totals.totalSpend)}
            </span>
            <span style={{ fontSize: '10px', color: '#3F3F46' }}>•</span>
            <span style={{ fontSize: '10.5px', color: totals.avgRoas >= 2 ? '#06D6A0' : totals.avgRoas >= 1 ? '#F59E0B' : '#EF4444', fontFamily: "'SF Mono', monospace" }}>
              ø ROAS: {totals.avgRoas.toFixed(2)}x
            </span>
            <span style={{ fontSize: '10px', color: '#3F3F46' }}>•</span>
            <span style={{ fontSize: '10.5px', color: '#9CA3AF', fontFamily: "'SF Mono', monospace" }}>
              Σ Purchases: {totals.totalConversions.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes dnaDropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes extractSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function DnaSkeleton() {
  return (
    <div style={{
      width: '62px', height: '18px', borderRadius: '10px',
      background: 'linear-gradient(90deg, rgba(168,85,247,0.06) 25%, rgba(168,85,247,0.12) 50%, rgba(168,85,247,0.06) 75%)',
      backgroundSize: '200% 100%', animation: 'shimmerSweep 1.5s ease infinite',
    }} />
  );
}

function DnaErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onRetry(); }}
      title="DNA extraction failed — click to retry"
      style={{
        padding: '3px 8px', borderRadius: '12px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#EF4444', fontSize: '9px', fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer', outline: 'none',
        transition: 'all 0.15s ease',
        display: 'flex', alignItems: 'center', gap: '3px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
        e.currentTarget.style.transform = 'scale(1.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={{ fontSize: '10px' }}>↻</span> retry
    </button>
  );
}

function StatPill({ label, sublabel, color }: { label: string; sublabel: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '5px 12px', borderRadius: '20px',
      background: `${color}08`, border: `1px solid ${color}18`,
    }}>
      <span style={{
        fontSize: '11px', fontWeight: 600, color,
        fontFamily: "'SF Mono', monospace", letterSpacing: '-0.02em',
      }}>
        {label}
      </span>
      <span style={{ fontSize: '9.5px', color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
        {sublabel}
      </span>
    </div>
  );
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
  colorMap?: Record<string, string>;
}

function FilterDropdown({ label, value, options, onChange, colorMap }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selectedLabel = options.find(o => o.id === value)?.label || label;
  const isFiltered = value !== 'all';
  const activeColor = colorMap && isFiltered ? (colorMap[value] || '#A855F7') : '#A855F7';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '5px 11px',
          borderRadius: '8px',
          border: `1px solid ${isFiltered ? `${activeColor}35` : 'rgba(255,255,255,0.07)'}`,
          background: isFiltered ? `${activeColor}0A` : 'rgba(255,255,255,0.025)',
          color: isFiltered ? activeColor : '#9CA3AF',
          fontSize: '11px',
          fontWeight: isFiltered ? 600 : 500,
          fontFamily: "'Inter', sans-serif",
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        {isFiltered && colorMap && (
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            backgroundColor: activeColor,
          }} />
        )}
        {selectedLabel}
        <span style={{ fontSize: '7px', opacity: 0.5 }}>▾</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: '0',
          zIndex: 999,
          minWidth: '160px',
          padding: '6px',
          borderRadius: '12px',
          backgroundColor: 'rgba(15, 15, 28, 0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          animation: 'dnaDropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {options.map(opt => {
            const optColor = colorMap?.[opt.id];
            return (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setIsOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%',
                padding: '7px 10px',
                border: 'none',
                borderRadius: '7px',
                background: opt.id === value ? (optColor ? `${optColor}15` : 'rgba(168,85,247,0.1)') : 'transparent',
                color: opt.id === value ? (optColor || '#C084FC') : '#D4D4D8',
                fontSize: '11.5px',
                fontWeight: opt.id === value ? 600 : 400,
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                textAlign: 'left' as const,
                transition: 'background 0.12s ease',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (opt.id !== value) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  if (optColor) e.currentTarget.style.color = optColor;
                }
              }}
              onMouseLeave={(e) => {
                if (opt.id !== value) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#D4D4D8';
                }
              }}
            >
              {optColor && (
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  backgroundColor: optColor, flexShrink: 0,
                }} />
              )}
              {opt.label}
              {opt.id === value && <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }}>✓</span>}
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHARED STYLES
// ============================================================================

const thStyle: React.CSSProperties = {
  padding: '11px 12px',
  fontSize: '10px',
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: "'Inter', sans-serif",
  textAlign: 'left',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '12px',
  color: '#D4D4D8',
  fontFamily: "'Inter', sans-serif",
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

const tdStyleMono: React.CSSProperties = {
  ...tdStyle,
  fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  fontSize: '11.5px',
  fontWeight: 500,
  letterSpacing: '-0.02em',
  color: '#E5E7EB',
};

// Re-export types for convenience
export { HOOK_TYPE_COLORS, ANGLE_COLORS, FORMAT_COLORS, PACING_COLORS };
export { HOOK_TYPES, ANGLES, FORMATS, PACINGS };
