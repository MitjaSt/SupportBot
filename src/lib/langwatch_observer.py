"""
LangWatch observability wrapper for tracking LLM interactions.
Provides a clean interface for creating traces and observations.
"""

import warnings
from contextlib import contextmanager, suppress
from typing import Any

from loguru import logger

from src.lib.env import env

# Lazy import langwatch to handle version differences
_langwatch: Any = None


def _get_langwatch() -> Any:
    """Lazy load langwatch module."""
    global _langwatch
    if _langwatch is None:
        import langwatch

        _langwatch = langwatch
    return _langwatch


class LangWatchObserver:
    """
    Wrapper class for LangWatch observability.
    Handles trace and span creation for RAG pipeline monitoring.
    """

    def __init__(self):
        """Initialize LangWatch client from environment variables."""
        self._prompt_cache: dict[str, Any] = {}
        self._enabled = env.langwatch.enabled
        self._current_trace: Any | None = None

        if not self._enabled:
            logger.info("LangWatch observability disabled")
            return

        try:
            lw = _get_langwatch()
            # Suppress warning about missing local prompts.json (we use remote prompts)
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", message="No prompts.json found")
                lw.setup(api_key=env.langwatch.api_key)  # type: ignore[attr-defined]
            logger.info("LangWatch observability enabled")
        except Exception as e:
            logger.error(f"Failed to initialize LangWatch: {e}")
            self._enabled = False

    @property
    def enabled(self) -> bool:
        """Check if LangWatch is enabled."""
        return self._enabled

    def get_prompt(
        self,
        chunks: list[str],
        conversation_history_str: str | None = None,
        handle: str | None = None,
    ) -> str | None:
        """
        Fetch and compile a prompt from LangWatch.

        Args:
            chunks: Retrieved RAG context chunks
            conversation_history_str: Optional conversation history
            handle: Prompt handle (defaults to env config)

        Returns:
            Compiled prompt string or None if disabled/failed
        """
        if not self._enabled:
            return None

        prompt_handle = handle or env.langwatch.prompt_system
        lw = _get_langwatch()

        try:
            # Cache the prompt template
            if prompt_handle not in self._prompt_cache:
                self._prompt_cache[prompt_handle] = lw.prompts.get(prompt_handle)  # type: ignore[attr-defined]
                logger.debug(f"Fetched and cached '{prompt_handle}' prompt from LangWatch")

            prompt = self._prompt_cache[prompt_handle]

            # Compile the prompt with variables
            compiled = prompt.compile(
                rag_context="\n".join(chunks),
                conversation_history=conversation_history_str or "",
            )

            # CompiledPrompt needs to be converted to string
            # Try common patterns for extracting text from compiled prompts
            if hasattr(compiled, "text"):
                return compiled.text
            if hasattr(compiled, "content"):
                return compiled.content
            if hasattr(compiled, "messages"):
                # Chat-style prompt - extract system message content
                for msg in compiled.messages:
                    if isinstance(msg, dict) and msg.get("role") == "system":
                        return msg.get("content", "")
                # If no system message, join all contents
                return "\n".join(
                    msg.get("content", "") if isinstance(msg, dict) else str(msg)
                    for msg in compiled.messages
                )
            # Fallback to string conversion
            return str(compiled)
        except Exception as e:
            logger.warning(f"Failed to get prompt from LangWatch: {e}")
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
            LangWatch trace object or None if disabled
        """
        if not self._enabled:
            return None

        lw = _get_langwatch()

        try:
            trace_metadata = metadata.copy() if metadata else {}
            if session_id:
                trace_metadata["session_id"] = session_id
            if user_id:
                trace_metadata["user_id"] = user_id
            if tags:
                trace_metadata["tags"] = tags

            # Use context manager to create trace
            self._current_trace = lw.trace(
                name=name,
                metadata=trace_metadata,
                input=input,
            ).__enter__()

            return self._current_trace
        except Exception as e:
            logger.warning(f"Failed to create LangWatch trace: {e}")
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
        if not self._enabled or trace is None:
            return None

        lw = _get_langwatch()

        try:
            combined_metadata = metadata.copy() if metadata else {}
            if model:
                combined_metadata["embedding_model"] = model
            if duration_ms is not None:
                combined_metadata["duration_ms"] = duration_ms

            # Create span - API varies by version
            span_kwargs: dict[str, Any] = {
                "name": "retrieval",
                "input": {"query": query},
            }

            # Try to add type if supported
            with suppress(Exception):
                span_kwargs["type"] = "rag"

            with lw.span(**span_kwargs) as span:
                with suppress(Exception):
                    span.update(
                        output={
                            "chunks": chunks[:3],  # Limit for readability
                            "chunk_count": len(chunks),
                            "scores": scores,
                        },
                    )
                return span
        except Exception as e:
            logger.warning(f"Failed to log retrieval span: {e}")
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
        if not self._enabled or trace is None:
            return None

        lw = _get_langwatch()

        try:
            combined_metadata = metadata.copy() if metadata else {}
            if duration_ms is not None:
                combined_metadata["duration_ms"] = duration_ms
            if usage:
                combined_metadata["usage"] = usage

            span_kwargs: dict[str, Any] = {
                "name": "llm_generation",
                "input": prompt,
            }

            # Try to add type and model if supported
            with suppress(Exception):
                span_kwargs["type"] = "llm"
                span_kwargs["model"] = model

            with lw.span(**span_kwargs) as span:
                with suppress(Exception):
                    span.update(output=response)
                return span
        except Exception as e:
            logger.warning(f"Failed to log generation: {e}")
            return None

    def log_event(
        self,
        trace: Any | None,
        name: str,
        input_data: dict[str, Any] | None = None,
        output_data: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any | None:
        """
        Log a generic event/observation.

        Args:
            trace: Parent trace object
            name: Event name
            input_data: Input data for the event
            output_data: Output data for the event
            metadata: Additional metadata
        """
        if not self._enabled or trace is None:
            return None

        lw = _get_langwatch()

        try:
            with lw.span(name=name, input=input_data) as span:
                if output_data:
                    with suppress(Exception):
                        span.update(output=output_data)
                return span
        except Exception as e:
            logger.warning(f"Failed to log event: {e}")
            return None

    def update_trace(
        self,
        trace: Any | None,
        output: str | dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """
        Update a trace with output and/or additional metadata.

        Args:
            trace: The trace to update
            output: The output/response to add to the trace
            metadata: Additional metadata to merge
        """
        if not self._enabled or trace is None:
            return None

        try:
            trace.update(output=output, metadata=metadata)
        except Exception as e:
            logger.warning(f"Failed to update trace: {e}")

    def add_evaluation(
        self,
        trace: Any | None,
        name: str,
        passed: bool,
        score: float | None = None,
        details: str | None = None,
    ):
        """
        Add an evaluation result to a trace.

        Args:
            trace: The trace to add evaluation to
            name: Evaluation name (e.g., "relevance", "quality")
            passed: Whether the evaluation passed
            score: Optional numeric score
            details: Optional details/reasoning
        """
        if not self._enabled or trace is None:
            return None

        try:
            trace.add_evaluation(
                name=name,
                passed=passed,
                score=score,
                details=details,
            )
        except Exception as e:
            logger.warning(f"Failed to add evaluation: {e}")

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
        Context manager for creating a trace with automatic cleanup.

        Usage:
            with observer.trace_context("rag_query", session_id="123") as trace:
                observer.log_retrieval(trace, query, chunks)
                observer.log_generation(trace, model, prompt, response)
        """
        if not self._enabled:
            yield None
            return

        lw = _get_langwatch()

        trace_metadata = metadata.copy() if metadata else {}
        if session_id:
            trace_metadata["session_id"] = session_id
        if user_id:
            trace_metadata["user_id"] = user_id
        if tags:
            trace_metadata["tags"] = tags

        try:
            with lw.trace(name=name, metadata=trace_metadata) as trace:
                yield trace
        except Exception as e:
            logger.warning(f"Error in trace context: {e}")
            yield None

    def flush(self):
        """Flush any pending events to LangWatch."""
        # LangWatch SDK handles flushing automatically
        pass

    def shutdown(self):
        """Gracefully shutdown the LangWatch client."""
        # LangWatch SDK handles cleanup automatically
        pass


# Global singleton instance
_observer: LangWatchObserver | None = None


def get_langwatch_observer() -> LangWatchObserver:
    """Get or create the global LangWatch observer instance."""
    global _observer
    if _observer is None:
        _observer = LangWatchObserver()
    return _observer
