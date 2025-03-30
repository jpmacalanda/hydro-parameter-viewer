
# Raspberry Pi Setup

## Prerequisites

1. Raspberry Pi with Raspberry Pi OS installed
2. Python 3.x installed
3. USB connection to Arduino

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

