import sys
import uuid

from loguru import logger
from qdrant_client import QdrantClient

from src.lib.conversations.conversation_state import ConversationStateManager
from src.lib.llm import OLLAMA_MODEL, OLLAMA_URL, process_query
from src.lib.redis import get_redis_client

# --- QDRANT CLIENT ---
qdrant = QdrantClient(host="localhost", port=6333)


# --- MAIN LOOP ---
if __name__ == "__main__":
    logger.info(f"Ollama RAG assistant ready. Using {OLLAMA_MODEL} at {OLLAMA_URL}")

    # Single query mode (from command line argument) - stateless for backward compatibility
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        logger.info(f"Query: {query}")
        logger.info("Type 'exit' to quit.")
        process_query(query, qdrant)

    # Interactive mode - with conversation state
    else:
        # Initialize Redis and conversation state
        redis_client = get_redis_client()
        state_manager = ConversationStateManager(redis_client)
        session_id = str(uuid.uuid4())

        logger.info(f"Session ID: {session_id}")
        logger.info("Type 'exit' to quit, 'reset' to start new conversation, or press Ctrl+C.")

        try:
            while True:
                query = input("\nYour question: ")

                if query.lower() == "exit":
                    break
                elif query.lower() == "reset":
                    # Start new conversation
                    session_id = str(uuid.uuid4())
                    logger.info(f"New session started: {session_id}")
                    continue

                # Process query with session
                process_query(query, qdrant, session_id=session_id, state_manager=state_manager)

        except KeyboardInterrupt:
            print("\n")  # New line after ^C
            logger.info("Goodbye! 👋")
        except EOFError:
            print("\n")  # New line after ^D
            logger.info("Goodbye! 👋")
