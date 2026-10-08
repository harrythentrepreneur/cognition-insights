import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { TimeSegmenter, WeeklySegment } from './time-segmenter';

export interface AdaptiveSegment {
  segmentType: 'weekly' | 'biweekly' | 'monthly';
  segments: WeeklySegment[]; // Reusing the same structure
  recommendedAnalysisType: 'full' | 'quick';
  totalDays: number;
  avgMessagesPerDay: number;
  tier: 1 | 2 | 3 | 4;
}

export class AdaptiveSegmenter {
  private timeSegmenter: TimeSegmenter;
  
  constructor() {
    this.timeSegmenter = new TimeSegmenter();
  }
  
  /**
   * ALWAYS segments messages by week for full analysis
   * No more tiers - every conversation gets weekly segmentation
   */
  segmentAdaptively(messages: WhatsAppMessage[]): AdaptiveSegment {
    if (messages.length === 0) {
      return {
        segmentType: 'weekly',
        segments: [],
        recommendedAnalysisType: 'full',
        totalDays: 0,
        avgMessagesPerDay: 0,
        tier: 1
      };
    }
    
    // Calculate conversation span
    const sortedMessages = [...messages].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    const firstMessage = sortedMessages[0];
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const totalDays = Math.ceil(
      (lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime()) / 
      (1000 * 60 * 60 * 24)
    ) + 1;
    
    const avgMessagesPerDay = messages.length / totalDays;
    
    // ALWAYS use weekly segmentation for ALL conversations
    const segmentType: 'weekly' | 'biweekly' | 'monthly' = 'weekly';
    const segments = this.timeSegmenter.segmentByWeek(messages);
    const tier = 1; // Always tier 1 now
    
    console.log(`📅 Full weekly segmentation:`, {
      totalMessages: messages.length,
      totalDays,
      totalWeeks: segments.length,
      totalMonths: (totalDays / 30).toFixed(1),
      avgMessagesPerDay: avgMessagesPerDay.toFixed(1),
      avgMessagesPerWeek: (messages.length / segments.length).toFixed(1)
    });
    
    console.log(`✅ Using WEEKLY segmentation for all conversations: ${segments.length} weeks`);
    
    // Log segment distribution
    console.log(`📊 Weekly segment distribution:`, {
      segmentType,
      totalSegments: segments.length,
      avgMessagesPerSegment: (messages.length / segments.length).toFixed(1),
      minMessages: Math.min(...segments.map(s => s.messageCount)),
      maxMessages: Math.max(...segments.map(s => s.messageCount))
    });
    
    // Determine recommended analysis type based on total messages
    const recommendedAnalysisType = messages.length > 10000 ? 'quick' : 'full';
    
    return {
      segmentType,
      segments,
      recommendedAnalysisType,
      totalDays,
      avgMessagesPerDay,
      tier
    };
  }
  
  /**
   * Segment messages by bi-weekly (every 2 weeks) for Tier 3
   */
  private segmentByBiWeekly(messages: WhatsAppMessage[]): WeeklySegment[] {
    const biWeeklySegments = new Map<string, WhatsAppMessage[]>();
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const year = date.getFullYear();
      const weekNumber = this.getWeekNumber(date);
      // Group every 2 weeks together
      const biWeekNumber = Math.floor((weekNumber - 1) / 2) * 2 + 1;
      const biWeekKey = `${year}-BiW${String(biWeekNumber).padStart(2, '0')}`;
      
      if (!biWeeklySegments.has(biWeekKey)) {
        biWeeklySegments.set(biWeekKey, []);
      }
      biWeeklySegments.get(biWeekKey)!.push(msg);
    });
    
    // Convert bi-weekly segments to WeeklySegment format
    const segments: WeeklySegment[] = [];
    
    biWeeklySegments.forEach((biWeekMessages, biWeekKey) => {
      const sortedMessages = biWeekMessages.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      const weekStart = new Date(sortedMessages[0].timestamp);
      const weekEnd = new Date(sortedMessages[sortedMessages.length - 1].timestamp);
      
      // Normalize to start of first week
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      // Normalize to end of second week (13 days later)
      weekEnd.setDate(weekStart.getDate() + 13);
      weekEnd.setHours(23, 59, 59, 999);
      
      const peopleSet = new Set<string>();
      biWeekMessages.forEach(msg => {
        if (msg.sender && !msg.isUser) {
          peopleSet.add(msg.sender);
        }
      });
      
      segments.push({
        weekStart,
        weekEnd,
        messages: biWeekMessages,
        messageCount: biWeekMessages.length,
        weekNumber: parseInt(biWeekKey.split('BiW')[1]),
        yearWeek: biWeekKey,
        contributingPeople: Array.from(peopleSet)
      });
    });
    
    return segments.sort((a, b) => 
      a.weekStart.getTime() - b.weekStart.getTime()
    );
  }
  
  /**
   * Segment messages by month for Tier 4
   */
  private segmentByMonth(messages: WhatsAppMessage[]): WeeklySegment[] {
    const monthlySegments = new Map<string, WhatsAppMessage[]>();
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      const monthKey = `${year}-M${String(month).padStart(2, '0')}`;
      
      if (!monthlySegments.has(monthKey)) {
        monthlySegments.set(monthKey, []);
      }
      monthlySegments.get(monthKey)!.push(msg);
    });
    
    // Convert monthly segments to WeeklySegment format
    const segments: WeeklySegment[] = [];
    
    monthlySegments.forEach((monthMessages, monthKey) => {
      const [year, monthStr] = monthKey.split('-M');
      const month = parseInt(monthStr) - 1; // 0-11 for Date constructor
      
      const weekStart = new Date(parseInt(year), month, 1);
      const weekEnd = new Date(parseInt(year), month + 1, 0, 23, 59, 59, 999);
      
      const peopleSet = new Set<string>();
      monthMessages.forEach(msg => {
        if (msg.sender && !msg.isUser) {
          peopleSet.add(msg.sender);
        }
      });
      
      segments.push({
        weekStart,
        weekEnd,
        messages: monthMessages,
        messageCount: monthMessages.length,
        weekNumber: parseInt(monthStr), // Using month number as week number
        yearWeek: monthKey,
        contributingPeople: Array.from(peopleSet)
      });
    });
    
    return segments.sort((a, b) => 
      a.weekStart.getTime() - b.weekStart.getTime()
    );
  }
  
  /**
   * Get ISO week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  /**
   * Get a user-friendly description of the analysis approach
   */
  getAnalysisDescription(adaptive: AdaptiveSegment): string {
    if (adaptive.segments.length === 0) {
      return 'No messages to analyze';
    }
    
    const tierDescriptions = {
      1: 'Short conversation (< 4 weeks)',
      2: 'Medium conversation (1-3 months)',
      3: 'Long conversation (3-12 months)',
      4: 'Very long conversation (> 1 year)'
    };
    
    const periodType = {
      'weekly': 'weeks',
      'biweekly': 'bi-weekly periods',
      'monthly': 'months'
    }[adaptive.segmentType];
    
    const periodCount = adaptive.segments.length;
    const totalMessages = adaptive.segments.reduce((sum, s) => sum + s.messageCount, 0);
    
    return `${tierDescriptions[adaptive.tier]}: Analyzing ${totalMessages} messages across ${periodCount} ${periodType} (${adaptive.avgMessagesPerDay.toFixed(1)} messages/day average)`;
  }
}