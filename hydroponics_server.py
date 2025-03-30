
import asyncio
import serial
import websockets
import json
import ssl
import os
import sys
import time
import random

# Configure these settings:
SERIAL_PORT = "/dev/ttyUSB0"  # Change to your Arduino's serial port
BAUD_RATE = 9600
WS_PORT = 8081
USE_SSL = os.environ.get('USE_SSL', 'false').lower() == 'true'
MOCK_DATA = os.environ.get('MOCK_DATA', 'false').lower() == 'true'

# SSL Certificate paths
SSL_CERT_PATH = "/etc/nginx/ssl/nginx.crt"
SSL_KEY_PATH = "/etc/nginx/ssl/nginx.key"

print(f"Starting hydroponics server with configuration:")
print(f"- Serial port: {SERIAL_PORT}")
print(f"- Baud rate: {BAUD_RATE}")
print(f"- WebSocket port: {WS_PORT}")
print(f"- SSL enabled: {USE_SSL}")
print(f"- Mock data: {MOCK_DATA}")

# Initialize serial connection
ser = None
if not MOCK_DATA:
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"Serial connection established on {SERIAL_PORT}")
    except Exception as e:
        print(f"Error opening serial port: {e}")
        print("Falling back to mock data mode")
        MOCK_DATA = True
        print(f"CHECK IF:")
        print(f"- Arduino is connected to {SERIAL_PORT}")
        print(f"- You have permission to access {SERIAL_PORT} (try: sudo chmod 666 {SERIAL_PORT})")
        print(f"- The Arduino is sending data in the format: pH:6.20,temp:23.20,water:medium,tds:652")

if MOCK_DATA:
    print("Running in MOCK DATA mode - will generate simulated sensor readings")

connected_clients = set()

async def handle_client(websocket, path):
    client_address = websocket.remote_address if hasattr(websocket, 'remote_address') else 'Unknown'
    print(f"Client connected: {client_address}")
    
    connected_clients.add(websocket)
    try:
        # Handle health check requests
        if path == "/health":
            await websocket.send("healthy")
            print(f"Sent health check response to {client_address}")
            return
            
        # Send initial success message
        try:
            await websocket.send(json.dumps({
                "ph": 7.0,
                "temperature": 25.0,
                "waterLevel": "medium",
                "tds": 650
            }))
            print(f"Sent initial data to {client_address}")
        except Exception as e:
            print(f"Error sending initial data: {e}")
        
        # Stay in this loop to handle incoming messages
        async for message in websocket:
            if message == "ping":
                print(f"Received ping from {client_address}, sending pong")
                await websocket.send("pong")
            
    except websockets.exceptions.ConnectionClosed:
        print(f"Connection closed by client: {client_address}")
    except Exception as e:
        print(f"Error handling client: {e}")
    finally:
        connected_clients.remove(websocket)
        print(f"Client disconnected: {client_address}")

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
            
            for client in connected_clients:
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    websockets_to_remove.add(client)
                except Exception as e:
                    print(f"Error sending mock data: {e}")
                    websockets_to_remove.add(client)
            
            # Remove any closed connections
            connected_clients.difference_update(websockets_to_remove)
                
            print(f"Sent mock data to {len(connected_clients)} clients: {message}")
        
        await asyncio.sleep(2)  # Send data every 2 seconds

async def read_serial():
    if MOCK_DATA:
        await generate_mock_data()
        return
    
    buffer = ""
    while True:
        if ser and ser.in_waiting > 0:
            try:
                # Read directly from serial
                data = ser.read(ser.in_waiting).decode('utf-8')
                buffer += data
                
                # Process any complete lines ending with newline
                lines = buffer.split('\n')
                buffer = lines.pop()  # Keep the incomplete line in buffer
                
                for line in lines:
                    line = line.strip()
                    if not line:  # Skip empty lines
                        continue
                        
                    print(f"Raw data from Arduino: {line}")
                    
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
                                    print(f"Invalid pH value: {value}")
                            elif key == 'temp' or key == 'temperature':
                                try:
                                    parsed_data['temperature'] = float(value)
                                except ValueError:
                                    print(f"Invalid temperature value: {value}")
                            elif key == 'water' or key == 'waterlevel':
                                parsed_data['waterLevel'] = value
                            elif key == 'tds':
                                try:
                                    parsed_data['tds'] = int(value)
                                except ValueError:
                                    print(f"Invalid TDS value: {value}")
                    
                    # Only send if we have a valid data structure
                    if 'ph' in parsed_data and 'temperature' in parsed_data and 'waterLevel' in parsed_data and 'tds' in parsed_data:
                        if connected_clients:
                            message = json.dumps(parsed_data)
                            print(f"Sending to clients: {message}")
                            
                            websockets_to_remove = set()
                            for client in connected_clients:
                                try:
                                    await client.send(message)
                                except websockets.exceptions.ConnectionClosed:
                                    websockets_to_remove.add(client)
                                except Exception as e:
                                    print(f"Error sending serial data: {e}")
                                    websockets_to_remove.add(client)
                            
                            # Remove any closed connections
                            connected_clients.difference_update(websockets_to_remove)
                                
                            print(f"Sent to {len(connected_clients)} clients: {message}")
                    else:
                        print(f"Incomplete or invalid data: {parsed_data}")
                        print(f"Expected format: pH:6.20,temp:23.20,water:medium,tds:652")
            except Exception as e:
                print(f"Error reading/processing serial data: {e}")
                
        await asyncio.sleep(0.1)  # Check more frequently

async def health_server(websocket, path):
    """Simple health check endpoint"""
    if path == "/health":
        await websocket.send("healthy")
        await handle_client(websocket, path)  # Continue handling other messages
    else:
        # Forward to the main handler for normal WebSocket connections
        await handle_client(websocket, path)

def check_ssl_certificates():
    if USE_SSL:
        if not os.path.exists(SSL_CERT_PATH) or not os.path.exists(SSL_KEY_PATH):
            print(f"WARNING: SSL certificates not found at {SSL_CERT_PATH} or {SSL_KEY_PATH}")
            print("The container will continue starting, and certificates will be generated if needed.")
            return False
        print(f"Found SSL certificates at: {SSL_CERT_PATH} and {SSL_KEY_PATH}")
        return True
    return True

async def main():
    ssl_context = None
    
    if USE_SSL:
        print("Setting up secure WebSocket server with SSL")
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        try:
            if os.path.exists(SSL_CERT_PATH) and os.path.exists(SSL_KEY_PATH):
                ssl_context.load_cert_chain(SSL_CERT_PATH, SSL_KEY_PATH)
                print("SSL certificates loaded successfully")
            else:
                print("SSL certificates not found, running without SSL")
                ssl_context = None
        except Exception as e:
            print(f"Error loading SSL certificates: {e}")
            print("Falling back to non-secure WebSocket")
            ssl_context = None
    
    try:
        server = await websockets.serve(
            health_server,  # Use the health-aware handler
            "0.0.0.0", 
            WS_PORT, 
            ssl=ssl_context,
            ping_interval=None  # Disable automatic ping as we're implementing our own
        )
        
        print(f"WebSocket server running on port {WS_PORT} {'with SSL' if ssl_context else 'without SSL'}")
        print(f"WebSocket server URL: ws://localhost:{WS_PORT}")
        print(f"WebSocket server network URL: ws://0.0.0.0:{WS_PORT}")
        if hostname := os.environ.get("HOSTNAME"):
            print(f"Container hostname: {hostname}")
        
        serial_task = asyncio.create_task(read_serial())
        await server.wait_closed()
    except Exception as e:
        print(f"Failed to start WebSocket server: {e}")
        print(f"Check if port {WS_PORT} is already in use")
        print(f"You may need to restart the docker container or kill any process using port {WS_PORT}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server shutting down due to keyboard interrupt.")
    except Exception as e:
        print(f"Server error: {e}")
        sys.exit(1)
