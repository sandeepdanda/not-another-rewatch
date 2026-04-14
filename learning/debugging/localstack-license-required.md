---
created: 2026-04-14
tags: [docker, localstack]
time_to_fix: 5
---

# Debug: LocalStack latest requires a paid license

## Symptoms
`docker compose up` started the container but it immediately exited with code 55. Logs showed: "License activation failed! No credentials were found in the environment."

## Root Cause
LocalStack changed their licensing in 2026. The `latest` tag (v2026.3.1+) requires `LOCALSTACK_AUTH_TOKEN` for any usage. The free community edition ended with version 3.x.

## Fix
Pinned the Docker image to `localstack/localstack:3.8` (last free community version) in docker-compose.yml.

## How to Recognize This Next Time
Any Docker image exit code 55 + "License activation failed" in logs = licensing issue. Always pin Docker image versions instead of using `latest` - you never know when pricing changes.
