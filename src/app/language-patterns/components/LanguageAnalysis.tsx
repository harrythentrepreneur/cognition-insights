'use client';

import React, { useState, useEffect } from 'react';
// Backend API removed - using IndexedDB storage

interface LanguageData {
  summary: {
    total_weeks_analyzed: number;
    analysis_period: {
      start_week: string;
      end_week: string;
    };
  };
  vocabulary_patterns: {
    complexity_stats: {
      average: number;
      min: number;
      max: number;
      trend: string;
    };
    evolution: string;
  };
  cognitive_health: {
    [pattern: string]: {
      average: number;
      min: number;
      max: number;
      trend: string;
    };
  };
  communication_evolution: {
    [style: string]: {
      average: number;
      min: number;
      max: number;
      trend: string;
    };
  };
  temporal_focus: {
    [pattern: string]: {
      average: number;
      min: number;
      max: number;
      trend: string;
    };
  };
  linguistic_metrics: {
    [metric: string]: {
      average: number;
      min: number;
      max: number;
      trend: string;
    };
  };
  key_insights: string[];
  weekly_data: Array<{
    week: string;
    vocabulary_complexity?: {
      score: number;
      indicators: string[];
      description: string;
    };
    sentence_structure?: {
      complexity_score: number;
      variation_score: number;
      patterns: string[];
      description: string;
    };
    emotional_expression?: {
      intensity_score: number;
      directness_score: number;
      patterns: string[];
      description: string;
    };
    cognitive_patterns?: {
      black_white_thinking: number;
      catastrophizing: number;
      overgeneralization: number;
      personalization: number;
      mental_filtering: number;
      positive_patterns: number;
      examples: string[];
      description: string;
    };
    communication_style?: {
      formality_score: number;
      directness_score: number;
      assertiveness_score: number;
      characteristics: string[];
      description: string;
    };
    temporal_patterns?: {
      past_focus: number;
      present_focus: number;
      future_focus: number;
      planning_language: number;
      examples: string[];
      description: string;
    };
    overall_insights?: {
      key_patterns: string[];
      emotional_correlations: string[];
      cognitive_health_indicators: string[];
    };
    basic_metrics?: {
      total_messages: number;
      total_words: number;
      vocabulary_diversity: number;
      avg_words_per_message: number;
      avg_sentence_length: number;
    };
  }>;
}

