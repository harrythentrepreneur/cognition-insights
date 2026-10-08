'use client';

import React, { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  priority?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  className,
  style,
  loading = 'lazy',
  sizes,
  priority = false
}: OptimizedImageProps) {
  const [imgError, setImgError] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  
  // Reset error state when src changes
  useEffect(() => {
    setImgError(false);
    // Force re-render when src changes to prevent visual glitches
    setImageKey(prev => prev + 1);
  }, [src]);
  
  // Generate WebP path from original path
  const webpSrc = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  const finalSrc = imgError ? src : webpSrc;
  
  // No cache-busting needed - we'll use proper headers instead
  const imageSrc = finalSrc;
  
  return (
    <picture key={imageKey}>
      {!imgError && (
        <source 
          srcSet={webpSrc} 
          type="image/webp"
        />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        style={{
          ...style,
          // Ensure image doesn't flicker during load
          backgroundColor: 'transparent',
          transition: 'opacity 0.3s ease-in-out'
        }}
        loading={priority ? 'eager' : loading}
        sizes={sizes}
        onError={() => {
          if (!imgError) {
            setImgError(true);
          }
        }}
        // Force browser to treat each image as unique
        decoding="async"
      />
    </picture>
  );
}