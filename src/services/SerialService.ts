
// Serial service to connect with Arduino via Web Serial API
import { SerialData, DataCallback, SerialPortInterface, RawMessageCallback } from './types/serial.types';
import webSocketService from './WebSocketService';
import mockDataService from './MockDataService';
import serialReader from './SerialReader';

class SerialService {
  private isConnected: boolean = false;
  private port: SerialPortInterface | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  private isRaspberryPi: boolean = false;

  constructor() {
    // Check if we're running on the Raspberry Pi
    this.isRaspberryPi = window.location.hostname === 'raspberrypi.local' || 
                         window.location.hostname.startsWith('192.168.') ||
                         window.location.hostname === 'localhost';
  }

  // Check if Web Serial API is supported
  get isSupported(): boolean {
    return 'serial' in navigator;
  }

  // Connect to the Arduino via Serial port
  async connect(): Promise<boolean> {
    try {
      if (this.isRaspberryPi) {
        // If we're on the Raspberry Pi, use direct Serial connection
        if (!this.isSupported) {
          console.warn("Web Serial API is not supported. Using mock data.");
          this.setupMockData();
          return true;
        }

        if (navigator.serial) {
          this.port = await navigator.serial.requestPort();
          await this.port.open({ baudRate: 9600 });
          this.isConnected = true;
          
          // Set up the serial reader with our port
          serialReader.setPort(this.port);
          
          // Forward callbacks to the serial reader
          serialReader.onData((data) => {
            this.callbacks.forEach(callback => callback(data));
          });
          
          // Forward raw message callbacks to the serial reader
          serialReader.onRawMessage((message) => {
            this.rawCallbacks.forEach(callback => callback(message));
          });
          
          // Start reading from the serial port
          await serialReader.startReading();
          return true;
        }
      } else {
        // If we're on another device, connect via WebSocket
        webSocketService.connect();
        webSocketService.onData((data) => {
          this.callbacks.forEach(callback => callback(data));
        });
        this.isConnected = true;
        return true;
      }
      
      throw new Error("Connection not possible");
    } catch (error) {
      console.error("Failed to connect:", error);
      this.setupMockData();
      return true;
    }
  }

  // Set up mock data generation
  private setupMockData(): void {
    mockDataService.onData((data) => {
      this.callbacks.forEach(callback => callback(data));
    });
    mockDataService.onRawMessage((message) => {
      this.rawCallbacks.forEach(callback => callback(message));
    });
    mockDataService.startMockDataEmission();
    this.isConnected = true;
  }

  // Disconnect from the serial device
  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    // Stop mock data if it's running
    mockDataService.stopMockDataEmission();
    
    // Stop serial reader if it's running
    await serialReader.stopReading();
    
    // Close the port if it exists
    if (this.port) {
      try {
        await this.port.close();
        this.port = null;
      } catch (error) {
        console.error("Error closing port:", error);
      }
    }
    
    // Clear callbacks
    this.callbacks = [];
    this.rawCallbacks = [];
    mockDataService.clearCallbacks();
    serialReader.clearCallbacks();
  }

  // Register a callback to receive data
  onData(callback: DataCallback): void {
    this.callbacks.push(callback);
  }
  
  // Register a callback to receive raw messages
  onRawMessage(callback: RawMessageCallback): void {
    this.rawCallbacks.push(callback);
  }
}

// Create a singleton instance
const serialService = new SerialService();
export default serialService;
