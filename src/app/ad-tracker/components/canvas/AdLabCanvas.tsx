'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Edge, type Node,
  BackgroundVariant, type ReactFlowInstance,
  ReactFlowProvider, ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CANVAS_COLORS } from './canvasTheme';
import { CanvasSidebar } from './CanvasSidebar';
import { CanvasDataProvider } from './CanvasDataContext';
import { saveCanvasState, loadCanvasState, clearCanvasState } from './canvasExecutor';
import type { AdLabNodeType } from './canvasTypes';
import type { VaultCreative } from '../CreativeVault';
import Logo from '../../../../components/Logo';

import { UrlNode, VaultCreativeNode, BrandProfileNode } from './nodes/SourceNodes';
import { ExtractorNode } from './nodes/ExtractorNode';
import { HookNode, AngleNode, FormatNode } from './nodes/DnaTagNodes';
import { PersonaNode, DesireNode, CustomPromptNode } from './nodes/InputNodes';
import {
  CanonicalAvatarNode,
  CanonicalHookNode,
  CanonicalAngleNode,
  CanonicalDesireNode,
  CanonicalFeatureBenefitNode,
} from './nodes/CanonicalEntityNodes';
import { ExtractedDataNode } from './nodes/ExtractedDataNode';
import { SynthesizerNode, NoteNode, AdCopyPromptNode, LlmQuestionNode, BriefOutputNode, HookVariationsNode, ScriptWriterNode, ComplianceCheckerNode } from './nodes/OutputNodes';

// ============================================================================
// NODE REGISTRY
// ============================================================================

const nodeTypes = {
  urlNode: UrlNode, vaultCreativeNode: VaultCreativeNode, brandProfileNode: BrandProfileNode,
  skeletonExtractorNode: ExtractorNode,
  hookNode: HookNode, angleNode: AngleNode, formatNode: FormatNode,
  personaNode: PersonaNode, desireNode: DesireNode, customPromptNode: CustomPromptNode,
  canonicalAvatarNode: CanonicalAvatarNode,
  canonicalHookNode: CanonicalHookNode,
  canonicalAngleNode: CanonicalAngleNode,
  canonicalDesireNode: CanonicalDesireNode,
  canonicalFeatureBenefitNode: CanonicalFeatureBenefitNode,
  extractedDataNode: ExtractedDataNode,
  synthesizerNode: SynthesizerNode, adCopyPromptNode: AdCopyPromptNode, llmQuestionNode: LlmQuestionNode,
  hookVariationsNode: HookVariationsNode, scriptWriterNode: ScriptWriterNode, complianceCheckerNode: ComplianceCheckerNode,
  briefOutputNode: BriefOutputNode, noteNode: NoteNode,
};

// ============================================================================
// DEFAULT CANVAS — Better starting layout for Creative Brief Builder
// ============================================================================

const EDGE_STYLE = { stroke: 'rgba(168,85,247,0.25)', strokeWidth: 1.2 };

const DEFAULT_NODES: Node[] = [
  // Left column — inputs
  { id: 's-hook', type: 'hookNode', position: { x: 60, y: 60 }, data: { hookType: 'curiosity', avgRoas: 0, count: 0, status: 'good' } },
  { id: 's-angle', type: 'angleNode', position: { x: 60, y: 280 }, data: { angle: 'transformation', avgRoas: 0, count: 0, status: 'good' } },
  { id: 's-format', type: 'formatNode', position: { x: 60, y: 490 }, data: { format: 'ugc', avgRoas: 0, count: 0, status: 'good' } },
  // Middle column — enriched inputs
  { id: 's-persona', type: 'personaNode', position: { x: 340, y: 60 }, data: { personaIndex: -1, ageGenderLocation: '', beliefs: '', desiredStatus: '', dailyStruggles: '', howProductHelps: '' } },
  { id: 's-desire', type: 'desireNode', position: { x: 340, y: 310 }, data: { desire: '', feature: '', benefit: '', coreUSP: '' } },
  { id: 's-prompt', type: 'customPromptNode', position: { x: 340, y: 520 }, data: { prompt: '' } },
  // Right column — generators
  { id: 's-synth', type: 'synthesizerNode', position: { x: 640, y: 200 }, data: { status: 'idle' } },
];

const DEFAULT_EDGES: Edge[] = [
  { id: 'e1', source: 's-hook', target: 's-synth', animated: true, style: EDGE_STYLE },
  { id: 'e2', source: 's-angle', target: 's-synth', animated: true, style: EDGE_STYLE },
  { id: 'e3', source: 's-format', target: 's-synth', animated: true, style: EDGE_STYLE },
  { id: 'e4', source: 's-persona', target: 's-synth', animated: true, style: EDGE_STYLE },
  { id: 'e5', source: 's-desire', target: 's-synth', animated: true, style: EDGE_STYLE },
  { id: 'e6', source: 's-prompt', target: 's-synth', animated: true, style: EDGE_STYLE },
];

