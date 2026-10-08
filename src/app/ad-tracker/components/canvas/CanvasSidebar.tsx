'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CANVAS_COLORS, NODE_CATEGORY_CONFIG } from './canvasTheme';
import type { SidebarNodeItem } from './canvasTypes';
import { useCanvasData, type DnaGroupMetrics, type ExtractedEnumCategory, type ExtractedTextCategory, type ExtractedTextValue } from './CanvasDataContext';
import { EXTRACTED_CATEGORY_META } from './nodes/ExtractedDataNode';
import { Package, Link, Tag, Magnet, Target, Clapperboard, Users, Lightbulb, Pencil, Microscope, Zap, FileText, StickyNote, Hexagon, Repeat, Film, ShieldCheck, Award, Image as ImageIcon } from 'lucide-react';

// ============================================================================
// NODE LIBRARY — Updated with new input nodes
// ============================================================================

const NODE_LIBRARY: SidebarNodeItem[] = [
  // Source
  { type: 'vaultCreativeNode', label: 'Creative', icon: <Package size={16} strokeWidth={1.5} />, description: 'Select an ad', category: 'source', defaultData: { name: 'Select Creative', platform: 'Meta', platformColor: '#1877F2', metrics: {} } },
  { type: 'urlNode', label: 'URL', icon: <Link size={16} strokeWidth={1.5} />, description: 'Link to an ad', category: 'source', defaultData: { url: '' } },
  { type: 'brandProfileNode', label: 'Brand', icon: <Tag size={16} strokeWidth={1.5} />, description: 'Company context', category: 'source', defaultData: { productName: '', targetAudience: '', brandVoice: '' } },
  // DNA
  { type: 'hookNode', label: 'Hook', icon: <Magnet size={16} strokeWidth={1.5} />, description: 'Opening text/visual', category: 'dna', defaultData: { hookType: 'curiosity', avgRoas: 0, count: 0, status: 'good' } },
  { type: 'angleNode', label: 'Angle', icon: <Target size={16} strokeWidth={1.5} />, description: 'Marketing angle', category: 'dna', defaultData: { angle: 'transformation', avgRoas: 0, count: 0, status: 'good' } },
  { type: 'formatNode', label: 'Format', icon: <Clapperboard size={16} strokeWidth={1.5} />, description: 'Creative type', category: 'dna', defaultData: { format: 'ugc', avgRoas: 0, count: 0, status: 'good' } },
  // Input (NEW)
  { type: 'personaNode', label: 'Audience', icon: <Users size={16} strokeWidth={1.5} />, description: 'Who this connects with', category: 'input', defaultData: { personaIndex: -1, ageGenderLocation: '', beliefs: '', desiredStatus: '', dailyStruggles: '', howProductHelps: '' } },
  { type: 'desireNode', label: 'Benefit', icon: <Lightbulb size={16} strokeWidth={1.5} />, description: 'What they want', category: 'input', defaultData: { desire: '', feature: '', benefit: '', coreUSP: '' } },
  { type: 'customPromptNode', label: 'Instructions', icon: <Pencil size={16} strokeWidth={1.5} />, description: 'Add guidelines', category: 'input', defaultData: { prompt: '' } },
  { type: 'canonicalAvatarNode', label: 'Canonical Avatar', icon: <Users size={16} strokeWidth={1.5} />, description: 'Rolled-up metrics per avatar', category: 'input', defaultData: { entityId: '', label: '', payload: {}, metrics: { ad_count: 0, totals: {}, derived: { roas: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0 }, linked_ad_ids: [] }, linkCount: 0 } },
  { type: 'canonicalHookNode', label: 'Canonical Hook', icon: <Magnet size={16} strokeWidth={1.5} />, description: 'Rolled-up metrics per hook', category: 'input', defaultData: { entityId: '', label: '', payload: {}, metrics: { ad_count: 0, totals: {}, derived: { roas: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0 }, linked_ad_ids: [] }, linkCount: 0 } },
  { type: 'canonicalAngleNode', label: 'Canonical Angle', icon: <Target size={16} strokeWidth={1.5} />, description: 'Rolled-up metrics per angle', category: 'input', defaultData: { entityId: '', label: '', payload: {}, metrics: { ad_count: 0, totals: {}, derived: { roas: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0 }, linked_ad_ids: [] }, linkCount: 0 } },
  { type: 'canonicalDesireNode', label: 'Canonical Desire', icon: <Lightbulb size={16} strokeWidth={1.5} />, description: 'Rolled-up metrics per desire', category: 'input', defaultData: { entityId: '', label: '', payload: {}, metrics: { ad_count: 0, totals: {}, derived: { roas: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0 }, linked_ad_ids: [] }, linkCount: 0 } },
  { type: 'canonicalFeatureBenefitNode', label: 'Canonical Feature', icon: <Clapperboard size={16} strokeWidth={1.5} />, description: 'Rolled-up metrics per feature/benefit', category: 'input', defaultData: { entityId: '', label: '', payload: {}, metrics: { ad_count: 0, totals: {}, derived: { roas: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0 }, linked_ad_ids: [] }, linkCount: 0 } },
  // Extractor
  { type: 'skeletonExtractorNode', label: 'Structure', icon: <Microscope size={16} strokeWidth={1.5} />, description: 'Analyze the ad', category: 'extractor', defaultData: { status: 'idle', skeleton: [] } },
  // Generators — active
  { type: 'synthesizerNode', label: 'Video Brief Generator', icon: <Clapperboard size={16} strokeWidth={1.5} />, description: 'Structured video brief', category: 'generator', defaultData: { status: 'idle', mode: 'video' } },
  { type: 'synthesizerNode', label: 'Image Brief Generator', icon: <ImageIcon size={16} strokeWidth={1.5} />, description: 'Structured image brief', category: 'generator', defaultData: { status: 'idle', mode: 'image' } },
  { type: 'llmQuestionNode', label: 'Ask AI', icon: <Zap size={16} strokeWidth={1.5} />, description: 'Question + Answer', category: 'generator', defaultData: { status: 'idle', question: '', result: '' } },
  // Generators — coming soon
  { type: 'adCopyPromptNode', label: 'Ad Copy Generator', icon: <Pencil size={16} strokeWidth={1.5} />, description: 'Written ad copy', category: 'generator', defaultData: { status: 'idle', promptOverride: '', result: '' }, comingSoon: true },
  { type: 'hookVariationsNode', label: 'Hook Variations', icon: <Repeat size={16} strokeWidth={1.5} />, description: 'Scroll-stopping openers', category: 'generator', defaultData: { status: 'idle', count: 10, result: '' }, comingSoon: true },
  { type: 'scriptWriterNode', label: 'Script Writer', icon: <Film size={16} strokeWidth={1.5} />, description: 'Shooting script', category: 'generator', defaultData: { status: 'idle', duration: '30', result: '' }, comingSoon: true },
  { type: 'complianceCheckerNode', label: 'Meta Compliance', icon: <ShieldCheck size={16} strokeWidth={1.5} />, description: 'Policy checker', category: 'generator', defaultData: { status: 'idle', adCopy: '', result: '' }, comingSoon: true },
  { type: 'noteNode', label: 'Note', icon: <StickyNote size={16} strokeWidth={1.5} />, description: 'Text block', category: 'generator', defaultData: { text: '' }, comingSoon: true },
];

