"""
Database layer for PostgreSQL with pgvector.
Provides unified storage for embeddings and conversation state.
"""

from .client import get_db_pool, init_db
from .embeddings import EmbeddingRepository
from .sessions import SessionRepository

__all__ = [
    "get_db_pool",
    "init_db",
    "EmbeddingRepository",
    "SessionRepository",
]
