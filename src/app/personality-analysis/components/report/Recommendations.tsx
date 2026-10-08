import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { PersonalizedGrowthPlan } from '../visualizations/PersonalizedGrowthPlan';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface RecommendationsProps {
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
  
  strategiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  strategyCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    marginBottom: spacing.md,
    backgroundColor: `${colors.accent}20`,
    color: colors.accent,
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
  
  actionsList: {
    listStyle: 'none',
    padding: 0,
    margin: `${spacing.md} 0 0 0`,
  } as CSSProperties,
  
  actionItem: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderRadius: '4px',
    borderLeft: `3px solid ${colors.accent}`,
  } as CSSProperties,
  
  synthesisBox: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  synthesisTitle: {
    fontSize: '1.4rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.lg,
    textAlign: 'center',
  } as CSSProperties,
  
  personalityModel: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  modelElement: {
    textAlign: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderRadius: '6px',
    border: `1px solid ${colors.accent}`,
  } as CSSProperties,
  
  modelIcon: {
    fontSize: '2rem',
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  modelLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  modelDescription: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    lineHeight: 1.4,
  } as CSSProperties,
};

export const Recommendations: React.FC<RecommendationsProps> = ({ data }) => {
  // Extract key metrics for synthesis
  const metrics = data?.metrics || {};
  const dominantTrait = data?.summary?.dominant_trait || 'balanced';
  const insights = data?.insights || [];
  
  const getPersonalityArchetype = () => {
    const confidence = metrics.expressiveness || 60;
    const leadership = metrics.leadership_tendency || 55;
    const empathy = metrics.empathy || 70;
    
    if (leadership > 70 && confidence > 65) return "Natural Leader";
    if (empathy > 80 && confidence > 60) return "Empathetic Communicator";
    if (metrics.creativity > 70 && metrics.openness > 75) return "Creative Innovator";
    if (metrics.conscientiousness > 75 && leadership > 60) return "Organized Achiever";
    return "Balanced Adapter";
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 8: Synthesis & Recommendations</h2>
      
      <div style={styles.section}>
        <div style={styles.paragraph}>
          This comprehensive analysis of your personality architecture reveals a unique and 
          sophisticated individual with distinctive strengths, evolving capabilities, and 
          tremendous potential for continued growth. The synthesis of all dimensions creates 
          a holistic understanding of your authentic self and optimal development pathways.
        </div>
        
        <div style={styles.paragraph}>
          Your personality represents a dynamic integration of traits, behaviors, and 
          communication patterns that form a cohesive and authentic expression of your 
          inner nature. This final chapter brings together all insights to provide 
          actionable strategies for leveraging your strengths and cultivating your potential.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Integrated Personality Model</h3>
        
        <div style={styles.synthesisBox}>
          <div style={styles.synthesisTitle}>Your Personality Archetype: {getPersonalityArchetype()}</div>
          
          <div style={styles.personalityModel}>
            <div style={styles.modelElement}>
              <div style={styles.modelIcon}>🎭</div>
              <div style={styles.modelLabel}>Core Expression</div>
              <div style={styles.modelDescription}>
                {dominantTrait.charAt(0).toUpperCase() + dominantTrait.slice(1)} personality 
                with authentic self-expression
              </div>
            </div>
            
            <div style={styles.modelElement}>
              <div style={styles.modelIcon}>🤝</div>
              <div style={styles.modelLabel}>Social Style</div>
              <div style={styles.modelDescription}>
                {(metrics.extraversion || 60) > 60 ? 'Socially engaged' : 'Thoughtfully selective'} 
                with empathetic connection
              </div>
            </div>
            
            <div style={styles.modelElement}>
              <div style={styles.modelIcon}>💡</div>
              <div style={styles.modelLabel}>Cognitive Approach</div>
              <div style={styles.modelDescription}>
                {(metrics.analytical_thinking || 60) > 65 ? 'Analytically-driven' : 'Intuitively-guided'} 
                decision making
              </div>
            </div>
            
            <div style={styles.modelElement}>
              <div style={styles.modelIcon}>🌱</div>
              <div style={styles.modelLabel}>Growth Orientation</div>
              <div style={styles.modelDescription}>
                {(metrics.adaptability || 60) > 65 ? 'Highly adaptive' : 'Steady progressive'} 
                development pattern
              </div>
            </div>
            
            <div style={styles.modelElement}>
              <div style={styles.modelIcon}>⚖️</div>
              <div style={styles.modelLabel}>Emotional Pattern</div>
              <div style={styles.modelDescription}>
                {(metrics.emotional_stability || 60) > 70 ? 'Emotionally stable' : 'Emotionally dynamic'} 
                with authentic expression
              </div>
            </div>
            
            <div style={styles.modelElement}>
              <div style={styles.modelIcon}>🎯</div>
              <div style={styles.modelLabel}>Achievement Style</div>
              <div style={styles.modelDescription}>
                {(metrics.conscientiousness || 60) > 70 ? 'Goal-oriented' : 'Process-focused'} 
                with balanced priorities
              </div>
            </div>
          </div>
        </div>
        
        <div style={styles.insight}>
          <strong>Synthesis Insight:</strong> Your personality represents a sophisticated integration 
          of {getPersonalityArchetype().toLowerCase()} qualities, demonstrating both authentic 
          self-expression and adaptive social intelligence. This combination creates a foundation 
          for meaningful relationships, effective communication, and continued personal growth.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Personalized Growth Plan</h3>
        
        <div style={styles.paragraph}>
          Based on your comprehensive personality analysis, this growth plan focuses on 
          amplifying your natural strengths while addressing development opportunities 
          that will enhance your overall effectiveness and life satisfaction.
        </div>
        
        <PersonalizedGrowthPlan data={data} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Strength Optimization Strategies</h3>
        
        <div style={styles.paragraph}>
          Your natural strengths form the foundation of your personality and represent 
          areas where you can achieve exceptional results with focused development and 
          strategic application.
        </div>
        
        <div style={styles.strategiesGrid}>
          <div style={styles.strategyCard}>
            <div style={styles.cardIcon}>💪</div>
            <div style={styles.cardTitle}>Leverage Communication Strengths</div>
            <div style={styles.cardContent}>
              Your natural communication abilities can be amplified through strategic 
              application in leadership and collaborative contexts.
            </div>
            <ul style={styles.actionsList}>
              <li style={styles.actionItem}>• Volunteer for presentation and speaking opportunities</li>
              <li style={styles.actionItem}>• Mentor others in communication and interpersonal skills</li>
              <li style={styles.actionItem}>• Practice advanced facilitation techniques</li>
            </ul>
          </div>
          
          <div style={styles.strategyCard}>
            <div style={styles.cardIcon}>🧠</div>
            <div style={styles.cardTitle}>Develop Cognitive Advantages</div>
            <div style={styles.cardContent}>
              Your thinking patterns and decision-making style represent unique cognitive 
              strengths that can be refined and applied strategically.
            </div>
            <ul style={styles.actionsList}>
              <li style={styles.actionItem}>• Engage in complex problem-solving challenges</li>
              <li style={styles.actionItem}>• Practice systems thinking and pattern recognition</li>
              <li style={styles.actionItem}>• Apply analytical skills to creative projects</li>
            </ul>
          </div>
          
          <div style={styles.strategyCard}>
            <div style={styles.cardIcon}>❤️</div>
            <div style={styles.cardTitle}>Cultivate Emotional Intelligence</div>
            <div style={styles.cardContent}>
              Your natural empathy and emotional awareness can be developed into 
              sophisticated emotional intelligence and interpersonal mastery.
            </div>
            <ul style={styles.actionsList}>
              <li style={styles.actionItem}>• Practice advanced active listening techniques</li>
              <li style={styles.actionItem}>• Develop conflict resolution and mediation skills</li>
              <li style={styles.actionItem}>• Train in emotional coaching and support methods</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Challenge Mitigation Approaches</h3>
        
        <div style={styles.paragraph}>
          Every personality has areas that require attention and development. These 
          challenges represent opportunities for growth rather than limitations, and 
          addressing them strategically will enhance your overall effectiveness.
        </div>
        
        <div style={styles.strategiesGrid}>
          <div style={styles.strategyCard}>
            <div style={styles.cardIcon}>🎯</div>
            <div style={styles.cardTitle}>Build Assertiveness Skills</div>
            <div style={styles.cardContent}>
              Developing stronger assertiveness will enhance your ability to advocate 
              for yourself while maintaining your natural empathy and consideration.
            </div>
            <ul style={styles.actionsList}>
              <li style={styles.actionItem}>• Practice saying 'no' to requests that don't align with priorities</li>
              <li style={styles.actionItem}>• Use 'I' statements to express needs and boundaries clearly</li>
              <li style={styles.actionItem}>• Role-play challenging conversations in safe environments</li>
            </ul>
          </div>
          
          <div style={styles.strategyCard}>
            <div style={styles.cardIcon}>⚡</div>
            <div style={styles.cardTitle}>Enhance Decision Speed</div>
            <div style={styles.cardContent}>
              Improving decision-making efficiency while maintaining quality will 
              increase your responsiveness and leadership effectiveness.
            </div>
            <ul style={styles.actionsList}>
              <li style={styles.actionItem}>• Set time limits for decisions and stick to them</li>
              <li style={styles.actionItem}>• Practice making small decisions quickly to build confidence</li>
              <li style={styles.actionItem}>• Develop 'good enough' criteria for non-critical choices</li>
            </ul>
          </div>
          
          <div style={styles.strategyCard}>
            <div style={styles.cardIcon}>🌊</div>
            <div style={styles.cardTitle}>Manage Emotional Sensitivity</div>
            <div style={styles.cardContent}>
              Learning to channel emotional sensitivity as a strength while maintaining 
              emotional resilience will enhance your overall well-being.
            </div>
            <ul style={styles.actionsList}>
              <li style={styles.actionItem}>• Develop mindfulness practices for emotional regulation</li>
              <li style={styles.actionItem}>• Create healthy boundaries in emotionally demanding situations</li>
              <li style={styles.actionItem}>• Practice reframing techniques for stress management</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.quote}>
          "Personal growth is not about becoming someone different—it's about becoming 
          more skillfully and authentically yourself, with the tools and awareness to 
          express your unique gifts in ways that create meaningful impact."
        </div>
        
        <div style={styles.paragraph}>
          Your personality analysis reveals a person of depth, authenticity, and tremendous 
          potential. By leveraging your natural strengths, addressing development areas 
          strategically, and maintaining your core values and empathy, you are positioned 
          for continued growth, meaningful relationships, and significant contributions 
          to your communities and endeavors.
        </div>
        
        <div style={styles.paragraph}>
          Remember that personality is not destiny but rather a foundation for growth. 
          Your awareness of these patterns, combined with intentional development efforts, 
          creates unlimited possibilities for positive change, deeper connections, and 
          authentic success in all areas of your life.
        </div>
      </div>
    </div>
  );
};