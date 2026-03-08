# PRD: Evaluation Dataset Management & Python Eval Stack

> Status: Draft | Version: 0.1 | Author: AI/data team via /prd

## Problem

The RAG system has no dataset management layer. Evaluation data is either hardcoded inline in TypeScript test files (the RAGAS tests embed 80+ questions as raw arrays) or scattered across JSON files with no versioning. The data/AI team — who best understand which real helpline queries expose system weaknesses — cannot contribute to or evolve the eval corpus without writing TypeScript. Every retrieval or prompt change carries unquantifiable regression risk because no one can see what the eval suite covers and what it misses.

## Context

- API is NestJS/TypeScript on Fastify; evals test it as a black-box HTTP service, so language of the test runner is irrelevant to what's being tested.
- Existing RAGAS evals (`test/evals/ragas/*.test.ts`) call LangWatch's experiment API with raw data — they are not using native RAGAS Python metrics. Migration gives us the full RAGAS `TestsetGenerator` and metric suite.
- The closest thing to a dataset today is `test/evals/docs/agent_scenarios.json` — 50+ scenario definitions with `area`, `grounding_refs`, and `simulator_prompt`. This is the seed to build from.
- The `@langwatch/scenario` JS agent simulation framework is used for multi-turn judge evals. LangWatch does publish a Python SDK; whether it supports the scenario runner is an open question (see Open Questions).
- Python is already present in the repo (`docker/whisper/`, `docker/piper/`, `projects/prompt-guard/`). No Python project tooling exists yet.
- `uv` is the current standard for Python project management (fast, lock-file based, compatible with Docker).

## Assumptions

- Data scientists will write pytest and contribute JSON datasets; they will not write TypeScript. _(High confidence — stated requirement)_
- The LangWatch Python SDK supports dataset experiment runs with RAGAS metrics. _(Med confidence — SDK exists, extent of RAGAS integration needs validation)_
- RAGAS `TestsetGenerator` can generate acceptable-quality QA pairs from the scraped `.cache/json/` Macular Society documents without prohibitive cost. _(Med confidence — quality depends on document structure; needs spike)_
- Unit and integration TypeScript tests stay in TypeScript — only eval/quality tests move. _(High confidence)_
- The `@langwatch/scenario` multi-turn simulation tests remain in TypeScript until the Python SDK support is confirmed. _(High confidence as a starting assumption)_

## User Journey

**Data scientist adding a new eval dataset:**
1. Creates or edits a JSON file in `datasets/` following the schema (question, tags, difficulty, source-doc ref, optional expected-context).
2. Runs `make dataset-coverage` to see updated coverage map by topic area.
3. Opens a PR; CI checks schema validity and shows the diff in terms of added/removed/changed samples.
4. After merge, `make test-evals` picks up the new dataset automatically.

**Engineer shipping a RAG change:**
1. Runs `make test-evals` before opening a PR (or CI runs it automatically).
2. Gets a RAGAS score report (faithfulness, answer relevancy, context precision) against the pinned dataset version.
3. Score drop triggers a CI failure; engineer investigates before merging.

**Generating synthetic data to fill coverage gaps:**
1. Data scientist identifies underrepresented topic area via `make dataset-coverage`.
2. Runs `make dataset-gen TOPIC=benefits` — RAGAS `TestsetGenerator` reads relevant `.cache/json/` documents and produces candidate QA pairs.
3. Reviews generated samples in the output JSON, removes any unsuitable ones, moves the file to `datasets/`.

Edge cases:
- Generated QA pairs contain hallucinated context — human review step required before merge.
- API is down during eval run — pytest reports connection failure, not metric failure.
- Dataset file fails schema validation — CI blocks PR with a descriptive error.

## Goals

