
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

if MOCK_DATA:
    print("Running in MOCK DATA mode - will generate simulated sensor readings")

connected_clients = set()

async def handle_client(websocket, path):
    print(f"Client connected: {websocket.remote_address}")
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)
        print(f"Client disconnected: {websocket.remote_address}")

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
            await asyncio.gather(
                *(client.send(message) for client in connected_clients)
            )
            print(f"Sent mock data to {len(connected_clients)} clients: {message}")
        
        await asyncio.sleep(1)

async def read_serial():
    if MOCK_DATA:
        await generate_mock_data()
        return
    
    while True:
        if ser and ser.in_waiting > 0:
            try:
                line = ser.readline().decode('utf-8').strip()
                if line:
                    # Parse the Arduino data
                    data = {}
                    parts = line.split(',')
                    for part in parts:
                        key_value = part.split(':')
                        if len(key_value) == 2:
                            key, value = key_value
                            if key.lower() == 'ph':
                                data['ph'] = float(value)
                            elif key.lower() == 'temp' or key.lower() == 'temperature':
                                data['temperature'] = float(value)
                            elif key.lower() == 'water' or key.lower() == 'waterlevel':
                                data['waterLevel'] = value
                            elif key.lower() == 'tds':
                                data['tds'] = int(value)
                    
                    if data and connected_clients:
                        # Send data to all connected clients
                        message = json.dumps(data)
                        await asyncio.gather(
                            *(client.send(message) for client in connected_clients)
                        )
                        print(f"Sent to {len(connected_clients)} clients: {message}")
            except Exception as e:
                print(f"Error reading/processing serial data: {e}")
        await asyncio.sleep(1)

def check_ssl_certificates():
    if USE_SSL:
        if not os.path.exists(SSL_CERT_PATH) or not os.path.exists(SSL_KEY_PATH):
            print(f"ERROR: SSL certificates not found at {SSL_CERT_PATH} or {SSL_KEY_PATH}")
            print("Make sure to run generate-ssl-certs.sh script first")
            return False
        print(f"Found SSL certificates at: {SSL_CERT_PATH} and {SSL_KEY_PATH}")
        return True
    return True

async def main():
    ssl_context = None
    
    if USE_SSL:
        if not check_ssl_certificates():
            print("SSL configuration failed, exiting...")
            sys.exit(1)
            
        print("Setting up secure WebSocket server with SSL")
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        try:
            ssl_context.load_cert_chain(SSL_CERT_PATH, SSL_KEY_PATH)
            print("SSL certificates loaded successfully")
        except Exception as e:
            print(f"Error loading SSL certificates: {e}")
            print("Falling back to non-secure WebSocket")
            ssl_context = None
    
    server = await websockets.serve(
        handle_client, 
        "0.0.0.0", 
        WS_PORT, 
        ssl=ssl_context
    )
    
    print(f"WebSocket server running on port {WS_PORT} {'with SSL' if ssl_context else 'without SSL'}")
    serial_task = asyncio.create_task(read_serial())
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
