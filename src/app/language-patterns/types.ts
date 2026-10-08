// Language Patterns Types
// Define TypeScript interfaces and types for the language patterns page

export interface LanguagePatternData {
  vocabularyMetrics: VocabularyMetric[];
  communicationStyles: CommunicationStyleData[];
  linguisticPatterns: LinguisticPattern[];
  complexityTrends: ComplexityTrend[];
  insights: LanguageInsight[];
}

export interface VocabularyMetric {
  id: string;
  period: string;
  uniqueWords: number;
  totalWords: number;
  averageWordLength: number;
  complexityScore: number;
  formalityLevel: number;
  diversityIndex: number;
}

export interface CommunicationStyleData {
  id: string;
  style: CommunicationStyle;
  frequency: number;
  contexts: string[];
  examples: string[];
  emotionalTone: number;
  effectiveness: number;
}

export interface LinguisticPattern {
  id: string;
  pattern: string;
  category: LinguisticCategory;
  frequency: number;
  trend: TrendDirection;
  significance: number;
  examples: string[];
  timeframe: string;
}

export interface ComplexityTrend {
  id: string;
  metric: string;
  values: Array<{
    period: string;
    value: number;
  }>;
  trend: TrendDirection;
  change: number;
}

export interface LanguageInsight {
  id: string;
  type: 'evolution' | 'pattern' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  category: string;
}

export type CommunicationStyle = 'formal' | 'casual' | 'technical' | 'emotional' | 'analytical' | 'creative';
export type LinguisticCategory = 'grammar' | 'vocabulary' | 'sentiment' | 'structure' | 'pragmatics';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
export type LanguageComplexity = 'simple' | 'moderate' | 'complex' | 'sophisticated'; 