// ============================================================================
// HELPERS
// ============================================================================

function fmt(v: string) { return v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n) + '…' : s; }

type Tab = 'inputs' | 'outputs';

// ============================================================================
// SIDEBAR
// ============================================================================

interface Props { isOpen: boolean; onToggle: () => void; }

export function CanvasSidebar({ isOpen, onToggle }: Props) {
  const {
    creatives, isLoading, hookGroups, angleGroups, formatGroups, pacingGroups,
    allDesires, allPersonas, allTestingNotes, allFeatures, allHookAnalyses, enrichments,
  } = useCanvasData();

  const enrichedCount = useMemo(() => { let c = 0; enrichments.forEach(e => { if (e.system || e.analysis) c++; }); return c; }, [enrichments]);
  const categories = ['source', 'dna', 'input', 'extractor', 'generator', 'output'] as const;

  // Draggable State - default to a safe off-screen or arbitrary position for SSR
  const [pos, setPos] = useState({ x: 1000, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  // Initialize position to the right side of the screen once mounted
  useEffect(() => {
    setPos({ x: window.innerWidth - 320, y: 140 });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag from empty space or headers, not interactive items inside
    if ((e.target as HTMLElement).closest('[draggable="true"]') || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialPos.current = pos;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setPos({ x: initialPos.current.x + dx, y: initialPos.current.y + dy });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Drag handlers
  const dragNode = (e: React.DragEvent, item: SidebarNodeItem) => {
    e.dataTransfer.setData('application/adlab-node-type', item.type);
    e.dataTransfer.setData('application/adlab-node-data', JSON.stringify(item.defaultData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const dragDna = (e: React.DragEvent, type: 'hookNode' | 'angleNode' | 'formatNode', key: string, dataKey: string, g: DnaGroupMetrics) => {
    e.dataTransfer.setData('application/adlab-node-type', type);
    e.dataTransfer.setData('application/adlab-node-data', JSON.stringify({ [dataKey]: key, avgRoas: g.avgRoas, count: g.count, status: g.status }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const dragPersona = (e: React.DragEvent, p: typeof allPersonas[0], idx: number) => {
    e.dataTransfer.setData('application/adlab-node-type', 'personaNode');
    e.dataTransfer.setData('application/adlab-node-data', JSON.stringify({
      personaIndex: idx,
      ageGenderLocation: p.ageGenderLocation,
      beliefs: p.beliefs,
      desiredStatus: p.desiredStatus,
      dailyStruggles: p.dailyStruggles,
      howProductHelps: p.howProductHelps,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const dragDesire = (e: React.DragEvent, desire: string) => {
    e.dataTransfer.setData('application/adlab-node-type', 'desireNode');
    e.dataTransfer.setData('application/adlab-node-data', JSON.stringify({ desire }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const dragFeature = (e: React.DragEvent, fb: typeof allFeatures[0]) => {
    e.dataTransfer.setData('application/adlab-node-type', 'desireNode');
    e.dataTransfer.setData('application/adlab-node-data', JSON.stringify({
      desire: fb.matchingDesire || fb.benefit,
      feature: fb.feature,
      benefit: fb.benefit,
      coreUSP: fb.coreUSP,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const dragTestingNote = (e: React.DragEvent, note: typeof allTestingNotes[0]) => {
    e.dataTransfer.setData('application/adlab-node-type', 'customPromptNode');
    const prompt = `Test Hypothesis: ${note.testHypothesis}\nVariable: ${note.adVariable}\nAngle/USP: ${note.angleUSP}`;
    e.dataTransfer.setData('application/adlab-node-data', JSON.stringify({ prompt }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const dragHookAnalysis = (e: React.DragEvent, analysis: string) => {
    e.dataTransfer.setData('application/adlab-node-type', 'noteNode');
    e.dataTransfer.setData('application/adlab-node-data', JSON.stringify({ text: `Hook Insight: ${analysis}` }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      {/* ══ Floating Dark Sidebar ══ */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute', top: pos.y, left: pos.x, width: '240px',
          maxHeight: 'calc(100vh - 240px)',
          background: 'rgba(24, 24, 32, 0.96)',
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          boxShadow: isDragging ? '0 16px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' : '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.04) inset',
          zIndex: isDragging ? 25 : 15,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transform: `scale(${isOpen ? 1 : 0.95})`,
          transition: isDragging ? 'none' : 'opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter', -apple-system, sans-serif",
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}>

        {/* ─── Content ─── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 12px 14px',
          scrollbarWidth: 'thin' as const,
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
        }}>

          {/* ═══ INPUTS ═══ Compact list with expandable parent groups */}
          <div style={{
            fontSize: '10px', fontWeight: 700, color: '#2DD4BF',
            textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0 8px 12px',
          }}>Inputs</div>
          <div style={{ marginBottom: '18px' }}>
            {INPUT_ROWS.map(row => {
              if (row.kind === 'node') {
                const item = NODE_LIBRARY.find(n => n.type === row.nodeType);
                if (!item) return null;
                return (
                  <SidebarRow
                    key={row.key}
                    icon={item.icon}
                    label={row.label}
                    description={row.description}
                    accent="#2DD4BF"
                    onDragStart={e => dragNode(e, item)}
                  />
                );
              }
              return <InputGroupRow key={row.key} group={row} />;
            })}
          </div>


          {/* ═══ GENERATORS ═══ */}
          <div style={{
            fontSize: '10px', fontWeight: 700, color: CANVAS_COLORS.generator,
            textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0 8px 12px',
          }}>Generators</div>
          <div style={{ marginBottom: '8px' }}>
            {NODE_LIBRARY.filter(n => n.category === 'generator').map((item, idx) => {
              const disabled = !!item.comingSoon;
              return (
                <div
                  key={`${item.type}-${idx}`}
                  draggable={!disabled}
                  onDragStart={disabled ? undefined : e => dragNode(e, item)}
                  style={{
                    padding: '10px 12px', borderRadius: '12px',
                    cursor: disabled ? 'not-allowed' : 'grab',
                    marginBottom: '2px',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    transition: 'all 0.15s ease', background: 'transparent',
                    border: '1px solid transparent',
                    opacity: disabled ? 0.45 : 1,
                  }}
                  onMouseEnter={e => {
                    if (disabled) return;
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={e => {
                    if (disabled) return;
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: CANVAS_COLORS.generator, width: '22px',
                  }}>{item.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#F4F4F5', letterSpacing: '-0.01em', marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: '#52525B' }}>{item.description}</div>
                  </div>
                  {disabled && (
                    <span style={{
                      fontSize: '8.5px', fontWeight: 600,
                      color: CANVAS_COLORS.textDim,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      padding: '3px 6px', borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.02)',
                      flexShrink: 0,
                    }}>Soon</span>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </>
  );
}

// ============================================================================
// DNA LIST — ranked, draggable
// ============================================================================

function DnaList({ label, groups, nodeType, dataKey, onDrag, q }: {
  label: string; groups: DnaGroupMetrics[];
  nodeType: 'hookNode' | 'angleNode' | 'formatNode'; dataKey: string;
  onDrag: (e: React.DragEvent, t: 'hookNode' | 'angleNode' | 'formatNode', k: string, dk: string, g: DnaGroupMetrics) => void;
  q: string;
}) {
  const filtered = q ? groups.filter(g => g.key.toLowerCase().includes(q)) : groups;
  if (!groups.length) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '9px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 6px 6px' }}>{label}</div>
      {filtered.length === 0 ? (
        <div style={{ padding: '6px 10px', fontSize: '10px', color: '#666', fontStyle: 'italic' }}>No match</div>
      ) : (
        filtered.map((g, i) => (
          <div key={g.key} draggable onDragStart={e => onDrag(e, nodeType, g.key, dataKey, g)} style={{
            padding: '6px 10px', borderRadius: '6px', cursor: 'grab',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.1s ease', marginBottom: '2px', border: '1px solid transparent',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '9px', color: '#52525b', fontFamily: "'SF Mono', monospace", width: '16px', textAlign: 'right' }}>{i + 1}</span>
              <DnaStatusDot status={g.status} />
              <span style={{ fontSize: '11px', color: '#EDEDED', fontWeight: 500 }}>{fmt(g.key)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RoasLabel roas={g.avgRoas} />
              <span style={{ fontSize: '9px', color: '#737373', fontFamily: "'SF Mono', monospace" }}>{g.count}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================================
// ACCORDION
// ============================================================================

function Accordion({ label, count, defaultOpen, children }: {
  label: string; count: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{ marginBottom: '12px' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px', borderRadius: '6px', border: 'none',
        background: 'transparent', cursor: 'pointer', outline: 'none', transition: 'background 0.1s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#EDEDED' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: '#737373', fontFamily: "'SF Mono', monospace" }}>{count}</span>
          <span style={{ fontSize: '8px', color: '#737373', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.12s ease' }}>▾</span>
        </div>
      </button>
      {open && <div style={{ padding: '4px 0 0' }}>{children}</div>}
    </div>
  );
}

// ============================================================================
// PRIMITIVES
// ============================================================================

function DnaStatusDot({ status }: { status: string }) {
  const c = status === 'top' ? '#06D6A0' : status === 'good' ? '#3B82F6' : status === 'trending' ? '#F59E0B' : '#EF4444';
  return <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c, flexShrink: 0 }} />;
}

function RoasLabel({ roas }: { roas: number }) {
  const c = roas >= 2 ? '#06D6A0' : roas >= 1 ? '#F59E0B' : '#EF4444';
  return <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: "'SF Mono', monospace", color: c }}>{roas.toFixed(1)}x</span>;
}

function SmRow({ label, value }: { label: string; value: string }) {
  return <div style={{ fontSize: '10px', color: '#71717a', lineHeight: 1.4, marginBottom: '2px' }}><span style={{ color: '#52525b' }}>{label}: </span>{trunc(value, 55)}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '28px 10px', textAlign: 'center', color: '#71717a', fontSize: '11px', lineHeight: 1.6 }}>{children}</div>;
}

// ============================================================================
// UNIFIED SIDEBAR ROW — identical visual treatment for sources AND datapoints
// ============================================================================

// Parent group definition: a compact row that expands to reveal related
// fine-grained extraction datapoints as indented sub-rows.
interface InputGroupDef {
  kind: 'group';
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  // First category is the "default" — dragging the parent row drops this.
  categories: Array<ExtractedEnumCategory | ExtractedTextCategory>;
}

interface InputNodeDef {
  kind: 'node';
  key: string;
  label: string;
  description: string;
  nodeType: SidebarNodeItem['type'];
}

type InputRowDef = InputGroupDef | InputNodeDef;

// Compact list — same shape as the original design, with parent groups that
// expand into related fine-grained datapoints.
const INPUT_ROWS: InputRowDef[] = [
  { kind: 'node', key: 'creative', label: 'Creative', description: 'Select an ad', nodeType: 'vaultCreativeNode' },
  { kind: 'node', key: 'url', label: 'URL', description: 'Link to an ad', nodeType: 'urlNode' },
  { kind: 'node', key: 'brand', label: 'Brand', description: 'Company context', nodeType: 'brandProfileNode' },
  {
    kind: 'group', key: 'hook', label: 'Hook', description: 'Opening text / visual',
    icon: <Magnet size={16} strokeWidth={1.5} />, accent: '#4ECDC4',
    categories: ['hookType', 'hookText', 'hookExplanation', 'spokenHook'],
  },
  {
    kind: 'group', key: 'angle', label: 'Angle', description: 'Marketing angle',
    icon: <Target size={16} strokeWidth={1.5} />, accent: '#F59E0B',
    categories: ['angle', 'trueAngle', 'angleExplanation'],
  },
  {
    kind: 'group', key: 'format', label: 'Format', description: 'Creative type',
    icon: <Clapperboard size={16} strokeWidth={1.5} />, accent: '#45B7D1',
    categories: ['adStructure', 'format', 'videoType', 'visualPacing', 'productionTier', 'formatExplanation'],
  },
  {
    kind: 'group', key: 'audience', label: 'Audience', description: 'Who this connects with',
    icon: <Users size={16} strokeWidth={1.5} />, accent: '#E879F9',
    categories: ['personaArchetype', 'personaDescription', 'painPoints', 'desiredOutcome', 'emotionalDriver', 'awarenessLevel'],
  },
  {
    kind: 'group', key: 'copy', label: 'Copy', description: 'Headline & body',
    icon: <FileText size={16} strokeWidth={1.5} />, accent: '#38BDF8',
    categories: ['headlineCopy', 'bodyCopy', 'ctaCopy', 'copywritingFramework', 'ctaType'],
  },
  {
    kind: 'group', key: 'proof', label: 'Proof', description: 'Social & product evidence',
    icon: <Award size={16} strokeWidth={1.5} />, accent: '#FFD700',
    categories: ['proofElements', 'productShown', 'urgency', 'summary'],
  },
  { kind: 'node', key: 'instructions', label: 'Instructions', description: 'Add guidelines', nodeType: 'customPromptNode' },
  { kind: 'node', key: 'structure', label: 'Structure', description: 'Analyze the ad', nodeType: 'skeletonExtractorNode' },
];

function SidebarRow({ icon, label, description, accent, onDragStart, onClick }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  accent: string;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
}) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        padding: '10px 12px', borderRadius: '12px', cursor: onDragStart ? 'grab' : 'pointer',
        marginBottom: '2px',
        display: 'flex', alignItems: 'center', gap: '14px',
        transition: 'all 0.15s ease', background: 'transparent',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: '#F4F4F5', width: '22px',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#F4F4F5', letterSpacing: '-0.01em', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#52525B' }}>{description}</div>
      </div>
    </div>
  );
}

// Drops an empty extractedDataNode — the node itself shows the picker first,
// then swaps to an editable text box once the user selects a value.
function startExtractedDrag(
  e: React.DragEvent,
  category: string,
  meta: { label: string; accent: string },
) {
  e.dataTransfer.setData('application/adlab-node-type', 'extractedDataNode');
  e.dataTransfer.setData('application/adlab-node-data', JSON.stringify({
    category,
    label: meta.label,
    value: '',
    accentColor: meta.accent,
  }));
  e.dataTransfer.effectAllowed = 'move';
}

// Compact parent row (e.g. "Hook") with a chevron that expands to reveal
// fine-grained sub-datapoints (Hook Type, Hook Text, Hook Explanation…).
// Dragging the parent drops the default (first) category pre-filled with
// the top-ROAS extracted value.
function InputGroupRow({ group }: { group: InputGroupDef }) {
  const { extracted } = useCanvasData();
  const [open, setOpen] = useState(false);

  const defaultCat = group.categories[0];
  const defaultMeta = EXTRACTED_CATEGORY_META[defaultCat];

  const description = group.description;

  const onParentDragStart = (e: React.DragEvent) => {
    if (!defaultMeta) return;
    startExtractedDrag(e, defaultCat, { label: defaultMeta.label, accent: group.accent });
  };

  return (
    <div>
      <div
        draggable
        onDragStart={onParentDragStart}
        style={{
          padding: '10px 12px', borderRadius: '12px', cursor: 'grab',
          marginBottom: '2px',
          display: 'flex', alignItems: 'center', gap: '14px',
          transition: 'all 0.15s ease', background: 'transparent',
          border: '1px solid transparent',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, width: '22px',
          color: '#F4F4F5',
        }}>{group.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#F4F4F5', letterSpacing: '-0.01em', marginBottom: '2px' }}>{group.label}</div>
          <div style={{ fontSize: '11px', color: '#52525B' }}>{description}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setOpen(!open); }}
          onMouseDown={e => e.stopPropagation()}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px',
            fontSize: '10px', color: open ? group.accent : '#52525B', outline: 'none',
            transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease, color 0.15s ease',
          }}
        >▾</button>
      </div>

      {/* Expanded sub-datapoints */}
      {open && (
        <div style={{
          padding: '2px 0 8px 14px', marginBottom: '4px',
          borderLeft: `1px solid ${group.accent}12`, marginLeft: '16px',
        }}>
          {group.categories.map(cat => {
            const meta = EXTRACTED_CATEGORY_META[cat];
            if (!meta) return null;
            return <InputSubRow key={cat} category={cat} meta={meta} parentAccent={group.accent} />;
          })}
        </div>
      )}
    </div>
  );
}

// Indented sub-row inside an expanded parent group. Compact — small icon,
// label, and "N extracted" count. Drag drops a pre-filled text-box node.
function InputSubRow({ category, meta, parentAccent }: {
  category: ExtractedEnumCategory | ExtractedTextCategory;
  meta: { icon: React.ReactNode; label: string; accent: string; kind: 'enum' | 'text' };
  parentAccent: string;
}) {
  const { extracted } = useCanvasData();

  const count = useMemo(() => {
    if (meta.kind === 'enum') return extracted.enums[category as ExtractedEnumCategory]?.length || 0;
    return extracted.texts[category as ExtractedTextCategory]?.length || 0;
  }, [category, meta.kind, extracted]);

  const onDragStart = (e: React.DragEvent) => {
    startExtractedDrag(e, category, meta);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        padding: '6px 10px', borderRadius: '8px', cursor: 'grab',
        marginBottom: '1px',
        display: 'flex', alignItems: 'center', gap: '10px',
        transition: 'all 0.12s ease', background: 'transparent',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, width: '18px', color: '#F4F4F5',
      }}>{meta.icon}</span>
      <span style={{ flex: 1, fontSize: '11px', fontWeight: 500, color: '#D4D4D8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.label}</span>
      <span style={{ fontSize: '9px', color: count > 0 ? parentAccent : '#3F3F46', fontFamily: "'SF Mono', monospace", fontWeight: 600 }}>
        {count > 0 ? count : '—'}
      </span>
    </div>
  );
}
