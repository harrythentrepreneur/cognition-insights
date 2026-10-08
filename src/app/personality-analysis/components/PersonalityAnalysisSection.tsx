import React, { useState, useEffect, CSSProperties } from 'react';
// Backend API removed - using IndexedDB storage
import { PersonalityReport } from './report/PersonalityReport';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { PersonalityDataService } from '../services/personality-data-service';
import { validatePersonalityData } from '../utils/data-validation';
import { LoadingState } from './LoadingState';
const { colors, fonts, spacing } = DESIGN_TOKENS;

interface PersonalityAnalysisSectionProps {
  sessionId?: string;
  useMockData?: boolean;
}

const styles = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: fonts.body,
    paddingTop: '0',
    maxWidth: '100vw',
  } as CSSProperties,
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: spacing.lg,
  } as CSSProperties,
  
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: `4px solid ${colors.border}`,
    borderTopColor: colors.accent,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } as CSSProperties,
  
  loadingText: {
    fontSize: '1.125rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: spacing.md,
    padding: spacing.xl,
    textAlign: 'center',
  } as CSSProperties,
  
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.sm,
  } as CSSProperties,
  
  errorMessage: {
    fontSize: '1rem',
    color: colors.textSecondary,
    maxWidth: '600px',
  } as CSSProperties,
};

export const PersonalityAnalysisSection: React.FC<PersonalityAnalysisSectionProps> = ({ 
  sessionId,
  useMockData = false 
}) => {
  const [personalityData, setPersonalityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log('[DEBUG] PersonalityAnalysisSection useEffect triggered');
    console.log('  - sessionId:', sessionId);
    console.log('  - useMockData:', useMockData);
    
    if (!sessionId && !useMockData) {
      console.log('[DEBUG] No session ID provided and not using mock data');
      setError('No session ID provided');
      setLoading(false);
      return;
    }
    
    fetchPersonalityData();
  }, [sessionId, useMockData]);
  
  const fetchPersonalityData = async () => {
    console.log('[DEBUG] fetchPersonalityData called');
    
    if (useMockData) {
      console.log('[DEBUG] Using mock data for development');
      // Use mock data for development
      setTimeout(() => {
        const mockData = generateMockPersonalityData();
        console.log('[DEBUG] Generated mock data:', mockData);
        setPersonalityData(mockData);
        setLoading(false);
      }, 1000);
      return;
    }
    
    try {
      console.log('[DEBUG] Fetching real personality data for session:', sessionId);
      const dataService = PersonalityDataService.getInstance();
      const data = await dataService.getPersonalityData(sessionId!);
      
      console.log('[DEBUG] Received data from service:', data);
      console.log('[DEBUG] Data structure:');
      if (data) {
        console.log('  - Has personality_metrics:', !!data.personality_metrics);
        console.log('  - Has emotional_inertia:', !!data.emotional_inertia);
        console.log('  - Data keys:', Object.keys(data));
      }
      
      if (data) {
        console.log('[DEBUG] Validating personality data...');
        // console.log('[DEBUG] Pre-validation - has narrative_content:', !!data.narrative_content);
        // if (data.narrative_content?.executive_summary) {
        //   console.log('[DEBUG] Pre-validation - executive_summary keys:', Object.keys(data.narrative_content.executive_summary));
        //   if (data.narrative_content.executive_summary.profile) {
        //     console.log('[DEBUG] Pre-validation - profile preview:', data.narrative_content.executive_summary.profile.substring(0, 100) + '...');
        //   }
        // }
        
        const validatedData = validatePersonalityData(data);
        console.log('[DEBUG] Post-validation - has narrative_content:', !!validatedData.narrative_content);
        if (validatedData.narrative_content?.executive_summary) {
          console.log('[DEBUG] Post-validation - executive_summary keys:', Object.keys(validatedData.narrative_content.executive_summary));
          if (validatedData.narrative_content.executive_summary.profile) {
            console.log('[DEBUG] Post-validation - profile preview:', validatedData.narrative_content.executive_summary.profile.substring(0, 100) + '...');
          }
        }
        console.log('[DEBUG] Validated data:', validatedData);
        setPersonalityData(validatedData);
        setError(null); // Clear any previous errors
      } else {
        console.log('[DEBUG] No personality data available');
        setError('No personality data found for this session');
      }
    } catch (err) {
      console.error('[DEBUG] Error fetching personality data:', err);
      setError('Failed to load personality analysis. Please try again later.');
    } finally {
      console.log('[DEBUG] Setting loading to false');
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <LoadingState 
          message="Analyzing your personality patterns and generating insights..." 
        />
      </div>
    );
  }
  
  if (error && !personalityData) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Unable to Load Analysis</h2>
          <p style={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <PersonalityReport data={personalityData} sessionId={sessionId} />
    </div>
  );
};

