import { GeminiClient } from '../gemini/gemini-client';
import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { EmotionalAnalysisResult } from './emotional-analyzer';
import { extractJSON } from '../utils/json-parser';
import { BEHAVIORAL_REFLECTIONS_SCHEMA } from './schemas';

export interface HabitImpact {
  id: string;
  habit: string;
  impact: number; // -100 to +100
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

export interface BehavioralReflectionsResult {
  habitImpacts: HabitImpact[];
  overallInsights: string;
}

/**
 * Analyzes chat messages to identify behavioral patterns and their impact on emotional wellbeing
 */
export class BehavioralReflectionsAnalyzer {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  async analyze(
    messages: WhatsAppMessage[],
    emotionalAnalysis?: EmotionalAnalysisResult
  ): Promise<BehavioralReflectionsResult> {

    // Validate minimum data requirements
    if (messages.length < 20) {
      return {
        habitImpacts: [],
        overallInsights: 'Insufficient data for behavioral pattern analysis. Please upload a conversation with at least 20 messages to identify meaningful behavioral patterns.'
      };
    }

    // Build context from messages
    const context = this.buildContext(messages, emotionalAnalysis);

    // Generate habit impacts using AI
    const prompt = this.buildPrompt(context);

    try {
      const structuredResponse = await this.geminiClient.generateStructuredContent(prompt, BEHAVIORAL_REFLECTIONS_SCHEMA);
      return this.parseStructuredResponse(structuredResponse);
    } catch (error) {
      console.error('Failed to analyze behavioral reflections with structured output, trying shorter prompt:', error);

      // Try with a much shorter prompt as fallback
      try {
        const shortPrompt = this.buildShortPrompt(messages);
        const shortStructuredResponse = await this.geminiClient.generateStructuredContent(shortPrompt, BEHAVIORAL_REFLECTIONS_SCHEMA);
        return this.parseStructuredResponse(shortStructuredResponse);
      } catch (shortError) {
        console.error('Failed to analyze with short prompt, using minimal insights:', shortError);
        // Return minimal but meaningful insights
        return this.createMinimalBehavioralInsights(messages);
      }
    }
  }

  private buildContext(messages: WhatsAppMessage[], emotionalAnalysis?: EmotionalAnalysisResult): string {
    // Analyze message patterns by time of day, day of week, etc.
    const messagesByHour = new Map<number, number>();
    const messagesByDay = new Map<string, number>();
    const topicsDiscussed = new Map<string, number>();

    messages.forEach(msg => {
      // Hour analysis
      const hour = msg.timestamp.getHours();
      messagesByHour.set(hour, (messagesByHour.get(hour) || 0) + 1);

      // Day analysis
      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][msg.timestamp.getDay()];
      messagesByDay.set(day, (messagesByDay.get(day) || 0) + 1);

      // Basic topic extraction (you could enhance this)
      const content = msg.content.toLowerCase();
      if (content.includes('work') || content.includes('office') || content.includes('meeting')) {
        topicsDiscussed.set('work', (topicsDiscussed.get('work') || 0) + 1);
      }
      if (content.includes('gym') || content.includes('exercise') || content.includes('workout')) {
        topicsDiscussed.set('exercise', (topicsDiscussed.get('exercise') || 0) + 1);
      }
      if (content.includes('sleep') || content.includes('tired') || content.includes('rest')) {
        topicsDiscussed.set('sleep', (topicsDiscussed.get('sleep') || 0) + 1);
      }
      if (content.includes('food') || content.includes('eat') || content.includes('meal')) {
        topicsDiscussed.set('food', (topicsDiscussed.get('food') || 0) + 1);
      }
      if (content.includes('stress') || content.includes('anxiety') || content.includes('worried')) {
        topicsDiscussed.set('stress', (topicsDiscussed.get('stress') || 0) + 1);
      }
      if (content.includes('happy') || content.includes('grateful') || content.includes('thankful')) {
        topicsDiscussed.set('gratitude', (topicsDiscussed.get('gratitude') || 0) + 1);
      }
    });

