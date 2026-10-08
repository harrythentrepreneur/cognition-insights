'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface CognitiveStateTrackerProps {
  sessionId?: string;
  data?: CognitiveStatesData;
}

interface CognitiveStatesData {
  cognitive_timeline: Array<{
    time_period: string;
    mental_load: number;
    focus_level: number;
    cognitive_state: string;
    decision_style: string;
    problem_solving_approach: string;
    stress_indicators: number;
  }>;
  overall_patterns: {
    average_mental_load: number;
    focus_consistency: number;
    dominant_decision_style: string;
    cognitive_health_score: number;
  };
}

const CognitiveStateTracker: React.FC<CognitiveStateTrackerProps> = ({ sessionId, data: propData }) => {
  const timelineRef = useRef<SVGSVGElement>(null);
  const gaugeRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<CognitiveStatesData | null>(propData || null);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Fetch data if not provided as prop
  useEffect(() => {
    if (!propData && sessionId) {
      fetchCognitiveStates();
    }
  }, [sessionId, propData]);

  const fetchCognitiveStates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/language-patterns/cognitive/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'completed' && result.cognitive_data) {
        setData(result.cognitive_data);
        setError(null);
      } else {
        throw new Error('No cognitive data available');
      }
    } catch (err) {
      console.error('Error fetching cognitive data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cognitive data');
      // Use mock data for demonstration
      setData(generateMockCognitiveData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockCognitiveData = (): CognitiveStatesData => ({
    cognitive_timeline: [
      {
        time_period: '2024-W01',
        mental_load: 65,
        focus_level: 78,
        cognitive_state: 'focused',
        decision_style: 'analytical',
        problem_solving_approach: 'systematic',
        stress_indicators: 35
      },
      {
        time_period: '2024-W02',
        mental_load: 82,
        focus_level: 45,
        cognitive_state: 'scattered',
        decision_style: 'impulsive',
        problem_solving_approach: 'reactive',
        stress_indicators: 68
      },
      {
        time_period: '2024-W03',
        mental_load: 58,
        focus_level: 85,
        cognitive_state: 'clear',
        decision_style: 'balanced',
        problem_solving_approach: 'creative',
        stress_indicators: 25
      },
      {
        time_period: '2024-W04',
        mental_load: 75,
        focus_level: 72,
        cognitive_state: 'focused',
        decision_style: 'analytical',
        problem_solving_approach: 'systematic',
        stress_indicators: 42
      }
    ],
    overall_patterns: {
      average_mental_load: 70,
      focus_consistency: 75,
      dominant_decision_style: 'analytical',
      cognitive_health_score: 78
    }
  });

  // Timeline visualization
  useEffect(() => {
    if (!data || !timelineRef.current) return;

    const svg = d3.select(timelineRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    svg.attr('width', width + margin.left + margin.right)
       .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scalePoint()
      .domain(data.cognitive_timeline.map(d => d.time_period))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Color scales for different metrics
    const mentalLoadColor = d3.scaleLinear<string>()
      .domain([0, 50, 100])
      .range(['#22c55e', '#fbbf24', '#ef4444']);

    const focusColor = d3.scaleLinear<string>()
      .domain([0, 50, 100])
      .range(['#ef4444', '#fbbf24', '#22c55e']);

    const stressColor = d3.scaleLinear<string>()
      .domain([0, 50, 100])
      .range(['#22c55e', '#fbbf24', '#ef4444']);

    // Grid lines
    g.selectAll('.grid-line')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .style('stroke', '#3A3A5C')
      .style('stroke-width', 0.5)
      .style('opacity', 0.3);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', '#B8B8D0')
      .style('font-size', '10px');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', '#B8B8D0')
      .style('font-size', '10px');

    // Lines for each metric
    const mentalLoadLine = d3.line<any>()
      .x(d => xScale(d.time_period)!)
      .y(d => yScale(d.mental_load))
      .curve(d3.curveMonotoneX);

    const focusLine = d3.line<any>()
      .x(d => xScale(d.time_period)!)
      .y(d => yScale(d.focus_level))
      .curve(d3.curveMonotoneX);

    const stressLine = d3.line<any>()
      .x(d => xScale(d.time_period)!)
      .y(d => yScale(100 - d.stress_indicators)) // Invert stress for visualization
      .curve(d3.curveMonotoneX);

    // Draw lines
    g.append('path')
      .datum(data.cognitive_timeline)
      .attr('d', mentalLoadLine)
      .style('fill', 'none')
      .style('stroke', '#fbbf24')
      .style('stroke-width', 2)
      .style('opacity', 0.8);

    g.append('path')
      .datum(data.cognitive_timeline)
      .attr('d', focusLine)
      .style('fill', 'none')
      .style('stroke', '#22c55e')
      .style('stroke-width', 2)
      .style('opacity', 0.8);

    g.append('path')
      .datum(data.cognitive_timeline)
      .attr('d', stressLine)
      .style('fill', 'none')
      .style('stroke', '#00FFE6')
      .style('stroke-width', 2)
      .style('opacity', 0.8);

    // Data points
    data.cognitive_timeline.forEach((d, i) => {
      const x = xScale(d.time_period)!;

      // Mental load point
      g.append('circle')
        .attr('cx', x)
        .attr('cy', yScale(d.mental_load))
        .attr('r', 4)
        .style('fill', mentalLoadColor(d.mental_load))
        .style('stroke', '#1A1A2E')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedPeriod(d.time_period))
        .on('mouseover', function(event) {
          showTooltip(event, d, 'Mental Load', d.mental_load);
        })
        .on('mouseout', hideTooltip);

      // Focus point
      g.append('circle')
        .attr('cx', x)
        .attr('cy', yScale(d.focus_level))
        .attr('r', 4)
        .style('fill', focusColor(d.focus_level))
        .style('stroke', '#1A1A2E')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedPeriod(d.time_period))
        .on('mouseover', function(event) {
          showTooltip(event, d, 'Focus Level', d.focus_level);
        })
        .on('mouseout', hideTooltip);

      // Stress indicator (inverted)
      g.append('circle')
        .attr('cx', x)
        .attr('cy', yScale(100 - d.stress_indicators))
        .attr('r', 4)
        .style('fill', '#00FFE6')
        .style('stroke', '#1A1A2E')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedPeriod(d.time_period))
        .on('mouseover', function(event) {
          showTooltip(event, d, 'Calm Level', 100 - d.stress_indicators);
        })
        .on('mouseout', hideTooltip);
    });

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 150}, 20)`);

    const legendData = [
      { label: 'Mental Load', color: '#fbbf24' },
      { label: 'Focus Level', color: '#22c55e' },
      { label: 'Calm Level', color: '#00FFE6' }
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('circle')
        .attr('r', 4)
        .style('fill', item.color);

      legendItem.append('text')
        .attr('x', 12)
        .attr('y', 0)
        .attr('dy', '0.32em')
        .style('fill', '#B8B8D0')
        .style('font-size', '10px')
        .text(item.label);
    });

  }, [data]);

  // Gauge visualization for overall health
  useEffect(() => {
    if (!data || !gaugeRef.current) return;

    const svg = d3.select(gaugeRef.current);
    svg.selectAll('*').remove();

    const width = 200;
    const height = 120;
    const radius = 80;
    const centerX = width / 2;
    const centerY = height - 20;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Background arc
    const backgroundArc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append('path')
      .attr('d', backgroundArc as any)
      .style('fill', '#3A3A5C')
      .style('opacity', 0.3);

    // Score arc
    const score = data.overall_patterns.cognitive_health_score;
    const scoreAngle = -Math.PI / 2 + (score / 100) * Math.PI;

    const scoreArc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(scoreAngle);

    g.append('path')
      .attr('d', scoreArc as any)
      .style('fill', score > 70 ? '#22c55e' : score > 40 ? '#fbbf24' : '#ef4444');

    // Score text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -10)
      .style('fill', '#FFFFFF')
      .style('font-size', '24px')
      .style('font-weight', 'bold')
      .text(`${Math.round(score)}`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 8)
      .style('fill', '#B8B8D0')
      .style('font-size', '10px')
      .text('Cognitive Health');

  }, [data]);

  const showTooltip = (event: any, d: any, metric: string, value: number) => {
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'cognitive-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(35, 35, 64, 0.95)')
      .style('color', '#FFFFFF')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('border', '1px solid #00FFE6')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .html(`
        <div><strong>${d.time_period}</strong></div>
        <div>${metric}: ${value}%</div>
        <div>State: ${d.cognitive_state}</div>
        <div>Style: ${d.decision_style}</div>
      `);

    tooltip
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  };

  const hideTooltip = () => {
    d3.selectAll('.cognitive-tooltip').remove();
  };

  const getCognitiveStateIcon = (state: string) => {
    switch (state) {
      case 'focused': return '🎯';
      case 'scattered': return '💫';
      case 'clear': return '✨';
      case 'overwhelmed': return '🌪️';
      default: return '🧠';
    }
  };

  const getDecisionStyleIcon = (style: string) => {
    switch (style) {
      case 'analytical': return '📊';
      case 'intuitive': return '💡';
      case 'balanced': return '⚖️';
      case 'impulsive': return '⚡';
      default: return '🤔';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🧠</span>
          <h3 className="text-xl font-bold text-white">Cognitive States</h3>
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
          <span className="text-2xl mr-3">🧠</span>
          <h3 className="text-xl font-bold text-white">Cognitive States</h3>
        </div>
        <div className="text-red-400 text-center py-8">
          <p>Unable to load cognitive analysis</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const selectedData = selectedPeriod 
    ? data.cognitive_timeline.find(d => d.time_period === selectedPeriod)
    : data.cognitive_timeline[data.cognitive_timeline.length - 1];

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">🧠</span>
        <h3 className="text-xl font-bold text-white">Cognitive States Tracker</h3>
        <div className="ml-auto text-sm text-gray-400">
          Mental Load & Focus Analysis
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3">Cognitive Timeline</h4>
          <svg ref={timelineRef}></svg>
        </div>

        {/* Health Gauge & Details */}
        <div className="space-y-4">
          {/* Cognitive Health Gauge */}
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Overall Health</h4>
            <svg ref={gaugeRef}></svg>
          </div>

          {/* Current/Selected Period Details */}
          {selectedData && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3">
                {selectedPeriod ? 'Selected Period' : 'Latest Period'}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Period</span>
                  <span className="text-white font-semibold">{selectedData.time_period}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">State</span>
                  <span className="text-white font-semibold">
                    {getCognitiveStateIcon(selectedData.cognitive_state)} {selectedData.cognitive_state}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Decision Style</span>
                  <span className="text-white font-semibold">
                    {getDecisionStyleIcon(selectedData.decision_style)} {selectedData.decision_style}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Problem Solving</span>
                  <span className="text-white font-semibold capitalize">{selectedData.problem_solving_approach}</span>
                </div>

                <div className="pt-3 border-t border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Mental Load</span>
                    <span className="text-yellow-400 text-sm">{selectedData.mental_load}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Focus Level</span>
                    <span className="text-green-400 text-sm">{selectedData.focus_level}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Stress Level</span>
                    <span className="text-red-400 text-sm">{selectedData.stress_indicators}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overall Patterns */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Patterns</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Avg Mental Load</span>
                <span className="text-yellow-400 text-sm">{Math.round(data.overall_patterns.average_mental_load)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Focus Consistency</span>
                <span className="text-green-400 text-sm">{data.overall_patterns.focus_consistency}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Dominant Style</span>
                <span className="text-white text-sm capitalize">{data.overall_patterns.dominant_decision_style}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CognitiveStateTracker;