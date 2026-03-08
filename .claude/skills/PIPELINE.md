# Engineering Decision Pipeline

A sequence of skills that takes a rough idea through structured thinking stages before committing to implementation. Each skill reads the outputs of prior stages and hands off to the next.

## The pipeline

```
Idea
 ↓
/explore    Problem discovery — divergent thinking, multiple framings, unknowns
 ↓
/prd        Product decision — goals, options, recommendation, assumptions
 ↓
/arch       Technical design — hardest problems first, components, interfaces
 ↓
/qa         Validation strategy — test plan, failure modes, accessibility, AI checks
 ↓
/plan       Implementation tasks — break milestones into concrete work items
 ↓
/value      ROI evaluation — effort vs impact, opportunity cost, recommendation
 ↓
/challenge  Critical review — adversarial stress-test of problem, design, and value
 ↓
/decision   Final record — what was decided, why, risks accepted, kill criteria
 ↓
docs/decisions/YYYY-MM-DD-[feature].md   (revisited after delivery for lessons learned)
```

## Output directories

Each skill saves its output to a corresponding folder under `docs/`:

| Skill | Output directory |
|-------|-----------------|
| `/explore` | `docs/explore/` |
| `/prd` | `docs/prd/` |
| `/arch` | `docs/architecture/` |
| `/qa` | `docs/qa/` |
| `/value` | `docs/value/` |
| `/challenge` | `docs/challenge/` |
| `/decision` | `docs/decisions/` |

## Usage notes

- You do not need to run every stage for every idea. Small changes may only need `/prd` + `/arch`. Large or uncertain initiatives benefit from the full pipeline.
- Each skill will search for upstream documents automatically — pass the feature name or a file path.
- `/plan` is not a skill in this pipeline — use the planning-specialist agent directly for implementation task breakdown.
- `/decision` is the learning loop anchor. Return to it after delivery and fill in the Outcome and Lessons learned sections.

## Dev skills (separate from this pipeline)

These skills support day-to-day development and are unrelated to the planning pipeline:

| Skill | Purpose |
|-------|---------|
| `/check` | Pre-push ESLint + typecheck |
| `/review-pr` | PR review and description |
| `/audit-a11y` | Accessibility audit |
| `/test-rag-system` | RAG system test suite |
| `/health-check` | Dev stack status check |
