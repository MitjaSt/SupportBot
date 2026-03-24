# Exploration: Rules Engine for RAG Pipeline Flows

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Introduce a rules engine to sit alongside the core RAG pipeline, enabling different flows (retrieval strategy, prompt selection, model choice, response post-processing) to be triggered by declarative rules evaluated against query-time facts — without modifying core service code.

## Problem interpretations

### Interpretation A: The pipeline is a single rigid track

The current `rag.service.ts` executes a fixed sequence: rewrite → retrieve → generate → stream. Every query takes the same path regardless of intent, topic, or conversational state. As the platform grows (multi-client, more intent types, domain specialisations), this forces branching logic into the core service or demands parallel service implementations. The real problem is that there is no seam between "what to do" and "how to decide what to do."

### Interpretation B: Decision logic is scattered and hardcoded

Rules already exist in the pipeline — `needsRewriting()` is a regex-based rule; the hybrid search flag is a boolean rule; the score threshold is a threshold rule; tool selection is an LLM-delegated rule. These are distributed across different files, expressed in different languages (regex, config booleans, prompt text), and opaque to anyone not reading the code. A rules engine would make these decisions visible, testable, and modifiable in one place.

### Interpretation C: Flow variation needed for different query types or clients

Some queries warrant different handling: a question about emergency symptoms should skip low-confidence retrieval fallback; a contact-collection flow needs a completely different generation path; a future client might need an entirely different retrieval strategy or tool set. Today, serving these variants requires code changes. A rules engine would let you define "if query intent = X and retrieval confidence < 0.5, use flow Y" without touching service code — especially valuable combined with the tenant config direction from the client-agnostic exploration.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer adding new query flow | Must modify `rag.service.ts` or `tool-handler.service.ts` directly | Edit core files, risk breaking existing flows | High |
| Operator tuning pipeline behaviour | No way to change routing logic without a deploy | Change env vars (limited) or redeploy | Medium |
| Product owner wanting different flows per topic | No mechanism exists | File a ticket for a code change | Medium |
| Low-vision users | Not directly affected — but incorrect flow selection (e.g., generating when retrieval failed) produces worse answers, higher cost for this user group | None | High (indirect) |

## Why now

- The pipeline is simple now — adding the seam before it becomes complex is far cheaper than retrofitting it.
- The client-agnostic exploration (2026-03-09) identified that `rag.service.ts` needs extension points for client-specific tools and prompts. A rules engine is a natural fit for that extension mechanism.
- `needsRewriting()` and `hybridSearchEnabled` already demonstrate that ad-hoc rules are accumulating. Better to formalise the pattern before there are ten of them.
- `json-rules-engine` is a mature, well-adopted Node.js library (189 dependents, v7.3.1) that fits the TypeScript/NestJS stack with no infrastructure change.

## Existing solutions

**Internal:**
- `needsRewriting()` — a hardcoded regex rule in `rag.service.ts`. The simplest form of a rules check.
- `hybridSearchEnabled` config flag — a boolean rule routing to `hybridSearch` vs `search`.
- `ToolHandlerService` — already a strategy dispatch pattern for tool calls.
- `contact-collection.handler.ts` — an intent-specific handler that diverges from the standard generation flow.
- These are the natural seeds of a rules engine — they just lack a shared evaluation model.

**External:**
- `json-rules-engine` — JSON-defined rules evaluated against a "facts" object. Supports `all`/`any`/`none` conditions, fact-to-fact comparisons, priority ordering, and event emission. No UI, no extra infra. Supports async fact functions.
- LangGraph / Haystack conditional routing — graph-based flow orchestration. More powerful but heavier; designed around LLM agent loops, not simple rule-driven routing.
- Strategy pattern (NestJS) — selecting a handler class at runtime based on context. Already in use (`ToolHandlerService`). Handles execution well but does not address the decision/evaluation layer.
- Hand-rolled if/else — what exists today. Zero dependencies, high coupling, poor testability.

## Possible directions

### Direction A: Rules engine as a pre- and post-retrieval pipeline router

