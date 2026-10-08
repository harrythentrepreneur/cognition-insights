'use client';

import React, { useEffect, useState } from 'react';

interface PredictiveInsightsProps {
  sessionId?: string;
  data?: PredictiveInsightsData;
}

interface PredictiveInsightsData {
  mood_forecast: {
    trend: string;
    confidence: number;
  };
  conversation_topic_predictions: string[];
  behavioral_trend_indicators: {
    [key: string]: any;
  };
  risk_assessments: {
    [key: string]: any;
  };
  confidence_intervals: {
    [key: string]: number;
  };
  recommendation_insights: string[];
}

const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ sessionId, data: propData }) => {
  const [data, setData] = useState<PredictiveInsightsData | null>(propData || null);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'forecast' | 'topics' | 'risks' | 'recommendations'>('forecast');

  // Fetch data if not provided as prop
  useEffect(() => {
    if (!propData && sessionId) {
      fetchPredictiveInsights();
    }
  }, [sessionId, propData]);

  const fetchPredictiveInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/language-patterns/predictions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'completed' && result.predictions_data) {
        setData(result.predictions_data);
        setError(null);
      } else {
        throw new Error('No predictions data available');
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
      // Use mock data for demonstration
      setData(generateMockPredictionsData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockPredictionsData = (): PredictiveInsightsData => ({
    mood_forecast: {
      trend: 'improving',
      confidence: 78
    },
    conversation_topic_predictions: [
      'work projects and deadlines',
      'weekend plans and social activities',
      'health and wellness topics',
      'technology and innovation',
      'personal growth and learning'
    ],
    behavioral_trend_indicators: {
      communication_frequency: { trend: 'increasing', score: 85 },
      emotional_expressiveness: { trend: 'stable', score: 72 },
      social_engagement: { trend: 'improving', score: 68 },
      stress_indicators: { trend: 'decreasing', score: 35 }
    },
    risk_assessments: {
      burnout_risk: { level: 'low', score: 25, factors: ['manageable workload', 'good support system'] },
      social_isolation: { level: 'very_low', score: 15, factors: ['active social connections', 'regular communication'] },
      communication_breakdown: { level: 'low', score: 20, factors: ['clear expression', 'responsive to others'] }
    },
    confidence_intervals: {
      mood_prediction: 78,
      topic_accuracy: 65,
      behavioral_trends: 82,
      risk_assessment: 71
    },
    recommendation_insights: [
      'Continue maintaining your current positive communication patterns',
      'Consider scheduling regular check-ins with close contacts',
      'Your analytical thinking style is serving you well - lean into it',
      'Watch for signs of overcommitment in upcoming weeks',
      'Your empathy levels suggest strong relationship-building potential'
    ]
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'stable': return '➖';
      case 'increasing': return '⬆️';
      case 'decreasing': return '⬇️';
      case 'declining': return '📉';
      default: return '❓';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'very_low': return 'text-green-400 bg-green-900/30';
      case 'low': return 'text-green-300 bg-green-800/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'high': return 'text-orange-400 bg-orange-900/30';
      case 'very_high': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-800/30';
    }
  };

  const getRiskLevelText = (level: string) => {
    return level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🔮</span>
          <h3 className="text-xl font-bold text-white">Predictive Insights</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🔮</span>
          <h3 className="text-xl font-bold text-white">Predictive Insights</h3>
        </div>
        <div className="text-red-400 text-center py-8">
          <p>Unable to load predictions</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">🔮</span>
        <h3 className="text-xl font-bold text-white">Predictive Insights</h3>
        <div className="ml-auto text-sm text-gray-400">
          AI-Powered Behavioral Forecasting
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'forecast', label: 'Mood Forecast', icon: '📊' },
            { id: 'topics', label: 'Topic Predictions', icon: '💬' },
            { id: 'risks', label: 'Risk Assessment', icon: '⚠️' },
            { id: 'recommendations', label: 'Recommendations', icon: '💡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Mood Forecast */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-cyan-400 mb-4">Mood Trend Forecast</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-6xl mb-2">
                  {getTrendIcon(data.mood_forecast.trend)}
                </div>
                <h5 className="text-xl font-bold text-white capitalize mb-2">
                  {data.mood_forecast.trend}
                </h5>
                <p className="text-gray-400 text-sm">
                  Based on recent communication patterns
                </p>
              </div>
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Confidence Level</span>
                    <span className="text-white font-semibold">{data.mood_forecast.confidence}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${data.mood_forecast.confidence}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  <p className="mb-2">Forecast Period: Next 24-48 hours</p>
                  <p>Based on linguistic pattern analysis and emotional indicators</p>
                </div>
              </div>
            </div>
          </div>

          {/* Behavioral Trends */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-cyan-400 mb-4">Behavioral Trend Indicators</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data.behavioral_trend_indicators).map(([key, value]: [string, any]) => (
                <div key={key} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-lg">
                      {getTrendIcon(value.trend)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-cyan-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${value.score}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold text-sm">{value.score}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 capitalize">
                    Trend: {value.trend}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'topics' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-cyan-400 mb-4">Predicted Conversation Topics</h4>
          <div className="space-y-3">
            {data.conversation_topic_predictions.map((topic, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-900 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white capitalize">{topic}</p>
                  <div className="flex items-center mt-1">
                    <div className="w-20 bg-gray-700 rounded-full h-1 mr-2">
                      <div
                        className="bg-cyan-400 h-1 rounded-full"
                        style={{ width: `${Math.max(20, 90 - index * 15)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.max(20, 90 - index * 15)}% likelihood
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <span className="font-semibold">💡 Tip:</span> These predictions are based on your recent communication patterns and interests.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-4">
          {Object.entries(data.risk_assessments).map(([riskType, assessment]: [string, any]) => (
            <div key={riskType} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white capitalize">
                  {riskType.replace(/_/g, ' ')}
                </h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(assessment.level)}`}>
                  {getRiskLevelText(assessment.level)}
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Risk Score</span>
                  <span className="text-white font-semibold">{assessment.score}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      assessment.score < 25 ? 'bg-green-500' :
                      assessment.score < 50 ? 'bg-yellow-500' :
                      assessment.score < 75 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${assessment.score}%` }}
                  ></div>
                </div>
              </div>

              {assessment.factors && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-300 mb-2">Contributing Factors:</h5>
                  <ul className="space-y-1">
                    {assessment.factors.map((factor: string, index: number) => (
                      <li key={index} className="text-sm text-gray-400 flex items-start">
                        <span className="text-cyan-400 mr-2">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-cyan-400 mb-4">Personalized Recommendations</h4>
          <div className="space-y-4">
            {data.recommendation_insights.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-gray-900 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  💡
                </div>
                <div className="flex-1">
                  <p className="text-white">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Confidence Levels */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h5 className="text-sm font-semibold text-gray-300 mb-3">Prediction Confidence</h5>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.confidence_intervals).map(([key, confidence]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-cyan-400 h-1 rounded-full"
                        style={{ width: `${confidence}%` }}
                      ></div>
                    </div>
                    <span className="text-white text-sm font-semibold">{confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveInsights;