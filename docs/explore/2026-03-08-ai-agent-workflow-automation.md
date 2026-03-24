# Exploration: AI-Driven Task Automation Using Claude Agents

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Use Claude Agents (via the Claude Agent SDK) to automate internal repetitive and knowledge-intensive workflows — removing manual overhead, reducing errors, and freeing staff to focus on higher-value work.

---

## Problem interpretations

What underlying problem might this address? Each framing leads to a different solution space.

### Interpretation A: Staff time is eaten by low-value repetitive tasks

The Macular Society team (and its developer/operator layer) spends meaningful time on tasks that are templated, predictable, and follow documented processes: running ingestion pipelines, generating reports, triaging emails, reviewing chunked content. These tasks are done manually because automation has been assumed to require engineering effort. AI agents change that assumption — many of these tasks are now within reach of a prompted agent with tool access.

*Cost*: Hours per week lost per staff member. Error rates from context-switching and fatigue. Slower feedback loops on KB quality.

### Interpretation B: Knowledge work requires judgment, but judgment doesn't require a human every time

A significant portion of "knowledge work" — classifying a document, evaluating whether a chunk passes quality criteria, deciding if a query pattern reveals a coverage gap — follows patterns that can be captured in a system prompt. The bottleneck is not human wisdom; it's human bandwidth. Agents can act as junior analysts: reviewing, summarising, flagging, and drafting — with humans reviewing only exceptions.

*Cost*: Delayed decisions on content quality, eval dataset gaps, and pipeline issues because no one has time to look.

### Interpretation C: The team lacks the operational tooling to scale without headcount

Running a RAG system in production requires ongoing work: monitoring retrieval quality, re-ingesting updated content, auditing prompt performance, detecting coverage gaps, and running evaluations. For a charity, headcount is constrained. Agent automation is effectively a force-multiplier that lets a small technical team operate at larger-team scale.

*Cost*: Operational ceiling hit earlier than the mission requires. Growing the user base means growing the load on the same people.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer / operator | Runs ingestion, monitors retrieval quality, reviews eval results | Manual CLI + reading logs | High |
| Content manager | Reviews newly chunked KB content, validates quality, updates articles | Manual spot-check in DB | High |
| Charity staff (non-technical) | Wants to understand how the chatbot is performing, what users are asking | Asks developer for reports | Med |
| RAG platform user (indirectly) | Benefits from higher KB quality and faster response accuracy improvements | None — unaware of backend | Low (indirect) |

*Note: The end users of the chatbot have macular degeneration. Automation that improves KB quality and coverage directly improves their experience, even if they never interact with the agent layer.*

---

## Why now

- **Claude Agent SDK is production-ready** (renamed from Claude Code SDK). Python and TypeScript interfaces, built-in tool execution, multi-agent orchestration, and context management are all available now.
- **The platform is mature enough** to have operational pain: ingestion, evals, coverage gaps, prompt iteration — these are real recurring costs visible in the existing explore docs.
- **The team is small** (charity context) — scaling through headcount is not the right lever. Automation is.
- **Existing `.claude/skills/` pattern** is already in place — this platform already treats reusable Claude prompts as first-class artifacts, which is the lowest-friction foundation for building agents.

---

## Existing solutions

**Internal:**
- `.claude/skills/` — reusable prompted workflows run manually via `/skill-name`
- `make` targets — manual triggers for ingestion, tests, evals
- `docs/explore/` — prior exploration of coverage gaps, synthetic queries, eval datasets (all of which could be agent-automated)
- `docs/DEV_PIPELINE.md` — documented pipeline stages that could become agent tasks

**External:**
- **Zapier / n8n** — no-code automation, but weak at reasoning and document-level judgment
- **LangGraph / CrewAI** — multi-agent frameworks, heavier engineering overhead, less aligned with Claude's native tooling
- **Claude Agent SDK** — native, low-overhead, same model already in use, tool access built in
- **Claude Code agent teams** (experimental) — orchestrate multiple Claude instances, useful for parallelising independent subtasks

---

## Possible directions

### Direction A: Agent-assisted KB maintenance pipeline

Build an agent that runs after each ingestion job: reviews newly chunked content, flags low-quality chunks (too short, off-topic, duplicate), and produces a human-readable report with suggested actions. Humans review the report, not every chunk. Prototype in a day; production-quality in a week.

*Speedup*: Current manual review time → async report review (est. 80% reduction).
*Accuracy*: Catches quality issues that slip through manual spot-checks.

### Direction B: Automated eval dataset expansion and gap analysis

An agent that queries existing chat logs, identifies unanswered or low-confidence queries, clusters them by topic, and generates synthetic test cases for the eval dataset. Feeds directly into `test:ragas` and `test:scenarios`. Complements the existing `2026-03-08-synthetic-query-generation.md` and `2026-03-08-coverage-gap-analysis.md` explores.

*Speedup*: Eval dataset grows automatically vs. manual curation sprints.
*Accuracy*: Covers real user query patterns, not developer-imagined ones.

### Direction C: Internal ops agent for reporting and alerting

