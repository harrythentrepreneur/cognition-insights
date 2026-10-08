'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { CANVAS_COLORS, HANDLE_STYLE, INPUT_STYLE, LABEL_STYLE, getNodeStyle, getNodeHeaderStyle } from '../canvasTheme';
import { useCanvasData } from '../CanvasDataContext';
import { NodePriority } from './NodePriority';

// ============================================================================
// URL NODE
// ============================================================================

export function UrlNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const [url, setUrl] = useState('');

  const platform = useMemo(() => {
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('meta.com')) return 'Meta';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    return '';
  }, [url]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    updateNodeData(id, { url: e.target.value });
  }, [id, updateNodeData]);

  const accent = CANVAS_COLORS.source;

  return (
    <div style={getNodeStyle(accent, !!selected)}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <div style={getNodeHeaderStyle(accent)}>
        <NodeIcon icon="🔗" color={accent} />
        <div>
          <NodeTitle>Ad URL</NodeTitle>
          <NodeSub>{platform ? `${platform} detected` : 'Paste any ad URL'}</NodeSub>
        </div>
      </div>
      <div style={{ padding: '6px 10px 8px' }}>
        <input type="text" placeholder="Paste TikTok, Meta, YouTube URL..."
          value={url} onChange={handleChange} className="nodrag"
          style={INPUT_STYLE}
          onFocus={e => { e.currentTarget.style.borderColor = `${accent}25`; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
        />
      </div>
      <Handle type="source" position={Position.Right} id="media" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// VAULT CREATIVE NODE
// ============================================================================

export function VaultCreativeNode({ id, data, selected }: NodeProps) {
  const { creatives } = useCanvasData();
  const { updateNodeData } = useReactFlow();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dataOpen, setDataOpen] = useState(false);

  const selectedId = data?.creativeId as string | undefined;
  const creative = useMemo(() => creatives.find(c => c.id === selectedId), [creatives, selectedId]);

  // User edits are stored as a nested overrides blob on node data. When
  // rendering / feeding downstream, overrides are merged on top of the base
  // values. Deep-merge: object values layer, primitive values replace.
  const overrides = (data?.dataOverrides as Record<string, any>) || {};

  const base = useMemo(() => {
    if (!creative) return null;
    // Reads a cached blob from localStorage and self-heals if it's from the
    // legacy extraction schema. This mirrors the detection in AdXRayPanel so
    // the canvas never shows stale `rawMediaAnalysis` / `dominantColors` /
    // `textOverlays` fields that aren't in the current prompt output.
    const isLegacyRaw = (parsed: any): boolean => {
      if (!parsed || typeof parsed !== 'object') return false;
      const cd = parsed.creativeDetails || {};
      return (
        parsed.freeformAnalysis !== undefined ||
        parsed.avatar !== undefined ||
        parsed.rawMediaAnalysis !== undefined ||
        parsed.rawObservations !== undefined ||
        parsed.additionalDetails !== undefined ||
        parsed.dominantColors !== undefined ||
        cd.visualStyle !== undefined ||
        cd.pacing !== undefined ||
        cd.emotionalTone !== undefined ||
        cd.brandElements !== undefined
      );
    };
    const isLegacySystem = (parsed: any): boolean => {
      if (!parsed || typeof parsed !== 'object') return false;
      return (
        Array.isArray(parsed.marketDesires) ||
        parsed?.testingNotes?.adConcept !== undefined ||
        (Array.isArray(parsed.awarenessQuestions) && parsed.awarenessQuestions.length >= 4)
      );
    };
    const readLS = (key: string, kind: 'raw' | 'classify' | 'system' | 'analysis'): any => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (kind === 'raw' && isLegacyRaw(parsed)) {
          localStorage.removeItem(key);
          // classification was derived from raw extraction — drop it too
          localStorage.removeItem(`xray-classify:${creative.id}`);
          return null;
        }
        if (kind === 'system' && isLegacySystem(parsed)) {
          localStorage.removeItem(key);
          return null;
        }
        return parsed;
      } catch { return null; }
    };
    return {
      identity: {
        id: creative.id,
        name: creative.name,
        platform: creative.platform,
        type: creative.type,
        status: creative.status,
      },
      adCopy: {
        headline: creative.headline || '',
        body: creative.body || '',
        description: creative.description || '',
        linkUrl: creative.linkUrl || '',
        postUrl: creative.postUrl || '',
      },
      media: {
        thumbnailUrl: creative.thumbnailUrl || '',
        fullPictureUrl: creative.fullPictureUrl || '',
        imageUrl: creative.imageUrl || '',
        videoSourceUrl: creative.videoSourceUrl || '',
      },
      dna: creative.dna || null,
      dnaOverride: creative.dnaOverride || null,
      rawExtraction: readLS(`xray-raw:${creative.id}`, 'raw'),
      classification: readLS(`xray-classify:${creative.id}`, 'classify'),
      creativeSystem: readLS(`xray-system:${creative.id}`, 'system'),
      analysisSummary: readLS(`xray-analysis:${creative.id}`, 'analysis'),
    };
  }, [creative, dataOpen]);

  const merged = useMemo(() => deepMerge(base, overrides), [base, overrides]);

  const handleEdit = useCallback((path: string[], value: any) => {
    const next = deepSet(overrides, path, value);
    updateNodeData(id, { dataOverrides: next });
  }, [id, updateNodeData, overrides]);

  const handleReset = useCallback((path: string[]) => {
    const next = deepDelete(overrides, path);
    updateNodeData(id, { dataOverrides: next });
  }, [id, updateNodeData, overrides]);

  const hasOverride = useCallback((path: string[]): boolean => {
    let cur: any = overrides;
    for (const k of path) {
      if (cur == null || typeof cur !== 'object') return false;
      if (!(k in cur)) return false;
      cur = cur[k];
    }
    return cur !== undefined;
  }, [overrides]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (search
      ? creatives.filter(c => c.name.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q))
      : creatives
    ).slice(0, 20);
  }, [creatives, search]);

  const handleSelect = useCallback((c: typeof creatives[0]) => {
    updateNodeData(id, {
      creativeId: c.id, name: c.name,
      thumbnailUrl: c.thumbnailUrl || c.fullPictureUrl || c.imageUrl,
      type: c.type, platform: c.platform, platformColor: c.platformColor,
      metrics: c.metrics,
      hookType: c.dnaOverride?.hookType || c.dna?.hookType,
      angle: c.dnaOverride?.angle || c.dna?.angle,
      format: c.dnaOverride?.videoFormat || c.dna?.videoFormat,
    });
    setPickerOpen(false);
    setSearch('');
  }, [id, updateNodeData]);

  const accent = CANVAS_COLORS.source;
  const roas = creative?.metrics?.roas || 0;
  const cpa = creative?.metrics?.cpa || 0;

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), minWidth: '210px' }}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <div style={getNodeHeaderStyle(accent)}>
        {creative?.thumbnailUrl || creative?.fullPictureUrl ? (
          <Thumb src={(creative.thumbnailUrl || creative.fullPictureUrl)!} />
        ) : (
          <NodeIcon icon="📦" color={accent} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <NodeTitle>{creative ? trunc(creative.name, 20) : 'Select Creative'}</NodeTitle>
          <NodeSub color={creative?.platformColor}>{creative ? creative.platform : 'Pick from vault'}</NodeSub>
        </div>
      </div>

      <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {creative && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <CpaBadge cpa={cpa} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MetricStat label="CONV." value={String(Math.round(creative.metrics.conversions || 0))} />
                <MetricStat label="SPEND" value={`$${Math.round(creative.metrics['ad-spend'] || creative.metrics.spend || 0)}`} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              {(creative.dnaOverride?.hookType || creative.dna?.hookType) && <Pill label={fmt(creative.dnaOverride?.hookType || creative.dna?.hookType || '')} color="#4ECDC4" />}
              {(creative.dnaOverride?.angle || creative.dna?.angle) && <Pill label={fmt(creative.dnaOverride?.angle || creative.dna?.angle || '')} color="#F59E0B" />}
              {(creative.dnaOverride?.videoFormat || creative.dna?.videoFormat) && <Pill label={fmt(creative.dnaOverride?.videoFormat || creative.dna?.videoFormat || '')} color="#45B7D1" />}
            </div>
          </>
        )}

        {creative && (
          <button
            onClick={() => setDataOpen(o => !o)}
            className="nodrag adlab-btn"
            style={{
              ...actionBtnStyle(accent),
              marginBottom: '2px',
              background: dataOpen ? `${accent}12` : `${accent}05`,
              borderColor: dataOpen ? `${accent}30` : `${accent}12`,
              color: dataOpen ? accent : `${accent}bb`,
            }}
          >
            {dataOpen ? '▾ Hide all data' : '▸ Show all data'}
          </button>
        )}

        {creative && dataOpen && merged && (
          <div
            className="nodrag nowheel"
            style={{
              marginBottom: '4px',
              maxHeight: '420px',
              overflowY: 'auto',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.05)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '9px',
              lineHeight: 1.45,
              color: CANVAS_COLORS.textSecondary,
            }}
          >
            {Object.entries(merged).map(([section, value]) => (
              <div key={section} style={{ marginBottom: '10px' }}>
                <div style={{
                  fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const, color: accent, marginBottom: '4px',
                }}>
                  {section}
                </div>
                {value == null ? (
                  <span style={{ color: CANVAS_COLORS.textDim, fontStyle: 'italic', fontSize: '9px' }}>
                    not extracted yet
                  </span>
                ) : (
                  <EditableTree
                    value={value}
                    path={[section]}
                    onEdit={handleEdit}
                    onReset={handleReset}
                    hasOverride={hasOverride}
                    accent={accent}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <button onClick={() => setPickerOpen(!pickerOpen)} className="nodrag adlab-btn" style={actionBtnStyle(accent)}>
            {creative ? '↻ Change' : '+ Select Creative'}
          </button>

          {pickerOpen && (
            <div className="nodrag nowheel" style={dropdownStyle}>
              <input type="text" placeholder="Search..." value={search}
                onChange={e => setSearch(e.target.value)} autoFocus
                style={{ ...INPUT_STYLE, marginBottom: '3px', fontSize: '9.5px' }}
              />
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '10px', textAlign: 'center', color: CANVAS_COLORS.textDim, fontSize: '9px' }}>No ads found</div>
                ) : filtered.map(c => {
                  const cCpa = c.metrics.cpa || 0;
                  const conv = Math.round(c.metrics.conversions || 0);
                  const active = c.id === selectedId;
                  const cc = cCpa > 0
                    ? (cCpa <= 40 ? CANVAS_COLORS.statusTop : cCpa <= 80 ? CANVAS_COLORS.statusGood : cCpa <= 150 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue)
                    : CANVAS_COLORS.textDim;
                  return (
                    <button key={c.id} onClick={() => handleSelect(c)} style={{
                      ...listItemStyle, background: active ? `${accent}06` : 'transparent',
                    }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Thumb src={(c.thumbnailUrl || c.fullPictureUrl || c.imageUrl) || ''} size={22} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 500, color: CANVAS_COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trunc(c.name, 20)}</div>
                        <div style={{ fontSize: '7.5px', color: CANVAS_COLORS.textDim, display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ color: c.platformColor, fontWeight: 600 }}>{c.platform}</span>
                          <span>·</span>
                          <span style={{ fontFamily: "'SF Mono', monospace", fontWeight: 700, color: cc }}>{cCpa > 0 ? `$${Math.round(cCpa)}` : '—'}</span>
                          <span>·</span>
                          <span style={{ fontFamily: "'SF Mono', monospace", fontWeight: 600 }}>{conv} conv.</span>
                        </div>
                      </div>
                      {active && <span style={{ fontSize: '8px', color: accent }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="creative" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// BRAND PROFILE NODE
// ============================================================================

export function BrandProfileNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [voice, setVoice] = useState('');
  const accent = CANVAS_COLORS.source;
  const filled = [product, audience, voice].filter(Boolean).length;

  const update = useCallback((field: string, value: string) => {
    const u: Record<string, string> = {};
    if (field === 'product') { setProduct(value); u.productName = value; }
    if (field === 'audience') { setAudience(value); u.targetAudience = value; }
    if (field === 'voice') { setVoice(value); u.brandVoice = value; }
    updateNodeData(id, u);
  }, [id, updateNodeData]);

  return (
    <div style={getNodeStyle(accent, !!selected)}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <div style={getNodeHeaderStyle(accent)}>
        <NodeIcon icon="👤" color={accent} />
        <div>
          <NodeTitle>Brand Profile</NodeTitle>
          <NodeSub>{filled}/3 filled</NodeSub>
        </div>
      </div>
      <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Field label="Product" placeholder="e.g. FitBody Pro" value={product} onChange={v => update('product', v)} />
        <Field label="Audience" placeholder="e.g. Women 25–40" value={audience} onChange={v => update('audience', v)} />
        <div>
          <div style={LABEL_STYLE}>Voice</div>
          <textarea placeholder="e.g. Casual, fun" value={voice}
            onChange={e => update('voice', e.target.value)}
            className="nodrag" rows={2}
            style={{ ...INPUT_STYLE, resize: 'none' as const, lineHeight: 1.4 }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="brand" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// SHARED UI PRIMITIVES — Ultra-clean
// ============================================================================

function NodeIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <span style={{
      width: '22px', height: '22px', borderRadius: '6px',
      background: `${color}06`, border: `1px solid ${color}10`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', flexShrink: 0,
    }}>{icon}</span>
  );
}

function NodeTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary, letterSpacing: '-0.01em' }}>{children}</div>;
}

function NodeSub({ children, color }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: '8px', color: color || CANVAS_COLORS.textMuted, fontWeight: 500 }}>{children}</div>;
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, color: CANVAS_COLORS.textPrimary, fontFamily: "'SF Mono', monospace", letterSpacing: '-0.01em' }}>
        {value}
      </span>
      <span style={{ fontSize: '7px', color: CANVAS_COLORS.textDim, fontWeight: 600, letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
}

export function RoasBadge({ roas }: { roas: number }) {
  const c = roas >= 2 ? CANVAS_COLORS.statusTop : roas >= 1 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue;
  return <span style={{ fontSize: '11px', fontWeight: 700, color: c, fontFamily: "'SF Mono', monospace" }}>{roas.toFixed(1)}x</span>;
}

// Cost per purchase badge — the primary creative perf metric. Lower is better.
// Bands are ranked relative to the dataset; on a single-card view we colour
// by absolute thresholds as a reasonable e-com default ($40 / $80 / $150).
export function CpaBadge({ cpa }: { cpa: number }) {
  if (!cpa || cpa <= 0) {
    return <span style={{ fontSize: '13px', fontWeight: 800, color: CANVAS_COLORS.textDim, fontFamily: "'SF Mono', monospace" }}>—</span>;
  }
  const c = cpa <= 40 ? CANVAS_COLORS.statusTop : cpa <= 80 ? CANVAS_COLORS.statusGood : cpa <= 150 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
      <span style={{ fontSize: '13px', fontWeight: 800, color: c, fontFamily: "'SF Mono', monospace", letterSpacing: '-0.02em' }}>${cpa.toFixed(0)}</span>
      <span style={{ fontSize: '7px', color: CANVAS_COLORS.textDim, fontWeight: 600, letterSpacing: '0.04em' }}>CPA</span>
    </span>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return <span style={{ padding: '1px 4px', borderRadius: '3px', fontSize: '7.5px', fontWeight: 600, background: `${color}06`, color: `${color}bb`, border: `1px solid ${color}0a` }}>{label}</span>;
}

function Thumb({ src, size = 24 }: { src: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    </div>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={LABEL_STYLE}>{label}</div>
      <input type="text" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} className="nodrag" style={INPUT_STYLE} />
    </div>
  );
}

function fmt(val: string) { return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function trunc(s: string, max: number) { return s.length > max ? s.slice(0, max) + '…' : s; }

// ============================================================================
// SHARED STYLES
// ============================================================================

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    '--btn-border': `${color}30`,
    '--btn-bg': `${color}06`,
    '--btn-text': `${color}cc`,
    '--btn-border-hover': `${color}50`,
    '--btn-bg-hover': `${color}10`,
  } as React.CSSProperties;
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 3px)', left: '-6px', right: '-6px',
  zIndex: 200, borderRadius: '8px',
  background: '#18182a', border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  padding: '5px', maxHeight: '240px', display: 'flex', flexDirection: 'column',
};

const listItemStyle: React.CSSProperties = {
  padding: '4px 5px', borderRadius: '5px', border: 'none', background: 'transparent',
  cursor: 'pointer', outline: 'none', textAlign: 'left',
  display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.1s ease',
};

// ============================================================================
// EDITABLE DATA TREE — every leaf is an inline-editable field
// ============================================================================

function deepMerge(base: any, overrides: any): any {
  if (base == null) return overrides ?? null;
  if (overrides == null) return base;
  if (typeof base !== 'object' || typeof overrides !== 'object') return overrides;
  if (Array.isArray(base) || Array.isArray(overrides)) return overrides;
  const out: Record<string, any> = { ...base };
  for (const k of Object.keys(overrides)) {
    out[k] = k in base ? deepMerge(base[k], overrides[k]) : overrides[k];
  }
  return out;
}

function deepSet(obj: Record<string, any>, path: string[], value: any): Record<string, any> {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const next = { ...(obj || {}) };
  next[head] = rest.length === 0 ? value : deepSet(next[head] || {}, rest, value);
  return next;
}

function deepDelete(obj: Record<string, any>, path: string[]): Record<string, any> {
  if (path.length === 0) return {};
  const [head, ...rest] = path;
  if (!obj || !(head in obj)) return obj || {};
  const next = { ...obj };
  if (rest.length === 0) {
    delete next[head];
  } else {
    next[head] = deepDelete(next[head], rest);
    if (next[head] && typeof next[head] === 'object' && Object.keys(next[head]).length === 0) {
      delete next[head];
    }
  }
  return next;
}

interface EditableTreeProps {
  value: any;
  path: string[];
  onEdit: (path: string[], value: any) => void;
  onReset: (path: string[]) => void;
  hasOverride: (path: string[]) => boolean;
  accent: string;
  depth?: number;
}

function EditableTree({ value, path, onEdit, onReset, hasOverride, accent, depth = 0 }: EditableTreeProps) {
  // Primitive leaf → editable field
  if (value === null || value === undefined) {
    return (
      <EditableLeaf
        value=""
        path={path}
        onEdit={onEdit}
        onReset={onReset}
        overridden={hasOverride(path)}
        accent={accent}
        placeholder="(empty — click to add)"
      />
    );
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <EditableLeaf
        value={value}
        path={path}
        onEdit={onEdit}
        onReset={onReset}
        overridden={hasOverride(path)}
        accent={accent}
      />
    );
  }

  // Array → editable list of child values
  if (Array.isArray(value)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: depth > 0 ? '6px' : 0 }}>
        {value.length === 0 && (
          <span style={{ color: CANVAS_COLORS.textDim, fontStyle: 'italic', fontSize: '9px' }}>(empty list)</span>
        )}
        {value.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{
              fontSize: '8px', color: CANVAS_COLORS.textDim, fontWeight: 600,
              marginTop: '4px', minWidth: '12px', fontFamily: "'SF Mono', monospace",
            }}>{i}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <EditableTree
                value={item}
                path={[...path, String(i)]}
                onEdit={onEdit}
                onReset={onReset}
                hasOverride={hasOverride}
                accent={accent}
                depth={depth + 1}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Object → list of key-value rows, recurse into each
  const entries = Object.entries(value);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '6px',
      marginLeft: depth > 0 ? '8px' : 0,
      paddingLeft: depth > 0 ? '8px' : 0,
      borderLeft: depth > 0 ? `1px solid ${accent}14` : 'none',
    }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{
            fontSize: '8.5px', color: CANVAS_COLORS.textMuted, fontWeight: 600,
            letterSpacing: '0.01em',
          }}>
            {k}
          </div>
          <EditableTree
            value={v}
            path={[...path, k]}
            onEdit={onEdit}
            onReset={onReset}
            hasOverride={hasOverride}
            accent={accent}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}

