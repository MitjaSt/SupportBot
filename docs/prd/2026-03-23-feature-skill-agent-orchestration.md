# PRD: `/feature` Skill — Dev Agent Pipeline Orchestration

> Status: Draft | Version: 0.1 | Author: mitjastepan via /prd

## Problem

Implementing a feature currently relies on Claude Code doing the right thing in an implicit, ad hoc order: write code, maybe run tests, maybe review security, maybe check accessibility. The sequence is inconsistent — security and accessibility reviews are only triggered if explicitly requested, and there is no forcing function that ensures all quality gates are run before a PR is prepared. The gap is not capability (all the agents exist) — it is orchestration.

## Context

- 10 project-specific agents are defined in `.claude/agents/`: `coder`, `architect`, `test-automation`, `security-reviewer`, `accessibility-auditor`, `react-specialist`, `pr-reviewer`, `product-engineer`, `planning-specialist`, `devils-advocate`
- The planning pipeline (`/explore → /prd → /plan → /decision`) is well-established and consistently used
- No equivalent execution pipeline exists — there is no skill that takes a plan and orchestrates the implementation agents
- `PIPELINE.md` documents the planning track only; dev agents are treated as ad hoc tools
- Hooks exist for file protection and formatting but `run-tests.sh` is unwired
- Eval/simulation tests are deny-listed; unit/integration tests require approval but are not blocked
- Claude Code's `Agent` tool supports `isolation: "worktree"` for independent agents, and multiple agents can be spawned in a single message for parallel execution

## Assumptions

- The user provides a plan file path (`docs/plan/YYYY-MM-DD-[slug].md`) as input — the plan is the single source of truth for what to build _(High confidence)_
- `coder` must complete before `test-automation`, `security-reviewer`, and `accessibility-auditor` run — the latter three are independent of each other once code exists _(High confidence)_
- Whether to include `accessibility-auditor` should be inferred from whether the plan touches `projects/frontend/` _(Med confidence — may need explicit flag)_
- A human checkpoint between code writing and verification is valuable in this medical domain — auto-proceeding through all stages without pause introduces risk _(Med confidence)_
- The skill runs inside the existing Claude Code session, not as a separate process _(High confidence)_

## User Journey

1. Developer completes `/plan [feature]` and reviews the plan doc
2. Developer runs `/feature docs/plan/2026-03-23-my-feature.md`
3. Skill reads the plan, extracts the scope (API / frontend / both), and confirms understanding with the developer
4. Skill spawns `coder` agent — implements the feature per the plan's task list
5. `coder` returns a summary: what was implemented, acceptance criteria checked
6. Skill presents the summary and pauses for human review of the code before proceeding
7. On confirmation, skill spawns in parallel:
   - `test-automation` — runs typecheck + relevant tests
   - `security-reviewer` — reviews new/changed files for vulnerabilities
   - `accessibility-auditor` — runs if frontend files were changed
8. Skill collects all three reports and presents a consolidated gate summary
9. If any gate fails: skill returns to `coder` with specific failure details for a fix pass, then re-runs gates
10. If all gates pass: skill spawns `pr-reviewer` — produces PR description + review checklist
11. Skill outputs the PR description and a "ready to push" confirmation

Edge cases:
- Plan file not found → fail fast with clear error message
- `coder` returns "Blocked on [X]" → surface to developer before proceeding
- Tests fail after fix pass → surface to developer rather than infinite loop (max 2 fix passes)
- No frontend changes detected → skip `accessibility-auditor` silently

## Goals

- [ ] Running `/feature <plan>` produces working, tested, security-reviewed, PR-ready code without manual agent juggling
- [ ] Security and accessibility reviews are run on every implementation, not only when remembered
- [ ] Parallel agent execution for verification phases (test + security + a11y) reduces total wall-clock time vs sequential
- [ ] The skill provides a human checkpoint between "code written" and "verification run" — no silent auto-approval
- [ ] A consolidated gate report makes pass/fail status unambiguous before PR creation

## Non-goals (explicitly out of scope)

