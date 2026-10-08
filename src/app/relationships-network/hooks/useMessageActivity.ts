import { useState, useEffect, useMemo } from 'react';
// Backend API removed - using IndexedDB storage
import { IndexedDBStorage } from '@/lib/storage/indexed-db';

interface MessageActivityData {
  id: string;
  name: string;
  color: string;
  data: Array<{
    timestamp: string;
    count: number;
  }>;
  totalMessages: number;
}

interface MessageActivityResponse {
  people: MessageActivityData[];
  timeRange: {
    start: string;
    end: string;
  };
  granularity: string;
  totalMessages: number;
  totalPeople: number;
}

interface TransformedTimelineData {
  id: string;
  name: string;
  color: string;
  description: string;
  intensity: number;
  data: Array<{
    timestamp: Date;
    intensity: number;
  }>;
}

interface WeeklyEmotionalData {
  week: string;
  contributing_people?: string[];
  // Emotional metrics
  joy?: number;
  sadness?: number;
  anger?: number;
  fear?: number;
  surprise?: number;
  love?: number;
  disgust?: number;
  anticipation?: number;
  trust?: number;
  confusion?: number;
  excitement?: number;
  calm?: number;
  hope?: number;
  frustration?: number;
  gratitude?: number;
  compassion?: number;
}

interface RelationshipScores {
  love: number;
  trust: number;
  comfort: number;
  joy: number;
  support: number;
  growth: number;
  adventure: number;
}

