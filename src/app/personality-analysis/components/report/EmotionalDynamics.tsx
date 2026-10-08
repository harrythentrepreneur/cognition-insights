import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
const { colors, spacing } = DESIGN_TOKENS;
import { EmotionalClock } from '../visualizations/EmotionalClock';
import { EmotionalInertiaGauge } from '../visualizations/EmotionalInertiaGauge';

interface EmotionalDynamicsProps {
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
  
  dualVisualization: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.xl,
    margin: `${spacing.xl} 0`,
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
  
  '@media (max-width: 768px)': {
    dualVisualization: {
      gridTemplateColumns: '1fr',
    },
  },
};

export const EmotionalDynamics: React.FC<EmotionalDynamicsProps> = ({ data }) => {
  const emotionalClock = data.emotional_clock || [];
  const emotionalInertia = data.emotional_inertia || {};
  
  // Check for LLM-generated content
  const hasLLMContent = data?.narrative_content?.emotional_dynamics;
  const emotionalContent = hasLLMContent ? data.narrative_content.emotional_dynamics : null;
  
  const getEmotionalPattern = () => {
    const clockData = emotionalClock;
    if (!clockData.length) return 'balanced throughout the day';
    
    // Analyze patterns
    const morningEmotions = clockData.slice(6, 12);
    const afternoonEmotions = clockData.slice(12, 18);
    const eveningEmotions = clockData.slice(18, 24);
    
    const dominantMorning = getMostCommonEmotion(morningEmotions);
    const dominantEvening = getMostCommonEmotion(eveningEmotions);
    
    if (dominantMorning === 'energy' && dominantEvening === 'calm') {
      return 'a natural daily rhythm, energetic in mornings and calm in evenings';
    } else if (dominantMorning === 'stress' && dominantEvening === 'stress') {
      return 'consistently elevated stress levels throughout the day';
    } else {
      return `${dominantMorning} in the mornings transitioning to ${dominantEvening} in the evenings`;
    }
  };
  
  const getMostCommonEmotion = (timeSlice: any[]) => {
    const emotionCounts: Record<string, number> = {};
    timeSlice.forEach(hour => {
      const emotion = hour.dominant_emotion;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
    
    return Object.entries(emotionCounts).reduce((a, b) => 
      emotionCounts[a[0]] > emotionCounts[b[0]] ? a : b, ['neutral', 0]
    )[0];
  };
  
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 3: Emotional Dynamics & Patterns</h2>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Emotional Landscape Overview</h3>
        {emotionalContent?.pattern_interpretation ? (
          emotionalContent.pattern_interpretation.split('\n\n').map((paragraph: string, index: number) => (
            <p key={index} style={styles.paragraph}>
              {paragraph}
            </p>
          ))
        ) : (
          <>
            <p style={styles.paragraph}>
              Your emotional landscape reveals a sophisticated pattern of states that ebb and flow throughout 
              your daily cycle. With an emotional inertia score of {emotionalInertia.score || 65}%, you demonstrate 
              {emotionalInertia.score > 70 ? ' strong emotional persistence' : ' moderate emotional flexibility'}, 
              meaning your emotions tend to {emotionalInertia.score > 70 ? 'linger and provide stability' : 'transition fluidly'} 
              in response to changing circumstances.
            </p>
            <p style={styles.paragraph}>
              Analysis of your daily patterns shows {getEmotionalPattern()}. This rhythm reflects your natural 
              circadian emotional tendencies and provides insights into your optimal times for different activities 
              and interactions.
            </p>
          </>
        )}
      </section>
      
      {/* 24-Hour Emotional Clock */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>24-Hour Emotional Clock</h3>
        <div style={styles.visualizationContainer}>
          <EmotionalClock data={emotionalClock} />
        </div>
        <p style={styles.paragraph}>
          This visualization maps your dominant emotions across a 24-hour cycle, revealing the natural rhythm 
          of your emotional states. The size of each segment reflects the intensity of that emotion during 
          that hour, while the colors represent different emotional categories.
        </p>
        
        {emotionalContent?.key_patterns && emotionalContent.key_patterns.length > 0 && (
          <div style={styles.insightBox}>
            <div style={styles.insightTitle}>Key Emotional Patterns</div>
            {emotionalContent.key_patterns.map((pattern: any, index: number) => (
              <div key={index} style={{...styles.insightText, marginBottom: index < emotionalContent.key_patterns.length - 1 ? spacing.sm : 0}}>
                <strong>{pattern.name}:</strong> {pattern.description} ({pattern.impact})
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Emotional Inertia Analysis */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Emotional Inertia & Transitions</h3>
        <div style={styles.visualizationContainer}>
          <EmotionalInertiaGauge data={emotionalInertia} />
        </div>
        <p style={styles.paragraph}>
          Emotional inertia measures how &quot;sticky&quot; your emotions are—essentially, how long you typically 
          remain in a particular emotional state before transitioning. Your score of {emotionalInertia.score || 65}% 
          indicates {emotionalInertia.score > 70 ? 'high emotional stability but potential difficulty with rapid adaptation' : 
          'balanced emotional regulation with good adaptability'}.
        </p>
        
        {emotionalInertia.longest_streak && (
          <div style={styles.insightBox}>
            <div style={styles.insightTitle}>Longest Emotional Streak</div>
            <div style={styles.insightText}>
              Your longest recorded emotional streak was {emotionalInertia.longest_streak.duration_hours} hours 
              of {emotionalInertia.longest_streak.emotion}. This suggests your capacity for sustained emotional 
              states, which can be both a strength (emotional stability) and a challenge (potential rigidity).
            </div>
          </div>
        )}
      </section>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Emotional Intelligence & Growth</h3>
        {emotionalContent?.emotional_intelligence ? (
          emotionalContent.emotional_intelligence.split('\n\n').map((paragraph: string, index: number) => (
            <p key={index} style={styles.paragraph}>
              {paragraph}
            </p>
          ))
        ) : (
          <>
            <p style={styles.paragraph}>
              The way you move between emotional states reveals important aspects of your psychological flexibility. 
              Your average emotional duration of {emotionalInertia.average_duration_hours || 4.6} hours suggests 
              you experience emotions with sufficient depth while maintaining the ability to process and move forward.
            </p>
            <p style={styles.paragraph}>
              This emotional rhythm allows for genuine processing of experiences without getting stuck in 
              unproductive patterns. Your ability to sustain positive emotions while transitioning through 
              challenging ones demonstrates emotional intelligence and resilience.
            </p>
          </>
        )}
      </section>
      
      {emotionalContent?.emotional_journey && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Your Emotional Journey</h3>
          {emotionalContent.emotional_journey.split('\n\n').map((paragraph: string, index: number) => (
            <p key={index} style={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </section>
      )}
    </div>
  );
};