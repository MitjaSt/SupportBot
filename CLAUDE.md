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

### Step 2: Content Flattening ([step2_chunkify.py](step2_chunkify.py))
- Reads JSON files from `cache/json/`
- Flattens structured content into plain text (title + headings + paragraphs)
- Filters out non-medical content using `EXCLUDED_FILE_PREFIXES` (about pages, shop, careers, etc.)
- Saves flattened text to `cache/flat/` as `.txt` files
- Clears target directory before processing

### Step 3: Embeddings & Vector DB ([step3_embeddings-save.py](step3_embeddings-save.py))
- **Token-based chunking:** Uses NLTK sentence tokenizer to split text into chunks of `CHUNK_SIZE_TOKENS` (512) with `OVERLAP_TOKENS` (100) overlap
- **Parallel processing:** Uses `ProcessPoolExecutor` with `MAX_WORKERS` (4) for concurrent embedding generation
- **Each worker process:**
  - Loads its own SentenceTransformer model instance
  - Creates embeddings using the model specified in [shared.py](shared.py)
  - Saves chunks to JSONL in `cache/chunks/`
  - Saves embeddings as NumPy arrays in `cache/embeddings/`
  - Upserts points to Qdrant with metadata (text, source, chunk_index)
- **Qdrant:** Recreates collection on each run (destructive), uses COSINE distance

### Step 4: RAG Inference ([step4_llm.py](step4_llm.py))
- **Retrieval:** Embeds query → searches Qdrant → filters by `SCORE_THRESHOLD` → returns top-k chunks
- **LLM:** Supports both local (Mistral via transformers) and Ollama backends (toggle via `USE_OLLAMA`)
- **Local LLM config:** 4-bit quantization (bitsandbytes), streaming output via `TextIteratorStreamer`
- **Prompt logging:** Saves every query/response to `cache/prompts/` as JSON with timestamp and metadata
- **Interactive mode:** CLI accepts questions via stdin or command-line argument

## Configuration

All configuration is managed through environment variables and [shared.py](shared.py):

### Environment Variables (.env)
See [.env.example](.env.example) for all available options:
- **Cache directories:** `CACHE_DIR_JSON`, `CACHE_DIR_FLAT`, `CACHE_DIR_EMBEDDINGS`, `CACHE_DIR_PROMPTS`
- **Qdrant:** `QDRANT_COLLECTION_NAME`, `QDRANT_HOST`
- **APIs:** `HUGGINGFACE_TOKEN`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- **Scraping:** `MAX_CONCURRENT_SCRAPES`

### Model Configuration (shared.py)
The `ModelSize` enum controls model selection:
- **SMALL:** RedPajama-3B + all-mpnet-base-v2 (768-dim), 2K context
- **LARGE:** Mistral-7B + gte-large (1024-dim), 4K context

Shared constants: `LLM_MODEL`, `EMBED_MODEL`, `VECTOR_SIZE`, `TOP_K`, `MAX_TOKENS`, `SCORE_THRESHOLD`

## Development Commands

### Setup
```bash
# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For linting/formatting
```

### Run the Full Pipeline
```bash
# Automated script (scrape → flatten → embed)
./create_embeddings.sh

# Or run steps individually:
python step1_scrape.py
python step2_chunkify.py
python step3_embeddings-save.py
```

### Query the System
```bash
# Interactive mode
python step4_llm.py

# Single query
python step4_llm.py "What is dry macular degeneration?"
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
# Chunkify specific files
python step2_chunkify.py macular-disease--dry-amd.json another-file.json
```

## Key Technical Details

### Chunking Strategy
- Uses tokenizer-aware chunking (not character-based) to respect model token limits
- Overlapping chunks improve retrieval of context spanning sentence boundaries
- Chunks are stored with source file and index for traceability

### Parallel Processing
- Step 3 uses multiprocessing to parallelize embedding generation
- Each worker process loads its own model instance (avoids pickling issues)
- Progress tracked with tqdm across all workers

### Model Loading
- **LLM:** 4-bit quantization via bitsandbytes reduces memory footprint
- **Embeddings:** SentenceTransformer models loaded from HuggingFace
- Models are cached locally after first download

### Prompt Engineering
- System prompt restricts LLM to only answer from retrieved context
- Fallback response: "I do not have information about that. Can I help you with something else?"
- Concise phone-optimized responses (references "you" not "caller")

### Qdrant Integration
- Collection is recreated on each embedding run (no incremental updates)
- Uses UUID7 for point IDs (time-ordered UUIDs)
- Metadata payload includes original text, source file, and chunk index

## Testing

Test files are included for ElevenLabs integration:
- `test_elevenlabs_list_voices.py` - List available voices
- `test_elevenlabs_text2voice.py` - TTS testing
- `test_elevenlabs_voice2text.py` - STT testing
- `test_query_qdrant.py` - Vector search testing

## Important Notes

- The pipeline is **destructive by design**: Step 2 clears `cache/flat/`, Step 3 deletes and recreates the Qdrant collection
- Scraping respects `EXCLUDED_URL_PREFIXES` and file processing respects `EXCLUDED_FILE_PREFIXES` - these lists are intentionally different (URL-level vs file-level filtering)
- All cached data (JSON, flat text, embeddings, prompts) is stored in `cache/` subdirectories
- The system requires ~8GB RAM for SMALL models, ~16GB for LARGE models
- Qdrant must be running before Step 3 or Step 4
