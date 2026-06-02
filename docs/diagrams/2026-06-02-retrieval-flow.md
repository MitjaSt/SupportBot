# Retrieval flow

> Source: projects/api/src/modules/rag/, docs/adr/009-rag-pipeline.md | Type: sequenceDiagram | Date: 2026-06-02
> Edit online: paste the code block below into https://mermaid.live

## RAG retrieval pipeline — from raw user query to ranked context chunks

```mermaid
sequenceDiagram
  participant Chat as ChatService
  participant RAG as RagService
  participant OpenAI
  participant Vec as VectorDbService<br/>(pgvector)
  participant DB as Postgres

  Chat->>+RAG: generate(sessionId, query, history)

  RAG->>OpenAI: query rewrite<br/>model: gpt-4o<br/>prompt: history + "make self-contained"
  OpenAI-->>RAG: rewritten query<br/>(unchanged if already self-contained)

  RAG->>OpenAI: embed rewritten query<br/>model: text-embedding-3-small<br/>dims: 1536
  OpenAI-->>RAG: query vector [1536]

  RAG->>+Vec: search(queryVector, topK, threshold)
  Vec->>DB: SELECT … ORDER BY embedding <=> $1<br/>WHERE score >= threshold (0.7)<br/>LIMIT topK (configurable)
  DB-->>Vec: rows: { id, content, url, score }
  Vec-->>-RAG: Chunk[]  (ranked by cosine similarity)

  alt no chunks above threshold
    RAG-->>Chat: stream — "no relevant information found"
  else chunks found
    RAG->>RAG: build prompt<br/>(system + chunks as context + history)
    RAG->>OpenAI: chat completion (stream=true)<br/>model: gpt-4o
    loop token stream
      OpenAI-->>RAG: delta
      RAG-->>Chat: StreamEvent { type: token, content }
    end
    RAG-->>-Chat: StreamEvent { type: done, sources, tokens }
  end
```

## Chunk scoring detail

```mermaid
flowchart LR
  Q[User query] --> RW[Query rewrite\nvia LLM]
  RW --> EM[Embed\ntext-embedding-3-small]
  EM --> VS[pgvector cosine search\n<=> operator]
  VS --> TH{score >= 0.7?}
  TH -- yes --> RANK[rank by score\ntake top-K]
  TH -- no --> DROP[discard]
  RANK --> CTX[context window\nfor LLM prompt]
  DROP --> CTX
```

## Notes

- **Cosine distance** (`<=>`) is computed entirely in Postgres via the pgvector extension. Raw SQL is used for vector operations; Drizzle query builder handles everything else.
- **Threshold 0.7** is the production default (`RAG_SIMILARITY_THRESHOLD`). A lower value (e.g. 0.5) was used in earlier ADR drafts.
- **Top-K** is configurable via `RAG_TOP_K`; default is 3.
- **Query rewrite** prevents follow-up questions (e.g. "what about side effects?") from failing retrieval due to missing context. If the rewritten query is identical to the original, no extra latency is added.
- For the tool-call (contact collection) loop, see `projects/api/src/modules/rag/services/tool-handler.service.ts`.
