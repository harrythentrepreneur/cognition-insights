'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { VaultCreative, CreativeDNA } from './CreativeVault';
import {
  HOOK_TYPE_COLORS, ANGLE_COLORS, FORMAT_COLORS, PACING_COLORS,
  HOOK_TYPES, ANGLES, FORMATS, PACINGS,
} from './CreativeVault';

// ============================================================================
// CREATIVE SYSTEM DATA TYPES
// ============================================================================

interface AwarenessQA { question: string; answer: string; }
interface AwarenessColumn { level: string; qaPairs: AwarenessQA[]; }
interface MarketDesires { primaryDesire: string; secondaryDesires: string[]; }
interface FeatureBenefit { feature: string; benefit: string; matchingDesire: string; coreUSP: string; }
interface PersonaProfile {
  ageGenderLocation: string; visibleCharacteristics: string; beliefs: string;
  desiredStatus: string; howProductHelps: string; failedSolutions: string;
  failureReasons: string; failedProducts: string; productFailureReasons: string;
  dailyStruggles: string;
}
interface CreativeTestingNotes {
  testHypothesis: string;
  adVariable: string;
  angleUSP: string;
}
interface CreativeSystemData {
  detectedAwarenessLevel?: string;
  awarenessQuestions: AwarenessColumn[];
  marketDesires: MarketDesires;
  featuresBenefits: FeatureBenefit[];
  persona: PersonaProfile;
  testingNotes: CreativeTestingNotes;
}

// ============================================================================
// DEEP EXTRACTION TYPES (Two-step pipeline)
// ============================================================================

interface RawVideoScene {
  sceneNumber: number;
  timestamp: string;
  description: string;
  dialogue: string;
  textOnScreen: string;
  visualElements: string;
  audioElements: string;
}

interface AdStructureSection {
  timestamp?: string;
  section?: string;
  script?: string;
  textOnScreen?: string;
  visual?: string;
  whyItWorks?: string;
  offer?: string;
}

interface RawAdExtraction {
  mediaType: 'image' | 'video' | 'carousel';
  adType?: string;
  totalDuration?: string;
  // For video: hook/cta are objects, body is an array of timed sections
  // For image: hook/body/offer/cta are plain strings
  adStructure?: {
    hook?: AdStructureSection | string;
    body?: AdStructureSection[] | string;
    cta?: AdStructureSection | string;
    offer?: string;
    copyFramework?: string;
  };
  script?: {
    fullTranscript?: string;
    allTextOverlays?: string[];
    allTextInAd?: string[];
    headlineCopy?: string;
    bodyCopy?: string;
    ctaCopy?: string;
    spokenHook?: string;
    spokenCTA?: string;
  };
  creativeDetails?: {
    peopleInAd?: string;
    productShown?: string;
    brandElements?: string;
    musicAndAudio?: string;
    subtitles?: string;
    proofElements?: string;
    urgency?: string;
    [key: string]: any;
  };
  rawAdCopy?: {
    headline: string | null;
    body: string | null;
    description: string | null;
    linkUrl: string | null;
    fullTranscript?: string | null;
    allTextOverlays?: string[];
    spokenHook?: string | null;
    spokenCTA?: string | null;
    ctaOffer?: string | null;
    hookText?: string | null;
  };
  visualCraft?: {
    scrollStopper?: string;
    visualHierarchy?: string[];
    layoutTemplate?: string;
    colorAndContrast?: string;
    textToVisualRatio?: string;
    nativeness?: string;
  };
  avatarAndMarket?: {
    targetAvatar?: string;
    avatarEvidence?: string;
    marketSophistication?: string;
    awarenessAssumed?: string;
    implicitPromise?: string;
    coreDesire?: string;
  };
  // Legacy fields (kept for backwards compat with cached extractions)
  rawMediaAnalysis?: Record<string, any>;
  rawObservations?: Record<string, any>;
  additionalDetails?: Array<{ observation: string } | string>;
}

interface AdClassification {
  mediaType: string;
  hookType: string;
  hookExplanation: string;
  angle: string;
  angleExplanation: string;
  format: string;
  formatExplanation: string;
  visualPacing: string;
  trueAngle: string;
  videoType: string;
  copywritingFramework: string;
  awarenessLevel: string;
  emotionalDriver: string;
  ctaType: string;
  productionTier: string;
  summary: string;
  imageSubtype?: string;
  imageHookSubtype?: string;
}

// ============================================================================
// AD X-RAY PANEL — slide-out deep-dive panel from right
// ============================================================================

