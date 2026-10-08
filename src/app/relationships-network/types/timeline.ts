type TimelineDataPoint = 
  | { timestamp: Date; intensity: number }
  | { date: Date; intensity: number; level?: number }
  | { timestamp?: Date; date?: Date; intensity: number; level?: number };

export interface TimelineDataItem {
  id: string;
  name: string;
  color: string;
  description?: string;
  intensity?: number;
  data: TimelineDataPoint[];
}