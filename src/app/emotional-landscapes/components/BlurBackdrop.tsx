import React from 'react';
import { dashboardLayoutStyles } from '../styles/dashboard-layout';

interface BlurBackdropProps {
  position: 'logo' | 'hamburger';
}

/**
 * Blur backdrop component for logo and hamburger menu
 */
export const BlurBackdrop: React.FC<BlurBackdropProps> = ({ position }) => {
  const style = position === 'logo' 
    ? dashboardLayoutStyles.logoBlurBackdrop 
    : dashboardLayoutStyles.hamburgerBlurBackdrop;
  
  return <div style={style} />;
}; 