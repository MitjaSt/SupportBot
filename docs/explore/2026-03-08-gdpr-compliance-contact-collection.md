# Exploration: GDPR Compliance for Contact Collection and Data Handling

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Assess how the current RAG system handles personal data under UK GDPR and the Data Protection Act 2018, identify what is compliant, what is non-compliant, and what must change before the system can process personal data lawfully.

## Problem interpretations

### Interpretation A: The latent liability problem

The system already collects and stores personal data — phone numbers, email addresses, full conversation transcripts — but has no documented lawful basis, no consent mechanism, no retention schedule, and no deletion path for flat-file storage. This is not a future compliance concern: **it is a present violation**. Under UK GDPR, the ICO can issue fines and enforcement notices even before a data breach occurs. For a charity, the reputational risk of an ICO finding is as damaging as the financial penalty.

### Interpretation B: The incomplete deletion problem

A `DELETE /api/chat/sessions/:sessionId` endpoint exists, and `cleanupExpiredSessions()` runs on schedule — so the DB layer has deletion capability. But personal data also lives in two flat-file stores: `.cache/history/` (Markdown files with phone/email + full transcript) and `.cache/prompts/` (YAML files with raw user queries and responses). A right-to-erasure request today cannot be fulfilled: deletion from the DB would leave personal data in flat files indefinitely.

### Interpretation C: The undocumented-basis problem

The system processes three distinct categories of data under three different conditions, and none of them has a documented lawful basis:
1. **Anonymous chat sessions** — session UUIDs with message history; no personal data unless the user volunteers it mid-conversation
2. **Contact information collected by the tool** — phone/email explicitly solicited; clear personal data
3. **Prompt logs** — verbatim user queries (which may contain health details, names, locations) logged to YAML files as a development artefact

Without a Record of Processing Activities (ROPA) documenting the basis for each, the organisation cannot demonstrate compliance.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Macular Society (as data controller) | Processes personal data without documented lawful basis, no ROPA, no DPIA | None — risk is unmitigated | High |
| Chatbot user requesting callback | Provides phone/email with no GDPR notice, no explicit consent, no stated purpose | None — no choice offered | High |
| Chatbot user mid-conversation | Any PII shared in free text (health details, name) is logged verbatim to YAML files | None | Med |
| Macular Society IT/DPO | Cannot respond to a subject access or erasure request — no tooling, no inventory of where data lives | Manual server inspection | High |
| ICO (regulator) | Would find: no privacy notice, no lawful basis, no retention schedule, unprotected flat files | N/A | N/A |

_Note: Users have macular degeneration. Many are elderly. They may not realise they are sharing personal or health-related information with an AI system. The duty of care around transparency is higher, not lower, for this audience._

## Why now

- The contact-collection tool is live and collecting personal data today. Every callback request stored is a compliance liability accruing in real time.
- The Security Risk Assessment already identifies GDPR gaps (logging PII, no purge API, no retention policy) but they remain unaddressed.
- The planned admin portal would create a third system touching this data — remediation now is far cheaper than remediation across three systems later.
- The **Data (Use and Access) Act** came into force June 2025, and AI-specific transparency requirements under the EU AI Act are tightening. The compliance bar is rising, not falling.

## Existing solutions

**Internal — what exists and works:**
- `DELETE /api/chat/sessions/:sessionId` — session deletion from DB is implemented
- `cleanupExpiredSessions()` — 24-hour session TTL enforced in DB via scheduled cleanup
- ADR-003 explicitly prohibits logging PII in structured logs (NestJS Logger output) — **but this does not cover the prompt-logger YAML files**
- Anonymous UUID sessions mean that for the base chat flow (no contact collection), UK GDPR may not apply at all if no personal data is volunteered — this is genuinely good design

**Internal — what exists but is non-compliant:**
- `contact-collection.service.ts:saveConversationHistory()` writes personal data to `.cache/history/<timestamp>_<type>_<value>.md` — unencrypted, no access control, no retention policy, no deletion mechanism, filename encodes the personal data value directly
- `prompt-logger.service.ts:log()` writes raw `query` and `response` to `.cache/prompts/<timestamp>_<query>.yaml` — no PII redaction, filename encodes the query, no retention policy, no deletion mechanism
- `GET /api/chat/sessions` — lists all sessions with no authentication; if a session ID is guessable or leaked, message history is retrievable by anyone
- No privacy notice anywhere in the user-facing interface
- No consent or GDPR information surface before or during contact collection
- No ROPA, no DPIA, no documented lawful basis for any processing activity

