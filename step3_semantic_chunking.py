"""
Semantic chunking and embeddings using modern libraries (Python 3.12+ compatible).
This provides LlamaIndex-style functionality without the framework dependency.
"""

import os
import uuid
from pathlib import Path

from qdrant_client.models import PointStruct
from semantic_text_splitter import TextSplitter
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from shared import (
    EMBED_MODEL,
    QDRANT_COLLECTION_NAME,
    VECTOR_SIZE,
    get_qdrant_client,
    recreate_qdrant_collection,
)

# ------------------------
# Config
# ------------------------
FLAT_CACHE_DIR = os.environ["CACHE_DIR_FLAT"]
CHUNK_SIZE_TOKENS = 512  # max tokens per chunk
OVERLAP_TOKENS = 100  # overlap between chunks

# ------------------------
# Initialize Models
# ------------------------
print("Loading embedding model...")
embed_model = SentenceTransformer(EMBED_MODEL)

# Initialize semantic text splitter (more advanced than NLTK sentence splitting)
# This uses the model's tokenizer for accurate token-based chunking
print("Initializing semantic text splitter...")
# Get the underlying tokenizers.Tokenizer from the transformers tokenizer
# SentenceTransformer uses transformers tokenizers which wrap tokenizers.Tokenizer
tokenizer_backend = embed_model.tokenizer.backend_tokenizer
splitter = TextSplitter.from_huggingface_tokenizer(
    tokenizer=tokenizer_backend,
    capacity=CHUNK_SIZE_TOKENS,
    overlap=OVERLAP_TOKENS,
)

# ------------------------
# Setup Qdrant
# ------------------------
qdrant = get_qdrant_client()
recreate_qdrant_collection(QDRANT_COLLECTION_NAME, VECTOR_SIZE)


# ------------------------
# Process files
# ------------------------
def process_file(filepath: Path) -> dict:
    """
    Process a single file: chunk, embed, and upsert to Qdrant.

    Returns:
        dict with processing stats
    """
    with open(filepath, encoding="utf-8") as f:
        text = f.read()

    # Semantic chunking - respects sentence boundaries and token limits
    chunks = splitter.chunks(text)

    if not chunks:
        return {"file": filepath.name, "chunks": 0, "points": 0}

    # Generate embeddings in batch (more efficient)
    embeddings = embed_model.encode(
        chunks,
        batch_size=32,
        show_progress_bar=False,
        convert_to_numpy=True,
    )

    # Create points for Qdrant
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=emb.tolist(),
            payload={
                "text": chunk,
                "source": filepath.name,
                "chunk_index": idx,
                "chunk_length": len(chunk),
            },
        )
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings, strict=True))
    ]

    # Upsert to Qdrant
    qdrant.upsert(collection_name=QDRANT_COLLECTION_NAME, points=points)

    return {
        "file": filepath.name,
        "chunks": len(chunks),
        "points": len(points),
    }


# ------------------------
# Main
# ------------------------
def main():
    flat_dir = Path(FLAT_CACHE_DIR)

    if not flat_dir.exists():
        raise FileNotFoundError(f"Directory not found: {FLAT_CACHE_DIR}")

    txt_files = list(flat_dir.glob("*.txt"))

    if not txt_files:
        raise ValueError(f"No .txt files found in {FLAT_CACHE_DIR}")

    print(f"\nFound {len(txt_files)} files to process")
    print("Configuration:")
    print(f"  - Chunk size: {CHUNK_SIZE_TOKENS} tokens")
    print(f"  - Overlap: {OVERLAP_TOKENS} tokens")
    print(f"  - Embedding model: {EMBED_MODEL}")
    print(f"  - Vector size: {VECTOR_SIZE}")
    print(f"  - Collection: {QDRANT_COLLECTION_NAME}\n")

    total_chunks = 0
    total_points = 0

    # Process files with progress bar
    for filepath in tqdm(txt_files, desc="Processing files"):
        stats = process_file(filepath)
        total_chunks += stats["chunks"]
        total_points += stats["points"]

    # Verify collection
    collection_info = qdrant.get_collection(QDRANT_COLLECTION_NAME)

    print(f"\n{'=' * 80}")
    print("✓ Processing complete!")
    print(f"{'=' * 80}")
    print(f"Files processed: {len(txt_files)}")
    print(f"Total chunks created: {total_chunks}")
    print(f"Total points in Qdrant: {collection_info.points_count}")
    print("\nView in Qdrant UI:")
    print(f"http://localhost:6333/dashboard#/collections/{QDRANT_COLLECTION_NAME}")
    print(f"{'=' * 80}\n")


if __name__ == "__main__":
    main()
