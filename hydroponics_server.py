
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
import glob
from datetime import datetime
import http

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
SERIAL_PORT = os.environ.get('SERIAL_PORT', "/dev/ttyUSB0")  # Can be overridden by environment variable
BAUD_RATE = int(os.environ.get('BAUD_RATE', "9600"))  # Can be overridden by environment variable
WS_PORT = int(os.environ.get('WS_PORT', "8081"))  # Can be overridden by environment variable
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

# Check available serial ports
def list_serial_ports():
    """Lists available serial ports on the system"""
    if sys.platform.startswith('win'):
        ports = ['COM%s' % (i + 1) for i in range(256)]
    elif sys.platform.startswith('linux') or sys.platform.startswith('cygwin'):
        # This excludes the current terminal /dev/tty
        ports = glob.glob('/dev/tty[A-Za-z]*')
        # Add USB serial device patterns
        ports.extend(glob.glob('/dev/ttyUSB*'))
        ports.extend(glob.glob('/dev/ttyACM*'))
    elif sys.platform.startswith('darwin'):
        ports = glob.glob('/dev/tty.*')
    else:
        raise EnvironmentError('Unsupported platform')

    result = []
    for port in ports:
        try:
            s = serial.Serial(port)
            s.close()
            result.append(port)
        except (OSError, serial.SerialException):
            pass
    return result

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

# List available serial ports
available_ports = list_serial_ports()
logger.info(f"Available serial ports: {available_ports}")

# Initialize serial connection
ser = None
if not MOCK_DATA:
    # Check if our configured serial port exists
    if SERIAL_PORT not in available_ports:
        logger.warning(f"Configured serial port {SERIAL_PORT} not found in available ports: {available_ports}")
        if available_ports:
            logger.info(f"Available ports: {available_ports}")
            logger.info(f"Will attempt to connect to {SERIAL_PORT} anyway in case it appears later")
        else:
            logger.warning("No serial ports found on the system")
    
    # Check if the user has permission to access the serial port
    if os.path.exists(SERIAL_PORT):
        try:
            stats = os.stat(SERIAL_PORT)
            logger.info(f"Serial port permissions: {oct(stats.st_mode)}")
            
            # Check if readable by the current user
            if not os.access(SERIAL_PORT, os.R_OK | os.W_OK):
                logger.warning(f"Current user does not have read/write permission to {SERIAL_PORT}")
                logger.warning(f"You may need to run: sudo chmod 666 {SERIAL_PORT}")
        except Exception as e:
            logger.error(f"Error checking serial port permissions: {e}")
    
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

# Improved HTTP handler function - Properly returns HTTP responses for different paths
async def http_handler(path, request_headers):
    """Handle regular HTTP requests to provide a health endpoint and API access"""
    logger.debug(f"HTTP request received for path: {path}, headers: {request_headers}")
    
    # Enhanced headers for CORS support
    cors_headers = [
        ('Content-Type', 'text/plain'),
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Methods', 'GET, OPTIONS, POST'),
        ('Access-Control-Allow-Headers', 'Content-Type, Authorization'),
        ('Access-Control-Max-Age', '86400'),  # 24 hours
    ]
    
    # Handle preflight OPTIONS requests
    if request_headers.get('method', '') == 'OPTIONS':
        logger.info(f"Received OPTIONS request to {path}")
        return http.HTTPStatus.OK, cors_headers, b""
        
    if path == '/health' or path == '/':
        logger.info(f"Received HTTP request to {path}")
        return http.HTTPStatus.OK, cors_headers, b"healthy\n"
    
    if path == '/api/status':
        # Example API endpoint that returns server status
        data = {
            "status": "running",
            "mockData": MOCK_DATA,
            "connectedClients": len(connected_clients),
            "time": datetime.now().isoformat()
        }
        return http.HTTPStatus.OK, [
            ('Content-Type', 'application/json'),
            ('Access-Control-Allow-Origin', '*'),
        ], json.dumps(data).encode('utf-8')
    
    # For any other path, also return 200 OK with info
    logger.info(f"Received HTTP request to unknown path: {path}")
    body = (
        "Hydroponics Monitoring System WebSocket Server\n"
        "----------------------------------------\n"
        "This is the WebSocket server for the Hydroponics Monitoring System.\n"
        "For the web interface, please access the web application.\n"
        "For WebSocket connections, connect to ws://hostname:8081\n"
        "Available endpoints:\n"
        "- /health        - Server health check\n"
        "- /api/status    - Server status in JSON format\n"
    ).encode('utf-8')
    
    return http.HTTPStatus.OK, cors_headers, body

# Enhanced WebSocket handler with better error handling
async def websocket_handler(websocket, path):
    """Handle WebSocket connections for data streaming"""
    client_address = websocket.remote_address if hasattr(websocket, 'remote_address') else 'Unknown'
    client_ip = client_address[0] if isinstance(client_address, tuple) and len(client_address) > 0 else 'Unknown IP'
    logger.info(f"WebSocket client connected from {client_ip} to path: {path}")
    
    # Log request headers for debugging
    if hasattr(websocket, 'request_headers'):
        headers_str = ", ".join([f"{k}: {v}" for k, v in websocket.request_headers.items()])
        logger.debug(f"Client request headers: {headers_str}")
    
    connected_clients.add(websocket)
    try:
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
    # ... keep existing code (serial reading logic)
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
        logger.info(f"HTTP endpoints will be available at:")
        logger.info(f"  Local: http://localhost:{WS_PORT}/health")
        logger.info(f"  Network: http://{local_ip}:{WS_PORT}/health")
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
        
        # Updated websockets server with explicitly configured ping_interval and close_timeout
        # and better handling of client connections
        server = await websockets.serve(
            websocket_handler,
            "0.0.0.0", 
            WS_PORT, 
            ssl=ssl_context,
            ping_interval=30,  # Send ping every 30 seconds to keep connection alive
            ping_timeout=10,   # Wait 10 seconds for pong response
            close_timeout=5,   # Wait 5 seconds for a clean connection close
            max_size=2**20,    # 1MB max message size
            max_queue=32,      # Limit message queue to prevent memory issues
            process_request=http_handler,  # Add HTTP request handler for regular requests
            logger=logger      # Use our configured logger
        )
        
        logger.info(f"Server running on port {WS_PORT} {'with SSL' if ssl_context else 'without SSL'}")
        
        serial_task = asyncio.create_task(read_serial())
        
        # Create a simple HTTP server to improve compatibility with different clients
        try:
            from aiohttp import web
            
            async def health_handler(request):
                return web.Response(text="healthy\n")
            
            app = web.Application()
            app.add_routes([web.get('/health', health_handler)])
            
            # Start HTTP server on a different port for better compatibility
            http_port = WS_PORT + 1
            logger.info(f"Starting additional HTTP server on port {http_port} for better compatibility")
            runner = web.AppRunner(app)
            await runner.setup()
            site = web.TCPSite(runner, '0.0.0.0', http_port)
            await site.start()
            logger.info(f"HTTP server running at http://0.0.0.0:{http_port}")
        except ImportError:
            logger.info("aiohttp not available, skipping additional HTTP server")
        except Exception as e:
            logger.error(f"Failed to start HTTP server: {e}")
        
        # Keep the server running
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
