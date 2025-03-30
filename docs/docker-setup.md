
# Docker Setup

## Prerequisites

- Docker installed
- Docker Compose installed

## Architecture Diagram

```
                      ┌─────────────┐
                      │             │
                      │  Docker     │
                      │  Host       │
                      │ (Raspberry  │
                      │    Pi)      │
                      │             │
                      └──────┬──────┘
                             │
                             │
              ┌──────────────┴─────────────┐
              │                            │
              │                            │
┌─────────────▼──────┐           ┌─────────▼──────────┐
│                    │           │                    │
│   webapp (nginx)   │◄─────────►│   serial-monitor   │
│     container      │           │     container      │
│                    │           │                    │
└─────────┬──────────┘           └─────────┬──────────┘
          │                                 │
          │                                 │
┌─────────▼──────────┐           ┌─────────▼──────────┐
│                    │           │                    │
│   Ports:           │           │   Connected to:    │
│   - 80 (HTTP)      │           │   - Arduino via    │
│   - 443 (HTTPS)    │           │     USB serial     │
│                    │           │                    │
└────────────────────┘           └────────────────────┘
```

## SSL Certificates

Before starting the containers, you can either:

1. Let the containers automatically generate SSL certificates when they start
2. Generate SSL certificates manually:

```bash
# Create ssl directory
mkdir -p ./ssl

# Generate certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./ssl/nginx.key -out ./ssl/nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Hydroponics/CN=localhost" \
  -addext "subjectAltName = IP:192.168.1.34,IP:127.0.0.1,DNS:localhost"

# Set proper permissions
chmod 755 ./ssl
chmod 644 ./ssl/nginx.crt
chmod 640 ./ssl/nginx.key
```

## Starting with Docker Compose (Recommended)

1. **Start all services**:
```bash
docker-compose up -d
```

2. **View logs**:
```bash
docker-compose logs -f
```

3. **Stop services**:
```bash
docker-compose down
```

4. **Rebuild and restart all services** (after making changes):
```bash
docker-compose down
docker-compose up -d --build
```

## Common Issues and Solutions

### Container Keeps Restarting

If your container keeps restarting with exit code 255:

1. **Check container logs**:
```bash
docker logs hydroponics-webapp
```

2. **Check for NGINX configuration errors**:
```bash
docker exec hydroponics-webapp nginx -t
```

3. **Fix SSL permissions**:
```bash
docker exec hydroponics-webapp sh -c "chmod -R 755 /etc/nginx/ssl && chmod 644 /etc/nginx/ssl/nginx.crt && chmod 640 /etc/nginx/ssl/nginx.key"
```

4. **Regenerate SSL certificates**:
Inside the container:
```bash
docker exec -it hydroponics-webapp sh

# Then inside the container:
cd /etc/nginx/ssl
rm -f nginx.crt nginx.key
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx.key -out nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Hydroponics/CN=localhost" \
  -addext "subjectAltName = IP:192.168.1.34,IP:127.0.0.1,DNS:localhost"
chmod 644 nginx.crt
chmod 640 nginx.key
exit

# Restart the container
docker restart hydroponics-webapp
```

5. **Check if ports are already in use**:
```bash
sudo netstat -tulpn | grep -E '80|443|8081'
```

### WebSocket Connection Issues

If you're having trouble with WebSocket connections:

1. **Check WebSocket server logs**:
```bash
docker logs hydroponics-websocket
```

2. **Test WebSocket connectivity**:
```bash
# Install wscat if needed:
npm install -g wscat

# Connect to WebSocket (HTTP):
wscat -c ws://192.168.1.34:8081

# Connect to WebSocket (HTTPS):
wscat -c wss://192.168.1.34/ws
```

3. **Verify SSL certificates are being used properly**:
```bash
docker exec hydroponics-websocket ls -la /etc/nginx/ssl/
```

## Accessing the Application

You can access the application in two ways:

1. **HTTP** (automatically redirects to HTTPS):
```
http://192.168.1.34
```

2. **HTTPS** (recommended):
```
https://192.168.1.34
```

Note: When accessing via HTTPS, your browser will show a security warning about the certificate being self-signed. This is normal for local development. Click "Advanced" and then "Proceed" to access the application.

## Troubleshooting

### Common Docker Issues

1. **Container restarts repeatedly (restart loop):**
   ```bash
   # Check what's causing the restart
   docker logs hydroponics-webapp
   
   # Fix permissions on SSL directory
   chmod -R 755 ./ssl
   chmod 644 ./ssl/nginx.crt
   chmod 640 ./ssl/nginx.key
   ```

2. **"Connection Refused" errors:**
   - Check if containers are running: `docker ps`
   - Check if ports are open: `sudo netstat -tulpn | grep -E '80|443|8081'`
   - Verify container logs: `docker-compose logs`

### Network Connectivity 

1. **Check if containers can communicate:**
   ```bash
   docker exec hydroponics-webapp ping websocket
   ```

2. **Check if services are responding:**
   ```bash
   # Test web server directly
   curl -k https://localhost
   
   # Test WebSocket server
   curl -k https://localhost:8081
   ```

### SSL Certificate Issues

1. **Regenerate certificates with correct IP:**
   ```bash
   rm -rf ./ssl/*
   
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout ./ssl/nginx.key -out ./ssl/nginx.crt \
     -subj "/C=US/ST=State/L=City/O=Hydroponics/CN=localhost" \
     -addext "subjectAltName = IP:192.168.1.34,IP:127.0.0.1,DNS:localhost"
   ```

2. **Fix certificate permissions:**
   ```bash
   chmod 755 ./ssl
   chmod 644 ./ssl/nginx.crt
   chmod 640 ./ssl/nginx.key
   ```

### Arduino/Serial Issues

1. **Check if the Arduino is detected:**
   ```bash
   ls -l /dev/ttyUSB*
   ```

2. **Fix permissions for the device:**
   ```bash
   sudo chmod 666 /dev/ttyUSB0
   ```

3. **Verify the device is accessible in the container:**
   ```bash
   docker exec hydroponics-websocket ls -l /dev/ttyUSB0
   ```

### Complete Reset

If all else fails, completely recreate containers:

```bash
# Stop and remove all containers
docker-compose down

# Remove any persisted volumes if needed
docker volume prune -f

# Rebuild and restart
docker-compose up -d --build
```
