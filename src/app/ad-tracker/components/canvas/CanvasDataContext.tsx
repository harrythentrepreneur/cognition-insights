'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { VaultCreative } from '../CreativeVault';

// ============================================================================
// DNA PERFORMANCE AGGREGATION
// ============================================================================

export interface DnaGroupSource {
  creativeId: string;
  creativeName: string;
  thumbnailUrl?: string | null;
  spend: number;
  revenue: number;
  conversions: number;
  cpa: number;
  roas: number;
}

export interface DnaGroupMetrics {
  key: string;
  count: number;
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  avgRoas: number;
  avgCpa: number;            // totalSpend / totalConversions — lower is better
  status: 'top' | 'good' | 'trending' | 'fatigue';
  sources?: DnaGroupSource[];
}

// ============================================================================
// EXTRACTION DATA TYPES (from xray-classify + xray-raw localStorage caches)
// ============================================================================

// Enum datapoints — have a finite vocabulary, aggregated with ROAS
export type ExtractedEnumCategory =
  | 'hookType' | 'angle' | 'format' | 'visualPacing'
  | 'awarenessLevel' | 'ctaType' | 'productionTier'
  | 'videoType' | 'copywritingFramework';

// Free-text datapoints — unique per creative, shown as a ranked list
export type ExtractedTextCategory =
  | 'trueAngle' | 'emotionalDriver' | 'personaArchetype' | 'personaDescription'
  | 'hookExplanation' | 'angleExplanation' | 'formatExplanation' | 'summary'
  | 'painPoints' | 'desiredOutcome' | 'hookText' | 'headlineCopy'
  | 'bodyCopy' | 'ctaCopy' | 'spokenHook' | 'productShown'
  | 'proofElements' | 'urgency' | 'adStructure';

export type ExtractedCategory = ExtractedEnumCategory | ExtractedTextCategory;

export interface ExtractedTextValue {
  value: string;
  creativeId: string;
  creativeName: string;
  avgRoas: number;
  avgCpa: number;
  conversions: number;
  spend: number;
  explanation?: string;
}

export interface ExtractedDataSet {
  enums: Record<ExtractedEnumCategory, DnaGroupMetrics[]>;
  texts: Record<ExtractedTextCategory, ExtractedTextValue[]>;
}

// ============================================================================
// DEEP ANALYSIS TYPES (from extract-creative-system + analyze-creative)
// ============================================================================

export interface AwarenessQA { question: string; answer: string; }
export interface AwarenessColumn { level: string; qaPairs: AwarenessQA[]; }
export interface MarketDesires { primaryDesire: string; secondaryDesires: string[]; }
export interface FeatureBenefit {
  feature: string; benefit: string; matchingDesire: string; coreUSP: string;
}
export interface PersonaProfile {
  ageGenderLocation: string; visibleCharacteristics: string; beliefs: string;
  desiredStatus: string; howProductHelps: string; failedSolutions: string;
  failureReasons: string; failedProducts: string; productFailureReasons: string;
  dailyStruggles: string;
}
export interface CreativeTestingNotes {
  testHypothesis: string;
  adVariable: string;
  angleUSP: string;
}
export interface CreativeSystemData {
  detectedAwarenessLevel?: string;
  awarenessQuestions: AwarenessColumn[];
  marketDesires: MarketDesires;
  featuresBenefits: FeatureBenefit[];
  persona: PersonaProfile;
  testingNotes: CreativeTestingNotes;
}
export interface AnalysisReport {
  script?: string; visuals?: string; goal?: string;
  hook?: string; overallVerdict?: string;
}

