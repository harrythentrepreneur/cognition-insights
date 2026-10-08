'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { CANVAS_COLORS, HANDLE_STYLE, getNodeStyle, getNodeHeaderStyle } from '../canvasTheme';
import { NodePriority } from './NodePriority';
import { useCanvasData } from '../CanvasDataContext';

// ============================================================================
// CANONICAL ENTITY NODES
//
// Reads from /api/ad-tracker/canonical-entities?kind=<kind>&withMetrics=1
// and displays aggregate performance across every ad linked to one canonical
// entity of that kind. One generic inner component drives five thin wrappers
// (persona, hook, angle, desire, feature_benefit).
// ============================================================================

type CanonicalKind = 'persona' | 'hook' | 'angle' | 'desire' | 'feature_benefit';

interface EntityMetrics {
  ad_count: number
  totals: Record<string, number>
  derived: { roas: number; ctr: number; cpc: number; cpm: number; cpa: number }
  linked_ad_ids: string[]
}

interface CanonicalEntityWithMetrics {
  id: string
  kind: string
  label: string
  payload: Record<string, any>
  link_count: number
  metrics: EntityMetrics
}

interface KindConfig {
  label: string
  icon: string
  accentKey: 'persona' | 'dnaHook' | 'dnaAngle' | 'desire' | 'dnaFormat'
  emptyMessage: string
  detailRows: (payload: Record<string, any>) => Array<{ label: string; value: string }>
}

const KIND_CONFIG: Record<CanonicalKind, KindConfig> = {
  persona: {
    label: 'Canonical Avatar',
    icon: '👤',
    accentKey: 'persona',
    emptyMessage: 'No canonical avatars yet. Run X-Ray + backfill.',
    detailRows: p => [
      { label: 'Age', value: String(p.ageGenderLocation || '') },
      { label: 'Wants', value: String(p.desiredStatus || '') },
      { label: 'Struggles', value: String(p.dailyStruggles || '') },
    ],
  },
  hook: {
    label: 'Canonical Hook',
    icon: '🪝',
    accentKey: 'dnaHook',
    emptyMessage: 'No canonical hooks yet. Extract some ads first.',
    detailRows: p => [
      { label: 'Type', value: String(p.hookType || '') },
      { label: 'Why', value: String(p.explanation || '') },
    ],
  },
  angle: {
    label: 'Canonical Angle',
    icon: '🎯',
    accentKey: 'dnaAngle',
    emptyMessage: 'No canonical angles yet. Extract some ads first.',
    detailRows: p => [
      { label: 'Angle', value: String(p.angle || '') },
      { label: 'True angle', value: String(p.trueAngle || '') },
    ],
  },
  desire: {
    label: 'Canonical Desire',
    icon: '💡',
    accentKey: 'desire',
    emptyMessage: 'No canonical desires yet. Run creative-system extraction.',
    detailRows: p => {
      const secondary = Array.isArray(p.secondaryDesires) ? p.secondaryDesires.join(', ') : '';
      return [
        { label: 'Primary', value: String(p.primaryDesire || '') },
        { label: 'Secondary', value: secondary },
      ];
    },
  },
  feature_benefit: {
    label: 'Canonical Feature/Benefit',
    icon: '✨',
    accentKey: 'dnaFormat',
    emptyMessage: 'No canonical features yet. Run creative-system extraction.',
    detailRows: p => [
      { label: 'Feature', value: String(p.feature || '') },
      { label: 'Benefit', value: String(p.benefit || '') },
      { label: 'USP', value: String(p.coreUSP || '') },
    ],
  },
};

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Math.abs(n) >= 100) return n.toFixed(0);
  return n.toFixed(2);
}

function deriveROAS(metrics: EntityMetrics | undefined): number | null {
  if (!metrics) return null;
  const r = metrics.derived?.roas;
  if (typeof r === 'number' && r > 0) return r;
  return null;
}

function trunc(s: string, max: number) {
  return s && s.length > max ? s.slice(0, max) + '…' : s || '';
}

// ─── Generic node component ─────────────────────────────────────────────────