- Automatically pushing to remote or creating GitHub PRs (that is `/create-pull-request`)
- Running eval/simulation tests — these are deny-listed and expensive; out of scope for a per-feature skill
- Replacing `/plan` — the skill starts after a plan exists, not before
- Worktree isolation per agent — too complex for v1; all agents operate on the same working directory
- Slack/email notification on completion

## Options considered

Evaluation criteria: implementation effort · developer experience · gate coverage · architecture fit

### Option A: Markdown skill file (SKILL.md) — orchestrates existing agents via prompt
**What:** A new `.claude/skills/feature/SKILL.md` that gives Claude a structured prompt to follow: read the plan, spawn agents in the right sequence, collect results, present gate summaries.
**Pros:** Zero new infrastructure; same pattern as all existing skills; leverages the `Agent` tool that Claude already has access to; agents are already defined and tested
**Cons:** Relies on Claude following the prompt faithfully; no hard enforcement of sequence; Claude could skip steps in a degraded context
**Effort:** Low (1 SKILL.md file + minor agents refinements)

### Option B: Hooks-driven automation — trigger agents via PostToolUse hooks
**What:** Wire `test-automation` and `security-reviewer` as hooks that fire automatically after Write/Edit events on source files.
**Pros:** Zero manual invocation; always runs
**Cons:** Would fire on every file save — extremely noisy and slow; hooks cannot run Claude agents, only shell commands; fundamentally the wrong mechanism for this use case
**Effort:** Medium (hook scripting) with high noise cost

### Option C: External orchestration script (Node.js / Claude Agent SDK)
**What:** A `scripts/feature.ts` that uses the Claude Agent SDK to programmatically spawn and sequence agents, collect structured outputs, enforce gates.
**Pros:** Full programmatic control; can enforce strict sequencing; structured outputs
**Cons:** Requires SDK setup, process management, and output parsing; significantly more infrastructure; the Agent SDK for dev orchestration is experimental overhead when SKILL.md already works
**Effort:** High (SDK integration, scripting, error handling, testing)

## Recommended approach

**Choice:** Option A — Markdown skill file.

The existing skills pattern (`SKILL.md` with structured instructions) already drives complex multi-step workflows (e.g., `/plan` combines architecture + QA strategy + task breakdown into one document). A `/feature` skill follows exactly the same pattern: read input, invoke agents in sequence, present structured output at each gate. Claude's `Agent` tool supports parallel invocation natively. No new infrastructure is needed, and the skill is immediately editable/improveable via the same markdown-first workflow used for all other skills.

## Failure modes

**`coder` agent is blocked or returns incomplete work**
Detection: Coder summary includes "Blocked on [X]" or acceptance criteria unchecked.
Fallback: Surface the blocker to the developer; do not proceed to verification gates.

**Tests fail after two fix passes**
Detection: `test-automation` returns failures in the second pass.
Fallback: Present full test output to developer; halt with a specific ask ("should I continue with failing tests?").

**Security reviewer flags a critical issue**
Detection: Security report contains CRITICAL severity items.
Fallback: Do not proceed to PR review; surface the issues with remediation suggestions and loop `coder`.

**Plan file is stale or mismatched with current code**
Detection: `coder` discovers conflicts between the plan's task list and existing code.
Fallback: `coder` reports the delta; developer confirms before proceeding.

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| Developer (sole) | Manually remembers to run security, a11y, tests — often skips under time pressure | Every implementation gets all gates automatically; nothing forgotten |
| Code reviewer (future) | PRs arrive without consistent quality evidence | PR description includes gate summaries: tests passed, security clean, a11y clean |
| Medical domain users (indirect) | Security and a11y gaps reach production because they weren't caught in dev | Consistent gate enforcement reduces the probability of accessibility or security regressions reaching users with macular degeneration |

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Skill prompt is too long / loses coherence in a large context window | Med | Med | Keep SKILL.md concise; use structured output templates that agents already know |
| Developer skips the skill and implements ad hoc anyway | High | Low | Skill is additive — ad hoc still works; the skill is a convenience, not a mandate |
| Parallel agent spawning produces conflicting file edits | Low | High | `coder` completes before verification agents run; verification agents are read-only |
| Cost of running 3 agents per feature becomes significant | Med | Low | Verification agents (test, security, a11y) are read-only and scoped to changed files — token cost is bounded |

