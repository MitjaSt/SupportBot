# Exploration: Persist Collected Contacts to DB as an Array

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Replace flat-file storage of collected contact details with a DB-backed array on the session, so that staff viewing session history can see all phone numbers and email addresses a user provided during the conversation.

## Problem interpretations

### Interpretation A: The visibility gap

When a user provides contact details via the chatbot tool, that data disappears into a Markdown file in `.cache/history/`. Anyone viewing a session in the admin portal sees the conversation but has no structured way to see what contact was collected — they would have to manually cross-reference filesystem files by session ID. The contact is effectively invisible to any session-history view.

### Interpretation B: The single-contact limitation

The current sessions table has a single `user_phone` text column. A user might provide an email first, be told it is invalid, then provide a phone number instead — or provide both over the course of a long conversation. The scalar field model cannot represent this: only the last successfully written value survives. The flat file captures multiple attempts, but the DB captures none.

### Interpretation C: The GDPR / deletion gap

A previous exploration (2026-03-08) identified the flat-file store as a present GDPR violation: personal data stored without access controls, no deletion mechanism, no retention policy, filename encodes PII directly. Moving contacts into the DB — where `DELETE CASCADE` on session, `cleanupExpiredSessions()`, and the existing `deleteSession()` endpoint already operate — closes that gap structurally. DB storage is the prerequisite for lawful handling, not just a convenience.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Macular Society helpline staff | Viewing a session in admin portal — need to know how to reach this person | Manually check `.cache/history/` by session ID | High |
| Chatbot user | Provided contact details, may have corrected them mid-conversation | None — relies on staff finding the right file | Med |
| Macular Society IT/DPO | Must respond to a right-to-erasure request covering contact data | Cannot — flat files have no deletion path tied to session identity | High |
| Developer / admin | Querying which sessions have collected contacts, or filtering by contact type | Not possible — data is not in DB | Med |

_Note: Low-vision users may have difficulty entering contact details correctly on first attempt. The system already allows correction via re-submission. An array model correctly reflects that a user may have provided two or three attempts before a valid contact was recorded — all of which are personal data and must be deletable._

## Why now

- The admin conversation history feature (explore 2026-03-15) is in flight — if contact data goes into DB now, the admin view gets contacts for free.
- The GDPR remediation sprint identified flat-file contact storage as the most urgent non-compliant data surface (explore 2026-03-08). Moving to DB is the first concrete step.
- The existing schema already has the session foreign key structure needed; a migration is a small addition.
- The handler currently calls `saveConversationHistory()` — the insertion point for a DB write is already identified.

## Existing solutions

**Internal — current state:**
- `contact-collection.service.ts:saveConversationHistory()` — writes `{type, value}` + full transcript to `.cache/history/<timestamp>_<type>_<value>.md`
- `sessions` table has `user_phone TEXT` (single scalar), `user_name TEXT`, `preferred_call_time TEXT` — no email column, no array
- `session.repository.ts:updateUserInfo()` — updates `user_phone` / `user_name` as scalars; cannot store multiple contacts or email type
- `contact-collection.handler.ts` — calls `saveConversationHistory()` on valid contact; no DB write at this point
- `cleanupExpiredSessions()` / `deleteSession()` — DB deletion paths exist and would cover contact rows if relational

**Internal — what is missing:**
- No DB table or column for collected contacts as an array
- No repository method to append a contact to a session
- No API endpoint surfacing contacts alongside session history

**External — how others model this:**
- CRM systems (Salesforce, HubSpot): contact records as first-class entities with multiple channels (phone/email/SMS) stored as typed rows in a `contact_channels` table
- Support tools (Intercom, Zendesk): conversation metadata includes an array of contact handles, each with a type and value
- Common Postgres pattern: `JSONB` array column for simple cases; separate child table for queryability and per-row deletion

## Possible directions

### Direction A: New `session_contacts` table

