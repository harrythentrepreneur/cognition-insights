import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WhatsAppMessage } from '../parsers/whatsapp-parser';

export interface AnalysisSegment {
  id: string; // unique identifier
  sessionId: string;
  analyzerType: string;
  weekStart: string;
  weekEnd: string;
  messages: WhatsAppMessage[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  result?: any;
  createdAt: number;
  lastUpdated: number;
}

export interface AnalysisSession {
  sessionId: string;
  userName: string;
  totalMessages: number;
  totalSegments: number;
  completedSegments: number;
  failedSegments: string[]; // segment IDs
  status: 'processing' | 'completed' | 'partial' | 'failed';
  createdAt: number;
  lastUpdated: number;
}

export interface AnalysisResult {
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
    completionStatus?: {
      total: number;
      completed: number;
      failed: number;
      gaps: Array<{ start: string; end: string; reason: string }>;
    };
  };
}

interface EnhancedCognitionDB extends DBSchema {
  analysisResults: {
    key: string;
    value: AnalysisResult;
    indexes: { 'by-email': string; 'by-timestamp': number };
  };
  sessionData: {
    key: string;
    value: AnalysisSession;
    indexes: { 'by-status': string; 'by-updated': number };
  };
  segmentQueue: {
    key: string; // segment ID
    value: AnalysisSegment;
    indexes: { 
      'by-session': string; 
      'by-status': string;
      'by-retry-priority': number; // retryCount + lastUpdated
      'by-analyzer': [string, string]; // [sessionId, analyzerType]
    };
  };
}

export class EnhancedIndexedDBStorage {
  public db: IDBPDatabase<EnhancedCognitionDB> | null = null;
  private readonly dbName = 'cognition-analyzer-enhanced';
  private readonly version = 2;

  async initialize(): Promise<void> {
    this.db = await openDB<EnhancedCognitionDB>(this.dbName, this.version, {
      upgrade(db) {
        // Create or update analysis results store
        if (!db.objectStoreNames.contains('analysisResults')) {
          const analysisStore = db.createObjectStore('analysisResults', {
            keyPath: 'id',
          });
          analysisStore.createIndex('by-email', 'userEmail');
          analysisStore.createIndex('by-timestamp', 'timestamp');
        }

        // Create or update session data store
        if (!db.objectStoreNames.contains('sessionData')) {
          const sessionStore = db.createObjectStore('sessionData', {
            keyPath: 'sessionId',
          });
          sessionStore.createIndex('by-status', 'status');
          sessionStore.createIndex('by-updated', 'lastUpdated');
        }

        // Create segment queue store for retry logic
        if (!db.objectStoreNames.contains('segmentQueue')) {
          const segmentStore = db.createObjectStore('segmentQueue', {
            keyPath: 'id',
          });
          segmentStore.createIndex('by-session', 'sessionId');
          segmentStore.createIndex('by-status', 'status');
          segmentStore.createIndex('by-retry-priority', ['retryCount', 'lastUpdated']);
          segmentStore.createIndex('by-analyzer', ['sessionId', 'analyzerType']);
        }
      },
    });
  }

  // Session management
  async initializeSession(sessionId: string, data: Partial<AnalysisSession>): Promise<void> {
    if (!this.db) await this.initialize();
    
    const session: AnalysisSession = {
      sessionId,
      userName: data.userName || '',
      totalMessages: data.totalMessages || 0,
      totalSegments: data.totalSegments || 0,
      completedSegments: 0,
      failedSegments: [],
      status: 'processing',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      ...data,
    };
    
    await this.db!.put('sessionData', session);
  }

  async updateSessionProgress(sessionId: string, progress: Partial<AnalysisSession>): Promise<void> {
    if (!this.db) await this.initialize();
    
    const existing = await this.db!.get('sessionData', sessionId);
    if (!existing) return;
    
    await this.db!.put('sessionData', {
      ...existing,
      ...progress,
      lastUpdated: Date.now(),
    });
  }

  async getSession(sessionId: string): Promise<AnalysisSession | undefined> {
    if (!this.db) await this.initialize();
    return await this.db!.get('sessionData', sessionId);
  }

