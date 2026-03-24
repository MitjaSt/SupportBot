# Exploration: Knowledge Base Quality Analytics

> Stage: Explore | Date: 2026-03-07
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Surface data-quality problems in the RAG knowledge base itself — redundant chunks, never-retrieved content, stale documents, and coverage gaps — so maintainers can fix the corpus rather than tuning the model.

## Problem interpretations

### Interpretation A: Blind Spot in Content Management

The Macular Society team ingests content through the pipeline and assumes it is "in the system." But they have no signal about whether ingested content is ever actually useful. A document scraped a year ago may never have been retrieved — either because the chunking fragmented it badly, it covers a topic users never ask about, or it is now outdated. Without feedback, they cannot prioritise which pages to re-scrape, re-chunk, or remove.

### Interpretation B: Silent Retrieval Degradation

As the corpus grows, retrieval quality silently degrades. Duplicate or near-duplicate chunks compete with each other and dilute semantic signal — the retriever pulls two near-identical chunks instead of two complementary ones. No current metric catches this. The average similarity score (already tracked) can look fine while the *diversity* of retrieved context is shrinking.

### Interpretation C: Ops Team Cannot Audit the KB

The analytics module surfaces query-side dead ends (`deadQueries`) but nothing chunk-side. An operator who wants to answer "which documents contribute nothing?" or "do we have redundant pages?" has no tool to reach for. This is a content governance gap, not a model gap.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Content/ops maintainer | Wants to prune or prioritise re-scraping | Manually reviews source URLs; guesswork | High |
| Developer | Investigating why a topic produces dead queries | Manually runs `testRetrieval()` against guesses | Med |
| Product owner | Wants confidence that KB covers the charity's content | No audit tool exists | High |

_Note: End users (people with macular degeneration) are not directly affected, but they experience the downstream consequences: "I don't know" responses when the KB has gaps, and low-relevance responses when redundant chunks crowd out good ones._

## Why now

- The existing `AnalyticsService` already stores the JSONB `chunks` array on every message — this is the primary data source for retroactive orphan analysis, and it already exists
- The `vectors` table has no `retrieval_count` or `last_retrieved_at` columns — a schema gap that is cheap to fix now but gets more expensive as the corpus grows
- ADR-009 explicitly notes that "retrieval quality is bounded by the quality and coverage of the knowledge base" — this feature is the operational mechanism to act on that observation
- Three prior explorations (pipeline versioning, eval dataset management) have circled around corpus quality; this directly addresses it

## Existing solutions

**Internal:**
- `getTopSources()` — counts source URL retrieval frequency (query-level, not chunk-level; top 5 only)
- `getDeadQueries()` — messages that retrieved zero chunks (query-side signal, not chunk-side)
- `searchKnowledgeBase()` — text search into `vectors`, but no quality signals
- `testRetrieval()` — ad-hoc cosine search for a given query; manual only
- No `retrieval_count`, `last_retrieved_at`, or inter-chunk similarity data exists anywhere

**External:**
- LangWatch / LangFuse — trace-level observability; not designed for corpus auditing
- Ragas `context_recall` / `faithfulness` — LLM-judge metrics; require ground truth, expensive, already blocked from auto-run
- Purpose-built KB quality tools don't exist as a category — this is genuinely an underserved problem space (confirmed by user framing)
- Vector DB GUIs (Qdrant UI, Weaviate console) surface basic stats but no retrieval frequency or redundancy signals

## Possible directions

### Direction A: Schema-first retrieval tracking

Add `retrieval_count` and `last_retrieved_at` to the `vectors` table. Instrument `VectorDbService.search()` to increment these counters on every retrieval hit. This gives precise, real-time orphan detection going forward and enables staleness scoring. Requires a migration, backfill is impossible for historical data (only forward-looking).

### Direction B: Retroactive JSONB mining

Mine the existing `messages.chunks` JSONB to compute per-chunk retrieval frequency — no schema change needed. Works immediately on existing data, but only covers chunks that have been retrieved at least once. Chunks with `retrieval_count = 0` cannot be identified this way (the absence of evidence problem: a chunk missing from all JSONB arrays might be orphaned or just never queried).

### Direction C: Batch similarity job for redundancy and coverage

A background job (cron or triggered) runs pairwise cosine similarity across all vectors to flag near-duplicates (similarity > 0.95), and k-means clustering to map semantic coverage gaps. Computationally heavy (O(N²) comparisons) but can be run offline. For a bounded corpus (hundreds to low thousands of chunks) this is tractable.

