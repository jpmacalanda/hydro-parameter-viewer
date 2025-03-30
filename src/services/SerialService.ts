
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
      
      // Check if we should use mock data (based on environment variable)
      const mockDataFromEnv = import.meta.env.VITE_MOCK_DATA === 'true' || false;
      this.useMockData = mockDataFromEnv;
      console.log("[DOCKER-LOG][SerialService] Environment MOCK_DATA:", import.meta.env.VITE_MOCK_DATA);
      console.log("[DOCKER-LOG][SerialService] Using mock data?", this.useMockData);
      
      if (this.useMockData) {
        // Use mock data if set in environment or logs not available
        console.log("[DOCKER-LOG][SerialService] Setting up mock data because MOCK_DATA is true");
        this.setupMockData();
      } else {
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
      }
      
      this.isConnected = true;
      console.log("[DOCKER-LOG][SerialService] Successfully connected, status:", this.isConnected, "using mock data:", this.useMockData);
      return true;
    } catch (error) {
      console.error("[DOCKER-LOG][SerialService] Failed to connect:", error);
      
      // Fall back to mock data on error
      console.log("[DOCKER-LOG][SerialService] Falling back to mock data due to error");
      this.useMockData = true;
      this.setupMockData();
      return true;
    }
  }

  // Set up mock data generation
  private setupMockData(): void {
    console.log("[DOCKER-LOG][SerialService] Setting up mock data service");
    mockDataService.onData((data) => {
      console.log("[DOCKER-LOG][SerialService] Received mock data:", JSON.stringify(data));
      this.callbacks.forEach((callback, index) => {
        console.log(`[DOCKER-LOG][SerialService] Sending mock data to callback #${index + 1}:`, JSON.stringify(data));
        callback(data);
      });
    });
    mockDataService.onRawMessage((message) => {
      console.log("[DOCKER-LOG][SerialService] Received raw mock message:", message);
      this.rawCallbacks.forEach((callback, index) => {
        console.log(`[DOCKER-LOG][SerialService] Sending raw mock message to callback #${index + 1}`);
        callback(message);
      });
    });
    mockDataService.startMockDataEmission();
    this.isConnected = true;
    this.useMockData = true;
    console.log("[DOCKER-LOG][SerialService] Mock data setup complete, isConnected:", this.isConnected, "useMockData:", this.useMockData);
  }

  // Disconnect from the service
  async disconnect(): Promise<void> {
    console.log("[DOCKER-LOG][SerialService] Disconnecting, current connection status:", this.isConnected, "using mock data:", this.useMockData);
    this.isConnected = false;
    
    // Stop mock data if it's running
    console.log("[DOCKER-LOG][SerialService] Stopping mock data");
    mockDataService.stopMockDataEmission();
    
    // Stop log parser if it's running
    console.log("[DOCKER-LOG][SerialService] Stopping log parser");
    logParserService.stopPolling();
    
    // Clear callbacks
    console.log("[DOCKER-LOG][SerialService] Clearing callbacks: data callbacks:", this.callbacks.length, "raw callbacks:", this.rawCallbacks.length);
    this.callbacks = [];
    this.rawCallbacks = [];
    mockDataService.clearCallbacks();
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
