# Auth — Zitadel Implementation Plan

## Goal
Three user tiers with role-based access enforced at the NestJS API layer.
Roles delivered via JWT claims injected by Zitadel Actions (custom claims in token).

## User groups
| Group | Token | Access |
|---|---|---|
| Non-logged | No token | Public chat only; no debug chunks in response |
| `data_scientist` | JWT with custom claim | Analytics + knowledge base (read); no pipeline writes |
| `admin` | JWT with custom claim | Full access; debug chunks included in response |
| `support` | JWT with custom claim | Access to conversation history for users that submitten contact information via tool; |

---

## Phase 1 — Docker: Add Zitadel container (shares existing Postgres)
- [ ] Create `docker/docker-compose.zitadel.yml`
  - Zitadel init service (one-shot schema migration)
  - Zitadel main service pointing at `macular-postgres`, separate DB name (`zitadel`)
  - Expose port 8080
  - Add to `docker-compose.yml` includes
- [ ] Create `docker/zitadel/zitadel.yaml` config file
  - DB connection to `macular-postgres`
  - External domain / dev setup
- [ ] Verify Zitadel admin UI at http://localhost:8080
- [ ] Verify it does NOT affect `macular_society` database

## Phase 2 — Zitadel project & roles setup
- [ ] Create project `macular-society-api` in Zitadel admin UI
- [ ] Define roles: `admin`, `data_scientist`
- [ ] Create test users and assign roles
- [ ] Create an OIDC app (for future frontend login flow)
- [ ] Create M2M app (for service-to-service, e.g. pipeline calls)

## Phase 3 — Zitadel Action (custom claims)
- [ ] Write a Zitadel Action that maps project roles → flat `permissions` array in JWT:
  ```js
  // admin       → ["analytics:read", "analytics:write", "pipeline:read", "pipeline:write", "chunks:debug"]
  // data_scientist → ["analytics:read", "pipeline:read"]
  ```
- [ ] Register Action on `PreAccessTokenCreation` flow
- [ ] Verify token claims via JWT decode / Zitadel token introspection endpoint

## Phase 4 — NestJS integration
- [ ] Install: `@nestjs/passport`, `passport-jwt`, `jwks-rsa`
- [ ] Add `JwtAuthGuard` — verifies token against Zitadel's JWKS endpoint
- [ ] Add `PermissionsGuard` — reads `permissions` claim from JWT payload
- [ ] Add `@Permissions('analytics:read')` decorator for route-level enforcement
- [ ] Make auth optional on chat routes (public access preserved)
- [ ] Add response interceptor — strips debug chunks if `chunks:debug` not in claims

## Phase 5 — Route protection
- [ ] `GET /api/analytics/*` — require `analytics:read`
- [ ] `POST /api/pipeline/*` — require `pipeline:write`
- [ ] `GET /api/system/*` — require `admin` or IP-restrict
- [ ] `POST /api/chat/*` — public, but strip chunks unless `chunks:debug`

## Phase 6 — CloudBeaver connection update
- [ ] Confirm CloudBeaver can browse both `macular_society` and `zitadel` DBs on same Postgres instance

## Reference
- Zitadel Docker docs: https://zitadel.com/docs/self-hosting/deploy/docker
- Zitadel Actions: https://zitadel.com/docs/concepts/features/actions
- NestJS JWT guard pattern: https://docs.nestjs.com/security/authentication
