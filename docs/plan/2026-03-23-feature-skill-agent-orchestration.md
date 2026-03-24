# Plan: `/feature` Skill — Dev Agent Pipeline Orchestration

> Stage: Plan | Date: 2026-03-23 | PRD: 2026-03-23-feature-skill-agent-orchestration.md
> Pipeline: Explore → PRD → **Plan** → Decision

## Overview

A `/feature` skill that orchestrates the existing Claude Code agents into a repeatable, gate-enforced implementation pipeline. It introduces a git safety gate (reject dirty working tree, create branch), sequential `coder` invocation with an explicit human checkpoint, parallel verification (tests + security + a11y), and a final `pr-reviewer` pass — all driven by a single SKILL.md file with no new infrastructure. Before the orchestrating skill is written, a standard Gate Result block is added to all five participating agents so the skill has a reliable, parseable contract to work from.

## Hard problems

| Problem | How the design solves it |
|---------|--------------------------|
| Agent output parsing without a typed contract | Add a mandatory `## Gate Result` block to each agent's SKILL.md with a fixed schema (Status / Summary / Blocking issues / Proceed) — the orchestrator reads only this block to make sequencing decisions |
| Git branch lifecycle in a multi-agent session | Skill runs `git status --porcelain` and halts on non-empty output; creates the branch before invoking `coder`; branch name is derived deterministically from the plan filename slug |
| Orchestration state across a long context window | Skill maintains an explicit **Phase Tracker** table in its output at each step — the current phase, all gate statuses, and what comes next — so state is visible in the conversation and not held implicitly in Claude's working memory |

---

## Architecture

### System diagram

```
Developer
  │
  ▼  /feature docs/plan/YYYY-MM-DD-[slug].md
┌─────────────────────────────────────────────┐
│  SKILL.md (orchestrator)                    │
│                                             │
│  1. git status --porcelain → halt if dirty  │
│  2. git checkout -b feat/[slug]             │
│  3. Confirm branch with developer           │
│     ↓                                       │
│  4. Agent: coder ──────────────────────►   │
│     Gate Result: PASS / FAIL / BLOCKED      │
│     ↓                                       │
│  5. HUMAN CHECKPOINT                        │
│     "Review branch. Reply 'proceed'."       │
│     ↓ (on proceed)                          │
│  6. Detect scope (API / frontend / both)    │
│     ↓                                       │
│  7. Parallel agents:                        │
│     ├── Agent: test-automation              │
│     ├── Agent: security-reviewer            │
│     └── Agent: accessibility-auditor *      │
│         (* only if frontend scope)          │
│     ↓                                       │
│  8. Consolidated Gate Summary table         │
│     All PASS? ──Yes──► Agent: pr-reviewer   │
│              ──No───► Agent: coder (fix)    │
│                        max 2 fix passes     │
│                        then halt + surface  │
│     ↓                                       │
│  9. PR description output                   │
└─────────────────────────────────────────────┘
  │
  ▼
Developer reviews PR description → /create-pull-request
```

### Components

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `.claude/skills/feature/SKILL.md` | Orchestration prompt — git gate, branch, agent sequencing, phase tracker, gate parsing | New |
| `.claude/agents/coder.md` | Add standard `## Gate Result` block to return format | Modified |
| `.claude/agents/test-automation.md` | Add standard `## Gate Result` block to return format | Modified |
| `.claude/agents/security-reviewer.md` | Add standard `## Gate Result` block to return format | Modified |
| `.claude/agents/accessibility-auditor.md` | Add standard `## Gate Result` block to return format | Modified |
| `.claude/agents/pr-reviewer.md` | Add standard `## Gate Result` block to return format | Modified |

### The Gate Result contract

Every participating agent's SKILL.md must end its return with this block — exactly this structure, no variation:

```markdown
---
## Gate Result
**Status:** PASS | FAIL | BLOCKED
**Summary:** [one line — what was checked and what happened]
**Blocking issues:**
- [issue] — [file:line if applicable]
- (or "None")
**Proceed:** YES | NO | NEEDS_HUMAN
```

Status semantics per agent:

| Agent | PASS | FAIL | BLOCKED |
|-------|------|------|---------|
| `coder` | All acceptance criteria met, typecheck clean | Criteria unmet or typecheck fails | Can't proceed without human decision |
| `test-automation` | All tests green + typecheck clean | Any test or typecheck failure | Services not running (Postgres, etc.) |
| `security-reviewer` | No CRITICAL or HIGH issues | CRITICAL issue found | — |
| `accessibility-auditor` | No Critical or High issues (WCAG 2.1 AA) | Critical issue found | — |
| `pr-reviewer` | PR description ready, no blocking checklist items | Blocking issues in checklist | — |

The orchestrator reads only the `**Status:**` and `**Blocking issues:**` lines to make gating decisions. Everything above `---` is for the developer.

### Data flow

