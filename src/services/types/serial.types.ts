
// Type definitions for serial communication

export interface SerialData {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
}

export type DataCallback = (data: SerialData) => void;
export type RawMessageCallback = (message: string) => void;
export type ErrorCallback = (error: Error) => void;

// Define a type for SerialPort if it doesn't exist
export interface SerialPortInterface {
  readable: ReadableStream;
  close(): Promise<void>;
  open(options: { baudRate: number }): Promise<void>;
}

// Extend the Navigator interface to include serial
declare global {
  interface Navigator {
    serial?: {
      requestPort(): Promise<SerialPortInterface>;
    }
  }
}
