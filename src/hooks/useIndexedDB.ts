import { logger } from '@/lib/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { IndexedDBStorage } from '@/lib/storage/indexed-db';

export function useIndexedDB() {
  const [storage, setStorage] = useState<IndexedDBStorage | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      try {
        const db = new IndexedDBStorage();
        await db.initialize();
        setStorage(db);
        setIsReady(true);
      } catch (err) {
        setError(err as Error);
        logger.error('Failed to initialize IndexedDB:', err);
      }
    };

    initStorage();
  }, []);

  const saveResults = useCallback(async (results: any) => {
    logger.debug('💾 [useIndexedDB] saveResults called with:', {
      hasStorage: !!storage,
      sessionId: results.sessionId,
      hasEmotional: !!results.emotional,
      emotionalWeeks: results.emotional?.weeklyAnalyses?.length,
      hasTriggers: !!results.triggers,
      hasPersonality: !!results.personality,
      hasTimelineEvents: !!results.timelineEvents,
      timelineEventsCount: results.timelineEvents?.lifeEvents?.length,
      hasBehavioralReflections: !!results.behavioralReflections,
      behavioralReflectionsCount: results.behavioralReflections?.habitImpacts?.length
    });
    
    if (!storage) throw new Error('Storage not initialized');
    
    // Use sessionId as the ID for easy lookup
    const resultId = results.sessionId || `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const dataToSave = {
      id: resultId,
      sessionId: results.sessionId,
      timestamp: Date.now(),
      userEmail: results.userEmail || 'anonymous',
      emotional: results.emotional,
      personality: results.personality,
      triggers: results.triggers,
      growth: results.growth,
      relationships: results.relationships,
      language: results.language,
      timelineEvents: results.timelineEvents,
      behavioralReflections: results.behavioralReflections,
      metadata: {
        totalMessages: results.totalMessages || 0,
        userName: results.userName || 'User',
        processingTime: results.processingTime || 0,
        version: '2.0',
      },
    };
    
    logger.debug('💾 [useIndexedDB] Saving to IndexedDB with ID:', resultId);
    
    try {
      await storage.saveAnalysisResult(dataToSave);
      logger.debug('✅ [useIndexedDB] Save successful!');
    } catch (err: any) {
      logger.error('❌ [useIndexedDB] Save failed:', err);
      
      // Check if it's a quota exceeded error
      if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
        logger.debug('🧹 [useIndexedDB] Quota exceeded, clearing old sessions...');
        
        try {
          // Clear all sessions except the latest one (which we haven't saved yet)
          await storage.clearAllData();
          
          // Try saving again
          logger.debug('🔄 [useIndexedDB] Retrying save after clearing old data...');
          await storage.saveAnalysisResult(dataToSave);
          logger.debug('✅ [useIndexedDB] Save successful after clearing old data!');
        } catch (retryErr) {
          logger.error('❌ [useIndexedDB] Save failed even after clearing data:', retryErr);
          throw new Error('Unable to save analysis results. Please clear your browser data and try again.');
        }
      } else {
        // Re-throw other errors
        throw err;
      }
    }
    
    // After successful save, clear all other sessions to maintain only one
    try {
      logger.debug('🧹 [useIndexedDB] Clearing old sessions to keep only the latest...');
      await storage.clearAllExceptLatest();
    } catch (cleanupErr) {
      // Don't fail the save operation if cleanup fails
      logger.warn('⚠️ [useIndexedDB] Failed to clear old sessions:', cleanupErr);
    }
    
    return resultId;
  }, [storage]);

  const getResults = useCallback(async (id: string) => {
    if (!storage) throw new Error('Storage not initialized');
    return await storage.getAnalysisResult(id);
  }, [storage]);

  const updateSessionProgress = useCallback(async (sessionId: string, progress: number, status: string = 'processing') => {
    if (!storage) throw new Error('Storage not initialized');
    await storage.saveSessionData(sessionId, status, progress);
  }, [storage]);

  const clearOldData = useCallback(async (daysToKeep: number = 7) => {
    if (!storage) throw new Error('Storage not initialized');
    await storage.clearOldData(daysToKeep);
  }, [storage]);

  return {
    isReady,
    error,
    saveResults,
    getResults,
    updateSessionProgress,
    clearOldData,
  };
}