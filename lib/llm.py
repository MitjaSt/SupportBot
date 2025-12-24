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
from sentence_transformers import SentenceTransformer

from shared import EMBED_MODEL, QDRANT_COLLECTION_NAME, SCORE_THRESHOLD, TOP_K

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

Use ONLY the context below to answer.
Do NOT attempt to provide any information outside the context. Do not guess.
"""

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


def retrieve_chunks(query: str, qdrant_client, top_k: int = TOP_K, score_threshold: float = SCORE_THRESHOLD) -> list[str]:
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
    context = "\n".join(chunks)
    prompt = f"""{SYSTEM_PROMPT.strip()}

RETRIEVED CONTEXT:
{context}

USER QUESTION:
{query}
"""

    data = {"model": OLLAMA_MODEL, "stream": False, "prompt": prompt}

    response = requests.post(f"{OLLAMA_URL}/api/generate", json=data, timeout=OLLAMA_TIMEOUT)
    response_text = response.json()["response"]

    return response_text, prompt


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


def log_prompt_response(query: str, prompt: str, response: str, chunks: list[str], start_time: float, end_time: float) -> str:
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
            print("No relevant chunks found in Qdrant.")
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
        print("\n💬 Answer:")
        print(response_text)
        print(f"\n⏱️  Response time: {end_time - start_time:.2f}s")

    return {
        "query": query,
        "answer": response_text,
        "chunks": chunks,
        "elapsed_seconds": round(end_time - start_time, 2),
        "status": status,
        "model": OLLAMA_MODEL,
        "embedding_model": EMBED_MODEL,
    }
