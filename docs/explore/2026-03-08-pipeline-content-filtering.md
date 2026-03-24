# Exploration: Pipeline Content Filtering — Excluding Low-Value Pages from RAG

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Filter low-value or time-bounded pages (e.g. past events) from the RAG knowledge base before they
are summarised and embedded, using a combination of sitemap metadata, URL pattern rules, and
optionally an LLM relevance gate during summarisation.

---

## Problem interpretations

### Interpretation A: Stale content degrades retrieval quality

Past events, outdated webinars, and superseded pages still get embedded. At query time, the
retrieval step pulls these stale chunks, injects them into the LLM context, and the model may
respond with event details for things that have already happened — confusing users who have
macular degeneration and are already in a complex information-seeking situation. The real cost is
not just irrelevance; it's actively wrong answers.

### Interpretation B: Wasted summarisation budget

The OpenAI summarisation call runs on every flat file that is not excluded by the filename prefix
list. Pages about previous webinars, archived events, or expired support calls all consume tokens
and wall-clock time during pipeline runs. The corpus is small now, but the cost compounds each
time a full pipeline re-run is triggered.

### Interpretation C: The exclusion list does not capture semantic intent

The existing `EXCLUDED_FILE_PREFIXES` approach (about-, careers-, donate-, etc.) is a filename
heuristic bolted on after scraping. It misses URL-level structure (e.g. `/events/previous-*/`),
ignores the `lastmod` signal from the sitemap, and cannot detect pages that are structurally fine
but semantically empty or ephemeral — like a webinar registration page scraped weeks after the
event closed.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| End user (macular degeneration) | Asks "are there any webinars coming up?" and gets a result about a 2023 webinar | None — they receive bad info | High |
| Operator re-running the pipeline | Sits through a slow summarisation run over pages that add no value | Manual curation of the flat dir | Med |
| Developer extending the pipeline | Wants to add a new site section and must remember to update a growing exclusion list | Code review / documentation | Low |

---

## Why now

- The sitemap already exposes `lastmod` and `priority`; both are unused.
- The `ScrapedPage` interface stores `url` but not `lastmod` — a small gap to close.
- The corpus is small enough that a policy change is safe and reversible; at larger scale,
  re-filtering becomes expensive.
- There is existing precedent (`EXCLUDED_FILE_PREFIXES`) that proves the team already accepts
  filtering as a pattern — this is an extension, not a new concept.

---

## Existing solutions

**Internal:**
- `EXCLUDED_FILE_PREFIXES` in `processing.service.ts:20-33` — filename-based exclusion at the
  flatten step. Covers about/careers/donate/news etc. Does not use URL path segments or dates.
- `priority: 0` pages in the sitemap are already crawled — there is no sitemap-level gate.

**External:**
- Sitemap-level pre-filtering with `lastmod` + URL regex is standard practice in production
  scrapers (RegEx on URL path, threshold on `lastmod` age). Zero LLM cost; happens before HTTP.
- LlamaIndex and Haystack both offer "document filter" nodes in ingestion pipelines — an LLM or
  classifier node returns a discard signal before the chunk is embedded. Adds latency and cost
  but catches semantic irrelevance the heuristic rules miss.
- CRAG-style retrieval-time filtering (check retrieved chunk freshness before injecting) is an
  alternative but is downstream — it fixes symptoms not the source.

---

## Possible directions

### Direction A: Sitemap-level pre-filter (shift left, zero LLM cost)

Store `lastmod` from the sitemap XML alongside the scraped JSON. Add a URL-pattern + date-age
rule at the scrape stage (or flatten stage) that discards:
- URLs matching `/events/` + `lastmod` older than N months (configurable).
- Optionally, URLs with `priority: 0` across all content types.

This is purely deterministic. No LLM calls. The rule set is small and easy to test. It mirrors
what search-engine crawl budget strategies already do with sitemaps.

**Scope:** Store `lastmod` in `ScrapedPage`; add a rule engine in `flattenAll()` or upstream in
the scraper; make rules configurable via env or a JSON config file.

### Direction B: LLM relevance gate at summarisation (semantic, catches what rules miss)

Modify `SUMMARIZATION_PROMPT` to include a relevance assessment: if the content is not useful for
a medical Q&A knowledge base (e.g. it is only logistics about a past event, a registration form,
or a placeholder), the model outputs a sentinel string (`OMIT_THIS_CONTENT`) instead of a
summary. The `summarizeFile()` method checks for this sentinel and skips writing to disk.

This catches pages that pass all heuristic rules but are semantically empty or ephemeral. It also
degrades gracefully: if the model is uncertain, it writes a summary and the page stays in.

**Scope:** Prompt change, sentinel check in `summarizeFile()`, log the omit decision.

### Direction C: URL-type taxonomy with a rule config file

Define a structured ruleset (JSON/YAML) that classifies URL patterns into content types
(e.g. `event`, `news`, `product`, `resource`) and assigns each type a retention policy
(`always`, `if-recent:180d`, `never`). The pipeline evaluates each scraped URL against the
taxonomy before processing.

This is more expressive than the current prefix list and more auditable than an LLM gate. It
requires upfront taxonomy design but the Macular Society site has a predictable structure.

**Scope:** Rule config file; URL classifier in `flattenAll()`; admin endpoint to preview which
URLs would be excluded before a full run.

### Direction D: Combined — rules first, LLM gate as fallback

Run Direction A and C first (deterministic, free). For pages that pass all rules but are
flagged as "uncertain" by the URL taxonomy (e.g. an events page that is recent), run the LLM
gate from Direction B. This minimises LLM cost while covering the semantic edge cases.

---

## Hard problems

- **False positives on event URLs:** Some "previous event" pages embed the full webinar video or
  transcript and are genuinely useful for RAG (e.g. "what did the AMD webinar say about
  treatment?"). A `lastmod` + URL rule would silently discard this content. An LLM gate would
  likely keep it (the content is substantive), but adds cost.
- **Sitemap `lastmod` is not always reliable:** Site owners often set `lastmod` to the build date,
  not the content date. An event from 2022 might show `lastmod: 2024-07-26` if the site was
  rebuilt. The URL path segment (e.g. `/2024/`) is often more reliable for event pages.
- **`lastmod` is not currently captured:** The scraper does not store it in `ScrapedPage`. This
  requires a schema change and a scraper change, or a second pass over the sitemap XML at filter
  time.
- **LLM sentinel approach is non-deterministic:** The model may decide differently on the same
  page across runs, making the pipeline non-reproducible. Logging which pages were omitted and
  why is essential.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What fraction of the current corpus is past events / low-value pages? | Determines urgency and whether this is a significant quality problem today | Inspect `cache/json/` filenames and URLs; grep for `/events/` |
| Does the sitemap `lastmod` accurately reflect content age for event pages? | Drives whether Direction A is reliable | Compare `lastmod` values in sitemap with URL year segments for event URLs |
| Do any past-event pages contain substantive medical content worth keeping? | Determines how aggressive the filter can be | Sample 5–10 past-event pages and assess content quality |
| What is the LLM sentinel's false-positive rate (omitting useful content)? | If high, the LLM gate is dangerous | Spike: run Direction B on a sample of 20 flat files and review |

---

## Promising direction

**Direction A + C** — URL taxonomy rules evaluated at the flatten step, with `lastmod` added to
the scraped metadata.

This is the cheapest, most auditable, and most reversible option. The Macular Society site has a
consistent URL structure (`/events/`, `/previous-*/`, `/year/`) that makes pattern rules reliable.
`lastmod` plus URL year segment gives a two-signal confirmation that avoids the `lastmod`
reliability problem. No LLM cost added to the pipeline. If edge cases surface after a few runs,
Direction B (the LLM gate) can be layered on top for pages that are uncertain under the taxonomy.

The key prerequisite — storing `lastmod` from the sitemap — is a small, well-scoped change to the
scraper and the `ScrapedPage` schema.
