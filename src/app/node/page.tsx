'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import './node-canvas.css';

// ============================================================================
// TYPES
// ============================================================================

interface Port {
  id: string;
  type: 'input' | 'output';
  dataType: 'text' | 'creative' | 'dna' | 'brief' | 'metrics' | 'any';
  label: string;
}

interface FlowNode {
  id: string;
  type: string;
  x: number;
  y: number;
  data: Record<string, unknown>;
  ports: Port[];
}

interface Wire {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

// ============================================================================
// NODE TYPE DEFINITIONS
// ============================================================================

interface NodeTypeDef {
  type: string;
  icon: string;
  label: string;
  description: string;
  category: 'source' | 'transform' | 'generate' | 'output';
  color: string;
  ports: Port[];
  defaultData: Record<string, unknown>;
}

const NODE_TYPES: NodeTypeDef[] = [
  {
    type: 'text_input', icon: '📝', label: 'Text Prompt', description: 'Raw text input',
    category: 'source', color: '#4ECDC4',
    ports: [{ id: 'out', type: 'output', dataType: 'text', label: 'Text' }],
    defaultData: { text: '' },
  },
  {
    type: 'dna_filter', icon: '🧬', label: 'DNA Filter', description: 'Filter by creative DNA',
    category: 'source', color: '#A855F7',
    ports: [{ id: 'out', type: 'output', dataType: 'dna', label: 'DNA Tags' }],
    defaultData: { hookType: 'curiosity', angle: 'transformation', format: 'ugc' },
  },
  {
    type: 'top_performers', icon: '📊', label: 'Top Performers', description: 'Best ROAS creatives',
    category: 'source', color: '#06D6A0',
    ports: [{ id: 'out', type: 'output', dataType: 'metrics', label: 'Performance Data' }],
    defaultData: { minRoas: 2, sortBy: 'roas' },
  },
  {
    type: 'asset_picker', icon: '🖼️', label: 'Asset Picker', description: 'Select creative assets',
    category: 'source', color: '#FF6B6B',
    ports: [{ id: 'out', type: 'output', dataType: 'creative', label: 'Assets' }],
    defaultData: { assetType: 'all' },
  },
  {
    type: 'hook_selector', icon: '🪝', label: 'Hook Selector', description: 'Choose hook strategy',
    category: 'transform', color: '#4ECDC4',
    ports: [
      { id: 'in', type: 'input', dataType: 'dna', label: 'DNA Input' },
      { id: 'out', type: 'output', dataType: 'text', label: 'Hook' },
    ],
    defaultData: { hookType: 'curiosity' },
  },
  {
    type: 'framework', icon: '⚡', label: 'Framework', description: 'Ad structure template',
    category: 'transform', color: '#F59E0B',
    ports: [
      { id: 'in_hook', type: 'input', dataType: 'text', label: 'Hook' },
      { id: 'in_angle', type: 'input', dataType: 'text', label: 'Angle' },
      { id: 'out', type: 'output', dataType: 'brief', label: 'Framework' },
    ],
    defaultData: { framework: 'fast-vsl' },
  },
  {
    type: 'ai_strategist', icon: '🧪', label: 'AI Strategist', description: 'AI-powered strategy',
    category: 'transform', color: '#A855F7',
    ports: [
      { id: 'in', type: 'input', dataType: 'metrics', label: 'Performance' },
      { id: 'out', type: 'output', dataType: 'brief', label: 'Strategy' },
    ],
    defaultData: { model: 'gemini-pro' },
  },
  {
    type: 'brief_generator', icon: '📋', label: 'Brief Generator', description: 'Generate creative brief',
    category: 'generate', color: '#06D6A0',
    ports: [
      { id: 'in_framework', type: 'input', dataType: 'brief', label: 'Framework' },
      { id: 'in_text', type: 'input', dataType: 'text', label: 'Instructions' },
      { id: 'out', type: 'output', dataType: 'brief', label: 'Brief' },
    ],
    defaultData: { status: 'ready', aspectRatio: '9:16' },
  },
  {
    type: 'variation', icon: '🔀', label: 'Variation Maker', description: 'Create brief variations',
    category: 'generate', color: '#F472B6',
    ports: [
      { id: 'in', type: 'input', dataType: 'brief', label: 'Original Brief' },
      { id: 'out_a', type: 'output', dataType: 'brief', label: 'Variant A' },
      { id: 'out_b', type: 'output', dataType: 'brief', label: 'Variant B' },
    ],
    defaultData: { variations: 2 },
  },
  {
    type: 'export', icon: '📤', label: 'Export', description: 'Export briefs & assets',
    category: 'output', color: '#4ECDC4',
    ports: [{ id: 'in', type: 'input', dataType: 'any', label: 'Input' }],
    defaultData: { format: 'csv' },
  },
];

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  source: { label: 'Sources', color: '#4ECDC4' },
  transform: { label: 'Transform', color: '#F59E0B' },
  generate: { label: 'Generate', color: '#06D6A0' },
  output: { label: 'Output', color: '#A855F7' },
};

