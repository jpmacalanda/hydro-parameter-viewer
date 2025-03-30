
# Raspberry Pi Setup

## Prerequisites

1. Raspberry Pi with Raspberry Pi OS installed
2. Python 3.x installed
3. USB connection to Arduino

## Hardware Diagram

```
┌───────────────┐      USB       ┌───────────────┐
│               │    Serial      │               │
│    Arduino    │◄──Connection──►│  Raspberry Pi │
│               │                │               │
└───────┬───────┘                └───────┬───────┘
        │                                │
        ▼                                ▼
┌──────────────────┐            ┌──────────────────┐
│                  │            │                  │
│  pH, Temp, TDS,  │            │  Docker          │
│  Water Sensors   │            │  Containers      │
│                  │            │                  │
└──────────────────┘            └──────────────────┘
```

## Installation Steps

1. **Install required Python packages**:
```bash
sudo apt update
sudo apt install python3-pip python3-serial
pip3 install websockets asyncio
```

2. **Set up the WebSocket server**:
Create a file named `hydroponics_server.py` with the provided WebSocket server code.

3. **Make the script executable**:
```bash
chmod +x hydroponics_server.py
```

4. **Configure autostart**:
Add to crontab:
```bash
crontab -e
```
Add this line:
```
@reboot python3 /path/to/hydroponics_server.py
```

## Docker Setup

Follow these steps to set up the Docker containers:

1. **Install Docker**:
```bash
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker pi
sudo systemctl enable docker
sudo systemctl start docker
```

2. **Install Docker Compose**:
```bash
sudo apt-get install -y libffi-dev libssl-dev
sudo apt-get install -y python3 python3-pip
sudo pip3 install docker-compose
```

3. **Clone the repository**:
```bash
git clone <repository-url>
cd <repository-directory>
```

4. **Configure environment variables**:
```bash
# Identify your Arduino serial port
ls -l /dev/tty*

# Set the correct port in your environment
export SERIAL_DEVICE=/dev/ttyUSB0  # Change as needed
```

5. **Deploy the containers**:
```bash
docker-compose up -d
```

## Automatic Restart Configuration

To ensure your Docker containers automatically restart when the Raspberry Pi is rebooted:

1. **Enable Docker service to start on boot**:
```bash
sudo systemctl enable docker
```

2. **Set containers to automatically restart**:
The Docker Compose file is already configured with `restart: always` for all services, which ensures containers will restart automatically after a reboot.

3. **Verify automatic restart**:
After rebooting your Raspberry Pi, verify all containers are running:
```bash
docker ps
```

4. **Optional: Create a startup script**:
For additional reliability, create a startup script:
```bash
sudo nano /etc/rc.local
```
Add this before the `exit 0` line:
```bash
# Start hydroponics containers
cd /path/to/your/project && docker-compose up -d
```
Make it executable:
```bash
sudo chmod +x /etc/rc.local
```
