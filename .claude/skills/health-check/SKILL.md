---
name: health-check
description: Checks the status of all services in the local dev stack — Postgres, Whisper, Piper, API, Prometheus, Grafana — and validates that required environment variables are set. Use at the start of a dev session or when something is unexpectedly failing.
---

# Health Check

Checks every service the RAG Project depends on and validates environment configuration. Run this at the start of a dev session or when things are unexpectedly broken — the root cause is often a service that isn't running.

## Usage

```
/health-check
```

## Services and ports

| Service | Port | Required for |
|---|---|---|
| PostgreSQL | 5432 | Everything — sessions, vectors, chat history |
| API | 3030 | Chat, RAG, pipeline |
| Whisper (STT) | 3040 | Voice input |
| Piper (TTS) | 3050 | Voice output |
| Prometheus | 3060 | Metrics |
| Grafana | 3070 | Metrics dashboard |
| Frontend dev | 5173 | Local development |

## Instructions

### Step 1: Check Docker services

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
```

Note which containers are running and which are not.

### Step 2: Check individual ports

```bash
# PostgreSQL
lsof -ti:5432 > /dev/null && echo "✓ PostgreSQL (5432)" || echo "✗ PostgreSQL (5432) — run: make docker-start"

# API
lsof -ti:3030 > /dev/null && echo "✓ API (3030)" || echo "✗ API (3030) — run: make api"

# Whisper
lsof -ti:3040 > /dev/null && echo "✓ Whisper STT (3040)" || echo "✗ Whisper (3040) — run: make docker-start"

# Piper
lsof -ti:3050 > /dev/null && echo "✓ Piper TTS (3050)" || echo "✗ Piper (3050) — run: make docker-start"

# Prometheus
lsof -ti:3060 > /dev/null && echo "✓ Prometheus (3060)" || echo "✗ Prometheus (3060)"

# Grafana
lsof -ti:3070 > /dev/null && echo "✓ Grafana (3070)" || echo "✗ Grafana (3070)"

# Frontend dev server
lsof -ti:5173 > /dev/null && echo "✓ Frontend dev (5173)" || echo "  Frontend dev (5173) — not running (OK if using production build)"
```

### Step 3: Check environment variables

```bash
# Check .env exists
[ -f projects/api/.env ] && echo "✓ projects/api/.env exists" || echo "✗ projects/api/.env missing — copy from .env.example"

# Check critical vars are set (without printing values)
grep -q "^OPENAI_API_KEY=." projects/api/.env 2>/dev/null && echo "✓ OPENAI_API_KEY set" || echo "✗ OPENAI_API_KEY not set"
grep -q "^DATABASE_URL=." projects/api/.env 2>/dev/null && echo "✓ DATABASE_URL set" || echo "✗ DATABASE_URL not set"
grep -q "^POSTGRES_HOST=." projects/api/.env 2>/dev/null && echo "✓ POSTGRES_HOST set" || echo "✗ POSTGRES_HOST not set"
```

### Step 4: Quick API health check (if API is running)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/health 2>/dev/null || echo "API not reachable"
```

A 200 means the API is up and connected to the database. Any other response or connection error means something is wrong.

### Step 5: Check vector database has data

If the API is running, check embeddings are loaded (otherwise RAG returns no results):

```bash
curl -s http://localhost:3030/system/status 2>/dev/null | head -200
```

### Step 6: Output status report

```
## Dev Stack Health Check

Services
  ✓/✗ PostgreSQL (5432)
  ✓/✗ API (3030)
  ✓/✗ Whisper STT (3040)
  ✓/✗ Piper TTS (3050)
  ✓/✗ Prometheus (3060)
  ✓/✗ Grafana (3070)
    Frontend dev (5173) — [running / not running]

Environment
  ✓/✗ projects/api/.env
  ✓/✗ OPENAI_API_KEY
  ✓/✗ DATABASE_URL

API
  ✓/✗ Health endpoint responding
  ✓/✗ Vector store has data

Status: ✓ Everything ready
     or: ✗ Issues found — see above

Quick fixes:
  Start Docker services:  make docker-start
  Start API:              make api
  Start frontend:         cd projects/frontend && npm run dev
```

## Notes

- Whisper and Piper are optional for most development — only needed when testing voice features
- The vector store check is important: if embeddings haven't been loaded, the RAG pipeline will silently return no results
- If PostgreSQL is running but the API can't connect, check `DATABASE_URL` in `.env` matches the Docker network configuration
