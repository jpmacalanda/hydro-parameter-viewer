
import { SerialData, DataCallback, SerialPortInterface, RawMessageCallback } from './types/serial.types';

class SerialReader {
  private reader: ReadableStreamDefaultReader | null = null;
  private readInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  private port: SerialPortInterface | null = null;

  constructor() {}

  // Set the port to read from
  setPort(port: SerialPortInterface): void {
    this.port = port;
  }

  // Register a callback to receive data
  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
  }

  // Register a callback to receive raw messages
  onRawMessage(callback: RawMessageCallback): void {
    this.rawCallbacks.push(callback);
  }

  // Start reading data from the serial port
  async startReading(): Promise<void> {
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
              const rawMessage = lines[i].trim();
              
              // Send raw message to raw callbacks
              this.rawCallbacks.forEach(callback => callback(rawMessage));
              
              // Process the message for parsed data callbacks
              this.processMessage(rawMessage);
            }
            
            // Keep any incomplete data in the buffer
            buffer = lines[lines.length - 1];
          }
        } catch (error) {
          console.error("Error reading from serial port:", error);
          if (this.readInterval) clearInterval(this.readInterval);
          this.stopReading();
          throw error;
        }
      }, 100); // Check for new data every 100ms
    } catch (error) {
      console.error("Failed to get reader:", error);
      throw error;
    }
  }

  // Stop reading from the serial port
  async stopReading(): Promise<void> {
    if (this.readInterval) {
      clearInterval(this.readInterval);
      this.readInterval = null;
    }
    
    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader = null;
      } catch (error) {
        console.error("Error cancelling reader:", error);
      }
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

  // Clear all callbacks
  clearCallbacks(): void {
    this.callbacks = [];
    this.rawCallbacks = [];
  }
}

// Create a singleton instance
const serialReader = new SerialReader();
export default serialReader;
