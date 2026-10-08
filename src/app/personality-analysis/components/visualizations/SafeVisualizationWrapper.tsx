import React from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface SafeVisualizationWrapperProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  minHeight?: string;
  showError?: boolean;
  error?: Error | null;
}

/**
 * Wrapper component that provides error boundaries and loading states for visualizations
 */
export const SafeVisualizationWrapper: React.FC<SafeVisualizationWrapperProps> = ({
  children,
  fallbackMessage = 'Unable to load visualization',
  minHeight = '300px',
  showError = false,
  error = null,
}) => {
  if (showError && error) {
    return (
      <div style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(35, 35, 64, 0.5)',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: spacing.lg,
        textAlign: 'center',
      }}>
        <div style={{
          color: colors.accent,
          fontSize: '1.25rem',
          marginBottom: spacing.md,
        }}>
          ⚠️ Visualization Error
        </div>
        <div style={{
          color: colors.textSecondary,
          fontSize: '0.9rem',
        }}>
          {fallbackMessage}
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: spacing.md,
            padding: spacing.sm,
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: colors.text,
            fontFamily: 'monospace',
            maxWidth: '100%',
            overflow: 'auto',
          }}>
            {error.message}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Error boundary component for catching rendering errors
 */
export class VisualizationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Visualization error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <SafeVisualizationWrapper showError error={this.state.error}>
            {null}
          </SafeVisualizationWrapper>
        )
      );
    }

    return this.props.children;
  }
}