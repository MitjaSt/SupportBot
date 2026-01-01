#!/usr/bin/env python3
"""
Test script for multi-turn conversation flow with callback collection.
Demonstrates the full flow from query to callback collection.
"""

import uuid

from qdrant_client import QdrantClient

from lib.conversation_state import ConversationStateManager, get_redis_client
from lib.llm import process_query


def test_conversation_flow():
    """Test the full multi-turn conversation flow."""

    print("\n" + "=" * 60)
    print("Testing Multi-Turn Conversation Flow")
    print("=" * 60 + "\n")

    # Initialize clients
    qdrant = QdrantClient(host="localhost", port=6333)
    redis_client = get_redis_client()

    if not redis_client:
        print("❌ Redis not available. Please start Redis:")
        print("   cd docker && docker-compose up -d redis")
        return

    state_manager = ConversationStateManager(redis_client)
    session_id = str(uuid.uuid4())

    print(f"Session ID: {session_id}\n")
    print("-" * 60)

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
        print(f"\n[Turn {i}] User: {query}")
        print("-" * 60)

        result = process_query(
            query,
            qdrant,
            session_id=session_id,
            state_manager=state_manager,
            verbose=False,  # Suppress detailed output
        )

        print(f"Assistant: {result['answer']}")
        print(f"Status: {result['status']}")
        print(f"Collection State: {result.get('collection_state', 'N/A')}")

    print("\n" + "=" * 60)
    print("✅ Test completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    test_conversation_flow()
