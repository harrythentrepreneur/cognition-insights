import { TransitionConfig } from '../types';

// Animation Configurations
export const ANIMATION_CONFIGS: Record<string, TransitionConfig> = {
  INTRO_SEQUENCE: {
    duration: 2400,
    easing: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
    properties: ['opacity', 'transform', 'filter']
  },
  
  TRANSITION_OUT: {
    duration: 2200,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    properties: ['opacity', 'transform', 'filter']
  },
  
  CANVAS_ENTER: {
    duration: 1500,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    delay: 500,
    properties: ['opacity', 'transform', 'filter']
  },
  
  STAGE_TRANSITION: {
    duration: 800,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    properties: ['opacity', 'transform']
  }
};

// Animation Timing Sequences
export const INTRO_ANIMATION_DELAYS = {
  INITIAL_LOAD: 300,
  IMAGE_LOAD: 600,
  HEADING_LOAD: 1200,
  SUBTITLE_LOAD: 1800,
  BUTTON_LOAD: 2400
} as const;

// Journey Stage Definitions
export const JOURNEY_STAGES = {
  INTRO: {
    id: 'intro',
    name: 'Welcome',
    description: 'Setting intentions for your journey',
    estimatedDuration: 5,
    order: 0
  },
  
  REFLECTION_SETUP: {
    id: 'reflection-setup',
    name: 'Reflection Setup',
    description: 'Preparing your reflective space',
    estimatedDuration: 10,
    order: 1
  },
  
  DEEP_REFLECTION: {
    id: 'deep-reflection',
    name: 'Deep Reflection',
    description: 'Exploring your inner landscape',
    estimatedDuration: 20,
    order: 2
  },
  
  INSIGHTS_SYNTHESIS: {
    id: 'insights-synthesis',
    name: 'Insights & Synthesis',
    description: 'Understanding your patterns',
    estimatedDuration: 15,
    order: 3
  },
  
  GROWTH_PLANNING: {
    id: 'growth-planning',
    name: 'Growth Planning',
    description: 'Creating your path forward',
    estimatedDuration: 10,
    order: 4
  },
  
  INTEGRATION: {
    id: 'integration',
    name: 'Integration',
    description: 'Bringing it all together',
    estimatedDuration: 5,
    order: 5
  }
} as const;

// Content Categories
export const CONTENT_CATEGORIES = {
  EMOTIONAL: 'emotional',
  COGNITIVE: 'cognitive',
  BEHAVIORAL: 'behavioral',
  RELATIONAL: 'relational',
  SPIRITUAL: 'spiritual',
  CREATIVE: 'creative'
} as const;

// Emotional Tones
export const EMOTIONAL_TONES = {
  GENTLE: 'gentle',
  EMPOWERING: 'empowering',
  REFLECTIVE: 'reflective',
  INSPIRING: 'inspiring',
  CHALLENGING: 'challenging',
  SUPPORTIVE: 'supportive'
} as const;

// User Preferences Defaults
export const DEFAULT_USER_PREFERENCES = {
  animationSpeed: 'normal' as const,
  soundEnabled: true,
  darkMode: true,
  language: 'en',
  accessibilityMode: false
};

// API Configuration
export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  // Journey endpoints
  START_JOURNEY: '/api/journey/start',
  SAVE_PROGRESS: '/api/journey/progress',
  GET_STAGE: '/api/journey/stage',
  COMPLETE_STAGE: '/api/journey/stage/complete',
  
  // User endpoints
  GET_PROFILE: '/api/user/profile',
  UPDATE_PREFERENCES: '/api/user/preferences',
  
  // Content endpoints
  GET_CONTENT: '/api/content',
  GET_INSIGHTS: '/api/insights',
  SAVE_REFLECTION: '/api/reflections'
} as const;

// UI Constants
export const UI_CONSTANTS = {
  // Breakpoints
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1440
  },
  
  // Z-Index Layers
  Z_INDEX: {
    BACKGROUND: 1,
    CONTENT: 10,
    NAVIGATION: 100,
    OVERLAY: 1000,
    MODAL: 10000
  },
  
  // Colors (referencing design system)
  COLORS: {
    PRIMARY: '#00E5D3',
    BACKGROUND: '#000000',
    TEXT_PRIMARY: '#ffffff',
    TEXT_SECONDARY: 'rgba(255, 255, 255, 0.8)',
    ACCENT: '#00E5D3'
  },
  
  // Spacing
  SPACING: {
    LOGO_MARGIN: '54px',
    CONTAINER_PADDING: '54px',
    SECTION_GAP: '2rem'
  }
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  SESSION_EXPIRED: 'Your session has expired. Please refresh to continue.',
  SAVE_FAILED: 'Failed to save your progress. Your data is safely stored locally.',
  LOAD_FAILED: 'Failed to load content. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PROGRESS_SAVED: 'Your progress has been saved.',
  STAGE_COMPLETED: 'Stage completed! Moving to the next step.',
  JOURNEY_COMPLETED: 'Congratulations! You\'ve completed your growth journey.',
  PREFERENCES_UPDATED: 'Your preferences have been updated.'
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'growth_journey_preferences',
  SESSION_DATA: 'growth_journey_session',
  PROGRESS: 'growth_journey_progress',
  LAST_STAGE: 'growth_journey_last_stage'
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_SOUND: true,
  ENABLE_ANALYTICS: true,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ACCESSIBILITY_FEATURES: true,
  ENABLE_EXPERIMENTAL_ANIMATIONS: false
} as const; 