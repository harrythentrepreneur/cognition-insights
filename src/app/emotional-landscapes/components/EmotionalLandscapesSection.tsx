import { logger } from '@/lib/utils/logger';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { BasePageSection } from '../../../components/shared/base/BasePageSection';
import { BaseInsightsDelta } from '../../../components/shared/base/BaseInsightsDelta';
import { HabitImpact } from '../../../components/shared/types/insights';
import { MOCK_HABIT_IMPACTS, EMOTIONS } from '../constants';
import { EMOTIONAL_TIMELINE_EVENTS } from '../data/timeline-events';
import type { TimelineEvent } from '../data/timeline-events';
import { IndexedDBStorage } from '@/lib/storage/indexed-db';
import { TimelineInterpolator } from '@/lib/utils/timeline-interpolator';

const generateHeatmapData = (emotionId: string) => {
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getFullYear() - 1, 0, 1);

  let currentWeek = d3.timeWeek(startDate);
  const endWeek = d3.timeWeek(today);

  // Create emotion-specific patterns
  const emotionPatterns: Record<string, { baseIntensity: number; volatility: number; trend: number }> = {
    'joy': { baseIntensity: 0.6, volatility: 0.3, trend: 0.02 },
    'sadness': { baseIntensity: 0.3, volatility: 0.25, trend: -0.01 },
    'anger': { baseIntensity: 0.2, volatility: 0.4, trend: 0 },
    'love': { baseIntensity: 0.7, volatility: 0.2, trend: 0.01 },
    'fear': { baseIntensity: 0.25, volatility: 0.35, trend: -0.005 },
    'excitement': { baseIntensity: 0.5, volatility: 0.45, trend: 0.015 },
    'calm': { baseIntensity: 0.65, volatility: 0.15, trend: 0.005 },
    'hope': { baseIntensity: 0.55, volatility: 0.25, trend: 0.02 },
  };

  const pattern = emotionPatterns[emotionId] || { baseIntensity: 0.5, volatility: 0.3, trend: 0 };
  let trendOffset = 0;
  let lastIntensity = pattern.baseIntensity;

  while (currentWeek <= endWeek) {
    // Add seasonal variation
    const weekOfYear = d3.timeWeek.count(d3.timeYear(currentWeek), currentWeek);
    const seasonalFactor = Math.sin((weekOfYear / 52) * Math.PI * 2) * 0.1;
    
    // Create smooth transitions with momentum
    const momentum = (Math.random() - 0.5) * pattern.volatility;
    const newIntensity = lastIntensity + momentum + seasonalFactor + trendOffset;
    
    // Clamp and add some noise
    const intensity = Math.max(0, Math.min(1, 
      newIntensity + (Math.random() - 0.5) * 0.1
    ));
    
    // Calculate level with better distribution
    // Use a non-linear mapping to spread out the levels
    const adjustedIntensity = Math.pow(intensity, 0.8); // Slight compression
    const level = Math.min(4, Math.floor(adjustedIntensity * 5));
    
    data.push({
      date: new Date(currentWeek),
      intensity: intensity,
      level: level,
    });
    
    // Update for next iteration
    lastIntensity = intensity;
    trendOffset += pattern.trend * 0.01;
    currentWeek = d3.timeWeek.offset(currentWeek, 1);
  }
  
  return data;
};

interface EmotionalLandscapesSectionProps {
  sessionId?: string;
  useMockData?: boolean;
}

/**
 * Main emotional landscapes section component with life story timeline integration
 */
