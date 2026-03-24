# Exploration: Production Failure Modes — When Real People Use the RAG

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

When the RAG chatbot is in production, what can go wrong when actual people use it — including abusers and other negative actors, as well as well-intentioned users who face accessibility, cognitive, or situational challenges.

---

## Problem interpretations

### Interpretation A: Adversarial and abusive use
Malicious or nuisance users may try to extract system prompts, poison the experience for others, exhaust costs, harvest contact data, or use the system to generate harmful or off-topic content. The charity’s brand and trust are at stake; a single visible abuse incident can undermine confidence in the whole service.

### Interpretation B: Well-intentioned users hitting limits
Legitimate users — often older, with macular degeneration, possibly stressed or in crisis — may struggle because of how the system is designed: voice mishearing, retrieval gaps, unclear escalation, or UX that doesn’t match their assistive tech or cognitive load. The harm is not malice but frustration, missed support, or acting on incomplete or misunderstood information.

### Interpretation C: Operational and reputational spillover
Even when the system behaves correctly, contact collection (phone/email for callbacks), logging, or third-party dependencies can create GDPR issues, data leaks, or dependency failures. Staff and volunteers may be blamed for AI behaviour they don’t control, or the charity may be held responsible for outputs that were technically “grounded” but inappropriate in context.

---

## Who is affected (and how things go wrong)

| Actor | Situation | What goes wrong | Severity |
|-------|-----------|-----------------|----------|
| **Abuser / script kiddie** | Tries prompt injection, jailbreaks, or corpus extraction | PromptGuard blocks or fails open; no blocking → instructions or KB leak | High (if guard fails) |
| **Cost attacker** | Single IP or many sessions; high request volume | IP + session rate limits (existing) cap some abuse; no per-session cost cap → budget blow-up | Medium–High |
| **Spam / prank caller** | Submits junk, offensive language, or fake contact details | Contact collection accepts invalid or fake data; staff time wasted; no content moderation | Medium |
| **Vulnerable user (crisis)** | Asks about sudden vision loss, severe pain, or self-harm | No guaranteed red-flag escalation path; RAG may answer factually but not escalate to human | High |
| **Low-vision / screen-reader user** | Uses voice or assistive tech; streamed response, dynamic UI | Voice STT mishears; TTS cuts off; UI not announced correctly → wrong or confusing answer | High |
| **Elderly or cognitively stressed user** | Long, rambling query or multiple topics in one go | Query length capped (1500 chars); retrieval may match wrong intent; user doesn’t rephrase → unhelpful answer | Medium |
| **User who wants a human** | Expects a person; doesn’t realise it’s a bot or doesn’t see escalation | No clear “talk to a person” path or it’s buried; contact collection feels opaque | Medium |
| **Macular Society staff** | Callbacks from contact collection; handling complaints | Fake or abusive contacts; complaints about AI answers they didn’t write; no single source of truth for “what the bot said” | Medium |
| **Charity (reputation)** | One bad story goes public | “Their AI said X” or “their bot leaked Y”; donors and partners lose trust | High |

*Note: End users often have macular degeneration — accessibility and clarity of escalation are first-order risks, not edge cases.*

---

## Why now

- Security assessment (`docs/SECURITY_RISK_ASSESMENT.md`) and PROJECT_REVIEW already list abuse, injection, rate limits, and pipeline auth; this exploration focuses on *human* failure modes (abusers, stressed users, accessibility) in one place.
- Limited production trial exploration (2026-03-08) assumes volunteers as first cohort; real end users will bring different failure modes (assistive tech, crisis, misuse).
- Before scaling beyond a trial, the team needs a shared map of “who can be harmed and how” so mitigations can be prioritised (e.g. red-flag escalation vs. content moderation vs. cost caps).

---

## Existing solutions (internal)

- **Rate limiting:** IP (Fastify) and per-session (interceptor, env-configurable); 429 + Retry-After.
- **Query length:** `maxLength: 1500` on query DTO.
- **Prompt injection:** PromptGuard sidecar; fails open (logs, no block) if unreachable.
- **Contact collection:** Validate-and-store flow; no abuse-specific checks (e.g. disposable emails, obvious junk).
- **Testing:** Adversarial scenario tests (e.g. 10-adversarial), injection patterns in TESTING_STRATEGY; no dedicated accessibility or crisis-escalation tests.
- **Observability:** LangWatch traces, Prometheus token usage; no built-in “red-flag” or abuse alerting.

