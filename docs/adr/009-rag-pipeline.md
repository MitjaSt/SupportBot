# ADR-009: RAG Pipeline Design — pgvector, Query Rewriting, and Retrieval Parameters

**Status:** Accepted

## Context

The chatbot answers questions about macular disease using a curated knowledge base. Rather than fine-tuning an LLM, we use Retrieval-Augmented Generation (RAG): retrieve the most relevant document chunks at query time and inject them into the LLM prompt. The key decisions are where to store vectors, how to handle follow-up questions, and what retrieval parameters to use.

## Decision

Store embeddings in **PostgreSQL with pgvector** (collocated with the relational data). Use **OpenAI `text-embedding-3-small`** (1536 dimensions) for both ingestion and query embedding. Apply **query rewriting** to make follow-up questions self-contained before retrieval. Retrieve the **top-3 chunks** with a cosine similarity score threshold of **0.5**.

## Rationale

**pgvector over a dedicated vector database:**
- Our knowledge base is bounded in size — a curated corpus about macular disease does not require the indexing infrastructure of Pinecone, Qdrant, or Weaviate
- Collocating vectors with sessions and messages in one database simplifies deployment (one fewer stateful service) and allows transactional consistency during ingestion
- pgvector's HNSW index provides sub-millisecond similarity search for corpora of this size
- If the corpus grows significantly or retrieval latency becomes a bottleneck, migrating to a dedicated vector DB is feasible — the `VectorDbService` interface abstracts the storage backend

**text-embedding-3-small:**
- Competitive retrieval quality at lower cost and latency compared to `text-embedding-3-large`
- 1536 dimensions strike a balance between expressiveness and storage size

**Query rewriting for follow-up questions:**
- Conversational follow-ups ("what about treatment?") are often elliptical — they rely on prior context to be meaningful
- Embedding an elliptical question produces a poor vector representation, leading to irrelevant chunk retrieval
- A lightweight LLM call rewrites the question into a self-contained form before embedding ("What treatments are available for macular degeneration?"), dramatically improving retrieval quality
- The rewrite uses the last N conversation turns (configurable via `RAG_CONTEXT_HISTORY_MESSAGES`)

**Top-3 chunks with score threshold 0.5:**
- Three chunks provide enough context for most questions without inflating the prompt to the point where the LLM struggles to synthesise the information
- The 0.5 threshold prevents clearly irrelevant chunks from being injected when the query is outside the knowledge base scope
- These values were tuned empirically and should be re-evaluated if retrieval quality feedback suggests otherwise

## Consequences

- Retrieval quality is bounded by the quality and coverage of the knowledge base — gaps in the corpus will produce "I don't know" responses rather than hallucinations (the system prompt instructs the LLM to acknowledge gaps)
- Query rewriting adds a small LLM call before every retrieval step; if latency is a concern, this can be made conditional on whether the conversation has prior turns
- Chunk ingestion uses batches of 100 vectors; large ingestion jobs should be run offline, not during user-facing requests
- The similarity threshold (0.5) and top-K (3) are configured via environment variables — adjust without code changes
