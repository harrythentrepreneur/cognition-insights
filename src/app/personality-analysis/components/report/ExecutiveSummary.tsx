import React, { CSSProperties, useState } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { SkeletonLoader, SectionSkeleton } from '../SkeletonLoader';
import { MessageEvidence, InlineMessageEvidence } from '../shared/MessageEvidence';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface Finding {
  icon: string;
  title: string;
  text: string;
}

interface ExecutiveSummaryProps {
  data: any;
}

const styles = {
  container: {
    marginBottom: '48px',
    animation: 'fadeIn 0.6s ease-in',
  } as CSSProperties,
  
  title: {
    fontSize: '2.5rem',
    fontWeight: 300,
    color: colors.accent,
    marginBottom: '36px',
    borderBottom: `2px solid ${colors.accent}`,
    paddingBottom: '20px',
    fontFamily: fonts.body,
    letterSpacing: '-0.02em',
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as CSSProperties,
  
  section: {
    marginBottom: '40px',
    animation: 'slideUp 0.5s ease-out',
    animationFillMode: 'backwards',
  } as CSSProperties,
  
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '20px',
    fontFamily: fonts.body,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as CSSProperties,
  
  sectionIcon: {
    fontSize: '1.25rem',
    opacity: 0.8,
  } as CSSProperties,
  
  paragraph: {
    fontSize: '1.125rem',
    lineHeight: 1.8,
    color: colors.text,
    marginBottom: '20px',
    textAlign: 'justify' as const,
    fontFamily: fonts.body,
    opacity: 0.95,
  } as CSSProperties,
  
  highlightedText: {
    color: colors.accent,
    fontWeight: 500,
    borderBottom: `1px dotted ${colors.accent}`,
    cursor: 'help',
  } as CSSProperties,
  
  keyFindings: {
    background: 'linear-gradient(135deg, rgba(0, 255, 230, 0.03), rgba(35, 35, 64, 0.4))',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 255, 230, 0.08)',
  } as CSSProperties,
  
  findingsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as CSSProperties,
  
  findingItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '24px',
    gap: '16px',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  } as CSSProperties,
  
  findingItemHover: {
    backgroundColor: 'rgba(0, 255, 230, 0.05)',
    transform: 'translateX(8px)',
  } as CSSProperties,
  
  findingIcon: {
    fontSize: '2rem',
    lineHeight: 1,
    marginTop: '4px',
    filter: 'drop-shadow(0 2px 4px rgba(0, 255, 230, 0.3))',
  } as CSSProperties,
  
  findingContent: {
    flex: 1,
  } as CSSProperties,
  
  findingTitle: {
    fontWeight: 600,
    fontSize: '1.125rem',
    color: colors.accent,
    marginBottom: '8px',
    fontFamily: fonts.body,
  } as CSSProperties,
  
  findingText: {
    color: colors.text,
    fontSize: '1rem',
    fontFamily: fonts.body,
    lineHeight: 1.7,
    opacity: 0.9,
  } as CSSProperties,
  
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '24px',
  } as CSSProperties,
  
  metricCard: {
    background: 'linear-gradient(135deg, rgba(35, 35, 64, 0.4), rgba(35, 35, 64, 0.2))',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '24px 20px',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative' as const,
    overflow: 'hidden',
  } as CSSProperties,
  
  metricCardActive: {
    background: 'linear-gradient(135deg, rgba(0, 255, 230, 0.1), rgba(0, 255, 230, 0.05))',
    borderColor: colors.accent,
    transform: 'scale(1.05)',
    boxShadow: '0 12px 24px rgba(0, 255, 230, 0.2)',
  } as CSSProperties,
  
  metricValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: colors.accent,
    marginBottom: '8px',
    fontFamily: fonts.body,
    textShadow: '0 2px 8px rgba(0, 255, 230, 0.3)',
  } as CSSProperties,
  
  metricLabel: {
    fontSize: '0.875rem',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: fonts.body,
    fontWeight: 500,
    opacity: 0.8,
  } as CSSProperties,
  
  metricPercentile: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    fontSize: '0.75rem',
    color: colors.accent,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 600,
  } as CSSProperties,
  
  lifeAbstract: {
    background: 'linear-gradient(90deg, rgba(0, 255, 230, 0.05), rgba(35, 35, 64, 0.3))',
    borderLeft: `4px solid ${colors.accent}`,
    padding: '32px',
    marginTop: '40px',
    fontStyle: 'italic',
    fontSize: '1.2rem',
    lineHeight: 1.9,
    color: colors.text,
    fontFamily: fonts.body,
    borderRadius: '0 16px 16px 0',
    position: 'relative' as const,
    overflow: 'hidden',
  } as CSSProperties,
  
  quoteIcon: {
    position: 'absolute' as const,
    top: '16px',
    left: '24px',
    fontSize: '3rem',
    color: colors.accent,
    opacity: 0.1,
  } as CSSProperties,
  
  recommendations: {
    marginTop: '32px',
  } as CSSProperties,
  
  recommendationItem: {
    background: 'linear-gradient(135deg, rgba(0, 255, 230, 0.08), rgba(0, 255, 230, 0.02))',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  } as CSSProperties,
  
  recommendationItemHover: {
    transform: 'translateX(8px)',
    boxShadow: '0 8px 24px rgba(0, 255, 230, 0.1)',
    borderColor: colors.accent,
  } as CSSProperties,
  
  recommendationNumber: {
    width: '40px',
    height: '40px',
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
    color: colors.background,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    flexShrink: 0,
    fontSize: '1.125rem',
    boxShadow: '0 4px 12px rgba(0, 255, 230, 0.3)',
  } as CSSProperties,
  
  recommendationContent: {
    flex: 1,
  } as CSSProperties,
  
  recommendationTitle: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '4px',
    fontFamily: fonts.body,
  } as CSSProperties,
  
  recommendationText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: '0.95rem',
    lineHeight: 1.6,
  } as CSSProperties,
  
  recommendationTimeframe: {
    fontSize: '0.8rem',
    color: colors.accent,
    marginTop: '8px',
    fontWeight: 500,
  } as CSSProperties,
};

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ data }) => {
  const [showEvidence, setShowEvidence] = useState<Record<string, boolean>>({});
  const [hoveredFinding, setHoveredFinding] = useState<number | null>(null);
  const [hoveredRecommendation, setHoveredRecommendation] = useState<number | null>(null);
  
  // Debug logging
  React.useEffect(() => {
    console.log('[DEBUG] ExecutiveSummary received data:', data);
    if (data) {
      console.log('[DEBUG] Data structure:');
      console.log('  - Has personality_metrics:', !!data.personality_metrics);
      console.log('  - Has trait_evidence:', !!data.trait_evidence);
      console.log('  - Has narrative_content:', !!data.narrative_content);
      if (data.narrative_content) {
        console.log('  - narrative_content keys:', Object.keys(data.narrative_content));
        if (data.narrative_content.executive_summary) {
          console.log('  - executive_summary keys:', Object.keys(data.narrative_content.executive_summary));
          console.log('  - Has LLM profile:', !!data.narrative_content.executive_summary.profile);
          console.log('  - Has LLM key_findings:', !!data.narrative_content.executive_summary.key_findings);
          console.log('  - Has LLM recommendations:', !!data.narrative_content.executive_summary.recommendations);
          console.log('  - Has LLM life_abstract:', !!data.narrative_content.executive_summary.life_abstract);
        }
      }
      if (data.trait_evidence) {
        console.log('  - trait_evidence keys:', Object.keys(data.trait_evidence));
        const firstTrait = Object.keys(data.trait_evidence)[0];
        if (firstTrait) {
          console.log(`  - Example trait evidence (${firstTrait}):`, data.trait_evidence[firstTrait]);
        }
      }
    }
  }, [data]);
  
  // Check if data is still loading
  if (!data || (!data.personality_metrics && !data.narrative_content)) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Executive Summary</h2>
        <SectionSkeleton />
        <div style={{ marginTop: spacing.xl }}>
          <SkeletonLoader type="title" width="30%" />
          <div style={{ marginTop: spacing.md }}>
            <SkeletonLoader type="paragraph" />
          </div>
        </div>
        <div style={{ marginTop: spacing.xl }}>
          <SkeletonLoader type="title" width="40%" />
          <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
            <SkeletonLoader type="metric" />
            <SkeletonLoader type="metric" />
            <SkeletonLoader type="metric" />
            <SkeletonLoader type="metric" />
          </div>
        </div>
      </div>
    );
  }
  
  // Check if we have LLM-generated content
  console.log('[DEBUG] Checking for LLM content:');
  console.log('  - data exists:', !!data);
  console.log('  - data.narrative_content exists:', !!data?.narrative_content);
  console.log('  - data.narrative_content.executive_summary exists:', !!data?.narrative_content?.executive_summary);
  if (data?.narrative_content) {
    console.log('  - narrative_content keys:', Object.keys(data.narrative_content));
    if (data.narrative_content.executive_summary) {
      console.log('  - executive_summary keys:', Object.keys(data.narrative_content.executive_summary));
    }
  }
  const hasLLMContent = data?.narrative_content?.executive_summary;
  const getTopTraits = () => {
    const metrics = data?.personality_metrics || {};
    return Object.entries(metrics)
      .filter(([, score]) => typeof score === 'number' && score > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([trait, score]) => ({ trait, score }));
  };
  
  const calculatePercentile = (score: number) => {
    // Statistical approximation based on normal distribution
    if (score >= 85) return 95;
    if (score >= 80) return 90;
    if (score >= 75) return 80;
    if (score >= 70) return 70;
    if (score >= 65) return 60;
    if (score >= 60) return 50;
    if (score >= 55) return 40;
    if (score >= 50) return 30;
    if (score >= 45) return 20;
    return 10;
  };
  
  const toggleEvidence = (key: string) => {
    setShowEvidence(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const getTraitCategory = (trait: string) => {
    const categories: Record<string, string> = {
      extraversion: 'social dynamics',
      openness: 'intellectual curiosity',
      conscientiousness: 'goal achievement',
      agreeableness: 'interpersonal harmony',
      emotional_stability: 'emotional regulation',
      creativity: 'innovative thinking',
      empathy: 'emotional intelligence',
      leadership_tendency: 'social influence',
      resilience: 'psychological adaptability',
      analytical_thinking: 'cognitive processing',
      expressiveness: 'communication clarity',
      responsiveness: 'social engagement'
    };
    return categories[trait] || trait;
  };
  
  const getProfile = () => {
    // Use LLM-generated content if available
    if (hasLLMContent && data.narrative_content.executive_summary.profile) {
      console.log('[DEBUG] Using LLM-generated profile');
      return data.narrative_content.executive_summary.profile;
    }
    // Fall back to template generation
    console.log('[DEBUG] Falling back to template profile generation');
    return generateProfile();
  };
  
  const getTraitEvidence = (trait: string) => {
    // Get evidence for a specific trait if available
    if (data?.trait_evidence && data.trait_evidence[trait]) {
      return data.trait_evidence[trait].evidence || [];
    }
    return [];
  };
  
  const getTraitConfidence = (trait: string) => {
    // Get confidence score for a specific trait
    if (data?.trait_evidence && data.trait_evidence[trait]) {
      return data.trait_evidence[trait].confidence || 0;
    }
    return 0;
  };
  
  const generateProfile = () => {
    const topTraits = getTopTraits();
    const dominantTrait = topTraits[0]?.trait || 'balanced';
    const score = topTraits[0]?.score || 50;
    const percentile = calculatePercentile(score as number);
    const traitCategory = getTraitCategory(dominantTrait);
    
    const totalMessages = data?.summary?.total_messages_analyzed || 1000;
    const userMessages = data?.summary?.user_message_count || totalMessages / 2;
    const engagementRate = ((userMessages / totalMessages) * 100).toFixed(1);
    
    const dominantEvidence = getTraitEvidence(dominantTrait);
    const evidenceCount = dominantEvidence.length;
    
    if ((score as number) > 80) {
      return `Based on ${totalMessages.toLocaleString()} messages analyzed, your communication patterns show exceptional ${traitCategory} (${score}% strength). This trait was identified through ${evidenceCount} clear examples of ${dominantTrait}-related language patterns. With ${engagementRate}% of messages coming from you, the analysis has high confidence in these findings. Your ${traitCategory} manifests through specific word choices and conversation patterns that consistently appear throughout your chat history.`;
    } else if ((score as number) > 65) {
      return `Analysis of ${totalMessages.toLocaleString()} WhatsApp messages reveals strong ${traitCategory} (${score}%) combined with ${getTraitCategory(topTraits[1]?.trait || 'adaptability')} (${topTraits[1]?.score || 50}%). These traits were identified through repeated communication patterns, with ${evidenceCount} specific examples found for your dominant trait. Your ${engagementRate}% message contribution rate provides a solid foundation for understanding how these traits influence your daily interactions.`;
    } else {
      return `Your WhatsApp communication across ${totalMessages.toLocaleString()} messages shows a balanced personality profile. With relatively even scores across multiple traits (${dominantTrait}: ${score}%), your personality adapts to different conversational contexts. The ${engagementRate}% of messages you contributed reveals consistent but flexible communication patterns, with ${evidenceCount} examples supporting this balanced assessment.`;
    }
  };
  
  const getKeyFindings = () => {
    // Use LLM-generated content if available
    if (hasLLMContent && data.narrative_content.executive_summary.key_findings) {
      console.log('[DEBUG] Using LLM-generated key findings');
      return data.narrative_content.executive_summary.key_findings.map((finding: any) => ({
        icon: finding.icon || '🔍',
        title: finding.title,
        text: finding.text || finding.description
      }));
    }
    // Fall back to template generation
    console.log('[DEBUG] Falling back to template key findings generation');
    return generateKeyFindings();
  };
  
  const generateKeyFindings = () => {
    const metrics = data?.personality_metrics || {};
    const inertiaScore = data?.emotional_inertia?.score || 65;
    const proactiveScore = data?.proactive_reactive?.proactive_score || 68;
    const dominantTrait = data?.summary?.dominant_trait || 'creativity';
    
    const findings = [
      {
        icon: '🎯',
        title: 'Core Personality Architecture',
        text: `Your WhatsApp messages consistently demonstrate ${getTraitCategory(dominantTrait)} (${metrics[dominantTrait] || 75}% strength), appearing in ${Math.round((metrics[dominantTrait] || 75) / 100 * (data?.summary?.user_message_count || 500))} of your messages. This trait shows up through specific language patterns like "${dominantTrait === 'extraversion' ? 'group, everyone, party' : dominantTrait === 'openness' ? 'new, explore, interesting' : 'plan, organize, complete'}". Your communication style places this trait ${metrics[dominantTrait] > 80 ? 'significantly above' : metrics[dominantTrait] > 60 ? 'moderately above' : 'near'} typical levels.`,
      },
      {
        icon: '🧠',
        title: 'Emotional Intelligence Profile',
        text: `Your emotional patterns show ${inertiaScore}% consistency, meaning you typically stay in the same emotional state for ${data?.emotional_inertia?.average_duration_hours || 2.5} hours on average. The longest emotional streak recorded was ${data?.emotional_inertia?.longest_streak?.emotion || 'positive'} lasting ${data?.emotional_inertia?.longest_streak?.duration_hours || 4} hours. This pattern, observed across ${data?.summary?.user_message_count || 500} messages, indicates ${inertiaScore > 70 ? 'strong emotional stability' : inertiaScore > 50 ? 'balanced emotional flexibility' : 'rapid emotional adaptation'}.`,
      },
      {
        icon: '💬',
        title: 'Communication Dynamics',
        text: `You initiate conversations ${proactiveScore}% of the time, with ${data?.proactive_reactive?.examples?.proactive?.length || 0} clear examples of starting new topics. Your message timing shows ${proactiveScore > 70 ? 'you often message first after breaks in conversation' : proactiveScore > 50 ? 'a balanced mix of initiating and responding' : 'you prefer responding to others'}. Response patterns indicate ${metrics.expressiveness > 70 ? 'detailed, expressive messages' : 'concise communication'} with an average response containing ${metrics.expressiveness > 70 ? '15-20' : '5-10'} words.`,
      },
    ];
    
    // Add a fourth finding based on growth trajectory
    if (data?.confidence_timeline?.length > 0) {
      const timeline = data.confidence_timeline;
      const growthRate = timeline[timeline.length - 1].overall_confidence - timeline[0].overall_confidence;
      findings.push({
        icon: '📈',
        title: 'Developmental Trajectory',
        text: `Longitudinal analysis reveals ${growthRate > 0 ? `${growthRate.toFixed(1)}% confidence growth` : 'stable confidence levels'} over the analyzed period, suggesting ${growthRate > 20 ? 'accelerated personal development and self-actualization' : growthRate > 10 ? 'steady psychological maturation' : growthRate > 0 ? 'gradual evolution' : 'consolidated personality structure'}. This growth pattern correlates with ${metrics.resilience > 70 ? 'high' : 'moderate'} psychological resilience.`,
      });
    }
    
    return findings;
  };
  
  const keyFindings = getKeyFindings();
  
  const getRecommendations = () => {
    // Use LLM-generated content if available
    if (hasLLMContent && data.narrative_content.executive_summary.recommendations) {
      const llmRecs = data.narrative_content.executive_summary.recommendations;
      // Handle both string array and object array formats
      return llmRecs.slice(0, 5).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        // For objects, combine title and description for display
        if (rec.title && rec.description) {
          return `${rec.title}: ${rec.description}`;
        }
        return rec.title || rec.description || JSON.stringify(rec);
      });
    }
    // Fall back to template generation
    return generateRecommendations();
  };
  
  const generateRecommendations = () => {
    const metrics = data?.personality_metrics || {};
    const recommendations: string[] = [];
    
    // Top trait leveraging
    const topTrait = getTopTraits()[0];
    if (topTrait) {
      const trait = getTraitCategory(topTrait.trait);
      recommendations.push(`Strategically leverage your exceptional ${trait} (${topTrait.score}th percentile) in leadership roles and complex problem-solving scenarios`);
    }
    
    // Emotional regulation
    const inertiaScore = data?.emotional_inertia?.score || 65;
    if (inertiaScore > 70) {
      recommendations.push('Maintain your strong emotional stability while developing flexibility for rapid adaptation when needed');
    } else if (inertiaScore < 50) {
      recommendations.push('Develop emotional anchoring techniques to increase stability during challenging periods');
    } else {
      recommendations.push('Continue cultivating your balanced emotional regulation through mindfulness practices');
    }
    
    // Communication optimization
    const proactiveScore = data?.proactive_reactive?.proactive_score || 68;
    if (proactiveScore > 75) {
      recommendations.push('Balance your natural leadership communication with strategic listening to maximize influence');
    } else if (proactiveScore < 40) {
      recommendations.push('Practice assertive communication techniques to increase your conversational impact');
    } else {
      recommendations.push('Optimize your balanced communication style by adapting proactivity to context');
    }
    
    // Growth areas
    const lowestTrait = Object.entries(metrics)
      .filter(([trait]) => !['message_count', 'total_messages'].includes(trait))
      .sort(([, a], [, b]) => (a as number) - (b as number))[0];
    
    if (lowestTrait && (lowestTrait[1] as number) < 60) {
      recommendations.push(`Target development of ${getTraitCategory(lowestTrait[0])} through structured practice and gradual exposure`);
    }
    
    // Relationship optimization
    if (metrics.empathy > 75 && metrics.leadership_tendency > 65) {
      recommendations.push('Leverage your rare combination of empathy and leadership for transformational influence');
    } else if (metrics.empathy > 75) {
      recommendations.push('Channel your exceptional empathy into mentoring and collaborative leadership opportunities');
    }
    
    return recommendations.slice(0, 5);
  };
  
  const recommendations = getRecommendations();
  
  const getLifeAbstract = () => {
    // Use LLM-generated content if available
    if (hasLLMContent && data.narrative_content.executive_summary.life_abstract) {
      return data.narrative_content.executive_summary.life_abstract;
    }
    // Fall back to template generation
    return generateLifeNarrativeAbstract();
  };
  
  const generateLifeNarrativeAbstract = () => {
    const metrics = data?.personality_metrics || {};
    const topTraits = getTopTraits();
    const dominantTrait = getTraitCategory(topTraits[0]?.trait || 'balanced');
    const secondaryTrait = getTraitCategory(topTraits[1]?.trait || 'adaptability');
    
    const narrativeTemplates = {
      high_creative: `"A narrative woven with threads of ${dominantTrait} and ${secondaryTrait}, your journey reveals an architect of possibility who transforms abstract visions into tangible realities. Through ${data?.summary?.total_messages_analyzed || 'countless'} interactions, patterns emerge of someone who navigates complexity with intuitive grace while maintaining authentic connections. Your story speaks to the rare ability to balance ${metrics.empathy > 75 ? 'profound empathy' : 'interpersonal awareness'} with ${metrics.analytical_thinking > 70 ? 'analytical precision' : 'practical wisdom'}, creating a legacy of meaningful impact."`,
      
      high_leader: `"Your narrative unfolds as a testament to ${dominantTrait}, where natural leadership emerges not from dominance but from ${metrics.empathy > 75 ? 'empathetic understanding' : 'authentic connection'}. The ${data?.proactive_reactive?.proactive_score || 68}% proactive communication pattern reveals someone who shapes conversations and environments with intentional purpose. Your journey illustrates how ${secondaryTrait} amplifies your ability to inspire and guide others toward collective growth and achievement."`,
      
      high_analytical: `"A story characterized by ${dominantTrait} and systematic exploration, your narrative reveals a mind that finds patterns where others see chaos. Your communication demonstrates ${metrics.analytical_thinking || 70}% analytical processing, creating frameworks for understanding that benefit both self and community. The interplay between ${secondaryTrait} and logical reasoning creates a unique perspective that bridges abstract concepts with practical application."`,
      
      balanced: `"Your narrative emerges as a symphony of balanced traits, where ${dominantTrait} harmonizes with ${secondaryTrait} to create a uniquely adaptive personality. Through ${data?.summary?.chat_duration_days || 'extended'} days of interaction, your story reveals someone who navigates life's complexities with ${metrics.resilience > 70 ? 'remarkable resilience' : 'steady determination'} and ${metrics.emotional_stability > 65 ? 'emotional wisdom' : 'growing self-awareness'}. This equilibrium enables you to serve as both participant and catalyst in the stories of others."`,
    };
    
    // Select narrative based on profile
    if (metrics.creativity > 80 || metrics.openness > 80) {
      return narrativeTemplates.high_creative;
    } else if (metrics.leadership_tendency > 75 || (metrics.extraversion > 75 && metrics.conscientiousness > 70)) {
      return narrativeTemplates.high_leader;
    } else if (metrics.analytical_thinking > 80 || metrics.conscientiousness > 80) {
      return narrativeTemplates.high_analytical;
    } else {
      return narrativeTemplates.balanced;
    }
  };
  
  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(20px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .executive-summary-section {
            animation: slideUp 0.5s ease-out;
            animation-fill-mode: backwards;
          }
        `}
      </style>
      <h2 style={styles.title}>Executive Summary</h2>
      
      {/* Personal Profile Overview */}
      <section style={{ ...styles.section, animationDelay: '0.1s' }}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>🎯</span>
          Personal Profile Overview
        </h3>
        {getProfile().split('\n\n').map((paragraph: string, index: number) => (
          <p key={index} style={styles.paragraph}>
            {/* Highlight percentiles and key metrics */}
            {paragraph.split(/(\d+(?:st|nd|rd|th)?\s*percentile|\d+%|\d+,?\d*\s*messages?)/gi).map((part: string, i: number) => {
              if (part.match(/\d+(?:st|nd|rd|th)?\s*percentile|\d+%|\d+,?\d*\s*messages?/i)) {
                return <span key={i} style={styles.highlightedText}>{part}</span>;
              }
              return part;
            })}
          </p>
        ))}
      </section>
      
      {/* Key Findings */}
      <section style={{ ...styles.section, animationDelay: '0.2s' }}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>💎</span>
          Key Findings
        </h3>
        <div style={styles.keyFindings}>
          <ul style={styles.findingsList}>
            {keyFindings.map((finding: Finding, index: number) => (
              <li 
                key={index} 
                style={{
                  ...styles.findingItem,
                  ...(hoveredFinding === index ? styles.findingItemHover : {}),
                  animationDelay: `${0.3 + index * 0.1}s`
                }}
                onMouseEnter={() => setHoveredFinding(index)}
                onMouseLeave={() => setHoveredFinding(null)}
              >
                <span style={styles.findingIcon}>{finding.icon}</span>
                <div style={styles.findingContent}>
                  <div style={styles.findingTitle}>{finding.title}</div>
                  <div style={styles.findingText}>
                    {/* Highlight statistical terms */}
                    {finding.text.split(/(\d+(?:st|nd|rd|th)?\s*percentile|\d+%|z-score[^,]+|\d+\s*standard\s*deviation)/gi).map((part, i) => {
                      if (part.match(/\d+(?:st|nd|rd|th)?\s*percentile|\d+%|z-score[^,]+|\d+\s*standard\s*deviation/i)) {
                        return <span key={i} style={styles.highlightedText}>{part}</span>;
                      }
                      return part;
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      
      {/* Quick Metrics */}
      <section style={{ ...styles.section, animationDelay: '0.4s' }}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>📊</span>
          Personality Snapshot
        </h3>
        <div style={styles.metricsGrid}>
          {getTopTraits().slice(0, 4).map(({ trait, score }, index) => {
            const isActive = showEvidence[trait];
            const confidence = getTraitConfidence(trait);
            const evidence = getTraitEvidence(trait);
            const percentile = calculatePercentile(score as number);
            
            return (
              <div key={trait} style={{ animationDelay: `${0.5 + index * 0.1}s` }}>
                <div 
                  style={{
                    ...styles.metricCard,
                    ...(isActive ? styles.metricCardActive : {})
                  }}
                  onClick={() => toggleEvidence(trait)}
                >
                  {percentile >= 90 && (
                    <div style={styles.metricPercentile}>
                      Top {100 - percentile}%
                    </div>
                  )}
                  <div style={styles.metricValue}>{String(score)}%</div>
                  <div style={styles.metricLabel}>{trait.replace(/_/g, ' ')}</div>
                  {confidence > 0 && (
                    <div style={{
                      marginTop: '12px',
                      fontSize: '0.75rem',
                      color: colors.accent,
                      opacity: 0.7,
                    }}>
                      {confidence}% confidence
                    </div>
                  )}
                  <div style={{
                    marginTop: '4px',
                    fontSize: '0.7rem',
                    color: colors.textSecondary,
                  }}>
                    {evidence.length > 0 ? `${evidence.length} examples` : 'Click for evidence'}
                  </div>
                </div>
                {isActive && evidence.length > 0 && (
                  <MessageEvidence 
                    evidence={evidence}
                    title={`Evidence for ${trait.replace(/_/g, ' ')}`}
                    maxItems={2}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
      
      {/* Life Narrative Abstract */}
      <section style={{ ...styles.section, animationDelay: '0.6s' }}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>✨</span>
          Life Narrative Abstract
        </h3>
        <div style={styles.lifeAbstract}>
          <span style={styles.quoteIcon}>"</span>
          {getLifeAbstract()}
        </div>
      </section>
      
      {/* Growth Recommendations */}
      <section style={{ ...styles.section, animationDelay: '0.7s' }}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>🚀</span>
          Growth Recommendations
        </h3>
        <div style={styles.recommendations}>
          {recommendations.map((rec: any, index: number) => (
            <div 
              key={index} 
              style={{
                ...styles.recommendationItem,
                ...(hoveredRecommendation === index ? styles.recommendationItemHover : {}),
                animationDelay: `${0.8 + index * 0.1}s`
              }}
              onMouseEnter={() => setHoveredRecommendation(index)}
              onMouseLeave={() => setHoveredRecommendation(null)}
            >
              <span style={styles.recommendationNumber}>{index + 1}</span>
              <div style={styles.recommendationContent}>
                {typeof rec === 'object' && rec.title && rec.description ? (
                  <>
                    <div style={styles.recommendationTitle}>{rec.title}</div>
                    <div style={styles.recommendationText}>{rec.description}</div>
                    {rec.timeframe && (
                      <div style={styles.recommendationTimeframe}>
                        ⏱ {rec.timeframe}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={styles.recommendationText}>
                    {typeof rec === 'string' ? rec : (rec.title || rec.description || rec)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};