"""
FastAPI application for Macular Society RAG API.

Provides REST endpoints for querying the RAG system about macular degeneration.
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load environment variables before importing other modules
load_dotenv()

# ruff: noqa: E402
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from api.models.query import HealthResponse
from api.routes import query_router
from src.lib._shared import get_qdrant_client
from src.lib.env import env


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    logger.info("Starting Macular Society RAG API...")

    # Test Qdrant connection on startup
    try:
        client = get_qdrant_client()
        collections = client.get_collections()
        logger.info(
            f"Connected to Qdrant. Collections: {[c.name for c in collections.collections]}"
        )
    except Exception as e:
        logger.warning(f"Qdrant connection failed on startup: {e}")

    yield

    logger.info("Shutting down Macular Society RAG API...")


app = FastAPI(
    title="Macular Society RAG API",
    description="""
API for querying the Macular Society RAG system.

This API allows you to ask questions about macular degeneration
and receive answers based on content from the Macular Society website.

## Features

- **RAG Queries**: Ask questions and get context-aware answers
- **Session Support**: Optional session tracking for multi-turn conversations
- **Multiple Backends**: Supports Ollama and OpenAI as LLM backends
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(query_router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """
    Check API health and backend connectivity.

    Returns status of the API and whether backends are reachable.
    """
    qdrant_connected = False
    try:
        client = get_qdrant_client()
        client.get_collections()
        qdrant_connected = True
    except Exception:
        pass

    return HealthResponse(
        status="healthy",
        qdrant_connected=qdrant_connected,
        ollama_configured=bool(env.ollama.url),
        openai_configured=env.openai.enabled,
    )


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Macular Society RAG API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
