import { GeminiClient } from '../gemini/gemini-client';
import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { EmotionalAnalysisResult } from './emotional-analyzer';
import { extractJSON } from '../utils/json-parser';
import { extractJSONEnhanced } from '../utils/json-parser-enhanced';
import pLimit from 'p-limit';
import { getAnalysisConfig } from '../config/analysis-config';
import { logger } from '../utils/logger';
import { TIMELINE_EVENTS_SCHEMA } from './schemas';

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  emotion: string;
  intensity: number;
  description?: string;
}

export interface TimelineEventsResult {
  lifeEvents: TimelineEvent[];
  chapters: Record<string, string>; // chapter name -> description
}

/**
 * Enhanced timeline analyzer that handles large conversations better
 */
export class TimelineEventsAnalyzerEnhanced {
  private geminiClient: GeminiClient;
  private readonly MAX_EVENTS_PER_REQUEST = 10; // Limit to prevent truncation
  private readonly MAX_CONTEXT_LENGTH = 8000; // Character limit for context

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  async analyze(
    messages: WhatsAppMessage[],
    emotionalAnalysis?: EmotionalAnalysisResult
  ): Promise<TimelineEventsResult> {
    logger.info('📅 Starting enhanced timeline events analysis...');

    // Handle small conversations
    if (messages.length < 30) {
      return this.createSimpleTimeline(messages);
    }

    // Get configuration for parallelism
    const config = getAnalysisConfig();
    const concurrency = config.apiCallConcurrency || 10;

    // For large conversations, use chunking strategy
    const chunks = this.createTimeChunks(messages);
    logger.info(`📊 Split conversation into ${chunks.length} time-based chunks`);
    logger.debug(`Parallelism mode: ${config.parallelismMode}, Concurrency: ${concurrency} API calls`);

    // Create concurrency limiter
    const limit = pLimit(concurrency);

    // Process all chunks in parallel with concurrency control
    const chunkPromises = chunks.map((chunk, i) => {
      return limit(async () => {
        logger.debug(`[Chunk ${i + 1}/${chunks.length}] Starting: ${chunk.messages.length} messages from ${chunk.period}`);
        
        try {
          const chunkResult = await this.analyzeChunk(
            chunk.messages,
            chunk.period,
            i,
            chunks.length,
            emotionalAnalysis
          );
          
          logger.debug(`[Chunk ${i + 1}/${chunks.length}] Completed successfully`);
          return chunkResult;
        } catch (error) {
          logger.error(`[Chunk ${i + 1}/${chunks.length}] Failed:`, error);
          // Return empty result for failed chunks instead of throwing
          return {
            lifeEvents: [],
            chapters: {}
          };
        }
      });
    });

    // Wait for all chunks to complete
    const allResults = await Promise.all(chunkPromises);
    
    logger.info(`All ${chunks.length} chunks completed`);

    // Filter out empty results and merge
    const validResults = allResults.filter(result => result.lifeEvents.length > 0);
    
    if (validResults.length === 0) {
      logger.warn('No valid timeline results, returning empty timeline');
      return {
        lifeEvents: [],
        chapters: {}
      };
    }

    // Merge all results
    return this.mergeResults(validResults);
  }

  private createTimeChunks(messages: WhatsAppMessage[]): Array<{messages: WhatsAppMessage[], period: string}> {
    const chunks: Array<{messages: WhatsAppMessage[], period: string}> = [];
    
    // Group by quarters (3-month periods) to get reasonable chunk sizes
    const messagesByQuarter = new Map<string, WhatsAppMessage[]>();
    
    messages.forEach(msg => {
      const year = msg.timestamp.getFullYear();
      const quarter = Math.floor(msg.timestamp.getMonth() / 3) + 1;
      const key = `${year}-Q${quarter}`;
      
      if (!messagesByQuarter.has(key)) {
        messagesByQuarter.set(key, []);
      }
      messagesByQuarter.get(key)!.push(msg);
    });
    
    // Convert to chunks
    messagesByQuarter.forEach((msgs, period) => {
      // If a quarter has too many messages, split it further
      if (msgs.length > 500) {
        // Split by month
        const monthGroups = new Map<string, WhatsAppMessage[]>();
        msgs.forEach(msg => {
          const monthKey = `${msg.timestamp.getFullYear()}-${String(msg.timestamp.getMonth() + 1).padStart(2, '0')}`;
          if (!monthGroups.has(monthKey)) {
            monthGroups.set(monthKey, []);
          }
          monthGroups.get(monthKey)!.push(msg);
        });
        
        monthGroups.forEach((monthMsgs, monthPeriod) => {
          chunks.push({ messages: monthMsgs, period: monthPeriod });
        });
      } else {
        chunks.push({ messages: msgs, period });
      }
    });
    
    // Sort chunks chronologically
    chunks.sort((a, b) => {
      const dateA = a.messages[0]?.timestamp || new Date();
      const dateB = b.messages[0]?.timestamp || new Date();
      return dateA.getTime() - dateB.getTime();
    });
    
    return chunks;
  }

