import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Define all emotions from the EmotionTimeline component
const EMOTIONS = [
  { id: 'joy', name: 'Joy', color: '#FFD700' },
  { id: 'sadness', name: 'Sadness', color: '#00D4FF' },
  { id: 'anger', name: 'Anger', color: '#FF4757' },
  { id: 'fear', name: 'Fear', color: '#8B5CF6' },
  { id: 'surprise', name: 'Surprise', color: '#F59E0B' },
  { id: 'love', name: 'Love', color: '#FF6B9D' },
  { id: 'disgust', name: 'Disgust', color: '#10B981' },
  { id: 'anticipation', name: 'Anticipation', color: '#9D4EDD' },
  { id: 'trust', name: 'Trust', color: '#06D6A0' },
  { id: 'confusion', name: 'Confusion', color: '#FB8500' },
  { id: 'excitement', name: 'Excitement', color: '#FF006E' },
  { id: 'calm', name: 'Calm', color: '#4ECDC4' },
  { id: 'hope', name: 'Hope', color: '#45B7D1' },
  { id: 'frustration', name: 'Frustration', color: '#E74C3C' },
  { id: 'gratitude', name: 'Gratitude', color: '#F39C12' },
  { id: 'compassion', name: 'Compassion', color: '#A855F7' }
];

// Generate mock data for multiple years (3 years of data) - weekly aggregated
const generateYearData = (emotionId: string) => {
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getFullYear() - 3, 0, 1); // Start 3 years ago

  // Generate weekly data instead of daily
  let currentWeek = d3.timeWeek(startDate);
  const endWeek = d3.timeWeek(today);

  while (currentWeek <= endWeek) {
    const intensity = Math.random();
    data.push({
      date: new Date(currentWeek),
      intensity: intensity,
      level: Math.floor(intensity * 5), // 0-4 intensity levels
      emotion: emotionId
    });
    currentWeek = d3.timeWeek.offset(currentWeek, 1);
  }
  return data;
};

interface EmotionHeatmapProps {
  sessionId?: string;
  useMockData?: boolean;
  emotionData?: { [key: string]: Array<{ date: Date; intensity: number }> };
  fixedEmotion?: string; // New prop to lock to a specific emotion
  fillParent?: boolean; // NEW PROP
  hideLegend?: boolean; // NEW PROP to hide the legend/key
}

