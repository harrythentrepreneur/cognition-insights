// Shared types and interfaces for onboarding components

export type OnboardingStep = 'welcome' | 'journey' | 'connectIntegrations' | 'uploadFiles' | 'processing' | 'results' | 'storyReady';

export type ProcessingStage = 'loading' | 'stats' | 'analyzing' | 'insights';

export interface BaseStepProps {
  sessionId?: string;
}

export interface StepNavigationProps {
  onContinue?: () => void;
  onBack?: () => void;
  onStartOver?: () => void;
}

export interface WelcomeStepProps extends BaseStepProps, Pick<StepNavigationProps, 'onContinue'> {}

export interface JourneyStepProps extends BaseStepProps, Pick<StepNavigationProps, 'onContinue'> {}

export interface AuthStepProps extends BaseStepProps, Pick<StepNavigationProps, 'onContinue'> {
  paymentVerified?: boolean;
  stripeSessionId?: string;
  email?: string;
}

export interface UploadStepProps extends BaseStepProps {
  onProcessingComplete: (sessionId: string) => void;
}

export interface ProcessingStepProps extends BaseStepProps {
  onComplete: () => void;
}

export interface ResultsStepProps extends BaseStepProps, Pick<StepNavigationProps, 'onStartOver'> {}

export interface StoryReadyStepProps extends BaseStepProps {
  onComplete: () => void;
}

// Data structures
export interface ProcessingStats {
  dateRange: string;
  messagesFound: number;
  conversationsDetected: number;
  filesProcessed?: number;
  processingComplete: boolean;
}

export interface AnimationState {
  isLoaded: boolean;
  logoLoaded: boolean;
  headerLoaded: boolean;
  cardsLoaded: boolean;
  buttonsLoaded: boolean;
}

export interface OnboardingFlowProps {
  initialStep?: OnboardingStep;
}

// File upload types
export interface FileUploadError {
  message: string;
  code?: string;
}

export interface UploadResult {
  success: boolean;
  sessionId?: string;
  error?: FileUploadError;
}

// Common callback types
export type AsyncHandler<T = void> = () => Promise<T>;
export type EventHandler<T = void> = () => T;
export type ErrorHandler = (error: Error) => void; 