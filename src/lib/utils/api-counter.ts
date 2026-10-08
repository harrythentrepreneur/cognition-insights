import { logger } from './logger';

/**
 * Global API call counter for debugging
 */
class APICounter {
  private count = 0;
  private startTime = Date.now();
  private calls: { time: number; prompt: string }[] = [];

  increment(promptPreview: string) {
    this.count++;
    this.calls.push({
      time: Date.now() - this.startTime,
      prompt: promptPreview.substring(0, 100)
    });
    // Always show API call counter - this is important for monitoring
    console.log(`📊 API Call #${this.count}`);
  }

  reset() {
    this.count = 0;
    this.startTime = Date.now();
    this.calls = [];
    logger.debug('API counter reset');
  }

  getCount() {
    return this.count;
  }

  getSummary() {
    const duration = Date.now() - this.startTime;
    // Always show the summary - this is important for performance monitoring
    console.log(`📊 API Call Summary:
- Total calls: ${this.count}
- Duration: ${duration}ms
- Average: ${this.count > 0 ? Math.round(duration / this.count) : 0}ms per call`);
    
    // Only show detailed call list in debug mode
    this.calls.forEach((call, i) => {
      logger.debug(`  ${i + 1}. [${call.time}ms] ${call.prompt}...`);
    });
  }
}

export const apiCounter = new APICounter();