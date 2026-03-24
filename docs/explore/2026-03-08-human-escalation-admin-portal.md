# Exploration: Human Escalation with Admin Portal for Contact Follow-up

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Extend the existing contact-collection tool so that Macular Society staff can view escalated chat sessions, review the full conversation context, and follow up with callers offline via a new admin frontend.

## Problem interpretations

### Interpretation A: The lost-in-translation problem

A user asks the chatbot something the RAG system cannot fully answer — perhaps a nuanced question about treatment options, benefits entitlement, or an emotionally distressing situation. They want to speak to a person. Today the system collects their phone number and saves a Markdown file to `.cache/history/`. Staff have no structured way to discover, prioritise, or action these requests. Contacts may go unnoticed for days, and the context from the chat is lost by the time a human picks up the phone.

### Interpretation B: The quality-of-handoff problem

Even if staff do find the Markdown file, the handoff is cold: they know the contact details but have no reliable way to understand what the user was struggling with, what the chatbot already said, or how urgent the situation felt. The follow-up call starts from scratch. For users with macular degeneration — who may have found the conversation effort taxing — repeating themselves is a significant burden.

### Interpretation C: The operational-invisibility problem

There is currently no visibility into how often escalation happens, what topics trigger it, how long it takes staff to follow up, or whether the user's need was ultimately resolved. Without this data, the charity cannot improve the RAG system, staffing levels, or the quality of automated responses.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Macular Society helpline staff | Needs to action callback requests collected by the chatbot | Manually checking `.cache/history/` directory on the server | High |
| Chatbot user (low vision, often elderly) | Wanted more help than the bot could give; left their number | Waiting for a call that may be delayed or miss context | High |
| Macular Society management | Wants to understand escalation patterns and staff workload | None — no reporting exists | Med |
| Admin / IT | Needs to ensure GDPR compliance for personal data in escalation records | No formal process, files stored unencrypted locally | High |

_Note: End users have macular degeneration. Many use screen readers or enlarged text. Repeating a conversation history verbally to a staff member on callback is frustrating and exhausting — a rich context handoff directly serves their needs._

## Why now

- The contact-collection tool is already built and working. The missing piece is surfacing collected contacts to staff in a usable form.
- Conversation history is already saved (as Markdown files to `.cache/history/`) — but this storage mechanism is fragile, not queryable, and not accessible to non-technical staff.
- The current approach almost certainly violates UK GDPR: personal data (phone numbers, emails, chat content) is stored in flat files without access controls, retention policy, or audit trail.
- As the RAG system scales, the volume of escalation requests will grow beyond what ad-hoc file checking can handle.

## Existing solutions

**Internal:**
- `contact-collection.service.ts` — validates phone/email, saves conversation history as Markdown files to `.cache/history/`
- `contact-collection.handler.ts` — tool handler that calls the above on successful validation
- `tools.ts` — OpenAI function definition for `collect_contact_information`
- Session model already in the DB (ADR-007) — session IDs are attached to escalation records

**External:**
- Commercial helpdesk platforms (Intercom, Zendesk, Freshdesk) offer full inbox + queue + history UI — but are heavyweight, costly, and require complex integration for a charity's needs
- NHS/charity-sector CRM tools (e.g., Salesforce Nonprofit, Beacon CRM) offer case management but not AI chat integration
- Simpler pattern used by small support teams: a shared inbox (email or Slack) where the chatbot POSTs a structured notification on escalation — staff action from their existing tools

## Possible directions

### Direction A: Lightweight admin portal (new frontend)
Build a new React app (or a protected route in the existing frontend) where staff can see a list of pending escalation requests, read the full conversation transcript, mark contacts as actioned, and add notes. Data migrates from flat files to the existing Postgres database. Auth via Zitadel (already referenced in docs).

### Direction B: Email/Slack notification + ticketing integration
On successful contact collection, the API fires a webhook or email to staff — either directly or into an existing tool like Trello, Notion, or a shared inbox. Low dev cost, leverages existing staff workflows. No new UI needed. Limited audit trail and no structured status tracking.

### Direction C: Extend current frontend for staff
Add a password-protected "admin" mode to the existing user-facing frontend: a separate route (`/admin/contacts`) visible only to authenticated Macular Society staff. Reuses the MUI + TanStack Query stack. Lower engineering cost than a standalone app, but mixes user-facing and staff-facing concerns in one deployment.

### Direction D: CRM integration
POST escalation events to an existing CRM or case management system the charity already uses (if any). Avoids building admin UI at all. Feasibility depends entirely on what tools Macular Society staff currently use day-to-day — unknown at this stage.

## Hard problems

- **GDPR compliance**: Personal data (name-equivalent: phone/email + health-adjacent conversation content) must be stored in the DB with access controls, retention limits, deletion capability, and a clear legal basis. The current flat-file approach is not production-safe.
- **Authentication and role separation**: Staff must authenticate to view escalation data. The existing user-facing session model is anonymous — an entirely separate auth model is needed for staff. Zitadel is referenced in docs but not yet integrated.
- **Consent in the chat flow**: Currently the chatbot collects contact info but does not explicitly obtain GDPR consent for storing and processing the conversation history for staff review. This gap must be closed before escalation records are surfaced in any admin UI.
- **Context richness vs. data minimisation**: Staff benefit from seeing the full conversation; GDPR requires collecting only what is necessary. A retention policy and selective transcript summarisation may be needed to satisfy both.
- **Accessibility of the admin UI itself**: Macular Society staff may also have visual impairments. The admin frontend must meet the same WCAG 2.1 AA standard as the user-facing app.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| What tools do Macular Society staff currently use for task management? | Direction D (CRM integration) may be far lower cost if staff already have a system | User interview / stakeholder call |
| What is the expected volume of escalation requests per week/month? | Determines whether a simple email notification or a full queue UI is warranted | Review `.cache/history/` file count over time; staff interview |
| Does Macular Society already have a Zitadel tenant or other identity provider for staff? | Critical for auth approach; determines build vs. configure | Technical discovery with IT |
| What is the legal basis claimed for storing conversation history under UK GDPR? | Consent vs. legitimate interest changes the chat flow and data model significantly | Legal / DPO review |
| What are staff's preferred working hours and response SLAs? | Informs whether the admin UI needs priority/urgency indicators | Staff interview |
| Do users consent explicitly to conversation storage when they request a callback? | If not, the current implementation may already be non-compliant | Review current chat flow and privacy policy |

## Promising direction

**Direction A (lightweight admin portal) combined with a GDPR remediation of the data model** — because the flat-file storage is the most urgent risk, and any useful admin UI requires data to first be in the database. Direction C (extend current frontend) is a reasonable fallback that reduces engineering surface area.

The operational gap is real and growing. The contact-collection tool works, but the data it captures is currently unusable at scale. Moving escalation records into Postgres (with proper access controls) is a prerequisite for any direction — making Direction A and C converge on the same first step regardless of which UI approach is chosen.
