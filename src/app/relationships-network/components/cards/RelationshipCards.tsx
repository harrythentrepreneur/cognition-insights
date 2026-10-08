import React, { useState } from 'react';
import { RelationshipCard } from '../../types';
import { getHealthScoreColor, getHealthScoreLabel, formatResponseTime, getRelationshipRole } from '../../utils';
import { LOVE_EMOTIONS } from '../../constants';

interface RelationshipCardsProps {
  cards: RelationshipCard[];
  onCardSelect?: (card: RelationshipCard) => void;
  selectedCardId?: string;
  compact?: boolean;
  onDeepInsightsClick?: (card: RelationshipCard) => void;
}

// Add CSS animations
const shimmerAnimation = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }
`;

const RelationshipCards: React.FC<RelationshipCardsProps> = ({
  cards,
  onCardSelect,
  selectedCardId,
  compact = false,
  onDeepInsightsClick
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Log received cards data
  React.useEffect(() => {
    console.log('[RELATIONSHIP-CARDS] Received cards:', cards.length);
    cards.forEach((card, index) => {
      console.log(`[RELATIONSHIP-CARDS] Card ${index}:`, {
        name: card.name,
        messageCount: card.recentActivity.messageCount,
        lastContact: card.recentActivity.lastContact,
        averageResponseTime: card.recentActivity.averageResponseTime
      });
    });
  }, [cards]);

  const handleCardClick = (card: RelationshipCard) => {
    onCardSelect?.(card);
  };

  // Inject animations
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = shimmerAnimation;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Compact version for insights panel
  if (compact) {
    return (
      <div className="w-full p-4">
        <div className="space-y-3">
          {cards.map((card) => {
            const role = getRelationshipRole(card.role);
            const isSelected = selectedCardId === card.id;
            const healthColor = getHealthScoreColor(card.scorecard.healthScore);
            
            return (
              <div
                key={card.id}
                className="cursor-pointer"
                onClick={() => handleCardClick(card)}
                style={{
                  background: isSelected ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${isSelected ? card.color : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '12px',
                  padding: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-xs"
                      style={{
                        background: `linear-gradient(135deg, ${card.color}, ${card.color}80)`,
                      }}
                    >
                      {card.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="ml-3">
                      <div className="text-white font-medium text-sm">{card.name}</div>
                      <div className="flex items-center">
                        <div
                          className="w-1.5 h-1.5 rounded-full mr-1.5"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="text-xs" style={{ color: role.color }}>
                          {role.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-sm font-bold"
                      style={{ color: healthColor }}
                    >
                      {card.scorecard.healthScore}%
                    </div>
                    <div className="flex items-center text-xs text-white/50">
                      {card.scorecard.trajectory === 'positive' && (
                        <span className="text-green-400">↑</span>
                      )}
                      {card.scorecard.trajectory === 'negative' && (
                        <span className="text-red-400">↓</span>
                      )}
                      {card.scorecard.trajectory === 'stable' && (
                        <span className="text-blue-400">→</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Mini progress bars */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs text-white/50 mb-0.5">Balance</div>
                    <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${card.scorecard.balance}%`,
                          backgroundColor: card.color
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50 mb-0.5">Reciprocity</div>
                    <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${card.scorecard.reciprocity}%`,
                          backgroundColor: card.color
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50 mb-0.5">Frequency</div>
                    <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${card.scorecard.frequency}%`,
                          backgroundColor: card.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Handle empty cards array
  if (!cards || cards.length === 0) {
    return (
      <div className="w-full text-center py-12">
        <p style={{ color: '#A0A0B0', fontSize: '16px' }}>
          No relationship cards available. Analyzing your connections...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => {
          const role = getRelationshipRole(card.role);
          const isSelected = selectedCardId === card.id;
          const isHovered = hoveredCard === card.id;
          const healthColor = getHealthScoreColor(card.scorecard.healthScore);
          const healthLabel = getHealthScoreLabel(card.scorecard.healthScore);
          const primaryEmotion = LOVE_EMOTIONS[card.emotionalProfile.primaryEmotion as keyof typeof LOVE_EMOTIONS];

          return (
            <div
              key={card.id}
              className="relative cursor-pointer"
              onClick={() => handleCardClick(card)}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                transform: isHovered || isSelected ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Card Container with luminous design */}
              <div
                className="relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(16, 23, 42, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)`,
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: `1px solid ${isHovered || isSelected ? `${card.color}60` : 'rgba(255, 255, 255, 0.05)'}`,
                  borderRadius: '24px',
                  boxShadow: isHovered || isSelected 
                    ? `0 0 30px ${card.color}40, 0 0 60px ${card.color}20, 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 20px ${card.color}10`
                    : '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.01)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Multiple gradient overlays for depth */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${card.color}15 0%, transparent 50%, ${card.color}08 100%)`,
                    opacity: isHovered ? 0.4 : 0.2,
                    transition: 'opacity 0.4s ease'
                  }}
                />
                
                {/* Luminous glow effect */}
                <div 
                  className="absolute -inset-6 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${card.color}20 0%, transparent 70%)`,
                    opacity: isHovered || isSelected ? 1 : 0,
                    transition: 'opacity 0.6s ease',
                    filter: 'blur(40px)'
                  }}
                />

                {/* Header Section */}
                <div className="relative p-6 pb-4">
                  {/* Avatar/Portrait Area */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      {/* Luminous Avatar with glow ring */}
                      <div className="relative">
                        {/* Glow ring */}
                        <div
                          className="absolute -inset-2 rounded-full"
                          style={{
                            background: `radial-gradient(circle, ${card.color}40 0%, transparent 70%)`,
                            filter: 'blur(12px)',
                            opacity: isHovered ? 1 : 0.6,
                            transition: 'opacity 0.4s ease',
                            animation: isSelected ? 'pulse 2s ease-in-out infinite' : 'none'
                          }}
                        />
                        
                        {/* Avatar */}
                        <div
                          className="relative w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl"
                          style={{
                            background: `linear-gradient(135deg, ${card.color}, ${card.color}90)`,
                            boxShadow: `0 0 20px ${card.color}60, 0 4px 16px rgba(0, 0, 0, 0.3)`,
                            border: `2px solid ${card.color}40`,
                            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                            transition: 'transform 0.3s ease'
                          }}
                        >
                        {card.avatar ? (
                          <img 
                            src={card.avatar} 
                            alt={card.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                          ) : (
                            <span style={{ letterSpacing: '2px' }}>
                              {card.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Luminous Health Score Display */}
                      <div className="ml-5">
                        <div 
                          className="text-xs font-semibold mb-1 uppercase tracking-wider"
                          style={{ 
                            color: healthColor,
                            textShadow: `0 0 10px ${healthColor}60`,
                            opacity: 0.9
                          }}
                        >
                          {healthLabel}
                        </div>
                        <div
                          className="text-3xl font-black"
                          style={{ 
                            color: healthColor,
                            textShadow: `0 0 20px ${healthColor}80, 0 0 40px ${healthColor}40`,
                            letterSpacing: '-1px'
                          }}
                        >
                          {card.scorecard.healthScore}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Name and Role with luminous styling */}
                  <div className="mb-4">
                    <h3 
                      className="text-xl font-bold mb-2"
                      style={{ 
                        color: '#F0F0F0',
                        letterSpacing: '0.5px',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {card.name}
                    </h3>
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ 
                          backgroundColor: role.color,
                          boxShadow: `0 0 8px ${role.color}80, 0 0 16px ${role.color}40`,
                          animation: 'pulse 3s ease-in-out infinite'
                        }}
                      />
                      <span 
                        className="text-sm font-semibold uppercase tracking-wide"
                        style={{ 
                          color: role.color,
                          textShadow: `0 0 10px ${role.color}60`,
                          letterSpacing: '1px'
                        }}
                      >
                        {role.name}
                      </span>
                    </div>
                  </div>

                  {/* Personality Description with better styling */}
                  <p 
                    className="text-sm leading-relaxed line-clamp-3"
                    style={{ 
                      color: '#A0A0B0',
                      letterSpacing: '0.2px',
                      lineHeight: '1.6'
                    }}
                  >
                    {card.personality}
                  </p>
                </div>

                {/* Scorecard Section */}
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* Balance with luminous progress */}
                    <div className="text-center">
                      <div 
                        className="text-xs font-semibold mb-2 uppercase tracking-wider"
                        style={{ color: '#A0A0B0' }}
                      >
                        Balance
                      </div>
                      <div className="relative w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                      >
                        {/* Glow effect */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${card.scorecard.balance}%`,
                            background: `linear-gradient(90deg, ${card.color}40 0%, ${card.color}60 50%, ${card.color}40 100%)`,
                            filter: 'blur(4px)',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                        {/* Main bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${card.scorecard.balance}%`,
                            background: `linear-gradient(90deg, ${card.color} 0%, ${card.color}CC 100%)`,
                            boxShadow: `0 0 10px ${card.color}80`,
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                        {/* Animated shine */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full opacity-50"
                          style={{
                            width: `${card.scorecard.balance}%`,
                            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
                            animation: 'shimmer 3s ease-in-out infinite'
                          }}
                        />
                      </div>
                      <div 
                        className="text-xs font-bold mt-1"
                        style={{ 
                          color: card.color,
                          textShadow: `0 0 8px ${card.color}60`
                        }}
                      >
                        {card.scorecard.balance}%
                      </div>
                    </div>

                    {/* Reciprocity with luminous progress */}
                    <div className="text-center">
                      <div 
                        className="text-xs font-semibold mb-2 uppercase tracking-wider"
                        style={{ color: '#A0A0B0' }}
                      >
                        Reciprocity
                      </div>
                      <div className="relative w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${card.scorecard.reciprocity}%`,
                            background: `linear-gradient(90deg, ${card.color}40 0%, ${card.color}60 50%, ${card.color}40 100%)`,
                            filter: 'blur(4px)',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${card.scorecard.reciprocity}%`,
                            background: `linear-gradient(90deg, ${card.color} 0%, ${card.color}CC 100%)`,
                            boxShadow: `0 0 10px ${card.color}80`,
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full opacity-50"
                          style={{
                            width: `${card.scorecard.reciprocity}%`,
                            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
                            animation: 'shimmer 3s ease-in-out infinite 0.5s'
                          }}
                        />
                      </div>
                      <div 
                        className="text-xs font-bold mt-1"
                        style={{ 
                          color: card.color,
                          textShadow: `0 0 8px ${card.color}60`
                        }}
                      >
                        {card.scorecard.reciprocity}%
                      </div>
                    </div>

                    {/* Frequency with luminous progress */}
                    <div className="text-center">
                      <div 
                        className="text-xs font-semibold mb-2 uppercase tracking-wider"
                        style={{ color: '#A0A0B0' }}
                      >
                        Frequency
                      </div>
                      <div className="relative w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${card.scorecard.frequency}%`,
                            background: `linear-gradient(90deg, ${card.color}40 0%, ${card.color}60 50%, ${card.color}40 100%)`,
                            filter: 'blur(4px)',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${card.scorecard.frequency}%`,
                            background: `linear-gradient(90deg, ${card.color} 0%, ${card.color}CC 100%)`,
                            boxShadow: `0 0 10px ${card.color}80`,
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full opacity-50"
                          style={{
                            width: `${card.scorecard.frequency}%`,
                            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
                            animation: 'shimmer 3s ease-in-out infinite 1s'
                          }}
                        />
                      </div>
                      <div 
                        className="text-xs font-bold mt-1"
                        style={{ 
                          color: card.color,
                          textShadow: `0 0 8px ${card.color}60`
                        }}
                      >
                        {card.scorecard.frequency}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Section with enhanced styling */}
                <div 
                  className="px-6 py-4"
                  style={{ 
                    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.4) 100%)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      {primaryEmotion && (
                        <>
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ 
                              backgroundColor: primaryEmotion.color,
                              boxShadow: `0 0 8px ${primaryEmotion.color}80`,
                              animation: 'pulse 4s ease-in-out infinite'
                            }}
                          />
                          <span 
                            className="text-sm font-semibold"
                            style={{ 
                              color: primaryEmotion.color,
                              textShadow: `0 0 8px ${primaryEmotion.color}40`
                            }}
                          >
                            {primaryEmotion.name}
                          </span>
                        </>
                      )}
                    </div>
                    <div 
                      className="text-sm font-medium"
                      style={{ color: '#A0A0B0' }}
                    >
                      <span style={{ color: card.color, fontWeight: 'bold' }}>
                        {formatResponseTime(card.recentActivity.averageResponseTime)}
                      </span> avg
                    </div>
                  </div>

                  {/* Trajectory Indicator with luminous styling */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span 
                        className="text-xs font-semibold uppercase tracking-wider mr-3"
                        style={{ color: '#A0A0B0' }}
                      >
                        Trajectory:
                      </span>
                      <div className="flex items-center">
                        {card.scorecard.trajectory === 'positive' && (
                          <>
                            <svg width="16" height="16" viewBox="0 0 16 16" className="mr-2">
                              <path 
                                d="M8 3 L12 8 L10 8 L10 13 L6 13 L6 8 L4 8 Z" 
                                fill="#10B981"
                                style={{ filter: 'drop-shadow(0 0 4px #10B98180)' }}
                              />
                            </svg>
                            <span 
                              className="text-sm font-bold"
                              style={{ 
                                color: '#10B981',
                                textShadow: '0 0 8px #10B98160'
                              }}
                            >
                              Growing
                            </span>
                          </>
                        )}
                        {card.scorecard.trajectory === 'negative' && (
                          <>
                            <svg width="16" height="16" viewBox="0 0 16 16" className="mr-2">
                              <path 
                                d="M8 13 L12 8 L10 8 L10 3 L6 3 L6 8 L4 8 Z" 
                                fill="#EF4444"
                                style={{ filter: 'drop-shadow(0 0 4px #EF444480)' }}
                              />
                            </svg>
                            <span 
                              className="text-sm font-bold"
                              style={{ 
                                color: '#EF4444',
                                textShadow: '0 0 8px #EF444460'
                              }}
                            >
                              Declining
                            </span>
                          </>
                        )}
                        {card.scorecard.trajectory === 'stable' && (
                          <>
                            <div 
                              className="w-4 h-2 rounded-full mr-2"
                              style={{ 
                                backgroundColor: '#3B82F6',
                                boxShadow: '0 0 8px #3B82F680'
                              }}
                            />
                            <span 
                              className="text-sm font-bold"
                              style={{ 
                                color: '#3B82F6',
                                textShadow: '0 0 8px #3B82F660'
                              }}
                            >
                              Stable
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div 
                      className="text-sm font-bold"
                      style={{ 
                        color: card.color,
                        textShadow: `0 0 8px ${card.color}60`
                      }}
                    >
                      {card.recentActivity.messageCount} msgs
                    </div>
                  </div>
                  
                  {/* Deep Insights Button with luminous design */}
                  {onDeepInsightsClick && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeepInsightsClick(card);
                        }}
                        className="w-full relative overflow-hidden group"
                        style={{
                          padding: '12px 20px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(0, 245, 212, 0.08)',
                          border: '1px solid rgba(0, 245, 212, 0.2)',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 245, 212, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 245, 212, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 245, 212, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.2)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Glow effect */}
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                          style={{
                            background: 'radial-gradient(circle at center, rgba(0, 245, 212, 0.2) 0%, transparent 70%)',
                            filter: 'blur(20px)'
                          }}
                        />
                        
                        {/* Button content */}
                        <div className="relative flex items-center justify-center">
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 16 16" 
                            className="mr-2"
                            style={{ filter: 'drop-shadow(0 0 4px rgba(0, 245, 212, 0.6))' }}
                          >
                            <path 
                              d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M15 13a1 1 0 0 0-1-1h-1.07a6 6 0 0 0-10.86 0H1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1z" 
                              fill="#00F5D4"
                            />
                          </svg>
                          <span 
                            className="text-sm font-bold uppercase tracking-wider"
                            style={{ 
                              color: '#00F5D4',
                              textShadow: '0 0 10px rgba(0, 245, 212, 0.6)',
                              letterSpacing: '1.5px'
                            }}
                          >
                            Deep Conversation Insights
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div 
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: card.color,
                      boxShadow: `0 0 12px ${card.color}60`
                    }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {cards.length > 0 && (
        <div className="mt-8 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{cards.length}</div>
              <div className="text-sm text-white/60">Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {cards.filter(c => c.scorecard.healthScore >= 80).length}
              </div>
              <div className="text-sm text-white/60">Excellent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {cards.filter(c => c.scorecard.trajectory === 'positive').length}
              </div>
              <div className="text-sm text-white/60">Growing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white/70">
                {Math.round(cards.reduce((sum, c) => sum + c.scorecard.healthScore, 0) / cards.length)}%
              </div>
              <div className="text-sm text-white/60">Avg Health</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipCards;