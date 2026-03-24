# PRD: Confluence & Jira AI Integration

> Status: Draft | Version: 0.1 | Author: product team via /prd

## Problem

The team has structured AI skills for discovery and planning (`/explore`, `/prd`, `/plan`) but publishing their outputs is manual: copy the result, open Confluence, create a page, paste. Comments on those pages go unanswered unless someone remembers to check. Jira tickets sit as raw descriptions with no structured proposal attached. The friction between AI-generated artefacts and Atlassian tooling means the outputs are used inconsistently — only when someone has time.

## Context

- Internal team productivity tool — not user-facing. Macular degeneration users are not affected.
- The project has an existing Claude skill system (`.claude/skills/`) that runs inside Claude Code sessions.
- The Atlassian official MCP server (`atlassian/atlassian-mcp-server`) gives Claude Code native read/write access to both Confluence and Jira via OAuth — no custom server code required.
- A prior explore doc (`docs/explore/2026-03-09-jira-mcp-skill-pipeline.md`) already evaluated this space: Direction A (manual MCP + skill) was the recommended starting point.
- `confluence.js` is a TypeScript-native library for Confluence REST API v2 — suitable for standalone scripts outside Claude Code sessions.
- Polling (not webhooks) is explicitly preferred for comment handling — simpler to operate, no public endpoint required.

## Assumptions

- The team uses Confluence Cloud and Jira Cloud. _(High confidence)_
- Atlassian MCP server supports both read and write for pages and comments. _(Med confidence — needs verification against tool list)_
- AI-generated Confluence content will be reviewed by a human before being treated as authoritative. _(High confidence — intended design)_
- A polling script running on demand (or via cron) is acceptable operational overhead. _(High confidence)_
- The Jira proposal feature is lower priority and does not need to ship with Phase 1. _(High confidence — user stated "later")_

## User Journey

### Phase 1 — Confluence page creation from a description

1. Developer runs `/confluence-publish` skill in Claude Code, passing a description or referencing a skill output (e.g., the result of `/prd`).
2. The skill uses the Atlassian MCP server to create a Confluence page in the configured space, with the generated content as the body.
3. The skill posts the page URL back to the developer.
4. Developer reviews the page, edits if needed, and shares with stakeholders.

### Phase 2 — AI comment responder (poll-based)

1. Developer (or cron job) runs `scripts/confluence-responder.ts`.
2. The script fetches all footer comments on configured Confluence pages (or an entire space).
3. For each comment without an AI reply, it calls the Claude API with the page context + comment text.
4. The script posts the AI-generated reply as a nested comment, tagged `[AI draft — review before acting]`.
5. A human reviews AI replies and edits or approves them before acting on any requests.

Edge cases:
- Comment already has an AI reply: skip (detect by `[AI draft` tag).
- Claude API returns empty response: log and skip, do not post.
- Comment is from the AI bot account itself: skip to avoid loops.

### Phase 3 — Jira ticket → proposal (later)

1. Developer runs `/jira-propose PROJ-123` in Claude Code.
2. Skill fetches the Jira ticket via MCP, extracts description, acceptance criteria, and comments.
3. Skill runs the `/prd` pipeline against the ticket content.
4. Output is either: posted as a Jira comment, or published as a linked Confluence page.

## Goals

- [ ] Create a Confluence page from a description or skill output via a single Claude Code command.
- [ ] Poll Confluence pages for unanswered comments and post AI-drafted replies.
- [ ] Polling script can be run manually or scheduled; requires no always-on service.
- [ ] AI-generated content is clearly labelled so humans can distinguish it from reviewed content.
- [ ] Jira ticket → proposal generation available as a Claude Code skill (later milestone).

## Non-goals (explicitly out of scope)

- Webhook-based real-time comment processing (user explicitly excluded).
- A new NestJS API module or HTTP endpoints for Confluence/Jira — these are internal scripts.
- Auto-approval or auto-merge of AI-generated Confluence content without human review.
- Confluence Data Center / Server support (Cloud only).
- Inline Confluence comments (only footer/page-level comments in scope).

## Options considered

Evaluation criteria: implementation effort · operational complexity · architecture fit · flexibility

### Option A: Atlassian MCP server + Claude skills (recommended)
**What:** Configure the official Atlassian MCP server in `.claude/settings.json`. Add a `/confluence-publish` skill that calls MCP tools to create pages. Add a `/jira-propose` skill for Phase 3. For comment polling, use a standalone `scripts/confluence-responder.ts` with `confluence.js` and the Claude API directly (MCP is not available in non-interactive scripts).
**Pros:** Minimal new code for page creation; MCP handles auth; reuses existing skill pattern; polling script is simple and self-contained.
**Cons:** MCP server must be configured per developer (not centralised); Phase 2 script is a separate integration path from Phase 1 (MCP vs. REST API).
**Effort:** Low (Phase 1), Medium (Phase 2)

