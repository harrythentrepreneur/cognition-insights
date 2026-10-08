import { GeminiClient } from '../gemini/gemini-client';
import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { extractJSON } from '../utils/json-parser';
import {
  PERSONALITY_ANALYSIS_SCHEMA,
  BIG_FIVE_SCHEMA,
  PERSONALITY_INSIGHTS_SCHEMA,
  COMMUNICATION_PATTERNS_SCHEMA,
  STRENGTHS_GROWTH_SCHEMA
} from './schemas';

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityInsight {
  trait: string;
  score: number;
  description: string;
  evidence: string[];
}

export interface PersonalityAnalysisResult {
  bigFive: PersonalityTraits;
  dominantTraits: PersonalityInsight[];
  personalityType: string;
  strengths: string[];
  growthAreas: string[];
  communicationStyle: {
    primary: string;
    characteristics: string[];
  };
  emotionalPattern: {
    stability: number;
    expressiveness: number;
    depth: number;
  };
}

export class PersonalityAnalyzer {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }




  /**
   * Create minimal but meaningful personality insights from limited data
   */
  private createMinimalPersonalityInsights(messages: WhatsAppMessage[]): PersonalityAnalysisResult {
    const messageCount = messages.length;

    // Analyze basic communication patterns
    const avgLength = messageCount > 0
      ? messages.reduce((sum, m) => sum + m.content.length, 0) / messageCount
      : 0;

    // Analyze message timing for extraversion hints
    const timeDistribution = this.analyzeTimeDistribution(messages);
    const extraversion = timeDistribution.variance > 0.5 ? 60 : 40;

    // Message length hints at openness and depth
    const openness = avgLength > 100 ? 65 : avgLength > 50 ? 55 : 45;

    // Consistency in messaging hints at conscientiousness
    const conscientiousness = timeDistribution.consistency > 0.7 ? 60 : 45;

    return {
      bigFive: {
        openness,
        conscientiousness,
        extraversion,
        agreeableness: 55, // Default to slightly agreeable
        neuroticism: 45 // Default to slightly stable
      },
      dominantTraits: [
        {
          trait: avgLength > 50 ? 'Thoughtful' : 'Concise',
          score: 65,
          description: avgLength > 50
            ? 'Tends to express thoughts in detail'
            : 'Prefers brief, direct communication',
          evidence: [`Average message length: ${Math.round(avgLength)} characters`]
        }
      ],
      personalityType: messageCount < 25 ? 'Limited Data Available' : 'Balanced Communicator',
      strengths: this.generateStrengthsFromPatterns(messages),
      growthAreas: ['Deeper conversation analysis needed', 'Extended interaction period required'],
      communicationStyle: {
        primary: avgLength > 100 ? 'Expressive' : 'Direct',
        characteristics: this.generateCommunicationTraits(messages)
      },
      emotionalPattern: {
        stability: 50,
        expressiveness: avgLength > 50 ? 60 : 40,
        depth: avgLength > 100 ? 65 : 45
      }
    };
  }

  private analyzeTimeDistribution(messages: WhatsAppMessage[]): { variance: number; consistency: number } {
    if (messages.length < 2) return { variance: 0, consistency: 0 };

    const hours = messages.map(m => m.timestamp.getHours());
    const uniqueHours = new Set(hours).size;
    const variance = uniqueHours / 24;

    // Check for consistent daily patterns
    const dayGroups = new Map<string, number>();
    messages.forEach(m => {
      const day = m.timestamp.toDateString();
      dayGroups.set(day, (dayGroups.get(day) || 0) + 1);
    });

    const consistency = dayGroups.size > 7 ? 0.8 : dayGroups.size / 10;

    return { variance, consistency };
  }

  private generateStrengthsFromPatterns(messages: WhatsAppMessage[]): string[] {
    const strengths: string[] = [];
    const avgLength = messages.length > 0
      ? messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length
      : 0;

    if (avgLength > 100) strengths.push('Detailed communication');
    if (avgLength < 50) strengths.push('Concise expression');
    if (messages.length > 50) strengths.push('Active engagement');

    return strengths.length > 0 ? strengths : ['Consistent communication', 'Regular engagement'];
  }

  private generateCommunicationTraits(messages: WhatsAppMessage[]): string[] {
    const traits: string[] = [];
    const avgLength = messages.length > 0
      ? messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length
      : 0;

    if (avgLength > 150) traits.push('Elaborate');
    else if (avgLength > 50) traits.push('Balanced');
    else traits.push('Brief');

    // Check for questions
    const questionCount = messages.filter(m => m.content.includes('?')).length;
    if (questionCount > messages.length * 0.2) traits.push('Inquisitive');

    return traits;
  }

  private getDefaultPersonalityResult(): PersonalityAnalysisResult {
    return {
      bigFive: {
        openness: 50,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50
      },
      dominantTraits: [],
      personalityType: 'Unable to determine',
      strengths: ['Communication', 'Consistency', 'Engagement'],
      growthAreas: ['Self-reflection', 'Emotional expression', 'Active listening'],
      communicationStyle: {
        primary: 'Balanced',
        characteristics: ['Direct', 'Friendly']
      },
      emotionalPattern: {
        stability: 50,
        expressiveness: 50,
        depth: 50
      }
    };
  }

  async analyzePersonality(messages: WhatsAppMessage[]): Promise<PersonalityAnalysisResult> {
    // Validate minimum data requirements
    if (messages.length < 25) {
      console.log('⚠️ Limited messages for personality analysis:', messages.length);
      return {
        ...this.getDefaultPersonalityResult(),
        personalityType: 'Limited Data',
        strengths: ['Unable to determine with limited data'],
        growthAreas: ['More conversation data needed for analysis'],
        communicationStyle: {
          primary: 'Insufficient data',
          characteristics: ['Upload a longer conversation for personality insights']
        }
      };
    }

    // For larger conversations, use batch processing
    if (messages.length > 100) {
      return this.analyzePersonalityBatch(messages);
    }

    // For smaller conversations, use existing logic
    const sampleSize = Math.min(messages.length, 500);
    const sampledMessages = this.sampleMessages(messages, sampleSize);

    // Analyze different aspects in parallel
    const [bigFive, insights, patterns] = await Promise.all([
      this.analyzeBigFive(sampledMessages),
      this.analyzePersonalityInsights(sampledMessages),
      this.analyzeCommunicationPatterns(sampledMessages)
    ]);

    // Determine personality type based on analysis
    const personalityType = this.determinePersonalityType(bigFive, insights);

    // Extract strengths and growth areas
    const { strengths, growthAreas } = await this.identifyStrengthsAndGrowth(bigFive, insights);

    return {
      bigFive,
      dominantTraits: insights.slice(0, 5),
      personalityType,
      strengths,
      growthAreas,
      communicationStyle: patterns.communicationStyle,
      emotionalPattern: patterns.emotionalPattern
    };
  }

  private async analyzePersonalityBatch(messages: WhatsAppMessage[]): Promise<PersonalityAnalysisResult> {
    const MAX_MESSAGES_PER_BATCH = 300; // Much larger batches like backend
    const batches: WhatsAppMessage[][] = [];

    // Create chronological batches while preserving conversation threads
    for (let i = 0; i < messages.length; i += MAX_MESSAGES_PER_BATCH) {
      batches.push(messages.slice(i, i + MAX_MESSAGES_PER_BATCH));
    }

    console.log(`🌐 Analyzing personality in ${batches.length} batches`);

    // Process batches sequentially with retry logic to minimize API calls
    const batchResults = [];
    for (let i = 0; i < batches.length; i++) {
      const result = await this.analyzePersonalityBatchSegmentWithRetry(batches[i], i);
      batchResults.push(result);

      // No delay between batches - process as fast as possible
      // Removed artificial delays for faster processing
    }

    // Aggregate results from all batches
    const aggregatedResult = this.aggregatePersonalityResults(batchResults);

    // Determine personality type based on aggregated analysis
    const personalityType = this.determinePersonalityType(aggregatedResult.bigFive, aggregatedResult.dominantTraits);

    // Extract strengths and growth areas from aggregated data
    const { strengths, growthAreas } = await this.identifyStrengthsAndGrowth(
      aggregatedResult.bigFive,
      aggregatedResult.dominantTraits
    );

    return {
      ...aggregatedResult,
      personalityType,
      strengths,
      growthAreas
    };
  }

  private async analyzePersonalityBatchSegmentWithRetry(messages: WhatsAppMessage[], batchIndex: number): Promise<any> {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        return await this.analyzePersonalityBatchSegment(messages, batchIndex);
      } catch (error) {
        retries++;
        console.log(`Personality batch ${batchIndex} attempt ${retries}/${maxRetries} failed:`, error);

        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        } else {
          console.error('All personality batch attempts failed, using minimal insights');
          const minimalInsights = this.createMinimalPersonalityInsights(messages);
          return {
            bigFive: minimalInsights.bigFive,
            insights: minimalInsights.dominantTraits,
            communicationStyle: { primary: 'balanced', characteristics: [] },
            emotionalPattern: { stability: 50, expressiveness: 50, depth: 50 }
          };
        }
      }
    }
  }

  private async analyzePersonalityBatchSegment(messages: WhatsAppMessage[], batchIndex: number): Promise<any> {
    // Include temporal context and sender info
    const messagesText = messages.map(m => {
      const time = m.timestamp.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `[${time}] ${m.sender || 'User'}: ${m.content}`;
    }).join('\n');

    const prompt = `You are a JSON-only API that analyzes personality traits. You MUST respond with ONLY valid JSON, no other text.

Analyze these WhatsApp messages for personality traits:
${messagesText}

OUTPUT RULES:
- Return ONLY the JSON object below
- Replace 0 with actual scores (0-100)
- Replace empty strings with actual values
- NO text before or after the JSON
- NO markdown, NO explanations
- Start with { and end with }

REQUIRED JSON OUTPUT:
{
  "bigFive": {
    "openness": 0,
    "conscientiousness": 0,
    "extraversion": 0,
    "agreeableness": 0,
    "neuroticism": 0
  },
  "insights": [
    {
      "trait": "trait_name",
      "score": 0,
      "description": "brief description",
      "evidence": ["example 1", "example 2"]
    }
  ],
  "communicationStyle": {
    "primary": "direct",
    "characteristics": ["trait1", "trait2", "trait3"]
  },
  "emotionalPattern": {
    "stability": 0,
    "expressiveness": 0,
    "depth": 0
  }
}`;

    try {
      const response = await this.geminiClient.generateStructuredContent(prompt, PERSONALITY_ANALYSIS_SCHEMA);
      return response;
    } catch (error) {
      console.error(`Failed to analyze personality batch ${batchIndex}:`, error);
      console.error('Response that failed to parse:', error);
      // Return minimal insights for this batch
      const minimalInsights = this.createMinimalPersonalityInsights(messages);
      return {
        bigFive: minimalInsights.bigFive,
        insights: minimalInsights.dominantTraits,
        communicationStyle: minimalInsights.communicationStyle,
        emotionalPattern: minimalInsights.emotionalPattern
      };
    }
  }

  private aggregatePersonalityResults(batchResults: any[]): any {
    // Aggregate Big Five scores
    const bigFive: PersonalityTraits = {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0
    };

    batchResults.forEach(result => {
      Object.keys(bigFive).forEach(trait => {
        bigFive[trait as keyof PersonalityTraits] += result.bigFive[trait] || 0;
      });
    });

    // Average the scores
    Object.keys(bigFive).forEach(trait => {
      bigFive[trait as keyof PersonalityTraits] = Math.round(bigFive[trait as keyof PersonalityTraits] / batchResults.length);
    });

    // Aggregate insights (combine and deduplicate)
    const insightMap = new Map<string, PersonalityInsight>();

    batchResults.forEach(result => {
      if (result.insights) {
        result.insights.forEach((insight: PersonalityInsight) => {
          const key = insight.trait.toLowerCase();
          if (insightMap.has(key)) {
            const existing = insightMap.get(key)!;
            existing.score = Math.round((existing.score + insight.score) / 2);
            existing.evidence = [...existing.evidence, ...insight.evidence].slice(0, 3);
          } else {
            insightMap.set(key, { ...insight });
          }
        });
      }
    });

    const dominantTraits = Array.from(insightMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);

    // Aggregate communication style (take most common)
    const styleCounts = new Map<string, number>();
    const allCharacteristics = new Set<string>();

    batchResults.forEach(result => {
      if (result.communicationStyle) {
        const style = result.communicationStyle.primary;
        styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
        result.communicationStyle.characteristics?.forEach((char: string) => allCharacteristics.add(char));
      }
    });

    const primaryStyle = Array.from(styleCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'balanced';

    // Aggregate emotional patterns
    const emotionalPattern = {
      stability: 0,
      expressiveness: 0,
      depth: 0
    };

    let emotionalCount = 0;
    batchResults.forEach(result => {
      if (result.emotionalPattern) {
        emotionalPattern.stability += result.emotionalPattern.stability || 0;
        emotionalPattern.expressiveness += result.emotionalPattern.expressiveness || 0;
        emotionalPattern.depth += result.emotionalPattern.depth || 0;
        emotionalCount++;
      }
    });

    if (emotionalCount > 0) {
      emotionalPattern.stability = Math.round(emotionalPattern.stability / emotionalCount);
      emotionalPattern.expressiveness = Math.round(emotionalPattern.expressiveness / emotionalCount);
      emotionalPattern.depth = Math.round(emotionalPattern.depth / emotionalCount);
    }

    return {
      bigFive,
      dominantTraits,
      communicationStyle: {
        primary: primaryStyle,
        characteristics: Array.from(allCharacteristics).slice(0, 4)
      },
      emotionalPattern
    };
  }

  private sampleMessages(messages: WhatsAppMessage[], sampleSize: number): WhatsAppMessage[] {
    if (messages.length <= sampleSize) return messages;

    const step = Math.floor(messages.length / sampleSize);
    const sampled: WhatsAppMessage[] = [];

    for (let i = 0; i < messages.length; i += step) {
      sampled.push(messages[i]);
    }

    return sampled;
  }

  private async analyzeBigFive(messages: WhatsAppMessage[]): Promise<PersonalityTraits> {
    const messagesText = messages.map(m => m.content).join('\n');

    const prompt = `Analyze these messages for Big Five personality traits.
    
Messages (sample):
${messagesText.substring(0, 3000)}...

Rate each trait from 0-100:
- Openness: creativity, curiosity, openness to new experiences
- Conscientiousness: organization, dependability, self-discipline
- Extraversion: sociability, assertiveness, positive emotions
- Agreeableness: cooperation, trust, empathy
- Neuroticism: anxiety, moodiness, emotional instability

CRITICAL: Return ONLY a JSON object with these five traits as numbers.
DO NOT include any text before or after the JSON.
Start with { and end with }
NO MARKDOWN, NO EXPLANATIONS!`;

    try {
      const response = await this.geminiClient.generateStructuredContent(prompt, BIG_FIVE_SCHEMA);
      return response;
    } catch (error) {
      console.error('Failed to analyze Big Five:', error);
      return {
        openness: 50,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50
      };
    }
  }

  private async analyzePersonalityInsights(messages: WhatsAppMessage[]): Promise<PersonalityInsight[]> {
    const messagesText = messages.map(m => m.content).join('\n');

    const prompt = `Analyze these messages to identify key personality insights.
    
Messages (sample):
${messagesText.substring(0, 3000)}...

Identify 5-7 dominant personality traits with:
- trait: Name of the trait (e.g., "Empathetic", "Analytical", "Creative")
- score: Strength of this trait (0-100)
- description: Brief explanation of how this manifests
- evidence: Array of 2-3 specific examples from messages

CRITICAL: Return ONLY a JSON array of personality insights.
DO NOT include any text before or after the JSON.
Start with [ and end with ]
NO MARKDOWN, NO EXPLANATIONS!`;

    try {
      const response = await this.geminiClient.generateStructuredContent(prompt, PERSONALITY_INSIGHTS_SCHEMA);
      return response;
    } catch (error) {
      console.error('Failed to analyze personality insights:', error);
      return [];
    }
  }

  private async analyzeCommunicationPatterns(messages: WhatsAppMessage[]): Promise<any> {
    const messagesText = messages.map(m => m.content).join('\n');

    const prompt = `Analyze communication patterns in these messages.
    
Messages (sample):
${messagesText.substring(0, 3000)}...

Analyze:
1. Communication style (primary: "direct", "indirect", "expressive", "analytical")
2. Key characteristics (array of 3-4 traits)
3. Emotional pattern:
   - stability (0-100): consistency of emotional expression
   - expressiveness (0-100): how openly emotions are shared
   - depth (0-100): complexity and nuance of emotional expression

CRITICAL: Return ONLY a JSON object with communicationStyle and emotionalPattern.
DO NOT include any text before or after the JSON.
Start with { and end with }
NO MARKDOWN, NO EXPLANATIONS!`;

    try {
      const response = await this.geminiClient.generateStructuredContent(prompt, COMMUNICATION_PATTERNS_SCHEMA);
      return response;
    } catch (error) {
      console.error('Failed to analyze communication patterns:', error);
      return {
        communicationStyle: {
          primary: 'balanced',
          characteristics: ['thoughtful', 'responsive', 'clear']
        },
        emotionalPattern: {
          stability: 70,
          expressiveness: 60,
          depth: 65
        }
      };
    }
  }

  private determinePersonalityType(bigFive: PersonalityTraits, _insights: PersonalityInsight[]): string {
    // Simple personality type determination based on dominant traits
    // TODO: Consider using insights for more nuanced personality typing
    const traits = [];

    if (bigFive.openness > 70) traits.push('Creative');
    if (bigFive.conscientiousness > 70) traits.push('Organized');
    if (bigFive.extraversion > 70) traits.push('Outgoing');
    if (bigFive.agreeableness > 70) traits.push('Harmonious');
    if (bigFive.neuroticism < 30) traits.push('Stable');

    if (traits.length === 0) {
      return 'Balanced Personality';
    }

    return `The ${traits.slice(0, 2).join(' ')} ${traits.length > 1 ? 'Type' : 'Personality'}`;
  }

  private async identifyStrengthsAndGrowth(
    bigFive: PersonalityTraits,
    insights: PersonalityInsight[]
  ): Promise<{ strengths: string[], growthAreas: string[] }> {
    const topTraits = Object.entries(bigFive)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([trait]) => trait);

    const prompt = `Based on these personality traits: ${topTraits.join(', ')} with scores above 70,
    and insights: ${insights.slice(0, 3).map(i => i.trait).join(', ')},
    
    List 3-4 key strengths and 2-3 growth areas.
    Return as JSON: { strengths: string[], growthAreas: string[] }
    
    Be specific, actionable, and encouraging.
    
    CRITICAL: Return ONLY JSON.
    DO NOT include any text before or after the JSON.
    Start with { and end with }
    NO MARKDOWN, NO EXPLANATIONS!`;

    try {
      const response = await this.geminiClient.generateStructuredContent(prompt, STRENGTHS_GROWTH_SCHEMA);
      return response;
    } catch (error) {
      console.error('Failed to identify strengths/growth:', error);
      return {
        strengths: [
          'Strong emotional intelligence',
          'Effective communication skills',
          'Adaptable and resilient'
        ],
        growthAreas: [
          'Setting healthy boundaries',
          'Practicing self-compassion'
        ]
      };
    }
  }
}