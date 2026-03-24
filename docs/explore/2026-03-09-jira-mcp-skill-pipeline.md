# Exploration: JIRA MCP + Skill Pipeline (Explore → PRD → Comment)

> Stage: Explore | Date: 2026-03-09
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Build an MCP-based workflow that fetches a JIRA ticket, runs the project's `/explore` and `/prd` skills against it, and posts the generated output back to the ticket as a comment — turning a rough ticket into structured product discovery automatically.

---

## Problem interpretations

### Interpretation A: Discovery work is manual and happens too late

A ticket is created, sits in the backlog, and only gets structured exploration when a PM sits down to write a PRD — days or weeks after the initial signal. By then, context is stale and other tickets have been prioritised around assumptions, not analysis. If exploration could happen at ticket creation time (or on demand), the whole prioritisation conversation starts from a better place.

*Cost*: PMs spend hours writing PRDs for ideas that would have been dropped with 10 minutes of structured thinking. Teams pick up tickets with unclear scope.

### Interpretation B: The skills already exist but require manual context-switching

The `/explore` and `/prd` skills in this codebase work well but require the developer to manually copy-paste a ticket description into Claude Code, run the skill, then copy the result back to JIRA. That friction means the skills get used selectively (when someone remembers and has time), not systematically on every ticket worth exploring.

*Cost*: Inconsistent discovery quality across the backlog. Good ideas get shallow treatment; straightforward tickets get deep treatment. Depends on individual discipline, not process.

### Interpretation C: Product signal is trapped in JIRA and never feeds structured discovery

JIRA accumulates tickets that represent real user pain, stakeholder requests, and engineering constraints — but none of that feeds automatically into product thinking tools. The signal decays as comments pile up and the original intent drifts. A pipeline that reads tickets as input and produces structured artefacts as output could keep discovery continuous rather than episodic.

*Cost*: Decisions made on the basis of whoever spoke loudest in the last standup, not the ticket backlog as a whole.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| PM / product engineer | Writes PRDs from scratch for each ticket | Copy-paste into AI tools manually | High |
| Developer picking up a ticket | Ticket lacks context — unclear what "done" means | Ask PM; wait; guess | Med |
| Engineering lead | Backlog has 50 tickets, none explored | Prioritisation gut-feel | Med |
| Stakeholder | Raised a request that went silent | Chase the PM | Low |

*Note: This tool is about the team's internal workflow, not the end user of the RAG system. Low-vision users are not affected directly.*

---

## Why now

- **Official Atlassian MCP server exists** (as of early 2026): [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) connects Jira + Confluence with OAuth. JIRA read/write is essentially solved — you do not need to build the integration yourself.
- **The skills already exist**: `/explore` and `/prd` are working, project-specific prompts. The pipeline is defined; only the JIRA glue is missing.
- **MCP tooling is production-stable**: Claude Code natively supports MCP. Configuring a JIRA MCP gives Claude Code direct ticket access without any custom server code.
- **Prior work is relevant**: `docs/explore/2026-03-08-ai-agent-workflow-automation.md` already established that agent-driven skill automation is feasible; JIRA integration is a concrete instantiation of that idea.

---

## Existing solutions

**Internal:**
- `.claude/skills/explore/` and `.claude/skills/prd/` — the skills that would run
- `docs/explore/2026-03-08-ai-agent-workflow-automation.md` — prior art on agent automation
- No JIRA integration exists; no MCP config exists in this project

**External:**
- **Atlassian official MCP server** — OAuth, Jira + Confluence, read/write, no custom server code needed. This is the obvious integration point.
- **Composio JIRA MCP** — no-code setup, works with Claude Code, but adds a third-party dependency in the data path.
- **Dume.ai** — does PRD + Jira ticket generation, but is a SaaS product (not composable with project-specific skills).
- **Atlassian Rovo / JPD AI** — native Atlassian AI, generates PRD-like output from tickets. Covers similar ground but not customisable to this project's skill format, domain, or codebase context.
- **n8n / Zapier** — can trigger on JIRA events and call webhooks, but cannot reason over ticket content or run Claude skills natively.

**Gap**: None of the external tools run *this project's specific skills* with *this project's codebase context*. That is the unique value — if there is one.

---

## Possible directions

### Direction A: Manual MCP tool in Claude Code (no scheduler)

Configure the official Atlassian MCP server in `.claude/settings.json`. The developer opens Claude Code, references a ticket ID, and manually runs: "fetch JIRA-123, run /explore on it, then /prd, then post both back as a comment." No new code. No scheduler. Just MCP config + skill composition.

*Scope*: Half a day to configure. Zero new code if the Atlassian MCP server supports comment writes.
*When to use*: On-demand, for tickets worth exploring. The human selects which tickets get this treatment.

### Direction B: JIRA webhook → Claude agent → comment (event-driven, no cron)

When a ticket is created (or labelled `needs-discovery`), JIRA fires a webhook to a lightweight service (n8n, a minimal NestJS endpoint, or a Cloudflare Worker). That service triggers a Claude agent that fetches the ticket via MCP, runs the skills, and posts back. Fully automated — no human needed to initiate.

*Scope*: 1–2 days. Requires a reachable webhook endpoint and credential management.
*When to use*: If the team wants systematic exploration on every new ticket, not just when someone remembers.

### Direction C: Scheduled batch processor (cron / scheduler)

A script or agent that runs on a schedule (e.g., Monday morning), pulls all tickets created in the past week without an explore comment, runs the skill pipeline on each, and posts results. Useful for processing backlog debt.

