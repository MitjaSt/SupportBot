# Exploration: Augmenting Claude usage across all team roles

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

The project has a well-developed Claude setup for developers and product engineers, but several team roles — QA, designers, AI specialists with clinical backgrounds, and data scientists — have little or no tailored support. The question is: what agents, skills, hooks, and automations would make Claude meaningfully useful across the full team, not just the people who write TypeScript?

---

## Problem interpretations

### Interpretation A: Role coverage is uneven — most Claude tooling serves devs and PMs

The current setup has strong coverage for developers (coder, architect, /check, /review-pr, /pentest, /debug) and product engineers (the full explore → prd → plan → decision pipeline). QA has partial coverage. Designers have none. AI/clinical specialists and data scientists have none at all. The implicit assumption is that everyone either writes code or writes PRDs. That leaves whole domains of the project's quality and safety work unsupported.

*Cost:* Clinical accuracy review, RAG quality assessment, visual design consistency, and QA test strategy all happen outside of any Claude workflow. These are exactly the areas where AI assistance could reduce the risk of harm — in a medical context, this is not a minor gap.

### Interpretation B: Discovery and planning is bottlenecked on whoever opens Claude Code

The pipeline (explore → prd → plan) is excellent but requires someone to manually open Claude Code, type a prompt, and run the skills. Non-technical roles (clinical advisors, designers) cannot easily participate. Jira MCP is configured but there is no skill that bridges a ticket to the pipeline automatically. Discovery quality depends on individual discipline, not on a reliable process.

*Cost:* Good ideas from clinical specialists or QA members don't get structured exploration. PRDs get written without clinical input baked in. The pipeline is available but not accessible to everyone who should use it.

### Interpretation C: Quality signals from the RAG pipeline are invisible to the people who should act on them

The system generates embeddings, runs retrieval, and scores responses — but there are no skills that surface those signals to data scientists or clinical reviewers in an actionable way. KB quality issues (stale chunks, coverage gaps, duplicates) are discovered reactively, not proactively. Eval dataset management was explored (2026-03-07) but never built as a skill.

*Cost:* Data drift in the knowledge base, undetected retrieval failures, and evaluation datasets that don't reflect real user queries. In a medical domain, this is a patient safety risk, not just a quality metric.

---

## Who is affected

| Role | Situation | Current workaround | Coverage gap |
|------|-----------|--------------------|--------------|
| Developer | Implementing features, debugging | Fully covered | None significant |
| Product engineer | Planning, writing PRDs | Fully covered | None significant |
| QA member | Designing test plans, writing scenarios | Partial: test-automation agent, /test-rag-system, /check | No QA strategy or risk-based test design skill |
| Designer | Reviewing UI for low-vision users, MUI consistency | None | No design review agent or skill |
| AI specialist / clinical advisor | Reviewing responses for medical accuracy, evaluating RAG outputs | None | No clinical review agent or eval-design skill |
| Data scientist | Monitoring KB quality, managing eval datasets, analyzing embeddings | None | No KB audit, no eval-design, no retrieval metrics skill |
| New team member (any role) | Onboarding to a complex, multi-role project | Read docs manually | No /onboard skill tailored to different entry points |

*All roles who touch the RAG output are working in a medical domain where errors erode trust and potentially cause harm to users with a serious progressive condition.*

---

## Why now

- **Team is multi-role:** Devs, product engineers, QA, designers, clinical specialists, and data scientists are all active. The Claude setup was built by and for devs. The imbalance is now visible.
- **MCP is already configured:** Atlassian MCP (Jira + Confluence) is live. The infrastructure for automation and cross-tool workflows exists — it just lacks the skills that use it.
- **RAG system approaching production:** Clinical accuracy review is no longer optional. The moment real users query the system, unreviewed responses are a liability.
- **Pipeline is mature:** The dev/PM pipeline (explore → plan → decision) has been validated over multiple features. This is the right time to extend the pattern to other roles, not build it from scratch.
- **The gap is named:** The existing explore docs (KB quality analytics, eval dataset management, synthetic query generation, coverage gap analysis) all point to the same unserved territory. The ideas exist; the tooling doesn't.

---

## Existing coverage (what's already there)

**Agents (10):** coder, architect, planning-specialist, test-automation, security-reviewer, accessibility-auditor, react-specialist, pr-reviewer, product-engineer, devils-advocate.

**Skills:** Full planning pipeline (explore → prd → value → plan → challenge → decision) + dev skills (/check, /review-pr, /audit-a11y, /pentest, /test-rag-system, /health-check, /debug, /diagram, /confluence-publish, /youtube).

**Hooks:** protect-files (pre-write), format-code (post-write). `run-tests.sh` exists but is not wired.

**MCP:** Atlassian (Jira read/write, Confluence read/write) — configured, working, underused.

**What's missing:** Clinical, data science, design, QA strategy, onboarding, and cross-role automation.

---

## Possible directions

### Direction A: Fill the role gaps — new agents and skills per discipline

Add agents and skills for the four underserved roles. Each agent gets a focused persona with domain-specific evaluation criteria. Each skill gets a structured workflow.

**Agents to add:**
- `clinical-reviewer` — evaluates AI-generated responses against Macular Society clinical standards: appropriate hedging, no hallucination, correct escalation to human support. Uses the retrieved chunks as ground truth. Critical for the medical domain.
- `data-scientist` — RAG pipeline quality: chunk quality scoring, embedding distribution analysis, retrieval metric review, eval dataset design. Speaks in precision/recall, cosine similarity thresholds, and coverage metrics.
- `ux-designer` — visual design review: MUI component consistency, spacing, color contrast for low-vision users, interaction patterns. Complements the accessibility-auditor (which is WCAG-focused) with design-system-level thinking.
- `qa-strategist` — risk-based test planning, boundary condition identification for medical AI, test coverage mapping. Different from test-automation (which runs tests) — this agent designs what should be tested and why.

