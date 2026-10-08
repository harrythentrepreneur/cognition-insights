import { GeminiClient } from '../gemini/gemini-client';
import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { TimeSegmenter, WeeklySegment } from './time-segmenter';
import { SparseConsolidator } from './sparse-consolidator';
import { extractJSON } from '../utils/json-parser';
import { logger } from '../utils/logger';
import { TRIGGERS_ANALYSIS_SCHEMA } from './schemas';

export interface Trigger {
  trigger: string;
  category: 'emotional' | 'behavioral' | 'cognitive' | 'social';
  intensity: number;
  frequency: number;
  context: string;
  examples: string[];
}

export interface TriggerAnalysisResult {
  triggers: Trigger[];
  summary: string;
  recommendations: string[];
}

export class TriggersAnalyzer {
  private geminiClient: GeminiClient;
  private timeSegmenter: TimeSegmenter;
  private sparseConsolidator: SparseConsolidator;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.timeSegmenter = new TimeSegmenter();
    this.sparseConsolidator = new SparseConsolidator();
  }




  private getTopCategories(triggers: Trigger[]): string[] {
    const categoryCounts = new Map<string, number>();

    triggers.forEach(trigger => {
      categoryCounts.set(trigger.category, (categoryCounts.get(trigger.category) || 0) + 1);
    });

    return Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([category]) => category);
  }

  async analyzeTriggers(messages: WhatsAppMessage[]): Promise<TriggerAnalysisResult> {
    // Validate minimum data requirements
    if (messages.length < 15) {
      logger.debug('Limited messages for trigger analysis:', messages.length);
      return {
        triggers: [],
        summary: 'Insufficient data to identify emotional triggers. Please upload a conversation with at least 15 messages.',
        recommendations: ['Upload a longer conversation to identify patterns and triggers']
      };
    }

    const segments = this.timeSegmenter.segmentByWeek(messages);
    // Lower threshold for small conversations
    const significantSegments = this.timeSegmenter.getSignificantSegments(segments, 1);

    // Apply sparse consolidation to reduce API calls
    let segmentsToAnalyze = significantSegments;
    if (this.sparseConsolidator.shouldConsolidate(significantSegments)) {
      logger.debug('Applying sparse consolidation to triggers analysis...');
      const consolidatedSegments = this.sparseConsolidator.consolidateSegments(significantSegments);
      logger.debug(`Triggers consolidation: ${significantSegments.length} → ${consolidatedSegments.length} segments`);
      segmentsToAnalyze = consolidatedSegments;
    }

    // Batch analyze triggers across segments
    const allTriggers = await this.analyzeTriggersBatch(segmentsToAnalyze);

    // Consolidate and rank triggers
    const consolidatedTriggers = this.consolidateTriggers(allTriggers);

    // Generate summary and recommendations
    const summary = await this.generateSummary(consolidatedTriggers);
    const recommendations = await this.generateRecommendations(consolidatedTriggers);

    return {
      triggers: consolidatedTriggers.slice(0, 10), // Top 10 triggers
      summary,
      recommendations
    };
  }

  private async analyzeTriggersBatch(segments: WeeklySegment[]): Promise<Trigger[]> {
    // Dynamic batch sizing based on total message count
    const totalMessages = segments.reduce((sum, seg) => sum + seg.messages.length, 0);
    const MAX_MESSAGES_PER_BATCH = totalMessages > 5000 ? 300 : 500; // Smaller batches for large conversations
    const MAX_WEEKS_PER_BATCH = totalMessages > 5000 ? 8 : 12; // Fewer weeks for large conversations

    logger.debug(`Triggers batch config: ${MAX_MESSAGES_PER_BATCH} messages/batch, ${MAX_WEEKS_PER_BATCH} weeks/batch`);

    const allTriggers: Trigger[] = [];
    let currentBatch: WeeklySegment[] = [];
    let currentMessageCount = 0;
    let batchNumber = 0;

    for (const segment of segments) {
      const segmentMessageCount = segment.messages.length;

      // Check if adding this segment would exceed limits
      if (currentBatch.length > 0 &&
        (currentMessageCount + segmentMessageCount > MAX_MESSAGES_PER_BATCH ||
          currentBatch.length >= MAX_WEEKS_PER_BATCH)) {
        // Process current batch
        batchNumber++;
        logger.debug(`Processing triggers batch ${batchNumber} with ${currentBatch.length} weeks, ${currentMessageCount} messages`);

        const batchTriggers = await this.analyzeBatchedSegments(currentBatch);
        allTriggers.push(...batchTriggers);

        // Reset for next batch
        currentBatch = [];
        currentMessageCount = 0;

        // No delay between batches - process as fast as possible
        // Removed artificial delays for faster processing
      }

      currentBatch.push(segment);
      currentMessageCount += segmentMessageCount;
    }

    // Process final batch
    if (currentBatch.length > 0) {
      batchNumber++;
      logger.debug(`Processing final triggers batch ${batchNumber} with ${currentBatch.length} weeks`);
      const batchTriggers = await this.analyzeBatchedSegments(currentBatch);
      allTriggers.push(...batchTriggers);
    }

    logger.info(`Triggers analysis complete: ${allTriggers.length} triggers found across ${batchNumber} batches`);
    return allTriggers;
  }

  private async analyzeBatchedSegments(segments: WeeklySegment[]): Promise<Trigger[]> {
    logger.debug(`Analyzing batch of ${segments.length} weeks for triggers`);

    const prompt = this.buildBatchAnalysisPrompt(segments);

    // Retry logic to avoid fallback
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await this.geminiClient.generateStructuredContent(prompt, TRIGGERS_ANALYSIS_SCHEMA);
        return response;
      } catch (error) {
        retries++;
        logger.warn(`Trigger batch analysis attempt ${retries}/${maxRetries} failed:`, error);

        if (retries < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        } else {
          logger.error('All trigger batch analysis attempts failed:', error);
          // Only fallback after all retries fail
          const triggers: Trigger[] = [];
          for (const segment of segments) {
            const segmentTriggers = await this.analyzeSegmentTriggers(segment);
            triggers.push(...segmentTriggers);
          }
          return triggers;
        }
      }
    }

    return [];
  }

  private buildBatchAnalysisPrompt(segments: WeeklySegment[]): string {
    const allMessages = segments.map(segment =>
      this.timeSegmenter.formatMessagesForAnalysis(segment.messages)
    ).join('\n\n');

    return `You are a JSON-only API. You MUST respond with ONLY valid JSON, no other text.

Analyze triggers in these WhatsApp messages:
${allMessages}

OUTPUT RULES:
- Return ONLY the JSON array below
- NO text before or after the JSON
- NO markdown, NO explanations, NO code blocks
- Start with [ and end with ]
- Do NOT wrap in \`\`\`json blocks

REQUIRED JSON OUTPUT:
[
  {
    "trigger": "specific trigger name",
    "category": "emotional",
    "intensity": 0,
    "frequency": 0,
    "context": "when/how it manifests",
    "examples": ["example 1", "example 2"]
  }
]

Categories: emotional, behavioral, cognitive, social
Replace 0 with actual values (0-100)
Return multiple trigger objects in the array`;
  }

  private parseBatchAnalysisResponse(response: string): Trigger[] {
    try {
      const parsed = extractJSON(response);

      if (!Array.isArray(parsed)) {
        logger.error('Invalid batch trigger response format');
        return [];
      }

      return parsed;
    } catch (error) {
      logger.error('Failed to parse batch trigger analysis:', error);
      logger.error('Response preview:', response.substring(0, 500) + '...');
      return [];
    }
  }

  private async analyzeSegmentTriggers(segment: WeeklySegment): Promise<Trigger[]> {
    const messagesText = this.timeSegmenter.formatMessagesForAnalysis(segment.messages);

    const prompt = `You are a JSON-only API. You MUST respond with ONLY valid JSON, no other text.

Analyze triggers in these WhatsApp messages:
${messagesText}

OUTPUT RULES:
- Return ONLY the JSON array below
- NO text before or after the JSON
- NO markdown, NO explanations, NO code blocks
- Start with [ and end with ]

REQUIRED JSON OUTPUT:
[
  {
    "trigger": "specific trigger name",
    "category": "emotional",
    "intensity": 0,
    "frequency": 0,
    "context": "when/how it manifests",
    "examples": ["example 1", "example 2"]
  }
]

Categories: emotional, behavioral, cognitive, social
Replace 0 with actual values (0-100)`;

    try {
      const response = await this.geminiClient.generateStructuredContent(prompt, TRIGGERS_ANALYSIS_SCHEMA);
      return response;
    } catch (error) {
      logger.error('Failed to parse triggers:', error);
      return [];
    }
  }

  private consolidateTriggers(allTriggers: Trigger[]): Trigger[] {
    const triggerMap = new Map<string, Trigger>();

    for (const trigger of allTriggers) {
      const key = trigger.trigger.toLowerCase();

      if (triggerMap.has(key)) {
        const existing = triggerMap.get(key)!;
        existing.frequency = (existing.frequency + trigger.frequency) / 2;
        existing.intensity = Math.max(existing.intensity, trigger.intensity);
        existing.examples = [...existing.examples, ...trigger.examples].slice(0, 3);
      } else {
        triggerMap.set(key, { ...trigger });
      }
    }

    return Array.from(triggerMap.values())
      .sort((a, b) => (b.intensity * b.frequency) - (a.intensity * a.frequency));
  }

  private async generateSummary(triggers: Trigger[]): Promise<string> {
    if (triggers.length === 0) {
      return "No significant emotional triggers were identified in your conversations.";
    }

    const topTriggers = triggers.slice(0, 3).map(t => t.trigger).join(', ');
    const prompt = `Write a compassionate 2-3 sentence summary about someone whose main emotional triggers are: ${topTriggers}. 
    Focus on understanding and growth potential, not judgment.`;

    return await this.geminiClient.generateContent(prompt);
  }

  private async generateRecommendations(triggers: Trigger[]): Promise<string[]> {
    if (triggers.length === 0) return [];

    const triggerList = triggers.slice(0, 5).map(t => `${t.trigger} (${t.category})`).join(', ');
    const prompt = `Based on these emotional triggers: ${triggerList}
    
    Provide 3-4 specific, actionable recommendations for managing these triggers.
    Return as a JSON array of strings. Each recommendation should be practical and compassionate.
    
    Return ONLY the JSON array.`;

    try {
      const response = await this.geminiClient.generateContent(prompt);
      return extractJSON(response);
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return [
        "Practice mindfulness to recognize triggers as they arise",
        "Develop healthy coping strategies for emotional regulation",
        "Consider journaling to track patterns and progress"
      ];
    }
  }
}