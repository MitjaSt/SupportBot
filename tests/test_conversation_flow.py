#!/usr/bin/env python3
"""
Test script for multi-turn conversation flow with callback collection.
Demonstrates the full flow from query to callback collection.
"""

import uuid
from datetime import datetime

from loguru import logger
from qdrant_client import QdrantClient

from src.lib.conversations.conversation_state import ConversationStateManager
from src.lib.llm import process_query
from src.lib.redis import get_redis_client

session_logger = logger.bind(session="task1")
session_logger.add(
    f"test_conversation_{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.log", level="INFO"
)


def test_conversation_flow():
    """Test the full multi-turn conversation flow."""

    session_logger.info("\n" + "=" * 60)
    session_logger.info("Testing Multi-Turn Conversation Flow")
    session_logger.info("=" * 60 + "\n")

    # Initialize clients
    qdrant = QdrantClient(host="localhost", port=6333)
    redis_client = get_redis_client()
    state_manager = ConversationStateManager(redis_client)
    session_id = str(uuid.uuid4())

    session_logger.info(f"Session ID: {session_id}\n")
    session_logger.info("-" * 60)

    # Simulate a conversation
    test_queries = [
        "Can the support team call me?",  # Should trigger callback offer
        "yes",  # Agree to callback
        "07700 900123",  # Provide phone
        "John Smith",  # Provide name
        "tomorrow afternoon",  # Provide time
        "yes",  # Confirm
    ]

    for i, query in enumerate(test_queries, 1):
        session_logger.info(f"\n[Turn {i}] User: {query}")
        session_logger.info("-" * 60)

        result = process_query(
            query,
            qdrant,
            session_id=session_id,
            state_manager=state_manager,
            verbose=False,  # Suppress detailed output
        )

        session_logger.info(f"Assistant: {result['answer']}")
        session_logger.info(f"Status: {result['status']}")
        session_logger.info(f"Collection State: {result.get('collection_state', 'N/A')}")

    session_logger.info("\n" + "=" * 60)
    session_logger.info("✅ Test completed!")
    session_logger.info("=" * 60 + "\n")


if __name__ == "__main__":
    test_conversation_flow()
