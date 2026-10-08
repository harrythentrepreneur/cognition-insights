'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Step {
  id: string;
  label: string;
  loading: boolean;
  error?: string | null;
}

interface Props {
  steps: Step[];
  /** Max time in ms to hold the loader before force-dismissing (safety net). */
  maxDurationMs?: number;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function AdTrackerBootLoader({ steps, maxDurationMs = 8000 }: Props) {
  const [shouldMount] = useState(() => steps.some(s => s.loading));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(typeof document !== 'undefined' ? document.body : null);
  }, []);

  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    steps.forEach(s => { m[s.id] = !s.loading; });
    return m;
  });
  const [fadingOut, setFadingOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const [forceComplete, setForceComplete] = useState(false);

  // Cursor-follow glow
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shouldMount) return;
    const onMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [shouldMount]);

  // Mark step done on !loading OR error (so API failures don't hang the loader)
  useEffect(() => {
    setDoneMap(prev => {
      const next = { ...prev };
      let changed = false;
      for (const s of steps) {
        const stepDone = !s.loading || !!s.error || forceComplete;
        if (stepDone && !next[s.id]) {
          next[s.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [steps, forceComplete]);

  // Safety net: never hold the loader for longer than maxDurationMs
  useEffect(() => {
    if (!shouldMount) return;
    const t = setTimeout(() => setForceComplete(true), maxDurationMs);
    return () => clearTimeout(t);
  }, [shouldMount, maxDurationMs]);

  const doneCount = steps.filter(s => doneMap[s.id]).length;
  const allDone = doneCount === steps.length;
  const progress = steps.length ? doneCount / steps.length : 1;

  useEffect(() => {
    if (!allDone || !shouldMount) return;
    const t1 = setTimeout(() => setFadingOut(true), 480);
    const t2 = setTimeout(() => setVisible(false), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [allDone, shouldMount]);

  if (!shouldMount || !visible || !portalTarget) return null;

  const activeIdx = steps.findIndex(s => !doneMap[s.id]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0A14',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        opacity: fadingOut ? 0 : 1,
        transition: `opacity 0.6s ${EASE}`,
        pointerEvents: fadingOut ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes adLoaderFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes adLoaderCheckDraw {
          from { stroke-dashoffset: 16; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes adLoaderLabelIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes adLoaderAmbientDrift {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          50%      { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
        }
        @keyframes adLoaderActivePulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
      `}</style>

      {/* Ambient brand glow — top-left, soft cyan */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '22%',
          width: 620,
          height: 620,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0, 245, 212, 0.09) 0%, rgba(0, 245, 212, 0.035) 35%, transparent 68%)',
          filter: 'blur(40px)',
          transform: 'translate(-50%, -50%)',
          animation: 'adLoaderAmbientDrift 9s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      {/* Ambient brand glow — bottom-right, soft purple */}
      <div
        style={{
          position: 'absolute',
          top: '78%',
          left: '78%',
          width: 540,
          height: 540,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.03) 40%, transparent 70%)',
          filter: 'blur(48px)',
          transform: 'translate(-50%, -50%)',
          animation: 'adLoaderAmbientDrift 11s ease-in-out infinite 1.5s',
          pointerEvents: 'none',
        }}
      />

      {/* Cursor-follow soft glow */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0, 245, 212, 0.055) 0%, rgba(0, 245, 212, 0.02) 40%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          padding: '0 32px',
          animation: `adLoaderFadeUp 0.75s ${EASE} both`,
        }}
      >
        {/* Monogram */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div
            style={{
              width: 22,
              height: 22,
              border: '1px solid rgba(255,255,255,0.85)',
              borderRadius: 3,
              position: 'relative',
              boxShadow: '0 0 24px rgba(0, 245, 212, 0.2)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 4,
                background: '#fff',
                borderRadius: 1,
              }}
            />
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 44,
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {allDone ? 'Ready' : 'Loading your data'}
        </div>

        {/* Counter + active label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 16,
            height: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.38)',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {allDone ? 'Complete' : `${String(doneCount).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`}
          </div>
          <div
            key={activeIdx}
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.38)',
              fontWeight: 500,
              animation: `adLoaderLabelIn 0.5s ${EASE} both`,
            }}
          >
            {allDone ? '' : activeIdx >= 0 ? steps[activeIdx].label : ''}
          </div>
        </div>

        {/* Hairline progress bar */}
        <div
          style={{
            width: '100%',
            height: 1,
            background: 'rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: 'left center',
              transform: `scaleX(${progress})`,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.85), #00F5D4)',
              transition: `transform 0.7s ${EASE}`,
              boxShadow: '0 0 12px rgba(0, 245, 212, 0.45)',
            }}
          />
        </div>

        {/* Step list */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column' }}>
          {steps.map((step) => (
            <StepRow
              key={step.id}
              label={step.label}
              done={!!doneMap[step.id]}
              active={!doneMap[step.id] && step.loading}
              errored={!!step.error && !step.loading}
            />
          ))}
        </div>
      </div>
    </div>,
    portalTarget
  );
}

function StepRow({
  label,
  done,
  active,
  errored,
}: {
  label: string;
  done: boolean;
  active: boolean;
  errored: boolean;
}) {
  const color = errored
    ? 'rgba(255,255,255,0.38)'
    : done
    ? 'rgba(255,255,255,0.52)'
    : active
    ? 'rgba(255,255,255,0.94)'
    : 'rgba(255,255,255,0.22)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 0',
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {errored ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 3L9 9M9 3L3 9"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        ) : done ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.2L4.8 9L10 3.2"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 16,
                animation: `adLoaderCheckDraw 0.42s ${EASE} both`,
              }}
            />
          </svg>
        ) : active ? (
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#fff',
              animation: 'adLoaderActivePulse 1.6s ease-in-out infinite',
            }}
          />
        ) : (
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
            }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: 13,
          color,
          fontWeight: 400,
          letterSpacing: '-0.005em',
          transition: `color 0.5s ${EASE}`,
        }}
      >
        {label}
      </span>
    </div>
  );
}
