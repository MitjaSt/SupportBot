"""
Conversation state management with Redis backend.
Handles session tracking, message history, and user information collection.
"""

from src.lib.env import env


def get_redis_client():
    """Get configured Redis client. Raises exception if connection fails."""
    import redis

    client = redis.Redis(
        host=env.redis.host,
        port=env.redis.port,
        db=env.redis.db,
        password=env.redis.password,
        decode_responses=True,
    )

    # Test connection
    client.ping()

    return client
