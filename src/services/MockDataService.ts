
import { SerialData, DataCallback, RawMessageCallback } from './types/serial.types';

class MockDataService {
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  
  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
    console.log("[MockDataService] Added data callback, but mock data is disabled");
  }
  
  onRawMessage(callback: RawMessageCallback): void {
    this.rawCallbacks.push(callback);
    console.log("[MockDataService] Added raw message callback, but mock data is disabled");
  }

  startMockDataEmission(): void {
    console.log("[MockDataService] Mock data emission is disabled");
    // Mock data generation is disabled
    return;
  }

  stopMockDataEmission(): void {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
  }

  clearCallbacks(): void {
    this.callbacks = [];
    this.rawCallbacks = [];
  }
}

const mockDataService = new MockDataService();
export default mockDataService;
