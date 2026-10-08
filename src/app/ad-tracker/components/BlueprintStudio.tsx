'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { VaultCreative } from './CreativeVault';
import { HOOK_TYPE_COLORS, ANGLE_COLORS, FORMAT_COLORS } from './CreativeVault';

// ============================================================================
// TYPES
// ============================================================================

interface TimelineSlot {
  id: string;
  startSec: number;
  endSec: number;
  slotType: 'hook' | 'angle' | 'body' | 'cta';
  label: string;
}

interface Framework {
  id: string;
  name: string;
  icon: string;
  description: string;
  source: 'library' | 'vault';
  duration: number;
  slots: TimelineSlot[];
  sourceCreativeName?: string;
}

interface TagOption {
  value: string;
  label: string;
  avgRoas: number;
  count: number;
  status: 'top' | 'good' | 'trending' | 'fatigue';
  color: string;
}

interface BriefSection {
  startSec: number;
  endSec: number;
  slotType: string;
  tagUsed: string;
  visual: string;
  audio: string;
}

interface SynthesizedBrief {
  justification: string;
  sections: BriefSection[];
}

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

// ============================================================================
// CONSTANTS
// ============================================================================

const SLOT_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  hook: { icon: '🪝', label: 'Hook', color: '#4ECDC4' },
  angle: { icon: '🎯', label: 'Angle', color: '#F59E0B' },
  body: { icon: '📝', label: 'Body', color: '#A855F7' },
  cta: { icon: '🚀', label: 'CTA', color: '#FF6B6B' },
};

const FRAMEWORK_LIBRARY: Framework[] = [
  {
    id: 'fast-vsl', name: 'Fast-Paced VSL', icon: '⚡', description: 'Rapid hook → agitate → mechanism → close',
    source: 'library', duration: 30,
    slots: [
      { id: 's1', startSec: 0, endSec: 3, slotType: 'hook', label: 'Pattern Interrupt Hook' },
      { id: 's2', startSec: 3, endSec: 10, slotType: 'angle', label: 'Agitation / Problem' },
      { id: 's3', startSec: 10, endSec: 25, slotType: 'body', label: 'Mechanism / Solution' },
      { id: 's4', startSec: 25, endSec: 30, slotType: 'cta', label: 'Urgency Close' },
    ],
  },
  {
    id: 'storytelling', name: 'Storytelling Arc', icon: '📖', description: 'Emotional narrative with transformation reveal',
    source: 'library', duration: 45,
    slots: [
      { id: 's1', startSec: 0, endSec: 5, slotType: 'hook', label: 'Emotional Hook' },
      { id: 's2', startSec: 5, endSec: 15, slotType: 'angle', label: 'The Struggle' },
      { id: 's3', startSec: 15, endSec: 35, slotType: 'body', label: 'Discovery & Transformation' },
      { id: 's4', startSec: 35, endSec: 45, slotType: 'cta', label: 'Invitation CTA' },
    ],
  },
  {
    id: 'problem-solution', name: 'Problem → Solution', icon: '💡', description: 'Direct problem identification then clean solution',
    source: 'library', duration: 30,
    slots: [
      { id: 's1', startSec: 0, endSec: 3, slotType: 'hook', label: 'Problem Statement' },
      { id: 's2', startSec: 3, endSec: 12, slotType: 'angle', label: 'Pain Amplification' },
      { id: 's3', startSec: 12, endSec: 25, slotType: 'body', label: 'Solution Demo' },
      { id: 's4', startSec: 25, endSec: 30, slotType: 'cta', label: 'Direct CTA' },
    ],
  },
  {
    id: 'social-proof-stack', name: 'Social Proof Stack', icon: '⭐', description: 'Lead with proof, stack testimonials, close',
    source: 'library', duration: 30,
    slots: [
      { id: 's1', startSec: 0, endSec: 3, slotType: 'hook', label: 'Bold Claim Hook' },
      { id: 's2', startSec: 3, endSec: 15, slotType: 'angle', label: 'Authority / Proof' },
      { id: 's3', startSec: 15, endSec: 25, slotType: 'body', label: 'Results Montage' },
      { id: 's4', startSec: 25, endSec: 30, slotType: 'cta', label: 'FOMO Close' },
    ],
  },
  {
    id: 'us-vs-them', name: 'Us vs. Them', icon: '⚔️', description: 'Comparative split showing competitor weakness',
    source: 'library', duration: 30,
    slots: [
      { id: 's1', startSec: 0, endSec: 3, slotType: 'hook', label: 'Provocative Question' },
      { id: 's2', startSec: 3, endSec: 15, slotType: 'angle', label: 'Competitor Pain' },
      { id: 's3', startSec: 15, endSec: 25, slotType: 'body', label: 'Our Advantage Demo' },
      { id: 's4', startSec: 25, endSec: 30, slotType: 'cta', label: 'Switch CTA' },
    ],
  },
  {
    id: 'ugc-testimonial', name: 'UGC Testimonial', icon: '🎥', description: 'Authentic user-generated content feel',
    source: 'library', duration: 60,
    slots: [
      { id: 's1', startSec: 0, endSec: 5, slotType: 'hook', label: 'Casual Hook' },
      { id: 's2', startSec: 5, endSec: 20, slotType: 'angle', label: 'Before Story' },
      { id: 's3', startSec: 20, endSec: 50, slotType: 'body', label: 'Experience / Results' },
      { id: 's4', startSec: 50, endSec: 60, slotType: 'cta', label: 'Recommendation Close' },
    ],
  },
];

