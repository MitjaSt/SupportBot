# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a RAG (Retrieval-Augmented Generation) system for medical question-answering focused on macular degeneration information from the Macular Society website. The system consists of a TypeScript/NestJS backend API and a React frontend, using OpenAI for chat completions and Postgres with pgvector for semantic search.

**System Architecture:**
```
User → React Frontend → NestJS API → OpenAI (gpt-4o)
                              ↓
                         Postgres + pgvector
                         (embeddings + chat history)
```

## Technology Stack

### Backend (projects/api)
- **Framework:** NestJS with TypeScript
- **Database:** PostgreSQL with pgvector extension
- **ORM:** Drizzle ORM
- **LLM:** OpenAI API (gpt-4o with function calling)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **Scraping:** Playwright (headless browser)
- **Testing:** Vitest with @langwatch/scenario for agent simulations
- **Observability:** LangFuse, LangWatch, ConfidentAI (optional)

### Frontend (projects/frontend)
- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **UI:** Tailwind CSS

## Architecture

### Core Modules

The API is organized into NestJS modules:

#### 1. **Pipeline Module** ([projects/api/src/modules/pipeline](projects/api/src/modules/pipeline))
Orchestrates the data ingestion pipeline:
- **Scraping:** Fetches content from macularsociety.org sitemap
- **Processing:** Flattens HTML into structured text
- **Summarization:** Uses OpenAI to generate summaries
- **Criteria Generation:** Creates test evaluation criteria
- **Embedding:** Generates and stores vector embeddings

#### 2. **RAG Module** ([projects/api/src/modules/rag](projects/api/src/modules/rag))
Implements Retrieval-Augmented Generation:
- Embeds user queries
- Searches Postgres pgvector for relevant chunks (cosine similarity)
- Sends context + query to OpenAI
- Supports OpenAI function calling for tools
- Logs all interactions

#### 3. **Contact Collection Module** ([projects/api/src/modules/contact-collection](projects/api/src/modules/contact-collection))
Handles callback requests via OpenAI function calling:
- Detects when users request callbacks
- Validates UK phone numbers and email addresses
- Saves conversation history to `.cache/history/`
- See [docs/CONTACT_COLLECTION.md](../../docs/CONTACT_COLLECTION.md) for details

#### 4. **Vector DB Module** ([projects/api/src/modules/vector-db](projects/api/src/modules/vector-db))
Manages Postgres pgvector operations:
- Creates/deletes vector collections
- Upserts embeddings with metadata
- Performs similarity search using cosine distance
- Uses raw SQL with pgvector operators (`<=>`)

#### 5. **Chat Module** ([projects/api/src/modules/chat](projects/api/src/modules/chat))
HTTP endpoints for chat interactions:
- `POST /chat` - Main chat endpoint
- Manages conversation history
- Returns sources and confidence scores

#### 6. **Processing Module** ([projects/api/src/modules/processing](projects/api/src/modules/processing))
Content processing services:
- Content flattening from scraped HTML
- OpenAI-powered summarization
- Automatic test criteria generation
- Saves outputs to `.cache/` directories

#### 7. **Scraping Module** ([projects/api/src/modules/scraping](projects/api/src/modules/scraping))
Web scraping with Playwright:
- Fetches sitemap.xml
- Extracts structured content from pages
- Filters unwanted content (nav, footer, etc.)
- Concurrent scraping with configurable limits

#### 8. **Embeddings Module** ([projects/api/src/modules/embeddings](projects/api/src/modules/embeddings))
Manages embedding generation:
- Uses OpenAI text-embedding-3-small
- Batch processing for efficiency
- Handles both queries and documents

#### 9. **Database Module** ([projects/api/src/modules/database](projects/api/src/modules/database))
Drizzle ORM setup:
- Database connection pooling
- Schema definitions with pgvector custom type
- Session and message persistence

### Database Schema

Three main tables (see [projects/api/src/db/schema.ts](projects/api/src/db/schema.ts)):

#### **vectors**
Stores document embeddings for RAG:
```typescript
{
  id: uuid (primary key)
  embedding: vector(1536)  // pgvector type
  text: text               // chunk content
  source: text             // source file
  chunkIndex: integer      // position in document
  chunkLength: integer     // chunk size
  createdAt: timestamp
}
```

#### **sessions**
Tracks user conversations:
```typescript
{
  sessionId: text (primary key)
  createdAt: timestamp
  updatedAt: timestamp
  expiresAt: timestamp
  userPhone: text
  userName: text
  preferredCallTime: text
  collectionState: enum
  callbackTopic: text
}
```

#### **messages**
Stores conversation history:
```typescript
{
  id: integer (auto-increment)
  sessionId: text (foreign key)
  role: 'user' | 'assistant'
  content: text
  createdAt: timestamp
}
```

