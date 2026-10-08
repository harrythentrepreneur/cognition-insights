import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface AIInsight {
  id: string;
  type: 'observation' | 'pattern' | 'recommendation' | 'question';
  title: string;
  content: string;
  confidence: number;
  relevantData?: string[];
  timestamp: Date;
}

interface AIInsightsPanelProps {
  currentChapter: string;
  personalityData: any;
  isVisible?: boolean;
  position?: 'left' | 'right';
}

const styles = {
  panel: {
    position: 'fixed',
    top: '100px',
    right: '-320px',
    width: '300px',
    height: 'calc(100vh - 200px)',
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px 0 0 16px',
    borderRight: 'none',
    zIndex: 999,
    transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.3)',
  } as CSSProperties,

  panelVisible: {
    right: '0px',
  } as CSSProperties,

  panelLeft: {
    left: '-320px',
    right: 'auto',
    borderRadius: '0 16px 16px 0',
    borderLeft: 'none',
    borderRight: `1px solid ${colors.border}`,
    boxShadow: '10px 0 30px rgba(0, 0, 0, 0.3)',
  } as CSSProperties,

  panelLeftVisible: {
    left: '0px',
  } as CSSProperties,

  header: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border}`,
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    backdropFilter: 'blur(10px)',
  } as CSSProperties,

  title: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  } as CSSProperties,

  subtitle: {
    fontSize: '0.8rem',
    color: colors.textSecondary,
    opacity: 0.8,
  } as CSSProperties,

  toggleButton: {
    position: 'absolute',
    left: '-40px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '40px',
    height: '60px',
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    border: `1px solid ${colors.border}`,
    borderRight: 'none',
    borderRadius: '8px 0 0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  } as CSSProperties,

  toggleButtonLeft: {
    right: '-40px',
    left: 'auto',
    borderLeft: 'none',
    borderRight: `1px solid ${colors.border}`,
    borderRadius: '0 8px 8px 0',
  } as CSSProperties,

  toggleIcon: {
    color: colors.accent,
    fontSize: '1.2rem',
    transition: 'transform 0.3s ease',
  } as CSSProperties,

  content: {
    height: 'calc(100% - 80px)',
    overflowY: 'auto',
    padding: `0 ${spacing.lg} ${spacing.lg}`,
  } as CSSProperties,

  insightCard: {
    backgroundColor: 'rgba(0, 255, 230, 0.05)',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  } as CSSProperties,

  insightCardHover: {
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderColor: `${colors.accent}50`,
    transform: 'translateY(-2px)',
  } as CSSProperties,

  insightType: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    padding: `2px ${spacing.xs}`,
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as CSSProperties,

  typeObservation: {
    backgroundColor: '#4ECDC440',
    color: '#4ECDC4',
  } as CSSProperties,

  typePattern: {
    backgroundColor: '#FFD93D40',
    color: '#FFD93D',
  } as CSSProperties,

  typeRecommendation: {
    backgroundColor: '#6BCF7F40',
    color: '#6BCF7F',
  } as CSSProperties,

  typeQuestion: {
    backgroundColor: '#FF6B6B40',
    color: '#FF6B6B',
  } as CSSProperties,

  insightTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: colors.text,
    marginBottom: spacing.xs,
    paddingRight: '60px',
  } as CSSProperties,

  insightContent: {
    fontSize: '0.8rem',
    color: colors.textSecondary,
    lineHeight: 1.5,
    marginBottom: spacing.xs,
  } as CSSProperties,

  confidenceBar: {
    width: '100%',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: spacing.xs,
  } as CSSProperties,

  confidenceFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  } as CSSProperties,

  timestamp: {
    fontSize: '0.7rem',
    color: colors.textSecondary,
    opacity: 0.6,
    marginTop: spacing.xs,
  } as CSSProperties,

  loadingInsight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    color: colors.textSecondary,
    fontSize: '0.8rem',
  } as CSSProperties,

  typingIndicator: {
    display: 'flex',
    gap: '4px',
  } as CSSProperties,

  typingDot: {
    width: '4px',
    height: '4px',
    backgroundColor: colors.accent,
    borderRadius: '50%',
    animation: 'typing 1.4s infinite ease-in-out',
  } as CSSProperties,
};

// CSS animations
const keyframes = `
  @keyframes typing {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  currentChapter,
  personalityData,
  isVisible = false,
  position = 'right',
}) => {
  const [panelVisible, setPanelVisible] = useState(isVisible);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hoveredInsight, setHoveredInsight] = useState<string | null>(null);
  const insightIdCounter = useRef(0);

  useEffect(() => {
    // Add keyframes to document
    if (!document.getElementById('ai-insights-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ai-insights-styles';
      styleSheet.textContent = keyframes;
      document.head.appendChild(styleSheet);
    }
  }, []);

  // Generate insights based on current chapter and data
  const generateInsights = async (chapter: string) => {
    setIsGenerating(true);
    
    // Simulate AI insight generation with realistic delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const chapterInsights: Record<string, AIInsight[]> = {
      'executive-summary': [
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'observation',
          title: 'Dominant Personality Pattern',
          content: 'Your communication patterns suggest a blend of analytical thinking with emotional intelligence, creating a unique leadership style.',
          confidence: 92,
          timestamp: new Date(),
        },
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'question',
          title: 'Explore This Further',
          content: 'Have you noticed how your communication style changes in different social contexts? This could reveal interesting adaptability patterns.',
          confidence: 85,
          timestamp: new Date(),
        },
      ],
      'personality-architecture': [
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'pattern',
          title: 'Trait Correlation Discovery',
          content: 'Your high openness score correlates strongly with creative problem-solving approaches in your messages.',
          confidence: 88,
          timestamp: new Date(),
        },
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'recommendation',
          title: 'Leverage Your Strengths',
          content: 'Consider roles that combine your analytical skills with your natural empathy - perhaps coaching or mentoring positions.',
          confidence: 79,
          timestamp: new Date(),
        },
      ],
      'emotional-dynamics': [
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'observation',
          title: 'Emotional Rhythm Pattern',
          content: 'Your emotional responses show a fascinating 3-day cycle, suggesting you process experiences in phases.',
          confidence: 94,
          timestamp: new Date(),
        },
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'pattern',
          title: 'Recovery Mechanism',
          content: 'After stressful periods, you consistently return to baseline within 18-24 hours, indicating strong emotional resilience.',
          confidence: 91,
          timestamp: new Date(),
        },
      ],
      'communication-patterns': [
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'observation',
          title: 'Linguistic Signature',
          content: 'You use 40% more inclusive language than average, suggesting strong collaborative instincts.',
          confidence: 96,
          timestamp: new Date(),
        },
        {
          id: `insight-${insightIdCounter.current++}`,
          type: 'recommendation',
          title: 'Communication Enhancement',
          content: 'Your natural facilitation style could be enhanced by practicing more direct assertion in professional contexts.',
          confidence: 83,
          timestamp: new Date(),
        },
      ],
    };
    
    const newInsights = chapterInsights[chapter] || [
      {
        id: `insight-${insightIdCounter.current++}`,
        type: 'observation',
        title: 'Chapter-Specific Insight',
        content: `Analyzing patterns in ${chapter.replace('-', ' ')} reveals interesting behavioral tendencies worth exploring further.`,
        confidence: 75,
        timestamp: new Date(),
      },
    ];
    
    setInsights(prev => [...newInsights, ...prev.slice(0, 5)]); // Keep last 5 + new ones
    setIsGenerating(false);
  };

  // Generate insights when chapter changes
  useEffect(() => {
    if (panelVisible) {
      generateInsights(currentChapter);
    }
  }, [currentChapter, panelVisible]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'observation': return styles.typeObservation;
      case 'pattern': return styles.typePattern;
      case 'recommendation': return styles.typeRecommendation;
      case 'question': return styles.typeQuestion;
      default: return styles.typeObservation;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const togglePanel = () => {
    setPanelVisible(!panelVisible);
  };

  return (
    <div
      style={{
        ...styles.panel,
        ...(position === 'left' ? styles.panelLeft : {}),
        ...(panelVisible ? (position === 'left' ? styles.panelLeftVisible : styles.panelVisible) : {}),
      }}
    >
      {/* Toggle Button */}
      <button
        style={{
          ...styles.toggleButton,
          ...(position === 'left' ? styles.toggleButtonLeft : {}),
        }}
        onClick={togglePanel}
      >
        <div
          style={{
            ...styles.toggleIcon,
            transform: panelVisible 
              ? (position === 'left' ? 'rotate(180deg)' : 'rotate(0deg)')
              : (position === 'left' ? 'rotate(0deg)' : 'rotate(180deg)'),
          }}
        >
          {position === 'left' ? '‹' : '›'}
        </div>
      </button>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          🤖 AI Insights
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isGenerating ? '#FFD93D' : '#6BCF7F',
              marginLeft: 'auto',
              animation: isGenerating ? 'pulse 1s infinite' : 'none',
            }}
          />
        </div>
        <div style={styles.subtitle}>
          Real-time personality analysis
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Loading indicator */}
        {isGenerating && (
          <div style={styles.loadingInsight}>
            <div style={styles.typingIndicator}>
              <div style={{ ...styles.typingDot, animationDelay: '0s' }} />
              <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
              <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
            </div>
            <span>Analyzing patterns...</span>
          </div>
        )}

        {/* Insights */}
        {insights.map((insight, index) => (
          <div
            key={insight.id}
            style={{
              ...styles.insightCard,
              ...(hoveredInsight === insight.id ? styles.insightCardHover : {}),
              animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
            }}
            onMouseEnter={() => setHoveredInsight(insight.id)}
            onMouseLeave={() => setHoveredInsight(null)}
          >
            {/* Type badge */}
            <div
              style={{
                ...styles.insightType,
                ...getTypeStyles(insight.type),
              }}
            >
              {insight.type}
            </div>

            {/* Content */}
            <div style={styles.insightTitle}>{insight.title}</div>
            <div style={styles.insightContent}>{insight.content}</div>

            {/* Confidence bar */}
            <div style={styles.confidenceBar}>
              <div
                style={{
                  ...styles.confidenceFill,
                  width: `${insight.confidence}%`,
                }}
              />
            </div>

            {/* Timestamp */}
            <div style={styles.timestamp}>
              {formatTimestamp(insight.timestamp)} • {insight.confidence}% confidence
            </div>
          </div>
        ))}

        {insights.length === 0 && !isGenerating && (
          <div style={{
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: '0.8rem',
            padding: spacing.xl,
            opacity: 0.6,
          }}>
            AI insights will appear as you explore the report
          </div>
        )}
      </div>
    </div>
  );
};