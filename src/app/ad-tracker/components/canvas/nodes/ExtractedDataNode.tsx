'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { CANVAS_COLORS, HANDLE_STYLE, INPUT_STYLE, getNodeStyle, getNodeHeaderStyle } from '../canvasTheme';
import { NodePriority } from './NodePriority';
import { useCanvasData, type ExtractedEnumCategory, type ExtractedTextCategory, type DnaGroupSource } from '../CanvasDataContext';
import {
  Magnet, Target, Clapperboard, Zap, Brain, Megaphone, Clapperboard as ClapperboardIcon,
  Video, LayoutTemplate, Compass, Flame, User, Users, MessageSquare, FileText,
  Frown, Sparkles, Type as TypeIcon, Fish, Mic, Package, Award, Timer, ScrollText,
  Newspaper, AlignLeft, MousePointerClick, Star, ListTree,
} from 'lucide-react';

// ============================================================================
// CATEGORY META — lucide icon component + accent + human label
// ============================================================================

// Shared icon renderer with consistent stroke + size so every datapoint row
// matches the Creative/URL/Brand visual treatment.
const iconProps = { size: 16, strokeWidth: 1.5 } as const;
const mk = (Icon: React.ComponentType<any>) => <Icon {...iconProps} />;

export const EXTRACTED_CATEGORY_META: Record<string, { icon: React.ReactNode; label: string; accent: string; kind: 'enum' | 'text' }> = {
  // Enums
  hookType:             { icon: mk(Magnet),           label: 'Hook Type',            accent: '#4ECDC4', kind: 'enum' },
  angle:                { icon: mk(Target),           label: 'Angle',                accent: '#F59E0B', kind: 'enum' },
  format:               { icon: mk(Clapperboard),     label: 'Format',               accent: '#45B7D1', kind: 'enum' },
  visualPacing:         { icon: mk(Zap),              label: 'Visual Pacing',        accent: '#FB923C', kind: 'enum' },
  awarenessLevel:       { icon: mk(Brain),            label: 'Awareness Level',      accent: '#A855F7', kind: 'enum' },
  ctaType:              { icon: mk(Megaphone),        label: 'CTA Type',             accent: '#06D6A0', kind: 'enum' },
  productionTier:       { icon: mk(Star),             label: 'Production Tier',      accent: '#FFD700', kind: 'enum' },
  videoType:            { icon: mk(Video),            label: 'Video Type',           accent: '#818CF8', kind: 'enum' },
  copywritingFramework: { icon: mk(LayoutTemplate),   label: 'Copy Framework',       accent: '#F472B6', kind: 'enum' },
  // Texts
  trueAngle:            { icon: mk(Compass),          label: 'True Angle',           accent: '#8B5CF6', kind: 'text' },
  emotionalDriver:      { icon: mk(Flame),            label: 'Emotional Driver',     accent: '#EF4444', kind: 'text' },
  personaArchetype:     { icon: mk(User),             label: 'Persona Archetype',    accent: '#E879F9', kind: 'text' },
  personaDescription:   { icon: mk(Users),            label: 'Persona Description',  accent: '#E879F9', kind: 'text' },
  hookExplanation:      { icon: mk(MessageSquare),    label: 'Hook Explanation',     accent: '#4ECDC4', kind: 'text' },
  angleExplanation:     { icon: mk(MessageSquare),    label: 'Angle Explanation',    accent: '#F59E0B', kind: 'text' },
  formatExplanation:    { icon: mk(MessageSquare),    label: 'Format Explanation',   accent: '#45B7D1', kind: 'text' },
  adStructure:          { icon: mk(ListTree),         label: 'Ad Structure',         accent: '#45B7D1', kind: 'text' },
  summary:              { icon: mk(ScrollText),       label: 'Summary',              accent: '#9CA3AF', kind: 'text' },
  painPoints:           { icon: mk(Frown),            label: 'Pain Points',          accent: '#FF6B6B', kind: 'text' },
  desiredOutcome:       { icon: mk(Sparkles),         label: 'Desired Outcome',      accent: '#00F5D4', kind: 'text' },
  hookText:             { icon: mk(TypeIcon),         label: 'Hook Text',            accent: '#4ECDC4', kind: 'text' },
  headlineCopy:         { icon: mk(Newspaper),        label: 'Headline',             accent: '#38BDF8', kind: 'text' },
  bodyCopy:             { icon: mk(AlignLeft),        label: 'Body Copy',            accent: '#38BDF8', kind: 'text' },
  ctaCopy:              { icon: mk(MousePointerClick),label: 'CTA Copy',             accent: '#06D6A0', kind: 'text' },
  spokenHook:           { icon: mk(Mic),              label: 'Spoken Hook',          accent: '#4ECDC4', kind: 'text' },
  productShown:         { icon: mk(Package),          label: 'Product Shown',        accent: '#FB923C', kind: 'text' },
  proofElements:        { icon: mk(Award),            label: 'Proof Elements',       accent: '#FFD700', kind: 'text' },
  urgency:              { icon: mk(Timer),            label: 'Urgency',              accent: '#EF4444', kind: 'text' },
};

