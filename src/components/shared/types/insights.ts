export interface HabitImpact {
  id: string;
  habit: string;
  impact: number;
  category: string;
  description?: string;
  frequency?: number;
  confidence?: number;
  confidence_explanation?: string;
  temporal_patterns?: {
    dominant_days?: Array<[string, number]>;
    time_pattern?: string;
    total_instances?: number;
  };
  emotional_triggers?: {
    primary_triggers?: string[];
  };
} 