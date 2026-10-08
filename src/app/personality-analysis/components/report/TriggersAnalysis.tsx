import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { TriggerWordCloud } from '../visualizations/TriggerWordCloud';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface TriggersAnalysisProps {
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
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 500,
    color: colors.text,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  paragraph: {
    fontSize: '1.125rem',
    lineHeight: 1.8,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'justify' as const,
  } as CSSProperties,
  
  visualizationContainer: {
    margin: `${spacing.xl} 0`,
    padding: spacing.lg,
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 255, 230, 0.1)',
  } as CSSProperties,
  
  triggerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: spacing.md,
    marginTop: spacing.lg,
  } as CSSProperties,
  
  triggerCard: {
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: spacing.md,
  } as CSSProperties,
  
  triggerTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  triggerList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as CSSProperties,
  
  triggerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.xs} 0`,
    borderBottom: `1px solid ${colors.border}`,
    fontSize: '0.875rem',
  } as CSSProperties,
  
  triggerWord: {
    color: colors.text,
    fontWeight: 500,
  } as CSSProperties,
  
  triggerScore: {
    color: colors.textSecondary,
    fontSize: '0.75rem',
  } as CSSProperties,
  
  insightBox: {
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    padding: spacing.md,
    marginTop: spacing.md,
  } as CSSProperties,
  
  insightTitle: {
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  insightText: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  copingStrategies: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    border: '1px solid #4CAF50',
    borderRadius: '8px',
    padding: spacing.md,
    marginTop: spacing.lg,
  } as CSSProperties,
  
  strategyList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as CSSProperties,
  
  strategyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  } as CSSProperties,
  
  strategyIcon: {
    fontSize: '1.2rem',
    marginTop: '2px',
  } as CSSProperties,
  
  strategyText: {
    flex: 1,
    fontSize: '0.875rem',
    color: colors.text,
  } as CSSProperties,
};

export const TriggersAnalysis: React.FC<TriggersAnalysisProps> = ({ data }) => {
  const triggerWords = data.trigger_words || [];
  
  // Check for LLM-generated content
  const hasLLMContent = data?.narrative_content?.triggers_analysis;
  const triggersContent = hasLLMContent ? data.narrative_content.triggers_analysis : null;
  
  const categorizeTriggers = () => {
    const categories = {
      work: [] as any[],
      social: [] as any[],
      time: [] as any[],
      other: [] as any[],
    };
    
    const workKeywords = ['deadline', 'meeting', 'project', 'boss', 'work', 'office', 'budget', 'presentation'];
    const socialKeywords = ['argument', 'conflict', 'disagreement', 'criticism', 'rejection', 'alone'];
    const timeKeywords = ['late', 'rush', 'hurry', 'time', 'urgent', 'schedule'];
    
    triggerWords.forEach((trigger: any) => {
      const word = trigger.word.toLowerCase();
      if (workKeywords.some(keyword => word.includes(keyword))) {
        categories.work.push(trigger);
      } else if (socialKeywords.some(keyword => word.includes(keyword))) {
        categories.social.push(trigger);
      } else if (timeKeywords.some(keyword => word.includes(keyword))) {
        categories.time.push(trigger);
      } else {
        categories.other.push(trigger);
      }
    });
    
    return categories;
  };
  
  const categorizedTriggers = categorizeTriggers();
  const topTrigger = triggerWords[0];
  
  const copingStrategies = [
    {
      icon: '🧘',
      text: 'Practice mindfulness when encountering trigger words to create space between stimulus and response'
    },
    {
      icon: '🔄',
      text: 'Reframe trigger words by finding neutral or positive alternatives in your vocabulary'
    },
    {
      icon: '💬',
      text: 'Communicate proactively about stress points to prevent trigger accumulation'
    },
    {
      icon: '⏸️',
      text: 'Implement a pause-and-breathe protocol when you notice trigger words affecting your mood'
    },
    {
      icon: '📝',
      text: 'Keep a trigger journal to track patterns and develop personalized coping strategies'
    }
  ];
  
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 5: Triggers & Vulnerabilities</h2>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Trigger Taxonomy</h3>
        {triggersContent?.trigger_context ? (
          triggersContent.trigger_context.split('\n\n').map((paragraph: string, index: number) => (
            <p key={index} style={styles.paragraph}>
              {paragraph}
            </p>
          ))
        ) : (
          <p style={styles.paragraph}>
            Understanding your emotional triggers is crucial for developing emotional intelligence and resilience. 
            Through analysis of your communication patterns, we&apos;ve identified {triggerWords.length} words or phrases 
            that consistently precede negative emotional shifts in your conversations.
          </p>
        )}
        
        {topTrigger && (
          <div style={styles.insightBox}>
            <div style={styles.insightTitle}>Primary Trigger</div>
            <div style={styles.insightText}>
              &quot;{topTrigger.word}&quot; appears as your strongest trigger, occurring {topTrigger.frequency} times 
              with an average negative impact of {topTrigger.negative_impact.toFixed(1)}/5. This suggests 
              it&apos;s a significant stressor that warrants attention and coping strategies.
            </div>
          </div>
        )}
      </section>
      
      {/* Trigger Word Cloud */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Trigger Word Visualization</h3>
        <div style={styles.visualizationContainer}>
          <TriggerWordCloud data={triggerWords} />
        </div>
        <p style={styles.paragraph}>
          This word cloud visualizes your emotional triggers, with size representing frequency and color 
          indicating negative impact intensity. Click on any word to explore its contextual usage and 
          develop targeted coping strategies.
        </p>
      </section>
      
      {/* Categorized Triggers */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Trigger Categories</h3>
        {triggersContent?.trigger_patterns && triggersContent.trigger_patterns.length > 0 ? (
          <div style={styles.triggerGrid}>
            {triggersContent.trigger_patterns.map((pattern: any, index: number) => (
              <div key={index} style={styles.triggerCard}>
                <div style={styles.triggerTitle}>
                  {pattern.trigger_type}
                </div>
                <p style={{fontSize: '0.875rem', color: colors.textSecondary, marginBottom: spacing.sm}}>
                  <strong>Root Cause:</strong> {pattern.root_cause}
                </p>
                <p style={{fontSize: '0.875rem', color: colors.text}}>
                  <strong>Growth Path:</strong> {pattern.growth_path}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.triggerGrid}>
            {Object.entries(categorizedTriggers).map(([category, triggers]) => (
              triggers.length > 0 && (
                <div key={category} style={styles.triggerCard}>
                  <div style={styles.triggerTitle}>
                    {category === 'work' ? '💼 Work-Related' :
                     category === 'social' ? '👥 Social' :
                     category === 'time' ? '⏰ Time Pressure' :
                     '🎯 Other'}
                  </div>
                  <ul style={styles.triggerList}>
                    {triggers.slice(0, 5).map((trigger: any) => (
                      <li key={trigger.word} style={styles.triggerItem}>
                        <span style={styles.triggerWord}>{trigger.word}</span>
                        <span style={styles.triggerScore}>
                          {trigger.frequency}x • {trigger.negative_impact.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}
      </section>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Coping Strategies</h3>
        {triggersContent?.coping_strategies ? (
          triggersContent.coping_strategies.split('\n\n').map((paragraph: string, index: number) => (
            <p key={index} style={styles.paragraph}>
              {paragraph}
            </p>
          ))
        ) : (
          <>
            <p style={styles.paragraph}>
              Your trigger analysis reveals important patterns about your emotional resilience. The clustering 
              of triggers around {Object.keys(categorizedTriggers).find(key => categorizedTriggers[key as keyof typeof categorizedTriggers].length > 0) || 'various'} themes 
              suggests specific areas where building coping skills could significantly improve your emotional well-being.
            </p>
            <p style={styles.paragraph}>
              Interestingly, your trigger frequency and impact scores indicate a relatively healthy emotional 
              processing system. Most triggers show moderate impact levels, suggesting you have natural resilience 
              mechanisms in place, though targeted strategies could enhance your emotional regulation further.
            </p>
          </>
        )}
      </section>
      
      {/* Growth Opportunities */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Growth Opportunities</h3>
        {triggersContent?.growth_opportunities ? (
          triggersContent.growth_opportunities.split('\n\n').map((paragraph: string, index: number) => (
            <p key={index} style={styles.paragraph}>
              {paragraph}
            </p>
          ))
        ) : (
          <div style={styles.copingStrategies}>
            <div style={{ ...styles.insightTitle, color: '#4CAF50', marginBottom: spacing.md }}>
              Recommended Approaches
            </div>
            <ul style={styles.strategyList}>
              {copingStrategies.map((strategy, index) => (
                <li key={index} style={styles.strategyItem}>
                  <span style={styles.strategyIcon}>{strategy.icon}</span>
                  <span style={styles.strategyText}>{strategy.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};