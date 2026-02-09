#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

source $PROJECT_DIR/.env

docker compose \
  --file $PROJECT_DIR/docker/docker-compose.yml \
  --env-file $PROJECT_DIR/.env \
  up --detach