const PORT_COLORS: Record<string, string> = {
  text: '#4ECDC4',
  creative: '#A855F7',
  dna: '#F59E0B',
  brief: '#06D6A0',
  metrics: '#FF6B6B',
  any: '#8B8B8B',
};

// ============================================================================
// DEMO FLOW (pre-populated so it looks stunning on load)
// ============================================================================

const DEMO_NODES: FlowNode[] = [
  {
    id: 'n1', type: 'text_input', x: 80, y: 120,
    data: { text: 'A pair of Apple AirPod Max headphones suspended in mid-air with dramatic lighting...' },
    ports: NODE_TYPES.find(n => n.type === 'text_input')!.ports,
  },
  {
    id: 'n2', type: 'dna_filter', x: 80, y: 380,
    data: { hookType: 'curiosity', angle: 'transformation', format: 'ugc' },
    ports: NODE_TYPES.find(n => n.type === 'dna_filter')!.ports,
  },
  {
    id: 'n3', type: 'top_performers', x: 80, y: 600,
    data: { minRoas: 2, sortBy: 'roas' },
    ports: NODE_TYPES.find(n => n.type === 'top_performers')!.ports,
  },
  {
    id: 'n4', type: 'hook_selector', x: 440, y: 120,
    data: { hookType: 'curiosity' },
    ports: NODE_TYPES.find(n => n.type === 'hook_selector')!.ports,
  },
  {
    id: 'n5', type: 'framework', x: 440, y: 370,
    data: { framework: 'fast-vsl' },
    ports: NODE_TYPES.find(n => n.type === 'framework')!.ports,
  },
  {
    id: 'n6', type: 'ai_strategist', x: 440, y: 590,
    data: { model: 'gemini-pro' },
    ports: NODE_TYPES.find(n => n.type === 'ai_strategist')!.ports,
  },
  {
    id: 'n7', type: 'brief_generator', x: 820, y: 240,
    data: { status: 'complete', aspectRatio: '9:16' },
    ports: NODE_TYPES.find(n => n.type === 'brief_generator')!.ports,
  },
  {
    id: 'n8', type: 'variation', x: 1180, y: 220,
    data: { variations: 2 },
    ports: NODE_TYPES.find(n => n.type === 'variation')!.ports,
  },
  {
    id: 'n9', type: 'export', x: 1520, y: 160,
    data: { format: 'csv' },
    ports: NODE_TYPES.find(n => n.type === 'export')!.ports,
  },
  {
    id: 'n10', type: 'export', x: 1520, y: 370,
    data: { format: 'clipboard' },
    ports: NODE_TYPES.find(n => n.type === 'export')!.ports,
  },
];

const DEMO_WIRES: Wire[] = [
  { id: 'w1', fromNode: 'n2', fromPort: 'out', toNode: 'n4', toPort: 'in' },
  { id: 'w2', fromNode: 'n1', fromPort: 'out', toNode: 'n5', toPort: 'in_hook' },
  { id: 'w3', fromNode: 'n4', fromPort: 'out', toNode: 'n5', toPort: 'in_angle' },
  { id: 'w4', fromNode: 'n3', fromPort: 'out', toNode: 'n6', toPort: 'in' },
  { id: 'w5', fromNode: 'n5', fromPort: 'out', toNode: 'n7', toPort: 'in_framework' },
  { id: 'w6', fromNode: 'n6', fromPort: 'out', toNode: 'n7', toPort: 'in_text' },
  { id: 'w7', fromNode: 'n7', fromPort: 'out', toNode: 'n8', toPort: 'in' },
  { id: 'w8', fromNode: 'n8', fromPort: 'out_a', toNode: 'n9', toPort: 'in' },
  { id: 'w9', fromNode: 'n8', fromPort: 'out_b', toNode: 'n10', toPort: 'in' },
];

// ============================================================================
// HELPER: get port position relative to canvas
// ============================================================================

function getPortOffset(node: FlowNode, portId: string): { x: number; y: number } {
  const port = node.ports.find(p => p.id === portId);
  if (!port) return { x: node.x, y: node.y };

  const nodeWidth = 260;
  const inputs = node.ports.filter(p => p.type === 'input');
  const outputs = node.ports.filter(p => p.type === 'output');

  if (port.type === 'input') {
    const idx = inputs.indexOf(port);
    const spacing = 140 / (inputs.length + 1);
    return { x: node.x, y: node.y + 60 + spacing * (idx + 1) };
  } else {
    const idx = outputs.indexOf(port);
    const spacing = 140 / (outputs.length + 1);
    return { x: node.x + nodeWidth, y: node.y + 60 + spacing * (idx + 1) };
  }
}

