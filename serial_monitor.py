
#!/usr/bin/env python3
import argparse
import logging
import os
import random
import sys
import threading
import time
from typing import Dict, Optional, Tuple
import math

# Get environment variables or use defaults
SERIAL_PORT = os.environ.get('SERIAL_PORT', '/dev/ttyUSB0')
BAUD_RATE = int(os.environ.get('BAUD_RATE', 9600))
MOCK_DATA = os.environ.get('MOCK_DATA', 'false').lower() in ('true', 't', '1', 'yes', 'y')
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', 5))
RETRY_DELAY = int(os.environ.get('RETRY_DELAY', 3))

# Configure logging
log_directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_directory, exist_ok=True)
log_file = os.path.join(log_directory, 'serial_monitor.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('Serial Monitor')

# Mock data parameters for trend-based simulation
mock_data = {
    'ph': 6.5,              # Initial pH value
    'temperature': 25.0,    # Initial temperature in Celsius
    'water': 'medium',      # Initial water level
    'tds': 650,             # Initial TDS (Total Dissolved Solids) in PPM
    # Parameters to control trend-based changes
    'ph_trend': 0.0,        # Current trend direction for pH
    'temp_trend': 0.0,      # Current trend direction for temperature
    'tds_trend': 0.0,       # Current trend direction for TDS
    'water_counter': 0,     # Counter for water level changes
    'trend_duration': 0     # How long current trend continues
}

def generate_mock_data() -> str:
    """Generate realistic mock sensor data with gradual trends"""
    global mock_data
    
    # Update trend duration counter
    mock_data['trend_duration'] -= 1
    
    # Periodically change trend direction
    if mock_data['trend_duration'] <= 0:
        # Set a new trend duration between 10-30 cycles
        mock_data['trend_duration'] = random.randint(10, 30)
        
        # Change trend directions slightly - this creates more natural looking data
        mock_data['ph_trend'] = random.uniform(-0.05, 0.05)
        mock_data['temp_trend'] = random.uniform(-0.2, 0.2)
        mock_data['tds_trend'] = random.uniform(-5, 5)
    
    # Add small random noise to the trends for realism
    ph_noise = random.uniform(-0.02, 0.02)
    temp_noise = random.uniform(-0.1, 0.1)
    tds_noise = random.uniform(-2, 2)
    
    # Update values with trend and noise
    mock_data['ph'] += mock_data['ph_trend'] + ph_noise
    mock_data['temperature'] += mock_data['temp_trend'] + temp_noise
    mock_data['tds'] += mock_data['tds_trend'] + tds_noise
    
    # Constrain values to realistic ranges
    mock_data['ph'] = max(4.0, min(9.0, mock_data['ph']))  # pH between 4.0-9.0
    mock_data['temperature'] = max(15.0, min(35.0, mock_data['temperature']))  # Temperature between 15-35°C
    mock_data['tds'] = max(200, min(1500, mock_data['tds']))  # TDS between 200-1500 PPM
    
    # Water level changes less frequently
    mock_data['water_counter'] += 1
    if mock_data['water_counter'] >= 50:  # Change water level every 50 cycles
        mock_data['water_counter'] = 0
        water_options = ['low', 'medium', 'high']
        current_index = water_options.index(mock_data['water']) if mock_data['water'] in water_options else 1
        # Usually move only one step up or down
        new_index = max(0, min(2, current_index + random.choice([-1, 0, 1])))
        mock_data['water'] = water_options[new_index]
    
    # Format the mock data as a string like real Arduino data
    mock_data_str = f"pH:{mock_data['ph']:.2f},temp:{mock_data['temperature']:.2f},water:{mock_data['water']},tds:{int(mock_data['tds'])}"
    
    return mock_data_str

def write_mock_data_to_log() -> None:
    """Periodically write mock data to the log"""
    while True:
        mock_data_str = generate_mock_data()
        logger.info(f"[MOCK DATA] {mock_data_str}")
        time.sleep(2)  # Update every 2 seconds

def main() -> None:
    parser = argparse.ArgumentParser(description="Serial Monitor for Arduino Data")
    parser.add_argument('--port', default=SERIAL_PORT, help=f"Serial port (default: {SERIAL_PORT})")
    parser.add_argument('--baud', type=int, default=BAUD_RATE, help=f"Baud rate (default: {BAUD_RATE})")
    parser.add_argument('--mock', action='store_true', default=MOCK_DATA, help="Use mock data instead of real Arduino data")
    args = parser.parse_args()

    logger.info("Starting Serial Monitor service")
    logger.info(f"Configuration: PORT={args.port}, BAUD={args.baud}, MOCK={args.mock}")
    
    if args.mock:
        logger.info("Using MOCK DATA mode - no Arduino connection required")
        write_mock_data_to_log()
    else:
        try:
            import serial
            ser = None
            
            # Try to connect to the serial port with retries
            retries = 0
            while retries < MAX_RETRIES:
                try:
                    logger.info(f"Attempting to connect to {args.port} at {args.baud} baud (attempt {retries+1}/{MAX_RETRIES})")
                    ser = serial.Serial(args.port, args.baud, timeout=1)
                    logger.info(f"Connected to {args.port} at {args.baud} baud")
                    break
                except serial.SerialException as e:
                    logger.error(f"Failed to connect: {e}")
                    retries += 1
                    if retries < MAX_RETRIES:
                        logger.info(f"Retrying in {RETRY_DELAY} seconds...")
                        time.sleep(RETRY_DELAY)
            
            if ser is None:
                logger.error(f"Failed to connect after {MAX_RETRIES} attempts")
                logger.warning("Falling back to MOCK DATA mode")
                write_mock_data_to_log()
                return
            
            # Main loop to read from serial port
            logger.info("Starting to read data from Arduino")
            while True:
                try:
                    if ser.in_waiting:
                        line = ser.readline().decode('utf-8').strip()
                        if line:
                            logger.info(line)
                except serial.SerialException as e:
                    logger.error(f"Serial error: {e}")
                    logger.warning("Falling back to MOCK DATA mode")
                    if ser and ser.is_open:
                        ser.close()
                    write_mock_data_to_log()
                    break
                except Exception as e:
                    logger.error(f"Error reading from serial port: {e}")
                    if ser and ser.is_open:
                        ser.close()
                    logger.warning("Falling back to MOCK DATA mode")
                    write_mock_data_to_log()
                    break
        
        except ImportError:
            logger.error("PySerial not installed. Cannot read from real Arduino.")
            logger.warning("Falling back to MOCK DATA mode")
            write_mock_data_to_log()

if __name__ == "__main__":
    main()
