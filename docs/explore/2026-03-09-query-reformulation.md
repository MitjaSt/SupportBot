# Exploration: Query Reformulation for Retrieval Precision

> Stage: Explore | Date: 2026-03-09
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Preprocess user queries with a lightweight LLM step to expand short or ambiguous inputs into full, context-rich queries before embedding and retrieval — distinct from the existing coreference rewriting that already handles follow-up questions.

## Problem interpretations

### Interpretation A: Vocabulary mismatch
A user types "injections" or "wet AMD treatment" — short, colloquial terms that may not align well with the terminology used in the Macular Society knowledge base chunks. The embedding model produces a vector that drifts away from the most relevant content, causing low cosine similarity and a retrieval miss even when an answer exists.

### Interpretation B: Under-specified intent from low-vision users
Users with macular degeneration are more likely to type short queries because typing is effortful — they may rely on dictation, a keyboard with large keys, or a screen reader that makes lengthy input laborious. This produces systematically short queries that look ambiguous to the retriever but are contextually obvious to someone in the domain.

### Interpretation C: Domain-shift from the cataract example
The user's motivating example ("cataract detection") comes from a general medical search context. The actual knowledge base here is narrow and curated — Macular Society content only. The problem may be more about surface form variation within that narrow domain than about open-ended ambiguity.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Person with low vision | Types 2–3 word query via dictation or keyboard | Gets "I don't have information on that" when an answer exists | High |
| Caregiver / family member | Searches unfamiliar medical terms without knowing KB vocabulary | Iterates manually with rephrased queries | Med |
| Admin / evaluator | Runs eval against short synthetic queries | Scores retrieval quality as low; no diagnostic | Low |

Low-vision users are the primary concern. Short queries are not user error — they are an accessibility adaptation.

## Why now

- The existing `needsRewriting()` heuristic only triggers on pronouns and follow-up indicators; it does not address short first-turn queries.
- There is recent evidence (arXiv 2025) that query explicitation alone yields 8–22 point improvements in model performance, with smaller models benefiting most.
- Retrieval quality is a known ceiling on answer quality in this system — if the chunk isn't retrieved, the LLM cannot answer.
- The knowledge base is narrow and curated, so the risk of expansion pulling unrelated content is lower than in open-domain search.

## Existing solutions

**Internal:**
- `rag.service.ts` already rewrites follow-up questions to be self-contained via `needsRewriting()` + a gpt-4o-mini LLM call. This handles coreference but not query enrichment for first-turn inputs.
- Hybrid search (`hybridSearch`) is conditionally enabled — BM25 + vector. BM25 benefits disproportionately from query expansion.
- Score threshold is 0.5 (ADR 009). Short-query misses currently produce no results rather than borderline results.

**External:**
- LLM-based expansion (HyDE, multi-query): generates hypothetical document text or multiple query variants to cast a wider net. Increases recall at potential precision cost.
- Pseudo-Relevance Feedback (PRF): use top-K initial results to refine the query. Adds a second retrieval round.
- Domain-specific synonym injection: no LLM needed, but requires maintaining a term dictionary.
- Reranking post-expansion: restores precision after a wide-net retrieval pass.

## Possible directions

### Direction A: Domain-aware query expansion prompt
A small prompt instructing gpt-4o-mini to expand the user query using Macular Society terminology and known condition names. Triggered only for short queries (< N tokens) on the first turn. One LLM call, one embedding call — same pipeline structure as existing rewriting.

### Direction B: HyDE (Hypothetical Document Embedding)
Generate a hypothetical answer paragraph, embed that instead of (or alongside) the query. Known to improve recall for sparse or short queries. Risk: hallucinated domain-specific content in the hypothetical answer could steer the embedding in the wrong direction for a medical KB.

### Direction C: Multi-query retrieval
Generate 2–3 reformulations of the query, retrieve for each, deduplicate and rerank. Increases recall and diversity. Cost: 2–3× retrieval calls + a merge/rerank step. Meaningful latency increase.

### Direction D: Clarifying question before retrieval
Instead of LLM expansion, ask the user a clarifying question ("Did you mean [X] or [Y]?") before attempting retrieval. Turns a retrieval problem into a UX/conversation design problem. High friction for low-vision users who already find typing costly.

## Hard problems

- **Hallucination risk in medical expansions**: If the expansion invents plausible but incorrect medical context ("wet AMD with CNV involvement"), it may retrieve wrong chunks confidently. The knowledge base is not exhaustive — expansion can point retrieval outside the available content.
- **When not to expand**: A well-formed query should not be over-expanded. Distinguishing "short but precise" from "short and vague" requires a classifier or a prompt heuristic that is easy to get wrong.
- **Latency budget**: The system already makes a conditional gpt-4o-mini call for rewriting. Adding a second conditional call doubles worst-case first-token latency. For a voice-first system, this is material.
- **Evaluation**: It is hard to know if expansion helped without labelled query–chunk pairs. The synthetic query dataset (see `docs/explore/2026-03-08-synthetic-query-generation.md`) would need to include short/vague variants.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What fraction of real user queries are short (<6 tokens)? | Determines whether this problem is common enough to warrant the complexity | Analyse session logs (query length distribution) |
| Does the existing hybrid search already compensate? | BM25 partial match may already surface the right chunks for short keyword queries | Compare retrieval hit rate for short queries with/without expansion in eval |
| What is the actual miss rate at threshold 0.5 for short queries? | If the threshold is the binding constraint (not embedding quality), expansion helps less than lowering the threshold | Run eval split by query length against ground-truth chunk labels |
| What is the acceptable latency increase? | Voice users are more sensitive to first-token delay than chat users | Measure p95 latency in current pipeline; set a budget |

## Promising direction

**Direction A** — domain-aware expansion prompt, triggered conditionally on short first-turn queries.

It reuses the existing conditional rewriting infrastructure, adds a single gpt-4o-mini call only when needed, and is scoped to the narrow Macular Society domain (reducing hallucination risk compared to open-domain expansion). HyDE and multi-query are more powerful but introduce latency and complexity that should only be justified if Direction A proves insufficient in eval.
