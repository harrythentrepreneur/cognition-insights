import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AnimationState, 
  JourneyProgress, 
  UserPreferences, 
  JourneySession,
  LoadingState,
  JourneyEvent,
  JourneyEventHandler
} from '../types';
import { 
  INTRO_ANIMATION_DELAYS, 
  DEFAULT_USER_PREFERENCES,
  STORAGE_KEYS,
  ANIMATION_CONFIGS
} from '../constants';

// Animation Management Hook
export function useJourneyAnimations() {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isLoaded: false,
    imageLoaded: false,
    headingLoaded: false,
    subtitleLoaded: false,
    buttonLoaded: false,
    isTransitioning: false,
    showJourneyCanvas: false
  });

  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear any existing timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    // Vertical cinematic animation sequence
    const timeouts = [
      setTimeout(() => setAnimationState(prev => ({ ...prev, isLoaded: true })), INTRO_ANIMATION_DELAYS.INITIAL_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, imageLoaded: true })), INTRO_ANIMATION_DELAYS.IMAGE_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, headingLoaded: true })), INTRO_ANIMATION_DELAYS.HEADING_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, subtitleLoaded: true })), INTRO_ANIMATION_DELAYS.SUBTITLE_LOAD),
      setTimeout(() => setAnimationState(prev => ({ ...prev, buttonLoaded: true })), INTRO_ANIMATION_DELAYS.BUTTON_LOAD)
    ];

    timeoutRefs.current = timeouts;

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const startTransition = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isTransitioning: true }));
    
    // Note: We no longer set showJourneyCanvas since we redirect to a separate page
    // The transition animation will play and then the page will redirect
  }, []);

  const resetAnimations = useCallback(() => {
    setAnimationState({
      isLoaded: false,
      imageLoaded: false,
      headingLoaded: false,
      subtitleLoaded: false,
      buttonLoaded: false,
      isTransitioning: false,
      showJourneyCanvas: false
    });
  }, []);

  return {
    animationState,
    startTransition,
    resetAnimations
  };
}

// User Preferences Management Hook
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load preferences from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (stored) {
        const parsedPreferences = JSON.parse(stored);
        setPreferences({ ...DEFAULT_USER_PREFERENCES, ...parsedPreferences });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, ...updates };
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(newPreferences));
      } catch (error) {
        console.warn('Failed to save user preferences:', error);
      }
      
      return newPreferences;
    });
  }, []);

  return {
    preferences,
    updatePreferences,
    isLoading
  };
}

// Journey Session Management Hook
export function useJourneySession(sessionId?: string) {
  const [session, setSession] = useState<JourneySession | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    error: null
  });

  const loadSession = useCallback(async (id: string) => {
    setLoadingState({ isLoading: true, error: null });
    
    try {
      // First try localStorage
      const stored = localStorage.getItem(`${STORAGE_KEYS.SESSION_DATA}_${id}`);
      if (stored) {
        const sessionData = JSON.parse(stored);
        setSession(sessionData);
        setLoadingState({ isLoading: false, error: null });
        return;
      }

      // If not in localStorage, fetch from API
      // TODO: Implement API call when backend is ready
      
      setLoadingState({ isLoading: false, error: null });
    } catch (error) {
      console.error('Failed to load session:', error);
      setLoadingState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load session'
      });
    }
  }, []);

  const saveSession = useCallback(async (sessionData: Partial<JourneySession>) => {
    if (!session) return;

    try {
      const updatedSession = { ...session, ...sessionData };
      setSession(updatedSession);
      
      // Save to localStorage
      localStorage.setItem(
        `${STORAGE_KEYS.SESSION_DATA}_${updatedSession.id}`, 
        JSON.stringify(updatedSession)
      );
      
      // TODO: Also save to API when backend is ready
      
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [session]);

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    } else {
      setLoadingState({ isLoading: false, error: null });
    }
  }, [sessionId, loadSession]);

  return {
    session,
    saveSession,
    loadSession,
    loadingState
  };
}

// Journey Progress Tracking Hook
export function useJourneyProgress() {
  const [progress, setProgress] = useState<JourneyProgress | null>(null);

  useEffect(() => {
    // Load progress from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (stored) {
        const progressData = JSON.parse(stored);
        setProgress({
          ...progressData,
          startedAt: new Date(progressData.startedAt),
          lastActiveAt: new Date(progressData.lastActiveAt)
        });
      }
    } catch (error) {
      console.warn('Failed to load journey progress:', error);
    }
  }, []);

  const updateProgress = useCallback((updates: Partial<JourneyProgress>) => {
    setProgress(prev => {
      if (!prev) return null;
      
      const newProgress = { 
        ...prev, 
        ...updates, 
        lastActiveAt: new Date() 
      };
      
      try {
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(newProgress));
      } catch (error) {
        console.warn('Failed to save journey progress:', error);
      }
      
      return newProgress;
    });
  }, []);

  const completeStage = useCallback((stageId: string) => {
    updateProgress({
      completedStages: progress ? [...progress.completedStages, stageId] : [stageId]
    });
  }, [progress, updateProgress]);

  return {
    progress,
    updateProgress,
    completeStage
  };
}

// Event System Hook
export function useJourneyEvents() {
  const eventHandlers = useRef<Map<string, JourneyEventHandler[]>>(new Map());

  const addEventListener = useCallback((eventType: string, handler: JourneyEventHandler) => {
    const handlers = eventHandlers.current.get(eventType) || [];
    handlers.push(handler);
    eventHandlers.current.set(eventType, handlers);

    // Return cleanup function
    return () => {
      const currentHandlers = eventHandlers.current.get(eventType) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        eventHandlers.current.set(eventType, currentHandlers);
      }
    };
  }, []);

  const removeEventListener = useCallback((eventType: string, handler: JourneyEventHandler) => {
    const handlers = eventHandlers.current.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      eventHandlers.current.set(eventType, handlers);
    }
  }, []);

  const emitEvent = useCallback((event: JourneyEvent) => {
    const handlers = eventHandlers.current.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in journey event handler:', error);
      }
    });
  }, []);

  return {
    addEventListener,
    removeEventListener,
    emitEvent
  };
}

// Media Query Hook for Responsive Design
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
}

// Local Storage Hook with Error Handling
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    } catch (error) {
      console.warn(`Failed to load from localStorage (${key}):`, error);
    }
  }, [key]);

  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const valueToStore = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
      
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Failed to save to localStorage (${key}):`, error);
      }
      
      return valueToStore;
    });
  }, [key]);

  return [value, setStoredValue] as const;
} 