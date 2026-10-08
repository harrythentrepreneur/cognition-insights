import React from 'react';
import { 
  getNavigationButtonBaseStyle, 
  getNavigationButtonActiveStyle, 
  getNavigationButtonInactiveStyle,
  navigationButtonIconStyle 
} from '../styles/navigation';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { type NavigationItem } from '../constants';

interface NavigationButtonProps {
  item: NavigationItem;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Reusable Navigation Button Component
 * 
 * Provides consistent styling and behavior for navigation items
 * with active/inactive states and smooth transitions.
 */
export const NavigationButton: React.FC<NavigationButtonProps> = ({ 
  item, 
  isActive, 
  onClick 
}) => {
  const baseStyle = getNavigationButtonBaseStyle(isActive);
  const stateStyle = isActive 
    ? getNavigationButtonActiveStyle() 
    : getNavigationButtonInactiveStyle();

  const IconComponent = item.icon;

  const handleHover = (e: React.MouseEvent, isEntering: boolean) => {
    if (isActive) return;
    
    const target = e.currentTarget as HTMLButtonElement;
    if (isEntering) {
      target.style.border = `1px solid ${DESIGN_TOKENS.colors.accent}`;
      target.style.color = DESIGN_TOKENS.colors.accent;
      target.style.backgroundColor = DESIGN_TOKENS.colors.accentLight;
      target.style.boxShadow = `0 0 10px ${DESIGN_TOKENS.colors.accentMedium}`;
    } else {
      target.style.border = `1px solid ${DESIGN_TOKENS.colors.border}`;
      target.style.color = DESIGN_TOKENS.colors.text;
      target.style.backgroundColor = DESIGN_TOKENS.colors.cardBg;
      target.style.boxShadow = `0 4px 15px ${DESIGN_TOKENS.colors.shadowLight}`;
    }
  };

  return (
    <button
      onClick={onClick}
      style={{
        ...baseStyle,
        ...stateStyle
      }}
      onMouseEnter={(e) => handleHover(e, true)}
      onMouseLeave={(e) => handleHover(e, false)}
      aria-pressed={isActive}
      aria-label={`Navigate to ${item.label} section`}
    >
      <span style={navigationButtonIconStyle}>
        <IconComponent />
      </span>
      {item.label}
    </button>
  );
}; 