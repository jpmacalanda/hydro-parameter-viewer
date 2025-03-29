
# Docker Setup

## Prerequisites

- Docker installed
- Docker Compose installed (optional)

## Web Application Container

1. **Build the container**:
```bash
docker build -t hydroponics-monitor .
```

2. **Run the container**:
```bash
docker run -d -p 80:80 --name hydroponics-app hydroponics-monitor
```

## WebSocket Server Container

1. **Build the container**:
```bash
docker build -f Dockerfile.server -t hydroponics-server .
```

2. **Run the container**:
```bash
docker run -d --device=/dev/ttyUSB0 -p 8081:8081 --name hydroponics-ws hydroponics-server
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

