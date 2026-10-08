import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { SideBySideComparison } from '../visualizations/SideBySideComparison';
import { MultiPeriodTimeline } from '../visualizations/MultiPeriodTimeline';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface ComparativeAnalysisProps {
  data: any;
}

const styles = {
  container: {
    marginBottom: spacing.xxl,
  } as CSSProperties,
  
  title: {
    fontSize: '2.5rem',
    fontWeight: 300,
    color: colors.accent,
    marginBottom: spacing.xl,
    borderBottom: `2px solid ${colors.accent}`,
    paddingBottom: spacing.md,
  } as CSSProperties,
  
  section: {
    marginBottom: spacing.xxl,
  } as CSSProperties,
  
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: 400,
    color: colors.accentDark,
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  } as CSSProperties,
  
  paragraph: {
    fontSize: '1.125rem',
    lineHeight: 1.8,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'justify',
  } as CSSProperties,
  
  insight: {
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    fontSize: '1rem',
    color: colors.textSecondary,
    fontStyle: 'italic',
  } as CSSProperties,
  
  quote: {
    fontSize: '1.25rem',
    fontStyle: 'italic',
    borderLeft: `4px solid ${colors.accent}`,
    paddingLeft: spacing.lg,
    margin: `${spacing.lg} 0`,
    color: colors.textSecondary,
  } as CSSProperties,
  
  contextGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  contextCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  cardContent: {
    fontSize: '0.95rem',
    color: colors.textSecondary,
    lineHeight: 1.6,
  } as CSSProperties,
  
  variationsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as CSSProperties,
  
  variationItem: {
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderRadius: '4px',
    borderLeft: `3px solid ${colors.accent}`,
    fontSize: '0.9rem',
    color: colors.textSecondary,
  } as CSSProperties,
};

