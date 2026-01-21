# Macular Society RAG Pipeline

A RAG (Retrieval-Augmented Generation) pipeline for a voice-based question-answering system focused on macular degeneration information from the Macular Society website.

## Voice Pipeline Flow

```
User speaks → ElevenLabs STT → RAG (embed + retrieve from Qdrant)
→ Local LLM (Mistral) → ElevenLabs TTS → Audio reply
```

## Quick Start

```bash
# 1. Setup environment
make setup

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Start Docker services (Qdrant)
make docker-start

# 5. Run the full pipeline
make pipeline

# 6. Query the system
make query
```

## Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Ollama (for local LLM inference)

## Installation

### Setup Virtual Environment

```bash
make setup          # Create venv and install all dependencies
make setup-dev      # Setup with development tools (pre-commit hooks)
```

This will:
- Create a `.venv` virtual environment
- Install all Python dependencies from `requirements.txt`
- Install Playwright browsers for web scraping

### Environment Variables

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

See [.env.example](.env.example) for all available configuration options.

## Docker Services

The pipeline uses Qdrant as the vector database. Manage Docker services with:

| Command | Description |
|---------|-------------|
| `make docker-start` | Start Qdrant and other services |
| `make docker-stop` | Stop all Docker services |
| `make docker-restart` | Restart Docker services |
| `make docker-logs` | Tail Docker container logs |
| `make docker-status` | Show status of Docker containers |

**Qdrant Dashboard:** http://localhost:6333/dashboard

## Pipeline Execution

The pipeline consists of 4 steps:

### Run Individual Steps

| Command | Description |
|---------|-------------|
| `make scrape` | **Step 1:** Scrape website content |
| `make flatten` | **Step 2:** Flatten JSON to plain text |
| `make embed` | **Step 3:** Create embeddings and load to Qdrant |
| `make query` | **Step 4:** Interactive query interface |

### Run Full Pipeline

```bash
make pipeline        # Run steps 1-3 (scrape → flatten → embed)
make pipeline-full   # Clean cache and run full pipeline
```

After the pipeline completes, use `make query` to start asking questions.

## Testing

| Command | Description |
|---------|-------------|
| `make test` | Run all tests with pytest |
| `make test-batch-queries` | Run batch query tests from TESTING.md |
| `make test-qdrant` | Test Qdrant vector search |
| `make test-elevenlabs` | Test ElevenLabs API integration |
| `make test-conversation` | Test conversation flow |

## Code Quality

| Command | Description |
|---------|-------------|
| `make lint` | Run linter (ruff) |
| `make lint-fix` | Run linter with auto-fix |
| `make format` | Format code (black + isort) |
| `make format-check` | Check formatting without changes |
| `make typecheck` | Run type checker (mypy) |
| `make quality` | Run all quality checks (format + lint + typecheck) |

## Utilities

| Command | Description |
|---------|-------------|
| `make clean` | Remove venv, cache, and build artifacts |
| `make clean-cache` | Remove only cache directories (preserves venv) |
| `make validate` | Validate environment variables and dependencies |
| `make stats` | Show project statistics |
| `make open-qdrant` | Open Qdrant dashboard in browser |
| `make logs` | Tail application logs |

## Development

| Command | Description |
|---------|-------------|
| `make install-hooks` | Install git pre-commit hooks |
| `make dev-shell` | Activate development shell with venv |
| `make requirements-update` | Update requirements.txt from current venv |

## Project Structure

```
├── src/
│   ├── pipeline/           # Main pipeline steps
│   │   ├── step1_scrape.py
│   │   ├── step2_flatten.py
│   │   ├── step3_semantic_chunking.py
│   │   └── step4_llm.py
│   └── lib/                # Shared libraries
├── tests/                  # Test files
├── docker/                 # Docker configuration
├── cache/                  # Cached data (gitignored)
│   ├── json/              # Raw scraped JSON
│   ├── flat/              # Flattened text files
│   └── prompts/           # Query/response logs
├── scripts/               # Utility scripts
├── .env.example           # Environment template
├── Makefile               # Build automation
└── requirements.txt       # Python dependencies
```

## Help

Run `make` or `make help` to see all available commands:

```bash
make help
```
