# OpenAPI Spec — Implementation Plan

> Status: Planned | Derived from PRD (see below)

## Decisions

| Question | Answer |
|---|---|
| Prod exposure | Dev-only — gated by `NODE_ENV !== 'production'` in `main.ts` |
| CI artifact export | Out of scope for now |
| Spec title | "RAG API v1.0" |

---

## Approach

**`@nestjs/swagger` + `nestjs-typebox` patch.**

The API uses TypeBox for validation, not class-validator. `@nestjs/swagger` natively understands class-validator DTOs, not TypeBox schemas. `nestjs-typebox` bridges this by patching the Swagger module so TypeBox `Type.Object()` schemas are reflected automatically — no `@ApiProperty()` needed on each field.

For the Fastify adapter: `@nestjs/swagger` handles the spec generation, but the UI must be served via `@fastify/swagger-ui` (the scoped package — the old `fastify-swagger` is abandoned).

---

## Packages to install

```bash
cd projects/api
npm install --save @nestjs/swagger nestjs-typebox @fastify/swagger @fastify/swagger-ui
```

Note: `@fastify/swagger` and `@fastify/swagger-ui` are two separate packages since v8 — both required.

---

## M1 — Bootstrap: spec live at `/api/docs`

**Files changed:** `projects/api/src/main.ts` only.

### 1. Call the TypeBox patch before bootstrap

```typescript
import { configureNestJsTypebox } from 'nestjs-typebox';

// Must be called before NestFactory.create()
configureNestJsTypebox({ patchSwagger: true });
```

### 2. Wire SwaggerModule in `bootstrap()`

Add this block after `app.setGlobalPrefix(...)` and before `app.listen(...)`, gated to dev-only:

```typescript
if (process.env.NODE_ENV !== 'production') {
  const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');

  const config = new DocumentBuilder()
    .setTitle('RAG API')
    .setVersion('1.0')
    .setDescription('Macular Society RAG chatbot API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
```

### 3. Verify

Start the API (`make api`) and open `http://localhost:3030/api/docs`. All 4 controllers should appear. The `POST /api/chat/query` endpoint should show `QueryRequestSchema` fields (query, sessionId) without any manual `@ApiProperty` decoration.

**Known Fastify quirk:** `SwaggerModule.setup()` options (custom CSS etc.) are silently ignored with the Fastify adapter. The UI will work; cosmetic customisation will not. Acceptable for a dev tool.

---

## M2 — Controller annotations

Once M1 is confirmed working, add thin metadata to each controller. No schema changes — just descriptive decorators.

### Imports needed in each controller

```typescript
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
```

### `chat.controller.ts`

```typescript
@ApiTags('chat')
@Controller('chat')
export class ChatController { ... }
```

Per-route annotations:

| Route | Decorators |
|---|---|
| `POST /chat/query` | `@ApiOperation({ summary: 'Submit a query (non-streaming)' })` + `@ApiResponse({ status: 200, description: 'RAG answer with sources' })` |
| `POST /chat/query/stream` | `@ApiOperation({ summary: 'Submit a query — SSE stream' })` + `@ApiProduces('text/event-stream')` + `@ApiResponse({ status: 200, description: 'Server-sent events stream. Connect via EventSource, not fetch.' })` |
| `POST /chat/query/voice` | `@ApiOperation({ summary: 'Submit a voice query' })` + `@ApiConsumes('audio/webm', 'audio/ogg', 'audio/wav')` + `@ApiQuery({ name: 'sessionId', required: true })` |
| `GET /chat/sessions` | `@ApiOperation({ summary: 'List sessions' })` + `@ApiQuery({ name: 'limit', required: false })` |
| `GET /chat/sessions/:sessionId` | `@ApiOperation({ summary: 'Get session with history' })` |
| `DELETE /chat/sessions/:sessionId` | `@ApiOperation({ summary: 'Delete session' })` |
| `POST /chat/synthesize` | `@ApiOperation({ summary: 'Text to speech' })` + `@ApiProduces('audio/wav')` |

### `analytics.controller.ts`

```typescript
@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController { ... }
```

Add `@ApiOperation` per route with a one-line summary. No special handling needed.

### `pipeline.controller.ts`

```typescript
@ApiTags('pipeline')
@Controller('pipeline')
export class PipelineController { ... }
```

Add `@ApiOperation` per route. Worth noting in descriptions that these are data ingestion ops — not for end users.

### `system.controller.ts`

```typescript
@ApiTags('system')
@Controller('system')
export class SystemController { ... }
```

Add `@ApiOperation` per route.

---

## Known edge cases

**SSE endpoint** (`POST /chat/query/stream`): OpenAPI cannot model SSE event streams. Document it as returning `text/event-stream` with a clear description. Do not try to describe the event schema in the spec — just note "see `StreamEvent` type in source".

**Voice endpoint** (`POST /chat/query/voice`): Raw binary body with `Content-Type: audio/webm` etc. Use `@ApiConsumes` to list accepted MIME types. Add `@ApiBody({ schema: { type: 'string', format: 'binary' } })` so the UI shows a file upload field.

**TypeBox schema gaps**: If any TypeBox construct doesn't reflect correctly (e.g. `Type.Literal`, `Type.Union`), fall back to an inline `@ApiProperty()` on just that field. The patch handles most standard shapes.

---

## What is explicitly not in scope

- Exporting `openapi.json` as a CI artifact
- Serving docs in production
- Client SDK generation from the spec
- Auth decorators (`@ApiBearerAuth` etc.) — no auth on the API yet

---

## References

- [`projects/api/src/main.ts`](../projects/api/src/main.ts) — where M1 changes land
- [`projects/api/src/dto/query.dto.ts`](../projects/api/src/dto/query.dto.ts) — TypeBox schemas being reflected
- [`nestjs-typebox` — `patchSwagger` option](https://github.com/jayalfredprufrock/nestjs-typebox)
- [`@nestjs/swagger` docs](https://docs.nestjs.com/openapi/introduction)
- [`@fastify/swagger-ui`](https://github.com/fastify/fastify-swagger-ui) — required for Fastify (separate from `@fastify/swagger`)


## User note

When you're ready to implement, start with M1 and verify the UI shows all 4 controllers with QueryRequestSchema fields before touching any controller annotations.