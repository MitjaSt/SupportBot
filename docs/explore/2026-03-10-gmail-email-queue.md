# Exploration: Gmail email queue with daily throttle and DB audit trail

> Stage: Explore | Date: 2026-03-10
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Add outbound email capability using a personal Gmail account, with a Postgres-backed queue, a background scheduler that drains the queue, and a hard daily cap of 50 sends — all recorded in the database.

## Problem interpretations

### Interpretation A: Operational notification channel

The platform currently has no way to push information to users after a session ends. Staff or automated triggers need to send follow-up emails (e.g. contact request confirmations, callback reminders) to users who submitted their contact details via the contact-collection flow. Without email, those leads are only stored in the DB and acted on manually.

### Interpretation B: Admin-to-user communication tool

Macular Society staff using the admin portal need a lightweight way to send ad-hoc emails — appointment confirmations, resource links, or follow-ups — without switching to a separate email client. The 50/day cap matches the low-volume, personal-account reality of a small charity.

### Interpretation C: Reliability and auditability requirement

Any transactional email sent on behalf of a charity touching medical topics must be auditable — when it was queued, when it was sent, whether it succeeded, and who received it. This is as much a governance concern as a feature.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Macular Society staff | Want to follow up with users who requested a callback | Manual — read DB, open Gmail, send manually | High |
| End users (low vision) | Expect a confirmation after providing contact details | None — no confirmation is sent | Med |
| Dev/ops | Need audit trail if a send fails or a user disputes receipt | No trail exists | Med |

_Low-vision users are unlikely to interact with the queue directly, but they are the recipients. Emails must be plain-text friendly and screen-reader compatible — no HTML-heavy layouts without a plain-text fallback._

## Why now

- Contact collection is already working — the system can collect phone/email via tool calling. The natural next step is to do something with those collected emails.
- The project has no Redis and no intention to add it; a Postgres-native queue is now a well-understood pattern that fits the existing stack perfectly.
- Gmail App Passwords (replacing "Less secure apps") are stable since late 2024 — the auth story is clear.
- 50/day is a low-risk starting point: within Gmail personal account limits (~500/day), low enough to avoid spam classification, and appropriate for a charity pilot.

## Existing solutions

**Internal:**
- No email infrastructure exists. `contact-collection` module stores collected contacts in the DB but does not send any notification.
- `@nestjs/schedule` is not yet installed; the project has a rate-limit interceptor but no background job runner.
- Postgres is already in place with Drizzle ORM — a queue table fits naturally.

**External:**
- **Bull + Redis** — the NestJS default queue approach. Powerful, but adds Redis as a dependency the project deliberately avoids.
- **pg-boss** — Postgres-native job queue with scheduling, retries, and a dashboard. Purpose-built for this use case. Used by [nest-pg-boss](https://github.com/apricote/nest-pg-boss) for NestJS decorator-style integration.
- **Custom queue table + `@nestjs/schedule` cron** — the lightest approach: a `email_queue` table, a cron job that polls it, and Drizzle for all DB ops. No new queue library. Full control. Adequate for 50 emails/day.
- **@nestjs-modules/mailer + Nodemailer** — standard NestJS mailer stack; wraps Nodemailer with DI and template support. Gmail SMTP with App Password works out of the box.
- **Dedicated providers (SendGrid, AWS SES, Resend)** — better deliverability and dashboards, but require external accounts, API keys, and cost money. Overkill for 50/day personal-account use.

## Possible directions

### Direction A: Custom Postgres queue table + NestJS schedule cron

A `email_queue` Drizzle table (`id`, `to`, `subject`, `body`, `status`, `scheduled_at`, `sent_at`, `error`, `created_at`). A daily counter table or a `COUNT` query enforces the 50/day cap before enqueue. `@nestjs/schedule` runs a cron every minute polling for `status = 'pending'`. Nodemailer with Gmail SMTP (App Password) sends the email. Status transitions: `pending → sending → sent | failed`. No new infrastructure. Full audit trail in Postgres. Drizzle migrations.

### Direction B: pg-boss as the queue engine

Replace the custom table with `pg-boss`, which handles retries, scheduling, visibility locking, and concurrency safely. Adds a single npm dependency. The 50/day cap is implemented as a check before calling `boss.send()`. Gives a free monitoring dashboard. More powerful but heavier than needed for 50/day.

### Direction C: External email provider (Resend / SendGrid) with DB audit log

Drop Gmail SMTP entirely. Use Resend or SendGrid free tier (100/day free on Resend). DB table only for audit — the provider handles queuing, retries, and bounce tracking. Removes the Gmail auth complexity but introduces an external API dependency and requires a new account. Not aligned with the "personal Gmail account" requirement stated by the user.

## Hard problems

- **Gmail daily cap enforcement under concurrency** — if the cron fires while a previous batch is still sending, the counter could be read twice, overshooting 50. Requires a DB-level atomic check or a send lock.
- **Gmail SMTP auth** — App Passwords require 2-Step Verification on the Google account. If the account is shared or 2SV is not enabled, setup fails. OAuth2 is the more robust alternative but significantly more complex.
- **Retry vs. re-queue** — failed sends should retry, but not indefinitely. Need a `retry_count` column and a max-retry policy to avoid dead-letter buildup.
- **PII in the queue** — email addresses and message bodies sit in the `email_queue` table. This needs to align with GDPR consent logging already explored (`docs/prd/2026-03-08-gdpr-consent-logging-contact.md`).

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does the Google account have 2SV enabled? | App Passwords require it — without 2SV, Gmail SMTP auth fails | Check Google Account settings |
| Is 50/day the right cap, or should it be configurable? | A hard-coded 50 may need changing per environment (dev/prod) | Decide now; if configurable, add to `.env.config` |
| Do sent emails need to be purged after N days? | GDPR — storing PII (recipient address) in a queue table indefinitely is a risk | Review retention policy with GDPR explore doc |
| What templates are needed? | Affects whether `@nestjs-modules/mailer` template support is worth the dependency | List all email types before building |
| Should the admin UI surface queue status? | Staff may want to see pending/failed emails without DB access | Decide scope before PRD |

## Promising direction

**Direction A** — Postgres queue table + `@nestjs/schedule` cron + Nodemailer/Gmail SMTP.

Fits the existing stack without new infrastructure. Postgres is already the source of truth; a queue table is a natural extension. The 50/day cap, status tracking, and retry logic are all expressible in Drizzle with a straightforward cron. Complexity is low enough that a full implementation is a single NestJS module. Direction B (pg-boss) is worth revisiting if the use case grows beyond simple notifications.
