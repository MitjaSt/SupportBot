---
name: value
description: ROI evaluation for a feature. Weighs estimated effort and feature’s value proposition against user, system, and business impact to produce a prioritisation recommendation. Reads the PRD, architecture spec, and plan. Usage: /value <feature name>
---

# Value Assessment

Evaluates whether a feature is worth building by weighing effort against impact. Synthesises from the full pipeline — PRD, architecture, and plan — into a prioritisation recommendation. Feeds into `/challenge` and `/decision`.

megathink.
Perform a cost/benefit and ROI evaluation.

This is the "is it worth it?" question, asked after design and before committing to build.

No additional research needed — synthesise from upstream documents. If estimates are missing, flag uncertainty rather than inventing numbers.

Return:
- expected benefit
- expected cost
- confidence level
- recommendation: build / defer / kill

**Target length:** 400–700 words.

## Usage

```
/value <feature name or path to PRD>
```

Examples:
- `/value OpenAPI spec`
- `/value docs/prd/2026-03-07-openapi-spec.md`

---

## Instructions

### Step 0: Locate upstream documents

Search for all available pipeline documents for this feature using `Glob`:

- `docs/explore/` — exploration brief (if exists)
- `docs/prd/` — PRD (required to proceed)
- `docs/architecture/` — architecture spec (if exists)
- `docs/qa/` — QA strategy (if exists)

Read everything found. If no PRD is found: "Run `/prd [idea]` first."

List which pipeline stages are available in 2–3 bullets.

---

### Step 1: Write the Value Assessment

```markdown
# Value Assessment: [Feature]

> Stage: Value | Date: [today] | PRD: [filename]
> Pipeline: Explore → PRD → Architecture → QA → Plan → **Value** → Challenge → Decision

## Summary

[One paragraph: what problem this solves, who benefits, why it matters now, and what it costs to build at a high level.]

## Value proposition

What new capability or improvement does this create?

- [e.g., Reduces manual effort for operations team]
- [e.g., Enables a product capability not possible before]
- [e.g., Reduces error rate or operational risk]

## Who benefits

| Stakeholder | Current pain | Benefit | Magnitude |
|-------------|-------------|---------|-----------|
| [e.g., End user] | [Pain point] | [How this helps] | Low / Med / High |
| [e.g., Operations] | [Pain point] | [How this helps] | Low / Med / High |

_Note: End users of this system have macular degeneration — weight accessibility improvements accordingly._

## Effort estimate

Based on the architecture spec and implementation plan where available. Flag if estimates are rough.

| Area | Estimated effort |
|------|-----------------|
| API / backend | [e.g., 3 days] |
| Frontend | [e.g., 2 days] |
| Infrastructure | [e.g., 0.5 days] |
| QA / testing | [e.g., 1 day] |
| **Total** | [e.g., ~6.5 days] |

**Complexity:** Low / Medium / High
**Estimation uncertainty:** Low / Medium / High

## Impact estimate

What measurable outcomes could change if this ships?

| Outcome | Current state | Expected change | Confidence |
|---------|--------------|----------------|------------|
| [e.g., Support call handling time] | [Baseline] | [Delta] | Low / Med / High |
| [e.g., Task completion rate] | [Baseline] | [Target] | Low / Med / High |

**Overall impact:** Low / Medium / High

## Leverage

Does this make future work easier, cheaper, or better?

- [e.g., Enables X feature that would otherwise require Y rework]
- [e.g., Eliminates recurring manual process costing N hours/month]
- [e.g., Adds platform capability reusable across multiple features]

If no leverage: state that explicitly.

## Opportunity cost

What are we not doing if we build this?

- [Other roadmap item displaced]
- [Technical debt not addressed]
- [Reliability or operational work deferred]

## Risks

Key reasons this might fail to deliver the expected value.

| Risk | Likelihood | Impact | Note |
|------|-----------|--------|------|
| [e.g., Low user adoption] | Low / Med / High | Low / Med / High | [Signal to watch] |
| [e.g., Effort underestimated] | Low / Med / High | Low / Med / High | [What drives uncertainty] |

## Simpler alternatives

Is there a cheaper way to achieve similar impact?

- [e.g., Configuration change instead of new feature]
- [e.g., Existing tool or third-party integration]
- [e.g., Smaller scope capturing 80% of value]

If no simpler alternative exists: state that explicitly.

## Recommendation

**Proceed** / **Proceed with reduced scope** / **Investigate further** / **Do not pursue**

[2–3 sentences of reasoning. Reference: impact vs effort ratio, opportunity cost, uncertainty level, and any risk that changes the calculus.]

**Confidence:** Low / Medium / High
```

---

### Step 2: Save to file

1. Run `mkdir -p docs/value` via Bash
2. Write to `docs/value/YYYY-MM-DD-[slug].md`
3. Tell the user: "Saved to `docs/value/[filename]`"

---

### Step 3: Invite next step

```
---

## What next?

1. **[Key assumption in the recommendation]** — worth validating before proceeding?
2. **[Simpler alternative worth exploring?]** — could this be meaningfully scoped down?
3. **Ready for critical review?** — run `/challenge [feature]` to stress-test
   the proposal before committing to build.
```

---

## Tone and output rules

- Synthesise from upstream documents — do not invent effort estimates.
- If estimates are missing from the plan or architecture, flag uncertainty explicitly rather than guessing.
- "Do not pursue" is a valid and valuable outcome — state it clearly when warranted.
- Accessibility improvements have disproportionate value for this project's users — weight them accordingly.
- This is not a business case template. Keep it lean and honest.
