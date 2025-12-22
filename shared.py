from dotenv import load_dotenv

load_dotenv()

EMBED_MODEL = "embaas/sentence-transformers-gte-large"  # 1024-dim
VECTOR_SIZE = 1024
QDRANT_COLLECTION_NAME = "macular_docs_large"
TOP_K = 4
MAX_TOKENS = 4096
SCORE_THRESHOLD = 0.5  # Minimum similarity score for relevant results
