# PRD: GDPR-Compliant Consent for Prompt Logging and Contact Collection

> Status: Draft | Version: 0.1 | Author: Claude via /prd

## Problem

The system already collects personal data — prompt logs (raw user queries and responses to `.cache/prompts/`) and contact details (phone/email + full transcripts to `.cache/history/`) — with no documented lawful basis, no user-facing notice, and no consent mechanism. Both stores have no retention schedule and no deletion path outside the DB. Two gaps need closing: (1) prompt logging in production requires explicit consent it does not currently collect, and (2) contact collection has no inline GDPR notice to make the processing transparent to the user.

## Context

- Anonymous UUID sessions: the base chat flow processes no personal data if the user doesn't volunteer it. UK GDPR only applies when personal data enters the system.
- Prompt logger (`prompt-logger.service.ts`) writes verbatim `query` + `response` to `.cache/prompts/*.yaml` on every RAG call — no session linkage in the file, no redaction, no retention limit.
- Contact collection (`contact-collection.service.ts`) saves phone/email + full transcript to `.cache/history/*.md` — filename encodes the contact value directly, no retention policy, no deletion mechanism.
- Sessions table already tracks state per session (`collectionState`, `userPhone`, etc.) via Drizzle ORM + Postgres — adding a consent field follows the existing pattern.
- `DELETE /api/chat/sessions/:sessionId` deletes from DB (messages cascade) but does **not** touch flat files. Erasure compliance is incomplete — but flat-file migration is out of scope for this PRD.
- Frontend is React 18 + MUI v5. Consent preference needs to survive page reloads — `localStorage` is the established pattern for user preferences (`voiceEnabled` follows this).
- ICO guidance: consent for AI improvement purposes must be explicit opt-in; using conversations to improve AI is a separate purpose requiring its own consent. The Data (Use and Access) Act (June 2025) applies.

## Assumptions

- Prompt logging remains enabled in production for quality improvement — **this PRD is predicated on that decision**. If logging is disabled in production, Feature 1 becomes unnecessary. _(High confidence based on user direction)_
- "Skilled professionals" reviewing logs are Macular Society staff, not third-party contractors. If third parties are involved, a Data Processing Agreement is needed separately. _(Med confidence — not confirmed)_
- Macular Society will define and document a retention period for prompt logs outside this PRD. The system enforces whatever period is decided; this PRD does not pick the number. _(High confidence)_
- Contact collection lawful basis is legitimate interests (user-initiated, necessary to fulfil the callback request). This PRD adds transparency; it does not change the basis. _(High confidence based on ICO guidance)_
- The consent banner must not gate access to the chat input — using the chatbot cannot be conditional on consenting to logging. _(High confidence — ICO requirement)_

## User Journeys

### Feature 1: Consent to prompt logging

1. User opens the chatbot for the first time. The empty welcome state is shown.
2. Below the prompt chips and above the chat input, a compact notice is visible: **"Help us improve"** — one sentence explaining that conversations may be reviewed by Macular Society staff to improve responses, with a link to the privacy policy.
3. An unchecked checkbox: **"I'm happy for my conversations to be reviewed"**. Not required to start chatting.
4. User can tick the checkbox, then start chatting. Consent is stored in `localStorage` and written to the session record.
5. On subsequent visits (same `localStorage`), the checkbox reflects the saved state. User can change it at any time via a settings control (e.g. in the sidebar or a persistent footer link).
6. When the user sends a message: if `consentToLogging = true`, the API logs the prompt/response to `.cache/prompts/`. If `false`, the logger is skipped. No other behaviour changes.

Edge cases:
- User clears `localStorage`: consent resets to `false`. Next session starts fresh, logger skips unless re-consented.
- User consents mid-session: consent flag is sent with every request, so logging begins from the next message onwards. Prior messages in that session are not retroactively logged.
- Voice queries: `consentToLogging` must also be passed through the voice query path (`POST /chat/query/voice`).

### Feature 2: Inline GDPR notice on contact collection

1. User requests a callback mid-conversation. The LLM prompts for phone/email.
2. User provides contact details. The `collect_contact_information` tool validates and stores them.
3. The confirmation message returned to the user includes (in plain English): who holds the data (Macular Society), what it's used for (arranging a callback), how long it's retained (TBD — placeholder until retention period is decided), and how to request deletion (email address or link).
4. No checkbox required at this point — the user initiated the action. Transparency is achieved via the inline notice.

Edge cases:
- Contact validation fails: error message only, no GDPR notice (no data was stored).
- User provides contact then immediately wants deletion: the notice directs them to the deletion contact; no in-app deletion flow is in scope for this PRD.

## Goals

- [ ] Prompt logger only writes to disk when the session's `consentToLogging` flag is `true`
- [ ] Consent preference persists across page reloads via `localStorage` and is reflected in the session DB record
- [ ] Consent UI is accessible: unchecked by default, plain language, equal visual weight to decline (no dark patterns), WCAG 2.1 AA compliant
- [ ] Contact collection confirmation message includes the four required GDPR transparency elements: controller identity, purpose, retention period, deletion contact
- [ ] `consentToLogging` is passed through all query paths (stream, non-stream, voice)
- [ ] Consent timestamp is recorded in the session record for auditability

## Non-goals (explicitly out of scope)

- Moving `.cache/history/` or `.cache/prompts/` flat files into the database — separate work
- A GDPR purge API covering all storage locations — separate work
- Right-to-erasure endpoint — separate work
- Authentication / authorisation for admin access — separate work
- Defining the retention period for prompt logs — a business/legal decision, not an engineering one
- Consent for the contact collection step (separate lawful basis: legitimate interests)

## Options considered

Evaluation criteria: implementation effort · legal defensibility · user experience · accessibility

### Option A: localStorage only (no DB record)
**What:** Store `consentToLogging` only in `localStorage`. Pass it with every request. No schema change.
**Pros:** Zero migration needed; simple; matches the `voiceEnabled` pattern.
**Cons:** No audit trail — cannot demonstrate to ICO when/whether a specific session consented. Consent is lost if user clears storage. Not auditable per ICO requirement.
**Effort:** Low

### Option B: localStorage + session DB column (recommended)
**What:** Store preference in `localStorage` for UI state. Also write `consentToLogging: boolean` and `consentGivenAt: timestamp` to the sessions table on first consent action. Pass `consentToLogging` with every request; API reads it from the request (not DB) for logging decisions.
**Pros:** Auditable — ICO can be shown consent record per session. Consistent with existing session data model. `localStorage` handles UX (instant, no round-trip); DB handles compliance.
**Cons:** Requires a DB migration (one `ALTER TABLE` — low risk with a boolean `.default(false)`). Consent is written only when the session is created/updated, not before the first message.
**Effort:** Low–Medium

### Option C: Separate consent API endpoint
**What:** A dedicated `POST /chat/consent` endpoint that records consent before any query is made.
**Pros:** Clean separation; consent is explicit before data flows.
**Cons:** Adds an extra round-trip before the user can type; over-engineered for a single boolean flag; no real legal advantage over Option B.
**Effort:** Medium

## Recommended approach

**Choice:** Option B — `localStorage` + session DB column.

Matches the established pattern for user preferences (`voiceEnabled` in `localStorage`), adds the audit trail the ICO requires, and keeps the migration trivial (one boolean column with a safe default). The API reads `consentToLogging` from the incoming request body — no extra DB lookup per request — so there is no latency impact on the query path.

## Failure modes

- **User sends voice query without `consentToLogging` in the request**: voice path currently takes `sessionId` as a query param only. If `consentToLogging` is not added to the voice path, logging may default to `false` (safe) or to an unguarded state (unsafe). Must be explicitly handled.
- **Frontend sends stale `localStorage` value after user changes consent**: if the user toggles consent mid-session in a settings panel but a concurrent stream is in flight, that stream's log write uses the old value. Acceptable — consent applies from the next request.
- **Migration deploys before frontend change**: the new `consentToLogging` column defaults to `false`. Existing requests without the field will not log. Safe — conservative default.
- **Frontend deploys before migration**: the API receives `consentToLogging` but the column doesn't exist yet. The API must not crash — the field must be optional in the DTO with a safe default of `false`.

**Detection:** Log a counter metric (`consent_logging_accepted_total` / `consent_logging_declined_total`) to Prometheus. Alert if the ratio is anomalous.

**Fallback:** If `consentToLogging` is absent or unparseable, default to `false` — never log without explicit consent.

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| Chatbot user (low vision, often elderly) | No information about what happens to their conversation | Sees a clear, plain-English notice before chatting; has a genuine choice |
| Chatbot user requesting callback | No GDPR notice when providing phone/email | Confirmation message explains who holds data, why, and how to request deletion |
| Macular Society (data controller) | Processing personal data without lawful basis or consent record | Audit trail in DB; consent rate metric in Prometheus |
| Macular Society DPO / legal | Cannot evidence consent if challenged by ICO | `consentGivenAt` timestamp in sessions table provides per-session evidence |