// ============================================================================
// WIRE COMPONENT (Bezier Curve)
// ============================================================================

function WirePath({ wire, nodes, isAnimated }: { wire: Wire; nodes: FlowNode[]; isAnimated?: boolean }) {
  const fromNode = nodes.find(n => n.id === wire.fromNode);
  const toNode = nodes.find(n => n.id === wire.toNode);
  if (!fromNode || !toNode) return null;

  const from = getPortOffset(fromNode, wire.fromPort);
  const to = getPortOffset(toNode, wire.toPort);

  const dx = Math.abs(to.x - from.x);
  const cpOffset = Math.max(80, dx * 0.45);

  const d = `M ${from.x} ${from.y} C ${from.x + cpOffset} ${from.y}, ${to.x - cpOffset} ${to.y}, ${to.x} ${to.y}`;

  const fromPort = fromNode.ports.find(p => p.id === wire.fromPort);
  const color = fromPort ? PORT_COLORS[fromPort.dataType] || '#6B7280' : '#6B7280';

  return (
    <g>
      {/* Glow behind */}
      <path d={d} fill="none" stroke={color} strokeWidth={4} strokeOpacity={0.08} />
      {/* Main wire */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.5}
        className={isAnimated ? 'wire-animated' : ''}
      />
      {/* Bright overlay when animated */}
      {isAnimated && (
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeOpacity={0.8}
          strokeDasharray="4 12" className="wire-animated" />
      )}
    </g>
  );
}

// ============================================================================
// PENDING WIRE (while dragging a new connection)
// ============================================================================

function PendingWire({ from, to, dataType }: { from: { x: number; y: number }; to: { x: number; y: number }; dataType: string }) {
  const dx = Math.abs(to.x - from.x);
  const cpOffset = Math.max(60, dx * 0.4);
  const d = `M ${from.x} ${from.y} C ${from.x + cpOffset} ${from.y}, ${to.x - cpOffset} ${to.y}, ${to.x} ${to.y}`;
  const color = PORT_COLORS[dataType] || '#6B7280';

  return (
    <path d={d} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="6 4" />
  );
}

// ============================================================================
// NODE BODY RENDERERS (per type)
// ============================================================================

function TextInputBody({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="node-body">
      <div className="node-control">
        <textarea
          className="node-textarea"
          placeholder="Enter your creative prompt..."
          value={(data.text as string) || ''}
          readOnly
          rows={3}
        />
      </div>
    </div>
  );
}

function DnaFilterBody({ data }: { data: Record<string, unknown> }) {
  const hookColors: Record<string, string> = {
    curiosity: '#4ECDC4', pain_point: '#FF6B6B', bold_claim: '#F59E0B',
    social_proof: '#A855F7', pattern_interrupt: '#06D6A0',
  };
  const angleColors: Record<string, string> = {
    transformation: '#00F5D4', fear: '#EF4444', authority: '#8B5CF6',
    comparison: '#F472B6', urgency: '#FB8500', education: '#3B82F6',
  };
  const formatColors: Record<string, string> = {
    ugc: '#45B7D1', talking_head: '#FFD700', screen_recording: '#818CF8',
    broll_montage: '#34D399', meme: '#FE2C55',
  };

  const hook = data.hookType as string;
  const angle = data.angle as string;
  const format = data.format as string;

  const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="node-body">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <span className="node-pill" style={{ background: `${hookColors[hook]}12`, color: hookColors[hook], border: `1px solid ${hookColors[hook]}30` }}>
          🪝 {fmt(hook)}
        </span>
        <span className="node-pill" style={{ background: `${angleColors[angle]}12`, color: angleColors[angle], border: `1px solid ${angleColors[angle]}30` }}>
          🎯 {fmt(angle)}
        </span>
        <span className="node-pill" style={{ background: `${formatColors[format]}12`, color: formatColors[format], border: `1px solid ${formatColors[format]}30` }}>
          🎬 {fmt(format)}
        </span>
      </div>
      <div style={{ marginTop: '10px' }}>
        <div className="node-stat">
          <span className="node-stat-label">Matching Ads</span>
          <span className="node-stat-value" style={{ color: '#4ECDC4' }}>12</span>
        </div>
        <div className="node-stat">
          <span className="node-stat-label">Avg ROAS</span>
          <span className="node-stat-value" style={{ color: '#06D6A0' }}>2.4x</span>
        </div>
      </div>
    </div>
  );
}

