'use client';

import React, { useState, useEffect } from 'react';
// Backend API removed - using IndexedDB storage
import { getSessionData } from '../../../lib/storage/session-data-access';

interface SentimentAnalysis {
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  emotional_intensity: 'low' | 'medium' | 'high';
  key_emotions: string[];
}

interface IdentifiedPerson {
  name: string;
  relationship_category: string;
  interaction_frequency: number;
  sentiment_analysis: SentimentAnalysis;
  interaction_types: string[];
  sample_mentions: string[];
  relationship_quality_indicators: string[];
}

interface SocialHealthIndicators {
  social_support_level: 'high' | 'medium' | 'low';
  relationship_diversity: 'high' | 'medium' | 'low';
  conflict_frequency: 'high' | 'medium' | 'low';
  positive_interaction_ratio: number;
}

interface SocialCirclePerson {
  total_mentions: number;
  relationship_category: string;
  average_sentiment: number;
  consistency_score: number;
  interaction_types: string[];
  sample_mentions: string[];
  quality_indicators: string[];
  months_present: number;
}

interface RelationshipQualityItem {
  name: string;
  category: string;
  sentiment: number;
  mentions?: number;
  consistency?: number;
  concerns?: string[];
  months_present?: number;
}

interface RelationshipQualityAnalysis {
  strongest_relationships: RelationshipQualityItem[];
  relationships_needing_attention: RelationshipQualityItem[];
  most_consistent_connections: RelationshipQualityItem[];
  emotional_impact_summary: {
    positive_relationships: number;
    negative_relationships: number;
    neutral_relationships: number;
    total_relationships: number;
  };
}

interface SocialInsights {
  total_analyzed_months: number;
  social_circle: Record<string, SocialCirclePerson>;
  relationship_categories: Record<string, number>;
  interaction_patterns: Record<string, number>;
  social_health_metrics: SocialHealthIndicators;
  relationship_quality_analysis: RelationshipQualityAnalysis;
  social_insights: string[];
  monthly_social_data: any[];
}

interface SocialAnalysisProps {
  sessionId: string;
}

