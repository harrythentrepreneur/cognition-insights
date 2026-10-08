import React, { useRef, useEffect, useState, CSSProperties } from 'react';
import * as d3 from 'd3';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, spacing } = DESIGN_TOKENS;

interface PersonalityDimension {
  name: string;
  value: number;
  color: string;
  description: string;
}

interface Personality3DSphereProps {
  data: Record<string, number>;
  width?: number;
  height?: number;
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 230, 0.1) 0%, transparent 70%)',
    borderRadius: '20px',
    padding: spacing.xl,
  } as CSSProperties,

  title: {
    textAlign: 'center',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.lg,
    textShadow: `0 0 10px ${colors.accent}40`,
  } as CSSProperties,

  canvas: {
    display: 'block',
    margin: '0 auto',
    cursor: 'grab',
    borderRadius: '12px',
    boxShadow: `0 10px 30px rgba(0, 255, 230, 0.2)`,
  } as CSSProperties,

  canvasDragging: {
    cursor: 'grabbing',
  } as CSSProperties,

  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  } as CSSProperties,

  controlButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}40`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as CSSProperties,

  controlButtonActive: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
    boxShadow: `0 0 10px ${colors.accent}30`,
  } as CSSProperties,

  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    padding: spacing.sm,
    color: colors.text,
    fontSize: '0.875rem',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    maxWidth: '200px',
  } as CSSProperties,

  legendContainer: {
    marginTop: spacing.lg,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: spacing.sm,
  } as CSSProperties,

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: 'rgba(35, 35, 64, 0.3)',
    borderRadius: '6px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,

  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  } as CSSProperties,

  legendText: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    fontWeight: 500,
  } as CSSProperties,
};

export const Personality3DSphere: React.FC<Personality3DSphereProps> = ({
  data,
  width = 500,
  height = 500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PersonalityDimension | null>(null);

  // Define personality dimensions with colors
  const dimensions: PersonalityDimension[] = [
    { name: 'Openness', value: data.openness || 50, color: '#FF6B6B', description: 'Creativity and curiosity' },
    { name: 'Conscientiousness', value: data.conscientiousness || 50, color: '#4ECDC4', description: 'Organization and discipline' },
    { name: 'Extraversion', value: data.extraversion || 50, color: '#45B7D1', description: 'Social energy and assertiveness' },
    { name: 'Agreeableness', value: data.agreeableness || 50, color: '#96CEB4', description: 'Trust and cooperation' },
    { name: 'Neuroticism', value: data.neuroticism || 50, color: '#FFEAA7', description: 'Emotional stability' },
    { name: 'Empathy', value: data.empathy || 50, color: '#DDA0DD', description: 'Understanding others' },
    { name: 'Creativity', value: data.creativity || 50, color: '#FFB347', description: 'Innovation and imagination' },
    { name: 'Social Confidence', value: data.social_confidence || 50, color: '#98D8C8', description: 'Comfort in social situations' },
  ];

  // Convert 2D coordinates to 3D sphere coordinates
  const getSphericalCoordinates = (dimension: PersonalityDimension, index: number) => {
    const phi = Math.acos(-1 + (2 * index) / dimensions.length);
    const theta = Math.sqrt(dimensions.length * Math.PI) * phi;
    const radius = 100 + (dimension.value / 100) * 50; // Radius varies with value
    
    return {
      x: radius * Math.cos(theta) * Math.sin(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(phi),
    };
  };

  // Project 3D coordinates to 2D screen coordinates
  const project3DTo2D = (x: number, y: number, z: number, rotX: number, rotY: number) => {
    // Apply rotations
    const cosRotX = Math.cos(rotX);
    const sinRotX = Math.sin(rotX);
    const cosRotY = Math.cos(rotY);
    const sinRotY = Math.sin(rotY);

    // Rotate around X axis
    const y1 = y * cosRotX - z * sinRotX;
    const z1 = y * sinRotX + z * cosRotX;

    // Rotate around Y axis
    const x2 = x * cosRotY - z1 * sinRotY;
    const z2 = x * sinRotY + z1 * cosRotY;

    // Project to 2D
    const distance = 300;
    const scale = distance / (distance + z2);
    
    return {
      x: x2 * scale + width / 2,
      y: y1 * scale + height / 2,
      scale: scale,
      z: z2,
    };
  };

  // Render the 3D sphere
  const render = (rotX: number, rotY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate 3D positions for all dimensions
    const projectedPoints = dimensions.map((dimension, index) => {
      const coords = getSphericalCoordinates(dimension, index);
      const projected = project3DTo2D(coords.x, coords.y, coords.z, rotX, rotY);
      return { ...dimension, ...projected, originalCoords: coords };
    });

    // Sort by z-depth for proper rendering order
    projectedPoints.sort((a, b) => b.z - a.z);

    // Draw connecting lines (wireframe)
    ctx.strokeStyle = `${colors.accent}20`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i < projectedPoints.length; i++) {
      for (let j = i + 1; j < projectedPoints.length; j++) {
        const p1 = projectedPoints[i];
        const p2 = projectedPoints[j];
        const distance = Math.sqrt(
          Math.pow(p1.originalCoords.x - p2.originalCoords.x, 2) +
          Math.pow(p1.originalCoords.y - p2.originalCoords.y, 2) +
          Math.pow(p1.originalCoords.z - p2.originalCoords.z, 2)
        );
        
        if (distance < 150) { // Only connect nearby points
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
    }
    ctx.stroke();

    // Draw center sphere
    const centerGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, 80);
    centerGradient.addColorStop(0, `${colors.accent}10`);
    centerGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(width/2, height/2, 80, 0, Math.PI * 2);
    ctx.fill();

    // Draw personality dimensions as points
    projectedPoints.forEach((point) => {
      const radius = 8 + (point.value / 100) * 8; // Size varies with value
      const isSelected = selectedDimension === point.name;
      const isHovered = hoveredPoint?.name === point.name;
      
      // Create gradient for each point
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, point.color);
      gradient.addColorStop(1, `${point.color}80`);
      
      // Draw point
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * point.scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Add selection ring
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? colors.accent : `${colors.accent}80`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, (radius + 4) * point.scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Add label for prominent points
      if (point.scale > 0.7) {
        ctx.fillStyle = colors.text;
        ctx.font = `${10 * point.scale}px Inter`;
        ctx.textAlign = 'center';
        ctx.fillText(point.name, point.x, point.y + radius + 15);
      }
    });
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (isAutoRotating && !isDragging) {
        setRotation(prev => ({
          x: prev.x + 0.005,
          y: prev.y + 0.01,
        }));
      }
      
      render(rotation.x, rotation.y);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rotation, isAutoRotating, isDragging, selectedDimension, hoveredPoint]);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startRotation = { ...rotation };
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      setRotation({
        x: startRotation.x + deltaY * 0.01,
        y: startRotation.y + deltaX * 0.01,
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if mouse is over any dimension point
    const projectedPoints = dimensions.map((dimension, index) => {
      const coords = getSphericalCoordinates(dimension, index);
      const projected = project3DTo2D(coords.x, coords.y, coords.z, rotation.x, rotation.y);
      return { ...dimension, ...projected };
    });
    
    let foundHover = false;
    for (const point of projectedPoints) {
      const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
      const radius = (8 + (point.value / 100) * 8) * point.scale;
      
      if (distance <= radius) {
        setHoveredPoint(point);
        foundHover = true;
        
        // Position tooltip
        if (tooltipRef.current) {
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY - 10}px`;
          tooltipRef.current.style.opacity = '1';
        }
        break;
      }
    }
    
    if (!foundHover) {
      setHoveredPoint(null);
      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hoveredPoint) {
      setSelectedDimension(selectedDimension === hoveredPoint.name ? null : hoveredPoint.name);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>3D Personality Sphere</h3>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          ...styles.canvas,
          ...(isDragging ? styles.canvasDragging : {}),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      
      {/* Tooltip */}
      <div ref={tooltipRef} style={styles.tooltip}>
        {hoveredPoint && (
          <>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              {hoveredPoint.name}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              {hoveredPoint.description}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.accent }}>
              Score: {hoveredPoint.value}%
            </div>
          </>
        )}
      </div>
      
      {/* Controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.controlButton,
            ...(isAutoRotating ? styles.controlButtonActive : {}),
          }}
          onClick={() => setIsAutoRotating(!isAutoRotating)}
        >
          {isAutoRotating ? 'Pause' : 'Auto Rotate'}
        </button>
        <button
          style={styles.controlButton}
          onClick={() => setRotation({ x: 0, y: 0 })}
        >
          Reset View
        </button>
        <button
          style={styles.controlButton}
          onClick={() => setSelectedDimension(null)}
        >
          Clear Selection
        </button>
      </div>
      
      {/* Legend */}
      <div style={styles.legendContainer}>
        {dimensions.map((dimension) => (
          <div
            key={dimension.name}
            style={{
              ...styles.legendItem,
              opacity: selectedDimension ? (selectedDimension === dimension.name ? 1 : 0.5) : 1,
            }}
          >
            <div
              style={{
                ...styles.legendColor,
                backgroundColor: dimension.color,
              }}
            />
            <div style={styles.legendText}>
              {dimension.name}: {dimension.value}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};