function TopPerformersBody() {
  return (
    <div className="node-body">
      <div className="node-control">
        <div className="node-control-label">Min ROAS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            flex: 1, height: '6px', borderRadius: '3px',
            background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              width: '65%', height: '100%', borderRadius: '3px',
              background: 'linear-gradient(90deg, #06D6A0, #4ECDC4)',
              boxShadow: '0 0 8px rgba(6,214,160,0.4)',
            }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#06D6A0', fontFamily: "'SF Mono', monospace" }}>2.0x</span>
        </div>
      </div>
      <div style={{ marginTop: '6px' }}>
        <div className="node-stat">
          <span className="node-stat-label">Found</span>
          <span className="node-stat-value" style={{ color: '#06D6A0' }}>8 ads</span>
        </div>
        <div className="node-stat">
          <span className="node-stat-label">Total Spend</span>
          <span className="node-stat-value" style={{ color: '#E5E7EB' }}>$12.4k</span>
        </div>
      </div>
    </div>
  );
}

function HookSelectorBody({ data }: { data: Record<string, unknown> }) {
  const hooks = ['curiosity', 'pain_point', 'bold_claim', 'social_proof', 'pattern_interrupt'];
  const colors: Record<string, string> = {
    curiosity: '#4ECDC4', pain_point: '#FF6B6B', bold_claim: '#F59E0B',
    social_proof: '#A855F7', pattern_interrupt: '#06D6A0',
  };
  const current = data.hookType as string;
  const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="node-body">
      <div className="node-control">
        <div className="node-control-label">Active Hook</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {hooks.map(h => (
            <div key={h} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 10px', borderRadius: '8px',
              background: h === current ? `${colors[h]}12` : 'transparent',
              border: h === current ? `1px solid ${colors[h]}30` : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: colors[h],
                boxShadow: h === current ? `0 0 8px ${colors[h]}60` : 'none',
              }} />
              <span style={{
                fontSize: '11px', fontWeight: h === current ? 600 : 400,
                color: h === current ? colors[h] : '#6B7280',
              }}>{fmt(h)}</span>
              {h === current && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#06D6A0', fontWeight: 700, fontFamily: "'SF Mono', monospace" }}>2.4x</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FrameworkBody({ data }: { data: Record<string, unknown> }) {
  const frameworks: Record<string, { name: string; icon: string; slots: string[] }> = {
    'fast-vsl': { name: 'Fast-Paced VSL', icon: '⚡', slots: ['Hook 0-3s', 'Agitate 3-10s', 'Mechanism 10-25s', 'Close 25-30s'] },
    'storytelling': { name: 'Storytelling Arc', icon: '📖', slots: ['Hook 0-5s', 'Struggle 5-15s', 'Transform 15-35s', 'CTA 35-45s'] },
    'problem-solution': { name: 'Problem → Solution', icon: '💡', slots: ['Problem 0-3s', 'Amplify 3-12s', 'Demo 12-25s', 'CTA 25-30s'] },
  };
  const fw = frameworks[data.framework as string] || frameworks['fast-vsl'];
  const slotColors = ['#4ECDC4', '#F59E0B', '#A855F7', '#FF6B6B'];

  return (
    <div className="node-body">
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
        padding: '6px 10px', borderRadius: '8px',
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)',
      }}>
        <span style={{ fontSize: '14px' }}>{fw.icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#F59E0B' }}>{fw.name}</span>
      </div>
      {/* Timeline bar */}
      <div style={{
        display: 'flex', gap: '2px', height: '8px', borderRadius: '4px', overflow: 'hidden',
        marginBottom: '8px',
      }}>
        {fw.slots.map((_, i) => (
          <div key={i} style={{
            flex: 1, background: slotColors[i],
            opacity: 0.6, borderRadius: i === 0 ? '4px 0 0 4px' : i === fw.slots.length - 1 ? '0 4px 4px 0' : '0',
          }} />
        ))}
      </div>
      {fw.slots.map((slot, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 0', fontSize: '10px', color: '#9CA3AF',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: slotColors[i], flexShrink: 0 }} />
          {slot}
        </div>
      ))}
    </div>
  );
}

function AiStrategistBody() {
  return (
    <div className="node-body">
      <div className="node-control">
        <div className="node-control-label">AI Model</div>
        <div style={{
          padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)',
          fontSize: '11px', color: '#C084FC', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '13px' }}>✨</span>
          Gemini Pro
        </div>
      </div>
      <div style={{ marginTop: '6px' }}>
        <div className="node-stat">
          <span className="node-stat-label">Strategy Cards</span>
          <span className="node-stat-value" style={{ color: '#A855F7' }}>4</span>
        </div>
        <div className="node-stat">
          <span className="node-stat-label">Actions</span>
          <span className="node-stat-value" style={{ color: '#06D6A0' }}>Scale · Test · Iterate · Kill</span>
        </div>
      </div>
    </div>
  );
}

