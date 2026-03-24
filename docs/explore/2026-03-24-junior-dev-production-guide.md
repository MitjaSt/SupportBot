# Exploration: Junior Developer Production Guide

> Stage: Explore | Date: 2026-03-24
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Create a guide explaining what it takes to productionize this Macular Society RAG platform to a junior developer who can write code but has never shipped or operated a production system — covering architecture, deployment, observability, debugging, and operational workflows, with Mermaid diagrams.

---

## Problem interpretations

### Interpretation A: Mental model gap — "it works on my machine"
The junior dev understands the code but has no mental model of what a running production system looks like. They think of software as a program that runs, not as a distributed set of services that fails in unpredictable ways under real traffic. They need to understand the *operational reality* of this specific stack before they can contribute safely.

### Interpretation B: Onboarding bottleneck for the charity
Macular Society is a charity with limited engineering capacity. Every new developer who joins needs to independently understand what is deployed, why it is deployed that way, and how to debug it without senior handholding. Without a guide, institutional knowledge stays in one person's head — a single point of failure.

### Interpretation C: Production unfamiliarity as a safety risk
This system serves people with macular degeneration — a vulnerable user base. A developer who doesn't understand production observability may deploy a bad change without knowing, or fail to respond to a real user-facing outage. The stakes of operational incompetence are higher here than in a typical SaaS context.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Junior dev joining the project | No exposure to CI/CD, Docker, monitoring, or prod debugging | Asks senior devs repeatedly; makes unsafe changes | High |
| Senior dev / lead | Constantly fielding "how does X work in prod?" | Oral explanations that don't persist | Med |
| Macular Society (charity) | Small team, needs operational resilience | Single person knows the system | High |
| End users (low vision) | Rely on the system being stable and observable | N/A — they feel it as downtime | High |

_Note: End users have macular degeneration. A junior dev unaware of accessibility-critical paths (voice pipeline, screen-reader-friendly UI) could accidentally break them. This makes the "how does it work" question more consequential than usual._

---

## Why now

- The codebase has matured significantly: NestJS API, Drizzle ORM, pgvector, Prometheus/Grafana, Zitadel auth, dual frontend (chat + admin), voice pipeline (Whisper + Piper), LangWatch observability. It is no longer trivial to onboard.
- A limited production trial is the next logical milestone; a junior dev will need to understand the live system to participate.
- Good existing docs (MONITORING.md, AUTH_ZITADEL.md, TESTING_STRATEGY.md) exist but are technical reference docs, not orientation guides. The gap is a narrative that ties it all together.

---

## Existing solutions

**Internal:**
- `CLAUDE.md` — architecture overview, key commands, module map. Good starting point but assumes engineering context.
- `docs/MONITORING.md` — deep Prometheus/Grafana reference; no narrative framing for a newcomer.
- `docs/TESTING_STRATEGY.md` — testing approach, but not deployment or operations.
- `docs/AUTH_ZITADEL.md` — auth detail, not onboarding.
- `docs/SECURITY_RISK_ASSESMENT.md` — security view, not operational.
- `docs/diagrams/2026-03-08-rag-query-sequence.md` — one existing Mermaid diagram for the RAG query flow.
- `docs/explore/2026-03-08-production-failure-modes.md` — failure mode map that could be reused.
- `AGENTS.md` — anti-patterns and learnings; useful for code context, not prod operations.

**External:**
- Standard production readiness checklists (SigNoz, Cortex, Port) — generic, not codebase-specific; would need heavy adaptation.
- "Production Readiness Review" frameworks (Google SRE) — thorough but overwhelming for a junior at a charity scale.

The gap is a single codebase-grounded document that narrates the *whole system* operationally, not a checklist.

---

## Possible directions

### Direction A: Narrative walkthrough with diagrams
A single Markdown document — `docs/PRODUCTION_GUIDE.md` — structured as a story: "A request comes in. Here is what happens. Here is how you know it worked. Here is how you debug it when it didn't." Illustrated with 4–6 Mermaid diagrams covering architecture, request flow, deployment pipeline, observability stack, and debugging workflow. Targeted at 1–2 hours of reading. No prerequisites beyond basic TypeScript/React familiarity.

### Direction B: Modular wiki-style reference
A set of shorter documents under `docs/production/` — one per topic (deployment, monitoring, debugging, auth, secrets, rollback). Each is self-contained. Good for reference but requires a junior to already know which topic they need. Higher maintenance burden as the system evolves.

### Direction C: Interactive onboarding checklist
A structured checklist of tasks ("start the stack locally", "look at a Grafana panel", "read a LangWatch trace", "break something and fix it") that a junior completes to gain operational familiarity. Higher engagement but requires a mentor to validate completion; doesn't work asynchronously.

---

## Hard problems

- **Scope calibration**: Too shallow and it's not useful; too deep and it becomes another reference doc that no one reads. The right level is "enough to not be dangerous" — hard to define without knowing the specific junior.
- **Keeping it current**: The system is actively evolving (admin portal, contact collection persistence, agent orchestration incoming). A narrative doc goes stale quickly if not maintained alongside code changes.
- **Diagrams are load-bearing**: A wall of text won't work for this purpose. Mermaid diagrams must accurately reflect the current architecture — any mismatch confuses more than it helps.
- **Accessibility-specific knowledge**: The junior must understand *why* voice pipeline and screen-reader behaviour matter in ways that a generic production guide does not address. This is a domain-specific wrinkle that requires explicit callouts.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What does the junior dev already know? | Determines the entry point and depth of the guide | Brief conversation or intake questions before writing |
| Which production incidents have already happened? | War stories are the most effective teaching tool | Review git log, Slack/notes for past incidents or near-misses |
| Which parts of the system are most likely to be touched by a junior first? | Determines which modules to cover in depth | Ask the lead: "what would you assign them first?" |
| Is there a deployment pipeline (CI/CD) yet, or is it still manual? | Deployment section can't be written without knowing this | Check `.github/` and Makefile for CI config |

---

## Promising direction

**Direction A** — single narrative document with 4–6 Mermaid diagrams.

A junior dev benefits most from a mental model of the whole before diving into parts. A narrative walkthrough anchored in the actual request/response lifecycle (which already has one diagram) is the fastest path to operational competence. It can reference the existing reference docs (MONITORING.md, AUTH_ZITADEL.md) for depth without duplicating them. The diagrams are essential: system topology, RAG request flow, deployment flow, observability data flow, debugging decision tree.

The guide should be explicit about: (1) what each service does and why it exists, (2) where to look when something goes wrong, (3) what "normal" looks like in Grafana and LangWatch, (4) how to deploy safely and roll back, (5) what the accessibility-critical paths are and why.

---

## What next?

1. **Confirm scope with the lead** — is this purely operational (how to run it), or does it include contribution workflow (how to write and ship code safely)? The former is a 1-2 hour read; the latter doubles the scope.
2. **Identify existing incident stories** — even one real "something broke and here's how we found it" anecdote makes the observability section stick. Worth surfacing before writing.
3. **Ready to produce the guide?** — if Direction A is agreed, this goes straight to implementation (not a full PRD pipeline needed — it's documentation, not a feature). Run `/diagram` to generate architecture diagrams first, then write the narrative around them.
