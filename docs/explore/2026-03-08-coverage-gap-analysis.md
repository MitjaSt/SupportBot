# Exploration: Periodic Test Coverage Gap Analysis

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

A periodically-run tool (skill, script, or agent) that inspects the codebase's test coverage, identifies uncovered modules and branches, and produces a prioritised list of recommended tests — intended to run monthly or at the start of each sprint.

## Problem interpretations

### Interpretation A: Coverage decay goes unnoticed

We add new services — `rag.service`, `vector-db.service`, `piper`, `prompt-guard` — but no mechanism tracks whether tests accompany them. The current unit test count is 2 files covering ~5% of the API, and 0% of the frontend. Without a periodic signal, this gap widens silently and is only discovered when something breaks in production.

### Interpretation B: The testing strategy exists but is not actioned

`docs/TESTING_STRATEGY.md` lists roughly 20 unit tests and 5 integration tests that should exist. None of them have been written. The problem is not that we don't know what to test — it's that the list sits in a document with no mechanism to remind us, prioritise the gaps, or connect them to sprint work.

### Interpretation C: Sprint planning lacks data-driven test prioritisation

When planning a sprint, deciding which tests to write is a gut-feel exercise. There is no tooling that says "this service has 0% coverage and handles user-facing logic" vs "this utility is trivially covered by its callers." A ranked, contextual recommendation would make the conversation shorter and the decisions better.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer | Adding a new service or handler | Manually checks if a test file exists | Low (ignored) |
| Tech lead / sprint planner | Deciding what testing work goes into a sprint | Reads TESTING_STRATEGY.md manually | Medium |
| The whole team | A regression slips through untested code | Discovers it via user report or prod incident | High |

_Note: End users have macular degeneration and depend on the correctness of this system — a hallucination or a broken contact-collection flow is a high-trust failure for a vulnerable group. Coverage gaps in the RAG pipeline, prompt-guard, and contact-collection are not low-stakes._

## Why now

- **The coverage baseline is 5% / 0%** — the gap is large enough that even a rough signal would be immediately actionable.
- **TESTING_STRATEGY.md already captures intent** — there is a backlog of tests to write; the missing piece is a tool to surface and reorder it based on current state.
- **The eval suite is growing** — distinguishing "what evals already cover" from "what unit tests still need to cover" is becoming harder to track manually.
- **We already have `vitest --coverage`** — the raw signal exists; it just produces a coverage report nobody looks at.

## Existing solutions

**Internal:**
- `npm run test:cov` in `projects/api` — runs Vitest with coverage enabled. Produces a report but no analysis or recommendations.
- `docs/TESTING_STRATEGY.md` — a static list of recommended tests. Not connected to coverage data or sprint tools.
- No frontend test runner is installed; no frontend coverage is possible yet.
- Eval/scenario tests cover RAG quality (LLM-judge), not unit-level code coverage.

**External:**
- **Vitest `--coverage` with JSON reporter** — machine-readable coverage data (file, function, branch, statement %). Easy to parse and feed into analysis.
- **CoverUp (open source)** — coverage-guided LLM test generation; iterates on uncovered branches. Heavier dependency, not designed for periodic recommendations.
- **Istanbul/V8 reporters** — Vitest supports both; V8 is fast, Istanbul is more accurate for branch analysis. Either works for this purpose.
- **CI coverage thresholds** — Vitest supports `coverage.thresholds` to fail builds below a floor. Useful for preventing decay but doesn't recommend what to write.
- **LLM-as-a-reviewer pattern** — feed coverage JSON + source file into a prompt; LLM identifies what the gaps are and suggests tests. No external dependency beyond the model already in use.

## Possible directions

### Direction A: `/coverage` Claude skill

A Claude Code skill that runs `vitest --coverage --reporter=json`, reads the output, cross-references it with the module list in CLAUDE.md and TESTING_STRATEGY.md, and produces a ranked report of gaps with concrete test suggestions. Output is a markdown file written to `docs/coverage/YYYY-MM-DD.md`. Run it manually at sprint planning or on a cron via a simple shell wrapper.

Scope: one skill file, ~100 lines. Reuses existing infrastructure. Works today without frontend test setup.

### Direction B: Bash script + JSON coverage parser

A standalone `scripts/coverage-report.sh` that runs the API coverage tool, parses the JSON output, and prints a ranked list of uncovered modules to stdout (or writes a markdown file). No LLM involved — pure structural analysis: files with 0% coverage, files below threshold sorted by estimated criticality (based on module name / directory).

Simpler, faster, cheaper to run. But the output is data, not recommendations — someone still interprets it.

### Direction C: CI coverage gate + monthly scheduled analysis

Add `coverage.thresholds` to `vitest.config.ts` to prevent regressions. Separately, add a scheduled GitHub Actions workflow that runs coverage, diffs against the last month's baseline, and opens a GitHub issue listing new gaps.

More infrastructure investment. Closes the "set it and forget it" loop — the team doesn't have to remember to run anything. But adds CI complexity and doesn't generate test recommendations, just diffs.

## Hard problems

- **Frontend has no test runner** — any coverage solution for the frontend requires installing Vitest + jsdom + React Testing Library first. The coverage analysis would be incomplete until that is done.
- **Distinguishing eval coverage from unit coverage** — the eval scenarios exercise the RAG pipeline end-to-end, which inflates the apparent coverage of some services. A coverage report may say `rag.service.ts` is partially covered when the coverage comes from evals, not unit tests. Evals are expensive and excluded from regular runs.
- **Ranking recommendations requires domain knowledge** — not all uncovered files matter equally. A file in `src/modules/prompt-guard/` is higher priority than a utility in `src/utils/`. Encoding this ranking either requires LLM analysis or a manually maintained criticality map.
- **Coverage reports are stale** — running coverage requires a live database or extensive mocking. Integration tests that need `TEST_DATABASE_URL` won't contribute to coverage in a simple local run.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What does the current coverage report actually show? | Can't prioritise gaps without seeing them | Run `npm run test:cov` in `projects/api` and read the output |
| Which modules are exercised by evals vs. unit tests? | Prevents double-counting; evals are too expensive to include in regular runs | Run unit tests only (`test/unit/**`) with coverage, compare to full run |
| Does the frontend's lack of a test runner block this? | A coverage skill that can't report frontend gaps is incomplete | Decide scope upfront: API-only first, add frontend when test infra is in place |
| How often will the team actually look at this? | A report nobody reads is waste | Validate with 1 sprint: run it at planning, see if it changes the conversation |

## Promising direction

**Direction A** — a `/coverage` Claude skill

It delivers recommendations, not just data, which closes the "who interprets this" gap. It requires no new infrastructure beyond what exists today. The skill pattern is already established in this project (10 skills already in `.claude/skills/`). Output is a human-readable markdown file that can be committed or dropped into a sprint planning doc. Direction B is a useful fallback if LLM analysis feels like overkill; Direction C is a natural follow-on once the habit is established.
