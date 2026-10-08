// NOTE: Requires 'lucide-react' for icons. Install with: npm install lucide-react
import React, { useState, useEffect, useRef, useCallback } from 'react';
// Removed backend API import - using browser-based processing
import { getSessionData } from '../../../lib/storage/session-data-access';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut } from 'lucide-react';


// Helper function to normalize time intervals across data points
const normalizeTimeIntervals = (data: Array<{ timestamp: Date; intensity: number }>) => {
  if (data.length < 2) return data;
  
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const totalDuration = sortedData[sortedData.length - 1].timestamp.getTime() - sortedData[0].timestamp.getTime();
  const avgInterval = totalDuration / (sortedData.length - 1);
  
  // Identify gaps larger than 2x average interval
  const gaps: Array<{ startIdx: number; endIdx: number; duration: number }> = [];
  for (let i = 0; i < sortedData.length - 1; i++) {
    const interval = sortedData[i + 1].timestamp.getTime() - sortedData[i].timestamp.getTime();
    if (interval > avgInterval * 2) {
      gaps.push({ startIdx: i, endIdx: i + 1, duration: interval });
    }
  }
  
  return { data: sortedData, gaps, avgInterval };
};

// Calculate emotional baseline for better continuity
const calculateEmotionalBaseline = (data: Array<{ timestamp: Date; intensity: number }>) => {
  if (data.length === 0) return 0.3;
  const validIntensities = data.filter(d => d.intensity > 0).map(d => d.intensity);
  if (validIntensities.length === 0) return 0.3;
  return validIntensities.reduce((sum, val) => sum + val, 0) / validIntensities.length;
};

// Helper function to densify data points for smoother curves with gap awareness
const densifyData = (data: Array<{ timestamp: Date; intensity: number }>, targetPoints: number = 100) => {
  if (data.length < 2) return data;
  
  const normalized = normalizeTimeIntervals(data);
  // Handle the case where normalizeTimeIntervals returns the array directly
  if (Array.isArray(normalized)) {
    return normalized;
  }
  
  const { data: sortedData, gaps, avgInterval } = normalized;
  const result: Array<{ timestamp: Date; intensity: number }> = [];
  const baseline = calculateEmotionalBaseline(sortedData);
  
  // Calculate the ideal time interval for target number of points
  const startTime = sortedData[0].timestamp.getTime();
  const endTime = sortedData[sortedData.length - 1].timestamp.getTime();
  const timeInterval = (endTime - startTime) / (targetPoints - 1);
  
  // Create interpolated points
  for (let i = 0; i < targetPoints; i++) {
    const targetTime = startTime + (i * timeInterval);
    const targetDate = new Date(targetTime);
    
    // Check if we're in a gap
    let inGap = false;
    for (const gap of gaps) {
      const gapStart = sortedData[gap.startIdx].timestamp.getTime();
      const gapEnd = sortedData[gap.endIdx].timestamp.getTime();
      if (targetTime > gapStart && targetTime < gapEnd) {
        inGap = true;
        // In gaps, trend toward baseline with smooth transition
        const gapProgress = (targetTime - gapStart) / (gapEnd - gapStart);
        const startIntensity = sortedData[gap.startIdx].intensity;
        const endIntensity = sortedData[gap.endIdx].intensity;
        
        // Smooth curve through baseline
        const midPoint = baseline * 0.8; // Slightly below baseline for variation
        let intensity;
        if (gapProgress < 0.5) {
          // First half: decay toward midpoint
          const t = gapProgress * 2;
          const easedT = t * t * (3 - 2 * t); // Smooth step
          intensity = startIntensity * (1 - easedT) + midPoint * easedT;
        } else {
          // Second half: rise from midpoint
          const t = (gapProgress - 0.5) * 2;
          const easedT = t * t * (3 - 2 * t);
          intensity = midPoint * (1 - easedT) + endIntensity * easedT;
        }
        
        result.push({ timestamp: targetDate, intensity: Math.max(0.05, intensity) });
        break;
      }
    }
    
    if (!inGap) {
      // Find surrounding data points
      let leftIndex = 0;
      let rightIndex = sortedData.length - 1;
      
      for (let j = 0; j < sortedData.length - 1; j++) {
        if (sortedData[j].timestamp.getTime() <= targetTime && 
            sortedData[j + 1].timestamp.getTime() > targetTime) {
          leftIndex = j;
          rightIndex = j + 1;
          break;
        }
      }
      
      // Handle edge cases
      if (targetTime <= startTime) {
        result.push({ timestamp: targetDate, intensity: sortedData[0].intensity });
      } else if (targetTime >= endTime) {
        result.push({ timestamp: targetDate, intensity: sortedData[sortedData.length - 1].intensity });
      } else {
        // Interpolate between points using cubic hermite spline for ultra-smooth curves
        const left = sortedData[leftIndex];
        const right = sortedData[rightIndex];
        
        const t = (targetTime - left.timestamp.getTime()) / 
                  (right.timestamp.getTime() - left.timestamp.getTime());
        
        // Calculate tangents for hermite spline
        let m0 = 0, m1 = 0;
        if (leftIndex > 0) {
          m0 = (right.intensity - sortedData[leftIndex - 1].intensity) / 2;
        }
        if (rightIndex < sortedData.length - 1) {
          m1 = (sortedData[rightIndex + 1].intensity - left.intensity) / 2;
        }
        
        // Hermite basis functions
        const t2 = t * t;
        const t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;
        
        const intensity = h00 * left.intensity + h10 * m0 + h01 * right.intensity + h11 * m1;
        
        result.push({ 
          timestamp: targetDate, 
          intensity: Math.max(0.05, Math.min(1, intensity)) 
        });
      }
    }
  }
  
  return result;
};