_The consent UI is directly user-facing for people with macular degeneration. The checkbox label, notice text, and any links must meet WCAG 2.1 AA: minimum 4.5:1 contrast ratio, 16px minimum text size, screen-reader label on the checkbox (`aria-label` or `<label for>`), and keyboard-navigable. No colour-only status indication._

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ICO changes guidance on consent for AI improvement post Data (Use and Access) Act | Med | Med | Monitor ICO updates; consent UI is easy to adjust if wording requirements change |
| Retention period not decided before launch | High | Low | Use a placeholder in the contact collection notice ("stored for a limited period"); update when period is agreed |
| User confusion about the checkbox (thinks they must tick it to use the chatbot) | Med | Med | Label must say "optional"; test with a low-vision user if possible |
| Flat files still contain unconsented data from before this feature ships | High | Med | Document known gap; addressed in the separate flat-file remediation work |

## Technical overview

### What changes

**API (`projects/api/`)**
- `src/dto/query.dto.ts` — add optional `consentToLogging: boolean` field (TypeBox schema, default `false`)
- `src/modules/chat/chat.controller.ts` — pass `consentToLogging` from request body through to `ChatService`
- `src/modules/chat/chat.service.ts` — accept `consentToLogging` in `chat()` and `chatStream()`; pass to `RagService`
- `src/modules/rag/rag.service.ts` — accept `consentToLogging`; gate `promptLogger.log()` behind `if (consentToLogging)`
- `src/modules/contact-collection/contact-collection.service.ts` — update `buildMarkdown()` to include GDPR notice fields (controller, purpose, retention placeholder, deletion contact)
- `src/constants/chat-messages.ts` — update `contactCollected()` message template to include GDPR transparency text
- `src/db/schema.ts` — add `consentToLogging: boolean('consent_to_logging').default(false).notNull()` and `consentGivenAt: timestamp('consent_given_at', { withTimezone: true })` to sessions table
- `src/modules/database/session.repository.ts` — add `updateConsentToLogging(sessionId, consent, timestamp)` method; update `createSession` and `updateSession` to include new fields

**Frontend (`projects/frontend/`)**
- `src/components/ChatView.tsx` — add consent notice + unchecked checkbox to the empty state (welcome screen). Read/write `consentToLogging` from `localStorage`. Pass `consentToLogging` in every `sendQueryStream()` call.
- `src/api/client.ts` — add `consentToLogging: boolean` parameter to `sendQueryStream()` and `sendVoiceQuery()`
- `src/types/index.ts` — extend request types if needed

**Infrastructure**
- No Docker or compose changes needed.

**Data**
- One Drizzle migration: `ALTER TABLE sessions ADD COLUMN consent_to_logging BOOLEAN NOT NULL DEFAULT false; ALTER TABLE sessions ADD COLUMN consent_given_at TIMESTAMPTZ;`
- Safe to deploy before frontend — existing rows default to `false`, existing requests without the field default to `false`.

### Key decisions needed before implementation

- What is the retention period for prompt logs? (Required for the contact collection inline notice — can ship with a placeholder, but must be filled in before go-live)
- What is the deletion contact email / link to include in the contact collection confirmation?
- Should the consent notice appear on every new session, or only on the user's very first session ever? (First session only is friendlier; every new session is more auditable — ICO prefers the consent be re-obtained if its purpose changes)

### Security considerations

`consentToLogging` is a client-supplied boolean. The API must not trust it for anything security-critical — it only controls whether a log file is written. A malicious client sending `consentToLogging: true` when the user did not consent is a compliance risk, not a security risk; it cannot be fully prevented without server-side state. The DB record (`consentGivenAt`) provides the auditable ground truth — the API should write to DB only when the consent value transitions from `false` to `true`, not on every request.

### Observability

- New Prometheus counters: `rag_prompt_logs_written_total` (already implicit in logger), `consent_logging_accepted_total`, `consent_logging_declined_total`
- Log at `INFO` level when consent state changes (session ID + new state — no PII)
- No new alerts required at this stage; consent rate is informational

## Success metrics

### User metrics
- Consent opt-in rate (visible in Prometheus): target is not a number — we want an informed rate, not a maximised one. Dark patterns to inflate consent rate would be non-compliant.
- No user complaints about unexpected data use (baseline: zero).

