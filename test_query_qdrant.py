import sys
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient

COLLECTION_NAME = "macular_docs"
VECTOR_SIZE = 1024

#  python query_qdrant.py "Can you stop the hallucinations caused by CBS?"

model = SentenceTransformer("embaas/sentence-transformers-gte-large")

qdrant = QdrantClient(host="localhost", port=6333)

def embed(text):
    return model.encode([text])[0]

def search(query, top_k=5):
    print(f"\n🔍 Query: {query}\n")

    query_vec = embed(query)

    result = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vec.tolist(),
        limit=top_k
    )

    points = result.points

    if not points:
        print("No results found.")
        return

    for i, hit in enumerate(reversed(points), 1):
        if hit.payload is None:
            continue

        text = hit.payload.get('text')

        print("──────")
        print(f"Rank: {len(points)-i + 1}")
        print(f"Score: {hit.score:.4f}")
        print(f"Source: {hit.payload.get('source')}")
        print(f"Chunk #: {hit.payload.get('chunk_index')}")
        print("\nText:")
        print(text if text else "")
        print("──────\n")

# python query_qdrant.py "What are hallucinations"
# python query_qdrant.py "Can you stop the hallucinations caused by CBS?"
# python query_qdrant.py "What causes it in people with sight loss?"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python query_qdrant.py \"your question\"")
        exit()

    query = " ".join(sys.argv[1:])
    search(query)