const EmotionHeatmap: React.FC<EmotionHeatmapProps> = ({
  sessionId = 'mock-session',
  useMockData = false,
  emotionData,
  fixedEmotion,
  fillParent = false, // NEW PROP
  hideLegend = false // NEW PROP to hide the legend/key
}) => {
  const [selectedEmotion, setSelectedEmotion] = useState(
    fixedEmotion || EMOTIONS[0].id
  );
  const [heatmapData, setHeatmapData] = useState(() => generateYearData(selectedEmotion));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400 });

  // Handle fixedEmotion prop
  useEffect(() => {
    if (fixedEmotion && EMOTIONS.find(e => e.id === fixedEmotion)) {
      setSelectedEmotion(fixedEmotion);
    }
  }, [fixedEmotion]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update data when emotion changes
  useEffect(() => {
    if (useMockData) {
      setHeatmapData(generateYearData(selectedEmotion));
    } else if (emotionData && emotionData[selectedEmotion]) {
      setHeatmapData(emotionData[selectedEmotion].map(d => ({
        ...d,
        level: Math.floor(d.intensity * 5),
        emotion: selectedEmotion
      })));
    }
  }, [selectedEmotion, useMockData, emotionData]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        setContainerSize({ width: svgRef.current.parentElement.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
      handleResize();
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !heatmapData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Get the actual container width with proper constraints
    const parentWidth = svgRef.current?.parentElement?.clientWidth || 400;
    const parentHeight = svgRef.current?.parentElement?.clientHeight || 300;

    // When fillParent is true, be more aggressive with sizing
    const containerWidth = fillParent ? parentWidth - 20 : Math.min(parentWidth, 600); // Reduce constraint when fillParent
    const maxWidth = fillParent ? containerWidth - 20 : containerWidth - 80; // Less conservative padding when fillParent

    // Adjust margins based on fillParent
    const margin = fillParent
      ? { top: 10, right: 10, bottom: 40, left: 10 } // Smaller margins when fillParent
      : { top: 20, right: 20, bottom: 60, left: 20 };

    const availableWidth = maxWidth - margin.left - margin.right;

    // More generous cell sizing when fillParent is true
    const cellSize = fillParent
      ? Math.max(18, Math.min(30, availableWidth / 14)) // Moderate increase - balanced size that won't clip
      : Math.max(14, Math.min(20, availableWidth / 14)); // Moderate increase for standalone

    const cellPadding = fillParent ? 3 : 2; // Slightly more padding between cells when bigger
    const weeksPerCol = 4; // 4 weeks per column (filling vertically first)

    const emotion = EMOTIONS.find(e => e.id === selectedEmotion)!;

    // Create color scale
    const colorScale = d3.scaleSequential()
      .domain([0, 4])
      .interpolator((t) => {
        if (t === 0) return 'rgba(255, 255, 255, 0.05)';
        const baseColor = d3.color(emotion.color)!;
        return baseColor.copy({ opacity: 0.3 + (t * 0.7) }).toString();
      });

    // Group weeks by year (52 weeks per year)
    const yearBlocks = [];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 2; year <= currentYear; year++) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearWeeks = heatmapData.filter(weekData => {
        return weekData.date >= yearStart && weekData.date <= yearEnd;
      }).slice(0, 52); // Exactly 52 weeks per year

      if (yearWeeks.length > 0) {
        yearBlocks.push({
          year: year,
          weeks: yearWeeks
        });
      }
    }

    // Calculate total height including year separators
    const rowHeight = cellSize + cellPadding;
    const weeksPerYear = 52;
    const colsPerYear = Math.ceil(weeksPerYear / weeksPerCol);
    const totalRows = weeksPerCol; // Fixed number of rows (4)
    const yearSeparatorHeight = fillParent ? 30 : 40; // Smaller separators when fillParent
    const totalYearBlocks = yearBlocks.length;
    const height = (totalYearBlocks * totalRows * rowHeight) + ((totalYearBlocks - 1) * yearSeparatorHeight) + margin.top + margin.bottom;

    // Set SVG dimensions with proper constraints
    const svgWidth = fillParent
      ? containerWidth // Use full container width when fillParent
      : Math.min(containerWidth, colsPerYear * (cellSize + cellPadding) + margin.left + margin.right + 40);

    const svgHeight = fillParent ? Math.min(height, parentHeight) : height;

    svg.attr('width', svgWidth);
    svg.attr('height', svgHeight);

    // Calculate actual grid dimensions for centering
    const actualGridWidth = colsPerYear * (cellSize + cellPadding);
    const availableGridSpace = svgWidth - margin.left - margin.right;

    // Center the grid when fillParent is true
    const gridOffsetX = fillParent ? Math.max(0, (availableGridSpace - actualGridWidth) / 2) : 0;

    // Create main container with centering offset
    const container = svg.append('g')
      .attr('transform', `translate(${margin.left + gridOffsetX}, ${margin.top})`);

    // Create tooltip
    const tooltip = d3.select('body').selectAll('.heatmap-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'heatmap-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(26, 26, 46, 0.95)')
      .style('color', '#F0F0F0')
      .style('padding', '8px 12px')
      .style('border-radius', '8px')
      .style('font-family', "'Lato', sans-serif")
      .style('font-size', '12px')
      .style('border', '1px solid rgba(255, 255, 255, 0.1)')
      .style('backdrop-filter', 'blur(10px)')
      .style('pointer-events', 'none')
      .style('z-index', 1000)
      .style('max-width', '200px')
      .style('word-wrap', 'break-word');

    let currentY = 0;

    // Draw each year block
    yearBlocks.forEach((yearBlock, yearIndex) => {
      // Add year separator (except for first year)
      if (yearIndex > 0) {
        container.append('text')
          .attr('x', actualGridWidth / 2)
          .attr('y', currentY + (fillParent ? 15 : 20)) // Smaller spacing when fillParent
          .attr('text-anchor', 'middle')
          .style('fill', '#A0A0B0')
          .style('font-family', "'Lato', sans-serif")
          .style('font-size', fillParent ? '11px' : '12px') // Slightly smaller text when fillParent
          .style('font-weight', '400')
          .style('opacity', '0.8')
          .text(yearBlock.year.toString());

        currentY += yearSeparatorHeight;
      } else {
        // Add year label for first year too
        container.append('text')
          .attr('x', actualGridWidth / 2)
          .attr('y', currentY + (fillParent ? 12 : 15)) // Smaller spacing when fillParent
          .attr('text-anchor', 'middle')
          .style('fill', '#A0A0B0')
          .style('font-family', "'Lato', sans-serif")
          .style('font-size', fillParent ? '11px' : '12px') // Slightly smaller text when fillParent
          .style('font-weight', '400')
          .style('opacity', '0.8')
          .text(yearBlock.year.toString());

        currentY += fillParent ? 20 : 25; // Smaller spacing when fillParent
      }

      // Draw weeks for this year in a grid (vertically first)
      yearBlock.weeks.forEach((weekData, weekIndex) => {
        const row = weekIndex % weeksPerCol; // Fill vertically first
        const col = Math.floor(weekIndex / weeksPerCol); // Move to next column after filling vertically

        const x = col * (cellSize + cellPadding);
        const y = currentY + (row * rowHeight);

        container.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('rx', fillParent ? 4 : 3) // Slightly more rounded when bigger
          .style('fill', colorScale(weekData.level))
          .style('stroke', 'rgba(255, 255, 255, 0.1)')
          .style('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .on('mouseover', function (event) {
            d3.select(this)
              .style('stroke', emotion.color)
              .style('stroke-width', 2);

            const weekEnd = d3.timeWeek.offset(weekData.date, 1);

            tooltip
              .style('visibility', 'visible')
              .html(`
                <div style="font-weight: 500; margin-bottom: 4px;">
                  Week of ${weekData.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
                </div>
                <div style="color: ${emotion.color};">
                  ${emotion.name}: ${(weekData.intensity * 100).toFixed(0)}%
                </div>
              `);
          })
          .on('mousemove', function (event) {
            const tooltipWidth = 200; // Max width we set
            const tooltipHeight = 60; // Approximate height
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.pageX + 10;
            let top = event.pageY - 10;

            // Prevent tooltip from going beyond right edge
            if (left + tooltipWidth > viewportWidth) {
              left = event.pageX - tooltipWidth - 10;
            }

            // Prevent tooltip from going beyond bottom edge
            if (top + tooltipHeight > viewportHeight) {
              top = event.pageY - tooltipHeight - 10;
            }

            // Ensure tooltip doesn't go beyond left edge
            left = Math.max(10, left);

            // Ensure tooltip doesn't go beyond top edge
            top = Math.max(10, top);

            tooltip
              .style('left', left + 'px')
              .style('top', top + 'px');
          })
          .on('mouseout', function () {
            d3.select(this)
              .style('stroke', 'rgba(255, 255, 255, 0.1)')
              .style('stroke-width', 0.5);

            tooltip.style('visibility', 'hidden');
          });
      });

      // Update currentY for next year block
      currentY += weeksPerCol * rowHeight;
    });

    // Add legend at the bottom - constrained within the grid width
    if (!hideLegend) {
      const legendData = [0, 1, 2, 3, 4];
      const legendCellSize = fillParent ? Math.min(cellSize, 16) : cellSize; // Cap legend cell size
      const legendWidth = legendData.length * (legendCellSize + 1) + 40;
      const legendX = Math.max(0, actualGridWidth - legendWidth);

      const legend = container.append('g')
        .attr('transform', `translate(${legendX}, ${currentY + (fillParent ? 15 : 20)})`); // Smaller spacing when fillParent

      legend.append('text')
        .attr('x', -30)
        .attr('y', -5)
        .style('fill', '#A0A0B0')
        .style('font-family', "'Lato', sans-serif")
        .style('font-size', fillParent ? '9px' : '10px') // Slightly smaller when fillParent
        .text('Less');

      legend.selectAll('.legend-cell')
        .data(legendData)
        .enter()
        .append('rect')
        .attr('class', 'legend-cell')
        .attr('x', (d, i) => i * (legendCellSize + 1))
        .attr('y', 0)
        .attr('width', legendCellSize)
        .attr('height', legendCellSize)
        .attr('rx', 2)
        .style('fill', d => colorScale(d))
        .style('stroke', 'rgba(255, 255, 255, 0.1)')
        .style('stroke-width', 0.5);

      legend.append('text')
        .attr('x', legendData.length * (legendCellSize + 1) + 5)
        .attr('y', legendCellSize / 2)
        .attr('dy', '0.35em')
        .style('fill', '#A0A0B0')
        .style('font-family', "'Lato', sans-serif")
        .style('font-size', fillParent ? '9px' : '10px') // Slightly smaller when fillParent
        .text('More');
    }

  }, [heatmapData, selectedEmotion, containerSize, fillParent, hideLegend]); // Add hideLegend to dependencies

  const selectedEmotionObj = EMOTIONS.find(e => e.id === selectedEmotion)!;

  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotion(emotionId);
    setIsDropdownOpen(false);
  };

  return (
    <div
      className="w-full max-w-full overflow-hidden"
      style={{
        maxWidth: '100%',
        boxSizing: 'border-box',
        width: fillParent ? '100%' : undefined,
        height: fillParent ? '100%' : undefined,
        flex: fillParent ? 1 : undefined,
        display: fillParent ? 'flex' : undefined,
        flexDirection: fillParent ? 'column' : undefined
      }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Emotion Selector Dropdown - Clean minimal design */}
      {!fixedEmotion ? (
        <div className="mb-6 max-w-full overflow-hidden">
          <div ref={dropdownRef} className="relative max-w-full">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                padding: '8px 0',
                color: selectedEmotionObj.color,
                fontSize: '16px',
                fontFamily: "'Lato', sans-serif",
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                width: 'auto',
                position: 'relative',
                maxWidth: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = `drop-shadow(0 0 8px ${selectedEmotionObj.color}60)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: selectedEmotionObj.color,
                  filter: `drop-shadow(0 0 6px ${selectedEmotionObj.color}90)`,
                  flexShrink: 0
                }}
              />
              <span>{selectedEmotionObj.name}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  opacity: 0.7
                }}
              >
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  right: 'auto',
                  backgroundColor: 'rgba(26, 26, 46, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 245, 212, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 245, 212, 0.1)',
                  zIndex: 1000,
                  minWidth: '180px',
                  maxWidth: 'calc(100vw - 40px)',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                <div style={{ padding: '8px' }}>
                  {EMOTIONS.map(emotion => (
                    <button
                      key={emotion.id}
                      onClick={() => handleEmotionSelect(emotion.id)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: selectedEmotion === emotion.id ? `${emotion.color}15` : 'transparent',
                        border: 'none',
                        color: selectedEmotion === emotion.id ? emotion.color : '#A0A0B0',
                        fontSize: '14px',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: selectedEmotion === emotion.id ? '500' : '400',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedEmotion !== emotion.id) {
                          e.currentTarget.style.backgroundColor = `${emotion.color}10`;
                          e.currentTarget.style.color = emotion.color;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedEmotion !== emotion.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#A0A0B0';
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: emotion.color,
                          filter: selectedEmotion === emotion.id ? `drop-shadow(0 0 4px ${emotion.color}90)` : 'none',
                          flexShrink: 0
                        }}
                      />
                      {emotion.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fixed emotion header when locked to specific emotion */
        <div className="mb-4" style={{ padding: '8px 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: selectedEmotionObj.color,
            fontSize: '16px',
            fontFamily: "'Lato', sans-serif",
            fontWeight: '500'
          }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: selectedEmotionObj.color,
                filter: `drop-shadow(0 0 6px ${selectedEmotionObj.color}90)`,
                flexShrink: 0
              }}
            />
            <span>{selectedEmotionObj.name}</span>
          </div>
        </div>
      )}

      {/* Heatmap Container */}
      <div
        className="relative bg-black/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden w-full max-w-full"
        style={{
          maxWidth: '100%',
          boxSizing: 'border-box',
          width: fillParent ? '100%' : undefined,
          height: fillParent ? '100%' : undefined,
          flex: fillParent ? 1 : undefined,
          display: fillParent ? 'flex' : undefined,
          flexDirection: fillParent ? 'column' : undefined,
          padding: fillParent ? '12px' : '24px' // Reduced padding when fillParent to maintain alignment
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/40 rounded-3xl pointer-events-none"></div>
        <div
          className="relative overflow-hidden max-h-96 w-full max-w-full"
          style={{
            maxWidth: '100%',
            width: fillParent ? '100%' : undefined,
            height: fillParent ? '100%' : undefined,
            flex: fillParent ? 1 : undefined,
            display: fillParent ? 'flex' : undefined,
            flexDirection: fillParent ? 'column' : undefined
          }}
        >
          <svg
            ref={svgRef}
            width={fillParent ? '100%' : '100%'}
            height={fillParent ? '100%' : 'auto'}
            className="w-full max-w-full block"
            style={{
              maxWidth: '100%',
              minHeight: fillParent ? undefined : '300px',
              width: fillParent ? '100%' : undefined,
              height: fillParent ? '100%' : undefined,
              overflow: 'hidden',
              display: 'block',
              flex: fillParent ? 1 : undefined
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EmotionHeatmap; 