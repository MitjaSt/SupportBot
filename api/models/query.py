"""
Pydantic models for RAG query request and response.
"""

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request model for RAG queries."""

    query: str = Field(
        ...,
        description="The user's question about macular degeneration",
        min_length=1,
        max_length=2000,
        examples=["What is dry macular degeneration?"],
    )
    session_id: str | None = Field(
        default=None,
        description="Optional session ID for conversation tracking",
        examples=["user-123-session-456"],
    )


class QueryResponse(BaseModel):
    """Response model for RAG queries."""

    query: str = Field(description="The original query")
    answer: str = Field(description="The generated answer")
    chunks: list[str] = Field(
        default_factory=list,
        description="Retrieved context chunks used to generate the answer",
    )
    elapsed_seconds: float = Field(description="Time taken to process the query")
    status: str = Field(
        description="Query status: success, error, or no_chunks",
        examples=["success"],
    )
    model: str | None = Field(default=None, description="LLM model used for generation")
    backend: str | None = Field(
        default=None,
        description="Backend used: ollama or openai",
    )
    embedding_model: str | None = Field(default=None, description="Embedding model used")
    session_id: str | None = Field(default=None, description="Session ID if provided")
    collection_state: str | None = Field(
        default=None,
        description="Current collection flow state if in a callback flow",
    )


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str = Field(default="healthy", description="Service health status")
    qdrant_connected: bool = Field(description="Whether Qdrant is reachable")
    ollama_configured: bool = Field(description="Whether Ollama backend is configured")
    openai_configured: bool = Field(description="Whether OpenAI backend is configured")
