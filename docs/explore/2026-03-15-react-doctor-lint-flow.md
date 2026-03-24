# Exploration: Adding react-doctor to the lint flow

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Integrate [react-doctor](https://github.com/millionco/react-doctor) — a Rust-powered React diagnostic CLI — alongside the existing ESLint setup to catch issues that standard ESLint plugins miss, and surface a per-PR health score.

## Problem interpretations

### Interpretation A: Gaps in current hook/effect linting
`eslint-plugin-react-hooks` (already installed) enforces `rules-of-hooks` and `exhaustive-deps`, but it does not reason about *whether* an effect is necessary at all. Developers can write semantically redundant `useEffect` chains that pass linting but silently degrade performance. react-doctor analyses effect bodies for state derivations that could be calculated at render-time — a class of bug our current config cannot catch.

### Interpretation B: Dead code accumulates silently
As the codebase grows (chat UI, admin shell, OIDC flow, voice pipeline), unused components, types, and exports are not caught by any current tool. ESLint only checks file-by-file; it cannot see cross-file dead code. This creates drag on onboarding and refactoring, particularly as we add admin pages and more RAG tool handlers.

### Interpretation C: No React-specific accessibility signal in CI
The WCAG obligation for macular degeneration users is high. The existing `/audit-a11y` skill runs ad-hoc axe-core checks. react-doctor's lint pass includes accessibility rules for React specifically (e.g., missing `aria-label`, interactive elements without accessible names). Integrating it into the automated check flow would provide lightweight, always-on a11y signal without requiring a full axe audit.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer (feature work) | Writes an unnecessary `useEffect` that passes all linting | Code review or runtime observation | Med |
| Developer (refactoring) | Deletes a component but leaves orphaned exports/types | None — accumulates silently | Low now, high later |
| End user (low vision) | Missing `aria-label` on a new button reaches production | `/audit-a11y` run manually if remembered | High |
| Developer (PR review) | No objective React health score — review is purely subjective | Convention + manual review | Low |

## Why now

- The admin UI is new and growing — patterns will be set now that propagate forward.
- A11y debt is already tracked from the chat audit; a permanent CI signal prevents regression.
- react-doctor is Oxlint-based (Rust), so runtime cost in CI is negligible.
- The tool explicitly supports Claude Code and the project's AI-assisted workflow.

## Existing solutions

**Internal:**
- [eslint.config.js](projects/frontend/eslint.config.js) covers `rules-of-hooks`, `exhaustive-deps`, TypeScript strictness, and react-refresh.
- `/audit-a11y` skill runs axe-core on demand — not in CI.
- `/check` skill runs ESLint + TypeScript typecheck across both projects.

**External:**
- `eslint-plugin-react-hooks` — already installed; covers hook call order and dependency arrays only.
- `@eslint-react` — a broader ESLint plugin ecosystem; significant overlap with hooks plugin, configuration-heavy.
- `knip` — dedicated dead code / unused exports tool; strong but no React-specific rules.
- `react-doctor` — Rust-powered, 60+ React-specific rules, dead code, security, accessibility, and health score; runs as a separate CLI step, not an ESLint plugin.

## Possible directions

### Direction A: Add react-doctor as a non-blocking CI step
Run `npx react-doctor --diff HEAD~1` on every PR and report the score as informational output. No build failure on score drop — visibility only. Low friction to adopt. Easy to promote to a gate once a baseline is established.

### Direction B: Add react-doctor to `/check` skill as a blocking gate
Run `npx react-doctor` (full scan) inside the existing pre-push quality gate. Fail if score drops below a threshold (e.g., 75). Gives teeth to the integration immediately but requires agreeing on an initial baseline first.

### Direction C: Add react-doctor + knip as complementary tools
Use react-doctor for React-specific rules + a11y, and `knip` separately for dead code / unused exports. More coverage, but two tools to configure and maintain. Justified only if dead code detection is a confirmed pain point.

### Direction D: Replace parts of ESLint with react-doctor
Lean into the Oxlint backend in react-doctor and remove redundant ESLint plugins over time. Reduces config surface. High risk of losing rule parity during transition; not worth it at this codebase size.

## Hard problems

- **Baseline noise**: Running react-doctor cold on the current codebase may surface many existing issues. A failing gate on day one creates negative developer experience. A warn-only warm-up period is needed.
- **Rule overlap with existing ESLint**: react-doctor runs hooks rules internally via Oxlint. With `eslint-plugin-react-hooks` also active, the same violation may be reported twice — once in ESLint output, once in react-doctor output. This needs evaluation before committing to both.
- **Score stability**: The 0–100 health score is a composite. A single refactor touching many files could cause a large swing. A score-based blocking gate may be noisy without careful threshold calibration.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Actual rule overlap with current ESLint config | Duplicate warnings increase noise without value | Run `npx react-doctor --verbose` locally and diff against current ESLint output |
| Current baseline score | Determines whether a blocking gate is viable on day one | Run `npx react-doctor` from `projects/frontend/` and note the score |
| Whether `--diff` mode works from a subdirectory | `projects/frontend/` is not the repo root | Test `npx react-doctor --diff HEAD~1` from `projects/frontend/` |
| A11y rule quality vs axe-core | react-doctor a11y rules are static; axe-core is runtime DOM-aware | Check which a11y rules react-doctor covers; compare against issues from the last audit |

## Promising direction

**Direction A** — non-blocking CI step first, then promote to a gate once the baseline is known.

It gives immediate visibility into the health score and a11y signal without blocking development. Once a few PR reports have been reviewed and the team agrees on what "good" looks like for this codebase, promoting to Direction B is a single threshold change. The `--diff` mode keeps CI cost low on large PRs.
