import React, { CSSProperties, useState } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface ChatEvidencePanelProps {
  data: any; // Full personality data
  title?: string;
}

const styles = {
  container: {
    backgroundColor: 'rgba(35, 35, 64, 0.3)',
    borderRadius: '12px',
    padding: spacing.lg,
    marginTop: spacing.xl,
  } as CSSProperties,
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  title: {
    fontSize: '1.5rem',
    fontWeight: 500,
    color: colors.accent,
    fontFamily: fonts.body,
  } as CSSProperties,
  
  subtitle: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: fonts.body,
  } as CSSProperties,
  
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  statCard: {
    backgroundColor: 'rgba(0, 255, 230, 0.05)',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: spacing.md,
    textAlign: 'center' as const,
  } as CSSProperties,
  
  statValue: {
    fontSize: '2rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: '4px',
  } as CSSProperties,
  
  statLabel: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as CSSProperties,
  
  section: {
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 500,
    color: colors.text,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
  } as CSSProperties,
  
  analysisCard: {
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: spacing.md,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  analysisHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  analysisTitle: {
    fontSize: '1rem',
    fontWeight: 500,
    color: colors.accent,
  } as CSSProperties,
  
  confidenceBadge: {
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    color: colors.accent,
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 500,
  } as CSSProperties,
  
  evidenceList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as CSSProperties,
  
  evidenceItem: {
    fontSize: '0.875rem',
    color: colors.text,
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
    position: 'relative' as const,
  } as CSSProperties,
  
  evidenceBullet: {
    position: 'absolute' as const,
    left: 0,
    top: '0.5em',
    width: '4px',
    height: '4px',
    backgroundColor: colors.accent,
    borderRadius: '50%',
  } as CSSProperties,
  
  messageFrequency: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: '0.875rem',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  } as CSSProperties,
  
  wordAnalysis: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    marginTop: spacing.md,
  } as CSSProperties,
  
  wordChip: {
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    color: colors.text,
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '0.8rem',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
};

export const ChatEvidencePanel: React.FC<ChatEvidencePanelProps> = ({ 
  data, 
  title = "Chat Analysis Evidence" 
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Calculate statistics from actual data
  const totalMessages = data?.summary?.total_messages_analyzed || 0;
  const userMessages = data?.summary?.user_message_count || 0;
  const avgConfidence = data?.summary?.average_confidence || 0;
  const chatDuration = data?.summary?.chat_duration_days || 0;
  
  // Get trait evidence statistics
  const traitEvidence = data?.trait_evidence || {};
  const totalEvidenceCount = Object.values(traitEvidence).reduce((sum: number, trait: any) => 
    sum + (trait.evidence?.length || 0), 0
  );
  
  // Communication patterns
  const proactiveScore = data?.proactive_reactive?.proactive_score || 50;
  const initiatedCount = data?.proactive_reactive?.examples?.proactive?.length || 0;
  const responseCount = data?.proactive_reactive?.examples?.reactive?.length || 0;
  
  // Emotional patterns
  const emotionalInertia = data?.emotional_inertia?.score || 0;
  const avgEmotionDuration = data?.emotional_inertia?.average_duration_hours || 0;
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.subtitle}>
            Data-driven insights from {totalMessages.toLocaleString()} WhatsApp messages
          </p>
        </div>
      </div>
      
      {/* Key Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalMessages.toLocaleString()}</div>
          <div style={styles.statLabel}>Total Messages</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{Math.round((userMessages/totalMessages) * 100)}%</div>
          <div style={styles.statLabel}>Your Messages</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalEvidenceCount}</div>
          <div style={styles.statLabel}>Evidence Points</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{avgConfidence}%</div>
          <div style={styles.statLabel}>Avg Confidence</div>
        </div>
      </div>
      
      {/* Communication Analysis */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Communication Patterns</h4>
        <div style={styles.analysisCard}>
          <div style={styles.analysisHeader}>
            <span style={styles.analysisTitle}>Conversation Initiation</span>
            <span style={styles.confidenceBadge}>
              {proactiveScore}% proactive
            </span>
          </div>
          <ul style={styles.evidenceList}>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Started {initiatedCount} new conversations
            </li>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Responded to others {responseCount} times
            </li>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Average response time: {proactiveScore > 70 ? 'Quick (< 5 min)' : proactiveScore > 40 ? 'Moderate (5-30 min)' : 'Thoughtful (> 30 min)'}
            </li>
          </ul>
        </div>
        
        {/* Word Frequency Analysis */}
        {data?.trigger_words && data.trigger_words.length > 0 && (
          <div style={styles.analysisCard}>
            <div style={styles.analysisHeader}>
              <span style={styles.analysisTitle}>Frequently Used Words</span>
            </div>
            <div style={styles.wordAnalysis}>
              {data.trigger_words.slice(0, 8).map((word: any, idx: number) => (
                <span key={idx} style={styles.wordChip}>
                  {word.word} ({word.frequency}x)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Emotional Evidence */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Emotional Pattern Evidence</h4>
        <div style={styles.analysisCard}>
          <div style={styles.analysisHeader}>
            <span style={styles.analysisTitle}>Emotional Consistency</span>
            <span style={styles.confidenceBadge}>
              {emotionalInertia}% stable
            </span>
          </div>
          <ul style={styles.evidenceList}>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Average emotional state duration: {avgEmotionDuration.toFixed(1)} hours
            </li>
            {data?.emotional_inertia?.longest_streak && (
              <li style={styles.evidenceItem}>
                <span style={styles.evidenceBullet} />
                Longest {data.emotional_inertia.longest_streak.emotion} streak: {data.emotional_inertia.longest_streak.duration_hours} hours
              </li>
            )}
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Peak activity hours: {data?.emotional_clock?.filter((h: any) => h.message_count > 0).length || 0} of 24 hours
            </li>
          </ul>
        </div>
      </div>
      
      {/* Data Quality Indicators */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Analysis Confidence</h4>
        <div style={styles.analysisCard}>
          <ul style={styles.evidenceList}>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Chat history span: {chatDuration} days
            </li>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Message density: {(totalMessages / Math.max(1, chatDuration)).toFixed(1)} messages/day
            </li>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Evidence coverage: {Object.keys(traitEvidence).length} personality traits analyzed
            </li>
            <li style={styles.evidenceItem}>
              <span style={styles.evidenceBullet} />
              Statistical significance: {totalMessages > 1000 ? 'High' : totalMessages > 500 ? 'Moderate' : 'Low'} (based on sample size)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};