# Exploration: Dynamic Context Selection — Smarter Retrieval Beyond Fixed Top-K

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Make retrieval query-adaptive instead of rigid: score relevance to query intent, choose k dynamically (few chunks for clear queries, more for ambiguous or multi-part ones), add diversity (e.g. MMR) to avoid redundant context, and apply query-conditional filters (e.g. recency, source) so the system adapts to the question rather than always taking a fixed top-k.

---

## Problem interpretations

### Interpretation A: The “wrong chunks” problem
Fixed top-k returns the same number of chunks regardless of query clarity. For a narrow question (“What is the helpline number?”), one highly relevant chunk is enough; for a broad or multi-part question (“What treatments are there and who is eligible?”), three chunks may repeat the same subtopic or miss another. The user gets either noise (redundant or marginally relevant text) or missing angles — and the LLM’s answer quality suffers.

### Interpretation B: The similarity ≠ relevance problem
Cosine similarity (and RRF with BM25) measures lexical/semantic proximity, not “does this chunk actually answer the intent?”. A chunk can be similar without being on-topic (e.g. same condition, different question type). Query-aware scoring — intent, entities, or a lightweight reranker — could filter or reorder so that only intent-aligned chunks reach the LLM.

### Interpretation C: The one-size-fits-all pipeline problem
The same retrieval settings apply to every query. Time-sensitive questions (“latest guidance on …”) might benefit from preferring recent chunks; “official only” questions might benefit from source filtering. Without query-conditional logic, we either hard-code a single policy or leave value on the table for identifiable query types.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| End user (macular degeneration) | Asks a long or multi-part question; gets an answer that misses one part or repeats one point | Re-asks or gives up | Medium |
| End user | Asks something narrow; gets three chunks when one would do; answer may be diluted or slower | None; behaviour is opaque | Low–Medium |
| Engineer tuning RAG | Tries to improve accuracy; fixed top-k and threshold are blunt levers | Tweak RAG_TOP_K and RAG_SCORE_THRESHOLD globally; no query-type-specific tuning | Medium |
| Eval / QA | Wants to measure “retrieval quality” per query type | Scenario tests and RAGAS; no isolated retriever metrics for “ambiguous vs narrow” | Medium |

_Note: For users with macular degeneration relying on voice, long or repetitive answers increase cognitive load and time-to-answer; diversity and right-sized context directly affect usability._

---

## Why now

- **Current stack:** Vector search (cosine) + optional hybrid (RRF of vector + full-text BM25), fixed `RAG_TOP_K` (default 3), `RAG_SCORE_THRESHOLD` (0.5) applied only in vector-only path. Hybrid fetches 4×limit from each branch then RRF then limit — no threshold, no diversity, no intent. ADR-009 explicitly says top-3 and 0.5 were empirical and “should be re-evaluated if retrieval quality feedback suggests otherwise.”
- **Existing signals:** RAGAS evals and scenario tests exercise the full pipeline; synthetic-query and eval-dataset explorations point at retrieval blind spots and per-document recall. Improving retrieval has a measurable path (evals, retrieval metrics).
- **Corpus shape:** Vectors table has `source`, `title`, `url`, `createdAt` — enough for simple query-conditional filters (recency, source) if we decide they add value.

---

## Existing solutions

**Internal:**

- **Vector search:** pgvector cosine similarity, configurable limit and score threshold (vector-only path).
- **Hybrid search (optional):** RRF over vector ranking and full-text (`websearch_to_tsquery` + `ts_rank`); fetches 4×limit from each, fuses, then takes top `limit`. No score threshold in hybrid path.
- **Query rewriting:** LLM rewrite for follow-up questions so the embedded query is self-contained before retrieval.
- **Config:** `RAG_TOP_K`, `RAG_SCORE_THRESHOLD`, `RAG_HYBRID_SEARCH_ENABLED` — all global, no per-query adaptation.
- **Analytics:** Full-text search over the knowledge base for admin/test; no intent classification or retrieval-quality dashboard.

**External:**

- **Dynamic top-k:** RL-based rerankers (e.g. DynamicRAG) or heuristics (e.g. confidence bands) choose k per query; reduces noise for clear queries and increases coverage for ambiguous ones. Trade-off: extra latency/cost if an LLM is used to decide k.
- **MMR / diversity:** Maximal Marginal Relevance (and variants like DF-RAG) trade relevance vs. diversity; 4–10% F1 reported in some RAG benchmarks. Implementations: post-retrieval rerank (fetch more, then select diverse subset) or diversity-aware scoring in the index layer.
- **Relevant Information Gain:** Probabilistic formulation that yields diversity while preserving relevance; shown to outperform naive relevance–diversity trade-offs in some setups. More complex to implement.
- **Metadata / query-conditional filtering:** Filter by `createdAt`, source, or other metadata before or after vector search (e.g. “last year only” for time-sensitive queries). Soft weighting (e.g. recency decay) avoids hard cut-offs. Multi-Meta-RAG and “retrieval weighting” style systems use this.
- **Intent / query classification:** Lightweight classifier (rules or small model) labels intent or entity; then apply different k, threshold, or filters per class. Adds a small, predictable latency if rule-based.

---

## Possible directions

### Direction A: Diversity-only (MMR or similar) on current retrieval
Keep fixed k for the initial fetch (or fetch 2×k), then apply MMR (or a simple diversity penalty) to select a subset that maximizes relevance and minimizes redundancy. No intent parsing, no dynamic k. Easiest to add on top of existing `retrieve()`; can be toggled by config.