function fmt(val: string) { return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// ============================================================================
// EXTRACTED DATA NODE — simple editable text field
// ============================================================================

function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n) + '…' : s; }

// ============================================================================
// SOURCE TOOLTIP — shows which ads make up a DNA group.
// Portaled to <body> with position: fixed so it escapes the picker's
// overflow-clip container and can dock beside any hovered row.
// ============================================================================

function SourceTooltip({ sources, accent, anchor }: { sources: DnaGroupSource[]; accent: string; anchor: DOMRect | null }) {
  if (typeof document === 'undefined' || !anchor) return null;

  // Prefer docking to the right of the anchor; flip to the left if the
  // tooltip would overflow the viewport.
  const TOOLTIP_W = 220;
  const GAP = 8;
  const wouldOverflowRight = anchor.right + GAP + TOOLTIP_W > window.innerWidth;
  const left = wouldOverflowRight ? Math.max(8, anchor.left - GAP - TOOLTIP_W) : anchor.right + GAP;
  const top = Math.max(8, Math.min(window.innerHeight - 20, anchor.top));

  const node = (
    <div
      className="nodrag nowheel"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        width: `${TOOLTIP_W}px`,
        maxHeight: '260px',
        overflowY: 'auto',
        borderRadius: '8px',
        background: 'rgba(12,12,22,0.96)',
        border: `1px solid ${accent}30`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        padding: '6px',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        fontSize: '7.5px', fontWeight: 600, color: CANVAS_COLORS.textDim,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '2px 4px 4px',
      }}>
        {sources.length} ad{sources.length === 1 ? '' : 's'} in group
      </div>
      {sources.map(s => {
        const cc = s.cpa > 0
          ? (s.cpa <= 40 ? CANVAS_COLORS.statusTop : s.cpa <= 80 ? CANVAS_COLORS.statusGood : s.cpa <= 150 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue)
          : CANVAS_COLORS.textDim;
        return (
          <div
            key={s.creativeId}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px', borderRadius: '6px',
              marginBottom: '2px',
            }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '4px', flexShrink: 0,
              background: 'rgba(255,255,255,0.04)',
              backgroundImage: s.thumbnailUrl ? `url(${s.thumbnailUrl})` : undefined,
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '9px', color: CANVAS_COLORS.textPrimary,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontWeight: 500,
              }}>{s.creativeName}</div>
              <div style={{
                fontSize: '8px', color: CANVAS_COLORS.textDim,
                fontFamily: "'SF Mono', monospace",
                display: 'flex', gap: '6px', marginTop: '1px',
              }}>
                <span style={{ color: cc, fontWeight: 700 }}>{s.cpa > 0 ? `$${Math.round(s.cpa)}` : '—'}</span>
                <span>{s.conversions} conv.</span>
                <span>${Math.round(s.spend)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return createPortal(node, document.body);
}

export function ExtractedDataNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const { extracted } = useCanvasData();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

  const category = (data?.category as string) || '';
  const meta = EXTRACTED_CATEGORY_META[category] || { icon: null as React.ReactNode, label: category || 'Data', accent: '#A855F7', kind: 'text' as const };
  const accent = (data?.accentColor as string) || meta.accent;

  // For enums, default to formatted label; for text, raw value
  const initialValue = (() => {
    const raw = (data?.value as string) || '';
    if (!raw) return '';
    return meta.kind === 'enum' ? fmt(raw) : raw;
  })();

  const [text, setText] = useState(initialValue);

  // Sync local state when upstream data changes (e.g. first render after drop)
  useEffect(() => {
    const raw = (data?.value as string) || '';
    const display = raw ? (meta.kind === 'enum' ? fmt(raw) : raw) : '';
    if (display !== text) setText(display);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    updateNodeData(id, { value: v });
  }, [id, updateNodeData]);

  const isMultiline = meta.kind === 'text';

  // Build the list of extracted options for this category
  const enumOptions = useMemo(
    () => (meta.kind === 'enum' ? extracted.enums[category as ExtractedEnumCategory] || [] : []),
    [meta.kind, category, extracted],
  );
  const textOptions = useMemo(
    () => (meta.kind === 'text' ? extracted.texts[category as ExtractedTextCategory] || [] : []),
    [meta.kind, category, extracted],
  );
  const optionCount = meta.kind === 'enum' ? enumOptions.length : textOptions.length;

  const pickEnum = useCallback((key: string, avgRoas: number, count: number) => {
    setText(fmt(key));
    updateNodeData(id, { value: key, avgRoas, count });
    setPickerOpen(false);
  }, [id, updateNodeData]);

  const pickText = useCallback((v: { value: string; avgRoas: number; creativeId: string; creativeName: string; explanation?: string }) => {
    setText(v.value);
    updateNodeData(id, {
      value: v.value,
      avgRoas: v.avgRoas,
      creativeId: v.creativeId,
      creativeName: v.creativeName,
      explanation: v.explanation || '',
    });
    setPickerOpen(false);
  }, [id, updateNodeData]);

  return (
    <div style={getNodeStyle(accent, !!selected)}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <div style={getNodeHeaderStyle(accent)}>
        <span style={{
          width: '22px', height: '22px', borderRadius: '6px',
          background: `${accent}06`, border: `1px solid ${accent}0c`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, flexShrink: 0,
        }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '7.5px', fontWeight: 600, color: CANVAS_COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Input</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: accent, letterSpacing: '-0.01em' }}>{meta.label}</div>
        </div>
      </div>

      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {text ? (
          // Picked state — show editable text box with a small "Change" button
          <>
            <textarea
              value={text}
              onChange={handleChange}
              placeholder={`Enter ${meta.label.toLowerCase()}…`}
              className="nodrag"
              rows={isMultiline ? 3 : 1}
              style={{
                ...INPUT_STYLE,
                resize: 'none' as const,
                lineHeight: 1.5,
                fontSize: '10.5px',
                minHeight: isMultiline ? '52px' : '26px',
                color: CANVAS_COLORS.textPrimary,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = `${accent}30`; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
            />
            {optionCount > 0 && (
              <button
                onClick={() => setPickerOpen(o => !o)}
                className="nodrag"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none',
                  padding: '2px 4px', textAlign: 'left',
                  fontSize: '8.5px', color: CANVAS_COLORS.textDim,
                  fontFamily: "'Inter', sans-serif",
                  alignSelf: 'flex-start',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = accent; }}
                onMouseLeave={e => { e.currentTarget.style.color = CANVAS_COLORS.textDim; }}
              >
                {pickerOpen ? '▴ Hide options' : `↻ Change (${optionCount} extracted)`}
              </button>
            )}
          </>
        ) : (
          // Unpicked state — show inline picker list or empty hint
          optionCount === 0 && (
            <div style={{
              fontSize: '9px', color: CANVAS_COLORS.textDim, textAlign: 'center',
              padding: '8px 6px', lineHeight: 1.5,
            }}>
              No extracted {meta.label.toLowerCase()} yet.<br/>
              Run X-Ray on your ads first.
            </div>
          )
        )}

        {/* Inline picker — shown automatically when empty+data, or on demand after picked */}
        {optionCount > 0 && (pickerOpen || !text) && (
          <div className="nodrag nowheel" style={{
            borderRadius: '8px',
            background: 'rgba(8,8,18,0.6)',
            border: '1px solid rgba(255,255,255,0.04)',
            padding: '4px',
            maxHeight: '220px',
            overflowY: 'auto',
          }}>
            {meta.kind === 'enum' ? (
              enumOptions.map(o => {
                const isSel = o.key === (data?.value as string);
                const cpa = o.avgCpa || 0;
                const cc = cpa > 0
                  ? (cpa <= 40 ? CANVAS_COLORS.statusTop : cpa <= 80 ? CANVAS_COLORS.statusGood : cpa <= 150 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue)
                  : CANVAS_COLORS.textDim;
                const sources = o.sources || [];
                const isHovered = hoveredKey === o.key;
                return (
                  <div
                    key={o.key}
                    style={{ position: 'relative' }}
                    onMouseEnter={e => {
                      setHoveredKey(o.key);
                      setHoveredRect((e.currentTarget as HTMLDivElement).getBoundingClientRect());
                    }}
                    onMouseMove={e => {
                      if (hoveredKey === o.key) {
                        setHoveredRect((e.currentTarget as HTMLDivElement).getBoundingClientRect());
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredKey(prev => (prev === o.key ? null : prev));
                      setHoveredRect(null);
                    }}
                  >
                    <button
                      onClick={() => pickEnum(o.key, o.avgRoas, o.count)}
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: '6px', border: 'none',
                        background: isSel ? `${accent}10` : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                        cursor: 'pointer', outline: 'none',
                        textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'background 0.1s ease', marginBottom: '1px',
                      }}
                    >
                      <span style={{ flex: 1, fontSize: '10px', fontWeight: isSel ? 600 : 500, color: isSel ? accent : CANVAS_COLORS.textSecondary }}>{fmt(o.key)}</span>
                      <span style={{ fontSize: '8.5px', fontWeight: 700, fontFamily: "'SF Mono', monospace", color: cc }}>{cpa > 0 ? `$${Math.round(cpa)}` : '—'}</span>
                      <span style={{ fontSize: '8px', color: CANVAS_COLORS.textDim, fontFamily: "'SF Mono', monospace" }}>{o.totalConversions || '—'}</span>
                      {isSel && <span style={{ fontSize: '8px', color: accent }}>✓</span>}
                    </button>
                    {isHovered && sources.length > 0 && (
                      <SourceTooltip sources={sources} accent={accent} anchor={hoveredRect} />
                    )}
                  </div>
                );
              })
            ) : (
              textOptions.map((o, i) => {
                const isSel = o.value === (data?.value as string) && o.creativeId === (data?.creativeId as string);
                const cpa = o.avgCpa || 0;
                const cc = cpa > 0
                  ? (cpa <= 40 ? CANVAS_COLORS.statusTop : cpa <= 80 ? CANVAS_COLORS.statusGood : cpa <= 150 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue)
                  : CANVAS_COLORS.textDim;
                return (
                  <button
                    key={`${o.creativeId}-${i}`}
                    onClick={() => pickText(o)}
                    style={{
                      width: '100%', padding: '7px 8px', borderRadius: '6px', border: 'none',
                      background: isSel ? `${accent}10` : 'transparent', cursor: 'pointer', outline: 'none',
                      textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px',
                      transition: 'background 0.1s ease', marginBottom: '2px',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? `${accent}10` : 'transparent'; }}
                  >
                    <div style={{ fontSize: '9.5px', color: isSel ? accent : CANVAS_COLORS.textPrimary, lineHeight: 1.45, fontWeight: isSel ? 600 : 400 }}>
                      {trunc(o.value, 90)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', color: CANVAS_COLORS.textDim, fontFamily: "'SF Mono', monospace" }}>
                      <span>{trunc(o.creativeName, 24)}</span>
                      <span style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ color: cc, fontWeight: 700 }}>{cpa > 0 ? `$${Math.round(cpa)}` : '—'}</span>
                        {o.conversions > 0 && <span>{o.conversions} conv.</span>}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="data-out" style={HANDLE_STYLE} />
    </div>
  );
}
