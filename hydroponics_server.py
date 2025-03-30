
import asyncio
import serial
import websockets
import json
import ssl
import os
import sys
import time
import random
import socket
import logging
from datetime import datetime

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Set up logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
LOG_LEVELS = {
    'DEBUG': logging.DEBUG,
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL
}

log_level = LOG_LEVELS.get(LOG_LEVEL, logging.INFO)

# Set up file handler with rotation
log_file = f"logs/hydroponics_server_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
file_handler = logging.FileHandler(log_file)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

# Set up console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

# Configure root logger
logging.basicConfig(
    level=log_level,
    handlers=[file_handler, console_handler]
)
logger = logging.getLogger("hydroponics_server")
logger.setLevel(log_level)

logger.info(f"Logging initialized at level {LOG_LEVEL} to {log_file}")

# Configure these settings:
SERIAL_PORT = "/dev/ttyUSB0"  # Change to your Arduino's serial port
BAUD_RATE = 9600
WS_PORT = 8081
USE_SSL = os.environ.get('USE_SSL', 'false').lower() == 'true'
MOCK_DATA = os.environ.get('MOCK_DATA', 'false').lower() == 'true'

# SSL Certificate paths
SSL_CERT_PATH = "/etc/nginx/ssl/nginx.crt"
SSL_KEY_PATH = "/etc/nginx/ssl/nginx.key"

logger.info(f"Starting hydroponics server with configuration:")
logger.info(f"- Serial port: {SERIAL_PORT}")
logger.info(f"- Baud rate: {BAUD_RATE}")
logger.info(f"- WebSocket port: {WS_PORT}")
logger.info(f"- SSL enabled: {USE_SSL}")
logger.info(f"- Mock data: {MOCK_DATA}")
logger.info(f"- Log level: {LOG_LEVEL}")

# Check if the port is already in use
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

if is_port_in_use(WS_PORT):
    logger.error(f"Port {WS_PORT} is already in use! This might cause connection failures.")
    logger.error(f"To fix this, you may need to kill any other process using port {WS_PORT}:")
    logger.error(f"Run: sudo lsof -i :{WS_PORT}")
    logger.error(f"And then: sudo kill <PID>")
    # Continue anyway, as the port might just be from a previous instance that hasn't fully closed yet

# Initialize serial connection
ser = None
if not MOCK_DATA:
    try:
        logger.debug(f"Attempting to open serial port {SERIAL_PORT} at {BAUD_RATE} baud")
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        logger.info(f"Serial connection established on {SERIAL_PORT}")
        
        # Flush initial data
        if ser.in_waiting:
            initial_data = ser.read(ser.in_waiting)
            logger.info(f"Flushing initial data: {initial_data}")
            
    except serial.SerialException as e:
        logger.error(f"Error opening serial port: {e}")
        logger.info("Falling back to mock data mode")
        MOCK_DATA = True
        logger.error(f"CHECK IF:")
        logger.error(f"- Arduino is connected to {SERIAL_PORT}")
        logger.error(f"- You have permission to access {SERIAL_PORT} (try: sudo chmod 666 {SERIAL_PORT})")
        logger.error(f"- The Arduino is sending data in the format: pH:6.20,temp:23.20,water:medium,tds:652")
    except Exception as e:
        logger.error(f"Unexpected error when connecting to serial port: {e}")
        logger.info("Falling back to mock data mode")
        MOCK_DATA = True

if MOCK_DATA:
    logger.info("Running in MOCK DATA mode - will generate simulated sensor readings")

connected_clients = set()

