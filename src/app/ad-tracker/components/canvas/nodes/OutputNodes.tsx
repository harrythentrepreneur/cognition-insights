'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Node, type Edge } from '@xyflow/react';
import { CANVAS_COLORS, HANDLE_STYLE, INPUT_STYLE, getNodeStyle, getNodeHeaderStyle } from '../canvasTheme';
import { resolveInputs, hydrateResolvedInputs, executeSynthesis, executeTextGeneration, LLM_MODELS, DEFAULT_LLM_MODEL_ID, type ResolvedInputs } from '../canvasExecutor';
import type { BriefSection } from '../canvasTypes';

// ============================================================================
// VIDEO BRIEF GENERATOR — All-in-one smart node
// ============================================================================

const SLOT_CFG: Record<string, { icon: string; color: string }> = {
  hook: { icon: '🪝', color: '#4ECDC4' }, angle: { icon: '🎯', color: '#F59E0B' },
  body: { icon: '📝', color: '#A855F7' }, cta: { icon: '🚀', color: '#FF6B6B' },
};

function fmtTime(sec: number) { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${s.toString().padStart(2, '0')}`; }
function fmt(val: string) { return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

export function SynthesizerNode({ id, data, selected }: NodeProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { getNodes, getEdges, setNodes, setEdges, updateNodeData } = useReactFlow();
  const accent = CANVAS_COLORS.generator;

  // Inline result data
  const justification = data?.justification as string | undefined;
  const sections = (data?.sections as BriefSection[]) || [];
  const selectedModel = (data?.model as string) || 'gemini-2.5-flash-preview-04-17';
  const promptOverride = (data?.promptOverride as string) || '';

  // Count connected inputs
  const inputSummary = useMemo(() => {
    try {
      const nodes = getNodes();
      const edges = getEdges();
      const incoming = edges.filter(e => e.target === id);
      const inputNodes = incoming.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);
      const types = new Set(inputNodes.map(n => n?.type));
      return {
        count: inputNodes.length,
        hasHook: types.has('hookNode'),
        hasAngle: types.has('angleNode'),
        hasFormat: types.has('formatNode'),
        hasPersona: types.has('personaNode'),
        hasDesire: types.has('desireNode'),
        hasPrompt: types.has('customPromptNode'),
        hasBrand: types.has('brandProfileNode'),
        hasSkeleton: types.has('skeletonExtractorNode'),
        hasVault: types.has('vaultCreativeNode'),
        hasExtracted: types.has('extractedDataNode'),
      };
    } catch {
      return { count: 0, hasHook: false, hasAngle: false, hasFormat: false, hasPersona: false, hasDesire: false, hasPrompt: false, hasBrand: false, hasSkeleton: false, hasVault: false, hasExtracted: false };
    }
  }, [id, getNodes, getEdges]);

  const handleRun = useCallback(async () => {
    if (status === 'running') return;
    setStatus('running'); setError('');
    try {
      const nodes = getNodes();
      const edges = getEdges();
      let inputs = resolveInputs(id, nodes, edges);
      if (!inputs) throw new Error('Connect at least one input node');
      // Fill in any vault-creative extraction data missing from localStorage
      inputs = await hydrateResolvedInputs(inputs, id, nodes, edges);
      const opts: { model?: string; promptOverride?: string } = {};
      if (selectedModel && selectedModel !== 'gemini-2.5-flash-preview-04-17') opts.model = selectedModel;
      if (promptOverride.trim()) opts.promptOverride = promptOverride;
      const brief = await executeSynthesis(inputs, Object.keys(opts).length > 0 ? opts : undefined);
      updateNodeData(id, { justification: brief.justification, sections: brief.sections });

      // Auto-spawn or update a connected BriefOutputNode
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const selfNode = currentNodes.find(n => n.id === id);
      const outEdge = currentEdges.find(e => e.source === id && currentNodes.find(n => n.id === e.target)?.type === 'briefOutputNode');
      
      if (outEdge) {
        // Update existing output node
        updateNodeData(outEdge.target, { justification: brief.justification, sections: brief.sections });
      } else if (selfNode) {
        // Spawn new output node to the right
        const outputId = `brief-out-${Date.now()}`;
        const newNode: Node = {
          id: outputId,
          type: 'briefOutputNode',
          position: { x: (selfNode.position?.x ?? 0) + 320, y: (selfNode.position?.y ?? 0) - 20 },
          data: { justification: brief.justification, sections: brief.sections },
        };
        const newEdge: Edge = {
          id: `e-${id}-${outputId}`,
          source: id,
          target: outputId,
          sourceHandle: 'brief-out',
          targetHandle: 'brief-in',
          animated: true,
          style: { stroke: 'rgba(168,85,247,0.25)', strokeWidth: 1.2 },
        };
        setNodes(nds => [...nds, newNode]);
        setEdges(eds => [...eds, newEdge]);
      }

      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStatus('error');
    }
  }, [id, status, getNodes, getEdges, updateNodeData]);

  const handleCopy = useCallback(() => {
    if (sections.length === 0) return;
    const lines: string[] = ['═══ CREATIVE BRIEF ═══', ''];
    if (justification) lines.push(`💡 STRATEGY: ${justification}`, '');
    lines.push('─── SECTIONS ───', '');
    sections.forEach(s => {
      lines.push(`[${fmtTime(s.startSec)}–${fmtTime(s.endSec)}] ${s.slotType.toUpperCase()} — ${fmt(s.tagUsed)}`);
      lines.push(`  🎥 Visual: ${s.visual}`);
      lines.push(`  🎤 Audio: ${s.audio}`);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [sections, justification]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), width: '280px' }}>
      <Handle type="target" position={Position.Left} id="synth-in" style={HANDLE_STYLE} />

      {/* Header */}
      <div style={{ ...getNodeHeaderStyle(accent), justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${accent}0a`, border: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>⚡</span>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Video Brief Generator</div>
            <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>
              {status === 'done' ? `${sections.length} sections ✓` : status === 'running' ? 'Generating...' : `${inputSummary.count} inputs`}
            </div>
          </div>
        </div>
        {sections.length > 0 && (
          <button onClick={handleCopy} className="nodrag" style={{
            padding: '2px 6px', borderRadius: '4px',
            background: copied ? 'rgba(6,214,160,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${copied ? 'rgba(6,214,160,0.12)' : 'rgba(255,255,255,0.04)'}`,
            color: copied ? '#06D6A0' : CANVAS_COLORS.textMuted, fontSize: '8px', fontWeight: 600,
            cursor: 'pointer', outline: 'none', transition: 'all 0.12s ease',
          }}>{copied ? '✓ Copied' : '⎘ Copy'}</button>
        )}
        <button onClick={() => setShowSettings(s => !s)} className="nodrag" style={{
          padding: '2px 6px', borderRadius: '4px',
          background: showSettings ? `${accent}10` : 'rgba(255,255,255,0.02)',
          border: `1px solid ${showSettings ? `${accent}25` : 'rgba(255,255,255,0.04)'}`,
          color: showSettings ? `${accent}cc` : CANVAS_COLORS.textMuted, fontSize: '8px', fontWeight: 600,
          cursor: 'pointer', outline: 'none', transition: 'all 0.12s ease',
        }}>⚙</button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="nodrag nowheel" style={{ margin: '0 8px', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '6px' }}>
          <div style={{ fontSize: '7.5px', fontWeight: 700, color: CANVAS_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Settings</div>

          {/* Model Selector */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted, marginBottom: '3px' }}>Model</div>
            <select
              className="nodrag"
              value={selectedModel}
              onChange={e => updateNodeData(id, { model: e.target.value })}
              style={{
                ...INPUT_STYLE, width: '100%', fontSize: '8.5px', padding: '4px 6px',
                fontFamily: "'SF Mono', monospace", cursor: 'pointer',
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%2371717A'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
              }}
            >
              <option value="gemini-2.5-flash-preview-04-17">Gemini 2.5 Flash (fast)</option>
              <option value="gemini-2.5-pro-preview-05-06">Gemini 2.5 Pro (quality)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (legacy)</option>
            </select>
          </div>

          {/* Prompt Override */}
          <div>
            <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted, marginBottom: '3px' }}>System Prompt Override</div>
            <textarea
              className="nodrag nowheel"
              placeholder="Leave empty to use default prompt. Paste a custom prompt to fully override the system prompt..."
              value={promptOverride}
              onChange={e => updateNodeData(id, { promptOverride: e.target.value })}
              style={{ ...INPUT_STYLE, minHeight: '60px', resize: 'vertical', fontSize: '8px', fontFamily: "'SF Mono', monospace", lineHeight: 1.5 }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '6px 10px 8px' }}>
        {inputSummary.count > 0 && status !== 'running' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
            {inputSummary.hasHook && <InputPill label="Hook" color="#4ECDC4" />}
            {inputSummary.hasAngle && <InputPill label="Angle" color="#F59E0B" />}
            {inputSummary.hasFormat && <InputPill label="Format" color="#45B7D1" />}
            {inputSummary.hasPersona && <InputPill label="Persona" color="#E879F9" />}
            {inputSummary.hasDesire && <InputPill label="Desire" color="#FB923C" />}
            {inputSummary.hasPrompt && <InputPill label="Prompt" color="#38BDF8" />}
            {inputSummary.hasBrand && <InputPill label="Brand" color="#A855F7" />}
            {inputSummary.hasSkeleton && <InputPill label="Skeleton" color="#3B82F6" />}
          </div>
        )}
        {error && (
          <div style={{ padding: '4px 6px', borderRadius: '5px', marginBottom: '4px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)', color: '#EF4444', fontSize: '8px', lineHeight: 1.4 }}>{error}</div>
        )}
        <button onClick={handleRun} disabled={status === 'running'} className="nodrag" style={{
          width: '100%', padding: '6px', borderRadius: '4px', background: status === 'running' ? `${accent}03` : `${accent}15`,
          border: `1px solid ${accent}${status === 'running' ? '08' : '30'}`, color: `${accent}dd`,
          fontSize: '9px', fontWeight: 700, cursor: status === 'running' ? 'not-allowed' : 'pointer', transition: 'all 0.1s',
        }}>
          {status === 'running' ? '⟳ Generating...' : sections.length > 0 ? '↻ Regenerate' : '▶ Generate Brief'}
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="brief-out" style={HANDLE_STYLE} />
    </div>
  );
}

