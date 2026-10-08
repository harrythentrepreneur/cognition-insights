export interface CircumplexDataItem {
  id: string;
  name: string;
  color: string;
  basePosition: { x: number; y: number };
  angle: number;
  intensity: number;
  influence: number;
  valueLabel?: string;
  percentLabel?: string;
} 