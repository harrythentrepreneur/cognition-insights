/**
 * Runware API Service
 * Handles image generation from emotional timeline data
 */

import { v4 as uuidv4 } from 'uuid';

interface RunwareImageRequest {
  taskType: string;
  taskUUID: string;
  outputType?: string;
  outputFormat?: string;
  positivePrompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
  steps?: number;
  CFGScale?: number;
  seed?: number;
  scheduler?: string;
  numberResults?: number;
}

interface RunwareResponse {
  data: Array<{
    imageURL?: string;
    imagePath?: string;
    taskUUID: string;
    imageUUID: string;
  }>;
  errors?: Array<{
    message: string;
    code: string;
  }>;
}

export interface TimelineData {
  life_events: Array<{
    id: string;
    title: string;
    time: string;
    day: string;
    emotion: string;
    intensity: number;
    description: string;
  }>;
  chapters: Record<string, any>;
  emotional_journey: {
    dominant_themes: Array<[string, number]>;
    total_events: number;
    chapter_count: number;
    time_span: {
      start: string;
      end: string;
    };
  };
  timeline_summary: string;
}

interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  prompt?: string;
}

// Generate UUID v4
function generateUUID(): string {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return uuid;
}

// Get API base URL from environment
function getApiBaseUrl(): string {
  // In development or when using localhost, use the Next.js proxy
  if (typeof window !== 'undefined') {
    // Client-side: use the proxy (empty string = relative to current domain)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = process.env.NEXT_PUBLIC_API_BASE_URL?.includes('localhost');
    
    if (isDevelopment || isLocalhost) {
      // Use the Next.js proxy - calls to /api/* will be forwarded to backend
      return '';
    }
    
    // Production: use the full API URL
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }
  
  // Server-side (SSR): always use the full backend URL
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
}

/**
 * Fetch timeline data from the backend API
 */
