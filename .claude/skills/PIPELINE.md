# Engineering Decision Pipeline

A sequence of skills that takes a rough idea through structured thinking stages before committing to implementation. Each skill reads the outputs of prior stages and hands off to the next.

## Two tracks

**Standard** — most features:

```
Idea
 ↓
/prd        Product decision — goals, options, recommendation, assumptions
 ↓
/plan       Technical design + QA strategy + task breakdown (the "ready to build" doc)
 ↓
/decision   Final record — what was decided, why, risks accepted, kill criteria
```

Add `/explore` at the start when the problem is fuzzy or the solution space is unknown.

---

**Full** — complex, uncertain, or high-stakes features:

```
Idea
 ↓
/explore    Problem discovery — divergent thinking, multiple framings, unknowns
 ↓
/prd        Product decision — goals, options, recommendation, assumptions
 ↓
/value      ROI check — is this worth building before investing in design?
 ↓
/plan       Technical design + QA strategy + task breakdown
 ↓
/challenge  Critical review — adversarial stress-test of problem, design, and value
 ↓
/decision   Final record — what was decided, why, risks accepted, kill criteria
 ↓
docs/decisions/YYYY-MM-DD-[feature].md   (revisited after delivery for lessons learned)
```

---

## When to use each track

| Signal | Track |
|--------|-------|
| Small to medium feature, approach is clear | Standard |
| Novel problem or unfamiliar domain | Full (start with `/explore`) |
| Significant effort or hard to reverse | Full (at minimum add `/value`) |
| Multiple stakeholders need to align | Full |
| High risk of being wrong about the problem | Full (start with `/explore`) |

---

## Output directories

| Skill | Output directory |
|-------|-----------------|
| `/explore` | `docs/explore/` |
| `/prd` | `docs/prd/` |
| `/plan` | `docs/plan/` |
| `/value` | `docs/value/` |
| `/challenge` | `docs/challenge/` |
| `/decision` | `docs/decisions/` |

---

## Standalone skills (available but not required in most pipelines)

`/arch` and `/qa` remain available when you need them in isolation — e.g., presenting a technical design for external review, or writing a detailed test strategy for a complex AI feature. `/plan` folds both into one document for everyday work.

---

## Dev skills (separate from this pipeline)

These skills support day-to-day development and are unrelated to the planning pipeline:

| Skill | Purpose |
|-------|---------|
| `/check` | Pre-push ESLint + typecheck |
| `/review-pr` | PR review and description |
| `/audit-a11y` | Accessibility audit |
| `/test-rag-system` | RAG system test suite |
| `/health-check` | Dev stack status check |
