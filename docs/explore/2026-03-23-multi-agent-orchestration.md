# Exploration: Multi-Agent Orchestration

> Stage: Explore | Date: 2026-03-23
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Understand what multi-agent orchestration means for this project — what the `.claude/agents/` definitions actually do, how Claude Code's agent model differs from runtime AI agent systems, and where orchestration could deliver real value in the Macular Society platform.

---

## First: what are the `.claude/agents/` files actually doing?

This is the most important thing to clarify — because there are **two completely different things** called "agents" here, and they're often confused.

### Layer 1: Claude Code subagents (your `.claude/agents/` files)

The 10 files in `.claude/agents/` — `coder.md`, `architect.md`, `test-automation.md` etc. — are **developer tooling**, not application features. They define specialised Claude instances that Claude Code can spawn when helping you write code.

When you ask Claude Code to implement something, it can invoke the `coder` subagent (which runs as Claude Opus with a tight TDD-focused system prompt) rather than answering from its own general context. When it spawns `test-automation`, that agent runs tests and verifies output independently. Each agent gets its own context window, its own tool access, and its own focus.

**Are they "ever used"?** Yes — implicitly, every time Claude Code uses the `Agent` tool internally. The system prompt for this session shows 10 agent types defined including `coder`, `architect`, `react-specialist`, `pr-reviewer`, `security-reviewer`, etc. These are live. Claude uses them whenever it delegates tasks during your development sessions. The `coder` agent, for example, is what runs TDD implementation tasks when Claude Code delegates rather than answering directly.

The `.claude/agents/` files are the local overrides that customise these agents for your project — adding project-specific instructions on top of the base agent type.

### Layer 2: Runtime AI agents (what people on the internet are talking about)

What most blog posts mean by "multi-agent orchestration" is different: autonomous agents that run as part of your *application* — not your dev tooling. An orchestrator agent breaks a task into subtasks, dispatches them to specialist agents, collects results, and synthesises an output. Each subagent can call tools (APIs, databases, external services).

This layer does **not** exist yet in this project. It would be built using the Claude Agent SDK (TypeScript or Python), running inside or alongside the NestJS API.

---

## Problem interpretations

### Interpretation A: Dev workflow bottlenecks that subagent parallelism could eliminate

Right now, when making a change that touches the API, frontend, tests, and security, Claude Code works sequentially. With subagents, it could run `coder` + `test-automation` + `security-reviewer` in parallel — each in its own isolated worktree — and merge results. This is already partially possible (the `Agent` tool supports `isolation: "worktree"`) but it's not being fully exploited.

*Cost:* Longer dev loops than necessary. Serial verification where parallel is feasible.

### Interpretation B: Operational work has no automation layer

KB ingestion, chunk quality review, eval dataset expansion, retrieval metric monitoring — all of these are manual today. They involve judgment (is this chunk high quality? does this query reveal a coverage gap?) that is now within reach of an LLM. A runtime agent layer could run these as scheduled or triggered jobs, producing human-reviewable reports rather than requiring someone to do the work by hand.

*Cost:* Hours per week of manual operational work for a small charity team. Slow feedback loops on KB quality — which directly affects response accuracy for users with macular degeneration.

### Interpretation C: The RAG pipeline itself could be a multi-agent system

Today the pipeline is a single sequential chain: embed → retrieve → generate. A multi-agent architecture would have a planner agent that decides *how* to answer (retrieve more context? clarify the question? escalate to contact collection?), specialist retrieval agents for different KB sections, and a response agent that synthesises with grounding checks. This is how frontier RAG systems are being built in 2025–2026.

*Cost:* Current single-chain RAG has no ability to self-correct, request clarification, or route to different retrieval strategies. Complex questions get mediocre answers.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer (you) | Sequential dev loops, manual test/security verification | Run checks manually, wait for Claude to finish each step | Med |
| Operator / content manager | Manual KB quality review after ingestion | Spot-check chunks in DB, read logs | High |
| Charity staff (non-technical) | Wants platform health visibility | Ask developer for a report | Med |
| Chatbot user (macular degeneration) | Complex queries get one-shot answers with no self-correction | Rephrases the question | High (indirect) |

---

## Why now

- **Claude Agent SDK is production-ready** (TypeScript + Python). The same model already powering this project is the orchestration model.
- **The `.claude/agents/` infrastructure is already in place** — the project is ahead of most in agent tooling. The next step is using it more deliberately and extending to runtime agents.
- **The platform is mature enough** to have visible operational pain: ingestion, eval management, KB quality — all documented in the existing explore files but not automated.
- **Prior exploration exists** — `2026-03-08-ai-agent-workflow-automation.md` and `2026-03-15-claude-augmentation-multi-role.md` both converged on the same operational agent directions. This is the synthesis.

---

## Existing solutions

**Internal (what already exists):**
- `.claude/agents/` — 10 project-specific subagent definitions (coder, architect, react-specialist, test-automation, security-reviewer, accessibility-auditor, pr-reviewer, product-engineer, planning-specialist, devils-advocate)
- `.claude/skills/` — 20+ manual-trigger skill workflows (the pipeline from `/explore` to `/decision`)
- `make` targets — manual triggers for ingestion, tests, evals
- Hooks system — `protect-files` (pre-write), `format-code` (post-write); `run-tests.sh` exists but unwired