**Skills to add:**
- `/onboard [role]` — role-specific orientation. Reads CLAUDE.md, key docs, pipeline, and produces a "here is what matters for your role" brief. One skill, four outputs (dev / QA / designer / clinical-data).
- `/eval-design` — guides AI specialists through designing evaluation datasets: query sampling strategy, golden answer creation, scenario coverage, synthetic query generation. Outputs a structured eval spec.
- `/kb-audit` — audits the knowledge base: coverage gaps, duplicate chunks, stale content, low-confidence retrievals. For data scientists managing the RAG corpus.
- `/clinical-review [response]` — takes a RAG-generated response and evaluates it against clinical accuracy criteria. Documents what it verified, what it couldn't verify, and what should be escalated.
- `/design-review` — reviews a component or flow for design system consistency, low-vision appropriateness, and MUI usage. Outputs a severity-rated design issue list (similar format to /audit-a11y).
- `/release-notes` — reads git log + merged PRs + Jira tickets since last tag, generates a plain-English summary for non-technical stakeholders (charity staff, trustees, clinical advisors). No code jargon.

### Direction B: Automation — wire Jira into the discovery pipeline

The Jira MCP is live. The explore → prd pipeline works. The missing piece is a skill that bridges them.

**Skills to add:**
- `/jira-discover [TICKET-ID]` — fetches the Jira ticket, runs /explore against the description, optionally runs /prd, posts results back as a Jira comment. Manual trigger, human-selected tickets. Already validated in `docs/explore/2026-03-09-jira-mcp-skill-pipeline.md`.
- `/jira-standup` — pulls in-progress tickets for the sprint, git log from today, and generates a team standup summary. Saves 10 minutes per standup.

**Hooks to activate:**
- Wire `run-tests.sh` as a PostToolUse hook on Edit/Write for files in `projects/api/src/` — but only unit tests for the changed module, not the full suite. Keeps feedback fast without blocking.

### Direction C: Cross-role workflows — shared artifact formats and Confluence publishing

Right now, a clinical advisor or data scientist can't easily contribute to or consume the pipeline artifacts (explore briefs, PRDs, plans). They're Markdown files in a repo.

**What this direction adds:**
- Extend /confluence-publish to be called automatically at the end of /plan and /decision — so every completed feature has a Confluence page non-technical stakeholders can read.
- Add a `clinical-sign-off` section to the /plan skill output for features that touch the RAG response pipeline — a structured checklist the clinical advisor fills in before the decision is logged.
- Add a `/value` gate check: if a feature modifies the RAG pipeline, it must include a `clinical-review` and `kb-audit` before the /decision skill can be run.

### Direction D: Observability-driven quality — surface RAG metrics to Claude

Rather than reactive audits, give Claude access to LangWatch/Prometheus metrics via a new MCP or structured data export. Claude could then answer "has retrieval quality dropped this week?" or "which query types are failing most often?" without anyone having to write a dashboard query.

*Scope:* Higher — requires a data export layer or LangWatch MCP. Valuable for data scientists and clinical specialists but needs infrastructure work first.

---

## Hard problems

- **Clinical accuracy is not automatable.** A `clinical-reviewer` agent can check structure, hedging, and source grounding — but cannot replace a human clinical advisor reviewing responses. The skill needs to be positioned as a triage layer, not a replacement.
- **Non-technical roles need access without Claude Code.** Designers and clinical advisors are unlikely to use a CLI tool. If the goal is broad team access, a web-based interface or Slack integration is needed — which is a separate project.
- **Eval dataset quality is a feedback loop.** `/eval-design` can structure the process, but golden answers need domain expertise. The skill can generate synthetic queries; it cannot generate authoritative clinical answers.
- **Pipeline artifact proliferation.** Adding more skills means more docs generated per feature. Without discipline, `docs/explore/`, `docs/plan/`, and `docs/decisions/` become noisy. Need a convention for which features require the full pipeline vs. a lighter touch.
- **Hook performance.** Wiring `run-tests.sh` on every file save adds latency. Needs to be scoped narrowly (changed module only, fast unit tests only) or it will be disabled within a week.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Do non-technical team members have or want Claude Code access? | Determines whether agent/skill work reaches them at all | Ask the team — if not, the value of new skills is limited to devs acting on behalf of those roles |
| How often does the clinical advisor review RAG outputs today? | Sets the baseline against which /clinical-review adds value | Interview; check Jira for clinical review tickets |
| Is Atlassian Rovo/JPD AI already being used for Jira discovery? | If yes, /jira-discover may duplicate existing tooling | Check Atlassian admin for active AI products |
| What is the actual cost of running /eval-design at scale? | KB audits and eval design sessions use significant tokens | Run one session manually; measure token cost |
| Can LangWatch export data Claude can query? | Determines feasibility of Direction D | Check LangWatch API docs for data export endpoints |

---

## Promising direction

**Direction A (fill the role gaps) + Direction B (Jira automation), sequenced.**

Start with the four missing agents — they cost nothing to build (just Markdown) and immediately give clinical specialists and data scientists a named entry point. Then add `/onboard`, `/eval-design`, and `/kb-audit` as the three highest-value skills for underserved roles. Once those are validated, add `/jira-discover` to wire the planning pipeline to the ticket system.

Direction C (cross-role workflows) and Direction D (observability-driven quality) are worth pursuing but depend on validating that non-technical team members actually engage with Claude-generated artifacts — confirm that first.

The key insight is that the existing pipeline is mature and well-structured. The gap is not methodology — it's role coverage. The fastest path to value is extending what works to the people who aren't yet using it.