// Multi-stage flow smoothing for ultra-smooth emotional curves
const smoothDataPoints = (data: Array<{ timestamp: Date; intensity: number }>, passes: number = 3) => {
  if (data.length < 5) return data;
  
  let smoothedData = [...data];
  
  // Stage 1: Apply Savitzky-Golay filter for shape-preserving smoothing
  const windowSize = Math.min(7, Math.floor(data.length / 4));
  if (windowSize >= 5) {
    const halfWindow = Math.floor(windowSize / 2);
    const newData = [...smoothedData];
    
    for (let i = halfWindow; i < smoothedData.length - halfWindow; i++) {
      // Quadratic polynomial coefficients for 5-point window
      const weights = [-3, 12, 17, 12, -3].map(w => w / 35);
      let smoothedIntensity = 0;
      
      for (let j = -halfWindow; j <= halfWindow && j < weights.length - halfWindow; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < smoothedData.length) {
          smoothedIntensity += smoothedData[idx].intensity * weights[j + halfWindow];
        }
      }
      
      newData[i] = {
        ...smoothedData[i],
        intensity: Math.max(0.05, Math.min(1, smoothedIntensity))
      };
    }
    smoothedData = newData;
  }
  
  // Stage 2: Multi-pass Gaussian smoothing for flow
  for (let pass = 0; pass < passes; pass++) {
    const newData = [...smoothedData];
    const sigma = 1.5 - pass * 0.3; // Decrease sigma with each pass
    
    for (let i = 2; i < smoothedData.length - 2; i++) {
      // 5-point Gaussian kernel
      const kernel = [
        Math.exp(-4 / (2 * sigma * sigma)),
        Math.exp(-1 / (2 * sigma * sigma)),
        1,
        Math.exp(-1 / (2 * sigma * sigma)),
        Math.exp(-4 / (2 * sigma * sigma))
      ];
      
      // Normalize kernel
      const kernelSum = kernel.reduce((a, b) => a + b, 0);
      const normalizedKernel = kernel.map(k => k / kernelSum);
      
      let smoothed = 0;
      for (let j = -2; j <= 2; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < smoothedData.length) {
          smoothed += smoothedData[idx].intensity * normalizedKernel[j + 2];
        }
      }
      
      // Preserve relative peaks while smoothing
      const originalPeakness = smoothedData[i].intensity - 
        (smoothedData[i-1].intensity + smoothedData[i+1].intensity) / 2;
      const smoothedValue = smoothed + originalPeakness * 0.15; // Preserve 15% of peak characteristic
      
      newData[i] = {
        ...smoothedData[i],
        intensity: Math.max(0.05, Math.min(1, smoothedValue))
      };
    }
    
    smoothedData = newData;
  }
  
  // Stage 3: Edge enhancement to prevent over-smoothing
  const finalData = [...smoothedData];
  for (let i = 1; i < smoothedData.length - 1; i++) {
    const prev = smoothedData[i - 1].intensity;
    const curr = smoothedData[i].intensity;
    const next = smoothedData[i + 1].intensity;
    
    // Detect significant changes
    const leftDiff = Math.abs(curr - prev);
    const rightDiff = Math.abs(next - curr);
    
    if (leftDiff > 0.15 || rightDiff > 0.15) {
      // Reduce smoothing at edges to preserve emotional transitions
      finalData[i] = {
        ...smoothedData[i],
        intensity: curr * 0.85 + (prev + next) / 2 * 0.15
      };
    }
  }
  
  return finalData;
};

// Real emotion data structure matching API - more emotions with luminous colors
const createEmotionsData = (apiData?: any) => {
  // Mock data structure that matches API format
  const mockData = [
    {
      id: 'joy',
      name: 'Joy',
      color: '#FFD700',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.8 + (Math.sin(i / 5) * 0.2)),
      })),
    },
    {
      id: 'sadness',
      name: 'Sadness',
      color: '#00D4FF',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.4 + (Math.cos(i / 6) * 0.15)),
      })),
    },
    {
      id: 'anger',
      name: 'Anger',
      color: '#FF4757',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.05, Math.random() * 0.3),
      })),
    },
    {
      id: 'fear',
      name: 'Fear',
      color: '#8B5CF6',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.05, Math.random() * 0.6 + (Math.sin(i / 4) * 0.15)),
      })),
    },
    {
      id: 'surprise',
      name: 'Surprise',
      color: '#F59E0B',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.05, Math.random() * 0.4 + (Math.sin(i / 6 + 1) * 0.1)),
      })),
    },
    {
      id: 'love',
      name: 'Love',
      color: '#FF6B9D',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.6 + (Math.sin(i / 4 + 2) * 0.2)),
      })),
    },
    {
      id: 'disgust',
      name: 'Disgust',
      color: '#10B981',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.5 + (Math.cos(i / 7) * 0.1)),
      })),
    },
    {
      id: 'anticipation',
      name: 'Anticipation',
      color: '#9D4EDD',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.2, Math.random() * 0.7 + (Math.sin(i / 8) * 0.2)),
      })),
    },
    {
      id: 'trust',
      name: 'Trust',
      color: '#06D6A0',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.6 + (Math.cos(i / 5) * 0.15)),
      })),
    },
    {
      id: 'confusion',
      name: 'Confusion',
      color: '#FB8500',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.05, Math.random() * 0.4 + (Math.sin(i / 6 + 2) * 0.1)),
      })),
    },
    {
      id: 'excitement',
      name: 'Excitement',
      color: '#FF006E',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.7 + (Math.sin(i / 3) * 0.2)),
      })),
    },
    {
      id: 'calm',
      name: 'Calm',
      color: '#4ECDC4',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.2, Math.random() * 0.5 + (Math.cos(i / 8) * 0.15)),
      })),
    },
    {
      id: 'hope',
      name: 'Hope',
      color: '#45B7D1',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.6 + (Math.sin(i / 7) * 0.2)),
      })),
    },
    {
      id: 'frustration',
      name: 'Frustration',
      color: '#E74C3C',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.05, Math.random() * 0.5 + (Math.cos(i / 4) * 0.15)),
      })),
    },
    {
      id: 'gratitude',
      name: 'Gratitude',
      color: '#F39C12',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.6 + (Math.sin(i / 6 + 3) * 0.15)),
      })),
    },
    {
      id: 'compassion',
      name: 'Compassion',
      color: '#A855F7',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        intensity: Math.max(0.1, Math.random() * 0.5 + (Math.cos(i / 5 + 1) * 0.2)),
      })),
    },
  ];

  // If API data is provided, transform it to our format
  if (apiData) {
    // Transform API data to match our component's expected format
    // This will be updated based on your actual API response format
    return mockData.map(emotion => ({
      ...emotion,
      data: apiData[emotion.id] || emotion.data
    }));
  }

  return mockData;
};

const margin = { top: 20, right: 40, bottom: 80, left: 60 };

interface EmotionTimelineProps {
  sessionId?: string;
  useMockData?: boolean;
  onActiveEmotionsChange?: (activeEmotions: Record<string, boolean>) => void;
}

