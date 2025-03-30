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
import { toast } from "sonner";

class SerialService {
  private isConnected: boolean = false;
  private port: SerialPortInterface | null = null;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private isRaspberryPi: boolean = false;
  private useMockData: boolean = false;
  private securityRestricted: boolean = false;
  private usingWebSocket: boolean = false;
  private dataCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private hasReceivedData = false;

  constructor() {
    // Check if we're running on the Raspberry Pi
    this.isRaspberryPi = this.checkIfRaspberryPi();
    
    // Check if Web Serial API is restricted by security policy
    this.checkSecurityRestrictions();
    
    // Listen for WebSocket errors
    document.addEventListener('websocket-error', (event: Event) => {
      const customEvent = event as CustomEvent;
      
      // Only show a toast if we're actually using WebSocket
      if (this.usingWebSocket) {
        toast.error(customEvent.detail.message, {
          description: "Check network connection or server logs"
        });
        
        // Attempt to reconnect or fallback to mock data
        if (customEvent.detail.message.includes("timeout")) {
          console.log("WebSocket timeout detected, attempting to reconnect or fallback");
          this.reconnectOrFallback();
        }
      }
    });
  }
  
  private reconnectOrFallback(): void {
    // Disconnect current connections
    this.disconnect().then(() => {
      // Try connecting again - this will try WebSocket first then fall back to mock if needed
      this.connect().catch(() => {
        console.log("Reconnection failed, falling back to mock data");
        this.useMockData = true;
        this.setupMockData();
      });
    });
  }

  // Check if we're running on the Raspberry Pi or another device on the network
  private checkIfRaspberryPi(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'raspberrypi.local' || 
           hostname.startsWith('192.168.') ||
           hostname === 'localhost';
  }

  // Check if we're accessing the app from a remote device (not the same as the one running the server)
  private isRemoteAccess(): boolean {
    // If we're not on localhost, we're likely accessing from another device
    return window.location.hostname !== 'localhost' && 
           window.location.hostname !== '127.0.0.1';
  }

  // Check if Web Serial API is supported
  get isSupported(): boolean {
    return 'serial' in navigator;
  }
  
  // Check if Web Serial API is restricted by security policy
  get isSecurityRestricted(): boolean {
    return this.securityRestricted;
  }
  
  // Check if we're currently using mock data
  get isMockData(): boolean {
    return this.useMockData;
  }
  
  // Check if we're using WebSocket connection
  get isWebSocket(): boolean {
    return this.usingWebSocket;
  }

  // Check if Web Serial API is restricted by security policy
  private async checkSecurityRestrictions(): Promise<void> {
    if (this.isSupported) {
      try {
        // Attempt to call getPorts() to check if it's allowed
        await navigator.serial.getPorts();
        this.securityRestricted = false;
      } catch (error) {
        // If we get a SecurityError, the API is restricted
        if (error instanceof Error && error.name === 'SecurityError') {
          console.warn('Web Serial API is restricted by security policy');
          this.securityRestricted = true;
        }
      }
    }
  }

  // Get available ports (if supported)
  async getAvailablePorts(): Promise<SerialPortInfo[]> {
    if (!this.isSupported) {
      return [];
    }
    
    // If Web Serial API is restricted, return empty array
    if (this.securityRestricted) {
      console.warn('Cannot list ports: Web Serial API is restricted by security policy');
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
      
      // If error is SecurityError, update the flag
      if (error instanceof Error && error.name === 'SecurityError') {
        this.securityRestricted = true;
      }
      
      return [];
    }
  }