    // Sample representative messages with better diversity for LLM analysis
    const filteredMessages = messages.filter(m => m.content.length > 20);
    
    // Get messages from different time periods and emotional contexts
    const totalMessages = filteredMessages.length;
    const sampleSize = Math.min(150, Math.max(50, Math.floor(totalMessages * 0.15))); // 15% sample, min 50, max 150
    
    // Stratified sampling: get messages from beginning, middle, end, and different hours/days
    const beginningMessages = filteredMessages.slice(0, Math.floor(totalMessages * 0.1));
    const middleMessages = filteredMessages.slice(Math.floor(totalMessages * 0.4), Math.floor(totalMessages * 0.6));
    const endMessages = filteredMessages.slice(Math.floor(totalMessages * 0.9));
    
    // Get messages from different hours to capture behavioral variety
    const eveningMessages = filteredMessages.filter(m => {
      const hour = m.timestamp.getHours();
      return hour >= 18 && hour <= 23;
    });
    const morningMessages = filteredMessages.filter(m => {
      const hour = m.timestamp.getHours();
      return hour >= 6 && hour <= 11;
    });
    
    // Combine samples and remove duplicates
    const diverseSample = [
      ...beginningMessages.slice(0, 15),
      ...middleMessages.slice(0, 15), 
      ...endMessages.slice(0, 15),
      ...eveningMessages.slice(0, 20),
      ...morningMessages.slice(0, 20)
    ];
    
    // Remove duplicates and limit to target sample size
    const uniqueSample = diverseSample
      .filter((msg, index, arr) => arr.findIndex(m => m.timestamp.getTime() === msg.timestamp.getTime()) === index)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, sampleSize);
    
    const sampleMessages = uniqueSample
      .map(m => {
        const time = m.timestamp.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return `[${time}] ${m.sender}: ${m.content}`;
      })
      .join('\n');

    // Simplified conversation flow analysis
    const conversationPatterns = this.analyzeConversationFlow(messages);

    let context = `Communication Patterns Analysis:

Total Messages: ${messages.length}
Period: ${messages[0]?.timestamp.toLocaleDateString()} to ${messages[messages.length - 1]?.timestamp.toLocaleDateString()}

Hourly Activity (peak hours):
${Array.from(messagesByHour.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour, count]) => `${hour}:00 - ${count} messages`)
        .join('\n')}

Daily Activity:
${Array.from(messagesByDay.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([day, count]) => `${day}: ${count}`)
        .join(', ')}

Topics: ${Array.from(topicsDiscussed.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => `${topic}(${count})`)
        .join(', ')}

${conversationPatterns}

Sample Messages:
${sampleMessages}`;