### System metrics
- [ ] `rag_prompt_logs_written_total` only increments when `consentToLogging = true` in the request
- [ ] Session records with `consentGivenAt IS NOT NULL` match opt-in sessions in Prometheus counter (within margin of error from session expiry)
- [ ] Contact collection confirmation message contains all four GDPR transparency elements

### Business metrics
- Macular Society can evidence consent to ICO if challenged — `consentGivenAt` queryable from DB.

## Milestones

| # | Milestone | Scope | Notes |
|---|-----------|-------|-------|
| M1 | DB migration + API DTO | Add `consentToLogging` + `consentGivenAt` to schema; update DTO to accept field; gate prompt logger behind it | Deploy first — safe default means no behaviour change until frontend ships |
| M2 | Prompt logger gated | `RagService` and `ChatService` pass consent through; logger only fires when `true`; voice path covered | Can be part of M1 deploy |
| M3 | Frontend consent UI | Checkbox in welcome state; `localStorage` persistence; `consentToLogging` sent in all query calls | Deploy after M1 |
| M4 | Contact collection notice | Update `buildMarkdown()` and `contactCollected()` message with GDPR transparency text | Requires retention period and deletion contact decisions |

**Rollback plan:** M1 can be rolled back via a Drizzle migration that drops the two columns (no data loss — columns were empty). M3 rolls back by reverting the frontend deploy; the API defaults to `false` so logging stops. M4 rolls back by reverting the message template string.

## Rejected ideas

- **Pre-ticked checkbox** — rejected; explicitly prohibited by ICO and UK GDPR.
- **Consent wall (block chat input until checkbox ticked)** — rejected; consent must not be a precondition of service use per ICO guidance.
- **Separate `/consent` API endpoint** — rejected; over-engineered for a single boolean; adds round-trip before first message.
- **Storing consent only in localStorage, no DB record** — rejected; no audit trail, cannot evidence consent to ICO.

## Open questions

1. What retention period should be stated in the contact collection GDPR notice? (Business/legal decision — placeholder "a limited period" can ship, but must be resolved before go-live)
2. What is the deletion request contact email or URL? (Required for the inline notice)
3. Should consent be re-requested on every new browser session, or remembered indefinitely via `localStorage`? ICO prefers periodic re-consent if the purpose hasn't changed; annually is a common practice. Decision needed before M3.
4. Does "skilled professionals" include any third-party contractors? If yes, a Data Processing Agreement is required before logging resumes.

## References

- Explore doc: `docs/explore/2026-03-08-gdpr-compliance-contact-collection.md`
- Schema: `projects/api/src/db/schema.ts`
- Prompt logger: `projects/api/src/modules/prompt-logger/prompt-logger.service.ts`
- Contact collection service: `projects/api/src/modules/contact-collection/contact-collection.service.ts`
- Chat service (consent threading point): `projects/api/src/modules/chat/chat.service.ts`
- Frontend entry point: `projects/frontend/src/components/ChatView.tsx`
- ADR-007: Stateless Sessions Without Authentication — `docs/adr/007-session-model.md`
- ADR-003: Structured Logging — `docs/adr/003-logging.md`
- Security risk assessment: `docs/SECURITY_RISK_ASSESMENT.md`
- ICO: [How should we obtain, record and manage consent?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/how-should-we-obtain-record-and-manage-consent/)
- ICO: [How do we ensure lawfulness in AI?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/how-do-we-ensure-lawfulness-in-ai/)

---

## PRD self-critique

- **Riskiest assumption:** That consent is not required for the contact collection step (legitimate interests applies). If the DPO or legal review concludes consent is needed there too, the contact collection flow needs a checkbox before the tool fires — significantly more complex given the conversational interface.
- **Most fragile part of the design:** The consent flag is client-supplied and cannot be cryptographically verified. A determined actor could send `consentToLogging: true` without user action. Mitigated by writing to DB only on state transition (not every request), so the audit trail reflects genuine consent events rather than per-request values.
- **Highest long-term impact decision:** Whether to re-request consent on each new session or remember it indefinitely. Remembering indefinitely is friendlier UX but weaker compliance. This is hard to change later once users are accustomed to one behaviour.
- **What's missing:** The flat-file stores (`.cache/history/`, `.cache/prompts/`) remain outside any deletion path. This PRD improves the forward-looking compliance posture but does not address data already stored without consent. A separate "historical data remediation" task is needed.
