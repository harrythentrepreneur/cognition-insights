'use client';

// ============================================================================
// CANVAS THEME — Ultra-clean dark glass design
// ============================================================================

export const CANVAS_COLORS = {
  // Canvas — dark charcoal with subtle dots
  canvasBg: '#151520',
  canvasDots: 'rgba(255,255,255,0.06)',

  // Node chrome — dark glass
  nodeBg: 'rgba(16, 16, 26, 0.94)',
  nodeBorder: 'rgba(255,255,255,0.05)',
  nodeBorderHover: 'rgba(255,255,255,0.09)',
  nodeBorderSelected: 'rgba(168,85,247,0.35)',
  nodeHeaderBg: 'rgba(255,255,255,0.018)',
  nodeShadow: '0 2px 12px rgba(0,0,0,0.28)',

  // Category accents
  source: '#A855F7',
  extractor: '#3B82F6',
  dnaHook: '#4ECDC4',
  dnaAngle: '#F59E0B',
  dnaFormat: '#45B7D1',
  synthesizer: '#06D6A0',
  generator: '#0EA5E9',
  output: '#FF6B6B',
  note: '#52525B',

  // New input node accents
  persona: '#E879F9',
  desire: '#FB923C',
  customPrompt: '#38BDF8',

  // Edges — visible on dark bg
  edgeDefault: 'rgba(168,85,247,0.35)',
  edgeAnimated: 'rgba(168,85,247,0.6)',
  edgeSelected: '#A855F7',

  // Handles
  handleBg: '#151520',
  handleBorder: 'rgba(168,85,247,0.38)',
  handleConnected: '#A855F7',

  // Text
  textPrimary: '#D4D4D8',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDim: '#3F3F46',

  // Status
  statusTop: '#06D6A0',
  statusGood: '#3B82F6',
  statusTrending: '#F59E0B',
  statusFatigue: '#EF4444',

  // Sidebar
  sidebarBg: 'rgba(14, 14, 22, 0.98)',
  sidebarBorder: 'rgba(255,255,255,0.04)',
} as const;

// ============================================================================
// NODE CATEGORY CONFIG
// ============================================================================

export const NODE_CATEGORY_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  source: { color: CANVAS_COLORS.source, label: 'Sources', icon: '◈' },
  extractor: { color: CANVAS_COLORS.extractor, label: 'Analysis', icon: '◇' },
  dna: { color: CANVAS_COLORS.dnaHook, label: 'Tags', icon: '◆' },
  input: { color: CANVAS_COLORS.persona, label: 'Context', icon: '◉' },
  generator: { color: CANVAS_COLORS.generator, label: 'Prompts', icon: '◱' },
  output: { color: CANVAS_COLORS.output, label: 'Outputs', icon: '▹' },
};

// ============================================================================
// HANDLE STYLES — small, clean dots
// ============================================================================

export const HANDLE_STYLE = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: CANVAS_COLORS.handleBg,
  border: `1.5px solid ${CANVAS_COLORS.handleBorder}`,
  transition: 'all 0.15s ease',
};

export const HANDLE_CONNECTED_STYLE = {
  ...HANDLE_STYLE,
  background: CANVAS_COLORS.handleConnected,
  borderColor: CANVAS_COLORS.handleConnected,
  boxShadow: `0 0 4px ${CANVAS_COLORS.handleConnected}30`,
};

// ============================================================================
// BASE NODE STYLES — ultra-clean glass cards
// ============================================================================

export function getNodeStyle(accentColor: string, isSelected: boolean) {
  return {
    position: 'relative' as const,
    background: CANVAS_COLORS.nodeBg,
    border: `1px solid ${isSelected ? `${accentColor}30` : CANVAS_COLORS.nodeBorder}`,
    borderRadius: '12px',
    boxShadow: isSelected
      ? `0 2px 16px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}10`
      : CANVAS_COLORS.nodeShadow,
    backdropFilter: 'blur(20px)',
    overflow: 'visible' as const,
    minWidth: '200px',
    maxWidth: '260px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: "'Inter', -apple-system, sans-serif",
  };
}

export function getNodeHeaderStyle(accentColor: string) {
  return {
    padding: '8px 10px',
    borderBottom: `1px solid rgba(255,255,255,0.02)`,
    background: `linear-gradient(135deg, ${accentColor}03 0%, transparent 100%)`,
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '7px',
  };
}

// ============================================================================
// SHARED INPUT STYLE
// ============================================================================

export const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  borderRadius: '6px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
  color: CANVAS_COLORS.textPrimary,
  fontSize: '9.5px',
  fontFamily: "'Inter', -apple-system, sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};

export const LABEL_STYLE: React.CSSProperties = {
  fontSize: '7.5px',
  fontWeight: 600,
  color: CANVAS_COLORS.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '2px',
  fontFamily: "'Inter', -apple-system, sans-serif",
};
