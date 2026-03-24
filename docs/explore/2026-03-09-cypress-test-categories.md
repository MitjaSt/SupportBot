# Exploration: Cypress Test Categories — User + Admin Frontend

> Stage: Explore | Date: 2026-03-09
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Define what Cypress tests to write across the user chat frontend and admin frontend, and how to split them across smoke (CI, every PR) and regression (release gate) tiers.

---

## Prior work

- `docs/explore/2026-03-08-e2e-testing-pipeline.md` — explored Playwright vs mock strategies, concluded with Direction C+D (tiered: mocked smoke, real-but-cheap regression). **That doc recommended Playwright.** The current direction is Cypress. The test categories are tool-agnostic; the tool choice may need a decision record if Cypress is confirmed.
- `docs/TESTING_STRATEGY.md` — Layer 3 names four E2E specs: `chat.e2e.ts`, `voice.e2e.ts`, `contact-collection.e2e.ts`, `admin.e2e.ts`. None implemented.

---

## Problem interpretations

### Interpretation A: CI confidence gap

Every PR runs lint + typecheck. Nothing verifies the app boots, renders, or accepts a message. A broken deploy is discovered in production, in front of users who depend on the interface for health information and have low or no central vision. Smoke tests close this gap with a sub-60s gate.

### Interpretation B: Release fragility

Changes to the admin frontend (analytics, KB explorer, system prompt), the auth flow (Zitadel PKCE), and the SSE streaming path accumulate without any automated check. A regression tier run before each release gives confidence that nothing critical broke across the sprint.

### Interpretation C: Golden path drift

The "golden path" — the most important user interaction end-to-end — risks drifting silently. A user with macular degeneration opens the app, asks a question, gets a streamed answer. If that breaks, the product has failed its primary user. A small set of fixture-anchored golden tests locks this flow in place.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Macular Society helpline users | Regression breaks chat | Discovered post-deploy | High |
| Admin staff (analytics, KB review) | Admin UI breaks on release | Manual check | Med |
| Developer pushing a change | No automated browser-level check | Manual smoke in browser | Med |
| Release manager | No automated gate before deploy | Trust in CI typecheck only | Med |

_Low-vision users are the primary beneficiaries of catching regressions. An ARIA label removed or a focus trap broken is functionally equivalent to a hard crash for a screen-reader user._

---

## Why now

- Auth (Zitadel PKCE) and admin frontend are newly built — the window before they calcify is the lowest-cost time to add coverage.
- CI today: lint + typecheck only. Cypress is the natural next quality gate.
- The test categories are stable enough to define before writing a single spec.

---

## Existing solutions

**Internal:**
- `docs/TESTING_STRATEGY.md` lists four E2E specs but implementation is at zero.
- No Cypress or Playwright config exists in the repo.
- The prior exploration recommended Playwright; if Cypress is confirmed, a lightweight ADR is worth writing.

**External:**
- Cypress supports `cy.intercept()` for SSE stubbing. SSE is the streaming mechanism used; `cy.intercept()` can return a chunked body via `StaticResponse` with `body` as a string of SSE events — sufficient for smoke-tier mocking.
- `@cypress/grep` plugin — tag tests `@smoke` / `@regression` / `@golden`, run subsets per pipeline stage without separate config files.
- `cypress-axe` — axe-core assertions inside Cypress tests. Critical for this population. One `cy.checkA11y()` call per page covers the accessibility gate.
- Zitadel auth in Cypress: `cy.session()` to cache the PKCE token across tests; `cy.origin()` for cross-origin login redirects. The admin frontend requires this to be solved before any admin tests can run.

---

## Possible directions

### Direction A: Smoke only (pragmatic start)

Write 5–8 smoke tests covering the absolute critical paths. Run on every PR. No regression suite yet — add it when there are enough flows to justify it. Fastest path to having any automated browser coverage.

### Direction B: Smoke + regression from the start

Define both tiers now, even if regression starts thin. The separation disciplines which tests belong where and prevents smoke from becoming a slow monolith. Regression runs on the `develop → main` PR only.

### Direction C: Three-tier — smoke / golden / regression

Add a `@golden` tag for 2–3 fixture-anchored tests of the most critical user journey (open app → send message → read streamed response). Golden tests run in both smoke and regression. Smoke = golden + critical render checks. Regression = everything.

---

## Terminology clarification

| Term | Meaning in this project |
|------|------------------------|
| Happy path | Any test using valid inputs, no errors expected. Most tests are happy path. |
| Golden path | The single most important user flow, end-to-end. Tagged `@golden`. A subset of happy paths. |
| Smoke | Fast gate (< 60s), runs on every PR. Catches build-breaking regressions. Happy path + golden path only. |
| Regression | Comprehensive gate (< 10 min), runs before release. Includes error states, edge cases, auth, accessibility. |

---

## Test matrix

### User frontend (chat, port 5173)

