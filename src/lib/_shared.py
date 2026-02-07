"""
Shared constants and utilities.

Constants are now loaded from environment configuration for flexibility.
These module-level aliases provide backward compatibility.
"""

from src.lib.env import env

# Re-export from env config for backward compatibility
EMBED_MODEL = env.embedding.model
VECTOR_SIZE = env.embedding.vector_size
QDRANT_COLLECTION_NAME = env.qdrant.collection_name
TOP_K = env.rag.top_k
MAX_TOKENS = env.rag.max_tokens
SCORE_THRESHOLD = env.rag.score_threshold


def get_qdrant_client():
    """Get configured Qdrant client."""
    from qdrant_client import QdrantClient

    return QdrantClient(host=env.qdrant.host, port=6333)


def recreate_qdrant_collection(collection_name, vector_size):
    from qdrant_client.models import Distance, VectorParams

    qdrant = get_qdrant_client()

    if qdrant.collection_exists(collection_name):
        print(f"Deleting existing collection: {collection_name}")
        qdrant.delete_collection(collection_name)

    print(f"Creating collection: {collection_name}")
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )
