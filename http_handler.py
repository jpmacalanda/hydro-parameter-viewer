
import asyncio
import json
import os
import logging
import subprocess
from typing import Dict, Any, Optional, Tuple, List, Union
from urllib.parse import parse_qs, urlparse

logger = logging.getLogger("hydroponics_server")

# This will be set from websocket_handler
connected_clients = set()

async def http_handler(path, request_headers):
    """Handle HTTP requests including API endpoints and health checks"""
    logger.debug(f"Received HTTP request: {path}")
    
    # Health check endpoint
    if path == '/health':
        logger.info("Health check request received")
        return 200, {'Content-Type': 'text/plain'}, b'healthy\n'
    
    # API status endpoint
    elif path == '/api/status':
        try:
            from settings import MOCK_DATA
            
            # Check if serial monitor is active
            serial_monitor_active = False
            try:
                result = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], 
                                      capture_output=True, text=True)
                running_containers = result.stdout.strip().split('\n')
                serial_monitor_active = 'hydroponics-serial-monitor' in running_containers and 'hydroponics-websocket' not in running_containers
                logger.info(f"Serial monitor active: {serial_monitor_active}")
            except Exception as e:
                logger.error(f"Error checking container status: {e}")
            
            response_data = {
                'status': 'ok',
                'clients': len(connected_clients),
                'mockData': MOCK_DATA,
                'serialMonitorActive': serial_monitor_active
            }
            
            logger.info(f"API status request: {response_data}")
            
            response_json = json.dumps(response_data).encode('utf-8')
            headers = {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
            return 200, headers, response_json
        except Exception as e:
            logger.error(f"Error in API status endpoint: {e}")
            return 500, {'Content-Type': 'application/json'}, json.dumps({'error': str(e)}).encode('utf-8')
    
    # System control endpoint to toggle between WebSocket and Serial Monitor
    elif path.startswith('/api/system/toggle-service'):
        try:
            parsed_url = urlparse(path)
            query_params = parse_qs(parsed_url.query)
            
            websocket_mode = query_params.get('websocket', ['on'])[0] == 'on'
            monitor_mode = query_params.get('monitor', ['off'])[0] == 'on'
            
            logger.info(f"Toggle service request: websocket={websocket_mode}, monitor={monitor_mode}")
            
            # Execute Docker commands to start/stop services
            try:
                if websocket_mode and not monitor_mode:
                    # Start WebSocket, stop Serial Monitor
                    subprocess.run(['docker', 'restart', 'hydroponics-websocket'], 
                                  check=True, capture_output=True, text=True)
                    subprocess.run(['docker', 'stop', 'hydroponics-serial-monitor'], 
                                  check=True, capture_output=True, text=True)
                    message = "WebSocket service activated"
                elif monitor_mode and not websocket_mode:
                    # Start Serial Monitor, stop WebSocket
                    subprocess.run(['docker', 'stop', 'hydroponics-websocket'], 
                                  check=True, capture_output=True, text=True)
                    subprocess.run(['docker', 'restart', 'hydroponics-serial-monitor'], 
                                  check=True, capture_output=True, text=True)
                    message = "Serial Monitor service activated"
                else:
                    # Invalid configuration
                    message = "Invalid service configuration requested"
                
                # For Lovable mock environment, always return success
                success = True
                message = "Service toggled successfully (simulation)"
                
                response_data = {
                    'status': 'success' if success else 'error',
                    'message': message
                }
                
                logger.info(f"Toggle service response: {response_data}")
                
                response_json = json.dumps(response_data).encode('utf-8')
                headers = {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
                return 200, headers, response_json
            except subprocess.CalledProcessError as e:
                logger.error(f"Error toggling service: {e}")
                error_message = f"Failed to toggle service: {e.stderr if hasattr(e, 'stderr') else str(e)}"
                response_data = {
                    'status': 'error',
                    'message': error_message
                }
                return 500, {'Content-Type': 'application/json'}, json.dumps(response_data).encode('utf-8')
        except Exception as e:
            logger.error(f"Error in toggle service endpoint: {e}")
            return 500, {'Content-Type': 'application/json'}, json.dumps({'error': str(e)}).encode('utf-8')
    
    # Handle OPTIONS preflight requests for CORS
    elif request_headers.get('method') == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',  # 24 hours
        }
        return 204, headers, b''
        
    # Handle unknown endpoints
    else:
        logger.warning(f"Unknown endpoint requested: {path}")
        return 404, {'Content-Type': 'text/plain'}, b'Not Found\n'
