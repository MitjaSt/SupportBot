"""
Shared LLM and RAG functionality.
Used by step4_llm.py and test_batch_queries.py.
"""

import os
import threading
import time
from datetime import datetime

import requests
import yaml
from dotenv import load_dotenv
from loguru import logger
from sentence_transformers import SentenceTransformer

from src.lib._shared import EMBED_MODEL, QDRANT_COLLECTION_NAME, SCORE_THRESHOLD, TOP_K
from src.lib.conversations import (
    CallbackFlowManager,
    CollectionState,
    ConversationStateManager,
    format_conversation_history,
    inject_collection_instructions,
)
from src.lib.langfuse import get_langfuse_observer
from src.lib.mcp import ToolDispatcher, ToolRegistry
from src.lib.mcp.tools import support_email

# Initialize global tool registry and register tools
registry = ToolRegistry()
registry.register(
    name="send_support_email", schema=support_email.schema(), handler=support_email.handler
)
dispatcher = ToolDispatcher(registry)

load_dotenv()

get_langfuse_observer()

# Configuration from environment
OLLAMA_URL = os.environ["OLLAMA_URL"]
OLLAMA_MODEL = os.environ["OLLAMA_MODEL"]
OLLAMA_TIMEOUT = int(os.environ["OLLAMA_TIMEOUT"])
CACHE_DIR_PROMPTS = os.environ["CACHE_DIR_PROMPTS"]

# Thread-local storage for embedding model (prevents threading issues)

_thread_local = threading.local()


def get_embed_model():
    """Get or initialize the embedding model (thread-local singleton pattern)."""
    if not hasattr(_thread_local, "embed_model"):
        _thread_local.embed_model = SentenceTransformer(EMBED_MODEL)
    return _thread_local.embed_model


def embed_query(text: str):
    """Embed a text query using the sentence transformer model."""
    model = get_embed_model()
    return model.encode([text])[0]


def retrieve_chunks(
    query: str, qdrant_client, top_k: int = TOP_K, score_threshold: float = SCORE_THRESHOLD
) -> list[str]:
    """
    Retrieve relevant chunks from Qdrant for a given query.

    Args:
        query: The search query
        qdrant_client: QdrantClient instance
        top_k: Number of results to return
        score_threshold: Minimum similarity score

    Returns:
        List of text chunks
    """
    query_vec = embed_query(query)
    result = qdrant_client.query_points(
        collection_name=QDRANT_COLLECTION_NAME,
        query=query_vec.tolist(),
        limit=top_k,
        score_threshold=score_threshold,
    )
    return [
        hit.payload["text"] for hit in result.points if hit.payload and hit.score >= score_threshold
    ]


def generate_answer(
    query: str,
    chunks: list[str],
    conversation_history_str: str | None = None,
    collection_instructions_str: str | None = None,
) -> tuple[str, str]:
    """
    Generate answer using Ollama API.

    Args:
        query: User's question
        chunks: Retrieved context chunks
        conversation_history_str: Formatted conversation history
        collection_instructions_str: Collection flow instructions

    Returns:
        Tuple of (response_text, full_prompt)
    """
    observer = get_langfuse_observer()
    tools = registry.get_schemas()

    # Get compiled system prompt from Langfuse (includes RAG context and conversation history)
    system_prompt = observer.get_prompt(
        chunks=chunks,
        conversation_history_str=conversation_history_str,
    )

    if not system_prompt:
        raise RuntimeError("Failed to fetch prompt from Langfuse")

    # Append collection instructions if in a collection flow
    if collection_instructions_str:
        system_prompt = f"{system_prompt}\n\n{collection_instructions_str}"

    # Build messages - single system message with all context
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query},
    ]

    data = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": messages,
        "tools": tools,
    }

    response = requests.post(f"{OLLAMA_URL}/api/chat", json=data, timeout=OLLAMA_TIMEOUT)
    response.raise_for_status()
    response_json = response.json()

    logger.debug(f"OLLAMA response JSON: {response_json}")

    message = response_json.get("message", {})
    response_text = message.get("content", "")
    tool_calls = message.get("tool_calls", [])

    # Handle tool calls if present
    if tool_calls:
        logger.debug(f"Tool calls detected: {tool_calls}")

        # Extract tool calls in the format expected by dispatcher
        formatted_tool_calls = []
        for tool_call in tool_calls:
            if "function" in tool_call:
                tool_name = tool_call["function"]["name"]
                tool_args = tool_call["function"].get("arguments", {})
                formatted_tool_calls.append({"name": tool_name, "arguments": tool_args})

        # Check if this is a legitimate support request (has phone number)
        support_tool_calls = [
            tc for tc in formatted_tool_calls
            if tc["name"] == "send_support_email" and tc["arguments"].get("phone_number")
        ]

        if support_tool_calls:
            # Legitimate support request - dispatch and notify user
            dispatcher.dispatch(support_tool_calls)
            if not response_text:
                response_text = "I've notified our support team to contact you."
        elif not response_text:
            # LLM put the answer in tool call instead of content - extract it
            # This happens when model is confused about when to use tools
            for tc in formatted_tool_calls:
                if tc["name"] == "send_support_email":
                    summary = tc["arguments"].get("summary", "")
                    if summary:
                        logger.warning("Extracting answer from erroneous tool call summary")
                        response_text = summary
                        break

    return (response_text, system_prompt)


