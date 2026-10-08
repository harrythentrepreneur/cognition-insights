'use client';

import React, { useState, useEffect } from 'react';
// Backend API removed - using IndexedDB storage
// Removed axios - using browser-based processing
import { getSessionData } from '../../../lib/storage/session-data-access';

interface Trigger {
  trigger_text: string;
  category: string;
  affected_emotions: { emotion: string; effect: string; }[];
  explanation_of_link: string;
  confidence: 'high' | 'medium' | 'low';
}

interface EnhancedTrigger {
  trigger: string;
  frequency: number;
  category: string;
  sample_explanation: string;
  sample_affected_emotions: { emotion: string; effect: string; }[];
}

interface CategoryAnalysis {
  total_trigger_count: number;
  affected_emotion_counts: Record<string, number>;
  confidence_distribution: Record<string, number>;
  sample_triggers: string[];
}

interface ReflectionPrompt {
  category: string;
  prompt: string;
  type: string;
  primary_stress_domain: {
    category: string;
    frequency: number;
    impact_ratio: number;
  } | null;
  emotional_resilience_indicators: string[];
  trigger_sensitivity: 'high' | 'moderate' | 'low';
}

interface EmotionalProfile {
  primary_stress_domain: {
    category: string;
    frequency: number;
    impact_ratio: number;
  } | null;
  emotional_resilience_indicators: string[];
  trigger_sensitivity: 'high' | 'moderate' | 'low';
  strengths: string[];
  growth_areas: string[];
}

interface Recommendation {
  title: string;
  description: string;
  action: string;
  category: string;
}

interface WeeklyTriggerData {
  week: string;
  identified_triggers: Trigger[];
  trigger_summary: string;
  emotional_scores: Record<string, number>;
  intensity_metrics: Record<string, number>;
}

interface TriggerInsights {
  total_analyzed_weeks: number;
  trigger_categories: Record<string, number>;
  category_analysis: Record<string, CategoryAnalysis>;
  most_common_triggers: EnhancedTrigger[];
  actionable_insights: string[];
  reflection_prompts: ReflectionPrompt[];
  emotional_profile: EmotionalProfile;
  weekly_trigger_data: WeeklyTriggerData[];
  personalized_recommendations: Recommendation[];
}

interface TriggerAnalysisProps {
  sessionId: string;
}

