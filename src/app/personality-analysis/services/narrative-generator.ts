// Backend API removed - using IndexedDB storage

interface NarrativeGenerationParams {
  personalityData: any;
  chapter: 'executive-summary' | 'life-narrative' | 'personality-architecture' | 'emotional-dynamics' | 
           'communication-patterns' | 'triggers-analysis' | 'growth-development' | 
           'comparative-analysis' | 'recommendations';
  sectionType?: 'introduction' | 'analysis' | 'insight' | 'conclusion';
  customPrompt?: string;
}

interface NarrativeResponse {
  content: string;
  insights?: string[];
  keyPoints?: string[];
  metadata?: {
    generatedAt: string;
    model: string;
    confidence: number;
  };
}

export class NarrativeGenerator {
  private static instance: NarrativeGenerator;
  private apiUrl: string;
  private cache: Map<string, NarrativeResponse>;
  
  private constructor() {
    this.apiUrl = ''/* Backend removed */;
    this.cache = new Map();
  }
  
  static getInstance(): NarrativeGenerator {
    if (!NarrativeGenerator.instance) {
      NarrativeGenerator.instance = new NarrativeGenerator();
    }
    return NarrativeGenerator.instance;
  }
  
  /**
   * Generate AI-powered narrative content for personality analysis chapters
   */
  async generateNarrative(params: NarrativeGenerationParams): Promise<NarrativeResponse> {
    const cacheKey = this.getCacheKey(params);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    try {
      // Prepare the prompt based on chapter and section type
      const prompt = this.buildPrompt(params);
      
      // Call backend API that proxies to Gemini
      const response = await fetch(`${this.apiUrl}/api/ai/generate-narrative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context: params.personalityData,
          chapter: params.chapter,
          sectionType: params.sectionType,
          maxTokens: 500,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const narrativeResponse: NarrativeResponse = {
        content: data.content || this.getFallbackContent(params),
        insights: data.insights,
        keyPoints: data.keyPoints,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: data.model || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17',
          confidence: data.confidence || 0.85,
        },
      };
      
      // Cache the response
      this.cache.set(cacheKey, narrativeResponse);
      
      return narrativeResponse;
    } catch (error) {
      console.error('Error generating narrative:', error);
      // Return fallback content
      return {
        content: this.getFallbackContent(params),
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'fallback',
          confidence: 0.5,
        },
      };
    }
  }
  
  /**
   * Build a specific prompt based on chapter and section
   */
  private buildPrompt(params: NarrativeGenerationParams): string {
    const { personalityData, chapter, sectionType, customPrompt } = params;
    
    if (customPrompt) {
      return customPrompt;
    }
    
    const baseContext = `You are a PhD-level psychologist writing a comprehensive personality analysis report. 
    The analysis should be professional, insightful, and backed by psychological theory. 
    Use sophisticated language while remaining accessible.`;
    
    const chapterPrompts: Record<string, Record<string, string>> = {
      'executive-summary': {
        introduction: `Write a compelling introduction for an executive summary of a personality analysis. 
        Highlight the uniqueness of the individual's personality profile based on: ${JSON.stringify(personalityData.personality_metrics)}.
        Focus on their top traits and what makes them distinctive.`,
        
        analysis: `Provide a deep analysis of the key personality findings. 
        Consider the interplay between traits: ${JSON.stringify(personalityData.personality_metrics)}.
        Discuss how these traits manifest in behavior and relationships.`,
        
        insight: `Generate profound insights about this personality profile.
        What are the implications of having ${personalityData.summary?.dominant_trait} as a dominant trait?
        How does this shape their worldview and interactions?`,
        
        conclusion: `Write a synthesis conclusion that ties together all personality dimensions.
        Emphasize growth potential and the individual's unique psychological fingerprint.`,
      },
      
      'life-narrative': {
        introduction: `Write a poetic introduction to someone's life narrative chapter.
        Consider their journey through the lens of narrative psychology and the hero's journey.`,
        
        analysis: `Analyze the recurring themes and patterns in their life story.
        How do their personality traits (${JSON.stringify(personalityData.personality_metrics)}) 
        influence their narrative identity?`,
        
        insight: `Provide deep insights into the symbolic meaning of their life experiences.
        Connect their personal mythology to universal human themes.`,
        
        conclusion: `Conclude with a forward-looking perspective on their continuing story.
        How does their past inform their future narrative possibilities?`,
      },
      
      'emotional-dynamics': {
        introduction: `Introduce the concept of emotional dynamics in personality.
        Frame emotions as dynamic systems that shape and are shaped by personality.`,
        
        analysis: `Analyze their emotional patterns based on emotional inertia score: ${personalityData.emotional_inertia?.score}.
        Discuss emotional flexibility, regulation strategies, and affective tendencies.`,
        
        insight: `Generate insights about their emotional intelligence and regulation.
        How does their emotional inertia affect their relationships and decision-making?`,
        
        conclusion: `Synthesize their emotional profile with practical implications.
        Suggest pathways for emotional growth and enhanced well-being.`,
      },
      
      // Add more chapter-specific prompts...
    };
    
    const chapterPrompt = chapterPrompts[chapter]?.[sectionType || 'introduction'] || 
      `Write a ${sectionType || 'general'} section for the ${chapter} chapter of a personality analysis report.`;
    
    return `${baseContext}\n\n${chapterPrompt}\n\nPersonality Data: ${JSON.stringify(personalityData, null, 2)}`;
  }
  
