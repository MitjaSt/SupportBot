import sys

from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from src.config import EMBED_MODEL, QDRANT_COLLECTION_NAME

VECTOR_SIZE = 1024

#  python query_qdrant.py "Can you stop the hallucinations caused by CBS?"

model = SentenceTransformer(EMBED_MODEL)

qdrant = QdrantClient(host="localhost", port=6333)


def embed(text):
    return model.encode([text])[0]


def search(query, top_k=5):
    print(f"\n🔍 Query: {query}\n")

    query_vec = embed(query)

    result = qdrant.query_points(
        collection_name=QDRANT_COLLECTION_NAME, query=query_vec.tolist(), limit=top_k
    )

    points = result.points

    if not points:
        print("No results found.")
        return

    for i, hit in enumerate(reversed(points), 1):
        if hit.payload is None:
            continue

        text = hit.payload.get("text")

        print("──────")
        print(f"Rank: {len(points) - i + 1}")
        print(f"Score: {hit.score:.4f}")
        print(f"Source: {hit.payload.get('source')}")
        print(f"Chunk #: {hit.payload.get('chunk_index')}")
        print("\nText:")
        print(text if text else "")
        print("──────\n")


# python query_qdrant.py "What kind of help can I get from the Macular Society helpline if I call again?"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python query_qdrant.py "your question"')
        exit()

    query = " ".join(sys.argv[1:])
    search(query)
