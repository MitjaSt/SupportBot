"""
Conversation state management with Redis backend.
Handles session tracking, message history, and user information collection.
"""

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum

from loguru import logger

from src.lib.env import env


class CollectionState(Enum):
    IDLE = "idle"
    OFFERING = "offering"
    COLLECTING_USER_PHONE = "collecting__user_phone"
    COLLECTING_USER_NAME = "collecting__user_name"
    COLLECTING_USER_TIME = "collecting_user_time"
    CONFIRMING = "confirming"
    COMPLETE = "complete"


@dataclass
class Message:
    """Conversation message with metadata."""

    role: str  # "user" or "assistant"
    content: str
    timestamp: str


@dataclass
class ConversationSession:
    """Conversation session with user information and state."""

    session_id: str
    created_at: str
    updated_at: str
    user_phone: str | None = None
    user_name: str | None = None
    preferred_call_time: str | None = None
    collection_state: str = CollectionState.IDLE.value
    callback_topic: str | None = None


@dataclass
class UserInfo:
    """Collected user information for callback."""

    phone: str | None = None
    name: str | None = None
    preferred_call_time: str | None = None


class ConversationStateManager:
    """Manages conversation state in Redis."""

    def __init__(self, redis_client):
        """
        Initialize state manager with Redis client.

        Args:
            redis_client: Redis client instance
        """
        self.redis = redis_client
        self.expiry_seconds = env.redis.conversation_expiry_seconds
        self.max_history = env.redis.max_history_messages

    def create_session(self, session_id: str) -> ConversationSession:
        """
        Create new conversation session.

        Args:
            session_id: Unique session identifier

        Returns:
            ConversationSession object
        """
        now = datetime.utcnow().isoformat()
        session = ConversationSession(
            session_id=session_id,
            created_at=now,
            updated_at=now,
            collection_state=CollectionState.IDLE.value,
        )

        # Save to Redis
        self._save_session(session)
        logger.debug(f"Created session: {session_id}")

        return session

    def get_session(self, session_id: str) -> ConversationSession | None:
        """
        Retrieve session from Redis.

        Args:
            session_id: Session identifier

        Returns:
            ConversationSession or None if not found
        """
        key = f"conversation:{session_id}"

        try:
            data = self.redis.hgetall(key)
            if not data:
                logger.debug(f"Session not found: {session_id}")
                return None

            # Convert Redis hash to ConversationSession
            session = ConversationSession(
                session_id=session_id,
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", ""),
                user_phone=data.get("user_phone"),
                user_name=data.get("user_name"),
                preferred_call_time=data.get("preferred_call_time"),
                collection_state=data.get("collection_state", CollectionState.IDLE.value),
                callback_topic=data.get("callback_topic"),
            )

            return session

        except Exception as e:
            logger.error(f"Error retrieving session {session_id}: {e}")
            return None

    def update_session(self, session: ConversationSession):
        """
        Update session in Redis.

        Args:
            session: ConversationSession to save
        """
        session.updated_at = datetime.utcnow().isoformat()
        self._save_session(session)

    def _save_session(self, session: ConversationSession):
        """
        Internal method to save session to Redis.

        Args:
            session: Session to save
        """
        key = f"conversation:{session.session_id}"

        # Convert to dict, filtering None values
        data = {k: v for k, v in asdict(session).items() if v is not None}

        try:
            self.redis.hset(key, mapping=data)
            self.redis.expire(key, self.expiry_seconds)
            logger.debug(f"Saved session: {session.session_id}")

        except Exception as e:
            logger.error(f"Error saving session {session.session_id}: {e}")

    def add_message(self, session_id: str, role: str, content: str):
        """
        Add message to conversation history (auto-trim to max_history).

        Args:
            session_id: Session identifier
            role: "user" or "assistant"
            content: Message content
        """
        key = f"conversation:{session_id}:messages"
        message = Message(role=role, content=content, timestamp=datetime.utcnow().isoformat())

        try:
            # Append message as JSON string
            self.redis.rpush(key, json.dumps(asdict(message)))

            # Trim to max history
            total = self.redis.llen(key)
            if total > self.max_history:
                # Remove oldest messages
                to_remove = total - self.max_history
                for _ in range(to_remove):
                    self.redis.lpop(key)

            # Set expiry
            self.redis.expire(key, self.expiry_seconds)
            logger.debug(f"Added {role} message to session {session_id}")

        except Exception as e:
            logger.error(f"Error adding message to session {session_id}: {e}")

    def get_messages(self, session_id: str, limit: int = 10) -> list[Message]:
        """
        Retrieve recent messages from history.

        Args:
            session_id: Session identifier
            limit: Maximum number of messages to return (newest first)

        Returns:
            List of Message objects
        """
        key = f"conversation:{session_id}:messages"

        try:
            # Get last N messages
            raw_messages = self.redis.lrange(key, -limit, -1)

            messages = []
            for raw in raw_messages:
                data = json.loads(raw)
                messages.append(
                    Message(
                        role=data["role"],
                        content=data["content"],
                        timestamp=data["timestamp"],
                    )
                )

            return messages

        except Exception as e:
            logger.error(f"Error retrieving messages from session {session_id}: {e}")
            return []

    def update_collection_state(self, session_id: str, state: CollectionState):
        """
        Update collection flow state.

        Args:
            session_id: Session identifier
            state: New CollectionState
        """
        session = self.get_session(session_id)
        if session:
            session.collection_state = state.value
            self.update_session(session)
            logger.debug(f"Updated state to {state.value} for session {session_id}")

    def update_user_info(self, session_id: str, **kwargs):
        """
        Update user information fields.

        Args:
            session_id: Session identifier
            **kwargs: phone, name, preferred_call_time
        """
        session = self.get_session(session_id)
        if session:
            if "phone" in kwargs:
                session.user_phone = kwargs["phone"]
            if "name" in kwargs:
                session.user_name = kwargs["name"]
            if "preferred_call_time" in kwargs:
                session.preferred_call_time = kwargs["preferred_call_time"]

            self.update_session(session)
            logger.debug(f"Updated user info for session {session_id}: {kwargs}")

    def get_user_info(self, session_id: str) -> UserInfo:
        """
        Retrieve collected user information.

        Args:
            session_id: Session identifier

        Returns:
            UserInfo object
        """
        session = self.get_session(session_id)
        if session:
            return UserInfo(
                phone=session.user_phone,
                name=session.user_name,
                preferred_call_time=session.preferred_call_time,
            )
        return UserInfo()

    def clear_session(self, session_id: str):
        """
        Delete session and messages (cleanup).

        Args:
            session_id: Session identifier
        """
        try:
            self.redis.delete(f"conversation:{session_id}")
            self.redis.delete(f"conversation:{session_id}:messages")
            logger.debug(f"Cleared session: {session_id}")

        except Exception as e:
            logger.error(f"Error clearing session {session_id}: {e}")
