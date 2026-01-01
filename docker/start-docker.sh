#!/usr/bin/env bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

source $PROJECT_DIR/.env

docker compose \
  --file $PROJECT_DIR/docker/docker-compose.yml \
  --env-file $PROJECT_DIR/.env \
  up --detach

# Pull model
curl -X POST http://localhost:11434/api/pull -d '{"name": "'$OLLAMA_MODEL'"}'

# Test model
RESPONSE=$(curl --fail --insecure --silent --request POST http://localhost:11434/api/generate -d '{
  "model": "'$OLLAMA_MODEL'",
  "stream": false,
  "prompt": "Are you running fine?"
}')

echo $RESPONSE | jq .response
