"""
Conversation state management with Redis backend.
Handles session tracking, message history, and user information collection.
"""

import os

from dotenv import load_dotenv

load_dotenv()


def get_redis_client():
    """Get configured Redis client. Raises exception if connection fails."""
    import redis

    client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=int(os.getenv("REDIS_DB", 0)),
        password=os.getenv("REDIS_PASSWORD") or None,
        decode_responses=True,
    )

    # Test connection
    client.ping()

    return client
