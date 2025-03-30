
import { SerialData, DataCallback, RawMessageCallback } from './types/serial.types';

class MockDataService {
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  
  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
    console.log("[MockDataService] Added data callback, but mock data is completely disabled");
  }
  
  onRawMessage(callback: RawMessageCallback): void {
    this.rawCallbacks.push(callback);
    console.log("[MockDataService] Added raw message callback, but mock data is completely disabled");
  }

  startMockDataEmission(): void {
    console.log("[MockDataService] Mock data emission is permanently disabled");
    // Ensure no interval is ever created
    this.stopMockDataEmission();
    return;
  }

  stopMockDataEmission(): void {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
      console.log("[MockDataService] Cleared any existing mock data interval");
    }
  }

  clearCallbacks(): void {
    this.callbacks = [];
    this.rawCallbacks = [];
    console.log("[MockDataService] Cleared all callbacks");
  }
}

const mockDataService = new MockDataService();
export default mockDataService;
