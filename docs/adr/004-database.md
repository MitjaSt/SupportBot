# ADR-004: Database Layer with Drizzle ORM and pgvector

**Status:** Accepted

## Context

The application needs to persist conversation sessions, messages, and vector embeddings for semantic search. We need an ORM that works well with TypeScript, supports raw SQL when needed, and doesn't add excessive abstraction. We also need vector storage for RAG — either a dedicated vector database or an extension on our existing PostgreSQL instance.

## Decision

Use **Drizzle ORM** with native `pg` (node-postgres) for relational data, and the **pgvector** PostgreSQL extension for embedding storage and similarity search.

## Rationale

**Drizzle over Prisma or TypeORM:**
- Drizzle generates plain SQL — no magic, no hidden N+1 queries, no runtime code generation
- Schema is defined in TypeScript (`src/db/schema.ts`), making it the single source of truth for types and migrations
- Drizzle Kit handles migrations as numbered SQL files (`drizzle/0000_*.sql`), which are easy to review in code review
- TypeORM's decorator-based approach and Prisma's separate schema language both add friction for a small team

**pgvector over a dedicated vector database (Qdrant, Pinecone, Weaviate):**
- We already depend on PostgreSQL; adding a second stateful service increases operational complexity
- 1536-dimensional embeddings with a small corpus (macular disease knowledge base) perform well within pgvector's capabilities
- Cosine similarity search with a score threshold of 0.5 and top-K=3 gives sufficient retrieval quality at this scale
- If retrieval quality or latency degrades as the corpus grows, migrating to a dedicated vector DB is a well-understood path

**Connection pooling with `pg.Pool`:**
- `max: 10` connections with a 30s idle timeout balances resource use with concurrency
- Pool is initialised once in `DatabaseService.onModuleInit()` and shared across the application via NestJS dependency injection

**Repository pattern:**
- `SessionRepository` encapsulates all session and message queries, keeping business logic out of the database layer
- Direct use of Drizzle's query builder inside repository methods keeps things explicit without a second abstraction layer

## Consequences

- All schema changes go through Drizzle Kit migrations — do not alter tables manually in production
- Vector similarity queries use raw SQL with the `<->` operator (L2 distance); update the custom pgvector Drizzle type if the dimension count changes
- Connection pool size (`max: 10`) must be revisited if the application runs multiple replicas or if long-running streaming connections exhaust available connections
- pgvector must be enabled on the PostgreSQL instance before running migrations (`CREATE EXTENSION IF NOT EXISTS vector` is in the first migration)