// Mock data generator
function generateMockPersonalityData() {
  return {
    personality_metrics: {
      extraversion: 75,
      openness: 82,
      conscientiousness: 68,
      agreeableness: 79,
      emotional_stability: 65,
      optimism: 72,
      resilience: 76,
      adaptability: 81,
      leadership_tendency: 70,
      analytical_thinking: 74,
      creativity: 88,
      empathy: 85,
      spontaneity: 60,
      perfectionism: 55,
      social_confidence: 73,
      expressiveness: 78,
      responsiveness: 82
    },
    emotional_inertia: {
      score: 65,
      by_emotion: {
        joy: { average_duration_hours: 4.5, max_duration_hours: 12, frequency: 15 },
        calm: { average_duration_hours: 6.2, max_duration_hours: 18, frequency: 12 },
        stress: { average_duration_hours: 3.1, max_duration_hours: 8, frequency: 8 }
      },
      average_duration_hours: 4.6,
      longest_streak: { emotion: 'calm', duration_hours: 18 }
    },
    trigger_words: [
      { word: 'deadline', frequency: 12, negative_impact: 2.5 },
      { word: 'meeting', frequency: 8, negative_impact: 1.8 },
      { word: 'traffic', frequency: 6, negative_impact: 2.2 },
      { word: 'budget', frequency: 5, negative_impact: 1.6 },
      { word: 'late', frequency: 4, negative_impact: 2.0 }
    ],
    proactive_reactive: {
      proactive_score: 68,
      reactive_score: 32,
      examples: {
        proactive: [
          "Hey! Want to grab coffee tomorrow?",
          "I've been thinking about our project...",
          "Good morning everyone!"
        ],
        reactive: [
          "Sure, that sounds good!",
          "Thanks for letting me know",
          "I agree with your point"
        ]
      },
      initiative_ratio: 0.68
    },
    confidence_timeline: [
      { timestamp: '2024-01-01T00:00:00', week: '2024-01', assertive_score: 45, hesitant_score: 20, overall_confidence: 25, message_count: 120 },
      { timestamp: '2024-01-08T00:00:00', week: '2024-02', assertive_score: 52, hesitant_score: 18, overall_confidence: 34, message_count: 135 },
      { timestamp: '2024-01-15T00:00:00', week: '2024-03', assertive_score: 58, hesitant_score: 15, overall_confidence: 43, message_count: 142 },
      { timestamp: '2024-01-22T00:00:00', week: '2024-04', assertive_score: 62, hesitant_score: 12, overall_confidence: 50, message_count: 150 }
    ],
    emotional_clock: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      dominant_emotion: hour < 6 ? 'tired' : hour < 10 ? 'energy' : hour < 14 ? 'joy' : hour < 18 ? 'calm' : hour < 22 ? 'stress' : 'tired',
      intensity: Math.random() * 50 + 30,
      confidence: Math.random() * 40 + 60,
      message_count: Math.floor(Math.random() * 20) + 5
    })),
    behavioral_insights: [
      {
        id: 'insight_1',
        type: 'strength',
        title: 'Natural Connector',
        description: 'You have a remarkable ability to build and maintain relationships.',
        confidence: 85,
        evidence: ['High empathy score', 'Frequent proactive communication'],
        implications: ['Strong social network', 'Effective collaboration'],
        actionable: true
      },
      {
        id: 'insight_2', 
        type: 'growth-area',
        title: 'Perfectionist Tendencies',
        description: 'Your attention to detail sometimes leads to over-analysis.',
        confidence: 72,
        evidence: ['Extended revision patterns', 'Self-critical language'],
        implications: ['Potential for burnout', 'Delayed decision making'],
        actionable: true
      }
    ],
    summary: {
      total_messages_analyzed: 2845,
      user_message_count: 1423,
      dominant_trait: 'creativity',
      analysis_timestamp: new Date().toISOString(),
      chat_duration_days: 180
    },
    social_network: {
      nodes: [
        { id: 'self', name: 'You', group: 'self', messageCount: 0, relationshipStrength: 1 },
        { id: 'person1', name: 'Alex', group: 'close', messageCount: 450, relationshipStrength: 0.9 },
        { id: 'person2', name: 'Sarah', group: 'close', messageCount: 380, relationshipStrength: 0.85 },
        { id: 'person3', name: 'Mike', group: 'frequent', messageCount: 220, relationshipStrength: 0.6 },
        { id: 'person4', name: 'Emma', group: 'frequent', messageCount: 180, relationshipStrength: 0.55 },
        { id: 'person5', name: 'David', group: 'occasional', messageCount: 90, relationshipStrength: 0.3 }
      ],
      links: [
        { source: 'self', target: 'person1', value: 0.9, messageCount: 450 },
        { source: 'self', target: 'person2', value: 0.85, messageCount: 380 },
        { source: 'self', target: 'person3', value: 0.6, messageCount: 220 },
        { source: 'self', target: 'person4', value: 0.55, messageCount: 180 },
        { source: 'self', target: 'person5', value: 0.3, messageCount: 90 },
        { source: 'person1', target: 'person2', value: 0.4, messageCount: 120 }
      ]
    },
    comparative_analysis: {
      periods: [
        {
          name: 'Early Period',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          metrics: {
            confidence: 45,
            assertiveness: 38,
            proactivity: 52,
            emotional_stability: 65,
            social_engagement: 58,
            message_count: 234
          }
        },
        {
          name: 'Recent Period',
          startDate: '2024-04-01',
          endDate: '2024-06-30',
          metrics: {
            confidence: 68,
            assertiveness: 72,
            proactivity: 75,
            emotional_stability: 70,
            social_engagement: 82,
            message_count: 387
          }
        }
      ]
    }
  };
} 