function formatLabel(val: string): string {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface AdXRayPanelProps {
  creative: VaultCreative;
  onClose: () => void;
  onDnaOverride: (adId: string, category: string, value: string) => void;
}

// ============================================================================
// EDITABLE DNA PILL for X-Ray panel
// ============================================================================

interface XRayDnaPillProps {
  label: string;
  value: string;
  colorMap: Record<string, string>;
  options: readonly string[];
  category: string;
  onOverride: (category: string, value: string) => void;
  isOverridden?: boolean;
}

function XRayDnaPill({ label, value, colorMap, options, category, onOverride, isOverridden }: XRayDnaPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const color = colorMap[value] || '#6B7280';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: '10px',
          background: isOpen ? T.innerBg : 'rgba(0,0,0,0.15)',
          border: `1px solid ${isOpen ? `${color}40` : T.borderSubtle}`,
          cursor: 'pointer',
          textAlign: 'left' as const,
          outline: 'none',
          transition: 'all 0.2s ease',
          display: 'block',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${color}30`;
          e.currentTarget.style.background = T.innerBg;
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = T.borderSubtle;
            e.currentTarget.style.background = 'rgba(0,0,0,0.15)';
          }
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '6px',
        }}>
          <span style={{
            fontSize: '9px', fontWeight: 600, color: T.textDim,
            textTransform: 'uppercase' as const, letterSpacing: '0.06em',
            fontFamily: T.font,
          }}>
            {label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isOverridden && (
              <span style={{ fontSize: '8px', color: '#6B7280' }}>✎ edited</span>
            )}
            <span style={{ fontSize: '7px', color: '#52525B' }}>▾</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: color, flexShrink: 0,
            boxShadow: `0 0 8px ${color}40`,
          }} />
          <span style={{
            fontSize: '13px', fontWeight: 600, color: color,
            fontFamily: "'Inter', sans-serif",
          }}>
            {formatLabel(value)}
          </span>
        </div>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          zIndex: 100,
          padding: '6px',
          borderRadius: '12px',
          backgroundColor: T.panelBg,
          border: `1px solid ${T.cardBorder}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          animation: 'xrayDropdownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {options.map(opt => {
            const optColor = colorMap[opt] || '#6B7280';
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                onClick={() => { onOverride(category, opt); setIsOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '8px 10px',
                  border: 'none', borderRadius: '7px',
                  background: isSelected ? `${optColor}15` : 'transparent',
                  color: isSelected ? optColor : '#D4D4D8',
                  fontSize: '12px', fontWeight: isSelected ? 600 : 400,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer', textAlign: 'left' as const,
                  outline: 'none', transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = optColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#D4D4D8';
                  }
                }}
              >
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: optColor, flexShrink: 0,
                  boxShadow: isSelected ? `0 0 6px ${optColor}60` : 'none',
                }} />
                {formatLabel(opt)}
                {isSelected && <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PANEL
// ============================================================================

export function AdXRayPanel({ creative, onClose, onDnaOverride }: AdXRayPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergedClassificationRef = useRef<object | null>(null);
  const mergedSystemRef = useRef<object | null>(null);
  const mergeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge toast — briefly surfaces the result of the entity-merger pipeline
  // so the user can see that canonical entities were matched/created.
  interface MergeToast {
    matched: number;   // judge + fingerprint merges into an existing entity
    created: number;   // brand new canonical entities
    total: number;     // results.length
    error?: string;
  }
  const [mergeToast, setMergeToast] = useState<MergeToast | null>(null);

  // Creative System state
  const [systemData, setSystemData] = useState<CreativeSystemData | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Deep Extraction pipeline state
  const [rawExtraction, setRawExtraction] = useState<RawAdExtraction | null>(null);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [classification, setClassification] = useState<AdClassification | null>(null);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [extractionStep, setExtractionStep] = useState<'idle' | 'raw' | 'classify' | 'done'>('idle');

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Reset local state when the creative changes
  useEffect(() => {
    setCopied(false);
    setIsClosing(false);
    setSystemError(null);
    setRawError(null);
    setClassifyError(null);
    abortRef.current?.abort();
    abortRef.current = null;
    mergedClassificationRef.current = null;
    mergedSystemRef.current = null;
    setMergeToast(null);
    if (mergeToastTimerRef.current) {
      clearTimeout(mergeToastTimerRef.current);
      mergeToastTimerRef.current = null;
    }

    // Check localStorage for cached analysis (legacy)
    try {
      const cached = localStorage.getItem(`xray-analysis:${creative.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setAiSummary(parsed.overallVerdict || parsed.hook || 'Analysis complete.');
      } else { setAiSummary(null); }
    } catch (_e) { setAiSummary(null); }
    setIsAnalyzing(false);

    // Check localStorage for cached creative system data.
    // Drop and re-extract if the shape is legacy (pre-2026-04): marketDesires
    // as an array, awarenessQuestions with 5 columns, or testingNotes.adConcept.
    try {
      const cachedSys = localStorage.getItem(`xray-system:${creative.id}`);
      if (cachedSys) {
        const parsed = JSON.parse(cachedSys);
        const isLegacy =
          Array.isArray(parsed?.marketDesires) ||
          parsed?.testingNotes?.adConcept !== undefined ||
          (Array.isArray(parsed?.awarenessQuestions) && parsed.awarenessQuestions.length >= 4);
        if (isLegacy) {
          localStorage.removeItem(`xray-system:${creative.id}`);
          setSystemData(null);
        } else {
          setSystemData(parsed);
        }
      } else { setSystemData(null); }
    } catch (_e) { setSystemData(null); }
    setSystemLoading(false);

    // Check localStorage for cached deep extraction data.
    // Drop if legacy (has freeformAnalysis / avatar / rawMediaAnalysis / dominantColors /
    // rawObservations / additionalDetails / visualStyle in creativeDetails).
    try {
      const cachedRaw = localStorage.getItem(`xray-raw:${creative.id}`);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        const cd = parsed?.creativeDetails || {};
        const isLegacy =
          parsed?.freeformAnalysis !== undefined ||
          parsed?.avatar !== undefined ||
          parsed?.rawMediaAnalysis !== undefined ||
          parsed?.rawObservations !== undefined ||
          parsed?.additionalDetails !== undefined ||
          parsed?.dominantColors !== undefined ||
          cd.visualStyle !== undefined ||
          cd.pacing !== undefined ||
          cd.emotionalTone !== undefined ||
          cd.brandElements !== undefined;
        if (isLegacy) {
          localStorage.removeItem(`xray-raw:${creative.id}`);
          localStorage.removeItem(`xray-classify:${creative.id}`);
          setRawExtraction(null);
        } else {
          setRawExtraction(parsed);
        }
      } else { setRawExtraction(null); }
    } catch (_e) { setRawExtraction(null); }
    setRawLoading(false);

    try {
      const cachedClassify = localStorage.getItem(`xray-classify:${creative.id}`);
      if (cachedClassify) { setClassification(JSON.parse(cachedClassify)); }
      else { setClassification(null); }
    } catch (_e) { setClassification(null); }
    setClassifyLoading(false);

    // Set extraction step based on cached state
    try {
      const hasRaw = !!localStorage.getItem(`xray-raw:${creative.id}`);
      const hasClassify = !!localStorage.getItem(`xray-classify:${creative.id}`);
      setExtractionStep(hasClassify ? 'done' : hasRaw ? 'classify' : 'idle');
    } catch (_e) { setExtractionStep('idle'); }
  }, [creative.id]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // Close with animation — uses ref for cleanup
  const handleClose = useCallback(() => {
    if (isClosing) return; // prevent double-close
    setIsClosing(true);
    closingTimerRef.current = setTimeout(onClose, 280);
  }, [onClose, isClosing]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  // Prevent body scroll — save and restore previous value
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Auto-merge canonical entities once classification (and optionally
  // creative system data) are available. Tracks refs so re-extracting an
  // ad (new classification object identity) re-fires the merger. Server
  // is gated by ENABLE_ENTITY_MERGE so this is dormant until flipped.
  useEffect(() => {
    if (!classification) return;
    // Only fire if at least one of the two inputs has CHANGED since the
    // last fire for this creative. Both null-check and identity-check.
    const classificationChanged = mergedClassificationRef.current !== classification;
    const systemChanged = mergedSystemRef.current !== systemData && systemData != null;
    if (!classificationChanged && !systemChanged) return;

    mergedClassificationRef.current = classification;
    mergedSystemRef.current = systemData;

    const controller = new AbortController();
    fetch('/api/ad-tracker/merge-entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adId: creative.id,
        classification,
        creativeSystem: systemData || null,
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(json => {
        if (json?.error) {
          console.warn('[merge-entities]', json.error);
          setMergeToast({ matched: 0, created: 0, total: 0, error: json.error });
        } else if (json?.data?.disabled) {
          // Flag not on — stay silent.
          return;
        } else if (Array.isArray(json?.data?.results)) {
          const results = json.data.results as Array<{ decision: string }>;
          const matched = results.filter(r => r.decision === 'fingerprint' || r.decision === 'judge_matched').length;
          const created = results.filter(r => r.decision === 'inserted_new').length;
          if (results.length === 0) return;
          setMergeToast({ matched, created, total: results.length });
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.warn('[merge-entities] failed', err);
          setMergeToast({ matched: 0, created: 0, total: 0, error: 'network error' });
        }
      });

    return () => controller.abort();
  }, [creative.id, classification, systemData]);

  // Auto-dismiss the merge toast 4s after it appears.
  useEffect(() => {
    if (!mergeToast) return;
    if (mergeToastTimerRef.current) clearTimeout(mergeToastTimerRef.current);
    mergeToastTimerRef.current = setTimeout(() => setMergeToast(null), 4000);
    return () => {
      if (mergeToastTimerRef.current) clearTimeout(mergeToastTimerRef.current);
    };
  }, [mergeToast]);

  const m = creative.metrics;
  const dna = creative.dna;
  const override = creative.dnaOverride || {};
  const isVideo = creative.type === 'video' && creative.videoSourceUrl;
  const imageSrc = creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl;
  const displaySummary = aiSummary || dna?.summary || null;

  // Fetch creative system data (runs in parallel with analyze)
  const fetchCreativeSystem = useCallback(async (signal: AbortSignal) => {
    if (systemData) return;
    setSystemLoading(true);
    setSystemError(null);
    try {
      const dnaData = creative.dna;
      const ov = creative.dnaOverride || {};
      const mUrl = creative.videoSourceUrl || creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl;
      const res = await fetch('/api/ad-tracker/extract-creative-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: creative.id,
          adName: creative.name,
          adBody: creative.body || '',
          adHeadline: creative.headline || '',
          platform: creative.platform,
          hookType: ov.hookType || dnaData?.hookType || '',
          angle: ov.angle || dnaData?.angle || '',
          format: ov.videoFormat || dnaData?.videoFormat || '',
          awarenessLevel: classification?.awarenessLevel || '',
          mediaUrl: mUrl || '',
          mediaType: creative.type === 'video' ? 'video' : 'image',
        }),
        signal,
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      if (result.data) {
        setSystemData(result.data);
        setExpandedSections(new Set(['awareness']));
        try { localStorage.setItem(`xray-system:${creative.id}`, JSON.stringify(result.data)); } catch (_e) {}
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setSystemError(err.message || 'Failed to extract creative system data');
    } finally {
      setSystemLoading(false);
    }
  }, [creative, systemData]);

  // ================================================================
  // DEEP EXTRACTION PIPELINE (Two-step)
  // Step 1: Raw extraction from media
  // Step 2: Classification from raw text
  // ================================================================

  const handleDeepExtract = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ── STEP 1: Raw Extraction ──
      let rawData = rawExtraction;
      if (!rawData) {
        setExtractionStep('raw');
        setRawLoading(true);
        setRawError(null);

        const isVideo = creative.type === 'video'
        const mUrl = isVideo
          ? (creative.videoSourceUrl || creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl)
          : (creative.fullPictureUrl || creative.imageUrl || creative.thumbnailUrl);
        if (isVideo && !creative.videoSourceUrl) {
          console.warn(`[AdXRay] Video ad "${creative.name}" has no videoSourceUrl — falling back to image URL. Video analysis will be limited.`)
        }
        const rawRes = await fetch('/api/ad-tracker/extract-ad-raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adId: creative.id,
            mediaUrl: mUrl || '',
            mediaType: isVideo ? 'video' : 'image',
            adName: creative.name,
            adHeadline: creative.headline || '',
            adBody: creative.body || '',
            adDescription: creative.description || '',
            linkUrl: creative.linkUrl || '',
          }),
          signal: controller.signal,
        });
        const rawResult = await rawRes.json();
        if (rawResult.error) throw new Error(`Raw extraction: ${rawResult.error}`);
        rawData = rawResult.data;
        setRawExtraction(rawData);
        setRawLoading(false);
        try { localStorage.setItem(`xray-raw:${creative.id}`, JSON.stringify(rawData)); } catch (_e) {}
      }

      // ── STEP 2: Classification ──
      if (!classification && rawData) {
        setExtractionStep('classify');
        setClassifyLoading(true);
        setClassifyError(null);

        const classifyRes = await fetch('/api/ad-tracker/classify-ad-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adId: creative.id,
            rawExtraction: rawData,
          }),
          signal: controller.signal,
        });
        const classifyResult = await classifyRes.json();
        if (classifyResult.error) throw new Error(`Classification: ${classifyResult.error}`);
        setClassification(classifyResult.data);
        setClassifyLoading(false);
        setAiSummary(classifyResult.data?.summary || 'Classification complete.');
        try { localStorage.setItem(`xray-classify:${creative.id}`, JSON.stringify(classifyResult.data)); } catch (_e) {}
        try { localStorage.setItem(`xray-analysis:${creative.id}`, JSON.stringify({ overallVerdict: classifyResult.data?.summary })); } catch (_e) {}
      }

      setExtractionStep('done');
      setExpandedSections(new Set(['rawMedia', 'classification']));

      // Also fire the legacy creative system extraction in parallel (non-blocking)
      if (!systemData) {
        fetchCreativeSystem(controller.signal).catch(() => {});
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Deep extraction error:', err);
      if (extractionStep === 'raw') {
        setRawError(err.message || 'Failed to extract raw data');
        setRawLoading(false);
      } else {
        setClassifyError(err.message || 'Failed to classify');
        setClassifyLoading(false);
      }
    } finally {
      setIsAnalyzing(false);
      abortRef.current = null;
    }
  }, [creative, isAnalyzing, rawExtraction, classification, systemData, extractionStep, fetchCreativeSystem]);

  // Legacy analyze (kept for backward compat — redirects to deep extract)
  const handleAnalyze = handleDeepExtract;

  const handleCopyDna = useCallback(() => {
    if (!dna) return;
    const text = `🧬 Creative DNA: ${creative.name}\n\n` +
      `Hook: ${formatLabel(override.hookType || dna.hookType)}\n` +
      `Angle: ${formatLabel(override.angle || dna.angle)}\n` +
      `Format: ${formatLabel(override.videoFormat || dna.videoFormat)}\n` +
      `Pacing: ${formatLabel(override.visualPacing || dna.visualPacing)}\n\n` +
      (displaySummary ? `Summary: ${displaySummary}` : '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [creative, dna, override, displaySummary]);

  // Copy the complete extraction data as clean JSON
  const [jsonCopied, setJsonCopied] = useState(false);
  const jsonCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyJson = useCallback(() => {
    const jsonData: Record<string, any> = {
      adId: creative.id,
      adName: creative.name,
      mediaType: creative.type,
      platform: creative.platform,
      status: creative.status,
    };

    // Add raw extraction data
    if (rawExtraction) {
      jsonData.rawExtraction = rawExtraction;
    }

    // Add classification data
    if (classification) {
      jsonData.classification = classification;
    }

    // Add DNA data
    if (dna) {
      jsonData.creativeDNA = {
        hookType: override.hookType || dna.hookType,
        angle: override.angle || dna.angle,
        format: override.videoFormat || dna.videoFormat,
        pacing: override.visualPacing || dna.visualPacing,
        summary: dna.summary,
      };
    }

    // Add performance metrics
    if (creative.metrics) {
      jsonData.performance = creative.metrics;
    }

    // Add creative system data
    if (systemData) {
      jsonData.creativeSystem = systemData;
    }

    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    setJsonCopied(true);
    if (jsonCopiedTimerRef.current) clearTimeout(jsonCopiedTimerRef.current);
    jsonCopiedTimerRef.current = setTimeout(() => setJsonCopied(false), 2500);
  }, [creative, rawExtraction, classification, dna, override, systemData]);

  const fmtUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const roas = m.roas || 0;
  const roasColor = roas >= 3 ? '#06D6A0' : roas >= 2 ? '#34D399' : roas >= 1 ? '#F59E0B' : '#EF4444';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          animation: isClosing ? 'xrayBackdropOut 0.28s ease forwards' : 'xrayBackdropIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '540px',
          maxWidth: '95vw',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0E0E1C',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
          animation: isClosing ? 'xraySlideOut 0.28s ease forwards' : 'xraySlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
          scrollbarWidth: 'thin' as const,
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        {/* Merge toast — surfaces the entity-merger outcome briefly */}
        {mergeToast && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 10000,
              maxWidth: 360,
              padding: '8px 12px',
              borderRadius: 8,
              background: mergeToast.error
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(168, 85, 247, 0.14)',
              border: `1px solid ${mergeToast.error ? 'rgba(239,68,68,0.4)' : 'rgba(168,85,247,0.35)'}`,
              backdropFilter: 'blur(8px)',
              color: '#fff',
              fontSize: 11,
              lineHeight: 1.4,
              boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
              animation: 'xrayToastIn 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>{mergeToast.error ? '⚠' : '🧬'}</span>
            <div style={{ flex: 1 }}>
              {mergeToast.error ? (
                <>
                  <div style={{ fontWeight: 600, color: '#fca5a5' }}>Merge failed</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>
                    {mergeToast.error}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: '#E9D5FF' }}>
                    Canonical entities updated
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>
                    {mergeToast.matched > 0 && (
                      <>
                        <strong>{mergeToast.matched}</strong> merged into existing
                      </>
                    )}
                    {mergeToast.matched > 0 && mergeToast.created > 0 && ' · '}
                    {mergeToast.created > 0 && (
                      <>
                        <strong>{mergeToast.created}</strong> new
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setMergeToast(null)}
              className="nodrag"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: 12,
                padding: 2,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="xray-close-btn"
          style={{
            position: 'absolute',
            top: '16px', right: '16px',
            width: '36px', height: '36px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: 'rgba(255,255,255,0.03)',
            color: T.textSecondary,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 10,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.textMuted;
            e.currentTarget.style.color = T.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.cardBorder;
            e.currentTarget.style.color = T.textSecondary;
          }}
        >
          ✕
        </button>

        {/* Media Player */}
        <div style={{
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#0A0A16',
          position: 'relative' as const,
          flexShrink: 0,
          overflow: 'hidden',
          borderBottom: `1px solid ${T.cardBorder}`,
        }}>
          {/* Gradient overlay at bottom for depth */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '60px', zIndex: 2,
            background: `linear-gradient(transparent, ${T.panelBg})`,
            pointerEvents: 'none',
          }} />
          {isVideo ? (
            <video
              src={creative.videoSourceUrl!}
              controls autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : imageSrc ? (
            <img src={imageSrc} alt={creative.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(145deg, #0a0a1a, #1a102e)',
              fontSize: '48px', color: 'rgba(255,255,255,0.08)',
            }}>
              {creative.type === 'video' ? '▶' : '🖼'}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Ad Identity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
              <span style={{
                padding: '4px 10px', borderRadius: '6px',
                backgroundColor: `${creative.platformColor}14`,
                border: `1px solid ${creative.platformColor}28`,
                fontSize: '10px', fontWeight: 700, color: creative.platformColor,
                fontFamily: T.font, letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
              }}>
                {creative.platform}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '6px',
                backgroundColor: creative.status === 'active' ? 'rgba(6,214,160,0.08)' : 'rgba(107,114,128,0.08)',
                border: `1px solid ${creative.status === 'active' ? 'rgba(6,214,160,0.2)' : T.borderSubtle}`,
                fontSize: '10px', fontWeight: 600,
                color: creative.status === 'active' ? T.green : T.textSecondary,
              }}>
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  backgroundColor: creative.status === 'active' ? T.green : T.textSecondary,
                  boxShadow: creative.status === 'active' ? `0 0 6px ${T.green}80` : 'none',
                }} />
                {creative.status === 'active' ? 'Active' : 'Paused'}
              </span>
              <span style={{
                padding: '4px 10px', borderRadius: '6px',
                backgroundColor: T.innerBg,
                border: `1px solid ${T.borderSubtle}`,
                fontSize: '10px', fontWeight: 500, color: T.textSecondary,
                fontFamily: T.font,
              }}>
                {creative.type}
              </span>
              {creative.postUrl && (
                <a href={creative.postUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    marginLeft: 'auto',
                    padding: '4px 10px', borderRadius: '6px',
                    backgroundColor: T.innerBg,
                    border: `1px solid ${T.borderSubtle}`,
                    fontSize: '10px', color: T.textMuted, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'all 0.2s ease', fontFamily: T.font,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.cardBorder; e.currentTarget.style.color = T.textSecondary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.borderSubtle; e.currentTarget.style.color = T.textMuted; }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  View Post
                </a>
              )}
            </div>
            <h2 style={{
              margin: 0, fontSize: '20px', fontWeight: 700,
              color: T.textPrimary, fontFamily: T.font,
              letterSpacing: '-0.02em', lineHeight: 1.3,
            }}>
              {creative.name}
            </h2>
          </div>

          {/* Performance Metrics */}
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1px', background: 'rgba(255,255,255,0.04)',
            }}>
              <div style={{
                padding: '14px 12px',
                background: 'rgba(255,255,255,0.015)',
                textAlign: 'center' as const,
              }}>
                <div style={{
                  fontSize: '9px', fontWeight: 600, color: '#6B7280',
                  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                  fontFamily: T.font, marginBottom: '6px',
                }}>ROAS</div>
                <div style={{
                  fontSize: '20px', fontWeight: 700, color: roasColor,
                  fontFamily: T.mono,
                  letterSpacing: '-0.03em',
                }}>{roas.toFixed(2)}x</div>
              </div>
              {[
                { label: 'Spend', value: fmtUSD(m['ad-spend'] || m.spend || 0) },
                { label: 'CPA', value: m.cpa > 0 ? fmtUSD(m.cpa) : '—' },
                { label: 'CTR', value: `${(m.ctr || 0).toFixed(2)}%` },
                { label: 'CPC', value: fmtUSD(m.cpc || 0) },
                { label: 'Impr.', value: (m.impressions || 0).toLocaleString() },
                { label: 'Purchases', value: (m.conversions || 0).toLocaleString() },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: '14px 12px',
                  background: 'rgba(255,255,255,0.015)',
                  textAlign: 'center' as const,
                }}>
                  <div style={{
                    fontSize: '9px', fontWeight: 600, color: '#6B7280',
                    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                    fontFamily: T.font, marginBottom: '6px',
                  }}>{stat.label}</div>
                  <div style={{
                    fontSize: '13px', fontWeight: 600, color: '#E5E7EB',
                    fontFamily: T.mono, letterSpacing: '-0.02em',
                  }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {dna && (
            <div style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(165deg, rgba(20,20,38,0.6) 0%, rgba(14,14,28,0.8) 100%)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF',
                  fontFamily: T.font, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                }}>Creative DNA</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handleCopyDna} style={{
                    padding: '3px 10px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: copied ? T.green : '#6B7280',
                    fontSize: '10px', fontWeight: 500, cursor: 'pointer',
                    fontFamily: T.font, outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                  {(rawExtraction || classification) && (
                    <button onClick={handleCopyJson} style={{
                      padding: '3px 10px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: jsonCopied ? T.green : '#6B7280',
                      fontSize: '10px', fontWeight: 500, cursor: 'pointer',
                      fontFamily: T.font, outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      {jsonCopied ? '✓ Copied' : 'JSON'}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <XRayDnaPill
                  label="Hook Type" value={override.hookType || dna.hookType}
                  colorMap={HOOK_TYPE_COLORS} options={HOOK_TYPES} category="hookType"
                  onOverride={(cat, val) => onDnaOverride(creative.id, cat, val)}
                  isOverridden={!!override.hookType}
                />
                <XRayDnaPill
                  label="Angle" value={override.angle || dna.angle}
                  colorMap={ANGLE_COLORS} options={ANGLES} category="angle"
                  onOverride={(cat, val) => onDnaOverride(creative.id, cat, val)}
                  isOverridden={!!override.angle}
                />
                <XRayDnaPill
                  label="Format" value={override.videoFormat || dna.videoFormat}
                  colorMap={FORMAT_COLORS} options={FORMATS} category="videoFormat"
                  onOverride={(cat, val) => onDnaOverride(creative.id, cat, val)}
                  isOverridden={!!override.videoFormat}
                />
                <XRayDnaPill
                  label="Pacing" value={override.visualPacing || dna.visualPacing}
                  colorMap={PACING_COLORS} options={PACINGS} category="visualPacing"
                  onOverride={(cat, val) => onDnaOverride(creative.id, cat, val)}
                  isOverridden={!!override.visualPacing}
                />
              </div>
            </div>
          )}

          {/* DNA Loading State */}
          {creative.dnaLoading && !dna && (
            <div style={{
              padding: '16px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <div style={{
                width: '16px', height: '16px',
                border: '2px solid rgba(255,255,255,0.06)',
                borderTopColor: '#A855F7',
                borderRadius: '50%',
                animation: 'xraySpin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite',
              }} />
              <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: T.font }}>
                Extracting DNA...
              </span>
            </div>
          )}

          {/* AI Deep Extraction */}
          <div style={{
            padding: '16px', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(165deg, rgba(20,20,38,0.6) 0%, rgba(14,14,28,0.8) 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: isAnalyzing || classification?.summary || displaySummary ? '12px' : '0',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', fontFamily: T.font,
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              }}>
                Deep Extraction
                {extractionStep !== 'idle' && extractionStep !== 'done' && (
                  <span style={{
                    marginLeft: '8px', fontSize: '9px', color: T.accent,
                    fontWeight: 500, letterSpacing: '0',
                    textTransform: 'none' as const,
                  }}>
                    {extractionStep === 'raw' ? 'Step 1/2...' : 'Step 2/2...'}
                  </span>
                )}
              </span>
              {(!rawExtraction || !classification) && !isAnalyzing && (
                <button onClick={handleDeepExtract} style={{
                  padding: '6px 14px', borderRadius: '8px',
                  background: 'rgba(168,85,247,0.08)',
                  border: '1px solid rgba(168,85,247,0.15)',
                  color: '#A855F7', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: T.font,
                  outline: 'none', transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.15)'; }}
                >
                  {rawExtraction ? 'Classify' : 'Extract & Classify'}
                </button>
              )}
            </div>

            {isAnalyzing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.06)',
                  borderTopColor: '#A855F7',
                  borderRadius: '50%',
                  animation: 'xraySpin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite',
                }} />
                <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: T.font }}>
                  {extractionStep === 'raw' ? 'Extracting raw data...' : 'Classifying...'}
                </span>
              </div>
            ) : classification?.summary ? (
              <p style={{
                margin: 0, fontSize: '12px', color: '#D4D4D8',
                lineHeight: 1.65, fontFamily: T.font,
              }}>
                {classification.summary}
              </p>
            ) : displaySummary ? (
              <p style={{
                margin: 0, fontSize: '12px', color: '#D4D4D8',
                lineHeight: 1.65, fontFamily: T.font,
              }}>
                {displaySummary}
              </p>
            ) : null}

            {/* Error states */}
            {rawError && (
              <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span style={{ fontSize: '11px', color: T.red }}>Raw extraction failed: {rawError}</span>
              </div>
            )}
            {classifyError && (
              <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span style={{ fontSize: '11px', color: T.red }}>Classification failed: {classifyError}</span>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* EXISTING AD DATA — always visible, no extraction needed       */}
          {/* ============================================================ */}

          {dna && (
            <JsonOutputBlock title="Creative DNA" data={{
              hookType: override.hookType || dna.hookType,
              angle: override.angle || dna.angle,
              format: override.videoFormat || dna.videoFormat,
              pacing: override.visualPacing || dna.visualPacing,
              ...(dna.summary ? { summary: dna.summary } : {}),
            }} />
          )}

          <JsonOutputBlock title="Performance Metrics" data={{
            roas: roas.toFixed(2) + 'x',
            spend: fmtUSD(m['ad-spend'] || m.spend || 0),
            cpa: m.cpa > 0 ? fmtUSD(m.cpa) : 'N/A',
            ctr: (m.ctr || 0).toFixed(2) + '%',
            cpc: fmtUSD(m.cpc || 0),
            impressions: (m.impressions || 0).toLocaleString(),
            purchases: (m.conversions || 0).toLocaleString(),
          }} />

          <JsonOutputBlock title="Ad Info" data={{
            id: creative.id,
            name: creative.name,
            platform: creative.platform,
            status: creative.status,
            type: creative.type,
            ...(creative.headline ? { headline: creative.headline } : {}),
            ...(creative.body ? { body: creative.body } : {}),
            ...(creative.postUrl ? { postUrl: creative.postUrl } : {}),
            ...(creative.videoSourceUrl ? { videoUrl: creative.videoSourceUrl } : {}),
            ...(creative.fullPictureUrl ? { imageUrl: creative.fullPictureUrl } : {}),
          }} />

          {/* ============================================================ */}
          {/* DEEP EXTRACTION OUTPUTS — appear after Extract & Classify     */}
          {/* ============================================================ */}

          {(classification || rawExtraction) && (
            <div style={{
              fontSize: '11px', fontWeight: 600, color: T.textMuted,
              textTransform: 'uppercase' as const, letterSpacing: '0.1em',
              fontFamily: T.font, borderBottom: `1px solid ${T.cardBorder}`,
              paddingBottom: '10px',
            }}>Deep Extraction Output</div>
          )}

          {classification && (() => {
            const d: Record<string, any> = {};
            if (classification.hookType) d.hookType = classification.hookType;
            if (classification.hookExplanation) d.hookExplanation = classification.hookExplanation;
            if (classification.angle) d.angle = classification.angle;
            if (classification.angleExplanation) d.angleExplanation = classification.angleExplanation;
            if (classification.format) d.format = classification.format;
            if (classification.imageSubtype && classification.imageSubtype !== 'n/a') d.imageSubtype = classification.imageSubtype;
            if (classification.imageHookSubtype && classification.imageHookSubtype !== 'n/a') d.imageHookSubtype = classification.imageHookSubtype;
            if (classification.formatExplanation) d.formatExplanation = classification.formatExplanation;
            if (classification.visualPacing) d.visualPacing = classification.visualPacing;
            if (classification.videoType) d.videoType = classification.videoType;
            if (classification.copywritingFramework) d.copywritingFramework = classification.copywritingFramework;
            if (classification.awarenessLevel) d.awarenessLevel = classification.awarenessLevel;
            if (classification.ctaType) d.ctaType = classification.ctaType;
            if (classification.productionTier) d.productionTier = classification.productionTier;
            if (classification.trueAngle) d.trueAngle = classification.trueAngle;
            if (classification.emotionalDriver) d.emotionalDriver = classification.emotionalDriver;
            return <JsonOutputBlock title="Classification" data={d} />;
          })()}

          {rawExtraction?.rawAdCopy && (
            <JsonOutputBlock title="Ad Copy" data={rawExtraction.rawAdCopy} />
          )}

          {rawExtraction?.adStructure && (
            <SceneTimeline
              mediaType={rawExtraction.mediaType}
              adType={rawExtraction.adType}
              totalDuration={rawExtraction.totalDuration}
              structure={rawExtraction.adStructure}
              visualCraft={rawExtraction.visualCraft}
            />
          )}

          {rawExtraction?.creativeDetails && Object.values(rawExtraction.creativeDetails).some(Boolean) && (
            <JsonOutputBlock title="Creative Details" data={rawExtraction.creativeDetails} />
          )}

          {rawExtraction?.avatarAndMarket && Object.values(rawExtraction.avatarAndMarket).some(Boolean) && (
            <JsonOutputBlock title="Avatar & Market" data={rawExtraction.avatarAndMarket} />
          )}

          {rawExtraction?.rawMediaAnalysis && (
            <JsonOutputBlock title="Raw Media Analysis" data={rawExtraction.rawMediaAnalysis} />
          )}

          {rawExtraction?.rawObservations && (
            <JsonOutputBlock title="Raw Observations" data={rawExtraction.rawObservations} />
          )}

          {rawExtraction?.additionalDetails && rawExtraction.additionalDetails.length > 0 && (
            <JsonOutputBlock title="Additional Details" data={rawExtraction.additionalDetails} />
          )}

          {/* ============================================================ */}
          {/* CREATIVE SYSTEM DATA — 5 collapsible sections                */}
          {/* ============================================================ */}

          {systemLoading && !systemData && (
            <div style={{
              padding: '28px', borderRadius: '16px',
              backgroundColor: T.cardBg,
              border: `1px solid ${T.cardBorder}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '28px', height: '28px',
                border: `2px solid ${T.cardBorder}`,
                borderTopColor: T.accent,
                borderRadius: '50%',
                animation: 'xraySpin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite',
              }} />
              <span style={{ fontSize: '12px', color: T.textSecondary, fontFamily: T.font }}>
                Analyzing ad media & extracting creative system...
              </span>
            </div>
          )}

          {systemError && !systemData && (
            <div style={{
              padding: '14px 18px', borderRadius: '12px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '12px', color: T.red, fontFamily: T.font }}>
                {systemError}
              </span>
              <button
                onClick={() => { const c = new AbortController(); fetchCreativeSystem(c.signal); }}
                style={{
                  padding: '4px 12px', borderRadius: '6px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: T.red, fontSize: '10px', fontWeight: 600,
                  fontFamily: T.font, cursor: 'pointer', outline: 'none',
                }}
              >↻ Retry</button>
            </div>
          )}

          {systemData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                fontSize: '11px', fontWeight: 600, color: T.textMuted,
                textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                fontFamily: T.font, borderBottom: `1px solid ${T.cardBorder}`,
                paddingBottom: '10px',
              }}>Creative System · AI-extracted</div>

              {systemData.awarenessQuestions.length > 0 && (
                <JsonOutputBlock title="Awareness Questions" data={systemData.awarenessQuestions} />
              )}

              {systemData.marketDesires?.primaryDesire && (
                <JsonOutputBlock
                  title="Market Desires"
                  data={{
                    primary: systemData.marketDesires.primaryDesire,
                    ...(systemData.marketDesires.secondaryDesires?.length
                      ? { secondary: systemData.marketDesires.secondaryDesires }
                      : {}),
                  }}
                />
              )}

              {systemData.featuresBenefits.length > 0 && (
                <JsonOutputBlock title="Features & Benefits" data={systemData.featuresBenefits} />
              )}

              {systemData.persona?.ageGenderLocation && (
                <JsonOutputBlock title="Target Persona" data={systemData.persona} />
              )}

              {systemData.testingNotes?.testHypothesis && (
                <JsonOutputBlock title="Testing Notes" data={systemData.testingNotes} />
              )}
            </div>
          )}

          {/* Spacer for comfortable scrolling */}
          <div style={{ height: '20px' }} />
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes xraySlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes xraySlideOut {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes xrayBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes xrayBackdropOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes xraySpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes xrayDropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes xrayToastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ============================================================================
// DESIGN TOKENS — unified with the rest of the app
// ============================================================================

const T = {
  cardBg: '#1F1F35',
  cardBorder: '#2A2A45',
  panelBg: '#14141E',
  surfaceBg: 'rgba(255,255,255,0.02)',
  innerBg: 'rgba(255,255,255,0.03)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  accent: '#00F5D4',
  textPrimary: '#EEEEF5',
  textSecondary: '#9CA3AF',
  textMuted: '#5E5E7A',
  textDim: '#4A4A60',
  font: "'Inter', 'Lato', sans-serif",
  mono: "'SF Mono', 'JetBrains Mono', monospace",
  green: '#06D6A0',
  red: '#EF4444',
  yellow: '#F59E0B',
  blue: '#3B82F6',
  purple: '#A855F7',
  teal: '#4ECDC4',
  orange: '#FB8500',
  pink: '#FF6B6B',
};

const sysFieldLabel: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600, color: T.textDim,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  fontFamily: T.font, marginBottom: '4px',
};

const sysFieldValue: React.CSSProperties = {
  fontSize: '12px', color: '#D0D0E8',
  fontFamily: T.font, lineHeight: 1.6,
};

const innerCard: React.CSSProperties = {
  padding: '10px 12px', borderRadius: '8px',
  background: T.innerBg, border: `1px solid ${T.borderSubtle}`,
};

// ============================================================================
// JSON OUTPUT BLOCK — clean monospace textbox with title
// ============================================================================

function JsonOutputBlock({ title, data }: { title: string; data: any }) {
  const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <div>
      <div style={{
        fontSize: '10px', fontWeight: 600, color: '#6B7280',
        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
        fontFamily: T.font, marginBottom: '8px',
      }}>{title}</div>
      <div style={{
        padding: '14px',
        borderRadius: '12px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        overflow: 'auto',
        maxHeight: '400px',
        scrollbarWidth: 'thin' as const,
        scrollbarColor: 'rgba(255,255,255,0.08) transparent',
      }}>
        <pre style={{
          margin: 0,
          fontSize: '11px',
          lineHeight: 1.7,
          color: '#D4D4D8',
          fontFamily: T.mono,
          whiteSpace: 'pre-wrap' as const,
          wordBreak: 'break-word' as const,
          tabSize: 2,
        }}>{formatted}</pre>
      </div>
    </div>
  );
}