- [ ] Data/AI team members can add, edit, and review eval datasets in JSON without touching TypeScript.
- [ ] RAGAS faithfulness, answer relevancy, and context precision run natively in Python against the live API.
- [ ] `make dataset-coverage` prints a topic-area coverage map showing sample counts and gap areas.
- [ ] `make dataset-gen` generates synthetic QA candidates from source documents using RAGAS TestsetGenerator.
- [ ] Dataset files are versioned in git with a changelog field; CI validates schema on every PR.
- [ ] `make test-evals` is updated to run the Python eval suite (Makefile target re-pointed, CI job added).

## Non-goals

- Migrating `@langwatch/scenario` multi-turn simulations to Python (deferred until LangWatch Python SDK support is confirmed).
- Migrating TypeScript unit/integration tests — these test internals directly and stay in TypeScript.
- Building a UI for dataset management — files + CLI is sufficient for a small team.
- External SaaS dataset platforms (Braintrust, LangSmith datasets) — adds cost and data-leaving-environment risk for a charity.
- Human annotation workflows or labelling tooling.

## Options considered

Evaluation criteria: implementation effort · data scientist ergonomics · operational complexity · architecture fit

### Option A: File-based Python project with native RAGAS + uv
**What:** New `projects/evals/` Python project using `uv`. Datasets as versioned JSON files in `datasets/`. Pytest + native RAGAS for metrics. `make test-evals` updated to invoke pytest.
**Pros:** Full RAGAS feature set (TestsetGenerator, all metrics); data scientists work in Python and JSON; no new SaaS; clean separation from TypeScript codebase; uv is fast and already a known pattern in repo.
**Cons:** Second language in CI (adds a Python job); `@langwatch/scenario` simulations remain in TypeScript for now, so two eval runners co-exist temporarily.
**Effort:** Medium

### Option B: Enhance the TypeScript RAGAS tests with structured datasets
**What:** Keep everything in TypeScript; extract inline datasets into JSON files and import them; add a schema validator script.
**Pros:** No new language; no CI changes.
**Cons:** Data scientists still can't contribute without TypeScript knowledge; no native RAGAS TestsetGenerator; no coverage analysis; the inline-array pattern is already a known problem — this just tidies it, not fixes it.
**Effort:** Low

### Option C: External dataset platform (Braintrust)
**What:** Push datasets and runs to Braintrust for hosted versioning, diffing, and CI integration.
**Pros:** Best-in-class dataset diff UI; CI gates built in; no JSON schema to maintain.
**Cons:** ~$249/mo; data leaves the environment (sensitive for a charity handling helpline-adjacent queries); vendor dependency for a core quality process.
**Effort:** Low-Medium (integration) + ongoing cost

## Recommended approach

**Option A** — Python project with native RAGAS and file-based datasets.

It is the only option that both empowers the data/AI team with their native tooling and gives access to the full RAGAS ecosystem (TestsetGenerator for synthetic generation, complete metric suite). The temporary co-existence of TypeScript scenario tests is an acceptable trade-off; they are behind a separate `make test-scenarios` target and will migrate if/when the LangWatch Python SDK is confirmed to support them.

## Failure modes

- **Synthetic generation quality is too low** — RAGAS TestsetGenerator produces questions that don't match real helpline language or introduce hallucinated context. Mitigation: human review gate before any generated file lands in `datasets/`; only merge reviewed files.
- **Eval cost spikes** — Each RAGAS run calls OpenAI for metric computation. A large dataset run on every PR is expensive. Mitigation: CI runs evals on `main` merges only, not every PR; PR CI runs a small smoke subset (10 samples) with `@pytest.mark.smoke`.
- **Dataset drift from knowledge base** — Source documents update but datasets don't. Mitigation: Dataset files include a `source_version` or `generated_date` field; coverage CLI flags stale datasets.

**Detection:** LangWatch experiment tracking shows score trends over time; a drop of >5% across any RAGAS metric triggers a Slack alert (future work).

