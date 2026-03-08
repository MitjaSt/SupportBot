# PRD: Chat / Admin Frontend Separation

> Status: Draft | Version: 0.1 | Author: via /prd

## Problem

The single frontend app serves both the public chat interface (macular degeneration patients) and internal admin tooling (data scientists). Every public user downloads admin page code and sees admin nav items in the sidebar — creating UX noise for low-vision users and an unprotected admin surface. The two audiences have conflicting design requirements that will increasingly pull against each other as both surfaces grow.

## Context

- Single Vite 7 app at `projects/frontend/`, one `index.html`, one bundle.
- Admin routes (`/admin/analytics`, `/admin/knowledge-base`, `/admin/system-prompt`, `/admin/chunk-inspector`) are mounted in the same React Router tree as chat routes.
- `SessionSidebar` renders admin nav items unconditionally — every public user sees them.
- No authentication exists anywhere in the stack yet. Auth via Zitadel is a planned but deferred workstream (`docs/AUTH_ZITADEL.md`).
- API admin endpoints are unprotected; their protection is out of scope here (Zitadel work).
- The `QueryDebugDialog` (retrieved chunks + full prompt view) lives in the chat codebase and is valued as an admin-only debug affordance within the chat UI.

## Assumptions

- Login will arrive eventually via Zitadel, but not imminently. The structure must anticipate it without blocking current development. _(High confidence)_
- The admin surface will not dramatically outgrow its current 4 pages before login lands. If it does, a full monorepo split (Direction C from the exploration) becomes the right move. _(Med confidence)_
- Data scientists access admin tools via the browser, not programmatically. _(Med confidence)_
- A lightweight `useAuth` hook reading from localStorage is an acceptable placeholder until Zitadel is integrated. _(High confidence)_

## User Journey

### Public user (chat)

1. Loads the chat app at `/`. No admin nav items in the sidebar.
2. Has a conversation. QueryDebugDialog is not visible.
3. No admin code is included in their downloaded bundle.

### Admin / data scientist

1. Loads the admin app at `/admin` (separate HTML entry, separate URL or subdirectory in production).
2. Sees the admin navigation: Analytics, Knowledge Base, System Prompt, Chunk Inspector.
3. When navigating to the chat view as an admin, the `QueryDebugDialog` renders automatically alongside responses — no button needed.

### Pre-login placeholder (current)

Until Zitadel is wired in, "admin" is detected via a flag in localStorage (`adminMode=true`). This is a dev convenience, not a security control — the API endpoints remain the real boundary (Zitadel work).

## Goals

- [ ] Admin pages and their code are absent from the public chat bundle.
- [ ] Public users see no admin nav items or affordances.
- [ ] The chat app conditionally shows `QueryDebugDialog` automatically when an admin flag is present — no toggle button.
- [ ] Admin app is independently buildable and deployable.
- [ ] A `useAuth` hook provides a stable interface so that swapping in Zitadel later is a single-file change, not a codebase-wide refactor.

## Non-goals

- API endpoint authentication (tracked in `docs/AUTH_ZITADEL.md`).
- Full login UI or Zitadel integration.
- Monorepo tooling (Turborepo, pnpm workspaces) — not needed at this scale.
- Moving the project to a different directory structure beyond what is described here.

## Options considered

Evaluation criteria: implementation effort · admin code isolation · auth extensibility · disruption to existing dev workflow

### Option A: Route guards in same app
**What:** Add `<RequireAuth>` wrapper around `/admin/*` routes; hide admin nav items when not authed. One bundle, one build.
**Pros:** Minimal change; no structural reorganisation needed; fast to implement.
**Cons:** Admin code still ships to all public users; requires auth state in a shared app that currently has none; accessibility noise is fixed but admin bundle exposure is not.
**Effort:** Low

### Option B: Two Vite entry points — same codebase, two bundles _(recommended)_
**What:** Add `admin.html` and `src/admin.main.tsx` alongside the existing `index.html` and `src/main.tsx`. Configure `vite.config.ts` with `rollupOptions.input` pointing at both HTML files. Each entry imports only its own pages. Shared utilities (`api/client.ts`, `types/`, hooks) are naturally shared at the source level — no package extraction needed.
**Pros:** Admin code completely absent from public bundle; shared code stays in one place with no tooling overhead; natural migration path to full monorepo later; aligns with Vite's official MPA pattern.
**Cons:** Two dev servers or one config that serves both; build output structure changes slightly (two HTML roots in `dist/`).
**Effort:** Low-Medium