**Gaps:** No per-session or per-day cost cap; no content moderation on input or output; no guaranteed escalation path for medical/crisis cues; CORS and pipeline auth still flagged in security docs; PII in logs and log redaction not fully implemented.

---

## Possible directions (mitigations)

### Direction A: Harden abuse and cost controls
Add per-session (or per-day) cost cap using existing token metrics; optional content filter (block or flag offensive/junk input); tighten CORS and pipeline auth; consider injection-attempt counters and session termination after N blocks. Keeps abusers and cost risk in check.

### Direction B: Red-flag escalation and safe wording
Define a small set of red-flag phrases or intents (e.g. sudden vision loss, severe pain, self-harm) and route those to “please contact us on [helpline]” or trigger contact collection with an urgency flag, without the model attempting medical advice. Add clear “This is not medical advice” and “Talk to a person” in UI and TTS. Reduces risk for vulnerable and crisis users.

### Direction C: Accessibility and clarity for legitimate users
Audit voice pipeline (STT/TTS) and UI with screen-reader and keyboard users; add “speak to someone” and “was this helpful?” in consistent, prominent places; consider fallback when retrieval returns nothing (e.g. “I couldn’t find enough in our resources — here’s how to reach us”). Reduces frustration and misinterpretation for good-faith users.

### Direction D: Operational and compliance safeguards
Implement log redaction for PII; GDPR purge endpoint and retention policy; optional “export this conversation” for users; staff-facing view of “what the bot said” for a given session/callback. Reduces regulatory and reputational risk and supports staff handling callbacks and complaints.

---

## Hard problems

- **Crisis detection is fuzzy:** Red-flag keywords can miss nuanced distress or over-trigger on casual phrasing; defining “escalate” without over-burdening the helpline is a product and policy choice.
- **Accessibility failures are context-dependent:** What works in a lab may fail with specific screen readers, accents, or network latency; continuous feedback from real low-vision users is needed.
- **Abuse evolves:** Prompt injection and jailbreaks change; PromptGuard and boundaries need ongoing review; content moderation can be gamed or create false positives for medical terms.
- **Charity resource limits:** Every new guardrail (human review, moderation, escalation) consumes staff or volunteer time; mitigations must be proportionate to a small team.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|----------------|---------------------|
| How often do real users hit “no results” or low-confidence retrieval? | Drives whether fallback messaging and escalation UX are critical | Instrument retrieval score and empty-context responses; trial logs |
| Do volunteers/staff already have a list of “escalate immediately” phrases? | Red-flag logic should align with existing helpline practice | Workshop with Macular Society helpline leads |
| What does “talk to a person” look like in the current journey? | Escalation must be discoverable and consistent with brand | Review current site/helpline flows; trial with volunteers |
| How many contact-collection submissions are likely to be junk or abusive? | Informs whether validation/blocking is worth investing in | Pilot period metrics; compare to other charity chatbots |

---

## Promising direction

**Combine Direction B (red-flag escalation + safe wording) and Direction C (accessibility and clarity).**

Abuse and cost (Direction A) are partly covered by existing rate limits and PromptGuard; the security assessment already prioritises cost cap and hardening. The largest *unaddressed* risks for a charity serving people with macular degeneration are: (1) a vulnerable user in distress not being escalated, and (2) a well-intentioned user failing because of accessibility or unclear flow. Both are user-harm issues rather than pure security issues. Direction D (compliance and staff tooling) supports both and should run in parallel (log redaction, purge API) as per existing security plan.

Next step: validate with Macular Society whether they have an existing escalation list and where “talk to a person” should live in the UI and voice flow; then turn that into a small PRD slice for red-flag behaviour and escalation UX.

---

## What next?

1. **Red-flag and escalation** — Confirm with Macular Society what phrases or situations should trigger “contact us” or human handoff; worth resolving before or during limited production trial.
2. **Accessibility in production** — Include at least one low-vision or screen-reader user (or volunteer simulating it) in the trial to stress-test voice and UI; consider a dedicated accessibility audit before wider rollout.
3. **Cost cap and abuse metrics** — Add per-session (or per-day) cost cap and basic abuse/injection counters so the team can see real numbers and tune limits.
4. **Ready for PRD?** — If escalation and safe wording are agreed, run `/prd red-flag escalation and safe wording` to turn this into structured requirements.
