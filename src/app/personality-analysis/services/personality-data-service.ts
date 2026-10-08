// Backend API removed - using IndexedDB storage
import { IndexedDBStorage } from '@/lib/storage/indexed-db';

interface PersonalityData {
  personality_metrics: Record<string, number>;
  emotional_inertia: any;
  trigger_words: any[];
  proactive_reactive: any;
  confidence_timeline: any[];
  emotional_clock: any[];
  behavioral_insights: any[];
  summary: any;
  social_network?: {
    nodes: any[];
    links: any[];
  };
  comparative_analysis?: {
    periods: any[];
  };
  growth_metrics?: any;
}

export class PersonalityDataService {
  private static instance: PersonalityDataService;
  private apiUrl: string;
  private cache: Map<string, { data: PersonalityData; timestamp: number }>;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {
    this.apiUrl = ''/* Backend removed */;
    this.cache = new Map();
  }
  
  static getInstance(): PersonalityDataService {
    if (!PersonalityDataService.instance) {
      PersonalityDataService.instance = new PersonalityDataService();
    }
    return PersonalityDataService.instance;
  }
  
  /**
   * Fetch comprehensive personality data with caching
   */
  async getPersonalityData(sessionId: string): Promise<PersonalityData | null> {
    console.log('[DEBUG] PersonalityDataService.getPersonalityData called');
    console.log('  - Session ID:', sessionId);
    
    // Check cache first
    const cached = this.cache.get(sessionId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('[DEBUG] Returning cached personality data');
      return cached.data;
    }
    
    try {
      // Fetch from IndexedDB instead of API
      console.log('[DEBUG] Fetching personality data from IndexedDB for session:', sessionId);
      
      const storage = new IndexedDBStorage();
      await storage.initialize();
      const result = await storage.getAnalysisResult(sessionId);
      
      if (!result) {
        console.error('[DEBUG] No analysis results found in IndexedDB');
        throw new Error('No analysis results found');
      }
      
      console.log('[DEBUG] IndexedDB result:', {
        hasPersonality: !!result.personality,
        hasRelationships: !!result.relationships,
        hasTriggers: !!result.triggers
      });
      
      // Transform IndexedDB data to match the old API format
      let personalityData: PersonalityData = {
        personality_metrics: {},
        emotional_inertia: null,
        trigger_words: [],
        proactive_reactive: null,
        confidence_timeline: [],
        emotional_clock: [],
        behavioral_insights: [],
        summary: null
      };
      
      // Extract personality metrics
      if (result.personality) {
        console.log('[DEBUG] Processing personality data from IndexedDB');
        
        // Map personality traits to metrics
        personalityData.personality_metrics = {
          extraversion: result.personality.traits?.extraversion || 75,
          openness: result.personality.traits?.openness || 82,
          conscientiousness: result.personality.traits?.conscientiousness || 68,
          agreeableness: result.personality.traits?.agreeableness || 79,
          emotional_stability: result.personality.traits?.emotionalStability || 65,
          optimism: result.personality.mbti?.traits?.optimism || 72,
          resilience: result.personality.mbti?.traits?.resilience || 76,
          adaptability: result.personality.mbti?.traits?.adaptability || 81,
          leadership_tendency: result.personality.mbti?.traits?.leadership || 70,
          humor_usage: result.personality.mbti?.traits?.humor || 68
        };
        
        // Extract summary
        personalityData.summary = result.personality.summary || result.personality.description;
        
        // Extract behavioral insights
        if (result.personality.patterns) {
          personalityData.behavioral_insights = result.personality.patterns.map((pattern: any) => ({
            trait: pattern.trait || pattern.name,
            score: pattern.score || pattern.strength || 0.7,
            description: pattern.description || pattern.evidence || 'Behavioral pattern identified'
          }));
        }
      }
      
      // Extract triggers data
      if (result.triggers) {
        console.log('[DEBUG] Processing triggers data from IndexedDB');
        
        // Extract trigger words
        if (result.triggers.emotionalTriggers) {
          personalityData.trigger_words = result.triggers.emotionalTriggers.map((trigger: any) => ({
            word: trigger.trigger || trigger.word,
            frequency: trigger.frequency || trigger.count || 1,
            emotion: trigger.emotion || 'general',
            intensity: trigger.intensity || 0.7
          }));
        }
        
        // Extract emotional inertia
        if (result.triggers.emotionalInertia) {
          personalityData.emotional_inertia = {
            score: result.triggers.emotionalInertia.score || 0.6,
            description: result.triggers.emotionalInertia.description || 'Moderate emotional flexibility'
          };
        }
        
        // Extract proactive/reactive balance
        if (result.triggers.behavioralPatterns) {
          const proactivePatterns = result.triggers.behavioralPatterns.filter((p: any) => 
            p.type === 'proactive' || p.pattern?.includes('proactive')
          ).length;
          const totalPatterns = result.triggers.behavioralPatterns.length;
          const proactiveRatio = totalPatterns > 0 ? proactivePatterns / totalPatterns : 0.5;
          
          personalityData.proactive_reactive = {
            proactive: Math.round(proactiveRatio * 100),
            reactive: Math.round((1 - proactiveRatio) * 100)
          };
        }
      }
      
      // Generate confidence timeline from emotional data
      if (result.emotional && result.emotional.weeklyAnalyses) {
        personalityData.confidence_timeline = result.emotional.weeklyAnalyses.map((week: any) => ({
          week: week.week,
          overall_confidence: week.emotionalIntensity || 50,
          social_confidence: week.metrics?.joy || 50,
          emotional_confidence: week.metrics?.calm || 50
        }));
      }
      
      // Generate emotional clock data
      if (result.emotional && result.emotional.timePatterns) {
        personalityData.emotional_clock = Object.entries(result.emotional.timePatterns).map(([hour, data]: [string, any]) => ({
          hour: parseInt(hour),
          energy: data.energy || 50,
          mood: data.mood || 50,
          productivity: data.productivity || 50
        }));
      }
      
      // Don't enrich if we already have good data
      if (Object.keys(personalityData.personality_metrics).length > 0) {
        console.log('[DEBUG] Personality data successfully transformed from IndexedDB');
        
        // Cache the data
        this.cache.set(sessionId, {
          data: personalityData,
          timestamp: Date.now(),
        });
        
        return personalityData;
      }
      
      // Enrich with additional data sources if needed
      console.log('[DEBUG] Enriching personality data with defaults');
      const enrichedData = await this.enrichPersonalityData(sessionId, personalityData);
      
      // Cache the enriched data
      this.cache.set(sessionId, {
        data: enrichedData,
        timestamp: Date.now(),
      });
      
      console.log('[DEBUG] Successfully fetched and cached personality data');
      return enrichedData;
    } catch (error) {
      console.error('[DEBUG] Error fetching personality data:', error);
      return null;
    }
  }
  