**External — how others solve this:**
- ICO guidance: for a health-adjacent chatbot, **legitimate interests** (Article 6(1)(f)) with a documented Legitimate Interests Assessment (LIA) is often more appropriate than consent as the lawful basis for session/analytics processing — consent is high-bar and brittle
- For contact collection specifically: explicit consent is the cleanest basis — a clear in-chat notice before the tool fires ("Your contact details will be stored by Macular Society for the purpose of arranging a callback. You can request deletion by emailing [address].")
- YAML prompt logs: either disable in production entirely, or pipe through a PII redaction step (regex for UK phone/email, plus an optional ML classifier) before writing to disk
- Flat-file storage for personal data: industry standard is to not use it at all — store in the DB where access controls, retention, and deletion are already implemented

## Possible directions

### Direction A: GDPR remediation sprint (no new features)
Fix the existing gaps without adding new functionality. Scope: move contact records from flat files to DB, add PII redaction to prompt logger (or disable it in production), add a GDPR deletion endpoint that covers all storage locations, add an in-chat consent notice before contact collection, document lawful basis in a ROPA. This is the prerequisite for all other directions.

### Direction B: Privacy-by-design refactor of the contact collection flow
Redesign the contact collection flow with GDPR as a first-class requirement: explicit consent capture in the chat UI (a clear notice with affirmative acknowledgement before the tool fires), purpose limitation (contact stored only for callback, not for analytics), and a defined retention period (e.g. delete if not actioned within 30 days). Produces a compliant, auditable data trail.

### Direction C: Disable prompt logger in production, keep only in dev
The YAML prompt logs are a development/debugging tool. They have no user-facing value and significant compliance cost. Disabling them in production (via environment flag) removes the largest uncontrolled PII surface immediately, at near-zero engineering cost.

### Direction D: Engage a DPO / legal review before building anything further
Before implementing any technical fix, commission a formal DPIA and ROPA with legal input. This determines the correct lawful basis for each processing activity, which in turn determines the technical requirements. Building without this risks implementing the wrong solution.

## Hard problems

- **Two storage systems, one deletion obligation**: The DB and the flat-file cache are completely independent. A right-to-erasure request requires both to be cleared simultaneously — and the flat files currently have no index or lookup mechanism tied to session or contact identity.
- **Prompt logs may contain PII the system didn't solicit**: Users freely share health details, names, locations mid-conversation. Regex redaction catches structured PII (phone, email) but not unstructured health context. An ML-based redaction pass adds latency and cost.
- **Lawful basis for prompt logs is unclear**: They appear to exist for debugging and model improvement — but these are separate purposes that likely require separate legal bases, and using customer conversations to train or improve AI models requires explicit consent under ICO guidance.
- **Anonymous sessions are genuinely anonymous until they aren't**: The design is sound — a UUID with no linked identity is outside GDPR scope. But the moment a user volunteers their phone number mid-session, that session record becomes personal data retroactively. The DB currently has no flag distinguishing anonymous from identified sessions.
- **Consent withdrawal in a stateless UI**: If a user consents to contact collection in the chat and later wants to withdraw, there is no user-facing mechanism to do so. The deletion endpoint exists at the API level but is not exposed in the UI.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does Macular Society have a DPO or legal contact responsible for GDPR? | All technical decisions depend on an agreed lawful basis; DPO must sign off | Stakeholder call |
| What data does LangWatch receive from the observability adapter? | If LangWatch receives user queries or responses, it is a data processor under UK GDPR and requires a Data Processing Agreement (DPA) | Review LangWatch data handling docs + adapter code |
| Are the `.cache/` directories backed up? | If so, erasure from live files does not fulfil a right-to-erasure request — backups must also be addressed | Infrastructure review |
| Is there an existing privacy policy / cookie notice on the Macular Society website? | The chatbot needs to be covered by or linked to a privacy notice; building from scratch vs. extending existing | Stakeholder / website review |
| What is the intended retention period for callback requests? | Required for a lawful retention schedule; 30 days is a common operational default | Business stakeholder decision |
| Is the prompt logger currently enabled in production? | If yes, this is the most urgent gap; if no, the risk is dev-only | Config/env review |

## Promising direction

**Direction A + C in parallel** — remediate the data model and disable the prompt logger in production as an immediate risk reduction, then layer Direction B (consent flow) on top.

Direction C (disable prompt logger in production) is a single environment flag change and removes the largest uncontrolled PII surface right now. Direction A addresses the structural gaps — flat files to DB, deletion coverage, consent notice — and is the prerequisite for the admin portal explored separately. Neither requires a lawful basis decision to start: moving data into DB and adding a deletion path is compliant regardless of which basis is ultimately chosen. Direction D (legal review) should run in parallel, not as a blocker.
