
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
  private autoDetectHardware: boolean = true; // Default to auto-detect

  constructor() {
    // Check if we're running on the Raspberry Pi
    this.isRaspberryPi = window.location.hostname === 'raspberrypi.local' || 
                         window.location.hostname.startsWith('192.168.') ||
                         window.location.hostname === 'localhost';
                         
    // Load auto-detect preference from localStorage if it exists
    const savedPreference = localStorage.getItem('autoDetectHardware');
    if (savedPreference !== null) {
      this.autoDetectHardware = savedPreference === 'true';
    }
  }

  // Check if Web Serial API is supported
  get isSupported(): boolean {
    return 'serial' in navigator;
  }
  
  // Get/Set auto-detect hardware setting
  get autoDetect(): boolean {
    return this.autoDetectHardware;
  }
  
  set autoDetect(value: boolean) {
    this.autoDetectHardware = value;
    localStorage.setItem('autoDetectHardware', value.toString());
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

        if (navigator.serial && (this.autoDetectHardware || !this.port)) {
          try {
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
            
            // Set up error handling for invalid data
            serialReader.onError((error) => {
              this.handleError(error);
            });
            
            // Start reading from the serial port
            await serialReader.startReading();
            return true;
          } catch (error) {
            console.error("Failed to connect to hardware:", error);
            if (!this.autoDetectHardware) {
              throw error; // Only throw if not auto-detecting
            }
            // Fall through to mock data if auto-detecting
          }
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
      
      // If we reach here and auto-detecting, use mock data
      if (this.autoDetectHardware) {
        console.log("Using mock data instead of real hardware.");
        this.setupMockData();
        return true;
      }
      
      throw new Error("Connection not possible");
    } catch (error) {
      console.error("Failed to connect:", error);
      
      if (this.autoDetectHardware) {
        this.setupMockData();
        return true;
      }
      
      return false;
    }
  }
  
  // Handle errors from serial connection
  private handleError(error: Error): void {
    console.error("Serial connection error:", error);
    // Notify about invalid data or disconnection
    const errorMessage = error.message.includes("Invalid data") 
      ? "Arduino sent invalid data format" 
      : "Arduino disconnected";
      
    // Dispatch a custom event that components can listen for
    const event = new CustomEvent('arduino-error', { 
      detail: { message: errorMessage, error } 
    });
    document.dispatchEvent(event);
    
    // If auto-detecting, try to reconnect or fallback to mock data
    if (this.autoDetectHardware) {
      this.disconnect().then(() => {
        this.setupMockData();
      });
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
