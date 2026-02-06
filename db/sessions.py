"""
Session repository for conversation state management.
Replaces Redis for session and message storage.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from loguru import logger

from src.lib.env import env

from .client import get_connection


@dataclass
class Message:
    """Conversation message."""

    role: Literal["user", "assistant"]
    content: str
    timestamp: str


@dataclass
class Session:
    """Conversation session with user state."""

    session_id: str
    created_at: str
    updated_at: str
    user_phone: str | None = None
    user_name: str | None = None
    preferred_call_time: str | None = None
    collection_state: str = "idle"
    callback_topic: str | None = None


@dataclass
class UserInfo:
    """Collected user information for callback."""

    phone: str | None = None
    name: str | None = None
    preferred_call_time: str | None = None


class SessionRepository:
    """
    Repository for managing conversation sessions and messages.
    Replaces ConversationStateManager with PostgreSQL backend.
    """

    def __init__(self):
        """Initialize session repository."""
        self.expiry_hours = env.postgres.session_expiry_hours
        self.max_history = env.postgres.max_history_messages

    def create_session(self, session_id: str) -> Session:
        """
        Create a new conversation session.

        Args:
            session_id: Unique session identifier

        Returns:
            Created Session object
        """
        now = datetime.now(UTC)
        expires_at = now + timedelta(hours=self.expiry_hours)

        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                    INSERT INTO sessions (session_id, expires_at)
                    VALUES (%s, %s)
                    ON CONFLICT (session_id) DO UPDATE SET
                        updated_at = NOW(),
                        expires_at = EXCLUDED.expires_at
                    RETURNING session_id, created_at, updated_at,
                              user_phone, user_name, preferred_call_time,
                              collection_state, callback_topic
                    """,
                (session_id, expires_at),
            )
            row = cur.fetchone()
            conn.commit()

            logger.debug(f"Created session: {session_id}")
            return self._row_to_session(row)

    def get_session(self, session_id: str) -> Session | None:
        """
        Retrieve a session by ID.

        Args:
            session_id: Session identifier

        Returns:
            Session or None if not found/expired
        """
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                    SELECT session_id, created_at, updated_at,
                           user_phone, user_name, preferred_call_time,
                           collection_state, callback_topic
                    FROM sessions
                    WHERE session_id = %s AND expires_at > NOW()
                    """,
                (session_id,),
            )
            row = cur.fetchone()

            if row is None:
                logger.debug(f"Session not found: {session_id}")
                return None

            return self._row_to_session(row)

    def update_session(self, session: Session) -> None:
        """
        Update session fields.

        Args:
            session: Session with updated fields
        """
        expires_at = datetime.now(UTC) + timedelta(hours=self.expiry_hours)

        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                    UPDATE sessions SET
                        user_phone = %s,
                        user_name = %s,
                        preferred_call_time = %s,
                        collection_state = %s,
                        callback_topic = %s,
                        expires_at = %s
                    WHERE session_id = %s
                    """,
                (
                    session.user_phone,
                    session.user_name,
                    session.preferred_call_time,
                    session.collection_state,
                    session.callback_topic,
                    expires_at,
                    session.session_id,
                ),
            )
            conn.commit()
            logger.debug(f"Updated session: {session.session_id}")

    def update_collection_state(self, session_id: str, state: str) -> None:
        """
        Update collection flow state.

        Args:
            session_id: Session identifier
            state: New state value
        """
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE sessions SET collection_state = %s WHERE session_id = %s",
                (state, session_id),
            )
            conn.commit()
            logger.debug(f"Updated state to {state} for session {session_id}")

    def update_user_info(self, session_id: str, **kwargs) -> None:
        """
        Update user information fields.

        Args:
            session_id: Session identifier
            **kwargs: phone, name, preferred_call_time
        """
        updates = []
        values = []

        if "phone" in kwargs:
            updates.append("user_phone = %s")
            values.append(kwargs["phone"])
        if "name" in kwargs:
            updates.append("user_name = %s")
            values.append(kwargs["name"])
        if "preferred_call_time" in kwargs:
            updates.append("preferred_call_time = %s")
            values.append(kwargs["preferred_call_time"])

        if not updates:
            return

        values.append(session_id)

        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                f"UPDATE sessions SET {', '.join(updates)} WHERE session_id = %s",
                values,
            )
            conn.commit()
            logger.debug(f"Updated user info for session {session_id}: {kwargs}")

    def get_user_info(self, session_id: str) -> UserInfo:
        """
        Get collected user information.

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

    def add_message(self, session_id: str, role: str, content: str) -> None:
        """
        Add a message to conversation history.

        Args:
            session_id: Session identifier
            role: "user" or "assistant"
            content: Message content
        """
        with get_connection() as conn, conn.cursor() as cur:
            # Insert message
            cur.execute(
                "INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (session_id, role, content),
            )

            # Trim old messages if over limit
            cur.execute(
                """
                    DELETE FROM messages
                    WHERE id IN (
                        SELECT id FROM messages
                        WHERE session_id = %s
                        ORDER BY created_at DESC
                        OFFSET %s
                    )
                    """,
                (session_id, self.max_history),
            )
            conn.commit()
            logger.debug(f"Added {role} message to session {session_id}")

    def get_messages(self, session_id: str, limit: int = 10) -> list[Message]:
        """
        Get recent messages from conversation history.

        Args:
            session_id: Session identifier
            limit: Maximum messages to return

        Returns:
            List of Message objects (oldest first)
        """
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                    SELECT role, content, created_at
                    FROM messages
                    WHERE session_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                (session_id, limit),
            )
            rows = cur.fetchall()

            # Reverse to get chronological order
            messages = []
            for row in reversed(rows):
                messages.append(
                    Message(
                        role=row["role"],
                        content=row["content"],
                        timestamp=row["created_at"].isoformat(),
                    )
                )
            return messages

    def clear_session(self, session_id: str) -> None:
        """
        Delete session and its messages.

        Args:
            session_id: Session identifier
        """
        with get_connection() as conn, conn.cursor() as cur:
            # Messages deleted via CASCADE
            cur.execute("DELETE FROM sessions WHERE session_id = %s", (session_id,))
            conn.commit()
            logger.debug(f"Cleared session: {session_id}")

    def cleanup_expired(self) -> int:
        """
        Remove expired sessions.

        Returns:
            Number of sessions deleted
        """
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT cleanup_expired_sessions()")
            deleted = cur.fetchone()["cleanup_expired_sessions"]
            conn.commit()
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired sessions")
            return deleted

    def _row_to_session(self, row: dict) -> Session:
        """Convert database row to Session object."""
        return Session(
            session_id=row["session_id"],
            created_at=row["created_at"].isoformat() if row["created_at"] else "",
            updated_at=row["updated_at"].isoformat() if row["updated_at"] else "",
            user_phone=row["user_phone"],
            user_name=row["user_name"],
            preferred_call_time=row["preferred_call_time"],
            collection_state=row["collection_state"] or "idle",
            callback_topic=row["callback_topic"],
        )
