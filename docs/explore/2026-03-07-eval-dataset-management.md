# Exploration: Evaluation Dataset Management

> Stage: Explore | Date: 2026-03-07
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Treat evaluation datasets as first-class versioned artifacts — with generation tooling, diff/coverage metrics, and a curated library — so AI/data team members can evolve and regression-test the RAG system without relying on scattered files.

## Problem interpretations

### Interpretation A: The blind-spot problem
The team has no systematic way to know what the eval suite *doesn't* cover. Hard-case categories (multi-doc reasoning, temporal queries like "latest NHS availability", boundary-pushing emotional distress flows) may exist in production traffic but be absent from eval datasets. Every retrieval or prompt change carries hidden regression risk.

### Interpretation B: The ownership problem
Eval scenarios are currently test code — `*.test.ts` files owned by engineers. AI/data team members who know the domain best (which questions surface at the helpline, which edge cases trip the system) have no ergonomic path to contribute, review, or curate datasets. The result is a narrow, developer-shaped corpus.

### Interpretation C: The drift problem
The Macular Society knowledge base evolves (new treatments, benefit changes, updated helpline processes). Eval datasets don't track knowledge-base changes, so passing tests can mask regressions caused by outdated source content rather than model or retrieval failures. Without dataset versioning, you can't tell if a score drop came from a code change or a dataset update.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| AI/data team member | Wants to add domain-specific hard cases | Must write TypeScript test files or ask an engineer | High |
| Engineer shipping RAG changes | Needs confidence a change doesn't regress retrieval | Runs `make test-scenarios` against a static, unversioned corpus | Medium |
| Engineer reviewing a PR | No dataset diff — can't tell if eval results are comparable | Manual inspection of test output | Medium |
| Researcher / future auditor | Needs evidence of systematic evaluation coverage | No coverage map exists | High |

*Note: The end users of this system have macular degeneration. Dataset gaps that go undetected mean real users receive poor or unsafe answers. For low-vision users who rely on the assistant over phone/voice, retrieval failures aren't a minor UX issue — they erode trust in a service that may be their primary information source.*

## Why now

- The existing scenario corpus (50+ scenario IDs in `agent_scenarios.json`, 20+ generated test files) has grown large enough that no one person knows what it covers.
- `generate-tests-from-criteria.ts` already reads structured JSON to produce test files — the scaffolding for a dataset management layer exists.
- The team is actively extending eval coverage (custom-generated scenarios were added recently); without versioning, this growth creates noise rather than signal.
- RAGAS and LangWatch are already integrated — the metrics infrastructure is ready. The missing piece is the *data* infrastructure.
- External frameworks (RAGAS, SDG Hub, RAGEval/ACL 2025) have matured to the point where synthetic dataset generation from source documents is operationally viable, not just research-grade.

## Existing solutions

**Internal:**
- `test/evals/docs/agent_scenarios.json` — 50+ structured scenario definitions with `area`, `grounding_refs`, `simulator_prompt` fields. The closest thing to a dataset library today.
- `test/evals/scenarios/` — hand-crafted scenario tests grouped by topic area (medical, adversarial, benefits, etc.)
- `test/evals/scenarios/generated/` + `test/evals/scenarios/custom-generated/` — auto-generated tests from criteria JSON; numbering scheme (`13-`, `14-`…) is already becoming opaque.
- `scripts/generate-tests-from-criteria.ts` — reads `.cache/criteria/*.json`, outputs test files. A generator pipeline exists but targets test code, not a curated dataset store.
- RAGAS evals for faithfulness + answer relevancy exist but use no named, versioned dataset.

**External:**
- **RAGAS** — synthetic test generation (question/answer/context triplets from documents) + reference-free metrics. Directly applicable; already partially integrated.
- **Braintrust** — dataset versioning, experiment diff, CI/CD integration. Strong fit but adds SaaS dependency and cost (~$249/mo).
- **LangSmith** — dataset management integrated with tracing. Heavier LangChain dependency.
- **SDG Hub (Red Hat)** — open-source Python pipeline for generating QA pairs from raw documents. Free, composable, but requires Python tooling in a TypeScript stack.
- **RAGEval (ACL 2025)** — scenario-specific dataset generation with Completeness/Hallucination/Irrelevance metrics. Research-grade; not yet a packaged tool.

