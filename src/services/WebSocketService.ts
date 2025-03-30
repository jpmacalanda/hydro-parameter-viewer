
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
  
  connect(serverUrl: string = this.getDefaultWebSocketUrl()) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    console.log(`Attempting WebSocket connection to: ${serverUrl}`);
    
    try {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connection established successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
          console.log('Sent initial ping');
        }
        
        this.startHealthCheck();
      };
      
      this.ws.onmessage = (event) => {
        try {
          this.lastMessageTime = Date.now();
          
          if (event.data === "healthy") {
            console.log("Received health check response");
            return;
          }
          
          if (event.data === "pong") {
            console.log("Received pong response");
            return;
          }
          
          // Try to parse the data - if it's a string, check if it's valid JSON
          let data;
          if (typeof event.data === 'string') {
            if (event.data.trim() === '') {
              console.log("Received empty message, ignoring");
              return;
            }
            
            try {
              data = JSON.parse(event.data);
              console.log("Received data:", data);
              
              // Validate data structure before proceeding
              if (!this.isValidData(data)) {
                console.warn("Received invalid data structure:", data);
                return;
              }
              
              this.callbacks.forEach(callback => callback(data));
            } catch (parseError) {
              console.error('Error parsing WebSocket data:', parseError, 'Raw data:', event.data);
              this.notifyError(new Error('Invalid data format from server'));
            }
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          this.notifyError(new Error('Error processing WebSocket message'));
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.isConnected = false;
        this.stopHealthCheck();
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          
          this.reconnectTimer = setTimeout(() => {
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
        
        if (serverUrl.startsWith('wss:') && this.reconnectAttempts === 0) {
          console.log('Secure WebSocket connection failed, trying fallback to non-secure...');
          const fallbackUrl = serverUrl.replace('wss:', 'ws:');
          console.log(`Fallback URL: ${fallbackUrl}`);
          setTimeout(() => this.connect(fallbackUrl), 1000);
        }
      };
      
      // Set up a ping interval
      const pingInterval = setInterval(() => {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send('ping');
            console.log('Sent ping message');
          } catch (error) {
            console.error('Error sending ping:', error);
            clearInterval(pingInterval);
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 15000);
      
      return true;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.notifyError(new Error('Failed to create WebSocket connection'));
      return false;
    }
  }
  
  private isValidData(data: any): boolean {
    // Basic validation to ensure the data has required fields
    return (
      data && 
      typeof data === 'object' &&
      ('ph' in data || 'temperature' in data || 'waterLevel' in data || 'tds' in data)
    );
  }
  
  private getDefaultWebSocketUrl(): string {
    console.log("Getting default WebSocket URL");
    if (this.isRaspberryPi()) {
      const hostname = window.location.hostname;
      const url = `ws://${hostname}:8081`;
      console.log(`Using Raspberry Pi URL: ${url}`);
      return url;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const url = `${protocol}//${window.location.host}/ws`;
      console.log(`Using proxied URL: ${url}`);
      return url;
    }
    
    const port = '8081';
    const url = `${protocol}//${window.location.hostname}:${port}`;
    console.log(`Using development URL: ${url}`);
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
    console.log(`Checking if Raspberry Pi: ${hostname} -> ${isRpi}`);
    return isRpi;
  }
  
  onData(callback: DataCallback) {
    this.callbacks.push(callback);
  }
  
  onError(callback: ErrorCallback) {
    this.errorCallbacks.push(callback);
  }
  
  private notifyError(error: Error) {
    this.errorCallbacks.forEach(callback => callback(error));
    
    const event = new CustomEvent('websocket-error', { 
      detail: { message: error.message, error } 
    });
    document.dispatchEvent(event);
  }
  
  disconnect() {
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
        console.warn('No data received from WebSocket in the last 20 seconds');
        this.notifyError(new Error('No data received from server (timeout)'));
        
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('Forcing WebSocket reconnection due to stale connection');
          this.ws.close();
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
