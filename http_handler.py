
import logging
import json
import os
import http
import urllib.parse
import subprocess
from typing import Dict, Any, Tuple, List, Optional, Set

import websockets

logger = logging.getLogger("hydroponics_server")

# Store connected clients (will be set from websocket_handler)
connected_clients: Set[websockets.WebSocketServerProtocol] = set()

async def http_handler(path: str, request_headers: Dict[str, str]) -> Optional[Tuple[int, Dict[str, str], bytes]]:
    """Handle HTTP requests for health checks and API endpoints"""
    logger.debug(f"HTTP request: {path}")
    
    # Basic health check endpoint
    if path == "/health":
        logger.debug("Health check requested")
        return http.HTTPStatus.OK, {"Content-Type": "text/plain"}, b"healthy\n"
    
    # API status endpoint
    elif path == "/api/status":
        from settings import MOCK_DATA
        import serial_processor
        
        status_data = {
            "status": "running",
            "connected_clients": len(connected_clients),
            "mock_data": MOCK_DATA,
            "arduino_connected": serial_processor.ser is not None and not MOCK_DATA
        }
        
        json_data = json.dumps(status_data).encode('utf-8')
        return http.HTTPStatus.OK, {"Content-Type": "application/json"}, json_data
    
    # System control endpoint to toggle between WebSocket and Serial Monitor
    elif path.startswith("/api/system/toggle-service"):
        query_params = urllib.parse.parse_qs(urllib.parse.urlparse(path).query)
        websocket_state = query_params.get('websocket', ['on'])[0]
        monitor_state = query_params.get('monitor', ['off'])[0]
        
        logger.info(f"Service toggle requested: WebSocket={websocket_state}, Monitor={monitor_state}")
        
        try:
            if websocket_state == 'on':
                # Start WebSocket container, stop Serial Monitor
                subprocess.run(["docker", "start", "hydroponics-websocket"], check=True)
                subprocess.run(["docker", "stop", "hydroponics-serial-monitor"], check=True)
                logger.info("WebSocket service activated, Serial Monitor stopped")
                message = "WebSocket service activated"
            else:
                # Stop WebSocket container, start Serial Monitor
                subprocess.run(["docker", "stop", "hydroponics-websocket"], check=True)
                subprocess.run(["docker", "start", "hydroponics-serial-monitor"], check=True)
                logger.info("WebSocket service stopped, Serial Monitor activated")
                message = "Serial Monitor service activated"
                
            response_data = {
                "success": True,
                "message": message
            }
            
            json_data = json.dumps(response_data).encode('utf-8')
            return http.HTTPStatus.OK, {"Content-Type": "application/json"}, json_data
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Error toggling services: {e}")
            error_data = {
                "success": False,
                "message": f"Failed to toggle services: {str(e)}"
            }
            json_data = json.dumps(error_data).encode('utf-8')
            return http.HTTPStatus.INTERNAL_SERVER_ERROR, {"Content-Type": "application/json"}, json_data
    
    # If no match, return None to let the WebSocket server handle it
    return None
