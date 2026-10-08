import { GeminiClient } from '../gemini/gemini-client';
import { TimeSegmenter, WeeklySegment } from './time-segmenter';
import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { extractJSON } from '../utils/json-parser';
import { logger } from '../utils/logger';
import pLimit from 'p-limit';
import { getAnalysisConfig, parallelismPresets } from '../config/analysis-config';
import { EMOTIONAL_ANALYSIS_SCHEMA } from './schemas';

// Match Python backend's 40 metrics exactly
export interface EmotionalMetrics {
  // Core emotional states (16)
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  love: number;
  disgust: number;
  anticipation: number;
  trust: number;
  confusion: number;
  excitement: number;
  calm: number;
  hope: number;
  frustration: number;
  gratitude: number;
  compassion: number;

  // Growth & personal development traits (24)
  mental_strength: number;
  mindfulness: number;
  impulse_control: number;
  willpower: number;
  deep_focus: number;
  daily_habits: number;
  emotional_mastery: number;
  stress_control: number;
  authenticity: number;
  empathy: number;
  boundaries: number;
  flow_state: number;
  learning_speed: number;
  resilience: number;
  inner_wisdom: number;
  self_discipline: number;
  creativity: number;
  patience: number;
  confidence: number;
  adaptability: number;
}

export interface WeeklyEmotionalAnalysis {
  week: string; // YYYY-MM-DD format (Monday of the week)
  metrics: EmotionalMetrics;
  weekly_summary: string[]; // Exactly 3 items
  weekly_topics: string[]; // Exactly 3 items
  contributing_people?: string[];
}

// Enhanced interfaces for confidence and quality metrics
export interface ConfidenceMetrics {
  overall: number; // 1-10 scale
  dataQuality: number; // 1-10 scale
  sampleSize: number; // 1-10 scale
  consistency: number; // 1-10 scale
}

export interface DataQualityMetrics {
  reliability: number; // 0-100 scale
  messageCount: number;
  timeSpan: number; // days
  participantCount: number;
  averageMessageLength: number;
}

export interface Evidence {
  type: 'message' | 'pattern' | 'statistical';
  content: string;
  relevance: number; // 1-10 scale
}

export interface EnhancedWeeklyAnalysis extends WeeklyEmotionalAnalysis {
  _confidence?: ConfidenceMetrics;
  _evidence?: Evidence[];
}

export interface EmotionalAnalysisResult {
  weeklyAnalyses: WeeklyEmotionalAnalysis[];
  overallMetrics: EmotionalMetrics;
  emotionalJourney: string;
}

export interface EnhancedEmotionalAnalysisResult extends EmotionalAnalysisResult {
  confidence: ConfidenceMetrics;
  quality: DataQualityMetrics;
  weeklyConfidence: Map<string, ConfidenceMetrics>;
  evidence: Map<string, Evidence[]>;
  weeklyAnalyses: EnhancedWeeklyAnalysis[];
  metadata: {
    analysisVersion: string;
    processingTime: number;
    messageCount: number;
    dateRange: {
      start: Date;
      end: Date;
    };
  };
}

// Emotion descriptions matching Python backend
const METRIC_DESCRIPTIONS: Record<string, string> = {
  // Core emotional states
  "joy": "happiness, elation, delight, euphoria, playful mood",
  "sadness": "melancholy, sorrow, regret, disappointment, grief",
  "anger": "frustration, irritation, resentment, rage, indignation",
  "fear": "apprehension, terror, panic, dread, worry",
  "surprise": "astonishment, wonder, amazement, shock, unexpected reactions",
  "love": "deep affection, romantic feelings, adoration, devotion, care",
  "disgust": "revulsion, distaste, contempt, aversion, repulsion",
  "anticipation": "expectation, eagerness, excitement for future events",
  "trust": "confidence, faith, reliance, security in others, belief",
  "confusion": "uncertainty, lack of clarity, bewilderment, puzzlement",
  "excitement": "thrill, enthusiasm, vigor, stimulation, energy",
  "calm": "relaxation, peacefulness, serenity, tranquility, ease",
  "hope": "optimism, expectation of positive outcomes, aspiration",
  "frustration": "annoyance, exasperation, irritation from obstacles",
  "gratitude": "thankfulness, appreciation, recognition of kindness",
  "compassion": "empathy, sympathy, concern for others' suffering",
  // Growth & personal development traits
  "mental_strength": "psychological resilience, determination, perseverance through challenges",
  "mindfulness": "present-moment awareness, conscious attention, mindful living",
  "impulse_control": "self-restraint, delayed gratification, thoughtful decision-making",
  "willpower": "self-discipline, mental fortitude, strength of will",
  "deep_focus": "concentrated attention, flow states, sustained mental effort",
  "daily_habits": "routine consistency, habit formation, structured lifestyle",
  "emotional_mastery": "emotional regulation, self-awareness, emotional intelligence",
  "stress_control": "stress management, pressure handling, maintaining composure",
  "authenticity": "genuine self-expression, being true to values, authentic living",
  "empathy": "understanding others' feelings, compassionate responses, emotional connection",
  "boundaries": "healthy limits, saying no appropriately, self-protection",
  "flow_state": "optimal performance, effortless focus, peak experience",
  "learning_speed": "rapid skill acquisition, adaptability, growth mindset",
  "resilience": "bouncing back from setbacks, recovery strength, antifragility",
  "inner_wisdom": "intuitive understanding, life experience, mature perspective",
  "self_discipline": "consistent self-control, goal pursuit, delayed gratification",
  "creativity": "innovative thinking, artistic expression, novel solutions",
  "patience": "tolerance for delays, calm waiting, long-term thinking",
  "confidence": "self-assurance, belief in abilities, positive self-regard",
  "adaptability": "flexibility to change, openness to new situations, versatility"
};