  /**
   * Get fallback content when AI generation fails
   */
  private getFallbackContent(params: NarrativeGenerationParams): string {
    const { chapter, sectionType } = params;
    
    const fallbackContent: Record<string, string> = {
      'executive-summary': `This comprehensive personality analysis reveals a unique individual with distinctive 
      traits and patterns that shape their interactions and experiences. Through careful examination of behavioral 
      data and communication patterns, we can observe the intricate architecture of personality that defines 
      their authentic self.`,
      
      'life-narrative': `Every life tells a story, and yours unfolds as a rich tapestry of experiences, 
      growth, and self-discovery. The patterns woven throughout your journey reveal recurring themes of 
      resilience, adaptation, and the continuous evolution of your authentic self.`,
      
      'emotional-dynamics': `Emotions form the dynamic core of human experience, creating patterns that 
      ripple through all aspects of life. Your emotional landscape reveals sophisticated patterns of 
      feeling, expression, and regulation that contribute to your unique way of being in the world.`,
      
      'communication-patterns': `Communication serves as the bridge between inner experience and outer 
      expression. Your linguistic patterns reveal a distinctive voice that reflects your personality 
      architecture and shapes your social connections.`,
      
      'triggers-analysis': `Understanding emotional triggers provides crucial insights into the deeper 
      patterns of reactivity and resilience. This analysis examines the specific words, contexts, and 
      situations that evoke strong emotional responses.`,
      
      'growth-development': `Personal growth unfolds as a continuous journey of expanding awareness and 
      capability. Your development trajectory reveals patterns of learning, adaptation, and self-actualization 
      that point toward future possibilities.`,
      
      'comparative-analysis': `Personality expresses itself differently across contexts, relationships, 
      and time periods. This comparative analysis reveals both the consistency of your core self and 
      the adaptive flexibility of your personality expression.`,
      
      'recommendations': `Based on comprehensive analysis of your personality architecture, these 
      recommendations focus on optimizing your natural strengths while addressing growth opportunities 
      for enhanced well-being and effectiveness.`,
    };
    
    return fallbackContent[chapter as keyof typeof fallbackContent] || `This section provides insights into your ${chapter.replace('-', ' ')} 
    based on comprehensive personality analysis.`;
  }
  
  /**
   * Generate a cache key for storing responses
   */
  private getCacheKey(params: NarrativeGenerationParams): string {
    return `${params.chapter}-${params.sectionType || 'default'}-${JSON.stringify(params.personalityData.summary || {})}`;
  }
  
  /**
   * Clear the cache (useful for development)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance getter
export const getNarrativeGenerator = () => NarrativeGenerator.getInstance();