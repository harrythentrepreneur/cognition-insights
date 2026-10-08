import React, { useState, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface GrowthArea {
  id: string;
  title: string;
  description: string;
  currentLevel: number;
  targetLevel: number;
  timeframe: string;
  strategies: string[];
  priority: 'high' | 'medium' | 'low';
  category: 'strength' | 'development' | 'maintenance';
}

interface PersonalizedGrowthPlanProps {
  data?: {
    growthAreas: GrowthArea[];
    overallGoal: string;
    timeHorizon: string;
  };
}

const styles = {
  container: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.lg,
    textAlign: 'center',
  } as CSSProperties,
  
  overallGoal: {
    fontSize: '1.1rem',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    fontStyle: 'italic',
  } as CSSProperties,
  
  filterTabs: {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    justifyContent: 'center',
    flexWrap: 'wrap',
  } as CSSProperties,
  
  filterTab: {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.textSecondary,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '100px',
    textAlign: 'center',
  } as CSSProperties,
  
  activeTab: {
    backgroundColor: colors.accent,
    color: colors.background,
    borderColor: colors.accent,
  } as CSSProperties,
  
  growthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  growthCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    position: 'relative',
    transition: 'all 0.2s ease',
  } as CSSProperties,
  
  priorityBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as CSSProperties,
  
  highPriority: {
    backgroundColor: '#FF6B6B',
    color: colors.background,
  } as CSSProperties,
  
  mediumPriority: {
    backgroundColor: '#FFD93D',
    color: colors.background,
  } as CSSProperties,
  
  lowPriority: {
    backgroundColor: '#6BCF7F',
    color: colors.background,
  } as CSSProperties,
  
  categoryIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    marginBottom: spacing.md,
  } as CSSProperties,
  
  strengthCategory: {
    backgroundColor: `${colors.accent}20`,
    color: colors.accent,
  } as CSSProperties,
  
  developmentCategory: {
    backgroundColor: '#FFD93D20',
    color: '#FFD93D',
  } as CSSProperties,
  
  maintenanceCategory: {
    backgroundColor: '#6BCF7F20',
    color: '#6BCF7F',
  } as CSSProperties,
  
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.sm,
    paddingRight: spacing.xl,
  } as CSSProperties,
  
  cardDescription: {
    fontSize: '0.95rem',
    color: colors.textSecondary,
    lineHeight: 1.6,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  progressContainer: {
    marginBottom: spacing.md,
  } as CSSProperties,
  
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: colors.border,
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
  } as CSSProperties,
  
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: '4px',
    transition: 'width 0.8s ease',
  } as CSSProperties,
  
  progressTarget: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '2px',
    backgroundColor: colors.text,
    opacity: 0.7,
  } as CSSProperties,
  
  timeframe: {
    fontSize: '0.875rem',
    color: colors.accentDark,
    marginBottom: spacing.md,
    fontWeight: 500,
  } as CSSProperties,
  
  strategiesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as CSSProperties,
  
  strategyItem: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderRadius: '4px',
    borderLeft: `3px solid ${colors.accent}`,
  } as CSSProperties,
};

