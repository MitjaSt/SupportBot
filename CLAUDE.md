# Macular Society RAG Platform

Medical Q&A chatbot for people with macular degeneration, run by the Macular Society (UK charity). Retrieval-augmented generation over Macular Society knowledge base, with voice input/output. Users frequently have low vision or use screen readers — accessibility is a first-class concern, not a checkbox.

## Architecture

```
projects/
├── api/          NestJS + TypeScript (port 3030)
├── frontend/     React 18 + Vite + TypeScript (port 5173 dev / 3030 prod)
└── prompt-guard/ Standalone prompt injection guard service
```

### API stack

| Concern | Choice |
|---|---|
| Framework | NestJS (Fastify adapter) |
| ORM | Drizzle ORM (Postgres) |
| Vector search | PostgreSQL + pgvector extension |
| LLM | OpenAI (gpt-4o or configured model) |
| Embeddings | OpenAI text-embedding-3-small (1536 dimensions) |
| Streaming | SSE via AsyncGenerator |
| Validation | TypeBox (not class-validator) |
| Token counting | Tiktoken (cl100k_base) |
| Observability | LangWatch (OTEL) — adapters for LangFuse, DeepEval, null |
| Metrics | Prometheus (port 3060) + Grafana (port 3070) |
| Testing | Vitest + @langwatch/scenario for eval/simulations |

### Frontend stack

| Concern | Choice |
|---|---|
| UI | MUI v5 — `sx` prop only, no plain CSS files |
| Server state | TanStack Query v5 — sessions, history (not useState) |
| Routing | React Router v6 |
| Streaming | fetch + ReadableStream (SSE) |

### Infrastructure (Docker Compose)

| Service | Port |
|---|---|
| API / frontend (prod) | 3030 |
| Whisper (STT) | 3040 |
| Piper (TTS) | 3050 |
| Prometheus | 3060 |
| Grafana | 3070 |
| PostgreSQL | 5432 |

### Docker storage convention

Persistent data uses **bind mounts** into `docker/storage/<service>/` — never named Docker volumes. This keeps data visible on the host filesystem and easy to back up or inspect.

```
docker/storage/
├── cloudbeaver/
├── ollama_data/
├── qdrant/
├── redis/
└── redisinsight/
```

When adding a new service that needs persistent storage, add a bind mount `./storage/<service-name>:/path/in/container` and create the directory. Do not add a `volumes:` block.

## Key commands

```bash
make help               # Full target list

# Dev
make docker-start       # Start Postgres + voice services
make api                # Start API dev server (projects/api)
# Frontend: cd projects/frontend && npm run dev

# Testing
make test               # Unit + integration tests
make test-cov           # With coverage
make test-scenarios     # LLM-judge eval scenarios
make test-ragas         # Ragas metric evals
make test-evals         # All evals

# Typecheck (run this before testing)
cd projects/api && npm run typecheck
```

## API module structure

```
src/modules/
├── chat/               HTTP endpoints + session management + suggestions
├── rag/                Core RAG: embed → retrieve → generate (streaming)
│   ├── services/       tool-handler.service.ts
│   └── handlers/       contact-collection.handler.ts
├── embeddings/         OpenAI embedding generation
├── vector-db/          pgvector search (raw SQL for vector ops, Drizzle for the rest)
├── pipeline/           Data ingestion: scrape → chunk → embed → store
├── processing/         Chunking, summarisation, criteria generation
├── contact-collection/ Contact state machine (phone/email collection via tool calling)
├── whisper/            Speech-to-text
├── piper/              Text-to-speech
├── analytics/          Usage analytics endpoints
├── system/             Health/system endpoints
├── metrics/            Prometheus instrumentation (track all OpenAI calls)
├── observability/      LangWatch/LangFuse/DeepEval adapters
├── prompt-guard/       Prompt injection detection
├── prompt-logger/      Prompt logging
└── database/           DB module + session repository
```

## Frontend structure

```
src/
├── api/client.ts       ALL fetch logic — no component imports fetch directly
├── components/         ChatView, ChatInput, ChatMessage, SessionSidebar, QueryDebugDialog
├── hooks/              useSessions, useSession, usePinnedSessions
├── providers/          QueryProvider (QueryClient config)
└── types/index.ts      All shared types
```

## Critical patterns

**NestJS:** Constructor injection always. Controllers handle HTTP only; delegate to services.

**Database:** Drizzle query builder for standard queries; raw `sql` template tag for pgvector (`<=>` operator).

**Streaming:** `AsyncGenerator<StreamEvent>` on the API side; `sendQueryStream()` in `api/client.ts` on the frontend.

**Frontend state:** Server data (sessions, history) → TanStack Query. UI state → `useState`. Mutable non-rendering values → `useRef`. No Redux/Zustand/Context.

**Query keys:** Always use exported factory functions (`sessionsQueryKey()`, `sessionQueryKey(id)`) — never raw literals outside the hook file.

**Metrics:** Every OpenAI call must track token usage via `MetricsService`.

**RAG pipeline:** User query → embed → pgvector cosine search (threshold 0.7, top-K configurable) → prompt + context → OpenAI stream → SSE to client.

## Detailed references

- Coding conventions: `docs/CODING_STANDARDS.md`
- Testing strategy: `docs/TESTING_STRATEGY.md`
- Frontend architecture: `docs/FRONTEND_ARCHITECTURE.md`
- Architecture decisions: `docs/adr/`
- Security assessment: `docs/SECURITY_RISK_ASSESMENT.md`
- Voice pipeline: `docs/VOICE_PIPELINE.md`
- Monitoring: `docs/MONITORING.md`

## Domain context (read this before making product decisions)

- **Users have macular degeneration** — a progressive central vision loss condition. Many rely on screen readers, high contrast, keyboard navigation, or enlarged text. WCAG 2.1 AA is a minimum bar.
- **Medical domain** — the system must not hallucinate. Responses are grounded in retrieved Macular Society content only. The retrieval score threshold (0.7) is intentional.
- **Contact collection** — the assistant can collect phone/email via OpenAI function calling when users want a callback from Macular Society support staff.
- **Charity context** — this is not a SaaS product. Keep infrastructure simple and operationally lightweight.
