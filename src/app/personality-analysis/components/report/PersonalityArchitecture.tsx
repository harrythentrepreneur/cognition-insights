import React, { useState, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { PersonalityRadar } from '../visualizations/PersonalityRadar';
import { Personality3DSphere } from '../visualizations/Personality3DSphere';
import { PersonalityDNA } from '../visualizations/PersonalityDNA';
import { EnhancedCard } from '../ui/EnhancedCard';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface PersonalityArchitectureProps {
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

  visualizationTabs: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  } as CSSProperties,

  tab: {
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    color: colors.textSecondary,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: 500,
  } as CSSProperties,

  activeTab: {
    backgroundColor: colors.accent,
    color: colors.background,
    borderColor: colors.accent,
    boxShadow: `0 0 15px ${colors.accent}40`,
  } as CSSProperties,

  visualizationWrapper: {
    minHeight: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,
};

export const PersonalityArchitecture: React.FC<PersonalityArchitectureProps> = ({ data }) => {
  const [activeVisualization, setActiveVisualization] = useState<'radar' | '3d' | 'dna'>('radar');

  const visualizationTabs = [
    { id: 'radar', label: '📊 Radar Chart', description: 'Traditional 2D personality map' },
    { id: '3d', label: '🌐 3D Sphere', description: 'Interactive 3D personality space' },
    { id: 'dna', label: '🧬 DNA Helix', description: 'Trait relationships visualization' },
  ];

  const renderVisualization = () => {
    const personalityData = data.personality_metrics || {};
    
    switch (activeVisualization) {
      case '3d':
        return <Personality3DSphere data={personalityData} />;
      case 'dna':
        return <PersonalityDNA data={personalityData} />;
      default:
        return <PersonalityRadar data={personalityData} />;
    }
  };

  // Check for LLM-generated content
  const hasLLMContent = data?.narrative_content?.personality_architecture;
  const architectureContent = hasLLMContent ? data.narrative_content.personality_architecture : null;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 2: Core Personality Architecture</h2>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>The Big Five Analysis</h3>
        <p style={styles.paragraph}>
          {architectureContent?.trait_narrative ? (
            architectureContent.trait_narrative.split('\n\n').map((paragraph: string, index: number) => (
              <span key={index}>
                {paragraph}
                {index < architectureContent.trait_narrative.split('\n\n').length - 1 && (
                  <>
                    <br /><br />
                  </>
                )}
              </span>
            ))
          ) : (
            <>
              Your personality architecture reveals a sophisticated interplay of traits that define your unique 
              psychological blueprint. The Big Five model places you in distinct positions across fundamental 
              dimensions of human personality.
            </>
          )}
        </p>
        
        <EnhancedCard
          glowOnHover={false}
          tiltEffect={false}
          scaleOnHover={false}
          style={styles.visualizationContainer}
        >
          {/* Visualization Tabs */}
          <div style={styles.visualizationTabs}>
            {visualizationTabs.map((tab) => (
              <button
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(activeVisualization === tab.id ? styles.activeTab : {}),
                }}
                onClick={() => setActiveVisualization(tab.id as any)}
                title={tab.description}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Visualization Content */}
          <div style={styles.visualizationWrapper} className="visualization-container">
            {renderVisualization()}
          </div>
        </EnhancedCard>
        
        {architectureContent?.architectural_metaphor && (
          <p style={styles.paragraph}>
            {architectureContent.architectural_metaphor}
          </p>
        )}
      </section>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Trait Interconnections</h3>
        {architectureContent?.trait_interactions && architectureContent.trait_interactions.length > 0 ? (
          <>
            {architectureContent.trait_interactions.map((interaction: any, index: number) => (
              <p key={index} style={styles.paragraph}>
                <strong>{interaction.interaction}</strong> = {interaction.result}
              </p>
            ))}
          </>
        ) : (
          <>
            <p style={styles.paragraph}>
              The relationship between your high creativity ({data.personality_metrics?.creativity || 88}%) and 
              empathy ({data.personality_metrics?.empathy || 85}%) creates a unique capacity for innovative 
              problem-solving that considers human needs. This combination is relatively rare and positions you 
              as a natural bridge between technical innovation and human-centered design.
            </p>
            
            <p style={styles.paragraph}>
              Your personality architecture reveals fascinating complementary traits: while your openness drives 
              exploration of new ideas, your conscientiousness ensures these ideas are developed systematically. 
              The {activeVisualization === 'dna' ? 'DNA helix visualization' : '3D sphere model'} above 
              illustrates how these traits interact in three-dimensional space, showing the dynamic relationships 
              that make your personality unique.
            </p>
          </>
        )}
      </section>
      
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Unique Trait Combinations</h3>
        {architectureContent?.unique_combinations && architectureContent.unique_combinations.length > 0 ? (
          <>
            {architectureContent.unique_combinations.map((combination: any, index: number) => (
              <p key={index} style={styles.paragraph}>
                {combination.combination}
              </p>
            ))}
          </>
        ) : (
          <>
            <p style={styles.paragraph}>
              Compared to general population norms, your personality profile places you in the upper quartile 
              for openness and creativity, while maintaining balanced scores in conscientiousness and emotional 
              stability. This configuration is often associated with individuals in creative and helping professions.
            </p>
            
            <p style={styles.paragraph}>
              The interactive visualizations above reveal different aspects of your personality: the radar chart 
              shows your relative strengths, the 3D sphere demonstrates the spatial relationships between traits, 
              and the DNA helix illustrates how complementary characteristics form your unique psychological 
              architecture. Each view offers insights into how your traits work together to create your distinctive 
              approach to life and relationships.
            </p>
          </>
        )}
      </section>
    </div>
  );
};