// ============================================================================
// SCENE TIMELINE — timestamped ad structure (hook → body → cta)
// ============================================================================

function SceneTimeline({
  mediaType, adType, totalDuration, structure, visualCraft,
}: {
  mediaType?: string;
  adType?: string;
  totalDuration?: string;
  structure: {
    hook?: AdStructureSection | string;
    body?: AdStructureSection[] | string;
    cta?: AdStructureSection | string;
    offer?: string;
    copyFramework?: string;
  };
  visualCraft?: {
    scrollStopper?: string;
    visualHierarchy?: string[];
    layoutTemplate?: string;
    colorAndContrast?: string;
    textToVisualRatio?: string;
    nativeness?: string;
  };
}) {
  const isImage = mediaType === 'image';
  const title = isImage ? 'Ad Structure' : 'Scene-by-Scene Breakdown';

  const toSection = (val: AdStructureSection | string | undefined): AdStructureSection | null => {
    if (!val) return null;
    if (typeof val === 'string') return { script: val };
    return val;
  };

  const sections: Array<{ kind: 'hook' | 'body' | 'offer' | 'cta' | 'visual'; label: string; data: AdStructureSection }> = [];

  if (isImage && visualCraft && (visualCraft.scrollStopper || visualCraft.layoutTemplate || (visualCraft.visualHierarchy && visualCraft.visualHierarchy.length > 0))) {
    const hierarchyText = Array.isArray(visualCraft.visualHierarchy) && visualCraft.visualHierarchy.length > 0
      ? visualCraft.visualHierarchy.map((h, i) => `${i + 1}. ${h}`).join('\n')
      : undefined;
    sections.push({
      kind: 'visual',
      label: 'Visual',
      data: {
        script: visualCraft.layoutTemplate,
        visual: hierarchyText,
        whyItWorks: visualCraft.scrollStopper,
      } as AdStructureSection,
    });
  }

  const hook = toSection(structure.hook);
  if (hook) sections.push({ kind: 'hook', label: 'Hook', data: hook });

  if (Array.isArray(structure.body)) {
    structure.body.forEach((b, i) => {
      sections.push({ kind: 'body', label: b.section || `Body ${i + 1}`, data: b });
    });
  } else {
    const body = toSection(structure.body);
    if (body) sections.push({ kind: 'body', label: 'Body', data: body });
  }

  if (structure.offer) {
    sections.push({ kind: 'offer', label: 'Offer', data: { script: structure.offer } });
  }

  const cta = toSection(structure.cta);
  if (cta) sections.push({ kind: 'cta', label: 'CTA', data: cta });

  if (sections.length === 0) return null;

  const kindColor = (kind: 'hook' | 'body' | 'offer' | 'cta' | 'visual') =>
    kind === 'visual' ? '#38BDF8'
    : kind === 'hook' ? '#F59E0B'
    : kind === 'cta' ? '#00F5D4'
    : kind === 'offer' ? '#EC4899'
    : '#8B5CF6';

  return (
    <div>
      <div style={{
        fontSize: '10px', fontWeight: 600, color: '#6B7280',
        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
        fontFamily: T.font, marginBottom: '8px',
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const,
      }}>
        <span>{title}</span>
        {!isImage && totalDuration && (
          <span style={{ color: T.textMuted, fontWeight: 500 }}>· {totalDuration}</span>
        )}
        {adType && (
          <span style={{ color: T.textMuted, fontWeight: 500 }}>· {adType}</span>
        )}
        {structure.copyFramework && (
          <span style={{ color: T.textMuted, fontWeight: 500 }}>· {structure.copyFramework}</span>
        )}
      </div>

      <div style={{
        padding: '16px',
        borderRadius: '12px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        display: 'flex', flexDirection: 'column' as const, gap: '14px',
      }}>
        {sections.map((s, i) => {
          const color = kindColor(s.kind);
          return (
            <div key={i} style={{
              position: 'relative' as const,
              paddingLeft: '16px',
              borderLeft: `2px solid ${color}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '8px', flexWrap: 'wrap' as const,
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '4px',
                  background: `${color}1A`, color,
                  fontFamily: T.font, letterSpacing: '0.04em',
                  textTransform: 'uppercase' as const,
                }}>{s.label}</span>
                {!isImage && s.data.timestamp && (
                  <span style={{
                    fontSize: '10px', color: T.textSecondary,
                    fontFamily: T.mono, fontWeight: 600,
                  }}>{s.data.timestamp}</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                {s.data.script && (
                  <SceneField label={s.kind === 'visual' ? 'Layout' : 'Script'} value={s.data.script} mono={s.kind !== 'visual'} />
                )}
                {s.data.visual && (
                  <SceneField label={s.kind === 'visual' ? 'Hierarchy' : 'Visual'} value={s.data.visual} />
                )}
                {s.data.textOnScreen && (
                  <SceneField label="On-Screen Text" value={s.data.textOnScreen} mono />
                )}
                {s.data.whyItWorks && (
                  <SceneField label={s.kind === 'visual' ? 'Scroll Stop' : 'Why It Works'} value={s.data.whyItWorks} />
                )}
                {s.data.offer && (
                  <SceneField label="Offer" value={s.data.offer} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SceneField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', lineHeight: 1.55 }}>
      <span style={{
        minWidth: '92px', color: T.textMuted, fontWeight: 600,
        fontFamily: T.font, textTransform: 'uppercase' as const,
        fontSize: '9px', letterSpacing: '0.06em', paddingTop: '2px',
      }}>{label}</span>
      <span style={{
        color: '#D4D4D8', flex: 1,
        fontFamily: mono ? T.mono : T.font,
        whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
      }}>{value}</span>
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

function CollapsibleSection({ title, icon, color, isOpen, onToggle, children }: {
  title: string; icon: string; color: string;
  isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: '16px', overflow: 'hidden',
      border: `1px solid ${isOpen ? T.cardBorder : T.borderSubtle}`,
      backgroundColor: isOpen ? T.cardBg : 'transparent',
      transition: 'all 0.2s ease',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '14px 16px',
          background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', outline: 'none',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span style={{ fontSize: '13px' }}>{icon}</span>}
          <span style={{
            fontSize: '13px', fontWeight: 600, color: isOpen ? '#EEEEF5' : '#9CA3AF',
            fontFamily: T.font, letterSpacing: '-0.01em',
            transition: 'color 0.2s ease',
          }}>{title}</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOpen ? '#9CA3AF' : '#4A4A60'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={{
          padding: '0 16px 16px',
          animation: 'xrayDropdownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyLabel() {
  return (
    <span style={{
      fontSize: '12px', color: T.textDim, fontStyle: 'italic',
      fontFamily: T.font,
    }}>No data extracted</span>
  );
}