function InputPill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: '1px 5px', borderRadius: '3px', fontSize: '7.5px', fontWeight: 600,
      background: `${color}08`, color: `${color}bb`, border: `1px solid ${color}0c`,
    }}>{label}</span>
  );
}

// ============================================================================
// AD COPY PROMPT NODE (Generator Layer)
// ============================================================================

function buildAdCopyPrompt(inputs: ResolvedInputs | null) {
  if (!inputs) return 'Connect inputs to compile a smart prompt...';
  let context = 'You are a direct response copywriter. Use ONLY the context below — do not invent products, features, claims, or audience details. Write 3 strong primary text variations and 3 hooky headlines grounded in these constraints:\n\n';
  if (inputs.brandContext?.productName) {
    context += `Product: ${inputs.brandContext.productName}\nTarget: ${inputs.brandContext.targetAudience}\nVoice: ${inputs.brandContext.brandVoice}\n\n`;
  }
  if (inputs.persona) {
    context += `Audience Persona:\nDemographics: ${inputs.persona.ageGenderLocation}\nStruggles: ${inputs.persona.dailyStruggles}\nBeliefs: ${inputs.persona.beliefs}\n\n`;
  }
  if (inputs.angle) context += `Marketing Angle: ${inputs.angle.replace(/_/g, ' ')}\n`;
  if (inputs.hookType) context += `Hook/Opener Focus: ${inputs.hookType.replace(/_/g, ' ')}\n`;
  if (inputs.desires?.length) context += `Core Desires: ${inputs.desires.join(', ')}\n`;
  if (inputs.customPrompts?.length) context += `Additional Context: ${inputs.customPrompts.join(', ')}\n`;
  if (inputs.extractedContext?.length) {
    context += '\nExtracted Datapoints:\n';
    for (const d of inputs.extractedContext) context += `- ${d.label}: ${d.value}\n`;
  }
  return context;
}

