---
name: prd
description: Turn a rough idea into a structured PRD with codebase grounding and web research. Produces a draft you can iterate on — ask follow-up questions to narrow scope, change approach, or go deeper on any section. Usage: /prd <your idea>
---

# PRD Generator

Takes a rough idea, researches it (codebase context + current ecosystem/trends), and produces a structured Product Requirements Document. Designed for iterative refinement — after the draft, you and the user ping-pong until the PRD is implementation-ready.

Follow the workflow strictly. Do not skip steps.

Prefer solutions that reuse existing patterns or libraries in the codebase. Avoid introducing new frameworks unless clearly justified.

**Target length:** 800–1500 words for the PRD body. Be concise. If a section has nothing meaningful to say, write one sentence rather than padding it. Omit sections that genuinely do not apply — do not pad with placeholder text.

## Usage

```
/prd <idea>
```

Examples:
- `/prd Add OpenAPI spec to the API`
- `/prd Dataset and evaluation management tools for data scientists`
- `/prd Slack bot integration for the RAG system`

---

## Instructions

### Step 0: Capture the idea

The user's idea is in `$ARGS`. If `$ARGS` is empty, ask: "What's the idea you want to turn into a PRD?"

Restate the idea in one sentence to confirm your understanding.

**Minimum viable input gate:** If the idea is vague (fewer than ~10 words, no clear user, no clear outcome), ask 1–2 targeted clarifying questions *before* starting recon. Do not barrel into research on a vague brief. Examples:
- "Who is the primary user of this feature?"
- "What problem does this solve that isn't solved today?"

If the idea is vague but the intent is inferable, propose 2–3 possible interpretations and ask the user to pick one.

---

### Step 1: Codebase recon

Understand what already exists. Run targeted searches — do not read every file.

**Always check:**
- Is there any existing code, config, or docs related to this idea?
  - Use `Grep` to search for relevant keywords
  - Use `Glob` to check for relevant files
- Which modules/components would be affected?
  - Reference `CLAUDE.md` module map
- Are there any ADRs that constrain the approach?
  - Check `docs/adr/`
- Are there any existing patterns to follow or reuse?

Summarise findings in 3–5 bullet points. Note explicitly if nothing exists yet.

---

### Step 2: Ecosystem research

Use `WebSearch` to research current trends, tools, and approaches for this specific problem. Run 2–4 searches. Good searches are specific:

- "[problem area] best practices 2026"
- "[relevant tool/library] alternatives comparison"
- "[specific technology] NestJS integration" (or React, etc.)
- "open source [problem] tools"

For each search, extract:
- The 2–3 most relevant findings
- Any emerging patterns or tools worth considering
- Trade-offs between common approaches

Do not just list URLs. Synthesise what you found into actionable insight.

---

### Step 3: Write the PRD draft

Output the PRD in this format. If information is missing, explicitly mark it as "TBD — requires decision" and add it to Open Questions. Do not invent details to fill sections.

---

