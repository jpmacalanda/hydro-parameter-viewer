
# Hydroponics Monitoring System

## Project info

**URL**: https://lovable.dev/projects/9d096dec-19bd-43a9-80ce-09ae73807cd9

## Installation

### Setting up the Raspberry Pi

1. **Install required Python packages on your Raspberry Pi**:
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-serial
   pip3 install websockets asyncio
   ```

2. **Create a WebSocket server on your Raspberry Pi**:
   Create a file named `hydroponics_server.py` with the following content:
   ```python
   import asyncio
   import serial
   import websockets
   import json
   
   # Configure these settings:
   SERIAL_PORT = "/dev/ttyUSB0"  # Change to your Arduino's serial port
   BAUD_RATE = 9600
   WS_PORT = 8081
   
   # Initialize serial connection
   try:
       ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
       print(f"Serial connection established on {SERIAL_PORT}")
   except Exception as e:
       print(f"Error opening serial port: {e}")
       ser = None
   
   connected_clients = set()
   
   async def handle_client(websocket, path):
       print(f"Client connected: {websocket.remote_address}")
       connected_clients.add(websocket)
       try:
           await websocket.wait_closed()
       finally:
           connected_clients.remove(websocket)
           print(f"Client disconnected: {websocket.remote_address}")
   
   async def read_serial():
       while True:
           if ser and ser.in_waiting > 0:
               try:
                   line = ser.readline().decode('utf-8').strip()
                   if line:
                       # Parse the Arduino data
                       data = {}
                       parts = line.split(',')
                       for part in parts:
                           key_value = part.split(':')
                           if len(key_value) == 2:
                               key, value = key_value
                               if key.lower() == 'ph':
                                   data['ph'] = float(value)
                               elif key.lower() == 'temp' or key.lower() == 'temperature':
                                   data['temperature'] = float(value)
                               elif key.lower() == 'water' or key.lower() == 'waterlevel':
                                   data['waterLevel'] = value
                               elif key.lower() == 'tds':
                                   data['tds'] = int(value)
                       
                       if data and connected_clients:
                           # Send data to all connected clients
                           message = json.dumps(data)
                           await asyncio.gather(
                               *(client.send(message) for client in connected_clients)
                           )
                           print(f"Sent to {len(connected_clients)} clients: {message}")
               except Exception as e:
                   print(f"Error reading/processing serial data: {e}")
           await asyncio.sleep(1)
   
   async def main():
       server = await websockets.serve(handle_client, "0.0.0.0", WS_PORT)
       print(f"WebSocket server running on port {WS_PORT}")
       serial_task = asyncio.create_task(read_serial())
       await server.wait_closed()
   
   if __name__ == "__main__":
       asyncio.run(main())
   ```

3. **Make the script executable and run it automatically on startup**:
   ```bash
   chmod +x hydroponics_server.py
   ```

   To run the script on startup, add it to your crontab:
   ```bash
   crontab -e
   ```
   
   Add this line to the file:
   ```
   @reboot python3 /path/to/hydroponics_server.py
   ```

### Setting up the Arduino

1. **Upload the following code to your Arduino**:
   ```cpp
   // Hydroponics Monitoring System
   // Make sure to connect your sensors correctly
   
   void setup() {
     Serial.begin(9600);
     // Initialize your sensors here
   }
   
   void loop() {
     // Replace these with actual sensor readings
     float ph = 6.8;           // pH sensor reading
     float temp = 23.5;        // Temperature sensor reading
     String waterLevel = "medium";  // Water level sensor reading
     int tds = 650;            // TDS sensor reading
     
     // Send data in the format expected by the monitoring system
     Serial.print("pH:");
     Serial.print(ph);
     Serial.print(",temp:");
     Serial.print(temp);
     Serial.print(",water:");
     Serial.print(waterLevel);
     Serial.print(",tds:");
     Serial.print(tds);
     Serial.println();
     
     delay(5000); // Send data every 5 seconds
   }
   ```

2. **Connect the Arduino to your Raspberry Pi** via USB.

### Running the Web Application

1. **Clone and set up the web application**:
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   npm i
   npm run dev
   ```

2. **Access the application**:
   - From the Raspberry Pi: http://localhost:8080
   - From other devices: http://[RASPBERRY_PI_IP]:8080 (replace [RASPBERRY_PI_IP] with your Raspberry Pi's IP address)

## Docker Setup

### Docker for the Web Application

1. **Create a Dockerfile**:
   Create a file named `Dockerfile` in the root of your project:

   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Create an Nginx configuration file**:
   Create a directory named `docker` and inside it create a file named `nginx.conf`:

   ```
   server {
       listen 80;
       server_name _;
       
       location / {
           root /usr/share/nginx/html;
           index index.html;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Build and run the Docker container**:
   ```bash
   docker build -t hydroponics-monitor .
   docker run -d -p 80:80 --name hydroponics-app hydroponics-monitor
   ```

4. **Access the application**:
   - From the host machine: http://localhost
   - From other devices: http://[HOST_IP] (replace [HOST_IP] with your host machine's IP address)

### Docker for the Raspberry Pi WebSocket Server

1. **Create a Dockerfile for the WebSocket server**:
   Create a file named `Dockerfile.server` in the root of your project:

   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   
   # Install required packages
   RUN apt-get update && apt-get install -y \
       python3-serial \
       && rm -rf /var/lib/apt/lists/*
   
   RUN pip install websockets asyncio pyserial
   
   # Copy server script
   COPY hydroponics_server.py .
   
   # Run the server
   CMD ["python3", "hydroponics_server.py"]
   ```

2. **Build and run the Docker container for the WebSocket server**:
   ```bash
   docker build -f Dockerfile.server -t hydroponics-server .
   docker run -d --device=/dev/ttyUSB0 -p 8081:8081 --name hydroponics-ws hydroponics-server
   ```

   Note: Replace `/dev/ttyUSB0` with the actual path to your Arduino device.

3. **Docker Compose (Optional)**:
   For easier management, create a `docker-compose.yml` file:

   ```yaml
   version: '3'

   services:
     webapp:
       build: .
       ports:
         - "80:80"
       depends_on:
         - websocket

     websocket:
       build:
         context: .
         dockerfile: Dockerfile.server
       ports:
         - "8081:8081"
       devices:
         - "/dev/ttyUSB0:/dev/ttyUSB0"
   ```

   Run with:
   ```bash
   docker-compose up -d
   ```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9d096dec-19bd-43a9-80ce-09ae73807cd9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9d096dec-19bd-43a9-80ce-09ae73807cd9) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