async def handle_client(websocket, path):
    client_address = websocket.remote_address if hasattr(websocket, 'remote_address') else 'Unknown'
    client_ip = client_address[0] if isinstance(client_address, tuple) and len(client_address) > 0 else 'Unknown IP'
    logger.info(f"Client connected from {client_ip} to path: {path}")
    
    # Log request headers for debugging
    if hasattr(websocket, 'request_headers'):
        logger.debug(f"Client request headers: {websocket.request_headers}")
    
    connected_clients.add(websocket)
    try:
        # Handle health check requests
        if path == "/health":
            await websocket.send("healthy")
            logger.info(f"Sent health check response to {client_ip}")
            return
            
        # Send initial success message
        try:
            initial_data = {
                "ph": 7.0,
                "temperature": 25.0,
                "waterLevel": "medium",
                "tds": 650
            }
            await websocket.send(json.dumps(initial_data))
            logger.info(f"Sent initial data to {client_ip}: {initial_data}")
        except Exception as e:
            logger.error(f"Error sending initial data to {client_ip}: {e}")
        
        # Stay in this loop to handle incoming messages
        async for message in websocket:
            if message == "ping":
                logger.debug(f"Received ping from {client_ip}, sending pong")
                await websocket.send("pong")
            else:
                logger.debug(f"Received message from {client_ip}: {message}")
            
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed by client: {client_ip} - Code: {e.code}, Reason: {e.reason}")
    except Exception as e:
        logger.error(f"Error handling client {client_ip}: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
            logger.info(f"Client disconnected: {client_ip}")

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
        
        if connected_clients:
            message = json.dumps(data)
            websockets_to_remove = set()
            client_count = len(connected_clients)
            
            for client in connected_clients:
                try:
                    client_address = client.remote_address if hasattr(client, 'remote_address') else 'Unknown'
                    client_ip = client_address[0] if isinstance(client_address, tuple) and len(client_address) > 0 else 'Unknown IP'
                    await client.send(message)
                    logger.debug(f"Sent mock data to client {client_ip}")
                except websockets.exceptions.ConnectionClosed as e:
                    logger.info(f"Connection closed during send: Code {e.code}, Reason: {e.reason}")
                    websockets_to_remove.add(client)
                except Exception as e:
                    logger.error(f"Error sending mock data: {e}")
                    websockets_to_remove.add(client)
            
            # Remove any closed connections
            if websockets_to_remove:
                connected_clients.difference_update(websockets_to_remove)
                logger.info(f"Removed {len(websockets_to_remove)} closed connections")
                
            logger.info(f"Sent mock data to {client_count} clients: {message}")
        else:
            logger.debug("No clients connected, skipping mock data send")
        
        await asyncio.sleep(2)  # Send data every 2 seconds

async def read_serial():
    if MOCK_DATA:
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
                        if connected_clients:
                            message = json.dumps(parsed_data)
                            logger.info(f"Sending to clients: {message}")
                            
                            websockets_to_remove = set()
                            for client in connected_clients:
                                try:
                                    await client.send(message)
                                except websockets.exceptions.ConnectionClosed:
                                    websockets_to_remove.add(client)
                                except Exception as e:
                                    logger.error(f"Error sending serial data: {e}")
                                    websockets_to_remove.add(client)
                            
                            # Remove any closed connections
                            connected_clients.difference_update(websockets_to_remove)
                                
                            logger.info(f"Sent to {len(connected_clients)} clients: {message}")
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

async def health_server(websocket, path):
    """Simple health check endpoint"""
    if path == "/health":
        await websocket.send("healthy")
        logger.debug(f"Sent health check response to path {path}")
        await handle_client(websocket, path)  # Continue handling other messages
    else:
        # Forward to the main handler for normal WebSocket connections
        await handle_client(websocket, path)

def check_ssl_certificates():
    if USE_SSL:
        if not os.path.exists(SSL_CERT_PATH) or not os.path.exists(SSL_KEY_PATH):
            logger.warning(f"WARNING: SSL certificates not found at {SSL_CERT_PATH} or {SSL_KEY_PATH}")
            logger.warning("The container will continue starting, and certificates will be generated if needed.")
            return False
        logger.info(f"Found SSL certificates at: {SSL_CERT_PATH} and {SSL_KEY_PATH}")
        return True
    return True

async def main():
    ssl_context = None
    
    if USE_SSL:
        logger.info("Setting up secure WebSocket server with SSL")
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        try:
            if os.path.exists(SSL_CERT_PATH) and os.path.exists(SSL_KEY_PATH):
                ssl_context.load_cert_chain(SSL_CERT_PATH, SSL_KEY_PATH)
                logger.info("SSL certificates loaded successfully")
            else:
                logger.warning("SSL certificates not found, running without SSL")
                ssl_context = None
        except Exception as e:
            logger.error(f"Error loading SSL certificates: {e}")
            logger.warning("Falling back to non-secure WebSocket")
            ssl_context = None
    
    try:
        # Print local network information to help with connections
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        logger.info(f"Server hostname: {hostname}")
        logger.info(f"Server IP address: {local_ip}")
        logger.info(f"WebSocket server will be available at:")
        logger.info(f"  Local: ws://localhost:{WS_PORT}")
        logger.info(f"  Network: ws://{local_ip}:{WS_PORT}")
        if hostname == "raspberrypi":
            logger.info(f"  mDNS: ws://raspberrypi.local:{WS_PORT}")
            
        # Log all network interfaces for debugging connection issues
        logger.info("Available network interfaces:")
        try:
            import netifaces
            for interface in netifaces.interfaces():
                addresses = netifaces.ifaddresses(interface)
                if netifaces.AF_INET in addresses:
                    for address in addresses[netifaces.AF_INET]:
                        logger.info(f"  {interface}: {address.get('addr', 'No IP')}")
        except ImportError:
            logger.info("  netifaces package not available, skipping interface enumeration")
        except Exception as e:
            logger.error(f"Error enumerating network interfaces: {e}")
            
        server = await websockets.serve(
            health_server,  # Use the health-aware handler
            "0.0.0.0", 
            WS_PORT, 
            ssl=ssl_context,
            ping_interval=None  # Disable automatic ping as we're implementing our own
        )
        
        logger.info(f"WebSocket server running on port {WS_PORT} {'with SSL' if ssl_context else 'without SSL'}")
        
        serial_task = asyncio.create_task(read_serial())
        await server.wait_closed()
    except OSError as e:
        if e.errno == 98:  # Address already in use
            logger.error(f"ERROR: Port {WS_PORT} is already in use!")
            logger.error(f"Another instance of this server may be running.")
            logger.error(f"To fix this, try: sudo lsof -i :{WS_PORT} and then kill the process")
            sys.exit(1)
        else:
            logger.error(f"Failed to start WebSocket server: {e}")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start WebSocket server: {e}")
        logger.error(f"Check if port {WS_PORT} is already in use")
        logger.error(f"You may need to restart the docker container or kill any process using port {WS_PORT}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        logger.info("Starting WebSocket server main process")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutting down due to keyboard interrupt.")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)