### Option C: Two apps in the monorepo
**What:** Split into `projects/apps/chat` and `projects/apps/admin`, extract shared code into `projects/packages/ui`, `projects/packages/api-client`, `projects/packages/hooks`. Use pnpm workspaces.
**Pros:** Strongest isolation; independent CI; cleanest long-term architecture.
**Cons:** Significant setup overhead now; premature at 4 admin pages; adds tooling the team hasn't needed yet.
**Effort:** High

## Recommended approach

**Choice:** Option B — Two Vite entry points

Achieves the key outcomes (no admin code in the public bundle, clean audience separation, independent deployability) with minimal structural disruption. Vite's `rollupOptions.input` MPA mode is well-supported and requires no new tooling. The `useAuth` hook abstraction makes the Zitadel swap a clean single-point change. If the admin surface grows substantially, Option C is a natural next step that doesn't require a rewrite.

## Failure modes

- **Auth flag forgotten in localStorage:** An admin leaves `adminMode=true` on a shared machine and a patient sees the debug view. Mitigation: session-scoped flag (sessionStorage) rather than localStorage; or make the flag only effective in non-production environments.
- **Shared source file imported only in admin bundle breaks chat build:** A careless import of an admin-only dependency into a shared utility pulls it into the chat bundle. Detection: bundle size analysis in CI (`vite-bundle-visualizer` or `rollup-plugin-visualizer`). Mitigation: keep admin-only imports strictly within `src/admin*` files.
- **Two dev servers confusing developers:** Running both chat and admin simultaneously requires either two ports or a combined config. Mitigation: provide `dev:chat` and `dev:admin` npm scripts with distinct ports; document in README.

**Detection:** Bundle size regression check in CI catches admin code leaking into chat bundle.

**Fallback:** If the two-entry approach causes build complexity, revert to Option A (route guards) which is a smaller change and still removes the sidebar noise.

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| Macular degeneration patient | Admin nav items visible in sidebar (confusing, extra screen reader noise) | Clean sidebar with session list only |
| Screen reader user | Must skip past "Retrieval Analytics", "Chunk Inspector" on every page load | Those items simply do not exist in the chat app |
| Data scientist | Admin tools accessible to anyone who knows the URL | Admin app is a separate bundle; unrelated to public chat |
| Developer | No clear boundary between chat and admin code | File structure enforces the separation at import time |

_Note: Removing admin nav items from the chat sidebar directly reduces cognitive load and screen reader noise for macular degeneration users. This is a meaningful accessibility improvement, not just a code organisation concern._

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `useAuth` placeholder (localStorage) treated as real security | Med | High | Document clearly it is a dev convenience; Zitadel integration is the security boundary |
| Admin bundle inadvertently grows the chat bundle via shared imports | Low | Med | Bundle analysis in CI |
| Two entry points complicate Docker/nginx routing in production | Low | Med | Serve both from same nginx with path-based routing; admin at `/admin/` prefix |
| Vite MPA build output structure changes break existing deployment | Low | Low | Verify `dist/` layout in a spike before committing |

## Technical overview

### What changes

**Frontend** (`projects/frontend/`):

- `vite.config.ts` — add `build.rollupOptions.input` with `{ chat: 'index.html', admin: 'admin.html' }`; add second dev server config or combined mode
- `admin.html` — new HTML entry for admin app (mirrors `index.html` but points to `src/admin.main.tsx`)
- `src/admin.main.tsx` — new entry point, mounts `<AdminApp>`
- `src/AdminApp.tsx` — new root component, contains only `/admin/*` routes and admin-specific layout (no `SessionSidebar`)
- `src/App.tsx` — remove all `/admin/*` routes; chat-only routes remain
- `src/components/SessionSidebar.tsx` — remove admin nav items entirely
- `src/hooks/useAuth.ts` — new hook; reads `adminMode` from sessionStorage; returns `{ isAdmin: boolean }`. Interface stable for Zitadel swap.
- `src/components/ChatView.tsx` — import `useAuth`; render `QueryDebugDialog` automatically when `isAdmin === true`, removing any existing manual trigger
- `package.json` — add scripts: `dev:chat`, `dev:admin`, `build:chat`, `build:admin`, `build` (runs both)

**Infrastructure:**

- Nginx / static serving: admin app served from `/admin/` path prefix or a separate subdomain. `admin.html` maps to that route. TBD — requires deployment decision.

**No API changes.** No schema changes. No new dependencies.

### Key decisions needed before implementation

