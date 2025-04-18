
import asyncio
import serial
import json
import time
import logging
import subprocess
from typing import Set, Dict, Union, Any
import os

import settings

logger = logging.getLogger("hydroponics_server")

# Serial connection object
ser = None

def initialize_serial():
    """Initialize the serial connection"""
    global ser
    
    # Check if the serial port device exists
    if not os.path.exists(settings.SERIAL_PORT):
        logger.error(f"Serial port {settings.SERIAL_PORT} does not exist")
        logger.error("Check if Arduino is connected and using the correct port")
        return None
    
    # Check if port is used by other processes
    port_busy, pids, cmds = settings.check_serial_port_used_by_process()
    if port_busy:
        logger.warning(f"Serial port {settings.SERIAL_PORT} is busy with process(es): {pids}")
        logger.warning(f"Command(s): {cmds}")
        
        # Check if it's our own monitoring process and ignore if so
        if any("serial_monitor.py" in cmd for cmd in cmds):
            logger.info("Port is being used by our serial_monitor.py - this is fine")
        else:
            logger.warning("Serial port is busy with other processes")
            return None
        
    # Try connecting to the serial port with retries
    max_retries = 5
    retry_delay = 3
    retries = 0
    
    while retries < max_retries:
        try:
            logger.debug(f"Attempting to open serial port {settings.SERIAL_PORT} at {settings.BAUD_RATE} baud (attempt {retries+1}/{max_retries})")
            ser = serial.Serial(settings.SERIAL_PORT, settings.BAUD_RATE, timeout=1)
            logger.info(f"Serial connection established on {settings.SERIAL_PORT}")
            
            # Flush initial data
            if ser.in_waiting:
                initial_data = ser.read(ser.in_waiting)
                logger.info(f"Flushing initial data: {initial_data}")
            return ser
        except serial.SerialException as e:
            logger.error(f"Error opening serial port: {e}")
            retries += 1
            
            if retries < max_retries:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Maximum retries ({max_retries}) reached. Unable to connect to Arduino.")
                logger.error(f"CHECK IF:")
                logger.error(f"- Arduino is connected to {settings.SERIAL_PORT}")
                logger.error(f"- You have permission to access {settings.SERIAL_PORT} (try: sudo chmod 666 {settings.SERIAL_PORT})")
                logger.error(f"- The Arduino is sending data in the format: pH:6.20,temp:23.20,water:medium,tds:652")
                logger.error(f"- The port is not in use by another process (try: lsof {settings.SERIAL_PORT})")
                return None
        except Exception as e:
            logger.error(f"Unexpected error when connecting to serial port: {e}")
            return None

async def read_serial():
    """Read data from the serial port and process it"""
    global ser
    
    # If no serial connection is available, just wait indefinitely
    if not ser:
        logger.error("No serial connection available. Make sure the Arduino is properly connected.")
        # Wait indefinitely but periodically check if a connection becomes available
        while True:
            ser = initialize_serial()
            if ser:
                logger.info("Serial connection established, proceeding with data reading")
                break
            await asyncio.sleep(30)  # Check every 30 seconds
    
    buffer = ""
    last_message_time = time.time()
    no_data_warning_sent = False
    reconnect_attempts = 0
    max_reconnect_attempts = 5

    while True:
        current_time = time.time()
        
        # Check if we need to reconnect
        if not ser or not ser.is_open:
            if reconnect_attempts < max_reconnect_attempts:
                logger.warning(f"Serial connection lost. Attempting to reconnect ({reconnect_attempts+1}/{max_reconnect_attempts})...")
                ser = initialize_serial()
                reconnect_attempts += 1
                if not ser:
                    logger.error("Failed to reconnect to serial port")
                    await asyncio.sleep(5)  # Wait before next attempt
                    continue
                else:
                    logger.info("Successfully reconnected to serial port")
                    reconnect_attempts = 0
            else:
                logger.error("Maximum reconnection attempts reached. Unable to connect to Arduino.")
                # Continuously try to reconnect after max attempts reached, but less frequently
                ser = initialize_serial()
                if ser:
                    logger.info("Serial connection re-established after extended attempts")
                    reconnect_attempts = 0
                else:
                    await asyncio.sleep(60)  # Wait a full minute before trying again
                    continue
        
        try:
            if ser and ser.in_waiting > 0:
                # Read directly from serial
                data = ser.read(ser.in_waiting).decode('utf-8')
                buffer += data
                last_message_time = current_time
                no_data_warning_sent = False
                
                logger.debug(f"Read {len(data)} bytes from serial")
                
                # Process any complete lines ending with newline
                lines = buffer.split('\n')
                buffer = lines.pop()  # Keep the incomplete line in buffer
                
                for line in lines:
                    line = line.strip()
                    if not line:  # Skip empty lines
                        continue
                        
                    logger.info(f"Raw data from Arduino: {line}")
                    
                    # Parse the Arduino data in format pH:6.20,temp:23.20,water:medium,tds:652
                    parsed_data = {}
                    parts = line.split(',')
                    
                    for part in parts:
                        key_value = part.split(':')
                        if len(key_value) == 2:
                            key, value = key_value
                            key = key.strip().lower()
                            value = value.strip()
                            
                            if key == 'ph':
                                try:
                                    parsed_data['ph'] = float(value)
                                except ValueError:
                                    logger.error(f"Invalid pH value: {value}")
                            elif key == 'temp' or key == 'temperature':
                                try:
                                    parsed_data['temperature'] = float(value)
                                except ValueError:
                                    logger.error(f"Invalid temperature value: {value}")
                            elif key == 'water' or key == 'waterlevel':
                                # Convert to lowercase to match the format expected by the web app
                                parsed_data['waterLevel'] = value.lower()
                            elif key == 'tds':
                                try:
                                    parsed_data['tds'] = int(value)
                                except ValueError:
                                    logger.error(f"Invalid TDS value: {value}")
                    
                    # Only log if we have a valid data structure
                    if 'ph' in parsed_data and 'temperature' in parsed_data and 'waterLevel' in parsed_data and 'tds' in parsed_data:
                        logger.info(f"Parsed data: {json.dumps(parsed_data)}")
                    else:
                        logger.warning(f"Incomplete or invalid data: {parsed_data}")
                        logger.warning(f"Expected format: pH:6.20,temp:23.20,water:medium,tds:652")
            elif (current_time - last_message_time) > 10 and not no_data_warning_sent:
                # No data from Arduino for 10 seconds
                logger.warning("No data received from Arduino in 10 seconds!")
                logger.warning("Check if Arduino is properly connected and sending data")
                no_data_warning_sent = True
                
        except serial.SerialException as e:
            logger.error(f"Serial port error: {e}")
            # Close the serial port and attempt to reconnect on next loop
            try:
                if ser and ser.is_open:
                    ser.close()
            except:
                pass
            ser = None
        except Exception as e:
            logger.error(f"Error reading/processing serial data: {e}")
                
        await asyncio.sleep(0.1)  # Check more frequently

def cleanup():
    """Clean up resources when shutting down"""
    global ser
    if ser and ser.is_open:
        try:
            ser.close()
            logger.info("Serial connection closed")
        except Exception as e:
            logger.error(f"Error closing serial connection: {e}")
