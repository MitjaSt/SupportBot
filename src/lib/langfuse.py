"""
Langfuse observability wrapper for tracking LLM interactions.
Provides a clean interface for creating traces and observations.
"""

import os
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

from dotenv import load_dotenv
from langfuse import Langfuse
from langfuse.client import StatefulTraceClient
from langfuse.model import ModelUsage
from loguru import logger

load_dotenv()


class LangfuseObserver:
    """
    Wrapper class for Langfuse observability.
    Handles trace and span creation for RAG pipeline monitoring.
    """

    def __init__(self):
        """Initialize Langfuse client from environment variables."""
        self._prompt_template = None
        try:
            self._client = Langfuse(
                secret_key=os.environ["LANGFUSE_SECRET_KEY"],
                public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
                host=os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"),
            )
            logger.info("Langfuse observability enabled")
        except Exception as e:
            logger.error(f"Failed to initialize Langfuse: {e}")

    def get_prompt(
        self,
        chunks: list[str],
        conversation_history_str: str | None = None,
    ) -> str | None:
        if self._prompt_template is None:
            self._prompt_template = self._client.get_prompt("macular-society-system-prompt")
            logger.debug("Fetched and cached prompt template from Langfuse")
        return self._prompt_template.compile(
            rag_context="\n".join(chunks),
            conversation_history=conversation_history_str or "",
        )

    def create_trace(
        self,
        name: str,
        session_id: str | None = None,
        user_id: str | None = None,
        input: str | dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ) -> StatefulTraceClient | None:
        """
        Create a new trace for tracking a complete interaction.

        Args:
            name: Name of the trace (e.g., "rag_query")
            session_id: Optional session identifier for grouping traces
            user_id: Optional user identifier
            input: The input query or data for this trace
            metadata: Additional metadata to attach to the trace
            tags: Optional tags for filtering traces

        Returns:
            Langfuse trace object or None if disabled
        """
        try:
            return self._client.trace(
                name=name,
                session_id=session_id,
                user_id=user_id,
                input=input,
                metadata=metadata or {},
                tags=tags or [],
            )
        except Exception as e:
            logger.warning(f"Failed to create Langfuse trace: {e}")
            return None

    def log_retrieval(
        self,
        trace: StatefulTraceClient | None,
        query: str,
        chunks: list[str],
        scores: list[float] | None = None,
        model: str | None = None,
        duration_ms: float | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """
        Log a retrieval step as a span.

        Args:
            trace: Parent trace object
            query: The search query
            chunks: Retrieved text chunks
            scores: Optional similarity scores for each chunk
            model: The embedding model used for retrieval
            duration_ms: Duration of the retrieval in milliseconds
            metadata: Additional metadata
        """
        if trace is None:
            return None
        try:
            combined_metadata = metadata.copy() if metadata else {}
            if model:
                combined_metadata["embedding_model"] = model
            if duration_ms is not None:
                combined_metadata["duration_ms"] = duration_ms
            return trace.span(
                name="retrieval",
                input={"query": query},
                output={
                    "chunks": chunks,
                    "chunk_count": len(chunks),
                    "scores": scores,
                },
                metadata=combined_metadata,
            )
        except Exception as e:
            logger.warning(f"Failed to log retrieval span: {e}")
            return None

    def log_generation(
        self,
        trace: StatefulTraceClient | None,
        model: str,
        prompt: str | list[dict],
        response: str,
        usage: ModelUsage | None = None,
        duration_ms: float | None = None,
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
            duration_ms: Duration of the generation in milliseconds
            metadata: Additional metadata
        """
        if trace is None:
            return None
        try:
            combined_metadata = metadata.copy() if metadata else {}
            if duration_ms is not None:
                combined_metadata["duration_ms"] = duration_ms
            return trace.generation(
                name="llm_generation",
                model=model,
                input=prompt,
                output=response,
                usage=usage,
                metadata=combined_metadata,
            )
        except Exception as e:
            logger.warning(f"Failed to log generation: {e}")
            return None

    def log_event(
        self,
        trace: StatefulTraceClient | None,
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
        if trace is None:
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
        trace: StatefulTraceClient | None,
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
        if trace is None:
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

    def update_trace(
        self,
        trace: StatefulTraceClient | None,
        output: str | dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """
        Update a trace with output and/or additional metadata.
        Also sets the end time to calculate duration.

        Args:
            trace: The trace to update
            output: The output/response to add to the trace
            metadata: Additional metadata to merge
        """
        if trace is None:
            return None
        try:
            end_time = datetime.now(UTC)
            return trace.update(output=output, metadata=metadata, end_time=end_time)
        except Exception as e:
            logger.warning(f"Failed to update trace: {e}")
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
