# Exploration: Synthetic Query Generation for RAG Evaluation

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Automatically generate evaluation queries from the Macular Society knowledge base documents — producing a diverse, document-grounded QA dataset that covers retrieval stress-testing, difficulty gradients, and question-type taxonomy, rather than relying solely on hand-crafted scenario simulations.

---

## Relation to prior exploration

The [eval-dataset-management exploration](./2026-03-07-eval-dataset-management.md) addressed the *management* problem: versioning, coverage visibility, and team contribution workflows. This exploration addresses a distinct upstream problem: *where do the questions come from in the first place?*

The two are complementary. Management infrastructure without a generation pipeline leaves coverage gaps. Generation without management produces untracked, unversioned noise. Both are needed.

---

## Problem interpretations

### Interpretation A: The retrieval blind-spot problem

The current eval suite tests the full RAG pipeline (retrieve → generate → judge) but not the retriever in isolation. If a document chunk is never referenced by a hand-crafted scenario, a regression in retrieval for that chunk is invisible. Generating questions directly from each source document creates a ground-truth retrieval target — enabling `precision@K` and `recall@K` measurement per document.

### Interpretation B: The question-type homogeneity problem

Existing questions in `agent_scenarios.json` are natural-language simulator prompts shaped by the people who wrote them. They skew toward conversational, single-hop queries. Real users of a macular degeneration helpline ask a much wider range: multi-hop ("does Amsler grid help detect both dry and wet AMD?"), abstract ("what's the outlook for someone newly diagnosed?"), and adversarial ("what's the right dose of VEGF inhibitors for me?"). Without systematic generation across question types, the eval suite cannot tell you how the system performs on the queries it hasn't seen.

### Interpretation C: The dataset-growth bottleneck problem

Manually authoring good eval questions is slow, domain-expert-intensive, and won't scale as the knowledge base grows. Automatic generation (doc → N questions) decouples dataset size from human effort, enabling coverage proportional to the KB rather than to team bandwidth.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Engineer shipping retrieval changes | Needs to know if a pgvector threshold or embedding model change regresses retrieval | Runs full scenario suite; no per-document recall signal | High |
| AI/data team member | Wants question coverage proportional to KB content | Manually writes scenarios; misses large areas of the KB | High |
| Engineer building RAGAS evals | Needs a QA corpus with reference contexts for faithfulness scoring | No structured QA pairs exist; evals run without ground truth | Medium |
| Future auditor / funder | Needs evidence of systematic, unbiased coverage across conditions | No taxonomy or coverage map exists | Medium |

*Note: For macular degeneration users relying on voice interaction, retrieval failures are particularly costly — they receive a silent gap rather than a visual indicator that something went wrong. A retrieval blind spot in the eval suite means silent failures reach production undetected.*

---

## Why now

- The KB is large and growing (scraped Macular Society content in `.cache/json/`). Coverage via hand-curation will fall further behind.
- RAGAS `TestsetGenerator`, DataMorgana, and SDG Hub have all matured in 2025 into operationally viable tools — not research prototypes.
- The existing `generate-tests-from-criteria.ts` and `generate-tests-from-scenarios.ts` scripts show the team is already comfortable with generation workflows; the pattern just needs to be extended upstream to the *document* level.
- RAGAS metrics (faithfulness, answer relevancy) are already integrated but have no ground-truth QA pairs to run against. Synthetic generation would unlock their full value.

---

## Existing solutions

**Internal:**
- `scripts/generate-tests-from-criteria.ts` — reads `.cache/criteria/*.json` (question + judge_criteria structs), emits test files. Questions are already present in criteria JSON, but how they were generated is unclear — likely hand-authored.
- `scripts/generate-tests-from-scenarios.ts` — reads `agent_scenarios.json` (simulator prompts), generates scenario test files. These are *agent simulation tests*, not retrieval evaluation tests.
- `.cache/json/` — scraped KB documents exist on disk; no pipeline consumes them for test generation.
- Existing RAGAS eval integration — metrics infrastructure is ready; lacks a QA dataset to run against.

**External:**
- **RAGAS TestsetGenerator** — evolutionary generation paradigm. Produces `user_input` / `reference_contexts` / `reference` triplets. Supports question types: simple, reasoning, multi-context, conditional. Configurable distribution (e.g., 30% simple / 50% reasoning / 20% multi-context). Python library; well-documented.
- **DataMorgana** (ACL 2025) — user + question category matrix. Forces diversity across lexical, syntactic, semantic axes simultaneously. Shown to outperform RAGAS on diversity metrics. Also Python; designed for enterprise RAG.
- **GRADE** — multi-hop QA with difficulty matrix: hop count × semantic distance. Targets retriever robustness specifically. Research-grade; no packaged SDK yet.
- **MHTS** — multi-hop tree structure for difficulty-controllable generation. Promising for stress-testing but complex to configure.
- **SDG Hub (Red Hat)** — open-source Python pipeline for QA triplet generation from raw documents. Composable; fits a CI pipeline.

