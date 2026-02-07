"""Conversation state management module.

Types are now imported from db module (PostgreSQL backend).
Redis-based ConversationStateManager is deprecated.
"""

# Re-export types from db module for backward compatibility
from db import (
    CollectionState,
    ConversationSession,
    Message,
    SessionRepository,
    UserInfo,
)
from src.lib.conversations.callback_flow import CallbackFlowManager
from src.lib.conversations.prompt_builder import (
    build_enhanced_system_prompt,
    format_conversation_history,
    inject_collection_instructions,
)

# Alias for backward compatibility
ConversationStateManager = SessionRepository

__all__ = [
    "CallbackFlowManager",
    "CollectionState",
    "ConversationSession",
    "ConversationStateManager",  # Deprecated: use SessionRepository
    "SessionRepository",
    "Message",
    "UserInfo",
    "build_enhanced_system_prompt",
    "format_conversation_history",
    "inject_collection_instructions",
]
