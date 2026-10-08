import { TimelineDataItem } from '@/components/shared/types/timeline';

export interface InterpolationOptions {
  minPoints?: number;      // Minimum points to show (default: 20)
  maxPoints?: number;      // Maximum points to show (default: 156)
  smoothing?: number;      // Smoothing factor 0-1 (default: 0.1) - reduced from 0.3
  adaptToTimespan?: boolean; // Adapt density to conversation length (default: true)
  preservePeaks?: boolean;  // Preserve emotional peaks (default: true)
  minIntensity?: number;    // Minimum baseline intensity (default: 0.05)
  connectGaps?: boolean;    // Connect data gaps smoothly (default: true)
  gapThreshold?: number;    // Days threshold for gap detection (default: 14)
}

interface DataPoint {
  timestamp: Date;
  intensity: number;
  isGapFill?: boolean;
  week?: string;
  isSubPoint?: boolean;
  note?: string;
  isRealData?: boolean;
}

/**
 * Intelligently interpolates sparse emotional data points for smoother visualization
 * while maintaining data integrity and trends
 */
export class TimelineInterpolator {

  /**
   * Interpolate sparse data points to create a smoother visualization
   * Adapts to conversation length - short chats get weekly points, long chats get monthly
   */
  static interpolateEmotionalData(
    originalData: TimelineDataItem[],
    options: InterpolationOptions = {}
  ): TimelineDataItem[] {
    const {
      minPoints = 20,
      maxPoints = 156,
      smoothing = 0.3,  // Increased for smoother curves
      adaptToTimespan = true,
      preservePeaks = true,
      minIntensity = 0.05,  // Increased from 0.01 for better visibility
      connectGaps = true,
      gapThreshold = 14
    } = options;

    if (!originalData.length || !originalData[0]?.data?.length) {
      return originalData;
    }

    // console.log('🎨 [Interpolator] Starting interpolation:', {
    //   emotions: originalData.length,
    //   originalPoints: originalData[0].data.length,
    //   options
    // });

    return originalData.map(emotion => {
      const points = emotion.data;
      if (points.length < 2) return emotion; // Can't interpolate with less than 2 points
      
      // Calculate variance to detect emotions with high volatility
      const intensities = points.map(p => p.intensity);
      const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
      const variance = intensities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intensities.length;
      const isHighVariance = variance > 0.05; // Threshold for high variance

      // Calculate time span
      const firstDate = new Date(points[0].timestamp);
      const lastDate = new Date(points[points.length - 1].timestamp);
      const timeSpanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      const timeSpanWeeks = Math.ceil(timeSpanDays / 7);

      // Determine optimal number of points based on conversation length
      let targetPoints = minPoints;

      if (adaptToTimespan) {
        if (timeSpanWeeks < 4) {
          // Very short conversation (< 1 month): limited points to preserve shape
          targetPoints = Math.min(Math.max(points.length, timeSpanWeeks * 3), minPoints);
        } else if (timeSpanWeeks < 12) {
          // Short conversation (1-3 months): 2 points per week max
          targetPoints = Math.min(Math.max(points.length, timeSpanWeeks * 2), 30);
        } else if (timeSpanWeeks < 52) {
          // Medium conversation (3-12 months): weekly points
          targetPoints = Math.min(Math.max(points.length, timeSpanWeeks), 52);
        } else {
          // Long conversation (1+ years): biweekly points
          targetPoints = Math.min(Math.max(points.length, Math.ceil(timeSpanWeeks / 2)), maxPoints);
        }
      }

      // Ensure we have at least minPoints but not more than maxPoints
      targetPoints = Math.max(minPoints, Math.min(targetPoints, maxPoints));

      // Removed excessive logging - interpolation plan details

      // If we already have enough points, just return sorted data
      if (points.length >= targetPoints) {
        return {
          ...emotion,
          data: points.slice(0, targetPoints)
        };
      }

      // Apply stronger smoothing for high-variance emotions
      const effectiveSmoothing = isHighVariance ? Math.min(smoothing * 1.5, 0.7) : smoothing;
      
      if (isHighVariance) {
        console.log(`🎨 High variance detected for ${emotion.name}: variance=${variance.toFixed(3)}, applying stronger smoothing`);
      }
      
      // Create interpolated points
      let interpolatedData = this.createInterpolatedPoints(
        points,
        targetPoints,
        effectiveSmoothing,
        timeSpanDays,
        preservePeaks && !isHighVariance, // Don't preserve peaks for high variance
        minIntensity
      );

      // Connect gaps if enabled
      if (connectGaps) {
        interpolatedData = this.connectDataGaps(interpolatedData, gapThreshold);
      }

      // Apply additional smoothing pass for high variance emotions
      if (isHighVariance) {
        interpolatedData = this.limitAdjacentChanges(interpolatedData, 0.25); // Max 25% change
      }
      
      return {
        ...emotion,
        data: interpolatedData
      };
    });
  }

