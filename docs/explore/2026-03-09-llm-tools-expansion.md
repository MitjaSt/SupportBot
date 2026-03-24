# Exploration: Expanding LLM Tool Use — Search, Page Fetch, Structured Extraction

> Stage: Explore | Date: 2026-03-09
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Give the LLM a richer tool belt — dynamic search over the KB, live page fetching, and structured extraction from scraped content — and think about which tools create value for each user type: end users, devs, data scientists, and Macular Society staff.

## Problem interpretations

### Interpretation A: Retrieval quality is capped by the current fixed-chunk pipeline

Today the RAG pipeline always retrieves the same top-3 chunks before the LLM sees the query. For multi-part questions ("What is wet AMD and how does it differ from dry AMD, and what injections are available?"), three chunks may not cover all sub-topics. The LLM gets whatever the vector search surfaces — it cannot ask for more, or search differently, or acknowledge a gap and try another angle. Users with macular degeneration who rephrase a question multiple times (because they don't get a useful answer) pay the cost of this rigidity.

### Interpretation B: Structured knowledge in the corpus is lost at chunking time

The Macular Society website contains tables — support group listings, clinic locations, drug name/availability comparisons, benefit entitlements. Chunking flattens these into prose; embeddings lose the row-column relationships. A user asking "which support groups are in Manchester?" gets a chunk that mentions Manchester somewhere, not a clean list. A structured extraction tool could preserve tabular meaning both at ingestion time and at query time.

### Interpretation C: Different user types are underserved by the same one-size RAG loop

The current system is built for the primary user — a person with macular degeneration asking plain-English questions. But there are other users with fundamentally different needs: Macular Society Samaritans who want to quickly surface specific policy or clinical detail; data scientists who want to inspect what the retriever actually found and why; developers who want to test new retrieval strategies. The "add more tools" idea may really be about serving these secondary users, not just improving the primary chat experience.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|-------------------|------------|
| Person with macular degeneration | Asks a multi-part question, gets a partial answer, rephrases, gets another partial answer | Rephrases and retries multiple times | High — especially for low-vision users where each rephrase is slow and effortful |
| Macular Society Samaritan | Needs to quickly find specific policy detail (eligibility criteria, drug names, referral pathway) during a call | Opens macularsociety.org in a browser and searches manually | Med — it's a parallel workflow, not blocking |
| Data scientist / evaluator | Debugging why a query retrieved the wrong chunks; wants to trace retrieval decisions | Looks at QueryDebugDialog in the admin UI; checks raw DB | Med — tooling exists but is passive, not interactive |
| Developer | Adding a new tool or handler; wants to test it in isolation | Writes unit tests; runs full RAG flow manually | Low — the IToolHandler interface is clean |
| Content manager | Wants to know what structured data (tables, lists) exists in the scraped corpus | No current path | High — no visibility into structured content quality |

_End users have macular degeneration — central vision loss means they rely on screen readers, high-contrast mode, or enlarged text. A "searching..." spinner with no accessible label or a tool response that arrives in a structurally complex format (nested lists, tables) can be unusable. Any new tool that changes the response shape must be evaluated for a11y impact._

## Why now

- The `IToolHandler` interface and `ToolHandlerService` registry are already production-ready. Adding a new tool is a matter of implementing one interface and registering the handler — the plumbing exists.
- The corpus is growing. As more pages are scraped, single-query top-3 retrieval will increasingly miss relevant chunks that exist but weren't the closest cosine neighbours.
- The admin UI (QueryDebugDialog) creates appetite from internal users for more transparency into retrieval — a search tool that exposes its reasoning would feed that need.
- Agentic RAG patterns have matured (LlamaIndex, Azure AI Search, LangGraph) and there is clear evidence that letting the LLM formulate its own retrieval queries improves answer quality for complex questions.

## Existing solutions

**Internal:**
- `collect_contact_information` tool — the only current tool; handler pattern well established
- `VectorDbService` — already abstracts the search backend; `search()` method is injectable
- `QueryDebugDialog` in admin frontend — surfaces retrieved chunks, scores, and the rewritten query
- Query rewriting already runs before retrieval (makes follow-ups self-contained); a search tool would do this inside the generation loop instead

**External:**
- **LlamaIndex agentic retrieval** — full framework; heavy dependency, overkill for a bounded charity corpus
- **Azure AI Search agentic retrieval** — decomposes queries into parallel sub-queries; vendor lock-in
- **Contextual Retrieval (Anthropic)** — prepends LLM-generated summaries to chunks at ingestion; reported 49% reduction in retrieval failures; complementary to tool use, not a replacement
- **GraphRAG (Microsoft)** — builds a knowledge graph over the corpus; powerful for relationship queries ("which conditions share the same treatment?") but significant ingestion infrastructure cost

## Possible directions

### Direction A: Dynamic search tool (`search_knowledge_base`)

Replace the pre-retrieval step with a tool the LLM can call itself. The LLM receives the user query (no pre-loaded chunks) and decides whether to search, what to search for, and whether to search again after reviewing the first results. The existing `VectorDbService.search()` becomes the tool's implementation. The current top-3 fixed retrieval is replaced by up to N tool calls per generation.

Scope: medium. Requires refactoring `rag.service.ts` to support multi-turn tool loops. SSE streaming needs a new event type to surface "searching..." state to the frontend. The `IToolHandler` interface may need to return structured chunks rather than a final answer.

### Direction B: Structured extraction tool at ingestion time

During the pipeline ingestion step, detect pages with tables/lists and emit structured JSON chunks alongside prose chunks. A new tool (`lookup_structured_data`) lets the LLM query these structured records directly, bypassing embedding similarity for exact-match lookups (e.g., "support groups in Scotland", "drugs approved for wet AMD").

Scope: medium-large. Requires pipeline changes to detect and extract structured content, a new schema column or table for structured records, and a lookup handler. Does not change the generation loop structure.

### Direction C: Page fetch tool (`fetch_page`)

Give the LLM the ability to retrieve a live Macular Society page by URL when the KB doesn't have a sufficient answer. The tool fetches the page, strips HTML, and returns text to the LLM.

Scope: small implementation, large risk surface. Fetching live content bypasses the curated KB — unvetted content could introduce medical misinformation. Also introduces SSRF risk (the LLM could be prompt-injected into fetching arbitrary URLs). Likely appropriate only for admin/internal users, not the primary chat interface.

### Direction D: Per-user-type tool sets

Expose different tool sets based on auth context. Public chat users get only `collect_contact_information` and optionally `search_knowledge_base`. Admin users get `fetch_page`, `extract_structured`, and debugging tools. This is an access control layer over whichever tools are built.

Scope: small incremental once tools exist. Requires the RAG service to receive auth context and filter the `RAG_TOOLS` array accordingly.

## Hard problems

- **Latency in the generation loop.** A search tool call adds a full round-trip: LLM decides to search → API calls `search()` → results returned to LLM → LLM continues generating. For a query that triggers two searches, response time roughly triples. The streaming UX must communicate progress or users will perceive the system as broken — especially critical for low-vision users who can't see a spinner.
- **Tool call depth limit.** Without a max-iteration guard, the LLM can loop (search → unsatisfied → search again → ...). The generation loop needs a configurable cap (e.g., 3 tool calls max) to prevent runaway latency and cost.
- **Structured extraction fidelity.** HTML tables on the Macular Society site are often inconsistent — merged cells, implicit headers, navigation menus misidentified as data. A naive extractor will produce garbage. Needs per-page validation or LLM-assisted parsing at ingestion time.
- **Page fetch security.** If the LLM can call `fetch_page`, a prompt-injected user could cause it to fetch arbitrary URLs. Allowlisting to `macularsociety.org` and a few partner domains is necessary; this must be enforced server-side, not in the system prompt.
- **Accessibility of tool responses.** If the search tool returns intermediate "I found 3 chunks about..." messages in the SSE stream, the frontend must handle these without breaking screen reader flow. The `type: 'tool'` StreamEvent already exists but the frontend currently doesn't render it to users.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|----------------|--------------------|
| Does the LLM actually produce better answers with dynamic search vs. pre-loaded chunks? | If the quality gain is marginal, the latency cost is not justified | Run A/B eval with LangWatch scenarios: fixed top-3 vs. agentic search on the existing eval question set |
| Which queries benefit most from multi-search? | Scopes which users/use-cases justify the investment | Analyse QueryDebugDialog logs for sessions with multiple follow-up turns; identify questions that required rephrasing |
| How much structured tabular data exists in the scraped corpus? | Determines whether Direction B has enough material to be worthwhile | Run a one-off scan of the `chunks` table for rows that contain `<table>` markers or structured list patterns |
| What is the latency budget for end users with macular degeneration? | Determines whether agentic retrieval is acceptable at all | No current performance SLA exists — needs defining, ideally from user research or stakeholder input |
| Can `fetch_page` be safely scoped to admin-only without significant re-architecture? | Determines whether it's a quick add-on or requires auth plumbing throughout the RAG layer | Review how auth context flows from `chat.controller.ts` into `rag.service.ts` today |

## Promising direction

**Direction A (dynamic search tool)** — highest user impact and most reusable foundation.

The `IToolHandler` infrastructure is already built for exactly this pattern. A `search_knowledge_base` tool would let the LLM handle multi-part questions, reformulate searches when the first result is poor, and explicitly signal when it can't find an answer — rather than silently hallucinating or giving a partial response. For end users with macular degeneration, fewer rephrasing cycles is a direct quality-of-life improvement. The main risk is latency; this should be validated with a quick eval before committing to a full implementation. Direction B (structured extraction) is complementary and could follow once the tool loop is proven.