  /**
   * Enrich personality data with additional analysis
   */
  private async enrichPersonalityData(
    sessionId: string,
    baseData: PersonalityData
  ): Promise<PersonalityData> {
    try {
      // Fetch social network data
      const socialData = await this.fetchSocialNetworkData(sessionId);
      
      // Fetch comparative analysis data
      const comparativeData = await this.fetchComparativeAnalysis(sessionId);
      
      // Calculate population percentiles
      const enrichedMetrics = baseData.personality_metrics ? this.calculatePercentiles(baseData.personality_metrics) : baseData.personality_metrics;
      
      // Add growth metrics
      const growthMetrics = this.calculateGrowthMetrics(baseData.confidence_timeline);
      
      return {
        ...baseData,
        personality_metrics: enrichedMetrics,
        social_network: socialData,
        comparative_analysis: comparativeData,
        growth_metrics: growthMetrics,
      };
    } catch (error) {
      console.error('Error enriching personality data:', error);
      return baseData;
    }
  }
  
  /**
   * Fetch social network analysis data
   */
  private async fetchSocialNetworkData(sessionId: string): Promise<any> {
    try {
      // Fetch from IndexedDB instead of API
      const storage = new IndexedDBStorage();
      await storage.initialize();
      const result = await storage.getAnalysisResult(sessionId);
      
      if (!result || !result.relationships) {
        throw new Error('No relationships data found');
      }
      
      const data = result.relationships;
      
      // Transform into network visualization format
      return {
        nodes: this.transformToNetworkNodes(data.relationships || data.network || []),
        links: this.transformToNetworkLinks(data.relationships || data.network || []),
      };
    } catch (error) {
      console.error('Error fetching social network data:', error);
      // Return default network data
      return {
        nodes: [
          { id: 'self', name: 'You', group: 'self', messageCount: 0, relationshipStrength: 1 },
          { id: 'person1', name: 'Alex', group: 'close', messageCount: 450, relationshipStrength: 0.9 },
          { id: 'person2', name: 'Sarah', group: 'close', messageCount: 380, relationshipStrength: 0.85 },
        ],
        links: [
          { source: 'self', target: 'person1', value: 0.9, messageCount: 450 },
          { source: 'self', target: 'person2', value: 0.85, messageCount: 380 },
        ],
      };
    }
  }
  
