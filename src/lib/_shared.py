from dotenv import load_dotenv

load_dotenv()

EMBED_MODEL = "embaas/sentence-transformers-gte-large"  # 1024-dim
VECTOR_SIZE = 1024
QDRANT_COLLECTION_NAME = "macular_society"
TOP_K = 4
MAX_TOKENS = 4096
SCORE_THRESHOLD = 0.5  # Minimum similarity score for relevant results


def get_qdrant_client():
    from qdrant_client import QdrantClient

    return QdrantClient(host="localhost", port=6333)


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
