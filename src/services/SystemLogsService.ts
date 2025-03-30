
import { toast } from "sonner";

type LogCallback = (logs: string) => void;

class SystemLogsService {
  private logCallbacks: LogCallback[] = [];
  private polling: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private containerType: 'webapp' | 'websocket' = 'websocket';

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
      // In a production environment, you would fetch logs from an API endpoint
      // For this demo, we'll generate some mock logs since we can't directly access Docker in the browser
      
      const mockLogs = this.generateMockLogs();
      this.notifyLogCallbacks(mockLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to fetch system logs', {
        description: 'Could not retrieve container logs'
      });
    }
  }

  /**
   * Generate mock logs based on container type
   * In a real implementation, these would come from an API endpoint
   */
  private generateMockLogs(): string {
    const now = new Date().toISOString();
    let logs = '';
    
    if (this.containerType === 'websocket') {
      logs = `${now} - INFO - WebSocket server running on port 8081 without SSL
${now} - INFO - Available serial ports: ['/dev/ttyUSB0']
${now} - INFO - Running in MOCK DATA mode - will generate simulated sensor readings
${now} - INFO - No clients connected, skipping data send
${now} - INFO - WebSocket client connected from 192.168.1.5 to path: /
${now} - INFO - Sent data to 1 clients: {"ph":6.8,"temperature":24.2,"waterLevel":"medium","tds":678}`;
    } else {
      logs = `${now} - INFO - Starting NGINX container...
${now} - INFO - Using existing certificates.
${now} - INFO - NGINX running and serving content
${now} - INFO - Received request for /index.html
${now} - INFO - Served static content`;
    }
    
    return logs;
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
  private notifyLogCallbacks(logs: string): void {
    this.logCallbacks.forEach((callback) => callback(logs));
  }
}

const systemLogsService = new SystemLogsService();
export default systemLogsService;