function BriefGeneratorBody({ data }: { data: Record<string, unknown> }) {
  const isComplete = data.status === 'complete';
  return (
    <div className="node-body">
      <div className="node-control">
        <div className="node-control-label">Aspect Ratio</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['9:16', '1:1', '16:9'].map(ar => (
            <button key={ar} style={{
              padding: '5px 12px', borderRadius: '8px', border: 'none',
              background: data.aspectRatio === ar ? 'rgba(6,214,160,0.12)' : 'rgba(255,255,255,0.04)',
              color: data.aspectRatio === ar ? '#06D6A0' : '#6B7280',
              fontWeight: data.aspectRatio === ar ? 600 : 400,
              fontSize: '10.5px', fontFamily: "'SF Mono', monospace",
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}>{ar}</button>
          ))}
        </div>
      </div>
      {isComplete && (
        <div className="node-preview">
          <div className="node-preview-text">
            <div style={{ fontSize: '9px', color: '#06D6A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              ✓ Brief Generated
            </div>
            <strong>0:00 – 0:03 | HOOK</strong><br />
            Close-up of AirPods Max hovering, dramatic spotlight...<br /><br />
            <strong>0:03 – 0:10 | AGITATION</strong><br />
            Quick cuts: tangled wires, cheap earbuds breaking...
          </div>
        </div>
      )}
      {!isComplete && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
          <div className="node-spinner" />
          <span style={{ fontSize: '10.5px', color: '#6B7280' }}>Awaiting inputs...</span>
        </div>
      )}
    </div>
  );
}

function VariationBody() {
  return (
    <div className="node-body">
      <div className="node-control">
        <div className="node-control-label">Variations</div>
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <div style={{
            padding: '8px 12px', borderRadius: '8px',
            background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.1)',
            fontSize: '10.5px', color: '#F472B6', fontWeight: 500,
          }}>
            <span style={{ fontWeight: 700 }}>A</span> · 9:16 Vertical · Urgency CTA
          </div>
          <div style={{
            padding: '8px 12px', borderRadius: '8px',
            background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.1)',
            fontSize: '10.5px', color: '#F472B6', fontWeight: 500,
          }}>
            <span style={{ fontWeight: 700 }}>B</span> · 1:1 Square · Soft CTA
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportBody({ data }: { data: Record<string, unknown> }) {
  const format = data.format as string;
  return (
    <div className="node-body">
      <div className="node-control">
        <div className="node-control-label">Format</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['csv', 'clipboard', 'pdf'].map(f => (
            <button key={f} style={{
              padding: '5px 12px', borderRadius: '8px', border: 'none',
              background: format === f ? 'rgba(78,205,196,0.12)' : 'rgba(255,255,255,0.04)',
              color: format === f ? '#4ECDC4' : '#6B7280',
              fontWeight: format === f ? 600 : 400,
              fontSize: '10.5px', fontFamily: "'Inter', sans-serif",
              cursor: 'pointer', textTransform: 'uppercase',
              transition: 'all 0.15s ease',
            }}>{f}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetPickerBody() {
  return (
    <div className="node-body">
      <div className="node-control">
        <div className="node-control-label">Asset Type</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['All', 'Video', 'Image'].map(t => (
            <button key={t} style={{
              padding: '5px 12px', borderRadius: '8px', border: 'none',
              background: t === 'All' ? 'rgba(255,107,107,0.1)' : 'rgba(255,255,255,0.04)',
              color: t === 'All' ? '#FF6B6B' : '#6B7280',
              fontWeight: t === 'All' ? 600 : 400,
              fontSize: '10.5px', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{
            width: '48px', height: '48px', borderRadius: '8px',
            background: `linear-gradient(${135 + i*30}deg, rgba(168,85,247,0.15) 0%, rgba(78,205,196,0.1) 100%)`,
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: '#6B7280',
          }}>
            {i === 1 ? '▶' : '🖼'}
          </div>
        ))}
      </div>
    </div>
  );
}

// Body renderer map
const NODE_BODIES: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  text_input: TextInputBody,
  dna_filter: DnaFilterBody,
  top_performers: TopPerformersBody,
  asset_picker: AssetPickerBody,
  hook_selector: HookSelectorBody,
  framework: FrameworkBody,
  ai_strategist: AiStrategistBody,
  brief_generator: BriefGeneratorBody,
  variation: VariationBody,
  export: ExportBody,
};

// ============================================================================
// SINGLE NODE COMPONENT
// ============================================================================

function FlowNodeComponent({
  node,
  typeDef,
  isSelected,
  isDragging,
  isRunning,
  onMouseDown,
  onPortMouseDown,
}: {
  node: FlowNode;
  typeDef: NodeTypeDef;
  isSelected: boolean;
  isDragging: boolean;
  isRunning: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onPortMouseDown: (nodeId: string, portId: string, dataType: string, portType: 'input' | 'output', e: React.MouseEvent) => void;
}) {
  const BodyComponent = NODE_BODIES[node.type];
  const inputs = node.ports.filter(p => p.type === 'input');
  const outputs = node.ports.filter(p => p.type === 'output');

  return (
    <div
      className={`flow-node${isSelected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}${isRunning ? ' is-running' : ''}`}
      style={{ left: node.x, top: node.y, width: 260 }}
      onMouseDown={onMouseDown}
    >
      {/* Input ports */}
      {inputs.map((port, idx) => {
        const spacing = 140 / (inputs.length + 1);
        const top = 60 + spacing * (idx + 1);
        return (
          <div
            key={port.id}
            className={`node-port port-input port-${port.dataType}`}
            style={{ top }}
            title={port.label}
            onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(node.id, port.id, port.dataType, 'input', e); }}
          />
        );
      })}

      {/* Output ports */}
      {outputs.map((port, idx) => {
        const spacing = 140 / (outputs.length + 1);
        const top = 60 + spacing * (idx + 1);
        return (
          <div
            key={port.id}
            className={`node-port port-output port-${port.dataType}`}
            style={{ top }}
            title={port.label}
            onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(node.id, port.id, port.dataType, 'output', e); }}
          />
        );
      })}

      {/* Header */}
      <div className="node-header">
        <div className="node-header-icon" style={{
          background: `${typeDef.color}12`,
          border: `1px solid ${typeDef.color}25`,
        }}>
          {typeDef.icon}
        </div>
        <div>
          <div className="node-header-title">{typeDef.label}</div>
          <div className="node-header-subtitle">{typeDef.description}</div>
        </div>
        <span className="node-header-badge" style={{
          background: `${typeDef.color}10`,
          color: typeDef.color,
          border: `1px solid ${typeDef.color}20`,
        }}>
          {CATEGORY_META[typeDef.category]?.label}
        </span>
      </div>

      {/* Body */}
      {BodyComponent && <BodyComponent data={node.data} />}
    </div>
  );
}