### Direction B: Dynamic k by score distribution
No new model. After retrieval, look at score distribution (e.g. gap between top score and next, or count above a relevance band). If scores are high and tight, use a small k (e.g. 1–2); if scores are spread or borderline, use a larger k (e.g. 5–6). Thresholds tuned empirically; no intent classification.

### Direction C: Query-conditional filters using existing metadata
Use `source` and `createdAt` in the vectors table. Add simple heuristics or a tiny classifier: e.g. “latest”, “recent”, “current” → prefer or filter by `createdAt`; “official”, “NHS” → filter or boost by `source`. Keeps retrieval pipeline unchanged except for an extra WHERE or score modifier. Scope depends on how much time-sensitive or source-specific content exists in the KB.

### Direction D: Intent-aware pipeline (intent → k + filters)
Add an intent/entity step (rules or lightweight model) before retrieval. Map intents to policies: e.g. “factual single fact” → k=1–2, high threshold; “comparison” or “multi-part” → k=5–6, maybe MMR. Optionally combine with Direction C for “time-sensitive” or “official only” intents. Highest leverage, more design and maintenance.

### Direction E: Reranker layer (retrieve more, rerank less)
Fetch 2× or 3× current k, then run a cross-encoder or small reranker (e.g. relevance vs. query) and take top-k after rerank. Can be combined with MMR (rerank for relevance, then diversify). Improves precision but adds latency and possibly an extra model/service.

---

## Hard problems

- **Proving improvement in our domain:** Benchmarks (e.g. DF-RAG, DynamicRAG) are often on generic QA; macular/KB is narrow and medical. Gains may be smaller or different; we need evals (RAGAS, scenarios, or retrieval-only metrics) to avoid regressions and confirm gains.
- **Latency and cost:** Every extra step (intent LLM, reranker, larger k) adds latency and possibly cost. Voice and low-vision users benefit from fast, concise answers; we must not slow the pipeline without clear benefit.
- **Operational complexity:** Dynamic k, MMR, and filters introduce more knobs and failure modes (e.g. intent misclassification, bad thresholds). Observability (retrieval span, scores, k chosen) is essential.
- **Hybrid path parity:** Today score threshold is only applied in vector-only path; hybrid has no threshold. Any “smarter” logic should be defined so it works consistently for both vector and hybrid modes.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|----------------|--------------------|
| How often are queries “ambiguous” or multi-part vs narrow? | Drives whether dynamic k and diversity matter in practice | Sample logs or trial queries; tag by length, question type, or intent proxy |
| Does our KB have enough time-sensitive content to justify recency filters? | Direction C is only useful if “latest” queries and stale chunks exist | Inspect `createdAt` and source mix; list queries that should prefer recent |
| Is redundancy (repeated subtopics) a real failure mode in current traces? | MMR/diversity help most when top-k is repetitive | Review LangWatch retrieval spans for overlapping chunk content on a sample of queries |
| Would a small intent classifier (rule or model) be accurate enough to drive k/filters? | Direction D depends on reliable intent | Prototype rule set or tiny model on sample queries; measure precision/recall |
| How does hybrid (RRF) behave vs. vector-only with a threshold? | We may already get “smarter” behaviour from hybrid; adding MMR on top might duplicate benefit | A/B or eval comparison: hybrid vs. vector-only; then hybrid + MMR vs. hybrid |

---

## Promising direction

**Direction A (diversity) plus Direction B (dynamic k by scores)** — no new models, minimal new dependencies, and directly addresses “repetitive context” and “wrong-sized k” with levers we can tune and measure.

- **Diversity (A):** Fetch a few more candidates than today (e.g. 2×k), then apply MMR or a simple diversity penalty before passing to the LLM. Reduces redundancy and can improve answer quality for multi-part or broad questions; RAGAS and scenario evals can validate.
- **Dynamic k (B):** Use score distribution (e.g. count above a “high confidence” band, or gap between rank 1 and 2) to choose how many chunks to keep (e.g. 1–2 vs. 5–6). Keeps high-confidence queries lean and expands for ambiguous ones. Fits current metrics (we already log scores) and avoids an intent classifier for a first step.

Query-conditional filters (Direction C) are worth adding only after confirming time-sensitive and source-specific demand (unknowns above). Intent-aware pipelines (D) and a reranker (E) are natural next steps if evals show that diversity and dynamic k are not enough.

---

## What next?

1. **Measure redundancy and score distribution** — Sample retrieval traces (e.g. from LangWatch or test harness): how often do top-3 chunks overlap heavily? What do score distributions look like for “good” vs. “bad” answers? Resolves whether MMR and dynamic k are justified.
2. **Prototype MMR on top of `retrieve()`** — Implement a small post-step: fetch 2×k (or use existing results if we temporarily raise k), apply MMR, return k chunks. Run RAGAS and key scenarios; compare to baseline. Low risk, high signal.
3. **Clarify hybrid + threshold** — Decide whether hybrid path should also apply a score threshold or a “min relevance” filter so that “smarter retrieval” behaves consistently in both modes.
4. **Ready for PRD?** — If MMR + dynamic k show gains in evals, run `/prd dynamic context selection` (or `/prd smarter retrieval`) to lock requirements and architecture.
