
// This is a simplified mock implementation for the SerialService
// In a real application, it would interact with the Serial API

interface SerialData {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
}

type DataCallback = (data: SerialData) => void;

class SerialService {
  private isConnected: boolean = false;
  private callbacks: DataCallback[] = [];
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;

  // Connect to the serial device
  async connect(): Promise<boolean> {
    // In a real implementation, this would use Web Serial API
    // For now, we'll mock the connection
    this.isConnected = true;
    this.startMockDataEmission();
    return true;
  }

  // Disconnect from the serial device
  async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
  }

  // Register a callback to receive data
  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
  }

  // Simulate data emission for demo purposes
  private startMockDataEmission(): void {
    this.mockDataInterval = setInterval(() => {
      const mockData: SerialData = {
        ph: Number((Math.random() * 2 + 5).toFixed(1)), // pH between 5.0 and 7.0
        temperature: Number((Math.random() * 8 + 20).toFixed(1)), // Temp between 20 and 28°C
        waterLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        tds: Math.floor(Math.random() * 500 + 500) // TDS between 500 and 1000 PPM
      };

      this.callbacks.forEach(callback => callback(mockData));
    }, 5000); // Update every 5 seconds
  }
}

// Create a singleton instance
const serialService = new SerialService();
export default serialService;
