
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
  private maxReconnectAttempts = 5;
  private isConnected = false;
  private lastMessageTime = 0;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  
  connect(serverUrl: string = this.getDefaultWebSocketUrl()) {
    console.log(`Attempting WebSocket connection to: ${serverUrl}`);
    
    try {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connection established successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        
        // Set up health check interval
        this.startHealthCheck();
      };
      
      this.ws.onmessage = (event) => {
        try {
          // Update last message time for health check
          this.lastMessageTime = Date.now();
          
          if (event.data === "healthy") {
            console.log("Received health check response");
            return;
          }
          
          const data = JSON.parse(event.data);
          this.callbacks.forEach(callback => callback(data));
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
          this.notifyError(new Error('Invalid data format from server'));
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.isConnected = false;
        this.stopHealthCheck();
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(serverUrl);
          }, delay);
        } else {
          console.error('Maximum reconnection attempts reached.');
          this.notifyError(new Error('Failed to connect to WebSocket server after multiple attempts'));
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyError(new Error('WebSocket connection error'));
        
        // Try fallback to non-secure connection if secure connection fails
        if (serverUrl.startsWith('wss:') && this.reconnectAttempts === 0) {
          console.log('Secure WebSocket connection failed, trying fallback to non-secure...');
          const fallbackUrl = serverUrl.replace('wss:', 'ws:');
          console.log(`Fallback URL: ${fallbackUrl}`);
          setTimeout(() => this.connect(fallbackUrl), 1000);
        }
      };
      
      // Send a ping message every 30 seconds to keep the connection alive
      setInterval(() => {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
        }
      }, 30000);
      
      return true;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.notifyError(new Error('Failed to create WebSocket connection'));
      return false;
    }
  }
  
  private getDefaultWebSocketUrl(): string {
    // For Raspberry Pi direct connection, always use HTTP/ws protocol
    // because self-signed certificates won't be trusted anyway
    if (this.isRaspberryPi()) {
      const hostname = window.location.hostname;
      return `ws://${hostname}:8081`;
    }
    
    // Determine protocol based on current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // For Docker setups, use relative path
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Try the /ws path which is proxied through NGINX
      return `${protocol}//${window.location.host}/ws`;
    }
    
    // For development, connect directly to the WebSocket port
    const port = '8081';
    return `${protocol}//${window.location.hostname}:${port}`;
  }
  
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }
  
  private isRaspberryPi(): boolean {
    return window.location.hostname === 'raspberrypi.local' || 
           window.location.hostname.startsWith('192.168.') ||
           window.location.hostname === 'localhost';
  }
  
  onData(callback: DataCallback) {
    this.callbacks.push(callback);
  }
  
  onError(callback: ErrorCallback) {
    this.errorCallbacks.push(callback);
  }
  
  private notifyError(error: Error) {
    this.errorCallbacks.forEach(callback => callback(error));
    
    // Also dispatch a custom event
    const event = new CustomEvent('websocket-error', { 
      detail: { message: error.message, error } 
    });
    document.dispatchEvent(event);
  }
  
  disconnect() {
    this.stopHealthCheck();
    
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
    this.stopHealthCheck(); // Clear any existing interval
    this.lastMessageTime = Date.now();
    
    // Check every 5 seconds if we've received any data recently
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      // If no message for 15 seconds, consider connection stale
      if (now - this.lastMessageTime > 15000) {
        console.warn('No data received from WebSocket in the last 15 seconds');
        this.notifyError(new Error('No data received from server (timeout)'));
        
        // If the connection appears stale but WebSocket still shows as connected,
        // force a reconnection
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('Forcing WebSocket reconnection due to stale connection');
          this.ws.close();
          // The onclose handler will trigger a reconnection
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
