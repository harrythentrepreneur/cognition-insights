'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

// ============================================================================
// CHANNEL DATA
// ============================================================================

interface ChannelDatum {
  id: string;
  name: string;
  icon: string;
  color: string;
  revenue: number;
  spend: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateTodaysChannelData(): ChannelDatum[] {
  const rng = seededRandom(20260324);
  return [
    { id: 'google',    name: 'Google Ads',    icon: '🔍', color: '#4285F4', revenue: 2340 + Math.round(rng() * 600), spend: 580 + Math.round(rng() * 100) },
    { id: 'facebook',  name: 'Facebook Ads',  icon: '📘', color: '#1877F2', revenue: 1847 + Math.round(rng() * 400), spend: 420 + Math.round(rng() * 80) },
    { id: 'email',     name: 'Email',         icon: '📧', color: '#06D6A0', revenue: 1520 + Math.round(rng() * 350), spend: 45 + Math.round(rng() * 15) },
    { id: 'instagram', name: 'Instagram Ads', icon: '📸', color: '#E1306C', revenue: 1120 + Math.round(rng() * 250), spend: 350 + Math.round(rng() * 70) },
    { id: 'tiktok',    name: 'TikTok Ads',    icon: '🎵', color: '#FE2C55', revenue: 980 + Math.round(rng() * 300), spend: 310 + Math.round(rng() * 60) },
    { id: 'organic',   name: 'Organic',       icon: '🌿', color: '#34D399', revenue: 890 + Math.round(rng() * 200), spend: 0 },
    { id: 'youtube',   name: 'YouTube Ads',   icon: '▶️',  color: '#FF0000', revenue: 640 + Math.round(rng() * 150), spend: 220 + Math.round(rng() * 50) },
    { id: 'direct',    name: 'Direct',        icon: '🔗', color: '#A78BFA', revenue: 430 + Math.round(rng() * 100), spend: 0 },
  ];
}

function fmtDollars(val: number): string {
  return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// ============================================================================
// D3 DONUT + GLOW VISUALIZATION
// ============================================================================

export function ChannelBreakdown() {
  const d3Container = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 900 });
  const [hovered, setHovered] = useState<string | null>(null);
  const data = useMemo(() => generateTodaysChannelData(), []);
  const totalRevenue = useMemo(() => data.reduce((s, d) => s + d.revenue, 0), [data]);

  const drawChart = useCallback(() => {
    if (!d3Container.current) return;

    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    const outerR = Math.min(width, height) * 0.32;
    const innerR = outerR * 0.58;
    const glowR = outerR * 1.6;

    // Cleanup
    const container = d3.select(d3Container.current);
    container.select('svg').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('overflow', 'visible')
      .style('background', 'transparent')
      .style('overflow', 'visible');

    const defs = svg.append('defs');

    // Glow filter for arcs
    const glowFilter = defs.append('filter')
      .attr('id', 'channel-glow')
      .attr('x', '-100%').attr('y', '-100%')
      .attr('width', '300%').attr('height', '300%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '12').attr('result', 'glow');
    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'glow');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Soft radial glow filter
    const softGlowFilter = defs.append('filter')
      .attr('id', 'soft-glow')
      .attr('x', '-200%').attr('y', '-200%')
      .attr('width', '500%').attr('height', '500%');
    softGlowFilter.append('feGaussianBlur').attr('stdDeviation', '40').attr('result', 'softGlow');

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Background ambient glow blobs (like the emotional circumplex)
    data.forEach((ch, i) => {
      const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
      const blobDist = outerR * 0.85;
      const blobX = Math.cos(angle) * blobDist;
      const blobY = Math.sin(angle) * blobDist;
      const pct = ch.revenue / totalRevenue;

      g.append('circle')
        .attr('cx', blobX)
        .attr('cy', blobY)
        .attr('r', 0)
        .style('fill', ch.color)
        .style('opacity', 0)
        .style('filter', 'url(#soft-glow)')
        .style('mix-blend-mode', 'screen')
        .transition()
        .delay(200 + i * 100)
        .duration(1800)
        .ease(d3.easeBackOut.overshoot(0.8))
        .attr('r', glowR * pct * 1.2 + 30)
        .style('opacity', 0.15 + pct * 0.2);
    });

    // D3 arc generator
    const arcGen = d3.arc<d3.PieArcDatum<ChannelDatum>>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .padAngle(0.02)
      .cornerRadius(6);

    const pie = d3.pie<ChannelDatum>()
      .value(d => d.revenue)
      .sort(null);

    const arcs = pie(data);

    // Draw arcs with animation
    const arcGroup = g.selectAll('.channel-arc')
      .data(arcs)
      .enter()
      .append('g')
      .attr('class', 'channel-arc');

    arcGroup.append('path')
      .attr('d', d => {
        // Start with zero-size arc for animation
        const startArc = d3.arc<d3.PieArcDatum<ChannelDatum>>()
          .innerRadius(innerR)
          .outerRadius(innerR)
          .padAngle(0.02)
          .cornerRadius(6);
        return startArc(d) || '';
      })
      .style('fill', d => d.data.color)
      .style('opacity', 0.85)
      .style('filter', 'url(#channel-glow)')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        setHovered(d.data.id);
        d3.select(this)
          .transition().duration(200)
          .style('opacity', 1)
          .attr('d', d3.arc<d3.PieArcDatum<ChannelDatum>>()
            .innerRadius(innerR - 4)
            .outerRadius(outerR + 8)
            .padAngle(0.02)
            .cornerRadius(6)(d) || '');
      })
      .on('mouseleave', function(event, d) {
        setHovered(null);
        d3.select(this)
          .transition().duration(300)
          .style('opacity', 0.85)
          .attr('d', arcGen(d) || '');
      })
      .transition()
      .delay((d, i) => 500 + i * 80)
      .duration(1200)
      .ease(d3.easeBackOut.overshoot(0.6))
      .attr('d', d => arcGen(d) || '');

