---
name: check
description: Pre-push quality gate — runs ESLint and TypeScript typecheck across both projects (API and frontend). Mirrors exactly what CI runs on every PR. Use before pushing to catch failures locally.
---

# Check

Runs the same lint and typecheck checks that CI runs on every pull request, across both `projects/api/` and `projects/frontend/`. Stops at the first hard failure and reports it clearly.

Optionally runs unit tests if you pass `--with-tests`.

## Usage

```
/check
/check --with-tests
```

## What this runs

Mirrors `.github/workflows/lint.yml` exactly:

| Step | Command |
|---|---|
| API lint | `cd projects/api && npm run lint` |
| API typecheck | `cd projects/api && npm run typecheck` |
| Frontend lint | `cd projects/frontend && npm run lint` |
| Frontend typecheck | `cd projects/frontend && npm run typecheck` |
| Unit tests (optional) | `make test` |

## Instructions

### Step 1: API lint

```bash
cd projects/api && npm run lint 2>&1
```

If this fails: report the ESLint errors clearly with file and line numbers. Stop here — don't continue until the user fixes them or explicitly says to proceed.

### Step 2: API typecheck

```bash
cd projects/api && npm run typecheck 2>&1
```

If this fails: report TypeScript errors with file:line references. Note that type errors can cascade — fix the root cause first.

### Step 3: Frontend lint

```bash
cd projects/frontend && npm run lint 2>&1
```

Same reporting as Step 1.

### Step 4: Frontend typecheck

```bash
cd projects/frontend && npm run typecheck 2>&1
```

Same reporting as Step 2.

### Step 5: Unit tests (if `--with-tests` passed)

```bash
make test 2>&1
```

Report pass/fail count and any failing test names.

### Step 6: Report

Output a summary:

```
## Check Results

API
  ✓ ESLint          (or ✗ — N errors)
  ✓ TypeScript      (or ✗ — N errors)

Frontend
  ✓ ESLint          (or ✗ — N errors)
  ✓ TypeScript      (or ✗ — N errors)

Unit tests         ✓ N/N passed  (or skipped / ✗ N failed)

Status: ✓ All clear — safe to push
     or: ✗ Fix the issues above before pushing
```

## Error handling

- If `node_modules` is missing in either project, suggest `npm install` before continuing
- If typecheck or lint is not configured in `package.json`, report that clearly rather than failing silently
- Do not auto-fix lint errors — report them so the user can review and fix intentionally

## Notes

- Running this before `git push` prevents CI from failing on avoidable issues
- The `--with-tests` flag adds ~30s for unit tests — useful before a PR, not needed for every push
- Integration tests and eval tests are not included — use `/test-rag-system` for those
