
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
    this.ws = new WebSocket(serverUrl);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.callbacks.forEach(callback => callback(data));
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(serverUrl);
        }, 2000);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private getDefaultWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:8081`;
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
