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

from mcp import ToolDispatcher, ToolRegistry
from mcp.tools import support_email
from shared import EMBED_MODEL, QDRANT_COLLECTION_NAME, SCORE_THRESHOLD, TOP_K

# Initialize global tool registry and register tools
registry = ToolRegistry()
registry.register(
    name="send_support_email", schema=support_email.schema(), handler=support_email.handler
)
dispatcher = ToolDispatcher(registry)

load_dotenv()

# Configuration from environment
OLLAMA_URL = os.environ["OLLAMA_URL"]
OLLAMA_MODEL = os.environ["OLLAMA_MODEL"]
OLLAMA_TIMEOUT = int(os.environ["OLLAMA_TIMEOUT"])
CACHE_DIR_PROMPTS = os.environ["CACHE_DIR_PROMPTS"]

# System prompt for RAG
SYSTEM_PROMPT = """
INSTRUCTIONS:
- You are a question-answering assistant for Macular Society, speak like a human would over the phone. Be polite and friendly.
- Always reflect the user's intent and language before responding.
- Be honest about limits without sounding authoritative or defensive.
- Follow the user's lead, acknowledge emotions before solving problems, and never end the conversation without offering a next step or alternative.
- Keep your answers concise, as short as possible and to the point - you are answering on a phone.
- When referring to the "caller" use "you".
- Give a single concise answer, no repetition, no rephrasing.
- If the answer is not in the context or you are not sure, say: "I do not have information about that. Can I help you with something else?"

If the user agrees to being contacted by support, you MUST call the tool send_support_email.
Do not describe the action in text.

Use ONLY the context below to answer.
Do NOT attempt to provide any information outside the context. Do not guess.
""".strip()

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


def generate_answer(query: str, chunks: list[str]) -> tuple[str, str]:
    """
    Generate answer using Ollama API.

    Args:
        query: User's question
        chunks: Retrieved context chunks

    Returns:
        Tuple of (response_text, full_prompt)
    """

    rag_context = "\n".join(chunks)

    tools = registry.get_schemas()

    data = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": rag_context},
            {"role": "user", "content": query},
        ],
        "tools": tools,
    }

    response = requests.post(f"{OLLAMA_URL}/api/chat", json=data, timeout=OLLAMA_TIMEOUT)
    response.raise_for_status()
    response_json = response.json()

    logger.info(f"OLLAMA response JSON: {response_json}")  # Debugging line

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
                formatted_tool_calls.append(
                    {
                        "name": tool_call["function"]["name"],
                        "arguments": tool_call["function"].get("arguments", {}),
                    }
                )

        # Execute the tools
        if formatted_tool_calls:
            dispatcher.dispatch(formatted_tool_calls)

            # If there's no content but there are tool calls, provide a response
            if not response_text:
                response_text = "I've notified our support team to contact you."

    return (
        response_text,
        f"""
[SYSTEM]
{SYSTEM_PROMPT}

[RAG_CONTEXT]
{rag_context}

[USER QUESTION]
{query}
""",
    )


def sanitize_filename(text: str, max_length: int = 50) -> str:
    """
    Sanitize text for use in filename.

    Args:
        text: Text to sanitize
        max_length: Maximum length of output

    Returns:
        Sanitized filename-safe string
    """
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


def log_prompt_response(
    query: str, prompt: str, response: str, chunks: list[str], start_time: float, end_time: float
) -> str:
    """
    Log prompt and response to cache/prompts directory as YAML.

    Args:
        query: User's question
        prompt: Full prompt sent to LLM
        response: LLM's response
        chunks: Retrieved chunks
        start_time: Query start time (seconds since epoch)
        end_time: Query end time (seconds since epoch)

    Returns:
        Path to saved log file
    """
    os.makedirs(CACHE_DIR_PROMPTS, exist_ok=True)

    # Create filename from timestamp and sanitized query
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized_query = sanitize_filename(query)
    filename = f"{CACHE_DIR_PROMPTS}/{timestamp}_{sanitized_query}.yaml"

    log_data = {
        "start_time": datetime.fromtimestamp(start_time).isoformat(),
        "end_time": datetime.fromtimestamp(end_time).isoformat(),
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "chunks": chunks,
        "query": query,
        "response": response,
        "elapsed_seconds": round(end_time - start_time, 2),
    }

    with open(filename, "w", encoding="utf-8") as f:
        yaml.dump(log_data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return filename


def process_query(query: str, qdrant_client, verbose: bool = True) -> dict:
    """
    Process a complete RAG query: retrieve chunks, generate answer, and optionally log.

    Args:
        query: User's question
        qdrant_client: QdrantClient instance
        verbose: Whether to print output

    Returns:
        Dict with query results
    """
    start_time = time.time()

    # Retrieve chunks
    chunks = retrieve_chunks(query, qdrant_client)

    if not chunks:
        if verbose:
            logger.info("No relevant chunks found in Qdrant.")
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
    except Exception as e:
        response_text = f"Error: {str(e)}"
        prompt = ""
        status = "error"

    end_time = time.time()

    # Log the interaction
    if status == "success":
        log_prompt_response(query, prompt, response_text, chunks, start_time, end_time)

    if verbose:
        logger.info("\n💬 Answer:")
        logger.info(response_text)
        logger.info(f"\n⏱️  Response time: {end_time - start_time:.2f}s")

    return {
        "query": query,
        "answer": response_text,
        "chunks": chunks,
        "elapsed_seconds": round(end_time - start_time, 2),
        "status": status,
        "model": OLLAMA_MODEL,
        "embedding_model": EMBED_MODEL,
    }