const SocialAnalysis: React.FC<SocialAnalysisProps> = ({ sessionId }) => {
  const [socialData, setSocialData] = useState<SocialInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'circle' | 'quality' | 'insights'>('overview');

  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        const dataAccess = await getSessionData();
        const socialData = await dataAccess.getSocialData(sessionId);
        const response = { data: socialData };
        
        console.log('Social API Response:', response.data); // Debug log
        
        if (response.data.status === 'completed' && response.data.social_data) {
          console.log('Social Data Structure:', response.data.social_data); // Debug log
          console.log('Social Data Keys:', Object.keys(response.data.social_data)); // Debug log
          console.log('Social Circle exists?:', !!response.data.social_data.social_circle); // Debug log
          console.log('Social Circle keys:', response.data.social_data.social_circle ? Object.keys(response.data.social_data.social_circle) : 'N/A'); // Debug log
          setSocialData(response.data.social_data);
        } else if (response.data.status === 'failed') {
          setError('Social analysis failed');
        } else {
          // Still processing - check again in a few seconds
          console.log('Social analysis still processing, status:', response.data.status); // Debug log
          setError(null);
          setTimeout(fetchSocialData, 3000);
        }
      } catch (err) {
        setError('Failed to fetch social analysis');
        console.error('Error fetching social data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSocialData();
    }
  }, [sessionId]);

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      family: '👨‍👩‍👧‍👦',
      romantic_partner: '💑',
      close_friend: '👭',
      friend: '👫',
      colleague: '💼',
      acquaintance: '🤝',
      professional: '💻',
      service_provider: '🔧',
      other: '👤'
    };
    return icons[category] || '👤';
  };

  const formatCategoryName = (category: string): string => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0.3) return 'text-green-600 bg-green-50';
    if (sentiment < -0.3) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSentimentLabel = (sentiment: number): string => {
    if (sentiment > 0.5) return 'Very Positive';
    if (sentiment > 0.2) return 'Positive';
    if (sentiment > -0.2) return 'Neutral';
    if (sentiment > -0.5) return 'Negative';
    return 'Very Negative';
  };

  const getHealthLevelColor = (level: string): string => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🤝</span>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">AI Analyzing Your Social Patterns</h3>
          <div className="space-y-2 text-gray-600 max-w-md mx-auto">
            <p className="flex items-center justify-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2"></span>
              Identifying people and relationships
            </p>
            <p className="flex items-center justify-center">
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse mr-2 animation-delay-300"></span>
              Analyzing interaction patterns
            </p>
            <p className="flex items-center justify-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2 animation-delay-600"></span>
              Measuring relationship quality
            </p>
          </div>
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">
              💡 Understanding your social connections to provide insights about relationship impact on emotional well-being
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🤷‍♂️</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Social Analysis Not Available</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!socialData || socialData.total_analyzed_months === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Limited Social Interaction Data</h3>
        <p className="text-gray-600">
          No significant social interactions were detected in your messages for detailed analysis.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            This could mean your conversations are more personal or internal. Try uploading group chats or conversations with friends and family for richer social insights.
          </p>
        </div>
      </div>
    );
  }

  // Add null check for social_circle to prevent Object.entries error
  if (!socialData.social_circle) {
    console.log('DEBUG: socialData.social_circle is null/undefined:', socialData.social_circle);
    console.log('DEBUG: Full socialData object:', socialData);
    console.log('DEBUG: socialData as JSON:', JSON.stringify(socialData, null, 2));
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Social Circle Data</h3>
        <p className="text-gray-600">
          No social circle information was found in your message analysis.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            This might occur if the analysis is still processing or if there were no identifiable social interactions in your messages.
          </p>
        </div>
      </div>
    );
  }

  // Add null checks for other required properties
  if (!socialData.relationship_categories || !socialData.social_health_metrics) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Incomplete Social Data</h3>
        <p className="text-gray-600">
          The social analysis data is incomplete or corrupted.
        </p>
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700">
            Please try refreshing the page or re-uploading your data for analysis.
          </p>
        </div>
      </div>
    );
  }

  // Check for relationship quality analysis data for quality view
  if (!socialData.relationship_quality_analysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Quality Analysis Unavailable</h3>
        <p className="text-gray-600">
          Relationship quality analysis data is not available.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            This might indicate that your messages need more analysis time or contain insufficient relationship data.
          </p>
        </div>
      </div>
    );
  }

  const socialCircleArray = Object.entries(socialData.social_circle).map(([name, data]) => ({
    name,
    ...data
  }));

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Social Health Overview */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🤝 Your Social Connection Analysis</h2>
          <p className="text-gray-600">Understanding how relationships impact your emotional well-being</p>
        </div>

        {/* Quick Social Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(socialData.social_circle).length}</div>
            <div className="text-sm text-purple-800">People Identified</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-pink-600">{Object.keys(socialData.relationship_categories || {}).length}</div>
            <div className="text-sm text-pink-800">Relationship Types</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className={`text-2xl font-bold ${getHealthLevelColor(socialData.social_health_metrics.social_support_level).split(' ')[0]}`}>
              {socialData.social_health_metrics.social_support_level.charAt(0).toUpperCase() + socialData.social_health_metrics.social_support_level.slice(1)}
            </div>
            <div className="text-sm text-gray-800">Support Level</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(socialData.social_health_metrics.positive_interaction_ratio * 100)}%
            </div>
            <div className="text-sm text-blue-800">Positive Interactions</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center space-x-1 bg-white/70 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'overview' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Social Health
          </button>
          <button
            onClick={() => setViewMode('circle')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'circle' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            👥 Social Circle
          </button>
          <button
            onClick={() => setViewMode('quality')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'quality' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            💎 Relationship Quality
          </button>
          <button
            onClick={() => setViewMode('insights')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'insights' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            💡 Social Insights
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Social Health Metrics */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">📊</span>
              Your Social Health Dashboard
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Social Support Level */}
              <div className="text-center">
                <h4 className="font-medium text-gray-700 mb-3">Social Support</h4>
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-2 ${getHealthLevelColor(socialData.social_health_metrics.social_support_level)}`}>
                  {socialData.social_health_metrics.social_support_level === 'high' ? '💪' : 
                   socialData.social_health_metrics.social_support_level === 'medium' ? '🤝' : '🤗'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthLevelColor(socialData.social_health_metrics.social_support_level)}`}>
                  {socialData.social_health_metrics.social_support_level.charAt(0).toUpperCase() + socialData.social_health_metrics.social_support_level.slice(1)}
                </div>
              </div>

              {/* Relationship Diversity */}
              <div className="text-center">
                <h4 className="font-medium text-gray-700 mb-3">Relationship Diversity</h4>
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-2 ${getHealthLevelColor(socialData.social_health_metrics.relationship_diversity)}`}>
                  {socialData.social_health_metrics.relationship_diversity === 'high' ? '🌈' : 
                   socialData.social_health_metrics.relationship_diversity === 'medium' ? '🎭' : '👤'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthLevelColor(socialData.social_health_metrics.relationship_diversity)}`}>
                  {socialData.social_health_metrics.relationship_diversity.charAt(0).toUpperCase() + socialData.social_health_metrics.relationship_diversity.slice(1)}
                </div>
              </div>

              {/* Conflict Frequency */}
              <div className="text-center">
                <h4 className="font-medium text-gray-700 mb-3">Conflict Level</h4>
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-2 ${
                  socialData.social_health_metrics.conflict_frequency === 'low' ? 'text-green-600 bg-green-100' :
                  socialData.social_health_metrics.conflict_frequency === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                  'text-red-600 bg-red-100'
                }`}>
                  {socialData.social_health_metrics.conflict_frequency === 'low' ? '☮️' : 
                   socialData.social_health_metrics.conflict_frequency === 'medium' ? '⚖️' : '⚠️'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  socialData.social_health_metrics.conflict_frequency === 'low' ? 'text-green-600 bg-green-100' :
                  socialData.social_health_metrics.conflict_frequency === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                  'text-red-600 bg-red-100'
                }`}>
                  {socialData.social_health_metrics.conflict_frequency.charAt(0).toUpperCase() + socialData.social_health_metrics.conflict_frequency.slice(1)}
                </div>
              </div>

              {/* Positive Interaction Ratio */}
              <div className="text-center">
                <h4 className="font-medium text-gray-700 mb-3">Positivity Ratio</h4>
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-green-100 to-blue-100 flex items-center justify-center text-2xl font-bold mb-2">
                  {Math.round(socialData.social_health_metrics.positive_interaction_ratio * 100)}%
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  socialData.social_health_metrics.positive_interaction_ratio > 0.7 ? 'text-green-600 bg-green-100' :
                  socialData.social_health_metrics.positive_interaction_ratio > 0.4 ? 'text-yellow-600 bg-yellow-100' :
                  'text-red-600 bg-red-100'
                }`}>
                  {socialData.social_health_metrics.positive_interaction_ratio > 0.7 ? 'Excellent' :
                   socialData.social_health_metrics.positive_interaction_ratio > 0.4 ? 'Good' : 'Needs Work'}
                </div>
              </div>
            </div>
          </div>

          {/* Relationship Categories Overview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🏷️</span>
              Your Social Circle Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(socialData.relationship_categories || {}).map(([category, count]) => (
                <div key={category} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-3xl mb-2">{getCategoryIcon(category)}</div>
                  <div className="font-semibold text-gray-800">{count}</div>
                  <div className="text-sm text-gray-600">{formatCategoryName(category)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'circle' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Your Social Circle Impact
          </h3>
          <div className="space-y-4">
            {socialCircleArray.slice(0, 10).map((person, index) => (
              <div key={person.name} className="p-5 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{getCategoryIcon(person.relationship_category)}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{person.name}</h4>
                        <span className="text-sm text-gray-500">{formatCategoryName(person.relationship_category)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{person.total_mentions}</div>
                        <div className="text-xs text-gray-500">Mentions</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${getSentimentColor(person.average_sentiment).split(' ')[0]}`}>
                          {getSentimentLabel(person.average_sentiment)}
                        </div>
                        <div className="text-xs text-gray-500">Sentiment</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{Math.round(person.consistency_score * 100)}%</div>
                        <div className="text-xs text-gray-500">Consistency</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{person.months_present}</div>
                        <div className="text-xs text-gray-500">Months</div>
                      </div>
                    </div>

                    {/* Sample Mentions */}
                    {(person.sample_mentions || []).length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Recent Mentions:</h5>
                        <div className="space-y-1">
                          {(person.sample_mentions || []).slice(0, 2).map((mention, i) => (
                            <p key={i} className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                              &ldquo;{mention.length > 80 ? mention.substring(0, 80) + '...' : mention}&rdquo;
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quality Indicators */}
                    {(person.quality_indicators || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(person.quality_indicators || []).slice(0, 3).map((indicator, i) => (
                          <span key={i} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {indicator}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'quality' && (
        <div className="space-y-6">
          {/* Strongest Relationships */}
          {(socialData.relationship_quality_analysis.strongest_relationships || []).length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">💎</span>
                Your Strongest Relationships
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(socialData.relationship_quality_analysis.strongest_relationships || []).map((rel, index) => (
                  <div key={rel.name} className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getCategoryIcon(rel.category)}</span>
                      <div>
                        <h4 className="font-semibold text-green-800">{rel.name}</h4>
                        <span className="text-sm text-green-600">{formatCategoryName(rel.category)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-sm font-bold text-green-700">{getSentimentLabel(rel.sentiment)}</div>
                        <div className="text-xs text-green-600">Sentiment</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-green-700">{rel.mentions}</div>
                        <div className="text-xs text-green-600">Mentions</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-green-700">{Math.round((rel.consistency || 0) * 100)}%</div>
                        <div className="text-xs text-green-600">Consistency</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships Needing Attention */}
          {(socialData.relationship_quality_analysis.relationships_needing_attention || []).length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">⚠️</span>
                Relationships That May Need Attention
              </h3>
              <div className="space-y-4">
                {(socialData.relationship_quality_analysis.relationships_needing_attention || []).map((rel, index) => (
                  <div key={rel.name} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getCategoryIcon(rel.category)}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-800">{rel.name}</h4>
                        <span className="text-sm text-yellow-600">{formatCategoryName(rel.category)}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-yellow-700">{getSentimentLabel(rel.sentiment)}</div>
                        <div className="text-xs text-yellow-600">Current sentiment</div>
                      </div>
                    </div>
                    {(rel.concerns || []).length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-yellow-700 font-medium mb-1">Concerns:</div>
                        <div className="flex flex-wrap gap-1">
                          {(rel.concerns || []).slice(0, 3).map((concern, i) => (
                            <span key={i} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                              {concern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Most Consistent Connections */}
          {(socialData.relationship_quality_analysis.most_consistent_connections || []).length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🔄</span>
                Your Most Consistent Connections
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(socialData.relationship_quality_analysis.most_consistent_connections || []).map((rel, index) => (
                  <div key={rel.name} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xl">{getCategoryIcon(rel.category)}</span>
                      <div>
                        <h4 className="font-medium text-blue-800">{rel.name}</h4>
                        <span className="text-xs text-blue-600">{formatCategoryName(rel.category)}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-700">{Math.round((rel.consistency || 0) * 100)}%</div>
                      <div className="text-xs text-blue-600">Present in {rel.months_present} months</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotional Impact Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">💗</span>
              Emotional Impact Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {socialData.relationship_quality_analysis.emotional_impact_summary?.positive_relationships ?? 0}
                </div>
                <div className="text-sm text-green-800">Positive Relationships</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {socialData.relationship_quality_analysis.emotional_impact_summary?.neutral_relationships ?? 0}
                </div>
                <div className="text-sm text-gray-800">Neutral Relationships</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {socialData.relationship_quality_analysis.emotional_impact_summary?.negative_relationships ?? 0}
                </div>
                <div className="text-sm text-red-800">Challenging Relationships</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {socialData.relationship_quality_analysis.emotional_impact_summary?.total_relationships ?? 0}
                </div>
                <div className="text-sm text-blue-800">Total Relationships</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'insights' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">💡</span>
            Your Social Intelligence Insights
          </h3>
          {(socialData.social_insights || []).length > 0 ? (
            <div className="space-y-4">
              {(socialData.social_insights || []).map((insight, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-l-4 border-indigo-400">
                  <div className="prose text-gray-700" dangerouslySetInnerHTML={{
                    __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                  }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              <div className="text-4xl mb-4">🔍</div>
              <p>No specific social insights generated. Your social patterns may be very balanced!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialAnalysis; 