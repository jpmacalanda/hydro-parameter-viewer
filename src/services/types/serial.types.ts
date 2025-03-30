
// Type definitions for serial communication

export interface SerialData {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
  timestamp?: string; // Make timestamp optional
}

export type DataCallback = (data: SerialData) => void;
export type RawMessageCallback = (message: string) => void;
export type ErrorCallback = (error: Error) => void;

// Information about a serial port for UI display
export interface SerialPortInfo {
  id: string;
  port: SerialPortInterface;
  displayName: string;
}

// Define a type for SerialPort if it doesn't exist
export interface SerialPortInterface {
  readable: ReadableStream;
  close(): Promise<void>;
  open(options: { baudRate: number }): Promise<void>;
  getInfo?(): {
    usbVendorId?: number;
    usbProductId?: number;
  };
}

// Extend the Navigator interface to include serial
declare global {
  interface Navigator {
    serial?: {
      requestPort(): Promise<SerialPortInterface>;
      getPorts(): Promise<SerialPortInterface[]>;
    }
  }
}
