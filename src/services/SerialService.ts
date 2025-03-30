
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
      // Check if we should use mock data (based on environment variable)
      const mockDataFromEnv = process.env.MOCK_DATA === 'true' || false;
      this.useMockData = mockDataFromEnv;
      
      if (this.useMockData) {
        // Use mock data if set in environment or logs not available
        console.log("Using mock data instead of logs");
        this.setupMockData();
      } else {
        // Set up log parser to get real data from logs
        logParserService.onData((data) => {
          this.callbacks.forEach(callback => callback(data));
        });
        
        // Start polling logs
        logParserService.startPolling();
      }
      
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("Failed to connect:", error);
      
      // Fall back to mock data on error
      this.useMockData = true;
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
    this.useMockData = true;
  }

  // Disconnect from the service
  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    // Stop mock data if it's running
    mockDataService.stopMockDataEmission();
    
    // Stop log parser if it's running
    logParserService.stopPolling();
    
    // Clear callbacks
    this.callbacks = [];
    this.rawCallbacks = [];
    mockDataService.clearCallbacks();
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
