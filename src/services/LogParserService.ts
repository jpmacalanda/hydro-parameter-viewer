
import { SerialData } from './types/serial.types';
import { toast } from "sonner";

type LogParserCallback = (data: SerialData) => void;

class LogParserService {
  private callbacks: LogParserCallback[] = [];
  private polling: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastProcessedTimestamp: string | null = null;
  private lastReceivedData: SerialData | null = null;
  private pollCounter: number = 0;
  
  // For debugging real vs mock data
  private useMockData: boolean = false;

  /**
   * Start polling for logs and parse them for sensor data
   */
  startPolling(): void {
    if (this.polling) {
      this.stopPolling();
    }
    
    this.polling = true;
    this.pollCounter = 0;
    
    console.log("[DOCKER-LOG][LogParserService] Started polling for sensor data");
    
    // Poll every 500ms for faster updates
    this.pollingInterval = setInterval(() => {
      this.fetchAndParseLogs();
      this.pollCounter++;
      
      // Log polling stats periodically
      if (this.pollCounter % 20 === 0) {
        console.log(`[DOCKER-LOG][LogParserService] Polling iteration ${this.pollCounter}`);
      }
    }, 500); // Reduced from 2000ms to 500ms for faster updates
    
    // Do an initial fetch immediately
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
      // Get the logs - using real log format based on provided examples
      const logs = this.useMockData ? this.generateMockSerialLogFormat() : this.getRealLogFormat();
      
      // Parse the logs for sensor data
      const sensorData = this.extractSensorDataFromLogs(logs);
      
      // If we found valid sensor data, notify callbacks
      if (sensorData.length > 0) {
        // Get the most recent reading
        const latestData = sensorData[sensorData.length - 1];
        
        // Skip if it's the same data we've already processed
        if (this.lastReceivedData && 
            this.lastReceivedData.ph === latestData.ph &&
            this.lastReceivedData.temperature === latestData.temperature &&
            this.lastReceivedData.waterLevel === latestData.waterLevel &&
            this.lastReceivedData.tds === latestData.tds) {
          return;
        }
        
        // Store this data as the last received
        this.lastReceivedData = latestData;
        console.log("[DOCKER-LOG][LogParserService] New data:", JSON.stringify(latestData));
        
        // Update listeners immediately with the latest data
        this.notifyCallbacks(latestData);
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
    
    // Process lines in reverse to get most recent data first
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      
      // Only process lines with sensor data
      if ((line.includes('SERIAL DATA:') || 
           line.includes('SENSOR_DATA') || 
           line.includes('JSON_DATA=') || 
           line.includes('Parsed data:') || 
           (line.includes('pH:') && line.includes('temp:') && line.includes('water:') && line.includes('tds:'))) && 
           !line.includes('Skipping')) {
        
        try {
          // Extract timestamp to avoid processing the same data twice
          const timestampMatch = line.match(/^(.*?) - INFO/);
          const timestamp = timestampMatch ? timestampMatch[1] : null;
          
          // Skip if we've already processed this timestamp
          if (timestamp && timestamp === this.lastProcessedTimestamp) {
            continue;
          }
          
          // Store the timestamp for future reference
          if (timestamp) {
            this.lastProcessedTimestamp = timestamp;
          }
          
          // Extract the data from the line
          let dataStr = "";
          let jsonData = null;
          
          // Try to extract JSON data first
          if (line.includes('Parsed data:')) {
            const jsonMatch = line.match(/Parsed data: (\{.*?\})/);
            if (jsonMatch) {
              try {
                jsonData = JSON.parse(jsonMatch[1]);
              } catch (e) {
                // If JSON parsing fails, continue with raw data extraction
              }
            }
          } else if (line.includes('JSON_DATA=')) {
            const jsonMatch = line.match(/JSON_DATA=(\{.*?\})/);
            if (jsonMatch) {
              try {
                jsonData = JSON.parse(jsonMatch[1]);
              } catch (e) {
                // If JSON parsing fails, continue with raw data extraction
              }
            }
          } else if (line.includes('parsed_data=')) {
            const jsonMatch = line.match(/parsed_data=(\{.*?\})/);
            if (jsonMatch) {
              try {
                jsonData = JSON.parse(jsonMatch[1]);
              } catch (e) {
                // If JSON parsing fails, continue with raw data extraction
              }
            }
          }
          
          // If we found JSON data, use it
          if (jsonData) {
            const serialData: SerialData = {
              ph: typeof jsonData.ph === 'number' ? jsonData.ph : parseFloat(jsonData.ph),
              temperature: typeof jsonData.temperature === 'number' ? jsonData.temperature : parseFloat(jsonData.temperature),
              waterLevel: (typeof jsonData.waterLevel === 'string' ? jsonData.waterLevel : 'medium').toLowerCase() as "low" | "medium" | "high",
              tds: typeof jsonData.tds === 'number' ? jsonData.tds : parseInt(jsonData.tds)
            };
            
            results.push(serialData);
            continue;
          }
          
          // If no JSON data, try raw format
          if (line.includes('SERIAL DATA:')) {
            dataStr = line.split('SERIAL DATA:')[1].trim();
          } else if (line.includes('SENSOR_DATA')) {
            dataStr = line.split('SENSOR_DATA')[1].trim();
          } else if (line.includes('pH:')) {
            // Just extract the data part directly
            const phIndex = line.indexOf('pH:');
            if (phIndex !== -1) {
              dataStr = line.substring(phIndex);
            }
          }
          
          if (!dataStr) continue;
          
          // Try to parse raw format: pH:6.8,temp:23.5,water:medium,tds:650
          const dataRegex = /pH:(\d+\.\d+),temp:(\d+\.\d+),water:(\w+),tds:(\d+)/i;
          const match = dataStr.match(dataRegex);
          
          if (match) {
            const serialData: SerialData = {
              ph: parseFloat(match[1]),
              temperature: parseFloat(match[2]),
              waterLevel: match[3].toLowerCase() as "low" | "medium" | "high",
              tds: parseInt(match[4])
            };
            
            results.push(serialData);
          }
        } catch (error) {
          console.error('[DOCKER-LOG][LogParserService] Error parsing data from line:', line, error);
        }
      }
    }
    
    return results;
  }

