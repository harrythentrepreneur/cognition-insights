import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { GeminiClient } from '../gemini/gemini-client';
import { EmotionalAnalyzer } from './emotional-analyzer';
import { TriggersAnalyzer } from './triggers-analyzer';
import { PersonalityAnalyzer } from './personality-analyzer';
import { RelationshipsAnalyzer } from './relationships-analyzer';
import { TimelineEventsAnalyzerEnhanced } from './timeline-events-analyzer-enhanced';
import { BehavioralReflectionsAnalyzer } from './behavioral-reflections-analyzer';
import { apiCounter } from '../utils/api-counter';
import { EnhancedIndexedDBStorage } from '../storage/enhanced-indexed-db';
import { logger } from '../utils/logger';
import { rateLimitManager } from '../utils/rate-limit-manager';
import { getAnalysisConfig } from '../config/analysis-config';

export interface AnalyzerConfig {
  runEmotional?: boolean;
  runTriggers?: boolean;
  runPersonality?: boolean;
  runRelationships?: boolean;
  runTimelineEvents?: boolean;
  runBehavioralReflections?: boolean;
}

export interface ComprehensiveAnalysisResult {
  sessionId: string;
  timestamp: number;
  userName: string;
  totalMessages: number;
  userMessages: number;
  emotional: any;
  triggers: any;
  personality: any;
  relationships: any;
  timelineEvents: any;
  behavioralReflections: any;
  processingTime: number;
  completionStatus?: {
    total: number;
    completed: number;
    failed: number;
    gaps: Array<{ start: string; end: string; reason: string }>;
  };
}

export class ComprehensiveAnalyzerEnhanced {
  private geminiClient: GeminiClient;
  private emotionalAnalyzer: EmotionalAnalyzer;
  private triggersAnalyzer: TriggersAnalyzer;
  private personalityAnalyzer: PersonalityAnalyzer;
  private relationshipsAnalyzer: RelationshipsAnalyzer;
  private timelineEventsAnalyzer: TimelineEventsAnalyzerEnhanced;
  private behavioralReflectionsAnalyzer: BehavioralReflectionsAnalyzer;
  private storage: EnhancedIndexedDBStorage;

  constructor() {
    this.geminiClient = new GeminiClient();
    this.emotionalAnalyzer = new EmotionalAnalyzer(this.geminiClient);
    this.triggersAnalyzer = new TriggersAnalyzer(this.geminiClient);
    this.personalityAnalyzer = new PersonalityAnalyzer(this.geminiClient);
    this.relationshipsAnalyzer = new RelationshipsAnalyzer();
    this.timelineEventsAnalyzer = new TimelineEventsAnalyzerEnhanced(this.geminiClient);
    this.behavioralReflectionsAnalyzer = new BehavioralReflectionsAnalyzer(this.geminiClient);
    
    // Initialize storage
    this.storage = new EnhancedIndexedDBStorage();
  }

