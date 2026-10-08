'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { CANVAS_COLORS, HANDLE_STYLE, INPUT_STYLE, LABEL_STYLE, getNodeStyle, getNodeHeaderStyle } from '../canvasTheme';
import { useCanvasData, type PersonaProfile, type FeatureBenefit } from '../CanvasDataContext';
import { NodePriority } from './NodePriority';

// ============================================================================
// HELPERS
// ============================================================================

function trunc(s: string, max: number) { return s.length > max ? s.slice(0, max) + '…' : s; }

// ============================================================================
// PERSONA NODE — Select from enriched personas
// ============================================================================

export function PersonaNode({ id, data, selected }: NodeProps) {
  const { allPersonas } = useCanvasData();
  const { updateNodeData } = useReactFlow();
  const [open, setOpen] = useState(false);
  const accent = CANVAS_COLORS.persona;

  const currentAge = (data?.ageGenderLocation as string) || '';
  const currentBeliefs = (data?.beliefs as string) || '';
  const currentDesired = (data?.desiredStatus as string) || '';
  const currentStruggles = (data?.dailyStruggles as string) || '';
  const hasPicked = !!currentAge;

  const handleSelect = useCallback((p: PersonaProfile, idx: number) => {
    updateNodeData(id, {
      personaIndex: idx,
      ageGenderLocation: p.ageGenderLocation,
      beliefs: p.beliefs,
      desiredStatus: p.desiredStatus,
      dailyStruggles: p.dailyStruggles,
      howProductHelps: p.howProductHelps,
    });
    setOpen(false);
  }, [id, updateNodeData]);

  return (
    <div style={getNodeStyle(accent, !!selected)}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <div style={getNodeHeaderStyle(accent)}>
        <NodeIcon icon="👤" color={accent} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7.5px', fontWeight: 600, color: CANVAS_COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Persona</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: accent, letterSpacing: '-0.01em' }}>
            {hasPicked ? trunc(currentAge, 25) : 'Select persona…'}
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {hasPicked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {currentBeliefs && <DetailRow label="Beliefs" value={currentBeliefs} />}
            {currentDesired && <DetailRow label="Wants" value={currentDesired} />}
            {currentStruggles && <DetailRow label="Struggles" value={currentStruggles} />}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen(!open)} className="nodrag adlab-btn" style={selectorBtnStyle(accent)}>
            {hasPicked ? '↻ Change Persona' : `+ Pick Persona (${allPersonas.length})`}
          </button>

          {open && (
            <div className="nodrag nowheel" style={dropdownStyle}>
              {allPersonas.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: CANVAS_COLORS.textDim, fontSize: '9px' }}>
                  Run X-Ray analysis on your ads first
                </div>
              ) : (
                allPersonas.map((p, i) => (
                  <button key={i} onClick={() => handleSelect(p, i)} style={{
                    ...listItemStyle,
                    background: currentAge === p.ageGenderLocation ? `${accent}06` : 'transparent',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = `rgba(255,255,255,0.025)`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = currentAge === p.ageGenderLocation ? `${accent}06` : 'transparent'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9.5px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>{trunc(p.ageGenderLocation, 30)}</div>
                      {p.desiredStatus && <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted, marginTop: '1px' }}>Wants: {trunc(p.desiredStatus, 40)}</div>}
                    </div>
                    {currentAge === p.ageGenderLocation && <span style={{ fontSize: '8px', color: accent }}>✓</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="persona" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// DESIRE NODE — Select from market desires / feature→benefit
// ============================================================================

export function DesireNode({ id, data, selected }: NodeProps) {
  const { allDesires, allFeatures } = useCanvasData();
  const { updateNodeData } = useReactFlow();
  const [open, setOpen] = useState(false);
  const accent = CANVAS_COLORS.desire;

  const currentDesire = (data?.desire as string) || '';
  const currentFeature = (data?.feature as string) || '';
  const currentBenefit = (data?.benefit as string) || '';
  const hasPicked = !!currentDesire;

  const handleSelectDesire = useCallback((d: string) => {
    updateNodeData(id, { desire: d, feature: '', benefit: '', coreUSP: '' });
    setOpen(false);
  }, [id, updateNodeData]);

  const handleSelectFeature = useCallback((fb: FeatureBenefit) => {
    updateNodeData(id, {
      desire: fb.matchingDesire || fb.benefit,
      feature: fb.feature,
      benefit: fb.benefit,
      coreUSP: fb.coreUSP,
    });
    setOpen(false);
  }, [id, updateNodeData]);

  const totalItems = allDesires.length + allFeatures.length;

  return (
    <div style={getNodeStyle(accent, !!selected)}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <div style={getNodeHeaderStyle(accent)}>
        <NodeIcon icon="💡" color={accent} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7.5px', fontWeight: 600, color: CANVAS_COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Desire</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: accent, letterSpacing: '-0.01em' }}>
            {hasPicked ? trunc(currentDesire, 25) : 'Select desire…'}
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {hasPicked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {currentFeature && <DetailRow label="Feature" value={currentFeature} />}
            {currentBenefit && <DetailRow label="Benefit" value={currentBenefit} />}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen(!open)} className="nodrag adlab-btn" style={selectorBtnStyle(accent)}>
            {hasPicked ? '↻ Change' : `+ Pick Desire (${totalItems})`}
          </button>

          {open && (
            <div className="nodrag nowheel" style={dropdownStyle}>
              {totalItems === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: CANVAS_COLORS.textDim, fontSize: '9px' }}>
                  Run X-Ray analysis on your ads first
                </div>
              ) : (
                <>
                  {allDesires.length > 0 && (
                    <>
                      <div style={sectionHeaderStyle}>Market Desires</div>
                      {allDesires.slice(0, 10).map((d, i) => (
                        <button key={`d-${i}`} onClick={() => handleSelectDesire(d)} style={{
                          ...listItemStyle,
                          background: currentDesire === d ? `${accent}06` : 'transparent',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = currentDesire === d ? `${accent}06` : 'transparent'; }}
                        >
                          <span style={{ fontSize: '9px', color: CANVAS_COLORS.textSecondary }}>{trunc(d, 45)}</span>
                          {currentDesire === d && <span style={{ fontSize: '8px', color: accent }}>✓</span>}
                        </button>
                      ))}
                    </>
                  )}
                  {allFeatures.length > 0 && (
                    <>
                      <div style={{ ...sectionHeaderStyle, marginTop: '4px' }}>Features → Benefits</div>
                      {allFeatures.slice(0, 8).map((fb, i) => (
                        <button key={`f-${i}`} onClick={() => handleSelectFeature(fb)} style={{
                          ...listItemStyle,
                          background: currentFeature === fb.feature ? `${accent}06` : 'transparent',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = currentFeature === fb.feature ? `${accent}06` : 'transparent'; }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '9px', fontWeight: 600, color: '#4ECDC4' }}>{trunc(fb.feature, 35)}</div>
                            <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>→ {trunc(fb.benefit, 40)}</div>
                          </div>
                          {currentFeature === fb.feature && <span style={{ fontSize: '8px', color: accent }}>✓</span>}
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="desire" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// CUSTOM PROMPT NODE — Free-text user instructions
// ============================================================================

export function CustomPromptNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const [prompt, setPrompt] = useState('');
  const accent = CANVAS_COLORS.customPrompt;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    updateNodeData(id, { prompt: e.target.value });
  }, [id, updateNodeData]);

  return (
    <div style={getNodeStyle(accent, !!selected)}>
      <NodePriority nodeId={id} priority={data?.priority as number} accentColor={accent} />
      <Handle type="target" position={Position.Left} id="prompt-in" style={HANDLE_STYLE} />
      <div style={getNodeHeaderStyle(accent)}>
        <NodeIcon icon="✏️" color={accent} />
        <div>
          <div style={{ fontSize: '7.5px', fontWeight: 600, color: CANVAS_COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Custom Prompt</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: accent, letterSpacing: '-0.01em' }}>
            {prompt ? `${prompt.split(/\s+/).length} words` : 'Add instructions…'}
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 10px 8px' }}>
        <textarea
          placeholder="e.g. Make it funny and relatable, focus on time-saving benefits, use casual Gen-Z language..."
          value={prompt}
          onChange={handleChange}
          className="nodrag"
          rows={3}
          style={{
            ...INPUT_STYLE,
            resize: 'none' as const,
            lineHeight: 1.5,
            fontSize: '9.5px',
            minHeight: '52px',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = `${accent}25`; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
        />
      </div>
      <Handle type="source" position={Position.Right} id="prompt-out" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// SHARED PRIMITIVES
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted, lineHeight: 1.4 }}>
      <span style={{ color: CANVAS_COLORS.textDim, fontWeight: 600 }}>{label}: </span>
      {trunc(value, 50)}
    </div>
  );
}

function selectorBtnStyle(color: string): React.CSSProperties {
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
  background: 'rgba(8,8,18,0.98)', border: '1px solid rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  padding: '5px', maxHeight: '260px', overflowY: 'auto',
};

const listItemStyle: React.CSSProperties = {
  width: '100%', padding: '5px 6px', borderRadius: '5px', border: 'none',
  cursor: 'pointer', outline: 'none', textAlign: 'left',
  display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.1s ease',
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: '4px 6px 3px', fontSize: '7.5px', fontWeight: 600,
  color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.08em',
  borderBottom: '1px solid rgba(255,255,255,0.03)', marginBottom: '2px',
};
