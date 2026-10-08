/**
 * Enhanced JSON parser that handles truncated responses from AI models
 * Specifically designed to recover partial data from incomplete JSON
 */

interface TruncationRecoveryResult {
  data: any;
  isPartial: boolean;
  recoveredItems?: number;
  totalExpected?: number;
}

/**
 * Attempts to recover as much data as possible from truncated JSON
 */
export function recoverTruncatedJSON(jsonStr: string): TruncationRecoveryResult {
  // Try to identify the structure and recover what we can
  const trimmed = jsonStr.trim();
  
  // Handle truncated object with events array
  if (trimmed.includes('"events"') && trimmed.includes('"chapters"')) {
    return recoverTimelineEvents(trimmed);
  }
  
  // Handle truncated array
  if (trimmed.startsWith('[')) {
    return recoverArray(trimmed);
  }
  
  // Handle truncated object
  if (trimmed.startsWith('{')) {
    return recoverObject(trimmed);
  }
  
  throw new Error('Unable to identify JSON structure for recovery');
}

/**
 * Specifically handles timeline events structure recovery
 */
function recoverTimelineEvents(jsonStr: string): TruncationRecoveryResult {
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
  
  // Extract events array
  const eventsStart = jsonStr.indexOf('"events"');
  if (eventsStart !== -1) {
    const eventsArrayStart = jsonStr.indexOf('[', eventsStart);
    if (eventsArrayStart !== -1) {
      const eventsSubstr = jsonStr.substring(eventsArrayStart);
      
      // Find complete event objects
      const eventPattern = /\{[^{}]*"id"\s*:\s*"[^"]+"\s*,[^{}]*\}/g;
      let eventMatches = eventsSubstr.match(eventPattern) || [];
      
      // Also try a more flexible pattern for partially complete events
      if (eventMatches.length === 0) {
        const partialEventPattern = /\{[^{}]*"id"\s*:\s*"[^"]+"[^{}]*\}/g;
        eventMatches = eventsSubstr.match(partialEventPattern) || [];
      }
      
      for (const eventMatch of eventMatches) {
        try {
          // Try to complete the JSON if it's missing closing braces
          let eventJson = eventMatch;
          
          // Count braces to see if we need to add closing ones
          const openBraces = (eventJson.match(/\{/g) || []).length;
          const closeBraces = (eventJson.match(/\}/g) || []).length;
          
          if (openBraces > closeBraces) {
            // Try to intelligently close the JSON
            // First, check if we're in the middle of a string
            const lastQuoteIndex = eventJson.lastIndexOf('"');
            const lastCommaIndex = eventJson.lastIndexOf(',');
            
            if (lastQuoteIndex > lastCommaIndex) {
              // We might be in the middle of a string value
              // Find the property name to close it properly
              const propMatch = eventJson.match(/"(\w+)"\s*:\s*"[^"]*$/);
              if (propMatch) {
                eventJson += '"';
              }
            }
            
            // Add closing braces
            eventJson += '}'.repeat(openBraces - closeBraces);
          }
          
          const event = JSON.parse(eventJson);
          
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
          console.warn('Failed to parse event:', eventMatch, e);
        }
      }
    }
  }
  
  // Try to estimate total events from any numbering in IDs
  let totalExpected = result.events.length;
  const lastEvent = result.events[result.events.length - 1];
  if (lastEvent?.id) {
    const idMatch = lastEvent.id.match(/(\d+)$/);
    if (idMatch) {
      totalExpected = Math.max(totalExpected, parseInt(idMatch[1]));
    }
  }
  
  return {
    data: result,
    isPartial: true,
    recoveredItems: result.events.length,
    totalExpected
  };
}

/**
 * Recovers data from a truncated array
 */
function recoverArray(jsonStr: string): TruncationRecoveryResult {
  const items: any[] = [];
  
  // Try to find complete objects within the array
  const objectPattern = /\{[^{}]*\}/g;
  const matches = jsonStr.match(objectPattern) || [];
  
  for (const match of matches) {
    try {
      items.push(JSON.parse(match));
    } catch (e) {
      // Try to fix common issues
      let fixed = match;
      
      // Add missing quotes
      fixed = fixed.replace(/(\w+):/g, '"$1":');
      
      // Try again
      try {
        items.push(JSON.parse(fixed));
      } catch (e2) {
        console.warn('Could not parse array item:', match);
      }
    }
  }
  
  return {
    data: items,
    isPartial: true,
    recoveredItems: items.length
  };
}

