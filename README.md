
# Hydroponics Monitoring System

This project implements a monitoring system for hydroponics using Arduino, Raspberry Pi, and a web interface. The system tracks pH levels, temperature, water levels, and TDS (Total Dissolved Solids) in real-time.

## System Architecture

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

## Documentation Sections

- [Project Overview](docs/project-overview.md)
- [Installation Guide](docs/installation.md)
  - [Raspberry Pi Setup](docs/raspberry-pi-setup.md)
  - [Arduino Setup](docs/arduino-setup.md)
  - [Web Application Setup](docs/web-app-setup.md)
- [Docker Deployment](docs/docker-setup.md)
- [Development Guide](docs/development.md)

## Quick Links

- **Project URL**: https://lovable.dev/projects/9d096dec-19bd-43a9-80ce-09ae73807cd9
- **Technologies**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- **Support**: Visit our [documentation](https://docs.lovable.dev/) for more details

## Features

- Real-time monitoring of hydroponics parameters:
  - pH levels with optimal range indicators
  - Water temperature tracking
  - TDS (Total Dissolved Solids) measurement
  - Water level monitoring
- Interactive dashboard with customizable views
- Historical data visualization
- Adjustable threshold settings
- Sensor calibration tools
- System diagnostics and monitoring

## Getting Started

1. Set up the Arduino with sensors following the [Arduino Setup Guide](docs/arduino-setup.md)
2. Install the monitoring system on your Raspberry Pi using the [Raspberry Pi Setup Guide](docs/raspberry-pi-setup.md)
3. Deploy the application using [Docker](docs/docker-setup.md)
4. Access the web interface as described in the [Web Application Setup](docs/web-app-setup.md)

