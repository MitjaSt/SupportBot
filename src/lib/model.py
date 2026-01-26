"""
Shared LLM and RAG functionality.
Used by step4_llm.py and test_batch_queries.py.
"""

import threading

from sentence_transformers import SentenceTransformer

from src.lib._shared import EMBED_MODEL

# Thread-local storage for embedding model (prevents threading issues)

_thread_local = threading.local()


def get_embed_model():
    """Get or initialize the embedding model (thread-local singleton pattern)."""
    if not hasattr(_thread_local, "embed_model"):
        _thread_local.embed_model = SentenceTransformer(EMBED_MODEL)
    return _thread_local.embed_model


def embed_query(text: str):
    """Embed a text query using the sentence transformer model."""
    model = get_embed_model()
    return model.encode([text])[0]


def estimate_tokens(text: str) -> int:
    """
    Estimate token count for a text string.
    Uses word count * 1.3 as approximation (typical for English text with LLMs).
    """
    words = len(text.split())
    return int(words * 1.3)
