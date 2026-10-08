'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface ConversationalDNAProps {
  sessionId?: string;
  data?: ConversationalDNAData;
}

interface ConversationalDNAData {
  unique_phrases: string[];
  signature_patterns: {
    frequent_phrases: string[];
    unique_structures: string[];
  };
  authenticity_score: number;
  linguistic_fingerprint: {
    vocabulary_markers: string[];
    syntactic_patterns: string[];
  };
  communication_style_markers: string[];
  personality_indicators: {
    traits: string[];
    confidence: number;
  };
}

const ConversationalDNA: React.FC<ConversationalDNAProps> = ({ sessionId, data: propData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ConversationalDNAData | null>(propData || null);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);

  // Fetch data if not provided as prop
  useEffect(() => {
    if (!propData && sessionId) {
      fetchConversationalDNA();
    }
  }, [sessionId, propData]);

  const fetchConversationalDNA = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/language-patterns/dna/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'completed' && result.dna_data) {
        setData(result.dna_data);
        setError(null);
      } else {
        throw new Error('No DNA data available');
      }
    } catch (err) {
      console.error('Error fetching DNA data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch DNA data');
      // Use mock data for demonstration
      setData(generateMockDNAData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockDNAData = (): ConversationalDNAData => ({
    unique_phrases: ['you know', 'i think', 'that makes sense', 'sounds good', 'for sure'],
    signature_patterns: {
      frequent_phrases: ['honestly', 'basically', 'i feel like'],
      unique_structures: ['question + immediate answer', 'lots of ellipses...', 'emoji combinations']
    },
    authenticity_score: 87,
    linguistic_fingerprint: {
      vocabulary_markers: ['casual tone', 'empathetic language', 'tech terminology'],
      syntactic_patterns: ['short sentences', 'frequent questions', 'conversational flow']
    },
    communication_style_markers: ['friendly', 'supportive', 'inquisitive', 'analytical'],
    personality_indicators: {
      traits: ['openness', 'conscientiousness', 'agreeableness'],
      confidence: 82
    }
  });

  // D3 visualization
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    svg.attr('width', width).attr('height', height);

    // Create the main container group
    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Define the DNA metrics for radar chart
    const metrics = [
      { name: 'Authenticity', value: data.authenticity_score, max: 100 },
      { name: 'Uniqueness', value: Math.min(100, data.unique_phrases.length * 10), max: 100 },
      { name: 'Complexity', value: Math.min(100, data.signature_patterns.unique_structures.length * 15), max: 100 },
      { name: 'Expressiveness', value: Math.min(100, data.communication_style_markers.length * 12), max: 100 },
      { name: 'Consistency', value: data.personality_indicators.confidence, max: 100 },
      { name: 'Sophistication', value: Math.min(100, data.linguistic_fingerprint.vocabulary_markers.length * 16), max: 100 }
    ];

    const angleStep = (2 * Math.PI) / metrics.length;

    // Create background circles
    const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
    levels.forEach((level, i) => {
      g.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', radius * level)
        .style('fill', 'none')
        .style('stroke', i === levels.length - 1 ? '#00FFE6' : '#3A3A5C')
        .style('stroke-width', i === levels.length - 1 ? 2 : 1)
        .style('opacity', 0.3);
    });

    // Create axis lines and labels
    metrics.forEach((metric, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Axis line
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .style('stroke', '#3A3A5C')
        .style('stroke-width', 1)
        .style('opacity', 0.5);

      // Label
      const labelX = Math.cos(angle) * (radius + 30);
      const labelY = Math.sin(angle) * (radius + 30);

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('fill', '#FFFFFF')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .text(metric.name);
    });

    // Create the DNA polygon
    const points: Array<[number, number]> = metrics.map((metric, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const value = (metric.value / metric.max) * radius;
      const x = Math.cos(angle) * value;
      const y = Math.sin(angle) * value;
      return [x, y];
    });

    // Add the first point at the end to close the polygon
    points.push(points[0]);

    const line = d3.line().curve(d3.curveLinearClosed);

    // DNA polygon fill
    g.append('path')
      .datum(points)
      .attr('d', line)
      .style('fill', '#00FFE6')
      .style('opacity', 0.2)
      .style('stroke', '#00FFE6')
      .style('stroke-width', 2);

    // Add data points
    metrics.forEach((metric, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const value = (metric.value / metric.max) * radius;
      const x = Math.cos(angle) * value;
      const y = Math.sin(angle) * value;

      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 4)
        .style('fill', '#00FFE6')
        .style('stroke', '#1A1A2E')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          // Tooltip
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(35, 35, 64, 0.95)')
            .style('color', '#FFFFFF')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('border', '1px solid #00FFE6')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html(`<strong>${metric.name}</strong><br/>Score: ${metric.value}/100`);

          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.selectAll('.tooltip').remove();
        });
    });

    // Center score display
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 40)
      .style('fill', 'rgba(0, 255, 230, 0.1)')
      .style('stroke', '#00FFE6')
      .style('stroke-width', 2);

    const avgScore = Math.round(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length);
    
    g.append('text')
      .attr('x', 0)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .style('fill', '#00FFE6')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(avgScore);

    g.append('text')
      .attr('x', 0)
      .attr('y', 8)
      .attr('text-anchor', 'middle')
      .style('fill', '#B8B8D0')
      .style('font-size', '10px')
      .text('DNA Score');

  }, [data]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🧬</span>
          <h3 className="text-xl font-bold text-white">Conversational DNA</h3>
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
          <span className="text-2xl mr-3">🧬</span>
          <h3 className="text-xl font-bold text-white">Conversational DNA</h3>
        </div>
        <div className="text-red-400 text-center py-8">
          <p>Unable to load DNA analysis</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">🧬</span>
        <h3 className="text-xl font-bold text-white">Conversational DNA</h3>
        <div className="ml-auto text-sm text-gray-400">
          Linguistic Fingerprint Analysis
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DNA Visualization */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3">DNA Profile</h4>
          <div className="flex justify-center">
            <svg ref={svgRef}></svg>
          </div>
        </div>

        {/* DNA Details */}
        <div className="space-y-4">
          {/* Signature Phrases */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Signature Phrases</h4>
            <div className="flex flex-wrap gap-2">
              {data.unique_phrases.slice(0, 8).map((phrase, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-cyan-900/30 text-cyan-300 rounded-full text-xs"
                >
                  &ldquo;{phrase}&rdquo;
                </span>
              ))}
            </div>
          </div>

          {/* Communication Style */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Style Markers</h4>
            <div className="flex flex-wrap gap-2">
              {data.communication_style_markers.map((marker, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs"
                >
                  {marker}
                </span>
              ))}
            </div>
          </div>

          {/* Authenticity Score */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Authenticity</h4>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.authenticity_score}%` }}
                ></div>
              </div>
              <span className="text-white font-semibold">{data.authenticity_score}%</span>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              How genuine your communication style appears
            </p>
          </div>

          {/* Personality Indicators */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Personality Traits</h4>
            <div className="space-y-2">
              {data.personality_indicators.traits.map((trait, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm capitalize">{trait}</span>
                  <div className="w-16 bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-cyan-400 h-1 rounded-full"
                      style={{ width: `${Math.random() * 50 + 50}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Confidence</span>
                <span className="text-cyan-400 font-semibold">{data.personality_indicators.confidence}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationalDNA;