'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { CANVAS_COLORS } from '../canvasTheme';

interface NodePriorityProps {
  nodeId: string;
  priority?: number;
  accentColor?: string;
}

export function NodePriority({ nodeId, priority = 5, accentColor = CANVAS_COLORS.textDim }: NodePriorityProps) {
  const { updateNodeData } = useReactFlow();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  // Only use accent color if priority has been edited away from default 5
  const activeColor = priority !== 5 ? accentColor : CANVAS_COLORS.textMuted;

  const handleSelect = useCallback((p: number) => {
    updateNodeData(nodeId, { priority: p });
    setOpen(false);
  }, [nodeId, updateNodeData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="nodrag nowheel" style={{ position: 'absolute', top: '8px', right: '10px', zIndex: 10 }}>
      {/* Target area */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 5px',
          borderRadius: '4px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          color: activeColor,
          fontSize: '8px',
          fontFamily: "'SF Mono', monospace",
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = open ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
          e.currentTarget.style.borderColor = open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
        }}
        title="Priority (1-10)"
      >
        <span>★</span>
        <span>{priority}</span>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: '0',
          background: 'rgba(16, 16, 26, 0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
          padding: '4px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '2px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
            <button
              key={p}
              onClick={() => handleSelect(p)}
              style={{
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: priority === p ? `${accentColor}25` : 'transparent',
                border: 'none',
                borderRadius: '3px',
                color: priority === p ? accentColor : CANVAS_COLORS.textDim,
                fontSize: '9px',
                fontFamily: "'SF Mono', monospace",
                fontWeight: priority === p ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (priority !== p) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = CANVAS_COLORS.textPrimary;
                }
              }}
              onMouseLeave={(e) => {
                if (priority !== p) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = CANVAS_COLORS.textDim;
                }
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
