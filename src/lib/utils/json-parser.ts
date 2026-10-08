/**
 * Utility for safely parsing JSON responses from AI models
 * Handles cases where the model returns explanatory text along with JSON
 */

/**
 * Specifically handles timeline events structure recovery for truncated responses
 */
function recoverTimelineEvents(jsonStr: string): any {
  const result: any = {
    chapters: {},
    events: []
  };
  
  // Extract chapters if available
  const chaptersMatch = jsonStr.match(/"chapters"\s*:\s*\{([^}]*)\}/);
  if (chaptersMatch) {
    try {
      result.chapters = JSON.parse(`{${chaptersMatch[1]}}`);
    } catch (e) {
      // Try to extract individual chapter entries
      const chapterPattern = /"([^"]+)"\s*:\s*"([^"]*)"/g;
      let match;
      while ((match = chapterPattern.exec(chaptersMatch[1])) !== null) {
        result.chapters[match[1]] = match[2];
      }
    }
  }
  
  // Extract events array - look for complete event objects
  const eventsStart = jsonStr.indexOf('"events"');
  if (eventsStart !== -1) {
    const eventsArrayStart = jsonStr.indexOf('[', eventsStart);
    if (eventsArrayStart !== -1) {
      const eventsSubstr = jsonStr.substring(eventsArrayStart);
      
      // Find complete event objects with all required fields
      const eventPattern = /\{[^{}]*"id"\s*:\s*"[^"]+"\s*,\s*"title"\s*:\s*"[^"]+"\s*,\s*"time"\s*:\s*"[^"]+"\s*,\s*"day"\s*:\s*"[^"]+"\s*,\s*"emotion"\s*:\s*"[^"]+"\s*,\s*"intensity"\s*:\s*\d+[^{}]*\}/g;
      let eventMatches = eventsSubstr.match(eventPattern) || [];
      
      // Also try a more flexible pattern for partially complete events
      if (eventMatches.length === 0) {
        const partialEventPattern = /\{[^{}]*"id"\s*:\s*"[^"]+"[^{}]*"title"\s*:\s*"[^"]+"[^{}]*\}/g;
        eventMatches = eventsSubstr.match(partialEventPattern) || [];
      }
      
      for (const eventMatch of eventMatches) {
        try {
          const event = JSON.parse(eventMatch);
          
          // Ensure required fields have defaults
          result.events.push({
            id: event.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: event.title || 'Life Event',
            time: event.time || 'Unknown Date',
            day: event.day || Object.keys(result.chapters)[0] || 'Life Journey',
            emotion: event.emotion || 'growth',
            intensity: event.intensity || 5,
            description: event.description || 'A moment in the journey.'
          });
        } catch (e) {
          console.warn('Failed to parse event:', eventMatch);
        }
      }
    }
  }
  
  console.warn(`⚠️ Recovered partial timeline data: ${result.events.length} events from truncated response`);
  return result;
}