  // Segment management
  async saveSegment(segment: AnalysisSegment): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('segmentQueue', {
      ...segment,
      lastUpdated: Date.now(),
    });
  }

  async updateSegment(segment: Partial<AnalysisSegment> & { id: string }): Promise<void> {
    if (!this.db) await this.initialize();
    
    const existing = await this.db!.get('segmentQueue', segment.id);
    if (!existing) return;
    
    await this.db!.put('segmentQueue', {
      ...existing,
      ...segment,
      lastUpdated: Date.now(),
    });
  }

  async getSegmentsBySession(sessionId: string): Promise<AnalysisSegment[]> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('segmentQueue', 'readonly');
    const index = tx.store.index('by-session');
    return await index.getAll(sessionId);
  }

  async getSegmentsByAnalyzer(sessionId: string, analyzerType: string): Promise<AnalysisSegment[]> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('segmentQueue', 'readonly');
    const index = tx.store.index('by-analyzer');
    return await index.getAll([sessionId, analyzerType]);
  }

  async getFailedSegments(sessionId: string): Promise<AnalysisSegment[]> {
    if (!this.db) await this.initialize();
    const segments = await this.getSegmentsBySession(sessionId);
    return segments.filter(s => s.status === 'failed' && s.retryCount < 3);
  }

  // Bulk operations
  async bulkSaveSegments(segments: AnalysisSegment[]): Promise<void> {
    if (!this.db) await this.initialize();
    
    const tx = this.db!.transaction('segmentQueue', 'readwrite');
    await Promise.all(
      segments.map(segment => 
        tx.store.put({
          ...segment,
          lastUpdated: Date.now(),
        })
      )
    );
    await tx.done;
  }

  // Analysis results (backward compatible)
  async saveAnalysisResult(result: AnalysisResult): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('analysisResults', result);
  }

  async getAnalysisResult(id: string): Promise<AnalysisResult | undefined> {
    if (!this.db) await this.initialize();
    return await this.db!.get('analysisResults', id);
  }

  async updateAnalysisResult(id: string, updates: Partial<AnalysisResult>): Promise<void> {
    if (!this.db) await this.initialize();
    
    const existing = await this.db!.get('analysisResults', id);
    if (!existing) return;
    
    await this.db!.put('analysisResults', {
      ...existing,
      ...updates,
    });
  }

  // Cleanup operations
  async cleanupOldSessions(daysToKeep: number = 7): Promise<void> {
    if (!this.db) await this.initialize();
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Clean old sessions
    const tx = this.db!.transaction(['sessionData', 'segmentQueue', 'analysisResults'], 'readwrite');
    
    // Get old sessions
    const sessionIndex = tx.objectStore('sessionData').index('by-updated');
    const oldSessions = await sessionIndex.getAllKeys(IDBKeyRange.upperBound(cutoffTime));
    
    // Delete old data
    for (const sessionId of oldSessions) {
      // Delete session
      await tx.objectStore('sessionData').delete(sessionId);
      
      // Delete associated segments
      const segmentIndex = tx.objectStore('segmentQueue').index('by-session');
      const segments = await segmentIndex.getAllKeys(sessionId);
      for (const segmentId of segments) {
        await tx.objectStore('segmentQueue').delete(segmentId);
      }
      
      // Delete associated results
      await tx.objectStore('analysisResults').delete(sessionId);
    }
    
    await tx.done;
  }

  // Migration helper for existing data
  async migrateFromOldDB(): Promise<void> {
    try {
      // Open old database
      const oldDbName = 'cognition-analyzer';
      const oldDb = await openDB(oldDbName, 1);
      
      if (!oldDb.objectStoreNames.contains('analysisResults')) {
        oldDb.close();
        return;
      }
      
      // Copy data from old to new
      const oldResults = await oldDb.getAll('analysisResults');
      
      if (!this.db) await this.initialize();
      
      for (const result of oldResults) {
        await this.saveAnalysisResult(result);
      }
      
      oldDb.close();
      console.log(`Migrated ${oldResults.length} analysis results from old database`);
    } catch (error) {
      console.warn('Migration from old database failed:', error);
    }
  }
}