function CanonicalEntityNodeInner({
  id,
  data,
  selected,
  kind,
}: NodeProps & { kind: CanonicalKind }) {
  const { updateNodeData } = useReactFlow();
  const { creatives } = useCanvasData();
  const config = KIND_CONFIG[kind];
  const accent = CANVAS_COLORS[config.accentKey];

  const [entities, setEntities] = useState<CanonicalEntityWithMetrics[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showLinkedAds, setShowLinkedAds] = useState(false);

  const selectedId = (data?.entityId as string) || '';
  const selectedEntity = useMemo(
    () => entities?.find(e => e.id === selectedId) || null,
    [entities, selectedId]
  );

  // Resolve linked ad ids → vault creatives (for thumbnails + names).
  const linkedCreatives = useMemo(() => {
    if (!selectedEntity) return [];
    const ids = new Set(selectedEntity.metrics.linked_ad_ids || []);
    return creatives.filter(c => ids.has(c.id));
  }, [selectedEntity, creatives]);

  const loadEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ad-tracker/canonical-entities?kind=${kind}&withMetrics=1`);
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setEntities((json?.data || []) as CanonicalEntityWithMetrics[]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const pick = useCallback(
    (e: CanonicalEntityWithMetrics) => {
      updateNodeData(id, {
        entityId: e.id,
        kind,
        label: e.label,
        payload: e.payload,
        metrics: e.metrics,
        linkCount: e.link_count,
      });
      setOpen(false);
    },
    [id, kind, updateNodeData]
  );

  const totals = selectedEntity?.metrics?.totals || {};
  const roas = deriveROAS(selectedEntity?.metrics);
  const detailRows = selectedEntity ? config.detailRows(selectedEntity.payload) : [];

  return (
    <div style={getNodeStyle(accent, !!selected)}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

      <div style={getNodeHeaderStyle(accent)}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: `${accent}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          {config.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 7.5,
              fontWeight: 600,
              color: CANVAS_COLORS.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{config.label}</span>
            {selectedEntity && (
              <span
                style={{
                  padding: '1px 5px',
                  background: `${accent}1a`,
                  color: accent,
                  borderRadius: 8,
                  fontSize: 7.5,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
                title={`${selectedEntity.metrics.ad_count} ads linked to this canonical ${kind}`}
              >
                {selectedEntity.metrics.ad_count} ads
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: accent,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedEntity ? trunc(selectedEntity.label, 28) : 'Pick one…'}
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {selectedEntity && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
              }}
            >
              <Stat label="Ads" value={String(selectedEntity.metrics.ad_count)} />
              <Stat label="Spend" value={'$' + formatNum(totals.spend ?? 0)} />
              <Stat label="Revenue" value={'$' + formatNum(totals.revenue ?? 0)} />
              <Stat label="ROAS" value={roas != null ? roas.toFixed(2) + 'x' : '—'} />
              <Stat label="Impr." value={formatNum(totals.impressions ?? 0)} />
              <Stat label="Clicks" value={formatNum(totals.clicks ?? 0)} />
            </div>
            {detailRows.some(r => r.value) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                {detailRows
                  .filter(r => r.value)
                  .slice(0, 3)
                  .map(r => (
                    <div
                      key={r.label}
                      style={{ fontSize: 8.5, color: CANVAS_COLORS.textDim, lineHeight: 1.3 }}
                    >
                      <span style={{ fontWeight: 600, color: CANVAS_COLORS.textMuted }}>
                        {r.label}:
                      </span>{' '}
                      <span style={{ color: CANVAS_COLORS.textPrimary }}>{trunc(r.value, 60)}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Linked ads disclosure — trust/transparency for the merge */}
            {selectedEntity.metrics.ad_count > 0 && (
              <div style={{ marginTop: 4 }}>
                <button
                  onClick={() => setShowLinkedAds(v => !v)}
                  className="nodrag adlab-btn"
                  style={{
                    width: '100%',
                    padding: '3px 5px',
                    background: 'transparent',
                    color: CANVAS_COLORS.textDim,
                    border: `1px dashed ${accent}22`,
                    borderRadius: 3,
                    fontSize: 8,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {showLinkedAds ? '▾' : '▸'} Linked ads ({selectedEntity.metrics.ad_count})
                </button>
                {showLinkedAds && (
                  <div
                    className="nowheel"
                    style={{
                      marginTop: 4,
                      maxHeight: 140,
                      overflowY: 'auto',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 3,
                      padding: 3,
                      background: 'rgba(255,255,255,0.015)',
                      borderRadius: 3,
                    }}
                  >
                    {linkedCreatives.length === 0 && (
                      <div
                        style={{
                          fontSize: 8,
                          color: CANVAS_COLORS.textDim,
                          padding: 4,
                          width: '100%',
                          textAlign: 'center',
                        }}
                      >
                        {selectedEntity.metrics.linked_ad_ids.length} ads linked, thumbnails unavailable
                      </div>
                    )}
                    {linkedCreatives.map(c => {
                      const src = c.thumbnailUrl || c.imageUrl || c.fullPictureUrl;
                      return (
                        <div
                          key={c.id}
                          title={c.name}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 3,
                            overflow: 'hidden',
                            background: CANVAS_COLORS.nodeBg,
                            border: `1px solid ${accent}22`,
                            flexShrink: 0,
                          }}
                        >
                          {src ? (
                            <img
                              src={src}
                              alt={c.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 8,
                                color: CANVAS_COLORS.textDim,
                              }}
                            >
                              {c.type === 'video' ? '▶' : '◼'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(!open)}
            className="nodrag adlab-btn"
            style={{
              width: '100%',
              padding: '4px 6px',
              background: `${accent}14`,
              color: accent,
              border: `1px solid ${accent}33`,
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading
              ? 'Loading…'
              : selectedEntity
                ? '↻ Change'
                : `+ Pick (${entities?.length ?? 0})`}
          </button>

          {open && (
            <div
              className="nodrag nowheel"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: CANVAS_COLORS.nodeBg,
                border: `1px solid ${accent}33`,
                borderRadius: 4,
                maxHeight: 220,
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              {error && (
                <div style={{ padding: 8, color: '#f87171', fontSize: 9 }}>{error}</div>
              )}
              {!error && !loading && (entities?.length ?? 0) === 0 && (
                <div
                  style={{
                    padding: 10,
                    textAlign: 'center',
                    color: CANVAS_COLORS.textDim,
                    fontSize: 9,
                  }}
                >
                  {config.emptyMessage}
                </div>
              )}
              {entities?.map(e => {
                const r = deriveROAS(e.metrics);
                return (
                  <button
                    key={e.id}
                    onClick={() => pick(e)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      background: e.id === selectedId ? `${accent}10` : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${CANVAS_COLORS.nodeBorder}`,
                      color: CANVAS_COLORS.textPrimary,
                      fontSize: 9,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{trunc(e.label, 32)}</div>
                    <div style={{ color: CANVAS_COLORS.textDim, marginTop: 2 }}>
                      {e.metrics.ad_count} ads · {r != null ? `${r.toFixed(2)}x ROAS` : 'no metrics'}
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
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '3px 5px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 3,
      }}
    >
      <div
        style={{
          fontSize: 7,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: CANVAS_COLORS.textDim,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>{value}</div>
    </div>
  );
}

// ─── Thin wrappers per kind ─────────────────────────────────────────────────

export function CanonicalAvatarNode(props: NodeProps) {
  return <CanonicalEntityNodeInner {...props} kind="persona" />;
}
export function CanonicalHookNode(props: NodeProps) {
  return <CanonicalEntityNodeInner {...props} kind="hook" />;
}
export function CanonicalAngleNode(props: NodeProps) {
  return <CanonicalEntityNodeInner {...props} kind="angle" />;
}
export function CanonicalDesireNode(props: NodeProps) {
  return <CanonicalEntityNodeInner {...props} kind="desire" />;
}
export function CanonicalFeatureBenefitNode(props: NodeProps) {
  return <CanonicalEntityNodeInner {...props} kind="feature_benefit" />;
}
