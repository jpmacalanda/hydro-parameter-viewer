
import { SerialData, DataCallback, RawMessageCallback } from './types/serial.types';

class MockDataService {
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];

  // Register a callback to receive data
  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
  }
  
  // Register a callback to receive raw messages
  onRawMessage(callback: RawMessageCallback): void {
    this.rawCallbacks.push(callback);
  }

  // Start simulating data emission for demo purposes or when real connection fails
  startMockDataEmission(): void {
    console.log("Starting mock data emission");
    if (this.mockDataInterval) {
      this.stopMockDataEmission();
    }
    
    this.mockDataInterval = setInterval(() => {
      const ph = Number((Math.random() * 2 + 5).toFixed(1)); // pH between 5.0 and 7.0
      const temp = Number((Math.random() * 8 + 20).toFixed(1)); // Temp between 20 and 28°C
      const waterLevel = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high';
      const tds = Math.floor(Math.random() * 500 + 500); // TDS between 500 and 1000 PPM
      
      // Create raw message format
      const rawMessage = `pH:${ph},temp:${temp},water:${waterLevel},tds:${tds}`;
      
      // Send raw message to raw callbacks
      this.rawCallbacks.forEach(callback => callback(rawMessage));
      
      const mockData: SerialData = {
        ph,
        temperature: temp,
        waterLevel,
        tds
      };

      this.callbacks.forEach(callback => callback(mockData));
    }, 5000); // Update every 5 seconds
  }

  // Stop mock data emission
  stopMockDataEmission(): void {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
  }

  // Clear all registered callbacks
  clearCallbacks(): void {
    this.callbacks = [];
    this.rawCallbacks = [];
  }
}

// Create a singleton instance
const mockDataService = new MockDataService();
export default mockDataService;