*Scope*: 1–2 days. Scheduler adds operational complexity (where does it run? who monitors it?).
*Scheduler answer*: You only need a scheduler for batch/periodic processing. For event-driven (Direction B) you need a webhook, not a cron. For on-demand (Direction A), you need neither.

### Direction D: Standalone general-purpose MCP skill runner

Abstract the pattern: a small service that exposes a "run skill on input" API, accepts JIRA ticket IDs, GitHub issues, Notion pages, or plain text, runs any named skill against them, and returns/posts results. Not JIRA-specific — reusable across projects.

*Scope*: 3–5 days. High reuse potential but premature abstraction at this stage.

---

## Hard problems

- **Skill-codebase coupling**: The `/explore` and `/prd` skills read this project's `docs/`, `CLAUDE.md`, and code. For tickets that are *about this project*, that context is valuable. For generic JIRA tickets (unrelated to this codebase), the skills will produce generic output — no better than pointing the ticket at any LLM.
- **Ticket quality as input**: JIRA tickets are often terse, ambiguous, or written for an audience that already has context. Garbage-in, garbage-out. Exploration output will only be as good as the ticket description. A two-sentence ticket will produce a weak explore brief.
- **Polluting the ticket**: Posting AI-generated content as a JIRA comment creates a signal-to-noise problem. If every ticket gets an AI comment, reviewers start ignoring them. The value of the output depends on it being selective and reliable.
- **False confidence**: A well-formatted PRD looks authoritative. If a stakeholder reads the auto-generated PRD comment and treats it as a human-reviewed specification, that is actively harmful — especially in a domain (macular degeneration healthcare) where precision matters.
- **Credential management**: The Atlassian MCP server requires OAuth credentials or a PAT. In a developer's local Claude Code session this is straightforward. In an automated service (Direction B/C), credentials need secure storage and rotation.
- **Cost of running skills at scale**: `/explore` + `/prd` on a single ticket costs ~$0.10–0.30 in Claude API tokens. On 50 tickets a week that is $5–15/week — manageable, but non-zero and worth monitoring.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does the Atlassian MCP server support writing comments? | Direction A collapses to "generate locally, copy manually" if it's read-only | Check [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) tool list |
| How much codebase context do the skills actually need? | If skills work fine without reading the codebase, they are portable to any JIRA | Run `/explore` on a stripped-context input; compare output quality |
| What % of tickets are worth exploring? | Determines whether batch/event-driven automation is worth it vs. on-demand | Review last month's JIRA backlog — how many tickets have clear scope already? |
| Will the team actually read and act on AI-generated explore/PRD comments? | Automation only delivers value if the outputs are used | Try Direction A manually on 3–5 tickets; review with team |
| Is Atlassian Rovo (native AI) already covering this need adequately? | If JPD AI produces comparable output natively, custom integration is redundant | Trial Rovo on a test ticket; compare output to a manual `/explore` run |

---

## Pros and cons summary

**Pros**
- Official JIRA MCP server exists — integration cost is low, especially for Direction A
- Skills are already built; the pipeline is defined, not speculative
- On-demand (Direction A) has near-zero engineering cost to try
- Creates a consistent discovery artefact on tickets without discipline from individuals
- Could be genuinely useful for this project's own tickets (Macular Society backlog)

**Cons**
- Skills are tightly coupled to this project's codebase — value drops sharply for generic tickets
- Ticket quality is the real bottleneck; automation does not fix weak problem statements
- AI comments on tickets risk being ignored or, worse, trusted uncritically
- Atlassian already has native AI (Rovo, JPD) doing similar things — differentiation is narrow
- Scheduler (Direction C) adds operational complexity for modest gain
- Automating exploration at scale (Direction B/C) requires careful human-in-the-loop design to avoid producing misleading or low-quality artefacts at speed

---

## Promising direction

**Direction A (manual MCP tool in Claude Code)** — highest value-to-effort ratio, actionable today.

Configure the Atlassian MCP server locally. Try it manually on 3–5 real tickets. If the output quality is high and the team actually uses the comments, then consider Direction B (webhook automation). Do not build the scheduler or automation layer first — validate that the output is worth acting on. The unique value here is using project-specific skills with project codebase context; that is only meaningful for tickets *about this project*.

If the goal is a general JIRA → PRD pipeline for arbitrary projects, Atlassian Rovo and Dume.ai are further along and not worth competing with.

---

Sources:
- [Atlassian official MCP server](https://github.com/atlassian/atlassian-mcp-server)
- [Jira MCP Integration guide — Workato](https://www.workato.com/the-connector/jira-mcp/)
- [Building AI-Powered Jira Integration with MCP — Medium](https://medium.com/@reddyfull/building-ai-powered-jira-integration-with-mcp-streamlining-project-management-through-natural-c172cd831065)
- [Atlassian remote MCP server overview](https://www.atlassian.com/platform/remote-mcp-server)
- [AI-automated product discovery — ChatPRD workflow](https://www.chatprd.ai/how-i-ai/workflows/how-to-automate-the-entire-product-management-lifecycle-with-cursor)
- [Generate PRDs and Jira Tickets with AI — Dume.ai](https://www.dume.ai/blog/ai-prd-generator-jira-ticket-automation)
- [Jira Product Discovery automation — Atlassian](https://www.atlassian.com/software/jira/product-discovery/guides/automation/overview)
- [Four agents Atlassian PMs use for product discovery — Sherif Mansour, Medium](https://sherifmansour.medium.com/four-agents-atlassians-product-managers-use-to-improve-their-product-discovery-workflows-2201b99b68af)
