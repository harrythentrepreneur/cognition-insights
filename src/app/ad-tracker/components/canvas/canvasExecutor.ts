'use client';

import type { Node, Edge } from '@xyflow/react';
import type { BriefSection } from './canvasTypes';

// ============================================================================
// DAG EXECUTOR — traverses the canvas graph to run synthesis
// ============================================================================

export interface ResolvedInputs {
  frameworkName: string;
  slots: Array<{
    slotType: string;
    tagCategory: string;
    tagValue: string;
    startSec: number;
    endSec: number;
  }>;
  brandContext?: {
    productName: string;
    targetAudience: string;
    brandVoice: string;
  };
  // New enriched inputs
  hookType?: string;
  angle?: string;
  format?: string;
  persona?: {
    ageGenderLocation: string;
    beliefs: string;
    desiredStatus: string;
    dailyStruggles: string;
    howProductHelps: string;
  };
  desires?: string[];
  features?: Array<{ feature: string; benefit: string; coreUSP?: string }>;
  customPrompts?: string[];
  // Generic extraction datapoints connected via extractedDataNode
  extractedContext?: Array<{
    category: string;
    label: string;
    value: string;
    explanation?: string;
    avgRoas?: number;
    creativeName?: string;
  }>;
}

/** Find all nodes connected to a target node's input handles */
function getInputNodes(targetNodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const incomingEdges = edges.filter(e => e.target === targetNodeId);
  return incomingEdges
    .map(e => nodes.find(n => n.id === e.source))
    .filter((n): n is Node => !!n);
}

/** Flatten a creative's classification + raw extraction into extractedContext entries. */
function pushAllExtractionFields(
  extractedContext: NonNullable<ResolvedInputs['extractedContext']>,
  creativeId: string,
  creativeName: string,
  cls: any,
  raw: any,
) {
  const push = (category: string, label: string, value: any, explanation?: string) => {
    if (typeof value !== 'string') return;
    let v = value.trim();
    if (category === 'headlineCopy' || category === 'bodyCopy' || category === 'ctaCopy' || category === 'hookText') {
      v = v
        .replace(/\s*\d{4}-\d{2}-\d{2}[-\s]*[0-9a-f]{6,}\s*$/i, '')
        .replace(/\s*\d{4}-\d{2}-\d{2}\s*$/i, '')
        .replace(/\s*[0-9a-f]{16,}\s*$/i, '')
        .trim();
    }
    if (!v || v.toLowerCase() === 'none' || v.toLowerCase() === 'n/a') return;
    extractedContext.push({ category, label, value: v, explanation, creativeName });
  };

  // Pulls the clean verbatim hook/CTA string from raw extraction. For video
  // hooks it's `{ script, ... }` where `script` is the verbatim first line;
  // for image ads it's a plain string.
  const getStr = (section: any): string => {
    if (!section) return '';
    if (typeof section === 'string') return section.trim().replace(/^["']|["']$/g, '');
    if (Array.isArray(section)) return section.map(s => getStr(s)).filter(Boolean).join(' · ');
    const raw = (section.script || section.spokenHook || section.textOnScreen || section.whyItWorks || '').toString().trim();
    return raw.replace(/^["']|["']$/g, '');
  };

  if (cls) {
    push('hookType', 'Hook Type', cls.hookType);
    push('angle', 'Angle', cls.angle);
    push('format', 'Format', cls.format);
    push('visualPacing', 'Visual Pacing', cls.visualPacing);
    push('awarenessLevel', 'Awareness Level', cls.awarenessLevel);
    push('ctaType', 'CTA Type', cls.ctaType);
    push('productionTier', 'Production Tier', cls.productionTier);
    push('videoType', 'Video Type', cls.videoType);
    push('copywritingFramework', 'Copy Framework', cls.copywritingFramework);
    push('trueAngle', 'True Angle', cls.trueAngle);
    push('emotionalDriver', 'Emotional Driver', cls.emotionalDriver);
    push('personaArchetype', 'Persona Archetype', cls.persona?.archetype, cls.persona?.description);
    push('personaDescription', 'Persona Description', cls.persona?.description);
    push('hookExplanation', 'Hook Explanation', cls.hookExplanation);
    push('angleExplanation', 'Angle Explanation', cls.angleExplanation);
    push('formatExplanation', 'Format Explanation', cls.formatExplanation);
    push('summary', 'Summary', cls.summary);
  }

  if (raw) {
    push('painPoints', 'Pain Points', raw?.avatar?.painPoints);
    push('desiredOutcome', 'Desired Outcome', raw?.avatar?.desiredOutcome);
    push('hookText', 'Hook Text', getStr(raw?.adStructure?.hook));
    push('adStructure', 'Ad Structure', buildWalkthrough(raw?.adStructure));
    push('headlineCopy', 'Headline', raw?.script?.headlineCopy);
    push('bodyCopy', 'Body Copy', raw?.script?.bodyCopy);
    push('ctaCopy', 'CTA Copy', raw?.script?.ctaCopy);
    push('spokenHook', 'Spoken Hook', raw?.script?.spokenHook);
    push('productShown', 'Product Shown', raw?.creativeDetails?.productShown);
    push('proofElements', 'Proof Elements', raw?.creativeDetails?.proofElements);
    push('urgency', 'Urgency', raw?.creativeDetails?.urgency);
  }
}

// Mirrors buildAdStructureWalkthrough in CanvasDataContext — stitches the
// full timed hook → body → CTA flow into a single readable walkthrough.
function buildWalkthrough(adStructure: any): string {
  if (!adStructure) return '';
  const sectionText = (section: any): string => {
    if (!section) return '';
    if (typeof section === 'string') return section.trim().replace(/^["']|["']$/g, '');
    return (section.script || section.spokenHook || section.textOnScreen || '').toString().trim().replace(/^["']|["']$/g, '');
  };
  const parts: string[] = [];
  const hookStr = sectionText(adStructure.hook);
  if (hookStr) {
    const ts = (adStructure.hook && typeof adStructure.hook === 'object' && adStructure.hook.timestamp) || '';
    parts.push(`${ts ? `[${ts}] ` : ''}HOOK: "${hookStr}"`);
  }
  if (Array.isArray(adStructure.body)) {
    for (const b of adStructure.body) {
      if (!b) continue;
      const ts = b.timestamp || '';
      const role = (b.section || '').toString().trim();
      const script = sectionText(b);
      if (!script) continue;
      parts.push(`${ts ? `[${ts}] ` : ''}${role ? role.toUpperCase() + ': ' : 'BODY: '}"${script}"`);
    }
  } else if (typeof adStructure.body === 'string' && adStructure.body.trim()) {
    parts.push(`BODY: "${adStructure.body.trim().replace(/^["']|["']$/g, '')}"`);
  }
  if (typeof adStructure.offer === 'string' && adStructure.offer.trim()) {
    parts.push(`OFFER: "${adStructure.offer.trim()}"`);
  }
  const ctaStr = sectionText(adStructure.cta);
  if (ctaStr) {
    const ts = (adStructure.cta && typeof adStructure.cta === 'object' && adStructure.cta.timestamp) || '';
    parts.push(`${ts ? `[${ts}] ` : ''}CTA: "${ctaStr}"`);
  }
  return parts.join(' → ');
}

/**
 * Hydrate any upstream vault creatives that didn't resolve from localStorage
 * by fetching from the DB. Mutates the inputs and writes fetched data back to
 * localStorage so the sidebar picker sees it on next render.
 */
export async function hydrateResolvedInputs(
  inputs: ResolvedInputs,
  targetNodeId: string,
  nodes: Node[],
  edges: Edge[],
): Promise<ResolvedInputs> {
  const upstream = getInputNodes(targetNodeId, nodes, edges);
  const vaultNodes = upstream.filter(n => n.type === 'vaultCreativeNode');
  if (vaultNodes.length === 0) return inputs;

  if (typeof window === 'undefined') return inputs;

  // Determine which creatives still need DB data — any of the three stores
  // (classify, raw, creative-system) being absent triggers a DB fetch.
  const missing: Array<{ id: string; name: string }> = [];
  for (const vn of vaultNodes) {
    const cid = (vn.data?.creativeId as string) || '';
    const cname = (vn.data?.name as string) || cid;
    if (!cid) continue;
    const hasCls = !!localStorage.getItem(`xray-classify:${cid}`);
    const hasRaw = !!localStorage.getItem(`xray-raw:${cid}`);
    const hasSys = !!localStorage.getItem(`xray-system:${cid}`);
    if (!hasCls || !hasRaw || !hasSys) missing.push({ id: cid, name: cname });
  }

  if (missing.length === 0) return inputs;

  try {
    const res = await fetch('/api/ad-tracker/extractions-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adIds: missing.map(m => m.id) }),
    });
    if (!res.ok) return inputs;
    const { data } = await res.json();
    if (!data) return inputs;

    const extractedContext = [...(inputs.extractedContext || [])];
    for (const { id, name } of missing) {
      const row = data[id];
      if (!row) continue;
      const cls = row.classification || null;
      const raw = row.rawExtraction || null;
      const sys = row.creativeSystem || null;
      if (!cls && !raw && !sys) continue;

      // Cache back into localStorage so sidebar + X-Ray panel + avatar nodes
      // all see it on the next render without re-hitting the DB.
      try {
        if (cls) localStorage.setItem(`xray-classify:${id}`, JSON.stringify(cls));
        if (raw) localStorage.setItem(`xray-raw:${id}`, JSON.stringify(raw));
        if (sys) localStorage.setItem(`xray-system:${id}`, JSON.stringify(sys));
      } catch (_) {}

      if (cls || raw) pushAllExtractionFields(extractedContext, id, name, cls, raw);
    }

    return { ...inputs, extractedContext: extractedContext.length > 0 ? extractedContext : undefined };
  } catch (err) {
    console.warn('[hydrateResolvedInputs] DB fallback failed:', err);
    return inputs;
  }
}

/** Resolve all inputs for a Synthesizer node by traversing the DAG backwards */
export function resolveInputs(synthNodeId: string, nodes: Node[], edges: Edge[]): ResolvedInputs | null {
  const inputNodes = getInputNodes(synthNodeId, nodes, edges);

  // Find skeleton/framework input (optional now)
  const extractorNode = inputNodes.find(n => n.type === 'skeletonExtractorNode');
  const skeletonData = extractorNode?.data;

  let slots: ResolvedInputs['slots'] = [];
  if (skeletonData?.skeleton && Array.isArray(skeletonData.skeleton)) {
    const skeleton = skeletonData.skeleton as Array<{
      id: string; startSec: number; endSec: number; slotType: string; label: string;
    }>;
    slots = skeleton.map(slot => ({
      slotType: slot.slotType,
      tagCategory: slot.slotType,
      tagValue: slot.label,
      startSec: slot.startSec,
      endSec: slot.endSec,
    }));
  }

  // Find DNA tag inputs
  const hookNode = inputNodes.find(n => n.type === 'hookNode');
  const angleNode = inputNodes.find(n => n.type === 'angleNode');
  const formatNode = inputNodes.find(n => n.type === 'formatNode');

  // Override slots with tag values if skeleton exists
  if (slots.length > 0) {
    slots = slots.map(slot => {
      if (slot.slotType === 'hook' && hookNode?.data?.hookType) {
        return { ...slot, tagCategory: 'hook', tagValue: hookNode.data.hookType as string };
      }
      if ((slot.slotType === 'angle' || slot.slotType === 'body') && angleNode?.data?.angle) {
        return { ...slot, tagCategory: 'angle', tagValue: angleNode.data.angle as string };
      }
      if (slot.slotType === 'cta' && formatNode?.data?.format) {
        return { ...slot, tagCategory: 'format', tagValue: formatNode.data.format as string };
      }
      return slot;
    });
  }

  // Find brand profile
  const brandNode = inputNodes.find(n => n.type === 'brandProfileNode');
  const brandContext = brandNode?.data ? {
    productName: (brandNode.data.productName as string) || '',
    targetAudience: (brandNode.data.targetAudience as string) || '',
    brandVoice: (brandNode.data.brandVoice as string) || '',
  } : undefined;

  // Find persona inputs (NEW)
  const personaNodes = inputNodes.filter(n => n.type === 'personaNode');
  const persona = personaNodes.length > 0 ? {
    ageGenderLocation: (personaNodes[0].data?.ageGenderLocation as string) || '',
    beliefs: (personaNodes[0].data?.beliefs as string) || '',
    desiredStatus: (personaNodes[0].data?.desiredStatus as string) || '',
    dailyStruggles: (personaNodes[0].data?.dailyStruggles as string) || '',
    howProductHelps: (personaNodes[0].data?.howProductHelps as string) || '',
  } : undefined;

  // Find desire inputs (NEW)
  const desireNodes = inputNodes.filter(n => n.type === 'desireNode');
  const desires = desireNodes
    .map(n => (n.data?.desire as string) || '')
    .filter(Boolean);
  const features = desireNodes
    .filter(n => n.data?.feature)
    .map(n => ({
      feature: (n.data?.feature as string) || '',
      benefit: (n.data?.benefit as string) || '',
      coreUSP: (n.data?.coreUSP as string) || undefined,
    }));

  // Find custom prompt inputs (NEW)
  const promptNodes = inputNodes.filter(n => n.type === 'customPromptNode');
  const customPrompts = promptNodes
    .map(n => (n.data?.prompt as string) || '')
    .filter(Boolean);

  // Find generic extracted data nodes (any extraction datapoint)
  const extractedNodes = inputNodes.filter(n => n.type === 'extractedDataNode');
  const extractedContext: NonNullable<ResolvedInputs['extractedContext']> = extractedNodes
    .map(n => ({
      category: (n.data?.category as string) || '',
      label: (n.data?.label as string) || '',
      value: (n.data?.value as string) || '',
      explanation: (n.data?.explanation as string) || undefined,
      avgRoas: (n.data?.avgRoas as number) || undefined,
      creativeName: (n.data?.creativeName as string) || undefined,
    }))
    .filter(d => d.value);

  // Canonical avatar nodes — flatten the selected avatar's payload + metrics
  // into extractedContext so every generator downstream sees the avatar data
  // exactly like any other extracted datapoint.
  const avatarNodes = inputNodes.filter(n => n.type === 'canonicalAvatarNode');
  for (const an of avatarNodes) {
    const label = (an.data?.label as string) || '';
    const payload = (an.data?.payload as Record<string, any>) || {};
    const metrics = (an.data?.metrics as Record<string, any>) || {};
    const linkCount = (an.data?.linkCount as number) || 0;
    if (!label && Object.keys(payload).length === 0) continue;

    const avatarName = label ? `Avatar: ${label}` : 'Canonical Avatar';

    // Emit an identity line so the prompt can name the avatar
    if (label) {
      extractedContext.push({
        category: 'canonicalAvatar',
        label: 'Canonical Avatar',
        value: `${label}${linkCount ? ` (${linkCount} linked ads)` : ''}`,
        creativeName: avatarName,
      });
    }

    // Flatten every string/number payload field into extractedContext so
    // generators see rich avatar context without needing to know the shape.
    const humanise = (k: string) =>
      k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    for (const [k, v] of Object.entries(payload)) {
      if (v == null) continue;
      let str = '';
      if (typeof v === 'string') str = v.trim();
      else if (typeof v === 'number' || typeof v === 'boolean') str = String(v);
      else if (Array.isArray(v)) str = v.filter(x => typeof x === 'string').join(', ');
      if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none') continue;
      extractedContext.push({
        category: `avatar.${k}`,
        label: `Avatar · ${humanise(k)}`,
        value: str,
        creativeName: avatarName,
      });
    }

    // Include a compact performance footprint as an additional datapoint
    const totals = (metrics.totals as Record<string, number>) || {};
    const perf: string[] = [];
    if (metrics.ad_count) perf.push(`${metrics.ad_count} ads`);
    if (totals.spend) perf.push(`$${Math.round(totals.spend)} spend`);
    if (totals.revenue) perf.push(`$${Math.round(totals.revenue)} revenue`);
    if (metrics.derived?.roas) perf.push(`${metrics.derived.roas.toFixed(2)}x ROAS`);
    if (metrics.derived?.cpa) perf.push(`$${Math.round(metrics.derived.cpa)} CPA`);
    if (perf.length > 0) {
      extractedContext.push({
        category: 'avatarPerformance',
        label: 'Avatar Performance',
        value: perf.join(' · '),
        creativeName: avatarName,
        avgRoas: metrics.derived?.roas || undefined,
      });
    }
  }

  // Find vault creative nodes — a direct upstream vaultCreativeNode means
  // the user wants the WHOLE creative's extraction fed into the pipeline.
  // Hydration happens in two phases:
  //   1. Sync (here): pull from localStorage if available.
  //   2. Async (hydrateResolvedInputs): fetch from DB for creatives missing
  //      localStorage data, so downstream generators always see complete
  //      extraction fields regardless of how the creative was extracted.
  const vaultNodes = inputNodes.filter(n => n.type === 'vaultCreativeNode');
  for (const vn of vaultNodes) {
    const cid = (vn.data?.creativeId as string) || '';
    const cname = (vn.data?.name as string) || cid;
    if (!cid || typeof window === 'undefined') continue;

    let cls: any = null;
    let raw: any = null;
    try {
      const s = localStorage.getItem(`xray-classify:${cid}`);
      if (s) cls = JSON.parse(s);
    } catch (_) {}
    try {
      const s = localStorage.getItem(`xray-raw:${cid}`);
      if (s) raw = JSON.parse(s);
    } catch (_) {}

    if (cls || raw) {
      pushAllExtractionFields(extractedContext, cid, cname, cls, raw);
    }
  }

  // Must have at least one meaningful input
  const hasInputs = slots.length > 0 || hookNode || angleNode || formatNode
    || persona || desires.length > 0 || customPrompts.length > 0 || brandContext
    || extractedContext.length > 0 || vaultNodes.length > 0 || avatarNodes.length > 0;

  if (!hasInputs) return null;

  return {
    frameworkName: 'Creative Brief Builder',
    slots,
    brandContext,
    hookType: (hookNode?.data?.hookType as string) || undefined,
    angle: (angleNode?.data?.angle as string) || undefined,
    format: (formatNode?.data?.format as string) || undefined,
    persona,
    desires: desires.length > 0 ? desires : undefined,
    features: features.length > 0 ? features : undefined,
    customPrompts: customPrompts.length > 0 ? customPrompts : undefined,
    extractedContext: extractedContext.length > 0 ? extractedContext : undefined,
  };
}

/** Execute the synthesis API call */
export async function executeSynthesis(
  inputs: ResolvedInputs,
  opts?: { model?: string; promptOverride?: string },
  signal?: AbortSignal
): Promise<{ justification: string; sections: BriefSection[] }> {
  const res = await fetch('/api/ad-tracker/synthesize-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frameworkName: inputs.frameworkName,
      slots: inputs.slots,
      brandContext: inputs.brandContext,
      hookType: inputs.hookType,
      angle: inputs.angle,
      format: inputs.format,
      persona: inputs.persona,
      desires: inputs.desires,
      features: inputs.features,
      customPrompts: inputs.customPrompts,
      extractedContext: inputs.extractedContext,
      ...(opts?.model ? { model: opts.model } : {}),
      ...(opts?.promptOverride ? { promptOverride: opts.promptOverride } : {}),
    }),
    signal,
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.brief) throw new Error('No brief returned');
  return data.brief;
}

/**
 * Available LLM models for canvas generators. Every entry currently routes
 * to Gemini under the hood (generate-text route ignores non-Gemini IDs and
 * falls back to the default), but the UI presents them as separate options
 * so we can wire up Anthropic / OpenAI later without restructuring nodes.
 */
export interface LlmModelOption {
  id: string;
  label: string;
  provider: 'gemini' | 'anthropic' | 'openai';
  // What to actually send to the API right now (all → gemini for the moment)
  resolvedId: string;
}

export const LLM_MODELS: LlmModelOption[] = [
  { id: 'gemini-3.1-flash',      label: 'Gemini 3.1 Flash',  provider: 'gemini',    resolvedId: 'gemini-3.1-flash-lite-preview' },
  { id: 'gemini-3.1-pro',        label: 'Gemini 3.1 Pro',    provider: 'gemini',    resolvedId: 'gemini-3.1-pro-preview' },
  { id: 'claude-opus-4-6',       label: 'Claude 4.6 Opus',   provider: 'anthropic', resolvedId: 'gemini-3.1-flash-lite-preview' },
  { id: 'claude-sonnet-4-6',     label: 'Claude 4.6 Sonnet', provider: 'anthropic', resolvedId: 'gemini-3.1-flash-lite-preview' },
  { id: 'claude-haiku-4-5',      label: 'Claude 4.5 Haiku',  provider: 'anthropic', resolvedId: 'gemini-3.1-flash-lite-preview' },
  { id: 'gpt-5',                 label: 'GPT-5',             provider: 'openai',    resolvedId: 'gemini-3.1-flash-lite-preview' },
];

export const DEFAULT_LLM_MODEL_ID = 'gemini-3.1-flash';

/** Execute a generic text generation API call */
export async function executeTextGeneration(
  prompt: string,
  opts?: { modelId?: string },
  signal?: AbortSignal,
): Promise<string> {
  const selected = LLM_MODELS.find(m => m.id === opts?.modelId) || LLM_MODELS.find(m => m.id === DEFAULT_LLM_MODEL_ID)!;
  const res = await fetch('/api/ad-tracker/generate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: selected.resolvedId }),
    signal,
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.result) throw new Error('No text returned');
  return data.result;
}

/** Execute skeleton extraction from a URL or creative */
export async function executeExtraction(
  url: string,
  type: 'video' | 'image',
  signal?: AbortSignal
): Promise<{
  dna: { hookType: string; angle: string; videoFormat: string; visualPacing: string; summary: string };
  skeleton: Array<{ id: string; startSec: number; endSec: number; slotType: string; label: string }>;
}> {
  const res = await fetch('/api/ad-tracker/extract-dna', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type, includeSkeleton: true }),
    signal,
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const skeleton = data.skeleton || generateDefaultSkeleton(data.dna?.visualPacing || 'medium');
  return { dna: data.dna, skeleton };
}

/** Generate a default skeleton when API doesn't provide one */
function generateDefaultSkeleton(pacing: string) {
  const duration = pacing === 'fast' ? 30 : pacing === 'slow' ? 60 : 45;
  const hookEnd = pacing === 'fast' ? 3 : 5;
  const bodyEnd = Math.floor(duration * 0.8);

  return [
    { id: 'sk-1', startSec: 0, endSec: hookEnd, slotType: 'hook', label: 'Hook' },
    { id: 'sk-2', startSec: hookEnd, endSec: Math.floor(duration * 0.4), slotType: 'angle', label: 'Problem / Angle' },
    { id: 'sk-3', startSec: Math.floor(duration * 0.4), endSec: bodyEnd, slotType: 'body', label: 'Solution / Body' },
    { id: 'sk-4', startSec: bodyEnd, endSec: duration, slotType: 'cta', label: 'CTA' },
  ];
}

// ============================================================================
// DAG PERSISTENCE — localStorage
// ============================================================================

const STORAGE_KEY = 'ad-lab-canvas-state';

export function saveCanvasState(state: { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } }) {
  try {
    const payload = {
      id: 'default',
      name: 'My Canvas',
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_e) {
    // Storage full or unavailable
  }
}

export function loadCanvasState(): { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      viewport: parsed.viewport || { x: 0, y: 0, zoom: 1 },
    };
  } catch (_e) {
    return null;
  }
}

export function clearCanvasState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_e) {}
}
