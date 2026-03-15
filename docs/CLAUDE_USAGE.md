# Claude Code Usage Management

How to profile token consumption, understand what causes spikes, and stay within weekly limits when working on this project.

## The problem

Claude Code (Pro/Max plans) has a weekly token budget. There is no on-screen counter as you work — the only signal is when the limit hits and new prompts are blocked. This doc covers how to understand your usage after the fact and how to reduce it going forward.

---

## Profiling tools

### ccusage — post-session analysis (recommended first step)

Reads the JSONL files Claude Code writes locally to `~/.claude/projects/`. No install needed, works on Pro/Max plans where the Anthropic console does not expose usage data.

```bash
# Usage by session (most useful for identifying spikes)
npx ccusage session

# Filter to a specific date range
npx ccusage session --since 2026-03-08

# Daily totals
npx ccusage daily

# Per-model cost breakdown
npx ccusage daily --breakdown

# By project directory (shows which repos consumed the most)
npx ccusage daily --instances
```

Source: https://github.com/ryoppippi/ccusage

---

### Claude-Code-Usage-Monitor — live burn rate

A terminal-based monitor that tracks consumption in real time, shows a burn rate, and warns before limits are hit. Useful once you know your patterns and want ongoing protection.

```bash
pip install claude-code-usage-monitor
claude-usage-monitor
```

Run in a side terminal pane during development sessions.

Source: https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor

---

### Built-in Claude Code commands

These are scoped to the current session only — no historical view.

| Command | What it shows |
|---------|--------------|
| `/usage` | Current usage against weekly limit + reset time |
| `/cost` | Token counts and estimated cost for the current session |
| `/stats` | Usage patterns for the current session |

---

## What causes high consumption on this project

### 1. Extended thinking (biggest hidden cost)

Claude Code enables extended thinking by default with a budget of **31,999 tokens per response**. This is invisible in the UI — responses look the same whether thinking used 500 or 30,000 tokens. For complex prompts (planning, architecture, code generation), this budget is often fully consumed.

**Default:** 31,999 tokens/response
**Recommended:** 10,000 tokens/response for most development work

See [how to configure this](#setting-max_thinking_tokens) below.

---

### 2. Skills are expensive context loads

Each skill invocation loads a large system prompt into the context window. Running a pipeline like `/explore` → `/prd` → `/arch` in a single session is three large context loads in sequence, each generating a full document.

**Approximate relative costs:**

| Operation | Relative token cost |
|-----------|-------------------|
| Plain prompt | 1x |
| Single skill (/explore, /plan, /arch) | 3–5x |
| Multi-skill pipeline in one session | 10–20x |
| Sub-agent spawn (Agent tool) | 5–10x per agent |
| Parallel sub-agents | multiplied by agent count |

---

### 3. Sub-agents multiply the base context

Every sub-agent spawned by the Agent tool starts a fresh session, which means it loads:
- CLAUDE.md (this project's is ~200 lines)
- All MCP server configs
- The spawn prompt

Five parallel sub-agents = five simultaneous context loads. The token cost scales linearly with agent count.

---

### 4. CLAUDE.md and MCP servers are loaded on every message

The project CLAUDE.md, skills, and MCP server connection overhead are included in every request context. This project has a relatively large `.claude/` setup (10 agents, 15+ skills, Atlassian MCP). That fixed overhead adds up across a long session.

---

## Setting MAX_THINKING_TOKENS

This environment variable caps the extended thinking budget per response. It does not disable thinking — it just limits how many tokens can be spent on it.

**Set it permanently in your shell profile** (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export MAX_THINKING_TOKENS=10000' >> ~/.bashrc
source ~/.bashrc
```

Verify it is set:

```bash
echo $MAX_THINKING_TOKENS
# 10000
```

The new value takes effect the next time you start a Claude Code session.

**Reference values:**

| Value | When to use |
|-------|-------------|
| 31999 | Default — maximum reasoning, highest cost |
| 10000 | Good balance for most development work |
| 8000 | Tighter budget, still handles complex tasks |
| 0 | Disables extended thinking entirely |

---

## Practical habits to reduce consumption

**Between major tasks:**
- Run `/compact` to summarise and compress the conversation history
- Run `/clear` to start a fresh context (loses history but resets token overhead)

**Before running expensive skill pipelines:**
- Start a fresh session (`/clear`) so the pipeline does not inherit a large existing context
- Run one skill per session if the pipeline is exploratory

**Model selection:**
- Sonnet is used for all tasks in this project (set in Claude Code config)
- Avoid switching to Opus for routine work — it has a much tighter weekly hour cap

**Sub-agents:**
- Only use the Agent tool when the task is genuinely parallelisable
- Keep spawn prompts short — agents load CLAUDE.md and MCPs automatically, so everything in the spawn prompt adds to their starting context

**Extended thinking:**
- Set `MAX_THINKING_TOKENS=10000` as described above
- For simple tasks (typo fixes, small refactors), consider `/effort low` to reduce model effort

---

## Diagnosing a usage spike

If you hit the weekly limit unexpectedly, run this immediately to identify which sessions were responsible:

```bash
npx ccusage session --since <date-of-last-reset>
npx ccusage daily --breakdown
```

Look for:
- Sessions with unusually high output token counts (extended thinking shows up here)
- Days where multiple skill pipelines were run
- Sessions where the Agent tool spawned sub-agents

The JSONL files are at `~/.claude/projects/` if you want to inspect raw data.