```markdown
# PRD: [Feature/Idea Name]

> Status: Draft | Version: 0.1 | Author: [user] via /prd

## Problem

[2–3 sentences. What pain or gap does this solve? Who feels it? Why does it matter now?]

## Context

Relevant system constraints or realities that shape the solution space:

- [Existing architecture constraint — e.g., "API uses Fastify adapter, not Express"]
- [Operational environment — e.g., "Runs on a single Docker host, no Kubernetes"]
- [Domain constraint — e.g., "Medical domain: responses must be grounded, no hallucination"]
- [Performance or regulatory requirement, if any]

## Assumptions

These are inferred from the idea or research and may be wrong. If any assumption is incorrect, the recommendation may change.

- [Assumption] _(High / Med / Low confidence)_
- [Assumption] _(High / Med / Low confidence)_
- [Assumption] _(High / Med / Low confidence)_

## User Journey

How a user experiences this feature end-to-end.

1. User does X
2. System responds with Y
3. User proceeds to Z

Edge cases:
- [Edge case]
- [Edge case]

## Goals

- [ ] [Specific, measurable outcome 1]
- [ ] [Specific, measurable outcome 2]
- [ ] [Specific, measurable outcome 3]

## Non-goals (explicitly out of scope)

- [Thing we are not building]
- [Thing that might seem related but is not in scope]

## Options considered

Evaluation criteria: implementation effort · user impact · operational complexity · architecture fit

### Option A: [Name]
**What:** [Brief description]
**Pros:** [2–3 strengths]
**Cons:** [2–3 weaknesses]
**Effort:** Low / Medium / High

### Option B: [Name]
**What:** [Brief description]
**Pros:** [2–3 strengths]
**Cons:** [2–3 weaknesses]
**Effort:** Low / Medium / High

### Option C: [Name] _(if applicable)_
...

## Recommended approach

**Choice:** Option [X] — [one-line reason]

[2–3 sentences explaining the recommendation. Ground it in: user impact, technical fit with existing stack, operational complexity, and cost.]

## Failure modes

Situations where the system may fail or behave poorly.

- [Failure case]
- [Failure case]

**Detection:** How will we know this is happening?

**Fallback:** What should the system do instead?

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| [Role/persona] | [Pain point] | [Outcome] |

_Note: Consider macular degeneration users — any UI changes must meet WCAG 2.1 AA._

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk] | Low/Med/High | Low/Med/High | [How to reduce it] |

## Technical overview

### What changes
- **API** (`projects/api/`): [What modules/services change or are added]
- **Frontend** (`projects/frontend/`): [What components/hooks change]
- **Infrastructure**: [Any Docker, DB, or config changes]
- **Data**: [Schema changes, migrations, new storage needs]

### Key decisions needed before implementation
- [Decision 1 — e.g., "Which auth library?"]
- [Decision 2]

### AI considerations _(omit if not applicable)_

**Model behavior:** Expected outputs and acceptable variability.

**Evaluation:** How outputs will be tested.

**Guardrails:** Constraints to prevent hallucinations or unsafe behavior.

### Security considerations _(omit if not applicable)_

[Add if the idea handles auth, PII, external APIs, or user-generated input.]

### Observability

What logs, metrics, or traces will be added?

- New metrics or counters
- Alerts
- Dashboard changes

## Success metrics

How will we know this worked?

### User metrics
- [Adoption, satisfaction, task completion rate]

### System metrics
- [ ] [e.g., "API spec accessible at /docs within 500ms"]
- [ ] [Latency, error rate, reliability]

### Business metrics
- [Cost, support deflection, retention]

## Milestones

Keep coarse — 3–5 milestones. Do not decompose into tasks (that is what `/plan` is for).

| # | Milestone | Scope | Notes |
|---|-----------|-------|-------|
| M1 | [Name] | [What's included] | |
| M2 | [Name] | [What's included] | |
| M3 | [Name] | [What's included] | |

**Rollback plan:** [How to disable or revert this feature if something goes wrong.]

## Rejected ideas

Approaches considered but intentionally not chosen.

- [Idea] — rejected because [reason]

## Open questions

_These must be answered before implementation starts._

1. [Question — e.g., "Should the spec be auto-generated from code or manually maintained?"]
2. [Question]

## References

- Existing code: [Relevant file paths from recon]
- Docs consulted: [CLAUDE.md sections, ADRs referenced]
- External research: [Key sources found in Step 2]
```

---

### Step 4: Self-critique

Before outputting the PRD, perform a critical internal review. Add this section at the end of the PRD:

```markdown
## PRD self-critique

- **Riskiest assumption:** [Which assumption, if wrong, most changes the recommendation?]
- **Most fragile part of the design:** [What could break or be harder than expected?]
- **Highest long-term impact decision:** [What will be hardest to change once implemented?]
- **What's missing:** [Any gap in the analysis worth flagging to the user?]
```

---

### Step 5: Save to file

After the PRD content is finalised, save it to `docs/prd/`.

**Filename format:** `YYYY-MM-DD-[slug].md`
- Date: today's date
- Slug: PRD title lowercased, spaces and special characters replaced with hyphens
- Example: `2026-03-07-openapi-spec.md`

Steps:
1. Run `mkdir -p docs/prd` via Bash to ensure the directory exists
2. Write the full PRD markdown (everything from `# PRD:` through the self-critique section) to `docs/prd/YYYY-MM-DD-[slug].md` using the Write tool
3. Tell the user: "Saved to `docs/prd/[filename]`"

Do not include the "What next?" section in the saved file — that is conversational, not part of the document.

---

### Step 6: Invite refinement

After the PRD, add:

```
---

## What next?

This is a draft. Highest-value things to dig into:

1. **[Most uncertain decision]** — e.g., "Option A vs B — want me to prototype a quick spike?"
2. **[Scope question]** — e.g., "M1 is broad — should we cut it to just X?"
3. **[Open question]** — e.g., "The schema change in M2 could be breaking — worth a migration strategy first?"

When this PRD is approved, the next step is `/architecture` for technical design, or `/plan` if the approach is already clear.

Or just tell me what to change, add, or go deeper on.
```

---

## Tone and output rules

- Be direct. No filler phrases like "Great idea!" or "Certainly!".
- Use tables where comparison is the point.
- Flag uncertainty explicitly — don't paper over unknowns.
- Keep milestones coarse (3–5 is right). Do not decompose into tasks — that is what `/plan` is for.
- If the idea touches macular degeneration users directly (any UI, voice, accessibility feature), call it out prominently in the Users & impact section.
- If the idea has security implications (auth, PII, external APIs), include the Security considerations subsection.
- Mark low-confidence assumptions clearly — they are where PRDs fail silently.
