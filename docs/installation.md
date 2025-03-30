
# Installation Guide

This guide provides an overview of the installation process. For detailed instructions, please refer to the specific setup guides:

- [Raspberry Pi Setup](raspberry-pi-setup.md) - Configure the WebSocket server
- [Arduino Setup](arduino-setup.md) - Set up the sensors and upload the code
- [Web Application Setup](web-app-setup.md) - Deploy the monitoring interface
- [Docker Setup](docker-setup.md) - Deploy using Docker

## System Requirements

- Raspberry Pi (any model with USB ports)
- Arduino board
- Required sensors (pH, temperature, water level, TDS)
- Modern web browser (Chrome/Edge recommended)

## Installation Overview Diagram

```
┌───────────────────────┐
│  Hardware Setup       │
├───────────────────────┤
│ 1. Connect Sensors    │
│ 2. Program Arduino    │
│ 3. Connect to Pi      │
└─────────┬─────────────┘
          │
          ▼
┌───────────────────────┐
│  Raspberry Pi Setup   │
├───────────────────────┤
│ 1. Install Docker     │
│ 2. Clone Repository   │
│ 3. Configure Settings │
└─────────┬─────────────┘
          │
          ▼
┌───────────────────────┐
│  Docker Deployment    │
├───────────────────────┤
│ 1. Build Containers   │
│ 2. Start Services     │
│ 3. Verify Deployment  │
└─────────┬─────────────┘
          │
          ▼
┌───────────────────────┐
│  Access Application   │
├───────────────────────┤
│ 1. Browse to Pi IP    │
│ 2. Monitor Dashboard  │
│ 3. Configure Settings │
└───────────────────────┘
```

## Installation Steps

1. Follow the [Arduino Setup](arduino-setup.md) guide to configure your sensors
2. Follow the [Raspberry Pi Setup](raspberry-pi-setup.md) guide to set up the monitoring software
3. Deploy the application using the [Docker Setup](docker-setup.md) guide
4. Access the web interface as described in the [Web Application Setup](web-app-setup.md) guide

