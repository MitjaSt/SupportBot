# Exploration: Admin Conversation History Viewer

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Replace the frontend chat history sidebar with an admin-only page that lets authenticated admins browse, search, filter, and expand all conversation sessions.

## Problem interpretations

### Interpretation A: Quality monitoring
Admins need to review what users are actually asking to catch hallucinations, bad retrievals, or gaps in the knowledge base. Without visibility into real conversations, the only signal is silence — you don't know what's broken until something breaks loudly. Admins today have zero in-app tooling for this.

### Interpretation B: Contact collection audit
The chatbot collects user phone numbers and preferred callback times via the contact collection state machine. Admins presumably need to act on these — call people back. A conversation viewer that surfaces sessions where contact collection completed (state = `complete`) would make this operational, not just a database export exercise.

### Interpretation C: Governance and GDPR readiness
Any service collecting contact data needs an audit trail. Admins need to be able to demonstrate what was said, when, and whether data was collected with appropriate context. The current setup has no admin-facing record of this.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Admin / charity staff | Wants to review recent conversations for quality | Query Postgres directly | High |
| Admin | Needs to action a callback request (contact collection complete) | Export `consented-sessions` endpoint manually | High |
| Admin | Wants to see if a particular topic is confusing users | No workaround — not possible today | High |
| Developer | Debugging a bad response reported by a user | Read raw DB records | Med |

_Note: This is an admin tool, not a user-facing page — macular degeneration accessibility concerns apply to the admin users themselves, some of whom may also have vision impairment or use assistive technology. MUI defaults with adequate contrast and keyboard navigation should be maintained._

## Why now

- The chat history sidebar is being removed from the public frontend — so admins lose their only way to inspect conversations
- The `consented-sessions` endpoint and `listSessions()` repository methods already exist but are unexposed in a usable UI
- The admin shell is established (Zitadel auth, AdminShell nav, four existing pages) — adding a fifth page is low friction
- Contact collection is live; staff need a way to action callbacks without touching the database

## Existing solutions

**Internal:**
- `SessionRepository.listSessions()` — returns all non-expired sessions with `messageCount`, but hard-capped at `limit=50` and no search or filter
- `SessionRepository.listConsentedSessions()` — returns sessions where `collectionState = 'complete'`
- `GET /chat/sessions/:sessionId` — returns full session + message history (unauthenticated today, a risk to address)
- `GET /chat/consented-sessions` — permission-guarded with `sessions.consented:read`
- No admin-scoped `GET /chat/sessions` (all sessions) endpoint exists yet — only user-scoped
- Session TTL is 24h by default — expired sessions are hard-deleted; historic data is gone

**External:**
- Intercom, Crisp, Zendesk — purpose-built conversation review tools with full search, tagging, sentiment analysis; far more than needed, and not self-hosted
- LangWatch (already integrated) — has conversation tracing but not structured session-level browsing or contact data
- Custom data table with MUI `DataGrid` + server-side pagination — the obvious pragmatic path given the existing stack

## Possible directions

### Direction A: Minimal admin sessions page
A simple MUI table in the admin shell showing all sessions (paginated server-side). Columns: Session ID (truncated), first message preview (80 chars), message count, contact state, created at. Expandable row shows full conversation transcript. Search by session ID or contact name. Sort by date or message count. No changes to data retention.

### Direction B: Callback-focused view
A dedicated page specifically for sessions where `collectionState = 'complete'`. Shows name, phone, callback time, topic, and a link to expand the full conversation. Optimised for the "action a callback" workflow rather than general browsing. Simpler scope, higher immediate operational value.

### Direction C: Full conversation analytics + search
Full-text search across message content, tag/label conversations, export to CSV, sentiment indicators. Requires indexing message content (e.g. tsvector in Postgres or a separate search layer). Much higher effort; likely premature without knowing what admins actually need to query.

## Hard problems

- **Session TTL**: Sessions expire in 24h and are hard-deleted. If admins need to review conversations more than a day old, the data doesn't exist. This is an architectural constraint, not a UI problem — the TTL must be extended or a separate audit log introduced before a history viewer provides lasting value.
- **Pagination + search at scale**: `listSessions()` uses a hard `LIMIT`. Server-side cursor or offset pagination with search against session metadata (not message content) needs to be added to the repository and controller.
- **Authorization boundary**: `GET /chat/sessions/:sessionId` is currently unauthenticated — any client with a session ID can retrieve its messages. Exposing this in an admin UI doesn't change the risk, but it highlights a gap: admin access to *all* sessions needs a dedicated guarded endpoint, distinct from the user-scoped one.
- **GDPR**: Sessions are nominally anonymous (UUID from localStorage). But sessions in `collectionState = 'complete'` contain name and phone number. Admins viewing these are processing personal data — retention, access logging, and right-to-erasure workflows may be required.

## Resolved decisions (2026-03-15)

| Question | Decision |
|----------|----------|
| Retention window | **Unlimited / forever** — sessions are never hard-deleted. The cleanup job must be disabled or made opt-in. A migration to add `retainedAt` or a separate `session_audit` table may be needed. |
| Full-text search | **Yes, include it** — search across message content. Not required for v1 but the schema must support it from the start (GIN index on a `tsvector` column, or a generated column on `messages.content`). |
| Contact data visibility | **Show it if present** — display name, phone, preferred callback time, and topic inline in the table row when `collectionState = 'complete'`. |
| Pagination | **Deferred** — default limit 50, allow admin to expand to 500 via a selector. No cursor/offset pagination UI for now (~100 sessions/day expected). |

## Unknowns (remaining)

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Is contact data (name, phone) subject to GDPR access logging requirements? | May require audit log of which admin viewed which session | Legal/DPO review |
| Should the cleanup job be disabled globally or only for sessions with contact data? | Affects DB growth; anonymous sessions with no contact data may still be safe to delete | Policy decision |

## Promising direction

**Direction A** — full admin sessions table with contact data, full-text search (schema-ready from day one), and a simple limit selector instead of pagination.

The data layer is 80% there. The admin shell is ready. The key additions are: disable session cleanup (or introduce a retention flag), add a GIN tsvector index on `messages.content`, expose an admin-guarded `GET /api/admin/sessions` endpoint with search/filter params, and build a single React page with a MUI DataGrid, expandable rows showing the full transcript, and contact data surfaced inline.
