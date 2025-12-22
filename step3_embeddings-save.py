import json
import os
import uuid

# Download NLTK data if needed (run once)
import nltk
import numpy as np
from nltk.tokenize import sent_tokenize
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from shared import EMBED_MODEL, QDRANT_COLLECTION_NAME, VECTOR_SIZE

nltk.download("punkt_tab")

# ------------------------
# Config
# ------------------------
FLAT_CACHE_DIR = "cache/flat"
CHUNKS_CACHE_DIR = "cache/chunks"
EMBEDDINGS_CACHE_DIR = "cache/embeddings"

TOP_K = 5

CHUNK_SIZE_TOKENS = 512  # max tokens per chunk
OVERLAP_TOKENS = 100  # overlap between chunks

os.makedirs(os.environ["CACHE_DIR_EMBEDDINGS"], exist_ok=True)

# ------------------------
# Load embedding model
# ------------------------
model = SentenceTransformer(EMBED_MODEL)
tokenizer = model.tokenizer  # for token-based chunking

# ------------------------
# Initialize Qdrant
# ------------------------
qdrant = QdrantClient(host="localhost", port=6333)

if qdrant.collection_exists(QDRANT_COLLECTION_NAME):
    qdrant.delete_collection(QDRANT_COLLECTION_NAME)

qdrant.create_collection(
    collection_name=QDRANT_COLLECTION_NAME,
    vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
)


# ------------------------
# Token-based chunking
# ------------------------
def chunk_text(text: str, max_tokens=512, overlap_tokens=100) -> list[str]:
    """
    Chunk text into max_tokens with overlap.
    """
    sentences = sent_tokenize(text)
    chunks = []
    current_chunk = []
    current_len = 0

    for sent in sentences:
        tokens = tokenizer.encode(sent, add_special_tokens=False)
        token_len = len(tokens)

        if current_len + token_len > max_tokens and current_chunk:
            chunks.append(" ".join(current_chunk))
            # start next chunk with overlap
            overlap_sentences = []
            overlap_len = 0
            for s in reversed(current_chunk):
                s_len = len(tokenizer.encode(s, add_special_tokens=False))
                if overlap_len + s_len > overlap_tokens:
                    break
                overlap_sentences.insert(0, s)
                overlap_len += s_len
            current_chunk = overlap_sentences
            current_len = overlap_len

        current_chunk.append(sent)
        current_len += token_len

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


# ------------------------
# Process files
# ------------------------
def process_file(filepath: str):
    with open(filepath, encoding="utf-8") as f:
        text = f.read()

    # Chunk
    chunks = chunk_text(text, max_tokens=CHUNK_SIZE_TOKENS, overlap_tokens=OVERLAP_TOKENS)

    # Save JSONL
    jsonl_path = os.path.join(
        CHUNKS_CACHE_DIR, os.path.basename(filepath).replace(".txt", ".jsonl")
    )
    with open(jsonl_path, "w", encoding="utf-8") as jf:
        for idx, chunk in enumerate(chunks):
            jf.write(
                json.dumps(
                    {"text": chunk, "source": os.path.basename(filepath), "chunk_index": idx}
                )
                + "\n"
            )

    # Embed chunks
    embeddings = model.encode(chunks, show_progress_bar=True)
    embeddings_path = os.path.join(
        EMBEDDINGS_CACHE_DIR, os.path.basename(filepath).replace(".txt", ".npy")
    )
    np.save(embeddings_path, embeddings)

    # Upsert into Qdrant
    points_struct = [
        PointStruct(
            id=str(uuid.uuid7()),
            vector=emb.tolist(),
            payload={"text": chunk, "source": os.path.basename(filepath), "chunk_index": i},
        )
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings, strict=False))
    ]

    qdrant.upsert(collection_name=QDRANT_COLLECTION_NAME, points=points_struct)

    print(f"Processed {filepath}: {len(chunks)} chunks, embeddings saved, upserted to Qdrant.")


# ------------------------
# Main
# ------------------------
def main():
    files = [f for f in os.listdir(FLAT_CACHE_DIR) if f.endswith(".txt")]
    for filename in tqdm(files):
        filepath = os.path.join(FLAT_CACHE_DIR, filename)
        process_file(filepath)


if __name__ == "__main__":
    main()
    print(
        "\nAll files processed and embeddings saved to Qdrant. View via Qdrant UI: http://localhost:6333/dashboard#/collections"
    )
