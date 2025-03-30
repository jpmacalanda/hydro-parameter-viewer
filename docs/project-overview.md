
# Project Overview

The Hydroponics Monitoring System is a comprehensive solution for monitoring and managing hydroponics setups. It combines hardware sensors with a modern web interface to provide real-time monitoring of crucial parameters.

## Features

- Real-time monitoring of:
  - pH levels
  - Temperature
  - Water levels
  - TDS (Total Dissolved Solids)
- Web-based dashboard
- Multi-device access through WebSocket communication
- Docker support for easy deployment

## Architecture

The system consists of three main components:
1. Arduino with sensors for data collection
2. Raspberry Pi running a Serial Monitor service
3. Web application for data visualization

## System Architecture Diagram

```
┌────────────────┐    Serial     ┌────────────────┐     HTTPS     ┌────────────────┐
│                │  Connection   │                │    (443/80)   │                │
│    Arduino     │◄─────────────►│  Raspberry Pi  │◄─────────────►│  Web Browser   │
│  with Sensors  │               │ (Docker Host)  │               │                │
└────────────────┘               └───────┬────────┘               └────────────────┘
                                         │
                                         │ Docker Compose
                                         ▼
                             ┌─────────────────────────┐
                             │                         │
                             │  ┌─────────────────┐    │
                             │  │  serial-monitor │    │
                             │  │    container    │    │
                             │  └───────┬─────────┘    │
                             │          │              │
                             │          │ logs         │
                             │          ▼              │
                             │  ┌─────────────────┐    │
                             │  │                 │    │
                             │  │  webapp (NGINX) │    │
                             │  │    container    │    │
                             │  └─────────────────┘    │
                             │                         │
                             └─────────────────────────┘
```

## Data Flow

1. Arduino reads data from connected sensors (pH, temperature, water level, TDS)
2. Data is sent via serial connection to the Raspberry Pi
3. The serial-monitor container captures and processes the sensor data
4. The webapp container serves the frontend application and provides access to the data
5. Users view real-time monitoring data through the web interface

