# PRD: Gmail Email Queue

> Status: Draft | Version: 0.1 | Author: user via /prd

## Problem

The contact-collection flow captures user email addresses for Macular Society callback requests, but the system never sends any confirmation or follow-up to those users. There is no outbound email capability at all. Staff must manually check the database and send emails from their own client. This creates operational friction and leaves users without acknowledgement after sharing personal contact details.

## Context

- **API stack:** NestJS (Fastify adapter), Drizzle ORM, Postgres — no Redis, no Bull, no existing queue infrastructure.
- **Config system:** All env vars are TypeBox-validated via `projects/api/src/config/env.schema.ts`. New email config must follow this pattern. Non-secrets go in `.env.config`; secrets (App Password) go in `.env.secrets`.
- **No existing scheduler:** `@nestjs/schedule` is not installed. This is the first background job in the project.
- **Single-host deployment:** Charity infrastructure — one Docker host, no worker replicas. Concurrency risk is low but still requires a send-lock to prevent double-sends.
- **Daily cap:** 50 emails/day is a deliberate operational limit (personal Gmail account; configurable via `DAILY_EMAIL_LIMIT` in `.env.config`).

## Assumptions

- Google account has 2-Step Verification enabled — required for App Password auth. _(High confidence — confirmed by user)_
- `DAILY_EMAIL_LIMIT` default of 50 is appropriate for the charity's current scale. _(High confidence)_
- All outbound emails are text-based (no HTML-heavy templates needed initially). _(Med confidence — template requirements not fully defined)_
- A single `mailer` NestJS module handles all email types (confirmation, staff notification, ad-hoc). _(Med confidence)_
- GDPR consent for sending email to collected contacts is covered by the existing consent flow. _(Low confidence — requires verification against the GDPR explore doc)_

## User Journey

**Contact collection confirmation (primary flow):**

1. User provides email address during a chat session via the contact-collection tool call.
2. Contact-collection handler saves the contact, then calls `MailerService.enqueue()` with a confirmation email payload.
3. `MailerService` checks if the daily cap has been reached (DB count query). If at cap: logs a warning, skips enqueue, contact is still saved.
4. If under cap: inserts a row into `email_queue` with `status = 'pending'`.
5. `EmailSchedulerService` cron fires every minute, queries for `status = 'pending'` rows, acquires a row-level advisory lock per job, sends via Nodemailer/Gmail SMTP.
6. On success: updates row to `status = 'sent'`, sets `sent_at`.
7. On failure: increments `retry_count`, sets `status = 'failed'` if `retry_count >= MAX_RETRIES` (default 3), else leaves as `pending` for next cron tick.

**Edge cases:**
- Daily cap reached: email is not queued; chat flow continues unaffected; staff are alerted via application log.
- Gmail SMTP auth failure: all sends fail; rows stay `pending`; cron retries up to `MAX_RETRIES` then marks `failed`. No silent data loss.
- App restart mid-send: `sending` status row (if used) or advisory lock naturally expires; row reverts to `pending` on next tick.

## Goals

- [ ] Outbound email can be sent via personal Gmail SMTP with App Password auth.
- [ ] All emails are queued in Postgres before sending — no fire-and-forget.
- [ ] Daily send count is enforced at enqueue time; cap value is configurable without code changes.
- [ ] Every email attempt (success or failure) has a permanent record in the DB with status, timestamps, and error text.
- [ ] Failed sends are retried up to a configurable max before being marked permanently failed.
- [ ] Contact-collection handler automatically enqueues a confirmation email when a user provides their email.

## Non-goals (explicitly out of scope)

- HTML email templates (plain text only in this iteration).
- Admin UI to view queue status (DB access or future admin panel work).
- Bulk or marketing emails — this is transactional only.
- Multiple email providers or fallback SMTP (single Gmail account).
- Unsubscribe / bounce handling.
- Email to phone (SMS) pathway.

## Options considered

Evaluation criteria: implementation effort · user impact · operational complexity · architecture fit

### Option A: Postgres queue table + `@nestjs/schedule` cron + Nodemailer (recommended)

**What:** A `email_queue` Drizzle table tracks all outbound emails. A cron job (every minute) polls for pending rows and sends via Nodemailer. Daily cap enforced via `COUNT` query at enqueue time. No new infrastructure beyond two npm packages.

**Pros:**
- Zero new infrastructure — no Redis, no external queue service.
- Full audit trail in the existing Postgres instance.
- Matches project patterns (Drizzle, TypeBox config, NestJS modules).

**Cons:**
- Cron polling is less real-time than an event-driven queue (up to 60s delay — acceptable for this use case).
- Custom retry/lock logic needed (vs. Bull handling it automatically).

**Effort:** Low–Medium

### Option B: pg-boss (Postgres-native job queue library)

**What:** Replace the custom table with `pg-boss`, a battle-tested Postgres job queue with built-in scheduling, retry, visibility locking, and a monitoring dashboard.

**Pros:**
- Handles concurrency, retries, and job state transitions reliably out of the box.
- Free monitoring dashboard (`@pg-boss/dashboard`).

