# ADR-005: API Design — NestJS/Fastify, SSE Streaming, and Two-Tier Rate Limiting

**Status:** Accepted

## Context

The API serves a conversational RAG interface where responses can take several seconds to generate. Users expect to see partial answers as they stream rather than waiting for the full response. The API also needs to handle audio uploads for voice input and protect against abuse without blocking legitimate users behind shared network infrastructure (corporate proxies, VPNs).

## Decision

Build the API with **NestJS** using the **Fastify** adapter. Deliver streamed chat responses via **Server-Sent Events (SSE)** using async generators. Enforce abuse limits with a **two-tier rate limit** (IP-level coarse backstop + session-level fine-grained limit). Validate all request bodies with **TypeBox**.

## Rationale

**NestJS + Fastify over Express:**
- NestJS's module and dependency injection system suits a multi-feature API (chat, RAG pipeline, embeddings, analytics, metrics)
- Fastify is measurably faster than Express and has first-class async support, which matters for streaming and concurrent connections

**SSE over WebSockets:**
- SSE is unidirectional (server → client), which matches the use case — the client sends one request and receives a stream of chunks
- SSE works over plain HTTP/1.1 with no handshake overhead and is automatically handled by browser `EventSource` or a simple `fetch` with `getReader()`
- WebSockets add bidirectional complexity that we don't need
- The async generator pattern in `ChatService.chatStream()` maps cleanly to SSE: each `yield` emits one event (`chunk`, `tool`, `done`, `suggestions`, `error`)

**Two-tier rate limiting:**
- IP-based rate limiting alone is too blunt — many users share a corporate IP or VPN exit node, so a low IP limit would block legitimate users
- Session-based rate limiting alone can be bypassed by cycling session IDs
- The combination covers both cases:
  - IP tier (`@fastify/rate-limit`): high limit (200 req/min default) to catch volumetric attacks
  - Session tier (`SessionRateLimitInterceptor`): lower limit (20 req/min default) to prevent a single conversation from monopolising resources
- Counters are kept in-memory with `node-cache`; Redis is not needed at current scale

**TypeBox for request validation:**
- TypeBox produces standard JSON Schema at runtime, which is used by the custom `TypeBoxPipe` for validation
- Avoids the decorator magic of `class-validator` while still giving compile-time and runtime type safety
- Validation errors return structured 400 responses with per-field messages

**Audio as raw binary body:**
- Accepting audio as a raw binary `Buffer` (with `Content-Type: audio/webm` etc.) avoids the complexity of `multipart/form-data` parsing
- The session ID is passed as a query parameter for voice requests since the body is occupied by audio data

## Consequences

- Streaming errors mid-response must be handled carefully: if `Content-Type: text/event-stream` headers have already been sent, the connection cannot switch to a 500 response — emit an `error` event instead
- The 50 MB body limit is set to accommodate audio uploads; reduce this if voice input is removed
- Session-based rate limit counters are lost on server restart (in-memory); this is acceptable given the low limit and the 60s window
- IP rate limit `X-Forwarded-For` handling must be correct for the deployment environment (load balancer, reverse proxy) or clients will be mis-identified