export const PersonalizedGrowthPlan: React.FC<PersonalizedGrowthPlanProps> = ({ data }) => {
  // Generate data-driven growth areas based on personality metrics
  const generateDataDrivenGrowthAreas = (personalityData?: any): GrowthArea[] => {
    const metrics = personalityData?.personality_metrics || {};
    const areas: GrowthArea[] = [];

    // Analyze confidence levels for development opportunities
    if (metrics.confidence < 70 || metrics.assertiveness < 65) {
      areas.push({
        id: 'confidence',
        title: 'Confident Self-Expression',
        description: 'Build stronger assertiveness in communication while maintaining empathy',
        currentLevel: metrics.confidence || 65,
        targetLevel: Math.min((metrics.confidence || 65) + 20, 95),
        timeframe: '3 months',
        priority: 'high' as const,
        category: 'development' as const,
        strategies: [
          'Practice stating opinions clearly in group discussions',
          'Use assertive language patterns in professional contexts',
          'Set and communicate personal boundaries effectively',
          `Focus on reducing hesitant language (currently ${100 - (metrics.assertiveness || 65)}% of communication)`
        ]
      });
    }

    // Identify leadership opportunities
    if (metrics.leadership_tendency > 60 || metrics.proactivity > 65) {
      areas.push({
        id: 'leadership',
        title: 'Initiative & Leadership',
        description: 'Strengthen natural leadership tendencies and group initiative',
        currentLevel: metrics.leadership_tendency || 72,
        targetLevel: Math.min((metrics.leadership_tendency || 72) + 18, 95),
        timeframe: '4 months',
        priority: 'high' as const,
        category: 'strength' as const,
        strategies: [
          'Volunteer for leadership roles in group projects',
          'Practice proposing new ideas and directions',
          'Develop decision-making confidence under uncertainty',
          `Leverage your ${metrics.proactivity || 68}% proactive communication style`
        ]
      });
    }

    // Maintain high-performing areas
    if (metrics.empathy > 80) {
      areas.push({
        id: 'empathy',
        title: 'Empathetic Connection',
        description: 'Maintain and refine natural empathy as a strength',
        currentLevel: metrics.empathy || 88,
        targetLevel: Math.min((metrics.empathy || 88) + 5, 95),
        timeframe: '2 months',
        priority: 'medium' as const,
        category: 'maintenance' as const,
        strategies: [
          'Continue active listening practices',
          'Balance empathy with healthy boundaries',
          'Use empathy as a leadership tool',
          'Mentor others in emotional intelligence'
        ]
      });
    }

    // Add creativity development if high
    if (metrics.creativity > 75) {
      areas.push({
        id: 'creativity',
        title: 'Creative Innovation',
        description: 'Channel creative abilities into innovative problem-solving',
        currentLevel: metrics.creativity || 85,
        targetLevel: Math.min((metrics.creativity || 85) + 10, 95),
        timeframe: '3 months',
        priority: 'medium' as const,
        category: 'strength' as const,
        strategies: [
          'Apply creative thinking to strategic challenges',
          'Lead brainstorming and innovation sessions',
          'Develop frameworks for systematic creativity',
          'Document and share creative processes'
        ]
      });
    }

    // Address emotional stability if needed
    if (metrics.emotional_stability < 70) {
      areas.push({
        id: 'stability',
        title: 'Emotional Resilience',
        description: 'Build greater emotional stability and stress management',
        currentLevel: metrics.emotional_stability || 65,
        targetLevel: Math.min((metrics.emotional_stability || 65) + 15, 85),
        timeframe: '4 months',
        priority: 'high' as const,
        category: 'development' as const,
        strategies: [
          'Develop mindfulness and grounding practices',
          'Create emotional regulation strategies',
          'Build stress management routines',
          'Practice cognitive reframing techniques'
        ]
      });
    }

    return areas.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const defaultData = {
    overallGoal: "Develop authentic leadership presence while maintaining empathetic connection and personal growth",
    timeHorizon: "6-12 months",
    growthAreas: data ? generateDataDrivenGrowthAreas(data) : [
      {
        id: 'confidence',
        title: 'Confident Self-Expression',
        description: 'Build stronger assertiveness in communication while maintaining empathy',
        currentLevel: 65,
        targetLevel: 85,
        timeframe: '3 months',
        priority: 'high' as const,
        category: 'development' as const,
        strategies: [
          'Practice stating opinions clearly in group discussions',
          'Use assertive language patterns in professional contexts',
          'Set and communicate personal boundaries effectively'
        ]
      },
      {
        id: 'leadership',
        title: 'Initiative & Leadership',
        description: 'Strengthen natural leadership tendencies and group initiative',
        currentLevel: 72,
        targetLevel: 90,
        timeframe: '4 months',
        priority: 'high' as const,
        category: 'strength' as const,
        strategies: [
          'Volunteer for leadership roles in group projects',
          'Practice proposing new ideas and directions',
          'Develop decision-making confidence under uncertainty'
        ]
      },
      {
        id: 'empathy',
        title: 'Empathetic Connection',
        description: 'Maintain and refine natural empathy as a strength',
        currentLevel: 88,
        targetLevel: 90,
        timeframe: '2 months',
        priority: 'medium' as const,
        category: 'maintenance' as const,
        strategies: [
          'Continue active listening practices',
          'Balance empathy with healthy boundaries',
          'Use empathy as a leadership tool'
        ]
      }
    ]
  };

  const growthData = data || defaultData;
  const [activeFilter, setActiveFilter] = useState<'all' | 'strength' | 'development' | 'maintenance'>('all');

  // Ensure growthAreas exists and is an array
  const growthAreas = growthData?.growthAreas || defaultData.growthAreas || [];
  
  const filteredAreas = growthAreas.filter(area => 
    activeFilter === 'all' || area.category === activeFilter
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strength': return '💪';
      case 'development': return '🌱';
      case 'maintenance': return '⚖️';
      default: return '🎯';
    }
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'strength': return styles.strengthCategory;
      case 'development': return styles.developmentCategory;
      case 'maintenance': return styles.maintenanceCategory;
      default: return styles.strengthCategory;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return styles.highPriority;
      case 'medium': return styles.mediumPriority;
      case 'low': return styles.lowPriority;
      default: return styles.mediumPriority;
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Personalized Growth Plan</h3>
      
      <div style={styles.overallGoal}>
        <strong>Primary Growth Objective:</strong> {growthData?.overallGoal || defaultData.overallGoal}
        <br/>
        <em>Timeline: {growthData?.timeHorizon || defaultData.timeHorizon}</em>
      </div>
      
      <div style={styles.filterTabs}>
        {['all', 'strength', 'development', 'maintenance'].map(filter => (
          <button
            key={filter}
            style={{
              ...styles.filterTab,
              ...(activeFilter === filter ? styles.activeTab : {})
            }}
            onClick={() => setActiveFilter(filter as any)}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>
      
      <div style={styles.growthGrid}>
        {filteredAreas.map(area => (
          <div key={area.id} style={styles.growthCard}>
            <div style={{
              ...styles.priorityBadge,
              ...getPriorityStyle(area.priority)
            }}>
              {area.priority}
            </div>
            
            <div style={{
              ...styles.categoryIcon,
              ...getCategoryStyle(area.category)
            }}>
              {getCategoryIcon(area.category)}
            </div>
            
            <div style={styles.cardTitle}>{area.title}</div>
            <div style={styles.cardDescription}>{area.description}</div>
            
            <div style={styles.progressContainer}>
              <div style={styles.progressLabels}>
                <span>Current: {area.currentLevel}%</span>
                <span>Target: {area.targetLevel}%</span>
              </div>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${area.currentLevel}%`
                  }}
                />
                <div 
                  style={{
                    ...styles.progressTarget,
                    left: `${area.targetLevel}%`
                  }}
                />
              </div>
            </div>
            
            <div style={styles.timeframe}>Timeline: {area.timeframe}</div>
            
            <ul style={styles.strategiesList}>
              {area.strategies.map((strategy, index) => (
                <li key={index} style={styles.strategyItem}>
                  • {strategy}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};