const TriggerAnalysis: React.FC<TriggerAnalysisProps> = ({ sessionId }) => {
  const [triggerData, setTriggerData] = useState<TriggerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyTriggerData | null>(null);
  const [viewMode, setViewMode] = useState<'insights' | 'timeline' | 'categories' | 'reflection'>('insights');

  // Add custom CSS for animation delays
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .animation-delay-300 { animation-delay: 0.3s; }
      .animation-delay-600 { animation-delay: 0.6s; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const fetchTriggerData = async () => {
      try {
        const dataAccess = await getSessionData();
        const triggerData = await dataAccess.getTriggerData(sessionId);
        
        if (triggerData && triggerData.triggers) {
          setTriggerData(triggerData);
        } else {
          // No trigger data available yet
          setError('No trigger analysis data available');
        }
      } catch (err) {
        setError('Failed to fetch trigger analysis');
        console.error('Error fetching trigger data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchTriggerData();
    }
  }, [sessionId]);

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      work: '💼',
      relationships: '❤️',
      health: '🏥',
      family: '👨‍👩‍👧‍👦',
      finances: '💰',
      social: '👥',
      personal_growth: '🌱',
      environment: '🏠',
      technology: '💻',
      other: '📝'
    };
    return icons[category] || '📝';
  };

  const formatCategoryName = (category: string): string => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Fix incorrect capitalization after apostrophes
  const fixApostropheCapitalization = (text: string): string => {
    // Fix patterns like "Apprehension'S" to "Apprehension's"
    return text.replace(/(['''])(\s*)([A-Z])/g, (match, apostrophe, space, letter) => {
      return apostrophe + space + letter.toLowerCase();
    });
  };

  const getSensitivityColor = (sensitivity: string): string => {
    switch (sensitivity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRecommendationIcon = (category: string): string => {
    const icons: Record<string, string> = {
      immediate: '⚡',
      skill_building: '🎯',
      self_care: '🌸',
      professional_support: '🤝',
      daily_practice: '📅',
      ongoing_development: '📈'
    };
    return icons[category] || '💡';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">AI Analyzing Your Emotional Triggers</h3>
          <div className="space-y-2 text-gray-600 max-w-md mx-auto">
            <p className="flex items-center justify-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
              Identifying high-intensity emotional periods
            </p>
            <p className="flex items-center justify-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2 animation-delay-300"></span>
              Analyzing message patterns and context
            </p>
            <p className="flex items-center justify-center">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2 animation-delay-600"></span>
              Generating personalized insights
            </p>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 Our AI is processing your emotional patterns to provide meaningful insights into what triggers different feelings
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Trigger Analysis Available</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!triggerData || triggerData.total_analyzed_weeks === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">😌</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Emotionally Stable Period</h3>
        <p className="text-gray-600">
          Your emotional patterns appear quite stable. No weeks with intense emotional peaks were detected for analysis.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            This suggests good emotional regulation. Continue monitoring your patterns for insights over time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Emotional Profile Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🧠 Your Emotional Intelligence Report</h2>
          <p className="text-gray-600">AI-powered insights to understand and improve your emotional patterns</p>
        </div>

        {/* Quick Profile Overview */}
        {triggerData.emotional_profile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{triggerData.total_analyzed_weeks}</div>
              <div className="text-sm text-blue-800">High-Intensity Weeks</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                {triggerData.emotional_profile.primary_stress_domain?.category || 'Varied'}
              </div>
              <div className="text-sm text-purple-800">Primary Stress Domain</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className={`text-2xl font-bold ${getSensitivityColor(triggerData.emotional_profile.trigger_sensitivity).split(' ')[0]}`}>
                {triggerData.emotional_profile.trigger_sensitivity.charAt(0).toUpperCase() + triggerData.emotional_profile.trigger_sensitivity.slice(1)}
              </div>
              <div className="text-sm text-gray-800">Trigger Sensitivity</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {triggerData.emotional_profile.strengths.length}
              </div>
              <div className="text-sm text-green-800">Identified Strengths</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex justify-center space-x-1 bg-white/70 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('insights')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'insights' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            💡 Insights & Actions
          </button>
          <button
            onClick={() => setViewMode('reflection')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'reflection' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🪞 Reflection & Growth
          </button>
          <button
            onClick={() => setViewMode('categories')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'categories' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🏷️ Pattern Analysis
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'timeline' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📅 Weekly Timeline
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'insights' && (
        <div className="space-y-6">
          {/* Actionable Insights */}
          {triggerData.actionable_insights && triggerData.actionable_insights.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Key Insights About Your Patterns
              </h3>
              <div className="space-y-4">
                {triggerData.actionable_insights.map((insight, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-400">
                    <div className="prose text-gray-700" dangerouslySetInnerHTML={{
                      __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                    }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personalized Recommendations */}
          {triggerData.personalized_recommendations && triggerData.personalized_recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Personalized Action Plan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {triggerData.personalized_recommendations.map((rec, index) => (
                  <div key={index} className="p-5 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 mb-3">
                      <span className="text-2xl">{getRecommendationIcon(rec.category)}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">{rec.category.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{rec.description}</p>
                    <div className="p-3 bg-white rounded border-l-3 border-blue-400">
                      <p className="text-sm text-gray-700 font-medium">Action Step:</p>
                      <p className="text-sm text-gray-600">{rec.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Trigger Patterns with Enhanced Data */}
          {triggerData.most_common_triggers && triggerData.most_common_triggers.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🔄</span>
                Your Most Common Trigger Patterns
              </h3>
              <div className="space-y-4">
                {triggerData.most_common_triggers.slice(0, 5).map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{fixApostropheCapitalization(item.trigger)}</h4>
                        <div className="text-xs text-gray-500 mb-1">Category: {formatCategoryName(item.category)}</div>
                        <div className="flex items-center space-x-2 mt-1 mb-2">
                          <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-700 font-medium">
                            {item.frequency}x occurrences
                          </span>
                        </div>
                        {item.sample_affected_emotions && item.sample_affected_emotions.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500">Typically affects:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.sample_affected_emotions.slice(0, 3).map((sae, i) => (
                                <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                  {sae.emotion}: {sae.effect}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.sample_explanation && (
                          <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                            Context: &ldquo;{item.sample_explanation.length > 100 ? item.sample_explanation.substring(0, 100) + '...' : item.sample_explanation}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'reflection' && (
        <div className="space-y-6">
          {/* Emotional Profile */}
          {triggerData.emotional_profile && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">🧠</span>
                Your Emotional Intelligence Profile
              </h3>
              
              {/* Primary Stress Domain */}
              {triggerData.emotional_profile.primary_stress_domain && (
                <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🎯</span>
                    Primary Challenge Area
                  </h4>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-2xl font-bold text-purple-700">
                        {triggerData.emotional_profile.primary_stress_domain.category}
                      </div>
                      <div className="text-sm text-gray-600">
                        {triggerData.emotional_profile.primary_stress_domain.frequency} related triggers analyzed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-700">
                        {(triggerData.emotional_profile.primary_stress_domain.impact_ratio * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">Negative Impact Score</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${triggerData.emotional_profile.primary_stress_domain.impact_ratio * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    This is your most emotionally challenging life area. Consider developing targeted coping strategies here.
                  </p>
                </div>
              )}

              {/* Emotional Sensitivity Meter */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">⚡</span>
                  Emotional Sensitivity Level
                </h4>
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-green-600 font-medium">Calm</span>
                    <span className="text-sm text-yellow-600 font-medium">Moderate</span>
                    <span className="text-sm text-red-600 font-medium">Highly Sensitive</span>
                  </div>
                  <div className="w-full bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full h-4 relative">
                    <div 
                      className={`absolute top-0 w-6 h-6 rounded-full border-4 border-white shadow-lg transform -translate-y-1 transition-all duration-500 ${
                        triggerData.emotional_profile.trigger_sensitivity === 'high' 
                          ? 'bg-red-500 right-0 -translate-x-2' 
                          : triggerData.emotional_profile.trigger_sensitivity === 'low'
                          ? 'bg-green-500 left-0 translate-x-2'
                          : 'bg-yellow-500 left-1/2 -translate-x-1/2'
                      }`}
                    ></div>
                  </div>
                  <div className="mt-3 text-center">
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getSensitivityColor(triggerData.emotional_profile.trigger_sensitivity)}`}>
                      {triggerData.emotional_profile.trigger_sensitivity.charAt(0).toUpperCase() + triggerData.emotional_profile.trigger_sensitivity.slice(1)} Sensitivity
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 text-center mt-2">
                    {triggerData.emotional_profile.trigger_sensitivity === 'high' 
                      ? 'You experience emotions intensely across multiple life areas. This sensitivity can be a superpower when channeled well!'
                      : triggerData.emotional_profile.trigger_sensitivity === 'low'
                      ? 'You maintain emotional stability even during challenging periods. This resilience is a valuable strength.'
                      : 'You have a balanced emotional response pattern with good resilience in most areas.'
                    }
                  </p>
                </div>
              </div>

              {/* Strengths & Resilience with Progress Bars */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">💪</span>
                    Your Emotional Strengths
                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      {triggerData.emotional_profile.strengths.length + triggerData.emotional_profile.emotional_resilience_indicators.length} identified
                    </span>
                  </h4>
                  <div className="space-y-4">
                    {/* Specific strength areas */}
                    {triggerData.emotional_profile.strengths.map((strength, index) => {
                      const strengthArea = strength.toLowerCase().includes('work') ? 'work' :
                                         strength.toLowerCase().includes('relationship') ? 'relationships' :
                                         strength.toLowerCase().includes('social') ? 'social' :
                                         strength.toLowerCase().includes('finance') ? 'finances' :
                                         strength.toLowerCase().includes('health') ? 'health' : 'general';
                      
                      const strengthPercentage = 85 + (index * 3); // Vary the percentages
                      
                      return (
                        <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600">🎯</span>
                              <span className="font-medium text-green-800">{strength}</span>
                            </div>
                          </div>
                          <p className="text-xs text-green-700 mt-1 italic">
                            This suggests a capacity for positive emotional outcomes or effective coping in this area.
                          </p>
                        </div>
                      );
                    })}
                    
                    {/* Resilience indicators */}
                    {triggerData.emotional_profile.emotional_resilience_indicators.map((indicator, index) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-blue-600">🛡️</span>
                          <span className="font-medium text-blue-800">{indicator}</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1 italic">
                          This indicates a foundation for emotional resilience and adaptability.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Opportunities with Action-Oriented Design */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🌱</span>
                    Growth Opportunities
                    <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                      {triggerData.emotional_profile.growth_areas.length} areas
                    </span>
                  </h4>
                  <div className="space-y-4">
                    {triggerData.emotional_profile.growth_areas.map((area, index) => {
                      const growthArea = area.toLowerCase().includes('work') ? 'work' :
                                       area.toLowerCase().includes('family') ? 'family' :
                                       area.toLowerCase().includes('relationship') ? 'relationships' :
                                       area.toLowerCase().includes('health') ? 'health' : 'general';
                      
                      const growthIcons = {
                        work: '💼',
                        family: '👨‍👩‍👧‍👦',
                        relationships: '❤️',
                        health: '🏥',
                        general: '🎯'
                      };
                      
                      const growthTips = {
                        work: 'Consider time management techniques or setting clearer boundaries',
                        family: 'Family dynamics can be complex - patience and open communication help',
                        relationships: 'Focus on active listening and expressing needs clearly',
                        health: 'Prioritize self-care and don\'t hesitate to seek professional support',
                        general: 'Small, consistent steps toward improvement make a big difference'
                      };
                      
                      return (
                        <div key={index} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start space-x-3 mb-3">
                            <span className="text-2xl">{growthIcons[growthArea]}</span>
                            <div className="flex-1">
                              <div className="font-medium text-yellow-800 mb-1">{area}</div>
                              <div className="w-full bg-yellow-200 rounded-full h-2 mb-2">
                                <div className="bg-yellow-500 h-2 rounded-full w-1/3 transition-all duration-1000"></div>
                              </div>
                              <p className="text-xs text-yellow-700 italic">
                                This area may benefit from focused attention and strategy development.
                              </p>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border-l-4 border-yellow-400">
                            <p className="text-xs text-gray-600">
                              💡 <strong>Next step:</strong> Start with one small change in this area
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Sensitivity context */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-600">📊</span>
                        <span className="font-medium text-gray-800">
                          Overall Trigger Sensitivity: {triggerData.emotional_profile.trigger_sensitivity}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            triggerData.emotional_profile.trigger_sensitivity === 'high' 
                              ? 'bg-red-400 w-5/6' 
                              : triggerData.emotional_profile.trigger_sensitivity === 'low'
                              ? 'bg-green-400 w-1/3'
                              : 'bg-yellow-400 w-1/2'
                          }`}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {triggerData.emotional_profile.trigger_sensitivity === 'high' 
                          ? 'Your high sensitivity means you experience life deeply - a gift that requires gentle self-care'
                          : triggerData.emotional_profile.trigger_sensitivity === 'low'
                          ? 'Your emotional stability is a strength that helps you stay grounded'
                          : 'You have a healthy balance of emotional responsiveness and stability'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                  <span className="mr-2">✨</span>
                  Your Emotional Intelligence Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-green-600">
                      {triggerData.emotional_profile.strengths.length + triggerData.emotional_profile.emotional_resilience_indicators.length}
                    </div>
                    <div className="text-sm text-green-800 font-medium">Identified Strengths</div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-purple-600">
                      {triggerData.total_analyzed_weeks}
                    </div>
                    <div className="text-sm text-purple-800 font-medium">Intense Weeks Analyzed</div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-blue-600">
                      {triggerData.emotional_profile.growth_areas.length}
                    </div>
                    <div className="text-sm text-blue-800 font-medium">Growth Opportunities</div>
                  </div>
                </div>
                <p className="text-sm text-indigo-700 mt-4 text-center">
                  🎯 <strong>Key insight:</strong> You have strong emotional awareness with clear areas for targeted growth. 
                  Your {triggerData.emotional_profile.trigger_sensitivity} sensitivity level indicates 
                  {triggerData.emotional_profile.trigger_sensitivity === 'high' 
                    ? ' you experience emotions deeply - use this as a strength while practicing self-care.'
                    : triggerData.emotional_profile.trigger_sensitivity === 'low'
                    ? ' excellent emotional regulation - maintain this stability while staying open to growth.'
                    : ' a healthy emotional balance - continue building on your strengths.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Reflection Prompts */}
          {triggerData.reflection_prompts && triggerData.reflection_prompts.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🪞</span>
                Personalized Reflection Questions
              </h3>
              <p className="text-gray-600 mb-6">
                Take a moment to reflect on these questions based on your emotional patterns. 
                There are no right or wrong answers - just opportunities for self-discovery.
              </p>
              <div className="space-y-4">
                {triggerData.reflection_prompts.map((prompt, index) => (
                  <div key={index} className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
                      <span className="mr-2">💭</span>
                      {prompt.category}
                    </h4>
                    <p className="text-gray-700 leading-relaxed">{prompt.prompt}</p>
                    <div className="mt-4 p-3 bg-white rounded border-l-3 border-purple-400">
                      <p className="text-sm text-gray-600 italic">
                        💡 Consider journaling your thoughts or discussing with a trusted friend or counselor.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'categories' && triggerData.category_analysis && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🏷️</span>
            Detailed Category Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(triggerData.category_analysis)
              .sort(([,a], [,b]) => b.total_trigger_count - a.total_trigger_count)
              .map(([category, analysis]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">{getCategoryIcon(category)}</div>
                    <h4 className="font-semibold text-gray-800 mb-1">{formatCategoryName(category)}</h4>
                    <div className="text-2xl font-bold text-primary mb-2">{analysis.total_trigger_count}</div>
                    <div className="text-sm text-gray-500">Total Triggers</div>
                  </div>
                  
                  {/* Common Emotions (Now Affected Emotion Counts) */}
                  {Object.keys(analysis.affected_emotion_counts).length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Frequently Affected Emotions</h5>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(analysis.affected_emotion_counts)
                          .sort(([,a],[,b]) => b - a) // Sort by count desc
                          .slice(0, 3)
                          .map(([emotion, count]) => (
                          <span key={emotion} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {emotion} ({count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Triggers */}
                  {analysis.sample_triggers.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Examples</h5>
                      <div className="space-y-1">
                        {analysis.sample_triggers.slice(0, 2).map((trigger, index) => (
                          <p key={index} className="text-xs text-gray-600 italic">
                            &ldquo;{fixApostropheCapitalization(trigger.length > 40 ? trigger.substring(0, 40) + '...' : trigger)}&rdquo;
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {viewMode === 'timeline' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📅</span>
            Weekly Emotional Timeline
          </h3>
          <div className="space-y-4">
            {triggerData.weekly_trigger_data && triggerData.weekly_trigger_data.map((week) => (
              <div 
                key={week.week}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedWeek?.week === week.week 
                    ? 'border-primary bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedWeek(selectedWeek?.week === week.week ? null : week)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 mb-1">
                      Week of {new Date(week.week).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{week.trigger_summary}</div>
                    
                    {/* Emotional Intensity Indicators */}
                    {week.intensity_metrics && Object.keys(week.intensity_metrics).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {Object.entries(week.intensity_metrics).map(([emotion, score]) => (
                          <span 
                            key={emotion}
                            className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium"
                          >
                            {emotion}: {score}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                    {week.identified_triggers ? week.identified_triggers.length : 0} triggers
                  </div>
                </div>
                
                {selectedWeek?.week === week.week && week.identified_triggers && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-3">Identified Triggers</h5>
                    <div className="space-y-3">
                      {week.identified_triggers.map((trigger, index) => (
                        <div key={index} className="bg-white p-4 rounded border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-gray-800 flex-1">{fixApostropheCapitalization(trigger.trigger_text)}</p>
                            <span className={`px-2 py-1 rounded text-xs font-medium border bg-gray-100 text-gray-700`}>
                              {trigger.confidence} confidence
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Category:</span> {formatCategoryName(trigger.category)}
                          </div>
                          {trigger.explanation_of_link && (
                            <div className="mb-2 p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-500 font-medium">AI Explanation:</p>
                              <p className="text-xs text-gray-600 italic">{fixApostropheCapitalization(trigger.explanation_of_link)}</p>
                            </div>
                          )}
                          {trigger.affected_emotions && trigger.affected_emotions.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">Affected Emotions:</p>
                              <div className="flex flex-wrap gap-1">
                                {trigger.affected_emotions.map((ae, i) => (
                                  <span key={i} className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                                    {ae.emotion}: {ae.effect}
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TriggerAnalysis; 