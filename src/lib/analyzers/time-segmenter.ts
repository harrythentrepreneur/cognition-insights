import { WhatsAppMessage } from '../parsers/whatsapp-parser';

export interface WeeklySegment {
  weekStart: Date;
  weekEnd: Date;
  messages: WhatsAppMessage[];
  messageCount: number;
  weekNumber: number;
  yearWeek: string;
  contributingPeople?: string[];
}

export class TimeSegmenter {
  segmentByWeek(messages: WhatsAppMessage[]): WeeklySegment[] {
    if (messages.length === 0) return [];

    // Sort messages by timestamp
    const sortedMessages = [...messages].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // First, create segments for weeks with messages
    const weeklyMessageMap = new Map<string, WhatsAppMessage[]>();
    
    for (const message of sortedMessages) {
      const weekStart = this.getWeekStart(message.timestamp);
      const weekKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!weeklyMessageMap.has(weekKey)) {
        weeklyMessageMap.set(weekKey, []);
      }
      weeklyMessageMap.get(weekKey)!.push(message);
    }

    // Fill gaps - create segments for ALL weeks between first and last message
    const weekKeys = Array.from(weeklyMessageMap.keys()).sort();
    const firstWeekDate = new Date(weekKeys[0]);
    const lastWeekDate = new Date(weekKeys[weekKeys.length - 1]);
    
    const allSegments: WeeklySegment[] = [];
    let currentDate = new Date(firstWeekDate);
    
    while (currentDate <= lastWeekDate) {
      const weekKey = currentDate.toISOString().split('T')[0];
      const messagesForWeek = weeklyMessageMap.get(weekKey) || [];
      
      // Create segment even if no messages (empty week)
      allSegments.push(this.createSegment(currentDate, messagesForWeek));
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    console.log(`📅 Time segmentation complete: ${allSegments.length} weeks (${weeklyMessageMap.size} with messages, ${allSegments.length - weeklyMessageMap.size} empty weeks filled)`);
    
    return allSegments;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0); // Reset to start of day
    return new Date(d.getTime()); // Return a new Date object
  }

  private getWeekEnd(weekStart: Date): Date {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  private createSegment(weekStart: Date, messages: WhatsAppMessage[]): WeeklySegment {
    const weekEnd = this.getWeekEnd(weekStart);
    const weekNumber = this.getWeekNumber(weekStart);
    
    // Extract unique people who contributed to this week
    const peopleSet = new Set<string>();
    messages.forEach(msg => {
      if (msg.sender && !msg.isUser) {
        peopleSet.add(msg.sender);
      }
    });
    
    // Use YYYY-MM-DD format for week key (Monday of the week)
    const yearWeek = weekStart.toISOString().split('T')[0];
    
    return {
      weekStart,
      weekEnd,
      messages,
      messageCount: messages.length,
      weekNumber,
      yearWeek,
      contributingPeople: Array.from(peopleSet)
    };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // Get segments with minimum message threshold
  getSignificantSegments(segments: WeeklySegment[], minMessages: number = 5): WeeklySegment[] {
    return segments.filter(segment => segment.messageCount >= minMessages);
  }

  // Prepare messages for Gemini analysis
  formatMessagesForAnalysis(messages: WhatsAppMessage[]): string {
    return messages
      .map(msg => {
        const time = msg.timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        return `[${time}] ${msg.content}`;
      })
      .join('\n');
  }
}