**Cons:**
- New library dependency for what is currently a 50-email/day use case.
- Adds abstraction over Drizzle — two DB layers for queue operations.

**Effort:** Medium

### Option C: External email provider (Resend / SendGrid)

**What:** Use Resend or SendGrid free tier for sending; DB table is audit-only.

**Pros:**
- Better deliverability, bounce tracking, and dashboards.
- No Gmail SMTP auth complexity.

**Cons:**
- Contradicts the stated requirement (personal Gmail account).
- External API dependency.

**Effort:** Low (but out of spec)

## Recommended approach

**Choice:** Option A — Postgres queue table + `@nestjs/schedule` + Nodemailer.

Fits the stack exactly with no new infrastructure. At 50 emails/day, pg-boss's extra capabilities are unnecessary overhead. The cron polling delay (up to 60s) is acceptable for confirmation emails. Custom retry logic is straightforward and keeps the implementation transparent and easily debuggable.

## Failure modes

- **Gmail daily quota exceeded (Gmail-side):** Gmail rejects sends after ~500/day (personal). Our 50/day cap is well within this, but if the cap config is raised carelessly, sends could fail at the SMTP layer.
- **App Password revoked or expired:** All sends fail with auth error. Rows accumulate in `pending`/`failed`. Detectable via log alerts on `status = 'failed'` count.
- **Cron fires while previous batch still running:** On a single-host deployment this is unlikely, but use Postgres advisory locks (`pg_try_advisory_xact_lock`) per queue row to prevent double-send.
- **PII in failed rows:** A `failed` row retains the recipient address and body. Rows must be purged after a retention window.

**Detection:** Prometheus counter `email_queue_failed_total`; alert if `failed` row count > threshold.

**Fallback:** Failed rows stay in DB for manual inspection. No automatic re-queue beyond `MAX_RETRIES`.

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| End user (chat) | No acknowledgement after sharing contact details | Receives confirmation email within ~60s |
| Macular Society staff | Must manually check DB and send emails | Confirmation is automated; queue is auditable |
| Dev/ops | No visibility into whether emails were sent | Full per-row audit trail in Postgres |

_End users have macular degeneration — confirmation emails must use plain text, clear subject lines, large-print-friendly formatting (no images), and avoid jargon. No UI changes in this feature, but email content should be reviewed for readability._

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GDPR: storing PII (email address) in queue table | High | High | Add `purge_after` field; schedule purge cron; align with GDPR explore doc |
| Gmail App Password revoked | Low | High | Alert on consecutive SMTP failures; document rotation procedure |
| Cap misconfiguration (set too high) | Low | Med | Validate `DAILY_EMAIL_LIMIT` in TypeBox schema with a max bound |
| Cron double-send on restart | Low | Med | Postgres advisory lock per row |
| Email classified as spam | Med | Med | Personal Gmail accounts have weaker deliverability — acceptable for charity scale |

## Technical overview

### What changes

- **API — new module** `projects/api/src/modules/mailer/`:
  - `mailer.module.ts` — imports `ScheduleModule.forRoot()`, registers Nodemailer transporter
  - `mailer.service.ts` — `enqueue(payload)`, daily cap check, DB insert
  - `email-scheduler.service.ts` — `@Cron('* * * * *')` processor, advisory lock, send, status update
  - `email-queue.repository.ts` — all Drizzle queries for the queue table

- **API — schema** `projects/api/src/db/schema.ts`:
  - Add `email_queue` table (see Data section below)

- **API — config** `projects/api/src/config/env.schema.ts`:
  - Add `EmailConfigSchema` (TypeBox): `enabled`, `dailyLimit`, `maxRetries`, `fromAddress`, `fromName`
  - `GMAIL_USER` and `GMAIL_APP_PASSWORD` go in `.env.secrets` (not TypeBox-validated — raw `process.env` access in mailer module, consistent with other secret patterns)

- **API — contact-collection handler** `projects/api/src/modules/rag/handlers/contact-collection.handler.ts`:
  - Inject `MailerService`; call `enqueue()` after successful email contact save

