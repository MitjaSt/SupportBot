# Exploration: Contextual Chunk Annotation for the RAG Pipeline

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Enrich each text chunk with structured context (document title, section heading, topic, and/or an LLM-generated contextual sentence) before embedding and indexing, so that a chunk retrieved in isolation is still semantically self-contained.

---

## Problem interpretations

### Interpretation A: Semantic isolation — chunks lose their provenance

The current pipeline flattens a page to plain text and then slices it by token count. A sentence like *"You should discuss this with your consultant at the next appointment"* is indistinguishable from another sentence with the same surface meaning but about a different condition. When two conditions share vocabulary (AMD, Stargardt, macular hole all involve vision loss and medical appointments), chunks compete for the same embedding neighbourhood. The embedding model sees only the words, not the document hierarchy.

**Who feels it:** Users asking condition-specific questions ("Is this normal for Stargardt's?"). The retriever might return a chunk about AMD care, which is technically similar but wrong in context.

### Interpretation B: BM25 keyword ranking is blind to document structure

The hybrid search already combines vector similarity with BM25 (via RRF). BM25 rewards keyword overlap. But a chunk with the heading stripped away has fewer discriminating terms. The word "injection" appears in AMD treatment chunks, anaesthesia side-effect chunks, and general medical-procedure chunks. Without the heading ("Anti-VEGF Injections — AMD Treatment"), BM25 ranks them equally.

**Who feels it:** All users on any query where the keyword is polysemous within macular disease content — injections, vision loss, referrals, drops, surgery.

### Interpretation C: LLM generation quality degrades when context is implicit

Even when the right chunk is retrieved, the generation step has to reconstruct meaning from decontextualised text. *"The waiting time is typically 2–3 months"* — for what? A GP referral? An injection clinic? A low-vision aid assessment? The LLM either hedges ("this may refer to various services…") or hallucinates a specific service. Both outcomes reduce trust in a medical-domain chatbot where users have low vision and depend on accurate information.

**Who feels it:** Users who need precise actionable information. For our audience, a vague or wrong answer is not a minor annoyance — it may affect when they seek care.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| End user (macular degeneration) | Asks a condition-specific question; retriever returns a chunk from the wrong condition | None — they receive a confidently wrong or vague answer | High |
| End user | Asks about a treatment step (e.g. "what happens after my injection?"); chunk lacks the heading that says "Anti-VEGF Treatment" | LLM hedges or adds caveats | Medium |
| Content editor | Adds a new document to the corpus; can't predict which chunks will lose context after splitting | Manual QA of every page | Medium |
| Developer | Debugging poor retrieval scores; can't trace why a chunk scored low | Inspects raw chunk text, which has no section signal | Low |

*Screen reader and low-vision users receive the same text output as other users — so context loss in generation compounds into longer, less direct answers, which are harder to follow at 200–400% zoom or with a screen reader reading every word aloud.*

---

## Why now

- The knowledge base is growing: new condition pages and treatment guides are being added. The larger and more diverse the corpus, the more chunks compete in the same embedding neighbourhood.
- Hybrid search (RRF) was added recently — contextual annotation would amplify its BM25 leg substantially with zero architecture changes.
- The `ScrapedPage` JSON **already captures heading structure** (`content[].type === 'heading'`). This means a heading-prepend approach has zero LLM cost and could be implemented as a one-day change to `flattenPage` and `chunkDocument`.
- Anthropic published benchmark results (September 2024) showing 35% reduction in retrieval failures from contextual annotation, rising to 67% with reranking. The technique is well-understood and the implementation path is clear.

---

## Existing solutions

**Internal:**
- `flattenPage` in [processing.service.ts](projects/api/src/modules/processing/processing.service.ts) merges headings inline as plain text — structure is preserved in ordering but not attached per-chunk.
- `VectorPoint.payload` already has `title` and `url` fields, and an open `[key: string]: unknown` bag — so the DB schema can take additional fields without migration today.
- `SearchResult` does **not** return `title` or `url` back to the RAG service — so even existing metadata is not being used in generation context.
- `DocumentMetadata` (`document-metadata.service.ts`) carries only `title` and `url` — no section/heading level.

