
type DataCallback = (data: {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
}) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: DataCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(serverUrl: string = this.getDefaultWebSocketUrl()) {
    console.log(`Attempting WebSocket connection to: ${serverUrl}`);
    
    try {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connection established successfully');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.callbacks.forEach(callback => callback(data));
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(serverUrl);
          }, delay);
        } else {
          console.error('Maximum reconnection attempts reached.');
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Try fallback to non-secure connection if secure connection fails
        if (serverUrl.startsWith('wss:') && this.reconnectAttempts === 0) {
          console.log('Secure WebSocket connection failed, trying fallback to non-secure...');
          const fallbackUrl = serverUrl.replace('wss:', 'ws:');
          console.log(`Fallback URL: ${fallbackUrl}`);
          setTimeout(() => this.connect(fallbackUrl), 1000);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }
  
  private getDefaultWebSocketUrl(): string {
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
  
  onData(callback: DataCallback) {
    this.callbacks.push(callback);
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks = [];
    this.reconnectAttempts = 0;
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
