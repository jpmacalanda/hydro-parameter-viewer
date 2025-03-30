
import asyncio
import serial
import websockets
import json
import ssl
import os

# Configure these settings:
SERIAL_PORT = "/dev/ttyUSB0"  # Change to your Arduino's serial port
BAUD_RATE = 9600
WS_PORT = 8081
USE_SSL = os.environ.get('USE_SSL', 'false').lower() == 'true'

# Initialize serial connection
try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    print(f"Serial connection established on {SERIAL_PORT}")
except Exception as e:
    print(f"Error opening serial port: {e}")
    ser = None

connected_clients = set()

async def handle_client(websocket, path):
    print(f"Client connected: {websocket.remote_address}")
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)
        print(f"Client disconnected: {websocket.remote_address}")

async def read_serial():
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

async def main():
    ssl_context = None
    
    if USE_SSL:
        print("Setting up secure WebSocket server with SSL")
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        try:
            ssl_context.load_cert_chain('/etc/nginx/ssl/nginx.crt', '/etc/nginx/ssl/nginx.key')
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