Add a dedicated `session_contacts` table: `id`, `session_id` (FK → sessions, cascade delete), `type` (phone | email), `value`, `is_valid`, `collected_at`. Each contact submission gets a row. Fully relational — supports per-contact deletion, indexed queries, and clean Drizzle schema. Requires a migration and a new repository method. The `collect_contact_information` tool handler calls `saveContact()` instead of (or in addition to) `saveConversationHistory()`.

### Direction B: JSONB `contacts` array on sessions

Add a `contacts JSONB` column to the sessions table, default `[]`. Each valid contact is appended as `{type, value, collectedAt}`. Simpler migration (one column), no new table, no FK. Drizzle supports JSONB; append is an `sql` expression (Postgres `jsonb_array_append` or a read-modify-write). Less queryable and harder to delete a single contact entry without replacing the whole array.

### Direction C: Hybrid — keep existing scalars, add contacts JSONB

Keep `user_phone` and `user_name` for backward compatibility with existing `updateSession()` callers, and add a `contacts JSONB` column alongside. Contacts array captures the full history; scalar fields remain for the collection-state machine which reads `user_phone`. Avoids touching existing code paths but creates two representations of the same data that can drift.

### Direction D: Direction A + remove the flat-file write

Same as Direction A but also remove `saveConversationHistory()` from the handler once DB storage is in place. The flat file served as a debugging artifact and compliance liability. With contacts in DB and session messages already in DB, the Markdown file adds nothing. Conversation transcript is already retrievable via `getMessages(sessionId)`. This is the cleanest outcome.

## Hard problems

- **Schema migration with enum overlap**: The `collection_state` enum has `collecting__user_phone` but not `collecting__user_email`. If multi-contact collection is a goal (email or phone, user's choice), the state machine needs updating — or contacts and state machine are decoupled.
- **Append semantics in Postgres**: For Direction B, appending to a JSONB array requires a read-modify-write or a `jsonb_array_append` raw SQL call — Drizzle does not have a built-in append operator. Direction A avoids this entirely.
- **Drizzle migration tooling**: The project uses Drizzle Kit (`drizzle-kit generate` + `drizzle-kit migrate`). Any schema change needs a migration file generated and run before the API starts. The dev workflow must accommodate this.
- **Session TTL vs. contact retention**: Contacts are currently collected inside a session that expires (default 24 h). If a session expires and is cleaned up, contacts are deleted with it — but staff may need contacts beyond the session window. The retention model needs a decision.
- **Invalid contacts**: Should invalid submissions be stored too (for audit / debugging)? The current `ContactInfo.isValid` flag provides the hook. Storing only valid contacts is simpler; storing all gives a full audit trail but adds noise.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What is the intended retention period for collected contacts? | If contacts must outlive the session TTL, they cannot rely on session cascade delete | Business stakeholder decision |
| Should the admin portal display contacts inline with the transcript, or separately? | Drives whether contacts live on the session row or in a separate sidebar / panel | Design / UX review |
| Are invalid contact attempts PII that must be storable and erasable? | If yes, they must go into DB too — flat file captures them today | Legal / DPO input |
| Does the current `collection_state` machine need to support email-first flows? | If the assistant can now collect email OR phone, the enum and machine need updating | Review `tools.ts` and chat-messages constants |
| Does `saveConversationHistory()` serve any purpose beyond compliance storage? | If it is purely a data store (not a debugging tool in active use), it can be removed in Direction D | Check whether files in `.cache/history/` are ever read by humans or tooling |

## Promising direction

**Direction D** (new `session_contacts` table + remove flat-file write) — highest correctness, closes the GDPR liability, and keeps a single source of truth.

A separate table is strictly better than a JSONB column for this data: contacts need per-row deletion (right to erasure), are naturally queryable ("give me all sessions with a collected email"), and benefit from the FK cascade that already handles session deletion. Removing the flat-file write is the natural endpoint once DB storage is reliable — the Markdown file is a liability, not a feature. The migration is small and the insertion point in `contact-collection.handler.ts` is already identified.
