'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { CANVAS_COLORS, HANDLE_STYLE, getNodeStyle, getNodeHeaderStyle } from '../canvasTheme';
import { useCanvasData, type DnaGroupMetrics } from '../CanvasDataContext';
import { NodePriority } from './NodePriority';

// ============================================================================
// COLOR MAPS
// ============================================================================

const HOOK_COLORS: Record<string, string> = {
  curiosity: '#4ECDC4', pain_point: '#FF6B6B', bold_claim: '#F59E0B',
  social_proof: '#A855F7', pattern_interrupt: '#06D6A0',
};
const ANGLE_COLORS: Record<string, string> = {
  transformation: '#00F5D4', fear: '#EF4444', authority: '#8B5CF6',
  comparison: '#F472B6', urgency: '#FB8500', education: '#3B82F6',
};
const FORMAT_COLORS: Record<string, string> = {
  ugc: '#45B7D1', talking_head: '#FFD700', screen_recording: '#818CF8',
  broll_montage: '#34D399', meme: '#FE2C55',
};

function fmt(val: string) { return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// ============================================================================
// GENERIC DNA TAG NODE — Ultra-clean
// ============================================================================

interface DnaCfg {
  icon: string; title: string; dataKey: 'hookType' | 'angle' | 'format';
  colorMap: Record<string, string>; accent: string;
}

function DnaNodeInner({ nodeId, data, selected, cfg }: {
  nodeId: string; data: Record<string, unknown>; selected: boolean; cfg: DnaCfg;
}) {
  const { hookGroups, angleGroups, formatGroups } = useCanvasData();
  const { updateNodeData } = useReactFlow();
  const [open, setOpen] = useState(false);

  const groups: DnaGroupMetrics[] = useMemo(() => {
    if (cfg.dataKey === 'hookType') return hookGroups;
    if (cfg.dataKey === 'angle') return angleGroups;
    return formatGroups;
  }, [cfg.dataKey, hookGroups, angleGroups, formatGroups]);

  const options = useMemo(() => {
    const keys = new Set([...Object.keys(cfg.colorMap), ...groups.map(g => g.key)]);
    return Array.from(keys).map(key => {
      const g = groups.find(x => x.key === key);
      return { key, avgRoas: g?.avgRoas || 0, count: g?.count || 0, status: g?.status || 'good' as const };
    }).sort((a, b) => b.avgRoas - a.avgRoas);
  }, [cfg.colorMap, groups]);

  const val = (data?.[cfg.dataKey] as string) || options[0]?.key || '';
  const cur = options.find(o => o.key === val);
  const color = cfg.colorMap[val] || cfg.accent;
  const roasColor = (cur?.avgRoas || 0) >= 2 ? CANVAS_COLORS.statusTop : (cur?.avgRoas || 0) >= 1 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue;

  const select = useCallback((key: string) => {
    const g = options.find(o => o.key === key);
    updateNodeData(nodeId, { [cfg.dataKey]: key, avgRoas: g?.avgRoas || 0, count: g?.count || 0, status: g?.status || 'good' });
    setOpen(false);
  }, [nodeId, cfg.dataKey, options, updateNodeData]);

  return (
    <div style={getNodeStyle(color, selected)}>
      <NodePriority nodeId={nodeId} priority={data?.priority as number} accentColor={color} />
      <div style={getNodeHeaderStyle(color)}>
        <span style={{
          width: '22px', height: '22px', borderRadius: '6px',
          background: `${color}06`, border: `1px solid ${color}0c`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0,
        }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7.5px', fontWeight: 600, color: CANVAS_COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.title}</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color, letterSpacing: '-0.01em' }}>{fmt(val)}</div>
        </div>
      </div>

      <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Metric row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: roasColor, fontFamily: "'SF Mono', monospace", letterSpacing: '-0.02em' }}>
              {(cur?.avgRoas || 0).toFixed(1)}x
            </span>
            <span style={{ fontSize: '7px', color: CANVAS_COLORS.textDim, fontFamily: "'SF Mono', monospace" }}>ROAS</span>
          </div>
          <span style={{ fontSize: '8px', color: CANVAS_COLORS.textDim, fontFamily: "'SF Mono', monospace" }}>{cur?.count || 0} ads</span>
        </div>

        {/* Selector */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen(!open)} className="nodrag adlab-btn" style={{
            '--btn-border': 'rgba(255,255,255,0.1)',
            '--btn-bg': 'rgba(255,255,255,0.02)',
            '--btn-text': CANVAS_COLORS.textSecondary,
            '--btn-border-hover': 'rgba(255,255,255,0.2)',
            '--btn-bg-hover': 'rgba(255,255,255,0.04)',
            justifyContent: 'space-between',
            fontWeight: 500, fontSize: '9px',
          } as React.CSSProperties}>
            <span>Change</span>
            <span style={{ fontSize: '7px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', color: 'rgba(255,255,255,0.4)' }}>▼</span>
          </button>

          {open && (
            <div className="nodrag nowheel" style={{
              position: 'absolute', top: 'calc(100% + 2px)', left: '-4px', right: '-4px',
              zIndex: 200, borderRadius: '8px', background: '#18182a',
              border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)', padding: '3px', maxHeight: '180px', overflowY: 'auto',
            }}>
              {options.map(o => {
                const oc = cfg.colorMap[o.key] || cfg.accent;
                const isSel = o.key === val;
                const rc = o.avgRoas >= 2 ? CANVAS_COLORS.statusTop : o.avgRoas >= 1 ? CANVAS_COLORS.statusTrending : CANVAS_COLORS.statusFatigue;
                return (
                  <button key={o.key} onClick={() => select(o.key)} style={{
                    width: '100%', padding: '4px 6px', borderRadius: '5px', border: 'none',
                    background: isSel ? `${oc}06` : 'transparent', cursor: 'pointer', outline: 'none',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'background 0.08s ease',
                  }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? `${oc}06` : 'transparent'; }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: oc, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '9px', fontWeight: isSel ? 600 : 400, color: isSel ? oc : CANVAS_COLORS.textSecondary }}>{fmt(o.key)}</span>
                    {o.avgRoas > 0 && <span style={{ fontSize: '7.5px', fontWeight: 700, fontFamily: "'SF Mono', monospace", color: rc }}>{o.avgRoas.toFixed(1)}x</span>}
                    <span style={{ fontSize: '7.5px', color: CANVAS_COLORS.textDim }}>{o.count || '—'}</span>
                    {isSel && <span style={{ fontSize: '7px', color: oc }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} id={cfg.dataKey} style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export function HookNode({ id, data, selected }: NodeProps) {
  return <DnaNodeInner nodeId={id} data={data as Record<string, unknown>} selected={!!selected}
    cfg={{ icon: '🪝', title: 'Hook', dataKey: 'hookType', colorMap: HOOK_COLORS, accent: CANVAS_COLORS.dnaHook }} />;
}

export function AngleNode({ id, data, selected }: NodeProps) {
  return <DnaNodeInner nodeId={id} data={data as Record<string, unknown>} selected={!!selected}
    cfg={{ icon: '🎯', title: 'Angle', dataKey: 'angle', colorMap: ANGLE_COLORS, accent: CANVAS_COLORS.dnaAngle }} />;
}

export function FormatNode({ id, data, selected }: NodeProps) {
  return <DnaNodeInner nodeId={id} data={data as Record<string, unknown>} selected={!!selected}
    cfg={{ icon: '🎬', title: 'Format', dataKey: 'format', colorMap: FORMAT_COLORS, accent: CANVAS_COLORS.dnaFormat }} />;
}
