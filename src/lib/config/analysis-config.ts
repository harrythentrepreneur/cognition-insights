/**
 * Configuration for analysis features
 * This allows gradual rollout of enhanced features without breaking existing functionality
 */

export interface AnalysisConfig {
  // Feature flags
  useEnhancedAnalyzer: boolean;
  enableParallelProcessing: boolean;
  enableRetryMechanism: boolean;
  enableProgressiveSaving: boolean;
  
  // Performance settings
  maxConcurrentRequests: number;
  requestsPerSecond: number;
  retryAttempts: number;
  retryDelayMs: number;
  
  // Parallelism strategy
  parallelismMode: 'conservative' | 'balanced' | 'aggressive' | 'maximum';
  apiCallConcurrency: number; // How many API calls can run simultaneously
  
  // Storage settings
  enableSegmentTracking: boolean;
  sessionTTLDays: number;
  
  // API tier settings (adjust based on your Gemini tier)
  apiTier: 'free' | 'tier1' | 'tier2';
}

// Default configuration - ALWAYS use enhanced analyzer
export const defaultAnalysisConfig: AnalysisConfig = {
  // Always enable enhanced features
  useEnhancedAnalyzer: true,
  enableParallelProcessing: true,
  enableRetryMechanism: true,
  enableProgressiveSaving: true,
  
  // Optimized for performance
  maxConcurrentRequests: 25, // HTTP/2 optimal
  requestsPerSecond: 15, // Gemini free tier
  retryAttempts: 3,
  retryDelayMs: 1000,
  
  // Parallelism strategy - start conservative, can scale up
  parallelismMode: 'balanced',
  apiCallConcurrency: 10, // Start with 10 concurrent API calls
  
  // Enhanced storage
  enableSegmentTracking: true,
  sessionTTLDays: 7,
  
  // API tier
  apiTier: 'free'
};

// Enhanced configuration for new features
export const enhancedAnalysisConfig: AnalysisConfig = {
  // Enable all enhanced features
  useEnhancedAnalyzer: true,
  enableParallelProcessing: true,
  enableRetryMechanism: true,
  enableProgressiveSaving: true,
  
  // Optimized for performance
  maxConcurrentRequests: 25, // HTTP/2 optimal
  requestsPerSecond: 15, // Adjust based on tier
  retryAttempts: 3,
  retryDelayMs: 1000,
  
  // Parallelism strategy - aggressive for max speed
  parallelismMode: 'aggressive',
  apiCallConcurrency: 20, // Higher concurrency for enhanced mode
  
  // Enhanced storage
  enableSegmentTracking: true,
  sessionTTLDays: 7,
  
  // API tier
  apiTier: 'free'
};

// Configuration for different API tiers
export const tierConfigs = {
  free: {
    maxConcurrentRequests: 15,
    requestsPerSecond: 15, // Gemini 2.0 Flash free tier
  },
  tier1: {
    maxConcurrentRequests: 150,
    requestsPerSecond: 2000, // Gemini 2.0 Flash Tier 1
  },
  tier2: {
    maxConcurrentRequests: 300,
    requestsPerSecond: 4000, // Higher tiers
  }
};

// Parallelism presets for different strategies
export const parallelismPresets = {
  conservative: {
    apiCallConcurrency: 3, // Like current implementation
    description: 'Safe mode - 3 concurrent API calls'
  },
  balanced: {
    apiCallConcurrency: 10, // Moderate parallelism
    description: 'Balanced - 10 concurrent API calls'
  },
  aggressive: {
    apiCallConcurrency: 20, // High parallelism
    description: 'Fast mode - 20 concurrent API calls'
  },
  maximum: {
    apiCallConcurrency: 50, // Maximum parallelism (use with caution)
    description: 'Maximum speed - All API calls at once'
  }
};

// Get configuration from environment or localStorage
export function getAnalysisConfig(): AnalysisConfig {
  // Check environment variable first
  if (typeof window !== 'undefined') {
    // Check localStorage for user preference
    const stored = localStorage.getItem('analysisConfig');
    if (stored) {
      try {
        return { ...defaultAnalysisConfig, ...JSON.parse(stored) };
      } catch (e) {
        console.warn('Invalid analysis config in localStorage', e);
      }
    }
    
    // Check for feature flag in URL params (for testing)
    const params = new URLSearchParams(window.location.search);
    if (params.get('enhancedAnalysis') === 'true') {
      return enhancedAnalysisConfig;
    }
  }
  
  // Check Next.js environment variable
  if (process.env.NEXT_PUBLIC_USE_ENHANCED_ANALYZER === 'true') {
    return enhancedAnalysisConfig;
  }
  
  // Default to existing behavior
  return defaultAnalysisConfig;
}

// Save configuration preference
export function saveAnalysisConfig(config: Partial<AnalysisConfig>): void {
  if (typeof window !== 'undefined') {
    const current = getAnalysisConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('analysisConfig', JSON.stringify(updated));
  }
}

// Helper to get tier-specific settings
export function getTierSettings(config: AnalysisConfig): {
  maxConcurrentRequests: number;
  requestsPerSecond: number;
} {
  const tierConfig = tierConfigs[config.apiTier];
  return {
    maxConcurrentRequests: Math.min(config.maxConcurrentRequests, tierConfig.maxConcurrentRequests),
    requestsPerSecond: Math.min(config.requestsPerSecond, tierConfig.requestsPerSecond)
  };
}