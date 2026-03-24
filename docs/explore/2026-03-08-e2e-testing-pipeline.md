# Exploration: E2E Testing and CI Pipeline

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Add Playwright E2E tests covering the full chat/voice/contact flows with a CI pipeline that avoids live LLM calls to control cost.

---

## Problem interpretations

### Interpretation A: Deployment confidence gap

We can lint and typecheck in CI today, but have no automated check that the full stack — frontend SSE streaming, NestJS API, PostgreSQL, voice services — works together after a change. A regression in the chat streaming handler, session sidebar, or contact collection flow can merge undetected. The cost is a broken deploy discovered only in production, in front of users who already have reduced vision.

### Interpretation B: Ratchet against LLM cost sprawl

LLM eval scenarios exist (`test:scenarios`, `test:ragas`) but are blocked from CI because they are expensive. There is no lighter substitute that exercises the API→OpenAI→SSE→frontend pipeline without spending real tokens. Without a gating test, any API change that silently corrupts the streaming format or breaks SSE parsing goes unnoticed.

### Interpretation C: Accessibility regression channel

The frontend has 0% test coverage and no accessibility assertions in CI. For macular degeneration users who rely on screen readers and keyboard navigation, a visual-only regression (focus trap, ARIA label removed, colour contrast breakage) is functionally breaking. E2E tests with axe-core assertions are the only practical way to catch these automatically.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Macular Society help-line users | Breaking change merges silently | None — discovered post-deploy | High |
| Developer pushing a frontend change | No E2E gate before merge | Manual smoke test in browser | Med |
| Developer adding an API handler | Integration tests partially cover it, but SSE path and browser rendering are unchecked | Manual QA in dev environment | Med |
| CI/CD budget owner | Eval tests cost real money every run | Eval tests blocked from CI entirely | Med |

_Low-vision and screen-reader users are the primary end-users. An E2E regression catching a broken ARIA label before deploy directly serves this population._

---

## Why now

- TESTING_STRATEGY.md already designates `e2e/` at the repo root and lists 4 E2E specs to write — the scaffolding decision is made, execution is missing.
- CI today only has lint + typecheck. The next natural quality gate is E2E.
- The voice pipeline (Whisper + Piper) is new and fragile. No automated test touches it yet.
- The contact-collection flow involves OpenAI tool-calling, which has real cost implications if triggered in every test run without mocking.

---

## Existing solutions

**Internal:**
- `docs/TESTING_STRATEGY.md` describes the E2E layer (Layer 3) and names the 4 spec files. Nothing is implemented yet.
- `.github/workflows/lint.yml` — lint + typecheck only, no test execution.
- `test:scenarios` / `test:ragas` — LangWatch/Ragas eval harness. Blocked from CI due to cost. Not the right tool for UI E2E.
- API integration tests with `@nestjs/testing` — cover HTTP endpoints but not the browser side.

**External:**
- **Playwright** (`@playwright/test`) — cross-browser, SSE-compatible, first-class TypeScript, `page.route()` for network interception. The stated tool of choice.
- **MSW (Mock Service Worker)** with `setupServer()` — intercepts outgoing Node.js HTTP calls at the NestJS level, meaning OpenAI calls can be stubbed without changing application code.
- **HAR recording** (`page.routeFromHAR()`) — record real SSE streaming responses once, replay in CI. Solves the "mocking SSE is hard" problem.
- **Cline's e2e approach** (referenced by user) — pattern: a dedicated `e2e.yml` workflow, Docker Compose to spin up services, environment variable injection, Playwright run, artifact upload on failure. Key cost pattern: no LLM calls in CI — all AI responses mocked at the network layer.
- **axe-core / `@axe-core/playwright`** — in-test accessibility assertions. Integrates directly with Playwright page fixtures.

---

## Possible directions

### Direction A: Mock-first E2E with Playwright route interception

