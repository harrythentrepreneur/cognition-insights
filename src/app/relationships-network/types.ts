// Relationships Network Types
// Define TypeScript interfaces and types for the relationships network page

export interface RelationshipNetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metrics: RelationshipMetric[];
  insights: RelationshipInsight[];
}

export interface NetworkNode {
  id: string;
  name: string;
  type: 'user' | 'contact' | 'group';
  weight: number;
  centrality: number;
  connections: string[];
  metadata: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  type: 'direct' | 'group' | 'mention';
  strength: number;
  frequency: number;
}

export interface RelationshipMetric {
  id: string;
  name: string;
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
  category: 'communication' | 'engagement' | 'sentiment';
}

export interface RelationshipInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
}

export interface CommunicationFlow {
  fromId: string;
  toId: string;
  messageCount: number;
  avgResponseTime: number;
  emotionalTone: number;
  timePattern: 'morning' | 'afternoon' | 'evening' | 'night';
}

export type NetworkViewMode = 'overview' | 'detailed' | 'timeline' | 'insights' | 'cards' | 'scorecards' | 'ghosting' | 'radar';
export type RelationshipType = 'family' | 'friend' | 'colleague' | 'acquaintance' | 'unknown';

// Enhanced types for relationship cards and scorecards
export interface RelationshipScorecard {
  id: string;
  personId: string;
  balance: number; // 0-100
  reciprocity: number; // 0-100
  frequency: number; // 0-100
  trajectory: 'positive' | 'negative' | 'stable';
  healthScore: number; // Overall relationship health 0-100
  lastUpdated: Date;
}

export interface RelationshipCard {
  id: string;
  name: string;
  color: string;
  avatar?: string; // AI-generated portrait URL
  personality: string; // AI-generated personality description
  role: string; // Relationship role (e.g., "The Supporter", "The Advisor")
  scorecard: RelationshipScorecard;
  recentActivity: {
    lastContact: Date;
    messageCount: number;
    averageResponseTime: number;
  };
  emotionalProfile: {
    primaryEmotion: string;
    emotionalIntensity: number;
    supportType: string; // "emotional", "practical", "social", etc.
  };
}

export interface GhostingEvent {
  id: string;
  personId: string;
  startDate: Date;
  detectionDate: Date;
  severityLevel: 'mild' | 'moderate' | 'severe';
  communicationDrop: number; // Percentage drop in communication
  recoveryDate?: Date; // If relationship recovered
  currentStatus: 'ongoing' | 'recovered' | 'permanent';
}

export interface RelationshipTrajectory {
  id: string;
  personId: string;
  startPoint: {
    date: Date;
    sentiment: number;
    strength: number;
  };
  endPoint: {
    date: Date;
    sentiment: number;
    strength: number;
  };
  trajectory: 'positive' | 'negative' | 'stable';
  keyEvents: Array<{
    date: Date;
    type: 'milestone' | 'conflict' | 'reconnection' | 'distance';
    description: string;
    impact: number;
  }>;
} 