    // Center text — total revenue
    const centerGroup = g.append('g').style('opacity', 0);
    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', -12)
      .style('fill', '#F0F0F0')
      .style('font-family', "'Lato', sans-serif")
      .style('font-size', '28px')
      .style('font-weight', '700')
      .style('letter-spacing', '-0.02em')
      .text(fmtDollars(totalRevenue));
    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 16)
      .style('fill', '#9CA3AF')
      .style('font-family', "'Lato', sans-serif")
      .style('font-size', '12px')
      .style('letter-spacing', '0.05em')
      .text("TODAY'S NET REV");
    centerGroup.transition()
      .delay(800).duration(800).style('opacity', 1);

    // Outer labels with lines
    const labelRadius = outerR + 40;
    arcs.forEach((d, i) => {
      const midAngle = (d.startAngle + d.endAngle) / 2;
      const x = Math.cos(midAngle - Math.PI / 2 + Math.PI / 2) * labelRadius;
      const y = Math.sin(midAngle - Math.PI / 2 + Math.PI / 2) * labelRadius;
      const pct = d.data.revenue / totalRevenue;
      const isRight = x > 0;

      // Connecting line
      const lineEndX = isRight ? x + 30 : x - 30;
      const arcEdgeX = Math.cos(midAngle - Math.PI / 2 + Math.PI / 2) * (outerR + 8);
      const arcEdgeY = Math.sin(midAngle - Math.PI / 2 + Math.PI / 2) * (outerR + 8);

      const lineGroup = g.append('g').style('opacity', 0);

      lineGroup.append('line')
        .attr('x1', arcEdgeX).attr('y1', arcEdgeY)
        .attr('x2', x).attr('y2', y)
        .style('stroke', d.data.color)
        .style('stroke-width', 1)
        .style('opacity', 0.4);
      lineGroup.append('line')
        .attr('x1', x).attr('y1', y)
        .attr('x2', lineEndX).attr('y2', y)
        .style('stroke', d.data.color)
        .style('stroke-width', 1)
        .style('opacity', 0.4);

      // Channel name
      lineGroup.append('text')
        .attr('x', lineEndX + (isRight ? 8 : -8))
        .attr('y', y - 8)
        .attr('text-anchor', isRight ? 'start' : 'end')
        .style('fill', '#F0F0F0')
        .style('font-family', "'Lato', sans-serif")
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text(`${d.data.icon} ${d.data.name}`);

      // Revenue + percentage
      lineGroup.append('text')
        .attr('x', lineEndX + (isRight ? 8 : -8))
        .attr('y', y + 10)
        .attr('text-anchor', isRight ? 'start' : 'end')
        .style('fill', d.data.color)
        .style('font-family', "'Lato', sans-serif")
        .style('font-size', '12px')
        .style('font-weight', '500')
        .text(`${fmtDollars(d.data.revenue)} · ${(pct * 100).toFixed(1)}%`);

      lineGroup.transition()
        .delay(1000 + i * 100)
        .duration(600)
        .style('opacity', 1);
    });

  }, [data, dimensions, totalRevenue]);

  // Resize
  useEffect(() => {
    const handleResize = () => {
      if (d3Container.current) {
        const w = d3Container.current.clientWidth;
        const newSize = Math.max(700, Math.min(1200, w));
        setDimensions({ width: newSize, height: newSize });
      }
    };
    const obs = new ResizeObserver(handleResize);
    if (d3Container.current) {
      obs.observe(d3Container.current);
      handleResize();
    }
    return () => obs.disconnect();
  }, []);

  // Draw
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (d3Container.current) {
        d3.select(d3Container.current).select('svg').remove();
      }
    };
  }, []);

  return (
    <div className="w-full flex justify-start" style={{ overflow: 'visible' }}>
      <div className="relative bg-black/50 backdrop-blur-xl rounded-3xl p-16" style={{ overflow: 'visible' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/40 rounded-3xl pointer-events-none" />
        <div
          ref={d3Container}
          className="relative"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            minWidth: dimensions.width,
            minHeight: dimensions.height,
            overflow: 'visible',
          }}
        />
      </div>
    </div>
  );
}
