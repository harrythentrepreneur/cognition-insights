'use client';

import React, { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
// Backend API removed - using IndexedDB storage
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PatternOccurrence {
  date: string;
  week_start: string;
  message_text: string;
  context: string;
  confidence: number;
}

interface Pattern {
  pattern_id: string;
  pattern_name: string;
  category: string;
  description: string;
  frequency_score: number;
  consistency_score: number;
  emotional_correlation: Record<string, number>;
  occurrence_count: number;
  occurrences: PatternOccurrence[];
}

interface PatternInsights {
  total_patterns: number;
  categories: Record<string, {
    count: number;
    average_frequency: number;
    average_consistency: number;
  }>;
  top_patterns: Array<{
    name: string;
    category: string;
    frequency_score: number;
    consistency_score: number;
    occurrence_count: number;
  }>;
  emotional_impacts: Record<string, {
    positive_patterns: Array<[string, number]>;
    negative_patterns: Array<[string, number]>;
  }>;
  recommendations: string[];
}

interface PatternData {
  summary: {
    total_patterns_detected: number;
    analysis_timestamp: string;
    pattern_categories: string[];
    top_pattern_categories: string[];
  };
  patterns: Pattern[];
  insights: PatternInsights;
  visualizations: {
    category_distribution: Record<string, number>;
    frequency_trends: Record<string, any>;
    emotional_correlations: Record<string, Record<string, number>>;
  };
}

interface PatternAnalysisProps {
  sessionId: string;
}

const CATEGORY_COLORS = {
  exercise: '#22c55e',    // green
  social: '#3b82f6',      // blue
  work: '#f59e0b',        // amber
  leisure: '#8b5cf6',     // violet
  travel: '#06b6d4',      // cyan
  health: '#ef4444',      // red
  sleep: '#6366f1',       // indigo
  food: '#f97316',        // orange
  other: '#6b7280'        // gray
};

const EMOTION_COLORS = {
  happiness: '#22c55e',
  sadness: '#3b82f6',
  anger: '#ef4444',
  fear: '#8b5cf6',
  surprise: '#f59e0b',
  disgust: '#06b6d4'
};

export default function PatternAnalysis({ sessionId }: PatternAnalysisProps) {
  const [patternData, setPatternData] = useState<PatternData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePattern, setActivePattern] = useState<Pattern | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch pattern data
  useEffect(() => {
    const fetchPatternData = async () => {
      try {
        const response = await fetch(`${''/* Backend removed */}/api/pattern/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch pattern data');
        }
        const data = await response.json();
        
        if (data.status === 'completed' && data.pattern_data) {
          setPatternData(data.pattern_data);
        } else if (data.status === 'failed') {
          setError('Pattern analysis failed during processing');
        } else {
          setError('Pattern analysis not yet available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPatternData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Loading pattern analysis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Error loading pattern analysis</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!patternData || !patternData.patterns || patternData.patterns.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-800 font-medium">No behavioral patterns detected</p>
        <p className="text-blue-600 text-sm mt-2">
          Try uploading more conversation data or ensure your messages contain activity descriptions.
        </p>
      </div>
    );
  }

  // Filter patterns by category
  const filteredPatterns = selectedCategory === 'all' 
    ? patternData.patterns 
    : patternData.patterns.filter(p => p.category === selectedCategory);

  // Prepare category distribution chart data
  const categoryData = {
    labels: Object.keys(patternData.visualizations.category_distribution),
    datasets: [{
      data: Object.values(patternData.visualizations.category_distribution),
      backgroundColor: Object.keys(patternData.visualizations.category_distribution).map(
        category => CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other
      ),
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  // Prepare top patterns chart data
  const topPatternsData = {
    labels: patternData.insights.top_patterns.slice(0, 10).map(p => p.name),
    datasets: [
      {
        label: 'Frequency Score',
        data: patternData.insights.top_patterns.slice(0, 10).map(p => p.frequency_score * 100),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      },
      {
        label: 'Consistency Score',
        data: patternData.insights.top_patterns.slice(0, 10).map(p => p.consistency_score * 100),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">🔍</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Patterns</p>
              <p className="text-2xl font-bold text-gray-900">{patternData.summary.total_patterns_detected}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{patternData.summary.pattern_categories.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">⭐</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Top Category</p>
              <p className="text-lg font-bold text-gray-900">
                {patternData.summary.top_pattern_categories[0] || 'None'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-lg">💡</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Recommendations</p>
              <p className="text-2xl font-bold text-gray-900">{patternData.insights.recommendations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Categories</h3>
          <div className="h-64">
            <Doughnut 
              data={categoryData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} patterns (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Top Patterns */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Patterns by Score</h3>
          <div className="h-64">
            <Bar 
              data={topPatternsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                      display: true,
                      text: 'Score (%)'
                    }
                  },
                  x: {
                    ticks: {
                      maxRotation: 45,
                      minRotation: 45
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {patternData.summary.pattern_categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category} ({patternData.insights.categories[category]?.count || 0})
            </button>
          ))}
        </div>

        {/* Patterns List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Detected Patterns {selectedCategory !== 'all' && `(${selectedCategory})`}
          </h3>
          <div className="grid gap-3">
            {filteredPatterns.map((pattern) => (
              <div
                key={pattern.pattern_id}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => setActivePattern(pattern)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{pattern.pattern_name}</h4>
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[pattern.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other }}
                      >
                        {pattern.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Frequency: {(pattern.frequency_score * 100).toFixed(1)}%</span>
                      <span>Consistency: {(pattern.consistency_score * 100).toFixed(1)}%</span>
                      <span>Occurrences: {pattern.occurrence_count}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {patternData.insights.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Insights & Recommendations</h3>
          <div className="space-y-3">
            {patternData.insights.recommendations.map((recommendation, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Detail Modal */}
      {activePattern && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{activePattern.pattern_name}</h3>
                  <p className="text-gray-600">{activePattern.description}</p>
                </div>
                <button
                  onClick={() => setActivePattern(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Frequency Score</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(activePattern.frequency_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Consistency Score</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(activePattern.consistency_score * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Emotional Correlations */}
              {Object.keys(activePattern.emotional_correlation).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Emotional Impact</h4>
                  <div className="space-y-2">
                    {Object.entries(activePattern.emotional_correlation).map(([emotion, score]) => (
                      <div key={emotion} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{emotion}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${score}%`,
                                backgroundColor: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS] || '#6b7280'
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{score.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Occurrences */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recent Occurrences</h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {activePattern.occurrences.slice(0, 5).map((occurrence, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-gray-900">{occurrence.date}</span>
                        <span className="text-xs text-gray-500">
                          {(occurrence.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{occurrence.message_text}</p>
                      <p className="text-xs text-gray-500 mt-1">{occurrence.context}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 