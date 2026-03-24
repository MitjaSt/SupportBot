# Exploration: Client-Agnostic RAG Platform

> Stage: Explore | Date: 2026-03-09
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Refactor the RAG platform so that Macular Society-specific logic is isolated and replaceable, allowing the same codebase to be deployed for multiple clients without code changes.

## Problem interpretations

### Interpretation A: Hardcoded strings leaking into the wrong layer

The business identity of Macular Society is scattered across service logic — inline prompts, validation rules, metric names, and contact confirmation copy. This is a layering violation: business identity belongs in configuration, not in code. For a second deployment you would need to hunt and replace strings across a dozen files, which is error-prone and leaves Macular Society copy in another client's product.

### Interpretation B: Feature coupling — one client's bespoke workflow embedded in the core

The contact collection feature (UK phone validation, callback promise, conversation history export) is a charity-specific support model that will not exist for most clients. It is currently wired into the RAG pipeline as a first-class tool. A new client would need to either carry dead code or surgically remove it. The deeper problem is that `rag.service.ts` and `tools.ts` assume this tool always exists.

### Interpretation C: Configuration versus tenancy — which scope are we solving for?

There is a meaningful difference between "one deployment per client, configured differently" (a configuration problem) and "one deployment for all clients simultaneously" (a multi-tenancy problem). The two demand very different architectures. Solving for configuration is low-risk and probably sufficient. Solving for multi-tenancy introduces data isolation requirements, per-tenant prompt routing, and namespace partitioning — substantial work that may be premature.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer deploying for new client | Must grep and replace strings across ~10 files before first deploy | Manual find/replace, hope nothing is missed | High |
| Developer adding client-specific feature | No clear seam to hang client-specific code; edits shared modules | Modifies core files, accumulates divergent forks | High |
| Operator reading Prometheus | Dashboards are named `macular_*`; renaming breaks all existing panels | Rebuild dashboards per client | Medium |
| Macular Society users | No direct impact — this is an operational problem | N/A | N/A |

## Why now

- The codebase is young enough that the surface area is manageable — ~10 files, mostly string constants and one structural hardcoding.
- A second client engagement would force this anyway; doing it speculatively now costs far less than mid-project surgery.
- The contact collection feature is the biggest risk: if the next client does not need callbacks, the tool calling infrastructure either needs to be stripped or left as dead code in the system prompt.

## Existing solutions

**Internal:**
- System prompt is already externalized to LangWatch/LangFuse — the most critical text is already right.
- All RAG tuning parameters (topK, threshold, chunk size, model) are already env-driven.
- Auth, voice, prompt guard, and observability are all feature-flagged via env vars.
- The core pipeline (embed → retrieve → generate → stream) has zero client-specific logic.

**External:**
- Industry standard for single-client deployments is a **tenant config file** (JSON or env) loaded at boot — simple, well-understood, no infrastructure change.
- AWS and Azure multi-tenant RAG patterns converge on three models: Silo (separate index per tenant), Pool (shared index + metadata filter), Bridge (hybrid). These are overkill for "one deployment per client" but are the right reference if the product ever becomes a hosted platform.
- Products like Ragie and LangWatch natively support per-tenant prompt/config isolation — worth noting if we ever move to a managed approach.

## Possible directions

### Direction A: Tenant configuration object

Introduce a single `tenant.config.ts` (or `tenant.json`) loaded at boot alongside `.env.config`. It supplies: org name, support org name for contact messages, locale (for phone validation), metric prefix, inline prompt templates (summarisation, suggestions, query-rewrite examples), and content filter rules (excluded URL prefixes, criteria file prefixes). All ten client-specific strings and two structural hardcodings read from this object. One file to change per deployment. Zero code changes.

### Direction B: Plugin/adapter pattern for optional features

Define an interface for optional pipeline extensions (`ToolPlugin`, `ContactAdapter`, etc.) that the core registers at boot from config. Contact collection becomes `macular-contact-plugin` — loaded only when `CONTACT_PLUGIN=macular`. The core `rag.service.ts` and `tools.ts` expose a `registerTools()` extension point; `RAG_TOOLS` becomes an empty array by default. New clients that need a different escalation model (Zendesk ticket, HubSpot form, email webhook) bring their own plugin.

### Direction C: Full multi-tenancy with per-tenant namespacing

Add a `tenantId` to every request, propagate it through the pipeline, and use pgvector metadata filtering to serve separate knowledge bases from one deployment. Per-tenant configuration is stored in a `tenants` table. Prometheus metrics carry a `tenant` label. This enables one running instance to serve Macular Society, Client B, and Client C simultaneously. Operationally simpler for a managed offering; architecturally much more complex to implement safely.

## Hard problems

- **Prometheus metric naming**: All 28 metric names are `macular_*` and are likely baked into Grafana dashboard JSON. Renaming them to a configurable prefix would require regenerating or parameterising all dashboard panels.
- **Query rewrite prompt examples**: `QUERY_REWRITE_PROMPT` in `rag.service.ts` contains six AMD/macular-specific examples. Externalising the template text is easy; providing equivalent high-quality examples for a new domain requires domain knowledge that must come from the client.
- **Contact collection is a full state machine**: It is not just a string — it includes phone format validation (UK-specific regexes), conversation history persistence, and a callback confirmation UX flow. Making this truly pluggable requires defining a clean interface boundary, not just moving a string.
- **Criteria generation file filter**: `criteriaGeneration()` hardcodes four Macular Society URL slug prefixes. This is the most structurally unusual coupling — it encodes knowledge of their sitemap structure in TypeScript. The right fix is a configurable list, but the deeper question is whether criteria generation is even relevant for a different client's content pipeline.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Will the next client need contact collection at all? | Determines whether we need a plugin interface or just a feature flag | Confirm with stakeholders before building adapter abstractions |
| Will multiple clients run on the same deployment? | Determines whether Direction A (config) is sufficient or Direction C (multi-tenancy) is required | Business/commercial decision, not a technical one |
| How much of the Grafana dashboard config is committed? | Renaming metrics is only painful if dashboards are checked in and maintained | Check `docker/` for dashboard provisioning JSON |
| Does the query rewrite prompt actually need domain-specific examples, or are generic ones sufficient? | Affects whether externalising the template is enough, or whether client onboarding requires prompt engineering work | A/B test generic vs specific examples on the Macular Society dataset |

## Promising direction

**Direction A with a seam for Direction B** — configure first, extend later.

Introduce a `TenantConfig` object loaded at boot (Direction A). This immediately removes all hardcoded strings, fixes the metric prefix, and makes the excluded-prefix lists configurable — with a single file to edit per deployment. At the same time, refactor `RAG_TOOLS` to be assembled from a configurable list rather than a static constant, leaving a natural extension point for Direction B without committing to the full plugin architecture yet. Direction C (multi-tenancy) should not be pursued until there is a concrete second client and a business model that requires shared infrastructure.
