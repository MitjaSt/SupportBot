# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a RAG (Retrieval-Augmented Generation) pipeline for a voice-based question-answering system focused on macular degeneration information from the Macular Society website. The system scrapes medical content, creates embeddings, and uses a local LLM to answer user questions via voice interaction.

**Voice Pipeline Flow:**
```
User speaks → ElevenLabs STT → RAG (embed + retrieve from Qdrant)
→ Local LLM (Mistral) → ElevenLabs TTS → Audio reply
```

## Architecture

The codebase follows a **sequential 4-step pipeline**:

### Step 1: Web Scraping ([step1_scrape.py](step1_scrape.py))
- Fetches sitemap from `https://www.macularsociety.org/sitemap.xml`
- Uses Playwright (headless Chromium) to scrape pages concurrently (configurable via `MAX_CONCURRENT_SCRAPES`)
- Extracts structured content (headings + paragraphs) from `<main>` element
- Removes unwanted elements (nav, footer, images, videos, etc.)
- Saves each page as JSON in `cache/json/` with URL-safe filenames (e.g., `macular-disease--dry-amd.json`)
- Excludes URLs matching patterns in `EXCLUDED_URL_PREFIXES` (404s, events, media)

### Step 2: Content Flattening ([step2_flatten.py](step2_flatten.py))
- Reads JSON files from `cache/json/`
- Flattens structured content into plain text (title + headings + paragraphs)
- Filters out non-medical content using `EXCLUDED_FILE_PREFIXES` (about pages, shop, careers, etc.)
- Saves flattened text to `cache/flat/` as `.txt` files
- Clears target directory before processing

### Step 3: Semantic Chunking & Embeddings ([step3_semantic_chunking.py](step3_semantic_chunking.py))
- **Modern semantic chunking:** Uses `semantic-text-splitter` library with the model's native tokenizer for accurate token-based chunking
- **Configuration:** `CHUNK_SIZE_TOKENS` (512) with `OVERLAP_TOKENS` (100) for context preservation
- **Single-pass processing:** Reads `.txt` files, chunks semantically, generates embeddings in batches, and upserts to Qdrant
- **Batch embedding:** Uses SentenceTransformer with batch_size=32 for efficient encoding
- **Metadata tracking:** Each point includes text, source file, chunk_index, and chunk_length
- **Qdrant:** Recreates collection on each run (destructive), uses COSINE distance with UUID4 point IDs
- **Progress tracking:** tqdm progress bar for file processing

### Step 4: RAG Inference

Two implementations available:

#### Option A: Ollama Backend ([step4_llm.py](step4_llm.py))
- **Retrieval:** Embeds query → searches Qdrant → filters by `SCORE_THRESHOLD` → returns top-k chunks
- **LLM:** Uses Ollama API (configured via environment variables)
- **Prompt logging:** Saves every query/response to `cache/prompts/` as YAML with timestamp and metadata
- **Interactive mode:** CLI accepts questions via stdin or command-line argument
- **Environment config:** `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT`

#### Option B: Semantic Query ([step4_semantic_query.py](step4_semantic_query.py))
- **Modern approach:** Uses OpenAI-compatible API client (works with Ollama)
- **Chat completions:** Structured messages with system prompt and user context
- **Enhanced metadata:** Logs include embedding model, top-k, score threshold, and chunk retrieval stats
- **Verbose mode:** Displays retrieved chunks with scores and sources during queries
- **JSON logging:** Saves complete query/response/metadata to `cache/prompts/`
- **Interactive CLI:** Supports both single-query and interactive modes

## Configuration

All configuration is managed through environment variables and [shared.py](shared.py):

### Environment Variables (.env)
See [.env.example](.env.example) for all available options:
- **Cache directories:** `CACHE_DIR_JSON`, `CACHE_DIR_FLAT`, `CACHE_DIR_EMBEDDINGS`, `CACHE_DIR_PROMPTS`
- **Qdrant:** `QDRANT_COLLECTION_NAME`, `QDRANT_HOST`
- **APIs:** `HUGGINGFACE_TOKEN`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- **Scraping:** `MAX_CONCURRENT_SCRAPES`

### Model Configuration (shared.py)
Current production configuration:
- **Embedding Model:** `embaas/sentence-transformers-gte-large` (1024-dimensional vectors)
- **Vector Size:** 1024
- **Qdrant Collection:** `macular_society`
- **Retrieval Settings:** TOP_K=4, SCORE_THRESHOLD=0.5
- **LLM Settings:** MAX_TOKENS=4096

