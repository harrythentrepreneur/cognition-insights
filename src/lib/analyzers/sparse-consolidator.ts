import { WeeklySegment } from './time-segmenter';

export interface ConsolidatedSegment extends WeeklySegment {
  originalSegments: number;
  consolidationType: 'single' | 'merged' | 'batch';
  batchInfo?: {
    startWeek: string;
    endWeek: string;
    weekCount: number;
  };
}

/**
 * Consolidates sparse weekly segments into larger chunks to minimize API calls.
 * This matches the backend's efficient batching strategy.
 */
export class SparseConsolidator {
  // Thresholds for consolidation - REDUCED for premium experience
  private readonly MIN_MESSAGES_FOR_STANDALONE = 20; // Even weeks with just 20+ messages stay separate
  private readonly MAX_CONSOLIDATED_MESSAGES = 400; // Smaller consolidated segments for more detail
  private readonly MAX_WEEKS_TO_MERGE = 4; // Max 1 month per consolidated segment
  
  /**
   * Consolidate sparse segments to reduce API calls
   * Target: 5-15 API calls total (matching backend)
   */
  consolidateSegments(segments: WeeklySegment[]): ConsolidatedSegment[] {
    if (segments.length === 0) return [];
    
    console.log(`🔄 Consolidating ${segments.length} segments for sparse conversation optimization`);
    
    const consolidated: ConsolidatedSegment[] = [];
    let currentBatch: WeeklySegment[] = [];
    let currentMessageCount = 0;
    
    for (const segment of segments) {
      const wouldExceedLimits = 
        currentBatch.length > 0 && (
          currentMessageCount + segment.messageCount > this.MAX_CONSOLIDATED_MESSAGES ||
          currentBatch.length >= this.MAX_WEEKS_TO_MERGE
        );
      
      const isSignificantSegment = segment.messageCount >= this.MIN_MESSAGES_FOR_STANDALONE;
      
      // If this segment is significant or would exceed limits, finalize current batch
      if (wouldExceedLimits || (isSignificantSegment && currentBatch.length > 0)) {
        consolidated.push(this.createConsolidatedSegment(currentBatch));
        currentBatch = [];
        currentMessageCount = 0;
      }
      
      // If segment is significant enough, add it as standalone
      if (isSignificantSegment && currentBatch.length === 0) {
        consolidated.push(this.createConsolidatedSegment([segment]));
      } else {
        // Add to current batch
        currentBatch.push(segment);
        currentMessageCount += segment.messageCount;
      }
    }
    
    // Finalize any remaining batch
    if (currentBatch.length > 0) {
      consolidated.push(this.createConsolidatedSegment(currentBatch));
    }
    
    // Further consolidation if we still have too many segments
    const finalConsolidated = this.performFinalConsolidation(consolidated);
    
    console.log(`✅ Consolidated ${segments.length} segments into ${finalConsolidated.length} chunks`);
    console.log(`📊 Consolidation details:`, {
      originalSegments: segments.length,
      consolidatedSegments: finalConsolidated.length,
      averageMessagesPerChunk: Math.round(
        segments.reduce((sum, s) => sum + s.messageCount, 0) / finalConsolidated.length
      ),
      chunks: finalConsolidated.map(c => ({
        weeks: c.originalSegments,
        messages: c.messageCount,
        type: c.consolidationType
      }))
    });
    
    return finalConsolidated;
  }
  
  /**
   * Create a consolidated segment from multiple weeks
   */
  private createConsolidatedSegment(segments: WeeklySegment[]): ConsolidatedSegment {
    if (segments.length === 0) {
      throw new Error('Cannot create consolidated segment from empty array');
    }
    
    if (segments.length === 1) {
      return {
        ...segments[0],
        originalSegments: 1,
        consolidationType: 'single'
      };
    }
    
    // Merge multiple segments
    const allMessages = segments.flatMap(s => s.messages);
    const weekStart = segments[0].weekStart;
    const weekEnd = segments[segments.length - 1].weekEnd;
    const contributingPeople = new Set<string>();
    
    segments.forEach(s => {
      s.contributingPeople?.forEach(p => contributingPeople.add(p));
    });
    
    // Format week numbers with padding
    const startWeekNum = String(segments[0].weekNumber).padStart(2, '0');
    const endWeekNum = String(segments[segments.length - 1].weekNumber).padStart(2, '0');
    
    return {
      weekStart,
      weekEnd,
      messages: allMessages,
      messageCount: allMessages.length,
      weekNumber: segments[0].weekNumber,
      // Use single week format if start and end are the same
      yearWeek: startWeekNum === endWeekNum 
        ? `${weekStart.getFullYear()}-W${startWeekNum}` 
        : `${weekStart.getFullYear()}-W${startWeekNum}-to-W${endWeekNum}`,
      contributingPeople: Array.from(contributingPeople),
      originalSegments: segments.length,
      consolidationType: 'merged'
    };
  }
  
