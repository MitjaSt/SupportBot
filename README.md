# SupportBot - a RAG Pipeline

A retrieval-augmented generation (RAG) chatbot built with NestJS, PostgreSQL/pgvector, and OpenAI.

Read the project overview: [INTRODUCTION.md](INTRODUCTION.md)

## Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- OpenAI API key

## Installation

### 1. Configure environment

Copy the example env file and fill in the required values:

```bash
cp .env.example .env
```

Required variables to set in `.env`:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (used for embeddings and chat) |
| `POSTGRES_DATABASE` | Database name |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |

Optional feature flags:

| Variable | Default | Description |
|---|---|---|
| `RAG_HYBRID_SEARCH_ENABLED` | `false` | Enable hybrid search (BM25 + vector) with RRF ranking. Set to `true` after running `make embed`. |

### 2. Install dependencies

```bash
make setup
```

This installs npm packages for the API and frontend, creates a `.env` symlink for the API, and installs Playwright browsers.

### 3. Start Docker services

```bash
make docker-start
```

Starts PostgreSQL (port 5432), Whisper STT (port 3040), and Piper TTS (port 3050).

### 3b. Set up Zitadel auth (first time, or after a DB wipe)

Zitadel is the identity provider. Start it alongside the other services:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.zitadel.yml up -d
```

Then run the setup script — it creates the project, apps, roles, and wires up the permissions action:

```bash
./docker/setup-zitadel.sh
```

The script prints the values you need at the end. Copy them into `.env.config`:

```
ZITADEL_JWKS_URI=http://localhost:8080/oauth/v2/keys
ZITADEL_ISSUER=http://localhost:8080
ZITADEL_AUDIENCE=<project ID from script output>
AUTH_ENABLED=true
```

Restart the API to pick up the new audience value. On future restarts (without a DB wipe) nothing needs to change — the IDs are stable.

> **After a DB wipe:** Drop the Zitadel DB and re-run setup:
> ```bash
> docker exec postgres psql -U rag_user -d rag_project \
>   -c "DROP DATABASE IF EXISTS zitadel_dev;" \
>   -c "DROP ROLE IF EXISTS zitadel;"
> docker restart zitadel
> ./docker/setup-zitadel.sh   # wait ~30s for Zitadel to re-init first
> ```
> Then update `ZITADEL_AUDIENCE` in `.env.config` with the new project ID.

**Verify auth is working:**

```bash
# 1. Unprotected health check (no token needed)
curl http://localhost:3030/api/system/health
# → {"status":"ok"}

# 2. Get a JWT via the browser login flow
# Visit the authorize URL printed by setup-zitadel.sh, log in as
# admin@ragproject.localhost / Password1!
# Copy the `code=` param from the redirect URL, then:
curl -s -X POST http://localhost:8080/oauth/v2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=<CODE>" \
  -d "redirect_uri=http://localhost:5173/callback" \
  -d "client_id=<FRONTEND_CLIENT_ID_FROM_SCRIPT>" \
  -d "code_verifier=" | jq .access_token

# 3. Hit a protected endpoint with the JWT
curl -s -H "Authorization: Bearer <access_token>" \
  http://localhost:3030/api/system/status | jq .status
# → "healthy"
```

### 4. Run database migrations

```bash
make db-generate
make db-migrate
```

`db-migrate` automatically applies the full-text search column and GIN index after running Drizzle migrations. Both steps are idempotent.

### 5. Seed embeddings

> **Note:** This step calls the OpenAI API and will consume API credits.

The embedding pipeline has three stages. The API must be running first (see below), then in a separate terminal:

```bash
make scrape      # Step 1: scrape website content (uses Playwright)
make process     # Step 2: process and flatten content
make summarize   # Step 2b: summarise content via LLM
make embed       # Step 3: create and store embeddings in Postgres
```

Or run all stages at once:

```bash
make pipeline
```

> **Tip:** If `.cache/` is already populated (e.g. from a teammate or previous run), you can skip straight to the final step:
> ```bash
> make embed
> ```

## Running the application

Start the API and frontend in separate terminals:

```bash
make api          # NestJS API → http://localhost:3030
make frontend     # Vite frontend → http://localhost:5173
```

## Useful commands

| Command | Description |
|---|---|
| `make help` | List all available commands |
| `make docker-stop` | Stop Docker services |
| `make docker-logs` | Tail Docker logs |
| `make docker-status` | Show Docker service status |
| `make db-fts` | Apply full-text search column + GIN index (once, after migrations) |
| `make db-studio` | Open Drizzle Studio (database UI) |
| `make lint` | Run ESLint on API and frontend |
| `make typecheck` | Run TypeScript type checks |
| `make clean` | Remove node_modules and build artifacts |
