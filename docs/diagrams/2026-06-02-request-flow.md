# Request flow

> Source: projects/api/src/modules/chat/chat.controller.ts | Type: sequenceDiagram | Date: 2026-06-02
> Edit online: paste the code block below into https://mermaid.live

## HTTP request lifecycle — from browser to streamed SSE response

```mermaid
sequenceDiagram
  participant Browser
  participant API as NestJS API<br/>(Fastify)
  participant Guard as Auth Guards<br/>(JWT / Permissions)
  participant Chat as ChatService
  participant DB as Postgres<br/>(session store)

  Browser->>+API: POST /chat/query/stream<br/>{ sessionId, query }
  API->>Guard: validate JWT (OptionalAuth)
  Guard-->>API: user | null

  API->>API: TypeBox validation<br/>(QueryRequestSchema)

  API->>API: set SSE headers<br/>Content-Type: text/event-stream<br/>Cache-Control: no-cache<br/>X-Accel-Buffering: no

  API->>+Chat: chatStream(sessionId, query, user)
  Chat->>DB: load/create session
  DB-->>Chat: session record

  loop RAG stream (see retrieval-flow diagram)
    Chat-->>API: StreamEvent (token delta / metadata)
    API-->>Browser: data: {json}\n\n
  end

  Chat->>DB: persist message + chunks
  Chat-->>-API: generator exhausted
  API-->>-Browser: stream close (reply.raw.end())
```

## Non-streaming path (`POST /chat/query`)

```mermaid
sequenceDiagram
  participant Browser
  participant API as NestJS API
  participant Chat as ChatService

  Browser->>+API: POST /chat/query<br/>{ sessionId, query }
  API->>+Chat: chat(sessionId, query, user)
  Note over Chat: same RAG pipeline,<br/>result buffered in memory
  Chat-->>-API: QueryResponse
  API-->>-Browser: 200 JSON<br/>{ answer, sources, sessionId }
```

## Notes

- **OptionalAuth** — the stream endpoint accepts anonymous requests; `user` may be `null`. Session ownership is still enforced for authenticated users on `GET /sessions/:id`.
- **SSE framing** — each event is written as `data: <json>\n\n`. The frontend reads via `fetch` + `ReadableStream`; no `EventSource` (allows POST with a body).
- **nginx buffering** — `X-Accel-Buffering: no` is required in production so the reverse proxy does not buffer the stream before forwarding it.
