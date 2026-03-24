# Exploration: Limited Production Trial — Observed Rollout with Phone Support Volunteers

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Run a time-boxed, limited-user production trial of the RAG chatbot where phone-support volunteers (current Macular Society helpline staff) act as the first user cohort — observed, guided by a structured brief, and equipped to flag problems while the system is watched closely from the inside.

---

## Problem interpretations

### Interpretation A: The offline-to-production gap problem
The system passes unit tests, RAGAS evals, and scenario simulations. But none of those surfaces what happens when a real person with low vision, a specific concern about their diagnosis, and an unpredictable phrasing style actually uses it. Production behaviour may diverge from test behaviour in ways that are genuinely hard to predict — retrieval gaps, edge cases in the escalation logic, latency under real network conditions, voice mode quirks. The question is not "does it work" but "how does it fail, and how often".

### Interpretation B: The operator-as-user problem
The volunteers who will initially use this are also domain experts on the current helpline experience. They can catch a hallucinated answer that a naive tester would miss. But they are also coming from a high-trust, high-empathy phone call model and may hold the chatbot to an implicitly different standard. If the brief they receive is wrong, their feedback will be systematically biased — either too critical (because it doesn't feel like a call) or too generous (because they are inclined to trust it professionally).

### Interpretation C: The trust-establishment problem
This is the first time the Macular Society deploys AI in a user-facing context. The way the trial is framed — what it is called, how explicitly the AI origin is disclosed, how escalation is handled — sets a precedent for user trust. A poorly framed trial that generates one bad incident could undermine the entire programme. Getting the framing right matters as much as the system behaving well.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Volunteer (phone support) | Acting as trial user; knows the domain but is not a technical tester | Uses personal judgment; may not know what to flag | Medium |
| Macular Society staff | Responsible for the trial; need to know if the system is safe and useful before wider rollout | Manual review of LangWatch traces after incidents | High |
| End user (macular degeneration) | Not in scope for this trial, but the system being built for them | Waiting for a better than phone-only option | High |
| Engineering team | Needs structured feedback to act on, not anecdotes | Post-hoc trace review | Medium |

_Note: The volunteers are stand-ins for end users who have macular degeneration. The volunteers are fully sighted and will not experience the accessibility surface in the same way. Voice mode, screen reader behaviour, and high-contrast rendering are untested in this cohort._

---

## Why now

- Offline evals (RAGAS, scenario tests) are exhausted as a signal source without production data. The online evaluation exploration (2026-03-08) confirmed this: the eval suite drifts from real user behaviour without production traces feeding back into it.
- The Citizens Advice "Caddy" pilot (2025) demonstrates that a RAG system built for charity helpline volunteers can be safely piloted at six locations before broader rollout — with human-in-the-loop supervision and explicit trust framing.
- The Samaritans AI policy briefing (Feb 2026) confirms that charities using volunteers as AI trial cohorts is an established pattern — and that framing and safeguards are the critical variable, not the technology itself.
- The system now has observability (LangWatch traces, Prometheus metrics, prompt logging) that can support a monitored trial. Running it now, before wider exposure, is the right time to stress-test the observability stack itself.

---

## Existing solutions

**Internal:**
- LangWatch trace pipeline — every session emits retrieval and generation spans with full context. An observer can watch live or review after the fact.
- Red-flag escalation logic (partial): the user's notes reference sudden vision loss, severe pain, rapid deterioration as red-flag conditions. Whether this is in the system prompt or implemented structurally is not confirmed.
- Provenance footer — "This information is based on Macular Society patient resources and is not a substitute for professional medical advice." Whether this is currently rendered in the UI is not confirmed.
- Prompt guard service — catches direct prompt injection at the API layer.
- Contact collection state machine — can collect phone/email for callback when users want Macular Society staff follow-up.

**External:**
- **Citizens Advice Caddy** — RAG + volunteers pilot model. Key lesson: keep AI internal (assistant-facing, not client-facing); human approval before responses reach users; limited trusted sources only; 80% accuracy considered viable with 20% human-escalated.
- **Shadow deployment** — run AI in parallel with human responses, log AI output but don't surface it. Not applicable here (this system replaces a phone channel, not augments it), but the gradual autonomy principle applies.
- **Graduated rollout (5% → 25% → 50%)** — relevant if the trial is eventually opened to actual end users. Not the immediate concern.

---

## Possible directions

### Direction A: Observed trial with structured volunteer brief
Give 3–5 phone support volunteers access to the chatbot as a tool to explore, with a one-page brief that explains what it is, what to test, what to flag, and how to escalate. An engineering or product team member monitors LangWatch traces in near-real-time during the trial window (e.g., 2-hour sessions over 2 weeks). Structured debrief after each session.

### Direction B: Volunteer-as-observer alongside a simulated user
Rather than having volunteers use the system themselves, pair each volunteer with a simulated session driven by a prepared script (realistic macular patient questions). The volunteer watches the responses in real time and scores them against a simple rubric (accurate, incomplete, hallucinated, inappropriate tone, missed escalation trigger). Engineering observes the trace. Feedback is structural, not impressionistic.

### Direction C: Phased shadow mode before trial
Before giving volunteers direct access, run the system in shadow mode for a short period — engineering poses realistic queries manually and reviews outputs alongside LangWatch traces, without any external user. This de-risks the trial by confirming the system behaves well before volunteers see it. The volunteer trial becomes the second stage, not the first.

### Direction D: Operator-assisted trial (human-in-the-loop)
Volunteers use the system with a supervisor role: before any response is "delivered" (either read aloud or shown), a second volunteer or staff member reviews it and can suppress it. Creates a high-trust, high-overhead model but gathers very high-quality signal on which responses require intervention.

---

## Hard problems

- **The brief is the product for this trial.** What volunteers are told to look for shapes the feedback entirely. Too broad ("does it seem right?") produces anecdote. Too narrow ("flag if it mentions AMD treatment incorrectly") misses everything else. Getting the brief right is genuinely hard and requires domain expertise that lives with the volunteers, not engineering.
- **Red-flag escalation is not confirmed as implemented.** If "sudden vision loss" or "severe pain" are triggers that should route to emergency escalation, whether the system currently does this structurally (in a tool call or system prompt rule) vs. generatively (hoping the LLM decides to say "go to A&E") is unknown. A trial without this confirmed is a liability.
- **Provenance footer implementation is unconfirmed.** The user's notes indicate intent; whether the footer renders in the current UI on every response is unknown.
- **Volunteers are not the actual users.** Fully sighted, phone-trained volunteers will not exercise the accessibility surface — screen reader interaction, voice-only mode with Piper, high-contrast rendering. The trial generates real signal about response quality but limited signal about the actual user experience.
- **Feedback capture is undefined.** After a trial session, how does volunteer feedback get back to engineering in a structured, actionable form? An ad-hoc Slack message is not a feedback mechanism.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Is red-flag escalation structurally implemented or generative? | If generative, it can be bypassed by unusual phrasings; structural implementation is required before any live trial | Read the system prompt and check if there is a tool or hard-coded route for emergency conditions |
| Does the provenance footer render on every response in the current UI? | Legal and trust requirement; absent footer means responses could be mistaken for clinical advice | Check ChatMessage component rendering; search for provenance string in frontend code |
| What does the current system prompt say about medical advice scope limits? | Determines whether the LLM is instructed to treat itself as communicator vs. clinician | Read the prompt template file |
| How does the system behave when a query is completely outside the knowledge base? | Should return an "I don't know" with escalation path, not a hallucinated answer | Test manually: ask about unrelated conditions, ask about specific drug interactions not in the KB |
| What is the feedback loop from volunteer trial to engineering? | Without structured feedback capture, the trial generates noise, not signal | Define before trial starts: rubric, submission mechanism, triage process |
| Are volunteers comfortable being observed? | Consent and psychological safety matter; volunteers flagging a "bad" AI response may feel they are criticising something they were supposed to endorse | Include a framing session before trial; make clear that finding problems is the goal |

---

## Promising direction

**Direction C then A** — shadow mode check first, then structured volunteer trial.

Before any volunteer sees the system, run a short internal shadow review (1–2 days, engineering only): pose 20–30 realistic queries covering in-scope questions, edge cases, and the three red-flag triggers. Confirm the provenance footer renders, confirm escalation behaviour, confirm the system says "I don't know" cleanly for out-of-scope queries. Only then move to Direction A with a well-scoped brief.

This two-stage approach is validated by the Citizens Advice Caddy pilot model: consequence scanning before deployment, limited trusted sources confirmed, then structured volunteer access. The key insight from Caddy is that **trust is the product**, not just the chatbot — and trust is broken by one bad response that was foreseeable.

---

## Draft volunteer brief (starting point)

> **What this is:** A chatbot trained on Macular Society patient resources to answer questions from people affected by macular conditions. It is not a clinical tool and is not a replacement for helpline calls.
>
> **What to test:** Use it as a curious patient would. Ask the kinds of questions you hear on the phone. Include edge cases — questions about symptoms, treatments, benefits, emotional support, and "what should I do right now?"
>
> **What to flag:** Any response that (a) states something medically incorrect, (b) gives advice it should not give, (c) fails to escalate when a caller describes sudden vision loss, severe pain, or rapid deterioration, (d) sounds impersonal or dismissive in tone.
>
> **What you are NOT expected to do:** Evaluate the technology. Your job is to tell us whether the responses are trustworthy and helpful from a helpline perspective. If it feels wrong, flag it — you don't need to know why.
>
> **How to flag:** [submission mechanism TBD]
>
> **Important:** Every response carries the footer: "This information is based on Macular Society patient resources and is not a substitute for professional medical advice." If you do not see this on a response, that itself is a bug to flag.

---

*Sources:*
- [Citizens Advice — Why Citizens Advice built a chatbot (Computing.co.uk)](https://www.computing.co.uk/interview/2025/why-citizens-advice-built-a-chatbot)
- [Samaritans — AI Chatbots Policy Briefing, Feb 2026](https://media.samaritans.org/documents/AI_Chatbots_Policy_Briefing.pdf)
- [VentureBeat — Shadow mode, drift alerts and audit logs: Inside the modern audit loop](https://venturebeat.com/orchestration/shadow-mode-drift-alerts-and-audit-logs-inside-the-modern-audit-loop)
- [Cobbai — Post-launch reviews: Shadow mode, gradual autonomy, and QA in AI rollouts](https://cobbai.com/blog/ai-rollout-post-launch-review)
- [MDPI — Large Language Models in Medical Chatbots: Opportunities, Challenges, and Risks](https://www.mdpi.com/2078-2489/16/7/549)
- [IMDA — Starter Kit for Testing LLM-Based Applications for Safety and Reliability](https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/starter-kit-for-testing-llm-based-applications-for-safety-and-reliability.pdf)