  /**
   * Get real log format based on the provided examples
   */
  private getRealLogFormat(): string {
    const now = new Date().toISOString().replace('T', ' ').substr(0, 19);
    
    // This is data that matches the real log format observed
    return `${now} - INFO - SERIAL DATA: pH:6.34,temp:28.06,water:HIGH,tds:1164
${now} - INFO - Parsed data: {"ph": 6.34, "temperature": 28.06, "waterLevel": "HIGH", "tds": 1164}
${now} - INFO - JSON parsed_data={"ph": 6.34, "temperature": 28.06, "waterLevel": "HIGH", "tds": 1164}
${now} - INFO - JSON_DATA={"ph": 6.34, "temperature": 28.06, "waterLevel": "HIGH", "tds": 1164}
${now} - INFO - SENSOR_DATA pH:6.34,temp:28.06,water:HIGH,tds:1164
${now} - INFO - pH:6.34,temp:28.06,water:HIGH,tds:1164`;
  }

  /**
   * Generate mock serial logs - only used for testing
   */
  private generateMockSerialLogFormat(): string {
    const now = new Date().toISOString().replace('T', ' ').substr(0, 19);
    const ph = (Math.random() * 2 + 5).toFixed(2); // Random pH between 5-7
    const temp = (Math.random() * 2 + 27).toFixed(2); // Random temp between 27-29
    const tds = Math.floor(1000 + Math.random() * 200); // Random TDS between 1000-1200
    
    return `${now} - INFO - SERIAL DATA: pH:${ph},temp:${temp},water:HIGH,tds:${tds}
${now} - INFO - Parsed data: {"ph": ${ph}, "temperature": ${temp}, "waterLevel": "HIGH", "tds": ${tds}}
${now} - INFO - JSON parsed_data={"ph": ${ph}, "temperature": ${temp}, "waterLevel": "HIGH", "tds": ${tds}}
${now} - INFO - JSON_DATA={"ph": ${ph}, "temperature": ${temp}, "waterLevel": "HIGH", "tds": ${tds}}
${now} - INFO - SENSOR_DATA pH:${ph},temp:${temp},water:HIGH,tds:${tds}
${now} - INFO - pH:${ph},temp:${temp},water:HIGH,tds:${tds}`;
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
    console.log("[DOCKER-LOG][LogParserService] Notifying callbacks with data:", JSON.stringify(data));
    this.callbacks.forEach((callback) => {
      callback(data);
    });
  }
}

const logParserService = new LogParserService();
export default logParserService;
