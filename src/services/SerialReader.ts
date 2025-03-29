import { SerialData, SerialPortInterface, DataCallback, RawMessageCallback } from './types/serial.types';

type ErrorCallback = (error: Error) => void;

class SerialReader {
  private port: SerialPortInterface | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private reading: boolean = false;
  private dataCallbacks: DataCallback[] = [];
  private rawCallbacks: RawMessageCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private buffer: string = '';
  private lastMessageTime: number = 0;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  
  setPort(port: SerialPortInterface): void {
    this.port = port;
  }
  
  onData(callback: DataCallback): void {
    this.dataCallbacks.push(callback);
  }
  
  onRawMessage(callback: RawMessageCallback): void {
    this.rawCallbacks.push(callback);
  }
  
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
  
  async startReading(): Promise<void> {
    if (!this.port || this.reading) {
      return;
    }
    
    try {
      this.reading = true;
      this.buffer = '';
      const textDecoder = new TextDecoder();
      this.reader = this.port.readable.getReader();
      
      // Set up connection timeout check
      this.setupConnectionTimeout();
      
      while (this.reading) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        
        const text = textDecoder.decode(value);
        this.buffer += text;
        
        // Process any complete messages
        this.processBuffer();
        
        // Reset the connection timeout check
        this.resetConnectionTimeout();
      }
      
      if (this.reader) {
        await this.reader.releaseLock();
        this.reader = null;
      }
    } catch (error) {
      console.error('Error reading from serial port:', error);
      this.notifyError(new Error('Arduino disconnected'));
    } finally {
      this.reading = false;
      this.clearConnectionTimeout();
    }
  }
  
  async stopReading(): Promise<void> {
    this.reading = false;
    
    if (this.reader) {
      try {
        await this.reader.cancel();
        await this.reader.releaseLock();
        this.reader = null;
      } catch (error) {
        console.error('Error stopping reader:', error);
      }
    }
    
    this.clearConnectionTimeout();
  }
  
  clearCallbacks(): void {
    this.dataCallbacks = [];
    this.rawCallbacks = [];
    this.errorCallbacks = [];
  }
  
  private processBuffer(): void {
    // Find any complete lines (\n or \r\n terminated)
    const lines = this.buffer.split(/\r?\n/);
    
    // The last element is either an empty string (if the buffer ended with a newline)
    // or an incomplete line that we should keep in the buffer
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        this.processMessage(line.trim());
      }
    }
  }
  
  private processMessage(message: string): void {
    try {
      // Update the last message timestamp
      this.lastMessageTime = Date.now();
      
      // Notify listeners about the raw message
      this.rawCallbacks.forEach(callback => callback(message));
      
      // Parse the message format: pH:6.8,temp:23.5,water:medium,tds:650
      const parsed = this.parseMessage(message);
      if (parsed) {
        this.dataCallbacks.forEach(callback => callback(parsed));
      }
    } catch (error) {
      console.error('Error processing message:', message, error);
      this.notifyError(new Error(`Invalid data format: ${message}`));
    }
  }
  
  private parseMessage(message: string): SerialData | null {
    const parts = message.split(',');
    const data: Partial<SerialData> = {};
    
    for (const part of parts) {
      const [key, value] = part.split(':');
      
      if (!key || !value) {
        throw new Error(`Invalid data format in part: ${part}`);
      }
      
      switch (key.toLowerCase()) {
        case 'ph':
          data.ph = parseFloat(value);
          if (isNaN(data.ph)) {
            throw new Error(`Invalid pH value: ${value}`);
          }
          break;
        case 'temp':
          data.temperature = parseFloat(value);
          if (isNaN(data.temperature)) {
            throw new Error(`Invalid temperature value: ${value}`);
          }
          break;
        case 'water':
          if (value !== 'low' && value !== 'medium' && value !== 'high') {
            throw new Error(`Invalid water level: ${value}`);
          }
          data.waterLevel = value;
          break;
        case 'tds':
          data.tds = parseInt(value, 10);
          if (isNaN(data.tds)) {
            throw new Error(`Invalid TDS value: ${value}`);
          }
          break;
        default:
          console.warn(`Unknown data key: ${key}`);
      }
    }
    
    // Ensure all required fields are present
    if (
      typeof data.ph !== 'number' ||
      typeof data.temperature !== 'number' ||
      !data.waterLevel ||
      typeof data.tds !== 'number'
    ) {
      throw new Error(`Incomplete data: ${message}`);
    }
    
    return data as SerialData;
  }
  
  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
  
  private setupConnectionTimeout(): void {
    this.clearConnectionTimeout();
    this.lastMessageTime = Date.now();
    this.connectionTimeout = setInterval(() => {
      const now = Date.now();
      // If no message for 10 seconds, consider Arduino disconnected
      if (now - this.lastMessageTime > 10000) {
        this.notifyError(new Error('Arduino disconnected (timeout)'));
        this.stopReading();
      }
    }, 5000);
  }
  
  private resetConnectionTimeout(): void {
    this.lastMessageTime = Date.now();
  }
  
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearInterval(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
}

const serialReader = new SerialReader();
export default serialReader;