### Option B: NestJS module (`projects/api/src/modules/confluence/`)
**What:** Build a NestJS service that wraps `confluence.js` + the Claude API. Expose internal endpoints. Skills call the API; polling is triggered via a NestJS scheduled task (cron).
**Pros:** Centralised credentials; all logic in one codebase; shared DI container.
**Cons:** Over-engineered for an internal tool; adds NestJS module complexity for what is essentially a script; requires the API server to be running for polling.
**Effort:** High

### Option C: n8n / automation platform
**What:** Use n8n (or Zapier) to wire Confluence → Claude → Confluence comment posting, with a scheduled trigger for polling.
**Pros:** No code; visual workflow editor; built-in scheduler.
**Cons:** Adds third-party dependency; codebase context not available in n8n; less control over prompt construction.
**Effort:** Low (setup), Medium (maintenance)

## Recommended approach

**Choice:** Option A — Atlassian MCP server + Claude skills + standalone polling script.

MCP gives Claude Code native Confluence/Jira access with zero custom server code, which is the right fit for Phase 1. The `/confluence-publish` skill follows the exact same pattern as the existing skills in this project. For comment polling, a standalone TypeScript script using `confluence.js` and the Claude API is appropriate — it runs on demand, requires no server, and is easy to inspect and modify. This avoids over-engineering (Option B) and third-party lock-in (Option C).

## Failure modes

- **MCP write permission not available:** Atlassian MCP server may be read-only in some configurations. Fallback: skill outputs Confluence storage-format markdown to stdout; user pastes manually.
- **Polling script posts to wrong space/pages:** Misconfigured space key causes AI comments to appear on unintended pages. Mitigation: dry-run mode (`--dry-run`) logs planned actions without posting.
- **AI reply loop:** Script replies to its own previous comment. Detection: check comment author ID against bot account before posting.
- **Token cost blowup:** A space with hundreds of comments triggers many Claude API calls. Mitigation: cap per-run with `--max-comments N`; log cost estimates before posting.

**Detection:** Script logs every action (created page, posted comment, skipped comment with reason) to stdout. Pipe to a file for audit.

**Fallback:** All operations are additive (create page, add comment) — nothing is deleted. Rolling back means deleting the AI-generated page or comment manually in Confluence.

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| PM / product engineer | Manually copies skill output into Confluence | Single command creates the page |
| Developer | Confluence comments on specs go unanswered | AI drafts replies; human reviews and approves |
| Engineering lead | Jira tickets lack structured proposals | `/jira-propose` generates a draft PRD from ticket content |

_No end-user (macular degeneration) impact — this is an internal team workflow tool._

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Atlassian MCP server lacks page write support | Med | High | Verify tool list before committing to Phase 1 design; fallback to `confluence.js` in skill via subprocess |
| AI-generated content treated as authoritative without review | Med | High | Mandatory `[AI draft]` label; document review requirement in skill output |
| Atlassian API credentials leak | Low | High | Credentials in `.env.secrets` (gitignored); never hardcoded |
| Polling script cost with large spaces | Med | Med | `--max-comments` flag; dry-run before first real run |
| `confluence.js` library unmaintained | Low | Low | Library is TypeScript-native and actively used; worst case use raw `fetch` against REST API v2 |

## Technical overview