## Technical overview

### What changes

- **New skill**: `.claude/skills/feature/SKILL.md` — the orchestration prompt
- **No API changes**: Pure Claude Code tooling; no changes to `projects/api/` or `projects/frontend/`
- **No infrastructure changes**: No new Docker services, env vars, or DB schema
- **Possible agent refinements**: Existing agent SKILL.md files may need minor updates to standardise their return formats so the orchestrating skill can parse gate results consistently

### Key decisions needed before implementation

1. **Human checkpoint**: Pause after `coder` for developer review — explicit "continue?" prompt or automatic with a 3-second countdown?
2. **Frontend detection**: Auto-detect from plan content (grep for `projects/frontend/`) or require an explicit `--frontend` flag from the developer?
3. **Fix pass limit**: Hard-code 2 fix passes before halting, or make it configurable?

### Observability

- No new metrics needed (this is dev tooling, not production runtime)
- The skill's structured gate summaries serve as the audit trail for each implementation session

## Success metrics

### Developer metrics
- `/feature` used for at least 3 consecutive feature implementations without reverting to ad hoc
- Developer does not need to manually invoke `security-reviewer` or `accessibility-auditor` separately

### Quality metrics
- [ ] No feature PR reaches review without a security report attached
- [ ] No frontend feature PR reaches review without an a11y report attached
- [ ] Test pass rate at PR creation is higher than before (baseline: check current PR comments for "tests failing" patterns)

## Milestones

| # | Milestone | Scope |
|---|-----------|-------|
| M1 | SKILL.md skeleton | Read plan, confirm scope, invoke `coder`, return summary |
| M2 | Verification gate | Parallel `test-automation` + `security-reviewer`; consolidated gate report |
| M3 | Frontend gate + PR output | Add `accessibility-auditor` for frontend changes; invoke `pr-reviewer`; final output |

**Rollback plan:** The skill is additive — removing it means deleting `.claude/skills/feature/SKILL.md`. No code changes, no migrations, no config changes needed to revert.

## Rejected ideas

- **Hooks-based auto-triggering** — rejected because hooks cannot spawn Claude agents, only shell commands; and per-save triggering would be too noisy
- **Claude Agent SDK script** — rejected because it introduces SDK infrastructure, process management, and test overhead for a problem already solvable with a SKILL.md
- **Baking orchestration into the `/plan` skill** — rejected because planning and execution are distinct phases; `/plan` produces a document, `/feature` executes it

## Open questions

1. Should the skill emit a machine-readable gate summary (structured JSON) in addition to prose, to make it easier to parse in future automation?
2. Should `react-specialist` be added to the parallel verification gate for frontend changes, or is `accessibility-auditor` sufficient at this stage?

## References

- Existing agents: `.claude/agents/coder.md`, `.claude/agents/test-automation.md`, `.claude/agents/security-reviewer.md`, `.claude/agents/accessibility-auditor.md`, `.claude/agents/pr-reviewer.md`
- Skill pattern: `.claude/skills/plan/SKILL.md`, `.claude/skills/check/SKILL.md`
- Pipeline doc: `.claude/skills/PIPELINE.md`
- Explore brief: `docs/explore/2026-03-23-multi-agent-orchestration.md`
- Settings (deny list, hooks): `.claude/settings.json`

---

## PRD self-critique

- **Riskiest assumption:** That Claude will reliably follow the sequential → parallel → sequential agent flow described in the SKILL.md without collapsing steps or forgetting gates, especially in long context windows. If it doesn't, the skill silently fails to provide the quality enforcement it promises.
- **Most fragile part of the design:** The human checkpoint between code writing and verification. If the developer skips it (just presses enter without reviewing), the gate offers false confidence. The skill cannot enforce genuine review — only prompt for it.
- **Highest long-term impact decision:** Standardising agent return formats. If each agent returns differently structured output, the orchestrating skill cannot reliably parse gate results, and the consolidated report becomes brittle prose comparison rather than structured pass/fail. Getting this right in M1 avoids rework in M2/M3.
- **What's missing:** No consideration of how the skill handles a feature that spans multiple plan files or has a partial prior implementation. v1 assumes a clean start from a single plan doc.
