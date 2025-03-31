
import { SerialData } from './types/serial.types';

class MockDataService {
  private mockData: SerialData = {
    ph: 7.0,
    temperature: 25.0,
    waterLevel: "medium",
    tds: 650
  };

  private trends = {
    ph: 0.01,
    temperature: 0.1,
    tds: 2,
    waterLevelCounter: 0
  };

  private callbacks: ((data: SerialData) => void)[] = [];
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    console.log("[DOCKER-LOG][MockDataService] Initialized");
  }

  startGeneratingData(): void {
    if (this.isRunning) return;
    
    console.log("[DOCKER-LOG][MockDataService] Starting mock data generation");
    this.isRunning = true;
    
    // Generate data every 2 seconds
    this.interval = setInterval(() => {
      this.generateMockData();
      
      // Call all registered callbacks with the new data
      this.callbacks.forEach(callback => {
        callback({...this.mockData});
      });
    }, 2000);
  }

  stopGeneratingData(): void {
    console.log("[DOCKER-LOG][MockDataService] Stopping mock data generation");
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isRunning = false;
  }

  private generateMockData(): void {
    // Update pH with trend
    this.mockData.ph += this.trends.ph;
    
    // Check if pH is going out of optimal range and reverse trend
    if (this.mockData.ph > 7.5 || this.mockData.ph < 6.0) {
      this.trends.ph *= -1;
    }
    
    // Add small random fluctuation to pH
    this.mockData.ph += (Math.random() - 0.5) * 0.05;
    
    // Ensure pH stays in realistic range
    this.mockData.ph = Math.max(5.0, Math.min(9.0, this.mockData.ph));
    
    // Update temperature with trend
    this.mockData.temperature += this.trends.temperature;
    
    // Check if temperature is going out of optimal range and reverse trend
    if (this.mockData.temperature > 30 || this.mockData.temperature < 20) {
      this.trends.temperature *= -1;
    }
    
    // Add small random fluctuation to temperature
    this.mockData.temperature += (Math.random() - 0.5) * 0.2;
    
    // Ensure temperature stays in realistic range
    this.mockData.temperature = Math.max(15.0, Math.min(35.0, this.mockData.temperature));
    
    // Update TDS with trend
    this.mockData.tds += this.trends.tds;
    
    // Check if TDS is going out of optimal range and reverse trend
    if (this.mockData.tds > 800 || this.mockData.tds < 400) {
      this.trends.tds *= -1;
    }
    
    // Add small random fluctuation to TDS
    this.mockData.tds += Math.floor((Math.random() - 0.5) * 10);
    
    // Ensure TDS stays in realistic range
    this.mockData.tds = Math.max(200, Math.min(1200, this.mockData.tds));
    
    // Update water level less frequently
    this.trends.waterLevelCounter++;
    if (this.trends.waterLevelCounter >= 15) {
      this.trends.waterLevelCounter = 0;
      
      // Randomly change water level
      const waterLevels: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
      const currentIndex = waterLevels.indexOf(this.mockData.waterLevel);
      
      // Usually move only one step up or down
      let newIndex;
      const randomChange = Math.random();
      
      if (randomChange < 0.3) {
        // Move down (if possible)
        newIndex = Math.max(0, currentIndex - 1);
      } else if (randomChange < 0.6) {
        // Move up (if possible)
        newIndex = Math.min(2, currentIndex + 1);
      } else {
        // Stay the same
        newIndex = currentIndex;
      }
      
      this.mockData.waterLevel = waterLevels[newIndex];
    }
    
    console.log("[DOCKER-LOG][MockDataService] Generated mock data:", JSON.stringify(this.mockData));
  }

  onData(callback: (data: SerialData) => void): void {
    console.log("[DOCKER-LOG][MockDataService] New data callback registered");
    this.callbacks.push(callback);
  }

  clearCallbacks(): void {
    console.log("[DOCKER-LOG][MockDataService] Clearing all callbacks");
    this.callbacks = [];
  }
}

// Create a singleton instance
const mockDataService = new MockDataService();
export default mockDataService;
