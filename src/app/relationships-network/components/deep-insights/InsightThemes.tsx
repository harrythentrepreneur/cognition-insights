import React, { useState } from 'react';
import { themeStyles as styles } from '../../styles/theme-styles';

interface InsightThemesProps {
  insights: any;
}

export const InsightThemes: React.FC<InsightThemesProps> = ({ insights }) => {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  if (!insights || !insights.insights) {
    return <div style={styles.emptyState}>No themes available</div>;
  }

  const {
    relationship_dna,
    emotional_patterns,
    communication_evolution,
    future_trajectory
  } = insights.insights;

  // Define themes with their related content
  const themes = [
    {
      id: 'vulnerability',
      name: 'Vulnerability & Trust',
      color: '#FF6B9D',
      size: emotional_patterns?.emotional_dynamics?.emotional_safety_level === 'High' ? 'large' : 'medium',
      content: {
        description: 'The foundation of deep trust built through mutual vulnerability',
        elements: [
          ...(emotional_patterns?.emotional_dynamics?.vulnerability_moments || []),
          relationship_dna?.unspoken_bonds
        ].filter(Boolean),
        significance: 'This theme represents the core strength of your connection'
      }
    },
    {
      id: 'growth',
      name: 'Mutual Growth',
      color: '#00F5D4',
      size: 'large',
      content: {
        description: emotional_patterns?.growth_patterns?.collective_growth || 'How you inspire each other to evolve',
        elements: emotional_patterns?.growth_patterns?.growth_catalysts || [],
        significance: 'Growth is the lifeblood of your connection'
      }
    },
    {
      id: 'communication',
      name: 'Unique Language',
      color: '#9D4EDD',
      size: 'medium',
      content: {
        description: 'The special way you communicate that\'s unique to your relationship',
        elements: [
          ...(communication_evolution?.shared_language?.unique_expressions || []),
          ...(communication_evolution?.shared_language?.inside_jokes || [])
        ],
        significance: 'Your shared language creates a private world between you'
      }
    },
    {
      id: 'support',
      name: 'Support Dynamics',
      color: '#FFD700',
      size: 'medium',
      content: {
        description: emotional_patterns?.emotional_dynamics?.support_patterns || 'How you show up for each other',
        elements: [
          `${insights.contact}: ${emotional_patterns?.emotional_dynamics?.emotional_roles?.contact_role}`,
          `You: ${emotional_patterns?.emotional_dynamics?.emotional_roles?.user_role}`
        ],
        significance: 'The balance of support creates sustainable connection'
      }
    },
    {
      id: 'future',
      name: 'Future Potential',
      color: '#45B7D1',
      size: 'small',
      content: {
        description: 'Where your relationship is heading',
        elements: future_trajectory ? [
          future_trajectory.likely_trajectory,
          future_trajectory.best_case_scenario,
          ...(future_trajectory.growth_opportunities?.map((opp: any) => opp.area) || [])
        ] : [],
        significance: 'Understanding potential helps nurture growth'
      }
    }
  ].filter(theme => theme.content.elements.length > 0);

  const handleThemeClick = (themeId: string) => {
    setSelectedTheme(selectedTheme === themeId ? null : themeId);
  };

  const selectedThemeData = themes.find(t => t.id === selectedTheme);

  return (
    <div style={styles.container}>
      <div style={styles.themeMap}>
        {themes.map((theme, index) => {
          const size = theme.size === 'large' ? 120 : theme.size === 'medium' ? 90 : 60;
          const isSelected = selectedTheme === theme.id;
          
          return (
            <div
              key={theme.id}
              style={{
                ...styles.themeBubble,
                backgroundColor: `${theme.color}20`,
                border: `2px solid ${theme.color}`,
                width: `${size}px`,
                height: `${size}px`,
                top: `${20 + (index % 3) * 30}%`,
                left: `${15 + (index % 2) * 40 + (index % 3) * 10}%`,
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isSelected ? `0 0 20px ${theme.color}40` : styles.themeBubble.boxShadow
              }}
              onClick={() => handleThemeClick(theme.id)}
            >
              <div style={styles.themeName}>{theme.name}</div>
            </div>
          );
        })}
        
        {/* Connection lines between themes */}
        <svg style={styles.connectionSvg}>
          {themes.map((theme1, i) => 
            themes.slice(i + 1).map((theme2, j) => {
              const actualJ = i + j + 1;
              return (
                <line
                  key={`${theme1.id}-${theme2.id}`}
                  x1={`${15 + (i % 2) * 40 + (i % 3) * 10}%`}
                  y1={`${20 + (i % 3) * 30}%`}
                  x2={`${15 + (actualJ % 2) * 40 + (actualJ % 3) * 10}%`}
                  y2={`${20 + (actualJ % 3) * 30}%`}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })
          )}
        </svg>
      </div>
      
      {selectedThemeData && (
        <div style={styles.themeDetails}>
          <div style={styles.detailsHeader}>
            <div 
              style={{
                ...styles.detailsTitle,
                color: selectedThemeData.color
              }}
            >
              {selectedThemeData.name}
            </div>
            <button
              style={styles.closeDetails}
              onClick={() => setSelectedTheme(null)}
            >
              ×
            </button>
          </div>
          
          <div style={styles.detailsDescription}>
            {selectedThemeData.content.description}
          </div>
          
          <div style={styles.detailsElements}>
            <div style={styles.elementsTitle}>Key Elements:</div>
            {selectedThemeData.content.elements.map((element: string, index: number) => (
              <div
                key={index}
                style={{
                  ...styles.elementItem,
                  borderLeftColor: selectedThemeData.color
                }}
              >
                {element}
              </div>
            ))}
          </div>
          
          <div style={styles.detailsSignificance}>
            <div style={styles.significanceIcon}>💡</div>
            {selectedThemeData.content.significance}
          </div>
        </div>
      )}
    </div>
  );
};