  // Connect to the Arduino via Serial port
  async connect(selectedPort?: SerialPortInterface): Promise<boolean> {
    try {
      // Reset flags at the start of each connection attempt
      this.useMockData = false;
      this.usingWebSocket = false;
      
      // Check if accessing remotely - if so, prioritize WebSocket
      const remoteAccess = this.isRemoteAccess();
      
      if (remoteAccess) {
        console.log("Detected remote access, prioritizing WebSocket connection");
        // Try WebSocket connection first for remote access
        try {
          const wsConnected = webSocketService.connect();
          
          // Register data callback
          webSocketService.onData((data) => {
            this.callbacks.forEach(callback => callback(data));
          });
          
          // Register error callback
          webSocketService.onError((error) => {
            this.handleError(error);
          });
          
          this.isConnected = true;
          this.usingWebSocket = true;
          
          // Set up a health check timer to ensure we're actually getting data
          this.setupDataReceiptCheck();
          
          console.log("Successfully connected via WebSocket for remote access");
          return true;
        } catch (wsError) {
          console.error("WebSocket connection failed:", wsError);
          // Fall back to mock data
          this.useMockData = true;
          this.setupMockData();
          return true;
        }
      }
      
      // If Web Serial API is restricted by security policy, handle accordingly
      if (this.isSupported && this.securityRestricted) {
        console.warn("Web Serial API is restricted by security policy");
        
        // Always try WebSocket first for Lovable preview
        console.log("Trying WebSocket connection due to security restrictions");
        try {
          webSocketService.connect();
          webSocketService.onData((data) => {
            this.callbacks.forEach(callback => callback(data));
          });
          webSocketService.onError((error) => {
            this.handleError(error);
          });
          this.isConnected = true;
          this.usingWebSocket = true;
          
          // Set up data receipt check
          this.setupDataReceiptCheck();
          
          return true;
        } catch (wsError) {
          console.log("WebSocket connection failed, using mock data...", wsError);
          this.useMockData = true;
          this.setupMockData();
          return true;
        }
      }
      
      // If we're on the Raspberry Pi, try to use WebSocket or direct Serial connection
      if (this.isRaspberryPi) {
        // Try WebSocket first
        console.log("On Raspberry Pi, trying WebSocket first");
        try {
          webSocketService.connect();
          webSocketService.onData((data) => {
            this.callbacks.forEach(callback => callback(data));
          });
          webSocketService.onError((error) => {
            this.handleError(error);
          });
          this.isConnected = true;
          this.usingWebSocket = true;
          
          // Set up data receipt check
          this.setupDataReceiptCheck();
          
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
              // Fall back to mock data
              this.useMockData = true;
              this.setupMockData();
              return true;
            }
          }
          
          // If both WebSocket and Serial failed, use mock data
          this.useMockData = true;
          this.setupMockData();
          return true;
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
            // Fall back to mock data
            this.useMockData = true;
            this.setupMockData();
            return true;
          }
        } else if (!this.isSupported) {
          // If Web Serial isn't supported, use mock data
          console.log("Web Serial API not supported, using mock data instead");
          this.useMockData = true;
          this.setupMockData();
          return true;
        }
      }
      
      // If we reach here, fall back to mock data
      console.log("Using mock data instead of real hardware.");
      this.useMockData = true;
      this.setupMockData();
      return true;
      
    } catch (error) {
      console.error("Failed to connect:", error);
      
      // If all else fails, use mock data
      this.useMockData = true;
      this.setupMockData();
      return true;
    }
  }
  
  // Set up a data receipt check to ensure we're actually getting data
  private setupDataReceiptCheck() {
    // Clear any existing timer
    if (this.dataCheckTimer) {
      clearTimeout(this.dataCheckTimer);
      this.dataCheckTimer = null;
    }
    
    this.hasReceivedData = false;
    
    // Set a flag when we receive data
    const dataCheckCallback = (data: SerialData) => {
      console.log("Received first data:", data);
      this.hasReceivedData = true;
      
      // Remove this temporary callback after first data receipt
      const index = this.callbacks.indexOf(dataCheckCallback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
    
    // Add our temporary callback
    this.callbacks.push(dataCheckCallback);
    
    // Check after 10 seconds if we've received any data
    this.dataCheckTimer = setTimeout(() => {
      if (!this.hasReceivedData && this.isConnected) {
        console.warn("No data received after 10 seconds of connection");
        
        // If using WebSocket but not receiving data, try to reconnect
        if (this.usingWebSocket) {
          console.log("WebSocket connected but no data received, attempting to reconnect...");
          this.handleError(new Error("No data received from WebSocket (timeout)"));
        }
      }
    }, 10000);
  }
  
  // Handle errors from serial connection
  private handleError(error: Error): void {
    console.error("Connection error:", error);
    
    // Notify about invalid data or disconnection
    let errorMessage = "Connection error";
    if (error.message.includes("Invalid data")) {
      errorMessage = "Invalid data format received";
    } else if (error.message.includes("disconnected")) {
      errorMessage = "Device disconnected";
    } else if (error.message.includes("timeout")) {
      errorMessage = "Connection timed out - no data received";
    }
      
    // Dispatch a custom event that components can listen for
    const event = new CustomEvent('arduino-error', { 
      detail: { message: errorMessage, error } 
    });
    document.dispatchEvent(event);
    
    // Notify registered error callbacks
    this.errorCallbacks.forEach(callback => callback(error));
    
    // If auto-detecting and this is a timeout error with WebSocket,
    // try to reconnect or fallback to mock data
    if (this.usingWebSocket && 
        error.message.includes("timeout")) {
      
      this.reconnectOrFallback();
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
    
    // Clear any data check timer
    if (this.dataCheckTimer) {
      clearTimeout(this.dataCheckTimer);
      this.dataCheckTimer = null;
    }
    
    // Stop mock data if it's running
    mockDataService.stopMockDataEmission();
    
    // Disconnect WebSocket if it's running
    if (this.usingWebSocket) {
      webSocketService.disconnect();
      this.usingWebSocket = false;
    }
    
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

  // Add a method to check which service is active
  async checkActiveService(): Promise<{ useWebSocket: boolean }> {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      // Check for serialMonitorActive flag from server
      return {
        useWebSocket: !data.serialMonitorActive
      };
    } catch (error) {
      console.error("Error checking active service:", error);
      // Default to WebSocket if we can't determine
      return { useWebSocket: true };
    }
  }
}

// Create a singleton instance
const serialService = new SerialService();
export default serialService;
