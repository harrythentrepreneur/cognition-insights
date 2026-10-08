import React, { useState, useEffect } from 'react';
import { BasePageSection } from '@/components/shared/base/BasePageSection';
import { BaseInsightsDelta } from '@/components/shared/base/BaseInsightsDelta';
import { MOCK_LINGUISTIC_PATTERNS, MOCK_LANGUAGE_HABIT_IMPACTS } from '../constants';
import { transformLanguageHabitsToInsights } from '../utils';
import { 
  ConversationalDNA, 
  CognitiveStateTracker, 
  EmotionalGranularity, 
  PredictiveInsights 
} from './index';

// API base URL utility
const getApiBaseUrl = () => {
  return process.env.NODE_ENV === 'production' 
    ? 'https://api.cognition.com' 
    : 'http://localhost:8000';
};

// Define language pattern metric colors
const metricColors = {
  vocabulary_richness: '#FF6B6B',
  sentence_complexity: '#FFD93D',
  emotional_expressiveness: '#6BCF7F',
  storytelling_ability: '#4D96FF',
  humor_and_wit: '#9B59B6',
  future_orientation: '#FF8C42',
  empathy_signals: '#1ABC9C',
  curiosity_indicators: '#E74C3C',
  confidence_markers: '#3498DB',
  social_awareness: '#F39C12',
  cultural_references: '#9013FE',
  technical_language: '#795548',
  metaphor_usage: '#607D8B',
  question_patterns: '#8BC34A',
  communication_style: '#E91E63'
} as const;

interface LanguagePatternsSectionProps {
  sessionId?: string;
  useMockData?: boolean;
}

export const LanguagePatternsSection: React.FC<LanguagePatternsSectionProps> = ({ 
  sessionId,
  useMockData = false 
}) => {
  const [languageData, setLanguageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'advanced'>('overview');

  // Fetch language patterns data from API
  useEffect(() => {
    if (!sessionId || useMockData) return;

    const fetchLanguageData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/language-patterns/${sessionId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'completed' && result.language_patterns_data) {
          setLanguageData(result.language_patterns_data);
          setError(null);
        } else {
          throw new Error('No language patterns data available');
        }
      } catch (err) {
        console.error('Error fetching language patterns data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch language patterns data');
      } finally {
        setLoading(false);
      }
    };

    fetchLanguageData();
  }, [sessionId, useMockData]);

  // Create static emotion pill data from language metrics
  const getEmotionPillData = () => {
    if (!languageData || useMockData) {
      return MOCK_LINGUISTIC_PATTERNS.map(pattern => ({
        id: pattern.id,
        name: pattern.pattern,
        color: metricColors.vocabulary_richness, // Default color since LinguisticPattern doesn't have color
        currentValue: pattern.frequency,
        intensity: pattern.frequency / 100
      }));
    }

    const metrics = languageData.language_metrics || {};
    return Object.entries(metrics).map(([key, value]) => ({
      id: key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      color: metricColors[key as keyof typeof metricColors] || '#45B7D1',
      currentValue: typeof value === 'number' ? value : 0,
      intensity: typeof value === 'number' ? value / 100 : 0
    }));
  };

  const emotionPillData = getEmotionPillData();

  // Generate insights
  const insights = [{
    id: 'language-insights',
    title: 'Language Pattern Analysis',
    content: (
      <BaseInsightsDelta 
        data={transformLanguageHabitsToInsights(MOCK_LANGUAGE_HABIT_IMPACTS)} 
        isLoading={loading} 
        error={error} 
      />
    )
  }];

  // Create heatmap data
  const generateHeatmapData = (metricId: string) => {
    const metric = emotionPillData.find(m => m.id === metricId);
    if (!metric) return [];

    const baseIntensity = metric.intensity;
    return Array.from({ length: 10 }, (_, i) => ({
      x: i,
      y: 0,
      intensity: baseIntensity + (Math.random() - 0.5) * 0.2
    }));
  };

  const defaultActiveItems = emotionPillData.slice(0, 5).reduce((acc, item) => {
    acc[item.id] = true;
    return acc;
  }, {} as Record<string, boolean>);

  const timeRange = {
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    end: new Date()
  };

  return (
    <div className="space-y-8">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">Language Patterns Analysis</h2>
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('advanced')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'advanced'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Advanced Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' ? (
        <BasePageSection
          data={emotionPillData}
          insights={insights}
          defaultActiveItems={defaultActiveItems}
          generateHeatmapData={generateHeatmapData}
          colorScheme={{
            0: '#FF6B6B',
            1: '#FFD700',
            2: '#4ECDC4',
            3: '#45B7D1',
            4: '#8B5CF6',
          }}
          timeRange={timeRange}
          metricType="language"
        />
      ) : (
        <div className="space-y-8">
          {/* Advanced LLM-Powered Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <ConversationalDNA 
              sessionId={sessionId} 
            />
            <CognitiveStateTracker 
              sessionId={sessionId} 
            />
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <EmotionalGranularity 
              sessionId={sessionId} 
            />
            <PredictiveInsights 
              sessionId={sessionId} 
            />
          </div>
        </div>
      )}
    </div>
  );
}; 