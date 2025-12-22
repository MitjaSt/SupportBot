#!/usr/bin/env bash

docker compose up -d --remove-orphans --renew-anon-volumes

# Pull model
curl -X POST http://localhost:11434/api/pull -d '{"name": "mistral"}'

# Test model
RESPONSE=$(curl --fail --insecure --silent --request POST http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "stream": false,
  "prompt": "Are you running fine?"
}')

echo $RESPONSE | jq .response
