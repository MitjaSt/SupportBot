# Macular Society RAG Pipeline

A retrieval-augmented generation (RAG) chatbot, built with NestJS, PostgreSQL/pgvector, and OpenAI.

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

### 4. Run database migrations

```bash
make db-generate
make db-migrate
```

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
| `make db-studio` | Open Drizzle Studio (database UI) |
| `make lint` | Run ESLint on API and frontend |
| `make typecheck` | Run TypeScript type checks |
| `make clean` | Remove node_modules and build artifacts |