Playwright intercepts all requests from the browser to the API at `page.route()`. For tests where the frontend sends to `/chat` and expects an SSE stream, the route handler returns a pre-recorded or hand-crafted SSE response fixture. The NestJS API never runs. Fast, cheap, zero infra needed beyond the frontend Vite dev server. Covers UI rendering, streaming parse, accessibility. Does not cover the API↔DB path.

### Direction B: Full-stack E2E with a mocked OpenAI layer

Spin up the real NestJS API + Postgres (Docker Compose) in CI. Inject a `OPENAI_BASE_URL` pointing to a lightweight mock server (e.g., `openai-mock` npm package or a small Fastify fixture server checked into the repo). The API runs real code paths — embedding, retrieval, prompt assembly, streaming — but the OpenAI call hits a local stub returning a fixed response. No tokens spent. Closest to production behaviour without cost.

### Direction D: Real but cheap — test-mode prompt + cheapest model

Use real OpenAI calls in CI, but switch the model to `gpt-4o-mini` and replace the production system prompt (~1k tokens) with a minimal test prompt (~50 tokens: `"You are a test assistant. Reply in one sentence."`). The API key is still needed but the cost is negligible — roughly $0.0002 per full regression run (~20 calls × ~100 tokens each at gpt-4o-mini pricing). At 1,000 CI runs per year: ~$0.20 total.

What this buys over a static mock server:
- Real SSE chunked streaming is tested — the frontend SSE parser runs against actual OpenAI wire format, not a hand-crafted fixture that could silently drift
- Tool-calling responses (contact collection) come back as structurally valid JSON from OpenAI — not a fixture that could be subtly wrong and never catch a tool-call parsing regression
- Real `text-embedding-3-small` calls exercise the embed→pgvector path (already cheap: $0.02/1M tokens)
- Zero fixture maintenance — no HAR files, no mock server to keep in sync with OpenAI API changes

Implemented via a single env var (e.g. `E2E_PROMPT_MODE=minimal`) that the RAG service reads to substitute prompt and model. No test-specific branching in production paths beyond this one toggle.

The one genuine risk: CI is now coupled to OpenAI availability. A transient OpenAI outage flakes the test run. Mitigated by retrying once and marking the run as "infrastructure failure" rather than a test failure.

### Direction C: Tiered E2E — smoke on every PR, regression on merge to main

Two workflows:
1. **Smoke** (every PR) — 3–5 Playwright tests, Direction A mocking (frontend only), ~30s runtime. Tests: app loads, message sends and streams, keyboard nav works, critical ARIA roles present.
2. **Regression** (merge to main / nightly) — 15–20 tests, Direction B (full stack, mocked OpenAI), ~5 min runtime. Tests: full chat flow, voice record→transcribe, contact collection, session history, security payloads, accessibility audit.

Evals (`test:scenarios`, `test:ragas`) remain off CI entirely and are run manually or on a schedule with a separate budget gate.

---

## Hard problems

