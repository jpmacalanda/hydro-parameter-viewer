
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
    return this.useMockData;
  }

  // Connect to the system - this now just means start using log parsing
  async connect(): Promise<boolean> {
    try {
      console.log("[DOCKER-LOG][SerialService] Connecting to serial monitor logs");
      
      // Explicitly set mock data to false - never use mock data
      this.useMockData = false;
      
      console.log("[DOCKER-LOG][SerialService] Environment VITE_MOCK_DATA:", import.meta.env.VITE_MOCK_DATA);
      console.log("[DOCKER-LOG][SerialService] Using mock data?", this.useMockData);
      
      // Set up log parser to get real data from logs
      console.log("[DOCKER-LOG][SerialService] Setting up log parser to use real data");
      logParserService.onData((data) => {
        console.log("[DOCKER-LOG][SerialService] Received real data from log parser:", JSON.stringify(data));
        this.callbacks.forEach((callback, index) => {
          console.log(`[DOCKER-LOG][SerialService] Sending real data to callback #${index + 1}:`, JSON.stringify(data));
          callback(data);
        });
      });
      
      // Start polling logs
      console.log("[DOCKER-LOG][SerialService] Starting log polling");
      logParserService.startPolling();
      
      this.isConnected = true;
      console.log("[DOCKER-LOG][SerialService] Successfully connected, status:", this.isConnected, "using mock data:", this.useMockData);
      return true;
    } catch (error) {
      console.error("[DOCKER-LOG][SerialService] Failed to connect:", error);
      
      // Show error instead of falling back to mock data
      toast.error("Failed to connect to Arduino", {
        description: "Could not establish connection to obtain real sensor data. Please check your hardware connection."
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

  // Set up mock data generation - this is now a no-op since we never use mock data
  private setupMockData(): void {
    // This function is kept for backward compatibility but is now a no-op
    console.log("[DOCKER-LOG][SerialService] Mock data setup requested but ignored - using real data only");
  }

  // Disconnect from the service
  async disconnect(): Promise<void> {
    console.log("[DOCKER-LOG][SerialService] Disconnecting, current connection status:", this.isConnected, "using mock data:", this.useMockData);
    this.isConnected = false;
    
    // Stop log parser if it's running
    console.log("[DOCKER-LOG][SerialService] Stopping log parser");
    logParserService.stopPolling();
    
    // Clear callbacks
    console.log("[DOCKER-LOG][SerialService] Clearing callbacks: data callbacks:", this.callbacks.length, "raw callbacks:", this.rawCallbacks.length);
    this.callbacks = [];
    this.rawCallbacks = [];
    console.log("[DOCKER-LOG][SerialService] Disconnected successfully, new status:", this.isConnected);
  }

  // Register a callback to receive data
  onData(callback: DataCallback): void {
    console.log("[DOCKER-LOG][SerialService] New data callback registered");
    this.callbacks.push(callback);
    console.log("[DOCKER-LOG][SerialService] Total data callbacks:", this.callbacks.length);
  }
  
  // Register a callback to receive raw messages
  onRawMessage(callback: RawMessageCallback): void {
    console.log("[DOCKER-LOG][SerialService] New raw message callback registered");
    this.rawCallbacks.push(callback);
    console.log("[DOCKER-LOG][SerialService] Total raw message callbacks:", this.rawCallbacks.length);
  }
  
  // Register a callback to receive error notifications
  onError(callback: ErrorCallback): void {
    console.log("[DOCKER-LOG][SerialService] New error callback registered");
    this.errorCallbacks.push(callback);
    console.log("[DOCKER-LOG][SerialService] Total error callbacks:", this.errorCallbacks.length);
  }
}

// Create a singleton instance
const serialService = new SerialService();
export default serialService;