Shared constants and helper functions:
- `get_qdrant_client()` - Returns configured QdrantClient instance
- `recreate_qdrant_collection()` - Destructively recreates collection with COSINE distance

## Development Commands

### Setup
```bash
# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Run the Full Pipeline
```bash
# Run steps individually:
python step1_scrape.py
python step2_flatten.py
python step3_semantic_chunking.py
```

### Query the System
```bash
# Option A: Simple Ollama backend (step4_llm.py)
# Interactive mode
python step4_llm.py
# Single query
python step4_llm.py "What is dry macular degeneration?"

# Option B: Semantic query with enhanced logging (step4_semantic_query.py)
# Interactive mode
python step4_semantic_query.py
# Single query
python step4_semantic_query.py "What is dry macular degeneration?"
```

### Qdrant Vector Database
```bash
# Start Qdrant
cd docker && docker-compose up -d

# View dashboard
open http://localhost:6333/dashboard

# View collections
open http://localhost:6333/dashboard#/collections
```

### Code Quality
```bash
# Format code
ruff format .
black .

# Check linting
ruff check .

# Sort imports
isort .

# Type checking
mypy .
```

Ruff is configured in [pyproject.toml](pyproject.toml) with line length 100, Python 3.11+ target.

### Process Specific Files
```bash
# Flatten specific files
python step2_flatten.py macular-disease--dry-amd.json another-file.json
```

## Key Technical Details

### Semantic Chunking Strategy
- Uses `semantic-text-splitter` library for intelligent chunking that respects:
  - Sentence boundaries (doesn't split mid-sentence)
  - Token limits based on the actual embedding model's tokenizer
  - Semantic coherence across chunks
- Overlapping chunks (100 tokens) improve retrieval of context spanning boundaries
- Each chunk stored with comprehensive metadata: text, source file, chunk_index, chunk_length

### Batch Processing
- Step 3 uses batch embedding generation (batch_size=32) for efficiency
- Single-pass processing: chunk → embed → upsert in one workflow
- Progress tracked with tqdm for visual feedback

### Model Loading
- **Embeddings:** SentenceTransformer models loaded from HuggingFace
- **LLM:** Ollama-based models via HTTP API (local inference)
- Models are cached locally after first download
- Uses the model's native tokenizer for accurate token counting

### Prompt Engineering
- System prompt restricts LLM to only answer from retrieved context
- Fallback response: "I do not have information about that. Can I help you with something else?"
- Concise phone-optimized responses (references "you" not "caller")

### Qdrant Integration
- Collection is recreated on each embedding run (no incremental updates)
- Uses UUID4 for point IDs (random UUIDs)
- Metadata payload includes: text, source file, chunk_index, and chunk_length
- COSINE distance metric for similarity search
- Configured via `shared.py` helper functions

## Testing

### RAG System Testing
- **`test_batch_queries.py`** - Batch testing of all questions from TESTING.md
  - Runs multiple queries in parallel (configurable via `MAX_WORKERS`)
  - Extracts questions automatically from TESTING.md
  - Saves comprehensive results to `cache/batch_tests/` as YAML
  - Includes summary statistics (success rate, timing, etc.)
  - Usage: `python test_batch_queries.py`

### ElevenLabs Integration Testing
- `test_elevenlabs_list_voices.py` - List available voices
- `test_elevenlabs_text2voice.py` - TTS testing
- `test_elevenlabs_voice2text.py` - STT testing

### Vector Database Testing
- `test_query_qdrant.py` - Vector search testing

## Important Notes

- The pipeline is **destructive by design**: Step 2 clears `cache/flat/`, Step 3 deletes and recreates the Qdrant collection
- Scraping respects `EXCLUDED_URL_PREFIXES` and file processing respects `EXCLUDED_FILE_PREFIXES` - these lists are intentionally different (URL-level vs file-level filtering)
- All cached data is stored in `cache/` subdirectories:
  - `cache/json/` - Raw scraped JSON from website
  - `cache/flat/` - Flattened text files
  - `cache/chunks/` - Not currently used (legacy)
  - `cache/embeddings/` - Not currently used (legacy)
  - `cache/prompts/` - YAML logs of queries/responses (step4_llm.py) or JSON logs (step4_semantic_query.py)
- The system requires ~8-16GB RAM depending on model size and batch processing
- Qdrant must be running (localhost:6333) before Step 3 or Step 4
- Two query implementations available: simple Ollama backend (step4_llm.py) and enhanced semantic query (step4_semantic_query.py)