interface EditableLeafProps {
  value: string | number | boolean;
  path: string[];
  onEdit: (path: string[], value: any) => void;
  onReset: (path: string[]) => void;
  overridden: boolean;
  accent: string;
  placeholder?: string;
}

function EditableLeaf({ value, path, onEdit, onReset, overridden, accent, placeholder }: EditableLeafProps) {
  const [local, setLocal] = useState(String(value));
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);
  const isBool = typeof value === 'boolean';
  const isNum = typeof value === 'number';

  // Keep local in sync when upstream value changes (e.g. reset)
  React.useEffect(() => { setLocal(String(value)); }, [value]);

  // Auto-resize textarea to content
  React.useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 180) + 'px';
  }, [local]);

  const commit = useCallback(() => {
    let parsed: any = local;
    if (isBool) parsed = local === 'true';
    else if (isNum) {
      const n = Number(local);
      parsed = Number.isFinite(n) ? n : 0;
    }
    if (parsed !== value) onEdit(path, parsed);
  }, [local, isBool, isNum, value, path, onEdit]);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '5px 7px',
    borderRadius: '5px',
    background: overridden ? `${accent}0a` : 'rgba(255,255,255,0.02)',
    border: `1px solid ${overridden ? `${accent}40` : 'rgba(255,255,255,0.05)'}`,
    color: CANVAS_COLORS.textPrimary,
    fontFamily: "'Inter', sans-serif",
    fontSize: '9px',
    lineHeight: 1.45,
    outline: 'none',
    resize: 'none' as const,
    transition: 'border-color 0.12s ease, background 0.12s ease',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea
          ref={taRef}
          value={local}
          placeholder={placeholder}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commit();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          rows={1}
          className="nodrag"
          style={baseStyle}
          onFocus={e => { e.currentTarget.style.borderColor = `${accent}60`; }}
        />
      </div>
      {overridden && (
        <button
          onClick={() => onReset(path)}
          className="nodrag"
          title="Reset to original"
          style={{
            padding: '4px 6px', marginTop: '1px', borderRadius: '4px',
            background: 'transparent', border: `1px solid ${accent}25`,
            color: `${accent}bb`, fontSize: '8px', fontWeight: 600,
            cursor: 'pointer', outline: 'none', flexShrink: 0, lineHeight: 1,
          }}
        >
          ↺
        </button>
      )}
    </div>
  );
}