- **Mocking SSE streams with Playwright.** `page.route().fulfill()` supports a `body` string — a multi-chunk SSE stream requires either HAR replay or a custom streaming response fixture. Playwright's `fulfill` does not natively support chunked streaming; a local mock HTTP server is the cleanest solution.
- **Voice testing in CI.** `voice.e2e.ts` requires mic input (getUserMedia) and audio playback. Browsers in CI are headless and have no audio device. Workaround: mock `getUserMedia` and stub the Whisper + Piper HTTP calls. But this only tests the UI state machine, not the audio pipeline itself.
- **Contact collection requires tool-calling.** The OpenAI function-calling response format must be precisely correct or the state machine stalls. The mock server for Direction B must return valid `tool_calls` JSON in the SSE format, not just plain text.
- **DB isolation is required to enable parallelism, not to avoid it.** Playwright runs tests in parallel by default and that should stay on — parallel execution exercises concurrent session handling that production requires. The constraint is isolation: each test must create its own session UUID and clean up after itself. Rate-limit counters (keyed by IP or session) are the main collision point; a dedicated test subnet or per-test session key avoids cross-test interference without serialising the suite.
- **Flakiness from streaming timing.** SSE responses arrive as multiple events. Playwright assertions need to wait for the streaming to complete, not just the first chunk. Naive `expect(locator).toHaveText()` will fail on partial content.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does `page.route().fulfill()` support chunked SSE body? | Determines if we need a mock HTTP server or can use Playwright natively | Spike: write a 2-line test that fulfills with `data: ...\n\n` chunks and observe browser behaviour |
| What does the CI runner hardware look like (RAM, CPUs)? | Affects whether Docker Compose (Direction B) is viable in GitHub Actions free tier | Check Actions runner specs; test a minimal docker-compose spin-up time |
| Is there an existing `openai-mock` or do we need to build one? | Determines setup cost for Direction B | Survey: `msw`, `openai-mock` npm packages; check if they support streaming chat completions |
| Direction D: does `gpt-4o-mini` reliably return `tool_calls` for the contact-collection trigger phrase? | If mini model doesn't invoke the tool, the contact-collection E2E flow can't be exercised cheaply | Quick manual test: send the contact trigger phrase to `gpt-4o-mini` with the contact tool schema and observe |
| What is the actual token count of the current production system prompt? | Establishes the ceiling for Direction D cost calculation | `tiktoken` count on `src/modules/rag/prompts/system.ts` |
| How long does the full NestJS boot take in CI? | Affects smoke test latency; if >30s it bloats every PR | Time `npm run start:prod` against a test database |
| Can axe-core pass against the current frontend as-is? | Sets baseline before we commit to accessibility assertions in CI | Run `npx @axe-core/cli http://localhost:5173` against dev server |

---

## Promising direction

**Direction C + D combined** — tiered pipeline where the regression tier uses real-but-cheap LLM calls instead of a mock server.

Smoke tier (every PR): Playwright `page.route()` intercepts — no API, no cost, ~30s. Covers UI render, streaming display, keyboard nav, axe scan.

Regression tier (merge to main): Full-stack Docker Compose (API + Postgres) with `E2E_PROMPT_MODE=minimal` injected. `gpt-4o-mini` + 50-token prompt. Cost: ~$0.0002/run. This is strictly better than a mock server for the regression tier: it tests real SSE wire format, real tool-call JSON, real embedding calls — with zero fixture maintenance overhead. The only thing it doesn't test is production prompt quality, which is already covered by the eval harness.

The key insight is the separation of concerns: E2E tests verify **plumbing** (does the stream reach the browser? does contact collection state machine advance?), not **quality** (is the answer good?). A cheap real call is sufficient for plumbing verification and costs less to maintain than a fake one.

---

## Test area map

| Area | Smoke (every PR) | Regression (main/nightly) |
|------|-----------------|--------------------------|
| App loads, chat UI renders | ✓ | ✓ |
| Send message → streaming response appears | ✓ (mocked SSE) | ✓ (real SSE, cheap model) |
| Session preserved in sidebar | — | ✓ |
| New session starts clean | — | ✓ |
| Voice: mic button activates, transcription shown | — | ✓ (stubbed audio) |
| Contact collection: phone/email flow | — | ✓ (real tool call, cheap model) |
| Keyboard navigation (Tab, Enter, Escape) | ✓ | ✓ |
| axe-core accessibility scan | ✓ | ✓ |
| XSS payload in chat → not executed | — | ✓ |
| Rate limiting: 429 shown in UI | — | ✓ |
| Admin: analytics page loads | — | ✓ |

---

## Golden vs happy path note

**Happy path** = the nominal flow for each area above.
**Golden tests** = a small set of fixture-driven tests that record a known-good interaction (HAR or fixture file) and assert the UI renders it identically. Useful for the streaming response display — if the rendering changes unexpectedly, the golden test fails. These are a form of snapshot testing at the E2E layer.

**Smoke = happy path only.** Regression includes error states, edge cases (empty history, expired session), and security payloads. Eval quality tests remain out of CI entirely.