// ============================================================================
// DOT GRID BACKGROUND
// ============================================================================

function DotGrid({ zoom, panX, panY }: { zoom: number; panX: number; panY: number }) {
  const spacing = 30 * zoom;
  const ox = (panX % spacing + spacing) % spacing;
  const oy = (panY % spacing + spacing) % spacing;

  return (
    <svg className="canvas-grid" width="100%" height="100%">
      <defs>
        <pattern id="dotGrid" x={ox} y={oy} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={0.8} fill="rgba(255,255,255,0.04)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotGrid)" />
    </svg>
  );
}

// ============================================================================
// MINIMAP
// ============================================================================

function Minimap({ nodes, zoom, panX, panY, canvasWidth, canvasHeight }: {
  nodes: FlowNode[]; zoom: number; panX: number; panY: number;
  canvasWidth: number; canvasHeight: number;
}) {
  const mmW = 180;
  const mmH = 120;

  // Compute bounds
  const minX = Math.min(...nodes.map(n => n.x), 0);
  const maxX = Math.max(...nodes.map(n => n.x + 260), canvasWidth / zoom);
  const minY = Math.min(...nodes.map(n => n.y), 0);
  const maxY = Math.max(...nodes.map(n => n.y + 200), canvasHeight / zoom);

  const worldW = maxX - minX + 200;
  const worldH = maxY - minY + 200;
  const scale = Math.min(mmW / worldW, mmH / worldH);

  const vpW = (canvasWidth / zoom) * scale;
  const vpH = (canvasHeight / zoom) * scale;
  const vpX = (-panX / zoom - minX + 100) * scale;
  const vpY = (-panY / zoom - minY + 100) * scale;

  return (
    <div className="canvas-minimap">
      {nodes.map(n => {
        const typeDef = NODE_TYPES.find(t => t.type === n.type);
        return (
          <div key={n.id} className="minimap-node" style={{
            left: (n.x - minX + 100) * scale,
            top: (n.y - minY + 100) * scale,
            width: 260 * scale,
            height: 140 * scale,
            background: `${typeDef?.color || '#6B7280'}20`,
          }} />
        );
      })}
      <div className="minimap-viewport" style={{
        left: vpX, top: vpY, width: vpW, height: vpH,
      }} />
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NodeCanvasPage() {
  // Canvas state
  const [nodes, setNodes] = useState<FlowNode[]>(DEMO_NODES);
  const [wires, setWires] = useState<Wire[]>(DEMO_WIRES);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [panX, setPanX] = useState(80);
  const [panY, setPanY] = useState(20);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [runningNodes, setRunningNodes] = useState<Set<string>>(new Set(['n7']));

  // Wire dragging state
  const [pendingWire, setPendingWire] = useState<{
    fromNode: string; fromPort: string; dataType: string; mouseX: number; mouseY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; nodeX: number; nodeY: number }>({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number }>({ x: 0, y: 0, px: 0, py: 0 });

  const canvasWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const canvasHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Pan handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.flow-node') || (e.target as HTMLElement).closest('.node-port')) return;
    setIsPanning(true);
    setSelectedNode(null);
    panStartRef.current = { x: e.clientX, y: e.clientY, px: panX, py: panY };
  }, [panX, panY]);

  // Node drag
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(nodeId);
    setDraggingNode(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y };
  }, [nodes]);

  // Port drag (wire creation)
  const handlePortMouseDown = useCallback((nodeId: string, portId: string, dataType: string, portType: 'input' | 'output', e: React.MouseEvent) => {
    if (portType === 'output') {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const pos = getPortOffset(node, portId);
      const canvasPos = { x: pos.x * zoom + panX, y: pos.y * zoom + panY };
      setPendingWire({ fromNode: nodeId, fromPort: portId, dataType, mouseX: canvasPos.x, mouseY: canvasPos.y });
    }
  }, [nodes, zoom, panX, panY]);

  // Global mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanX(panStartRef.current.px + dx);
        setPanY(panStartRef.current.py + dy);
      }
      if (draggingNode) {
        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;
        setNodes(prev => prev.map(n =>
          n.id === draggingNode
            ? { ...n, x: dragStartRef.current.nodeX + dx, y: dragStartRef.current.nodeY + dy }
            : n
        ));
      }
      if (pendingWire) {
        setPendingWire(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsPanning(false);
      setDraggingNode(null);

      if (pendingWire) {
        // Check if we're over an input port
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target?.classList.contains('port-input')) {
          const nodeEl = target.closest('.flow-node');
          if (nodeEl) {
            const nodeIdx = Array.from(document.querySelectorAll('.flow-node')).indexOf(nodeEl);
            if (nodeIdx >= 0 && nodeIdx < nodes.length) {
              const targetNode = nodes[nodeIdx];
              const inputs = targetNode.ports.filter(p => p.type === 'input');
              const portIdx = Array.from(nodeEl.querySelectorAll('.port-input')).indexOf(target as Element);
              if (portIdx >= 0 && portIdx < inputs.length) {
                const newWire: Wire = {
                  id: `w_${Date.now()}`,
                  fromNode: pendingWire.fromNode,
                  fromPort: pendingWire.fromPort,
                  toNode: targetNode.id,
                  toPort: inputs[portIdx].id,
                };
                setWires(prev => [...prev, newWire]);
              }
            }
          }
        }
        setPendingWire(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, draggingNode, pendingWire, nodes, zoom]);

  // Zoom with scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.06 : 0.06;
      setZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
    };
    const el = canvasRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, []);

  // Palette drag-to-add
  const handlePaletteNodeDrag = useCallback((typeName: string) => {
    const typeDef = NODE_TYPES.find(t => t.type === typeName);
    if (!typeDef) return;
    const id = `n_${Date.now()}`;
    const newNode: FlowNode = {
      id,
      type: typeName,
      x: (-panX / zoom) + 400,
      y: (-panY / zoom) + 200 + Math.random() * 100,
      data: { ...typeDef.defaultData },
      ports: [...typeDef.ports],
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(id);
  }, [panX, panY, zoom]);

  // Delete selected
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        setNodes(prev => prev.filter(n => n.id !== selectedNode));
        setWires(prev => prev.filter(w => w.fromNode !== selectedNode && w.toNode !== selectedNode));
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedNode]);

  // Group nodes by category for palette
  const categorized = useMemo(() => {
    const map: Record<string, NodeTypeDef[]> = {};
    for (const nt of NODE_TYPES) {
      if (!map[nt.category]) map[nt.category] = [];
      map[nt.category].push(nt);
    }
    return map;
  }, []);

  // Simulated run animation
  const handleRunAll = useCallback(() => {
    const nodeIds = nodes.map(n => n.id);
    let i = 0;
    const run = () => {
      if (i >= nodeIds.length) {
        setRunningNodes(new Set());
        return;
      }
      setRunningNodes(new Set([nodeIds[i]]));
      i++;
      setTimeout(run, 600);
    };
    run();
  }, [nodes]);

  return (
    <div
      ref={canvasRef}
      className={`node-canvas-root${isPanning ? ' is-panning' : ''}${pendingWire ? ' is-connecting' : ''}`}
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Dot grid */}
      <DotGrid zoom={zoom} panX={panX} panY={panY} />

      {/* Header bar */}
      <div className="canvas-header">
        <div className="canvas-header-left">
          <a href="/ad-tracker" className="canvas-header-logo" style={{ textDecoration: 'none' }}>
            <div className="canvas-header-logo-icon">⚡</div>
            <div>
              <div className="canvas-header-title">Creative Flow Studio</div>
              <div className="canvas-header-subtitle">Node-based ad creation engine</div>
            </div>
          </a>
          <div className="canvas-header-divider" />
          <div className="status-pill" style={{ background: 'rgba(78,205,196,0.06)', border: '1px solid rgba(78,205,196,0.12)', color: '#4ECDC4' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#4ECDC4', boxShadow: '0 0 6px rgba(78,205,196,0.5)' }} />
            {nodes.length} nodes · {wires.length} connections
          </div>
        </div>
        <div className="canvas-header-center">
          <button className="btn-glass" onClick={() => { setNodes(DEMO_NODES); setWires(DEMO_WIRES); setPanX(80); setPanY(20); setZoom(0.85); }}>
            ↺ Reset
          </button>
          <button className="btn-glass">
            💾 Save Flow
          </button>
        </div>
        <div className="canvas-header-right">
          <button className="btn-accent" onClick={handleRunAll}>
            ▶ Run Flow
          </button>
        </div>
      </div>

      {/* Node palette (left sidebar) */}
      <div className="node-palette">
        <div className="palette-header">
          <div className="palette-title">Node Library</div>
          <input className="palette-search" placeholder="Search nodes..." />
        </div>
        <div className="palette-body">
          {Object.entries(categorized).map(([cat, defs]) => (
            <div key={cat} className="palette-section">
              <div className="palette-section-title" style={{ color: CATEGORY_META[cat]?.color }}>
                {CATEGORY_META[cat]?.label}
              </div>
              {defs.map(def => (
                <button
                  key={def.type}
                  className="palette-node"
                  onClick={() => handlePaletteNodeDrag(def.type)}
                >
                  <div className="palette-node-icon" style={{
                    background: `${def.color}10`,
                    border: `1px solid ${def.color}20`,
                  }}>
                    {def.icon}
                  </div>
                  <div className="palette-node-info">
                    <div className="palette-node-name">{def.label}</div>
                    <div className="palette-node-desc">{def.description}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas transform layer */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: '0 0',
        zIndex: 2,
      }}>
        {/* Wires */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          {wires.map(w => (
            <WirePath
              key={w.id}
              wire={w}
              nodes={nodes}
              isAnimated={runningNodes.has(w.fromNode) || runningNodes.has(w.toNode)}
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const typeDef = NODE_TYPES.find(t => t.type === node.type);
          if (!typeDef) return null;
          return (
            <FlowNodeComponent
              key={node.id}
              node={node}
              typeDef={typeDef}
              isSelected={selectedNode === node.id}
              isDragging={draggingNode === node.id}
              isRunning={runningNodes.has(node.id)}
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              onPortMouseDown={handlePortMouseDown}
            />
          );
        })}
      </div>

      {/* Pending wire overlay */}
      {pendingWire && (
        <svg style={{ position: 'absolute', inset: 0, zIndex: 100, pointerEvents: 'none', overflow: 'visible' }}>
          <PendingWire
            from={{ x: getPortOffset(nodes.find(n => n.id === pendingWire.fromNode)!, pendingWire.fromPort).x * zoom + panX, y: getPortOffset(nodes.find(n => n.id === pendingWire.fromNode)!, pendingWire.fromPort).y * zoom + panY }}
            to={{ x: pendingWire.mouseX, y: pendingWire.mouseY }}
            dataType={pendingWire.dataType}
          />
        </svg>
      )}

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}>−</button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="zoom-btn" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>+</button>
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
        <button className="zoom-btn" onClick={() => { setZoom(0.85); setPanX(80); setPanY(20); }} title="Fit to screen">⊙</button>
      </div>

      {/* Minimap */}
      <Minimap
        nodes={nodes}
        zoom={zoom}
        panX={panX}
        panY={panY}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </div>
  );
}
