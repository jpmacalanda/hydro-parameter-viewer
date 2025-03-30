import { toast } from "sonner";

type LogCallback = (logs: string) => void;

class SystemLogsService {
  private logCallbacks: LogCallback[] = [];
  private polling: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private containerType: 'webapp' | 'websocket' = 'websocket';
  private lastLogLength: number = 0;
  private mockLogs: { [key: string]: string } = {
    webapp: "2025-03-30T18:12:34 [info] Starting NGINX container...\n2025-03-30T18:12:35 [info] Using existing certificates.\n2025-03-30T18:12:36 [info] Listening on port 80 and 443\n2025-03-30T18:12:37 [info] Ready to serve requests\n",
    websocket: "2025-03-30T18:12:30 [info] Starting Serial Monitor...\n2025-03-30T18:12:31 [info] Connecting to /dev/ttyUSB0 at 9600 baud\n2025-03-30T18:12:32 [info] Serial connection established\n2025-03-30T18:12:33 [info] Waiting for data...\n"
  };

  constructor() {
    // Default to websocket container logs
  }

  /**
   * Start polling for logs from the selected container
   */
  startPolling(containerType: 'webapp' | 'websocket'): void {
    this.containerType = containerType;
    
    if (this.polling) {
      this.stopPolling();
    }
    
    this.polling = true;
    this.fetchLogs();
    
    // Poll every 5 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchLogs();
    }, 5000);
  }

  /**
   * Stop polling for logs
   */
  stopPolling(): void {
    this.polling = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Fetch logs from the server
   */
  private async fetchLogs(): Promise<void> {
    try {
      // Use mock logs since the logs server doesn't exist
      this.notifyCallbacks(this.mockLogs[this.containerType]);
      
      // Append some random data to simulate live logs
      const timestamp = new Date().toISOString().replace('Z', '');
      const randomLog = `${timestamp} [info] Random log entry ${Math.floor(Math.random() * 1000)}\n`;
      this.mockLogs[this.containerType] += randomLog;
      
      // Keep log size manageable
      if (this.mockLogs[this.containerType].length > 5000) {
        this.mockLogs[this.containerType] = this.mockLogs[this.containerType].substring(
          this.mockLogs[this.containerType].length - 5000
        );
      }
    } catch (error) {
      console.error('Error handling logs:', error);
      toast.error('Failed to fetch system logs', {
        description: 'Could not retrieve container logs'
      });
    }
  }

  /**
   * Register a callback to receive logs
   */
  onLogs(callback: LogCallback): void {
    this.logCallbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  removeCallback(callback: LogCallback): void {
    const index = this.logCallbacks.indexOf(callback);
    if (index !== -1) {
      this.logCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all callbacks with new logs
   */
  private notifyCallbacks(logs: string): void {
    this.logCallbacks.forEach((callback) => callback(logs));
  }
}

const systemLogsService = new SystemLogsService();
export default systemLogsService;
