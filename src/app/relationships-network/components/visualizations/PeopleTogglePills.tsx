import React from 'react';
import { PEOPLE_DATA } from './RelationshipRadarChart';
import { useGhostingDetection } from '../../hooks/useGhostingDetection';
import { RelationshipCard } from '../../types';

interface PeopleTogglePillsProps {
  activePeople: Record<string, boolean>;
  togglePerson: (personId: string) => void;
  cards?: RelationshipCard[];
}

export const PeopleTogglePills: React.FC<PeopleTogglePillsProps> = ({
  activePeople,
  togglePerson,
  cards = []
}) => {
  const { isPersonGhosting } = useGhostingDetection({ cards });

  return (
    <div 
      className="flex justify-center items-center flex-wrap"
      style={{
        gap: '8px',
        padding: '0 20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {PEOPLE_DATA.map((person) => {
        const isActive = activePeople[person.id];
        const isGhosting = cards.some(card => card.name === person.name && isPersonGhosting(card.id));
        
        return (
          <button
            key={person.id}
            onClick={() => togglePerson(person.id)}
            className="flex items-center cursor-pointer"
            style={{
              backgroundColor: isActive ? `${person.color}15` : `${person.color}08`,
              border: `1px solid ${person.color}${isActive ? '60' : '30'}`,
              color: isActive ? person.color : `${person.color}80`,
              padding: '6px 14px',
              borderRadius: '18px',
              fontSize: '12px',
              fontWeight: isActive ? '500' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: isActive ? `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 12px ${person.color}30` : 'none',
              fontFamily: "'Lato', sans-serif",
              transition: 'all 0.3s ease',
              opacity: isActive ? '1' : '0.45',
              transform: isActive ? 'scale(1)' : 'scale(0.95)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = isActive ? 'scale(1)' : 'scale(0.95)';
            }}
          >
            {/* Color indicator dot with ghosting indicator */}
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: person.color,
                boxShadow: isActive ? `0 0 8px ${person.color}90, inset 0 0 4px ${person.color}` : 'none',
                opacity: isActive ? '1' : '0.55',
                flexShrink: '0',
                position: 'relative'
              }}
            >
              {isGhosting && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: '#EF4444',
                    border: '1px solid white'
                  }}
                />
              )}
            </div>
            
            {/* Name only */}
            <span>{person.name}</span>
            
            {/* Ghosting indicator */}
            {isGhosting && (
              <span style={{ fontSize: '10px', opacity: 0.7 }}>👻</span>
            )}
          </button>
        );
      })}
    </div>
  );
};