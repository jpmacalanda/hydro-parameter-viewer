
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

If you encounter a "command not found" error, ensure the script has executable permissions:

```bash
# Make the script executable
sudo chmod +x generate-ssl-certs.sh

# Run the script
sudo ./generate-ssl-certs.sh
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

## Troubleshooting on Raspberry Pi

### USB Device Access

If Docker can't access the Arduino:

1. **Check Arduino detection**:
```bash
ls -l /dev/ttyUSB*
```

2. **Set permissions for the device**:
```bash
sudo chmod 666 /dev/ttyUSB0
```

3. **Add your user to the dialout group** (then logout and login):
```bash
sudo usermod -a -G dialout $USER
```

### Connection Issues

1. **For best results, use HTTP instead of HTTPS** on Raspberry Pi:
   - Access `http://raspberrypi.local` or `http://[RPI-IP-ADDRESS]` 
   - The app is configured to work best with HTTP on Raspberry Pi

2. **Monitor logs for WebSocket server**:
```bash
docker logs hydroponics-ws -f
```

3. **Check NGINX logs**:
```bash
docker logs hydroponics-app -f
```

### If still having issues:

1. **Restart the containers**:
```bash
docker-compose down
docker-compose up -d
```

2. **Verify port access**:
```bash
curl -v http://localhost:8081
```

3. **Verify USB device is mounted in container**:
```bash
docker exec -it hydroponics-ws ls -l /dev/ttyUSB0
```