export function AdCopyPromptNode({ id, data, selected }: NodeProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const { getNodes, getEdges, updateNodeData } = useReactFlow();
  const accent = CANVAS_COLORS.generator;

  // Real-time compute of the base prompt
  const basePrompt = useMemo(() => {
    try {
      const inputs = resolveInputs(id, getNodes(), getEdges());
      return buildAdCopyPrompt(inputs);
    } catch { return 'Connect inputs to compile prompt...'; }
  }, [id, getNodes, getEdges]);

  const promptOverride = data?.promptOverride as string | undefined;
  const result = data?.result as string | undefined;
  const currentPrompt = promptOverride !== undefined ? promptOverride : basePrompt;

  const handleRun = useCallback(async () => {
    if (status === 'running') return;
    setStatus('running'); setError('');
    try {
      // Hydrate vault creatives from DB then rebuild prompt (unless user has overridden it)
      let finalPrompt = currentPrompt;
      if (promptOverride === undefined) {
        const nodes = getNodes();
        const edges = getEdges();
        let inputs = resolveInputs(id, nodes, edges);
        if (inputs) inputs = await hydrateResolvedInputs(inputs, id, nodes, edges);
        finalPrompt = buildAdCopyPrompt(inputs);
      }
      if (!finalPrompt || finalPrompt.includes('Connect inputs')) throw new Error('Need inputs to generate.');
      const resText = await executeTextGeneration(finalPrompt);
      updateNodeData(id, { result: resText });
      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStatus('error');
    }
  }, [id, currentPrompt, promptOverride, status, getNodes, getEdges, updateNodeData]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), width: '280px' }}>
      <Handle type="target" position={Position.Left} id="in" style={HANDLE_STYLE} />
      <div style={getNodeHeaderStyle(accent)}>
        <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${accent}0a`, border: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>📝</span>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Ad Copy Generator</div>
          <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>AI Text Assembly</div>
        </div>
      </div>
      
      {/* Prompt Editor */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: '8px', fontWeight: 600, color: CANVAS_COLORS.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prompt</div>
        <textarea 
          className="nodrag nowheel" 
          value={currentPrompt} 
          onChange={e => updateNodeData(id, { promptOverride: e.target.value })}
          style={{ ...INPUT_STYLE, minHeight: '80px', resize: 'vertical', fontSize: '8.5px', fontFamily: "'SF Mono', monospace", lineHeight: 1.5, marginBottom: '6px' }}
        />
        {error && <div style={{ fontSize: '8px', color: '#EF4444', marginBottom: '4px' }}>{error}</div>}
        <button onClick={handleRun} disabled={status === 'running'} className="nodrag" style={{
          width: '100%', padding: '6px', borderRadius: '4px', background: status === 'running' ? `${accent}03` : `${accent}15`,
          border: `1px solid ${accent}${status === 'running' ? '08' : '30'}`, color: `${accent}dd`,
          fontSize: '9px', fontWeight: 700, cursor: status === 'running' ? 'not-allowed' : 'pointer', transition: 'all 0.1s',
        }}>
          {status === 'running' ? 'Generating...' : result ? '✓ Re-generate' : '▶ Generate Copy'}
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div className="nodrag nowheel" style={{ 
          margin: '0 8px 8px', padding: '8px', borderRadius: '6px', 
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          maxHeight: '200px', overflowY: 'auto' 
        }}>
          <div style={{ fontSize: '8px', fontWeight: 600, color: accent, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Output</div>
          <div style={{ fontSize: '9px', color: CANVAS_COLORS.textPrimary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="out" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// LLM QUESTION NODE (Generator Layer)
// ============================================================================

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      parts.push(<strong key={key++} style={{ color: CANVAS_COLORS.textPrimary, fontWeight: 700 }}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      parts.push(<code key={key++} style={{ background: 'rgba(255,255,255,0.06)', padding: '0 3px', borderRadius: '3px', fontSize: '0.9em' }}>{match[3]}</code>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MarkdownLite({ text, accent }: { text: string; accent: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key++} style={{ margin: '4px 0 8px', paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ color: CANVAS_COLORS.textSecondary, lineHeight: 1.55 }}>{renderInline(b)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushBullets(); continue; }

    const bulletMatch = line.match(/^\s*[*\-•]\s+(.*)$/);
    if (bulletMatch) { bullets.push(bulletMatch[1]); continue; }
    flushBullets();

    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    const boldOnly = line.match(/^\*\*(.+?):?\*\*:?\s*$/);
    if (headingMatch || boldOnly) {
      const htext = (headingMatch?.[1] || boldOnly?.[1] || '').replace(/:$/, '');
      blocks.push(
        <div key={key++} style={{
          fontSize: '10px', fontWeight: 700, color: accent,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginTop: blocks.length ? '10px' : '0', marginBottom: '4px',
        }}>{htext}</div>
      );
      continue;
    }

    blocks.push(
      <div key={key++} style={{ color: CANVAS_COLORS.textSecondary, lineHeight: 1.55, marginBottom: '6px' }}>
        {renderInline(line)}
      </div>
    );
  }
  flushBullets();
  return <>{blocks}</>;
}


export function LlmQuestionNode({ id, data, selected }: NodeProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { getNodes, getEdges, updateNodeData } = useReactFlow();
  const accent = CANVAS_COLORS.generator;

  const question = (data?.question as string) || '';
  const result = (data?.result as string) || '';
  const modelId = (data?.modelId as string) || DEFAULT_LLM_MODEL_ID;

  const handleRun = useCallback(async () => {
    if (status === 'running') return;
    setStatus('running'); setError('');
    try {
      const nodes = getNodes();
      const edges = getEdges();
      let inputs = resolveInputs(id, nodes, edges);
      if (inputs) inputs = await hydrateResolvedInputs(inputs, id, nodes, edges);
      let contextStr = '';
      if (inputs) {
        if (inputs.angle) contextStr += `Angle: ${inputs.angle}\n`;
        if (inputs.hookType) contextStr += `Hook: ${inputs.hookType}\n`;
        if (inputs.persona) contextStr += `Audience: ${inputs.persona.ageGenderLocation} - Wants: ${inputs.persona.desiredStatus}\n`;
        if (inputs.brandContext) contextStr += `Brand: ${inputs.brandContext.productName}\n`;
        if (inputs.extractedContext?.length) {
          contextStr += '\nExtracted data:\n';
          for (const d of inputs.extractedContext) contextStr += `- ${d.label}: ${d.value}\n`;
        }
      }

      const p = `Use ONLY the context below to answer. Do not invent facts.\n\nCONTEXT:\n${contextStr}\n\nQUESTION:\n${question}\n\nBe concise, strategic, and practical.`;

      const resText = await executeTextGeneration(p, { modelId });
      updateNodeData(id, { result: resText });
      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStatus('error');
    }
  }, [id, question, modelId, status, getNodes, getEdges, updateNodeData]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), width: '340px' }}>
      <Handle type="target" position={Position.Left} id="in" style={HANDLE_STYLE} />
      <div style={{ ...getNodeHeaderStyle(accent), justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${accent}0a`, border: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>💬</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Ask AI</div>
            <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>Context-aware Q&A</div>
          </div>
        </div>
        <select
          className="nodrag"
          value={modelId}
          onChange={e => updateNodeData(id, { modelId: e.target.value })}
          title="Model"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '5px',
            color: CANVAS_COLORS.textSecondary,
            fontSize: '8px',
            fontWeight: 500,
            padding: '3px 4px',
            outline: 'none',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
            maxWidth: '96px',
          }}
        >
          {LLM_MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
      
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: '8px', fontWeight: 600, color: CANVAS_COLORS.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Question</div>
        <textarea 
          placeholder="Ask a question about the connected context..." 
          className="nodrag nowheel" 
          value={question} 
          onChange={e => updateNodeData(id, { question: e.target.value })}
          style={{ ...INPUT_STYLE, minHeight: '60px', resize: 'vertical', fontSize: '9px', marginBottom: '6px' }}
        />
        {error && <div style={{ fontSize: '8px', color: '#EF4444', marginBottom: '4px' }}>{error}</div>}
        <button onClick={handleRun} disabled={status === 'running' || !question.trim()} className="nodrag" style={{
          width: '100%', padding: '6px', borderRadius: '4px', background: status === 'running' ? `${accent}03` : `${accent}15`,
          border: `1px solid ${accent}${status === 'running' ? '08' : '30'}`, color: `${accent}dd`,
          fontSize: '9px', fontWeight: 700, cursor: (status === 'running' || !question.trim()) ? 'not-allowed' : 'pointer',
        }}>
          {status === 'running' ? 'Asking...' : '▶ Get Answer'}
        </button>
      </div>

      {result && (
        <div className="nodrag nowheel" style={{
          margin: '0 8px 8px', padding: '10px 12px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
          maxHeight: '320px', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '8px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Answer</div>
            <button
              onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
              className="nodrag"
              style={{
                background: 'transparent', border: `1px solid ${accent}30`, color: `${accent}dd`,
                borderRadius: '4px', padding: '2px 6px', fontSize: '8px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: '10px', color: CANVAS_COLORS.textSecondary, fontFamily: "'Inter', sans-serif" }}>
            <MarkdownLite text={result} accent={accent} />
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="out" style={HANDLE_STYLE} />
    </div>
  );
}



// ============================================================================
// HOOK VARIATIONS GENERATOR
// ============================================================================

export function HookVariationsNode({ id, data, selected }: NodeProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const { getNodes, getEdges, updateNodeData } = useReactFlow();
  const accent = CANVAS_COLORS.generator;
  const result = (data?.result as string) || '';
  const count = (data?.count as number) || 10;

  const handleRun = useCallback(async () => {
    if (status === 'running') return;
    setStatus('running'); setError('');
    try {
      const nodes = getNodes();
      const edges = getEdges();
      let inputs = resolveInputs(id, nodes, edges);
      if (inputs) inputs = await hydrateResolvedInputs(inputs, id, nodes, edges);
      let ctx = '';
      if (inputs?.hookType) ctx += `Base hook style: ${inputs.hookType.replace(/_/g, ' ')}\n`;
      if (inputs?.angle) ctx += `Angle: ${inputs.angle.replace(/_/g, ' ')}\n`;
      if (inputs?.persona) ctx += `Target: ${inputs.persona.ageGenderLocation}\nStruggles: ${inputs.persona.dailyStruggles}\n`;
      if (inputs?.brandContext) ctx += `Product: ${inputs.brandContext.productName}\n`;
      if (inputs?.desires?.length) ctx += `Desires: ${inputs.desires.join(', ')}\n`;
      if (inputs?.extractedContext?.length) {
        ctx += '\nExtracted datapoints:\n';
        for (const d of inputs.extractedContext) ctx += `- ${d.label}: ${d.value}\n`;
      }

      const prompt = `You are a world-class direct response copywriter specializing in scroll-stopping hooks for paid social ads.\n\nUse ONLY the context below. Do not invent products, claims, features, or audience details that are not listed.\n\n${ctx ? `CONTEXT:\n${ctx}\n` : ''}Generate exactly ${count} unique hook variations grounded in the context above. Each hook is a single opening line (1-2 sentences max) designed to stop the scroll on Meta/TikTok.\n\nMix these archetypes: curiosity gaps, bold claims, pattern interrupts, questions, story openers, contrarian statements, social proof. Number each hook 1-${count}. No fluff.`;

      const resText = await executeTextGeneration(prompt);
      updateNodeData(id, { result: resText });
      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStatus('error');
    }
  }, [id, count, status, getNodes, getEdges, updateNodeData]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), width: '280px' }}>
      <Handle type="target" position={Position.Left} id="in" style={HANDLE_STYLE} />
      <div style={getNodeHeaderStyle(accent)}>
        <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${accent}0a`, border: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{'\ud83e\ude9d'}</span>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Hook Variations</div>
          <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>Scroll-stopping openers</div>
        </div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>Count</div>
          <select className="nodrag" value={count} onChange={e => updateNodeData(id, { count: Number(e.target.value) })}
            style={{ ...INPUT_STYLE, width: '50px', fontSize: '8.5px', padding: '2px 4px', cursor: 'pointer' }}>
            {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {error && <div style={{ fontSize: '8px', color: '#EF4444', marginBottom: '4px' }}>{error}</div>}
        <button onClick={handleRun} disabled={status === 'running'} className="nodrag" style={{
          width: '100%', padding: '6px', borderRadius: '4px', background: status === 'running' ? `${accent}03` : `${accent}15`,
          border: `1px solid ${accent}${status === 'running' ? '08' : '30'}`, color: `${accent}dd`,
          fontSize: '9px', fontWeight: 700, cursor: status === 'running' ? 'not-allowed' : 'pointer',
        }}>
          {status === 'running' ? 'Generating...' : result ? '\u2713 Regenerate' : `\u25b6 Generate ${count} Hooks`}
        </button>
      </div>
      {result && (
        <div className="nodrag nowheel" style={{ margin: '0 8px 8px', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', maxHeight: '220px', overflowY: 'auto' }}>
          <div style={{ fontSize: '8px', fontWeight: 600, color: accent, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hooks</div>
          <div style={{ fontSize: '9px', color: CANVAS_COLORS.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}
      <Handle type="source" position={Position.Right} id="out" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// SCRIPT WRITER GENERATOR
// ============================================================================

export function ScriptWriterNode({ id, data, selected }: NodeProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const { getNodes, getEdges, updateNodeData } = useReactFlow();
  const accent = CANVAS_COLORS.generator;
  const result = (data?.result as string) || '';
  const duration = (data?.duration as string) || '30';

  const handleRun = useCallback(async () => {
    if (status === 'running') return;
    setStatus('running'); setError('');
    try {
      const nodes = getNodes();
      const edges = getEdges();
      let inputs = resolveInputs(id, nodes, edges);
      if (inputs) inputs = await hydrateResolvedInputs(inputs, id, nodes, edges);
      let ctx = '';
      if (inputs?.hookType) ctx += `Hook: ${inputs.hookType.replace(/_/g, ' ')}\n`;
      if (inputs?.angle) ctx += `Angle: ${inputs.angle.replace(/_/g, ' ')}\n`;
      if (inputs?.format) ctx += `Format: ${inputs.format.replace(/_/g, ' ')}\n`;
      if (inputs?.persona) ctx += `Audience: ${inputs.persona.ageGenderLocation}\nStruggles: ${inputs.persona.dailyStruggles}\nDesires: ${inputs.persona.desiredStatus}\n`;
      if (inputs?.brandContext) ctx += `Product: ${inputs.brandContext.productName}\nVoice: ${inputs.brandContext.brandVoice}\n`;
      if (inputs?.desires?.length) ctx += `Key desires: ${inputs.desires.join(', ')}\n`;
      if (inputs?.customPrompts?.length) ctx += `Notes: ${inputs.customPrompts.join(', ')}\n`;
      if (inputs?.extractedContext?.length) {
        ctx += '\nExtracted datapoints:\n';
        for (const d of inputs.extractedContext) ctx += `- ${d.label}: ${d.value}\n`;
      }

      const prompt = `You are a world-class UGC/performance ad scriptwriter. Write a complete, word-for-word shooting script for a ${duration}-second paid social ad.\n\nUse ONLY the creative brief below. Do not invent product names, features, claims, or audience details that are not listed.\n\nCREATIVE BRIEF:\n${ctx || '(none provided)'}\n\nFormat the script as a table with columns:\n- TIMECODE (e.g. 0:00-0:03)\n- VISUAL (camera direction, B-roll, text overlays)\n- VOICEOVER / AUDIO (exact words to say, sound effects)\n\nRules:\n- Write EXACT dialogue, not descriptions\n- Include specific text overlay copy\n- Note camera angles (close-up, wide, POV)\n- Mark transitions (cut, dissolve)\n- Be authentic to the ${inputs?.format?.replace(/_/g, ' ') || 'UGC'} format\n- End with a clear, urgent CTA grounded in the brief`;

      const resText = await executeTextGeneration(prompt);
      updateNodeData(id, { result: resText });
      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStatus('error');
    }
  }, [id, duration, status, getNodes, getEdges, updateNodeData]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), width: '280px' }}>
      <Handle type="target" position={Position.Left} id="in" style={HANDLE_STYLE} />
      <div style={getNodeHeaderStyle(accent)}>
        <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${accent}0a`, border: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{'\ud83c\udfac'}</span>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Script Writer</div>
          <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>Word-for-word shooting script</div>
        </div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>Duration</div>
          <select className="nodrag" value={duration} onChange={e => updateNodeData(id, { duration: e.target.value })}
            style={{ ...INPUT_STYLE, width: '60px', fontSize: '8.5px', padding: '2px 4px', cursor: 'pointer' }}>
            {['15', '30', '45', '60', '90'].map(d => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>
        {error && <div style={{ fontSize: '8px', color: '#EF4444', marginBottom: '4px' }}>{error}</div>}
        <button onClick={handleRun} disabled={status === 'running'} className="nodrag" style={{
          width: '100%', padding: '6px', borderRadius: '4px', background: status === 'running' ? `${accent}03` : `${accent}15`,
          border: `1px solid ${accent}${status === 'running' ? '08' : '30'}`, color: `${accent}dd`,
          fontSize: '9px', fontWeight: 700, cursor: status === 'running' ? 'not-allowed' : 'pointer',
        }}>
          {status === 'running' ? 'Writing...' : result ? '\u2713 Rewrite' : '\u25b6 Write Script'}
        </button>
      </div>
      {result && (
        <div className="nodrag nowheel" style={{ margin: '0 8px 8px', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', maxHeight: '250px', overflowY: 'auto' }}>
          <div style={{ fontSize: '8px', fontWeight: 600, color: accent, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Script</div>
          <div style={{ fontSize: '9px', color: CANVAS_COLORS.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}
      <Handle type="source" position={Position.Right} id="out" style={HANDLE_STYLE} />
    </div>
  );
}

// ============================================================================
// META ADS COMPLIANCE CHECKER
// ============================================================================

export function ComplianceCheckerNode({ id, data, selected }: NodeProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const { updateNodeData } = useReactFlow();
  const accent = '#EF4444';
  const result = (data?.result as string) || '';
  const adCopy = (data?.adCopy as string) || '';

  const handleRun = useCallback(async () => {
    if (status === 'running' || !adCopy.trim()) return;
    setStatus('running'); setError('');
    try {
      const prompt = `You are a Meta Ads policy compliance expert. Analyze the following ad copy against Meta\u2019s Advertising Standards and Policies.\n\nAd Copy:\n\"\"\"\n${adCopy}\n\"\"\"\n\nCheck for violations in these categories:\n1. \u26d4 Personal Attributes (implying knowledge of personal characteristics)\n2. \u26d4 Misleading Claims (exaggerated results, fake urgency)\n3. \u26d4 Prohibited Content (before/after, health claims, financial promises)\n4. \u26d4 Discriminatory Practices (targeting based on protected characteristics)\n5. \u26d4 Sensational / Clickbait language\n6. \u26d4 Grammar / Professionalism issues\n7. \u26d4 Landing Page Consistency risks\n\nFor each issue found:\n- Quote the exact problematic phrase\n- Explain WHY it violates policy\n- Suggest a compliant rewrite\n\nIf the copy is clean, say so with a \u2705 PASS verdict.\n\nEnd with an overall VERDICT: PASS \u2705, WARN \u26a0\ufe0f, or FAIL \u26d4 and a confidence score (1-10).`;

      const resText = await executeTextGeneration(prompt);
      updateNodeData(id, { result: resText });
      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStatus('error');
    }
  }, [id, adCopy, status, updateNodeData]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), width: '280px' }}>
      <div style={getNodeHeaderStyle(accent)}>
        <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${accent}0a`, border: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{'\ud83d\udee1\ufe0f'}</span>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Meta Compliance</div>
          <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>Ad policy checker</div>
        </div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: '8px', fontWeight: 600, color: CANVAS_COLORS.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Paste Ad Copy</div>
        <textarea
          className="nodrag nowheel"
          placeholder="Paste your ad copy here to check for Meta policy violations..."
          value={adCopy}
          onChange={e => updateNodeData(id, { adCopy: e.target.value })}
          style={{ ...INPUT_STYLE, minHeight: '70px', resize: 'vertical', fontSize: '9px', marginBottom: '6px' }}
        />
        {error && <div style={{ fontSize: '8px', color: '#EF4444', marginBottom: '4px' }}>{error}</div>}
        <button onClick={handleRun} disabled={status === 'running' || !adCopy.trim()} className="nodrag" style={{
          width: '100%', padding: '6px', borderRadius: '4px', background: status === 'running' ? `${accent}03` : `${accent}15`,
          border: `1px solid ${accent}${status === 'running' ? '08' : '30'}`, color: `${accent}dd`,
          fontSize: '9px', fontWeight: 700, cursor: (status === 'running' || !adCopy.trim()) ? 'not-allowed' : 'pointer',
        }}>
          {status === 'running' ? 'Checking...' : result ? '\u2713 Re-check' : '\u25b6 Check Compliance'}
        </button>
      </div>
      {result && (
        <div className="nodrag nowheel" style={{ margin: '0 8px 8px', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', maxHeight: '220px', overflowY: 'auto' }}>
          <div style={{ fontSize: '8px', fontWeight: 600, color: accent, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Report</div>
          <div style={{ fontSize: '9px', color: CANVAS_COLORS.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BRIEF OUTPUT NODE — Read-only display (auto-spawned by Video Brief Generator)
// ============================================================================

export function BriefOutputNode({ id, data, selected }: NodeProps) {
  const accent = '#A855F7';
  const justification = data?.justification as string | undefined;
  const sections = (data?.sections as BriefSection[]) || [];
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const handleCopy = useCallback(() => {
    if (sections.length === 0) return;
    const lines: string[] = ['\u2550\u2550\u2550 CREATIVE BRIEF \u2550\u2550\u2550', ''];
    if (justification) lines.push(`\ud83d\udca1 STRATEGY: ${justification}`, '');
    lines.push('\u2500\u2500\u2500 SECTIONS \u2500\u2500\u2500', '');
    sections.forEach(s => {
      lines.push(`[${fmtTime(s.startSec)}\u2013${fmtTime(s.endSec)}] ${s.slotType.toUpperCase()} \u2014 ${fmt(s.tagUsed)}`);
      lines.push(`  \ud83c\udfa5 Visual: ${s.visual}`);
      lines.push(`  \ud83c\udfa4 Audio: ${s.audio}`);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [sections, justification]);

  return (
    <div style={{ ...getNodeStyle(accent, !!selected), width: '300px' }}>
      <Handle type="target" position={Position.Left} id="brief-in" style={HANDLE_STYLE} />

      <div style={{ ...getNodeHeaderStyle(accent), justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${accent}0a`, border: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>\ud83d\udccb</span>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: CANVAS_COLORS.textPrimary }}>Creative Brief</div>
            <div style={{ fontSize: '8px', color: CANVAS_COLORS.textMuted }}>
              {sections.length > 0 ? `${sections.length} sections` : 'Awaiting generation'}
            </div>
          </div>
        </div>
        {sections.length > 0 && (
          <button onClick={handleCopy} className="nodrag" style={{
            padding: '2px 6px', borderRadius: '4px',
            background: copied ? 'rgba(6,214,160,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${copied ? 'rgba(6,214,160,0.12)' : 'rgba(255,255,255,0.04)'}`,
            color: copied ? '#06D6A0' : CANVAS_COLORS.textMuted, fontSize: '8px', fontWeight: 600,
            cursor: 'pointer', outline: 'none', transition: 'all 0.12s ease',
          }}>{copied ? '\u2713 Copied' : '\u2398 Copy'}</button>
        )}
      </div>

      <div className="nodrag nowheel" style={{ padding: '6px 10px 8px', maxHeight: '360px', overflowY: 'auto' }}>
        {sections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.25 }}>\ud83d\udccb</div>
            <div style={{ color: CANVAS_COLORS.textDim, fontSize: '9px' }}>Waiting for brief...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {justification && (
              <div style={{ padding: '5px 7px', borderRadius: '5px', background: 'rgba(168,85,247,0.03)', border: '1px solid rgba(168,85,247,0.06)', fontSize: '8.5px', color: CANVAS_COLORS.textSecondary, lineHeight: 1.5, marginBottom: '2px' }}>
                <span style={{ color: '#A855F7', fontWeight: 600, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strategy </span>
                {justification}
              </div>
            )}
            {sections.map((s, i) => {
              const cfg = SLOT_CFG[s.slotType] || { icon: '\ud83d\udcdd', color: '#6B7280' };
              const isExpanded = expandedSection === i;
              return (
                <div key={i} onClick={() => setExpandedSection(isExpanded ? null : i)} style={{ borderRadius: '5px', border: `1px solid ${cfg.color}08`, background: `${cfg.color}02`, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ padding: '6px 8px', background: `${cfg.color}03`, borderBottom: isExpanded ? `1px solid ${cfg.color}08` : 'none', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}08`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${cfg.color}03`; }}
                  >
                    <span style={{ fontSize: '9px' }}>{cfg.icon}</span>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, color: cfg.color, fontFamily: "'SF Mono', monospace" }}>{fmtTime(s.startSec)}\u2013{fmtTime(s.endSec)}</span>
                    <span style={{ fontSize: '7.5px', color: CANVAS_COLORS.textSecondary, padding: '1px 4px', borderRadius: '3px', background: `${cfg.color}06`, fontWeight: 600 }}>{fmt(s.tagUsed)}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '7px', color: 'rgba(255,255,255,0.3)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.12s' }}>\u25bc</span>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ fontSize: '8.5px' }}><span style={{ color: '#4ECDC4', fontWeight: 700, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Visual </span><span style={{ color: CANVAS_COLORS.textSecondary, lineHeight: 1.5 }}>{s.visual}</span></div>
                      <div style={{ fontSize: '8.5px' }}><span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Audio </span><span style={{ color: CANVAS_COLORS.textSecondary, lineHeight: 1.5 }}>{s.audio}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// NOTE NODE
// ============================================================================

export function NoteNode({ id, data, selected }: NodeProps) {
  const [text, setText] = useState((data?.text as string) || '');
  return (
    <div style={{ ...getNodeStyle('#52525B', !!selected), minWidth: '140px', maxWidth: '220px' }}>
      <div style={{ padding: '6px 8px' }}>
        <textarea placeholder="Add a note..." value={text} onChange={e => setText(e.target.value)}
          className="nodrag" rows={3}
          style={{ ...INPUT_STYLE, resize: 'none' as const, lineHeight: 1.5, fontSize: '9px' }}
        />
      </div>
    </div>
  );
}
