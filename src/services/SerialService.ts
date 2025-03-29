
// Serial service to connect with Arduino via Web Serial API
import { 
  SerialData, 
  DataCallback, 
  SerialPortInterface, 
  RawMessageCallback, 
  ErrorCallback, 
  SerialPortInfo 
} from './types/serial.types';
import webSocketService from './WebSocketService';
import mockDataService from './MockDataService';
import serialReader from './SerialReader';

class SerialService {
  private isConnected: boolean = false;
  private port: SerialPortInterface | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private isRaspberryPi: boolean = false;
  private autoDetectHardware: boolean = true; // Default to auto-detect
  private useMockData: boolean = false;

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
  
  // Check if we're currently using mock data
  get isMockData(): boolean {
    return this.useMockData;
  }

  // Get available ports (if supported)
  async getAvailablePorts(): Promise<SerialPortInfo[]> {
    if (!this.isSupported || !navigator.serial?.getPorts) {
      return [];
    }
    
    try {
      const ports = await navigator.serial.getPorts();
      return ports.map((port, index) => {
        // Extract information about the port if available
        const info = port.getInfo ? port.getInfo() : {};
        return {
          id: index.toString(),
          port: port,
          // Use available info or placeholders
          displayName: info.usbVendorId ? 
            `Device ${info.usbVendorId.toString(16)}:${info.usbProductId?.toString(16) || '0000'}` : 
            `COM Port ${index + 1}`
        };
      });
    } catch (error) {
      console.error("Error getting available ports:", error);
      return [];
    }
  }

  // Connect to the Arduino via Serial port
  async connect(selectedPort?: SerialPortInterface): Promise<boolean> {
    try {
      // Reset mock data flag at the start of each connection attempt
      this.useMockData = false;
      
      if (this.isRaspberryPi) {
        // If we're on the Raspberry Pi, try to use WebSocket or direct Serial connection
        if (!this.autoDetectHardware) {
          // If auto-detect is disabled, respect the user's preference
          if (!this.isSupported) {
            throw new Error("Web Serial API is not supported in this browser");
          }
          
          // Try to connect via Web Serial API
          this.port = await this.requestSerialPort();
          if (this.port) {
            await this.setupSerialConnection();
            return true;
          }
          
          throw new Error("Could not obtain serial port");
        }
        
        // Auto-detect is enabled, try WebSocket first
        try {
          webSocketService.connect();
          webSocketService.onData((data) => {
            this.callbacks.forEach(callback => callback(data));
          });
          this.isConnected = true;
          return true;
        } catch (wsError) {
          console.log("WebSocket connection failed, trying direct serial...", wsError);
          
          // If WebSocket fails, try direct Serial
          if (this.isSupported) {
            try {
              this.port = await this.requestSerialPort();
              if (this.port) {
                await this.setupSerialConnection();
                return true;
              }
            } catch (serialError) {
              console.error("Serial connection failed:", serialError);
              // Don't automatically fall through to mock data
              if (this.autoDetectHardware) {
                this.useMockData = true;
                this.setupMockData();
                return true;
              }
              throw serialError;
            }
          }
        }
      } else {
        // Not on Raspberry Pi, try direct Serial connection if supported
        if (this.isSupported) {
          try {
            // Use selected port if provided, otherwise request a port
            this.port = selectedPort || await this.requestSerialPort();
            if (this.port) {
              await this.setupSerialConnection();
              return true;
            }
          } catch (serialError) {
            console.error("Failed to connect to hardware:", serialError);
            if (!this.autoDetectHardware) {
              throw serialError; // Only throw if not auto-detecting
            }
            // Only fall through to mock data if auto-detecting is enabled
            this.useMockData = true;
            this.setupMockData();
            return true;
          }
        } else if (!this.isSupported && this.autoDetectHardware) {
          // If Web Serial isn't supported and auto-detect is on, use mock data
          console.log("Web Serial API not supported, using mock data instead");
          this.useMockData = true;
          this.setupMockData();
          return true;
        } else {
          // Web Serial not supported and auto-detect is off
          throw new Error("Web Serial API is not supported in this browser");
        }
      }
      
      // If we reach here and explicitly want to fall back to mock data
      if (this.autoDetectHardware) {
        console.log("Using mock data instead of real hardware.");
        this.useMockData = true;
        this.setupMockData();
        return true;
      }
      
      throw new Error("Connection not possible");
    } catch (error) {
      console.error("Failed to connect:", error);
      
      if (this.autoDetectHardware) {
        this.useMockData = true;
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
    
    // Notify registered error callbacks
    this.errorCallbacks.forEach(callback => callback(error));
    
    // If auto-detecting, try to reconnect or fallback to mock data
    if (this.autoDetectHardware) {
      this.disconnect().then(() => {
        this.useMockData = true;
        this.setupMockData();
      });
    }
  }

  private async requestSerialPort(): Promise<SerialPortInterface | null> {
    if (!navigator.serial) {
      return null;
    }
    
    try {
      return await navigator.serial.requestPort();
    } catch (error) {
      console.error("Error requesting serial port:", error);
      return null;
    }
  }
  
  private async setupSerialConnection(): Promise<void> {
    if (!this.port) return;
    
    try {
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
    } catch (error) {
      console.error("Error setting up serial connection:", error);
      throw error;
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
    this.useMockData = true;
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
  
  // Register a callback to receive error notifications
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
}

// Create a singleton instance
const serialService = new SerialService();
export default serialService;
