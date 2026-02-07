"""
Database layer for PostgreSQL with pgvector.
Provides unified storage for embeddings and conversation state.
"""

from .client import close_pool, get_db_pool, init_db
from .embeddings import EmbeddingRepository
from .sessions import (
    CollectionState,
    ConversationSession,
    Message,
    Session,
    SessionRepository,
    UserInfo,
)

__all__ = [
    # Client
    "get_db_pool",
    "init_db",
    "close_pool",
    # Repositories
    "EmbeddingRepository",
    "SessionRepository",
    # Session types
    "CollectionState",
    "ConversationSession",
    "Session",
    "Message",
    "UserInfo",
]
