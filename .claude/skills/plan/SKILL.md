---
name: plan
description: Implementation plan for an approved PRD. Combines technical design, QA strategy, and task breakdown into a single ready-to-build document. Replaces the separate /arch → /qa sequence for most features. Usage: /plan <feature name>
---

# Plan

The "ready to build" document. Combines technical architecture, validation strategy, and implementation tasks into one artifact. For most features this replaces the separate `/arch` → `/qa` sequence.

Read the PRD before writing anything. Do not design in a vacuum.

**Target length:** 900–1600 words.

## Usage

```
/plan <feature name or path to PRD file>
```

Examples:
- `/plan OpenAPI spec`
- `/plan docs/prd/2026-03-07-openapi-spec.md`

---

## Instructions

### Step 0: Locate the PRD

- If `$ARGS` is a file path, read it directly
- Otherwise use `Glob` to search `docs/prd/` for a filename matching the idea
- Also check `docs/explore/` for an exploration brief

If no PRD is found: "No PRD found for this feature. Run `/prd [idea]` first, or pass the PRD file path directly."

Summarise the PRD in 3 bullets: problem statement, recommended approach, key constraints.

---

### Step 1: Codebase recon

Understand the existing architecture in the affected area.

- Use `Grep` and `Glob` to find existing modules, services, and patterns that will be affected
- Reference `CLAUDE.md` module map for the affected areas
- Check `docs/adr/` for prior decisions that constrain this design
- Look for existing patterns to follow (NestJS module structure, Drizzle ORM, SSE streaming, pgvector raw SQL, TypeBox validation)
- Scan for existing test files relevant to this feature (`**/*.spec.ts`, `**/*.test.ts`)

Summarise in 3–5 bullets. Flag any conflict between PRD requirements and existing constraints.

---

### Step 2: Name the 3 hardest problems

Before writing the plan, explicitly state the 3 most difficult engineering challenges this feature introduces. Everything that follows must address each one.

```
Hard problems:
1. [Specific challenge]
2. [Specific challenge]
3. [Specific challenge]
```

---

### Step 3: Write the Plan

````markdown
# Plan: [Feature]

> Stage: Plan | Date: [today] | PRD: [filename]
> Pipeline: Explore → PRD → **Plan** → Decision

## Overview

[2–3 sentences. What is being built, which parts of the system it touches, and what the key design decision is.]

## Hard problems

| Problem | How the design solves it |
|---------|--------------------------|
| [Problem 1] | [Design decision] |
| [Problem 2] | [Design decision] |
| [Problem 3] | [Design decision] |

---

## Architecture

### System diagram

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

### Components

| Component | Responsibility | Status |
|-----------|---------------|--------|
| [Name] | [What it does] | New / Modified / Existing |

### Data flow

How a request moves through the system end-to-end.

1. [Step — who initiates, what is sent]
2. [Step — how it is processed]
3. [Step — what is returned]

### Interfaces

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

### Data model _(omit if no schema changes)_

```sql
-- New table or ALTER TABLE statement
```

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|

### Failure handling

| Failure | Trigger | System response | User experience |
|---------|---------|----------------|-----------------|
| [e.g., OpenAI timeout] | [How it occurs] | [Retry / fallback / error] | [What user sees] |

### Open technical questions

Must be resolved before implementation starts.

1. [Question]

---

## QA

### What we're validating

[2–3 sentences. What are the core behaviours that must work correctly, and the highest-risk failure modes?]

### Core flows

| Flow | Steps | Pass criteria |
|------|-------|---------------|
| [Flow name] | [1. User does X → 2. System does Y] | [Measurable condition] |

### Edge cases and failure modes

| Scenario | Expected behaviour |
|----------|--------------------|
| [Scenario] | [What should happen] |

### Accessibility _(omit if no UI changes)_

- WCAG 2.1 AA required — run `/audit-a11y` after implementation
- Keyboard navigation: [specific flows to verify]
- Screen reader: [specific labels or announcements to verify]

### AI-specific tests _(omit if not applicable)_

| Test | What to check | Pass criteria |
|------|--------------|---------------|
| Grounding | Response cites retrieved content only | No hallucinated facts |
| Guardrails | Off-topic or adversarial query | Appropriate redirect or refusal |

### Success checklist

- [ ] Core flows pass without error
- [ ] Edge cases handled gracefully — no unhandled exceptions
- [ ] [Feature-specific criterion]
- [ ] Accessibility audit passes _(if UI changed)_
- [ ] AI responses grounded _(if AI feature)_

---

## Tasks

Concrete work items. Each task should be completable in a single focused session.

### Milestone 1: [Name] — [one line: what this achieves]

- [ ] [Task — specific and verifiable, e.g., "Add `EmbeddingService.embed(text: string): Promise<number[]>` with unit test"]
- [ ] [Task]
- [ ] [Task]

### Milestone 2: [Name] — [one line: what this achieves]

- [ ] [Task]
- [ ] [Task]

### Milestone 3: [Name] — [one line: what this achieves] _(if applicable)_

- [ ] [Task]

**Effort estimate:** [e.g., ~3–4 days]
**Dependencies:** [Any external decisions or work that must happen first, or "None"]
````

---

### Step 4: Save to file

1. Run `mkdir -p docs/plan` via Bash
2. Write to `docs/plan/YYYY-MM-DD-[slug].md`
3. Tell the user: "Saved to `docs/plan/[filename]`"

Do not include the "What next?" section in the saved file — that is conversational, not part of the document.

---

### Step 5: Invite next step

```
---

## What next?

1. **[Most critical open question]** — needs resolution before implementation starts
2. **[Riskiest milestone]** — worth a proof-of-concept before going further?
3. **Ready to commit?** — run `/challenge [feature]` to stress-test the approach,
   `/value [feature]` for ROI evaluation, or start implementing from Milestone 1.
```

---

## Tone and output rules

- Name the hardest problems explicitly — do not paper over unknowns with vague prose.
- ASCII diagrams over prose for structure. Keep them minimal and readable.
- Make concrete choices and justify briefly. "TBD" in the architecture is a red flag — use Open technical questions instead.
- Tasks must be specific and verifiable. "Implement service" is not a task. "Add `EmbeddingService.embed(text: string): Promise<number[]>` with unit test" is.
- QA section is condensed but not optional — every plan needs testable success criteria.
- Accessibility tests are never optional for UI changes. This project's users have macular degeneration.
- If the PRD's recommended approach has architectural implications not fully worked out, resolve them here — do not carry ambiguity forward.
- This project: NestJS + Fastify adapter, Drizzle ORM (Postgres), pgvector (raw SQL for vector ops), OpenAI, SSE / AsyncGenerator streaming, MUI v5 frontend. Default to existing patterns.
