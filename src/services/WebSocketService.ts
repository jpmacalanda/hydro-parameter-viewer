
type DataCallback = (data: {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
}) => void;

type ErrorCallback = (error: Error) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: DataCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnected = false;
  private lastMessageTime = 0;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private debugMode = true; // Set to true to enable verbose logging
  private currentUrl: string = '';
  private connectionStartTime: number = 0;
  
  connect(serverUrl: string = this.getDefaultWebSocketUrl()) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    console.log(`Attempting WebSocket connection to: ${serverUrl}`);
    
    // First check if server is reachable with a simple fetch request
    this.checkServerAvailability(serverUrl)
      .then(available => {
        if (available) {
          this.initiateWebSocketConnection(serverUrl);
        } else {
          console.error(`[WebSocket] Server at ${serverUrl} is not available via HTTP check`);
          this.notifyError(new Error(`Server at ${serverUrl.replace('ws', 'http')} is not reachable. Check if the WebSocket server is running.`));
          
          // Try fallback from secure to non-secure WebSocket if needed
          if (serverUrl.startsWith('wss:')) {
            console.log('[WebSocket] Secure WebSocket server not reachable, trying fallback to non-secure...');
            const fallbackUrl = serverUrl.replace('wss:', 'ws:');
            console.log(`[WebSocket] Fallback URL: ${fallbackUrl}`);
            setTimeout(() => this.connect(fallbackUrl), 1000);
          }
        }
      });
    
    return true;
  }
  
  private async checkServerAvailability(wsUrl: string): Promise<boolean> {
    try {
      // Convert WebSocket URL to HTTP URL for health check
      const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      const healthUrl = `${httpUrl}/health`;
      
      console.log(`[WebSocket] Checking server availability at ${healthUrl}`);
      
      const response = await fetch(healthUrl, { 
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'text/plain',
        },
        // Very short timeout to not block the UI
        signal: AbortSignal.timeout(3000)
      });
      
      console.log(`[WebSocket] Server health check response:`, response);
      return true;
    } catch (error) {
      console.warn(`[WebSocket] Server health check failed:`, error);
      return false;
    }
  }
  
  private initiateWebSocketConnection(serverUrl: string) {
    this.currentUrl = serverUrl;
    this.connectionStartTime = Date.now();
    
    try {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      console.log(`[WebSocket] Creating new WebSocket instance at ${new Date().toISOString()}`);
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        const connectionTime = Date.now() - this.connectionStartTime;
        console.log(`[WebSocket] Connection established successfully after ${connectionTime}ms`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        
        // Dispatch connection success event
        const event = new CustomEvent('connection-success', { 
          detail: { 
            message: "WebSocket Connected", 
            description: "Successfully connected to the server"
          } 
        });
        document.dispatchEvent(event);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
          console.log('[WebSocket] Sent initial ping');
        }
        
        this.startHealthCheck();
      };
      
      this.ws.onmessage = (event) => {
        try {
          this.lastMessageTime = Date.now();
          
          if (event.data === "healthy") {
            console.log("[WebSocket] Received health check response");
            return;
          }
          
          if (event.data === "pong") {
            console.log("[WebSocket] Received pong response");
            return;
          }
          
          // Try to parse the data - if it's a string, check if it's valid JSON
          let data;
          if (typeof event.data === 'string') {
            if (event.data.trim() === '') {
              console.log("[WebSocket] Received empty message, ignoring");
              return;
            }
            
            try {
              data = JSON.parse(event.data);
              console.log("[WebSocket] Received data:", data);
              
              // Validate data structure before proceeding
              if (!this.isValidData(data)) {
                console.warn("[WebSocket] Received invalid data structure:", data);
                return;
              }
              
              // Additional validation for data types
              if (typeof data.ph !== 'number' || 
                  typeof data.temperature !== 'number' || 
                  typeof data.tds !== 'number' ||
                  !['low', 'medium', 'high'].includes(data.waterLevel)) {
                console.warn("[WebSocket] Data contains invalid types:", data);
                return;
              }
              
              this.callbacks.forEach(callback => callback(data));
            } catch (parseError) {
              console.error('[WebSocket] Error parsing WebSocket data:', parseError, 'Raw data:', event.data);
              this.notifyError(new Error('Invalid data format from server'));
            }
          }
        } catch (error) {
          console.error('[WebSocket] Error handling WebSocket message:', error);
          this.notifyError(new Error('Error processing WebSocket message'));
        }
      };
      
      this.ws.onclose = (event) => {
        const connectionDuration = Date.now() - this.connectionStartTime;
        console.log(`[WebSocket] Connection closed after ${connectionDuration}ms. Code: ${event.code}, Reason: ${event.reason}`);
        this.isConnected = false;
        this.stopHealthCheck();
        
        // Provide more detailed error messages based on close code
        let errorMessage = `WebSocket connection closed (Code: ${event.code})`;
        if (event.code === 1000) {
          errorMessage = "Normal closure, meaning the purpose for which the connection was established has been fulfilled";
        } else if (event.code === 1001) {
          errorMessage = "Server going down or browser navigating away";
        } else if (event.code === 1002) {
          errorMessage = "Protocol error";
        } else if (event.code === 1003) {
          errorMessage = "Received data cannot be accepted";
        } else if (event.code === 1006) {
          errorMessage = "Connection closed abnormally, e.g., server process died or network down";
        } else if (event.code === 1007) {
          errorMessage = "Message is inconsistent with the message type";
        } else if (event.code === 1008) {
          errorMessage = "Message violates policy";
        } else if (event.code === 1009) {
          errorMessage = "Message is too big";
        } else if (event.code === 1010) {
          errorMessage = "Missing required protocol extension";
        } else if (event.code === 1011) {
          errorMessage = "Internal server error";
        } else if (event.code === 1015) {
          errorMessage = "TLS handshake failure";
        }
        
        // Notify with detailed error message about connection closure
        this.notifyError(new Error(errorMessage));
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
          console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          
          this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(this.currentUrl);
          }, delay);
        } else {
          console.error('[WebSocket] Maximum reconnection attempts reached.');
          this.notifyError(new Error('Failed to connect to WebSocket server after multiple attempts'));
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[WebSocket] WebSocket error:', error);
        
        // Try to provide more detailed error information
        let errorMessage = 'WebSocket connection error';
        
        // Check if error happened before connection was established
        if (!this.isConnected) {
          errorMessage = 'WebSocket connection failed - Check if the server is running';
          
          // Network diagnosis information
          const networkDiagnosis = this.getNetworkDiagnosisInfo();
          console.log('[WebSocket] Network diagnosis:', networkDiagnosis);
          
          // Check if the error might be due to server not running
          if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) {
            errorMessage += ' on ' + serverUrl;
          } else {
            errorMessage += ' (server might be down or unreachable)';
          }
          
          // Add troubleshooting information
          console.error('[WebSocket] Troubleshooting steps:');
          console.error('1. Check if WebSocket server is running (docker ps)');
          console.error('2. Check server logs (docker logs hydroponics-websocket)');
          console.error('3. Verify port 8081 is accessible (netstat -tuln | grep 8081)');
          console.error('4. Check for firewalls blocking the connection');
          console.error('5. Ensure the server URL is correct:', serverUrl);
        }
        
        this.notifyError(new Error(errorMessage));
      };
      
      // Set up a ping interval
      const pingInterval = setInterval(() => {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send('ping');
            console.log('[WebSocket] Sent ping message');
          } catch (error) {
            console.error('[WebSocket] Error sending ping:', error);
            clearInterval(pingInterval);
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 15000);
      
      return true;
    } catch (error) {
      console.error('[WebSocket] Error creating WebSocket:', error);
      this.notifyError(new Error('Failed to create WebSocket connection - Is the server running?'));
      return false;
    }
  }
  
  private getNetworkDiagnosisInfo(): string {
    try {
      const info = [];
      info.push(`URL: ${this.currentUrl}`);
      info.push(`Window location: ${window.location.href}`);
      info.push(`Protocol: ${window.location.protocol}`);
      info.push(`Hostname: ${window.location.hostname}`);
      info.push(`Port: ${window.location.port}`);
      info.push(`Navigator online: ${navigator.onLine}`);
      return info.join(', ');
    } catch (error) {
      return `Error getting network info: ${error}`;
    }
  }
  
  private isValidData(data: any): boolean {
    // Basic validation to ensure the data has all required fields with correct types
    return (
      data && 
      typeof data === 'object' &&
      'ph' in data && 
      'temperature' in data && 
      'waterLevel' in data && 
      'tds' in data
    );
  }
  
  private getDefaultWebSocketUrl(): string {
    console.log("[WebSocket] Getting default WebSocket URL");
    
    // Use window location to determine if we're on Raspberry Pi
    const hostname = window.location.hostname;
    console.log(`[WebSocket] Current hostname: ${hostname}`);
    
    // Get the port from the current location to handle development setups
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    console.log(`[WebSocket] Using protocol: ${protocol}`);
    
    // Check if we're accessing from Raspberry Pi itself
    if (this.isRaspberryPi()) {
      // When running on the Pi itself, connect to the websocket server on 8081
      const url = `${protocol}//${hostname}:8081`;
      console.log(`[WebSocket] Using Raspberry Pi URL: ${url}`);
      return url;
    }
    
    // If not localhost, we're probably accessing remotely - use relative path
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // For remote access, use a relative WebSocket URL
      // This will connect to the same host but on the WebSocket port
      const url = `${protocol}//${hostname}:8081`;
      console.log(`[WebSocket] Using direct remote URL: ${url}`);
      return url;
    }
    
    // For development on localhost
    const url = `${protocol}//${hostname}:8081`;
    console.log(`[WebSocket] Using development URL: ${url}`);
    return url;
  }
  
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }
  
  private isRaspberryPi(): boolean {
    const hostname = window.location.hostname;
    const isRpi = hostname === 'raspberrypi.local' || 
           hostname.startsWith('192.168.') ||
           hostname === 'localhost';
    console.log(`[WebSocket] Checking if Raspberry Pi: ${hostname} -> ${isRpi}`);
    return isRpi;
  }
  
  onData(callback: DataCallback) {
    this.callbacks.push(callback);
  }
  
  onError(callback: ErrorCallback) {
    this.errorCallbacks.push(callback);
  }
  
  private notifyError(error: Error) {
    console.error('[WebSocket] Error notification:', error.message);
    this.errorCallbacks.forEach(callback => callback(error));
    
    const event = new CustomEvent('websocket-error', { 
      detail: { message: error.message, error } 
    });
    document.dispatchEvent(event);
  }
  
  disconnect() {
    console.log('[WebSocket] Disconnecting WebSocket');
    this.stopHealthCheck();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
    this.callbacks = [];
    this.errorCallbacks = [];
    this.reconnectAttempts = 0;
  }
  
  private startHealthCheck() {
    this.stopHealthCheck();
    this.lastMessageTime = Date.now();
    
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      if (now - this.lastMessageTime > 20000) {
        console.warn('[WebSocket] No data received from WebSocket in the last 20 seconds');
        this.notifyError(new Error('No data received from server - Arduino may not be connected or sending data'));
        
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('[WebSocket] Forcing WebSocket reconnection due to stale connection');
          this.ws.close(1000, "Health check failed - no data received");
        }
      }
    }, 5000);
  }
  
  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
