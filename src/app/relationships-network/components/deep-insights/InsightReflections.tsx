import React from 'react';
import { reflectionStyles as styles } from '../../styles/reflection-styles';

interface InsightReflectionsProps {
  insights: any;
}

interface ReflectionGroup {
  title: string;
  icon?: string;
  items: ReflectionItem[];
}

interface ReflectionItem {
  title: string;
  description: string;
  significance?: number;
  color?: string;
}

export const InsightReflections: React.FC<InsightReflectionsProps> = ({ insights }) => {
  if (!insights || !insights.insights) {
    return <div style={styles.emptyState}>No reflections available</div>;
  }

  const { relationship_dna, emotional_patterns, communication_evolution, synthesis } = insights.insights;

  // Group insights by themes
  const reflectionGroups: ReflectionGroup[] = [
    {
      title: "Seeds of Connection",
      items: [
        {
          title: "Core Dynamic",
          description: relationship_dna?.core_dynamic || "The fundamental nature of your connection",
          significance: 9,
          color: "#FFD700"
        },
        {
          title: "Emotional Signature",
          description: relationship_dna?.emotional_signature || "The unique feeling of being together",
          significance: 8,
          color: "#FFD700"
        }
      ]
    },
    {
      title: "Patterns of Growth",
      items: [
        {
          title: "Individual Evolution",
          description: emotional_patterns?.growth_patterns?.individual_growth || "How you've each grown",
          significance: 7,
          color: "#00F5D4"
        },
        {
          title: "Collective Journey",
          description: emotional_patterns?.growth_patterns?.collective_growth || "Your shared evolution",
          significance: 8,
          color: "#00F5D4"
        }
      ]
    },
    {
      title: "Language of Connection",
      items: communication_evolution?.shared_language ? [
        {
          title: "Inside Jokes",
          description: communication_evolution.shared_language.inside_jokes.join(", "),
          significance: 6,
          color: "#9D4EDD"
        },
        {
          title: "Unique Expressions",
          description: communication_evolution.shared_language.unique_expressions.join(", "),
          significance: 5,
          color: "#9D4EDD"
        },
        {
          title: "Communication Rituals",
          description: communication_evolution.shared_language.communication_rituals.join(", "),
          significance: 7,
          color: "#9D4EDD"
        }
      ] : []
    },
    {
      title: "Profound Insights",
      items: synthesis?.key_insights?.map((insight: string, index: number) => ({
        title: `Insight ${index + 1}`,
        description: insight,
        significance: 8 - index * 0.5,
        color: "#FF6B9D"
      })) || []
    }
  ].filter(group => group.items.length > 0);

  return (
    <div style={styles.container}>
      {reflectionGroups.map((group, groupIndex) => (
        <div key={groupIndex} style={styles.reflectionGroup}>
          <div style={styles.groupHeader}>
            <div style={styles.groupTitle}>{group.title}</div>
          </div>
          
          {group.items.map((item, itemIndex) => (
            <div
              key={itemIndex}
              style={{
                ...styles.reflectionCard,
                borderLeftColor: item.color || '#00F5D4',
                borderLeftWidth: `${2 + (item.significance || 5) * 0.3}px`
              }}
            >
              <div style={styles.cardDate}>
                {insights.analysis_timestamp ? 
                  new Date(insights.analysis_timestamp).toLocaleDateString() : 
                  'Recent'}
              </div>
              <div style={styles.cardTitle}>{item.title}</div>
              <div style={styles.cardDescription}>{item.description}</div>
            </div>
          ))}
        </div>
      ))}
      
      {/* Wisdom section */}
      {synthesis?.wisdom_gained && (
        <div style={styles.wisdomSection}>
          <div style={styles.wisdomTitle}>Wisdom Gained</div>
          <div style={styles.wisdomText}>{synthesis.wisdom_gained}</div>
        </div>
      )}
      
      {/* Relationship story */}
      {synthesis?.relationship_story && (
        <div style={styles.storySection}>
          <div style={styles.storyTitle}>Your Story Together</div>
          <div style={styles.storyText}>{synthesis.relationship_story}</div>
        </div>
      )}
    </div>
  );
};