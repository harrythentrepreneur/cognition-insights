'use client';

import React, { useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { CANVAS_COLORS, HANDLE_STYLE, getNodeStyle, getNodeHeaderStyle } from '../canvasTheme';
import { executeExtraction } from '../canvasExecutor';
import type { SkeletonSlot } from '../canvasTypes';
import { NodePriority } from './NodePriority';

// ============================================================================
// SKELETON EXTRACTOR NODE — Ultra-clean
// ============================================================================

const SLOT_COLORS: Record<string, string> = {
  hook: '#4ECDC4', angle: '#F59E0B', body: '#A855F7', cta: '#FF6B6B',
};

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ExtractorNode({ id, data, selected }: NodeProps) {
  const [status, setStatus] = useState<'idle' | 'extracting' | 'done' | 'error'>(
    (data?.status as 'idle' | 'extracting' | 'done' | 'error') || 'idle'
  );
  const [skeleton, setSkeleton] = useState<SkeletonSlot[]>((data?.skeleton as SkeletonSlot[]) || []);
  const [error, setError] = useState('');
  const { updateNodeData, getEdges, getNodes } = useReactFlow();
  const accent = CANVAS_COLORS.extractor;

  const handleExtract = useCallback(async () => {
    const edges = getEdges();
    const nodes = getNodes();
    const inEdge = edges.find(e => e.target === id);
    if (!inEdge) { setError('Connect a source node first'); setStatus('error'); return; }
    const src = nodes.find(n => n.id === inEdge.source);
    if (!src) return;

    let url = '';
    let type: 'video' | 'image' = 'video';
    if (src.type === 'urlNode') url = (src.data as Record<string, unknown>)?.url as string || '';
    else if (src.type === 'vaultCreativeNode') {
      const d = src.data as Record<string, unknown>;
      url = (d?.thumbnailUrl as string) || '';
      type = (d?.type as string) === 'image' ? 'image' : 'video';
    }
    if (!url) { setError('Source has no URL'); setStatus('error'); return; }

    setStatus('extracting'); setError('');
    try {
      const result = await executeExtraction(url, type);
      const slots: SkeletonSlot[] = result.skeleton.map(s => ({
        id: s.id, startSec: s.startSec, endSec: s.endSec,
        slotType: s.slotType as SkeletonSlot['slotType'], label: s.label,
      }));
      setSkeleton(slots);
      setStatus('done');
      updateNodeData(id, { status: 'done', skeleton: slots });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
      setStatus('error');
    }
  }, [id, getEdges, getNodes, updateNodeData]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), minWidth: '220px' }}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <Handle type="target" position={Position.Left} id="source-in" style={HANDLE_STYLE} />

      <div style={getNodeHeaderStyle(accent)}>
        <span style={{
          width: '22px', height: '22px', borderRadius: '6px',
          background: `${accent}06`, border: `1px solid ${accent}0c`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
        }}>🔬</span>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Skeleton Extractor</div>
          <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>
            {status === 'done' ? `${skeleton.length} segments` : 'Wire a source'}
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 10px 8px' }}>
        {status === 'idle' && (
          <button onClick={handleExtract} className="nodrag adlab-action-btn" style={{
            '--act-bg': `${accent}04`,
            '--act-border': `${accent}10`,
            '--act-text': `${accent}bb`,
            '--act-bg-hover': `${accent}08`,
          } as React.CSSProperties}>Extract Skeleton</button>
        )}

        {status === 'extracting' && (
          <div style={{ textAlign: 'center', padding: '6px', color: CANVAS_COLORS.textMuted, fontSize: '9px' }}>
            <div style={{
              width: '14px', height: '14px', margin: '0 auto 4px',
              border: `1.5px solid ${accent}15`, borderTopColor: `${accent}bb`,
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            Analyzing...
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ padding: '4px 6px', borderRadius: '5px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)', color: '#EF4444', fontSize: '8px' }}>
              {error}
            </div>
            <button onClick={handleExtract} className="nodrag" style={{
              padding: '3px', borderRadius: '5px', border: `1px solid ${accent}10`,
              background: 'transparent', color: `${accent}bb`, fontSize: '8px',
              cursor: 'pointer', outline: 'none',
            }}>↻ Retry</button>
          </div>
        )}

        {status === 'done' && skeleton.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {/* Timeline bar */}
            <div style={{ height: '3px', borderRadius: '1.5px', overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.015)' }}>
              {skeleton.map(slot => {
                const total = skeleton[skeleton.length - 1].endSec;
                const pct = ((slot.endSec - slot.startSec) / total) * 100;
                return <div key={slot.id} style={{ width: `${pct}%`, height: '100%', background: `${SLOT_COLORS[slot.slotType] || '#6B7280'}40` }} />;
              })}
            </div>
            {skeleton.map(slot => {
              const c = SLOT_COLORS[slot.slotType] || '#6B7280';
              return (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 4px', borderRadius: '4px', background: `${c}03` }}>
                  <span style={{ fontSize: '7.5px', fontFamily: "'SF Mono', monospace", color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fmtTime(slot.startSec)}–{fmtTime(slot.endSec)}
                  </span>
                  <span style={{ fontSize: '8px', color: CANVAS_COLORS.textSecondary, flex: 1 }}>{slot.label}</span>
                  <span style={{ fontSize: '6.5px', fontWeight: 700, color: `${c}99`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{slot.slotType}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="skeleton-out" style={HANDLE_STYLE} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
