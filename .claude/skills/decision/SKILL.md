---
name: decision
description: Final decision record for a feature or initiative. Synthesises the full pipeline into a durable record of what was decided, why, and what was expected. Revisited after delivery to capture what actually happened. Usage: /decision <feature name>
---

# Decision Record

Captures the final decision on a feature or initiative after the pipeline has been run. Records what was decided, the reasoning, risks accepted, and expected outcomes. The document is intentionally left partially incomplete — the Outcome and Lessons learned sections are filled in after delivery.

Distinct from `docs/adr/` (lightweight architectural decisions) — decision records cover full features and include post-delivery retrospective.

**Target length:** 400–600 words at creation time. Outcome and lessons added later.

## Usage

```
/decision <feature name>
```

Examples:
- `/decision OpenAPI spec`
- `/decision docs/prd/2026-03-07-openapi-spec.md`

---

## Instructions

### Step 0: Locate all pipeline documents

Search for all available documents across pipeline stages using `Glob`:

- `docs/explore/` — exploration brief
- `docs/prd/` — PRD
- `docs/architecture/` — architecture spec
- `docs/qa/` — QA strategy
- `docs/value/` — value assessment
- `docs/challenge/` — challenge review

Read everything found. List which stages are complete and which were skipped.

If no PRD exists: "Run `/prd [idea]` first — a decision record requires at minimum a PRD."

---

### Step 1: Write the Decision Record

```markdown
# Decision Record: [Feature or Initiative]

> Stage: Decision | Date: [today] | Status: proposed
> Pipeline: Explore → PRD → Architecture → QA → Plan → Value → Challenge → **Decision**

## Pipeline summary

| Stage | Document | Status |
|-------|----------|--------|
| Explore | [filename or "skipped"] | Complete / Skipped |
| PRD | [filename] | Complete |
| Architecture | [filename or "skipped"] | Complete / Skipped |
| QA | [filename or "skipped"] | Complete / Skipped |
| Value | [filename or "skipped"] | Complete / Skipped |
| Challenge | [filename or "skipped"] | Complete / Skipped |

## Problem

[2–3 sentences. What problem was being solved and for whom. Drawn from the PRD.]

## Decision

**Outcome:** Proceed / Proceed with reduced scope / Deferred / Do not pursue

**Chosen approach:** [One sentence — which option from the PRD was selected and at what scope.]

## Reasoning

[3–5 sentences. Why this decision was made. Synthesise from: value assessment recommendation, challenge review verdict, open questions resolved, and any additional context.]

Key factors:
- [Factor 1 — e.g., "High user impact with low implementation risk"]
- [Factor 2 — e.g., "Challenge review found no critical blockers"]
- [Factor 3 — e.g., "Scope reduced at M1 to derisk the data migration"]

## Alternatives considered

| Alternative | Why not chosen |
|-------------|----------------|
| [Option B from PRD] | [Brief reason] |
| [Option considered during challenge] | [Brief reason] |

## Risks accepted

Risks identified during the pipeline that were knowingly accepted as part of this decision.

| Risk | Accepted because |
|------|-----------------|
| [Risk from challenge review] | [Reason — e.g., "Mitigated by the kill criterion below"] |

## Kill criteria

Conditions that would prompt revisiting this decision mid-implementation.

- [e.g., "If M1 takes >2× estimated effort, re-evaluate scope before starting M2"]
- [e.g., "If adoption is <10% after 4 weeks, conduct user research before continuing"]

## Expected outcomes

What we expect to observe if this works.

- [Measurable outcome 1]
- [Measurable outcome 2]

---

## Outcome _(fill in after delivery)_

_Update this section once the feature has been in production for a meaningful period._

- **Did it work?** [Yes / Partially / No]
- **Adoption:** [Observed vs expected]
- **Performance:** [Observed vs expected]
- **Unexpected issues:** [What happened that wasn't anticipated]

## Lessons learned _(fill in after delivery)_

_What would we do differently in the pipeline, design, or implementation?_

- [Lesson]
- [Lesson]
```

---

### Step 2: Save to file

1. Run `mkdir -p docs/decisions` via Bash
2. Write to `docs/decisions/YYYY-MM-DD-[slug].md`
3. Tell the user: "Saved to `docs/decisions/[filename]`"
4. Ask: "Should I mark the status as `accepted`, `rejected`, or leave it as `proposed`?"

---

### Step 3: Close the loop

```
---

## Pipeline complete

The decision pipeline for [Feature] is documented at `docs/decisions/[filename]`.

Next: run `/plan [feature]` to break implementation into tasks.

When the feature ships, return to `docs/decisions/[filename]` and fill in the
**Outcome** and **Lessons learned** sections. That's the learning loop.
```

---

## Tone and output rules

- Synthesise — do not re-state everything from upstream documents. Extract the signal.
- The Outcome and Lessons sections are intentionally blank at decision time. Do not fill them with placeholders.
- A "Do not pursue" decision is complete and valid — record it with the same rigour as "Proceed".
- Write for a reader who has not seen the pipeline. Give enough context to understand the decision without needing to read every upstream doc.
- The kill criteria are not optional — they are the mechanism for catching a wrong decision early.
