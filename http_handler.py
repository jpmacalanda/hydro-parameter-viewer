
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
    
    # Handle preflight OPTIONS requests - properly handle Request object
    if isinstance(request_headers, websockets.datastructures.Headers):
        # Cannot determine method from Headers object, skip OPTIONS check
        pass
    elif hasattr(request_headers, 'method'):
        # Handle Request object
        method = request_headers.method
        if method == 'OPTIONS':
            logger.info(f"Received OPTIONS request to {path}")
            return http.HTTPStatus.OK, cors_headers, b""
    
    if path == '/health' or path == '/':
        logger.info(f"Received HTTP request to {path}")
        return http.HTTPStatus.OK, cors_headers, b"healthy\n"
    
    if path == '/api/status':
        # Example API endpoint that returns server status
        data = {
            "status": "running",
            "mockData": True,  # This will be updated in the main app
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