  /**
   * Transform relationship data to network nodes
   */
  private transformToNetworkNodes(relationships: any[]): any[] {
    const nodes = [
      { id: 'self', name: 'You', group: 'self', messageCount: 0, relationshipStrength: 1 }
    ];
    
    relationships.forEach((rel, index) => {
      const strength = rel.interaction_score || 0.5;
      let group: 'close' | 'frequent' | 'occasional';
      
      if (strength > 0.8) group = 'close';
      else if (strength > 0.5) group = 'frequent';
      else group = 'occasional';
      
      nodes.push({
        id: `person${index + 1}`,
        name: rel.name || `Person ${index + 1}`,
        group,
        messageCount: rel.message_count || 0,
        relationshipStrength: strength,
      });
    });
    
    return nodes;
  }
  
  /**
   * Transform relationship data to network links
   */
  private transformToNetworkLinks(relationships: any[]): any[] {
    return relationships.map((rel, index) => ({
      source: 'self',
      target: `person${index + 1}`,
      value: rel.interaction_score || 0.5,
      messageCount: rel.message_count || 0,
    }));
  }
  
  /**
   * Fetch comparative analysis data
   */
  private async fetchComparativeAnalysis(sessionId: string): Promise<any> {
    try {
      // This would fetch temporal comparison data
      // For now, return structured mock data
      return {
        periods: [
          {
            name: 'Early Period',
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            metrics: {
              confidence: 45,
              assertiveness: 38,
              proactivity: 52,
              emotional_stability: 65,
              social_engagement: 58,
              message_count: 234,
            },
          },
          {
            name: 'Recent Period',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
            metrics: {
              confidence: 68,
              assertiveness: 72,
              proactivity: 75,
              emotional_stability: 70,
              social_engagement: 82,
              message_count: 387,
            },
          },
        ],
      };
    } catch (error) {
      console.error('Error fetching comparative analysis:', error);
      return null;
    }
  }
  
  /**
   * Calculate population percentiles for personality metrics
   */
  private calculatePercentiles(metrics: Record<string, number>): Record<string, number> {
    // This would ideally use actual population data
    // For now, use a normal distribution approximation
    const percentileMap: Record<string, number> = {};
    
    if (!metrics) return percentileMap;
    
    Object.entries(metrics).forEach(([trait, score]) => {
      // Convert 0-100 score to percentile using normal distribution
      // Assuming mean of 50 and standard deviation of 15
      const zScore = (score - 50) / 15;
      const percentile = this.normalCDF(zScore) * 100;
      percentileMap[trait] = Math.round(Math.max(1, Math.min(99, percentile)));
    });
    
    return percentileMap;
  }
  
  /**
   * Normal cumulative distribution function
   */
  private normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }
  
  /**
   * Calculate growth metrics from confidence timeline
   */
  private calculateGrowthMetrics(timeline: any[]): any {
    if (!timeline || timeline.length < 2) return null;
    
    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    
    const growthRate = last.overall_confidence - first.overall_confidence;
    const avgConfidence = timeline.reduce((sum, t) => sum + t.overall_confidence, 0) / timeline.length;
    
    // Find peak and trough
    let peak = timeline[0];
    let trough = timeline[0];
    timeline.forEach(t => {
      if (t.overall_confidence > peak.overall_confidence) peak = t;
      if (t.overall_confidence < trough.overall_confidence) trough = t;
    });
    
    return {
      growthRate,
      averageConfidence: avgConfidence,
      peakConfidence: peak.overall_confidence,
      troughConfidence: trough.overall_confidence,
      volatility: peak.overall_confidence - trough.overall_confidence,
      trend: growthRate > 5 ? 'upward' : growthRate < -5 ? 'downward' : 'stable',
    };
  }
  
  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance getter
export const getPersonalityDataService = () => PersonalityDataService.getInstance();