// Combined enrichment per creative
export interface CreativeEnrichment {
  creativeId: string;
  system?: CreativeSystemData;
  analysis?: AnalysisReport;
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

function groupBy(
  creatives: VaultCreative[],
  getKey: (c: VaultCreative) => string | undefined,
): DnaGroupMetrics[] {
  const map = new Map<string, { spend: number; revenue: number; count: number; conversions: number }>();
  for (const c of creatives) {
    const key = getKey(c);
    if (!key) continue;
    const existing = map.get(key) || { spend: 0, revenue: 0, count: 0, conversions: 0 };
    existing.spend += c.metrics['ad-spend'] || 0;
    existing.revenue += c.metrics.revenue || 0;
    existing.conversions += c.metrics.conversions || 0;
    existing.count += 1;
    map.set(key, existing);
  }

  const entries = Array.from(map.entries()).map(([key, d]) => {
    const avgRoas = d.spend > 0 ? d.revenue / d.spend : 0;
    const avgCpa = d.conversions > 0 ? d.spend / d.conversions : 0;
    return { key, count: d.count, totalSpend: d.spend, totalRevenue: d.revenue, totalConversions: d.conversions, avgRoas, avgCpa, status: 'good' as DnaGroupMetrics['status'] };
  });
  return assignStatusByCpa(entries);
}

// Rank status by CPA percentile within the group — lower CPA = better.
// Entries with no conversions (avgCpa === 0) are parked at 'fatigue'.
function assignStatusByCpa(entries: DnaGroupMetrics[]): DnaGroupMetrics[] {
  const valid = entries.filter(e => e.avgCpa > 0).sort((a, b) => a.avgCpa - b.avgCpa);
  const n = valid.length;
  const topCut = n * 0.34;
  const midCut = n * 0.67;
  valid.forEach((e, i) => {
    if (i < topCut) e.status = 'top';
    else if (i < midCut) e.status = 'good';
    else e.status = 'trending';
  });
  entries.filter(e => e.avgCpa === 0).forEach(e => { e.status = 'fatigue'; });
  // Sort: conversions first (more data = higher confidence), then CPA asc
  entries.sort((a, b) => {
    if (a.avgCpa === 0 && b.avgCpa === 0) return b.totalConversions - a.totalConversions;
    if (a.avgCpa === 0) return 1;
    if (b.avgCpa === 0) return -1;
    return a.avgCpa - b.avgCpa;
  });
  return entries;
}

// Pull all unique market desires, hooks from analysis, etc from cached analysis
function loadAllEnrichments(creatives: VaultCreative[]): {
  enrichments: Map<string, CreativeEnrichment>;
  allDesires: string[];
  allHookAnalyses: string[];
  allPersonas: PersonaProfile[];
  allTestingNotes: CreativeTestingNotes[];
  allFeatures: FeatureBenefit[];
} {
  const enrichments = new Map<string, CreativeEnrichment>();
  const allDesires: string[] = [];
  const allHookAnalyses: string[] = [];
  const allPersonas: PersonaProfile[] = [];
  const allTestingNotes: CreativeTestingNotes[] = [];
  const allFeatures: FeatureBenefit[] = [];

  if (typeof window === 'undefined') {
    return { enrichments, allDesires, allHookAnalyses, allPersonas, allTestingNotes, allFeatures };
  }

  for (const c of creatives) {
    const enrichment: CreativeEnrichment = { creativeId: c.id };

    // System data (cached by AdXRayPanel)
    try {
      const raw = localStorage.getItem(`xray-system:${c.id}`);
      if (raw) {
        const sysData: CreativeSystemData = JSON.parse(raw);
        enrichment.system = sysData;

        // Collect desires (primaryDesire + up to 2 secondaryDesires)
        if (sysData.marketDesires) {
          const md = sysData.marketDesires as any;
          const primary = md?.primaryDesire;
          if (typeof primary === 'string' && primary && !allDesires.includes(primary)) {
            allDesires.push(primary);
          }
          if (Array.isArray(md?.secondaryDesires)) {
            for (const d of md.secondaryDesires) {
              if (typeof d === 'string' && d && !allDesires.includes(d)) allDesires.push(d);
            }
          }
          // Legacy cache safety: old shape was MarketDesire[] with {desire}
          if (Array.isArray(md)) {
            for (const d of md) {
              if (d?.desire && !allDesires.includes(d.desire)) allDesires.push(d.desire);
            }
          }
        }
        // Collect personas
        if (sysData.persona && sysData.persona.ageGenderLocation) {
          allPersonas.push(sysData.persona);
        }
        // Collect testing notes
        if (sysData.testingNotes && sysData.testingNotes.testHypothesis) {
          allTestingNotes.push(sysData.testingNotes);
        }
        // Collect features
        if (sysData.featuresBenefits) {
          for (const fb of sysData.featuresBenefits) {
            allFeatures.push(fb);
          }
        }
      }
    } catch (_) {}

    // Analysis report (cached by AdXRayPanel)
    try {
      const raw = localStorage.getItem(`xray-analysis:${c.id}`);
      if (raw) {
        const report: AnalysisReport = JSON.parse(raw);
        enrichment.analysis = report;
        if (report.hook) allHookAnalyses.push(report.hook);
      }
    } catch (_) {}

    enrichments.set(c.id, enrichment);
  }

  return { enrichments, allDesires, allHookAnalyses, allPersonas, allTestingNotes, allFeatures };
}

// ============================================================================
// EXTRACTION DATA LOADER — reads xray-classify + xray-raw from localStorage
// ============================================================================

const EMPTY_EXTRACTED: ExtractedDataSet = {
  enums: {
    hookType: [], angle: [], format: [], visualPacing: [],
    awarenessLevel: [], ctaType: [], productionTier: [],
    videoType: [], copywritingFramework: [],
  },
  texts: {
    trueAngle: [], emotionalDriver: [], personaArchetype: [], personaDescription: [],
    hookExplanation: [], angleExplanation: [], formatExplanation: [], summary: [],
    painPoints: [], desiredOutcome: [], hookText: [], headlineCopy: [],
    bodyCopy: [], ctaCopy: [], spokenHook: [], productShown: [],
    proofElements: [], urgency: [], adStructure: [],
  },
};

// Strips trailing ad-naming metadata that some Meta ads append to their
// headline/body fields, e.g. "Great hook! ✅ 2026-03-21-846beb5e42d86d515…"
// becomes "Great hook! ✅".
function stripAdNameMetadata(s: string): string {
  if (!s) return s;
  return s
    // Trailing ISO date + hex hash (handles multi-line concatenation too)
    .replace(/\s*\d{4}-\d{2}-\d{2}[-\s]*[0-9a-f]{6,}\s*$/i, '')
    // Trailing lone ISO date
    .replace(/\s*\d{4}-\d{2}-\d{2}\s*$/i, '')
    // Trailing bare hex hash (16+ hex chars)
    .replace(/\s*[0-9a-f]{16,}\s*$/i, '')
    .trim();
}

// Builds a full, readable walkthrough of the ad from raw.adStructure.
// For video: "[0:00-0:03] HOOK: "..." → [0:03-0:10] PROBLEM: "..." → [0:20-0:25] CTA: "..." "
// For image: stitches hook/body/offer/cta into a single paragraph.
function buildAdStructureWalkthrough(adStructure: any): string {
  if (!adStructure) return '';

  const sectionText = (section: any): string => {
    if (!section) return '';
    if (typeof section === 'string') return section.trim().replace(/^["']|["']$/g, '');
    return (section.script || section.spokenHook || section.textOnScreen || '').toString().trim().replace(/^["']|["']$/g, '');
  };

  const parts: string[] = [];

  // HOOK
  const hookStr = sectionText(adStructure.hook);
  if (hookStr) {
    const ts = (adStructure.hook && typeof adStructure.hook === 'object' && adStructure.hook.timestamp) || '';
    parts.push(`${ts ? `[${ts}] ` : ''}HOOK: "${hookStr}"`);
  }

  // BODY — array of timed sections for video, or a single string for image
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

  // OFFER (image-only field)
  if (typeof adStructure.offer === 'string' && adStructure.offer.trim()) {
    parts.push(`OFFER: "${adStructure.offer.trim()}"`);
  }

  // CTA
  const ctaStr = sectionText(adStructure.cta);
  if (ctaStr) {
    const ts = (adStructure.cta && typeof adStructure.cta === 'object' && adStructure.cta.timestamp) || '';
    parts.push(`${ts ? `[${ts}] ` : ''}CTA: "${ctaStr}"`);
  }

  return parts.join(' → ');
}

// Pulls the clean verbatim hook/CTA string from the raw extraction. For
// video hooks, the upstream extractor returns `{ script, visual, whyItWorks }`
// where `script` is the verbatim first-3-seconds text (spoken or on-screen).
// For image ads it's a plain string.
function getStructureString(section: any): string {
  if (!section) return '';
  if (typeof section === 'string') return section.trim().replace(/^["']|["']$/g, '');
  if (Array.isArray(section)) {
    return section.map(s => getStructureString(s)).filter(Boolean).join(' · ');
  }
  const raw = (section.script || section.spokenHook || section.textOnScreen || section.whyItWorks || '').toString().trim();
  return raw.replace(/^["']|["']$/g, '');
}

function loadExtractedData(creatives: VaultCreative[]): ExtractedDataSet {
  const out: ExtractedDataSet = {
    enums: {
      hookType: [], angle: [], format: [], visualPacing: [],
      awarenessLevel: [], ctaType: [], productionTier: [],
      videoType: [], copywritingFramework: [],
    },
    texts: {
      trueAngle: [], emotionalDriver: [], personaArchetype: [], personaDescription: [],
      hookExplanation: [], angleExplanation: [], formatExplanation: [], summary: [],
      painPoints: [], desiredOutcome: [], hookText: [], headlineCopy: [],
      bodyCopy: [], ctaCopy: [], spokenHook: [], productShown: [],
      proofElements: [], urgency: [], adStructure: [],
    },
  };
  if (typeof window === 'undefined') return out;

  // Enum buckets: key → { spend, revenue, count, conversions, sources }
  type EnumBucket = { spend: number; revenue: number; count: number; conversions: number; sources: DnaGroupSource[] };
  const enumBuckets: Record<ExtractedEnumCategory, Map<string, EnumBucket>> = {
    hookType: new Map(), angle: new Map(), format: new Map(), visualPacing: new Map(),
    awarenessLevel: new Map(), ctaType: new Map(), productionTier: new Map(),
    videoType: new Map(), copywritingFramework: new Map(),
  };

  // Dedup sets for text values
  const textSeen: Record<ExtractedTextCategory, Set<string>> = Object.keys(out.texts).reduce((acc, k) => {
    acc[k as ExtractedTextCategory] = new Set();
    return acc;
  }, {} as Record<ExtractedTextCategory, Set<string>>);

  for (const c of creatives) {
    const spend = c.metrics['ad-spend'] || 0;
    const revenue = c.metrics.revenue || 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const creativeName = c.name || c.id;

    // Pull classification + raw from localStorage
    let cls: any = null;
    let raw: any = null;
    try {
      const rawStr = localStorage.getItem(`xray-classify:${c.id}`);
      if (rawStr) cls = JSON.parse(rawStr);
    } catch (_) {}
    try {
      const rawStr = localStorage.getItem(`xray-raw:${c.id}`);
      if (rawStr) raw = JSON.parse(rawStr);
    } catch (_) {}

    // Also fall back to the lightweight dna on the creative for enums
    const dnaHook = c.dnaOverride?.hookType || c.dna?.hookType;
    const dnaAngle = c.dnaOverride?.angle || c.dna?.angle;
    const dnaFormat = c.dnaOverride?.videoFormat || c.dna?.videoFormat;
    const dnaPacing = c.dnaOverride?.visualPacing || c.dna?.visualPacing;

    const conversions = c.metrics.conversions || 0;
    const cpa = c.metrics.cpa || (conversions > 0 ? spend / conversions : 0);
    const source: DnaGroupSource = {
      creativeId: c.id,
      creativeName,
      thumbnailUrl: c.thumbnailUrl || c.imageUrl || c.fullPictureUrl || null,
      spend, revenue, conversions, cpa, roas,
    };
    const bumpEnum = (cat: ExtractedEnumCategory, key: string | undefined | null) => {
      if (!key) return;
      const m = enumBuckets[cat];
      const existing = m.get(key) || { spend: 0, revenue: 0, count: 0, conversions: 0, sources: [] };
      existing.spend += spend;
      existing.revenue += revenue;
      existing.count += 1;
      existing.conversions += conversions;
      existing.sources.push(source);
      m.set(key, existing);
    };

    bumpEnum('hookType', cls?.hookType || dnaHook);
    bumpEnum('angle', cls?.angle || dnaAngle);
    bumpEnum('format', cls?.format || dnaFormat);
    bumpEnum('visualPacing', cls?.visualPacing || dnaPacing);
    bumpEnum('awarenessLevel', cls?.awarenessLevel);
    bumpEnum('ctaType', cls?.ctaType);
    bumpEnum('productionTier', cls?.productionTier);
    bumpEnum('videoType', cls?.videoType);
    bumpEnum('copywritingFramework', cls?.copywritingFramework);

    const pushText = (cat: ExtractedTextCategory, value: any, explanation?: string) => {
      if (typeof value !== 'string') return;
      let v = value.trim();
      // Clean ad-naming metadata from copy fields
      if (cat === 'headlineCopy' || cat === 'bodyCopy' || cat === 'ctaCopy' || cat === 'hookText') {
        v = stripAdNameMetadata(v);
      }
      if (!v || v.toLowerCase() === 'n/a' || v.toLowerCase() === 'none') return;
      const key = `${v}::${c.id}`;
      if (textSeen[cat].has(key)) return;
      textSeen[cat].add(key);
      out.texts[cat].push({ value: v, creativeId: c.id, creativeName, avgRoas: roas, avgCpa: cpa, conversions, spend, explanation });
    };

    if (cls) {
      pushText('trueAngle', cls.trueAngle);
      pushText('emotionalDriver', cls.emotionalDriver);
      pushText('personaArchetype', cls.persona?.archetype, cls.persona?.description);
      pushText('personaDescription', cls.persona?.description);
      pushText('hookExplanation', cls.hookExplanation);
      pushText('angleExplanation', cls.angleExplanation);
      pushText('formatExplanation', cls.formatExplanation);
      pushText('summary', cls.summary);
    }

    if (raw) {
      pushText('painPoints', raw?.avatar?.painPoints);
      pushText('desiredOutcome', raw?.avatar?.desiredOutcome);
      pushText('hookText', getStructureString(raw?.adStructure?.hook));
      pushText('adStructure', buildAdStructureWalkthrough(raw?.adStructure));
      pushText('headlineCopy', raw?.script?.headlineCopy);
      pushText('bodyCopy', raw?.script?.bodyCopy);
      pushText('ctaCopy', raw?.script?.ctaCopy);
      pushText('spokenHook', raw?.script?.spokenHook);
      pushText('productShown', raw?.creativeDetails?.productShown);
      pushText('proofElements', raw?.creativeDetails?.proofElements);
      pushText('urgency', raw?.creativeDetails?.urgency);
    }

    // Fallbacks from the creative's own fields
    if (!raw?.script?.headlineCopy && c.headline) pushText('headlineCopy', c.headline);
    if (!raw?.script?.bodyCopy && c.body) pushText('bodyCopy', c.body);
  }

  // Finalize enum groups: compute avgRoas + avgCpa, status by CPA percentile
  (Object.keys(enumBuckets) as ExtractedEnumCategory[]).forEach(cat => {
    const entries = Array.from(enumBuckets[cat].entries()).map(([key, d]) => {
      const avgRoas = d.spend > 0 ? d.revenue / d.spend : 0;
      const avgCpa = d.conversions > 0 ? d.spend / d.conversions : 0;
      const sources = [...d.sources].sort((a, b) => {
        if (a.cpa === 0 && b.cpa === 0) return b.spend - a.spend;
        if (a.cpa === 0) return 1;
        if (b.cpa === 0) return -1;
        return a.cpa - b.cpa;
      });
      return { key, count: d.count, totalSpend: d.spend, totalRevenue: d.revenue, totalConversions: d.conversions, avgRoas, avgCpa, status: 'good' as DnaGroupMetrics['status'], sources };
    });
    out.enums[cat] = assignStatusByCpa(entries);
  });

  // Sort text values by CPA ascending (lower is better); entries with no
  // conversions are parked at the end.
  (Object.keys(out.texts) as ExtractedTextCategory[]).forEach(cat => {
    out.texts[cat].sort((a, b) => {
      if (a.avgCpa === 0 && b.avgCpa === 0) return b.spend - a.spend;
      if (a.avgCpa === 0) return 1;
      if (b.avgCpa === 0) return -1;
      return a.avgCpa - b.avgCpa;
    });
  });

  return out;
}

// ============================================================================
// CONTEXT TYPE
// ============================================================================

export interface CanvasDataContextValue {
  creatives: VaultCreative[];
  hookGroups: DnaGroupMetrics[];
  angleGroups: DnaGroupMetrics[];
  formatGroups: DnaGroupMetrics[];
  pacingGroups: DnaGroupMetrics[];
  enrichments: Map<string, CreativeEnrichment>;
  allDesires: string[];
  allHookAnalyses: string[];
  allPersonas: PersonaProfile[];
  allTestingNotes: CreativeTestingNotes[];
  allFeatures: FeatureBenefit[];
  extracted: ExtractedDataSet;
  isLoading: boolean;
}

const CanvasDataContext = createContext<CanvasDataContextValue>({
  creatives: [],
  hookGroups: [],
  angleGroups: [],
  formatGroups: [],
  pacingGroups: [],
  enrichments: new Map(),
  allDesires: [],
  allHookAnalyses: [],
  allPersonas: [],
  allTestingNotes: [],
  allFeatures: [],
  extracted: EMPTY_EXTRACTED,
  isLoading: true,
});

export function useCanvasData() {
  return useContext(CanvasDataContext);
}

// ============================================================================
// PROVIDER
// ============================================================================

export function CanvasDataProvider({
  creatives,
  isLoading,
  children,
}: {
  creatives: VaultCreative[];
  isLoading: boolean;
  children: React.ReactNode;
}) {
  const dnaCreatives = useMemo(() =>
    creatives.filter(c => c.dna || c.dnaOverride),
    [creatives]
  );

  const hookGroups = useMemo(() =>
    groupBy(dnaCreatives, c => c.dnaOverride?.hookType || c.dna?.hookType),
    [dnaCreatives]
  );

  const angleGroups = useMemo(() =>
    groupBy(dnaCreatives, c => c.dnaOverride?.angle || c.dna?.angle),
    [dnaCreatives]
  );

  const formatGroups = useMemo(() =>
    groupBy(dnaCreatives, c => c.dnaOverride?.videoFormat || c.dna?.videoFormat),
    [dnaCreatives]
  );

  const pacingGroups = useMemo(() =>
    groupBy(dnaCreatives, c => c.dnaOverride?.visualPacing || c.dna?.visualPacing),
    [dnaCreatives]
  );

  // Load all enrichments from localStorage cache
  const enrichmentData = useMemo(() => loadAllEnrichments(creatives), [creatives]);
  const extracted = useMemo(() => loadExtractedData(creatives), [creatives]);

  const value = useMemo(() => ({
    creatives,
    hookGroups,
    angleGroups,
    formatGroups,
    pacingGroups,
    ...enrichmentData,
    extracted,
    isLoading,
  }), [creatives, hookGroups, angleGroups, formatGroups, pacingGroups, enrichmentData, extracted, isLoading]);

  return (
    <CanvasDataContext.Provider value={value}>
      {children}
    </CanvasDataContext.Provider>
  );
}
