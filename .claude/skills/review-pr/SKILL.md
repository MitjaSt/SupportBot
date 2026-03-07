---
name: review-pr
description: Full PR review workflow — reads the git diff, evaluates changes against project standards, and produces a GitHub-ready PR description and review summary.
---

# Review PR

Reads the current branch diff against `main`, checks the changes against project standards, and outputs:
1. A PR description ready to paste into GitHub
2. A review summary with any blocking issues flagged

## Usage

```
/review-pr
```

## Instructions

### Step 1: Read the changeset

Run these commands to understand what changed:

```bash
git diff main...HEAD --stat
git log main...HEAD --oneline
git diff main...HEAD
```

If there is no diff (branch is up to date with main), stop and tell the user there are no changes to review.

### Step 2: Understand the intent

Read the commit messages to infer what the PR is trying to accomplish. If the commits are unclear or contradictory, note that the PR description will need a clear explanation of intent.

### Step 3: Run the review checklist

Work through each section that applies to the changed files.

**All changes**
- [ ] Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`)
- [ ] No `console.log` left in production paths
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] No `.env` file committed
- [ ] No empty or silent catch blocks

**API changes (`projects/api/`)**
- [ ] Services use constructor injection
- [ ] Controllers delegate to services — no business logic in controllers
- [ ] New endpoints use TypeBox DTOs
- [ ] All OpenAI calls track token usage via `MetricsService`
- [ ] New endpoints have tests
- [ ] Schema changes have a generated migration (check `drizzle/` folder)
- [ ] pgvector queries use the `sql` tagged template — not string concatenation

**Frontend changes (`projects/frontend/`)**
- [ ] Server data in TanStack Query hooks — not `useState + fetch`
- [ ] Query key factories exported and used — no raw string literals outside hook files
- [ ] All fetch calls go through `api/client.ts`
- [ ] New interactive elements are keyboard-accessible
- [ ] Icon-only buttons have `aria-label`
- [ ] Styles via MUI `sx` — no new CSS files

**Tests**
- [ ] New behaviour has coverage (happy path + at least one error case)
- [ ] External dependencies mocked in unit tests

**Security** (if handling user input)
- [ ] Input validated before use
- [ ] No user input in system prompt position
- [ ] No SQL string concatenation

### Step 4: Check whether CI will pass

The CI runs on every PR (`.github/workflows/lint.yml`):

```bash
cd projects/api && npm run lint && npm run typecheck
cd projects/frontend && npm run lint && npm run typecheck
```

If the diff touches either project, note whether you expect these to pass or fail.

### Step 5: Write the PR description

Output this in a code block so the user can copy-paste it directly:

```markdown
## What

[1–3 sentences: what this PR does and why — inferred from commits and diff]

## Changes

- [Key change 1]
- [Key change 2]
- [Key change 3]

## Testing

- [ ] `make test` passes locally
- [ ] Lint and typecheck clean (`cd projects/api && npm run lint && npm run typecheck`)
- [ ] [Manual test step specific to this change]

## Notes

[Trade-offs made, known limitations, or anything reviewers should pay attention to]
```

### Step 6: Output the review summary

```markdown
## Review Summary

**Risk level:** Low / Medium / High
**CI:** Will pass / Will fail at [location]

### Blocking issues
- `[file:line]` — [description]

### Non-blocking suggestions
- `[file:line]` — [suggestion]

### Checklist
- [x/] Conventional commits
- [x/] No secrets
- [x/] TypeScript clean
- [x/] Tests present
- ...

**Recommendation:** Ready to merge / Needs changes
```

## Error handling

- If not on a feature branch (already on `main`), warn the user
- If the diff is very large (>500 lines), note that a full review may miss things and recommend splitting the PR
- If CI commands fail, that is a blocking issue — report it clearly
