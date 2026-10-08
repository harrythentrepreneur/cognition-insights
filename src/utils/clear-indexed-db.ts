import { IndexedDBStorage } from '@/lib/storage/indexed-db';

/**
 * Utility to clear all data from IndexedDB
 * Useful for debugging and ensuring clean state
 */
export async function clearAllIndexedDBData() {
  try {
    const storage = new IndexedDBStorage();
    await storage.initialize();
    await storage.clearAllData();
    console.log('✅ All IndexedDB data cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear IndexedDB data:', error);
    throw error;
  }
}

/**
 * Utility to clear old data from IndexedDB
 * @param daysToKeep - Number of days of data to keep (default: 7)
 */
export async function clearOldIndexedDBData(daysToKeep: number = 7) {
  try {
    const storage = new IndexedDBStorage();
    await storage.initialize();
    await storage.clearOldData(daysToKeep);
    console.log(`✅ Cleared IndexedDB data older than ${daysToKeep} days`);
  } catch (error) {
    console.error('❌ Failed to clear old IndexedDB data:', error);
    throw error;
  }
}