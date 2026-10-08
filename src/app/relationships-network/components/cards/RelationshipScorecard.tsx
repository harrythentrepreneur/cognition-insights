import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { RelationshipCard } from '../../types';
import { getHealthScoreColor, getHealthScoreLabel, formatResponseTime, getRelationshipRole } from '../../utils';
import { LOVE_EMOTIONS } from '../../constants';

interface RelationshipScorecardProps {
  card: RelationshipCard;
  onClose?: () => void;
  className?: string;
}

const RelationshipScorecard: React.FC<RelationshipScorecardProps> = ({
  card,
  onClose,
  className = ''
}) => {
  const radarRef = useRef<SVGSVGElement>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const role = getRelationshipRole(card.role);
  const healthColor = getHealthScoreColor(card.scorecard.healthScore);
  const healthLabel = getHealthScoreLabel(card.scorecard.healthScore);
  const primaryEmotion = LOVE_EMOTIONS[card.emotionalProfile.primaryEmotion as keyof typeof LOVE_EMOTIONS];

  // Detailed metrics for the scorecard
  const detailedMetrics = [
    {
      id: 'balance',
      name: 'Balance',
      value: card.scorecard.balance,
      description: 'Mutual engagement and conversation initiation',
      color: card.color,
      icon: '⚖️'
    },
    {
      id: 'reciprocity',
      name: 'Reciprocity',
      value: card.scorecard.reciprocity,
      description: 'Emotional support exchange and understanding',
      color: primaryEmotion?.color || card.color,
      icon: '🤝'
    },
    {
      id: 'frequency',
      name: 'Frequency',
      value: card.scorecard.frequency,
      description: 'Consistency and regularity of communication',
      color: role.color,
      icon: '📱'
    },
    {
      id: 'responsiveness',
      name: 'Responsiveness',
      value: Math.max(0, 100 - (card.recentActivity.averageResponseTime / 3600) * 100),
      description: 'Speed and reliability of responses',
      color: '#45B7D1',
      icon: '⚡'
    }
  ];

  // Draw mini radar chart
  useEffect(() => {
    if (!radarRef.current) return;

    const svg = d3.select(radarRef.current);
    svg.selectAll('*').remove();

    const width = 120;
    const height = 120;
    const radius = 40;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create container
    const container = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Create scales
    const angleScale = d3.scaleLinear()
      .domain([0, detailedMetrics.length])
      .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius]);

    // Draw concentric circles
    [25, 50, 75, 100].forEach(level => {
      container.append('circle')
        .attr('r', radiusScale(level))
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 0.5);
    });

    // Draw axis lines
    detailedMetrics.forEach((metric, index) => {
      const angle = angleScale(index) - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      container.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', 'rgba(255, 255, 255, 0.2)')
        .attr('stroke-width', 0.5);
    });

    // Create data points
    const dataPoints = detailedMetrics.map((metric, index) => {
      const angle = angleScale(index) - Math.PI / 2;
      const r = radiusScale(metric.value);
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        metric
      };
    });

    // Draw filled area
    const line = d3.line<typeof dataPoints[0]>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveCardinalClosed.tension(0.3));

    container.append('path')
      .datum(dataPoints)
      .attr('d', line)
      .attr('fill', card.color)
      .attr('fill-opacity', 0.2)
      .attr('stroke', card.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8);

    // Draw data points
    dataPoints.forEach((point, index) => {
      container.append('circle')
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('r', 3)
        .attr('fill', point.metric.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('filter', `drop-shadow(0 0 4px ${point.metric.color}60)`);
    });

  }, [card, detailedMetrics]);

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold mr-4"
            style={{
              background: `linear-gradient(135deg, ${card.color}, ${card.color}80)`,
              boxShadow: `0 4px 12px ${card.color}40`
            }}
          >
            {card.avatar ? (
              <img 
                src={card.avatar} 
                alt={card.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              card.name.split(' ').map(n => n[0]).join('').slice(0, 2)
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{card.name}</h3>
            <div className="flex items-center mt-1">
              <div
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: role.color }}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: role.color }}
              >
                {role.name}
              </span>
            </div>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all duration-200"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Metrics */}
        <div>
          {/* Overall Health Score */}
          <div className="mb-6 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <div className="text-xs text-white/60 mb-2">Overall Relationship Health</div>
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: healthColor }}
              >
                {card.scorecard.healthScore}%
              </div>
              <div 
                className="text-sm font-medium"
                style={{ color: healthColor }}
              >
                {healthLabel}
              </div>
            </div>

            {/* Health Score Bar */}
            <div className="mt-4 w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${card.scorecard.healthScore}%`,
                  background: `linear-gradient(90deg, ${healthColor}, ${healthColor}80)`
                }}
              />
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="space-y-4">
            {detailedMetrics.map((metric) => (
              <div
                key={metric.id}
                className="p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredMetric(metric.id)}
                onMouseLeave={() => setHoveredMetric(null)}
                style={{
                  boxShadow: hoveredMetric === metric.id ? `0 4px 12px ${metric.color}30` : 'none'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{metric.icon}</span>
                    <span className="text-white font-medium">{metric.name}</span>
                  </div>
                  <span 
                    className="text-lg font-bold"
                    style={{ color: metric.color }}
                  >
                    {Math.round(metric.value)}%
                  </span>
                </div>
                
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${metric.value}%`,
                      background: `linear-gradient(90deg, ${metric.color}, ${metric.color}80)`
                    }}
                  />
                </div>
                
                <p className="text-xs text-white/60">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Visual & Insights */}
        <div>
          {/* Mini Radar Chart */}
          <div className="mb-6 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
            <div className="text-center mb-4">
              <h4 className="text-white font-medium mb-2">Relationship Profile</h4>
              <svg
                ref={radarRef}
                width={120}
                height={120}
                className="mx-auto"
                style={{ background: 'transparent' }}
              />
            </div>
          </div>

          {/* Personality & Role */}
          <div className="mb-6 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
            <h4 className="text-white font-medium mb-3">Personality Profile</h4>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {card.personality}
            </p>
            
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${role.color}15` }}>
              <div className="flex items-center mb-2">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: role.color }}
                />
                <span 
                  className="font-medium text-sm"
                  style={{ color: role.color }}
                >
                  {role.name}
                </span>
              </div>
              <p className="text-xs text-white/60">{role.description}</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
            <h4 className="text-white font-medium mb-3">Recent Activity</h4>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-white/60 text-xs mb-1">Messages</div>
                <div className="text-white font-semibold">
                  {card.recentActivity.messageCount}
                </div>
              </div>
              <div>
                <div className="text-white/60 text-xs mb-1">Avg Response</div>
                <div className="text-white font-semibold">
                  {formatResponseTime(card.recentActivity.averageResponseTime)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Last Contact:</span>
                <span className="text-white">
                  {card.recentActivity.lastContact.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Trajectory */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">Relationship Trend:</span>
                <div className="flex items-center">
                  {card.scorecard.trajectory === 'positive' && (
                    <>
                      <div className="w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-green-400 mr-1" />
                      <span className="text-green-400 text-xs font-medium">Growing</span>
                    </>
                  )}
                  {card.scorecard.trajectory === 'negative' && (
                    <>
                      <div className="w-0 h-0 border-l-2 border-r-2 border-t-3 border-transparent border-t-red-400 mr-1" />
                      <span className="text-red-400 text-xs font-medium">Declining</span>
                    </>
                  )}
                  {card.scorecard.trajectory === 'stable' && (
                    <>
                      <div className="w-3 h-0.5 bg-blue-400 mr-1" />
                      <span className="text-blue-400 text-xs font-medium">Stable</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipScorecard;