# Exploration: Prompt + RAG Config Versioning as a Single Pipeline Unit

> Stage: Explore | Date: 2026-03-07
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Treat the system prompt, retrieval config (topK, scoreThreshold, chunking strategy), embedding model, and chat model as a single versioned artifact — so that a named pipeline version can be reproduced, compared, and rolled back.

## Problem interpretations

### Interpretation A: Debugging regressions is hard because config state is ephemeral

When a response quality regression is noticed, the team cannot answer "what exact configuration produced those outputs three weeks ago?" The prompt lives in LangWatch (fetched dynamically at runtime), retrieval parameters live in environment variables, the chunking strategy is in code. None of these are captured together at query time. The prompt log records the rendered prompt text but not the pipeline settings that governed retrieval before that prompt was assembled. Debugging requires correlating artefacts from three different places — and that correlation may be impossible after a hot-fix deploy.

### Interpretation B: Evaluating pipeline changes is unreliable because only one thing changes at a time, but the baseline is unknown

The team has eval infrastructure (Vitest scenarios, RAGAS metrics). But running evals against "the current pipeline" is ambiguous: LangWatch prompt version X, env file with topK=3, scoreThreshold=0.5, chunking logic from commit Y. If any of those change between eval runs, results are not comparable. The result: teams either over-constrain change (fear of touching anything) or lose confidence in eval results entirely.

### Interpretation C: Promoting improvements to production carries hidden risk because there is no defined promotion unit

When a developer tunes the prompt, they may not know that another developer changed topK last week. There is no single artefact to review, test, and sign off on before deploying. Changes go in piecemeal. The "pipeline" that production runs is whatever happens to be in place at any moment — not a consciously designed combination.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer | Debugging why quality dropped after a deploy | Manually correlates prompt logs, git history, env file diffs | High |
| Developer | Running evals to validate a retrieval config change | Manually notes current state in PR description | Med |
| Operator | Rolling back a bad deploy | Reverts code + manually resets LangWatch prompt | Med |
| Helpline user (indirect) | Receives degraded answers after an undetected regression | None — they just get a worse experience | High |

_Note: End users have macular degeneration. A quality regression — e.g., a prompt change that causes the assistant to return answers that are harder to understand or more verbose — may be much more harmful than it would be for sighted users. Catching and rolling back regressions quickly matters more here than in consumer LLM products._

## Why now

- **LangWatch is already in place** — prompts are managed externally, creating an implicit version boundary that isn't being tracked at the pipeline level.
- **Eval infrastructure exists** (scenarios, RAGAS) but lacks a stable baseline definition to evaluate _against_.
- **ADR-009 acknowledges** that topK and scoreThreshold "were tuned empirically and should be re-evaluated" — which implies iterative experimentation is expected, and therefore versioning becomes necessary.
- The team is at an inflection point: early-stage systems can get away with ad-hoc config; once eval loops are running regularly, reproducibility becomes a prerequisite.

## Existing solutions

**Internal:**
- `PromptLoggerService` records rendered prompts + responses as YAML per request — captures _what_ was sent but not the _retrieval config_ that selected the chunks.
- `ObservabilityService.getPrompt()` fetches the current LangWatch prompt at runtime — prompt version is not captured in the session or prompt log.
- `topK`, `scoreThreshold`, `maxTokens`, `promptTokenRejectThreshold` are read from env at startup — they are not stored per session or per request.
- Metric labels (`model`, `operation`) are tracked in Prometheus but retrieval parameters are not.

**External:**
- **LangWatch / LangFuse**: prompt versioning per prompt name; can tag deployments. Does not cover retrieval config or chunking.
- **MLflow 3.0**: full experiment tracking — parameters, metrics, artefacts — with nested runs per pipeline stage. Adds operational weight.
- **DVC**: versions data and pipeline definitions in Git. Primarily for data pipelines; LLM prompt tracking is not native.
- **LaunchDarkly AI Configs**: feature-flag style A/B testing for LLM parameters. Overkill for a single-tenant charity deployment.
- **Inline snapshot**: store a `pipeline_snapshot` JSON column on the session or on a new `pipeline_versions` table — lightweight, no new services.

## Possible directions

### Direction A: Lightweight snapshot per request

At query time, capture the active pipeline config (prompt version from LangWatch, topK, scoreThreshold, model, embedding model, chunking strategy identifier) as a JSON blob and persist it — either on the session table or as a separate `pipeline_runs` log. No new services. Enables answering "what config produced session X?" and retrospective correlation with eval results.

### Direction B: Named pipeline version entity with promotion workflow

Define a `pipeline_version` record (stored in Postgres) that bundles: prompt template, retrieval params, model identifiers, chunking strategy. The running system loads a named version at startup. A developer creates a new version, runs evals against it, then promotes it. This mirrors ML experiment tracking closely and makes rollback explicit.

### Direction C: Extend existing LangWatch prompt version to carry retrieval metadata

LangWatch prompts can carry metadata. Tag each prompt version with the intended retrieval config (topK, scoreThreshold, etc.) as structured metadata. At runtime, read both the prompt and its metadata, applying retrieval params from the prompt version rather than from env. No new DB tables. Depends on LangWatch remaining in the stack.

## Hard problems

- **Chunking strategy versioning**: chunking logic is in code (`processing` module), not a config value. Versioning it meaningfully requires either moving chunking params to a config record or tagging ingestion runs with a strategy identifier so you know what index version corresponds to what strategy.
- **Index/embedding alignment**: if you change the embedding model, the existing pgvector index becomes inconsistent with new queries. A pipeline version referencing a different embedding model implies a different index state — these must be versioned together or the snapshot is misleading.
- **Config authority conflict**: retrieval params currently live in env vars (operator-controlled). If they also live in a DB pipeline version (developer-controlled), there is a conflict. The source of truth must be unambiguous.
- **Eval baseline as part of the version**: Direction B implies that eval results are attached to the version — but running evals for every candidate version adds cost and workflow friction.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does LangWatch expose the prompt version identifier at runtime? | Direction C depends on it; without it the prompt metadata approach has no stable key to store | Read LangWatch SDK docs; check `observability.getPrompt()` return type |
| How often do retrieval params actually change? | If changes are rare, a lightweight snapshot is sufficient; if frequent, a formal version entity earns its weight | Review git history for env file changes over the last 3 months |
| Do eval runs need to re-embed chunks for each retrieval config candidate? | Determines whether Direction B requires managing multiple vector index states or just parameter variants | Spike: run RAGAS eval with topK=3 vs topK=5 without re-embedding, measure result delta |
| What is the chunking strategy identifier? | A "pipeline version" is incomplete without it; current code has no concept of a named chunking strategy | Read `processing` module to understand whether strategy is fully determined by a few numeric params |

## Promising direction

**Direction A (lightweight snapshot per request)** — highest impact for lowest operational cost, and unblocks eval reproducibility immediately.

This project runs on a single Postgres instance with no MLflow budget. Adding a `pipeline_snapshot` JSONB column to the session (or a separate append-only `pipeline_run_log` table) captures the full config state at the time of the request with no new services. It directly solves the regression-debugging problem (Interpretation A) and gives eval runs a stable baseline reference (Interpretation B). Direction B's promotion workflow can be layered on top once the snapshot pattern proves its value. Direction C is worth pursuing in parallel only if the LangWatch prompt version ID is already surfaced at runtime.
