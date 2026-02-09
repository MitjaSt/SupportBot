# Macular Society RAG API - TypeScript/NestJS

TypeScript implementation of the Macular Society RAG pipeline using NestJS.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Copy environment from parent (or create .env)
cp ../.env .env

# Enable OpenAI embeddings (edit .env)
OPENAI_ENABLE=true
OPENAI_API_KEY=sk-your-key-here

# Start in development mode
npm run start:dev
```

## API Endpoints

### Query

```bash
# RAG query with session
POST /query
{
  "query": "What is macular degeneration?",
  "sessionId": "optional-session-id"
}

# Get session with history
GET /session/:sessionId

# Delete session
DELETE /session/:sessionId
```

### Pipeline

```bash
# Scrape website
POST /pipeline/scrape

# Process (flatten + chunk) documents
POST /pipeline/process

# Generate embeddings and index
POST /pipeline/embed

# Run full pipeline
POST /pipeline/full

# Get collection info
GET /pipeline/collection
```

## Architecture

```
src/
├── config/           # Environment configuration with Typebox
├── dto/              # Request/Response DTOs
├── modules/
│   ├── database/     # PostgreSQL with typed queries
│   ├── embeddings/   # OpenAI embeddings
│   ├── vector-db/    # Qdrant client
│   ├── scraping/     # Playwright web scraper
│   ├── processing/   # Text chunking
│   ├── rag/          # Retrieval + LLM generation
│   └── chat/         # Session management
├── app.controller.ts # Main API controller
├── app.module.ts     # Root module
└── main.ts           # Entry point
```

## Configuration

Uses the same `.env` file as the Python project. Key settings:

| Variable | Description | TypeScript Default |
|----------|-------------|-------------------|
| `OPENAI_ENABLE` | Use OpenAI for chat | `false` |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-small` |
| `EMBEDDING_VECTOR_SIZE` | Vector dimensions | `1536` |

## Docker

Uses the same Docker images as Python:
- PostgreSQL with pgvector
- Qdrant vector database

```bash
cd ../docker && docker-compose up -d
```

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```
