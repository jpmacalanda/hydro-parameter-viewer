
import logging
import http
import json
import websockets
from datetime import datetime

logger = logging.getLogger("hydroponics_server")

# Store references to connected clients (will be populated from websocket_handler)
connected_clients = set()

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
    
    # Check if this is a proper HTTP request or a WebSocket upgrade request
    is_websocket = False
    if isinstance(request_headers, websockets.datastructures.Headers):
        upgrade_header = request_headers.get("Upgrade", "").lower()
        if upgrade_header == "websocket":
            is_websocket = True
            # Let the WebSocket handler take care of this
            return None
    
    # Handle preflight OPTIONS requests
    method = "GET"  # Default method
    if hasattr(request_headers, 'method'):
        method = request_headers.method
    elif isinstance(request_headers, dict) and 'method' in request_headers:
        method = request_headers['method']
    
    if method == 'OPTIONS':
        logger.info(f"Received OPTIONS request to {path}")
        return http.HTTPStatus.OK, cors_headers, b""
    
    # Fix for path strings vs objects
    path_str = path
    if not isinstance(path, str):
        # Try to extract path from various possible formats
        if hasattr(path, 'path'):
            path_str = path.path
        elif hasattr(path, 'target'):
            path_str = path.target
        else:
            # Default fallback
            path_str = '/health'
            logger.warning(f"Could not determine path from: {path}, using default: {path_str}")
    
    # Simple health check
    if path_str == '/health' or path_str == '/':
        logger.info(f"Received HTTP request to {path_str}")
        return 200, cors_headers, b"healthy\n"
    
    # API endpoint
    if path_str == '/api/status':
        # Example API endpoint that returns server status
        data = {
            "status": "running",
            "mockData": True,  # This will be updated in the main app
            "connectedClients": len(connected_clients),
            "time": datetime.now().isoformat(),
            "secure": True
        }
        
        json_body = json.dumps(data).encode('utf-8')
        json_headers = [
            ('Content-Type', 'application/json'),
            ('Access-Control-Allow-Origin', '*'),
        ]
        
        return 200, json_headers, json_body
    
    # For any other path, also return 200 OK with info
    logger.info(f"Received HTTP request to unknown path: {path_str}")
    body = (
        "Hydroponics Monitoring System WebSocket Server\n"
        "----------------------------------------\n"
        "This is the WebSocket server for the Hydroponics Monitoring System.\n"
        "For the web interface, please access the web application.\n"
        "For WebSocket connections, connect to wss://hostname:8081\n"
        "Available endpoints:\n"
        "- /health        - Server health check\n"
        "- /api/status    - Server status in JSON format\n"
    ).encode('utf-8')
    
    return 200, cors_headers, body
