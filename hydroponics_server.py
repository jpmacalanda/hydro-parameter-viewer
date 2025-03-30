
import asyncio
import ssl
import os
import sys
import socket
import logging
import websockets

# Import our modules
from logger_config import setup_logger
import settings
from http_handler import http_handler
from websocket_handler import websocket_handler
from serial_processor import initialize_serial, read_serial, cleanup

# Setup logger first
logger, log_file, LOG_LEVEL = setup_logger()

# Log configuration settings
settings.log_settings()
logger.info(f"- Log level: {LOG_LEVEL}")

# Check if the port is already in use
settings.check_port_availability()

# List available serial ports
settings.check_serial_port()

# Initialize serial connection
ser = initialize_serial()
if not ser and not settings.MOCK_DATA:
    settings.MOCK_DATA = True
    logger.info("Serial connection failed, falling back to MOCK DATA mode")

async def main():
    ssl_context = None
    
    if settings.USE_SSL:
        logger.info("Setting up secure WebSocket server with SSL")
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        try:
            if os.path.exists(settings.SSL_CERT_PATH) and os.path.exists(settings.SSL_KEY_PATH):
                ssl_context.load_cert_chain(settings.SSL_CERT_PATH, settings.SSL_KEY_PATH)
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
        logger.info(f"  Local: ws://localhost:{settings.WS_PORT}")
        logger.info(f"  Network: ws://{local_ip}:{settings.WS_PORT}")
        logger.info(f"HTTP endpoints will be available at:")
        logger.info(f"  Local: http://localhost:{settings.WS_PORT}/health")
        logger.info(f"  Network: http://{local_ip}:{settings.WS_PORT}/health")
        if hostname == "raspberrypi":
            logger.info(f"  mDNS: ws://raspberrypi.local:{settings.WS_PORT}")
            
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
            settings.WS_PORT, 
            ssl=ssl_context,
            ping_interval=30,  # Send ping every 30 seconds to keep connection alive
            ping_timeout=10,   # Wait 10 seconds for pong response
            close_timeout=5,   # Wait 5 seconds for a clean connection close
            max_size=2**20,    # 1MB max message size
            max_queue=32,      # Limit message queue to prevent memory issues
            process_request=http_handler,  # Add HTTP request handler for regular requests
            logger=logger      # Use our configured logger
        )
        
        logger.info(f"Server running on port {settings.WS_PORT} {'with SSL' if ssl_context else 'without SSL'}")
        
        serial_task = asyncio.create_task(read_serial())
        
        # Create a simple HTTP server to improve compatibility with different clients
        try:
            from aiohttp import web
            
            async def health_handler(request):
                return web.Response(text="healthy\n")
            
            app = web.Application()
            app.add_routes([web.get('/health', health_handler)])
            
            # Start HTTP server on a different port for better compatibility
            http_port = settings.WS_PORT + 1
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
            logger.error(f"ERROR: Port {settings.WS_PORT} is already in use!")
            logger.error(f"Another instance of this server may be running.")
            logger.error(f"To fix this, try: sudo lsof -i :{settings.WS_PORT} and then kill the process")
            sys.exit(1)
        else:
            logger.error(f"Failed to start WebSocket server: {e}")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start WebSocket server: {e}")
        logger.error(f"Check if port {settings.WS_PORT} is already in use")
        logger.error(f"You may need to restart the docker container or kill any process using port {settings.WS_PORT}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        logger.info("Starting WebSocket server main process")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutting down due to keyboard interrupt.")
        cleanup()  # Close serial connection
    except Exception as e:
        logger.error(f"Server error: {e}")
        cleanup()  # Close serial connection
        sys.exit(1)
