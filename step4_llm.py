import sys

from loguru import logger
from qdrant_client import QdrantClient

from lib.llm import OLLAMA_MODEL, OLLAMA_URL, process_query

# --- QDRANT CLIENT ---
qdrant = QdrantClient(host="localhost", port=6333)


# --- MAIN LOOP ---
if __name__ == "__main__":
    logger.info(f"Ollama RAG assistant ready. Using {OLLAMA_MODEL} at {OLLAMA_URL}")
    logger.info("Type 'exit' to quit.")

    # Single query mode (from command line argument)
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        logger.info(f"Query: {query}")
        process_query(query, qdrant)
    # Interactive mode
    else:
        while True:
            query = input("\nYour question: ")
            if query.lower() == "exit":
                break
            process_query(query, qdrant)