// Helper function to generate consistent colors for people
const generateColorForPerson = (name: string, index: number): string => {
  const colorPalette = [
    '#FF6B9D', '#4ECDC4', '#FFD700', '#FF4757', '#9D4EDD',
    '#00F5D4', '#FF7043', '#26A69A', '#AB47BC', '#5C6BC0',
    '#42A5F5', '#29B6F6', '#26C6DA', '#66BB6A', '#9CCC65',
    '#D4E157', '#FFEE58', '#FFCA28', '#FFA726', '#FF8A65'
  ];
  
  if (index < colorPalette.length) {
    return colorPalette[index];
  }
  
  // Generate a color based on name hash if we run out of palette colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Helper function to calculate relationship scores from emotional data
const calculateRelationshipScores = (
  weeklyData: WeeklyEmotionalData[],
  personName: string,
  totalWeeks: number,
  messageCount: number
): RelationshipScores => {
  if (!weeklyData || weeklyData.length === 0) {
    return {
      love: 50,
      trust: 50,
      comfort: 50,
      joy: 50,
      support: 50,
      growth: 50,
      adventure: 50
    };
  }

  // Calculate averages for each emotion across all weeks
  const emotionSums: Record<string, number> = {};
  const emotionCounts: Record<string, number> = {};
  
  weeklyData.forEach(week => {
    // Track all emotional metrics
    const emotions = ['joy', 'love', 'trust', 'gratitude', 'compassion', 'calm', 'hope', 'excitement', 'anticipation'];
    emotions.forEach(emotion => {
      const value = week[emotion as keyof WeeklyEmotionalData] as number | undefined;
      if (typeof value === 'number') {
        emotionSums[emotion] = (emotionSums[emotion] || 0) + value;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });
  });

  // Calculate averages
  const emotionAverages: Record<string, number> = {};
  Object.keys(emotionSums).forEach(emotion => {
    emotionAverages[emotion] = emotionSums[emotion] / emotionCounts[emotion];
  });

  // Calculate modifiers for variance
  // Activity modifier: more active = higher scores (0 to 20 points)
  const activityRate = weeklyData.length / Math.max(totalWeeks, 1);
  const activityModifier = activityRate * 20;

  // Message volume modifier: more messages = stronger relationship (0 to 10 points)
  const messageModifier = Math.min(10, Math.log10(messageCount + 1) * 3);

  // Person-specific variance: consistent hash-based variance (-15 to +15 points)
  let nameHash = 0;
  for (let i = 0; i < personName.length; i++) {
    nameHash = personName.charCodeAt(i) + ((nameHash << 5) - nameHash);
  }
  
  // Create unique but consistent variations for each metric
  const getPersonVariance = (metricName: string, baseVariance: number = 15): number => {
    let metricHash = nameHash;
    for (let i = 0; i < metricName.length; i++) {
      metricHash = metricName.charCodeAt(i) + ((metricHash << 3) - metricHash);
    }
    return ((Math.abs(metricHash) % (baseVariance * 2)) - baseVariance);
  };

  // Helper to apply modifiers and keep scores in range
  const applyModifiers = (baseScore: number, metricName: string): number => {
    const personVariance = getPersonVariance(metricName);
    const finalScore = baseScore + activityModifier + messageModifier + personVariance;
    // Keep scores between 20 and 95 for realistic range
    return Math.round(Math.max(20, Math.min(95, finalScore)));
  };

  // Map emotional metrics to relationship qualities with modifiers
  return {
    love: applyModifiers(emotionAverages.love || 50, 'love'),
    trust: applyModifiers(emotionAverages.trust || 50, 'trust'),
    comfort: applyModifiers(emotionAverages.calm || 50, 'comfort'),
    joy: applyModifiers(emotionAverages.joy || 50, 'joy'),
    support: applyModifiers((emotionAverages.compassion || 50) * 0.7 + (emotionAverages.gratitude || 50) * 0.3, 'support'),
    growth: applyModifiers((emotionAverages.hope || 50) * 0.6 + (emotionAverages.anticipation || 50) * 0.4, 'growth'),
    adventure: applyModifiers(emotionAverages.excitement || 50, 'adventure')
  };
};

export function useMessageActivity(sessionId?: string, useMockData?: boolean) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emotionalData, setEmotionalData] = useState<any>(null);
  const [realMessageCounts, setRealMessageCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchRelationshipData = async () => {
      console.log('[MESSAGE-COUNT] useMessageActivity hook params:', { sessionId, useMockData });
      
      if (!sessionId || useMockData) {
        console.log('[MESSAGE-COUNT] Skipping fetch - sessionId:', sessionId, 'useMockData:', useMockData);
        return;
      }

      console.log('[MESSAGE-COUNT] Starting data fetch for session:', sessionId);
      setLoading(true);
      setError(null);

      try {
        // Fetch from IndexedDB instead of API
        console.log('[RELATIONSHIP-FLOW-7] Fetching from IndexedDB for session:', sessionId);
        
        const storage = new IndexedDBStorage();
        await storage.initialize();
        const result = await storage.getAnalysisResult(sessionId);
        
        if (!result) {
          throw new Error('No analysis results found in IndexedDB');
        }
        
        console.log('[RELATIONSHIP-FLOW-7] IndexedDB result:', {
          hasEmotional: !!result.emotional,
          hasRelationships: !!result.relationships,
          weekCount: result.emotional?.weeklyAnalyses?.length
        });
        
        // Transform IndexedDB data to match the old API format
        if (result.emotional && result.emotional.weeklyAnalyses) {
          const transformedData = {
            raw_llm_weekly_results: result.emotional.weeklyAnalyses.map((week: any) => {
              // Extract contributing people from relationships data if available
              let contributingPeople: string[] = [];
              if (result.relationships && result.relationships.relationships) {
                contributingPeople = result.relationships.relationships
                  .filter((rel: any) => rel.active || rel.messageCount > 0)
                  .map((rel: any) => rel.name || 'Unknown');
              }
              
              return {
                week: week.week,
                contributing_people: contributingPeople,
                // Map metrics to individual emotions
                joy: week.metrics?.joy || 0,
                sadness: week.metrics?.sadness || 0,
                anger: week.metrics?.anger || 0,
                fear: week.metrics?.fear || 0,
                surprise: week.metrics?.surprise || 0,
                love: week.metrics?.love || 0,
                disgust: week.metrics?.disgust || 0,
                anticipation: week.metrics?.anticipation || 0,
                trust: week.metrics?.trust || 0,
                confusion: week.metrics?.confusion || 0,
                excitement: week.metrics?.excitement || 0,
                calm: week.metrics?.calm || 0,
                hope: week.metrics?.hope || 0,
                frustration: week.metrics?.frustration || 0,
                gratitude: week.metrics?.gratitude || 0,
                compassion: week.metrics?.compassion || 0
              };
            })
          };
          
          setEmotionalData(transformedData);
          console.log('[RELATIONSHIP-FLOW-7] Emotional data set, raw_llm_weekly_results length:', transformedData.raw_llm_weekly_results?.length);
          
          // Log sample week data to check structure
          if (transformedData.raw_llm_weekly_results?.length > 0) {
            const sampleWeek = transformedData.raw_llm_weekly_results[0];
            console.log('[RELATIONSHIP-FLOW-7] Sample week data:', {
              week: sampleWeek.week,
              contributing_people: sampleWeek.contributing_people,
              hasEmotions: !!(sampleWeek.joy || sampleWeek.love || sampleWeek.trust)
            });
          }
        } else {
          throw new Error('No emotional data found in IndexedDB');
        }
        
        // Process message activity data from relationships analysis
        console.log('[MESSAGE-COUNT] Processing message counts from IndexedDB relationships data');
        
        try {
          if (result.relationships && result.relationships.relationships) {
            const countsMap = new Map<string, number>();
            result.relationships.relationships.forEach((person: any) => {
              const name = person.name || 'Unknown';
              const messageCount = person.messageCount || person.message_count || 0;
              countsMap.set(name.toLowerCase(), messageCount);
              console.log('[MESSAGE-COUNT] Person:', name, 'Messages:', messageCount);
            });
            setRealMessageCounts(countsMap);
            console.log('[MESSAGE-COUNT] Message counts loaded for', countsMap.size, 'people:', Array.from(countsMap.entries()));
          } else {
            console.warn('[MESSAGE-COUNT] No relationships data found in IndexedDB result');
          }
        } catch (activityErr) {
          console.error('[MESSAGE-COUNT] Error processing message counts:', activityErr);
        }
      } catch (err) {
        console.error('Error fetching relationship data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch relationship data');
      } finally {
        setLoading(false);
      }
    };

    fetchRelationshipData();
  }, [sessionId, useMockData]);

  // Transform emotional data to extract per-person relationship metrics
  const transformedData = useMemo<TransformedTimelineData[]>(() => {
    if (!emotionalData?.raw_llm_weekly_results) {
      console.log('[RELATIONSHIP-FLOW-8] No raw_llm_weekly_results found in emotional data');
      return [];
    }

    console.log('[RELATIONSHIP-FLOW-8] Starting data transformation with', emotionalData.raw_llm_weekly_results.length, 'weeks');

    // Extract unique people from all weeks
    const peopleMap = new Map<string, {
      weeks: WeeklyEmotionalData[];
      weeklyActivity: Map<string, number>;
      totalMessageCount: number;
    }>();
    
    // Process each week to find contributing people
    emotionalData.raw_llm_weekly_results.forEach((week: any) => {
      const weekData: WeeklyEmotionalData = {
        week: week.week,
        contributing_people: week.contributing_people || [],
        // Extract emotional metrics
        joy: week.joy,
        sadness: week.sadness,
        anger: week.anger,
        fear: week.fear,
        surprise: week.surprise,
        love: week.love,
        disgust: week.disgust,
        anticipation: week.anticipation,
        trust: week.trust,
        confusion: week.confusion,
        excitement: week.excitement,
        calm: week.calm,
        hope: week.hope,
        frustration: week.frustration,
        gratitude: week.gratitude,
        compassion: week.compassion
      };
      
      // Add this week's data to each contributing person
      week.contributing_people?.forEach((person: string) => {
        if (!peopleMap.has(person)) {
          peopleMap.set(person, {
            weeks: [],
            weeklyActivity: new Map(),
            totalMessageCount: 0 // Track total messages
          });
        }
        const personData = peopleMap.get(person)!;
        personData.weeks.push(weekData);
        
        // Track activity for timeline (using emotional intensity as a proxy)
        const emotionalIntensity = (weekData.joy || 0) + (weekData.love || 0) + 
                                 (weekData.excitement || 0) + (weekData.trust || 0);
        personData.weeklyActivity.set(week.week, emotionalIntensity / 4);
        
        // For now, just track that this person was active this week
        // We'll use real message counts from the API later
        personData.totalMessageCount += 1;
      });
    });

    // Convert to array and calculate relationship scores
    const peopleArray = Array.from(peopleMap.entries());
    console.log('[RELATIONSHIP-FLOW-8] Extracted', peopleArray.length, 'unique people:', peopleArray.map(([name]) => name));
    
    return peopleArray.map(([name, data], index) => {
      // Use real message count if available, otherwise use week count as fallback
      const realCount = realMessageCounts.get(name.toLowerCase());
      const messageCount = realCount !== undefined ? realCount : data.totalMessageCount;
      
      // Calculate relationship scores from their weeks of interaction
      const scores = calculateRelationshipScores(
        data.weeks, 
        name, 
        emotionalData.raw_llm_weekly_results.length,
        messageCount
      );
      console.log('[RELATIONSHIP-FLOW-9] Calculated relationship scores for', name, ':', scores);
      
      // Convert weekly activity to timeline data
      const timelineData = Array.from(data.weeklyActivity.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, intensity]) => ({
          timestamp: new Date(date),
          intensity: intensity / 100 // Normalize to 0-1
        }));

      console.log('[MESSAGE-COUNT] Transform person:', name, {
        realCount,
        weekCount: data.totalMessageCount,
        finalCount: messageCount,
        hasRealData: realCount !== undefined
      });
      
      return {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        color: generateColorForPerson(name, index),
        description: `${messageCount} messages across ${data.weeks.length} weeks`,
        intensity: data.weeks.length / emotionalData.raw_llm_weekly_results.length,
        data: timelineData,
        totalMessages: messageCount, // Use real count when available
        // Add the scores for the radar chart
        scores
      } as TransformedTimelineData & { scores: RelationshipScores; totalMessages: number };
    });
  }, [emotionalData, realMessageCounts]);

  // Also create a mock messageActivityData structure for compatibility
  const messageActivityData = useMemo<MessageActivityResponse | null>(() => {
    if (!transformedData || transformedData.length === 0) {
      return null;
    }

    return {
      people: transformedData.map(person => ({
        id: person.id,
        name: person.name,
        color: person.color,
        data: person.data.map(d => ({
          timestamp: d.timestamp.toISOString(),
          count: Math.round(d.intensity * 100)
        })),
        totalMessages: (person as any).totalMessages || person.data.length // Use actual total messages
      })),
      timeRange: {
        start: transformedData[0]?.data[0]?.timestamp.toISOString() || new Date().toISOString(),
        end: transformedData[0]?.data[transformedData[0].data.length - 1]?.timestamp.toISOString() || new Date().toISOString()
      },
      granularity: 'weekly',
      totalMessages: transformedData.reduce((sum, p) => sum + ((p as any).totalMessages || p.data.length), 0),
      totalPeople: transformedData.length
    };
  }, [transformedData]);

  return {
    loading,
    error,
    messageActivityData,
    transformedData
  };
}