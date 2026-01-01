# Macular Society RAG System

A voice-enabled question-answering system that uses Retrieval-Augmented Generation (RAG) to provide accurate information about macular degeneration from the Macular Society website.

## Overview

This system scrapes medical content from the Macular Society website, creates semantic embeddings, and uses a local LLM to answer user questions via voice interaction.

**Pipeline Flow:**
```
User speaks → ElevenLabs STT → RAG (embed + retrieve from Qdrant)
→ Local LLM (Mistral) → ElevenLabs TTS → Audio reply
```

## Features

- **Web Scraping**: Concurrent scraping of Macular Society website content
- **Semantic Chunking**: Intelligent text chunking with token-based splitting
- **Vector Search**: Qdrant vector database for efficient similarity search
- **Local LLM**: Ollama-based inference for privacy-focused responses
- **Voice Integration**: ElevenLabs STT/TTS for natural voice interaction

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- ~8-16GB RAM

### 1. Setup Environment

```bash
# Clone repository
git clone <repository-url>
cd macular-society

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your API keys (HuggingFace, ElevenLabs)
```

### 2. Start Qdrant Vector Database

```bash
( cd docker; ./start-docker.sh )
```

Verify Qdrant is running: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

### 3. Run the Pipeline

Execute the steps sequentially:

```bash
# Step 1: Scrape website content
python step1_scrape.py

# Step 2: Flatten JSON to text
python step2_flatten.py

# Step 3: Create embeddings and populate Qdrant
python step3_semantic_chunking.py
```

### 4. Query the System

**Option A: Simple Ollama backend**
```bash
# Interactive mode
python step4_llm.py

# Single query
python step4_llm.py "What is dry macular degeneration?"
```

**Option B: Enhanced semantic query**
```bash
# Interactive mode
python step4_semantic_query.py

# Single query
python step4_semantic_query.py "What is dry macular degeneration?"
```

## Project Structure

```
.
├── step1_scrape.py              # Web scraping with Playwright
├── step2_flatten.py             # JSON to text conversion
├── step3_semantic_chunking.py   # Semantic chunking + embeddings
├── step4_llm.py                 # Ollama RAG inference
├── step4_semantic_query.py      # Enhanced RAG with detailed logging
├── shared.py                    # Configuration and shared utilities
├── cache/                       # Generated data
│   ├── json/                    # Scraped JSON files
│   ├── flat/                    # Flattened text files
│   └── prompts/                 # Query/response logs
├── docker/                      # Docker Compose for Qdrant
└── .env                         # Environment configuration
```

## Configuration

Edit [.env](.env) to configure:
- **API Keys**: HuggingFace, ElevenLabs
- **Qdrant**: Collection name, host
- **Scraping**: Concurrency settings
- **Model Settings**: Embedding model, retrieval parameters

See [.env.example](.env.example) for all available options.

## Testing

```bash
# Batch test all queries
python test_batch_queries.py

# Test ElevenLabs integration
python test_elevenlabs_text2voice.py
python test_elevenlabs_voice2text.py

# Test Qdrant vector search
python test_query_qdrant.py
```

## Development

### Code Quality

```bash
# Format code
ruff format .

# Lint
ruff check .

# Type checking
mypy .
```

### Process Specific Files

```bash
# Flatten specific JSON files
python step2_flatten.py file1.json file2.json
```

## Architecture Details

For detailed technical documentation, see [CLAUDE.md](.claude/CLAUDE.md).

### Key Technologies

- **Scraping**: Playwright (headless Chromium)
- **Embeddings**: SentenceTransformer (`embaas/sentence-transformers-gte-large`)
- **Chunking**: `semantic-text-splitter` library
- **Vector DB**: Qdrant (COSINE similarity)
- **LLM**: Ollama (local inference)
- **Voice**: ElevenLabs (STT/TTS)

## Notes

- The pipeline is **destructive**: Step 2 clears `cache/flat/`, Step 3 recreates the Qdrant collection
- Qdrant must be running before Steps 3 and 4
- First run will download embedding models (~1-2GB)
- Query logs are saved to `cache/prompts/` for debugging
