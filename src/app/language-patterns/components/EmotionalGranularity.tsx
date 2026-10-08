'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface EmotionalGranularityProps {
  sessionId?: string;
  data?: EmotionalGranularityData;
}

interface EmotionalGranularityData {
  emotion_spectrum: {
    primary_emotions: string[];
    secondary_emotions: string[];
    complex_states: string[];
  };
  emotional_complexity_score: number;
  regulation_patterns: string[];
  empathy_indicators: number;
  emotional_volatility: number;
  dominant_emotional_themes: string[];
  emotional_intelligence_markers: {
    self_awareness: number;
    social_awareness: number;
  };
}

const EmotionalGranularity: React.FC<EmotionalGranularityProps> = ({ sessionId, data: propData }) => {
  const spectrumRef = useRef<SVGSVGElement>(null);
  const eiRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<EmotionalGranularityData | null>(propData || null);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'primary' | 'secondary' | 'complex'>('primary');

  // Fetch data if not provided as prop
  useEffect(() => {
    if (!propData && sessionId) {
      fetchEmotionalGranularity();
    }
  }, [sessionId, propData]);

  const fetchEmotionalGranularity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/language-patterns/emotions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'completed' && result.emotional_data) {
        setData(result.emotional_data);
        setError(null);
      } else {
        throw new Error('No emotional data available');
      }
    } catch (err) {
      console.error('Error fetching emotional data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch emotional data');
      // Use mock data for demonstration
      setData(generateMockEmotionalData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockEmotionalData = (): EmotionalGranularityData => ({
    emotion_spectrum: {
      primary_emotions: ['joy', 'curiosity', 'contentment', 'mild_anxiety', 'determination'],
      secondary_emotions: ['nostalgia', 'anticipation', 'gratitude', 'excitement', 'concern', 'satisfaction'],
      complex_states: ['bittersweet', 'cautious_optimism', 'reflective_melancholy', 'proud_vulnerability']
    },
    emotional_complexity_score: 78,
    regulation_patterns: [
      'positive_reframing',
      'seeking_support',
      'problem_solving',
      'mindfulness_practices'
    ],
    empathy_indicators: 85,
    emotional_volatility: 32,
    dominant_emotional_themes: ['growth_mindset', 'interpersonal_connection', 'creative_expression'],
    emotional_intelligence_markers: {
      self_awareness: 82,
      social_awareness: 76
    }
  });

  // Emotion colors mapping
  const emotionColors = {
    // Primary emotions
    joy: '#FFD700', sadness: '#4682B4', anger: '#FF4500', fear: '#8B008B',
    curiosity: '#32CD32', contentment: '#98FB98', determination: '#FF6347',
    mild_anxiety: '#DDA0DD', excitement: '#FF1493', concern: '#F0E68C',
    
    // Secondary emotions
    nostalgia: '#DEB887', anticipation: '#FF69B4', gratitude: '#90EE90',
    satisfaction: '#87CEEB', hope: '#87CEFA', relief: '#F5DEB3',
    
    // Complex states
    bittersweet: '#D8BFD8', 'cautious_optimism': '#20B2AA',
    'reflective_melancholy': '#708090', 'proud_vulnerability': '#F4A460'
  };

  // Emotion spectrum visualization
  useEffect(() => {
    if (!data || !spectrumRef.current) return;

    const svg = d3.select(spectrumRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Get emotions for selected category
    const getEmotionsForCategory = () => {
      switch (selectedCategory) {
        case 'primary': return data.emotion_spectrum.primary_emotions;
        case 'secondary': return data.emotion_spectrum.secondary_emotions;
        case 'complex': return data.emotion_spectrum.complex_states;
        default: return data.emotion_spectrum.primary_emotions;
      }
    };

    const emotions = getEmotionsForCategory();

    // Create circular layout
    const radius = Math.min(width, height) / 3;
    const angleStep = (2 * Math.PI) / emotions.length;

    emotions.forEach((emotion, i) => {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      // Get color for emotion
      const color = emotionColors[emotion as keyof typeof emotionColors] || '#00FFE6';
      
      // Emotion circle
      const emotionGroup = g.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .style('cursor', 'pointer');

      emotionGroup.append('circle')
        .attr('r', 25)
        .style('fill', color)
        .style('opacity', 0.7)
        .style('stroke', '#FFFFFF')
        .style('stroke-width', 2);

      // Emotion label
      emotionGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('fill', '#000000')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .text(emotion.replace(/_/g, ' '));

      // Hover effects
      emotionGroup
        .on('mouseover', function() {
          d3.select(this).select('circle')
            .style('opacity', 1)
            .attr('r', 30);
        })
        .on('mouseout', function() {
          d3.select(this).select('circle')
            .style('opacity', 0.7)
            .attr('r', 25);
        });
    });

    // Center category indicator
    g.append('circle')
      .attr('r', 50)
      .style('fill', 'rgba(0, 255, 230, 0.1)')
      .style('stroke', '#00FFE6')
      .style('stroke-width', 2);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('fill', '#00FFE6')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(`${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Emotions`);

  }, [data, selectedCategory]);

  // Emotional Intelligence gauge
  useEffect(() => {
    if (!data || !eiRef.current) return;

    const svg = d3.select(eiRef.current);
    svg.selectAll('*').remove();

    const width = 300;
    const height = 200;
    const centerX = width / 2;
    const centerY = height - 30;
    const radius = 80;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Self-awareness gauge
    const selfAwareArc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2 + (data.emotional_intelligence_markers.self_awareness / 100) * Math.PI);

    g.append('path')
      .attr('d', selfAwareArc as any)
      .style('fill', '#FF6B6B')
      .attr('transform', 'translate(-50, 0)');

    // Social awareness gauge
    const socialAwareArc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2 + (data.emotional_intelligence_markers.social_awareness / 100) * Math.PI);

    g.append('path')
      .attr('d', socialAwareArc as any)
      .style('fill', '#4ECDC4')
      .attr('transform', 'translate(50, 0)');

    // Background arcs
    const backgroundArc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append('path')
      .attr('d', backgroundArc as any)
      .style('fill', '#3A3A5C')
      .style('opacity', 0.3)
      .attr('transform', 'translate(-50, 0)');

    g.append('path')
      .attr('d', backgroundArc as any)
      .style('fill', '#3A3A5C')
      .style('opacity', 0.3)
      .attr('transform', 'translate(50, 0)');

    // Labels
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', -50)
      .attr('y', -20)
      .style('fill', '#FFFFFF')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(data.emotional_intelligence_markers.self_awareness);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', -50)
      .attr('y', 0)
      .style('fill', '#B8B8D0')
      .style('font-size', '10px')
      .text('Self Awareness');

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 50)
      .attr('y', -20)
      .style('fill', '#FFFFFF')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(data.emotional_intelligence_markers.social_awareness);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 50)
      .attr('y', 0)
      .style('fill', '#B8B8D0')
      .style('font-size', '10px')
      .text('Social Awareness');

  }, [data]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">💭</span>
          <h3 className="text-xl font-bold text-white">Emotional Granularity</h3>
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
          <span className="text-2xl mr-3">💭</span>
          <h3 className="text-xl font-bold text-white">Emotional Granularity</h3>
        </div>
        <div className="text-red-400 text-center py-8">
          <p>Unable to load emotional analysis</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">💭</span>
        <h3 className="text-xl font-bold text-white">Emotional Granularity</h3>
        <div className="ml-auto text-sm text-gray-400">
          Advanced Emotion Detection
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Spectrum */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-cyan-400">Emotion Spectrum</h4>
            <div className="flex space-x-2">
              {(['primary', 'secondary', 'complex'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <svg ref={spectrumRef}></svg>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          {/* Emotional Intelligence */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Emotional Intelligence</h4>
            <svg ref={eiRef}></svg>
          </div>

          {/* Complexity & Metrics */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Emotional Metrics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Complexity Score</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-cyan-400 h-2 rounded-full"
                      style={{ width: `${data.emotional_complexity_score}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold text-sm">{data.emotional_complexity_score}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Empathy Level</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-pink-400 h-2 rounded-full"
                      style={{ width: `${data.empathy_indicators}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold text-sm">{data.empathy_indicators}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Emotional Stability</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{ width: `${100 - data.emotional_volatility}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold text-sm">{100 - data.emotional_volatility}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Regulation Patterns */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Regulation Patterns</h4>
            <div className="space-y-2">
              {data.regulation_patterns.map((pattern, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="text-gray-300 text-sm capitalize">
                    {pattern.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dominant Themes */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Emotional Themes</h4>
            <div className="flex flex-wrap gap-2">
              {data.dominant_emotional_themes.map((theme, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs"
                >
                  {theme.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalGranularity;