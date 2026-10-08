import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { GeminiClient } from '../gemini/gemini-client';

/**
 * Base analyzer interface that all analyzers must implement
 * for compatibility with the resilient analysis system
 */
export abstract class BaseAnalyzer {
  protected geminiClient: GeminiClient;
  abstract analyzerType: string;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * Analyze a segment of messages
   * This method must be implemented by all analyzers
   */
  abstract analyzeSegment(messages: WhatsAppMessage[]): Promise<any>;

  /**
   * Optional method to merge results from multiple segments
   * Override this if your analyzer needs custom merging logic
   */
  mergeResults(results: any[]): any {
    return results;
  }

  /**
   * Optional method to validate results
   * Override this to add custom validation
   */
  validateResult(result: any): boolean {
    return result !== null && result !== undefined;
  }
}