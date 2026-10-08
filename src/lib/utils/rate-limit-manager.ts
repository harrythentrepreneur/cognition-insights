/**
 * Rate Limit Manager for coordinating API calls across analyzers
 * Provides intelligent rate limit detection and recovery
 */

export interface RateLimitState {
  isRateLimited: boolean;
  lastRateLimitTime: number;
  backoffMs: number;
  consecutiveSuccesses: number;
  totalRequests: number;
  rateLimitedRequests: number;
}

class RateLimitManager {
  private state: RateLimitState = {
    isRateLimited: false,
    lastRateLimitTime: 0,
    backoffMs: 0,
    consecutiveSuccesses: 0,
    totalRequests: 0,
    rateLimitedRequests: 0
  };

  private listeners: Set<(state: RateLimitState) => void> = new Set();

  /**
   * Subscribe to rate limit state changes
   */
  subscribe(listener: (state: RateLimitState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Record a successful API call
   */
  recordSuccess() {
    this.state.totalRequests++;
    this.state.consecutiveSuccesses++;
    
    // Gradually reduce backoff after consecutive successes
    if (this.state.consecutiveSuccesses > 5 && this.state.backoffMs > 0) {
      this.state.backoffMs = Math.max(0, this.state.backoffMs - 1000);
      console.log(`📉 Reducing backoff to ${this.state.backoffMs}ms after ${this.state.consecutiveSuccesses} successes`);
    }

    // Clear rate limit flag after enough successes
    if (this.state.consecutiveSuccesses > 10 && this.state.isRateLimited) {
      this.state.isRateLimited = false;
      console.log('✅ Rate limit cleared after sustained success');
    }

    this.notifyListeners();
  }

  /**
   * Record a rate limit error
   */
  recordRateLimit() {
    this.state.totalRequests++;
    this.state.rateLimitedRequests++;
    this.state.isRateLimited = true;
    this.state.lastRateLimitTime = Date.now();
    this.state.consecutiveSuccesses = 0;
    
    // Exponential backoff with max limit
    this.state.backoffMs = Math.min(this.state.backoffMs * 2 || 2000, 60000);
    
    console.warn(`🚫 Rate limit detected! Backoff: ${this.state.backoffMs}ms`);
    console.warn(`📊 Rate limit stats: ${this.state.rateLimitedRequests}/${this.state.totalRequests} requests limited`);
    
    this.notifyListeners();
  }

  /**
   * Get recommended delay before next request
   */
  getRecommendedDelay(): number {
    if (!this.state.isRateLimited) {
      return 0;
    }

    const timeSinceRateLimit = Date.now() - this.state.lastRateLimitTime;
    
    // If we were rate limited recently, use the backoff
    if (timeSinceRateLimit < this.state.backoffMs) {
      return this.state.backoffMs - timeSinceRateLimit;
    }

    return 0;
  }

  /**
   * Check if we should proceed with a request
   */
  shouldProceed(): boolean {
    return this.getRecommendedDelay() === 0;
  }

  /**
   * Wait for rate limit to clear if needed
   */
  async waitIfNeeded(): Promise<void> {
    const delay = this.getRecommendedDelay();
    if (delay > 0) {
      console.log(`⏳ Waiting ${delay}ms for rate limit to clear...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Get current state
   */
  getState(): RateLimitState {
    return { ...this.state };
  }

  /**
   * Reset the manager state
   */
  reset() {
    this.state = {
      isRateLimited: false,
      lastRateLimitTime: 0,
      backoffMs: 0,
      consecutiveSuccesses: 0,
      totalRequests: 0,
      rateLimitedRequests: 0
    };
    this.notifyListeners();
  }
}

// Global singleton instance
export const rateLimitManager = new RateLimitManager();