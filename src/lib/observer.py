"""
Unified observability interface.
Selects between Langfuse and LangWatch based on configuration.
"""

from typing import Any, Protocol

from loguru import logger

from src.lib.env import env


class ObserverProtocol(Protocol):
    """Protocol defining the observer interface."""

    @property
    def enabled(self) -> bool:
        """Check if the observer is enabled."""
        ...

    def get_prompt(
        self,
        chunks: list[str],
        conversation_history_str: str | None = None,
    ) -> str | None:
        """Fetch and compile a prompt."""
        ...

    def create_trace(
        self,
        name: str,
        session_id: str | None = None,
        user_id: str | None = None,
        input: str | dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ) -> Any | None:
        """Create a new trace."""
        ...

    def log_retrieval(
        self,
        trace: Any | None,
        query: str,
        chunks: list[str],
        scores: list[float] | None = None,
        model: str | None = None,
        duration_ms: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any | None:
        """Log a retrieval step."""
        ...

    def log_generation(
        self,
        trace: Any | None,
        model: str,
        prompt: str | list[dict],
        response: str,
        usage: dict[str, int] | None = None,
        duration_ms: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any | None:
        """Log an LLM generation."""
        ...

    def log_event(
        self,
        trace: Any | None,
        name: str,
        input_data: dict[str, Any] | None = None,
        output_data: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any | None:
        """Log a generic event."""
        ...

    def update_trace(
        self,
        trace: Any | None,
        output: str | dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Update a trace with output."""
        ...

    def flush(self) -> None:
        """Flush pending events."""
        ...

    def shutdown(self) -> None:
        """Shutdown the observer."""
        ...


class NullObserver:
    """No-op observer when no observability platform is enabled."""

    @property
    def enabled(self) -> bool:
        return False

    def get_prompt(
        self,
        chunks: list[str],
        conversation_history_str: str | None = None,
    ) -> str | None:
        return None

    def create_trace(
        self,
        name: str,
        session_id: str | None = None,
        user_id: str | None = None,
        input: str | dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ) -> Any | None:
        return None

    def log_retrieval(
        self,
        trace: Any | None,
        query: str,
        chunks: list[str],
        scores: list[float] | None = None,
        model: str | None = None,
        duration_ms: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any | None:
        return None

    def log_generation(
        self,
        trace: Any | None,
        model: str,
        prompt: str | list[dict],
        response: str,
        usage: dict[str, int] | None = None,
        duration_ms: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any | None:
        return None

    def log_event(
        self,
        trace: Any | None,
        name: str,
        input_data: dict[str, Any] | None = None,
        output_data: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any | None:
        return None

    def update_trace(
        self,
        trace: Any | None,
        output: str | dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        pass

    def flush(self) -> None:
        pass

    def shutdown(self) -> None:
        pass


# Global singleton instance
_active_observer: ObserverProtocol | None = None


def get_active_observer() -> ObserverProtocol:
    """
    Get the active observability observer based on configuration.

    Priority:
    1. If LANGFUSE_ENABLE=true, use Langfuse
    2. If LANGWATCH_ENABLE=true, use LangWatch
    3. Otherwise, use NullObserver (no-op)

    Returns:
        Active observer instance implementing ObserverProtocol
    """
    global _active_observer

    if _active_observer is not None:
        return _active_observer

    # Check Langfuse first
    if env.langfuse.enabled:
        from src.lib.langfuse import get_langfuse_observer

        _active_observer = get_langfuse_observer()
        logger.info("Using Langfuse as active observer")
        return _active_observer

    # Check LangWatch second
    if env.langwatch.enabled:
        from src.lib.langwatch_observer import get_langwatch_observer

        _active_observer = get_langwatch_observer()
        logger.info("Using LangWatch as active observer")
        return _active_observer

    # Fall back to NullObserver
    logger.info("No observability platform enabled, using NullObserver")
    _active_observer = NullObserver()
    return _active_observer


def reset_observer() -> None:
    """Reset the active observer. Useful for testing."""
    global _active_observer
    _active_observer = None
