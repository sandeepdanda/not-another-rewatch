---
created: 2026-04-14
last_reviewed: 2026-04-14
review_interval: 1
confidence: 1
tags: [docker, localstack]
---

# Docker Compose starts your whole dev environment with one command

## What
Docker Compose lets you define multiple services (database, backend, frontend) in a single `docker-compose.yml` file. `docker compose up` starts everything. `docker compose down` stops everything. Each service runs in its own container - isolated from your machine.

## Why
Without it, you'd need to install DynamoDB locally (you can't - it's a cloud service), or manually start/stop multiple Docker containers. Compose makes the dev environment reproducible - anyone cloning the repo gets the same setup.

## Example
```yaml
services:
  localstack:
    image: localstack/localstack:3.8
    ports:
      - "4566:4566"          # LocalStack exposes all AWS services on this port
    environment:
      - SERVICES=dynamodb    # Only start DynamoDB, not all 50+ AWS services
    volumes:
      - "./infra/init-dynamodb.sh:/etc/localstack/init/ready.d/init-dynamodb.sh"
      # ^ This script runs automatically when LocalStack is ready
```

LocalStack fakes AWS services locally. Port 4566 is the single endpoint for all services. You talk to it the same way you'd talk to real AWS: `aws --endpoint-url=http://localhost:4566 dynamodb list-tables`

## Source
- [Docker Compose docs](https://docs.docker.com/compose/)
- [LocalStack docs](https://docs.localstack.cloud/getting-started/)
