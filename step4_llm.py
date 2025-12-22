import json
import os
import re
import sys
import time
from datetime import datetime

import requests
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from shared import (
    EMBED_MODEL,
    QDRANT_COLLECTION_NAME,
    SCORE_THRESHOLD,
    TOP_K,
)

load_dotenv()

OLLAMA_URL = os.environ["OLLAMA_URL"]
OLLAMA_MODEL = os.environ["OLLAMA_MODEL"]
OLLAMA_TIMEOUT = int(os.environ["OLLAMA_TIMEOUT"])
CACHE_DIR_PROMPTS = os.environ["CACHE_DIR_PROMPTS"]

# --- EMBEDDING MODEL ---
embed_model = SentenceTransformer(EMBED_MODEL)

# --- QDRANT CLIENT ---
qdrant = QdrantClient(host="localhost", port=6333)


# --- FUNCTIONS ---
def embed(text):
    return embed_model.encode([text])[0]


def retrieve_chunks(query, top_k=TOP_K, score_threshold=SCORE_THRESHOLD):
    query_vec = embed(query)
    result = qdrant.query_points(
        collection_name=QDRANT_COLLECTION_NAME,
        query=query_vec.tolist(),
        limit=top_k,
        score_threshold=score_threshold,
    )
    return [
        hit.payload["text"] for hit in result.points if hit.payload and hit.score >= score_threshold
    ]


def sanitize_filename(text, max_length=50):
    """Sanitize text for use in filename."""
    # Replace whitespace with underscores
    text = re.sub(r"\s+", "_", text)
    # Remove invalid filename characters
    text = re.sub(r'[<>:"/\\|?*]', "", text)
    # Limit length
    text = text[:max_length]
    # Remove trailing underscores or dots
    text = text.rstrip("_.")
    return text.lower()


def log_prompt_response(query, prompt, response, chunks, start_time, end_time):
    """Log prompt and response to cache/prompts directory as JSON."""
    os.makedirs(CACHE_DIR_PROMPTS, exist_ok=True)

    # Create filename from timestamp and sanitized query
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized_query = sanitize_filename(query)
    filename = f"{CACHE_DIR_PROMPTS}/{timestamp}_{sanitized_query}.json"

    log_data = {
        "start_time": datetime.fromtimestamp(start_time).isoformat(),
        "end_time": datetime.fromtimestamp(end_time).isoformat(),
        "elapsed_seconds": round(end_time - start_time, 2),
        "query": query,
        "prompt": prompt,
        "response": response,
        "chunks": chunks,
        "model": OLLAMA_MODEL,
    }

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)

    return filename


def generate_answer(query, chunks, start_time):
    """Generate answer using Ollama API."""
    context = "\n".join(chunks)
    prompt = f"""You are a question-answering assistant.
Keep your answers concise, as short as possible and to the point - you are answering on a phone.
When referring to the "caller" use "you".

Use ONLY the context below to answer.
Do NOT attempt to provide any information outside the context. Do not guess.
Give a single concise answer, no repetition, no rephrasing.

If the answer is not in the context or you are not sure, say:
"I do not have information about that. Can I help you with something else?"

Context:
{context}

Question:
{query}
"""

    data = {"model": OLLAMA_MODEL, "stream": False, "prompt": prompt}

    response = requests.post(f"{OLLAMA_URL}/api/generate", json=data, timeout=OLLAMA_TIMEOUT)
    response_text = response.json()["response"]
    print(response_text)
    print("\n")

    end_time = time.time()

    # Log prompt and response
    log_prompt_response(query, prompt, response_text, chunks, start_time, end_time)


# --- MAIN LOOP ---
if __name__ == "__main__":
    print(f"Ollama RAG assistant ready. Using {OLLAMA_MODEL} at {OLLAMA_URL}")
    print("Type 'exit' to quit.")

    try:
        query = sys.argv[1]

        print(f"Query: {query}")
        chunks = retrieve_chunks(query)

        print("\n💬 Answer:")
        start_time = time.time()
        generate_answer(query, chunks, start_time)

        elapsed_time = time.time() - start_time
        print(f"\n⏱️  Response time: {elapsed_time:.2f}s")

    except IndexError:
        while True:
            query = input("\nYour question: ")
            if query.lower() == "exit":
                break

            chunks = retrieve_chunks(query)
            if not chunks:
                print("No relevant chunks found in Qdrant.")
                continue

            print("\n💬 Answer:")
            start_time = time.time()
            generate_answer(query, chunks, start_time)

            elapsed_time = time.time() - start_time
            print(f"\n⏱️  Response time: {elapsed_time:.2f}s")