function formatLabel(val: string): string {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
    key, count: d.count, totalSpend: d.spend, totalRevenue: d.revenue,
    totalConversions: d.conversions,
    avgRoas: d.spend > 0 ? d.revenue / d.spend : 0,
    avgCpa: d.conversions > 0 ? d.spend / d.conversions : 0,
    avgCtr: d.count > 0 ? d.ctr / d.count : 0,
  })).sort((a, b) => b.avgRoas - a.avgRoas);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface BlueprintStudioProps {
  creatives: VaultCreative[];
}

export function BlueprintStudio({ creatives }: BlueprintStudioProps) {
  const dnaCreatives = useMemo(() => creatives.filter(c => c.dna || c.dnaOverride), [creatives]);

  const hookData = useMemo(() => groupBy(dnaCreatives, c => c.dnaOverride?.hookType || c.dna?.hookType), [dnaCreatives]);
  const angleData = useMemo(() => groupBy(dnaCreatives, c => c.dnaOverride?.angle || c.dna?.angle), [dnaCreatives]);
  const formatData = useMemo(() => groupBy(dnaCreatives, c => c.dnaOverride?.videoFormat || c.dna?.videoFormat), [dnaCreatives]);

  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [slotSelections, setSlotSelections] = useState<Record<string, { category: string; value: string }>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [brief, setBrief] = useState<SynthesizedBrief | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState<number | null>(null);
  const [rerollError, setRerollError] = useState<string | null>(null);
  const [frameworkSearch, setFrameworkSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Click-outside + ESC key handler for dropdowns
  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openDropdown]);

  // Clear stale brief when slot selections change
  const prevSelectionsRef = useRef(slotSelections);
  useEffect(() => {
    if (brief && prevSelectionsRef.current !== slotSelections) {
      setBrief(null);
    }
    prevSelectionsRef.current = slotSelections;
  }, [slotSelections, brief]);

  // Progress counter
  const filledCount = selectedFramework
    ? selectedFramework.slots.filter(s => slotSelections[s.id]).length
    : 0;
  const totalSlots = selectedFramework?.slots.length || 0;

  // Build tag options for each slot type — hook→hooks, angle/body→angles, cta→formats
  const buildTagOptions = useCallback((slotType: string): TagOption[] => {
    let data: GroupedMetrics[];
    let colorMap: Record<string, string>;

    if (slotType === 'hook') {
      data = hookData; colorMap = HOOK_TYPE_COLORS;
    } else if (slotType === 'angle' || slotType === 'body') {
      data = angleData; colorMap = ANGLE_COLORS;
    } else {
      // CTA uses format data (ugc, talking_head, etc.)
      data = formatData; colorMap = FORMAT_COLORS;
    }

    return data.map(d => {
      const roas = isFinite(d.avgRoas) ? d.avgRoas : 0;
      return {
        value: d.key,
        label: formatLabel(d.key),
        avgRoas: roas,
        count: d.count,
        status: (roas >= 2 ? 'top' : roas >= 1.5 ? 'good' : roas >= 1 ? 'trending' : 'fatigue') as TagOption['status'],
        color: colorMap[d.key] || '#6B7280',
      };
    });
  }, [hookData, angleData, formatData]);

  const handleSelectFramework = useCallback((fw: Framework) => {
    setSelectedFramework(fw);
    setSlotSelections({});
    setBrief(null);
    setSynthError(null);
  }, []);

  const handleSlotSelect = useCallback((slotId: string, category: string, value: string) => {
    setSlotSelections(prev => ({ ...prev, [slotId]: { category, value } }));
    setOpenDropdown(null);
  }, []);

  const allSlotsFilled = selectedFramework
    ? selectedFramework.slots.every(s => slotSelections[s.id])
    : false;

  const handleSynthesize = useCallback(async () => {
    if (!selectedFramework || !allSlotsFilled || synthesizing) return;
    setSynthesizing(true);
    setSynthError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const slots = selectedFramework.slots.map(s => ({
        slotType: s.slotType,
        tagCategory: slotSelections[s.id].category,
        tagValue: slotSelections[s.id].value,
        startSec: s.startSec,
        endSec: s.endSec,
      }));

      const res = await fetch('/api/ad-tracker/synthesize-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameworkName: selectedFramework.name, slots }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.brief) setBrief(data.brief);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setSynthError(err.message || 'Failed to synthesize');
    } finally {
      setSynthesizing(false);
      abortRef.current = null;
    }
  }, [selectedFramework, allSlotsFilled, slotSelections, synthesizing]);

  const handleReroll = useCallback(async (sectionIndex: number) => {
    if (!selectedFramework || !brief || rerolling !== null) return;
    setRerolling(sectionIndex);
    setRerollError(null);

    try {
      const slots = selectedFramework.slots.map(s => ({
        slotType: s.slotType,
        tagCategory: slotSelections[s.id]?.category || s.slotType,
        tagValue: slotSelections[s.id]?.value || '',
        startSec: s.startSec,
        endSec: s.endSec,
      }));

      const res = await fetch('/api/ad-tracker/synthesize-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameworkName: selectedFramework.name,
          slots,
          rerollSectionIndex: sectionIndex,
          existingSections: brief.sections,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.brief) setBrief(data.brief);
    } catch (err: any) {
      setRerollError(err.message || 'Re-roll failed');
      setTimeout(() => setRerollError(null), 4000);
    } finally {
      setRerolling(null);
    }
  }, [selectedFramework, brief, slotSelections, rerolling]);

  const handleCopyBrief = useCallback(() => {
    if (!brief) return;
    const text = [
      `📋 Creative Brief — ${selectedFramework?.name || 'Custom'}`,
      '',
      `💡 ${brief.justification}`,
      '',
      ...brief.sections.map(s => [
        `🎬 ${fmtTime(s.startSec)} - ${fmtTime(s.endSec)} | ${s.slotType.toUpperCase()} (${formatLabel(s.tagUsed)})`,
        `Visual: ${s.visual}`,
        `Audio: ${s.audio}`,
        '',
      ].join('\n')),
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [brief, selectedFramework]);

  const filteredFrameworks = useMemo(() => {
    const search = frameworkSearch.toLowerCase();
    return FRAMEWORK_LIBRARY.filter(fw =>
      !search || fw.name.toLowerCase().includes(search) || fw.description.toLowerCase().includes(search)
    );
  }, [frameworkSearch]);

  // Empty state
  if (dnaCreatives.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px', gap: '16px',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'linear-gradient(145deg, rgba(78,205,196,0.1), rgba(78,205,196,0.03))',
          border: '1px solid rgba(78,205,196,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
        }}>🏗️</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#E5E7EB', fontFamily: "'Inter', sans-serif" }}>
          Creative Blueprint Studio
        </div>
        <div style={{
          fontSize: '13px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
          textAlign: 'center', maxWidth: '320px', lineHeight: 1.6,
        }}>
          Extract DNA from your creatives first. The Blueprint Studio uses your performance data to power
          data-driven ad script generation.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Studio Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(78,205,196,0.12), rgba(168,85,247,0.12))',
            border: '1px solid rgba(78,205,196,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>🏗️</div>
          <div>
            <div style={{
              fontSize: '15px', fontWeight: 700, color: '#F4F4F5',
              fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
            }}>Creative Blueprint Studio</div>
            <div style={{
              fontSize: '11px', color: '#6B7280', fontFamily: "'Inter', sans-serif", marginTop: '1px',
            }}>Mix proven frameworks with your winning DNA tags</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '10px', color: '#52525B', fontFamily: "'Inter', sans-serif",
            padding: '4px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {dnaCreatives.length} creatives with DNA
          </span>
        </div>
      </div>

      {/* 3-Column Canvas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: brief ? '260px 1fr 1fr' : selectedFramework ? '260px 1fr' : '1fr',
        gap: '16px',
        minHeight: selectedFramework ? '500px' : '400px',
        transition: 'grid-template-columns 0.3s ease',
      }}>

        {/* ===== LEFT COLUMN: Framework Browser ===== */}
        <div style={{
          borderRadius: '16px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{
              fontSize: '11px', fontWeight: 600, color: '#9CA3AF',
              fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const,
              letterSpacing: '0.08em', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{
                width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: selectedFramework ? 'rgba(78,205,196,0.15)' : 'rgba(255,255,255,0.06)',
                color: selectedFramework ? '#4ECDC4' : '#6B7280',
                fontWeight: 700, flexShrink: 0,
              }}>{selectedFramework ? '✓' : '1'}</span> Choose a Framework
            </div>
            <input
              type="text"
              placeholder="Search frameworks..."
              value={frameworkSearch}
              onChange={(e) => setFrameworkSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E5E7EB', fontSize: '11px', fontFamily: "'Inter', sans-serif",
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredFrameworks.map(fw => {
              const isSelected = selectedFramework?.id === fw.id;
              return (
                <button
                  key={fw.id}
                  onClick={() => handleSelectFramework(fw)}
                  style={{
                    width: '100%', padding: '12px',
                    borderRadius: '10px', border: isSelected
                      ? '1px solid rgba(78,205,196,0.3)'
                      : '1px solid transparent',
                    background: isSelected
                      ? 'rgba(78,205,196,0.08)'
                      : 'transparent',
                    cursor: 'pointer', textAlign: 'left' as const,
                    transition: 'all 0.15s ease', outline: 'none',
                    marginBottom: '4px', display: 'block',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>{fw.icon}</span>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: isSelected ? '#4ECDC4' : '#E5E7EB',
                      fontFamily: "'Inter', sans-serif",
                    }}>{fw.name}</span>
                  </div>
                  <div style={{
                    fontSize: '10px', color: '#6B7280', fontFamily: "'Inter', sans-serif",
                    lineHeight: 1.5, marginBottom: '6px',
                  }}>{fw.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                      background: 'rgba(255,255,255,0.04)', color: '#9CA3AF',
                      fontFamily: "'SF Mono', monospace",
                    }}>{fw.duration}s</span>
                    <span style={{
                      fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                      background: 'rgba(255,255,255,0.04)', color: '#9CA3AF',
                      fontFamily: "'SF Mono', monospace",
                    }}>{fw.slots.length} slots</span>
                    {fw.source === 'vault' && (
                      <span style={{
                        fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(168,85,247,0.08)', color: '#A855F7',
                        fontFamily: "'Inter', sans-serif", fontWeight: 600,
                      }}>YOUR DATA</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== CENTER COLUMN: Timeline Builder or Welcome ===== */}
        {selectedFramework ? (
          <div style={{
            borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(255,255,255,0.01)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 600, color: '#9CA3AF',
                fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: allSlotsFilled ? 'rgba(78,205,196,0.15)' : 'rgba(255,255,255,0.06)',
                  color: allSlotsFilled ? '#4ECDC4' : '#6B7280',
                  fontWeight: 700, flexShrink: 0,
                }}>{
                  allSlotsFilled ? '✓' : '2'
                }</span> Build Your DNA Timeline
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <div style={{
                  fontSize: '10px', color: '#52525B', fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontSize: '12px' }}>{selectedFramework.icon}</span>
                  {selectedFramework.name}
                  <span style={{
                    fontSize: '9px', padding: '2px 8px', borderRadius: '10px',
                    fontFamily: "'SF Mono', monospace", fontWeight: 600,
                    background: allSlotsFilled ? 'rgba(78,205,196,0.1)' : 'rgba(255,255,255,0.04)',
                    color: allSlotsFilled ? '#4ECDC4' : '#6B7280',
                    transition: 'all 0.2s ease',
                  }}>{filledCount}/{totalSlots}</span>
                </div>
                {filledCount > 0 && (
                  <button
                    onClick={() => { setSlotSelections({}); setBrief(null); }}
                    style={{
                      padding: '3px 8px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#6B7280', fontSize: '9px', fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer', outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >Clear All</button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedFramework.slots.map((slot, idx) => {
                const selection = slotSelections[slot.id];
                const config = SLOT_TYPE_CONFIG[slot.slotType] || SLOT_TYPE_CONFIG.body;
                const isOpen = openDropdown === slot.id;
                const options = buildTagOptions(slot.slotType);
                const selectedOption = selection ? options.find(o => o.value === selection.value) : null;

                return (
                  <div key={slot.id} style={{ position: 'relative' }}>
                    {/* Connector line */}
                    {idx > 0 && (
                      <div style={{
                        position: 'absolute', top: '-12px', left: '22px',
                        width: '2px', height: '12px',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                      }} />
                    )}

                    <div style={{
                      borderRadius: '12px',
                      border: selection
                        ? `1px solid ${config.color}25`
                        : '1px solid rgba(255,255,255,0.06)',
                      background: selection
                        ? `${config.color}06`
                        : 'rgba(255,255,255,0.015)',
                      padding: '14px 16px',
                      transition: 'all 0.2s ease',
                    }}>
                      {/* Slot header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: '10px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '9px', padding: '3px 8px', borderRadius: '6px',
                            background: `${config.color}12`, color: config.color,
                            fontFamily: "'SF Mono', monospace", fontWeight: 700,
                          }}>
                            {fmtTime(slot.startSec)} - {fmtTime(slot.endSec)}
                          </span>
                          <span style={{ fontSize: '13px' }}>{config.icon}</span>
                          <span style={{
                            fontSize: '11px', fontWeight: 600, color: '#D4D4D8',
                            fontFamily: "'Inter', sans-serif",
                          }}>{slot.label}</span>
                        </div>
                      </div>

                      {/* Tag selector */}
                      <div ref={openDropdown === slot.id ? dropdownRef : undefined} style={{ position: 'relative' }}>
                        <button
                          onClick={() => setOpenDropdown(isOpen ? null : slot.id)}
                          style={{
                            width: '100%', padding: '10px 14px',
                            borderRadius: '10px',
                            border: selection
                              ? `1px solid ${selectedOption?.color || config.color}30`
                              : '1px dashed rgba(255,255,255,0.12)',
                            background: selection
                              ? `${selectedOption?.color || config.color}08`
                              : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer', outline: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {selection ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                backgroundColor: selectedOption?.color || config.color,
                                boxShadow: `0 0 6px ${selectedOption?.color || config.color}40`,
                              }} />
                              <span style={{
                                fontSize: '12px', fontWeight: 600,
                                color: selectedOption?.color || '#E5E7EB',
                                fontFamily: "'Inter', sans-serif",
                              }}>{formatLabel(selection.value)}</span>
                              {selectedOption && (
                                <span style={{
                                  fontSize: '10px', fontWeight: 700,
                                  color: selectedOption.avgRoas >= 2 ? '#06D6A0' : selectedOption.avgRoas >= 1 ? '#F59E0B' : '#EF4444',
                                  fontFamily: "'SF Mono', monospace",
                                }}>{selectedOption.avgRoas.toFixed(1)}x</span>
                              )}
                            </div>
                          ) : (
                            <span style={{
                              fontSize: '11px', color: '#52525B', fontFamily: "'Inter', sans-serif",
                              fontStyle: 'italic',
                            }}>
                              Select {config.label.toLowerCase()}...
                            </span>
                          )}
                          <span style={{
                            fontSize: '10px', color: '#52525B',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.15s ease',
                          }}>▾</span>
                        </button>

                        {/* Dropdown */}
                        {isOpen && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                            zIndex: 100, borderRadius: '12px',
                            background: 'rgba(15,15,28,0.98)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(24px)',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                            padding: '6px', maxHeight: '240px', overflowY: 'auto',
                            animation: 'blueprintDropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
                          }}>
                            <div style={{
                              padding: '6px 10px', fontSize: '9px', fontWeight: 600,
                              color: '#52525B', textTransform: 'uppercase' as const,
                              letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif",
                              borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '4px',
                            }}>
                              Sorted by Your ROAS
                            </div>
                            {options.length === 0 ? (
                              <div style={{
                                padding: '16px 12px', textAlign: 'center',
                                fontSize: '11px', color: '#52525B',
                                fontFamily: "'Inter', sans-serif",
                              }}>No DNA tags available yet.<br/>Extract DNA from your creatives first.</div>
                            ) : options.map(opt => {
                              const statusIcon = opt.status === 'top' ? '🟢' : opt.status === 'good' ? '🔵' : opt.status === 'trending' ? '🔥' : '🔴';
                              const statusLabel = opt.status === 'top' ? 'Top Performer' : opt.status === 'fatigue' ? 'Fatigue Warning' : '';
                              const isSelected = selection?.value === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => handleSlotSelect(slot.id, slot.slotType, opt.value)}
                                  style={{
                                    width: '100%', padding: '10px 12px',
                                    borderRadius: '8px', border: 'none',
                                    background: isSelected ? `${opt.color}12` : 'transparent',
                                    cursor: 'pointer', outline: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.1s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px' }}>{statusIcon}</span>
                                    <span style={{
                                      width: '6px', height: '6px', borderRadius: '50%',
                                      backgroundColor: opt.color,
                                    }} />
                                    <div>
                                      <span style={{
                                        fontSize: '11.5px', fontWeight: isSelected ? 600 : 400,
                                        color: isSelected ? opt.color : '#D4D4D8',
                                        fontFamily: "'Inter', sans-serif",
                                      }}>{opt.label}</span>
                                      {statusLabel && (
                                        <span style={{
                                          fontSize: '8px', color: '#6B7280', marginLeft: '6px',
                                          fontFamily: "'Inter', sans-serif",
                                        }}>{statusLabel}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                  }}>
                                    <span style={{
                                      fontSize: '10px', color: '#6B7280',
                                      fontFamily: "'SF Mono', monospace",
                                    }}>{opt.count} ads</span>
                                    <span style={{
                                      fontSize: '11px', fontWeight: 700,
                                      color: opt.avgRoas >= 2 ? '#06D6A0' : opt.avgRoas >= 1 ? '#F59E0B' : '#EF4444',
                                      fontFamily: "'SF Mono', monospace",
                                    }}>{opt.avgRoas.toFixed(2)}x</span>
                                    {isSelected && <span style={{ fontSize: '10px', color: opt.color }}>✓</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Synthesize Button */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={handleSynthesize}
                  disabled={!allSlotsFilled || synthesizing}
                  style={{
                    width: '100%', padding: '16px 24px',
                    borderRadius: '14px', border: 'none',
                    background: allSlotsFilled && !synthesizing
                      ? 'linear-gradient(135deg, rgba(78,205,196,0.2) 0%, rgba(168,85,247,0.2) 50%, rgba(78,205,196,0.2) 100%)'
                      : 'rgba(255,255,255,0.03)',
                    cursor: allSlotsFilled && !synthesizing ? 'pointer' : 'not-allowed',
                    outline: 'none',
                    fontSize: '14px', fontWeight: 700,
                    color: allSlotsFilled ? '#F4F4F5' : '#3F3F46',
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '-0.01em',
                    transition: 'all 0.3s ease',
                    boxShadow: allSlotsFilled && !synthesizing
                      ? '0 0 30px rgba(78,205,196,0.15), 0 0 60px rgba(168,85,247,0.1)'
                      : 'none',
                    backgroundSize: '200% 100%',
                    animation: allSlotsFilled && !synthesizing ? 'blueprintShimmer 3s linear infinite' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (allSlotsFilled && !synthesizing) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 40px rgba(78,205,196,0.25), 0 0 80px rgba(168,85,247,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (allSlotsFilled && !synthesizing) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(78,205,196,0.15), 0 0 60px rgba(168,85,247,0.1)';
                    }
                  }}
                >
                  {synthesizing ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                      Synthesizing...
                    </span>
                  ) : (
                    '✨ Synthesize Masterpiece ✨'
                  )}
                </button>

                {synthError && (
                  <div style={{
                    marginTop: '10px', padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                    color: '#EF4444', fontSize: '11px', fontFamily: "'Inter', sans-serif",
                  }}>
                    ⚠️ {synthError}
                  </div>
                )}

                {!allSlotsFilled && selectedFramework && (
                  <div style={{
                    marginTop: '10px', textAlign: 'center',
                    fontSize: '10px', color: '#52525B', fontFamily: "'Inter', sans-serif",
                  }}>
                    Fill all {selectedFramework.slots.length} slots to synthesize
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Welcome state — no framework selected yet */
          <div style={{
            borderRadius: '16px',
            border: '1px dashed rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '60px 32px', gap: '16px', textAlign: 'center',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(78,205,196,0.08), rgba(168,85,247,0.08))',
              border: '1px solid rgba(78,205,196,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            }}>👈</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#D4D4D8', fontFamily: "'Inter', sans-serif" }}>
              Select a framework to begin
            </div>
            <div style={{
              fontSize: '11px', color: '#52525B', fontFamily: "'Inter', sans-serif",
              lineHeight: 1.6, maxWidth: '280px',
            }}>
              Choose a proven ad structure from the left panel. Each framework defines the timeline
              slots you'll fill with your highest-performing DNA tags.
            </div>
            <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
              {[['🪝', 'Hook'], ['🎯', 'Angle'], ['📝', 'Body'], ['🚀', 'CTA']].map(([icon, label]) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                }}>
                  <span style={{ fontSize: '18px' }}>{icon}</span>
                  <span style={{ fontSize: '9px', color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== RIGHT COLUMN: Generated Brief ===== */}
        {brief && (
          <div style={{
            borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
            display: 'flex', flexDirection: 'column',
            animation: 'briefSlideIn 0.4s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(255,255,255,0.01)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 600, color: '#9CA3AF',
                fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(78,205,196,0.15)', color: '#4ECDC4',
                  fontWeight: 700, flexShrink: 0,
                }}>✓</span> Generated Brief
              </div>
              <button
                onClick={handleCopyBrief}
                style={{
                  padding: '5px 12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#9CA3AF', fontSize: '10px', fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer', outline: 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {/* Justification */}
              <div style={{
                padding: '12px 14px', borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(78,205,196,0.06), rgba(168,85,247,0.06))',
                border: '1px solid rgba(78,205,196,0.1)',
                marginBottom: '16px',
              }}>
                <div style={{
                  fontSize: '9px', fontWeight: 600, color: '#4ECDC4',
                  fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em', marginBottom: '6px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>💡 Strategy Justification</div>
                <div style={{
                  fontSize: '12px', color: '#D4D4D8', lineHeight: 1.6,
                  fontFamily: "'Inter', sans-serif",
                }}>{brief.justification}</div>
              </div>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {brief.sections.map((section, idx) => {
                  const slotConfig = SLOT_TYPE_CONFIG[section.slotType] || SLOT_TYPE_CONFIG.body;
                  const isRerollingThis = rerolling === idx;
                  return (
                    <div key={idx} style={{
                      borderRadius: '12px',
                      border: `1px solid ${slotConfig.color}15`,
                      background: `${slotConfig.color}04`,
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      opacity: isRerollingThis ? 0.5 : 1,
                    }}>
                      {/* Section header */}
                      <div style={{
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: `1px solid ${slotConfig.color}10`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '6px',
                            background: `${slotConfig.color}15`, color: slotConfig.color,
                            fontFamily: "'SF Mono', monospace",
                          }}>
                            {fmtTime(section.startSec)} - {fmtTime(section.endSec)}
                          </span>
                          <span style={{ fontSize: '12px' }}>{slotConfig.icon}</span>
                          <span style={{
                            fontSize: '11px', fontWeight: 600, color: '#D4D4D8',
                            fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const,
                          }}>{section.slotType}</span>
                          {section.tagUsed && (
                            <span style={{
                              fontSize: '9px', padding: '2px 6px', borderRadius: '10px',
                              background: 'rgba(255,255,255,0.04)',
                              color: '#9CA3AF', fontFamily: "'Inter', sans-serif",
                            }}>{formatLabel(section.tagUsed)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleReroll(idx)}
                          disabled={rerolling !== null}
                          title="Re-roll this section"
                          style={{
                            width: '30px', height: '30px', borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            cursor: rerolling !== null ? 'not-allowed' : 'pointer',
                            outline: 'none', fontSize: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            opacity: rerolling !== null ? 0.4 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (rerolling === null) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                              e.currentTarget.style.transform = 'rotate(15deg)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.transform = 'rotate(0)';
                          }}
                        >
                          {isRerollingThis ? (
                            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '12px' }}>⟳</span>
                          ) : '🎲'}
                        </button>
                      </div>

                      {/* Section body */}
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <div style={{
                            fontSize: '9px', fontWeight: 600, color: '#52525B',
                            fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const,
                            letterSpacing: '0.06em', marginBottom: '4px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>🎬 Visual</div>
                          <div style={{
                            fontSize: '12px', color: '#D4D4D8', lineHeight: 1.6,
                            fontFamily: "'Inter', sans-serif",
                          }}>{section.visual}</div>
                        </div>
                        <div>
                          <div style={{
                            fontSize: '9px', fontWeight: 600, color: '#52525B',
                            fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' as const,
                            letterSpacing: '0.06em', marginBottom: '4px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>🔊 Audio</div>
                          <div style={{
                            fontSize: '12px', color: '#A1A1AA', lineHeight: 1.6,
                            fontFamily: "'Inter', sans-serif", fontStyle: 'italic',
                          }}>"{section.audio}"</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Re-roll error toast */}
              {rerollError && (
                <div style={{
                  marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                  color: '#EF4444', fontSize: '11px', fontFamily: "'Inter', sans-serif",
                  animation: 'briefSlideIn 0.2s ease',
                }}>
                  ⚠️ {rerollError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes blueprintDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes briefSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes blueprintShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
