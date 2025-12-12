from enum import Enum
from dotenv import load_dotenv

load_dotenv()

class ModelSize(Enum):
    LARGE = 1
    SMALL = 2


MODEL_SIZE = ModelSize.LARGE

if MODEL_SIZE == ModelSize.SMALL:
    LLM_MODEL = "togethercomputer/RedPajama-INCITE-Instruct-3B-v1"
    EMBED_MODEL = "sentence-transformers/all-mpnet-base-v2"  # lighter embedding
    VECTOR_SIZE = 768
    QDRANT_COLLECTION_NAME = "macular_docs_small"
    TOP_K = 2
    MAX_TOKENS = 2048
    SCORE_THRESHOLD = 0.5  # Minimum similarity score for relevant results
else:
    LLM_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
    EMBED_MODEL = "embaas/sentence-transformers-gte-large"  # 1024-dim
    VECTOR_SIZE = 1024
    QDRANT_COLLECTION_NAME = "macular_docs_large"
    TOP_K = 4
    MAX_TOKENS = 4096
    SCORE_THRESHOLD = 0.5  # Minimum similarity score for relevant results