    // Add emotional context if available
    if (emotionalAnalysis) {
      context += '\n\nEmotional Analysis Summary:\n';
      if (emotionalAnalysis.overallMetrics) {
        const topEmotions = Object.entries(emotionalAnalysis.overallMetrics)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([emotion, score]) => `${emotion}: ${score}`)
          .join(', ');
        context += `Top emotions: ${topEmotions}\n`;
      }
    }

    return context;
  }

  private buildPrompt(context: string): string {
    return `You are a behavioral psychologist analyzing communication patterns. Your task is to identify 12-15 specific, evidence-based behavioral insights from the conversation data provided.

ACCURACY REQUIREMENTS:
- Base ALL insights on patterns visible in the provided data
- Use ONLY information from the conversation context provided
- Include confidence scores (1-100) based on how clear the evidence is
- Provide specific examples or evidence for each insight

${context}

ANALYSIS GUIDELINES:
Identify patterns across these categories (aim for 2-3 insights per category):

1. COMMUNICATION STYLES:
   - How they express different emotions (excited vs stressed vs sad)
   - Response patterns under pressure vs. relaxed states
   - Way they seek or offer support
   
2. EMOTIONAL REGULATION:
   - Triggers that consistently cause stress/anxiety/excitement
   - How they process difficult emotions through conversation
   - Coping mechanisms revealed through their communication
   
3. RELATIONSHIP DYNAMICS:
   - How they maintain connections during busy vs. free periods
   - Conflict resolution or avoidance patterns
   - Support-giving vs. support-seeking balance
   
4. TEMPORAL & ENERGY PATTERNS:
   - Peak communication energy times and what this reveals
   - How life stress affects their communication frequency/style
   - Weekly/seasonal patterns that indicate deeper habits
   
5. PERSONAL GROWTH INDICATORS:
   - Topics they consistently engage with (learning, health, goals)
   - How they talk about challenges and setbacks
   - Evidence of habit formation or behavior change attempts

For each insight, provide:
- habit: Specific behavioral pattern (max 80 characters)
- impact: Realistic impact score (-100 to +100) based on emotional/wellbeing effects
- category: One of ["Communication Style", "Emotional Regulation", "Relationship Dynamics", "Energy Management", "Personal Growth", "Stress Response", "Social Connection", "Mental Health", "Digital Wellness"]
- description: Evidence-based explanation (max 120 characters)
- confidence: How clear the evidence is (1-100)
- confidence_explanation: Why you're confident about this pattern (max 100 characters)

Return JSON with 12-15 insights:
{
  "habits": [
    {
      "id": "1",
      "habit": "Detailed problem-solving in evening messages",
      "impact": 45,
      "category": "Emotional Regulation",
      "description": "Uses lengthy evening texts to process daily stress - shows healthy emotional outlet but may delay sleep",
      "confidence": 82,
      "confidence_explanation": "Clear pattern of longer, reflective messages after 8 PM on stressful days"
    }
  ],
  "overall_insights": "Summary of the most significant behavioral patterns and their implications"
}

CRITICAL: Return ONLY the JSON object. Do not include explanations, commentary, or additional text.`;
  }

  private buildShortPrompt(messages: WhatsAppMessage[]): string {
    // Create a much shorter prompt for fallback
    const messagesByHour = new Map<number, number>();
    const topicsDiscussed = new Map<string, number>();

    messages.forEach(msg => {
      const hour = msg.timestamp.getHours();
      messagesByHour.set(hour, (messagesByHour.get(hour) || 0) + 1);

      const content = msg.content.toLowerCase();
      if (content.includes('work')) topicsDiscussed.set('work', (topicsDiscussed.get('work') || 0) + 1);
      if (content.includes('sleep')) topicsDiscussed.set('sleep', (topicsDiscussed.get('sleep') || 0) + 1);
      if (content.includes('stress')) topicsDiscussed.set('stress', (topicsDiscussed.get('stress') || 0) + 1);
    });

    const peakHour = Array.from(messagesByHour.entries()).sort((a, b) => b[1] - a[1])[0];
    const topTopics = Array.from(topicsDiscussed.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return `Behavioral psychologist analysis: Find 8-10 evidence-based patterns from ${messages.length} messages.

VERIFIED DATA:
- Peak hour: ${peakHour ? `${peakHour[0]}:00 (${peakHour[1]} messages)` : 'None'}
- Topics: ${topTopics.map(([t, c]) => `${t}(${c})`).join(', ')}
- Period: ${messages[0]?.timestamp.toLocaleDateString()} to ${messages[messages.length - 1]?.timestamp.toLocaleDateString()}

REQUIREMENTS:
- Base insights ONLY on the data above
- Include confidence scores (1-100)
- Focus on: Communication Style, Emotional Regulation, Energy Management, Social Connection

JSON format:
{
  "habits": [
    {
      "id": "1",
      "habit": "Peak evening communication energy",
      "impact": 35,
      "category": "Energy Management",
      "description": "Most active at ${peakHour?.[0] || 'evening'} suggests natural energy peak - optimize important conversations then",
      "confidence": 85,
      "confidence_explanation": "Clear peak hour pattern in message data"
    }
  ],
  "overall_insights": "Summary focusing on the most actionable patterns"
}

Return ONLY JSON.`;
  }

  /**
   * Create minimal but meaningful behavioral insights from limited data
   */
  private createMinimalBehavioralInsights(messages: WhatsAppMessage[]): BehavioralReflectionsResult {
    const habitImpacts: HabitImpact[] = [];

    // Analyze basic communication patterns
    const messagesByHour = new Map<number, number>();
    const messagesByDay = new Map<string, number>();

    messages.forEach(msg => {
      const hour = msg.timestamp.getHours();
      messagesByHour.set(hour, (messagesByHour.get(hour) || 0) + 1);

      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][msg.timestamp.getDay()];
      messagesByDay.set(day, (messagesByDay.get(day) || 0) + 1);
    });

    // Find peak communication times
    const peakHour = Array.from(messagesByHour.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (peakHour) {
      const [hour, count] = peakHour;
      const timeOfDay = hour < 6 ? 'early morning' : hour < 12 ? 'morning' :
        hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'late night';

      habitImpacts.push({
        id: 'communication-timing',
        habit: `${timeOfDay} communication`,
        impact: 40,
        category: 'Communication',
        description: `Most active during ${timeOfDay} hours (${hour}:00-${hour + 1}:00)`,
        frequency: count,
        confidence: 70
      });
    }

    // Find most active day
    const peakDay = Array.from(messagesByDay.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (peakDay) {
      const [day, count] = peakDay;
      habitImpacts.push({
        id: 'weekly-pattern',
        habit: `${day} conversations`,
        impact: 30,
        category: 'Weekly Patterns',
        description: `Most communicative on ${day}s`,
        frequency: count,
        confidence: 60
      });
    }

    // Analyze message length patterns
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    if (avgLength > 100) {
      habitImpacts.push({
        id: 'detailed-communication',
        habit: 'Detailed conversations',
        impact: 50,
        category: 'Communication Style',
        description: 'Tends to have in-depth, meaningful conversations',
        confidence: 80
      });
    }

    const overallInsights = habitImpacts.length > 0
      ? `Identified ${habitImpacts.length} behavioral patterns from ${messages.length} messages.`
      : 'Limited behavioral patterns detected. More conversation data needed for deeper insights.';

    return { habitImpacts, overallInsights };
  }

  private parseResponse(response: string): BehavioralReflectionsResult {
    try {
      const parsed = extractJSON(response);

      const habitImpacts: HabitImpact[] = parsed.habits?.map((habit: any) => ({
        id: habit.id || `habit-${Math.random().toString(36).substr(2, 9)}`,
        habit: habit.habit || 'Unknown Habit',
        impact: habit.impact || 0,
        category: habit.category || 'Other',
        description: habit.description || '',
        frequency: habit.frequency || 1,
        confidence: habit.confidence || 70,
        confidence_explanation: habit.confidence_explanation || '',
        temporal_patterns: habit.temporal_patterns || {},
        emotional_triggers: habit.emotional_triggers || {}
      })) || [];

      return {
        habitImpacts,
        overallInsights: parsed.overall_insights || ''
      };
    } catch (error) {
      console.error('Failed to parse behavioral reflections response:', error);

      // Check if response was truncated
      if (response.includes('"description"') && !response.includes('"overall_insights"')) {
        console.log('Response appears to be truncated. Attempting to extract partial data...');

        // Try to extract what we can from the truncated response
        const habitsMatch = response.match(/"habits":\s*\[(.*?)\]/s);
        if (habitsMatch) {
          try {
            // Try to parse just the habits array
            const habitsJson = `{"habits": [${habitsMatch[1]}]}`;
            const partialParsed = JSON.parse(habitsJson);

            const habitImpacts: HabitImpact[] = partialParsed.habits?.map((habit: any) => ({
              id: habit.id || `habit-${Math.random().toString(36).substr(2, 9)}`,
              habit: habit.habit || 'Unknown Habit',
              impact: habit.impact || 0,
              category: habit.category || 'Other',
              description: habit.description || '',
              frequency: habit.frequency || 1,
              confidence: habit.confidence || 70,
              confidence_explanation: habit.confidence_explanation || '',
              temporal_patterns: habit.temporal_patterns || {},
              emotional_triggers: habit.emotional_triggers || {}
            })) || [];

            return {
              habitImpacts,
              overallInsights: 'Analysis completed with partial data due to response truncation.'
            };
          } catch (partialError) {
            console.log('Failed to parse partial response:', partialError);
          }
        }
      }

      console.log('Raw response preview:', response.substring(0, 500));
      return {
        habitImpacts: [],
        overallInsights: 'Unable to analyze behavioral patterns due to response parsing error.'
      };
    }
  }

  private parseStructuredResponse(structuredData: any): BehavioralReflectionsResult {
    try {
      const habitImpacts: HabitImpact[] = structuredData.habitImpacts?.map((habit: any) => ({
        id: habit.id || `habit-${Math.random().toString(36).substr(2, 9)}`,
        habit: habit.habit || 'Unknown Habit',
        impact: habit.growth_potential ? (habit.growth_potential * 10) - 50 : 0, // Convert 1-10 scale to -50 to +50
        category: habit.frequency || 'Other',
        description: habit.impact || '',
        frequency: this.mapFrequencyToNumber(habit.frequency),
        confidence: 80, // Default confidence for structured output
        confidence_explanation: habit.emotional_connection || '',
        temporal_patterns: {},
        emotional_triggers: {}
      })) || [];

      // Generate overall insights from patterns and insights
      const patterns = structuredData.patterns || [];
      const insights = structuredData.insights || [];
      
      let overallInsights = 'Behavioral Analysis:\n\n';
      
      if (patterns.length > 0) {
        overallInsights += 'Key Patterns:\n';
        patterns.forEach((pattern: any, index: number) => {
          overallInsights += `${index + 1}. ${pattern.pattern} (Strength: ${pattern.strength}/10)\n`;
        });
        overallInsights += '\n';
      }
      
      if (insights.length > 0) {
        overallInsights += 'Key Insights:\n';
        insights.forEach((insight: any, index: number) => {
          overallInsights += `${index + 1}. ${insight.insight}\n`;
        });
      }

      return {
        habitImpacts,
        overallInsights
      };
    } catch (error) {
      console.error('Failed to parse structured behavioral reflections response:', error);
      return {
        habitImpacts: [],
        overallInsights: 'Unable to analyze behavioral patterns due to structured response parsing error.'
      };
    }
  }

  private mapFrequencyToNumber(frequency: string): number {
    const frequencyMap: Record<string, number> = {
      'daily': 7,
      'weekly': 3,
      'monthly': 1,
      'occasionally': 0.5,
      'rarely': 0.1
    };
    return frequencyMap[frequency] || 1;
  }

  private analyzeConversationFlow(messages: WhatsAppMessage[]): string {
    // Analyze conversation patterns over time
    const monthlyActivity = new Map<string, number>();
    const conversationGaps: number[] = [];

    for (let i = 0; i < messages.length; i++) {
      // Monthly activity
      const monthKey = messages[i].timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyActivity.set(monthKey, (monthlyActivity.get(monthKey) || 0) + 1);

      // Conversation gaps (in hours)
      if (i > 0) {
        const gap = (messages[i].timestamp.getTime() - messages[i - 1].timestamp.getTime()) / (1000 * 60 * 60);
        if (gap > 1) { // Only count gaps longer than 1 hour
          conversationGaps.push(gap);
        }
      }
    }

    // Calculate average gap
    const avgGap = conversationGaps.length > 0
      ? conversationGaps.reduce((a, b) => a + b, 0) / conversationGaps.length
      : 0;

    // Find longest conversation streak
    let currentStreak = 1;
    let maxStreak = 1;
    for (let i = 1; i < messages.length; i++) {
      const gap = (messages[i].timestamp.getTime() - messages[i - 1].timestamp.getTime()) / (1000 * 60 * 60);
      if (gap < 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    // Simplified output
    const topMonths = Array.from(monthlyActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([month, count]) => `${month}(${count})`)
      .join(', ');

    return `Monthly Activity: ${topMonths}
Avg Gap: ${avgGap.toFixed(1)}h, Max Streak: ${maxStreak}`;
  }
}