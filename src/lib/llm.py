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
) -> tuple[str, str]:
    """
    Generate answer using Ollama API.

    Args:
        query: User's question
        chunks: Retrieved context chunks

    Returns:
        Tuple of (response_text, full_prompt)
    """
    observer = get_langfuse_observer()
    tools = registry.get_schemas()

    # Get compiled system prompt from Langfuse (includes RAG context)
    system_prompt = observer.get_prompt(chunks=chunks)

    if not system_prompt:
        raise RuntimeError("Failed to fetch prompt from Langfuse")

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

        # Execute the tools
        if formatted_tool_calls:
            dispatcher.dispatch(formatted_tool_calls)

            # If there's no content but there are tool calls, provide a response
            if not response_text:
                response_text = "I've notified our support team to contact you."

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
    verbose: bool = True,
) -> dict:
    """
    Process a complete RAG query.

    Returns:
        Dict with query results
    """
    start_time = time.time()

    # Initialize Langfuse observer for tracing
    observer = get_langfuse_observer()
    trace = observer.create_trace(
        name="rag_query",
        metadata={"query": query},
        tags=["rag", "macular-society"],
    )

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

    # Generate answer
    try:
        response_text, prompt = generate_answer(query, chunks)
        status = "success"

        # Log generation to Langfuse
        observer.log_generation(
            trace,
            model=OLLAMA_MODEL,
            prompt=prompt,
            response=response_text,
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

    end_time = time.time()

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
    }
