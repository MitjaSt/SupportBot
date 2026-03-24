# Exploration: Tools to analyze Claude AI usage

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** -> PRD -> Architecture -> QA -> Plan -> Value -> Challenge -> Decision

## Idea summary

Understand why the Claude Code weekly usage limit was hit unexpectedly, and identify tools or practices that make token consumption visible before it becomes a problem.

## Problem interpretations

### Interpretation A: Visibility gap — no usage feedback until the wall
The weekly limit hit without warning because Claude Code gives no ambient signal of cumulative consumption. Usage only becomes visible at the moment it stops working. The real problem is the absence of a running tally or approaching-limit alert during normal work.

### Interpretation B: Unintentional amplifiers — skills and agents multiply tokens silently
Skills (especially `/explore`, `/plan`, `/arch`), sub-agents, and extended thinking can each multiply token consumption 3-7x compared to a plain prompt. Without a post-mortem view of which sessions or invocations caused the spike, it is impossible to know what to change.

### Interpretation C: CLAUDE.md and context bloat as a background drain
Every conversation loads `CLAUDE.md`, all active skill definitions, and MCP server configs into the context window before a single word is typed. On this project that is a meaningful fixed overhead per session. Over many sessions it accumulates invisibly.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer (you) | Hit the weekly limit mid-sprint with no warning | Wait for reset, check /usage after the fact | High |
| Developer running multi-skill workflows | /explore -> /prd -> /arch in one session | None — no visibility into compound cost | High |
| Developer using sub-agents | Parallel agents each hold their own context window | None | Med |

## Why now

- You hit the limit last week without understanding why — there is a concrete pain event to solve.
- This project's .claude/ setup has grown significantly: 10 agents, 15+ skills, a large CLAUDE.md, and MCP servers. This is a higher base context cost than a minimal setup.
- New Claude Code features (extended thinking, auto-spawned sub-agents) can burn tokens at rates not seen in earlier versions.

## Existing solutions

**Internal (this project):**
- Nothing. No usage dashboards, no alerts, no post-session reporting. The only tracking is the LangWatch/Prometheus stack for OpenAI API calls — not for Claude Code sessions.

**External:**

| Tool | Type | What it does | Trade-off |
|------|------|--------------|-----------|
| [ccusage](https://github.com/ryoppippi/ccusage) | CLI (npx/bunx) | Reads ~/.claude/projects/ JSONL files, shows daily/session/project breakdown | Best option for post-hoc analysis; no install needed (npx ccusage) |
| [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) | CLI (pip) | Real-time terminal monitor, burn rate, limit predictions, multi-level alerts | Better for live monitoring; Python dependency |
| [Claude Usage Tracker](https://chromewebstore.google.com/detail/claude-usage-tracker/knemcdpkggnbhpoaaagmjiigenifejfo) | Browser extension | Shows remaining quota in the claude.ai UI | Only visible in browser, not in Claude Code terminal |
| /cost, /usage, /stats | Built-in Claude Code commands | Per-session stats and reset timing | Session-scoped only; no historical/project view |

**Key insight:** `ccusage` reads the same JSONL files Claude Code writes locally (`~/.claude/projects/`), so it works for Pro/Max flat-rate plans where Anthropic does not expose a usage API. It can break down usage by project directory.

## Possible directions

### Direction A: Run ccusage now for the retrospective
Zero-install retrospective: `npx ccusage session` and `npx ccusage daily --breakdown` to understand last week's spike. Identifies which sessions/days/models consumed the most. One-off command, no commitment.

### Direction B: Add Claude-Code-Usage-Monitor as a persistent dev-session companion
Run the Python monitor alongside dev work as a status panel. Provides real-time burn rate and alerts before limits are hit. Requires `pip install` once, then a background terminal pane.

### Direction C: Reduce context overhead in this project's .claude setup
Audit what loads on every session: CLAUDE.md size, number of always-on skills, MCP servers. Slim the base context to reduce the per-session floor. Measurable via ccusage before/after.

### Direction D: Change workflow habits for expensive operations
Reserve multi-skill pipelines (/explore -> /prd -> /arch) for dedicated sessions. Use /compact and /clear between major tasks. Prefer Sonnet over Opus for routine work. Use sub-agents only for genuinely parallel tasks.

## Hard problems

- **Attribution is lossy.** Claude Code's JSONL records token counts but not which skill or sub-agent invocation caused a spike. You can narrow to a session, but not to a specific /explore call within it.
- **Flat-rate plans hide cost signals.** On Pro/Max you pay a fixed monthly fee, so there is no per-token cost shock to create urgency. The only signal is the rate limit wall — which arrives too late.
- **Extended thinking is invisible overhead.** When enabled, each response can silently add up to 31,999 thinking tokens. This does not appear differently in most UIs.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Which session or skill caused last week's spike | Cannot prevent recurrence without knowing the cause | Run `npx ccusage session --since 2026-03-08` immediately |
| How much CLAUDE.md + skills add as fixed overhead per session | Might be worth slimming if it is a significant fraction | Compare ccusage totals across sessions with and without skill invocations |
| Whether extended thinking is enabled by default | Could be a large hidden cost multiplier | Check /config in Claude Code; consider MAX_THINKING_TOKENS=8000 |
| Pro vs Max token window — which plan is active | Affects how quickly limits are approached | /usage or Settings -> Usage in Claude Code |

## Promising direction

**Direction A first, then Direction C** — run `ccusage` immediately to understand last week's spike, then audit the `.claude/` setup for context bloat.

The retrospective costs nothing and may immediately explain the problem. If it points to skill/agent overhead, Direction C and D follow naturally. Direction B (live monitor) is valuable for ongoing protection but is a secondary step once the cause is known.