const EmotionTimeline: React.FC<EmotionTimelineProps> = ({
  sessionId,
  useMockData = false,
  onActiveEmotionsChange
}) => {
  const [emotionsData, setEmotionsData] = useState(() => createEmotionsData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Significant Events - API-ready structure for LLM-generated monthly events
  const [significantEvents, setSignificantEvents] = useState(() => {
    // Mock data - replace with API call that gets LLM-analyzed significant events
    // 
    // EXPECTED API FORMAT FROM LLM ANALYSIS:
    // {
    //   id: string,
    //   timestamp: Date | string,           // Exact date of the significant moment
    //   targetEmotion: string,              // Specific emotion ID where marker should appear (e.g., 'joy', 'sadness')
    //   title: string,                      // Brief title of the event
    //   description: string,                // Detailed description of what happened
    //   category: string,                   // Event category (achievement, relationship, health, etc.)
    //   emotionalImpact: number,            // 0-1 scale of emotional significance
    //   relatedEmotions?: string[],         // Optional: other emotions affected
    //   messageCount?: number,              // Optional: number of related messages
    //   color?: string                      // Optional: will use targetEmotion color if not provided
    // }
    //
    // Example API call:
    // const response = await fetch(`/api/significant-events/${sessionId}`);
    // const events = await response.json(); // LLM returns 3 events per month with exact emotion/date

    const events = [
      {
        id: 'event-1',
        timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        targetEmotion: 'joy',                    // Marker will appear on the 'joy' emotion line
        title: 'Career Breakthrough',
        description: 'Got promoted to senior position after months of hard work. This moment marked a significant shift in confidence and professional growth.',
        category: 'achievement',
        emotionalImpact: 0.85,
        relatedEmotions: ['joy', 'excitement', 'gratitude'],
        messageCount: 12,
        color: '#FFD700'
      },
      {
        id: 'event-2',
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        targetEmotion: 'love',                   // Marker will appear on the 'love' emotion line
        title: 'Family Reunion',
        description: 'Long-awaited family gathering brought everyone together. Reconnecting with loved ones after months of separation created lasting emotional memories.',
        category: 'relationship',
        emotionalImpact: 0.78,
        relatedEmotions: ['love', 'joy', 'gratitude'],
        messageCount: 8,
        color: '#FF6B9D'
      },
      {
        id: 'event-3',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        targetEmotion: 'hope',                   // Marker will appear on the 'hope' emotion line
        title: 'Health Scare Resolution',
        description: 'Medical test results came back clear after weeks of anxiety. The relief and renewed appreciation for health created a profound emotional shift.',
        category: 'health',
        emotionalImpact: 0.72,
        relatedEmotions: ['hope', 'gratitude', 'calm'],
        messageCount: 6,
        color: '#45B7D1'
      },
      {
        id: 'event-4',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        targetEmotion: 'excitement',             // Marker will appear on the 'excitement' emotion line
        title: 'Creative Project Launch',
        description: 'Successfully launched a personal creative project that had been in development for months. The accomplishment brought renewed sense of purpose.',
        category: 'creativity',
        emotionalImpact: 0.68,
        relatedEmotions: ['excitement', 'anticipation', 'joy'],
        messageCount: 9,
        color: '#9D4EDD'
      }
    ];

    return events;
  });

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Track which emotions are active (clicked) - only 5 random emotions selected by default
  const [activeEmotions, setActiveEmotions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const emotions = createEmotionsData();

    // Get 5 random emotions
    const shuffled = [...emotions].sort(() => 0.5 - Math.random());
    const randomSelected = shuffled.slice(0, 5).map(e => e.id);

    emotions.forEach(emotion => {
      initial[emotion.id] = randomSelected.includes(emotion.id);
    });
    return initial;
  });

  const [tooltip, setTooltip] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | null>(null);

  const d3Container = useRef<HTMLDivElement>(null);
  // Initialize with desktop width on mobile/tablet
  const getInitialWidth = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      return 1200; // Desktop width for mobile/tablet
    }
    return 0; // Will be calculated normally on desktop
  };
  const dimensions = useRef({ width: getInitialWidth(), height: 600 });

  // Handle emotion pill clicks
  const toggleEmotion = (emotionId: string) => {
    setActiveEmotions(prev => ({
      ...prev,
      [emotionId]: !prev[emotionId]
    }));
  };

  // Create event tooltip content
  const createEventTooltip = (event: any) => {
    const impactPercentage = (event.emotionalImpact * 100).toFixed(0);
    const relatedEmotionsText = event.relatedEmotions.join(', ');

    return `
      <div class="event-tooltip-container">
        <div class="event-tooltip-header" style="background: linear-gradient(135deg, ${event.color}15, ${event.color}08);">
          <div class="event-category" style="color: ${event.color};">${event.category.toUpperCase()}</div>
          <div class="event-title">${event.title}</div>
          <div class="event-date">${event.timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</div>
        </div>
        <div class="event-divider" style="background: linear-gradient(90deg, transparent, ${event.color}40, transparent);"></div>
        <div class="event-content">
          <div class="event-description">${event.description}</div>
          <div class="event-metrics">
            <div class="metric-row">
              <span class="metric-label">Emotional Impact</span>
              <span class="metric-value" style="color: ${event.color};">${impactPercentage}%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Related Messages</span>
              <span class="metric-value" style="color: ${event.color};">${event.messageCount}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Key Emotions</span>
              <span class="metric-value" style="color: ${event.color};">${relatedEmotionsText}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Fetch data from API
  const fetchEmotionData = useCallback(async () => {
    console.log('🎭 [FRONTEND DEBUG] fetchEmotionData called:', { useMockData, sessionId });

    if (useMockData || !sessionId) {
      console.log('🎭 [FRONTEND DEBUG] Using mock data because:', { useMockData, hasSessionId: !!sessionId });
      setEmotionsData(createEmotionsData());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🎭 [FRONTEND DEBUG] Fetching emotional timeline data from IndexedDB for session:', sessionId);
      
      const dataAccess = await getSessionData();
      const apiData = await dataAccess.getEmotionalTimeline(sessionId);
      
      console.log('🎭 [FRONTEND DEBUG] IndexedDB response:', {
        status: apiData?.status,
        hasEmotions: !!apiData?.emotions,
        emotionCount: apiData?.emotions?.length,
        totalWeeks: apiData?.total_weeks,
        hasOriginalDateRange: !!apiData?.original_date_range,
        originalDateRange: apiData?.original_date_range
      });

      if (apiData && apiData.status === 'completed' && apiData.emotions) {
        // Transform API data to match our component's expected format
        const transformedData = apiData.emotions.map((emotion: any) => ({
          id: emotion.id,
          name: emotion.name,
          color: emotion.color,
          data: emotion.data.map((point: any) => ({
            timestamp: new Date(point.timestamp),
            intensity: point.intensity
          }))
        }));

        console.log('🎭 [FRONTEND DEBUG] Transformed data:', {
          emotionCount: transformedData.length,
          firstEmotionId: transformedData[0]?.id,
          dataPointsPerEmotion: transformedData[0]?.data?.length || 0,
          firstDataPoint: transformedData[0]?.data?.[0]
        });

        setEmotionsData(transformedData);

        // Update time range based on real data
        if (transformedData.length > 0 && transformedData[0].data.length > 0) {
          // Use original chat date range if available, otherwise use data points
          if (apiData.original_date_range) {
            const originalStart = new Date(apiData.original_date_range.start);
            const originalEnd = new Date(apiData.original_date_range.end);
            setTimeRange({
              start: originalStart,
              end: originalEnd,
            });
            console.log('🎭 [FRONTEND DEBUG] Using original chat date range:', {
              start: originalStart,
              end: originalEnd
            });
          } else {
            // Fallback to data points range
            const dataPoints = transformedData[0].data;
            setTimeRange({
              start: dataPoints[0].timestamp,
              end: dataPoints[dataPoints.length - 1].timestamp,
            });
            console.log('🎭 [FRONTEND DEBUG] Using data points time range:', {
              start: dataPoints[0].timestamp,
              end: dataPoints[dataPoints.length - 1].timestamp
            });
          }
        }

        console.log('✅ [FRONTEND DEBUG] Successfully loaded real emotional data!');
      } else {
        console.log('⚠️ [FRONTEND DEBUG] API response not completed or no emotions:', apiData);
        setEmotionsData(createEmotionsData());
      }
    } catch (err) {
      console.error('❌ [FRONTEND DEBUG] Error fetching emotion data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Fallback to mock data on error
      setEmotionsData(createEmotionsData());
    } finally {
      setLoading(false);
    }
  }, [sessionId, useMockData]);

  // Fetch data on component mount and when sessionId changes
  useEffect(() => {
    fetchEmotionData();
  }, [fetchEmotionData]);

  // Update timeRange after emotionsData changes
  useEffect(() => {
    if (emotionsData.length > 0 && emotionsData[0].data.length > 0) {
      const allTimestamps = emotionsData.flatMap(e => e.data.map((d: { timestamp: Date }) => d.timestamp));
      const minDate = new Date(Math.min(...allTimestamps.map((d: Date) => d.getTime())));
      const maxDate = new Date(Math.max(...allTimestamps.map((d: Date) => d.getTime())));
      setTimeRange({ start: minDate, end: maxDate });
    }
  }, [emotionsData]);

  // Helper to format the analysis window label
  function getAnalysisWindowLabel() {
    if (!timeRange) return null;

    const formatDate = (date: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const startStr = formatDate(timeRange.start);
    const endStr = formatDate(timeRange.end);
    const days = Math.round((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 1) return `Showing ${startStr}`;
    return `Showing ${startStr} - ${endStr}`;
  }

  const drawChart = useCallback(() => {
    if (!d3Container.current || dimensions.current.width === 0) return;

    const { width, height } = dimensions.current;
    const brushHeight = 60;
    const mainChartHeight = height - brushHeight - 20;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = mainChartHeight - margin.top - margin.bottom;

    // Improved cleanup to prevent removeChild errors
    const container = d3.select(d3Container.current);
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Add gradient definitions
    const defs = svg.append('defs');

    emotionsData.forEach(emotion => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${emotion.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', innerHeight);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', emotion.color)
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', emotion.color)
        .attr('stop-opacity', 0.1);

      // Mini gradient for brush area
      const miniGradient = defs.append('linearGradient')
        .attr('id', `mini-gradient-${emotion.id}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', brushHeight - 20);

      miniGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', emotion.color)
        .attr('stop-opacity', 0.4);

      miniGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', emotion.color)
        .attr('stop-opacity', 0.05);
    });

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const filteredData = emotionsData
      .filter(emotion => activeEmotions[emotion.id])
      .map(emotion => ({
        ...emotion,
        data: emotion.data.filter((d: { timestamp: Date; intensity: number }) => timeRange?.start && timeRange?.end && d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      }));

    // Full data for brush
    const fullData = emotionsData.filter(emotion => activeEmotions[emotion.id]);

    // Main chart scales
    const xScale = d3.scaleTime()
      .domain([timeRange?.start || emotionsData[0].data[0].timestamp, timeRange?.end || emotionsData[0].data[emotionsData[0].data.length - 1].timestamp])
      .range([0, innerWidth]);

    // Calculate dynamic Y-axis scale based on actual data ranges
    const allIntensities = filteredData.flatMap(emotion => emotion.data.map((d: { intensity: number }) => d.intensity));
    const minIntensity = Math.min(...allIntensities, 0.05); // Minimum 5% for visibility
    const maxIntensity = Math.max(...allIntensities, 0.6); // Ensure 60%+ values are visible

    // Enhanced Y-axis scaling for better emotional contrast
    const yDomain = calculateEnhancedYDomain(filteredData, minIntensity, maxIntensity);

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([innerHeight, 0]);

    // Brush scales (for full data range)
    const fullTimeExtent = d3.extent(emotionsData.flatMap(e => e.data), d => d.timestamp) as [Date, Date];
    const brushXScale = d3.scaleTime()
      .domain(fullTimeExtent)
      .range([0, innerWidth]);

    const brushYScale = d3.scaleLinear()
      .domain(yDomain)
      .range([brushHeight - 20, 0]);

    // Subtle grid lines
    g.selectAll('.grid-line-y')
      .data(yScale.ticks(4))
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d: number) => yScale(d))
      .attr('y2', (d: number) => yScale(d))
      .attr('stroke', '#374151')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 0.5);

    // Clean axes with minimal styling
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%m/%d') as any)
      .tickSize(0)
      .tickPadding(12);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#9CA3AF')
      .style('font-size', '11px')
      .style('font-weight', '400');

    // Remove axis lines for cleaner look
    g.selectAll('.domain').remove();

    // Line generator with ultra-smooth natural curve
    const line = d3.line<any>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.intensity))
      .curve(d3.curveNatural); // Natural cubic spline for smoothest curves

    // Area generator with matching curve
    const area = d3.area<any>()
      .x(d => xScale(d.timestamp))
      .y0(innerHeight)
      .y1((d: { timestamp: Date; intensity: number }) => yScale(d.intensity))
      .curve(d3.curveNatural); // Match line curve for consistency

    // Mini line generator for brush with smooth curve
    const miniLine = d3.line<any>()
      .x(d => brushXScale(d.timestamp))
      .y(d => brushYScale(d.intensity))
      .curve(d3.curveMonotoneX); // Monotone for mini chart stability

    // Mini area generator for brush
    const miniArea = d3.area<any>()
      .x(d => brushXScale(d.timestamp))
      .y0(brushHeight - 20)
      .y1((d: { timestamp: Date; intensity: number }) => brushYScale(d.intensity))
      .curve(d3.curveMonotoneX); // Match mini line curve

    // Densify and smooth data for ultra-smooth curves
    const densifiedData = filteredData.map(emotion => {
      // First densify to create more points with gap awareness
      const targetPoints = Math.max(200, emotion.data.length * 8); // More points for smoother curves
      const densified = densifyData(emotion.data, targetPoints);
      // Then apply multi-stage smoothing for flow
      const smoothed = smoothDataPoints(densified, 4); // Extra pass for ultra-smooth
      
      return {
        ...emotion,
        data: smoothed
      };
    });

    // Draw emotion lines and areas with staggered animation
    densifiedData.forEach((emotion, index) => {
      if (emotion.data.length < 2) return;

      // Area fill with gradient - draw first with reduced opacity
      g.append('path')
        .datum(emotion.data)
        .attr('fill', `url(#gradient-${emotion.id})`)
        .attr('d', area)
        .attr('opacity', 0)
        .transition()
        .delay(index * 150)
        .duration(1000)
        .attr('opacity', 0.5); // Reduced for better line visibility

      // Luminous line with enhanced smoothness
      g.append('path')
        .datum(emotion.data)
        .attr('fill', 'none')
        .attr('stroke', emotion.color)
        .attr('stroke-width', 4) // Thicker for better visibility
        .attr('d', line)
        .attr('stroke-linejoin', 'round') // Smooth joins
        .attr('stroke-linecap', 'round') // Smooth caps
        .style('filter', `drop-shadow(0 0 15px ${emotion.color}90)`) // Enhanced glow
        .attr('stroke-dasharray', function () {
          const length = (this as SVGPathElement).getTotalLength();
          return `${length} ${length}`;
        })
        .attr('stroke-dashoffset', function () {
          return (this as SVGPathElement).getTotalLength();
        })
        .transition()
        .delay(index * 150)
        .duration(1500)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
    });

    // Add significant events markers ON TOP of emotion lines
    const eventsGroup = g.append('g').attr('class', 'events-markers');

    // Filter events that are within the current time range AND have active target emotions
    const eventsInRange = significantEvents.filter(event =>
      timeRange?.start && timeRange?.end &&
      event.timestamp >= timeRange.start &&
      event.timestamp <= timeRange.end &&
      activeEmotions[event.targetEmotion] // Only show if target emotion is active
    );

    // Remove any existing pulse animations to prevent conflicts
    eventsInRange.forEach(event => {
      const existingStyle = document.getElementById(`pulse-style-${event.id}`);
      if (existingStyle) existingStyle.remove();
    });

    eventsInRange.forEach((event, index) => {
      const x = xScale(event.timestamp);

      // Find the PRIMARY TARGET emotion where marker should appear (must be active)
      const targetEmotion = filteredData.find(emotion =>
        emotion.id === event.targetEmotion
      );

      if (targetEmotion && targetEmotion.data.length > 0) {
        // Define explicit data structure for type safety
        interface DataPoint {
          timestamp: Date;
          intensity: number;
        }

        // Find the EXACT data point using more precise interpolation
        const bisect = d3.bisector<DataPoint, Date>((d) => d.timestamp).left;
        const dataPoints = targetEmotion.data as DataPoint[];
        const i = bisect(dataPoints, event.timestamp, 1);

        // Get the two surrounding points for better interpolation
        const d0: DataPoint | undefined = dataPoints[i - 1];
        const d1: DataPoint | undefined = dataPoints[i];

        // Choose the closest point, or interpolate if both exist
        let intensity: number;
        if (!d0) {
          intensity = d1?.intensity || 0.5;
        } else if (!d1) {
          intensity = d0.intensity;
        } else {
          // Linear interpolation between the two points for exact positioning
          const t = (event.timestamp.getTime() - d0.timestamp.getTime()) /
            (d1.timestamp.getTime() - d0.timestamp.getTime());
          intensity = d0.intensity + t * (d1.intensity - d0.intensity);
        }

        // Position marker EXACTLY on the center/tip of the target emotion line
        const markerY = yScale(intensity);
        const markerColor = event.color || targetEmotion.color;

        // Create marker group positioned exactly on the emotion line center
        const markerGroup = eventsGroup.append('g')
          .attr('class', 'event-marker')
          .attr('data-event-id', event.id)
          .attr('transform', `translate(${x}, ${markerY})`)
          .style('cursor', 'pointer');

        // Outer glow circle - positioned on the line tip
        markerGroup.append('circle')
          .attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', markerColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.5)
          .style('filter', `drop-shadow(0 0 12px ${markerColor}60)`);

        // Inner filled diamond - exactly on the line center/tip
        markerGroup.append('rect')
          .attr('x', -2.5)
          .attr('y', -2.5)
          .attr('width', 5)
          .attr('height', 5)
          .attr('fill', markerColor)
          .attr('transform', 'rotate(45)')
          .style('filter', `drop-shadow(0 0 6px ${markerColor}80)`)
          .attr('opacity', 0)
          .transition()
          .delay(index * 150 + 1500) // Animate well after lines are drawn
          .duration(800)
          .attr('opacity', 1);

        // Subtle pulsing glow on the line
        markerGroup.append('circle')
          .attr('r', 3)
          .attr('fill', markerColor)
          .attr('fill-opacity', 0.7)
          .attr('stroke', 'none')
          .style('animation', `pulse-${event.id} 4s infinite ease-in-out`);

        // Add CSS animation for subtle pulsing (only once per event)
        if (!document.getElementById(`pulse-style-${event.id}`)) {
          const style = document.createElement('style');
          style.id = `pulse-style-${event.id}`;
          style.textContent = `
            @keyframes pulse-${event.id} {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.3); opacity: 0.3; }
            }
          `;
          document.head.appendChild(style);
        }

        // Event marker interactions - keep marker perfectly on the line
        markerGroup
          .on('mouseenter', function () {
            d3.select(this).select('rect')
              .transition()
              .duration(150)
              .attr('transform', 'rotate(45) scale(1.6)')
              .attr('x', -4)
              .attr('y', -4)
              .attr('width', 8)
              .attr('height', 8);

            d3.select(this).select('circle:first-child')
              .transition()
              .duration(150)
              .attr('r', 12)
              .attr('stroke-opacity', 0.8);
          })
          .on('mouseleave', function () {
            if (selectedEvent?.id !== event.id) {
              d3.select(this).select('rect')
                .transition()
                .duration(150)
                .attr('transform', 'rotate(45) scale(1)')
                .attr('x', -2.5)
                .attr('y', -2.5)
                .attr('width', 5)
                .attr('height', 5);

              d3.select(this).select('circle:first-child')
                .transition()
                .duration(150)
                .attr('r', 8)
                .attr('stroke-opacity', 0.5);
            }
          })
          .on('click', function (clickEvent) {
            clickEvent.stopPropagation();
            setSelectedEvent(event);

            // Create detailed event tooltip
            const rect = d3Container.current!.getBoundingClientRect();
            setTooltip({
              x: rect.left + margin.left + x + 20,
              y: rect.top + margin.top + markerY - 10,
              content: createEventTooltip(event),
              visible: true,
              isEvent: true
            });
          });
      }
    });

    // Timeline brush area setup
    const brushG = svg.append('g')
      .attr('class', 'brush-area')
      .attr('transform', `translate(${margin.left},${mainChartHeight + 0})`);

    // Add emotion pills between main graph and brush using foreign object
    const pillsContainer = svg.append('foreignObject')
      .attr('x', 0)
      .attr('y', mainChartHeight - 44)
      .attr('width', width)
      .attr('height', 40);

    const pillsDiv = pillsContainer.append('xhtml:div')
      .style('display', 'flex')
      .style('justify-content', 'space-between')
      .style('align-items', 'center')
      .style('flex-wrap', 'wrap')
      .style('gap', '8px')
      .style('padding', `0 ${margin.right}px 0 ${margin.left}px`)
      .style('width', '100%')
      .style('height', '100%')
      .style('box-sizing', 'border-box');

    emotionsData.forEach(emotion => {
      const isActive = activeEmotions[emotion.id];
      const pill = pillsDiv.append('xhtml:div')
        .style('background-color', isActive ? `${emotion.color}15` : `${emotion.color}08`)
        .style('border', `1px solid ${emotion.color}${isActive ? '60' : '30'}`)
        .style('color', isActive ? emotion.color : `${emotion.color}80`)
        .style('padding', '6px 14px')
        .style('border-radius', '18px')
        .style('font-size', '12px')
        .style('font-weight', isActive ? '500' : '400')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '6px')
        .style('backdrop-filter', 'blur(10px)')
        .style('box-shadow', isActive ? `0 2px 8px rgba(0, 0, 0, 0.2), 0 0 12px ${emotion.color}30` : 'none')
        .style('font-family', "'Lato', sans-serif")
        .style('transition', 'all 0.3s ease')
        .style('cursor', 'pointer')
        .style('opacity', isActive ? '1' : '0.45')
        .style('transform', isActive ? 'scale(1)' : 'scale(0.95)')
        .on('click', function () {
          toggleEmotion(emotion.id);
        })
        .on('mouseenter', function () {
          d3.select(this).style('transform', isActive ? 'scale(1.05)' : 'scale(1)');
        })
        .on('mouseleave', function () {
          d3.select(this).style('transform', isActive ? 'scale(1)' : 'scale(0.95)');
        });

      pill.append('xhtml:div')
        .style('width', '8px')
        .style('height', '8px')
        .style('border-radius', '50%')
        .style('background-color', emotion.color)
        .style('box-shadow', isActive ? `0 0 8px ${emotion.color}90, inset 0 0 4px ${emotion.color}` : 'none')
        .style('opacity', isActive ? '1' : '0.55')
        .style('flex-shrink', '0');

      pill.append('xhtml:span')
        .text(emotion.name);
    });

    // Minimal brush background
    brushG.append('rect')
      .attr('width', innerWidth)
      .attr('height', brushHeight)
      .attr('fill', 'transparent')
      .attr('stroke', '#374151')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.3)
      .attr('rx', 4);

    // Mini chart group
    const miniG = brushG.append('g')
      .attr('transform', 'translate(0, 10)');

    // Densify and smooth data for mini chart too
    const densifiedFullData = fullData.map(emotion => {
      const densified = densifyData(emotion.data, Math.min(80, emotion.data.length * 3));
      const smoothed = smoothDataPoints(densified, 2); // Less smoothing for mini chart
      return {
        ...emotion,
        data: smoothed
      };
    });

    // Draw mini emotion lines in brush
    densifiedFullData.forEach((emotion, index) => {
      if (emotion.data.length < 2) return;

      // Mini area
      miniG.append('path')
        .datum(emotion.data)
        .attr('fill', `url(#mini-gradient-${emotion.id})`)
        .attr('d', miniArea)
        .attr('opacity', 0.6);

      // Mini line
      miniG.append('path')
        .datum(emotion.data)
        .attr('fill', 'none')
        .attr('stroke', emotion.color)
        .attr('stroke-width', 1.5)
        .attr('d', miniLine)
        .attr('opacity', 0.9)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');
    });

    // Brush functionality
    const brush = d3.brushX()
      .extent([[0, 0], [innerWidth, brushHeight - 10]])
      .on('brush end', (event: any) => {
        if (!event.sourceEvent) return;
        if (!event.selection) {
          setTimeRange({
            start: fullTimeExtent[0],
            end: fullTimeExtent[1]
          });
          return;
        }

        const [x0, x1] = event.selection;
        const newStart = brushXScale.invert(x0);
        const newEnd = brushXScale.invert(x1);

        setTimeRange({ start: newStart, end: newEnd });
      });

    const brushSelection = miniG.append('g')
      .attr('class', 'brush')
      .call(brush);

    // Style brush selection with teal accent
    brushSelection.selectAll('.selection')
      .attr('fill', '#00F5D4')
      .attr('fill-opacity', 0.15)
      .attr('stroke', '#00F5D4')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)
      .attr('rx', 2);

    brushSelection.selectAll('.handle')
      .attr('fill', '#00F5D4')
      .attr('stroke', 'none')
      .attr('rx', 1)
      .attr('width', 4)
      .attr('opacity', 0.8);

    // Set initial brush selection
    const initialSelection = [
      brushXScale(timeRange?.start || emotionsData[0].data[0].timestamp),
      brushXScale(timeRange?.end || emotionsData[0].data[emotionsData[0].data.length - 1].timestamp)
    ];

    if (initialSelection.every(v => !isNaN(v) && isFinite(v))) {
      brushSelection.call(brush.move, initialSelection as [number, number]);
    }

    // Interactive overlay for main chart
    const overlay = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all');

    const focus = g.append('g').style('display', 'none');

    const focusLine = focus.append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#00F5D4')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.7);

    overlay
      .on('mouseover', () => {
        focus.style('display', null);
      })
      .on('mouseout', () => {
        focus.style('display', 'none');
        setTooltip(null);
      })
      .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        if (mouseX < 0 || mouseX > innerWidth) return;

        const x0 = xScale.invert(mouseX);
        focusLine.attr('transform', `translate(${mouseX},0)`);

        // Find the week containing this date
        const weekStart = new Date(x0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Saturday)

        // Create enhanced tooltip content with weekly summary
        let tooltipContent = `
          <div class="tooltip-container">
            <div class="tooltip-header">
              <div class="tooltip-date">${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div class="tooltip-subtitle">Weekly Emotional Landscape</div>
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-emotions">`;

        // Calculate weekly averages and create emotion entries
        const weeklyData: Array<{ emotion: string, avgIntensity: number, color: string, trend: string }> = [];

        filteredData.forEach(emotion => {
          if (emotion.data.length > 0) {
            // Get data points within this week
            const weekData = emotion.data.filter((d: { timestamp: Date; intensity: number }) => d.timestamp >= weekStart && d.timestamp <= weekEnd);

            if (weekData.length > 0) {
              const avgIntensity = weekData.reduce((sum: number, d: { timestamp: Date; intensity: number }) => sum + d.intensity, 0) / weekData.length;

              // Calculate trend (simple comparison with previous week if available)
              const prevWeekStart = new Date(weekStart);
              prevWeekStart.setDate(prevWeekStart.getDate() - 7);
              const prevWeekEnd = new Date(weekEnd);
              prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

              const prevWeekData = emotion.data.filter((d: { timestamp: Date; intensity: number }) => d.timestamp >= prevWeekStart && d.timestamp <= prevWeekEnd);
              let trend = '→';
              if (prevWeekData.length > 0) {
                const prevAvg = prevWeekData.reduce((sum: number, d: { timestamp: Date; intensity: number }) => sum + d.intensity, 0) / prevWeekData.length;
                trend = avgIntensity > prevAvg ? '↗' : avgIntensity < prevAvg ? '↘' : '→';
              }

              weeklyData.push({
                emotion: emotion.name,
                avgIntensity,
                color: emotion.color,
                trend
              });
            }
          }
        });

        // Sort by intensity (highest first)
        weeklyData.sort((a, b) => b.avgIntensity - a.avgIntensity);

        // Add emotion entries to tooltip
        weeklyData.forEach((data, index) => {
          const intensity = (data.avgIntensity * 100).toFixed(0);
          const barWidth = Math.max(12, data.avgIntensity * 80); // Minimum 12px width

          tooltipContent += `
            <div class="emotion-entry" style="margin-bottom: ${index === weeklyData.length - 1 ? '0' : '8px'};">
              <div class="emotion-header">
                <span class="emotion-name" style="color: ${data.color};">${data.emotion}</span>
                <span class="emotion-trend" style="color: ${data.color};">${data.trend}</span>
                <span class="emotion-intensity" style="color: ${data.color};">${intensity}%</span>
              </div>
              <div class="emotion-bar-container">
                <div class="emotion-bar" style="width: ${barWidth}px; background: linear-gradient(90deg, ${data.color}80, ${data.color}40); box-shadow: 0 0 8px ${data.color}30;"></div>
              </div>
            </div>`;
        });

        // Add sample message snippets (mock data for now)
        const mockMessages = [
          "Feeling grateful for family time this weekend",
          "Work stress is getting overwhelming lately",
          "Excited about the new project launch",
          "Missing friends during this busy period"
        ];

        tooltipContent += `
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-insights">
              <div class="insights-header">Key Moments</div>
              <div class="message-snippets">`;

        // Add 2-3 random messages for this week
        const weekMessages = mockMessages.slice(0, Math.min(3, mockMessages.length));
        weekMessages.forEach((message, index) => {
          tooltipContent += `
            <div class="message-snippet" style="margin-bottom: ${index === weekMessages.length - 1 ? '0' : '6px'};">
              "${message}"
            </div>`;
        });

        tooltipContent += `
              </div>
            </div>
          </div>`;

        const rect = d3Container.current!.getBoundingClientRect();
        setTooltip({
          x: rect.left + margin.left + mouseX + 20,
          y: rect.top + margin.top + 40,
          content: tooltipContent,
          visible: true
        });
      });

  }, [emotionsData, activeEmotions, timeRange, loading, significantEvents, selectedEvent]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries.length > 0) {
        // Check if we're on mobile/tablet and force desktop width
        const isMobileOrTablet = window.innerWidth <= 1024;
        const containerWidth = entries[0].contentRect.width;
        
        // Force desktop width on mobile
        dimensions.current.width = isMobileOrTablet && containerWidth < 1200 ? 1200 : containerWidth;
        drawChart();
      }
    });

    if (d3Container.current) {
      // Check if we're on mobile/tablet
      const isMobileOrTablet = window.innerWidth <= 1024;
      const clientWidth = d3Container.current.clientWidth;
      
      // Force desktop width on mobile
      dimensions.current.width = isMobileOrTablet && clientWidth < 1200 ? 1200 : clientWidth;
      observer.observe(d3Container.current);
    }

    return () => {
      if (d3Container.current) {
        observer.unobserve(d3Container.current);
      }
    };
  }, [drawChart]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  useEffect(() => {
    if (onActiveEmotionsChange) {
      onActiveEmotionsChange(activeEmotions);
    }
  }, [activeEmotions, onActiveEmotionsChange]);

  // Add method to calculate enhanced Y-axis domain for better emotional contrast
  const calculateEnhancedYDomain = useCallback((filteredData: any[], minIntensity: number, maxIntensity: number): [number, number] => {
    // Get all emotion intensities
    const allIntensities = filteredData.flatMap(emotion => emotion.data.map((d: any) => d.intensity));

    // Calculate emotional contrast metrics
    const emotionalContrasts = calculateEmotionalContrasts(filteredData);

    // If we have strong emotional contrasts, expand the Y-axis range
    if (emotionalContrasts.maxContrast > 0.3) {
      // Expand range to show contrasts better
      const expandedMin = Math.max(0, minIntensity - 0.1);
      const expandedMax = Math.min(1, maxIntensity + 0.2);
      return [expandedMin, expandedMax];
    }

    // Default enhanced scaling
    const enhancedMin = Math.max(0, minIntensity - 0.05);
    const enhancedMax = Math.min(1, maxIntensity + 0.1);
    return [enhancedMin, enhancedMax];
  }, [emotionsData]);

  // Add method to calculate emotional contrasts
  const calculateEmotionalContrasts = useCallback((filteredData: any[]): { maxContrast: number, avgContrast: number } => {
    if (filteredData.length < 2) return { maxContrast: 0, avgContrast: 0 };

    const emotionalOpposites = [
      { positive: 'joy', negative: 'sadness' },
      { positive: 'love', negative: 'anger' },
      { positive: 'calm', negative: 'anxiety' },
      { positive: 'excitement', negative: 'fear' },
      { positive: 'contentment', negative: 'frustration' }
    ];

    let maxContrast = 0;
    let totalContrast = 0;
    let contrastCount = 0;

    // Calculate contrasts for each time point
    const timePoints = new Set<string>();
    filteredData.forEach(emotion => {
      emotion.data.forEach((d: any) => {
        timePoints.add(d.timestamp.toISOString());
      });
    });

    timePoints.forEach(timePoint => {
      emotionalOpposites.forEach(pair => {
        const positiveEmotion = filteredData.find(e => e.id === pair.positive);
        const negativeEmotion = filteredData.find(e => e.id === pair.negative);

        if (positiveEmotion && negativeEmotion) {
          const positiveData = positiveEmotion.data.find((d: any) => d.timestamp.toISOString() === timePoint);
          const negativeData = negativeEmotion.data.find((d: any) => d.timestamp.toISOString() === timePoint);

          if (positiveData && negativeData) {
            const contrast = Math.abs(positiveData.intensity - negativeData.intensity);
            maxContrast = Math.max(maxContrast, contrast);
            totalContrast += contrast;
            contrastCount++;
          }
        }
      });
    });

    return {
      maxContrast,
      avgContrast: contrastCount > 0 ? totalContrast / contrastCount : 0
    };
  }, [emotionsData]);

  // Add method to find opposite emotions
  const findOppositeEmotion = useCallback((emotionId: string, emotions: any[]): any | null => {
    const opposites: Record<string, string> = {
      'joy': 'sadness',
      'sadness': 'joy',
      'love': 'anger',
      'anger': 'love',
      'calm': 'anxiety',
      'anxiety': 'calm',
      'excitement': 'fear',
      'fear': 'excitement',
      'contentment': 'frustration',
      'frustration': 'contentment',
      'gratitude': 'disgust',
      'disgust': 'gratitude'
    };

    const oppositeId = opposites[emotionId];
    return oppositeId ? emotions.find(e => e.id === oppositeId) : null;
  }, []);

  // Add method to create contrast indicators
  const addContrastIndicators = useCallback((g: any, emotion1: any, emotion2: any, xScale: any, yScale: any): void => {
    // Find points where both emotions have data
    const timePoints = new Set<string>();
    emotion1.data.forEach((d: any) => timePoints.add(d.timestamp.toISOString()));
    emotion2.data.forEach((d: any) => timePoints.add(d.timestamp.toISOString()));

    timePoints.forEach(timePoint => {
      const data1 = emotion1.data.find((d: any) => d.timestamp.toISOString() === timePoint);
      const data2 = emotion2.data.find((d: any) => d.timestamp.toISOString() === timePoint);

      if (data1 && data2) {
        const contrast = Math.abs(data1.intensity - data2.intensity);

        // Add contrast indicator if the contrast is significant
        if (contrast > 0.3) {
          const x = xScale(data1.timestamp);
          const y1 = yScale(data1.intensity);
          const y2 = yScale(data2.intensity);

          // Draw contrast line
          g.append('line')
            .attr('x1', x)
            .attr('y1', y1)
            .attr('x2', x)
            .attr('y2', y2)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-dasharray', '3,3');

          // Add contrast indicator dot
          g.append('circle')
            .attr('cx', x)
            .attr('cy', (y1 + y2) / 2)
            .attr('r', 3)
            .attr('fill', '#ffffff')
            .attr('opacity', 0.8);
        }
      }
    });
  }, []);

  return (
    <>
      {timeRange && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{
            display: 'inline-block',
            background: '#F3F4F6',
            color: '#3D0000',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.2,
            marginBottom: 4
          }}>{getAnalysisWindowLabel()}</span>
        </div>
      )}
      {/* Glassmorphic container with breathing room */}
      <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"></div>

        {/* Error display */}
        {error && (
          <div className="text-red-400 text-sm mb-4 text-center">
            Error loading data: {error}. Using mock data.
          </div>
        )}

        {/* Pure visualization with generous spacing */}
        <div
          ref={d3Container}
          className="w-full relative emotion-timeline-container"
          style={{ height: dimensions.current.height }}
        >
          {/* Enhanced luminous tooltip */}
          {tooltip && tooltip.visible && (
            <div
              className="fixed pointer-events-none z-50"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                maxWidth: '320px',
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 245, 212, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 245, 212, 0.1)',
                padding: '0',
                overflow: 'hidden'
              }}
            >
              <style>{`
                .tooltip-container {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                  color: #F0F0F0;
                }
                .tooltip-header {
                  padding: 16px 20px 12px 20px;
                  background: linear-gradient(135deg, rgba(0, 245, 212, 0.08), rgba(157, 78, 221, 0.08));
                }
                .tooltip-date {
                  font-size: 14px;
                  font-weight: 600;
                  color: #00F5D4;
                  margin-bottom: 2px;
                }
                .tooltip-subtitle {
                  font-size: 11px;
                  font-weight: 400;
                  color: #A0A0B0;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .tooltip-divider {
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(0, 245, 212, 0.3), transparent);
                  margin: 0 12px;
                }
                .tooltip-emotions {
                  padding: 16px 20px;
                }
                .emotion-entry {
                  margin-bottom: 8px;
                }
                .emotion-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 4px;
                }
                .emotion-name {
                  font-size: 12px;
                  font-weight: 500;
                }
                .emotion-trend {
                  font-size: 11px;
                  font-weight: 600;
                }
                .emotion-intensity {
                  font-size: 11px;
                  font-weight: 600;
                }
                .emotion-bar-container {
                  height: 3px;
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 2px;
                  overflow: hidden;
                }
                .emotion-bar {
                  height: 100%;
                  border-radius: 2px;
                  transition: width 0.3s ease;
                }
                .tooltip-insights {
                  padding: 12px 20px 16px 20px;
                  background: rgba(0, 0, 0, 0.2);
                }
                .insights-header {
                  font-size: 11px;
                  font-weight: 600;
                  color: #00F5D4;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 8px;
                }
                .message-snippet {
                  font-size: 11px;
                  color: #A0A0B0;
                  font-style: italic;
                  line-height: 1.4;
                  padding-left: 8px;
                  border-left: 2px solid rgba(0, 245, 212, 0.2);
                }
                
                /* Event Tooltip Styles */
                .event-tooltip-container {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                  color: #F0F0F0;
                  max-width: 350px;
                }
                .event-tooltip-header {
                  padding: 16px 20px;
                  border-radius: 12px 12px 0 0;
                }
                .event-category {
                  font-size: 10px;
                  font-weight: 700;
                  letter-spacing: 1px;
                  margin-bottom: 4px;
                }
                .event-title {
                  font-size: 16px;
                  font-weight: 600;
                  color: #F0F0F0;
                  margin-bottom: 6px;
                  line-height: 1.3;
                }
                .event-date {
                  font-size: 11px;
                  color: #A0A0B0;
                  font-weight: 400;
                }
                .event-divider {
                  height: 1px;
                  margin: 0 12px;
                }
                .event-content {
                  padding: 16px 20px;
                }
                .event-description {
                  font-size: 12px;
                  color: #E0E0E0;
                  line-height: 1.5;
                  margin-bottom: 16px;
                }
                .event-metrics {
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                }
                .metric-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .metric-label {
                  font-size: 11px;
                  color: #A0A0B0;
                  font-weight: 400;
                }
                .metric-value {
                  font-size: 11px;
                  font-weight: 600;
                }
              `}</style>
              <div dangerouslySetInnerHTML={{ __html: tooltip.content }} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EmotionTimeline; 