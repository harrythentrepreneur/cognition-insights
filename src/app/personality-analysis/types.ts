// Personality Analysis Types
// Define TypeScript interfaces and types for the personality analysis page

export interface PersonalityAnalysisData {
  traits: PersonalityTrait[];
  behavioralPatterns: BehavioralPattern[];
  psychologicalProfile: PsychologicalProfile;
  insights: PersonalityInsight[];
  assessments: PersonalityAssessment[];
}

export interface PersonalityTrait {
  id: string;
  name: string;
  score: number;
  percentile: number;
  description: string;
  category: PersonalityCategory;
  facets: TraitFacet[];
  confidence: number;
}

export interface TraitFacet {
  id: string;
  name: string;
  score: number;
  description: string;
}

export interface BehavioralPattern {
  id: string;
  pattern: string;
  frequency: number;
  contexts: string[];
  intensity: number;
  trend: TrendDirection;
  triggers: string[];
  outcomes: string[];
}

export interface PsychologicalProfile {
  id: string;
  dominantTraits: string[];
  cognitiveStyle: CognitiveStyle;
  emotionalStyle: EmotionalStyle;
  socialStyle: SocialStyle;
  decisionMakingStyle: DecisionMakingStyle;
  stressResponse: StressResponse;
  adaptability: number;
}

export interface PersonalityInsight {
  id: string;
  type: 'strength' | 'challenge' | 'pattern' | 'recommendation' | 'growth-area';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  implications: string[];
  actionable: boolean;
}

export interface PersonalityAssessment {
  id: string;
  framework: 'big5' | 'mbti' | 'enneagram' | 'disc' | 'custom';
  results: AssessmentResult[];
  reliability: number;
  timestamp: string;
}

export interface AssessmentResult {
  dimension: string;
  score: number;
  interpretation: string;
}

export type PersonalityCategory = 'big5' | 'emotional' | 'cognitive' | 'social' | 'motivational';
export type CognitiveStyle = 'analytical' | 'intuitive' | 'systematic' | 'creative';
export type EmotionalStyle = 'stable' | 'reactive' | 'expressive' | 'controlled';
export type SocialStyle = 'extraverted' | 'introverted' | 'ambiverted';
export type DecisionMakingStyle = 'rational' | 'intuitive' | 'collaborative' | 'spontaneous';
export type StressResponse = 'adaptive' | 'resilient' | 'sensitive' | 'avoidant';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'fluctuating'; 