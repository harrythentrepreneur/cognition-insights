import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { getGridColumns } from './utils';

// ============================================================================
// EMOTION HEATMAP GRID STYLES
// ============================================================================

export const getHeatmapGridStyle = (itemCount: number) => ({
  display: 'grid',
  gridTemplateColumns: getGridColumns(itemCount),
  gap: DESIGN_TOKENS.spacing.gridGap,
  padding: '0px',
  width: '100%',
  margin: '0',
  boxSizing: 'border-box' as const
});

export const getHeatmapItemStyle = (emotionColor: string) => ({
  padding: '8px',
  borderRadius: DESIGN_TOKENS.effects.borderRadius,
  backgroundColor: DESIGN_TOKENS.colors.cardBg,
  border: `1px solid ${emotionColor}20`,
  boxShadow: `0 0 20px ${emotionColor}10`,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'stretch',
  minHeight: '350px',
  boxSizing: 'border-box' as const,
  width: '100%'
}); 