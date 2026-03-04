# Architecture Decision Records (ADRs)

Document **important technical and architectural decisions** — context, trade-offs, and consequences.

## Decisions

| # | Decision | Status |
|---|----------|--------|
| [001](./001-rbac.md) | RBAC with Org → Team → Project hierarchy | Accepted |
| [002](./002-event-sourcing.md) | Event sourcing for traces/evaluations | Accepted |
| [003](./003-logging.md) | Structured logging with trace correlation | Accepted |
| [004](./004-database.md) | Database layer — Drizzle ORM and pgvector | Accepted |
| [005](./005-api-design.md) | API design — NestJS/Fastify, SSE streaming, rate limiting | Accepted |
| [006](./006-frontend.md) | Frontend — React, TanStack Query, SSE client | Accepted |
| [007](./007-session-model.md) | Stateless anonymous sessions without authentication | Accepted |
| [008](./008-voice-pipeline.md) | Self-hosted voice pipeline (Whisper STT + Piper TTS) | Accepted |
| [009](./009-rag-pipeline.md) | RAG pipeline — pgvector, query rewriting, retrieval parameters | Accepted |

## When to Write an ADR

- Long-lasting or hard to reverse
- Affects multiple teams/services
- Tools, frameworks, data models, protocols, patterns
- Impacts costs, performance, or maintainability

Skip for small implementation details or experiments.

## How to Write

1. **One decision per ADR** — keep it focused
2. **Keep it short** — 1-2 pages max
3. **Write for the future** — assume someone reads this in 2 years
4. **Be honest about trade-offs** — no decision is perfect
5. **Use narrative** — explain reasoning, not just bullet points

Use [`TEMPLATE.md`](./TEMPLATE.md) for new ADRs. Name: `NNN-short-title.md`

## Status

- **Draft** → initial write-up
- **Proposed** → under discussion
- **Accepted** → in effect
- **Superseded** → replaced by later ADR
- **Deprecated** → no longer relevant
