import { JourneySession, JourneyProgress, UserPreferences, JourneyStage } from '../types';
import { STORAGE_KEYS, DEFAULT_USER_PREFERENCES, JOURNEY_STAGES } from '../constants';

// Session Management Utilities
export const sessionUtils = {
  
  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return `gj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create a new journey session
   */
  createSession(userId: string): JourneySession {
    return {
      id: this.generateSessionId(),
      userId,
      startedAt: new Date(),
      currentStageId: JOURNEY_STAGES.INTRO.id,
      data: {
        responses: {},
        insights: [],
        reflections: [],
        preferences: DEFAULT_USER_PREFERENCES
      },
      isActive: true
    };
  },

  /**
   * Save session to localStorage with error handling
   */
  saveToLocalStorage(session: JourneySession): boolean {
    try {
      const key = `${STORAGE_KEYS.SESSION_DATA}_${session.id}`;
      localStorage.setItem(key, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
      return false;
    }
  },

  /**
   * Load session from localStorage
   */
  loadFromLocalStorage(sessionId: string): JourneySession | null {
    try {
      const key = `${STORAGE_KEYS.SESSION_DATA}_${sessionId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const session = JSON.parse(stored);
        // Ensure dates are properly parsed
        session.startedAt = new Date(session.startedAt);
        return session;
      }
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
    }
    return null;
  }
};

// Progress Management Utilities
export const progressUtils = {
  
  /**
   * Calculate overall journey progress percentage
   */
  calculateProgress(progress: JourneyProgress): number {
    const totalStages = Object.keys(JOURNEY_STAGES).length;
    const completedCount = progress.completedStages.length;
    return Math.round((completedCount / totalStages) * 100);
  },

  /**
   * Get next available stage
   */
  getNextStage(progress: JourneyProgress): JourneyStage | null {
    const allStages = Object.values(JOURNEY_STAGES);
    const sortedStages = allStages.sort((a, b) => a.order - b.order);
    
    for (const stage of sortedStages) {
      if (!progress.completedStages.includes(stage.id)) {
        return {
          ...stage,
          isCompleted: false,
          isLocked: false // Add logic for locking based on dependencies
        };
      }
    }
    
    return null; // All stages completed
  },

  /**
   * Check if stage is available (dependencies met)
   */
  isStageAvailable(stageId: string, progress: JourneyProgress): boolean {
    const stage = Object.values(JOURNEY_STAGES).find(s => s.id === stageId);
    if (!stage) return false;
    
    // For now, stages are sequential. Later can add dependency logic
    const allStages = Object.values(JOURNEY_STAGES).sort((a, b) => a.order - b.order);
    const stageIndex = allStages.findIndex(s => s.id === stageId);
    
    if (stageIndex === 0) return true; // First stage always available
    
    // Check if previous stage is completed
    const previousStage = allStages[stageIndex - 1];
    return progress.completedStages.includes(previousStage.id);
  }
};

// Animation Utilities
export const animationUtils = {
  
  /**
   * Create staggered animation delays
   */
  createStaggeredDelays(count: number, baseDelay: number = 100, increment: number = 100): number[] {
    return Array.from({ length: count }, (_, i) => baseDelay + (i * increment));
  },

  /**
   * Generate CSS cubic-bezier easing
   */
  getEasing(type: 'gentle' | 'smooth' | 'bounce' | 'sharp'): string {
    const easings = {
      gentle: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      sharp: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    };
    return easings[type];
  },

  /**
   * Create animation style object
   */
  createAnimationStyle(
    isActive: boolean,
    duration: number = 300,
    delay: number = 0,
    easing: string = 'cubic-bezier(0.4, 0, 0.2, 1)'
  ): React.CSSProperties {
    return {
      opacity: isActive ? 1 : 0,
      transform: isActive ? 'translateY(0px) scale(1)' : 'translateY(20px) scale(0.98)',
      transition: `all ${duration}ms ${easing} ${delay}ms`,
      willChange: 'opacity, transform'
    };
  }
};

// Data Validation Utilities
export const validationUtils = {
  
  /**
   * Validate session data structure
   */
  isValidSession(data: any): data is JourneySession {
    return (
      data &&
      typeof data.id === 'string' &&
      typeof data.userId === 'string' &&
      data.startedAt instanceof Date &&
      typeof data.currentStageId === 'string' &&
      data.data &&
      typeof data.isActive === 'boolean'
    );
  },

  /**
   * Validate user preferences
   */
  isValidPreferences(data: any): data is UserPreferences {
    return (
      data &&
      ['slow', 'normal', 'fast'].includes(data.animationSpeed) &&
      typeof data.soundEnabled === 'boolean' &&
      typeof data.darkMode === 'boolean' &&
      typeof data.language === 'string' &&
      typeof data.accessibilityMode === 'boolean'
    );
  },

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string, maxLength: number = 1000): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/[<>]/g, ''); // Remove angle brackets
  }
};

// Format Utilities
export const formatUtils = {
  
  /**
   * Format duration in minutes to human readable
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  },

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  /**
   * Format progress percentage
   */
  formatProgress(progress: number): string {
    return `${Math.round(progress)}%`;
  },

  /**
   * Truncate text with ellipsis
   */
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
};

// Error Handling Utilities
export const errorUtils = {
  
  /**
   * Create user-friendly error message
   */
  getUserFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      // Map technical errors to user-friendly messages
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Unable to connect. Please check your internet connection.';
      }
      if (error.message.includes('storage') || error.message.includes('quota')) {
        return 'Storage limit reached. Please clear some browser data.';
      }
      if (error.message.includes('permission')) {
        return 'Permission denied. Please refresh and try again.';
      }
    }
    return 'Something went wrong. Please try again.';
  },

  /**
   * Log error with context
   */
  logError(error: unknown, context: string): void {
    console.error(`[Growth Journey - ${context}]:`, error);
    
    // In production, you might want to send to error tracking service
    // if (process.env.NODE_ENV === 'production') {
    //   errorTrackingService.report(error, { context });
    // }
  }
};

// URL and Navigation Utilities
export const navigationUtils = {
  
  /**
   * Build URL with session parameters
   */
  buildUrlWithSession(basePath: string, sessionId?: string, additionalParams?: Record<string, string>): string {
    const url = new URL(basePath, window.location.origin);
    
    if (sessionId) {
      url.searchParams.set('session', sessionId);
    }
    
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  },

  /**
   * Extract session ID from URL
   */
  getSessionIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || params.get('sessionId');
  },

  /**
   * Build URL with current session ID preserved
   */
  buildUrlWithCurrentSession(basePath: string, additionalParams?: Record<string, string>): string {
    const currentSessionId = this.getSessionIdFromUrl();
    return this.buildUrlWithSession(basePath, currentSessionId || undefined, additionalParams);
  },

  /**
   * Navigate with session ID preserved
   */
  navigateWithSession(targetPath: string, additionalParams?: Record<string, string>): void {
    const url = this.buildUrlWithCurrentSession(targetPath, additionalParams);
    window.location.href = url;
  }
};

// Performance Utilities
export const performanceUtils = {
  
  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
}; 