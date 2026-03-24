# PRD: Contact Collection DB Persistence

> Status: Draft | Version: 0.1 | Author: via /prd

## Problem

When a user provides their phone number or email via the chatbot's contact-collection tool, that data is written to a Markdown file in `.cache/history/` and nowhere else. Staff viewing session history in the admin portal cannot see what contact was collected — they must manually cross-reference the filesystem by session ID, which is impractical. The single `user_phone` column in the sessions table only holds one phone number and has no email counterpart; a user who corrects their contact details mid-conversation loses all but the last scalar value.

## Context

- Schema is defined in `src/db/schema.ts`; all changes go through Drizzle Kit migrations (`npm run db:generate` + `npm run db:migrate`) — ADR-004
- Contact collection fires via OpenAI function calling in `rag/handlers/contact-collection.handler.ts`; it already has a single, clear insertion point
- Sessions use anonymous UUIDs and are never automatically deleted in practice (`cleanupExpiredSessions()` is implemented but not scheduled); manual deletion via `DELETE /api/chat/sessions/:sessionId` cascades to child tables
- The `sessions` table has a `collectionState` enum and scalar `user_phone` / `user_name` fields that serve the existing state machine — these are not replaced by this change

## Assumptions

- Only valid contacts (where `contactInfo.isValid === true`) are stored — invalid attempts are visible in conversation history and do not need a separate record _(High confidence — agreed with stakeholder)_
- Contacts are kept indefinitely — no retention TTL is applied at this stage _(High confidence — agreed with stakeholder)_
- The flat-file write (`saveConversationHistory()`) will be removed once DB storage is confirmed working — it is a liability, not a feature _(High confidence)_
- The admin session-history view needs to display contacts; this change provides the data layer, and the admin UI wiring is in scope _(Med confidence — admin portal may need a separate PR)_
- A user can legitimately provide more than one contact method in a single session (e.g. email first, then phone) _(High confidence — the tool already accepts both types)_

## User Journey

1. User requests a callback from Macular Society support
2. Chatbot prompts for phone number or email; user provides a value
3. `collect_contact_information` tool fires; `ContactCollectionService.validateContact()` runs
4. On valid contact: handler calls `SessionRepository.addContact()` — a row is inserted into `session_contacts`; the flat-file write is removed
5. On invalid contact: no DB write; existing error message returned to user; user corrects and retries (goes back to step 2)
6. Staff open the session in the admin portal; the session-detail API returns the contacts array alongside messages
7. Staff see all contact entries for that session (type, value, timestamp) and can initiate follow-up

Edge cases:
- User provides the same contact value twice — both rows are stored (idempotency not enforced; duplicates are visible and not harmful)
- User provides email and phone in the same session — both rows stored, both visible to staff
- Session is manually deleted by admin — `ON DELETE CASCADE` removes associated contact rows

## Goals

- [ ] All valid collected contacts are stored in the DB and visible via the session-detail API
- [ ] The `session_contacts` table supports multiple entries per session, typed as `phone` or `email`
- [ ] `GET /api/chat/sessions/:sessionId` (or equivalent admin endpoint) returns a `contacts` array alongside messages
- [ ] The flat-file write in `saveConversationHistory()` is removed
- [ ] A Drizzle Kit migration is generated and included — no manual table creation

## Non-goals (explicitly out of scope)

- Retention policy or scheduled deletion of contact records
- Deduplication of identical contact values within a session
- Changes to the `collection_state` state machine or the existing scalar `user_phone` / `user_name` fields
- GDPR consent notice in the chat UI (a separate workstream)
- Email/Slack notification to staff on contact collection

## Options considered

Evaluation criteria: implementation effort · query/deletion capability · architecture fit · data integrity

### Option A: New `session_contacts` table (relational)
**What:** A dedicated child table with `id`, `session_id` (FK → sessions, cascade delete), `type` (phone|email enum), `value`, `collected_at`. One row per contact submitted.
**Pros:** Per-row deletion for right-to-erasure; queryable by type; cascade delete wired to existing session deletion; clean Drizzle schema with full type inference
**Cons:** Requires one additional table and a new repository method
**Effort:** Low

