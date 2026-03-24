# Exploration: Slackbot Integration

> Stage: Explore | Date: 2026-03-07
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Integrate the Macular Society RAG chatbot with Slack, adding Slack as an interface channel alongside the existing web frontend.

## Problem interpretations

### Interpretation A: Staff knowledge access during calls

Macular Society helpline staff and volunteers field phone calls from people with macular degeneration. They currently have to context-switch to the web app or external resources mid-call to look up treatment information, services, or eligibility criteria. A Slackbot would let them query the RAG knowledge base without leaving their primary communication tool.

### Interpretation B: Additional public channel for members

Some Macular Society members or community volunteers already use Slack (e.g., in a members' workspace or volunteer coordination hub). Exposing the RAG chatbot there would let them ask questions without navigating to the web app — reducing friction for a segment who prefer chat-based tools.

### Interpretation C: Ops and monitoring alerts

The MONITORING.md already notes Slack as a potential notification channel for Grafana alerts. A narrow integration could simply route system health alerts, error spikes, or RAG quality degradation signals into a Slack channel — no RAG query handling required.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Helpline staff/volunteer | Mid-call, needs to recall a fact about a treatment or service | Searches web app or Google in a separate window | Med |
| Macular Society member in a Slack workspace | Wants to ask a question about their condition without switching apps | Goes to the web chatbot or calls the helpline | Low |
| Ops/engineering team | Wants to be paged when the RAG system degrades | Watches Grafana dashboards manually | Low |

_Note: End users of the primary web product have macular degeneration and rely on screen readers, high contrast, and keyboard navigation. Slack's screen reader support is inconsistent — it is fair on Windows/iOS but poor on macOS. If Interpretation B targets beneficiaries directly, accessibility parity with the web app cannot be assumed. Staff users (Interpretation A) are a different population who may not have visual impairments._

## Why now

- The RAG backend is stable and the API is clean — surface-level integration work is lower risk than when the core was still changing.
- Staff have been using the web app and there may be feedback about workflow friction during calls (worth verifying).
- Slack is already referenced in MONITORING.md as a planned alert destination — even the narrowest interpretation has a natural anchor.

## Existing solutions

**Internal:**
- Web chatbot at port 5173 (dev) / 3030 (prod) — full session history, voice input/output, streaming SSE responses.
- No Slack-related code exists outside of a single mention in MONITORING.md as a notification channel target.

**External:**
- Off-the-shelf Slack RAG bots (e.g., Enjo, ClearFeed, Wonderchat) can front any OpenAI-compatible backend — they handle OAuth, event routing, and Slack's 3-second ack requirement. Trade-off: less control, recurring cost, potential data residency concerns for a medical knowledge base.
- Custom Slack app with Bolt SDK (Node/Python) — full control, integrates directly with the existing NestJS API. Trade-off: adds a new service to operate.
- Slack webhook-only (Interpretation C) — Grafana natively supports Slack webhook notifications; zero custom code.

## Possible directions

### Direction A: Internal staff assistant (Slack → existing API)

Build a lightweight Slack app (Bolt SDK or NestJS Slack module) that forwards `/ask` commands or `@bot` mentions to the existing RAG API and posts the response back. Session state is per-channel or per-user DM. No voice. Scope: new NestJS module + Slack app registration.

### Direction B: Public member channel

Stand up a Slack workspace or app open to Macular Society members. Same backend as Direction A but with authentication, workspace management, and accessibility vetting. Significantly larger operational surface.

### Direction C: Monitoring alerts only

Wire Grafana's existing Slack webhook support to post alerts into an ops channel. No API changes. One configuration line. This already works out of the box.

## Hard problems

- **Streaming incompatibility.** The API delivers responses via SSE (`AsyncGenerator` streaming). Slack requires an HTTP 200 acknowledgment within 3 seconds, then an async message update. The current streaming model cannot be used directly — responses must either be buffered completely before posting, or use Slack's `chat.update` pattern to stream chunks by editing a posted message.
- **Session model mismatch.** The existing session model maps to a browser session with persistent history. Slack conversations are threaded differently — a Slack DM, a channel thread, and a direct `/slash` command each imply different session boundaries.
- **Accessibility parity not guaranteed.** The web app is purpose-built for macular degeneration users. Slack's screen reader experience is platform-dependent and outside the team's control. Deploying to beneficiaries via Slack means accepting a regression in accessibility guarantees relative to the web product.
- **Medical domain + open Slack workspace.** Slack's retention, export, and compliance settings are organisationally controlled. A Slack-based medical Q&A channel could expose conversation history to workspace admins or Slack's own data pipeline in ways the web app's Postgres-backed session store does not.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Do staff actually use Slack? | Direction A is irrelevant if Macular Society staff don't have a Slack workspace | Ask the charity's digital/ops team |
| Is there member demand for a Slack channel? | Direction B is irrelevant without user pull | Survey or interview existing web app users |
| What is Slack's data residency policy for the UK tier? | Medical Q&A data leaving UK jurisdiction may conflict with the charity's data governance | Review Slack's DPA and the charity's data policy |
| Can the 3-second ack + async update pattern reproduce acceptable UX? | Users may find a "typing…" → replaced message pattern confusing vs live streaming | Prototype with Bolt SDK and test with staff |
| What session TTL/history behaviour do staff need mid-call? | Session design depends on whether staff need cross-call history or just single-query lookups | Stakeholder interview |

## Promising direction

**Direction A** (internal staff assistant) — lowest risk, clearest value case, no accessibility regression.

The primary web chatbot exists to serve people with macular degeneration directly. Adding Slack as a beneficiary channel introduces accessibility uncertainty that the team cannot fully control. By contrast, an internal staff assistant operates in a closed workspace, serves users without assumed visual impairments, and has a clear job: helping volunteers answer calls faster. The streaming incompatibility is solvable (buffer-and-post is acceptable for a staff tool where a 5–10 second wait is fine). The session mismatch is also manageable — per-user DM sessions map cleanly to individual staff members.

**Direction C** is the fastest win and should be done regardless — it requires no code.
