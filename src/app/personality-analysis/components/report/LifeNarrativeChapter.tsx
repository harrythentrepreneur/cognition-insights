import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import TimelineHeroImage from '@/components/TimelineHeroImage';
import { HeroJourneyArc } from '../visualizations/HeroJourneyArc';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface LifeNarrativeChapterProps {
  data: any;
  sessionId?: string;
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
  
  heroImageContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    padding: spacing.xl,
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
};

export const LifeNarrativeChapter: React.FC<LifeNarrativeChapterProps> = ({ data, sessionId }) => {
  // Check if we have LLM-generated content
  const hasLLMContent = data?.narrative_content?.life_narrative;
  const narrativeData = hasLLMContent ? data.narrative_content.life_narrative : {};
  
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 1: Life Narrative & Symbolic Meaning</h2>
      
      {/* Hero Image */}
      <div style={styles.heroImageContainer}>
        {sessionId ? (
          <TimelineHeroImage sessionId={sessionId} />
        ) : (
          <div style={{ 
            width: '400px', 
            height: '400px', 
            backgroundColor: colors.surface,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSecondary
          }}>
            AI-Generated Life Art
          </div>
        )}
      </div>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Your Life Story Arc</h3>
        {narrativeData.story ? (
          // Use LLM-generated story
          narrativeData.story.split('\n\n').map((paragraph: string, index: number) => (
            <p key={index} style={styles.paragraph}>
              {paragraph}
            </p>
          ))
        ) : (
          // Fallback to template
          <>
            <p style={styles.paragraph}>
              Your journey reveals a narrative of continuous growth and self-discovery. Through the analysis of your 
              communication patterns, we see a protagonist who navigates life with {data.summary?.dominant_trait || 'creativity'} as 
              their guiding light. This story is not merely a sequence of events, but a meaningful progression toward 
              self-actualization.
            </p>
            <p style={styles.paragraph}>
              The themes that emerge from your interactions paint a picture of someone who values authentic connection 
              while maintaining a strong sense of individual purpose. Your narrative arc bends toward growth, with each 
              chapter building upon the lessons of the previous ones.
            </p>
          </>
        )}
      </section>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Symbolic Interpretation</h3>
        {narrativeData.symbolism && narrativeData.symbolism.length > 0 ? (
          // Use LLM-generated symbolism
          <div>
            {narrativeData.symbolism.map((symbol: any, index: number) => (
              <div key={index} style={{ marginBottom: '16px' }}>
                <p style={styles.paragraph}>
                  <strong>{symbol.symbol}:</strong> {symbol.meaning}
                </p>
              </div>
            ))}
          </div>
        ) : (
          // Fallback to template
          <p style={styles.paragraph}>
            The recurring symbols in your communication—references to light, movement, and transformation—suggest 
            an underlying mythology of personal evolution. You appear to see life as a canvas for creative expression, 
            where challenges become opportunities for artistic problem-solving.
          </p>
        )}
      </section>
      
      {/* Life Themes Section - Only show if we have LLM content */}
      {narrativeData.themes && narrativeData.themes.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Major Life Themes</h3>
          <div>
            {narrativeData.themes.map((theme: any, index: number) => (
              <div key={index} style={{ 
                marginBottom: '20px',
                paddingLeft: '20px',
                borderLeft: '2px solid rgba(0, 255, 230, 0.3)'
              }}>
                <h4 style={{ 
                  color: colors.accent, 
                  marginBottom: '8px',
                  fontSize: '1.125rem',
                  fontWeight: 500
                }}>
                  {theme.theme}
                </h4>
                <p style={{ ...styles.paragraph, marginBottom: '8px' }}>
                  {theme.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>The Hero&apos;s Journey</h3>
        {narrativeData.hero_journey && narrativeData.hero_journey.length > 0 ? (
          <>
            <p style={styles.paragraph}>
              Your personal narrative maps beautifully onto Joseph Campbell&apos;s Hero&apos;s Journey:
            </p>
            {narrativeData.hero_journey.map((stage: any, index: number) => (
              <div key={index} style={{ 
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: 'rgba(0, 255, 230, 0.05)',
                borderLeft: `3px solid ${stage.status === 'completed' ? '#00FFE6' : stage.status === 'integrated' ? '#00D9CC' : '#3A3A5C'}`,
                borderRadius: '0 8px 8px 0'
              }}>
                <p style={styles.paragraph}>
                  <strong>{stage.stage}</strong> - {stage.description}
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '0.875rem', 
                    color: colors.textSecondary,
                    fontStyle: 'italic'
                  }}>
                    ({stage.status})
                  </span>
                </p>
              </div>
            ))}
          </>
        ) : (
          <>
            <p style={styles.paragraph}>
              Mapping your story to Campbell&apos;s monomyth, we find you currently in the &quot;Road of Trials&quot; phase, 
              where you&apos;re actively developing the skills and wisdom needed for your ultimate transformation. 
              Your high {data.personality_metrics?.resilience || 76}% resilience score indicates you&apos;re well-equipped 
              for this journey.
            </p>
          </>
        )}
        
        <HeroJourneyArc />
        
        <p style={styles.paragraph}>
          This archetypal journey framework reveals how your personal evolution follows timeless patterns of 
          human growth and transformation. Each phase of your journey contributes to a larger narrative of 
          becoming—not just who you are, but who you are meant to be.
        </p>
      </section>
    </div>
  );
};