  async analyzeComprehensive(
    messages: WhatsAppMessage[],
    userName: string,
    totalMessages: number,
    onProgress?: (stage: string, progress: number, message: string) => void,
    config: AnalyzerConfig = {}
  ): Promise<ComprehensiveAnalysisResult> {
    // Default config - run all analyzers if not specified
    const analyzerConfig: AnalyzerConfig = {
      runEmotional: config.runEmotional !== false,
      runTriggers: config.runTriggers !== false,
      runPersonality: config.runPersonality !== false,
      runRelationships: config.runRelationships !== false,
      runTimelineEvents: config.runTimelineEvents !== false,
      runBehavioralReflections: config.runBehavioralReflections !== false,
    };

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();
    
    // Get analysis configuration
    const analysisConfig = getAnalysisConfig();
    
    // Performance monitoring
    const performanceMetrics = {
      startTime,
      memoryBefore: (performance as any).memory?.usedJSHeapSize,
      parallelismMode: analysisConfig.parallelismMode,
      apiCallConcurrency: analysisConfig.apiCallConcurrency
    };
    
    // Always show analysis start - important for monitoring
    console.log('🚀 Starting comprehensive analysis:', {
      messageCount: messages.length,
      totalMessages,
      userName,
      analyzersEnabled: Object.entries(analyzerConfig).filter(([_, enabled]) => enabled).map(([name]) => name),
      parallelismMode: analysisConfig.parallelismMode,
      concurrency: analysisConfig.apiCallConcurrency
    });
    
    // Initialize storage
    await this.storage.initialize();
    
    // Reset API counter
    apiCounter.reset();
    
    // Initialize session in storage
    await this.storage.initializeSession(sessionId, {
      userName,
      totalMessages,
      totalSegments: 0, // Will be updated
      status: 'processing'
    });


    // Quick relationship analysis (no API needed)
    let relationships = null;
    if (analyzerConfig.runRelationships) {
      onProgress?.('relationships', 5, 'Analyzing relationships...');
      try {
        relationships = await this.relationshipsAnalyzer.analyzeRelationships(messages, userName);
        onProgress?.('relationships', 10, 'Relationships analysis complete');
      } catch (error) {
        logger.error('Relationships analysis failed:', error);
      }
    }

    // Build list of analyzers to run based on config
    const analyzersToRun: Promise<any>[] = [];
    const analyzerNames: string[] = [];
    
    if (analyzerConfig.runEmotional) {
      analyzersToRun.push(
        (async () => {
          logger.debug('[Emotional] Starting analysis...');
          onProgress?.('emotional', 15, 'Starting emotional analysis...');
          const start = Date.now();
          const result = await this.emotionalAnalyzer.analyzeEmotions(messages);
          logger.debug(`[Emotional] Complete in ${Date.now() - start}ms`);
          onProgress?.('emotional', 40, 'Emotional analysis complete');
          return result;
        })()
      );
      analyzerNames.push('emotional');
    }
    
    if (analyzerConfig.runTriggers) {
      analyzersToRun.push(
        (async () => {
          logger.debug('[Triggers] Starting analysis...');
          onProgress?.('triggers', 50, 'Analyzing emotional triggers...');
          const start = Date.now();
          const result = await this.triggersAnalyzer.analyzeTriggers(messages);
          logger.debug(`[Triggers] Complete in ${Date.now() - start}ms`);
          onProgress?.('triggers', 65, 'Trigger analysis complete');
          return result;
        })()
      );
      analyzerNames.push('triggers');
    }
    
    if (analyzerConfig.runPersonality) {
      analyzersToRun.push(
        (async () => {
          logger.debug('[Personality] Starting analysis...');
          onProgress?.('personality', 65, 'Analyzing personality traits...');
          const start = Date.now();
          const result = await this.personalityAnalyzer.analyzePersonality(messages);
          logger.debug(`[Personality] Complete in ${Date.now() - start}ms`);
          onProgress?.('personality', 80, 'Personality analysis complete');
          return result;
        })()
      );
      analyzerNames.push('personality');
    }
    
    if (analyzerConfig.runTimelineEvents) {
      analyzersToRun.push(
        (async () => {
          logger.debug('[Timeline] Starting analysis...');
          onProgress?.('timeline', 80, 'Extracting life events...');
          const start = Date.now();
          const result = await this.timelineEventsAnalyzer.analyze(messages);
          logger.debug(`[Timeline] Complete in ${Date.now() - start}ms`);
          onProgress?.('timeline', 85, 'Timeline events extracted');
          return result;
        })()
      );
      analyzerNames.push('timeline');
    }
    
    if (analyzerConfig.runBehavioralReflections) {
      analyzersToRun.push(
        (async () => {
          logger.debug('[Behavioral] Starting analysis...');
          onProgress?.('behavioral', 85, 'Analyzing behavioral patterns...');
          const start = Date.now();
          const result = await this.behavioralReflectionsAnalyzer.analyze(messages);
          logger.debug(`[Behavioral] Complete in ${Date.now() - start}ms`);
          onProgress?.('behavioral', 90, 'Behavioral patterns analyzed');
          return result;
        })()
      );
      analyzerNames.push('behavioral');
    }
    
    // Run selected analyzers in parallel
    logger.debug(`Running ${analyzersToRun.length} analyzers in parallel mode:`, analyzerNames);
    logger.debug(`Message count: ${messages.length}`);
    
    const results = await Promise.allSettled(analyzersToRun);
    
    // Process results
    const errors: string[] = [];
    
    // Extract results from Promise.allSettled based on what was run
    let emotional = null;
    let triggers = null;
    let personality = null;
    let timelineEvents = null;
    let behavioralReflections = null;
    
    let resultIndex = 0;
    
    if (analyzerConfig.runEmotional) {
      if (results[resultIndex].status === 'fulfilled') {
        emotional = (results[resultIndex] as PromiseFulfilledResult<any>).value;
      } else {
        logger.error('Emotional analysis failed:', (results[resultIndex] as PromiseRejectedResult).reason);
        errors.push('Emotional analysis failed');
      }
      resultIndex++;
    }
    
    if (analyzerConfig.runTriggers) {
      if (results[resultIndex].status === 'fulfilled') {
        triggers = (results[resultIndex] as PromiseFulfilledResult<any>).value;
      } else {
        logger.error('Triggers analysis failed:', (results[resultIndex] as PromiseRejectedResult).reason);
        errors.push('Triggers analysis failed');
      }
      resultIndex++;
    }
    
    if (analyzerConfig.runPersonality) {
      if (results[resultIndex].status === 'fulfilled') {
        personality = (results[resultIndex] as PromiseFulfilledResult<any>).value;
      } else {
        logger.error('Personality analysis failed:', (results[resultIndex] as PromiseRejectedResult).reason);
        errors.push('Personality analysis failed');
      }
      resultIndex++;
    }
    
    if (analyzerConfig.runTimelineEvents) {
      if (results[resultIndex].status === 'fulfilled') {
        timelineEvents = (results[resultIndex] as PromiseFulfilledResult<any>).value;
      } else {
        logger.error('Timeline analysis failed:', (results[resultIndex] as PromiseRejectedResult).reason);
        errors.push('Timeline analysis failed');
      }
      resultIndex++;
    }
    
    if (analyzerConfig.runBehavioralReflections) {
      if (results[resultIndex].status === 'fulfilled') {
        behavioralReflections = (results[resultIndex] as PromiseFulfilledResult<any>).value;
      } else {
        logger.error('Behavioral analysis failed:', (results[resultIndex] as PromiseRejectedResult).reason);
        errors.push('Behavioral analysis failed');
      }
      resultIndex++;
    }

    // Simple completion status
    const completionStatus = {
      total: analyzersToRun.length, // Total number of analyzers that were run
      completed: analyzersToRun.length - errors.length,
      failed: errors.length,
      gaps: []
    };

    const processingTime = Date.now() - startTime;
    
    // Show API call summary
    apiCounter.getSummary();
    
    // Show rate limit status
    const rateLimitState = rateLimitManager.getState();
    if (rateLimitState.rateLimitedRequests > 0) {
      logger.warn(`Rate limit encountered ${rateLimitState.rateLimitedRequests} times during analysis`);
    }

    // Save final results to IndexedDB
    const finalResults: ComprehensiveAnalysisResult = {
      sessionId,
      timestamp: Date.now(),
      userName,
      totalMessages,
      userMessages: messages.length,
      emotional: emotional || { error: 'Analysis failed', weeklyAnalyses: [] },
      triggers: triggers || { error: 'Analysis failed', triggers: [] },
      personality: personality || { error: 'Analysis failed', bigFive: {} },
      relationships: relationships || { error: 'Analysis failed', relationships: [] },
      timelineEvents: timelineEvents || { error: 'Analysis failed', lifeEvents: [] },
      behavioralReflections: behavioralReflections || { error: 'Analysis failed', habitImpacts: [] },
      processingTime,
      completionStatus
    };

    // Save to storage
    await this.storage.saveAnalysisResult({
      id: sessionId,
      timestamp: Date.now(),
      userEmail: '', // Will be filled by the caller
      emotional: finalResults.emotional,
      personality: finalResults.personality,
      triggers: finalResults.triggers,
      relationships: finalResults.relationships,
      timelineEvents: finalResults.timelineEvents,
      behavioralReflections: finalResults.behavioralReflections,
      sessionId: finalResults.sessionId,
      metadata: {
        totalMessages,
        userName,
        processingTime,
        version: '2.0',
        completionStatus
      }
    });

    // Performance metrics at completion
    const memoryAfter = (performance as any).memory?.usedJSHeapSize;
    const memoryUsed = memoryAfter && performanceMetrics.memoryBefore 
      ? memoryAfter - performanceMetrics.memoryBefore 
      : undefined;
    
    // Always show completion summary - important for monitoring
    console.log('🎊 Analysis complete!', {
      sessionId,
      processingTimeMs: processingTime,
      completionRate: `${completionStatus.completed}/${completionStatus.total}`,
      errors: errors.length,
      parallelismMode: analysisConfig.parallelismMode,
      concurrency: analysisConfig.apiCallConcurrency,
      memoryUsedMB: memoryUsed ? (memoryUsed / 1024 / 1024).toFixed(2) : 'N/A',
      apiCallsCount: apiCounter.getCount()
    });

    // Update progress message based on completion
    const completionMessage = completionStatus.failed === 0 
      ? 'Analysis complete!' 
      : `Analysis completed with ${completionStatus.failed} gaps. You can retry failed segments later.`;
    
    onProgress?.('completed', 100, completionMessage);

    return finalResults;
  }


}