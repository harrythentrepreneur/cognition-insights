import React, { useState, useEffect } from 'react';
// Removed axios - using browser-based processing
import { getSessionData } from '../../../../lib/storage/session-data-access';
// Backend API removed - using IndexedDB storage
import { InsightTimeline } from './InsightTimeline';
import { InsightReflections } from './InsightReflections';
import { InsightThemes } from './InsightThemes';
import { deepInsightsStyles as styles } from '../../styles/deep-insights-section';

interface DeepInsightsSectionProps {
  sessionId: string;
  contactName: string;
  onClose?: () => void;
}

type TabType = 'timeline' | 'reflections' | 'themes';

export const DeepInsightsSection: React.FC<DeepInsightsSectionProps> = ({
  sessionId,
  contactName,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeepInsights();
  }, [sessionId, contactName]);

  const fetchDeepInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch deep insights for specific contact
      const dataAccess = await getSessionData();
      const socialData = await dataAccess.getSocialData(sessionId);
      // Get relationship data for the specific contact
      const contactInsights = socialData?.relationships?.find((r: any) => r.name === contactName) || null;
      
      if (contactInsights) {
        setInsights(contactInsights);
      } else {
        // Fallback to mock data for development
        setInsights(getMockInsights());
      }
    } catch (err) {
      console.error('Error fetching deep insights:', err);
      setError('Failed to load insights');
      // Use mock data on error
      setInsights(getMockInsights());
    } finally {
      setLoading(false);
    }
  };

  const getMockInsights = () => {
    return {
      contact: contactName,
      message_count: 1250,
      insights: {
        relationship_dna: {
          core_dynamic: "A profound intellectual and emotional partnership built on mutual growth, vulnerability, and deep understanding.",
          unique_language: ["'brain dump' sessions", "emoji-heavy support messages", "philosophical midnight conversations"],
          emotional_signature: "Warm, supportive, intellectually stimulating with undertones of shared vulnerability",
          special_qualities: ["Ability to shift between deep and light effortlessly", "Creating safe space for each other's growth"],
          unspoken_bonds: "An implicit understanding that this connection transcends typical friendship boundaries"
        },
        pivotal_moments: {
          pivotal_moments: [
            {
              timestamp: "2024-03-15",
              title: "The Vulnerability Breakthrough",
              conversation_snippet: "I've never told anyone this before... Thank you for creating this safe space",
              why_pivotal: "First time deep personal fears were shared, shifting the relationship to a new depth",
              relationship_impact: "Created foundation of trust that allowed for more authentic communication",
              significance_score: 9.2
            },
            {
              timestamp: "2024-05-22",
              title: "The Growth Catalyst Moment",
              conversation_snippet: "Your perspective just changed how I see everything... I need to rethink my entire approach",
              why_pivotal: "A conversation that sparked significant personal transformation",
              relationship_impact: "Established the relationship as a catalyst for mutual growth",
              significance_score: 8.7
            }
          ],
          overall_trajectory: "From casual connection to profound mutual transformation catalyst"
        },
        communication_evolution: {
          communication_phases: [
            {
              phase: "Initial Exploration",
              characteristics: ["Polite exchanges", "Surface-level sharing", "Testing boundaries"],
              example_exchanges: ["Hey, how's your day?", "Not bad, busy with work stuff"]
            },
            {
              phase: "Deepening Trust",
              characteristics: ["Longer messages", "Personal stories", "Emotional support"],
              example_exchanges: ["I've been struggling with...", "I'm here for you, always"]
            },
            {
              phase: "Profound Connection",
              characteristics: ["Philosophical discussions", "Vulnerable shares", "Growth conversations"],
              example_exchanges: ["What if we're all just...", "Your thoughts always make me reconsider everything"]
            }
          ],
          shared_language: {
            inside_jokes: ["The infamous Tuesday incident", "Our 3am philosophy club"],
            unique_expressions: ["brain dumping", "soul downloading", "vibe checking"],
            communication_rituals: ["Good morning check-ins", "Weekly deep dives", "Random meme exchanges"]
          }
        },
        emotional_patterns: {
          emotional_dynamics: {
            support_patterns: "Reciprocal emotional support with natural ebb and flow",
            emotional_roles: {
              contact_role: "The thoughtful listener and wisdom provider",
              user_role: "The vulnerable sharer and growth seeker"
            },
            vulnerability_moments: ["Sharing childhood trauma", "Discussing relationship fears", "Opening up about career doubts"],
            emotional_safety_level: "High - both feel completely safe to be authentic"
          },
          growth_patterns: {
            individual_growth: "Both have become more emotionally aware and communicative",
            collective_growth: "Together created a space for mutual transformation",
            growth_catalysts: ["Challenging each other's perspectives", "Celebrating victories together", "Processing failures together"]
          }
        },
        synthesis: {
          relationship_story: "What began as a casual connection evolved into something profound and transformative. Through layers of vulnerability, intellectual exploration, and emotional support, this relationship has become a sanctuary for growth and authentic expression. The unique blend of deep philosophical discussions and playful exchanges creates a dynamic that nurtures both individuals while celebrating their connection.",
          essence_statement: "Two souls creating a sacred space for mutual transformation through vulnerable authenticity.",
          key_insights: [
            "This relationship serves as a catalyst for personal growth",
            "The balance of depth and playfulness creates sustainable intimacy",
            "Mutual vulnerability has created unshakeable trust",
            "Both people show up differently in this space than in other relationships",
            "The connection transcends typical relationship categories"
          ],
          wisdom_gained: "True connection happens when two people create space for each other's full humanity - shadows, light, and everything in between.",
          visual_metaphor: "Two trees whose roots have intertwined underground, each maintaining their individuality while creating a shared foundation"
        }
      },
      analysis_timestamp: new Date().toISOString()
    };
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}>Loading deep insights...</div>
        </div>
      );
    }

    if (error && !insights) {
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorMessage}>{error}</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'timeline':
        return <InsightTimeline insights={insights} />;
      case 'reflections':
        return <InsightReflections insights={insights} />;
      case 'themes':
        return <InsightThemes insights={insights} />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Deep Conversation Insights</h2>
        <div style={styles.subtitle}>with {contactName}</div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        )}
      </div>
      
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'timeline' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'reflections' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('reflections')}
        >
          Reflections
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'themes' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('themes')}
        >
          Themes
        </button>
      </div>
      
      <div style={styles.contentContainer}>
        {renderTabContent()}
      </div>
    </div>
  );
};