### Option B: JSONB `contacts` column on sessions
**What:** Add `contacts JSONB DEFAULT '[]'` to the sessions table. Append each valid contact as `{type, value, collectedAt}` using a read-modify-write or raw `jsonb_array_append`.
**Pros:** No new table; single migration column
**Cons:** No per-entry deletion without replacing the whole array; not natively indexed; append requires raw SQL; harder to query by contact type
**Effort:** Low

### Option C: Extend existing scalar fields (user_phone + add user_email)
**What:** Add a `user_email` column alongside `user_phone`; overwrite on each valid contact.
**Pros:** Minimal schema change
**Cons:** Still single-valued per type; cannot record multiple attempts; does not solve the array requirement; ignores the case where a user provides two phone numbers
**Effort:** Very Low (but wrong)

## Recommended approach

**Choice:** Option A — new `session_contacts` table

A relational child table is the correct fit: contacts are naturally one-to-many, individual rows can be deleted (right-to-erasure path), and they benefit from the existing cascade delete on session deletion. Drizzle's schema inference and query builder handle this pattern cleanly. Option B's JSONB array cannot delete individual entries without a full array replacement, which is a meaningful operational and compliance burden for negligible implementation saving.

## Failure modes

- **Handler injects but repository throws** — contact is validated and acknowledged to user but not persisted; user believes they submitted successfully and may not retry
  - **Detection:** Logger error in handler; contact row absent from DB; mismatch between `collectionState: complete` and empty contacts array
  - **Fallback:** Wrap `addContact()` in try/catch; log error but do not surface to user; preserve existing state-machine flow

- **Migration not applied in a deployment** — `session_contacts` table does not exist; every contact write throws a 500
  - **Detection:** Startup health check or first tool invocation error
  - **Fallback:** Migration must be applied before deploying the code change; include in deployment runbook

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| Macular Society helpline staff | No structured view of contact details in admin portal; must grep filesystem | Contacts appear inline with session history; no filesystem access needed |
| Chatbot user (low vision, often elderly) | Provided contact details; uncertain if received | Contacts reliably persisted; staff can follow up with correct details |
| Macular Society IT/DPO | Cannot respond to right-to-erasure request covering contact data | Contacts deletable via `deleteSession()` cascade or direct row delete |

_No direct UI changes for end users. Admin portal contact display must meet WCAG 2.1 AA — contacts panel should be keyboard-navigable and screen-reader labelled._

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration not run before deploy | Med | High | Add `db:migrate` step to deployment process; API should fail fast if table missing |
| Flat-file removal breaks a staff workflow nobody documented | Low | Med | Confirm with stakeholders that `.cache/history/` is not actively used before removing the write |
| Contact handler does not have `SessionRepository` injected | Low | Low | Module wiring check in code review |

## Technical overview

### What changes

- **`projects/api/src/db/schema.ts`**: Add `session_contacts` pgTable with `id` (serial PK), `session_id` (FK → sessions, cascade delete), `type` (`contact_type` enum: phone|email), `value` (text), `collected_at` (timestamp). Add Drizzle relation on sessions.

- **`projects/api/src/modules/database/session.repository.ts`**: Add two methods:
  - `addContact(sessionId, type, value): Promise<void>`
  - `getContactsForSession(sessionId): Promise<SessionContact[]>`

- **`projects/api/src/modules/rag/handlers/contact-collection.handler.ts`**: Inject `SessionRepository`; call `addContact()` after `contactInfo.isValid === true`. Remove call to `saveConversationHistory()`.

- **`projects/api/src/modules/contact-collection/contact-collection.service.ts`**: Remove `saveConversationHistory()` and `buildMarkdown()` methods. Remove `fs` imports. Keep validation methods.

- **`projects/api/src/modules/chat/`** (controller + service): Include `contacts` array in session-detail response so the admin portal can display it. The existing session-detail endpoint should join or fetch contacts alongside messages.

- **`projects/api/drizzle/`**: New migration file generated by `npm run db:generate`.