### Direction D: Minimal useful slice

Combine retroactive JSONB mining (Direction B) with a simple query against vectors not appearing in any message's chunks (Direction A prerequisite deferred — use JSONB anti-join as proxy). Add an inter-chunk similarity check via pgvector self-join with a threshold. Deliver three actionable tables: most-retrieved, never-retrieved (approximate), near-duplicates. No background job, no schema change.

## Hard problems

- **Orphan detection without schema change**: A chunk absent from all `messages.chunks` arrays could be a true orphan *or* simply not yet queried. The distinction requires either a schema counter (Direction A) or a coverage-of-query-space argument. Neither is cheap to make precise. _Resolved approach: add schema counter (Direction A) and backfill retroactively from JSONB._
- **Near-duplicate detection at scale**: A self-join on the `vectors` table with `<=>` cosine operator is O(N²). _Resolved: at 1,094 vectors (~1.2M comparisons) this is tractable as a synchronous HTTP endpoint. No background job needed at current scale._
- **Staleness without source timestamps**: The `vectors` table has `created_at` but no "last confirmed fresh" signal. _Resolved: use 30-day age as a proxy threshold. Content is flagged "may need refresh" — not deleted. Operator decides whether to re-scrape. Different decay rates (News vs. Disease content) are acknowledged but a single threshold is operationally simple enough._
- **Actionability**: Surfacing orphan chunks or near-duplicates is only useful if the operator has a clear path to act. _Unresolved: the UI flow (which actions are available inline — delete, re-scrape, dismiss) needs defining in the PRD._

## Unknowns

| Unknown | Why it matters | How to investigate | Status |
|---------|---------------|--------------------|--------|
| Corpus size at steady state | Determines whether O(N²) similarity is feasible in-process or requires batching | — | **Resolved: 1,094 vectors. Self-join (~1.2M comparisons) is tractable as a synchronous endpoint.** |
| Do operators actually review analytics? | If the existing `deadQueries` view is unused, a richer dashboard may also go unused | — | **Resolved: frontend admin analytics are actively used.** |
| What does "staleness" mean for Macular Society content? | Different content decays at different rates; wrong definition creates noise | — | **Resolved: 30-day threshold across all content types. News/Events likely stale sooner; Macular Disease content lasts longer — but 30 days is a safe "may need refresh" signal regardless. Flagged chunks are not deleted; surfaced for human review and optional re-scrape.** |
| How often near-duplicates occur in practice | If the corpus is already clean, this direction has low ROI | Run a one-off similarity self-join query on the current `vectors` table | **Resolved: 605 near-duplicate pairs in 1,094 vectors. This is a present, significant problem — not a hypothetical one. Near-duplicate detection is a first-class priority metric, not optional.** |

## Promising direction

**Direction A + B + C combined** — all four metrics are in scope, all unknowns resolved.

| Metric | Approach | Notes |
|--------|----------|-------|
| Orphan chunks (never retrieved) | Schema counter (`retrieval_count`, `last_retrieved_at`) on `vectors` + JSONB backfill | Forward-looking; migration required |
| Near-duplicate embeddings | pgvector self-join `<=>` threshold < 0.05 as synchronous endpoint | 605 pairs already confirmed in prod |
| Top / bottom retrieved docs | Schema counter + existing JSONB mining | Extends current `getTopSources()` to chunk level |
| Staleness | `created_at` age > 30 days = "may need refresh" flag | No scrape-diff infrastructure needed |

The 605 confirmed near-duplicate pairs elevate this from a monitoring improvement to a **data quality fix with direct retrieval impact**. Consider whether deduplication should also be added as a pipeline step (prevent duplicates on ingest) — not just a dashboard concern. That decision belongs in the PRD.

## Session notes (resume here)

All exploration unknowns are resolved. No further discovery needed.

**Next step: `/prd KB quality analytics`**

Key inputs for the PRD author:
- 1,094 vectors in prod; 605 near-duplicate pairs confirmed
- Schema change required: add `retrieval_count integer DEFAULT 0` and `last_retrieved_at timestamptz` to `vectors` table
- Staleness threshold: 30 days (soft flag, not deletion)
- Near-duplicate threshold: cosine distance < 0.05 (similarity > 0.95)
- Existing `AnalyticsService` and `analytics.controller.ts` are the extension point
- Operators use the frontend admin analytics UI — new KB quality tab fits there
- One open UI question: which inline actions (delete chunk, trigger re-scrape, dismiss) are available from each metric view
