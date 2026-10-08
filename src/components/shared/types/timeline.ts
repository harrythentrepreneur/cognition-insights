export interface Emotion {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  emotion: string;
  intensity: number;
  description?: string;
}

export interface EmotionPair {
  id: string;
  label: string;
  emotions: Emotion[];
}

export interface TimelineDataItem {
  id: string;
  name: string;
  color: string;
  /** Optional thumbnail URL shown as a circular image in the pill toggle */
  thumbnail?: string | null;
  data: Array<{
    timestamp: Date;
    intensity: number;
  }>;
} 