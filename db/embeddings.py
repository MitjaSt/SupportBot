"""
Embedding repository for pgvector operations.
Replaces Qdrant for vector similarity search.
"""

from dataclasses import dataclass
from uuid import UUID

import numpy as np
from loguru import logger

from .client import get_connection


@dataclass
class ChunkResult:
    """Result from vector similarity search."""

    id: UUID
    text: str
    source_file: str
    chunk_index: int
    score: float  # Cosine similarity (1 = identical, 0 = orthogonal)


class EmbeddingRepository:
    """
    Repository for managing document chunks and vector embeddings.
    Uses pgvector for similarity search.
    """

    def __init__(self):
        """Initialize the embedding repository."""
        pass

    def upsert_chunk(
        self,
        text: str,
        embedding: list[float] | np.ndarray,
        source_file: str,
        chunk_index: int,
    ) -> UUID:
        """
        Insert or update a chunk with its embedding.

        Args:
            text: The chunk text content
            embedding: Vector embedding (1024 dimensions for gte-large)
            source_file: Source file name
            chunk_index: Position in source document

        Returns:
            UUID of the inserted/updated chunk
        """
        if isinstance(embedding, np.ndarray):
            embedding = embedding.tolist()

        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                    INSERT INTO chunks (text, embedding, source_file, chunk_index, chunk_length)
                    VALUES (%s, %s::vector, %s, %s, %s)
                    ON CONFLICT (source_file, chunk_index)
                    DO UPDATE SET
                        text = EXCLUDED.text,
                        embedding = EXCLUDED.embedding,
                        chunk_length = EXCLUDED.chunk_length,
                        created_at = NOW()
                    RETURNING id
                    """,
                (text, embedding, source_file, chunk_index, len(text)),
            )
            result = cur.fetchone()
            conn.commit()
            return result["id"]

    def upsert_chunks_batch(
        self,
        chunks: list[dict],
    ) -> int:
        """
        Batch insert/update multiple chunks.

        Args:
            chunks: List of dicts with keys: text, embedding, source_file, chunk_index

        Returns:
            Number of chunks inserted/updated
        """
        if not chunks:
            return 0

        with get_connection() as conn, conn.cursor() as cur:
            # Use executemany for batch insert
            values = [
                (
                    chunk["text"],
                    chunk["embedding"].tolist()
                    if isinstance(chunk["embedding"], np.ndarray)
                    else chunk["embedding"],
                    chunk["source_file"],
                    chunk["chunk_index"],
                    len(chunk["text"]),
                )
                for chunk in chunks
            ]

            cur.executemany(
                """
                    INSERT INTO chunks (text, embedding, source_file, chunk_index, chunk_length)
                    VALUES (%s, %s::vector, %s, %s, %s)
                    ON CONFLICT (source_file, chunk_index)
                    DO UPDATE SET
                        text = EXCLUDED.text,
                        embedding = EXCLUDED.embedding,
                        chunk_length = EXCLUDED.chunk_length,
                        created_at = NOW()
                    """,
                values,
            )
            conn.commit()

            logger.debug(f"Upserted {len(chunks)} chunks")
            return len(chunks)

    def search(
        self,
        query_embedding: list[float] | np.ndarray,
        top_k: int = 4,
        score_threshold: float = 0.5,
    ) -> list[ChunkResult]:
        """
        Find similar chunks using cosine similarity.

        Args:
            query_embedding: Query vector (1024 dimensions)
            top_k: Maximum number of results
            score_threshold: Minimum similarity score (0-1)

        Returns:
            List of ChunkResult ordered by similarity (highest first)
        """
        if isinstance(query_embedding, np.ndarray):
            query_embedding = query_embedding.tolist()

        with get_connection() as conn, conn.cursor() as cur:
            # pgvector uses <=> for cosine distance (not similarity)
            # cosine_distance = 1 - cosine_similarity
            # So we filter where distance < (1 - threshold)
            max_distance = 1.0 - score_threshold

            cur.execute(
                """
                    SELECT
                        id,
                        text,
                        source_file,
                        chunk_index,
                        1 - (embedding <=> %s::vector) AS score
                    FROM chunks
                    WHERE (embedding <=> %s::vector) < %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                (query_embedding, query_embedding, max_distance, query_embedding, top_k),
            )

            results = []
            for row in cur.fetchall():
                results.append(
                    ChunkResult(
                        id=row["id"],
                        text=row["text"],
                        source_file=row["source_file"],
                        chunk_index=row["chunk_index"],
                        score=float(row["score"]),
                    )
                )

            return results

    def search_texts(
        self,
        query_embedding: list[float] | np.ndarray,
        top_k: int = 4,
        score_threshold: float = 0.5,
    ) -> list[str]:
        """
        Find similar chunks and return just the text content.
        Drop-in replacement for the Qdrant retrieve_chunks interface.

        Args:
            query_embedding: Query vector
            top_k: Maximum number of results
            score_threshold: Minimum similarity score

        Returns:
            List of text strings
        """
        results = self.search(query_embedding, top_k, score_threshold)
        return [r.text for r in results]

    def delete_by_source(self, source_file: str) -> int:
        """
        Delete all chunks from a specific source file.

        Args:
            source_file: Source file name to delete

        Returns:
            Number of chunks deleted
        """
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "DELETE FROM chunks WHERE source_file = %s",
                (source_file,),
            )
            deleted = cur.rowcount
            conn.commit()
            logger.debug(f"Deleted {deleted} chunks from {source_file}")
            return deleted

    def delete_all(self) -> int:
        """
        Delete all chunks (for re-indexing).

        Returns:
            Number of chunks deleted
        """
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM chunks")
            deleted = cur.rowcount
            conn.commit()
            logger.warning(f"Deleted all {deleted} chunks")
            return deleted

    def count(self) -> int:
        """Get total number of chunks."""
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM chunks")
            return cur.fetchone()["count"]

    def get_sources(self) -> list[str]:
        """Get list of all unique source files."""
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT DISTINCT source_file FROM chunks ORDER BY source_file")
            return [row["source_file"] for row in cur.fetchall()]