export function extractJSON(response: string): any {
  // Early return for empty/null responses
  if (!response || typeof response !== 'string') {
    throw new Error('Invalid response: expected non-empty string');
  }

  // First try to parse as-is (fastest path)
  try {
    return JSON.parse(response);
  } catch (e) {
    // Continue to extraction logic
  }

  let jsonStr = response.trim();

  // Remove BOM if present
  if (jsonStr.charCodeAt(0) === 0xFEFF) {
    jsonStr = jsonStr.slice(1);
  }

  // Handle markdown code blocks (most common issue with Gemini)
  if (jsonStr.includes('```')) {
    // Method 1: Extract content between ``` markers (handles multi-line)
    const patterns = [
      /```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```/,  // Standard format
      /```(?:json)?\s*\n([\s\S]*?)\n```/,        // Unix line endings
      /```(?:json)?\s*([\s\S]*?)```/,            // No newlines
      /^```(?:json)?\s*\r?\n([\s\S]*?)$/m,       // Unclosed block
    ];

    for (const pattern of patterns) {
      const match = jsonStr.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        try {
          return JSON.parse(extracted);
        } catch (e) {
          // Try next pattern
        }
      }
    }

    // Method 2: Strip markdown markers
    jsonStr = jsonStr
      .replace(/^[\s\S]*?```(?:json)?\s*\r?\n/i, '') // Remove everything before and including opening ```
      .replace(/\r?\n```[\s\S]*?$/i, '')             // Remove closing ``` and everything after
      .replace(/```/g, '')                           // Remove any remaining ```
      .trim();

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // Continue to other strategies
    }
  }

  // Remove common AI response prefixes
  const prefixPatterns = [
    /^Here(?:'s| is)[\s\S]*?:/i,
    /^The JSON[\s\S]*?:/i,
    /^Output[\s\S]*?:/i,
    /^Response[\s\S]*?:/i,
    /^Result[\s\S]*?:/i,
    /^[\s\S]*?returns?:\s*/i,
    /^[\s\S]*?output:\s*/i,
  ];

  for (const pattern of prefixPatterns) {
    if (pattern.test(jsonStr)) {
      jsonStr = jsonStr.replace(pattern, '').trim();
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        // Continue
      }
    }
  }

  // Try multiple extraction strategies

  // Strategy 1: Look for JSON object pattern
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 2: Look for JSON array pattern
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Extract between first { and last }
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const extracted = jsonStr.substring(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 4: Remove common prefixes and clean up responses
  const additionalPrefixPatterns = [
    /^.*?(?=\{)/s,  // Everything before first {
    /^Here's.*?:/is,
    /^This.*?:/is,
    /^The.*?:/is,
    /^I.*?:/is,
    /Error:.*?{/is,  // Remove "Error:" text before JSON
    /Error:.*?\[/is,  // Remove "Error:" text before arrays
  ];

  for (const pattern of additionalPrefixPatterns) {
    const cleaned = jsonStr.replace(pattern, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Continue
    }
  }

  // Strategy 5: Clean up any "Error:" text inside the JSON
  const cleanedJson = jsonStr.replace(/Error:/g, '').replace(/Error/g, '');
  try {
    return JSON.parse(cleanedJson);
  } catch (e) {
    // Continue to next strategy
  }

  // Last resort: Check if the response looks like it might be truncated JSON
  // This can happen with very long responses
  if (jsonStr.trim().startsWith('[') || jsonStr.trim().startsWith('{')) {
    // Try to find a complete JSON structure even if truncated
    try {
      // For arrays, try to close it properly
      if (jsonStr.trim().startsWith('[')) {
        // Find the last complete object
        const lastCompleteObject = jsonStr.lastIndexOf('},');
        if (lastCompleteObject > 0) {
          const truncatedJson = jsonStr.substring(0, lastCompleteObject + 1) + ']';
          return JSON.parse(truncatedJson);
        }
      }

      // For objects, try to close it properly
      if (jsonStr.trim().startsWith('{')) {
        // Special handling for timeline events structure
        if (jsonStr.includes('"events"') && jsonStr.includes('"chapters"')) {
          return recoverTimelineEvents(jsonStr);
        }
        
        // Check if we have at least one complete property
        const hasProperty = jsonStr.includes(':');
        if (hasProperty) {
          // Try adding closing braces
          let attempts = [jsonStr + '}', jsonStr + '"}', jsonStr + '"}}', jsonStr + '}]}'];
          for (const attempt of attempts) {
            try {
              return JSON.parse(attempt);
            } catch (e) {
              // Continue
            }
          }
        }
      }
    } catch (e) {
      // Fall through to error
    }
  }

  // If all strategies fail, throw error with helpful context
  console.error('🚨 All JSON extraction strategies failed');
  console.error('📄 Full response:', response);
  throw new Error(`Failed to extract valid JSON from response. Preview: ${response.substring(0, 200)}...`);
}

/**
 * Safely parse JSON with a fallback value
 */
export function parseJSONSafe<T>(response: string, fallback: T): T {
  try {
    return extractJSON(response);
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return fallback;
  }
}