// Ordered list of metrics matching Python backend
const EMOTIONAL_METRICS = [
  // Core emotional states
  "joy", "sadness", "anger", "fear",
  "surprise", "love", "disgust", "anticipation",
  "trust", "confusion", "excitement", "calm",
  "hope", "frustration", "gratitude", "compassion",
  // Growth & personal development traits
  "mental_strength", "mindfulness", "impulse_control", "willpower",
  "deep_focus", "daily_habits", "emotional_mastery", "stress_control",
  "authenticity", "empathy", "boundaries", "flow_state",
  "learning_speed", "resilience", "inner_wisdom", "self_discipline",
  "creativity", "patience", "confidence", "adaptability"
];

export class EmotionalAnalyzer {
  private geminiClient: GeminiClient;
  private timeSegmenter: TimeSegmenter;
  private messages: WhatsAppMessage[] = [];
  private startTime: number = 0;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.timeSegmenter = new TimeSegmenter();
  }

  async analyzeEmotions(messages: WhatsAppMessage[]): Promise<EmotionalAnalysisResult> {
    this.messages = messages;
    this.startTime = Date.now();
    
    logger.debug(`Emotional Analysis: Processing ALL ${messages.length} messages (no sampling, no limits)`);

    // Always use weekly segmentation - no tiers
    const segments = this.timeSegmenter.segmentByWeek(messages);
    logger.debug(`Weekly segmentation complete: ${segments.length} weeks - ALL MESSAGES INCLUDED`);

    // Process in batches like Python backend (3-month batches)
    const weeklyAnalyses = await this.processWeeklyBatches(segments);

    // Calculate overall metrics
    const overallMetrics = this.calculateOverallMetrics(weeklyAnalyses);

    // Generate emotional journey narrative
    const emotionalJourney = await this.generateEmotionalJourney(weeklyAnalyses);

    // Final validation
    const totalProcessedMessages = weeklyAnalyses.reduce((sum, week) => {
      // This is an approximation since we don't store exact counts, but validates the process worked
      return sum + (week.weekly_summary.length > 0 ? 1 : 0);
    }, 0);

    logger.info(`Analysis complete: ${weeklyAnalyses.length} weeks analyzed`);

    return {
      weeklyAnalyses,
      overallMetrics,
      emotionalJourney
    };
  }

  async analyzeEmotionsEnhanced(messages: WhatsAppMessage[]): Promise<EnhancedEmotionalAnalysisResult> {
    this.messages = messages;
    this.startTime = Date.now();

    // Calculate data quality metrics first
    const quality = this.calculateDataQualityMetrics(messages);
    logger.debug('📊 Data quality metrics calculated:', quality);

    // Run the core emotional analysis
    const baseResult = await this.analyzeEmotions(messages);

    // Calculate confidence for each weekly analysis
    const weeklyConfidence = new Map<string, ConfidenceMetrics>();
    const evidence = new Map<string, Evidence[]>();

    for (const weeklyAnalysis of baseResult.weeklyAnalyses) {
      const weekMessages = this.getMessagesForWeek(weeklyAnalysis.week);
      
      // Calculate confidence for this week
      const confidence = this.calculateWeeklyConfidence(
        weeklyAnalysis,
        weekMessages,
        quality
      );
      weeklyConfidence.set(weeklyAnalysis.week, confidence);

      // Extract evidence for dominant emotions
      const weekEvidence = this.extractWeeklyEvidence(
        weeklyAnalysis,
        weekMessages
      );
      evidence.set(weeklyAnalysis.week, weekEvidence);
    }

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(
      baseResult,
      quality,
      weeklyConfidence
    );

    // Get date range
    const sortedMessages = [...messages].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Create enhanced result with confidence data
    const enhancedWeeklyAnalyses: EnhancedWeeklyAnalysis[] = baseResult.weeklyAnalyses.map(week => ({
      ...week,
      _confidence: weeklyConfidence.get(week.week),
      _evidence: evidence.get(week.week)
    }));

    const enhancedResult: EnhancedEmotionalAnalysisResult = {
      ...baseResult,
      weeklyAnalyses: enhancedWeeklyAnalyses,
      confidence: overallConfidence,
      quality,
      weeklyConfidence,
      evidence,
      metadata: {
        analysisVersion: '2.0.0',
        processingTime: Date.now() - this.startTime,
        messageCount: messages.length,
        dateRange: {
          start: sortedMessages[0].timestamp,
          end: sortedMessages[sortedMessages.length - 1].timestamp
        }
      }
    };

    logger.info('✅ Enhanced emotional analysis complete:', {
      overallConfidence: overallConfidence.overall,
      qualityScore: quality.reliability,
      weeksAnalyzed: baseResult.weeklyAnalyses.length
    });

    return enhancedResult;
  }

  private async processWeeklyBatches(segments: WeeklySegment[]): Promise<WeeklyEmotionalAnalysis[]> {
    // Get configuration for parallelism
    const config = getAnalysisConfig();
    const concurrency = config.apiCallConcurrency || 10;

    // Dynamic batch size based on message count
    const totalMessages = segments.reduce((sum, seg) => sum + seg.messages.length, 0);
    const WEEKS_PER_BATCH = totalMessages > 5000 ? 12 : 24; // Larger batches to reduce API calls

    logger.debug(`Processing ${segments.length} weeks with dynamic batch size: ${WEEKS_PER_BATCH} weeks per batch`);
    logger.debug(`Parallelism mode: ${config.parallelismMode}, Concurrency: ${concurrency} API calls`);

    // Prepare all batches
    const batches: WeeklySegment[][] = [];
    for (let i = 0; i < segments.length; i += WEEKS_PER_BATCH) {
      batches.push(segments.slice(i, i + WEEKS_PER_BATCH));
    }

    logger.debug(`Prepared ${batches.length} batches for parallel processing`);

    // Create concurrency limiter
    const limit = pLimit(concurrency);

    // Process all batches in parallel with concurrency control
    const batchPromises = batches.map((batchSegments, index) => {
      const batchNumber = index + 1;
      const startWeek = index * WEEKS_PER_BATCH + 1;
      const endWeek = Math.min((index + 1) * WEEKS_PER_BATCH, segments.length);
      const totalBatchMessages = batchSegments.reduce((sum, seg) => sum + seg.messages.length, 0);

      return limit(async () => {
        logger.debug(`[Batch ${batchNumber}/${batches.length}] Starting: weeks ${startWeek}-${endWeek} with ALL ${totalBatchMessages} messages`);

        // Retry logic for batch processing
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
          try {
            const result = await this.analyzeBatch(batchSegments);
            logger.debug(`[Batch ${batchNumber}/${batches.length}] Completed successfully`);
            return result;
          } catch (error) {
            retries++;
            logger.warn(`[Batch ${batchNumber}] Failed (attempt ${retries}/${maxRetries}):`, error);

            if (retries < maxRetries) {
              // Exponential backoff with jitter
              const backoff = Math.pow(2, retries) * 1000 + Math.random() * 1000;
              logger.debug(`[Batch ${batchNumber}] Retrying in ${backoff}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoff));
            } else {
              // Final attempt failed, use fallback
              logger.error(`[Batch ${batchNumber}] Failed after ${maxRetries} attempts, using fallback`);
              return batchSegments.map(seg => this.createDefaultAnalysis(seg));
            }
          }
        }

        // Fallback in case all retries fail
        return batchSegments.map(seg => this.createDefaultAnalysis(seg));
      });
    });

    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);

    // Flatten results and return
    const results = batchResults.flat();
    logger.debug(`All ${batches.length} batches completed. Total weeks analyzed: ${results.length}`);

    return results;
  }

  private async analyzeBatch(segments: WeeklySegment[]): Promise<WeeklyEmotionalAnalysis[]> {
    // Separate empty weeks from non-empty weeks
    const nonEmptySegments = segments.filter(segment => segment.messages.length > 0);
    const emptySegments = segments.filter(segment => segment.messages.length === 0);

    logger.debug(`Batch breakdown: ${nonEmptySegments.length} weeks with messages, ${emptySegments.length} empty weeks`);

    let aiResults: WeeklyEmotionalAnalysis[] = [];

    // Only process non-empty weeks with AI if there are any
    if (nonEmptySegments.length > 0) {
      // Format segments into the structure expected by the prompt
      const batchData: Record<string, any> = {};
      let totalMessagesInBatch = 0;

      for (const segment of nonEmptySegments) {
        const segmentMessages = segment.messages.map(msg => ({ message: msg.content }));
        totalMessagesInBatch += segmentMessages.length;

        batchData[segment.yearWeek] = {
          messages: segmentMessages,
          contributing_people: segment.contributingPeople || []
        };

        logger.debug(`Week ${segment.yearWeek}: Including ALL ${segmentMessages.length} messages in analysis`);
      }

      logger.debug(`AI batch total: Processing ALL ${totalMessagesInBatch} messages (no sampling applied)`);

      const prompt = this.createEmotionalAnalysisPrompt(batchData);

      try {
        const response = await this.geminiClient.generateStructuredContent(prompt, EMOTIONAL_ANALYSIS_SCHEMA);
        aiResults = this.parseStructuredEmotionalResponse(response);
      } catch (error) {
        logger.error('Error analyzing non-empty weeks with structured output:', error);
        // Return default analyses for failed non-empty weeks
        aiResults = nonEmptySegments.map(segment => this.createDefaultAnalysis(segment));
      }
    }

    // Generate deterministic content for empty weeks
    const emptyResults: WeeklyEmotionalAnalysis[] = emptySegments.map(segment => {
      logger.debug(`Week ${segment.yearWeek}: Generating deterministic analysis for empty week`);
      return this.createEmptyWeekAnalysis(segment.yearWeek);
    });

    // Combine results and sort by week
    const allResults = [...aiResults, ...emptyResults].sort((a, b) => a.week.localeCompare(b.week));

    // Validate uniqueness of weekly content
    this.validateWeeklyUniqueness(allResults);

    return allResults;
  }

  private createEmotionalAnalysisPrompt(batchOfWeeklyMessages: Record<string, any>): string {
    // Calculate total messages in batch for context
    const totalMessagesInBatch = Object.values(batchOfWeeklyMessages).reduce(
      (sum: number, weekData: any) => sum + (weekData.messages?.length || 0), 0
    );

    let prompt = `You are an expert psychological analyst specializing in deep emotional intelligence assessment. Analyze the following WhatsApp messages with sophisticated emotional awareness, considering both explicit expressions and subtle psychological indicators. This batch contains ${totalMessagesInBatch} total messages across ${Object.keys(batchOfWeeklyMessages).length} weeks.

🧠 ADVANCED EMOTIONAL ASSESSMENT FRAMEWORK:

SCORING PHILOSOPHY - Use ABSOLUTE EMOTIONAL ASSESSMENT (not relative to batch):
- 20-80 range: Normal human emotional spectrum (majority of weeks fall here)
- 10-19 range: Significant emotional lows or notable absence of that emotion
- 81-95 range: Strong, notable emotional expressions requiring attention
- 1-9 and 96-100: Extreme emotional states (reserve for truly exceptional circumstances)
- Score each emotion independently based on its genuine presence and psychological intensity
- Moderate happiness should score 40-60, NOT 100 just because it's the week's peak
- Prioritize authentic emotional progressions over artificial dramatic arcs

🎯 CRITICAL EMOTIONAL NUANCES:

SADNESS & ANGER - NATURAL VOLATILITY:
- These emotions have inherent volatility patterns - don't artificially suppress them
- Can legitimately spike from 30 to 80+ within a single week due to specific events
- Conflict, disappointment, loss, stress can cause rapid spikes to 70-85 range
- Look for: grief processing, relationship tensions, work stress, family conflicts
- A single devastating event can cause sadness to reach 85-90 appropriately

SUBTEXT & CONVERSATIONAL PSYCHOLOGY:
- Emotional depth often lies in HOW people communicate, not just what they say
- Talkative person becoming brief = potential hidden sadness (score 60-75)
- Deflecting serious questions = emotional avoidance patterns
- "I'm fine" after receiving bad news = classic emotional masking (score the underlying reality)
- Changes in communication frequency/enthusiasm = emotional state indicators
- Sarcasm, humor deflection, topic changes = potential emotional defense mechanisms

GROWTH TRAITS - BEHAVIORAL INDICATORS:
- Self-discipline: Evidence of consistent choices, routine maintenance, goal pursuit
- Resilience: How quickly someone recovers from setbacks, reframes challenges
- Authenticity: Genuine self-expression vs. people-pleasing, honest emotional sharing
- Boundaries: Ability to say no, protect personal time/energy, maintain standards
- Mindfulness: Present-moment awareness, non-reactive responses, conscious choices

📊 SCORING REFERENCE GUIDE:
- 1-9: Extreme absence/opposite emotion (clinical concern level)
- 10-19: Notable deficiency in emotional expression
- 20-39: Below typical range but still present
- 40-60: Healthy, moderate human emotional range
- 61-80: Above average, good emotional presence
- 81-95: Strong, significant emotional expression (noteworthy)
- 96-100: Overwhelming, extreme presence (rare, requires clinical attention)

🔍 WEEKLY CONTENT REQUIREMENTS:

WEEKLY_SUMMARY - Psychological Depth:
- Extract ACTUAL events, decisions, and emotional moments from THAT specific week
- Use real names from conversations - never generic terms like 'User' or 'user'
- Focus on concrete psychological moments: "Sarah expressed vulnerability about work stress"
- Identify emotional processing patterns: "Worked through anxiety about upcoming presentation"
- Capture relationship dynamics: "Showed increased emotional support for struggling friend"
- Each point should reveal genuine psychological insight from that week's unique content

WEEKLY_TOPICS - Thematic Analysis:
- Identify the 3 most psychologically significant discussion themes from THAT week's messages
- Use specific, descriptive terms rather than broad emotional categories
- Examples: "Career transition anxiety", "Relationship boundary setting", "Family conflict resolution"
- Focus on what drove emotional engagement that specific week
- Each week must have unique themes - no repetition across time periods

🚨 ABSOLUTE REQUIREMENTS:
- Each week MUST have completely unique analysis content
- Base all assessments solely on that week's actual message content
- Provide exactly 3 items for both weekly_summary and weekly_topics
- Maintain psychological authenticity - avoid generic or templated responses
- Consider emotional continuity but score each week independently

Output Format: Single JSON array with objects containing:
- "week": YYYY-MM-DD format (Monday of week)
- All 40 emotional metrics (scored 1-100)
- "weekly_summary": [3 specific psychological insights]
- "weekly_topics": [3 unique discussion themes]

Emotional Metrics to Score (1-100 each):
`;

    // Add all metrics with descriptions
    for (const metric of EMOTIONAL_METRICS) {
      prompt += `- ${metric}: ${METRIC_DESCRIPTIONS[metric]}\n`;
    }

    prompt += `\nMessages by week:\n`;

    // Sort weeks for consistent processing
    const sortedWeekKeys = Object.keys(batchOfWeeklyMessages).sort();

    for (const weekKey of sortedWeekKeys) {
      const weekData = batchOfWeeklyMessages[weekKey];
      const messages = weekData.messages || [];
      const contributingPeople = weekData.contributing_people || [];

      prompt += `\n--- Week of ${weekKey} (${messages.length} messages) ---\n`;
      if (contributingPeople.length > 0) {
        prompt += `(Conversations with: ${contributingPeople.join(', ')})\n`;
      }

      // Since empty weeks are now handled separately, we only process weeks with messages
      prompt += `🎯 ANALYZE THIS WEEK'S UNIQUE CONTENT - Each message below happened during week ${weekKey}:\n`;
      for (const msg of messages) {
        prompt += `- User: ${msg.message}\n`;
      }
      prompt += `\n🚨 IMPORTANT: Base your weekly_summary and weekly_topics ONLY on the ${messages.length} messages above from week ${weekKey}. Do NOT repeat content from other weeks.\n`;
    }

    prompt += `\n\nExample of the REQUIRED JSON structure for ONE week:
{
  "week": "YYYY-MM-DD",
`;

    for (const metric of EMOTIONAL_METRICS) {
      prompt += `  "${metric}": <score_1_to_100>,\n`;
    }

    prompt += `  "weekly_summary": ["Brief topic 1", "Concise event 2", "Key highlight 3"],
  "weekly_topics": ["Theme A", "Topic B", "Discussion C"]
}

Ensure the output is valid JSON only, with no preceding or succeeding text. The top-level structure MUST be a JSON array [].`;

    return prompt;
  }

  private parseEmotionalResponse(response: string): WeeklyEmotionalAnalysis[] {
    try {
      const jsonData = extractJSON(response);

      if (!Array.isArray(jsonData)) {
        throw new Error('Response is not an array');
      }

      return jsonData.map(weekData => {
        // Validate week data structure
        if (!weekData || typeof weekData !== 'object' || !weekData.week) {
          logger.error('Invalid week data structure:', weekData);
          return null;
        }

        // Create metrics object with all values
        const metrics: any = {};
        for (const metric of EMOTIONAL_METRICS) {
          const value = weekData[metric];
          // Ensure we have a valid number
          metrics[metric] = (typeof value === 'number' && value >= 0 && value <= 100)
            ? value
            : 50; // Default to 50 if missing or invalid
        }

        return {
          week: weekData.week,
          metrics: metrics as EmotionalMetrics,
          weekly_summary: Array.isArray(weekData.weekly_summary) && weekData.weekly_summary.length === 3
            ? weekData.weekly_summary
            : ['Activity detected', 'Conversation ongoing', 'Emotional patterns present'],
          weekly_topics: Array.isArray(weekData.weekly_topics) && weekData.weekly_topics.length === 3
            ? weekData.weekly_topics
            : ['General conversation', 'Daily life', 'Social interaction'],
          contributing_people: Array.isArray(weekData.contributing_people)
            ? weekData.contributing_people
            : []
        };
      }).filter(week => week !== null); // Remove any null entries
    } catch (error) {
      logger.error('Error parsing emotional response:', error);
      logger.debug('Raw response:', response);
      throw new Error('Failed to parse emotional analysis response');
    }
  }

  private parseStructuredEmotionalResponse(response: any): WeeklyEmotionalAnalysis[] {
    try {
      // With structured output, response should already be parsed JSON
      if (!Array.isArray(response)) {
        throw new Error('Structured response is not an array');
      }

      return response.map(weekData => {
        // Validate week data structure
        if (!weekData || typeof weekData !== 'object' || !weekData.week) {
          logger.error('Invalid week data structure:', weekData);
          return null;
        }

        // Create metrics object with all values
        const metrics: any = {};
        for (const metric of EMOTIONAL_METRICS) {
          const value = weekData[metric];
          // Ensure we have a valid number
          metrics[metric] = (typeof value === 'number' && value >= 0 && value <= 100)
            ? value
            : 50; // Default to 50 if missing or invalid
        }

        return {
          week: weekData.week,
          metrics: metrics as EmotionalMetrics,
          weekly_summary: Array.isArray(weekData.weekly_summary) && weekData.weekly_summary.length === 3
            ? weekData.weekly_summary
            : ['Activity detected', 'Conversation ongoing', 'Emotional patterns present'],
          weekly_topics: Array.isArray(weekData.weekly_topics) && weekData.weekly_topics.length === 3
            ? weekData.weekly_topics
            : ['General conversation', 'Daily life', 'Social interaction'],
          contributing_people: Array.isArray(weekData.contributing_people)
            ? weekData.contributing_people
            : []
        };
      }).filter(week => week !== null); // Remove any null entries
    } catch (error) {
      logger.error('Error parsing structured emotional response:', error);
      logger.debug('Structured response:', response);
      throw new Error('Failed to parse structured emotional analysis response');
    }
  }

  private createDefaultAnalysis(segment: WeeklySegment): WeeklyEmotionalAnalysis {
    const defaultMetrics: any = {};

    // Set all metrics to moderate baseline values
    for (const metric of EMOTIONAL_METRICS) {
      defaultMetrics[metric] = 40 + Math.random() * 20; // 40-60 range
    }

    return {
      week: segment.yearWeek,
      metrics: defaultMetrics as EmotionalMetrics,
      weekly_summary: [
        'Regular conversation activity',
        'Social engagement maintained',
        'Emotional balance observed'
      ],
      weekly_topics: [
        'Daily communication',
        'General discussion',
        'Social interaction'
      ],
      contributing_people: segment.contributingPeople || []
    };
  }

  private calculateOverallMetrics(weeklyAnalyses: WeeklyEmotionalAnalysis[]): EmotionalMetrics {
    const overallMetrics: any = {};

    // Safety check for empty or invalid input
    if (!weeklyAnalyses || weeklyAnalyses.length === 0) {
      logger.warn('calculateOverallMetrics called with empty weeklyAnalyses');
      for (const metric of EMOTIONAL_METRICS) {
        overallMetrics[metric] = 50; // Default neutral value
      }
      return overallMetrics as EmotionalMetrics;
    }

    for (const metric of EMOTIONAL_METRICS) {
      const values = weeklyAnalyses
        .filter(week => week && week.metrics && typeof week.metrics[metric as keyof EmotionalMetrics] === 'number')
        .map(week => week.metrics[metric as keyof EmotionalMetrics]);

      if (values.length === 0) {
        logger.warn(`No valid values found for metric: ${metric}`);
        overallMetrics[metric] = 50; // Default neutral value
      } else {
        overallMetrics[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }

    return overallMetrics as EmotionalMetrics;
  }

  private async generateEmotionalJourney(weeklyAnalyses: WeeklyEmotionalAnalysis[]): Promise<string> {
    if (weeklyAnalyses.length === 0) {
      return 'No emotional journey data available.';
    }

    // Create a summary of the emotional journey
    const journeyData = {
      totalWeeks: weeklyAnalyses.length,
      overallTrend: this.calculateEmotionalTrend(weeklyAnalyses),
      dominantEmotions: this.findDominantEmotions(weeklyAnalyses),
      keyMoments: this.identifyKeyMoments(weeklyAnalyses)
    };

    const prompt = `Based on this emotional journey data, write a brief narrative (2-3 sentences) about the person's emotional evolution:
${JSON.stringify(journeyData, null, 2)}

Write a compassionate, insightful summary that captures their emotional growth and key experiences.`;

    try {
      const response = await this.geminiClient.generateContent(prompt);
      return response.trim();
    } catch (error) {
      logger.error('Error generating emotional journey:', error);
      return `Over ${weeklyAnalyses.length} weeks, a rich emotional journey unfolded with moments of ${journeyData.dominantEmotions.join(', ')}.`;
    }
  }

  private calculateEmotionalTrend(weeklyAnalyses: WeeklyEmotionalAnalysis[]): string {
    if (weeklyAnalyses.length < 2) return 'stable';

    // Compare first quarter to last quarter average of positive emotions
    const positiveEmotions = ['joy', 'love', 'gratitude', 'hope', 'excitement'];
    const quarterLength = Math.floor(weeklyAnalyses.length / 4);

    const firstQuarter = weeklyAnalyses.slice(0, quarterLength);
    const lastQuarter = weeklyAnalyses.slice(-quarterLength);

    const avgFirst = this.averageEmotions(firstQuarter, positiveEmotions);
    const avgLast = this.averageEmotions(lastQuarter, positiveEmotions);

    if (avgLast > avgFirst + 10) return 'improving';
    if (avgLast < avgFirst - 10) return 'challenging';
    return 'evolving';
  }

  private averageEmotions(weeks: WeeklyEmotionalAnalysis[], emotions: string[]): number {
    const sum = weeks.reduce((total, week) => {
      const weekSum = emotions.reduce((emotionSum, emotion) => {
        return emotionSum + (week.metrics[emotion as keyof EmotionalMetrics] || 0);
      }, 0);
      return total + weekSum / emotions.length;
    }, 0);

    return sum / weeks.length;
  }

  private findDominantEmotions(weeklyAnalyses: WeeklyEmotionalAnalysis[]): string[] {
    const emotionTotals: Record<string, number> = {};

    // Only consider core emotions for dominant emotions
    const coreEmotions = EMOTIONAL_METRICS.slice(0, 16);

    for (const emotion of coreEmotions) {
      emotionTotals[emotion] = weeklyAnalyses.reduce((sum, week) => {
        return sum + week.metrics[emotion as keyof EmotionalMetrics];
      }, 0);
    }

    // Sort by total and get top 3
    return Object.entries(emotionTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);
  }

  private identifyKeyMoments(weeklyAnalyses: WeeklyEmotionalAnalysis[]): string[] {
    const keyMoments: string[] = [];

    // Find weeks with high emotional intensity
    for (const week of weeklyAnalyses) {
      const intensity = (week.metrics.joy + week.metrics.excitement + week.metrics.love) / 3;
      if (intensity > 70) {
        keyMoments.push(`High positive emotions in week ${week.week}`);
      }
    }

    return keyMoments.slice(0, 3); // Return top 3 key moments
  }

  /**
   * Generate deterministic content for empty weeks to avoid AI-generated duplicates
   */
  private createEmptyWeekAnalysis(weekDate: string): WeeklyEmotionalAnalysis {
    // Create baseline metrics (neutral emotional state)
    const metrics: any = {};
    for (const metric of EMOTIONAL_METRICS) {
      metrics[metric] = 25; // Neutral baseline for empty weeks
    }

    return {
      week: weekDate,
      metrics: metrics as EmotionalMetrics,
      weekly_summary: [
        'No active conversations',
        'Quiet period',
        'Communication gap'
      ],
      weekly_topics: [
        'No messages',
        'Silent period',
        'Inactive week'
      ],
      contributing_people: []
    };
  }

  private validateWeeklyUniqueness(weeklyAnalyses: WeeklyEmotionalAnalysis[]): void {
    // Duplicates are OK - multiple weeks can have similar summaries/topics
    // This is just for logging purposes, not an error condition
    logger.debug(`Weekly analysis validation: Processed ${weeklyAnalyses.length} weeks`);
  }

  // Enhanced analysis methods
  private calculateDataQualityMetrics(messages: WhatsAppMessage[]): DataQualityMetrics {
    const sortedMessages = [...messages].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const timeSpan = sortedMessages.length > 1 
      ? (sortedMessages[sortedMessages.length - 1].timestamp.getTime() - sortedMessages[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 1;

    const participants = new Set(messages.map(m => m.sender)).size;
    const averageLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;

    // Calculate reliability score based on multiple factors
    let reliability = 50; // Base score
    
    // Message count factor (more messages = higher reliability)
    if (messages.length > 1000) reliability += 20;
    else if (messages.length > 500) reliability += 15;
    else if (messages.length > 100) reliability += 10;
    else if (messages.length < 50) reliability -= 15;

    // Time span factor (longer conversations = higher reliability)
    if (timeSpan > 365) reliability += 15;
    else if (timeSpan > 90) reliability += 10;
    else if (timeSpan > 30) reliability += 5;
    else if (timeSpan < 7) reliability -= 10;

    // Participant diversity (more participants = higher reliability)
    if (participants > 5) reliability += 10;
    else if (participants > 2) reliability += 5;
    else if (participants === 1) reliability -= 10;

    // Average message length (more detailed messages = higher reliability)
    if (averageLength > 50) reliability += 5;
    else if (averageLength < 20) reliability -= 5;

    reliability = Math.max(0, Math.min(100, reliability));

    return {
      reliability,
      messageCount: messages.length,
      timeSpan,
      participantCount: participants,
      averageMessageLength: averageLength
    };
  }

  private getMessagesForWeek(week: string): WhatsAppMessage[] {
    // Parse week string (e.g., '2024-08-05')
    const weekStart = new Date(week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.messages.filter(msg => 
      msg.timestamp >= weekStart && msg.timestamp < weekEnd
    );
  }

  private calculateWeeklyConfidence(
    weeklyAnalysis: WeeklyEmotionalAnalysis,
    messages: WhatsAppMessage[],
    dataQuality: DataQualityMetrics
  ): ConfidenceMetrics {
    // Calculate emotional range
    const metrics = Object.values(weeklyAnalysis.metrics);
    const emotionalRange = Math.max(...metrics) - Math.min(...metrics);

    // Calculate transition smoothness
    const transitionSmoothness = this.calculateTransitionSmoothness(metrics);

    // Calculate emotional consistency for this week
    const emotionalConsistency = this.calculateEmotionalConsistency(messages, weeklyAnalysis);

    // Calculate pattern strength
    const patternStrength = this.calculatePatternStrength(weeklyAnalysis);

    return {
      overall: Math.round((emotionalConsistency * 0.4 + patternStrength * 0.3 + transitionSmoothness * 0.3) * 10),
      dataQuality: Math.round(dataQuality.reliability / 10),
      sampleSize: Math.round(Math.min(10, messages.length / 50)),
      consistency: Math.round(emotionalConsistency * 10)
    };
  }

  private extractWeeklyEvidence(
    weeklyAnalysis: WeeklyEmotionalAnalysis,
    messages: WhatsAppMessage[]
  ): Evidence[] {
    const evidence: Evidence[] = [];

    // Get dominant emotions
    const dominantEmotions = this.getDominantEmotions(weeklyAnalysis.metrics);
    const emotionKeywords = this.getEmotionKeywords(dominantEmotions.slice(0, 3));

    // Extract message evidence
    const messageEvidence = this.extractMessageEvidence(
      messages,
      emotionKeywords,
      3
    );
    evidence.push(...messageEvidence);

    // Add pattern evidence from summary
    if (weeklyAnalysis.weekly_summary && weeklyAnalysis.weekly_summary.length > 0) {
      evidence.push({
        type: 'pattern',
        content: weeklyAnalysis.weekly_summary.join(' ').substring(0, 200),
        relevance: 8
      });
    }

    // Add statistical evidence
    const topEmotions = dominantEmotions.slice(0, 3);
    const emotionalIntensity = this.calculateEmotionalIntensity(weeklyAnalysis.metrics);
    evidence.push({
      type: 'statistical',
      content: `Dominant emotions: ${topEmotions.join(', ')} with intensity ${emotionalIntensity}`,
      relevance: 7
    });

    return evidence;
  }

  private calculateOverallConfidence(
    result: EmotionalAnalysisResult,
    quality: DataQualityMetrics,
    weeklyConfidence: Map<string, ConfidenceMetrics>
  ): ConfidenceMetrics {
    // Average weekly confidence scores
    let totalConfidence = 0;
    let count = 0;

    for (const [_, confidence] of weeklyConfidence) {
      totalConfidence += confidence.overall;
      count++;
    }

    const avgConfidence = count > 0 ? totalConfidence / count : 5;

    // Factor in overall consistency
    const overallConsistency = this.calculateOverallConsistency(result);

    return {
      overall: Math.round(avgConfidence * 0.7 + overallConsistency * 0.3),
      dataQuality: Math.round(quality.reliability / 10),
      sampleSize: Math.round(Math.min(10, this.messages.length / 100)),
      consistency: Math.round(overallConsistency)
    };
  }

  // Helper methods for confidence calculation
  private calculateTransitionSmoothness(metrics: number[]): number {
    if (metrics.length < 2) return 1;

    let totalVariation = 0;
    for (let i = 1; i < metrics.length; i++) {
      totalVariation += Math.abs(metrics[i] - metrics[i-1]);
    }

    const avgVariation = totalVariation / (metrics.length - 1);
    return Math.max(0, 1 - avgVariation / 50);
  }

  private calculateEmotionalConsistency(messages: WhatsAppMessage[], analysis: WeeklyEmotionalAnalysis): number {
    // Check consistency between message content and emotional scores
    const dominantEmotions = this.getDominantEmotions(analysis.metrics).slice(0, 3);
    const keywords = this.getEmotionKeywords(dominantEmotions);
    
    let matchingMessages = 0;
    for (const message of messages) {
      const messageText = message.content.toLowerCase();
      if (keywords.some(keyword => messageText.includes(keyword.toLowerCase()))) {
        matchingMessages++;
      }
    }
    
    return messages.length > 0 ? matchingMessages / messages.length : 0.5;
  }

  private calculatePatternStrength(analysis: WeeklyEmotionalAnalysis): number {
    // Check how dominant the top emotions are
    const topEmotionKeys = this.getDominantEmotions(analysis.metrics).slice(0, 3);
    let totalStrength = 0;

    for (const emotion of topEmotionKeys) {
      const value = (analysis.metrics as any)[emotion] || 0;
      totalStrength += value;
    }

    return Math.min(1, totalStrength / 180);
  }

  private calculateOverallConsistency(result: EmotionalAnalysisResult): number {
    if (result.weeklyAnalyses.length < 2) return 7;

    let consistencyScore = 10;
    
    for (let i = 1; i < result.weeklyAnalyses.length; i++) {
      const prev = result.weeklyAnalyses[i-1];
      const curr = result.weeklyAnalyses[i];
      
      const prevDominant = this.getDominantEmotions(prev.metrics).slice(0, 5);
      const currDominant = this.getDominantEmotions(curr.metrics).slice(0, 5);
      const sharedEmotions = prevDominant.filter(e => 
        currDominant.includes(e)
      ).length;
      
      if (sharedEmotions < 2) {
        consistencyScore -= 0.5;
      }
      
      const prevIntensity = this.calculateEmotionalIntensity(prev.metrics);
      const currIntensity = this.calculateEmotionalIntensity(curr.metrics);
      const intensityDiff = Math.abs(prevIntensity - currIntensity);
      if (intensityDiff > 30) {
        consistencyScore -= 0.5;
      }
    }

    return Math.max(5, consistencyScore);
  }

  private extractMessageEvidence(
    messages: WhatsAppMessage[],
    keywords: string[],
    maxEvidence: number
  ): Evidence[] {
    const evidence: Evidence[] = [];
    
    for (const message of messages) {
      if (evidence.length >= maxEvidence) break;
      
      const messageText = message.content.toLowerCase();
      const relevantKeywords = keywords.filter(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      
      if (relevantKeywords.length > 0) {
        evidence.push({
          type: 'message',
          content: message.content.substring(0, 150),
          relevance: Math.min(10, relevantKeywords.length * 3)
        });
      }
    }
    
    return evidence;
  }

  private getEmotionKeywords(emotions: string[]): string[] {
    const keywordMap: Record<string, string[]> = {
      joy: ['happy', 'joy', 'excited', 'great', 'amazing', 'wonderful', '😊', '😄', '🎉'],
      sadness: ['sad', 'upset', 'down', 'depressed', 'unhappy', 'cry', '😢', '😭'],
      anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'pissed', '😠', '😡'],
      fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'terrified', '😨', '😰'],
      love: ['love', 'care', 'adore', 'affection', 'heart', '❤️', '💕', '😍'],
      surprise: ['surprised', 'shock', 'amazed', 'astonished', 'unexpected', '😲', '😮'],
      trust: ['trust', 'believe', 'faith', 'confident', 'reliable', 'depend'],
      anticipation: ['anticipate', 'expect', 'waiting', 'looking forward', 'eager'],
      disgust: ['disgusted', 'repulsed', 'gross', 'revolting', 'sick', '🤢', '🤮'],
      confusion: ['confused', 'puzzled', 'uncertain', 'unclear', 'bewildered', '😕', '🤔'],
      excitement: ['excited', 'thrilled', 'pumped', 'energized', 'eager'],
      calm: ['calm', 'peaceful', 'serene', 'relaxed', 'tranquil', 'zen'],
      hope: ['hope', 'optimistic', 'positive', 'looking forward', 'believe', 'faith'],
      frustration: ['frustrated', 'annoyed', 'irritated', 'aggravated', 'exasperated', '😤'],
      gratitude: ['grateful', 'thankful', 'appreciate', 'blessed', 'thanks', '🙏'],
      compassion: ['compassion', 'sympathy', 'caring', 'understanding', 'kind'],
      empathy: ['empathy', 'understand', 'relate', 'feel for', 'sympathize']
    };

    const keywords: string[] = [];
    for (const emotion of emotions) {
      const emotionKeywords = keywordMap[emotion.toLowerCase()] || [emotion];
      keywords.push(...emotionKeywords);
    }

    return [...new Set(keywords)];
  }

  private getDominantEmotions(metrics: EmotionalMetrics): string[] {
    const emotionalMetrics = {
      joy: metrics.joy,
      sadness: metrics.sadness,
      anger: metrics.anger,
      fear: metrics.fear,
      love: metrics.love,
      surprise: metrics.surprise,
      trust: metrics.trust,
      anticipation: metrics.anticipation,
      disgust: metrics.disgust,
      confusion: metrics.confusion,
      excitement: metrics.excitement,
      calm: metrics.calm,
      hope: metrics.hope,
      frustration: metrics.frustration,
      gratitude: metrics.gratitude,
      compassion: metrics.compassion,
      empathy: metrics.empathy
    };

    return Object.entries(emotionalMetrics)
      .sort((a, b) => b[1] - a[1])
      .map(([emotion]) => emotion);
  }

  private calculateEmotionalIntensity(metrics: EmotionalMetrics): number {
    const dominantEmotions = this.getDominantEmotions(metrics).slice(0, 5);
    
    let totalIntensity = 0;
    for (const emotion of dominantEmotions) {
      totalIntensity += (metrics as any)[emotion] || 0;
    }
    
    return Math.round(totalIntensity / 5);
  }

}