import sys
import uuid

from loguru import logger
from qdrant_client import QdrantClient

from src.lib.conversations import ConversationStateManager
from src.lib.llm import OLLAMA_MODEL, OLLAMA_URL, process_query
from src.lib.redis import get_redis_client

# --- QDRANT CLIENT ---
qdrant = QdrantClient(host="localhost", port=6333)


# --- MAIN LOOP ---
if __name__ == "__main__":
    logger.info(f"Ollama RAG assistant ready. Using {OLLAMA_MODEL} at {OLLAMA_URL}")

    # Initialize Redis and conversation state manager
    try:
        redis_client = get_redis_client()
        state_manager = ConversationStateManager(redis_client)
        logger.info("Redis conversation history enabled")
    except Exception as e:
        logger.warning(f"Redis unavailable, conversation history disabled: {e}")
        state_manager = None

    # Generate session ID for this conversation
    session_id = str(uuid.uuid4())
    logger.info(f"Session ID: {session_id}")

    # Single query mode (from command line argument)
    query = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else ""
    if query:
        logger.info(f"Query: {query}")
        process_query(query, qdrant, session_id=session_id, state_manager=state_manager)
    else:
        # Interactive mode
        logger.info("Type 'exit' to quit or press Ctrl+C.")

        try:
            while True:
                query = input("\nYour question: ")

                if query.lower() == "exit":
                    break

                process_query(query, qdrant, session_id=session_id, state_manager=state_manager)

        except KeyboardInterrupt:
            print("\n")  # New line after ^C
            logger.info("Goodbye!")
        except EOFError:
            print("\n")  # New line after ^D
            logger.info("Goodbye!")