  private async analyzeChunk(
    messages: WhatsAppMessage[],
    period: string,
    chunkIndex: number,
    totalChunks: number,
    emotionalAnalysis?: EmotionalAnalysisResult
  ): Promise<TimelineEventsResult> {
    // Build a focused context for this chunk
    const context = this.buildChunkContext(messages, period);
    
    // Limit the number of events to request based on chunk size
    const eventsToRequest = Math.min(
      Math.ceil(messages.length / 100), // Roughly 1 event per 100 messages
      this.MAX_EVENTS_PER_REQUEST
    );
    
    const prompt = this.buildChunkPrompt(context, eventsToRequest, chunkIndex, totalChunks);
    
    try {
      const structuredResponse = await this.geminiClient.generateStructuredContent(prompt, TIMELINE_EVENTS_SCHEMA);
      return this.parseChunkResponse(structuredResponse, period);
    } catch (error) {
      logger.error(`Failed to analyze chunk ${period} with structured output:`, error);
      return { lifeEvents: [], chapters: {} };
    }
  }

  private buildChunkContext(messages: WhatsAppMessage[], period: string): string {
    const participants = new Set<string>();
    messages.forEach(msg => {
      if (msg.sender) participants.add(msg.sender);
    });
    
    let context = `Time Period: ${period}
Messages: ${messages.length}
Participants: ${Array.from(participants).join(', ')}

Key conversations:\n`;
    
    // Sample messages intelligently - focus on longer, more meaningful ones
    const meaningfulMessages = messages
      .filter(m => m.content.length > 50)
      .sort((a, b) => b.content.length - a.content.length);
    
    // Take a representative sample
    const sampleSize = Math.min(50, meaningfulMessages.length);
    const sampledMessages = this.stratifiedSample(meaningfulMessages, sampleSize);
    
    let contextLength = context.length;
    for (const msg of sampledMessages) {
      const msgText = `[${msg.timestamp.toLocaleDateString()}] ${msg.sender}: ${msg.content}\n`;
      
      // Stop if we're approaching the context limit
      if (contextLength + msgText.length > this.MAX_CONTEXT_LENGTH) {
        break;
      }
      
      context += msgText;
      contextLength += msgText.length;
    }
    
    return context;
  }

  private stratifiedSample<T>(array: T[], sampleSize: number): T[] {
    if (array.length <= sampleSize) return array;
    
    const result: T[] = [];
    const step = array.length / sampleSize;
    
    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(i * step);
      result.push(array[index]);
    }
    
