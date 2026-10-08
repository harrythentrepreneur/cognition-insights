import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { ConfidenceTimeline } from '../visualizations/ConfidenceTimeline';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface GrowthDevelopmentProps {
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
  
  phasesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  phaseCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    position: 'relative',
  } as CSSProperties,
  
  phaseNumber: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: colors.accent,
    color: colors.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontWeight: 700,
  } as CSSProperties,
  
  phaseTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.md,
    paddingRight: spacing.xl,
  } as CSSProperties,
  
  phaseDescription: {
    fontSize: '0.95rem',
    color: colors.textSecondary,
    lineHeight: 1.6,
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  phaseTimeframe: {
    fontSize: '0.875rem',
    color: colors.accentDark,
    fontWeight: 500,
  } as CSSProperties,
  
  learningGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  learningCard: {
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
};

export const GrowthDevelopment: React.FC<GrowthDevelopmentProps> = ({ data }) => {
  // Mock confidence timeline data if not available
  const confidenceData = data?.confidence_timeline || [
    { timestamp: '2024-01-01', week: '2024-01', assertive_score: 45, hesitant_score: 25, overall_confidence: 20, message_count: 15 },
    { timestamp: '2024-01-08', week: '2024-02', assertive_score: 52, hesitant_score: 22, overall_confidence: 30, message_count: 18 },
    { timestamp: '2024-01-15', week: '2024-03', assertive_score: 58, hesitant_score: 20, overall_confidence: 38, message_count: 22 },
    { timestamp: '2024-01-22', week: '2024-04', assertive_score: 65, hesitant_score: 18, overall_confidence: 47, message_count: 25 },
    { timestamp: '2024-01-29', week: '2024-05', assertive_score: 70, hesitant_score: 15, overall_confidence: 55, message_count: 28 },
    { timestamp: '2024-02-05', week: '2024-06', assertive_score: 68, hesitant_score: 16, overall_confidence: 52, message_count: 24 },
    { timestamp: '2024-02-12', week: '2024-07', assertive_score: 72, hesitant_score: 14, overall_confidence: 58, message_count: 30 },
    { timestamp: '2024-02-19', week: '2024-08', assertive_score: 75, hesitant_score: 12, overall_confidence: 63, message_count: 32 },
  ];

  const calculateGrowthPhase = (confidence: number) => {
    if (confidence < 20) return 'Foundation Building';
    if (confidence < 40) return 'Skill Development';
    if (confidence < 60) return 'Confidence Expansion';
    return 'Mastery Integration';
  };

  const latestConfidence = confidenceData[confidenceData.length - 1]?.overall_confidence || 50;
  const earliestConfidence = confidenceData[0]?.overall_confidence || 50;
  const growthTrend = latestConfidence - earliestConfidence;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 6: Growth & Development Arc</h2>
      
      <div style={styles.section}>
        <div style={styles.paragraph}>
          Personal growth is not a linear journey but rather a dynamic spiral of development, 
          where each cycle brings deeper understanding, greater capability, and expanded 
          self-awareness. Your communication patterns reveal a fascinating trajectory of 
          personal evolution, marked by distinct phases of confidence building, skill 
          development, and integrated mastery.
        </div>
        
        <div style={styles.paragraph}>
          Through the lens of your digital communications, we can trace the contours of your 
          personal development journey—observing moments of breakthrough, periods of 
          consolidation, and the gradual emergence of your authentic voice and confident 
          self-expression across different contexts and relationships.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Confidence Evolution Analysis</h3>
        
        <div style={styles.paragraph}>
          Your confidence evolution represents one of the most revealing aspects of personal 
          growth, tracking the subtle but powerful shifts in how you express yourself, 
          assert your opinions, and navigate social interactions over time. This analysis 
          examines the balance between assertive and hesitant language patterns.
        </div>
        
        <ConfidenceTimeline data={confidenceData} />
        
        <div style={styles.insight}>
          <strong>Growth Insight:</strong> Your confidence has {growthTrend >= 0 ? 'increased' : 'fluctuated'} 
          by {Math.abs(growthTrend).toFixed(1)} points over the analyzed period, suggesting 
          {growthTrend >= 10 ? 'significant personal growth and expanding self-assurance in your communications' : 
           growthTrend >= 5 ? 'steady development in your confidence and self-expression patterns' : 
           growthTrend >= 0 ? 'gradual confidence building with natural fluctuations in different contexts' : 
           'periods of reflection and recalibration that are natural parts of the growth process'}.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Personal Growth Phases</h3>
        
        <div style={styles.paragraph}>
          Your development journey can be understood through distinct phases, each 
          characterized by unique patterns of communication, confidence levels, and 
          social engagement. These phases represent natural progressions in personal 
          evolution and self-actualization.
        </div>
        
        <div style={styles.phasesGrid}>
          <div style={styles.phaseCard}>
            <div style={styles.phaseNumber}>1</div>
            <div style={styles.phaseTitle}>Foundation Building</div>
            <div style={styles.phaseDescription}>
              Early development phase characterized by exploratory communication, 
              building basic confidence patterns, and establishing your unique voice 
              in different social contexts.
            </div>
            <div style={styles.phaseTimeframe}>Confidence Range: 0-30 points</div>
          </div>
          
          <div style={styles.phaseCard}>
            <div style={styles.phaseNumber}>2</div>
            <div style={styles.phaseTitle}>Skill Development</div>
            <div style={styles.phaseDescription}>
              Active learning phase where communication strategies are refined, 
              social confidence grows, and assertiveness begins to emerge in 
              various interpersonal situations.
            </div>
            <div style={styles.phaseTimeframe}>Confidence Range: 30-50 points</div>
          </div>
          
          <div style={styles.phaseCard}>
            <div style={styles.phaseNumber}>3</div>
            <div style={styles.phaseTitle}>Confidence Expansion</div>
            <div style={styles.phaseDescription}>
              Breakthrough phase marked by increased assertiveness, clearer 
              self-expression, and growing comfort with leadership and 
              initiative-taking in communications.
            </div>
            <div style={styles.phaseTimeframe}>Confidence Range: 50-70 points</div>
          </div>
          
          <div style={styles.phaseCard}>
            <div style={styles.phaseNumber}>4</div>
            <div style={styles.phaseTitle}>Mastery Integration</div>
            <div style={styles.phaseDescription}>
              Advanced phase where communication flows naturally, confidence 
              is contextually adaptive, and authentic self-expression becomes 
              the foundation for deeper relationships.
            </div>
            <div style={styles.phaseTimeframe}>Confidence Range: 70+ points</div>
          </div>
        </div>
        
        <div style={styles.insight}>
          <strong>Current Phase:</strong> Based on your latest confidence metrics, you are currently in the 
          <strong> {calculateGrowthPhase(latestConfidence)}</strong> phase, demonstrating 
          {latestConfidence >= 70 ? 'advanced mastery in confident self-expression and natural leadership' : 
           latestConfidence >= 50 ? 'expanding confidence with increasing assertiveness and clarity' : 
           latestConfidence >= 30 ? 'active skill development with growing social confidence' : 
           'foundational growth with emerging patterns of self-assured communication'}.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Learning Style Analysis</h3>
        
        <div style={styles.paragraph}>
          Understanding how you naturally learn and adapt provides crucial insights into 
          your personal development trajectory. Your communication patterns reveal distinct 
          learning preferences and adaptation strategies that shape your growth journey.
        </div>
        
        <div style={styles.learningGrid}>
          <div style={styles.learningCard}>
            <div style={styles.cardTitle}>Processing Style</div>
            <div style={styles.cardContent}>
              <strong>Reflective Integration</strong><br/>
              You demonstrate a thoughtful approach to learning, processing 
              experiences through communication and integrating insights 
              gradually into your evolving self-expression patterns.
            </div>
          </div>
          
          <div style={styles.learningCard}>
            <div style={styles.cardTitle}>Adaptation Pattern</div>
            <div style={styles.cardContent}>
              <strong>{growthTrend >= 5 ? 'Progressive Adaptation' : 'Cyclical Adaptation'}</strong><br/>
              Your growth shows {growthTrend >= 5 ? 'consistent forward momentum with steady confidence building' : 
              'natural cycles of expansion and consolidation, typical of deep learners'}.
            </div>
          </div>
          
          <div style={styles.learningCard}>
            <div style={styles.cardTitle}>Growth Catalyst</div>
            <div style={styles.cardContent}>
              <strong>Social Interaction</strong><br/>
              Your development appears strongly influenced by interpersonal 
              experiences, with confidence and skills evolving through 
              meaningful social engagement and communication practice.
            </div>
          </div>
          
          <div style={styles.learningCard}>
            <div style={styles.cardTitle}>Future Trajectory</div>
            <div style={styles.cardContent}>
              <strong>{latestConfidence >= 60 ? 'Mastery-Oriented Path' : 
                      latestConfidence >= 40 ? 'Expansion-Focused Path' : 'Foundation-Building Path'}</strong><br/>
              Based on current trends, your development trajectory suggests 
              {latestConfidence >= 60 ? 'continued refinement of advanced communication mastery and leadership capabilities' : 
               latestConfidence >= 40 ? 'accelerating confidence growth with expanding assertiveness and social influence' : 
               'steady foundational growth with emerging confidence and self-expression skills'}.
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.quote}>
          "Growth is not about becoming someone different—it's about becoming more 
          authentically yourself, with the confidence and skills to express your 
          unique perspective with clarity and impact."
        </div>
        
        <div style={styles.paragraph}>
          Your personal development arc reveals a journey of increasing self-awareness, 
          expanding confidence, and deepening authenticity. Each phase of growth builds 
          upon the previous, creating a foundation for continued evolution and 
          self-actualization in your communication and relationships.
        </div>
      </div>
    </div>
  );
};