## Possible directions

### Direction A: Dataset library with versioning (file-based)
Define a canonical `datasets/` directory structure with JSON schema for dataset files (question, expected-context, tags, difficulty, source-doc). Add a version field and changelog. Build a CLI `make dataset-diff` that compares two versions. Coverage metrics computed by scanning which `area` tags are represented. Low external dependency; fits the existing TypeScript/file-based workflow.

### Direction B: RAGAS-powered synthetic generation pipeline
Use RAGAS `TestsetGenerator` to produce QA triplets from scraped Macular Society documents in `.cache/json/`. Gate the output through human review before merging. Periodically regenerate as the knowledge base changes. Gives scale (hundreds of samples) that manual curation cannot. Requires Python environment or subprocess integration.

### Direction C: External dataset platform (Braintrust / LangSmith)
Push datasets and eval runs to a hosted platform that provides versioning, diff, and coverage UI out of the box. Integrates with existing LangWatch/OTEL pipeline. Adds SaaS dependency, recurring cost, and data leaving the environment — a concern for a charity handling helpline-adjacent interactions.

### Direction D: Hybrid — structured local library + RAGAS generation + lightweight coverage CLI
Formalise the existing `agent_scenarios.json` as the canonical dataset source (add version, coverage tags, source refs). Layer a RAGAS-based synthetic generator to fill gaps identified by coverage analysis. Add a `dataset` Makefile target for diff and coverage reporting. No new SaaS. Empowers data team via JSON contribution rather than TypeScript authoring.

## Hard problems

- **Human-in-the-loop for synthetic data**: RAGAS-generated questions can encode model biases or produce unnatural phrasing. For a medical domain with low-vision users, synthetic samples need clinical review before use. Defining that review workflow without creating a bottleneck is genuinely hard.
- **Coverage definition**: "Coverage" in a medical domain is semantic, not purely syntactic. Two questions about wet AMD can test very different things. A tag taxonomy must be designed, not just counted.
- **Dataset/codebase coupling**: Today, datasets *are* test code. Decoupling them so non-engineers can contribute JSON without accidentally breaking the CI pipeline requires careful schema governance and tooling.
- **Versioning semantics**: What counts as a breaking change in a dataset? Adding a question? Changing expected context? Removing a sample? Without clear semantics, `dataset diff` produces noise.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| How often does the AI/data team currently add or edit scenarios? | Determines whether friction is real or hypothetical | Interview team members; inspect git log for test file edits |
| Do RAGAS-generated samples for macular degeneration content achieve acceptable quality without clinical review? | If quality is low, synthetic generation is net-negative | Run a sample generation spike against 10 documents; have a domain expert rate 20 outputs |
| Would the team accept Python tooling for generation, or must everything be TypeScript? | Affects feasibility of SDG Hub / RAGAS generator | Ask team |
| What's the actual failure mode distribution in production? | Determines which dataset gaps matter most | Query LangWatch traces for low-confidence or flagged responses |
| Does LangWatch support dataset pinning / versioned eval runs? | Could avoid building a custom versioning layer | Read LangWatch docs; spike with existing integration |

## Promising direction

**Direction D** — Hybrid structured library + RAGAS generation + coverage CLI

The team already has `agent_scenarios.json` as a near-dataset. The gap is (a) governance structure, (b) coverage visibility, and (c) a generation pipeline to scale beyond manual authoring. A file-based approach fits the charity's operational constraints (no new SaaS, data stays local), leverages the existing TypeScript tooling, and gives data team members a JSON contribution path that doesn't require touching test code.

The Python-for-generation concern is the biggest unknown to resolve — if that's a blocker, RAGAS can be invoked as a one-off script or replaced by an OpenAI-powered TypeScript generator that follows the same schema.