| Test | Category | Tier | Notes |
|------|----------|------|-------|
| App loads — chat UI renders without errors | happy | smoke | axe scan included |
| Send a message — streaming response appears in the message list | **golden** | smoke + regression | SSE mocked in smoke; real (cheap model) in regression |
| Response is readable — text renders, not raw SSE tokens | golden | smoke + regression | Checks streaming parser, not just network |
| Send follow-up — conversation history maintained | happy | regression | Session continuity |
| New session — sidebar shows prior session | happy | regression | SessionSidebar rendering |
| Pinned session — survives page reload | happy | regression | localStorage persistence |
| Keyboard navigation — Tab/Enter/Escape work throughout | happy | smoke | Critical for low-vision users |
| axe-core scan — zero critical/serious violations | a11y | smoke + regression | `cypress-axe` |
| Voice: mic button activates, recording state shown | happy | regression | Audio mocked via `cy.stub(navigator.mediaDevices, 'getUserMedia')` |
| Voice: transcription appears in input field | happy | regression | Whisper HTTP call stubbed |
| Contact collection: phone prompt appears, form shown | happy | regression | Triggered via message phrase |
| Contact collection: email step follows phone | happy | regression | Full state-machine traversal |
| XSS payload in input — not executed | security | regression | `<script>` tag inert in rendered output |
| Empty session history — no crash, empty state shown | edge | regression | |
| Very long message — send button still accessible, input not broken | edge | regression | |

### Admin frontend (port 5174, Zitadel PKCE auth required)

| Test | Category | Tier | Notes |
|------|----------|------|-------|
| Login redirect — unauthenticated user lands on Zitadel | auth | smoke | `cy.origin()` for cross-origin |
| Login flow — authenticated user reaches admin shell | **golden** | smoke + regression | PKCE flow via `cy.session()` |
| Admin shell renders — nav links present, no JS errors | happy | smoke | axe scan included |
| Analytics page loads — charts visible, no loading spinner stuck | happy | smoke | Assert chart containers exist |
| Knowledge base explorer — search returns results for a known term | happy | regression | Fixture term known to exist in vector DB |
| Chunk inspector — click a result, detail panel shown | happy | regression | |
| System prompt page — current prompt displayed, edit form present | happy | regression | |
| Logout — redirects to Zitadel, admin shell no longer accessible | auth | regression | Session invalidation |
| Unauthenticated access to admin route — redirected, not 404 | auth | smoke | `RequireAuth` guard working |
| axe-core scan — admin shell passes | a11y | smoke + regression | `cypress-axe` on each page |

---

## Hard problems

- **SSE streaming in Cypress.** `cy.intercept()` can return a static body string of SSE-formatted events (`data: ...\n\n`). This does not simulate chunked delivery — the browser receives it as a single response. For the golden path test, this may cause the streaming animation to differ from production. Mitigation: assert final rendered content, not the typing animation.
- **Zitadel PKCE in CI.** The auth flow redirects to `localhost:8080` (Zitadel). In CI, Zitadel must be running (Docker Compose). `cy.session()` caches cookies/tokens across tests in the suite, but the initial login requires a real Zitadel instance or a stub. A programmatic token exchange (bypass UI login in CI using a test PAT or a direct token endpoint call) is cleaner.
- **Admin test isolation.** Admin pages display real DB data (analytics, KB chunks). Tests asserting specific content require either seeded fixture data or assertions on shape (e.g., "at least one row exists") rather than exact values.
- **Two origins in one test.** The admin login redirects to Zitadel (`localhost:8080`) then back to `localhost:5174`. Cypress requires `cy.origin()` for cross-origin interactions — adds complexity to the login test.
- **Voice recording without hardware.** Headless CI has no audio device. `navigator.mediaDevices.getUserMedia` must be stubbed via `cy.stub()`. Tests only verify the UI state machine, not the audio pipeline.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does `cy.intercept()` with a static SSE body cause the frontend SSE parser to behave correctly? | Determines if smoke-tier streaming test is valid or just checks rendering with a fixture response | Spike: write one test, inspect how `ReadableStream` parsing behaves with a single-chunk response |
| Can `cy.session()` cache a Zitadel PKCE token across admin tests reliably? | If not, every admin test triggers a full login redirect — slow and fragile | Spike: implement `cy.session()` with a programmatic token exchange against the test Zitadel instance |
| Should Cypress run against the dev server or a built prod bundle? | Dev server is faster to start; prod bundle catches build-only issues (tree-shaking, chunking) | Decision: start with dev server; add prod-bundle test job before v1 release |
| How long does the Docker Compose stack (API + Postgres + Zitadel) take to be healthy in CI? | If >90s, it dominates smoke test runtime | Measure: time `docker compose up --wait` on a cold GitHub Actions runner |
| Is there a Cypress plugin for `@cypress/grep` that supports multiple tags (`@smoke AND @golden`)? | Determines how finely the matrix can be sliced per pipeline stage | Check `@cypress/grep` docs — it supports `--env grep=@smoke,@golden` with AND/OR logic |

---

## Promising direction

**Direction C** — three-tier with `@golden`, `@smoke`, `@regression` tags via `@cypress/grep`.

The golden path (2–3 tests across both frontends) runs in every tier and is the canonical health check. Smoke is golden + critical render + auth redirect + axe scan, targeting under 60s. Regression is the full matrix, running on `develop → main` merges.

Cypress is a reasonable choice given the team's likely familiarity. The one risk is SSE streaming fidelity in the golden path test — worth a 30-minute spike before committing.

The admin auth spike (Zitadel in CI + `cy.session()`) is the hardest unknown and should be de-risked before writing any admin regression tests.
