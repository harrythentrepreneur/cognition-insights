import React, { useEffect, useRef, CSSProperties } from 'react';
import * as d3 from 'd3';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface NetworkNode {
  id: string;
  name: string;
  group: 'self' | 'close' | 'frequent' | 'occasional';
  messageCount: number;
  relationshipStrength: number;
}

interface NetworkLink {
  source: string;
  target: string;
  value: number;
  messageCount: number;
}

interface NetworkDiagramProps {
  nodes?: NetworkNode[];
  links?: NetworkLink[];
}

const styles = {
  container: {
    width: '100%',
    height: '500px',
    backgroundColor: colors.surface,
    borderRadius: '12px',
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  } as CSSProperties,
  
  svg: {
    width: '100%',
    height: '100%',
  } as CSSProperties,
  
  tooltip: {
    position: 'absolute',
    padding: '12px',
    backgroundColor: 'rgba(35, 35, 64, 0.95)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    color: colors.text,
    fontSize: '0.875rem',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.3s',
    zIndex: 1000,
  } as CSSProperties,
  
  legend: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(35, 35, 64, 0.9)',
    padding: spacing.sm,
    borderRadius: '8px',
    fontSize: '0.75rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  } as CSSProperties,
  
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  } as CSSProperties,
};

export const NetworkDiagram: React.FC<NetworkDiagramProps> = ({ nodes = [], links = [] }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Default data if none provided
  const defaultNodes: NetworkNode[] = [
    { id: 'self', name: 'You', group: 'self', messageCount: 0, relationshipStrength: 1 },
    { id: 'person1', name: 'Alex', group: 'close', messageCount: 450, relationshipStrength: 0.9 },
    { id: 'person2', name: 'Sarah', group: 'close', messageCount: 380, relationshipStrength: 0.85 },
    { id: 'person3', name: 'Mike', group: 'frequent', messageCount: 220, relationshipStrength: 0.6 },
    { id: 'person4', name: 'Emma', group: 'frequent', messageCount: 180, relationshipStrength: 0.55 },
    { id: 'person5', name: 'David', group: 'occasional', messageCount: 90, relationshipStrength: 0.3 },
  ];
  
  const defaultLinks: NetworkLink[] = [
    { source: 'self', target: 'person1', value: 0.9, messageCount: 450 },
    { source: 'self', target: 'person2', value: 0.85, messageCount: 380 },
    { source: 'self', target: 'person3', value: 0.6, messageCount: 220 },
    { source: 'self', target: 'person4', value: 0.55, messageCount: 180 },
    { source: 'self', target: 'person5', value: 0.3, messageCount: 90 },
  ];
  
  const networkNodes = nodes.length > 0 ? nodes : defaultNodes;
  const networkLinks = links.length > 0 ? links : defaultLinks;
  
  // Validate links to ensure all source/target nodes exist
  const validatedLinks = networkLinks.filter(link => {
    const sourceExists = networkNodes.some(node => node.id === link.source);
    const targetExists = networkNodes.some(node => node.id === link.target);
    if (!sourceExists || !targetExists) {
      console.warn(`Link references non-existent node: source=${link.source}, target=${link.target}`);
      return false;
    }
    return true;
  });
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`);
    
    // Create container group
    const g = svg.append('g');
    
    // Color scale for groups
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['self', 'close', 'frequent', 'occasional'])
      .range([colors.accent, '#00D9CC', '#00B3A6', '#008F80']);
    
    // Size scale for nodes based on message count
    const sizeScale = d3.scaleLinear()
      .domain([0, d3.max(networkNodes, d => d.messageCount) || 500])
      .range([20, 50]);
    
    // Create force simulation
    const simulation = d3.forceSimulation(networkNodes as any)
      .force('link', d3.forceLink(validatedLinks as any)
        .id((d: any) => d.id)
        .distance((d: any) => 150 * (1 - d.value))
        .strength((d: any) => d.value))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.messageCount) + 5));
    
    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(validatedLinks)
      .join('line')
      .attr('stroke', colors.border)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value * 10));
    
    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(networkNodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', d => sizeScale(d.messageCount))
      .attr('fill', d => colorScale(d.group))
      .attr('stroke', colors.background)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', handleMouseOver)
      .on('mousemove', handleMouseMove)
      .on('mouseout', handleMouseOut);
    
    // Add labels to nodes
    node.append('text')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', d => sizeScale(d.messageCount) + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .style('font-size', '0.875rem')
      .style('font-family', fonts.body)
      .style('pointer-events', 'none');
    
    // Add central glow for self node
    const selfNode = node.filter(d => d.id === 'self');
    selfNode.select('circle')
      .style('filter', 'drop-shadow(0 0 20px rgba(0, 255, 230, 0.6))');
    
    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Tooltip functions
    function handleMouseOver(event: any, d: NetworkNode) {
      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '1';
        tooltipRef.current.innerHTML = `
          <strong>${d.name}</strong><br/>
          Messages: ${d.messageCount}<br/>
          Relationship: ${(d.relationshipStrength * 100).toFixed(0)}%<br/>
          Type: ${d.group.charAt(0).toUpperCase() + d.group.slice(1)}
        `;
      }
    }
    
    function handleMouseMove(event: any) {
      if (tooltipRef.current) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          tooltipRef.current.style.left = `${event.clientX - rect.left + 10}px`;
          tooltipRef.current.style.top = `${event.clientY - rect.top - 10}px`;
        }
      }
    }
    
    function handleMouseOut() {
      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
      }
    }
    
    // Zoom functionality
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom as any);
    
    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [networkNodes, validatedLinks]);
  
  return (
    <div style={styles.container}>
      <svg ref={svgRef} style={styles.svg} />
      <div ref={tooltipRef} style={styles.tooltip} />
      
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: colors.accent }} />
          <span>You</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#00D9CC' }} />
          <span>Close</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#00B3A6' }} />
          <span>Frequent</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#008F80' }} />
          <span>Occasional</span>
        </div>
      </div>
    </div>
  );
};