**External:**
- **LangGraph / CrewAI** — Python multi-agent frameworks; heavier, not aligned with this stack
- **Claude Agent SDK** — native, same model, TypeScript-first, lowest friction for NestJS integration
- **OpenAI Assistants** — different model, more constrained tool access
- **n8n / Zapier** — no-code automation; poor at reasoning tasks, no KB-level judgment

---

## Possible directions

### Direction A: Exploit Claude Code subagent parallelism more deliberately

Use the existing `.claude/agents/` definitions more intentionally. When implementing a feature, explicitly orchestrate: `coder` in parallel with `security-reviewer`, followed by `test-automation`, followed by `pr-reviewer`. This requires no new infrastructure — just clearer prompting patterns and potentially a `/feature` skill that orchestrates the agent sequence.

*Scope:* Small. Pure dev tooling change. High immediate value for dev velocity.

### Direction B: KB maintenance runtime agent

Build a Node.js script (using Claude Agent SDK) that runs after each ingestion job: reviews newly chunked content, flags quality issues, and produces a markdown report. Triggered by `make ingest` or a cron job. Humans review the report, not every chunk. The agent has tool access to the Drizzle DB to read chunks and write quality flags.

*Scope:* Medium. First real runtime agent. Directly improves end-user response quality.

### Direction C: Orchestrated operational agents on a schedule

A lead orchestrator agent that runs nightly or weekly: dispatches sub-agents for (1) retrieval metric review from Prometheus, (2) coverage gap analysis from recent chat logs, (3) eval dataset freshness check. Synthesises results into a plain-English weekly ops report. Can post to Slack or email.

*Scope:* Medium-Large. Requires Prometheus data access and Slack/email integration. High value for charity staff visibility.

### Direction D: Multi-agent RAG pipeline

Replace the single-chain RAG with an agentic architecture: a planner decides retrieval strategy, specialist agents handle different KB sections or query types, a verifier checks grounding before response generation. Self-correcting, able to request clarification, able to escalate.

*Scope:* Large. Architectural change to the core pipeline. High ceiling — also highest risk for a medical domain (agent errors compound).

---

## Hard problems

- **Trust and human-in-the-loop**: In a medical domain, agents that take action (modify chunks, flag content) need explicit human review gates. The line between "agent drafts, human approves" and "agent acts autonomously" must be drawn carefully.
- **Cost at charity scale**: Multi-agent workflows multiply token usage. An orchestrator + 3 subagents on a KB audit costs 4x a single-agent run. Token budgets and run limits are mandatory.
- **Context window management**: Long KB reviews hit limits. Agent SDK `compact` feature helps but adds latency and summarisation risk.
- **Failure propagation**: In a sequential single-chain RAG, one failure stops the chain. In a multi-agent system, partial failures are harder to detect and debug. Observability (LangWatch) must cover the full agent graph, not just individual calls.
- **Dev tooling vs runtime confusion**: The two layers (`.claude/agents/` for dev, runtime agents for ops/product) must be kept conceptually separate. Conflating them leads to building the wrong thing.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What % of dev time is sequential that could be parallel? | Determines ROI of Direction A before building a `/feature` skill | Track one complex feature implementation end-to-end; note where Claude waited |
| Token cost of a full KB review agent run? | Directly impacts operating cost for a charity | Spike: run agent on 100 chunks, measure cost via MetricsService |
| Is the Agent SDK stable enough for production NestJS integration? | Determines Direction B/C feasibility | Read SDK changelog; check for TypeScript ESM compatibility with Fastify |
| Does Direction D (agentic RAG) improve answer quality measurably? | Core justification for the architectural change | Run Ragas eval on current pipeline vs. a prototype agentic pipeline on 20 queries |
| Who would review agent-produced KB audit reports? | Automation is only useful if outputs are acted on | Confirm whether a content manager or operator role exists and has bandwidth |

---

## Promising direction

**Direction A + Direction B, sequenced.**

Direction A (better Claude Code orchestration) has zero infrastructure cost and immediate dev velocity gains — start there by writing a `/feature` skill that explicitly sequences the agent pipeline for implementation tasks.

Direction B (KB maintenance agent) is the highest-impact runtime agent for this project: it directly improves response quality for users with macular degeneration, requires no UI, produces human-reviewable output, and maps directly onto the existing `make ingest` workflow. A working prototype can be built in a day using the Claude Agent SDK against the existing Drizzle DB.

Directions C and D are worth pursuing once A and B are validated — but they carry higher cost and complexity, and in a medical domain, "crawl before running" is the right posture for autonomous agents.

---

## Summary: the two-layer picture

```
Layer 1 — Dev tooling (EXISTS TODAY)
.claude/agents/  →  Claude Code subagents  →  used during development sessions
                     coder, architect, test-automation, security-reviewer, etc.
                     Invoked by Claude Code internally via the Agent tool

Layer 2 — Runtime agents (DOES NOT EXIST YET)
Claude Agent SDK  →  scheduled / triggered agents  →  KB maintenance, ops reporting
                     Would run as Node.js scripts or NestJS services
                     Call tools: DB, Prometheus, Slack, OpenAI
```

The `.claude/agents/` files are real and active — they shape every development session. The missing piece is Layer 2: runtime agents that automate operational work between development sessions.