**Fallback:** If the Python eval job fails in CI (infrastructure issue, not score issue), the PR is not blocked — eval failures are warnings, not hard gates, until the system stabilises.

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| Data scientist | Cannot contribute eval cases without TypeScript; no coverage visibility | Python + JSON contribution path; coverage CLI shows gaps |
| Engineer shipping RAG changes | Eval corpus is opaque; no score baseline | Pinned versioned dataset; RAGAS score diff on each run |
| Future auditor / trustee | No evidence of systematic evaluation | Version-controlled dataset library + run history in LangWatch |

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LangWatch Python SDK doesn't support scenario runner | Med | Med | Scenario tests stay in TypeScript; confirmed before any migration attempt |
| RAGAS OpenAI eval cost too high at dataset scale | Med | Med | Smoke subset for PRs; full run only on main |
| Synthetic QA quality poor for medical domain | Med | High | Human review gate; spike before committing generation approach |
| Python CI job slows PR pipeline | Low | Low | `uv` is fast; eval job runs in parallel with typecheck job |

## Technical overview

### What changes

- **New: `projects/evals/`** — Python project with `pyproject.toml` (managed by `uv`). Contains:
  - `datasets/` — versioned JSON dataset files (checked into git).
  - `tests/` — pytest test files for RAGAS metric evals.
  - `scripts/generate.py` — RAGAS TestsetGenerator CLI.
  - `scripts/coverage.py` — coverage analysis CLI.
- **`datasets/` JSON schema** — Each file: `{ "version": "1.0", "area": "...", "generated_date": "...", "samples": [{ "id": "...", "question": "...", "tags": [...], "difficulty": "low|med|hard", "source_ref": "...", "expected_context": "..." }] }`. `expected_context` is optional (required for context precision/recall metrics, not needed for faithfulness/relevancy).
- **`make/testing.mk`** — `test-evals` target updated to `cd projects/evals && uv run pytest tests/`; existing `test-ragas` target removed or aliased.
- **`make/testing.mk`** — New targets: `dataset-gen`, `dataset-coverage`.
- **CI** — New Python job in GitHub Actions: `uv sync && uv run pytest tests/ -m smoke` on PRs; full suite on main.
- **API / Frontend** — No changes.
- **Infrastructure** — No changes. Evals run against local or staging API via `API_BASE_URL` env var.

### Key decisions needed before implementation

1. Does the LangWatch Python SDK's `scenario` module support the same multi-turn judge runner as `@langwatch/scenario` JS? If yes, `test-scenarios` can also migrate.
2. Which subset of dataset samples becomes the "smoke" set for PR CI (size, selection criteria)?
3. Should `generate.py` run fully automatically or require explicit human approval before writing to `datasets/`? (Recommend: writes to `datasets/generated/` for review, not `datasets/` directly.)

### AI considerations

**Model behavior:** RAGAS metrics use an OpenAI LLM as judge. Use a different model for judging than the one serving the API (currently gpt-4o for RAG; use a separate judge model configured via env var).

**Evaluation:** RAGAS faithfulness, answer relevancy, context precision. Thresholds TBD after baseline run — start by establishing a baseline before setting CI gates.

**Guardrails:** Generated synthetic QA files land in `datasets/generated/` and require human review before promotion to `datasets/`.

### Security considerations

Dataset files contain example queries from the macular disease helpline domain. They do not contain PII. Generated files are reviewed before merge. `OPENAI_API_KEY` and `LANGWATCH_API_KEY` used by evals are stored as GitHub Actions secrets and local `.env.secrets`.

### Observability

- RAGAS experiment runs logged to LangWatch (existing integration) — score history visible in LangWatch dashboard.
- Coverage CLI output added to CI job summary.
- No new Prometheus metrics (evals are not production traffic).

## Success metrics

### User metrics
- Data scientist can contribute a new dataset without engineer support within one session.

