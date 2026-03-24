# Architecture: Zitadel Auth (API Layer)

> Stage: Architecture | Date: 2026-03-08 | Source: `docs/AUTH_ZITADEL.md`
> Pipeline: PRD → **Architecture** → QA → Plan

## Overview

Adds role-based authentication to the NestJS API using Zitadel as the OIDC/JWT provider. A new `AuthModule` introduces a JWKS-backed JWT guard and a permissions guard. Public chat endpoints remain unauthenticated; analytics, pipeline, and system endpoints are locked behind permission claims. An optional-auth interceptor conditionally strips debug chunks from chat responses for users without `chunks:debug`. Frontend is out of scope.

## PRD summary

- **Problem:** All API endpoints are currently unprotected. Admin tooling (analytics, pipeline) and debug response data are accessible to anyone who can reach the API.
- **Approach:** Zitadel issues JWTs with a custom `permissions` claim injected by a server-side Action. NestJS verifies the token via JWKS; guards enforce claim presence per route.
- **Key constraint:** `POST /chat/query` and `POST /chat/query/stream` must remain public — no JWT required. Authenticated admins calling these endpoints get debug chunks included; anonymous users don't.

---

## Hard problems addressed

| Problem | How the design solves it |
|---------|--------------------------|
| JWKS caching and key rotation | `jwks-rsa` with `cache: true` and `rateLimit: true`. Guard wraps key lookup in a try/catch: JWKS failure → 503 on protected routes, passthrough on optional-auth routes. Rotation is transparent — `jwks-rsa` re-fetches on unknown `kid`. |
| Optional auth with conditional response shaping | `JwtAuthGuard` runs in two modes: _required_ (throws 401 on missing/invalid token) and _optional_ (extracts user if token present, sets `request.user = null` otherwise, never throws). Chat routes use optional mode. The controller passes `req.user` into `ChatService.chat()` / `chatStream()`; the service conditionally includes chunk data based on `chunks:debug` permission. |
| Integration tests for protected routes without a live Zitadel | Protected routes in tests use NestJS `overrideGuard()` to inject a mock user. A `createTestUser(permissions)` helper in `test/helpers/auth.ts` returns a typed `AuthUser` object. The `JwtAuthGuard` itself is unit-tested in isolation with a controlled RSA keypair. Public chat routes need no change — all existing eval and integration tests are unaffected. |

---

## System diagram

```
Client (browser / test runner)
  │
  ├─ POST /chat/query[/stream]  (no token required)
  │    └─ JwtAuthGuard [optional] → sets req.user or null
  │         └─ ChatController → ChatService(user)
  │              └─ service omits chunks if user lacks chunks:debug
  │
  ├─ GET  /analytics/*          (requires analytics:read)
  │    └─ JwtAuthGuard [required] + PermissionsGuard
  │         └─ AnalyticsController
  │
  ├─ POST /pipeline/*           (requires pipeline:write)
  │    └─ JwtAuthGuard [required] + PermissionsGuard
  │         └─ PipelineController
  │
  └─ GET  /system/*             (requires chunks:debug i.e. admin)
       └─ JwtAuthGuard [required] + PermissionsGuard
            └─ SystemController

                    ↕ JWKS fetch (cached, TTL 10min)
              Zitadel :8080 (/.well-known/openid-configuration)
```

---

## Components

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `AuthModule` | Registers guards, decorators, and interceptor as module providers | New |
| `JwtStrategy` (passport-jwt) | Validates JWT signature via JWKS, extracts payload | New |
| `JwtAuthGuard` | Wraps `AuthGuard('jwt')` with optional-mode support via `@Public()` / `@OptionalAuth()` decorators | New |
| `PermissionsGuard` | Reads `permissions` from `req.user` and checks against `@Permissions(...)` decorator | New |
| `@Permissions(...perms)` | Route-level decorator that attaches required permission strings | New |
| `@OptionalAuth()` | Route-level decorator — tells `JwtAuthGuard` not to throw if token is absent | New |
| `@CurrentUser()` | Parameter decorator — injects `AuthUser \| null` from `req.user` | New |
| `ChatController` | Gains `@OptionalAuth()` on query routes; passes `@CurrentUser()` into service calls | Modified |
| `AnalyticsController` | Gains `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions('analytics:read')` | Modified |
| `PipelineController` | Gains `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions('pipeline:write')` | Modified |
| `SystemController` | Gains `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions('chunks:debug')` | Modified |
| `test/helpers/auth.ts` | `createTestUser(permissions)` helper for test modules | New |