  /**
   * Create interpolated points between sparse data
   */
  private static createInterpolatedPoints(
    originalPoints: DataPoint[],
    targetCount: number,
    smoothing: number,
    timeSpanDays: number,
    preservePeaks: boolean = true,
    minIntensity: number = 0.01
  ): DataPoint[] {
    const result: DataPoint[] = [];

    // Sort points by timestamp
    const sortedPoints = [...originalPoints].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Ensure we preserve the actual first and last data points
    const firstTime = sortedPoints[0].timestamp.getTime();
    const lastTime = sortedPoints[sortedPoints.length - 1].timestamp.getTime();

    // Use the actual time span, don't extend beyond real data
    const timeStep = (lastTime - firstTime) / (targetCount - 1);

    // Create evenly spaced time points within the actual data range
    for (let i = 0; i < targetCount; i++) {
      const targetTime = firstTime + (i * timeStep);
      const targetDate = new Date(targetTime);

      // Find surrounding points for interpolation
      let leftPoint = sortedPoints[0];
      let rightPoint = sortedPoints[sortedPoints.length - 1];

      for (let j = 0; j < sortedPoints.length - 1; j++) {
        if (sortedPoints[j].timestamp.getTime() <= targetTime &&
          sortedPoints[j + 1].timestamp.getTime() >= targetTime) {
          leftPoint = sortedPoints[j];
          rightPoint = sortedPoints[j + 1];
          break;
        }
      }

      // Calculate interpolated intensity
      let intensity: number;

      if (leftPoint === rightPoint) {
        // We're exactly on a data point
        intensity = leftPoint.intensity;
      } else {
        // Linear interpolation for more accurate representation
        const leftTime = leftPoint.timestamp.getTime();
        const rightTime = rightPoint.timestamp.getTime();
        const t = (targetTime - leftTime) / (rightTime - leftTime);

        // Use cosine interpolation for smoother curves
        const cosineT = (1 - Math.cos(t * Math.PI)) / 2;
        intensity = leftPoint.intensity + cosineT * (rightPoint.intensity - leftPoint.intensity);

        // Apply minimum intensity baseline if needed
        if (intensity > 0 && intensity < minIntensity) {
          intensity = minIntensity;
        }

        // Ensure intensity stays within bounds
        intensity = Math.max(0, Math.min(1, intensity));
      }

      result.push({
        timestamp: targetDate,
        intensity: intensity,
        isGapFill: false
      });
    }

    // Apply smoothing for visual appeal
    if (smoothing > 0) {
      return this.applySmoothingPass(result, smoothing, preservePeaks, minIntensity);
    }

    return result;
  }

  /**
   * Apply Gaussian-like smoothing to make curves more natural
   */
  private static applySmoothingPass(
    points: DataPoint[],
    smoothing: number,
    preservePeaks: boolean = true,
    minIntensity: number = 0.01
  ): DataPoint[] {
    if (smoothing === 0 || points.length < 3) return points;

    const smoothed = [...points];
    // Use 7-point moving average with Gaussian-like weights for smoother curves
    const windowSize = Math.min(7, Math.floor(points.length / 3)); // Adaptive window size
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = halfWindow; i < points.length - halfWindow; i++) {
      // Generate Gaussian weights based on window size
      const weights: number[] = [];
      for (let k = -halfWindow; k <= halfWindow; k++) {
        // Gaussian weight calculation
        const sigma = halfWindow / 2;
        const weight = Math.exp(-(k * k) / (2 * sigma * sigma));
        weights.push(weight);
      }

      // Normalize weights
      const weightSum = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map(w => w / weightSum);

      let weightedSum = 0;

      for (let j = -halfWindow; j <= halfWindow; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < points.length) {
          // Skip gap fill points in smoothing calculation if they would raise the intensity
          const point = points[idx];
          if (point.isGapFill && points[i].isGapFill) {
            // For gap fill points, only include other gap fill points in smoothing
            weightedSum += point.intensity * normalizedWeights[j + halfWindow];
          } else if (!point.isGapFill) {
            // For real points, include all points
            weightedSum += point.intensity * normalizedWeights[j + halfWindow];
          }
        }
      }

      // Apply smoothing based on the smoothing parameter
      const currentIntensity = points[i].intensity;
      let smoothedIntensity = currentIntensity + (weightedSum - currentIntensity) * smoothing;
      
      // For gap fill points, ensure they don't get smoothed upward
      if (points[i].isGapFill) {
        smoothedIntensity = Math.min(smoothedIntensity, currentIntensity);
      }

      // Preserve peaks if requested
      if (preservePeaks) {
        // Check if this is a local peak
        const isPeak = i > 0 && i < points.length - 1 &&
          currentIntensity >= points[i - 1].intensity &&
          currentIntensity >= points[i + 1].intensity;

        if (isPeak) {
          // Reduce smoothing effect on peaks but not too much
          smoothedIntensity = currentIntensity + (weightedSum - currentIntensity) * smoothing * 0.5;
        }
      }

      // Apply minimum intensity if needed
      if (smoothedIntensity > 0 && smoothedIntensity < minIntensity) {
        smoothedIntensity = minIntensity;
      }

