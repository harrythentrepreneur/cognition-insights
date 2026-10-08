import { useState, useEffect, useCallback } from 'react';
import { getNarrativeGenerator } from '../services/narrative-generator';

interface UseNarrativeGenerationParams {
  personalityData: any;
  chapter: 'executive-summary' | 'life-narrative' | 'personality-architecture' | 'emotional-dynamics' | 
           'communication-patterns' | 'triggers-analysis' | 'growth-development' | 
           'comparative-analysis' | 'recommendations';
  sectionType?: 'introduction' | 'analysis' | 'insight' | 'conclusion';
  enabled?: boolean;
  fallbackContent?: string;
}

interface UseNarrativeGenerationReturn {
  content: string;
  insights?: string[];
  keyPoints?: string[];
  isLoading: boolean;
  error: Error | null;
  regenerate: () => void;
}

export function useNarrativeGeneration({
  personalityData,
  chapter,
  sectionType,
  enabled = true,
  fallbackContent,
}: UseNarrativeGenerationParams): UseNarrativeGenerationReturn {
  const [content, setContent] = useState<string>(fallbackContent || '');
  const [insights, setInsights] = useState<string[]>();
  const [keyPoints, setKeyPoints] = useState<string[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [regenerateFlag, setRegenerateFlag] = useState(0);
  
  const generateNarrative = useCallback(async () => {
    if (!enabled || !personalityData) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const generator = getNarrativeGenerator();
      const response = await generator.generateNarrative({
        personalityData,
        chapter,
        sectionType,
      });
      
      setContent(response.content);
      setInsights(response.insights);
      setKeyPoints(response.keyPoints);
    } catch (err) {
      setError(err as Error);
      console.error('Error generating narrative:', err);
      // Keep fallback content if generation fails
      if (fallbackContent && !content) {
        setContent(fallbackContent);
      }
    } finally {
      setIsLoading(false);
    }
  }, [personalityData, chapter, sectionType, enabled, fallbackContent, content]);
  
  useEffect(() => {
    generateNarrative();
  }, [generateNarrative, regenerateFlag]);
  
  const regenerate = useCallback(() => {
    setRegenerateFlag(prev => prev + 1);
  }, []);
  
  return {
    content,
    insights,
    keyPoints,
    isLoading,
    error,
    regenerate,
  };
}

// Hook for generating multiple narratives at once
export function useBatchNarrativeGeneration(
  requests: UseNarrativeGenerationParams[]
): Record<string, UseNarrativeGenerationReturn> {
  const results: Record<string, UseNarrativeGenerationReturn> = {};
  
  requests.forEach(request => {
    const key = `${request.chapter}-${request.sectionType || 'default'}`;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = useNarrativeGeneration(request);
  });
  
  return results;
}