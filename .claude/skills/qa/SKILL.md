---
name: qa
description: Validation strategy for a feature. Produces a test plan covering functional flows, failure modes, accessibility, performance, and AI-specific concerns. Reads the PRD and architecture spec. Usage: /qa <feature name>
---

# QA Strategy

Defines how a feature will be validated before and after implementation. Reads the PRD and architecture spec, then produces a structured test plan covering all risk areas. Output informs `/plan` (test tasks) and is referenced during implementation.

This is a strategy doc, not a test results report. Write what needs to be tested, not what was tested.

**Target length:** 500–900 words.

## Usage

```
/qa <feature name or path to PRD>
```

Examples:
- `/qa OpenAPI spec`
- `/qa docs/prd/2026-03-07-openapi-spec.md`

---

## Instructions

### Step 0: Locate upstream documents

Search for the PRD and Architecture spec for this feature.

- Use `Glob` to search `docs/prd/` and `docs/architecture/` for matching files
- Read any matches found
- If no PRD exists: "Run `/prd [idea]` first."
- If PRD exists but no Architecture spec: proceed from PRD only, note the gap

Summarise in 3 bullets: feature summary, technical approach, primary user.

---

### Step 1: Understand the existing test setup

- Use `Glob` to find existing test files relevant to this feature (`**/*.spec.ts`, `**/*.test.ts`)
- Check `docs/TESTING_STRATEGY.md` if it exists
- Note the frameworks and patterns already in use

This project uses: **Vitest** for unit and integration tests, **@langwatch/scenario** for LLM eval scenarios.

---

### Step 2: Write the QA Strategy

```markdown
# QA Strategy: [Feature]

> Stage: QA | Date: [today] | PRD: [filename] | Architecture: [filename or "not yet written"]
> Pipeline: Explore → PRD → Architecture → **QA** → Plan → Value → Challenge → Decision

## What we're validating

[2–3 sentences. What are the core behaviours that must work correctly, and what are the highest-risk failure modes?]

## Functional tests

### Core user flows

| Flow | Steps | Expected result | Pass criteria |
|------|-------|----------------|---------------|
| [Flow name] | [1. User does X → 2. System does Y] | [Outcome] | [Measurable condition] |

### Edge cases

| Scenario | Input | Expected behaviour |
|----------|-------|--------------------|
| [Scenario] | [Input] | [What should happen] |

### Input validation

| Field | Valid range | Invalid case | Expected rejection |
|-------|-------------|--------------|-------------------|
| [Field] | [Acceptable range] | [Bad value] | [Error type / message] |

## Non-functional tests

### Performance
- Target: [e.g., "p95 response time < 500ms under 50 concurrent users"]
- Test approach: [e.g., k6 load test / manual / not applicable]

### Accessibility _(required for any UI change)_
- WCAG 2.1 AA compliance required for all UI changes
- Run `/audit-a11y` after implementation
- Keyboard navigation: [specific flows to verify]
- Screen reader: [specific labels or announcements to verify]

### Security _(omit if not applicable)_
- [Auth check to verify]
- [PII handling to verify]
- [Input sanitisation to test]

## AI-specific tests _(omit if not applicable)_

| Test | What to check | Pass criteria |
|------|--------------|---------------|
| Grounding | Response cites retrieved content only | No hallucinated facts |
| Guardrails | Off-topic or adversarial query | Appropriate redirect or refusal |
| Edge input | Ambiguous or partial query | Graceful, non-empty response |

**Evaluation approach:** [@langwatch/scenario LLM-judge / golden dataset comparison / manual review]

## Failure mode validation

| Failure | How to trigger | Expected system response | Pass criteria |
|---------|---------------|--------------------------|---------------|
| [e.g., DB unavailable] | [Kill DB connection] | [Retry / graceful error] | [What we check] |
| [e.g., Invalid payload] | [Send bad request] | [Validation error] | [Correct error format] |

## Test data requirements

- [Fixtures or seed data needed]
- [Mock services or stubs needed]
- [Data volume for load tests, if applicable]

## Automation plan

| Test type | Framework | Coverage target | Owner |
|-----------|-----------|----------------|-------|
| Unit | Vitest | All new pure functions | Developer |
| Integration | Vitest | Core API flows | Developer |
| LLM eval | @langwatch/scenario | Key AI behaviours | Developer |
| Accessibility | axe-core / `/audit-a11y` | All new UI | Developer |

## Success criteria

- [ ] All core user flows pass without error
- [ ] Edge cases handled gracefully — no unhandled exceptions
- [ ] Performance target met under expected load
- [ ] Accessibility audit passes (WCAG 2.1 AA)
- [ ] AI responses are grounded — hallucination rate within acceptable threshold
- [ ] All defined failure modes produce expected system behaviour

## Open QA questions

1. [Question — e.g., "Is there a performance target defined in the PRD?"]
2. [Question]
```

---

### Step 3: Save to file

1. Run `mkdir -p docs/qa` via Bash
2. Write to `docs/qa/YYYY-MM-DD-[slug].md`
3. Tell the user: "Saved to `docs/qa/[filename]`"

---

### Step 4: Invite next step

```
---

## What next?

1. **[Highest risk test area]** — worth writing test stubs before implementation starts?
2. **[Missing test data]** — what needs creating before tests can run?
3. **Note:** For most features, `/plan` combines architecture, QA strategy, and tasks
   into one document — use this standalone `/qa` skill when you need a detailed test
   strategy independently (e.g., for a complex AI feature or external review).
```

---

## Tone and output rules

- Tests must have measurable pass criteria — "works correctly" is not a pass criterion.
- Accessibility tests are never optional for UI changes. This project's users have macular degeneration.
- AI features must include grounding checks and guardrail validation.
- Flag missing performance targets or coverage expectations explicitly — do not invent them.
- This is a strategy doc written before implementation, not a report written after.
