
#!/usr/bin/env python3
"""
Serial Monitor - A standalone script that reads data from Arduino serial port 
and logs to a file that the web app can read
"""

import serial
import time
import os
import sys
import logging
import json
from datetime import datetime

# Set up logging to both console and file
LOG_DIR = "/app/logs"
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "serial_monitor.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("serial_monitor")

# Serial port configuration
SERIAL_PORT = os.environ.get('SERIAL_PORT', '/dev/ttyUSB0')
BAUD_RATE = int(os.environ.get('BAUD_RATE', 9600))
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', 5))
RETRY_DELAY = int(os.environ.get('RETRY_DELAY', 3))

def main():
    logger.info(f"Serial Monitor starting with: PORT={SERIAL_PORT}, BAUD={BAUD_RATE}")
    
    # Try to connect to serial port with retries
    retries = 0
    ser = None
    
    while retries < MAX_RETRIES:
        # Check if serial port exists
        if not os.path.exists(SERIAL_PORT):
            logger.error(f"Serial port {SERIAL_PORT} not found! Retrying in {RETRY_DELAY} seconds...")
            retries += 1
            time.sleep(RETRY_DELAY)
            continue
            
        # Try to open the serial port
        try:
            logger.info(f"Opening serial port {SERIAL_PORT} at {BAUD_RATE} baud...")
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
            logger.info(f"Successfully opened {SERIAL_PORT}")
            break
        except serial.SerialException as e:
            logger.error(f"Failed to open serial port: {e}")
            retries += 1
            
            if retries < MAX_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY} seconds... (Attempt {retries}/{MAX_RETRIES})")
                time.sleep(RETRY_DELAY)
            else:
                logger.error(f"Maximum retries ({MAX_RETRIES}) reached. Exiting.")
                logger.error("Please ensure Arduino is connected and port is accessible")
                return 1
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return 1
    
    # Main read loop
    try:
        # Flush any initial data
        if ser.in_waiting:
            ser.read(ser.in_waiting)
            
        # Main read loop
        while True:
            try:
                if ser.in_waiting > 0:
                    line = ser.readline().decode('utf-8').strip()
                    if line:
                        # Log the raw data
                        logger.info(f"SERIAL DATA: {line}")
                        
                        # Try to parse the data
                        try:
                            parts = line.split(',')
                            data = {}
                            for part in parts:
                                if ':' in part:
                                    key, value = part.split(':')
                                    data[key.strip().lower()] = value.strip()
                            
                            if 'ph' in data and 'temp' in data and 'water' in data and 'tds' in data:
                                ph = float(data['ph'])
                                temp = float(data['temp'])
                                water = data['water'].upper()
                                tds = int(data['tds'])
                                
                                # Log in both formats for easier debugging
                                # JSON format
                                json_data = {"ph": ph, "temperature": temp, "waterLevel": water, "tds": tds}
                                logger.info(f"Parsed data: {json.dumps(json_data)}")
                                
                                # Add multiple formats to make parsing easier 
                                logger.info(f"JSON parsed_data={json.dumps(json_data)}")
                                logger.info(f"JSON_DATA={json.dumps(json_data)}")
                                logger.info(f"SENSOR_DATA pH:{ph},temp:{temp},water:{water},tds:{tds}")
                                
                                # Raw format
                                logger.info(f"pH:{ph},temp:{temp},water:{water},tds:{tds}")
                        except Exception as e:
                            logger.error(f"Error parsing data: {e}")
                else:
                    time.sleep(0.1)
            except KeyboardInterrupt:
                logger.info("Received keyboard interrupt. Exiting...")
                break
            except Exception as e:
                logger.error(f"Error reading serial data: {e}")
                time.sleep(1)
                
    except Exception as e:
        logger.error(f"Error in read loop: {e}")
        return 1
    finally:
        if ser and ser.is_open:
            ser.close()
            logger.info("Closed serial port")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
