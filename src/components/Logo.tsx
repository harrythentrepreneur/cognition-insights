'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'black';
}

export default function Logo({ className = '', size = 'medium', variant = 'default' }: LogoProps) {
  const sizeMap = {
    small: { height: '28px' }, // 70% of 40px
    medium: { height: '35px' }, // 70% of 50px  
    large: { height: '42px' } // 70% of 60px
  };

  const currentSize = sizeMap[size];

  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {/* Logo Image with Direct Glow */}
      <img 
        src={variant === 'black' ? "/logos/cognition.cv black font.svg" : "/logos/cognition.cv.svg"}
        alt="Cognition Logo"
        style={{
          height: currentSize.height,
          width: 'auto',
          objectFit: 'contain',
          borderRadius: '8px',
          flexShrink: 0,
          filter: variant === 'black' ? 'none' : 'drop-shadow(0 0 10px rgba(0, 245, 212, 0.1)) drop-shadow(0 0 1px rgba(0, 245, 212, 0.3))',
        }}
      />
    </div>
  );
} 