### What changes
- **`.claude/`**: New skills — `skills/confluence-publish/` and (Phase 3) `skills/jira-propose/`
- **`.claude/settings.json`**: Add Atlassian MCP server configuration (OAuth credentials from `.env.secrets`)
- **`scripts/`**: New `confluence-responder.ts` — polling script for comment AI responses
- **`projects/frontend/`**: No changes
- **`projects/api/`**: No changes
- **`package.json` (root or scripts-level)**: Add `confluence.js` and `@anthropic-ai/sdk` as dependencies for the script
- **`.env.secrets`**: Add `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, `CONFLUENCE_BASE_URL`, `CONFLUENCE_SPACE_KEY`
- **`.env.config`**: Add `CONFLUENCE_BOT_ACCOUNT_ID` (used to detect AI-authored comments)

### Key decisions needed before implementation
- Does the official Atlassian MCP server support `create_page` and `create_comment` write operations? (Check [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) tool list.)
- Where should the polling script live — root `scripts/` or a new `tools/` directory?
- What Confluence space(s) should be in scope for polling?

### AI considerations

**Model behaviour:** Page creation uses the existing `/prd` or `/explore` output as input — the Claude model is already generating well-structured content through those skills. For comment responses, the model should be given: page title, page body excerpt, comment text, and a system prompt instructing it to respond helpfully and flag if the question is outside its knowledge.

**Evaluation:** Manually review first 10 AI-generated comment replies before enabling automated posting. Check for hallucination, tone, and appropriateness.

**Guardrails:** System prompt for comment responder must instruct the model not to make commitments on behalf of the organisation, and to recommend human follow-up for anything involving dates, budgets, or decisions.

### Security considerations

- Atlassian API token stored in `.env.secrets` (gitignored). Never committed.
- The polling script reads and writes to Confluence — scope it to the minimum required API token permissions (read pages, create comments).
- The `/confluence-publish` skill uses the MCP server's OAuth flow — credentials are managed by the MCP server, not the skill code.
- Comment content is user-generated input passed to the Claude API — no PII handling is expected, but if comments contain personal data, that data is sent to Anthropic. Document this in the team's data handling policy.

### Observability

- Polling script: structured JSON log per run to `logs/confluence-responder-YYYY-MM-DD.json` (pages checked, comments found, comments responded, skipped, errors).
- No Prometheus metrics needed — this is a script, not a long-running service.
- Cost estimate: log estimated token usage per run; alert if > configurable threshold.

## Success metrics

### User metrics
- PM can publish a Confluence page from a skill output in under 2 minutes (vs. 10+ minutes manual).
- Confluence comments on AI-generated pages receive a draft reply within one polling cycle.

### System metrics
- [ ] `/confluence-publish` skill creates a valid Confluence page on first run.
- [ ] Polling script correctly skips comments already replied to (no duplicate posts).
- [ ] Dry-run mode produces accurate log of what would be posted.

### Business metrics
- Reduction in time from skill output to published Confluence page.
- Reduction in unanswered comments on spec pages.

## Milestones

| # | Milestone | Scope | Notes |
|---|-----------|-------|-------|
| M1 | MCP server configured, page creation working | Atlassian MCP config + `/confluence-publish` skill (basic) | Verify write support first |
| M2 | Polling script — comment detection | `confluence-responder.ts` with dry-run mode; identifies unanswered comments correctly | No posting yet |
| M3 | Polling script — AI reply posting | Claude API integration; `[AI draft]` label; loop detection | Run on small space first |
| M4 | Jira proposal skill | `/jira-propose` skill via MCP; output as Confluence page or Jira comment | Lower priority |

**Rollback plan:** All operations are additive. Delete AI-generated pages/comments manually in Confluence. Remove MCP config from `.claude/settings.json` to disable skill access. No schema migrations or database changes.

## Rejected ideas

- **Webhook-based comment processing** — rejected by user preference; adds operational complexity (public endpoint, HTTPS, Atlassian webhook config).
- **NestJS module for Confluence** — rejected as over-engineered; internal scripts do not need HTTP server infrastructure.
- **n8n / Zapier** — rejected due to third-party dependency and loss of codebase context in prompt construction.

## Open questions

1. Does the Atlassian MCP server support `create_page` and `create_comment` write operations? If not, Phase 1 falls back to `confluence.js` called from a skill subprocess.
2. Should the polling script be run manually by the developer, or is a lightweight cron setup (e.g., GitHub Actions scheduled workflow) acceptable?
3. What Confluence space key(s) should be in scope for polling — all spaces, or a configured allowlist?
4. Should Jira proposals (Phase 3) be posted back to the Jira ticket as a comment, or always create a linked Confluence page?

## References

- Existing explore: [docs/explore/2026-03-09-jira-mcp-skill-pipeline.md](docs/explore/2026-03-09-jira-mcp-skill-pipeline.md)
- Atlassian MCP server: [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)
- `confluence.js` library: [mrrefactoring.github.io/confluence.js](https://mrrefactoring.github.io/confluence.js/)
- Confluence REST API v2 comments: [developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment](https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/)
- ADR reference: [docs/adr/](docs/adr/) — no existing ADRs constrain this feature directly
- Existing skills pattern: [.claude/skills/](/.claude/skills/)

---

## PRD self-critique

- **Riskiest assumption:** The Atlassian MCP server supports page and comment write operations. If it is read-only, Phase 1 requires a different implementation path (calling `confluence.js` directly from the skill, which is more complex than using MCP).
- **Most fragile part of the design:** The comment loop detection (skip comments authored by the bot account). If the bot account ID changes, or if the polling script is run under a different user's credentials, it will reply to its own previous comments indefinitely.
- **Highest long-term impact decision:** Whether AI comment replies are posted immediately or held in a review queue. Posting directly is simpler but risks low-quality AI responses appearing publicly in Confluence. A review queue (e.g., draft comment or Slack notification) is safer but adds workflow complexity.
- **What's missing:** No consideration of Confluence page versioning — if the `/confluence-publish` skill is run twice on the same topic, it creates duplicate pages. A "find or create" approach (check if a page with that title exists before creating) should be designed in before implementation.
