import React, { Component, ReactNode, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const styles = {
  errorContainer: {
    padding: spacing.xl,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    border: `1px solid #ff6b6b`,
    borderRadius: '8px',
    margin: `${spacing.lg} 0`,
    textAlign: 'center' as const,
  } as CSSProperties,
  
  errorTitle: {
    fontSize: '1.25rem',
    color: '#ff6b6b',
    marginBottom: spacing.md,
    fontWeight: 600,
  } as CSSProperties,
  
  errorMessage: {
    fontSize: '1rem',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  retryButton: {
    marginTop: spacing.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: colors.accent,
    color: colors.background,
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as CSSProperties,
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div style={styles.errorContainer}>
          <h3 style={styles.errorTitle}>
            {this.props.sectionName 
              ? `Error loading ${this.props.sectionName}` 
              : 'Something went wrong'}
          </h3>
          <p style={styles.errorMessage}>
            We encountered an error while displaying this section. 
            The data might be incomplete or incorrectly formatted.
          </p>
          {this.state.error && (
            <p style={{ ...styles.errorMessage, fontSize: '0.875rem', opacity: 0.7 }}>
              Error: {this.state.error.message}
            </p>
          )}
          <button
            style={styles.retryButton}
            onClick={this.handleReset}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 230, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}