- ~~How is the admin app served in production?~~ **Decided: same domain, path prefix `/admin/` on the same nginx instance.** Vite admin build uses `base: '/admin/'`. Nginx routes `/admin/*` to `admin.html`, everything else to `index.html`.
- ~~sessionStorage vs localStorage for the auth flag?~~ **Decided: localStorage.** Persists across tabs and browser restarts, convenient for dev use. Clearly documented as a non-security placeholder.

### Security considerations

The `useAuth` hook is a UX placeholder, not a security control. It gates UI rendering only. The real security boundary is API-level auth via Zitadel (separate workstream). This must be clearly documented in code comments on the hook to prevent future contributors from treating it as authoritative.

Admin code being in a separate bundle reduces the attack surface available to a public user, but the admin app itself is a static file that anyone with the URL can load. Until API endpoints are protected, the separation is a UX and code organisation improvement, not a security guarantee.

### Observability

No new metrics or traces needed. The chat app's existing session and streaming telemetry is unaffected. Admin pages already query existing API endpoints.

## Success metrics

### User metrics
- Admin nav items no longer appear in any screen reader traversal of the chat interface.

### System metrics
- [ ] Chat bundle size does not include any admin page code (verified via bundle analyser).
- [ ] Both apps build successfully in CI (`npm run build`).
- [ ] Chat app loads and functions identically to pre-split behaviour.

### Business metrics
- Admin tooling is independently deployable — enables future access control to be applied at the deployment level (e.g., internal network only) before Zitadel lands.

## Milestones

| # | Milestone | Scope |
|---|-----------|-------|
| M1 | Structural split | Add `admin.html`, `src/admin.main.tsx`, `AdminApp.tsx`; update `vite.config.ts`; strip admin routes from `App.tsx`; remove admin nav from `SessionSidebar` |
| M2 | Auth hook + debug view | Add `useAuth` hook; wire `QueryDebugDialog` auto-show in `ChatView` based on `isAdmin`; document placeholder behaviour |
| M3 | Build & dev scripts | Add `dev:chat`, `dev:admin`, `build:chat`, `build:admin` npm scripts; verify production build output; update README |

**Rollback plan:** All changes are additive except the removal of admin routes from `App.tsx` and sidebar items from `SessionSidebar`. If the split causes problems, revert those two files and delete the new admin entry files. No database or API changes to undo.

## Rejected ideas

- **Separate monorepo (Direction C)** — rejected because tooling overhead is disproportionate at the current scale of 4 admin pages; revisit if admin surface exceeds ~10 pages.
- **Just hide the sidebar nav items (Direction D)** — rejected because it solves only visual noise, not bundle exposure or structural separation.
- **Route guards only (Option A)** — rejected because admin code still ships to public users and the problem recurs as admin tooling grows.

## Open questions

_All resolved. No blockers to implementation._

1. ~~**Production serving**~~ — **Resolved:** Same domain, `/admin/` path prefix, same nginx. Vite `base: '/admin/'` for admin build.
2. ~~**sessionStorage vs localStorage**~~ — **Resolved:** localStorage. Documented as non-security placeholder.

## References

- Explore brief: `docs/explore/2026-03-08-chat-admin-separation.md`
- ADR-006 (frontend architecture): `docs/adr/006-frontend.md`
- Auth plan: `docs/AUTH_ZITADEL.md`
- Existing files: `projects/frontend/src/App.tsx`, `projects/frontend/src/components/SessionSidebar.tsx`, `projects/frontend/src/components/QueryDebugDialog.tsx`, `projects/frontend/vite.config.ts`
- Vite MPA build docs: https://vite.dev/guide/build

---

## PRD self-critique

- **Riskiest assumption:** That login arrives before the admin surface grows complex enough to need proper auth gating. If admin pages accumulate business logic over 6+ months without Zitadel landing, the localStorage placeholder will quietly become load-bearing — people will forget it's a placeholder.
- **Most fragile part of the design:** The `useAuth` hook interface. If Zitadel integration turns out to need async token fetching (OAuth flow, token refresh), a synchronous `{ isAdmin: boolean }` hook is insufficient and the interface will need to change in both apps simultaneously.
- **Highest long-term impact decision:** Whether the admin app is served from a path prefix or a separate origin. This is easy to decide now and hard to change later (it affects cookies, CORS, API headers, and eventual Zitadel callback URLs).
- **What's missing:** The PRD doesn't address what happens to the admin app's SessionSidebar equivalent — does the admin app have its own session browsing capability, or is session management chat-only? Worth clarifying before M1 implementation.
