---
name: create-pull-request
description: Create a GitHub pull request following project conventions. Use when the user asks to create a PR, submit changes for review, or open a pull request. Handles commit analysis, branch management, PR template usage, and PR creation using the gh CLI tool.
---

# Create Pull Request

Runs a structured pre-flight sequence, generates a PR description, and creates the PR via `gh`. Base branch is always `main`.

## Step 1: Prerequisites

```bash
gh --version
gh auth status
```

If `gh` is not installed: `brew install gh` (macOS) or https://cli.github.com/
If not authenticated: `gh auth login`

## Step 2: Branch check

```bash
git branch --show-current
```

If on `main`, stop and ask the user to switch to a feature branch first.

```bash
git log main...HEAD --oneline --no-decorate
```

If there are no commits ahead of `main`, stop — there is nothing to PR.

## Step 3: Handle uncommitted changes

```bash
git status
```

If there are uncommitted changes, ask the user whether to:
- Commit them as part of this PR
- Stash them temporarily (`git stash`)

Do **not** offer to discard them.

## Step 4: Quality gate — run `/check`

Before pushing anything, run the pre-push quality gate:

```bash
cd projects/api && npm run lint && npm run typecheck
cd projects/frontend && npm run lint && npm run typecheck
```

This mirrors CI exactly. If either fails, stop and report the errors. Do not proceed to push until the user has fixed them or explicitly acknowledges and accepts the risk.

## Step 5: Rebase if needed

If the branch is behind `main`:

```bash
git fetch origin
git rebase origin/main
```

If there are many WIP commits and the user is comfortable rebasing, offer to squash:

```bash
git rebase -i origin/main
```

Only suggest this — do not do it automatically.

## Step 6: Push

```bash
git push origin HEAD
```

If the branch was rebased, use:

```bash
git push origin HEAD --force-with-lease
```

**Confirm with the user before pushing** — this affects the remote branch.

## Step 7: Generate the PR description — run `/review-pr`

Run the review-pr skill to analyse the diff and produce a ready-made PR description. Take its `## What / ## Changes / ## Testing / ## Notes` output as the PR body.

If `/review-pr` is not available, generate the description directly from:

```bash
git diff main...HEAD --stat
git log main...HEAD --oneline
git diff main...HEAD
```

Use this format — consistent with `/review-pr` output:

```markdown
## What

[1–3 sentences: what this PR does and why]

## Changes

- [Key change 1]
- [Key change 2]

## Testing

- [ ] `make test` passes locally
- [ ] Lint and typecheck clean
- [ ] [Manual test step specific to this change]

## Notes

[Trade-offs, known limitations, or anything reviewers should pay attention to]
```

### Draft vs ready

Suggest `--draft` if:
- The PR has known open issues or TODOs
- It's a large change needing early design feedback before full review
- The author explicitly says it's not ready to merge

Otherwise default to a regular PR.

## Step 8: Create the PR

Write the PR body to a temp file to avoid shell escaping issues:

```bash
# Write body to file, then:
gh pr create --title "TITLE" --body-file /tmp/pr-body.md --base main
# or for draft:
gh pr create --title "TITLE" --body-file /tmp/pr-body.md --base main --draft

rm /tmp/pr-body.md
```

**Confirm the title and draft status with the user before running.**

## Step 9: Post-creation

1. Display the PR URL
2. Remind: CI (lint + typecheck) will run automatically
3. Optional next steps:
   - Add reviewers: `gh pr edit --add-reviewer USERNAME`
   - Add labels: `gh pr edit --add-label "bug"`

## Error handling

| Problem | Action |
|---|---|
| Branch not pushed | `git push -u origin HEAD` first |
| PR already exists | Run `gh pr view` — ask if they want to update it |
| Merge conflicts | Guide through `git rebase origin/main` and conflict resolution |
| CI expected to fail | Report the issue clearly; do not create the PR until fixed (or user overrides) |