interface LanguageAnalysisProps {
  sessionId: string;
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving':
      return '📈';
    case 'declining':
      return '📉';
    case 'stable':
      return '➖';
    default:
      return '➖';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number) => {
  if (score >= 70) return 'bg-green-100 text-green-800';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const getCognitiveHealthIcon = (pattern: string) => {
  const unhealthyPatterns = ['black_white_thinking', 'catastrophizing', 'overgeneralization', 'personalization', 'mental_filtering'];
  if (pattern === 'positive_patterns') {
    return '✅';
  } else if (unhealthyPatterns.includes(pattern)) {
    return '⚠️';
  }
  return '🧠';
};

const formatPatternName = (pattern: string) => {
  return pattern
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    ></div>
  </div>
);

const LanguageAnalysis: React.FC<LanguageAnalysisProps> = ({ sessionId }) => {
  const [languageData, setLanguageData] = useState<LanguageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'cognitive' | 'communication' | 'vocabulary' | 'temporal'>('overview');

  useEffect(() => {
    const fetchLanguageData = async () => {
      try {
        console.log('🧠 [LanguageAnalysis] Fetching data for session:', sessionId);
        const response = await fetch(`${''/* Backend removed */}/api/language/${sessionId}`);
        console.log('🧠 [LanguageAnalysis] Response status:', response.status);
        
        const data = await response.json();
        console.log('🧠 [LanguageAnalysis] Full API response:', data);
        console.log('🧠 [LanguageAnalysis] Response status:', data.status);
        console.log('🧠 [LanguageAnalysis] Language data keys:', data.language_data ? Object.keys(data.language_data) : 'No language_data');
        
        if (data.status === 'completed') {
          if (data.language_data && Object.keys(data.language_data).length > 0) {
            console.log('🧠 [LanguageAnalysis] Setting language data:', data.language_data);
            setLanguageData(data.language_data);
          } else {
            console.error('🧠 [LanguageAnalysis] Language analysis completed but no data found');
            console.error('🧠 [LanguageAnalysis] language_data content:', data.language_data);
            setError('Language analysis completed but no data was found.');
          }
        } else if (data.status === 'failed') {
          console.error('🧠 [LanguageAnalysis] Language analysis failed during processing');
          setError('Language analysis failed during processing.');
        } else {
          console.warn('🧠 [LanguageAnalysis] Language analysis not yet complete, status:', data.status);
          setError('Language analysis is not yet complete.');
        }
      } catch (err) {
        console.error('🧠 [LanguageAnalysis] Error fetching language data:', err);
        setError('Failed to fetch language analysis results.');
      } finally {
        setLoading(false);
      }
    };

    fetchLanguageData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🧠</span>
          <h2 className="text-2xl font-bold text-gray-800">Language Pattern Analysis</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading language analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🧠</span>
          <h2 className="text-2xl font-bold text-gray-800">Language Pattern Analysis</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!languageData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🧠</span>
          <h2 className="text-2xl font-bold text-gray-800">Language Pattern Analysis</h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-yellow-500 mr-2">⚠️</span>
            <span className="text-yellow-700">No language analysis data available.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🧠</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Language Pattern Analysis</h2>
            <p className="text-sm text-gray-600">
              Analyzing {languageData.summary.total_weeks_analyzed} weeks of communication patterns
              ({languageData.summary.analysis_period.start_week} to {languageData.summary.analysis_period.end_week})
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'cognitive', label: 'Cognitive Patterns', icon: '🧠' },
              { id: 'communication', label: 'Communication Style', icon: '💬' },
              { id: 'vocabulary', label: 'Vocabulary', icon: '📚' },
              { id: 'temporal', label: 'Temporal Focus', icon: '📅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Insights */}
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <span className="text-lg mr-2">💡</span>
                <h3 className="text-lg font-semibold text-blue-900">Key Insights</h3>
              </div>
              <div className="space-y-3">
                {languageData.key_insights.map((insight, index) => (
                  <div key={index} className="flex items-start p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-blue-600 mr-3 mt-0.5">🎯</span>
                    <p className="text-blue-800">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Vocabulary Complexity</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-2xl font-bold ${getScoreColor(languageData.vocabulary_patterns.complexity_stats.average)}`}>
                    {Math.round(languageData.vocabulary_patterns.complexity_stats.average)}
                  </span>
                  <span className="text-lg">{getTrendIcon(languageData.vocabulary_patterns.complexity_stats.trend)}</span>
                </div>
                <ProgressBar value={languageData.vocabulary_patterns.complexity_stats.average} />
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Communication Assertiveness</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-2xl font-bold ${getScoreColor(languageData.communication_evolution.assertiveness_score?.average || 50)}`}>
                    {Math.round(languageData.communication_evolution.assertiveness_score?.average || 50)}
                  </span>
                  <span className="text-lg">{getTrendIcon(languageData.communication_evolution.assertiveness_score?.trend || 'stable')}</span>
                </div>
                <ProgressBar value={languageData.communication_evolution.assertiveness_score?.average || 50} />
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Positive Thinking Patterns</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-2xl font-bold ${getScoreColor(languageData.cognitive_health.positive_patterns?.average || 50)}`}>
                    {Math.round(languageData.cognitive_health.positive_patterns?.average || 50)}
                  </span>
                  <span className="text-lg">{getTrendIcon(languageData.cognitive_health.positive_patterns?.trend || 'stable')}</span>
                </div>
                <ProgressBar value={languageData.cognitive_health.positive_patterns?.average || 50} />
              </div>
            </div>

            {/* Linguistic Metrics */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <span className="text-lg mr-2">📚</span>
                <h3 className="text-lg font-semibold">Linguistic Metrics</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(languageData.linguistic_metrics).map(([metric, stats]) => (
                  <div key={metric} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{formatPatternName(metric)}</h4>
                      <span className="text-sm">{getTrendIcon(stats.trend)}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">
                      {typeof stats.average === 'number' ? stats.average.toFixed(2) : stats.average}
                    </p>
                    <p className="text-xs text-gray-500">
                      Range: {typeof stats.min === 'number' ? stats.min.toFixed(2) : stats.min} - {typeof stats.max === 'number' ? stats.max.toFixed(2) : stats.max}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cognitive' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Cognitive Health Patterns</h3>
              <p className="text-gray-600">Analysis of thinking patterns reflected in your language use</p>
            </div>
            {Object.entries(languageData.cognitive_health).map(([pattern, stats]) => (
              <div key={pattern} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="mr-2">{getCognitiveHealthIcon(pattern)}</span>
                    <h4 className="font-semibold">{formatPatternName(pattern)}</h4>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreBgColor(stats.average)}`}>
                      {Math.round(stats.average)}
                    </span>
                    <span className="ml-2">{getTrendIcon(stats.trend)}</span>
                  </div>
                </div>
                <ProgressBar value={stats.average} className="mb-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Min: {stats.min}</span>
                  <span>Avg: {Math.round(stats.average)}</span>
                  <span>Max: {stats.max}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Communication Style Evolution</h3>
              <p className="text-gray-600">How your communication style has evolved over time</p>
            </div>
            {Object.entries(languageData.communication_evolution).map(([style, stats]) => (
              <div key={style} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{formatPatternName(style)}</h4>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreBgColor(stats.average)}`}>
                      {Math.round(stats.average)}
                    </span>
                    <span className="ml-2">{getTrendIcon(stats.trend)}</span>
                  </div>
                </div>
                <ProgressBar value={stats.average} className="mb-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Min: {stats.min}</span>
                  <span>Avg: {Math.round(stats.average)}</span>
                  <span>Max: {stats.max}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vocabulary' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Vocabulary Patterns</h3>
              <p className="text-gray-600">Analysis of vocabulary complexity and linguistic sophistication</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Complexity Score</h4>
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreBgColor(languageData.vocabulary_patterns.complexity_stats.average)}`}>
                    {Math.round(languageData.vocabulary_patterns.complexity_stats.average)}
                  </span>
                  <span className="ml-2">{getTrendIcon(languageData.vocabulary_patterns.complexity_stats.trend)}</span>
                </div>
              </div>
              <ProgressBar value={languageData.vocabulary_patterns.complexity_stats.average} className="mb-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Min: {languageData.vocabulary_patterns.complexity_stats.min}</span>
                <span>Avg: {Math.round(languageData.vocabulary_patterns.complexity_stats.average)}</span>
                <span>Max: {languageData.vocabulary_patterns.complexity_stats.max}</span>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Evolution Notes</h4>
              <p className="text-blue-800">{languageData.vocabulary_patterns.evolution}</p>
            </div>
          </div>
        )}

        {activeTab === 'temporal' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Temporal Focus Patterns</h3>
              <p className="text-gray-600">How your language reflects focus on past, present, and future</p>
            </div>
            {Object.entries(languageData.temporal_focus).map(([pattern, stats]) => (
              <div key={pattern} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{formatPatternName(pattern)}</h4>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreBgColor(stats.average)}`}>
                      {Math.round(stats.average)}
                    </span>
                    <span className="ml-2">{getTrendIcon(stats.trend)}</span>
                  </div>
                </div>
                <ProgressBar value={stats.average} className="mb-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Min: {stats.min}</span>
                  <span>Avg: {Math.round(stats.average)}</span>
                  <span>Max: {stats.max}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageAnalysis; 