'use client';

import type { Node, Edge } from '@xyflow/react';
import type { ReactNode } from 'react';

// ============================================================================
// NODE DATA TYPES
// ============================================================================

export interface UrlNodeData {
  url: string;
  thumbnailUrl?: string;
  platform?: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface VaultCreativeNodeData {
  creativeId: string;
  name: string;
  thumbnailUrl?: string;
  type: 'video' | 'image' | 'carousel';
  platform: string;
  platformColor: string;
  metrics: Record<string, number>;
  hookType?: string;
  angle?: string;
  format?: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface BrandProfileNodeData {
  productName: string;
  targetAudience: string;
  brandVoice: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface SkeletonExtractorNodeData {
  status: 'idle' | 'extracting' | 'done' | 'error';
  skeleton?: SkeletonSlot[];
  error?: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface SkeletonSlot {
  id: string;
  startSec: number;
  endSec: number;
  slotType: 'hook' | 'angle' | 'body' | 'cta';
  label: string;
}

export interface HookNodeData {
  hookType: string;
  avgRoas: number;
  count: number;
  status: 'top' | 'good' | 'trending' | 'fatigue';
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface AngleNodeData {
  angle: string;
  avgRoas: number;
  count: number;
  status: 'top' | 'good' | 'trending' | 'fatigue';
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface FormatNodeData {
  format: string;
  avgRoas: number;
  count: number;
  status: 'top' | 'good' | 'trending' | 'fatigue';
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface SynthesizerNodeData {
  status: 'idle' | 'running' | 'done' | 'error';
  error?: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface BriefOutputNodeData {
  justification?: string;
  sections?: BriefSection[];
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface BriefSection {
  startSec: number;
  endSec: number;
  slotType: string;
  tagUsed: string;
  visual: string;
  audio: string;
}

export interface NoteNodeData {
  text: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface PersonaNodeData {
  personaIndex: number;
  ageGenderLocation: string;
  beliefs: string;
  desiredStatus: string;
  dailyStruggles: string;
  howProductHelps: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface DesireNodeData {
  desire: string;
  feature?: string;
  benefit?: string;
  coreUSP?: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface CustomPromptNodeData {
  prompt: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

// ============================================================================
// GENERIC EXTRACTED DATA NODE — holds any extraction datapoint
// (trueAngle, emotionalDriver, headline, painPoints, etc.)
// ============================================================================

export interface ExtractedDataNodeData {
  category: string;        // e.g. 'trueAngle', 'painPoints', 'headlineCopy'
  label: string;           // human readable section title (e.g. 'True Angle')
  value: string;           // the actual extracted value text
  explanation?: string;    // optional supporting explanation
  avgRoas?: number;        // optional ROAS context
  count?: number;          // optional creative count
  creativeId?: string;     // source creative (for text datapoints)
  creativeName?: string;   // source creative label
  accentColor?: string;    // optional color override
  record: Record<string, never>;
  [key: string]: unknown;
}

// ============================================================================
// NEW GENERATOR / PROMPT NODE TYPES
// ============================================================================

export interface AdCopyPromptNodeData {
  status: 'idle' | 'running' | 'done' | 'error';
  promptOverride?: string;
  result?: string;
  error?: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

export interface LlmQuestionNodeData {
  status: 'idle' | 'running' | 'done' | 'error';
  question: string;
  result?: string;
  error?: string;
  record: Record<string, never>;
  [key: string]: unknown;
}

// ============================================================================
// NODE TYPE REGISTRY
// ============================================================================

export type AdLabNodeType =
  | 'urlNode'
  | 'vaultCreativeNode'
  | 'brandProfileNode'
  | 'skeletonExtractorNode'
  | 'hookNode'
  | 'angleNode'
  | 'formatNode'
  | 'personaNode'
  | 'desireNode'
  | 'customPromptNode'
  | 'canonicalAvatarNode'
  | 'canonicalHookNode'
  | 'canonicalAngleNode'
  | 'canonicalDesireNode'
  | 'canonicalFeatureBenefitNode'
  | 'extractedDataNode'
  | 'synthesizerNode'
  | 'adCopyPromptNode'
  | 'llmQuestionNode'
  | 'hookVariationsNode'
  | 'scriptWriterNode'
  | 'complianceCheckerNode'
  | 'briefOutputNode'
  | 'noteNode';

// ============================================================================
// CANVAS STATE (DAG Persistence)
// ============================================================================

export interface CanvasState {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// SIDEBAR DRAGGABLE ITEM
// ============================================================================

export interface SidebarNodeItem {
  type: AdLabNodeType;
  label: string;
  icon: ReactNode;
  description: string;
  category: 'source' | 'extractor' | 'dna' | 'input' | 'generator';
  defaultData: Record<string, unknown>;
  comingSoon?: boolean;
}
