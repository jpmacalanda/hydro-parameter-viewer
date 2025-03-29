
// SerialService.ts - Handles serial connection to Arduino

type HydroParams = {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
};

type SerialCallback = (data: HydroParams) => void;

class SerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private reading = false;
  private callback: SerialCallback | null = null;
  
  // For development/testing when no actual serial device is available
  private mockMode = true;
  private mockInterval: number | null = null;
  
  async connect(): Promise<boolean> {
    if (!navigator.serial) {
      console.warn("Web Serial API not supported. Running in mock mode.");
      this.startMockData();
      return true;
    }
    
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      
      this.startReading();
      return true;
    } catch (error) {
      console.error("Failed to connect to serial port:", error);
      this.startMockData(); // Fallback to mock data
      return false;
    }
  }
  
  onData(callback: SerialCallback): void {
    this.callback = callback;
  }
  
  async disconnect(): Promise<void> {
    this.reading = false;
    
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    
    if (this.port && this.port.readable) {
      await this.port.close();
      this.port = null;
    }
    
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }
  
  private async startReading(): Promise<void> {
    if (!this.port || !this.port.readable) return;
    
    this.reading = true;
    
    try {
      this.reader = this.port.readable.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (this.reading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        buffer += decoder.decode(value);
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep the incomplete line in buffer
        
        for (const line of lines) {
          this.processData(line.trim());
        }
      }
    } catch (error) {
      console.error("Error reading from serial:", error);
    } finally {
      if (this.reader) {
        this.reader.releaseLock();
        this.reader = null;
      }
    }
  }
  
  private processData(data: string): void {
    try {
      // Expecting format like: "pH:6.5,temp:24.2,level:medium,tds:840"
      const parts = data.split(',');
      const params: Partial<HydroParams> = {};
      
      for (const part of parts) {
        const [key, value] = part.split(':');
        
        switch (key) {
          case 'pH':
            params.ph = parseFloat(value);
            break;
          case 'temp':
            params.temperature = parseFloat(value);
            break;
          case 'level':
            params.waterLevel = value as 'low' | 'medium' | 'high';
            break;
          case 'tds':
            params.tds = parseInt(value, 10);
            break;
        }
      }
      
      if (this.callback && Object.keys(params).length > 0) {
        // Apply some defaults for missing values
        const hydroParams: HydroParams = {
          ph: params.ph ?? 7.0,
          temperature: params.temperature ?? 25.0,
          waterLevel: params.waterLevel ?? 'medium',
          tds: params.tds ?? 500
        };
        
        this.callback(hydroParams);
      }
    } catch (error) {
      console.error("Error processing serial data:", error);
    }
  }
  
  private startMockData(): void {
    if (this.mockInterval) clearInterval(this.mockInterval);
    
    this.mockInterval = setInterval(() => {
      if (!this.callback) return;
      
      const randomWaterLevel = (): 'low' | 'medium' | 'high' => {
        const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
        return levels[Math.floor(Math.random() * levels.length)];
      };
      
      // Generate realistic mock data with small variations
      const mockData: HydroParams = {
        ph: 5.5 + Math.random() * 2.0, // pH between 5.5 and 7.5
        temperature: 18 + Math.random() * 10, // Temp between 18-28°C
        waterLevel: randomWaterLevel(),
        tds: 400 + Math.floor(Math.random() * 600) // TDS between 400-1000 ppm
      };
      
      this.callback(mockData);
    }, 2000); // Update every 2 seconds
  }
}

// Create a singleton instance
const serialService = new SerialService();
export default serialService;