1. Developer invokes `/feature docs/plan/2026-03-23-[slug].md`
2. Skill reads plan file; extracts feature name, task list, and scope (grep for `projects/frontend/`)
3. `git status --porcelain` — non-empty → halt with "Commit or stash changes before running /feature"
4. `git checkout -b feat/[slug]` — if branch already exists, halt: "Branch feat/[slug] already exists. Delete it or choose a different plan."
5. Skill displays Phase Tracker (Phase 1: Implementation) and spawns `coder` with full plan content
6. `coder` returns. Skill reads Gate Result. If BLOCKED → surface and halt. If FAIL → surface and halt.
7. Skill displays coder summary + human checkpoint: "Implementation complete on `feat/[slug]`. Review the changes, then reply **proceed** to run verification gates."
8. On "proceed": skill updates Phase Tracker (Phase 2: Verification) and spawns parallel agents
9. Each agent returns Gate Result. Skill builds consolidated table
10. If all PASS → Phase Tracker (Phase 3: PR) → spawn `pr-reviewer` → output PR description
11. If any FAIL → increment fix pass counter (max 2) → spawn `coder` with gate failures injected as requirements → re-run verification gates
12. If fix pass 2 fails → halt: "Gates still failing after 2 fix passes. Review and resolve manually."

### Phase Tracker format

The skill outputs this at each phase transition so state is never implicit:

```
## Phase Tracker
| Phase | Status |
|-------|--------|
| Git gate | ✓ Branch: feat/contact-collection-db |
| Implementation (coder) | ✓ PASS |
| Human checkpoint | ✓ Confirmed |
| test-automation | ⏳ Running... |
| security-reviewer | ⏳ Running... |
| accessibility-auditor | — Skipped (API-only) |
| pr-reviewer | — Pending |
```

### Failure handling

| Failure | Trigger | System response |
|---------|---------|----------------|
| Uncommitted changes | `git status --porcelain` non-empty | Halt immediately. "Commit or stash first." No branch created. |
| Branch already exists | `git checkout -b` fails | Halt. "Delete feat/[slug] or use a different plan file." |
| `coder` BLOCKED | Gate Result Status = BLOCKED | Surface blocker. Halt. Do not run verification. |
| `coder` FAIL | Gate Result Status = FAIL | Surface failures. Halt. (Do not auto-fix without human awareness.) |
| Verification gate FAIL | Any agent Status = FAIL | Start fix pass. Inject blocking issues into coder prompt. Max 2 passes. |
| Security CRITICAL | `security-reviewer` Status = FAIL | Do not proceed to PR. Loop coder regardless of fix pass count. |
| Fix pass 2 exhausted | Still FAIL after 2 passes | Halt with full gate output. "Resolve manually and re-run /feature." |
| Plan file not found | File read fails | "Plan file not found. Pass a valid path from docs/plan/." |

### Open technical questions

1. Should `git stash` be offered as an alternative to halting when uncommitted changes are detected — or is a hard halt the right default? (Recommendation: hard halt — stashing is lossy and could confuse the developer about what was stashed vs what the coder agent wrote.)
2. If `coder` returns FAIL on the first pass (not during the fix loop), should the skill offer to auto-retry, or always surface to the developer first? (Recommendation: always surface — coder FAIL on a clean attempt suggests a misunderstanding of the plan, not a fixable mistake.)

---

## QA

### What we're validating

The skill must correctly sequence agents, enforce the git safety gate, and never silently skip a verification gate. The highest-risk failure mode is the skill "forgetting" to run a gate — particularly `security-reviewer` or `accessibility-auditor` — and generating a PR description that implies those gates passed when they didn't.

### Core flows

| Flow | Steps | Pass criteria |
|------|-------|---------------|
| Happy path (API feature) | `/feature` with clean repo → branch created → coder PASS → proceed → test + security PASS → PR description | PR description produced; accessibility gate skipped (API-only); all Gate Results visible in output |
| Happy path (frontend feature) | Same but plan mentions `projects/frontend/` | Accessibility auditor runs as third parallel gate; Gate Result appears in consolidated table |
| Dirty working tree | Uncommitted changes present before `/feature` | Skill halts before branch creation; no code written; no agents spawned |
| Verification failure + fix | test-automation FAIL → fix pass → PASS | Fix pass counter shown (1/2); gates re-run; PASS on second attempt; PR description output |
| Fix pass exhausted | 2 fix passes, still FAIL | Skill halts; full gate output shown; no PR description generated |

### Edge cases and failure modes

| Scenario | Expected behaviour |
|----------|--------------------|
| Plan file path typo | "Plan file not found" error before any git commands |
| Branch `feat/[slug]` already exists | Halt with clear message; no code written |
| `coder` returns BLOCKED (external dependency) | Surface blocker; halt; do not proceed to gates |
| Security CRITICAL found | Skill refuses to generate PR description; loops coder |
| a11y Critical found on frontend feature | Same as security CRITICAL — no PR description until resolved |
| Developer types anything other than "proceed" at checkpoint | Skill interprets as issue description and relays to coder before re-displaying checkpoint |

