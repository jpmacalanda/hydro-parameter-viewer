
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
docker run -d --device=/dev/ttyUSB0 -p 8081:8081 -v $(pwd)/ssl:/etc/nginx/ssl -e USE_SSL=false --name hydroponics-ws hydroponics-server
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

4. **Rebuild and restart all services** (after making changes):
```bash
docker-compose down
docker-compose up -d --build
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

### Connection Refused Error

If you see "Connection Refused" errors when accessing your Raspberry Pi:

1. **Check if containers are running**:
```bash
docker ps
```

2. **Verify NGINX is listening on the correct ports**:
```bash
docker exec hydroponics-app netstat -tulpn | grep nginx
```

3. **Check if ports are open and accessible**:
```bash
sudo netstat -tulpn | grep -E '80|443|8081'
```

4. **Restart docker service and containers**:
```bash
sudo systemctl restart docker
docker-compose down
docker-compose up -d
```

5. **Check for firewall issues**:
```bash
sudo iptables -L
# If you have UFW enabled, allow the ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8081/tcp
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

4. **Check container logs for any error messages**:
```bash
docker-compose logs --tail=100
```
