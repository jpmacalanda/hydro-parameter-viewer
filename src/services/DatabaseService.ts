
import { SerialData } from './types/serial.types';

class DatabaseService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'hydroponicsDB';
  private readonly STORE_NAME = 'sensorReadings';
  private lastStoredTime: number = 0;
  private readonly STORAGE_INTERVAL = 60000; // 1 minute in milliseconds
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes
  private readonly CHECK_SIZE_INTERVAL = 10; // Check size every 10 inserts

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    const request = indexedDB.open(this.DB_NAME, 1);

    request.onerror = (event) => {
      console.error("[DOCKER-LOG][DatabaseService] Database error:", event);
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      console.log("[DOCKER-LOG][DatabaseService] Database opened successfully");
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store for sensor readings if it doesn't exist
      if (!db.objectStoreNames.contains(this.STORE_NAME)) {
        const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'timestamp' });
        store.createIndex('timestamp', 'timestamp', { unique: true });
        console.log("[DOCKER-LOG][DatabaseService] Object store created");
      }
    };
  }

  /**
   * Store sensor reading if at least one minute has passed since the last storage
   */
  async storeSensorReading(data: SerialData): Promise<boolean> {
    const currentTime = Date.now();
    
    // Only store if database is initialized and at least 1 minute has passed
    if (!this.db || (currentTime - this.lastStoredTime) < this.STORAGE_INTERVAL) {
      return false;
    }
    
    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Add timestamp to the data
      const readingWithTimestamp = {
        ...data,
        timestamp: currentTime
      };
      
      // Get current record count
      const countRequest = store.count();
      let recordCount = 0;
      
      await new Promise<void>((resolve, reject) => {
        countRequest.onsuccess = () => {
          recordCount = countRequest.result;
          resolve();
        };
        countRequest.onerror = () => reject();
      });
      
      // Check storage size periodically
      if (recordCount % this.CHECK_SIZE_INTERVAL === 0) {
        await this.manageStorageSize();
      }
      
      const request = store.add(readingWithTimestamp);
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          console.log("[DOCKER-LOG][DatabaseService] Sensor reading stored successfully");
          this.lastStoredTime = currentTime;
          resolve();
        };
        
        request.onerror = (event) => {
          console.error("[DOCKER-LOG][DatabaseService] Error storing sensor reading:", event);
          reject(event);
        };
      });
      
      return true;
    } catch (error) {
      console.error("[DOCKER-LOG][DatabaseService] Transaction error:", error);
      return false;
    }
  }

  /**
   * Manage storage size to prevent exceeding 5GB limit
   * This will delete oldest records when approaching the limit
   */
  private async manageStorageSize(): Promise<void> {
    if (!this.db) return;
    
    try {
      // Estimate current storage size
      const estimatedSize = await this.estimateStorageSize();
      
      // If approaching the limit (>80% of max), delete oldest records
      if (estimatedSize > this.MAX_STORAGE_SIZE * 0.8) {
        console.log(`[DOCKER-LOG][DatabaseService] Storage approaching limit (${(estimatedSize / (1024 * 1024 * 1024)).toFixed(2)} GB). Cleaning up old records.`);
        await this.deleteOldestRecords();
      }
    } catch (error) {
      console.error("[DOCKER-LOG][DatabaseService] Error managing storage size:", error);
    }
  }

  /**
   * Estimate current storage size
   */
  private async estimateStorageSize(): Promise<number> {
    if (!this.db) return 0;
    
    try {
      // Get all records to estimate size
      const allReadings = await this.getAllReadings();
      
      // Convert to JSON string and estimate byte size
      const jsonString = JSON.stringify(allReadings);
      const estimatedSize = jsonString.length * 2; // UTF-16 is 2 bytes per character
      
      console.log(`[DOCKER-LOG][DatabaseService] Estimated storage size: ${(estimatedSize / (1024 * 1024)).toFixed(2)} MB`);
      return estimatedSize;
    } catch (error) {
      console.error("[DOCKER-LOG][DatabaseService] Error estimating storage size:", error);
      return 0;
    }
  }

  /**
   * Delete oldest records to free up space
   */
  private async deleteOldestRecords(): Promise<void> {
    if (!this.db) return;
    
    try {
      // Get all readings sorted by timestamp (oldest first)
      const allReadings = await this.getAllReadings();
      const sortedReadings = allReadings.sort((a, b) => a.timestamp - b.timestamp);
      
      // Calculate how many records to delete (30% of total)
      const deleteCount = Math.ceil(sortedReadings.length * 0.3);
      const recordsToDelete = sortedReadings.slice(0, deleteCount);
      
      if (recordsToDelete.length === 0) return;
      
      console.log(`[DOCKER-LOG][DatabaseService] Deleting ${deleteCount} oldest records to free up space`);
      
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Delete each record
      for (const record of recordsToDelete) {
        store.delete(record.timestamp);
      }
      
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          console.log(`[DOCKER-LOG][DatabaseService] Successfully deleted ${deleteCount} old records`);
          resolve();
        };
        transaction.onerror = (event) => {
          console.error("[DOCKER-LOG][DatabaseService] Error deleting old records:", event);
          reject(event);
        };
      });
    } catch (error) {
      console.error("[DOCKER-LOG][DatabaseService] Error deleting oldest records:", error);
    }
  }

  /**
   * Get all stored sensor readings
   */
  async getAllReadings(): Promise<Array<SerialData & { timestamp: number }>> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      
      try {
        const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get readings within a specific time range
   */
  async getReadingsInRange(startTime: number, endTime: number): Promise<Array<SerialData & { timestamp: number }>> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      
      try {
        const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.bound(startTime, endTime);
        const request = index.getAll(range);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all stored readings
   */
  clearAllReadings(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      
      try {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log("[DOCKER-LOG][DatabaseService] All readings cleared");
          resolve();
        };
        
        request.onerror = (event) => {
          reject(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get current database size information
   */
  async getDatabaseStats(): Promise<{ recordCount: number, estimatedSize: string }> {
    if (!this.db) {
      return { recordCount: 0, estimatedSize: '0 MB' };
    }
    
    try {
      const allReadings = await this.getAllReadings();
      const jsonString = JSON.stringify(allReadings);
      const sizeInBytes = jsonString.length * 2;
      
      let sizeText = '';
      if (sizeInBytes > 1024 * 1024 * 1024) {
        sizeText = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      } else if (sizeInBytes > 1024 * 1024) {
        sizeText = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
      } else if (sizeInBytes > 1024) {
        sizeText = `${(sizeInBytes / 1024).toFixed(2)} KB`;
      } else {
        sizeText = `${sizeInBytes} bytes`;
      }
      
      return {
        recordCount: allReadings.length,
        estimatedSize: sizeText
      };
    } catch (error) {
      console.error("[DOCKER-LOG][DatabaseService] Error getting database stats:", error);
      return { recordCount: 0, estimatedSize: 'Unknown' };
    }
  }
}

// Create a singleton instance
const databaseService = new DatabaseService();
export default databaseService;
