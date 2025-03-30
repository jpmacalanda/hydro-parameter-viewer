
import { SerialData } from './types/serial.types';
import { toast } from "sonner";

type LogParserCallback = (data: SerialData) => void;

class LogParserService {
  private callbacks: LogParserCallback[] = [];
  private polling: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastProcessedTimestamp: string | null = null;
  private lastReceivedData: SerialData | null = null;

  /**
   * Start polling for logs and parse them for sensor data
   */
  startPolling(): void {
    if (this.polling) {
      this.stopPolling();
    }
    
    this.polling = true;
    
    console.log("[DOCKER-LOG][LogParserService] Started polling for sensor data");
    
    // Poll every 2 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchAndParseLogs();
    }, 2000);
    
    // Do an initial fetch
    this.fetchAndParseLogs();
    
    console.log("[DOCKER-LOG][LogParserService] Started polling serial monitor logs for data");
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
    
    console.log("[DOCKER-LOG][LogParserService] Stopped polling serial monitor logs");
  }

  /**
   * Fetch logs from the server and parse them for sensor data
   */
  private async fetchAndParseLogs(): Promise<void> {
    try {
      // In a production environment, fetch logs from an API endpoint that serves serial monitor logs
      // For this demo, we'll generate some mock logs
      const logs = this.generateMockSerialLogs();
      console.log("[DOCKER-LOG][LogParserService] Fetched raw logs:", logs);
      
      // Parse the logs for sensor data
      const sensorData = this.extractSensorDataFromLogs(logs);
      console.log("[DOCKER-LOG][LogParserService] Extracted sensor data:", sensorData.length > 0 ? JSON.stringify(sensorData) : "None found");
      
      // If we found valid sensor data, notify callbacks
      if (sensorData.length > 0) {
        // Get the most recent reading
        const latestData = sensorData[sensorData.length - 1];
        console.log("[DOCKER-LOG][LogParserService] Latest parsed data:", JSON.stringify(latestData));
        
        // Skip if it's the same data we've already processed
        if (this.lastReceivedData && 
            this.lastReceivedData.ph === latestData.ph &&
            this.lastReceivedData.temperature === latestData.temperature &&
            this.lastReceivedData.waterLevel === latestData.waterLevel &&
            this.lastReceivedData.tds === latestData.tds) {
          console.log("[DOCKER-LOG][LogParserService] Skipping duplicate data");
          return;
        }
        
        // Store this data as the last received
        this.lastReceivedData = latestData;
        console.log("[DOCKER-LOG][LogParserService] Updating latest data:", JSON.stringify(latestData));
        
        // Update listeners
        this.notifyCallbacks(latestData);
      } else {
        console.log("[DOCKER-LOG][LogParserService] No valid sensor data found in logs");
      }
    } catch (error) {
      console.error('[DOCKER-LOG][LogParserService] Error fetching logs:', error);
      toast.error('Failed to parse serial monitor logs', {
        description: 'Could not extract sensor data from logs'
      });
    }
  }

  /**
   * Extract sensor data from serial monitor logs
   */
  private extractSensorDataFromLogs(logs: string): SerialData[] {
    const results: SerialData[] = [];
    const lines = logs.split('\n');
    
    console.log(`[DOCKER-LOG][LogParserService] Processing ${lines.length} log lines`);
    
    for (const line of lines) {
      // Look for lines that contain sensor data format: pH:6.8,temp:23.5,water:medium,tds:650
      if (line.includes('pH:') && line.includes('temp:') && line.includes('water:') && line.includes('tds:')) {
        console.log("[DOCKER-LOG][LogParserService] Found potential data line:", line);
        try {
          // Extract timestamp to avoid processing the same data twice
          const timestampMatch = line.match(/^(.*?) - INFO/);
          const timestamp = timestampMatch ? timestampMatch[1] : null;
          
          // Skip if we've already processed this timestamp
          if (timestamp && timestamp === this.lastProcessedTimestamp) {
            console.log("[DOCKER-LOG][LogParserService] Skipping already processed timestamp:", timestamp);
            continue;
          }
          
          // Store the timestamp for future reference
          if (timestamp) {
            this.lastProcessedTimestamp = timestamp;
          }
          
          // Extract the data part between the {} brackets or parse the raw format
          const dataMatch = line.match(/\{([^}]+)\}/);
          if (dataMatch) {
            const dataString = `{${dataMatch[1]}}`;
            console.log("[DOCKER-LOG][LogParserService] Extracted JSON data:", dataString);
            // Parse the JSON data
            try {
              const data = JSON.parse(dataString);
              console.log("[DOCKER-LOG][LogParserService] Parsed JSON:", JSON.stringify(data));
              
              // Convert data to proper SerialData format
              const serialData: SerialData = {
                ph: typeof data.ph === 'number' ? data.ph : parseFloat(data.ph),
                temperature: typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature),
                waterLevel: (data.waterLevel || 'medium').toLowerCase() as "low" | "medium" | "high",
                tds: typeof data.tds === 'number' ? data.tds : parseInt(data.tds)
              };
              
              console.log("[DOCKER-LOG][LogParserService] Converted to SerialData:", JSON.stringify(serialData));
              results.push(serialData);
            } catch (jsonError) {
              console.error("[DOCKER-LOG][LogParserService] JSON parse error:", jsonError);
            }
          } else {
            // Try to parse raw format: pH:6.8,temp:23.5,water:medium,tds:650
            const dataRegex = /pH:(\d+\.\d+),temp:(\d+\.\d+),water:(\w+),tds:(\d+)/i;
            const match = line.match(dataRegex);
            
            if (match) {
              console.log("[DOCKER-LOG][LogParserService] Matched raw format data:", match[0]);
              const serialData: SerialData = {
                ph: parseFloat(match[1]),
                temperature: parseFloat(match[2]),
                waterLevel: match[3].toLowerCase() as "low" | "medium" | "high",
                tds: parseInt(match[4])
              };
              
              console.log("[DOCKER-LOG][LogParserService] Converted raw format to SerialData:", JSON.stringify(serialData));
              results.push(serialData);
            }
          }
        } catch (error) {
          console.error('[DOCKER-LOG][LogParserService] Error parsing sensor data from log:', error);
        }
      }
    }
    
    console.log(`[DOCKER-LOG][LogParserService] Found ${results.length} valid data entries in logs`);
    return results;
  }

  /**
   * Generate mock serial logs (in production, these would come from an API)
   */
  private generateMockSerialLogs(): string {
    const now = new Date().toISOString();
    const ph = (6.5 + Math.random() * 1.0).toFixed(1);
    const temp = (22 + Math.random() * 6.0).toFixed(1);
    const waterLevels = ["LOW", "MEDIUM", "HIGH"];
    const waterLevel = waterLevels[Math.floor(Math.random() * 3)];
    const tds = Math.floor(600 + Math.random() * 150);
    
    return `${now} - INFO - Serial Monitor started with port /dev/ttyUSB0 at 9600 baud
${now} - INFO - Running in PRODUCTION mode - using real hardware
${now} - INFO - Received data from Arduino: pH:${ph},temp:${temp},water:${waterLevel},tds:${tds}
${now} - INFO - Parsed data: {"ph":${ph},"temperature":${temp},"waterLevel":"${waterLevel}","tds":${tds}}
${now} - INFO - Waiting for next data...`;
  }

  /**
   * Register a callback to receive sensor data
   */
  onData(callback: LogParserCallback): void {
    this.callbacks.push(callback);
    console.log("[DOCKER-LOG][LogParserService] New callback registered, total callbacks:", this.callbacks.length);
  }

  /**
   * Remove a callback
   */
  removeCallback(callback: LogParserCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
      console.log("[DOCKER-LOG][LogParserService] Callback removed, remaining callbacks:", this.callbacks.length);
    }
  }

  /**
   * Notify all callbacks with new sensor data
   */
  private notifyCallbacks(data: SerialData): void {
    console.log("[DOCKER-LOG][LogParserService] Notifying all callbacks with data:", JSON.stringify(data));
    this.callbacks.forEach((callback, index) => {
      console.log(`[DOCKER-LOG][LogParserService] Calling callback #${index + 1}`);
      callback(data);
    });
  }
}

const logParserService = new LogParserService();
export default logParserService;