/**
 * Recovers data from a truncated object
 */
function recoverObject(jsonStr: string): TruncationRecoveryResult {
  const result: any = {};
  
  // Extract complete key-value pairs
  // Handle string values
  const stringPairs = jsonStr.match(/"([^"]+)"\s*:\s*"([^"]*)"/g) || [];
  for (const pair of stringPairs) {
    const match = pair.match(/"([^"]+)"\s*:\s*"([^"]*)"/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  
  // Handle number values
  const numberPairs = jsonStr.match(/"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)/g) || [];
  for (const pair of numberPairs) {
    const match = pair.match(/"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)/);
    if (match) {
      result[match[1]] = parseFloat(match[2]);
    }
  }
  
  // Handle boolean values
  const boolPairs = jsonStr.match(/"([^"]+)"\s*:\s*(true|false)/g) || [];
  for (const pair of boolPairs) {
    const match = pair.match(/"([^"]+)"\s*:\s*(true|false)/);
    if (match) {
      result[match[1]] = match[2] === 'true';
    }
  }
  
  // Handle nested objects (simplified - only one level deep)
  const objectPairs = jsonStr.match(/"([^"]+)"\s*:\s*\{[^{}]*\}/g) || [];
  for (const pair of objectPairs) {
    const match = pair.match(/"([^"]+)"\s*:\s*(\{[^{}]*\})/);
    if (match) {
      try {
        result[match[1]] = JSON.parse(match[2]);
      } catch (e) {
        console.warn('Could not parse nested object');
      }
    }
  }
  
  return {
    data: result,
    isPartial: true,
    recoveredItems: Object.keys(result).length
  };
}

/**
 * Enhanced JSON extraction that handles truncation gracefully
 */
export function extractJSONEnhanced(response: string): any {
  // First try the standard extraction
  try {
    // Quick check if it looks like complete JSON
    const trimmed = response.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return JSON.parse(trimmed);
    }
  } catch (e) {
    // Continue to recovery
  }
  
  // Try markdown extraction
  if (response.includes('```')) {
    const patterns = [
      /```(?:json)?\s*\n([\s\S]*?)(?:\n```|$)/,  // May not have closing ```
      /```(?:json)?\s*([\s\S]*?)(?:```|$)/,      // No newlines version
    ];
    
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        
        // Try standard parse first
        try {
          return JSON.parse(extracted);
        } catch (e) {
          // Try recovery
          try {
            const recovered = recoverTruncatedJSON(extracted);
            if (recovered.isPartial) {
              console.warn(`⚠️ Recovered partial JSON: ${recovered.recoveredItems} items${recovered.totalExpected ? ` out of ~${recovered.totalExpected}` : ''}`);
            }
            return recovered.data;
          } catch (e2) {
            // Continue to next pattern
          }
        }
      }
    }
  }
  
  // Remove common prefixes and try again
  let cleaned = response.trim();
  const prefixPatterns = [
    /^.*?(?=\{)/s,  // Everything before first {
    /^.*?(?=\[)/s,  // Everything before first [
  ];
  
  for (const pattern of prefixPatterns) {
    const cleanedVersion = cleaned.replace(pattern, '').trim();
    if (cleanedVersion !== cleaned) {
      try {
        return JSON.parse(cleanedVersion);
      } catch (e) {
        // Try recovery
        try {
          const recovered = recoverTruncatedJSON(cleanedVersion);
          if (recovered.isPartial) {
            console.warn(`⚠️ Recovered partial JSON: ${recovered.recoveredItems} items`);
          }
          return recovered.data;
        } catch (e2) {
          // Continue
        }
      }
    }
  }
  
  // Last resort - try to recover what we can
  try {
    const recovered = recoverTruncatedJSON(response);
    console.warn('⚠️ Used truncation recovery - data may be incomplete');
    return recovered.data;
  } catch (e) {
    // If all else fails, throw the error
    throw new Error(`Failed to extract valid JSON from response. The response appears to be truncated or malformed.`);
  }
}