- **Infrastructure:**
  - No new Docker services
  - New env vars in `.env.config`: `EMAIL_ENABLED`, `DAILY_EMAIL_LIMIT`, `EMAIL_MAX_RETRIES`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`
  - New env vars in `.env.secrets`: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
  - Update `.env.secrets.example` with placeholder values

- **Data — new table `email_queue`:**

```
id                  integer (PK, generated always as identity)
to_address          text NOT NULL
subject             text NOT NULL
body                text NOT NULL
status              text NOT NULL DEFAULT 'pending'  -- pending | sent | failed
retry_count         integer NOT NULL DEFAULT 0
max_retries         integer NOT NULL DEFAULT 3
error               text
created_at          timestamptz DEFAULT now()
sent_at             timestamptz
purge_after         timestamptz  -- for GDPR retention; set at insert time (e.g. now() + 90 days)
```

- **Drizzle migration** required after schema change.

### Key decisions needed before implementation

- What is the GDPR retention window for queue rows? (e.g. 90 days — align with DPO)
- Should `email_queue` rows be purged by a separate cron, or manually?
- Should staff be notified (e.g. log alert) when the daily cap is hit?

### Security considerations

- `GMAIL_APP_PASSWORD` is a secret — goes in `.env.secrets`, gitignored, never logged.
- `to_address` and `body` in `email_queue` are PII — the table must be excluded from any DB dumps shared outside the org.
- The `enqueue()` method must sanitise the `to_address` field before DB insert (reuse `ContactCollectionService.validateEmail()` — already in the codebase).
- No external HTTP endpoint exposes the queue — internal service-to-service call only.

### Observability

- Prometheus counters via existing `MetricsService`:
  - `email_queue_enqueued_total` — incremented on successful enqueue
  - `email_queue_sent_total` — incremented on successful send
  - `email_queue_failed_total` — incremented when `max_retries` exceeded
  - `email_queue_cap_reached_total` — incremented when daily cap blocks enqueue
- Structured log on every status transition (NestJS `Logger`)
- Health check endpoint (`/api/system/health`) should surface `email_queue` failed count

## Success metrics

### System metrics

- [ ] Zero emails double-sent (advisory lock working)
- [ ] `email_queue_failed_total` stays at 0 under normal conditions
- [ ] All confirmation emails delivered within 60s of contact collection

### Operational metrics

- [ ] Daily cap enforcement: system never sends more than `DAILY_EMAIL_LIMIT` in a 24h window
- [ ] DB audit row exists for every send attempt

## Milestones

| # | Milestone | Scope |
|---|-----------|-------|
| M1 | Queue infrastructure | `email_queue` table, Drizzle migration, `mailer.module`, `mailer.service` (enqueue only), env schema updates |
| M2 | Scheduler + send | `email-scheduler.service` cron, Nodemailer/Gmail SMTP transport, advisory lock, retry logic |
| M3 | Contact-collection integration | Wire `MailerService` into `contact-collection.handler`, confirmation email template (plain text), end-to-end test |
| M4 | Observability + GDPR | Prometheus counters, purge cron, `.env.secrets.example` update, health check integration |

**Rollback plan:** Set `EMAIL_ENABLED=false` in `.env.config` — `MailerService.enqueue()` no-ops. No data loss; queue rows remain for inspection. Remove `ScheduleModule` import to stop cron entirely.

## Rejected ideas

- **Bull + Redis** — rejected because the project has no Redis and does not want to add it for a 50-email/day feature.
- **pg-boss** — not rejected outright, but deferred. Adds a library for capabilities (concurrency at scale, visibility timeout) not needed at current volume. Revisit if email use cases grow.
- **External provider (Resend/SendGrid)** — rejected because the user requirement is explicitly a personal Gmail account.

## Open questions

1. **GDPR retention window** — how long should email addresses and bodies be retained in `email_queue`? Must be agreed with DPO before M4.
2. **Purge mechanism** — separate cron in the same module, or manual SQL? Cron is safer for production.
3. **Cap reset window** — is "50/day" a rolling 24h window or a calendar day (midnight UTC)? Calendar day is simpler to implement.
4. **Who receives the confirmation email?** — the user who provided their address? Or staff? Or both? This determines how many templates are needed for M3.

## References

- Existing code: [projects/api/src/modules/contact-collection/contact-collection.service.ts](projects/api/src/modules/contact-collection/contact-collection.service.ts), [projects/api/src/db/schema.ts](projects/api/src/db/schema.ts), [projects/api/src/config/env.schema.ts](projects/api/src/config/env.schema.ts)
- Docs: [docs/explore/2026-03-10-gmail-email-queue.md](docs/explore/2026-03-10-gmail-email-queue.md), [docs/explore/2026-03-08-gdpr-compliance-contact-collection.md](docs/explore/2026-03-08-gdpr-compliance-contact-collection.md)
- External: [Nodemailer Gmail (Mailtrap)](https://mailtrap.io/blog/nodemailer-gmail/), [NestJS Schedule docs](https://docs.nestjs.com/techniques/task-scheduling), [pg-boss GitHub](https://github.com/timgit/pg-boss)

---

## PRD self-critique

- **Riskiest assumption:** GDPR consent — if sending a confirmation email to a collected address requires separate explicit consent (not just "I give you my email for a callback"), M3 may need a consent gate before enqueue. This is unverified.
- **Most fragile part of the design:** The daily cap check is a `COUNT` query with no transaction lock. Under concurrent cron ticks (unlikely on single host, but possible after a restart), two ticks could both read count < 50 and both enqueue. Advisory lock protects the send, but not the enqueue. A proper fix uses a `SELECT FOR UPDATE` on a `daily_send_counter` row, or a Postgres advisory lock at enqueue time too.
- **Highest long-term impact decision:** Schema design for `email_queue` — specifically whether `body` is stored as plain text or a template reference. Storing full body text is simple but inflexible if templates evolve; storing a template key + params is more maintainable. Once in production with a GDPR retention window applied, changing the schema mid-stream is disruptive.
- **What's missing:** No mention of what happens when `EMAIL_ENABLED=false` at startup but rows already exist in `email_queue` from a previous run. The scheduler should still drain the queue (or at least not silently leave rows stranded) when re-enabled.