### Success checklist

- [ ] Git gate halts on uncommitted changes before any branch or code action
- [ ] Branch is created with correct slug before `coder` is spawned
- [ ] Human checkpoint is a hard pause — skill waits for explicit "proceed"
- [ ] Parallel agents spawn in a single step (not sequential)
- [ ] Consolidated gate table shows all agent statuses before PR review starts
- [ ] `accessibility-auditor` is skipped (not failed) when scope is API-only
- [ ] Fix pass counter is visible in Phase Tracker; halts at 2
- [ ] PR description is only generated after all gates PASS

---

## Tasks

### Milestone 1: Standardise agent Gate Result blocks — reliable output contract

- [ ] Add `## Gate Result` section and Status/Summary/Blocking issues/Proceed schema to `.claude/agents/coder.md` Return Summary section — specify PASS (all criteria met + typecheck clean), FAIL (criteria unmet or typecheck error), BLOCKED (external dependency or human decision needed)
- [ ] Add `## Gate Result` section to `.claude/agents/test-automation.md` — PASS (all tests green + typecheck clean), FAIL (any test failure or typecheck error), BLOCKED (Postgres or required service not running)
- [ ] Add `## Gate Result` section to `.claude/agents/security-reviewer.md` — PASS (no CRITICAL/HIGH), FAIL (CRITICAL found), WARN becomes FAIL for HIGH issues (deviation from current behaviour — document this)
- [ ] Add `## Gate Result` section to `.claude/agents/accessibility-auditor.md` — PASS (no Critical or High WCAG issues), FAIL (Critical found blocking merge)
- [ ] Add `## Gate Result` section to `.claude/agents/pr-reviewer.md` — PASS (PR description ready, no blocking items), FAIL (blocking checklist items found)
- [ ] Verify gate block format is consistent across all five files — same field names, same Status values

### Milestone 2: SKILL.md — git safety gate, branch creation, coder invocation

- [ ] Create `.claude/skills/feature/SKILL.md` with frontmatter: `name: feature`, `description: Orchestrated feature implementation pipeline — git gate, branch, code, verify, PR`
- [ ] Write Step 0: validate `$ARGS` is a file path; read plan file; fail fast if not found
- [ ] Write Step 1: extract slug from plan filename (strip date prefix and `.md`; e.g. `2026-03-23-contact-collection-db.md` → `contact-collection-db`)
- [ ] Write Step 2: run `git status --porcelain`; if non-empty output → halt with "Commit or stash uncommitted changes before running /feature"
- [ ] Write Step 3: run `git checkout -b feat/[slug]`; if fails → halt with "Branch feat/[slug] already exists"
- [ ] Write Step 4: display Phase Tracker (Phase 1: Implementation) and spawn `coder` agent with full plan content and task list as prompt
- [ ] Write Step 5: read `coder` Gate Result; if BLOCKED or FAIL → surface and halt with gate details
- [ ] Write Step 6: human checkpoint — display coder summary + "Implementation on `feat/[slug]` complete. Review the changes, then reply **proceed**."
- [ ] Write checkpoint handler — if developer replies anything other than "proceed", treat it as an issue to relay to coder before re-displaying the checkpoint

### Milestone 3: SKILL.md — parallel verification gates and PR output

- [ ] Write Step 7: detect frontend scope — grep plan file content for `projects/frontend/`; set `FRONTEND=true` if found
- [ ] Write Step 8: update Phase Tracker (Phase 2: Verification); spawn parallel agents in a single Agent tool call: `test-automation` + `security-reviewer` (+ `accessibility-auditor` if FRONTEND=true)
- [ ] Write Step 9: collect Gate Results from all agents; render consolidated gate table with Status emoji (✓ PASS, ✗ FAIL, — Skipped)
- [ ] Write Step 10: gate decision — if all PASS → proceed to PR; if any FAIL → increment fix pass counter (display as N/2) → spawn `coder` with plan + gate failure details as prompt → re-run Step 8
- [ ] Write Step 11: fix pass exhaustion — if fix pass 2 returns any FAIL → halt: "Gates still failing after 2 fix passes. Resolve the issues above manually and re-run /feature."
- [ ] Write Step 12: update Phase Tracker (Phase 3: PR); spawn `pr-reviewer`; display PR description
- [ ] Write Step 13: final output — consolidated Phase Tracker showing all gates, PR description, and "Run /create-pull-request when ready to push"
- [ ] Update `.claude/skills/PIPELINE.md` — add `/feature` to the dev skills table alongside `/check`, `/review-pr`

**Effort estimate:** ~3–4 hours (Milestone 1: ~1 hour of markdown editing; Milestones 2–3: ~2–3 hours writing and testing the SKILL.md)
**Dependencies:** Milestone 1 must complete before Milestone 2 — the Gate Result contract must exist before the skill references it
