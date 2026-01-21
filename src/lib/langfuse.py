"""
Langfuse observability wrapper for tracking LLM interactions.
Provides a clean interface for creating traces and observations.
"""

import os
from contextlib import contextmanager
from typing import Any

from dotenv import load_dotenv
from langfuse import Langfuse
from loguru import logger

load_dotenv()


class LangfuseObserver:
    """
    Wrapper class for Langfuse observability.
    Handles trace and span creation for RAG pipeline monitoring.
    """

    def __init__(self):
        """Initialize Langfuse client from environment variables."""
        self._client = None

        try:
            self._client = Langfuse(
                secret_key=os.environ["LANGFUSE_SECRET_KEY"],
                public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
                host=os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"),
            )
            logger.info("Langfuse observability enabled")
        except Exception as e:
            logger.error(f"Failed to initialize Langfuse: {e}")

    @property
    def enabled(self) -> bool:
        """Check if Langfuse is enabled and configured."""
        return self._client is not None

    def get_prompt(
        self,
        chunks: list[str],
        conversation_history_str: str | None = None,
    ) -> str | None:
        if not self._client:
            return None
        prompt = self._client.get_prompt("macular-society-system-prompt")
        return prompt.compile(
            rag_context="\n".join(chunks),
            conversation_history=conversation_history_str or "",
        )

    def create_trace(
        self,
        name: str,
        session_id: str | None = None,
        user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ):
        """
        Create a new trace for tracking a complete interaction.

        Args:
            name: Name of the trace (e.g., "rag_query")
            session_id: Optional session identifier for grouping traces
            user_id: Optional user identifier
            metadata: Additional metadata to attach to the trace
            tags: Optional tags for filtering traces

        Returns:
            Langfuse trace object or None if disabled
        """
        if not self.enabled or not self._client:
            return None

        try:
            return self._client.trace(
                name=name,
                session_id=session_id,
                user_id=user_id,
                metadata=metadata or {},
                tags=tags or [],
            )
        except Exception as e:
            logger.warning(f"Failed to create Langfuse trace: {e}")
            return None

    def log_retrieval(
        self,
        trace,
        query: str,
        chunks: list[str],
        scores: list[float] | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """
        Log a retrieval step as a span.

        Args:
            trace: Parent trace object
            query: The search query
            chunks: Retrieved text chunks
            scores: Optional similarity scores for each chunk
            metadata: Additional metadata
        """
        if not self.enabled or trace is None:
            return None

        try:
            return trace.span(
                name="retrieval",
                input={"query": query},
                output={
                    "chunks": chunks,
                    "chunk_count": len(chunks),
                    "scores": scores,
                },
                metadata=metadata or {},
            )
        except Exception as e:
            logger.warning(f"Failed to log retrieval span: {e}")
            return None

    def log_generation(
        self,
        trace,
        model: str,
        prompt: str | list[dict],
        response: str,
        usage: dict[str, int] | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """
        Log an LLM generation as a generation event.

        Args:
            trace: Parent trace object
            model: Model identifier
            prompt: The prompt or messages sent to the LLM
            response: The generated response
            usage: Token usage stats (prompt_tokens, completion_tokens, total_tokens)
            metadata: Additional metadata
        """
        if not self.enabled or trace is None:
            return None

        try:
            return trace.generation(
                name="llm_generation",
                model=model,
                input=prompt,
                output=response,
                usage=usage,
                metadata=metadata or {},
            )
        except Exception as e:
            logger.warning(f"Failed to log generation: {e}")
            return None

    def log_event(
        self,
        trace,
        name: str,
        input_data: dict[str, Any] | None = None,
        output_data: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """
        Log a generic event/observation.

        Args:
            trace: Parent trace object
            name: Event name
            input_data: Input data for the event
            output_data: Output data for the event
            metadata: Additional metadata
        """
        if not self.enabled or trace is None:
            return None

        try:
            return trace.event(
                name=name,
                input=input_data,
                output=output_data,
                metadata=metadata or {},
            )
        except Exception as e:
            logger.warning(f"Failed to log event: {e}")
            return None

    def score_trace(
        self,
        trace,
        name: str,
        value: float,
        comment: str | None = None,
    ):
        """
        Add a score to a trace for evaluation.

        Args:
            trace: The trace to score
            name: Score name (e.g., "relevance", "quality")
            value: Numeric score value
            comment: Optional comment explaining the score
        """
        if not self.enabled or trace is None:
            return None

        try:
            return trace.score(
                name=name,
                value=value,
                comment=comment,
            )
        except Exception as e:
            logger.warning(f"Failed to add score: {e}")
            return None

    @contextmanager
    def trace_context(
        self,
        name: str,
        session_id: str | None = None,
        user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ):
        """
        Context manager for creating a trace with automatic flush on exit.

        Usage:
            with observer.trace_context("rag_query", session_id="123") as trace:
                observer.log_retrieval(trace, query, chunks)
                observer.log_generation(trace, model, prompt, response)
        """
        trace = self.create_trace(
            name=name,
            session_id=session_id,
            user_id=user_id,
            metadata=metadata,
            tags=tags,
        )
        try:
            yield trace
        finally:
            self.flush()

    def flush(self):
        """Flush any pending events to Langfuse."""
        if self._client:
            try:
                self._client.flush()
            except Exception as e:
                logger.warning(f"Failed to flush Langfuse events: {e}")

    def shutdown(self):
        """Gracefully shutdown the Langfuse client."""
        if self._client:
            try:
                self._client.shutdown()
            except Exception as e:
                logger.warning(f"Failed to shutdown Langfuse: {e}")


# Global singleton instance
_observer: LangfuseObserver | None = None


def get_langfuse_observer() -> LangfuseObserver:
    """Get or create the global Langfuse observer instance."""
    global _observer
    if _observer is None:
        _observer = LangfuseObserver()
    return _observer
