import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AnalysisResult {
  id: string;
  sessionId: string;
  timestamp: number;
  userEmail: string;
  emotional?: any;
  personality?: any;
  triggers?: any;
  growth?: any;
  relationships?: any;
  language?: any;
  timelineEvents?: any;
  behavioralReflections?: any;
  metadata: {
    totalMessages: number;
    userName: string;
    processingTime: number;
    version: string;
  };
}

interface CognitionDB extends DBSchema {
  analysisResults: {
    key: string;
    value: AnalysisResult;
    indexes: { 'by-email': string; 'by-timestamp': number };
  };
  sessionData: {
    key: string;
    value: {
      sessionId: string;
      createdAt: number;
      lastAccessed: number;
      status: 'processing' | 'completed' | 'error';
      progress: number;
    };
  };
}

export class IndexedDBStorage {
  public db: IDBPDatabase<CognitionDB> | null = null;
  private readonly dbName = 'cognition-analyzer';
  private readonly version = 1;

  async initialize(): Promise<void> {
    this.db = await openDB<CognitionDB>(this.dbName, this.version, {
      upgrade(db) {
        // Create analysis results store
        if (!db.objectStoreNames.contains('analysisResults')) {
          const analysisStore = db.createObjectStore('analysisResults', {
            keyPath: 'id',
          });
          analysisStore.createIndex('by-email', 'userEmail');
          analysisStore.createIndex('by-timestamp', 'timestamp');
        }

        // Create session data store
        if (!db.objectStoreNames.contains('sessionData')) {
          db.createObjectStore('sessionData', {
            keyPath: 'sessionId',
          });
        }
      },
    });
  }

  async saveAnalysisResult(result: AnalysisResult): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('analysisResults', result);
  }

  async getAnalysisResult(id: string): Promise<AnalysisResult | undefined> {
    if (!this.db) await this.initialize();
    return await this.db!.get('analysisResults', id);
  }

  async getAnalysisByEmail(email: string): Promise<AnalysisResult[]> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('analysisResults', 'readonly');
    const index = tx.store.index('by-email');
    return await index.getAll(email);
  }

  async getAllAnalysisResults(): Promise<AnalysisResult[]> {
    if (!this.db) await this.initialize();
    return await this.db!.getAll('analysisResults');
  }

  async deleteAnalysisResult(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('analysisResults', id);
  }

  async saveSessionData(sessionId: string, status: string, progress: number): Promise<void> {
    if (!this.db) await this.initialize();
    
    const existingSession = await this.db!.get('sessionData', sessionId);
    
    await this.db!.put('sessionData', {
      sessionId,
      createdAt: existingSession?.createdAt || Date.now(),
      lastAccessed: Date.now(),
      status: status as any,
      progress,
    });
  }

  async getSessionData(sessionId: string): Promise<any> {
    if (!this.db) await this.initialize();
    return await this.db!.get('sessionData', sessionId);
  }

  async clearOldData(daysToKeep: number = 7): Promise<void> {
    if (!this.db) await this.initialize();
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Clear old analysis results
    const tx = this.db!.transaction('analysisResults', 'readwrite');
    const index = tx.store.index('by-timestamp');
    const oldResults = await index.getAllKeys(IDBKeyRange.upperBound(cutoffTime));
    
    for (const key of oldResults) {
      await tx.store.delete(key);
    }
    
    await tx.done;
  }

  async getTotalStorageSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize();
    
    const tx = this.db!.transaction(['analysisResults', 'sessionData'], 'readwrite');
    await Promise.all([
      tx.objectStore('analysisResults').clear(),
      tx.objectStore('sessionData').clear(),
    ]);
    await tx.done;
  }

  async clearAllExceptLatest(): Promise<void> {
    if (!this.db) await this.initialize();
    
    // Get all analysis results
    const allResults = await this.db!.getAll('analysisResults');
    
    if (allResults.length <= 1) {
      // Nothing to clear or only one session exists
      return;
    }
    
    // Sort by timestamp to find the latest
    allResults.sort((a, b) => b.timestamp - a.timestamp);
    
    // Keep only the latest result
    const latestResult = allResults[0];
    
    // Get session data BEFORE clearing
    const sessionData = await this.getSessionData(latestResult.sessionId);
    
    // Now clear all data
    const tx = this.db!.transaction(['analysisResults', 'sessionData'], 'readwrite');
    await Promise.all([
      tx.objectStore('analysisResults').clear(),
      tx.objectStore('sessionData').clear(),
    ]);
    
    // Re-add only the latest result
    await tx.objectStore('analysisResults').put(latestResult);
    
    // Also preserve its session data if it exists
    if (sessionData) {
      await tx.objectStore('sessionData').put(sessionData);
    }
    
    await tx.done;
    
    console.log(`🗑️ Cleared all sessions except the latest: ${latestResult.sessionId}`);
  }
}