export async function fetchTimelineData(sessionId: string): Promise<TimelineData | null> {
  try {
    const apiUrl = `${getApiBaseUrl()}/api/life-story/${sessionId}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiData = await response.json();
    
    if (apiData.status === 'completed' && apiData.life_story_data) {
      return apiData.life_story_data;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching timeline data:', error);
    return null;
  }
}

/**
 * Create an emotive prompt from timeline data
 */
export function createEmotivePrompt(timelineData: TimelineData): string {
  const emotionalJourney = timelineData.emotional_journey;
  const lifeEvents = timelineData.life_events || [];
  
  // Extract dominant emotional themes
  const themes = emotionalJourney?.dominant_themes || [];
  
  // Map emotional themes to visual symbols and colors
  const visualElements: string[] = [];
  const colorPalette: string[] = [];
  
  themes.forEach(themeArray => {
    // Handle the case where theme is an array [theme_string, weight]
    const themeString = Array.isArray(themeArray) ? themeArray[0] : themeArray;
    
    if (typeof themeString !== 'string') {
      return;
    }
    
    const themeLower = themeString.toLowerCase();
    
    if (themeLower.includes('joy') || themeLower.includes('happiness') || themeLower.includes('celebration')) {
      visualElements.push('golden sunlight', 'blooming flowers', 'soaring birds');
      colorPalette.push('warm golden tones', 'bright yellows', 'vibrant oranges');
    }
    
    if (themeLower.includes('growth') || themeLower.includes('learning') || themeLower.includes('development')) {
      visualElements.push('growing trees', 'ascending stairs', 'emerging butterflies');
      colorPalette.push('fresh greens', 'earthy browns', 'sky blues');
    }
    
    if (themeLower.includes('challenge') || themeLower.includes('struggle') || themeLower.includes('difficulty')) {
      visualElements.push('stormy skies', 'rugged mountains', 'flowing rivers');
      colorPalette.push('deep grays', 'storm blues', 'silver highlights');
    }
    
    if (themeLower.includes('love') || themeLower.includes('connection') || themeLower.includes('relationship')) {
      visualElements.push('intertwining branches', 'warm embraces', 'connecting bridges');
      colorPalette.push('soft pinks', 'warm reds', 'gentle purples');
    }
    
    if (themeLower.includes('achievement') || themeLower.includes('success') || themeLower.includes('accomplishment')) {
      visualElements.push('shining stars', 'mountain peaks', 'golden crowns');
      colorPalette.push('brilliant golds', 'royal purples', 'shimmering silvers');
    }
    
    if (themeLower.includes('reflection') || themeLower.includes('contemplation') || themeLower.includes('wisdom')) {
      visualElements.push('calm lakes', 'ancient trees', 'peaceful meditation');
      colorPalette.push('serene blues', 'wise purples', 'tranquil whites');
    }
    
    if (themeLower.includes('transformation') || themeLower.includes('change') || themeLower.includes('evolution')) {
      visualElements.push('metamorphosis butterflies', 'phoenix rising', 'flowing transformations');
      colorPalette.push('transformative purples', 'phoenix oranges', 'evolving gradients');
    }
  });
  
  // Add some life event intensity
  const highIntensityEvents = lifeEvents.filter(event => 
    event.intensity && event.intensity > 7
  );
  
  if (highIntensityEvents.length > 0) {
    visualElements.push('dramatic lighting', 'powerful energy flows');
    colorPalette.push('intense contrasts', 'bold highlights');
  }
  
  // Fallback elements if no themes detected
  if (visualElements.length === 0) {
    visualElements.push('flowing abstract forms', 'gentle light rays', 'organic patterns');
    colorPalette.push('soft pastels', 'harmonious gradients');
  }
  
  const prompt = [
    'A symbolic artistic representation of a life journey,',
    visualElements.slice(0, 4).join(', '),
    ',',
    colorPalette.slice(0, 3).join(', '),
    ', ethereal and meaningful, digital art style, high quality, artistic composition'
  ].join(' ');
  
  return prompt;
}

/**
 * Generate and cache timeline image using Runware API
 */
export async function generateAndCacheTimelineImage(
  sessionId: string, 
  timelineData: TimelineData
): Promise<ImageGenerationResult> {
  try {
    // Check if we already have a cached image
    try {
      const cacheUrl = `${getApiBaseUrl()}/api/timeline-image/${sessionId}`;
      
      const cacheResponse = await fetch(cacheUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        
        if (cacheData.imageUrl) {
          return {
            success: true,
            imageUrl: cacheData.imageUrl,
            prompt: cacheData.prompt
          };
        }
      }
    } catch (cacheError) {
      // Continue with generation if cache check fails
    }
    
    // Generate new image
    const prompt = createEmotivePrompt(timelineData);
    
    // Call Runware API for image generation
    
    const runwareResponse = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RUNWARE_API_KEY || 'your-api-key-here'}`
      },
      body: JSON.stringify([{
        taskType: 'imageInference',
        taskUUID: uuidv4(),
        outputType: 'URL',
        outputFormat: 'JPG',
        positivePrompt: prompt,
        negativePrompt: 'blurry, low quality, distorted, ugly, bad anatomy, watermark, text, signature',
        height: 768,
        width: 1024,
        model: 'runware:102@1', // FLUX.1 schnell
        steps: 20,
        CFGScale: 7.0,
        numberResults: 1,
        seed: Math.floor(Math.random() * 1000000)
      }])
    });

    if (!runwareResponse.ok) {
      const errorText = await runwareResponse.text();
      console.error('🎨 Runware API error:', errorText);
      throw new Error(`Runware API error: ${runwareResponse.status} - ${errorText}`);
    }

    const runwareData = await runwareResponse.json();
    
    if (!runwareData.data || !runwareData.data[0] || !runwareData.data[0].imageURL) {
      console.error('🎨 Invalid Runware response format:', runwareData);
      throw new Error('Invalid response format from Runware API');
    }

    const imageUrl = runwareData.data[0].imageURL;
    
    // Cache the result
    try {
      const cacheUrl = `${getApiBaseUrl()}/api/timeline-image/${sessionId}`;
      
      const cachePayload = {
        imageUrl,
        prompt,
        generated_at: new Date().toISOString()
      };
      
      await fetch(cacheUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cachePayload)
      });
    } catch (cacheError) {
      // Don't fail the whole operation if caching fails
    }
    return {
      success: true,
      imageUrl,
      prompt
    };
    
  } catch (error) {
    console.error('❌ Timeline image generation failed:', error instanceof Error ? error.message : 'Unknown error');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 