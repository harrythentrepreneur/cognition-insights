import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface MessageEvidenceItem {
  message: string;
  indicator: string;
  timestamp: string;
  type?: string;
}

interface MessageEvidenceProps {
  evidence: MessageEvidenceItem[];
  title?: string;
  showIndicator?: boolean;
  maxItems?: number;
}

const styles = {
  container: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(35, 35, 64, 0.3)',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  title: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as CSSProperties,
  
  evidenceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.sm,
  } as CSSProperties,
  
  evidenceItem: {
    position: 'relative' as const,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 255, 230, 0.03)',
    borderLeft: `3px solid ${colors.accent}`,
    borderRadius: '0 4px 4px 0',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    fontFamily: fonts.body,
  } as CSSProperties,
  
  message: {
    color: colors.text,
    marginBottom: '4px',
    fontStyle: 'italic',
  } as CSSProperties,
  
  metadata: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.75rem',
    color: colors.textSecondary,
    marginTop: '4px',
  } as CSSProperties,
  
  indicator: {
    backgroundColor: colors.accent,
    color: colors.background,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 500,
  } as CSSProperties,
  
  timestamp: {
    opacity: 0.7,
  } as CSSProperties,
  
  noEvidence: {
    textAlign: 'center' as const,
    color: colors.textSecondary,
    fontSize: '0.875rem',
    fontStyle: 'italic',
    padding: spacing.md,
  } as CSSProperties,
  
  quoteMark: {
    position: 'absolute' as const,
    top: '-5px',
    left: '8px',
    fontSize: '1.5rem',
    color: colors.accent,
    opacity: 0.3,
    fontFamily: 'Georgia, serif',
  } as CSSProperties,
};

export const MessageEvidence: React.FC<MessageEvidenceProps> = ({ 
  evidence, 
  title = "Message Evidence",
  showIndicator = true,
  maxItems = 3
}) => {
  if (!evidence || evidence.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.noEvidence}>
          No message evidence available for this trait
        </div>
      </div>
    );
  }
  
  const displayEvidence = evidence.slice(0, maxItems);
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };
  
  const truncateMessage = (message: string, maxLength: number = 150) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength).trim() + '...';
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.title}>{title}</div>
      <div style={styles.evidenceList}>
        {displayEvidence.map((item, index) => (
          <div key={index} style={styles.evidenceItem}>
            <span style={styles.quoteMark}>"</span>
            <div style={styles.message}>
              {truncateMessage(item.message)}
            </div>
            <div style={styles.metadata}>
              {showIndicator && item.indicator && (
                <span style={styles.indicator}>
                  {item.indicator}
                </span>
              )}
              <span style={styles.timestamp}>
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {evidence.length > maxItems && (
        <div style={{ 
          textAlign: 'center' as const, 
          marginTop: spacing.sm, 
          fontSize: '0.75rem',
          color: colors.textSecondary 
        }}>
          +{evidence.length - maxItems} more examples
        </div>
      )}
    </div>
  );
};

// Export a variant for inline use within findings
export const InlineMessageEvidence: React.FC<{ message: string; indicator?: string }> = ({ 
  message, 
  indicator 
}) => (
  <div style={{
    marginTop: spacing.xs,
    padding: '6px 10px',
    backgroundColor: 'rgba(0, 255, 230, 0.05)',
    borderLeft: `2px solid ${colors.accent}`,
    borderRadius: '0 4px 4px 0',
    fontSize: '0.8rem',
    fontStyle: 'italic',
    color: colors.textSecondary,
  }}>
    "{message}"
    {indicator && (
      <span style={{
        marginLeft: spacing.xs,
        fontSize: '0.7rem',
        color: colors.accent,
      }}>
        (keyword: {indicator})
      </span>
    )}
  </div>
);