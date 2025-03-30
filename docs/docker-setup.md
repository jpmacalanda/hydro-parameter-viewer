
# Docker Setup

## Prerequisites

- Docker installed
- Docker Compose installed (optional)

## SSL Certificates

Before starting the containers, generate SSL certificates:

```bash
# Make the script executable
chmod +x generate-ssl-certs.sh

# Run the script
./generate-ssl-certs.sh
```

## Web Application Container

1. **Build the container**:
```bash
docker build -t hydroponics-monitor .
```

2. **Run the container**:
```bash
docker run -d -p 80:80 -p 443:443 -v $(pwd)/ssl:/etc/nginx/ssl --name hydroponics-app hydroponics-monitor
```

## WebSocket Server Container

1. **Build the container**:
```bash
docker build -f Dockerfile.server -t hydroponics-server .
```

2. **Run the container**:
```bash
docker run -d --device=/dev/ttyUSB0 -p 8081:8081 -v $(pwd)/ssl:/etc/nginx/ssl -e USE_SSL=true --name hydroponics-ws hydroponics-server
```

## Using Docker Compose

1. **Start all services**:
```bash
docker-compose up -d
```

2. **View logs**:
```bash
docker-compose logs
```

3. **Stop services**:
```bash
docker-compose down
```

## Troubleshooting HTTPS

If you're having issues with HTTPS:

1. **Browser Security Warnings**: Since we're using self-signed certificates, you'll need to:
   - Click "Advanced" and "Proceed to site" in your browser
   - Or add the certificate to your system's trusted certificates

2. **WebSocket Connection Issues**:
   - Check the browser console for WebSocket errors
   - Verify both HTTP (port 80) and HTTPS (port 443) ports are accessible
   - Ensure the WebSocket server port (8081) is accessible

3. **Mixed Content Warnings**: If loading the site via HTTPS but WebSockets use WS (not WSS):
   - Check the server logs to ensure SSL is enabled for the WebSocket server
   - Verify the certificate paths are correct in the WebSocket server
