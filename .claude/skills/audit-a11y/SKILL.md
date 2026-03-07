---
name: audit-a11y
description: Accessibility audit for the Macular Society frontend. Runs automated axe-core checks, searches for known MUI accessibility pitfalls, and produces a severity-rated report. Critical for this project — users have macular degeneration and rely on assistive technology.
---

# Audit Accessibility

Runs a multi-layer accessibility audit on the Macular Society chat frontend. The users of this product have macular degeneration — many use screen readers, keyboard navigation, high contrast mode, or browser zoom. This audit catches issues before they harm real users.

## Usage

```
/audit-a11y
/audit-a11y --component ChatView     # Audit a specific component file
/audit-a11y --quick                  # Static analysis only (no running server needed)
```

## What this checks

1. **Automated scan** — axe-core against the running dev server (if available)
2. **Static analysis** — grep for known problem patterns in source code
3. **MUI pitfalls** — checks specific to MUI v5 components used in this project
4. **Report** — severity-rated findings with file references and fixes

## Instructions

### Step 1: Check if dev server is running

```bash
lsof -ti:5173 > /dev/null && echo "Dev server running" || echo "Dev server not running"
```

If not running and `--quick` was not passed:
> Dev server is not running. Either start it (`cd projects/frontend && npm run dev`) or run `/audit-a11y --quick` for static analysis only.

If `--quick` was passed or server is not running, skip Step 2 and go straight to Step 3.

### Step 2: Run axe-core automated scan

```bash
npx --yes @axe-core/cli http://localhost:5173 --stdout 2>&1 | head -100
```

If axe-core is not available or fails, note it and continue with static analysis.

Capture: number of violations, their severity (critical, serious, moderate, minor), and the affected elements.

### Step 3: Static analysis — search for known patterns

Run each grep and note the results:

```bash
# Icon buttons without aria-label (most common MUI issue)
grep -rn "IconButton" projects/frontend/src --include="*.tsx" | grep -v "aria-label"

# onClick on non-interactive elements
grep -rn "<div.*onClick\|<span.*onClick" projects/frontend/src --include="*.tsx"

# outline:none without replacement (kills focus indicator)
grep -rn "outline.*none\|outline: 0" projects/frontend/src --include="*.tsx"

# Placeholder used as label (not accessible)
grep -rn "placeholder=" projects/frontend/src --include="*.tsx" | grep -v "label="

# Images without alt text
grep -rn "<img" projects/frontend/src --include="*.tsx" | grep -v "alt="

# aria-label on elements that might not need it vs missing from those that do
grep -rn "IconButton\|icon.*button\|button.*icon" projects/frontend/src --include="*.tsx" -l
```

If `--component` was passed, limit all searches to that component file.

### Step 4: Check streaming and dynamic content

Read the chat streaming implementation to check:

```bash
# Look for aria-live regions
grep -rn "aria-live\|role=\"log\"\|role=\"status\"" projects/frontend/src --include="*.tsx"
```

Check that:
- The chat message list has `role="log"` or `aria-live="polite"`
- Streaming updates do not replace the container (which would cause screen readers to re-read everything)
- Loading states are announced

### Step 5: Check keyboard navigation

Read the main component files to assess:

```bash
# tabIndex usage
grep -rn "tabIndex" projects/frontend/src --include="*.tsx"

# onKeyDown handlers (custom keyboard support)
grep -rn "onKeyDown\|onKeyPress" projects/frontend/src --include="*.tsx"
```

Check that:
- The mic button, send button, and volume toggle have keyboard handlers
- No `tabIndex={-1}` is hiding important elements from keyboard navigation without a reason

### Step 6: Produce the report

```markdown
## Accessibility Audit — Macular Society Frontend
**Date:** [today]
**Standard:** WCAG 2.1 AA
**Method:** Automated (axe-core) + static analysis

### Critical — blocks users with assistive technology
[List issues — file:line — WCAG criterion — Fix]

### High — fix before next release
[List issues]

### Medium — fix soon
[List issues]

### Passed checks
[List what was checked and found compliant]

### Summary
- Critical: N
- High: N
- Medium: N
- Automated violations: N (from axe-core)

### Recommended next steps
[Ordered list of fixes by impact]
```

## Quick reference — what to look for in this codebase

| Component | Common issue |
|---|---|
| `IconButton` (mic, send, volume, delete) | Missing `aria-label` |
| `CircularProgress` | Missing `aria-label="Loading"` |
| Chat message list | Missing `role="log"` or `aria-live` |
| Contact collection inputs | Labels may be visually implied but not programmatic |
| Session sidebar | Tab order through sidebar to chat area |
| Voice recording state | State change conveyed by colour only |

## Notes

- This audit should be run whenever components in `projects/frontend/src/components/` are modified
- The `--quick` mode catches the most common issues without needing the dev server
- For a full audit including colour contrast and screen reader testing, manual review with VoiceOver or NVDA is still needed
- See `docs/TESTING_STRATEGY.md` for where accessibility tests fit in the testing pyramid
