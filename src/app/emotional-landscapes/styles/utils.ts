// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getBlurMask = (type: 'logo' | 'hamburger'): string => {
  if (type === 'logo') {
    return `radial-gradient(ellipse 400px 200px at center, 
      black 0%, rgba(0,0,0,0.95) 15%, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.8) 35%,
      rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.3) 75%,
      rgba(0,0,0,0.15) 85%, rgba(0,0,0,0.05) 95%, transparent 100%)`;
  }
  
  return `radial-gradient(circle 80px at center,
    black 0%, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.4) 65%,
    rgba(0,0,0,0.2) 80%, transparent 100%)`;
};

export const getGridColumns = (itemCount: number): string => {
  if (itemCount === 1) return '1fr';
  if (itemCount === 2) return 'repeat(2, 1fr)';
  // For 3 items: use same approach as 2 items (just add one more)
  if (itemCount === 3) return 'repeat(3, 1fr)';
  // For 4+ items: use auto-fit to maintain consistent width
  return 'repeat(auto-fit, minmax(300px, 1fr))';
}; 