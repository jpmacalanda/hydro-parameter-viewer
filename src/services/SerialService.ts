
// Serial service to connect with Arduino via Serial Monitor logs
import { 
  SerialData, 
  DataCallback, 
  RawMessageCallback, 
  ErrorCallback 
} from './types/serial.types';
import mockDataService from './MockDataService';
import logParserService from './LogParserService';
import { toast } from "sonner";

class SerialService {
  private isConnected: boolean = false;
  private callbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private useMockData: boolean = false;

  constructor() {
    // Set up event listeners for errors if needed
    document.addEventListener('serial-error', (event: Event) => {
      const customEvent = event as CustomEvent;
      
      toast.error(customEvent.detail.message, {
        description: "Check serial monitor logs"
      });
    });
    
    console.log("[DOCKER-LOG][SerialService] Initialized");
  }

  // Get current connection status
  get connected(): boolean {
    return this.isConnected;
  }
  
  // Check if using mock data
  get isMockData(): boolean {
    return false; // Never use mock data
  }

  // Connect to the system - this now just means start using log parsing
  async connect(): Promise<boolean> {
    try {
      console.log("[DOCKER-LOG][SerialService] Connecting to serial monitor logs");
      
      // Explicitly set mock data to false - never use mock data
      this.useMockData = false;
      
      console.log("[DOCKER-LOG][SerialService] Using real data only");
      
      // Set up log parser to get real data from logs
      console.log("[DOCKER-LOG][SerialService] Setting up log parser");
      logParserService.onData((data) => {
        console.log("[DOCKER-LOG][SerialService] Received data from log parser:", JSON.stringify(data));
        
        // Forward raw messages to any registered raw callbacks
        this.rawCallbacks.forEach((callback) => {
          callback(JSON.stringify(data));
        });
        
        // Forward parsed data to data callbacks
        this.callbacks.forEach((callback) => {
          callback(data);
        });
      });
      
      // Start polling logs with higher frequency
      console.log("[DOCKER-LOG][SerialService] Starting log polling");
      logParserService.startPolling();
      
      this.isConnected = true;
      console.log("[DOCKER-LOG][SerialService] Successfully connected");
      
      const event = new CustomEvent('connection-success', { 
        detail: { 
          message: "Connected to Arduino logs", 
          description: "Now receiving real-time data from serial logs" 
        } 
      });
      document.dispatchEvent(event);
      
      return true;
    } catch (error) {
      console.error("[DOCKER-LOG][SerialService] Failed to connect:", error);
      
      // Show error instead of falling back to mock data
      toast.error("Failed to connect to Arduino", {
        description: "Could not establish connection to obtain real sensor data."
      });
      
      // Dispatch an error event
      const errorEvent = new CustomEvent('arduino-error', {
        detail: {
          message: "Failed to connect to Arduino",
          error: error
        }
      });
      document.dispatchEvent(errorEvent);
      
      return false;
    }
  }

  // Disconnect from the service
  async disconnect(): Promise<void> {
    console.log("[DOCKER-LOG][SerialService] Disconnecting");
    this.isConnected = false;
    
    // Stop log parser if it's running
    console.log("[DOCKER-LOG][SerialService] Stopping log parser");
    logParserService.stopPolling();
    
    // Clear callbacks
    console.log("[DOCKER-LOG][SerialService] Clearing callbacks");
    this.callbacks = [];
    this.rawCallbacks = [];
    console.log("[DOCKER-LOG][SerialService] Disconnected successfully");
  }

  // Register a callback to receive data
  onData(callback: DataCallback): void {
    console.log("[DOCKER-LOG][SerialService] New data callback registered");
    this.callbacks.push(callback);
  }
  
  // Register a callback to receive raw messages
  onRawMessage(callback: RawMessageCallback): void {
    console.log("[DOCKER-LOG][SerialService] New raw message callback registered");
    this.rawCallbacks.push(callback);
  }
  
  // Register a callback to receive error notifications
  onError(callback: ErrorCallback): void {
    console.log("[DOCKER-LOG][SerialService] New error callback registered");
    this.errorCallbacks.push(callback);
  }
}

// Create a singleton instance
const serialService = new SerialService();
export default serialService;
