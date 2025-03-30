
import logging
import json
import websockets
from typing import Set, Dict, Any, Optional, Tuple, List, Union

import http_handler
import serial_processor

logger = logging.getLogger("hydroponics_server")

# Store connected clients
connected_clients: Set[websockets.WebSocketServerProtocol] = set()

# Share the connected_clients set with other modules
http_handler.connected_clients = connected_clients
serial_processor.connected_clients = connected_clients

async def websocket_handler(websocket, path):
    """Handle WebSocket connections for data streaming"""
    # Make sure we have a proper WebSocket connection
    if not isinstance(websocket, websockets.WebSocketServerProtocol):
        logger.error(f"Invalid connection type: {type(websocket)}")
        return
        
    client_address = websocket.remote_address if hasattr(websocket, 'remote_address') else 'Unknown'
    client_ip = client_address[0] if isinstance(client_address, tuple) and len(client_address) > 0 else 'Unknown IP'
    logger.info(f"WebSocket client connected from {client_ip} to path: {path}")
    
    # Log request headers for debugging
    if hasattr(websocket, 'request_headers'):
        headers_str = ", ".join([f"{k}: {v}" for k, v in websocket.request_headers.items()])
        logger.debug(f"Client request headers: {headers_str}")
    
    # Check if client is using secure connection
    secure = False
    if hasattr(websocket, 'request_headers'):
        if websocket.request_headers.get('X-Forwarded-Proto') == 'https':
            secure = True
            logger.info(f"Client {client_ip} connected via secure proxy (HTTPS)")
        elif websocket.request_headers.get('Origin', '').startswith('https:'):
            secure = True
            logger.info(f"Client {client_ip} connected from secure origin (HTTPS)")
    
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