## Development Workflow

### Initial Setup

```bash
# Install dependencies for both projects
make setup

# Start Postgres
make docker-start

# Push database schema
make db-push
```

### Running the Pipeline

The data ingestion pipeline runs via API endpoints:

```bash
# Start API server (in separate terminal)
make api

# Run full pipeline
make pipeline

# Or run steps individually:
make scrape      # Scrape macularsociety.org
make process     # Flatten content
make summarize   # Generate summaries
make criteria    # Generate test criteria
make embed       # Create embeddings and store in Postgres
```

Each command makes a CURL request to the running API server.

### Development Servers

```bash
# API (http://localhost:3030)
make api

# Frontend (http://localhost:5173)
make frontend
```

### Testing

```bash
# Unit tests
make test

# Agent simulation tests
make test-simulations

# Coverage report
make test-cov
```

### Code Quality

```bash
# Run linter
make lint

# Auto-fix lint issues
make lint-fix

# Format code with Prettier
make format

# Type checking
make typecheck

# Run all checks
make check
```

### Database Management

```bash
# Generate migration from schema changes
make db-generate

# Run migrations
make db-migrate

# Push schema directly (development)
make db-push

# Open Drizzle Studio (database GUI)
make db-studio
```

## Configuration

All configuration via environment variables in `.env` (see [.env.example](.env.example)):

### Required Variables

```bash
# OpenAI (required for chat and embeddings)
OPENAI_API_KEY="sk-..."
OPENAI_ENABLE=true

# PostgreSQL
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DATABASE="macular_society"
POSTGRES_USER="macular"
POSTGRES_PASSWORD="macular_dev"
```

### Optional Observability

```bash
# LangFuse
LANGFUSE_ENABLE=false
LANGFUSE_SECRET_KEY=""
LANGFUSE_PUBLIC_KEY=""

# LangWatch
LANGWATCH_ENABLE=false
LANGWATCH_API_KEY=""

# ConfidentAI
CONFIDENTAI_ENABLE=false
CONFIDENTAI_API_KEY=""
```

### Pipeline Settings

```bash
# Scraping
MAX_CONCURRENT_SCRAPES="5"

# Chunking
CHUNKING_SIZE_TOKENS="256"
CHUNKING_OVERLAP_TOKENS="100"

# RAG Retrieval
RAG_TOP_K="2"
RAG_SCORE_THRESHOLD="0.7"
RAG_MAX_TOKENS="4096"
```

## Key Features

### 1. OpenAI Function Calling

The system uses OpenAI's function calling API for tools:

**Current Tools:**
- `collect_contact_information` - Collects phone/email for callbacks

See [tools.ts](projects/api/src/modules/rag/tools.ts) for tool definitions.

### 2. Vector Search with pgvector

Postgres pgvector extension provides efficient similarity search:

```sql
SELECT id, text, source,
  1 - (embedding <=> $1::vector) as score
FROM vectors
ORDER BY embedding <=> $1::vector
LIMIT 2
```

Uses cosine distance (`<=>` operator) for semantic similarity.

### 3. Agent Simulation Testing

Uses `@langwatch/scenario` framework for conversational testing:

```bash
# Generate tests from criteria JSON files
npm run test:generate

# Run simulation tests
make test-simulations
```

Generated tests evaluate RAG responses against judge criteria.

### 4. Conversation History

All chat interactions stored in Postgres:
- Session tracking with expiry
- Message history with roles
- Contact collection state machine

When contact info is collected, full conversation saved to:
`.cache/history/YYYY-MM-DDTHH-MM-SS_[phone|email]_[value].md`

## API Endpoints

### Chat
- `POST /chat` - Main chat endpoint
  ```json
  {
    "message": "What is dry AMD?",
    "history": []
  }
  ```

### Pipeline
- `POST /pipeline/scrape` - Scrape website
- `POST /pipeline/process` - Flatten content
- `POST /pipeline/summarize` - Generate summaries
- `POST /pipeline/criteria-generation` - Generate test criteria
- `POST /pipeline/embed` - Create embeddings
- `GET /pipeline/collection` - Get collection info

### System
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## File Structure

```
projects/
├── api/                          # NestJS backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── chat/            # Chat endpoints
│   │   │   ├── contact-collection/  # Callback collection
│   │   │   ├── embeddings/      # Embedding generation
│   │   │   ├── pipeline/        # Pipeline orchestration
│   │   │   ├── processing/      # Content processing
│   │   │   ├── rag/             # RAG implementation
│   │   │   ├── scraping/        # Web scraping
│   │   │   └── vector-db/       # Postgres pgvector
│   │   ├── db/
│   │   │   └── schema.ts        # Drizzle schema
│   │   └── main.ts              # App entry point
│   ├── test/
│   │   ├── agent-simulations/   # LangWatch scenario tests
│   │   └── unit/                # Unit tests
│   ├── drizzle/                 # Migrations
│   └── scripts/                 # Utility scripts
└── frontend/                     # React frontend
    └── src/
```