export const EmotionalLandscapesSection: React.FC<EmotionalLandscapesSectionProps> = ({
  sessionId,
  useMockData = false
}) => {
  // Timeline events state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true); // Start with loading true
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Behavioral Reflections state
  const [reflectionData, setReflectionData] = useState<HabitImpact[]>([]);
  const [isLoadingReflections, setIsLoadingReflections] = useState(true); // Start with loading true
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  // Track if we've attempted to load real data
  const [hasAttemptedRealDataLoad, setHasAttemptedRealDataLoad] = useState(false);

  // REAL EMOTIONAL TIMELINE DATA STATE
  const [realEmotionalData, setRealEmotionalData] = useState<any[]>([]);
  const [rawWeeklyEmotionalData, setRawWeeklyEmotionalData] = useState<any[]>([]); // Raw weekly data for heatmap
  const [emotionalDataLoading, setEmotionalDataLoading] = useState(false);
  const [emotionalDataError, setEmotionalDataError] = useState<string | null>(null);

  // WEEKLY HIGHLIGHTS DATA STATE
  const [weeklyHighlights, setWeeklyHighlights] = useState<Array<{
    week: string;
    weekly_summary: string[];
    weekly_topics: string[];
  }>>([]);

  // Track which weeks have real data (not interpolated)
  const [realDataWeeks, setRealDataWeeks] = useState<Set<string>>(new Set());

  // Current selected emotion for intensity display
  const [selectedEmotion, setSelectedEmotion] = useState<string>('love');

  // Initialize timeRange to a minimal range - will be updated with real data
  const [timeRange, setTimeRange] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.start && parsed.end) {
            const start = new Date(parsed.start);
            const end = new Date(parsed.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return { start, end };
            }
          }
        }
      } catch {}
    }
    return {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    };
  });

  // Render delay to prevent flash
  const [shouldRender, setShouldRender] = useState(false);

  // Track previous useMockData to prevent unnecessary state resets
  const prevUseMockData = useRef(useMockData);
  const sessionStatusRef = useRef<boolean | null>(null);
  const errorLoggedRef = useRef(false);

  // Helper function to convert snake_case to kebab-case for emotion IDs
  const snakeToKebab = (str: string): string => {
    return str.replace(/_/g, '-');
  };

  // Helper function to parse ISO week format or daily format
  const parseISOWeek = (isoWeek: string): Date => {
    // First check if it's already in YYYY-MM-DD format (new format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoWeek)) {
      return new Date(isoWeek);
    }
    
    // Check if it's a merged week format (e.g., '2024-W45-to-W47')
    if (isoWeek.includes('-to-W')) {
      const match = isoWeek.match(/^(\d{4})-W(\d{2})-to-W(\d{2})$/);
      if (match) {
        const [, yearStr, startWeek, endWeek] = match;
        const year = parseInt(yearStr);
        const startWeekNum = parseInt(startWeek);
        const endWeekNum = parseInt(endWeek);

        // Return the middle week's date
        const middleWeek = Math.floor((startWeekNum + endWeekNum) / 2);

        // Create a date for January 1st of the year
        const date = new Date(year, 0, 1);

        // Find the first Monday of the year
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
        date.setDate(date.getDate() + daysToMonday);

        // Add the appropriate number of weeks
        date.setDate(date.getDate() + (middleWeek - 1) * 7);

        return date;
      }
    }

    // Check if it's a batch format (e.g., '2025-batch-1')
    if (isoWeek.includes('-batch-')) {
      // For batches, we'll use the current date minus the batch number * 2 weeks
      // This spreads the batches across time
      const batchNumber = parseInt(isoWeek.split('-batch-')[1], 10);
      const currentDate = new Date();
      const weeksAgo = (9 - batchNumber) * 2; // Spread batches across ~18 weeks
      const batchDate = new Date(currentDate);
      batchDate.setDate(batchDate.getDate() - (weeksAgo * 7));
      return batchDate;
    }

    // Check if it's a daily format (e.g., '2024-07-15-daily')
    if (isoWeek.includes('-daily')) {
      const dateStr = isoWeek.replace('-daily', '');
      return new Date(dateStr);
    }

    // Check if it's a monthly format (e.g., '2023-M01', '2023-M12')
    if (isoWeek.includes('-M')) {
      const monthMatch = isoWeek.match(/^(\d{4})-M(\d{2})$/);
      if (monthMatch) {
        const [, yearStr, monthStr] = monthMatch;
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // JavaScript months are 0-indexed
        // Return the first day of the month
        return new Date(year, month, 1);
      }
    }

    // Check if it's a bi-weekly format (e.g., '2023-BiW01')
    if (isoWeek.includes('-BiW')) {
      const biWeekMatch = isoWeek.match(/^(\d{4})-BiW(\d{2})$/);
      if (biWeekMatch) {
        const [, yearStr, biWeekStr] = biWeekMatch;
        const year = parseInt(yearStr);
        const biWeekNum = parseInt(biWeekStr);
        // Each bi-week is 2 weeks, calculate the start date
        const date = new Date(year, 0, 1);
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        date.setDate(date.getDate() - daysToMonday + (biWeekNum - 1) * 7);
        return date;
      }
    }

    // Standard ISO week format (e.g., '2024-W28')
    const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
    if (!match) {
      logger.warn(`⚠️ Unknown week format: ${isoWeek}, using current date`);
      return new Date();
    }
    const [, year, week] = match;
    const date = new Date(parseInt(year), 0, 1);
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    date.setDate(date.getDate() - daysToMonday + (parseInt(week) - 1) * 7);
    return date;
  };

  // Fetch real emotional timeline data from IndexedDB
  const fetchEmotionalTimelineData = useCallback(async () => {
    if (!sessionId || useMockData) {
      logger.debug('⚠️ Not fetching real data:', { sessionId, useMockData });
      setRealEmotionalData([]);
      return;
    }

    setEmotionalDataLoading(true);
    setEmotionalDataError(null);

    try {
      const storage = new IndexedDBStorage();
      await storage.initialize();

      // Get analysis result from IndexedDB
      const result = await storage.getAnalysisResult(sessionId);

      if (!result) {
        logger.error('❌ No analysis results found in IndexedDB for session:', sessionId);
        setEmotionalDataError('No analysis results found. Please complete the analysis first.');
        setRealEmotionalData([]);
        return;
      }

      // Transform IndexedDB data to match the old API format
      if (result.emotional && result.emotional.weeklyAnalyses) {
        logger.debug('✅ Found emotional data in IndexedDB:', {
          weeklyAnalysesCount: result.emotional.weeklyAnalyses.length,
          firstWeek: result.emotional.weeklyAnalyses[0]?.week,
          firstWeekMetrics: result.emotional.weeklyAnalyses[0]?.metrics
        });

        // Track which weeks have real data FIRST, before transformation
        const realWeeks = new Set<string>();

        result.emotional.weeklyAnalyses.forEach((weekData: any) => {
          // Check if this week has any non-zero emotional data
          const hasEmotionalData = weekData.metrics &&
            Object.values(weekData.metrics).some((value: any) => value > 0);

          // Check if week has highlights
          const hasHighlights = weekData.highlights &&
            Array.isArray(weekData.highlights) &&
            weekData.highlights.length > 0 &&
            weekData.highlights.some((h: string) => h && h.trim() !== '' && h !== 'Emotional patterns during this period');

          // Check if week has weekly_summary
          const hasWeeklySummary = weekData.weekly_summary &&
            Array.isArray(weekData.weekly_summary) &&
            weekData.weekly_summary.length > 0 &&
            weekData.weekly_summary.some((h: string) => h && h.trim() !== '' && h !== 'Emotional patterns during this period');

          if (hasEmotionalData || hasHighlights || hasWeeklySummary) {
            // Convert ISO week to YYYY-MM-DD format to match timeline expectations
            const weekDate = parseISOWeek(weekData.week);
            const dayOfWeek = weekDate.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(weekDate);
            monday.setDate(monday.getDate() + daysToMonday);
            const weekString = monday.toISOString().split('T')[0];
            realWeeks.add(weekString);
          }
        });

        // Real data weeks identified

        // Create emotions array in the old API format
        const emotions = EMOTIONS.map((emotion, emotionIndex) => {
          const data: any[] = [];

          result.emotional.weeklyAnalyses.forEach((week: any) => {
            const weekDate = parseISOWeek(week.week);
            
            // Add a small offset for each emotion to prevent all lines from spiking at the same point
            // This creates a natural staggered effect across emotions
            const emotionOffset = new Date(weekDate);
            
            // Enhanced offset calculation using a sinusoidal pattern for better visual spread
            const emotionPhase = (emotionIndex / EMOTIONS.length) * 2 * Math.PI;
            const offsetPattern = (1 + Math.sin(emotionPhase - Math.PI/2)) / 2; // 0 to 1 range
            
            // For W/M formats, spread emotions across the period
            if (week.week.includes('-M')) {
              // Monthly: spread emotions across the month with sinusoidal distribution
              const daysInMonth = new Date(weekDate.getFullYear(), weekDate.getMonth() + 1, 0).getDate();
              const offsetDays = Math.floor(offsetPattern * (daysInMonth - 4)); // Leave some margin
              emotionOffset.setDate(emotionOffset.getDate() + offsetDays);
            } else if (week.week.includes('-BiW')) {
              // Bi-weekly: spread emotions across 2 weeks with smooth distribution
              const offsetDays = Math.floor(offsetPattern * 12); // 0-12 days spread
              emotionOffset.setDate(emotionOffset.getDate() + offsetDays);
            } else if (week.week.includes('-W')) {
              // Weekly: spread emotions across the week with natural variation
              const offsetDays = Math.floor(offsetPattern * 5) + Math.random() * 0.5; // 0-5.5 days
              emotionOffset.setDate(emotionOffset.getDate() + offsetDays);
            } else if (week.week.includes('-daily')) {
              // Daily: spread emotions across hours for intraday variation
              const offsetHours = Math.floor(offsetPattern * 20) + 2; // 2-22 hours
              emotionOffset.setHours(offsetHours);
            }
            // For batch format, use phase-based distribution
            if (week.week.includes('-batch-')) {
              const batchSpread = Math.floor(offsetPattern * 3); // 0-3 days variation
              emotionOffset.setDate(emotionOffset.getDate() + batchSpread);
            }

            // Get the emotion value from the weekly metrics
            let intensity = 0;
            // Convert emotion ID from kebab-case to snake_case to match analyzer output
            const metricKey = emotion.id.replace(/-/g, '_');
            
            if (week.metrics && (week.metrics[emotion.id] || week.metrics[metricKey])) {
              // IndexedDB stores values as 0-100 percentages
              // Try both kebab-case and snake_case keys
              const rawValue = week.metrics[emotion.id] || week.metrics[metricKey];
              // Convert to 0-1 range for chart display
              // Handle both 0-100 range (from IndexedDB) and 0-1 range (if already normalized)
              intensity = rawValue > 1 ? rawValue / 100 : rawValue;
              // Ensure minimum visibility for better chart appearance
              if (intensity > 0 && intensity < 0.08) {
                intensity = 0.08; // Minimum 8% visibility for better chart appearance
              }
              if (emotion.id === 'joy' && week === result.emotional.weeklyAnalyses[0]) {
                logger.debug(`📊 Converting ${emotion.id}: ${rawValue} → ${intensity}`);
              }
            }

            // Add main week data point with real intensity
            data.push({
              timestamp: emotionOffset,
              intensity: intensity,
              week: week.week,
              isRealData: true
            });

            // Add sub-points if available
            if (week.subPoints && Array.isArray(week.subPoints)) {
              week.subPoints.forEach((subPoint: any) => {
                const subDate = new Date(emotionOffset);

                // Handle different period types
                if (week.week.includes('-M')) {
                  // Monthly: distribute across the month
                  const daysInMonth = new Date(subDate.getFullYear(), subDate.getMonth() + 1, 0).getDate();
                  if (subPoint.day === 'Week 1') {
                    subDate.setDate(7);
                  } else if (subPoint.day === 'Week 2') {
                    subDate.setDate(14);
                  } else if (subPoint.day === 'Week 3') {
                    subDate.setDate(21);
                  } else if (subPoint.day === 'Week 4') {
                    subDate.setDate(Math.min(28, daysInMonth));
                  }
                } else if (week.week.includes('-BiW')) {
                  // Bi-weekly: distribute across 2 weeks
                  if (subPoint.day === 'Week 1') {
                    subDate.setDate(subDate.getDate() + 3);
                  } else if (subPoint.day === 'Mid-period') {
                    subDate.setDate(subDate.getDate() + 7);
                  } else if (subPoint.day === 'Week 2') {
                    subDate.setDate(subDate.getDate() + 10);
                  }
                } else if (week.week.includes('-daily')) {
                  // Daily: distribute across the day
                  if (subPoint.day === 'Morning') {
                    subDate.setHours(9, 0, 0);
                  } else if (subPoint.day === 'Afternoon') {
                    subDate.setHours(14, 0, 0);
                  } else if (subPoint.day === 'Evening') {
                    subDate.setHours(19, 0, 0);
                  }
                } else {
                  // Weekly: use days of the week
                  const dayOffset = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    .indexOf(subPoint.day);

                  if (dayOffset !== -1) {
                    const currentDay = subDate.getDay();
                    const daysToAdd = dayOffset - (currentDay === 0 ? 6 : currentDay - 1);
                    subDate.setDate(subDate.getDate() + daysToAdd);
                  }
                }

                // Get intensity for this emotion from sub-point
                let subIntensity = 0;
                const subMetricKey = emotion.id.replace(/-/g, '_');
                
                if (subPoint.metrics && (subPoint.metrics[emotion.id] || subPoint.metrics[subMetricKey])) {
                  // Preserve the original scale for sub-points too
                  const rawValue = subPoint.metrics[emotion.id] || subPoint.metrics[subMetricKey];
                  subIntensity = rawValue > 1 ? rawValue / 100 : rawValue;
                } else if (subPoint.intensity && week.emotionalIntensity) {
                  // Use general intensity scaled by the week's emotion ratio
                  subIntensity = intensity * (subPoint.intensity / week.emotionalIntensity);
                }

                // Only add sub-points if they have meaningful data
                if (subIntensity > 0.01) {
                  data.push({
                    timestamp: new Date(subDate),
                    intensity: subIntensity,
                    week: week.week,
                    isSubPoint: true,
                    note: subPoint.note,
                    isRealData: true
                  });
                }
              });
            }
          });

          // Sort data by timestamp
          data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          const weekly_summaries = result.emotional.weeklyAnalyses.map((week: any) =>
            [week.summary || 'Weekly emotional journey']
          );

          const weekly_topics = result.emotional.weeklyAnalyses.map((week: any) =>
            week.topics || week.dominantEmotions || []
          );

          return {
            id: emotion.id,
            name: emotion.name,
            color: emotion.color,
            data,
            weekly_summaries,
            weekly_topics
          };
        });

        // Save raw weekly data for heatmap BEFORE interpolation
        const rawWeeklyData = emotions.map((emotion: any) => ({
          id: emotion.id,
          data: result.emotional.weeklyAnalyses.map((week: any) => {
            const weekDate = parseISOWeek(week.week);
            const metricKey = emotion.id.replace(/-/g, '_');
            const rawValue = week.metrics && (week.metrics[emotion.id] || week.metrics[metricKey]) || 0;
            const intensity = rawValue > 1 ? rawValue / 100 : rawValue;
            
            return {
              week: week.week,
              date: weekDate,
              intensity: intensity,
              rawValue: rawValue
            };
          })
        }));
        setRawWeeklyEmotionalData(rawWeeklyData);
        
        // Now transform to BaseTimeline format - preserve real data
        const transformedData = emotions.map((emotion: any) => ({
          id: emotion.id,
          name: emotion.name,
          color: emotion.color,
          data: emotion.data.map((point: any) => {
            // Preserve the real intensity data without artificial enhancements
            const realIntensity = point.intensity;

            // Check if this is real data by matching week
            const pointWeekMonday = new Date(point.timestamp);
            const pointDayOfWeek = pointWeekMonday.getDay();
            const pointDaysToMonday = pointDayOfWeek === 0 ? -6 : 1 - pointDayOfWeek;
            pointWeekMonday.setDate(pointWeekMonday.getDate() + pointDaysToMonday);
            const pointWeekStr = pointWeekMonday.toISOString().split('T')[0];
            const isRealData = realWeeks.has(pointWeekStr) || point.isSubPoint;

            return {
              timestamp: new Date(point.timestamp),
              intensity: realIntensity, // Use real intensity without modifications
              week: point.week,
              isSubPoint: point.isSubPoint,
              note: point.note,
              isRealData: isRealData,
              isGapFill: point.isGapFill
            };
          })
        }));

        // Transformed emotional data for BaseTimeline


        // Apply intelligent interpolation for smooth visualization
        // BUT tooltips will only show for weeks with real data
        // With sub-points, we may already have enough data points
        const currentDataPoints = transformedData[0]?.data?.length || 0;

        // Always apply interpolation for smooth visualization
        const isMonthlyData = result.emotional.weeklyAnalyses.some((w: any) => w.week.includes('-M'));
        const needsInterpolation = true; // Always interpolate for smooth lines

        if (needsInterpolation) {
          logger.debug('🎨 [SECTION DEBUG] Applying minimal interpolation for smooth visualization');
          logger.debug(`📊 Current data points: ${currentDataPoints} (including sub-points)`);

          // Calculate appropriate interpolation based on actual data duration
          const firstDate = new Date(transformedData[0]?.data[0]?.timestamp);
          const lastDate = new Date(transformedData[0]?.data[transformedData[0].data.length - 1]?.timestamp);
          const durationDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
          const durationWeeks = Math.ceil(durationDays / 7);

          // Enhanced interpolation settings for smoother visualization with gap connection
          let targetMinPoints = Math.max(currentDataPoints * 3, 60); // More points for smoother lines
          let targetMaxPoints = Math.max(currentDataPoints * 5, 100); // More interpolated points
          let smoothingFactor = 0.35; // Increased smoothing for better curves

          if (durationWeeks <= 4) {
            // Tier 1: < 4 weeks - Good interpolation for smooth daily views
            targetMinPoints = Math.max(currentDataPoints * 3, 30);
            targetMaxPoints = Math.max(currentDataPoints * 5, 50);
            smoothingFactor = 0.3; // Smooth curves
          } else if (durationWeeks <= 12) {
            // Tier 2: 1-3 months - More interpolation for weekly views
            targetMinPoints = Math.max(currentDataPoints * 3, 50);
            targetMaxPoints = Math.max(currentDataPoints * 5, 80);
            smoothingFactor = 0.35; // Smoother curves
          } else if (durationWeeks <= 52) {
            // Tier 3: 3-12 months - Enhanced interpolation
            targetMinPoints = Math.max(currentDataPoints * 4, 80);
            targetMaxPoints = Math.max(currentDataPoints * 6, 120);
            smoothingFactor = 0.4; // Nice smooth curves
          } else {
            // Tier 4: > 1 year - Maximum smoothing
            if (isMonthlyData) {
              targetMinPoints = Math.max(currentDataPoints * 5, 150);
              targetMaxPoints = Math.max(currentDataPoints * 8, 200);
              smoothingFactor = 0.45; // Very smooth
            } else {
              targetMinPoints = Math.max(currentDataPoints * 4, 100);
              targetMaxPoints = Math.max(currentDataPoints * 6, 150);
              smoothingFactor = 0.4; // Smooth curves
            }
          }

          // logger.debug('🎨 [SECTION DEBUG] Tier-based interpolation settings:', {
          //   tier: durationWeeks <= 4 ? 1 : durationWeeks <= 12 ? 2 : durationWeeks <= 52 ? 3 : 4,
          //   durationWeeks,
          //   originalPoints: transformedData[0]?.data?.length || 0,
          //   targetMinPoints,
          //   targetMaxPoints,
          //   smoothingFactor
          // });

          const interpolatedData = TimelineInterpolator.interpolateEmotionalData(transformedData, {
            minPoints: targetMinPoints,
            maxPoints: targetMaxPoints,
            smoothing: smoothingFactor,
            adaptToTimespan: true,
            preservePeaks: true, // Preserve emotional peaks
            minIntensity: 0.05, // Minimum baseline for better visibility
            connectGaps: true, // Connect data gaps smoothly
            gapThreshold: 60 // Only connect very large gaps (60+ days)
          });

          // Interpolation complete

          // Filter interpolated data to preserve real data points and remove only artificial zero points
          const filteredInterpolatedData = interpolatedData.map((emotion: any) => ({
            ...emotion,
            data: emotion.data.filter((point: any) => {
              // Keep all real data points, even if intensity is 0
              if (point.isRealData) return true;
              // Keep gap fill points to maintain connectivity
              if (point.isGapFill) return true;
              // Only filter out artificial zero points from interpolation
              return point.intensity > 0.01;
            }).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())
          }));

          // Interpolation and filtering complete

          // Use filtered interpolated data for visualization
          setRealEmotionalData(filteredInterpolatedData);

          // Update time range based on the actual data range
          if (filteredInterpolatedData.length > 0 && filteredInterpolatedData[0].data.length > 0) {
            const allTimestamps = filteredInterpolatedData.flatMap(emotion =>
              emotion.data.map((point: any) => point.timestamp)
            );
            const minDate = new Date(Math.min(...allTimestamps.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...allTimestamps.map(d => d.getTime())));

            let hasGlobalRange = false;
            try { hasGlobalRange = !!localStorage.getItem('global-date-range'); } catch {}
            if (!hasGlobalRange) {
              setTimeRange({
                start: minDate,
                end: maxDate
              });
            }
            // logger.debug('🎭 [SECTION DEBUG] Updated time range from interpolated data:', {
            //   start: minDate,
            //   end: maxDate,
            //   totalDataPoints: allTimestamps.length
            // });
          }
        } else {
          // logger.debug('🎨 [SECTION DEBUG] Sufficient data points, skipping interpolation');

          // Filter data to preserve real data points and remove only artificial zero points
          logger.debug('📊 [SECTION DEBUG] Filtering data while preserving real points');
          const filteredData = transformedData.map(emotion => ({
            ...emotion,
            data: emotion.data.filter((point: any) => {
              // Keep all real data points, even if intensity is 0
              if (point.isRealData) return true;
              // Keep gap fill points to maintain connectivity
              if (point.isGapFill) return true;
              // Only filter out artificial zero points
              return point.intensity > 0.01;
            }).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())
          }));

          // logger.debug('📊 [SECTION DEBUG] Filtered data:', {
          //   originalPoints: transformedData[0]?.data?.length || 0,
          //   filteredPoints: filteredData[0]?.data?.length || 0,
          //   emotions: filteredData.length
          // });

          setRealEmotionalData(filteredData);

          // Update time range based on the actual data range
          if (filteredData.length > 0 && filteredData[0].data.length > 0) {
            const allTimestamps = filteredData.flatMap(emotion =>
              emotion.data.map((point: any) => point.timestamp)
            );
            const minDate = new Date(Math.min(...allTimestamps.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...allTimestamps.map(d => d.getTime())));

            let hasGlobalRange = false;
            try { hasGlobalRange = !!localStorage.getItem('global-date-range'); } catch {}
            if (!hasGlobalRange) {
              setTimeRange({
                start: minDate,
                end: maxDate
              });
            }
            // logger.debug('🎭 [SECTION DEBUG] Updated time range from filtered data:', {
            //   start: minDate,
            //   end: maxDate,
            //   totalDataPoints: allTimestamps.length
            // });
          }
        }

        // EXTRACT WEEKLY HIGHLIGHTS directly from weeklyAnalyses
        // This ensures we get the correct data structure
        const extractedHighlights: Array<{
          week: string;
          weekly_summary: string[];
          weekly_topics: string[];
        }> = [];

        if (result.emotional && result.emotional.weeklyAnalyses) {
          result.emotional.weeklyAnalyses.forEach((weekData: any) => {
            // Parse the ISO week to get a proper date
            const weekDate = parseISOWeek(weekData.week);
            // Get the Monday of the week for consistent matching
            const dayOfWeek = weekDate.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(weekDate);
            monday.setDate(monday.getDate() + daysToMonday);
            // Format it as YYYY-MM-DD for consistency with the timeline
            const weekString = monday.toISOString().split('T')[0];

            // Extract highlights ensuring we get meaningful data
            let summaryData = [];

            // Try different fields for summary/highlights
            // IMPORTANT: Check weekly_summary FIRST (new field with proper summaries)
            if (weekData.weekly_summary && Array.isArray(weekData.weekly_summary) && weekData.weekly_summary.length > 0) {
              summaryData = weekData.weekly_summary;
            } else if (weekData.highlights && Array.isArray(weekData.highlights) && weekData.highlights.length > 0) {
              // Only use highlights if they're not the generic fallback text
              const isGenericText = weekData.highlights.some((h: string) =>
                h.includes('messages analyzed') ||
                h.includes('Conversation activity detected') ||
                h.includes('Emotional patterns emerging')
              );
              if (!isGenericText) {
                summaryData = weekData.highlights;
              } else {
                // Skip generic highlights and try other fields
                if (weekData.summary && typeof weekData.summary === 'string' && weekData.summary.trim() !== '') {
                  summaryData = [weekData.summary];
                } else if (weekData.dominantEmotions && weekData.dominantEmotions.length > 0) {
                  summaryData = [`Dominant emotions: ${weekData.dominantEmotions.join(', ')}`];
                } else {
                  summaryData = ['Emotional patterns analyzed'];
                }
              }
            } else if (weekData.summary && typeof weekData.summary === 'string' && weekData.summary.trim() !== '') {
              summaryData = [weekData.summary];
            } else {
              // Generate summary from dominant emotions if available
              if (weekData.dominantEmotions && weekData.dominantEmotions.length > 0) {
                summaryData = [`Dominant emotions: ${weekData.dominantEmotions.join(', ')}`];
              } else if (weekData.emotionalIntensity) {
                summaryData = [`Emotional intensity: ${weekData.emotionalIntensity}%`];
              } else {
                summaryData = ['Emotional patterns analyzed'];
              }
            }

            extractedHighlights.push({
              week: weekString,
              weekly_summary: summaryData,
              weekly_topics: weekData.topics || weekData.dominantEmotions || []
            });

            // Skip adding sub-point notes as weekly highlights
            // SubPoints are for granular emotional tracking, not weekly summaries
            // This prevents generic text like "Wednesday emotional state" from appearing
            // Weekly summaries should only come from the weekly_summary field

            // Weekly highlight processing complete
          });

          // Weekly highlights extracted successfully

          // Store highlights for now
          setWeeklyHighlights(extractedHighlights);

          // Use the real highlights without generating fake ones
          // Only show tooltips for weeks that have actual analysis
          setRealDataWeeks(realWeeks);

          // Real data weeks processed successfully
        } else {
          logger.debug('⚠️ [SECTION DEBUG] No weekly highlights found in API response');
          setWeeklyHighlights([]);
        }

        // No interpolation - only use real highlights
        // logger.debug('🎭 [SECTION DEBUG] Using real highlights without interpolation');

        // Update time range based on the data we're actually using (interpolated or original)
        const finalDataForTimeRange = needsInterpolation ?
          TimelineInterpolator.interpolateEmotionalData(transformedData, {
            minPoints: 52,
            maxPoints: 156,
            smoothing: 0.3,
            adaptToTimespan: true
          }) : transformedData;

        if (finalDataForTimeRange.length > 0 && finalDataForTimeRange[0].data.length > 0) {
          const dataPoints = finalDataForTimeRange[0].data;

          // Find the actual date range from the original messages
          const firstDate = dataPoints[0].timestamp;
          const lastDate = dataPoints[dataPoints.length - 1].timestamp;

          // Add some padding to the time range for better visualization
          const timeDiff = lastDate.getTime() - firstDate.getTime();
          const padding = timeDiff * 0.1; // 10% padding on each side

          const newTimeRange = {
            start: new Date(firstDate.getTime() - padding),
            end: new Date(lastDate.getTime() + padding),
          };

          // Time range set successfully
          let hasGlobalRange = false;
          try { hasGlobalRange = !!localStorage.getItem('global-date-range'); } catch {}
          if (!hasGlobalRange) {
            setTimeRange(newTimeRange);
          }
        }
      } else {
        logger.debug('⚠️ [SECTION DEBUG] No completed emotional data available');
        setRealEmotionalData([]);
      }
    } catch (err) {
      logger.error('❌ [SECTION DEBUG] Error fetching emotional timeline:', err);
      setEmotionalDataError(err instanceof Error ? err.message : 'Failed to fetch emotional data');
      setRealEmotionalData([]);
    } finally {
      setEmotionalDataLoading(false);
    }
  }, [sessionId, useMockData]);

  // Fetch emotional timeline data when sessionId changes
  useEffect(() => {
    const loadWithDelay = async () => {
      // Add a small delay to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 150));
      fetchEmotionalTimelineData();
    };
    loadWithDelay();
  }, [fetchEmotionalTimelineData]);

  // Check if session is ready in IndexedDB - with debouncing
  const checkSessionStatus = useCallback(async () => {
    if (!sessionId || useMockData) return true;

    try {
      // Avoid logging on every check to reduce console noise
      const storage = new IndexedDBStorage();
      await storage.initialize();
      const result = await storage.getAnalysisResult(sessionId);
      const isReady = !!result;
      
      // Only log when status changes
      if (isReady !== sessionStatusRef.current) {
        logger.debug('📊 Session status changed:', isReady ? 'completed' : 'not ready', 'for session:', sessionId);
        sessionStatusRef.current = isReady;
      }
      
      return isReady;
    } catch (err) {
      // Only log errors once
      if (!errorLoggedRef.current) {
        logger.debug('⚠️ Could not check session status:', err);
        errorLoggedRef.current = true;
      }
      return false;
    }
  }, [sessionId, useMockData]);

  // Fetch life story events when sessionId is available and not using mock data
  useEffect(() => {
    const fetchAllData = async () => {
      logger.debug('🔄 EmotionalLandscapesSection effect triggered - sessionId:', sessionId, 'useMockData:', useMockData);

      if (!sessionId) {
        logger.debug('⚠️ No sessionId provided, skipping fetch');
        return;
      }

      // Add a small delay to ensure everything is ready and prevent flash
      await new Promise(resolve => setTimeout(resolve, 100));

      // Only reset state if we're switching from mock to real data or vice versa
      if (useMockData !== prevUseMockData.current) {
        setTimelineEvents([]);
        setReflectionData([]);
        prevUseMockData.current = useMockData;
      }

      // Prevent multiple simultaneous fetches - but allow initial load
      if ((timelineLoading || isLoadingReflections) && (timelineEvents.length > 0 || reflectionData.length > 0)) {
        logger.debug('🔄 Data already loading, skipping duplicate fetch');
        return;
      }

      // If using mock data, load it immediately
      if (useMockData) {
        logger.debug('📝 Loading mock data immediately');
        setTimelineEvents(EMOTIONAL_TIMELINE_EVENTS);
        setReflectionData(MOCK_HABIT_IMPACTS);
        setTimelineLoading(false);
        setIsLoadingReflections(false);
        return;
      }

      // Only attempt real data loading once
      if (hasAttemptedRealDataLoad) {
        return;
      }
      setHasAttemptedRealDataLoad(true);

      // Check if session is ready before making API calls
      const isSessionReady = await checkSessionStatus();
      logger.debug('🔍 Session ready check result:', isSessionReady);
      if (!isSessionReady) {
        logger.debug('⚠️ Session not ready yet, keeping loading state');
        setTimelineLoading(true);
        return;
      }
      setTimelineLoading(true);
      setTimelineError(null);

      let result: any = null;

      try {
        logger.debug('📖 Fetching data from IndexedDB for session:', sessionId);

        const storage = new IndexedDBStorage();
        await storage.initialize();
        result = await storage.getAnalysisResult(sessionId);

        if (!result) {
          logger.debug('⚠️ No analysis results found for timeline events');
          setTimelineError('No analysis results found. Please complete the analysis first.');
          setTimelineLoading(false);
          return;
        }

        logger.debug('📖 IndexedDB data loaded:', !!result);

        // Use timeline events if available
        if (result.timelineEvents && result.timelineEvents.lifeEvents && result.timelineEvents.lifeEvents.length > 0) {
          logger.debug('📖 Using real timeline events:', result.timelineEvents.lifeEvents.length);
          setTimelineEvents(result.timelineEvents.lifeEvents);
        } else if (result.emotional && result.emotional.weeklyAnalyses && result.emotional.weeklyAnalyses.length > 0) {
          // Fallback: Generate life story events from emotional data
          const transformedEvents = result.emotional.weeklyAnalyses
            .filter((week: any) => week.emotionalIntensity > 70) // Only significant weeks
            .map((week: any, index: number) => {
              const weekDate = parseISOWeek(week.week);
              const dominantEmotion = week.dominantEmotions?.[0] || 'growth';

              return {
                id: `life-event-${index}`,
                title: `${dominantEmotion} Peak`,
                time: weekDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                day: weekDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                emotion: dominantEmotion.toLowerCase(),
                intensity: week.emotionalIntensity || 75,
                description: week.summary || 'A significant emotional moment'
              };
            });

          logger.debug(`✅ Loaded ${transformedEvents.length} real life story events`);
          setTimelineEvents(transformedEvents);
        } else {
          logger.debug('⚠️ No life story data available');
          setTimelineError('No life story data found');
        }

        // Mark timeline loading as complete
        setTimelineLoading(false);
      } catch (timelineErr) {
        logger.error('❌ Error loading timeline events:', timelineErr);
        setTimelineError(timelineErr instanceof Error ? timelineErr.message : 'Failed to load timeline events');
        // Set error instead of falling back to mock data
        setTimelineError('Failed to load timeline events');
        setTimelineLoading(false);
      }

      // Get behavioral reflections from triggers analysis (separate try-catch)
      try {
        setIsLoadingReflections(true);
        setReflectionError(null);

        // Use behavioral reflections if available
        if (result && result.behavioralReflections && result.behavioralReflections.habitImpacts && result.behavioralReflections.habitImpacts.length > 0) {
          logger.debug('🔍 Using real behavioral reflections:', result.behavioralReflections.habitImpacts.length);
          setReflectionData(result.behavioralReflections.habitImpacts);
        } else if (result && result.triggers && result.triggers.behavioralPatterns) {
          // Fallback: Transform behavioral insights from triggers analysis
          const habits: HabitImpact[] = result.triggers.behavioralPatterns
            .slice(0, 6) // Take top 6 patterns
            .map((pattern: any, index: number) => ({
              id: `habit-${index}`,
              habit: pattern.pattern || pattern.description || 'Communication Pattern',
              impact: pattern.emotionalImpact || (pattern.frequency > 0.5 ? 20 : -10),
              category: pattern.category || 'General',
              description: pattern.examples ? pattern.examples[0] : 'Behavioral pattern analysis'
            }));

          logger.debug(`✅ Loaded ${habits.length} behavioral patterns from fallback`);
          setReflectionData(habits);
        } else {
          logger.debug('⚠️ No behavioral reflection data available');
          setReflectionError('No behavioral reflection data found');
        }
      } catch (err) {
        logger.error('❌ [REFLECTIONS DEBUG] Error fetching behavioral reflections:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        });
        setReflectionError(err instanceof Error ? err.message : 'Failed to fetch behavioral reflections');
        // Set error instead of falling back to mock data
        logger.debug('🔄 [REFLECTIONS DEBUG] Error loading behavioral reflections');
        setReflectionError('Failed to load behavioral reflections');
      } finally {
        setIsLoadingReflections(false);
        logger.debug('🏁 [REFLECTIONS DEBUG] Behavioral reflections fetch completed');
      }
    };

    fetchAllData();
  }, [sessionId, useMockData, checkSessionStatus]);

  const handleTimeRangeChange = (newTimeRange: { start: Date; end: Date }) => {
    logger.debug('Emotional landscapes received timeRange change:', newTimeRange);
    setTimeRange(newTimeRange);
  };

  // Listen for global date range changes from the hamburger menu
  const [cropRange, setCropRange] = useState<{ start: Date; end: Date } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.start && parsed.end) {
            const start = new Date(parsed.start);
            const end = new Date(parsed.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return { start, end };
            }
          }
        }
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail;
      if (start && end) {
        const newRange = { start: new Date(start), end: new Date(end) };
        handleTimeRangeChange(newRange);
        setCropRange(newRange);
      }
    };
    window.addEventListener('dateRangeChange', handler);
    return () => window.removeEventListener('dateRangeChange', handler);
  }, []);

  // Add a delay before showing content to prevent flash
  useEffect(() => {
    // Wait a bit to ensure data starts loading before showing anything
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 500); // Small delay to let data start loading
    
    return () => clearTimeout(timer);
  }, []);

  // Calculate current intensity of selected emotion
  const getCurrentEmotionIntensity = useCallback(() => {
    if (!realEmotionalData.length) return 0;

    const emotionData = realEmotionalData.find(emotion => emotion.id === selectedEmotion);
    if (!emotionData || !emotionData.data.length) return 0;

    // Get the most recent data point
    const sortedData = [...emotionData.data].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedData[0]?.intensity || 0;
  }, [realEmotionalData, selectedEmotion]);

  // Get selected emotion color
  const getSelectedEmotionColor = useCallback(() => {
    const emotion = EMOTIONS.find(e => e.id === selectedEmotion);
    return emotion?.color || '#FF6B9D';
  }, [selectedEmotion]);

  const insights = [
    {
      id: 'delta',
      title: 'Habit Impacts',
      content: (
        <BaseInsightsDelta
          data={reflectionData}
          timeRange={timeRange}
          isLoading={isLoadingReflections}
          error={reflectionError}
        />
      )
    }
  ];

  const colorScheme = {
    0: '#FF6B6B',
    1: '#FFD700',
    2: '#4ECDC4',
    3: '#45B7D1',
    4: '#8B5CF6',
  };

  // Use real emotional data if available and not using mock data, otherwise use EMOTIONS for mock patterns
  // Make sure the data has the proper timeline structure
  const timelineData = useMemo(() => {
    if (useMockData) {
      logger.debug('🎭 Using mock data (useMockData=true)');
      // If using mock data, return mock data immediately
      return EMOTIONS.map(emotion => ({
        ...emotion,
        data: [] // BasePageSection will generate the mock data
      }));
    } else if (realEmotionalData.length > 0) {
      // If we have real data, use it
      logger.debug('✅ Using real emotional data from IndexedDB:', {
        emotionCount: realEmotionalData.length,
        firstEmotion: realEmotionalData[0]?.name,
        dataPoints: realEmotionalData[0]?.data?.length
      });
      return realEmotionalData;
    } else {
      logger.debug('⏳ No real data yet, showing loading state');
      // If no real data yet and not using mock data, provide mock data structure but BasePageSection will show loading
      return EMOTIONS.map(emotion => ({
        ...emotion,
        data: [] // Empty data array - BasePageSection will handle loading state
      }));
    }
  }, [useMockData, realEmotionalData]);

  // logger.debug('🎭 [SECTION DEBUG] Rendering BasePageSection with:', {
  //   useMockData,
  //   hasRealData: realEmotionalData.length > 0,
  //   timelineDataCount: timelineData.length,
  //   emotionalDataLoading,
  //   timelineDataSource: (!useMockData && realEmotionalData.length > 0) ? 'real' : 'mock',
  //   firstEmotionData: timelineData[0]?.data?.length || 0,
  //   dataStructure: timelineData[0] ? {
  //     hasData: !!timelineData[0].data,
  //     dataIsArray: Array.isArray(timelineData[0].data),
  //     firstTimestamp: timelineData[0].data?.[0]?.timestamp,
  //     timestampIsDate: timelineData[0].data?.[0]?.timestamp instanceof Date
  //   } : 'no data'
  // });

  // Default to only Joy, Sadness, Anger, and Love active
  const defaultEmotionIds = ['joy', 'sadness', 'anger', 'love'];
  const defaultActiveItems = timelineData.reduce((acc, item) => {
    acc[item.id] = defaultEmotionIds.includes(item.id);
    return acc;
  }, {} as Record<string, boolean>);

  // Create emotion heatmap data from RAW WEEKLY data (not interpolated)
  const emotionHeatmapData = useMemo(() => {
    if (!rawWeeklyEmotionalData.length || useMockData) {
      return undefined; // Let BaseHeatmap use its mock data
    }

    // Transform raw weekly data into heatmap format with RELATIVE scaling
    const heatmapData: Record<string, any[]> = {};

    rawWeeklyEmotionalData.forEach(emotion => {
      // First, find the min and max for THIS emotion to normalize relatively
      const intensities = emotion.data.map((d: any) => d.intensity);
      const minIntensity = Math.min(...intensities);
      const maxIntensity = Math.max(...intensities);
      const range = maxIntensity - minIntensity;
      
      // If range is too small, use a minimum range to avoid division issues
      const effectiveRange = Math.max(range, 0.1);
      
      heatmapData[emotion.id] = emotion.data.map((weekData: any) => {
        const intensity = weekData.intensity;
        
        // Normalize to 0-1 based on this emotion's actual range
        // This ensures even small variations (70% to 90%) use the full color scale
        let relativeIntensity = (intensity - minIntensity) / effectiveRange;
        
        // Apply a slight curve to enhance middle values
        // Using sqrt (power 0.5) to lift lower values more
        relativeIntensity = Math.pow(relativeIntensity, 0.6);
        
        // Ensure we don't go below 0.05 (for visibility) or above 0.95
        const finalIntensity = 0.05 + (relativeIntensity * 0.9);
        
        return {
          date: weekData.date,
          intensity: finalIntensity,
          level: Math.min(4, Math.floor(finalIntensity * 5)), // Convert 0-1 to 0-4 scale
          week: weekData.week,
          rawValue: weekData.rawValue,
          originalIntensity: intensity // Keep original for tooltip
        };
      });
    });

    return heatmapData;
  }, [rawWeeklyEmotionalData, useMockData]);

  const currentIntensity = getCurrentEmotionIntensity();
  const selectedEmotionColor = getSelectedEmotionColor();
  const selectedEmotionName = EMOTIONS.find(e => e.id === selectedEmotion)?.name || 'Love';

  // Don't render anything until delay passes to prevent flash
  if (!shouldRender) {
    return null;
  }

  return (
    <div className="relative">
      <BasePageSection
        data={timelineData}
        insights={insights}
        defaultActiveItems={defaultActiveItems}
        generateHeatmapData={generateHeatmapData}
        colorScheme={colorScheme}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        timelineEvents={timelineEvents}
        timelineLoading={timelineLoading || emotionalDataLoading}
        timelineError={timelineError || emotionalDataError}
        weeklyHighlights={weeklyHighlights}
        realDataWeeks={realDataWeeks}
        emotionHeatmapData={emotionHeatmapData}
        cropExtent={cropRange}
      />
    </div>
  );
};