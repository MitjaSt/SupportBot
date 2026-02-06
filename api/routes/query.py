"""
Query endpoint for RAG queries.
"""

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from api.models.query import QueryRequest, QueryResponse
from src.lib._shared import get_qdrant_client
from src.lib.conversations import ConversationStateManager
from src.lib.llm import process_query
from src.lib.redis import get_redis_client

router = APIRouter(prefix="/query", tags=["query"])


def get_qdrant():
    """Dependency to get Qdrant client."""
    try:
        client = get_qdrant_client()
        return client
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant: {e}")
        raise HTTPException(status_code=503, detail="Vector database unavailable") from None


def get_state_manager():
    """Dependency to get conversation state manager (optional)."""
    try:
        redis_client = get_redis_client()
        if redis_client:
            return ConversationStateManager(redis_client)
        return None
    except Exception as e:
        logger.warning(f"Redis not available, conversation state disabled: {e}")
        return None


@router.post("", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    qdrant=Depends(get_qdrant),  # noqa: B008
    state_manager: ConversationStateManager | None = Depends(get_state_manager),  # noqa: B008
) -> QueryResponse:
    """
    Process a RAG query about macular degeneration.

    This endpoint retrieves relevant context from the vector database
    and generates an answer using the configured LLM backend.

    - **query**: The user's question
    - **session_id**: Optional session ID for multi-turn conversations
    """
    try:
        result = process_query(
            query=request.query,
            qdrant_client=qdrant,
            session_id=request.session_id,
            state_manager=state_manager,
            verbose=False,
        )

        return QueryResponse(
            query=result.get("query", request.query),
            answer=result.get("answer", ""),
            chunks=result.get("chunks", []),
            elapsed_seconds=result.get("elapsed_seconds", 0.0),
            status=result.get("status", "error"),
            model=result.get("model"),
            backend=result.get("backend"),
            embedding_model=result.get("embedding_model"),
            session_id=result.get("session_id"),
            collection_state=result.get("collection_state"),
        )
    except Exception as e:
        logger.error(f"Query processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from None