## Cache Directories

Pipeline outputs stored in `.cache/`:

```
.cache/
├── json/         # Raw scraped JSON
├── flat/         # Flattened text files
├── summaries/    # OpenAI-generated summaries
├── criteria/     # Test evaluation criteria (JSON)
├── prompts/      # Chat interaction logs (JSON)
└── history/      # Contact collection conversations (Markdown)
```

## Important Notes

### Postgres + pgvector Setup

The `pgvector` extension must be enabled in Postgres:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This is automatically done by the Docker setup in `docker/docker-compose.yml`.

### Drizzle Custom Type

pgvector integration uses a custom Drizzle type (see [schema.ts](projects/api/src/db/schema.ts#L14-L25)):

```typescript
const vector = (name: string, config: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() { return `vector(${config.dimensions})`; },
    toDriver(value: number[]): string { return JSON.stringify(value); },
    fromDriver(value: string): number[] { return JSON.parse(value); }
  })(name);
```

### Pipeline Destructive Operations

- `process` clears `.cache/flat/` before processing
- `embed` recreates the `vectors` table (deletes all embeddings)
- Use `clean-cache` to clear cache directories without affecting node_modules

### OpenAI Rate Limits

The system makes multiple OpenAI API calls:
- Embeddings: ~1 call per 10-50 chunks (batch processing)
- Chat: 1 call per user message
- Summarization: 1 call per document
- Criteria generation: 1 call per document

Monitor usage in OpenAI dashboard.

### Session Expiry

Sessions expire after 24 hours (configurable via `POSTGRES_SESSION_EXPIRY_HOURS`).

## Troubleshooting

### Database Connection Issues

```bash
# Check Postgres is running
make docker-status

# Restart Postgres
make docker-restart

# View logs
make docker-logs
```

### Embedding Errors

Common issues:
- **No vectors found:** Run `make embed` to populate database
- **Wrong dimensions:** Ensure `EMBEDDING_VECTOR_SIZE=1536` matches OpenAI model
- **Low scores:** Adjust `RAG_SCORE_THRESHOLD` (lower = more permissive)

### Build Failures

```bash
# Clean everything and reinstall
make clean
make setup

# Check TypeScript errors
make typecheck
```

## Testing Strategy

### Unit Tests

Located in `projects/api/test/unit/`:
- Contact validation logic
- Utility functions
- Service methods

### Integration Tests

Located in `projects/api/test/integration/`:
- Database operations
- API endpoints
- Pipeline steps

### Agent Simulation Tests

Located in `projects/api/test/agent-simulations/`:
- Conversational scenarios using @langwatch/scenario
- Judge-based evaluation
- Generated from criteria JSON files

Run specific test suites:
```bash
cd projects/api
npm test test/unit/contact-collection.test.ts
npm test test/agent-simulations/
```

## Additional Documentation

- **Contact Collection:** [docs/CONTACT_COLLECTION.md](../../docs/CONTACT_COLLECTION.md)
- **Personal Notes:** [docs/personal/](../../docs/personal/)

## Common Tasks

### Adding a New OpenAI Tool

1. Define tool in [tools.ts](projects/api/src/modules/rag/tools.ts)
2. Handle tool call in [rag.service.ts](projects/api/src/modules/rag/rag.service.ts)
3. Add tests in `test/unit/`
4. Document in `docs/`

### Updating Database Schema

1. Modify [schema.ts](projects/api/src/db/schema.ts)
2. Generate migration: `make db-generate`
3. Review migration in `drizzle/`
4. Apply migration: `make db-migrate`

### Adding Test Criteria

1. Create JSON file in `.cache/criteria/`
2. Follow format from existing files
3. Run: `npm run test:generate`
4. Generated test appears in `test/agent-simulations/generated/`

## Performance Considerations

- **Embedding Batch Size:** Default 32 chunks per API call
- **Concurrent Scraping:** Default 5 pages (configurable via `MAX_CONCURRENT_SCRAPES`)
- **Database Pooling:** Configured in database module
- **Chunk Size:** 256 tokens with 100 token overlap
- **Top-K Results:** Default 2 (adjust via `RAG_TOP_K`)

## Security Notes

- API keys must be set in `.env` (never commit)
- Database credentials in `.env`
- CORS configured for frontend origin
- Contact information stored securely in Postgres
- Conversation logs contain PII (phone/email) - handle appropriately

## Support & Feedback

For issues or questions about the codebase:
- Check this documentation first
- Review module-specific README files
- Check logs: `make logs` or `make docker-logs`
- Run tests to validate changes: `make test`
