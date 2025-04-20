# AbbuCoin Blockchain - Docker Setup

This document explains how to run the AbbuCoin blockchain using Docker containers.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed

## Running with Docker Compose

1. Clone the repository
2. Navigate to the repository directory
3. Start the containers with Docker Compose:

```bash
docker-compose up -d
```

This will start three services:
- `blockchain-server` - The main blockchain node (port 3001)
- `blockchain-miner` - A miner client that mines new blocks
- `web-ui` - Web interface for the blockchain (port 8081)

## Accessing the Services

- Web UI: http://localhost:8081
- Blockchain API: http://localhost:3001

## Docker Volume

All blockchain data (blocks, wallets, sessions) is stored in a Docker volume named `blockchain-data`. This ensures data persistence between container restarts.

## Container Logs

To view logs from any service:

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs blockchain-server
docker-compose logs blockchain-miner
docker-compose logs web-ui

# Follow logs in real-time
docker-compose logs -f
```

## Stopping the Services

To stop all services:

```bash
docker-compose down
```

To stop and remove all data volumes (will erase blockchain data):

```bash
docker-compose down -v
```

## Rebuilding Services

If you make changes to the code, rebuild and restart the services:

```bash
docker-compose up -d --build
```

## Configuration

The Docker environment uses the following settings:
- DATA_DIR: `/app/data` - Directory for persistent data storage
- NODE_ENV: `production` - Environment setting 