  /**
   * Final consolidation pass to ensure we hit the target of 5-15 chunks
   */
  private performFinalConsolidation(segments: ConsolidatedSegment[]): ConsolidatedSegment[] {
    // For premium experience, allow up to 30 segments without final consolidation
    if (segments.length <= 30) {
      return segments;
    }
    
    console.log(`⚡ Performing minimal consolidation for premium experience: ${segments.length} -> target 20-25 chunks`);
    
    // Calculate target number of chunks (aim for 20-25 for more detail)
    const targetChunks = 20;
    const segmentsPerChunk = Math.ceil(segments.length / targetChunks);
    
    const finalChunks: ConsolidatedSegment[] = [];
    
    for (let i = 0; i < segments.length; i += segmentsPerChunk) {
      const batch = segments.slice(i, i + segmentsPerChunk);
      
      if (batch.length === 1) {
        finalChunks.push(batch[0]);
      } else {
        // Create super-consolidated segment
        const allMessages = batch.flatMap(s => s.messages);
        const contributingPeople = new Set<string>();
        batch.forEach(s => {
          s.contributingPeople?.forEach(p => contributingPeople.add(p));
        });
        
        // Use the middle week's ISO week format for better timeline placement
        const middleIndex = Math.floor(batch.length / 2);
        const middleSegment = batch[middleIndex];
        
        // Create a batch ID that represents the span properly
        const batchId = `${batch[0].yearWeek.split('-W')[0]}-batch-${i / segmentsPerChunk + 1}`;
        
        finalChunks.push({
          weekStart: batch[0].weekStart,
          weekEnd: batch[batch.length - 1].weekEnd,
          messages: allMessages,
          messageCount: allMessages.length,
          weekNumber: middleSegment.weekNumber,
          yearWeek: batchId, // Use batch ID to spread across timeline
          contributingPeople: Array.from(contributingPeople),
          originalSegments: batch.reduce((sum, b) => sum + b.originalSegments, 0),
          consolidationType: 'batch',
          batchInfo: {
            startWeek: batch[0].yearWeek,
            endWeek: batch[batch.length - 1].yearWeek,
            weekCount: batch.length
          }
        });
      }
    }
    
    return finalChunks;
  }
  
  /**
   * Check if conversation is sparse enough to benefit from consolidation
   * Updated to work with tiered system - only consolidate for Tier 3-4
   */
  shouldConsolidate(segments: WeeklySegment[], tier?: 1 | 2 | 3 | 4): boolean {
    // For Tier 1-2 (< 3 months), never consolidate
    if (tier && tier <= 2) {
      console.log(`🚫 Not consolidating: Tier ${tier} gets full detail`);
      return false;
    }
    
    // For bi-weekly segments (Tier 3), only consolidate if extremely sparse
    const isBiWeekly = segments.some(s => s.yearWeek.includes('BiW'));
    if (isBiWeekly && segments.length < 12) {
      console.log(`🚫 Not consolidating: Bi-weekly segments are already consolidated`);
      return false;
    }
    
    // For monthly segments (Tier 4), rarely consolidate
    const isMonthly = segments.some(s => s.yearWeek.includes('-M'));
    if (isMonthly) {
      console.log(`🚫 Not consolidating: Monthly segments provide good coverage`);
      return false;
    }
    
    // Legacy logic for backward compatibility
    if (segments.length < 8) {
      console.log(`🚫 Not consolidating: Only ${segments.length} segments (minimum 8 required)`);
      return false;
    }
    
    // Only consolidate if we have 50+ segments (very long conversations)
    if (segments.length < 50) {
      console.log(`🚫 Not consolidating: ${segments.length} segments can be processed without consolidation for premium experience`);
      return false;
    }
    
    const avgMessagesPerWeek = segments.reduce((sum, s) => sum + s.messageCount, 0) / segments.length;
    const sparseWeeks = segments.filter(s => s.messageCount < 10).length; // Only very sparse weeks (< 10 messages)
    const sparseRatio = sparseWeeks / segments.length;
    
    // Only consolidate if average < 15 messages/week AND > 80% weeks are very sparse
    const shouldConsolidate = avgMessagesPerWeek < 15 && sparseRatio > 0.8;
    
    console.log(`📊 Consolidation check:`, {
      segments: segments.length,
      avgMessagesPerWeek: avgMessagesPerWeek.toFixed(1),
      sparseRatio: (sparseRatio * 100).toFixed(1) + '%',
      decision: shouldConsolidate ? 'CONSOLIDATE' : 'KEEP DETAILED'
    });
    
    return shouldConsolidate;
  }
}