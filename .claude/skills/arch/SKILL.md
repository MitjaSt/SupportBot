---
name: arch
description: Technical design for an approved PRD. Identifies the hardest engineering problems first, then produces an architecture spec covering components, data flow, interfaces, failure handling, and observability. Reads the PRD. Usage: /arch <feature name or PRD filename>
---

# Architecture

Translates an approved PRD into a concrete technical design. Starts by naming the **3 hardest engineering problems** the feature introduces — the architecture must directly address each one. Output feeds into `/qa` and `/plan`.

Read the PRD before writing anything. Do not design in a vacuum.

**Target length:** 600–1200 words. Prefer ASCII diagrams over prose for structure.

## Usage

```
/arch <feature name or path to PRD file>
```

Examples:
- `/arch OpenAPI spec`
- `/arch docs/prd/2026-03-07-openapi-spec.md`

---

## Instructions

### Pre-step: Model check

Before doing anything else, say this to the user:

---

**Model recommendation:** `/arch` requires reasoning across complex, interconnected systems — Opus produces more rigorous designs and catches tradeoffs Sonnet tends to miss.

You are currently on **Sonnet**. To get better results, switch first:
```
/model claude-opus-4-6
```
Then re-run the skill.

**Continue on Sonnet anyway?** Reply `yes` to proceed, or switch models and re-run.

---

Wait for the user to reply. If they say `yes` (or any affirmative), proceed. Otherwise stop here.

### Step 0: Locate the PRD

- If `$ARGS` is a file path, read it directly
- Otherwise use `Glob` to search `docs/prd/` for a filename matching the idea

If no PRD is found: "No PRD found for this feature. Run `/prd [idea]` first, or pass the PRD file path directly."

Summarise the PRD in 3 bullets: problem statement, recommended approach, key constraints.

---

### Step 1: Codebase recon

Understand the existing architecture in the affected area.

- Use `Grep` and `Glob` to find existing modules, services, and patterns that will be affected
- Reference `CLAUDE.md` module map for the affected areas
- Check `docs/adr/` for prior decisions that constrain this design
- Look for existing patterns to follow (NestJS module structure, Drizzle ORM, SSE streaming, pgvector raw SQL, TypeBox validation)

Summarise in 3–5 bullets. Flag any conflict between PRD requirements and existing constraints.

---

### Step 2: Research _(only if needed)_

Run 1–2 web searches only if the PRD introduces an unfamiliar technology or pattern:

- "[technology] NestJS integration best practices"
- "[pattern] TypeScript implementation"

Skip this step if the approach uses only existing project patterns.

---

### Step 3: Name the 3 hardest problems

Before writing the spec, explicitly state the 3 most difficult engineering challenges this feature introduces. The architecture must directly address each one.

```
Hard problems:
1. [Specific challenge]
2. [Specific challenge]
3. [Specific challenge]
```

---

### Step 4: Write the Architecture Spec

```markdown
# Architecture: [Feature]

> Stage: Architecture | Date: [today] | PRD: [filename]
> Pipeline: Explore → PRD → **Architecture** → QA → Plan → Value → Challenge → Decision

## Overview

[2–3 sentences. What is being built, which parts of the system it touches, and what the key design decision is.]

## Hard problems addressed

| Problem | How the design solves it |
|---------|--------------------------|
| [Problem 1] | [Design decision] |
| [Problem 2] | [Design decision] |
| [Problem 3] | [Design decision] |

## System diagram

```
[ASCII — show the key data path, keep it minimal]

Client (React :5173)
  ↓ HTTP / SSE
API (NestJS / Fastify :3030)
  ↓
[New or modified module/service]
  ↓
[PostgreSQL / pgvector / OpenAI / external]
```

## Components

| Component | Responsibility | Status |
|-----------|---------------|--------|
| [Name] | [What it does] | New / Modified / Existing |

## Data flow

How a request moves through the system end-to-end.

1. [Step — who initiates, what is sent]
2. [Step — how it is processed]
3. [Step — what is returned]

## Interfaces

New or modified APIs, events, or internal contracts.

```
POST /[path]
Request:  { field: type }
Response: { field: type }

// Internal service interface (if applicable)
interface [ServiceName] {
  method(arg: Type): Promise<ReturnType>
}
```

## Data model

Schema changes or new entities. Include migration approach if altering existing tables.

```sql
-- New table or ALTER TABLE statement
```

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|

## Failure handling

| Failure | Trigger | System response | User experience |
|---------|---------|----------------|-----------------|
| [e.g., OpenAI timeout] | [How it occurs] | [Retry / fallback / error] | [What user sees] |

## Observability

**Metrics:**
- [Counter/gauge — what it measures and why]

**Logs:**
- [Event — what to log, at what level]

**Alerts:**
- [Condition] → [Action]

## Security considerations _(omit if not applicable)_

- Authentication: [approach]
- Authorization: [who can access what]
- PII: [what data is handled and how it is protected]
- External integrations: [trust boundary]

## Performance considerations _(omit if not relevant)_

- Expected load: [req/s or concurrent users]
- Bottleneck: [where pressure concentrates]
- Caching or batching: [approach, if applicable]

## Migration plan _(omit if greenfield)_

- Schema: [migration approach and rollback]
- API: [versioning strategy if breaking change]

## Open technical questions

Must be resolved before implementation starts.

1. [Question]
2. [Question]
```

---

### Step 5: Save to file

1. Run `mkdir -p docs/architecture` via Bash
2. Write to `docs/architecture/YYYY-MM-DD-[slug].md`
3. Tell the user: "Saved to `docs/architecture/[filename]`"

---

### Step 6: Invite next step

```
---

## What next?

1. **[Most critical open question]** — needs resolution before implementation
2. **[Riskiest component]** — worth a proof-of-concept first?
3. **Ready to build?** — run `/plan [feature]` to combine this design with a QA strategy
   and task breakdown in one document, or `/qa [feature]` for a standalone test strategy.
```

---

## Tone and output rules

- Design the hardest parts explicitly — do not paper over unknowns with vague prose.
- ASCII diagrams over prose for structure. Keep them minimal and readable.
- Make concrete choices and justify briefly. "TBD" in an architecture spec is a red flag — use Open technical questions instead.
- This project: NestJS + Fastify adapter, Drizzle ORM (Postgres), pgvector (raw SQL for vector ops), OpenAI, SSE / AsyncGenerator streaming, MUI v5 frontend. Default to existing patterns.
- If the PRD's recommended approach has architectural implications not fully worked out, resolve them here — do not carry ambiguity forward.