---

## Data flow

### Protected route (e.g. `GET /analytics/retrieval`)

1. Request arrives with `Authorization: Bearer <token>`.
2. `JwtAuthGuard` calls `passport-jwt` strategy → `jwks-rsa` retrieves the signing public key for the token's `kid` from `https://zitadel:8080/oauth/v2/keys` (cached).
3. Strategy verifies signature + `exp` + `aud`; returns the decoded payload.
4. `PermissionsGuard` reads `payload.permissions` array; checks `analytics:read` is present.
5. `AnalyticsController` runs; response returned.

### Chat route — anonymous

1. Request arrives with no `Authorization` header.
2. `JwtAuthGuard` (optional mode) extracts no token → sets `req.user = null`, does not throw.
3. `ChatController` passes `user = null` into `ChatService.chat()` / `chatStream()`.
4. Service sees no user → omits chunk data from response.

### Chat route — admin with token

1. Request arrives with valid JWT containing `permissions: ["chunks:debug", ...]`.
2. Guard extracts and verifies token; sets `req.user = { sub, permissions }`.
3. Controller passes `user` into service.
4. Service sees `chunks:debug` in permissions → includes chunk data in response.

---

## Interfaces

```ts
// JWT payload shape after Zitadel Action injects permissions
interface ZitadelJwtPayload {
  sub: string;           // Zitadel user ID
  iss: string;           // https://zitadel:8080
  aud: string[];         // ["macular-society-api"]
  exp: number;
  permissions: string[]; // injected by Zitadel Action
}

// Normalised user object on request
interface AuthUser {
  sub: string;
  permissions: string[];
}

// JwtStrategy returns this; stored in req.user
type RequestUser = AuthUser | null;

// ChatService method signatures change to accept user context
interface ChatService {
  chat(sessionId: string, query: string, user: AuthUser | null): Promise<ChatResponse>
  chatStream(sessionId: string, query: string, user: AuthUser | null): AsyncGenerator<StreamEvent>
}
```

```ts
// Guard metadata keys
const PERMISSIONS_KEY = 'permissions';
const OPTIONAL_AUTH_KEY = 'optional_auth';

// Decorators
@Permissions('analytics:read', 'analytics:write')
@OptionalAuth()
@CurrentUser() user: AuthUser | null
```

---

## Configuration

New env vars:

| Variable | Example | Notes |
|----------|---------|-------|
| `ZITADEL_JWKS_URI` | `http://localhost:8080/oauth/v2/keys` | JWKS endpoint |
| `ZITADEL_ISSUER` | `http://localhost:8080` | Token `iss` must match |
| `ZITADEL_AUDIENCE` | `macular-society-api` | Token `aud` must include this |

These join `ConfigService`. No new npm packages required beyond `@nestjs/passport passport passport-jwt jwks-rsa`.

---

## Test strategy

### What does NOT change

All existing tests are unaffected:
- **Unit tests** — instantiate services directly, no guards involved.
- **Eval / scenario tests** — call `POST /chat/query` (public, optional auth). No token needed.
- **Future `chat.integration.test.ts`** — same: `/chat/query` and `/chat/query/stream` are public. No token.

### How to test protected routes

Use NestJS `overrideGuard()` in integration tests. This is the standard pattern — no live Zitadel needed.

```ts
// test/helpers/auth.ts
export function createTestUser(permissions: string[]): AuthUser {
  return { sub: 'test-user-id', permissions };
}

export function mockJwtGuard(permissions: string[]) {
  return {
    canActivate(ctx: ExecutionContext) {
      const req = ctx.switchToHttp().getRequest();
      req.user = createTestUser(permissions);
      return true;
    },
  };
}
```

```ts
// In an integration test for a protected route
const module = await Test.createTestingModule({ ... })
  .overrideGuard(JwtAuthGuard)
  .useValue(mockJwtGuard(['analytics:read']))
  .compile();
```

This gives you:
- Full `PermissionsGuard` behaviour tested (it still runs against `req.user`).
- `@CurrentUser()` decorator injects the mock user correctly.
- `ChatService` chunk-filtering tested by passing `null` vs a user with `chunks:debug`.

### Testing the guard itself

`JwtAuthGuard` and `JwtStrategy` are unit-tested in isolation:

```ts
// test/unit/jwt-auth.guard.test.ts
// Generate a real RS256 keypair inline:
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
// Sign a test JWT, mock jwks-rsa to return publicKey, assert guard accepts/rejects
```

This is the only place where JWT crypto runs in tests. All other tests skip it via `overrideGuard`.

---

## Failure handling

| Failure | Trigger | System response | User experience |
|---------|---------|----------------|-----------------|
| JWKS endpoint unreachable | Zitadel container down | `JwtAuthGuard` throws `ServiceUnavailableException` (503) on protected routes; optional routes pass through with `user = null` | Protected routes return 503; chat still works anonymously |
| Expired JWT | Token `exp` in the past | `passport-jwt` rejects; guard returns 401 | "401 Unauthorized" — client must refresh token |
| Missing `permissions` claim | Zitadel Action not registered or failed | `PermissionsGuard` sees empty array; throws 403 | "403 Forbidden" — admin investigates Zitadel Action setup |
| Token with wrong `aud` | M2M token or wrong project | `passport-jwt` rejects; 401 | "401 Unauthorized" |
| `chunks:debug` absent on chat call | Non-admin with valid token | Guard passes (optional auth); service omits chunks | Normal response without debug data |

---

## Observability

**Metrics:**
- `auth_jwt_verified_total` — counter, label `{result: success|failure}` — tracks JWT validation rate per deployment
- `auth_jwks_fetch_total` — counter, label `{result: hit|miss|error}` — detects JWKS availability issues

**Logs:**
- `WARN` on JWKS fetch failure (include `kid`, error message)
- `WARN` on JWT rejected (include reason, not token contents — never log token values)
- `DEBUG` on successful auth (sub, permissions)

**Alerts:**
- `auth_jwt_verified_total{result="failure"}` rate > 10/min sustained → alert (may indicate key rotation or attack)
- `auth_jwks_fetch_total{result="error"}` > 0 → alert (Zitadel unreachable)

---

## Security considerations

- **Token not logged:** The raw JWT string must never appear in logs. Log `sub` and `permissions` only after verification.
- **JWKS caching TTL:** 10-minute default balances performance with rotation responsiveness. Key IDs (`kid`) are checked per token — on unknown `kid`, the cache is bypassed and a fresh fetch is made immediately.
- **`aud` validation is mandatory:** Without it, a token issued for a different Zitadel project is accepted. Enforce `audience: config.zitadel.audience` in `JwtStrategy`.
- **`chunks:debug` in public chat:** Both chat endpoints (`/query` and `/query/stream`) are public — no token required. But an admin can optionally provide a token to receive debug chunks. Both endpoints handle this the same way: the controller passes `req.user` (or `null`) into the service method, and the service conditionally includes chunks in the response. Non-admins never receive chunk data on the wire. No interceptor or response header needed — the decision is made before any data is written.

---

## Migration plan

**Schema change required** — `sessions` table gains a nullable `userId` column:

```sql
ALTER TABLE sessions ADD COLUMN user_id text;
-- No NOT NULL: anonymous sessions remain valid, userId = null
```

```ts
// schema.ts addition
userId: text('user_id'),   // Zitadel sub — null for anonymous sessions
```

`SessionRepository.createSession()` accepts an optional `userId`. When chat is called with an authenticated token, the `sub` is stamped on session creation. Anonymous calls leave it null.

`GET /chat/sessions` filters `WHERE user_id = $sub` (requires login — users see only their own sessions). `GET /chat/sessions/:id` similarly requires the session's `userId` to match `req.user.sub`.

No other API breaking changes — existing unauthenticated calls to public chat routes continue to work. Protected routes return 401/403 for callers without tokens; since those are admin-only operations, this is expected.

Rollout order: Phase 1–3 (Zitadel setup) → Phase 4 (NestJS module merged behind feature flag or env var `AUTH_ENABLED=true`) → Phase 5 (route protection applied) → Phase 6 (CloudBeaver).

---

## Open technical questions

1. **`support` role endpoint shape** — `GET /chat/sessions` requires login and returns only the authenticated user's own sessions (scoped by `userId = sub`). The support role needs a separate endpoint (e.g. `GET /chat/consented-sessions`) that returns sessions where `collectionState = 'complete'` — users who explicitly submitted contact info. Needs route name and permission string decided before Phase 5.

2. **`TEST_AUTH_DISABLED` env flag** — consider a single env flag to disable all auth guards in development, making local dev without a running Zitadel frictionless. Distinct from the test `overrideGuard` approach (which is for automated tests only).