**External:**
- [Anthropic Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) (Sep 2024): LLM generates a 1–2 sentence context per chunk at ingestion time. 35% retrieval failure reduction; 67% with reranking. Uses prompt caching (~$1/M tokens).
- [Unstructured Platform contextual chunking](https://unstructured.io/blog/contextual-chunking-in-unstructured-platform-boost-your-rag-retrieval-accuracy): Structural metadata (parent heading, section depth) prepended without LLM inference. Zero inference cost, partially recovers the benefit.
- [NVIDIA benchmark study](https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses/): 1024-token chunks with 15% overlap perform best on FinanceBench — larger chunks reduce context loss but increase prompt cost and retrieval noise.

---

## Possible directions

### Direction A: Heading-prepend — use existing JSON structure, zero LLM cost

Track the nearest preceding heading for each sentence during chunking. Prepend it to the chunk text before embedding: `"[Section: What to expect at your first appointment]\n\nYour consultant will..."`. The scraped JSON already has this data. Change is confined to `flattenPage` and `chunkDocument`. Requires re-ingestion.

**Rough scope:** 1–2 days. No new services, no new costs.

### Direction B: LLM-generated contextual sentences (Anthropic method)

During ingestion, pass each chunk (with the full document as context) to an LLM. Receive a 1–2 sentence contextualisation. Prepend it before embedding. Uses prompt caching to keep cost low (~$1/M document tokens). Matches the published benchmarks directly.

**Rough scope:** 3–4 days (new ingestion step, prompt caching setup, cost monitoring). Ongoing per-ingestion LLM cost.

### Direction C: Structured metadata header (semi-automatic)

Add a structured header to each flat `.txt` file at ingestion time, extracted from the JSON metadata. The header becomes part of the chunk text:

```
Document: Macular Society — Stargardt Disease Guide
Section: Living With Stargardt Disease
---
Many people with Stargardt disease find that...
```

**Rough scope:** 1–2 days for the prepend logic. Scales automatically from JSON source data.

### Direction D: Return title/url in SearchResult and inject into generation prompt

Independent of chunk-level annotation, the LLM generation step could receive source metadata (title, section) alongside the chunk text. This costs nothing to retrieve — the data is already in the DB — but `SearchResult` currently drops `title` and `url`. Improves generation without changing embeddings.

**Rough scope:** Half a day. Complementary to A/B/C, not a replacement.

---

## Hard problems

- **Re-ingestion cost:** Any change to chunk text requires re-embedding the entire corpus. Acceptable for our corpus size, but it couples content delivery to pipeline runs.
- **Heading attribution accuracy:** The current sentence-based chunker doesn't track which heading a sentence falls under. Adding that tracking means threading state through `chunkDocument` — straightforward but requires care with the overlap window (an overlap chunk spanning a heading boundary needs the *new* heading, not the old one).
- **LLM context quality (Direction B):** The generated context is only as good as the document it sees. If source documents have poor structure, the LLM may generate misleading or generic context. Evaluation is needed before trusting it in production.
- **Prompt size:** Prepending context to every chunk increases token count per chunk. With top-3 retrieval and current ~500-token chunks, a 50-token context header adds ~300 tokens to the prompt. Manageable, but worth tracking against the `RAG_CONTEXT_HISTORY_MESSAGES` budget.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|----------------|--------------------|
| What fraction of retrieval failures are caused by missing section context vs. corpus gaps? | Determines whether this is the highest-leverage retrieval improvement available | Run existing eval scenarios against a heading-prepend prototype; compare hit@3 before/after |
| Do the Macular Society JSON documents have consistent, meaningful heading structure? | Heading-prepend (Direction A) only works if headings are present and informative | Inspect the JSON cache for 10–15 representative documents |
| Does prepending context hurt precision on short factual keyword queries? | Known tension: more context improves recall but can dilute exact-match BM25 ranking | A/B eval scenarios with and without prepend |
| How often is the corpus re-ingested? | Determines whether prompt caching for Direction B actually saves meaningful cost | Check ingestion run history and document change rate |

---

## Promising direction

**Direction A (heading-prepend) combined with Direction D (return metadata to generation).**

Direction A uses data already in the pipeline — zero LLM cost, one-day change, recovers section context for both the embedding and BM25 index. Direction D is a half-day change that immediately improves the generation prompt for all queries. Together they address all three problem interpretations above.

Direction B (LLM-generated context) has the highest ceiling per Anthropic's benchmarks but should follow a validated baseline. The eval infrastructure is already in place to measure the delta once A+D are live.