def sanitize_filename(text: str, max_length: int = 50) -> str:
    import re

    # Replace whitespace with underscores
    text = re.sub(r"\s+", "_", text)
    # Remove invalid filename characters
    text = re.sub(r'[<>:"/\\|?*]', "", text)
    # Limit length
    text = text[:max_length]
    # Remove trailing underscores or dots
    text = text.rstrip("_.")
    return text.lower()


def estimate_tokens(text: str) -> int:
    """
    Estimate token count for a text string.
    Uses word count * 1.3 as approximation (typical for English text with LLMs).
    """
    words = len(text.split())
    return int(words * 1.3)


def log_prompt_response(
    query: str, prompt: str, response: str, chunks: list[str], start_time: float, end_time: float
) -> str:
    """
    Log prompt and response to cache/prompts directory as YAML.

    Returns:
        Path to saved log file
    """
    os.makedirs(CACHE_DIR_PROMPTS, exist_ok=True)

    # Create filename from timestamp and sanitized query
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized_query = sanitize_filename(query)
    filename = f"{CACHE_DIR_PROMPTS}/{timestamp}_{sanitized_query}.yaml"

    # Estimate token counts
    prompt_tokens = estimate_tokens(prompt)
    query_tokens = estimate_tokens(query)
    response_tokens = estimate_tokens(response)

    log_data = {
        "start_time": datetime.fromtimestamp(start_time).isoformat(),
        "end_time": datetime.fromtimestamp(end_time).isoformat(),
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "chunks": chunks,
        "chunks_length": len(chunks),
        "query": query,
        "response": response,
        "elapsed_seconds": round(end_time - start_time, 2),
        "tokens": {
            "prompt_estimate": prompt_tokens,
            "query_estimate": query_tokens,
            "response_estimate": response_tokens,
            "total_estimate": prompt_tokens + query_tokens + response_tokens,
        },
    }

    with open(filename, "w", encoding="utf-8") as f:
        yaml.dump(log_data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return filename


def process_query(
    query: str,
    qdrant_client,
    session_id: str | None = None,
    state_manager: ConversationStateManager | None = None,
    verbose: bool = True,
) -> dict:
    """
    Process a complete RAG query with optional conversation state management.

    Args:
        query: User's question
        qdrant_client: QdrantClient instance
        session_id: Optional session identifier for conversation tracking
        state_manager: Optional ConversationStateManager for multi-turn conversations
        verbose: Whether to log output

    Returns:
        Dict with query results
    """
    start_time = time.time()

    # Initialize Langfuse observer for tracing
    observer = get_langfuse_observer()
    trace = observer.create_trace(
        name="rag_query",
        session_id=session_id,
        metadata={"query": query},
        tags=["rag", "macular-society"],
    )

    # Initialize conversation components if session provided
    session = None
    callback_flow = None
    conversation_history_str = None
    collection_instructions_str = None

    if session_id and state_manager:
        # Get or create session
        session = state_manager.get_session(session_id)
        if not session:
            session = state_manager.create_session(session_id)

        # Add user message to history
        state_manager.add_message(session_id, "user", query)

        # Get conversation history
        messages = state_manager.get_messages(session_id)
        conversation_history_str = format_conversation_history(messages)

        # Get collection instructions if in a flow
        if session.collection_state != CollectionState.IDLE.value:
            collection_instructions_str = inject_collection_instructions(session.collection_state)

        # Initialize callback flow manager
        callback_flow = CallbackFlowManager(state_manager)

    # Retrieve chunks
    chunks = retrieve_chunks(query, qdrant_client)

    # Log retrieval to Langfuse
    observer.log_retrieval(
        trace,
        query=query,
        chunks=chunks,
        metadata={"top_k": TOP_K, "score_threshold": SCORE_THRESHOLD},
    )

    if not chunks:
        if verbose:
            logger.debug("No relevant chunks found in Qdrant.")

        return {
            "query": query,
            "answer": "No relevant chunks found in Qdrant.",
            "chunks": [],
            "elapsed_seconds": round(time.time() - start_time, 2),
            "status": "no_chunks",
        }

    # Check if we should offer callback (proactive detection)
    if (
        callback_flow
        and session
        and state_manager
        and session_id
        and callback_flow.should_offer_callback(query, chunks, session)
    ):
        state_manager.update_collection_state(session_id, CollectionState.OFFERING)
        session = state_manager.get_session(session_id)
        if session:
            collection_instructions_str = inject_collection_instructions(session.collection_state)
        logger.debug(f"Callback offer triggered for session {session_id}")

    # Generate answer
    try:
        response_text, prompt = generate_answer(
            query, chunks, conversation_history_str, collection_instructions_str
        )
        status = "success"

        # Log generation to Langfuse
        observer.log_generation(
            trace,
            model=OLLAMA_MODEL,
            prompt=prompt,
            response=response_text,
            metadata={
                "has_conversation_history": conversation_history_str is not None,
                "has_collection_instructions": collection_instructions_str is not None,
            },
        )
    except Exception as e:
        response_text = f"Error: {str(e)}"
        prompt = ""
        status = "error"

        # Log error event to Langfuse
        observer.log_event(
            trace,
            name="generation_error",
            input_data={"query": query},
            output_data={"error": str(e)},
        )

    # Process callback flow if in collection state
    if (
        callback_flow
        and session
        and state_manager
        and session_id
        and session.collection_state != CollectionState.IDLE.value
    ):
        result = callback_flow.process_user_response(session, query)
        callback_flow.advance_state(session, result.get("extracted_data", {}), result["action"])

        # Refresh session after state change
        session = state_manager.get_session(session_id)

        # Append collection prompt if still in flow
        if (
            session
            and session.collection_state
            not in [CollectionState.IDLE.value, CollectionState.COMPLETE.value]
        ):
            next_prompt = callback_flow.get_next_collection_prompt(session)
            if next_prompt:
                response_text = f"{response_text} {next_prompt}" if response_text else next_prompt

    end_time = time.time()

    # Add assistant response to history
    if session_id and state_manager:
        state_manager.add_message(session_id, "assistant", response_text)

    # Log the interaction
    if status == "success":
        log_prompt_response(query, prompt, response_text, chunks, start_time, end_time)

    if verbose:
        logger.info("\n Answer:")
        logger.info(response_text)
        logger.info(f"\n Response time: {end_time - start_time:.2f}s")

    # Flush Langfuse events
    observer.flush()

    return {
        "query": query,
        "answer": response_text,
        "chunks": chunks,
        "elapsed_seconds": round(end_time - start_time, 2),
        "status": status,
        "model": OLLAMA_MODEL,
        "embedding_model": EMBED_MODEL,
        "session_id": session_id,
        "collection_state": session.collection_state if session else None,
    }