export const ComparativeAnalysis: React.FC<ComparativeAnalysisProps> = ({ data }) => {
  // Mock comparison data if not available
  const comparisonData = data?.comparative || {
    periods: [
      {
        name: 'Early Period',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        metrics: {
          confidence: 45,
          assertiveness: 38,
          proactivity: 52,
          emotional_stability: 65,
          social_engagement: 58,
          message_count: 234
        }
      },
      {
        name: 'Recent Period',
        startDate: '2024-04-01',
        endDate: '2024-06-30',
        metrics: {
          confidence: 68,
          assertiveness: 72,
          proactivity: 75,
          emotional_stability: 70,
          social_engagement: 82,
          message_count: 387
        }
      },
      {
        name: 'Growth Phase',
        startDate: '2024-03-01',
        endDate: '2024-05-31',
        metrics: {
          confidence: 58,
          assertiveness: 55,
          proactivity: 63,
          emotional_stability: 68,
          social_engagement: 71,
          message_count: 312
        }
      }
    ]
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 7: Comparative Analysis</h2>
      
      <div style={styles.section}>
        <div style={styles.paragraph}>
          Understanding personality is not about static traits but dynamic patterns that evolve 
          across different contexts, relationships, and life phases. Through comparative analysis, 
          we can observe how your authentic self adapts and expresses differently while maintaining 
          core consistency in your fundamental personality architecture.
        </div>
        
        <div style={styles.paragraph}>
          This chapter examines the fascinating interplay between consistency and change in your 
          personality expression, revealing how external circumstances, personal growth, and 
          different social contexts influence the manifestation of your core traits and 
          communication patterns.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Temporal Comparisons</h3>
        
        <div style={styles.paragraph}>
          By examining your personality expression across different time periods, we can observe 
          patterns of growth, adaptation, and development. These temporal comparisons reveal not 
          just how you've changed, but how your fundamental personality architecture has remained 
          consistent while expressing itself in increasingly sophisticated ways.
        </div>
        
        <MultiPeriodTimeline />
        
        <div style={styles.paragraph}>
          The timeline above illustrates your personality evolution through distinct phases, 
          each marked by characteristic traits, confidence levels, and transformative events. 
          This longitudinal view reveals the dynamic nature of personality development while 
          highlighting the continuity of your core self across time.
        </div>
        
        <SideBySideComparison data={data?.comparative_analysis || comparisonData} />
        
        <div style={styles.insight}>
          <strong>Temporal Insight:</strong> Your personality expression shows 
          {comparisonData.periods.length >= 2 && 
           comparisonData.periods[1].metrics.confidence > comparisonData.periods[0].metrics.confidence ?
           'clear developmental trends with expanding confidence and stronger self-expression over time' :
           'consistent core patterns with natural variations reflecting different life contexts and experiences'}. 
          This suggests a healthy balance between personality stability and adaptive growth.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Contextual Variations</h3>
        
        <div style={styles.paragraph}>
          Your personality doesn't exist in a vacuum but expresses itself differently across 
          various contexts, relationships, and situations. Understanding these contextual variations 
          provides insights into your social intelligence and adaptive capabilities.
        </div>
        
        <div style={styles.contextGrid}>
          <div style={styles.contextCard}>
            <div style={styles.cardTitle}>Professional Context</div>
            <div style={styles.cardContent}>
              In professional or formal communication contexts, your personality tends toward 
              <strong> structured expression</strong> with increased focus on clarity, 
              goal-orientation, and measured communication patterns.
            </div>
            <ul style={styles.variationsList}>
              <li style={styles.variationItem}>• Enhanced conscientiousness and planning</li>
              <li style={styles.variationItem}>• More formal language patterns</li>
              <li style={styles.variationItem}>• Increased attention to detail and precision</li>
            </ul>
          </div>
          
          <div style={styles.contextCard}>
            <div style={styles.cardTitle}>Social Context</div>
            <div style={styles.cardContent}>
              In social and informal settings, your personality shows <strong>relaxed authenticity</strong> 
              with increased emotional expression, spontaneity, and interpersonal warmth.
            </div>
            <ul style={styles.variationsList}>
              <li style={styles.variationItem}>• Greater emotional expressiveness</li>
              <li style={styles.variationItem}>• Increased humor and playfulness</li>
              <li style={styles.variationItem}>• More spontaneous communication</li>
            </ul>
          </div>
          
          <div style={styles.contextCard}>
            <div style={styles.cardTitle}>Intimate Relationships</div>
            <div style={styles.cardContent}>
              In close personal relationships, your personality demonstrates <strong>vulnerable openness</strong> 
              with deeper emotional sharing, increased empathy, and authentic self-disclosure.
            </div>
            <ul style={styles.variationsList}>
              <li style={styles.variationItem}>• Deeper emotional vulnerability</li>
              <li style={styles.variationItem}>• More personal and intimate communication</li>
              <li style={styles.variationItem}>• Enhanced empathy and understanding</li>
            </ul>
          </div>
          
          <div style={styles.contextCard}>
            <div style={styles.cardTitle}>Stress Response</div>
            <div style={styles.cardContent}>
              Under stress or pressure, your personality shows <strong>adaptive resilience</strong> 
              with characteristic coping patterns and stress-response strategies.
            </div>
            <ul style={styles.variationsList}>
              <li style={styles.variationItem}>• Characteristic stress-response patterns</li>
              <li style={styles.variationItem}>• Adaptive coping mechanisms</li>
              <li style={styles.variationItem}>• Maintained core values under pressure</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Relationship-Specific Patterns</h3>
        
        <div style={styles.paragraph}>
          Perhaps most fascinating is how your personality adapts and responds differently with 
          various individuals in your social network. These relationship-specific patterns reveal 
          your social intelligence and ability to connect authentically with different personality 
          types and relationship dynamics.
        </div>
        
        <div style={styles.quote}>
          "We are not the same person with everyone we meet. Rather, we are different facets 
          of the same authentic self, expressing our core nature in ways that create the 
          most meaningful connections with each unique individual."
        </div>
        
        <div style={styles.paragraph}>
          Your communication patterns show sophisticated adaptation to different relationship 
          contexts while maintaining core authenticity. This reflects emotional intelligence 
          and social awareness that allows for genuine connection across diverse personality 
          types and social situations.
        </div>
        
        <div style={styles.insight}>
          <strong>Relationship Insight:</strong> Your ability to adapt your communication style 
          while maintaining authentic self-expression demonstrates sophisticated social intelligence. 
          This contextual flexibility, combined with consistent core values, creates a foundation 
          for meaningful relationships across diverse social contexts and personality types.
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.paragraph}>
          These comparative analyses reveal that personality is not a fixed set of traits but 
          a dynamic, adaptive system that expresses core authenticity through contextually 
          appropriate patterns. Your consistent core combined with adaptive flexibility 
          represents the hallmark of emotional maturity and social intelligence.
        </div>
      </div>
    </div>
  );
};