// Core Growth Journey Types

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  preferences?: UserPreferences;
  journeyProgress?: JourneyProgress;
}

export interface UserPreferences {
  animationSpeed: 'slow' | 'normal' | 'fast';
  soundEnabled: boolean;
  darkMode: boolean;
  language: string;
  accessibilityMode: boolean;
}

export interface JourneyProgress {
  currentStage: JourneyStage;
  completedStages: string[];
  startedAt: Date;
  lastActiveAt: Date;
  totalTimeSpent: number; // in minutes
  milestones: Milestone[];
}

export interface JourneyStage {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number; // in minutes
  isCompleted: boolean;
  isLocked: boolean;
  order: number;
  data?: Record<string, any>;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt: Date;
  category: 'reflection' | 'insight' | 'growth' | 'completion';
  metadata?: Record<string, any>;
}

// Animation and UI States
export interface AnimationState {
  isLoaded: boolean;
  imageLoaded: boolean;
  headingLoaded: boolean;
  subtitleLoaded: boolean;
  buttonLoaded: boolean;
  isTransitioning: boolean;
  showJourneyCanvas: boolean;
}

export interface TransitionConfig {
  duration: number;
  easing: string;
  delay?: number;
  properties: string[];
}

// Content Types
export interface JourneyContent {
  id: string;
  type: 'text' | 'image' | 'video' | 'interactive' | 'reflection';
  title?: string;
  content: string | ContentBlock[];
  metadata?: ContentMetadata;
}

export interface ContentBlock {
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'media';
  content: string;
  styles?: Record<string, any>;
}

export interface ContentMetadata {
  author?: string;
  source?: string;
  tags?: string[];
  emotionalTone?: 'gentle' | 'empowering' | 'reflective' | 'inspiring';
  difficulty?: 'easy' | 'moderate' | 'challenging';
}

// Journey Navigation
export interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  currentPath: string[];
  breadcrumbs: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean;
}

// Data Management
export interface JourneySession {
  id: string;
  userId: string;
  startedAt: Date;
  currentStageId: string;
  data: SessionData;
  isActive: boolean;
}

export interface SessionData {
  responses: Record<string, any>;
  insights: Insight[];
  reflections: Reflection[];
  preferences: UserPreferences;
}

export interface Insight {
  id: string;
  content: string;
  category: string;
  confidence: number;
  generatedAt: Date;
  isValidated?: boolean;
}

export interface Reflection {
  id: string;
  prompt: string;
  response: string;
  createdAt: Date;
  stageId: string;
  emotionalState?: string;
}

// API Response Types
export interface JourneyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress?: number;
}

// Component Props
export interface JourneyCanvasProps {
  sessionId?: string;
  onStageComplete?: (stageId: string) => void;
  onJourneyComplete?: () => void;
  animationConfig?: TransitionConfig;
}

export interface IntroContentProps {
  userName?: string;
  sessionId?: string;
  onBeginJourney: () => void;
  animationState: AnimationState;
  isTransitioning: boolean;
}

// Event Types
export type JourneyEvent = 
  | { type: 'STAGE_STARTED'; payload: { stageId: string } }
  | { type: 'STAGE_COMPLETED'; payload: { stageId: string; data: any } }
  | { type: 'INSIGHT_GENERATED'; payload: Insight }
  | { type: 'REFLECTION_SAVED'; payload: Reflection }
  | { type: 'PROGRESS_UPDATED'; payload: { progress: number } }
  | { type: 'ERROR_OCCURRED'; payload: { error: string } };

export type JourneyEventHandler = (event: JourneyEvent) => void; 