A `PipelineRouterService` evaluates a `json-rules-engine` ruleset against query-time facts and returns a `PipelineConfig` — which retrieval strategy, which prompt template, topK/threshold overrides, whether to skip retrieval. The core `RagService` calls the router at two points: before rewrite (using facts available upfront) and after retrieval (using retrieval score facts). Rules live in a JSON file per tenant.

**Concrete examples of what you could express:**
- `retrievalScore < 0.4` → use fallback "I don't have information on that" prompt
- `queryIntent = 'contact'` → skip retrieval entirely, invoke contact-collection handler
- `queryLength > 500` → enable summarisation pre-processing
- `tenantId = 'macular'` AND `topicCategory = 'emergency'` → topK=5, threshold=0.8
- `conversationTurnCount > 10` → truncate history to last 5 turns
- Migrate `needsRewriting()` → rule: `hasPronoun = true OR hasFollowUpIndicator = true` → rewrite

### Direction B: Rules engine for response post-processing only

Instead of routing, use rules to annotate or modify responses after generation: append disclaimers when medical advice is detected, add a "contact us" CTA when confidence is low, flag responses for human review when specific keywords appear. Additive and lower risk — the core pipeline is untouched. Natural follow-on to Direction A.

### Direction C: LLM-based intent classification feeding a strategy selector

Use a cheap LLM call (gpt-4o-mini) to classify query intent into a small taxonomy (informational, contact-seeking, out-of-scope, emergency). A `FlowSelector` maps intent to a `FlowStrategy`. More flexible for ambiguous intent; more expensive and less deterministic than static rules.

### Direction D: Hybrid — deterministic rules first, LLM fallback

Evaluate cheap deterministic rules first (keyword matching, regex, session state). If no rule fires with sufficient confidence, fall back to LLM classification as an async fact provider inside the rules engine. Avoids LLM cost for obvious cases while handling ambiguous ones. `json-rules-engine` supports async facts natively, making this feasible without a separate architecture.

## Hard problems

- **Multi-stage fact availability**: Facts like retrieval score are not available until after retrieval — so some rules must fire post-retrieval. The architecture needs two evaluation passes, which complicates a single-pass design.
- **Rule ownership and maintenance**: Rules in JSON are visible and editable, but someone must own them. If product wants to change routing logic, do they edit a JSON file directly, or does that require a developer? Unclear ownership leads to drift.
- **Testing rules as first-class artifacts**: Rules must be tested in isolation (does this rule fire correctly?) and in integration (does the correct flow execute when the rule fires?). Requires deliberate test fixtures — not hard, but not free.
- **Streaming generator contract**: The pipeline is an `AsyncGenerator`. Switching flows mid-evaluation (e.g., deciding post-retrieval to use a different generation path) must not break the stream contract seen by the controller and client.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| How often do different query types require different flows today? | Determines urgency — if 98% of queries go the same path, the seam is premature | Analyse LangWatch traces for intent distribution |
| Static (deploy-time) or dynamic (runtime-editable) rules? | Dynamic needs a DB table + admin UI; static is a JSON file in source | Product/ops decision: who changes rules and how often? |
| Does retrieval score reliably predict answer quality? | A low-score retrieval might still yield a good answer | Correlate LangWatch retrieval scores with user satisfaction signals |
| Can async fact functions in `json-rules-engine` add acceptable latency? | If the LLM classifier fact adds >200ms, Direction D is too slow for the hot path | Benchmark gpt-4o-mini classification latency in isolation |

## Promising direction

**Direction A with Direction B as a follow-on** — route first, annotate later.

Start with a `PipelineRouterService` using `json-rules-engine`. Define facts from data already available at query time (no extra LLM calls): query text, session state, conversation length, retrieved chunk count and max score. Migrate `needsRewriting()` and `hybridSearchEnabled` into the ruleset as the first two rules — this validates the pattern against existing behaviour before adding new flows. Direction B (post-processing annotations) is a natural second step once the routing seam exists. Direction D (LLM as async fact) can be layered in later without restructuring.

This converts scattered ad-hoc decisions into a single auditable, testable artefact — and creates the extension point the client-agnostic work needs — without requiring a graph orchestration framework or adding LLM cost to the hot path.
