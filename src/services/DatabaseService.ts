
import { SerialData } from './types/serial.types';

class DatabaseService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'hydroponicsDB';
  private readonly STORE_NAME = 'sensorReadings';
  private lastStoredTime: number = 0;
  private readonly STORAGE_INTERVAL = 60000; // 1 minute in milliseconds

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
  storeSensorReading(data: SerialData): boolean {
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
      
      const request = store.add(readingWithTimestamp);
      
      request.onsuccess = () => {
        console.log("[DOCKER-LOG][DatabaseService] Sensor reading stored successfully");
        this.lastStoredTime = currentTime;
      };
      
      request.onerror = (event) => {
        console.error("[DOCKER-LOG][DatabaseService] Error storing sensor reading:", event);
      };
      
      return true;
    } catch (error) {
      console.error("[DOCKER-LOG][DatabaseService] Transaction error:", error);
      return false;
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
}

// Create a singleton instance
const databaseService = new DatabaseService();
export default databaseService;