---

## Possible directions

### Direction A: RAGAS-based generation pipeline (Python, off-the-shelf)

Run RAGAS `TestsetGenerator` against `.cache/json/` documents. Configure distribution: 40% simple, 30% reasoning, 30% multi-context. Store output as a versioned JSON dataset. Wire into RAGAS metrics evals. Lowest implementation effort — ~200 lines of Python. Requires Python runtime; outputs need human review before use in regression testing.

### Direction B: TypeScript-native generator (OpenAI, custom prompt taxonomy)

Build a TypeScript script (parallel to existing generators) that calls OpenAI with a structured prompt to produce question/expected-context/answer triplets per document chunk. Define question taxonomy explicitly: factual, abstract, multi-hop, adversarial, unanswerable. Output schema matches existing criteria JSON. No new language dependency. More control over prompts; more code to own. Diversity harder to guarantee without tooling.

### Direction C: DataMorgana-style category matrix (research-informed design)

Design a generation config with explicit user-category × question-category dimensions: e.g., `[newly-diagnosed, caregiver, long-term patient]` × `[factual, multi-hop, adversarial, emotional-support]`. LLM generates questions conditioned on each cell. Produces a balanced distribution by design, not by chance. Higher design investment; clearest coverage guarantees.

### Direction D: Hybrid — RAGAS for scale + category-matrix review gate

Use RAGAS to generate a large initial corpus cheaply (hundreds of samples). Apply a category-matrix filter pass to detect and fill underrepresented cells. Human review gate for adversarial and multi-hop samples before use in CI regression. Combines scale with quality control.

---

## Hard problems

- **The vanilla prompt bias**: Without explicit diversity constraints, LLM generators repeat common phrasings and ignore minority question types. RAGAS's evolutionary paradigm addresses this but doesn't eliminate it entirely. Custom prompts need careful engineering.
- **Unanswerability is hard to verify**: Generating "the system should refuse" test cases requires confirming that no document in the corpus can answer the question — intractable at scale without semantic search over the full KB.
- **Ground-truth reference_contexts**: Synthetic generation assumes we can identify which document chunks should be retrieved. For multi-hop questions spanning multiple chunks, the ground truth is a set — recall@K measurement becomes ambiguous.
- **Medical domain review**: Generated questions may encode clinical misconceptions or use phrasings that mislead low-vision users reading output aloud. A domain expert review step is operationally necessary but creates a bottleneck.
- **Dataset-to-test coupling**: The existing test infrastructure consumes question text as simulator prompts. Plugging a QA-pair dataset (with reference_contexts and reference answers) into the scenario test format requires a new test runner or adapter.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Quality of RAGAS-generated questions for macular degeneration domain | If quality is low, the pipeline produces dataset noise that corrupts eval signals | Run a spike: generate 20 questions from 5 documents; have a domain expert rate relevance and naturalness |
| Can `.cache/json/` documents be used directly as RAGAS input, or do they need chunking pre-processing? | Determines implementation complexity of ingestion step | Inspect 5 documents; check chunk boundaries vs. RAGAS's document node expectations |
| Does the team accept a Python dependency for generation, or must the pipeline stay in TypeScript? | Blocks or enables RAGAS/DataMorgana/SDG Hub | Ask team; check existing Makefile for Python usage |
| Is there a LangWatch feature for storing ground-truth QA pairs and running reference-based metrics? | Could replace need for a custom QA store | Read LangWatch docs; check existing integration |
| How many questions-per-document is the right target? | Determines runtime cost and dataset size | Industry practice: 3–10 per chunk. Spike with 5 and assess token cost vs. coverage gain |
| What question types are *currently absent* from the scenario suite? | Prioritises which types to generate first | Tag existing `agent_scenarios.json` entries by type; compute distribution |

---

## Promising direction

**Direction D** — Hybrid: RAGAS for scale + category-matrix review gate

RAGAS is the lowest-friction path to a large, typed QA corpus. Its evolutionary paradigm provides meaningful diversity without requiring a full DataMorgana-style config system. The category matrix doesn't need to be built into the generator — it can be applied as a post-generation tagging and gap-analysis step, which is simpler to build and easier to iterate.

The critical constraint is the Python dependency question. If the team is open to a Python script invoked via `make`, Direction D is viable immediately. If not, Direction B (TypeScript-native) is the fallback — accepting more manual diversity work in exchange for stack homogeneity.

Either way, the output schema should be defined first: a JSON format that can feed both RAGAS metrics evals and the existing `@langwatch/scenario` test infrastructure.
