
#!/usr/bin/env python3
"""
Serial Monitor - A standalone script that reads data from Arduino serial port 
and prints to stdout (which appears in Docker logs)
"""

import serial
import time
import os
import sys
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("serial_monitor")

# Serial port configuration
SERIAL_PORT = os.environ.get('SERIAL_PORT', '/dev/ttyUSB0')
BAUD_RATE = int(os.environ.get('BAUD_RATE', 9600))
MOCK_DATA = os.environ.get('MOCK_DATA', 'false').lower() == 'true'
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', 5))
RETRY_DELAY = int(os.environ.get('RETRY_DELAY', 3))

def generate_mock_data():
    """Generate mock data for testing purposes"""
    import random
    while True:
        ph = round(random.uniform(5.5, 7.5), 1)
        temp = round(random.uniform(20.0, 28.0), 1)
        water_level = random.choice(["low", "medium", "high"])
        tds = random.randint(400, 800)
        data_str = f"pH:{ph},temp:{temp},water:{water_level},tds:{tds}"
        logger.info(f"MOCK DATA: {data_str}")
        time.sleep(2)

def main():
    logger.info(f"Serial Monitor starting with: PORT={SERIAL_PORT}, BAUD={BAUD_RATE}, MOCK={MOCK_DATA}")
    
    if MOCK_DATA:
        logger.info("Using mock data mode")
        generate_mock_data()
        return
    
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
                logger.error(f"Maximum retries ({MAX_RETRIES}) reached. Falling back to mock data.")
                generate_mock_data()
                return
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
                        logger.info(f"SERIAL DATA: {line}")
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