    return result;
  }

  private buildChunkPrompt(
    context: string, 
    eventsToRequest: number,
    chunkIndex: number,
    totalChunks: number
  ): string {
    return `Analyze this section of a WhatsApp conversation (part ${chunkIndex + 1} of ${totalChunks}) and identify the ${eventsToRequest} most significant events.

${context}

Extract exactly ${eventsToRequest} life events from this period. Focus on:
- Major changes or revelations
- Emotional turning points
- Important decisions
- Relationship milestones
- Personal growth moments

IMPORTANT:
- Return EXACTLY ${eventsToRequest} events
- Make descriptions rich, personal, and emotionally detailed - aim for 150-300 characters
- Capture the depth of feeling and significance in each moment
- Use only these emotions: hope, joy, love, courage, pride, curiosity, confusion, stress, fear, concern
- Include specific dates with day (e.g., "March 15, 2024")
- Create meaningful chapter names that group related events together`;
  }

  private parseChunkResponse(parsed: any, period: string): TimelineEventsResult {
    const lifeEvents: TimelineEvent[] = parsed.events?.map((event: any, index: number) => ({
      id: event.id || `${period}-event-${index + 1}`,
      title: event.title || 'Life Event',
      time: event.time || this.inferDateFromPeriod(period),
      day: event.day || 'Life Journey',
      emotion: this.normalizeEmotion(event.emotion),
      intensity: Math.max(1, Math.min(10, event.intensity || 5)),
      description: this.truncateDescription(event.description)
    })) || [];

    // Convert chapters array to Record<string, string> format
    let chapters: Record<string, string> = {};
    if (Array.isArray(parsed.chapters)) {
      chapters = parsed.chapters.reduce((acc: Record<string, string>, chapter: any) => {
        if (chapter.name && chapter.description) {
          acc[chapter.name] = chapter.description;
        }
        return acc;
      }, {});
    } else if (parsed.chapters && typeof parsed.chapters === 'object') {
      // Handle legacy object format
      chapters = parsed.chapters;
    }
    
    // Default chapter if none provided
    if (Object.keys(chapters).length === 0) {
      chapters = { 'Life Journey': `Events from ${period}` };
    }

    return {
      lifeEvents,
      chapters
    };
  }

  private normalizeEmotion(emotion: string | undefined): string {
    if (!emotion) return 'curiosity';
    
    const validEmotions = [
      'hope', 'joy', 'love', 'courage', 'pride', 'curiosity',
      'confusion', 'stress', 'fear', 'concern', 'excitement',
      'motivation', 'reflection', 'appreciation', 'commitment'
    ];
    
    const normalized = emotion.toLowerCase().trim();
    return validEmotions.includes(normalized) ? normalized : 'curiosity';
  }

  private truncateDescription(description: string | undefined): string {
    if (!description) return 'A moment in the journey.';
    
    // Allow for longer, richer descriptions - only truncate if extremely long
    if (description.length > 500) {
      return description.substring(0, 497) + '...';
    }
    
    return description;
  }

  private inferDateFromPeriod(period: string): string {
    // Handle different period formats
    if (period.match(/^\d{4}-Q\d$/)) {
      // Quarter format: 2024-Q1
      const [year, quarter] = period.split('-Q');
      const month = (parseInt(quarter) - 1) * 3 + 2; // Middle month of quarter
      return `${this.getMonthName(month)} 15, ${year}`;
    } else if (period.match(/^\d{4}-\d{2}$/)) {
      // Month format: 2024-03
      const [year, month] = period.split('-');
      return `${this.getMonthName(parseInt(month) - 1)} 15, ${year}`;
    }
    
    return 'Unknown Date';
  }

  private getMonthName(monthIndex: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex] || 'Unknown';
  }

  private mergeResults(results: TimelineEventsResult[]): TimelineEventsResult {
    const allEvents: TimelineEvent[] = [];
    const allChapters: Record<string, string> = {};
    
    results.forEach(result => {
      allEvents.push(...result.lifeEvents);
      Object.assign(allChapters, result.chapters);
    });
    
    // Sort events chronologically
    allEvents.sort((a, b) => {
      const dateA = new Date(a.time);
      const dateB = new Date(b.time);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Ensure unique IDs
    allEvents.forEach((event, index) => {
      event.id = `event-${index + 1}`;
    });
    
    logger.info(`📅 Timeline analysis complete: ${allEvents.length} events across ${Object.keys(allChapters).length} chapters`);
    
    return {
      lifeEvents: allEvents,
      chapters: allChapters
    };
  }

  private createSimpleTimeline(messages: WhatsAppMessage[]): TimelineEventsResult {
    const firstDate = messages[0]?.timestamp || new Date();
    const lastDate = messages[messages.length - 1]?.timestamp || new Date();
    
    return {
      lifeEvents: [{
        id: 'event-start',
        title: 'Conversation Begins',
        time: firstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        day: 'The Beginning',
        emotion: 'curiosity',
        intensity: 5,
        description: 'The start of our digital conversation.'
      }],
      chapters: {
        'The Beginning': 'The opening chapter of this conversation'
      }
    };
  }
}