### System metrics
- [ ] `make test-evals` runs the Python RAGAS suite and exits non-zero on metric threshold failure.
- [ ] `make dataset-coverage` prints per-area sample counts in under 5 seconds.
- [ ] `make dataset-gen` produces a candidate JSON file from source documents without errors.

### Business metrics
- Eval coverage map used in quarterly AI quality review to demonstrate systematic testing.

## Milestones

| # | Milestone | Scope |
|---|-----------|-------|
| M1 | Python eval project skeleton | `projects/evals/` with `uv`, pytest, RAGAS installed; `make test-evals` wired to one smoke test against live API |
| M2 | Dataset library + schema | Migrate inline RAGAS datasets from TypeScript into `datasets/*.json`; schema validator in CI; `make dataset-coverage` |
| M3 | Native RAGAS eval suite | Port faithfulness + answer relevancy tests to Python pytest; LangWatch experiment logging working |
| M4 | Synthetic generation | `make dataset-gen` using RAGAS TestsetGenerator from `.cache/json/`; `datasets/generated/` review flow |
| M5 | CI integration | Python eval job in GitHub Actions; smoke subset on PRs, full suite on main merges |

**Rollback plan:** The Python eval project is additive — TypeScript tests remain intact throughout. If the Python project is abandoned, `make test-evals` is re-pointed back to the TypeScript runner. No destructive changes until M3 is stable.

## Rejected ideas

- **Braintrust / LangSmith datasets** — rejected due to SaaS cost and charity data policy concerns.
- **Keep everything in TypeScript** — rejected because it blocks data scientist contribution and forecloses native RAGAS TestsetGenerator.
- **Embed datasets in the API codebase** — rejected; evals are not production code and should not couple to the API's dependency graph.

## Open questions

1. Does the LangWatch Python SDK support `scenario.run()` with a user simulator and judge agent? This determines whether `test-scenarios` can also migrate to Python.
2. What threshold values for RAGAS metrics are acceptable for this medical domain? (Recommend: establish a baseline in M3, then set gates in M5.)
3. Should the dataset schema support `expected_answer` (for future ground-truth comparison), or is `expected_context` sufficient for now?

## References

- Existing code: `projects/api/test/evals/ragas/01-faithfulness.test.ts`, `02-vapi-answer-relevancy.test.ts`, `test/evals/docs/agent_scenarios.json`, `scripts/generate-tests-from-scenarios.ts`
- Docs consulted: `CLAUDE.md`, `docs/explore/2026-03-07-eval-dataset-management.md`
- External research: [Ragas docs — CI/Pytest integration](https://docs.ragas.io/en/latest/howtos/applications/add_to_ci/), [Ragas testset generation](https://docs.ragas.io/en/stable/getstarted/rag_testset_generation/), [Ragas evaluation dataset concepts](https://docs.ragas.io/en/stable/concepts/components/eval_dataset/)

---

## PRD self-critique

- **Riskiest assumption:** That RAGAS `TestsetGenerator` produces usable QA pairs from the `.cache/json/` Macular Society content. If the documents are too short, too list-heavy, or structurally unsuitable, synthetic generation will require significant prompt engineering to be useful. This should be validated in a spike before M4 is scoped.
- **Most fragile part of the design:** The `@langwatch/scenario` split — keeping multi-turn sims in TypeScript while RAGAS moves to Python means two eval runners co-exist indefinitely if the LangWatch Python SDK gap is never closed. This creates operational overhead and a confusing mental model for new team members.
- **Highest long-term impact decision:** The dataset JSON schema. Once datasets are versioned in git and CI validates the schema, changing it is a breaking migration. Investing time in schema design (especially whether to include `expected_answer` and `expected_context` from the start) is higher-leverage than it looks.
- **What's missing:** A human review workflow for synthetic samples is mentioned but not specified. Who reviews? What criteria? How is approval recorded? This needs a lightweight process design before M4, or synthetic generation will produce files that never get promoted.
