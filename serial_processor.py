import asyncio
import serial
import json
import time
import random
import logging
import websockets
from typing import Set, Dict, Union, Any

import settings

logger = logging.getLogger("hydroponics_server")

# Will be set from websocket_handler
connected_clients: Set[websockets.WebSocketServerProtocol] = set()

# Serial connection object
ser = None

def initialize_serial():
    """Initialize the serial connection or fall back to mock data mode"""
    global ser
    
    if settings.MOCK_DATA:
        logger.info("Running in MOCK DATA mode - will generate simulated sensor readings")
        return None
    
    # Check if port is used by other processes
    port_busy, pids, cmds = settings.check_serial_port_used_by_process()
    if port_busy:
        logger.warning("Serial port is busy, falling back to mock data mode")
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
                logger.error(f"Maximum retries ({max_retries}) reached. Falling back to mock data.")
                logger.info("Falling back to mock data mode")
                logger.error(f"CHECK IF:")
                logger.error(f"- Arduino is connected to {settings.SERIAL_PORT}")
                logger.error(f"- You have permission to access {settings.SERIAL_PORT} (try: sudo chmod 666 {settings.SERIAL_PORT})")
                logger.error(f"- The Arduino is sending data in the format: pH:6.20,temp:23.20,water:medium,tds:652")
                logger.error(f"- The port is not in use by another process (try: lsof {settings.SERIAL_PORT})")
                return None
        except Exception as e:
            logger.error(f"Unexpected error when connecting to serial port: {e}")
            logger.info("Falling back to mock data mode")
            return None

async def send_data_to_clients(data: Dict[str, Any]):
    """Send data to all connected clients"""
    if not connected_clients:
        logger.debug("No clients connected, skipping data send")
        return
        
    message = json.dumps(data)
    websockets_to_remove = set()
    client_count = len(connected_clients)
    
    for client in connected_clients:
        try:
            client_address = client.remote_address if hasattr(client, 'remote_address') else 'Unknown'
            client_ip = client_address[0] if isinstance(client_address, tuple) and len(client_address) > 0 else 'Unknown IP'
            await client.send(message)
            logger.debug(f"Sent data to client {client_ip}")
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"Connection closed during send: Code {e.code}, Reason: {e.reason}")
            websockets_to_remove.add(client)
        except Exception as e:
            logger.error(f"Error sending data: {e}")
            websockets_to_remove.add(client)
    
    # Remove any closed connections
    if websockets_to_remove:
        connected_clients.difference_update(websockets_to_remove)
        logger.info(f"Removed {len(websockets_to_remove)} closed connections")
        
    logger.info(f"Sent data to {client_count} clients: {message}")

async def generate_mock_data():
    """Generate mock sensor data when no Arduino is connected"""
    ph = 6.5
    temp = 23.0
    tds = 650
    water_levels = ["low", "medium", "high"]
    water_idx = 1  # Start with "medium"
    
    while True:
        # Slightly randomize values to simulate real readings
        ph = max(0, min(14, ph + random.uniform(-0.1, 0.1)))
        temp = max(10, min(40, temp + random.uniform(-0.3, 0.3)))
        tds = max(0, min(1200, tds + random.uniform(-20, 20)))
        
        # Occasionally change water level
        if random.random() < 0.05:  # 5% chance each iteration
            water_idx = (water_idx + random.choice([-1, 0, 1])) % 3
        
        data = {
            "ph": round(ph, 1),
            "temperature": round(temp, 1),
            "waterLevel": water_levels[water_idx],
            "tds": int(tds)
        }
        
        await send_data_to_clients(data)
        await asyncio.sleep(2)  # Send data every 2 seconds

async def read_serial():
    """Read data from the serial port and process it"""
    global ser
    
    # Use mock data if no serial connection
    if not ser or settings.MOCK_DATA:
        logger.info("Starting mock data generator")
        await generate_mock_data()
        return
    
    buffer = ""
    last_message_time = time.time()
    no_data_warning_sent = False

    while True:
        current_time = time.time()
        
        if ser and ser.in_waiting > 0:
            try:
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
                                parsed_data['waterLevel'] = value
                            elif key == 'tds':
                                try:
                                    parsed_data['tds'] = int(value)
                                except ValueError:
                                    logger.error(f"Invalid TDS value: {value}")
                    
                    # Only send if we have a valid data structure
                    if 'ph' in parsed_data and 'temperature' in parsed_data and 'waterLevel' in parsed_data and 'tds' in parsed_data:
                        await send_data_to_clients(parsed_data)
                    else:
                        logger.warning(f"Incomplete or invalid data: {parsed_data}")
                        logger.warning(f"Expected format: pH:6.20,temp:23.20,water:medium,tds:652")
            except Exception as e:
                logger.error(f"Error reading/processing serial data: {e}")
                
        elif (current_time - last_message_time) > 10 and not no_data_warning_sent:
            # No data from Arduino for 10 seconds
            logger.warning("No data received from Arduino in 10 seconds!")
            logger.warning("Check if Arduino is properly connected and sending data")
            no_data_warning_sent = True
                
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