- **Infrastructure**: No Docker or config changes required.

### Key decisions needed before implementation

- Confirm with stakeholders that `.cache/history/` Markdown files are not used by any current staff workflow before removing the write.
- Decide whether `contacts` are returned as part of the existing `GET /api/chat/sessions/:sessionId` response body or via a separate sub-resource endpoint.

### Security considerations

Contacts contain PII (phone numbers, email addresses). The existing admin routes are protected by Zitadel JWT auth. `session_contacts` rows are only exposed through authenticated admin endpoints — no change to the public chat API surface. The FK cascade ensures contacts are deleted whenever a session is deleted via the existing auth-gated delete endpoint.

### Observability

- Log `contact stored: sessionId=${id} type=${type}` at INFO level in the handler (no PII in the log value — consistent with ADR-003)
- No new Prometheus metrics needed; contact collection is a low-frequency event

## Success metrics

### System metrics
- [ ] `session_contacts` rows present in DB for all sessions where `collectionState = 'complete'`
- [ ] No Markdown files written to `.cache/history/` after deployment
- [ ] Zero 500 errors on contact tool invocation in staging smoke test

### User metrics
- Staff can view collected contact details in admin session history without filesystem access

## Milestones

| # | Milestone | Scope |
|---|-----------|-------|
| M1 | Schema + migration | Add `session_contacts` table to schema.ts, generate migration, verify locally |
| M2 | Repository + handler wiring | `addContact()` + `getContactsForSession()` in repository; handler calls `addContact()` instead of `saveConversationHistory()` |
| M3 | API response + flat-file removal | Include contacts in session-detail response; remove `saveConversationHistory()` from service |
| M4 | Admin UI display | Show contacts panel in admin session-history view |

**Rollback plan:** Revert handler to call `saveConversationHistory()` again; drop `session_contacts` table via a down migration. No user-facing change; rollback is low risk.

## Rejected ideas

- **JSONB contacts column on sessions** — rejected because per-row deletion is not possible without full array replacement, and the data is naturally relational
- **Add `user_email` scalar field** — rejected because it doesn't solve the multi-contact requirement and perpetuates the single-value model

## Open questions

1. Is `.cache/history/` actively read by any staff member or automated process today? (Must confirm before removing the flat-file write in M3)
2. Should contacts be returned inline in the existing session-detail response, or as a separate `/sessions/:id/contacts` endpoint?

## References

- Existing code: [contact-collection.service.ts](projects/api/src/modules/contact-collection/contact-collection.service.ts), [contact-collection.handler.ts](projects/api/src/modules/rag/handlers/contact-collection.handler.ts), [schema.ts](projects/api/src/db/schema.ts), [session.repository.ts](projects/api/src/modules/database/session.repository.ts)
- ADR-004: Database layer with Drizzle ORM
- ADR-007: Stateless sessions model
- Explore: [2026-03-15-contact-collection-db-persistence.md](docs/explore/2026-03-15-contact-collection-db-persistence.md), [2026-03-08-gdpr-compliance-contact-collection.md](docs/explore/2026-03-08-gdpr-compliance-contact-collection.md)

---

## PRD self-critique

- **Riskiest assumption:** That `.cache/history/` is not actively used by staff. If it is, removing the flat-file write in M3 breaks a current workflow with no warning. Confirm before M3.
- **Most fragile part of the design:** The handler wiring — `ContactCollectionToolHandler` currently does not inject `SessionRepository`. If the NestJS module graph is not updated (module imports in `contact-collection.module.ts` or `rag.module.ts`), the injection will fail silently or at startup.
- **Highest long-term impact decision:** Whether contacts outlive their parent session. The current cascade-delete design means deleting a session deletes contacts. If future requirements need contacts to persist beyond session deletion (e.g. for a CRM export), the FK and module structure need revisiting.
- **What's missing:** No mention of what happens if a user provides contact info in multiple sessions. Contacts are session-scoped; there is no cross-session deduplication or identity linking. This is fine for now but worth flagging if a helpline queue UI is ever built.
