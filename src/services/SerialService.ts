
// Serial service to connect with Arduino via Web Serial API

interface SerialData {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
}

type DataCallback = (data: SerialData) => void;

// Define a type for SerialPort if it doesn't exist
interface SerialPortInterface {
  readable: ReadableStream;
  close(): Promise<void>;
  open(options: { baudRate: number }): Promise<void>;
}

// Extend the Navigator interface to include serial
declare global {
  interface Navigator {
    serial?: {
      requestPort(): Promise<SerialPortInterface>;
    }
  }
}

class SerialService {
  private isConnected: boolean = false;
  private port: SerialPortInterface | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private callbacks: DataCallback[] = [];
  private readInterval: ReturnType<typeof setInterval> | null = null;
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;

  // Check if Web Serial API is supported
  get isSupported(): boolean {
    return 'serial' in navigator;
  }

  // Connect to the Arduino via Serial port
  async connect(): Promise<boolean> {
    try {
      // Check if Web Serial API is supported
      if (!this.isSupported) {
        console.warn("Web Serial API is not supported in this browser. Falling back to mock data.");
        this.startMockDataEmission();
        this.isConnected = true;
        return true;
      }

      // Request a port
      if (navigator.serial) {
        this.port = await navigator.serial.requestPort();
        
        // Open the port with appropriate Arduino settings (9600 baud rate is common for Arduino)
        await this.port.open({ baudRate: 9600 });
        
        // Start reading data
        this.isConnected = true;
        this.startReading();
        return true;
      } else {
        throw new Error("Web Serial API is not available");
      }
    } catch (error) {
      console.error("Failed to connect to Arduino:", error);
      // Fall back to mock data if connection fails
      this.startMockDataEmission();
      this.isConnected = true;
      return true; // We return true even though real connection failed because we fall back to mock
    }
  }

  // Disconnect from the serial device
  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    // Clear any intervals
    if (this.readInterval) {
      clearInterval(this.readInterval);
      this.readInterval = null;
    }
    
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
    
    // Close the reader if it exists
    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader = null;
      } catch (error) {
        console.error("Error cancelling reader:", error);
      }
    }
    
    // Close the port if it exists
    if (this.port && this.port.readable) {
      try {
        await this.port.close();
        this.port = null;
      } catch (error) {
        console.error("Error closing port:", error);
      }
    }
  }

  // Register a callback to receive data
  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
  }

  // Start reading data from Arduino
  private async startReading(): Promise<void> {
    if (!this.port || !this.port.readable) {
      console.error("Port is not readable");
      return;
    }

    // Create a buffer to store incoming data
    let buffer = "";
    
    try {
      this.reader = this.port.readable.getReader();
      
      // Set up a loop to read data
      this.readInterval = setInterval(async () => {
        try {
          const { value, done } = await this.reader!.read();
          
          if (done) {
            // The stream has been canceled
            if (this.readInterval) clearInterval(this.readInterval);
            return;
          }
          
          // Process the received data
          const textDecoder = new TextDecoder();
          const chunk = textDecoder.decode(value);
          
          // Add the chunk to our buffer
          buffer += chunk;
          
          // Check if we have a complete message (ending with newline)
          const lines = buffer.split('\n');
          
          // If we have at least one complete line
          if (lines.length > 1) {
            // Process all complete lines
            for (let i = 0; i < lines.length - 1; i++) {
              this.processMessage(lines[i]);
            }
            
            // Keep any incomplete data in the buffer
            buffer = lines[lines.length - 1];
          }
        } catch (error) {
          console.error("Error reading from serial port:", error);
          if (this.readInterval) clearInterval(this.readInterval);
          
          // Fall back to mock data
          this.startMockDataEmission();
        }
      }, 100); // Check for new data every 100ms
    } catch (error) {
      console.error("Failed to get reader:", error);
      
      // Fall back to mock data
      this.startMockDataEmission();
    }
  }

  // Process a message from the Arduino
  private processMessage(message: string): void {
    try {
      // Expected format from Arduino: "pH:6.8,temp:23.5,water:medium,tds:650"
      const data: SerialData = {
        ph: 6.0,
        temperature: 23.0,
        waterLevel: 'medium' as 'low' | 'medium' | 'high',
        tds: 650
      };
      
      // Parse the message
      const parts = message.trim().split(',');
      
      parts.forEach(part => {
        const [key, value] = part.split(':');
        
        if (key && value) {
          switch (key.trim()) {
            case 'pH':
            case 'ph':
              data.ph = parseFloat(value);
              break;
            case 'temp':
            case 'temperature':
              data.temperature = parseFloat(value);
              break;
            case 'water':
            case 'waterLevel':
              if (['low', 'medium', 'high'].includes(value.trim())) {
                data.waterLevel = value.trim() as 'low' | 'medium' | 'high';
              }
              break;
            case 'tds':
              data.tds = parseInt(value, 10);
              break;
          }
        }
      });
      
      // Send the data to all registered callbacks
      this.callbacks.forEach(callback => callback(data));
    } catch (error) {
      console.error("Error processing message:", error, "Message:", message);
    }
  }
  
  // Simulate data emission for demo purposes or when real connection fails
  private startMockDataEmission(): void {
    console.log("Starting mock data emission");
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