// ============================================================================
// INNER CANVAS
// ============================================================================

function CanvasInner() {
  const saved = useMemo(() => loadCanvasState(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(saved?.nodes || DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved?.edges || DEFAULT_EDGES);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave
  const queueSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (rfRef.current) saveCanvasState({ nodes, edges, viewport: rfRef.current.getViewport() });
    }, 1500);
  }, [nodes, edges]);
  useEffect(() => { queueSave(); }, [queueSave]);

  const onConnect = useCallback((p: Connection) => {
    setEdges(eds => addEdge({ ...p, animated: true, style: EDGE_STYLE }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/adlab-node-type') as AdLabNodeType;
    const dataStr = e.dataTransfer.getData('application/adlab-node-data');
    if (!type || !rfRef.current) return;
    const position = rfRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(dataStr); } catch (_) {}
    setNodes(nds => [...nds, {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type, position, data,
    }]);
  }, [setNodes]);

  const onInit = useCallback((inst: ReactFlowInstance) => {
    rfRef.current = inst;
    if (saved?.viewport) inst.setViewport(saved.viewport);
  }, [saved?.viewport]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: CANVAS_COLORS.canvasBg }}>
      {/* Fixed Logo — matches ad-tracker page placement */}
      {/* Blur backdrop behind logo — matches dashboard style */}
      <div style={{
        position: 'absolute', top: '108px', left: '56px',
        transform: 'translate(-30%, -40%)',
        width: '280px', height: '160px',
        background: `radial-gradient(ellipse at center, ${CANVAS_COLORS.canvasBg} 0%, ${CANVAS_COLORS.canvasBg}CC 35%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 1,
      }} />
      <a href="/ad-tracker" style={{ position: 'absolute', top: '108px', left: '56px', zIndex: 2, opacity: 0.8, textDecoration: 'none' }}>
        <Logo size="medium" />
      </a>

      <CanvasSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: '12px',
        left: '56px', right: '12px',
        zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
          
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              ...panelStyle, padding: '7px 8px', border: 'none',
              background: sidebarOpen ? 'rgba(255,255,255,0.1)' : 'rgba(24, 24, 32, 0.6)',
              color: sidebarOpen ? '#E4E4E7' : '#A1A1AA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E4E4E7'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = sidebarOpen ? '#E4E4E7' : '#A1A1AA'; e.currentTarget.style.background = sidebarOpen ? 'rgba(255,255,255,0.1)' : 'rgba(24, 24, 32, 0.6)'; }}
            title="Toggle Sidebar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>


          <div style={{ ...panelStyle, padding: '6px 10px', fontSize: '11px', color: '#71717A', fontFamily: "'SF Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: nodes.length > 0 ? '#06D6A0' : '#A1A1AA' }} />
            {nodes.length}n · {edges.length}e
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
          <BarBtn label="Reset" onClick={() => { setNodes(DEFAULT_NODES); setEdges(DEFAULT_EDGES); clearCanvasState(); setTimeout(() => rfRef.current?.fitView({ padding: 0.3 }), 100); }} />
          <BarBtn label="Clear" onClick={() => { setNodes([]); setEdges([]); clearCanvasState(); }} danger />
          <a href="/ad-tracker" style={{ ...panelStyle, padding: '7px 16px', color: '#A1A1AA', fontSize: '12px', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F5'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; }}
          >← Dashboard</a>
        </div>
      </div>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onDragOver={onDragOver} onDrop={onDrop} onInit={onInit}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ animated: true, style: EDGE_STYLE }}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: 'rgba(168,85,247,0.25)', strokeWidth: 1.2 }}
        fitView fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15} maxZoom={2.5}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="rgba(255,255,255,0.12)" />
        
        <style>{`
          .react-flow__controls {
            background: rgba(28, 28, 38, 0.9) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            margin-right: 12px !important;
            margin-bottom: 12px !important;
          }
          .react-flow__controls-button {
            background: transparent !important;
            border: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.04) !important;
            width: 34px !important;
            height: 34px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            color: #71717A !important;
            fill: #71717A !important;
          }
          .react-flow__controls-button:last-child {
            border-bottom: none !important;
          }
          .react-flow__controls-button:hover {
            background: rgba(255,255,255,0.06) !important;
            color: #E4E4E7 !important;
            fill: #E4E4E7 !important;
          }
          .react-flow__controls-button svg {
            width: 15px !important;
            height: 15px !important;
            fill: currentColor !important;
          }
        `}</style>
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap position="bottom-left" pannable zoomable
          style={{
            width: 120, height: 80,
            background: CANVAS_COLORS.canvasBg,
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '8px',
            marginLeft: '64px',
            transition: 'opacity 0.25s ease',
            boxShadow: '0 1px 6px rgba(0,0,0,0.2)',
          }}
          nodeColor={n => {
            switch (n.type) {
              case 'hookNode': return CANVAS_COLORS.dnaHook;
              case 'angleNode': return CANVAS_COLORS.dnaAngle;
              case 'formatNode': return CANVAS_COLORS.dnaFormat;
              case 'personaNode': return CANVAS_COLORS.persona;
              case 'desireNode': return CANVAS_COLORS.desire;
              case 'customPromptNode': return CANVAS_COLORS.customPrompt;
              case 'synthesizerNode':
              case 'adCopyPromptNode':
              case 'llmQuestionNode':
              case 'hookVariationsNode':
              case 'scriptWriterNode': return CANVAS_COLORS.generator;
              case 'complianceCheckerNode': return '#EF4444';
              case 'briefOutputNode': return '#A855F7';
              case 'skeletonExtractorNode': return CANVAS_COLORS.extractor;
              default: return CANVAS_COLORS.source;
            }
          }}
          maskColor="rgba(21,21,32,0.85)"
          nodeStrokeWidth={0}
        />
      </ReactFlow>

      <style>{`
        .adlab-btn {
          width: 100%; padding: 6px 10px; border-radius: 6px;
          border: 1px dashed var(--btn-border); background: var(--btn-bg);
          color: var(--btn-text); font-size: 9.5px; font-weight: 600; 
          cursor: pointer; outline: none; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center; gap: 4px;
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .adlab-btn:hover {
          border-color: var(--btn-border-hover);
          background: var(--btn-bg-hover);
        }
        .adlab-accordion {
          padding: 8px 10px; background: var(--acc-bg);
          border-bottom: var(--acc-border);
          display: flex; align-items: center; gap: 6px;
          transition: background-color 0.15s ease;
        }
        .adlab-accordion:hover {
          background: var(--acc-bg-hover);
        }
        .adlab-generate-btn {
          width: 100%; padding: 7px 10px; border-radius: 6px;
          background: var(--gen-bg); border: 1px solid var(--gen-border);
          color: var(--gen-text); font-size: 10px; font-weight: 700;
          cursor: pointer; outline: none; transition: background-color 0.15s ease, border-color 0.15s ease;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          letter-spacing: -0.01em; box-sizing: border-box;
        }
        .adlab-generate-btn:not(:disabled):hover {
          background: var(--gen-bg-hover);
        }
        .adlab-generate-btn:disabled {
          cursor: not-allowed;
        }
        .adlab-action-btn {
          width: 100%; padding: 5px; border-radius: 6px;
          background: var(--act-bg); border: 1px solid var(--act-border);
          color: var(--act-text); font-size: 9px; font-weight: 600;
          cursor: pointer; outline: none; transition: background-color 0.12s ease;
          display: flex; align-items: center; justify-content: center; box-sizing: border-box;
        }
        .adlab-action-btn:hover {
          background: var(--act-bg-hover);
        }
        .react-flow__node-default, .react-flow__node-input, .react-flow__node-output, .react-flow__node-group {
          background: rgba(16, 16, 26, 0.94) !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          border-radius: 12px !important;
          color: #D4D4D8 !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.28) !important;
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: 10px !important;
          padding: 8px 12px !important;
        }
        .react-flow__handle { transition: all 0.12s ease; }
        .react-flow__handle::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 24px; height: 24px;
          border-radius: 50%;
        }
        .react-flow__handle-right { transform-origin: right center; }
        .react-flow__handle-left { transform-origin: left center; }
        .react-flow__handle-top { transform-origin: center top; }
        .react-flow__handle-bottom { transform-origin: center bottom; }
        .react-flow__handle:hover { transform: scale(1.15); box-shadow: 0 0 4px rgba(168,85,247,0.2); }
        .react-flow__edge-path { transition: stroke-opacity 0.15s ease; }
        .react-flow__controls-button { background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.03) !important; color: #52525B !important; }
        .react-flow__controls-button:hover { color: #D4D4D8 !important; background: rgba(255,255,255,0.03) !important; }
        .react-flow__controls-button svg { fill: currentColor !important; }
        .react-flow__minimap { opacity: 0.35; transition: opacity 0.25s ease; }
        .react-flow__minimap:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

const panelStyle: React.CSSProperties = {
  borderRadius: '10px', background: 'rgba(28,28,36,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

function BarBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      ...panelStyle, padding: '7px 16px', color: '#A1A1AA',
      fontSize: '12px', fontWeight: 500, cursor: 'pointer', outline: 'none',
      transition: 'all 0.15s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = danger ? '#EF4444' : '#F4F4F5'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; }}
    >{label}</button>
  );
}

// ============================================================================
// EXPORT WITH PROVIDERS
// ============================================================================

interface AdLabCanvasProps { creatives?: VaultCreative[]; isLoading?: boolean; }

export default function AdLabCanvas({ creatives = [], isLoading = false }: AdLabCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: CANVAS_COLORS.canvasBg }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <CanvasDataProvider creatives={creatives} isLoading={isLoading}>
          <ReactFlowProvider>
            <CanvasInner />
          </ReactFlowProvider>
        </CanvasDataProvider>
      </div>
    </div>
  );
}
