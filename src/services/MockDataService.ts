import { SerialData, DataCallback, RawMessageCallback } from './types/serial.types';

class MockDataService {
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  
  private baseValues = {
    ph: 6.2,
    temperature: 23.5,
    tds: 750
  };
  
  private trends = {
    ph: 1,
    temperature: 1,
    tds: 1
  };
  
  private trendCounter = 0;

  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
  }
  
  onRawMessage(callback: RawMessageCallback): void {
    this.rawCallbacks.push(callback);
  }

  startMockDataEmission(): void {
    console.log("Starting mock data emission with realistic values");
    if (this.mockDataInterval) {
      this.stopMockDataEmission();
    }
    
    this.mockDataInterval = setInterval(() => {
      this.trendCounter++;
      if (this.trendCounter % 5 === 0) {
        this.changeTrends();
      }
      
      const phVariation = (Math.random() * 0.1) * this.trends.ph;
      const tempVariation = (Math.random() * 0.2) * this.trends.temperature;
      const tdsVariation = (Math.random() * 20) * this.trends.tds;
      
      this.baseValues.ph += phVariation;
      this.baseValues.temperature += tempVariation;
      this.baseValues.tds += tdsVariation;
      
      this.baseValues.ph = this.constrainValue(this.baseValues.ph, 5.5, 7.2);
      this.baseValues.temperature = this.constrainValue(this.baseValues.temperature, 19, 27);
      this.baseValues.tds = this.constrainValue(this.baseValues.tds, 550, 950);
      
      const ph = Number(this.baseValues.ph.toFixed(1));
      const temp = Number(this.baseValues.temperature.toFixed(1));
      const tds = Math.round(this.baseValues.tds);
      
      const waterLevelOptions = ['low', 'medium', 'high'] as const;
      const waterLevelIndex = Math.min(
        2, 
        Math.floor((27 - this.baseValues.temperature) / 3)
      );
      const waterLevel = waterLevelOptions[waterLevelIndex];
      
      const rawMessage = `pH:${ph},temp:${temp},water:${waterLevel},tds:${tds}`;
      
      this.rawCallbacks.forEach(callback => callback(rawMessage));
      
      const mockData: SerialData = {
        ph,
        temperature: temp,
        waterLevel,
        tds
      };

      this.callbacks.forEach(callback => callback(mockData));
    }, 5000);
  }
  
  private constrainValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  private changeTrends(): void {
    if (Math.random() < 0.3) {
      this.trends.ph *= -1;
    }
    if (Math.random() < 0.3) {
      this.trends.temperature *= -1;
    }
    if (Math.random() < 0.3) {
      this.trends.tds *= -1;
    }
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
