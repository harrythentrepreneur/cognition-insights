import React from 'react';
import { cardStyles as styles } from '../../styles/insight-card-styles';

interface InsightCardProps {
  id: string;
  date: string;
  title: string;
  description: string;
  snippet?: string;
  impact?: string;
  significance?: number;
  type?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  date,
  title,
  description,
  snippet,
  impact,
  significance = 5,
  type = 'default',
  isExpanded,
  onToggle
}) => {
  const getBorderColor = () => {
    switch (type) {
      case 'pivotal':
        return '#FFD700';
      case 'evolution':
        return '#00F5D4';
      case 'emotional':
        return '#FF6B9D';
      default:
        return '#00F5D4';
    }
  };

  return (
    <div
      style={{
        ...styles.card,
        borderColor: `${getBorderColor()}40`,
        borderLeftColor: getBorderColor(),
        borderLeftWidth: `${2 + significance * 0.3}px`,
        boxShadow: isExpanded
          ? `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px ${getBorderColor()}20`
          : styles.card.boxShadow
      }}
      onClick={onToggle}
    >
      <div style={styles.cardHeader}>
        <div style={{...styles.cardDate, color: getBorderColor()}}>
          {date}
        </div>
        <div style={styles.expandIcon}>
          {isExpanded ? '−' : '+'}
        </div>
      </div>
      
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardDescription}>{description}</div>
      
      {isExpanded && (
        <div style={styles.expandedContent}>
          {snippet && (
            <div style={styles.snippetSection}>
              <div style={styles.snippetLabel}>Conversation:</div>
              <div style={styles.snippetText}>"{snippet}"</div>
            </div>
          )}
          
          {impact && (
            <div style={styles.impactSection}>
              <div style={styles.impactLabel}>Impact:</div>
              <div style={styles.impactText}>{impact}</div>
            </div>
          )}
          
          {significance && (
            <div style={styles.significanceSection}>
              <div style={styles.significanceLabel}>Significance:</div>
              <div style={styles.significanceBar}>
                <div
                  style={{
                    ...styles.significanceFill,
                    width: `${significance * 10}%`,
                    backgroundColor: getBorderColor()
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};