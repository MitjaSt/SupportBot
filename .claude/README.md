# .claude — AI Tooling for this Project

This folder configures how Claude Code behaves when working on this codebase. It gives Claude project-specific knowledge, specialist personas for different tasks, reusable workflows, and guardrails.

---

## How it works

### `../CLAUDE.md` (repo root)

The first thing Claude reads in every session. It contains the project overview, stack, key file paths, commands, and coding patterns — everything needed to orient Claude without you having to explain the project each time.

Keep it short. There's a ~200 line limit before it gets truncated.

---

### `agents/`

Specialist personas Claude can act as (or be asked to act as) for specific kinds of work. Each `.md` file defines a role: what the agent knows, how it thinks, and what it checks.

| Agent | Use it when... |
|---|---|
| `coder` | Implementing a feature — reads requirements, writes tests first, verifies before returning |
| `architect` | Planning a new system, evaluating a design, or writing an ADR |
| `planning-specialist` | Breaking a large feature into a phased implementation plan |
| `test-automation` | Running or analysing tests across unit, integration, and eval layers |
| `security-reviewer` | Auditing code that handles user input, auth, API endpoints, or sensitive data |
| `accessibility-auditor` | Reviewing frontend components for WCAG compliance and screen reader support |
| `react-specialist` | Frontend implementation — React, MUI, TanStack Query, streaming patterns |
| `pr-reviewer` | Reviewing a PR and writing the GitHub description |
| `product-engineer` | Evaluating whether a feature actually serves the users (people with macular degeneration) |
| `devils-advocate` | Stress-testing an architecture proposal or technical decision before committing |

**To invoke one:** just ask — "use the accessibility-auditor on this component" or "run this through the devils-advocate". Claude will also invoke them proactively when the task matches.

---

### `skills/`

Slash commands — reusable workflows you trigger with `/skill-name`.

| Command | What it does |
|---|---|
| `/health-check` | Checks all services are running (Postgres, API, Whisper, Piper, etc.) and env vars are set. Run at the start of a dev session or when something is unexpectedly broken. |
| `/check` | Runs ESLint + TypeScript typecheck on both projects — exactly what CI runs. Use before pushing. Add `--with-tests` to include unit tests. |
| `/review-pr` | Reads the current branch diff, runs the review checklist, and outputs a GitHub-ready PR description. |
| `/test-rag-system` | Full test suite: preflight checks → typecheck → unit tests → integration tests → eval scenarios. |
| `/audit-a11y` | Accessibility audit: automated axe-core scan + static pattern search + severity-rated report. Add `--quick` to skip the running server check. |

---

### `hooks/`

Shell scripts that run automatically when Claude writes or edits files.

| Hook | Trigger | What it does |
|---|---|---|
| `protect-files.sh` | Before any write/edit | Blocks changes to `.env`, lock files, generated SQL migrations, build output, etc. |
| `format-code.sh` | After any write/edit | Runs Prettier on the saved file (TypeScript, JSON, Markdown inside `projects/`). |
| `run-tests.sh` | (not wired — see below) | Would run relevant tests after code changes. Not active. |

The hooks are wired in `settings.json`. `run-tests.sh` exists but isn't connected because auto-running tests on every file save slows things down too much in practice.

---

### `settings.json`

- Wires up the hooks (which shell script fires on which event)
- Pre-approves certain tools so Claude doesn't ask for permission every time (e.g. web search, `git commit`)
- **Blocks eval/simulation test commands entirely** — `test:scenarios`, `test:ragas`, `test:evals`, `test:simulations` are in the `deny` list. Claude cannot run these automatically; they always have to be run by a human. This prevents accidental OpenAI API spend from Claude deciding to run evals mid-session.

Permission levels for test commands:

| Command | Behaviour |
|---|---|
| `make test`, `npm test` (unit) | Claude must ask for your approval each time |
| `make test-scenarios`, `npm run test:evals`, etc. | Hard-blocked — Claude cannot run these at all |

---

## Adding a new agent

1. Create `.claude/agents/your-name.md`
2. Add a YAML frontmatter block at the top:
   ```yaml
   ---
   name: your-name
   description: "One sentence describing when Claude should invoke this agent."
   tools: Read, Bash, Grep, Glob   # list only what it needs
   model: sonnet                   # sonnet for most, opus for deep reasoning
   ---
   ```
3. Write the agent's instructions — what it knows, what it checks, what format it outputs

The `description` field is important — Claude reads it to decide when to invoke the agent proactively.

## Adding a new skill

1. Create `.claude/skills/your-skill/SKILL.md`
2. Add frontmatter:
   ```yaml
   ---
   name: your-skill
   description: One sentence shown in the skill picker.
   ---
   ```
3. Write step-by-step instructions for what Claude should do when `/your-skill` is invoked
4. It becomes available immediately as `/your-skill`
