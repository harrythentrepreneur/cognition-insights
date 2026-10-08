import React, { useRef, useEffect, useState, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface MobileGesturesProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinchZoom?: (scale: number) => void;
  onPullRefresh?: () => void;
  enableSwipe?: boolean;
  enablePinch?: boolean;
  enablePullRefresh?: boolean;
  swipeThreshold?: number;
  pinchThreshold?: number;
}

interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    touchAction: 'pan-y pinch-zoom',
    overscrollBehavior: 'contain',
  } as CSSProperties,

  swipeIndicator: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0, 255, 230, 0.9)',
    color: colors.background,
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: '24px',
    fontSize: '0.875rem',
    fontWeight: 600,
    opacity: 0,
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
  } as CSSProperties,

  pullRefreshIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '40px',
    height: '40px',
    background: `linear-gradient(45deg, ${colors.accent}, ${colors.accent}80)`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.background,
    fontSize: '1.2rem',
    opacity: 0,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 100,
  } as CSSProperties,

  pullRefreshActive: {
    opacity: 1,
    transform: 'translateX(-50%) translateY(20px) scale(1.1)',
  } as CSSProperties,

  zoomContainer: {
    transform: 'scale(1)',
    transformOrigin: 'center center',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } as CSSProperties,
};

export const MobileGestures: React.FC<MobileGesturesProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onPinchZoom,
  onPullRefresh,
  enableSwipe = true,
  enablePinch = true,
  enablePullRefresh = true,
  swipeThreshold = 100,
  pinchThreshold = 0.2,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  const [startTouches, setStartTouches] = useState<TouchPoint[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showPullRefresh, setShowPullRefresh] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isZooming, setIsZooming] = useState(false);

  // Utility functions
  const getTouchPoints = (touchList: React.TouchList | TouchList): TouchPoint[] => {
    return Array.from(touchList as any).map((touch: any) => ({
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier,
    }));
  };

  const getDistance = (touch1: TouchPoint, touch2: TouchPoint): number => {
    return Math.sqrt(
      Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
    );
  };

  const getSwipeDirection = (start: TouchPoint, end: TouchPoint): string | null => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      return deltaX > 0 ? 'right' : 'left';
    }
    
    if (Math.abs(deltaY) > swipeThreshold) {
      return deltaY > 0 ? 'down' : 'up';
    }
    
    return null;
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touchPoints = getTouchPoints(e.touches);
    setTouches(touchPoints);
    setStartTouches(touchPoints);
    
    if (touchPoints.length === 2) {
      setIsZooming(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentTouches = getTouchPoints(e.touches);
    setTouches(currentTouches);

    // Handle pinch zoom
    if (enablePinch && currentTouches.length === 2 && startTouches.length === 2 && isZooming) {
      e.preventDefault();
      
      const currentDistance = getDistance(currentTouches[0], currentTouches[1]);
      const startDistance = getDistance(startTouches[0], startTouches[1]);
      
      if (startDistance > 0) {
        const scaleChange = currentDistance / startDistance;
        const newZoom = Math.max(0.5, Math.min(3, zoom * scaleChange));
        
        if (Math.abs(scaleChange - 1) > pinchThreshold) {
          setZoom(newZoom);
          onPinchZoom?.(newZoom);
        }
      }
    }

    // Handle pull to refresh
    if (enablePullRefresh && currentTouches.length === 1 && startTouches.length === 1) {
      const deltaY = currentTouches[0].y - startTouches[0].y;
      
      if (deltaY > 0 && window.scrollY === 0) {
        const distance = Math.min(deltaY, 100);
        setPullDistance(distance);
        setShowPullRefresh(distance > 50);
      }
    }

    // Handle swipe detection
    if (enableSwipe && currentTouches.length === 1 && startTouches.length === 1) {
      const direction = getSwipeDirection(startTouches[0], currentTouches[0]);
      
      if (direction && direction !== swipeDirection) {
        setSwipeDirection(direction);
        setShowSwipeIndicator(true);
        
        // Hide indicator after a moment
        setTimeout(() => {
          setShowSwipeIndicator(false);
        }, 1000);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endTouches = getTouchPoints(e.changedTouches);
    
    // Handle swipe completion
    if (enableSwipe && startTouches.length === 1 && swipeDirection) {
      const direction = getSwipeDirection(startTouches[0], touches[0] || endTouches[0]);
      
      if (direction === 'left') {
        onSwipeLeft?.();
      } else if (direction === 'right') {
        onSwipeRight?.();
      }
    }

    // Handle pull to refresh completion
    if (enablePullRefresh && pullDistance > 50) {
      onPullRefresh?.();
    }

    // Reset states
    setTouches([]);
    setStartTouches([]);
    setSwipeDirection(null);
    setPullDistance(0);
    setShowPullRefresh(false);
    setIsZooming(false);
  };

  const getSwipeIndicatorText = (): string => {
    switch (swipeDirection) {
      case 'left':
        return '← Next Chapter';
      case 'right':
        return 'Previous Chapter →';
      case 'up':
        return '↑ Scroll Up';
      case 'down':
        return '↓ Scroll Down';
      default:
        return '';
    }
  };

  // Haptic feedback (if available)
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[type]);
    }
  };

  useEffect(() => {
    if (showSwipeIndicator) {
      triggerHaptic('light');
    }
  }, [showSwipeIndicator]);

  useEffect(() => {
    if (showPullRefresh) {
      triggerHaptic('medium');
    }
  }, [showPullRefresh]);

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {enablePullRefresh && (
        <div
          style={{
            ...styles.pullRefreshIndicator,
            ...(showPullRefresh ? styles.pullRefreshActive : {}),
            transform: `translateX(-50%) translateY(${pullDistance / 2}px)`,
          }}
        >
          ↻
        </div>
      )}

      {/* Swipe direction indicator */}
      {enableSwipe && (
        <div
          style={{
            ...styles.swipeIndicator,
            opacity: showSwipeIndicator ? 1 : 0,
          }}
        >
          {getSwipeIndicatorText()}
        </div>
      )}

      {/* Content with zoom support */}
      <div
        style={{
          ...styles.zoomContainer,
          transform: `scale(${zoom})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};