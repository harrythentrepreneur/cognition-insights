import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface SkeletonLoaderProps {
  type?: 'text' | 'title' | 'paragraph' | 'chart' | 'metric' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

const styles = {
  skeleton: {
    backgroundColor: colors.surface,
    backgroundImage: `linear-gradient(90deg, ${colors.surface} 25%, rgba(0, 255, 230, 0.1) 50%, ${colors.surface} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
  } as CSSProperties,
  
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  } as CSSProperties,
  
  title: {
    height: '32px',
    width: '60%',
    marginBottom: spacing.md,
  } as CSSProperties,
  
  text: {
    height: '20px',
    width: '100%',
  } as CSSProperties,
  
  paragraph: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  } as CSSProperties,
  
  chart: {
    height: '300px',
    width: '100%',
    borderRadius: '12px',
  } as CSSProperties,
  
  metric: {
    height: '80px',
    width: '150px',
    borderRadius: '8px',
    display: 'inline-block',
    marginRight: spacing.sm,
  } as CSSProperties,
  
  card: {
    height: '200px',
    width: '100%',
    borderRadius: '12px',
    padding: spacing.lg,
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
};

// Add shimmer animation
const shimmerStyle = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const getStyleForType = (type: string): CSSProperties => {
  switch (type) {
    case 'title':
      return { ...styles.skeleton, ...styles.title };
    case 'text':
      return { ...styles.skeleton, ...styles.text };
    case 'chart':
      return { ...styles.skeleton, ...styles.chart };
    case 'metric':
      return { ...styles.skeleton, ...styles.metric };
    case 'card':
      return { ...styles.skeleton, ...styles.card };
    case 'paragraph':
      return styles.paragraph;
    default:
      return styles.skeleton;
  }
};

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'text',
  width,
  height,
  count = 1
}) => {
  React.useEffect(() => {
    // Inject shimmer animation if not already present
    if (!document.getElementById('skeleton-shimmer-styles')) {
      const style = document.createElement('style');
      style.id = 'skeleton-shimmer-styles';
      style.textContent = shimmerStyle;
      document.head.appendChild(style);
    }
  }, []);
  
  const skeletonStyle = {
    ...getStyleForType(type),
    ...(width && { width }),
    ...(height && { height }),
  };
  
  if (type === 'paragraph') {
    return (
      <div style={styles.paragraph}>
        <div style={{ ...styles.skeleton, ...styles.text, width: '100%' }} />
        <div style={{ ...styles.skeleton, ...styles.text, width: '95%' }} />
        <div style={{ ...styles.skeleton, ...styles.text, width: '85%' }} />
        <div style={{ ...styles.skeleton, ...styles.text, width: '90%' }} />
      </div>
    );
  }
  
  if (count > 1) {
    return (
      <div style={styles.container}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} style={skeletonStyle} />
        ))}
      </div>
    );
  }
  
  return <div style={skeletonStyle} />;
};

// Section skeleton for complete sections
export const SectionSkeleton: React.FC = () => {
  return (
    <div style={{ marginBottom: spacing.xxl }}>
      <SkeletonLoader type="title" width="40%" />
      <div style={{ marginBottom: spacing.lg }}>
        <SkeletonLoader type="paragraph" />
      </div>
      <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
        <SkeletonLoader type="metric" />
        <SkeletonLoader type="metric" />
        <SkeletonLoader type="metric" />
      </div>
    </div>
  );
};