      smoothed[i] = {
        ...points[i],
        intensity: Math.max(0, Math.min(1, smoothedIntensity))
      };
    }

    return smoothed;
  }

  /**
   * Limit adjacent point changes to prevent dramatic spikes
   */
  private static limitAdjacentChanges(
    points: DataPoint[],
    maxChange: number = 0.25
  ): DataPoint[] {
    if (points.length < 2) return points;
    
    const smoothed = [...points];
    
    // Forward pass
    for (let i = 1; i < smoothed.length; i++) {
      const prev = smoothed[i - 1].intensity;
      const curr = smoothed[i].intensity;
      const diff = curr - prev;
      
      if (Math.abs(diff) > maxChange) {
        // Limit the change
        smoothed[i] = {
          ...smoothed[i],
          intensity: prev + Math.sign(diff) * maxChange
        };
      }
    }
    
    // Backward pass for symmetry
    for (let i = smoothed.length - 2; i >= 0; i--) {
      const next = smoothed[i + 1].intensity;
      const curr = smoothed[i].intensity;
      const diff = curr - next;
      
      if (Math.abs(diff) > maxChange) {
        // Average with forward pass result
        const forwardValue = smoothed[i].intensity;
        const backwardValue = next + Math.sign(diff) * maxChange;
        smoothed[i] = {
          ...smoothed[i],
          intensity: (forwardValue + backwardValue) / 2
        };
      }
    }
    
    return smoothed;
  }

  /**
   * Detect if data needs interpolation based on sparsity
   */
  static needsInterpolation(
    data: TimelineDataItem[],
    minDesiredPoints: number = 20
  ): boolean {
    if (!data.length || !data[0]?.data?.length) return false;

    const pointCount = data[0].data.length;
    if (pointCount >= minDesiredPoints) return false;

    // Check time span
    const points = data[0].data;
    const firstDate = new Date(points[0].timestamp);
    const lastDate = new Date(points[points.length - 1].timestamp);
    const timeSpanWeeks = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

    // Need interpolation if we have less than 1 point per 2 weeks on average
    return pointCount < timeSpanWeeks / 2;
  }

  /**
   * Connect data gaps by filling missing time periods with smooth transitions
   */
  private static connectDataGaps(
    points: DataPoint[],
    gapThreshold: number = 14
  ): DataPoint[] {
    if (points.length < 2) return points;

    const result: DataPoint[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];

      result.push(currentPoint);

      // Calculate gap in days
      const currentTime = currentPoint.timestamp.getTime();
      const nextTime = nextPoint.timestamp.getTime();
      const gapDays = (nextTime - currentTime) / (1000 * 60 * 60 * 24);

      // If gap is larger than threshold, fill it with smooth transition
      if (gapDays > gapThreshold) {
        const gapPoints = this.createGapTransition(
          currentPoint,
          nextPoint,
          gapDays,
          gapThreshold
        );
        result.push(...gapPoints);
      }
    }

    // Add the last point
    result.push(points[points.length - 1]);

    return result;
  }

  /**
   * Create smooth transition points to fill a gap between two data points
   */
  private static createGapTransition(
    startPoint: DataPoint,
    endPoint: DataPoint,
    gapDays: number,
    gapThreshold: number
  ): DataPoint[] {
    const transitionPoints: DataPoint[] = [];

    // Calculate how many points to add based on gap size
    const pointsToAdd = Math.min(Math.floor(gapDays / 7), 8); // Max 8 points per gap

    if (pointsToAdd < 1) return transitionPoints;

    const startIntensity = startPoint.intensity;
    const endIntensity = endPoint.intensity;
    const startTime = startPoint.timestamp.getTime();
    const endTime = endPoint.timestamp.getTime();

    // Create valley/dip transition for gaps
    for (let i = 1; i <= pointsToAdd; i++) {
      const progress = i / (pointsToAdd + 1);

      // Calculate intermediate timestamp
      const intermediateTime = startTime + (endTime - startTime) * progress;
      const intermediateTimestamp = new Date(intermediateTime);

      // Create a gentle transition with slight dip
      // Use a subtle curve that maintains higher baseline
      const averageIntensity = (startIntensity + endIntensity) / 2;
      const minIntensity = Math.min(startIntensity, endIntensity);
      
      // Gentle dip: only go down to 60% of the minimum surrounding value
      const valleyDepth = Math.max(0.1, minIntensity * 0.6);
      
      // Use sine wave for the valley effect
      // This creates a gentle wave rather than a sharp valley
      
      // Blend between linear interpolation and valley effect
      const linearIntensity = startIntensity + (endIntensity - startIntensity) * progress;
      const valleyIntensity = startIntensity + (endIntensity - startIntensity) * progress 
                             - (averageIntensity - valleyDepth) * Math.sin(progress * Math.PI) * 0.5;
      
      // Use mostly linear with subtle valley effect
      let intermediateIntensity = linearIntensity * 0.7 + valleyIntensity * 0.3;

      // Ensure reasonable bounds
      intermediateIntensity = Math.max(valleyDepth, Math.min(1, intermediateIntensity));

      transitionPoints.push({
        timestamp: intermediateTimestamp,
        intensity: intermediateIntensity,
        isGapFill: true
      });
    }

    return transitionPoints;
  }
}