An agent that runs on a schedule, pulls Prometheus metrics, checks retrieval score distributions, compares against thresholds, and drafts a weekly ops summary. Could post to Slack (see `2026-03-07-slackbot-integration.md`) or email. Non-technical charity staff get a plain-English view of platform health without asking a developer.

*Cost saving*: Eliminates ad hoc reporting time; surfaces issues before they become incidents.

### Direction D: Multi-agent pipeline orchestration

A lead agent coordinates a team of specialist sub-agents: one for ingestion, one for evaluation, one for gap analysis, one for reporting. Each runs in its own context window. The lead synthesises results. This mirrors how a small human team would divide the work — but runs in parallel, on demand, without standups.

*Scale*: A one-person technical team can operate at the equivalent of a 4–5 person team's output for operational tasks.
*Risk*: Agent teams are experimental. Higher coordination complexity.

---

## Profiles of people tackling this

| Profile | Starting point | First prototype | Expected gain |
|---------|---------------|-----------------|---------------|
| **Solo developer / operator** (this project) | Existing `.claude/skills/`, `make` targets, NestJS API | Script that runs a KB review agent post-ingestion and outputs a markdown report | 3–5 hrs/week saved on manual review |
| **Charity digital lead (non-technical)** | Wants dashboards, not log files | Scheduled ops summary agent that emails plain-English platform health | Visibility without developer dependency |
| **Content manager** | Reviews Macular Society articles before re-ingestion | Agent that pre-screens chunks for quality, flags issues, suggests rewrites | Faster, more consistent content QA |
| **ML/data engineer at a larger org** | Has LangWatch, eval datasets, CI pipelines | Autonomous eval pipeline: detect regressions, expand dataset, re-run, alert | Continuous quality assurance without manual eval runs |
| **DevOps / platform engineer** | Infrastructure monitoring, runbook execution | Agent that reads Prometheus alerts, matches to runbook, drafts incident response | Faster incident resolution, reduced on-call fatigue |

---

## Hard problems

- **Trust and oversight**: Agents that take action (e.g., delete chunks, re-ingest, send emails) require human-in-the-loop checkpoints for the medical domain. Getting the threshold right between autonomous action and human review is non-trivial.
- **Context window management**: Long-running agents (e.g., reviewing 1,000 chunks) hit context limits. The Agent SDK's `compact` feature helps but adds latency and potential summarisation loss.
- **Agent failure modes**: Agents can hallucinate reasoning, misclassify content, or get stuck in loops. Without guardrails, a KB maintenance agent could flag or modify correct content.
- **Cost visibility**: Multi-agent workflows compound token usage. For a charity with a tight OpenAI budget, uncontrolled agent runs could be expensive. Cost controls and run limits are mandatory, not optional.
- **Non-technical adoption**: The most impactful workflows (reporting, content QA) would benefit non-technical staff, but these users cannot configure or debug agents. Requires polished, low-touch interfaces.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What % of current operational time is spent on automatable tasks? | Determines ROI ceiling before building anything | Time-box audit: track tasks for 2 weeks |
| Which tasks require judgment vs. pattern-matching? | Judgment tasks are risky to automate without HITL; pattern-matching tasks are safe and high-ROI | Map existing `make` targets and skills against a judgment/pattern axis |
| What is the token cost of a full KB review agent run? | Directly impacts operating cost for a charity | Spike: run agent on a sample of 100 chunks, measure cost |
| Are agent teams stable enough for production use? | Agent teams are experimental — stability determines Direction D feasibility | Test with a 3-agent orchestration on a controlled workflow |
| Does charity staff have appetite to interact with agent outputs? | Automation only delivers value if outputs are acted on | User interview or prototype walkthrough with one non-technical staff member |

---

## Promising direction

**Direction A (KB maintenance agent)** — lowest risk, highest immediate ROI, and directly improves end-user experience.

It targets the most painful manual task (chunk quality review), produces human-readable output for review, requires no new infrastructure, and maps directly onto existing skills patterns. It can be prototyped in a day using the Claude Agent SDK against the existing NestJS API and Drizzle DB. A successful prototype builds confidence and trust that enables the more ambitious directions (B, C, D) over time.

---

Sources:
- [Claude AI Agents — Anthropic](https://claude.com/solutions/agents)
- [Claude in the enterprise: case studies](https://www.datastudios.org/post/claude-in-the-enterprise-case-studies-of-ai-deployments-and-real-world-results-1)
- [How enterprises are driving AI transformation with Claude — Anthropic](https://www.anthropic.com/news/driving-ai-transformation-with-claude)
- [Building agents with the Claude Agent SDK — Anthropic Engineering](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Agent SDK overview — Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Orchestrate teams of Claude Code sessions — Claude Code Docs](https://code.claude.com/docs/en/agent-teams)
- [What could agentic AI mean for nonprofits in 2025?](https://www.reportingxpress.com/blog/what-could-agentic-ai-mean-for-nonprofits-in-2025)
- [Scaling Impact: AI Agent Use Cases for Nonprofits — Salesforce](https://www.salesforce.com/blog/ai-nonprofit-use-cases/)
