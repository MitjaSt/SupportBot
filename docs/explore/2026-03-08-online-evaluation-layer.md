# Exploration: Online Evaluation Layer for Production RAG Traces

> Stage: Explore | Date: 2026-03-08
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Use the LangWatch traces the system already emits to run automated evaluators over live production interactions — detecting hallucinations, unusual tool call patterns, and user frustration signals in real-time, without waiting for manual review or offline test runs.

## Problem interpretations

### Interpretation A: The silent failure problem
The RAG system serves users with macular degeneration who may be getting incorrect or hallucinated medical information with no detection mechanism in place. LangWatch receives every trace already, but no evaluators run over those traces in production. A hallucinated answer about AMD treatment options, benefit eligibility, or helpline availability reaches the user and is never flagged. The only signal is if the user themselves reports it — a high bar for someone already struggling with vision loss.

### Interpretation B: The reasoning opacity problem
The contact collection state machine (phone/email via tool calling) can enter degenerate loops — calling the same tool repeatedly, failing to advance state, or prematurely declaring completion. These failures are invisible in the current monitoring stack. Prometheus/Grafana track token counts and latency; they cannot see whether the agent's *reasoning trajectory* was valid. Observability at the span level exists, but no evaluator asks "did this tool call sequence make sense?"

### Interpretation C: The missing feedback loop problem
The offline eval suite (RAGAS, scenario tests) is static and manually curated. The webinar argues — and 2025 research confirms — that production traffic is the richest source of test cases. The team currently cannot close the loop: identify a bad production response in LangWatch → extract the trace state → convert it into an offline test case. Without this loop, the eval suite drifts from real user behaviour, and regressions in edge cases that only appear in production go undetected.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| End user (macular degeneration) | Receives a hallucinated or retrieval-grounded-but-wrong answer | Cannot tell; trusts the system | High |
| Engineer on call | A user reports a bad response days after the fact | Searches LangWatch manually, no automated alerting | High |
| AI/data team | Wants to know if a prompt change improved production quality | Compares RAGAS offline scores; no production signal | Medium |
| Contact collection flow | Agent loops on tool calls without completing phone/email capture | No detection; session may just stall | Medium |

*Note: Low-vision users relying on voice output have no visual cues that a response is wrong. A hallucinated answer delivered via Piper TTS is indistinguishable from a correct one. Undetected failures in this channel are categorically more harmful than in a text-only interface.*

## Why now

- LangWatch already receives every trace (`logRetrieval`, `logGeneration`, `updateTrace`). The pipeline to run online evaluators exists; the evaluators themselves do not.
- LangWatch's 2025 feature set explicitly supports online evaluators that trigger on every trace — including RAG faithfulness checks, PII detection, prompt injection detection, and custom LLM-as-judge scorers. This is a configuration problem, not a build problem.
- A March 2025 arXiv benchmark ([2503.21157](https://arxiv.org/abs/2503.21157)) confirmed that reference-free hallucination detection (LLM-as-judge, Lynx, HHEM) can catch incorrect RAG responses with high precision — no ground-truth labels required.
- The `eval-dataset-management` exploration (2026-03-07) identified that the team cannot tell which production failure modes are under-represented in the offline suite. Online evaluator output would provide exactly that signal.
- The existing prompt-guard service detects direct prompt injection at the API layer but does not monitor for indirect injection — where a scraped Macular Society page returns attacker-controlled text inside a retrieved chunk that is then passed to the LLM.

## Existing solutions

**Internal:**
- LangWatch adapter (`langwatch.adapter.ts`) — emits retrieval spans (query, chunks, scores, document IDs) and generation spans (model, prompt, response, token usage). Thread-level grouping is already wired: `langwatch.thread.id` = `sessionId`. The raw material for online evaluation is there.
- Prometheus metrics (`metrics.service.ts`) — tracks token counts, latency. Operational, not quality-focused.
- `prompt-guard` module — detects direct prompt injection pre-LLM. Does not cover retrieved-content injection or post-generation quality.
- `@langwatch/scenario` tests — offline multi-turn simulations. Evaluated against the test suite, not live traffic.

**External:**
- **LangWatch online evaluators** — runs evaluators against every production trace automatically; supports RAG faithfulness, PII, injection detection, custom LLM-as-judge, hallucination detection, and alert webhooks. Already integrated into the stack; no new vendor needed.
- **Langfuse + OpenEvals** — similar online eval capability; the team has a Langfuse adapter but it is a secondary integration.
- **Datadog LLM Observability** — trace-level hallucination detection with deployment correlation. Adds significant operational cost and a new vendor; not appropriate for a charity context.
- **Cleanlab TLM / HHEM** — reference-free hallucination scoring models. Could be self-hosted or called as API; would need integration into the observability pipeline.

## Possible directions

### Direction A: LangWatch online evaluators (configuration-first)
Configure LangWatch's built-in online evaluator templates for the existing trace pipeline — RAG faithfulness (does the response stay within the retrieved chunks?), prompt injection detection (does the retrieved content contain injected instructions?), and a custom LLM-as-judge for medical domain accuracy. No new code required in the API; managed in the LangWatch UI and optionally version-controlled as config. Alert on threshold breaches via webhook → Slack or email.

### Direction B: Custom inline evaluator spans
After `logGeneration`, make an additional async call that runs a lightweight faithfulness check (compare response spans to chunk spans using tiktoken-bounded context) and logs the result as a scored `logEvent` span. Keeps evaluation in-process, adds no external dependency beyond the existing OpenAI call, but adds latency and token cost to every request. The score is attached to the trace and visible in LangWatch.

### Direction C: Production trace → test dataset pipeline
Rather than evaluating traces live, build a weekly batch job that queries LangWatch for traces with low faithfulness scores or user frustration signals (detected via session feedback or response patterns), extracts the trace state (query + retrieved chunks + response), and appends these to the `agent_scenarios.json` dataset. Closes the offline eval gap identified in the `eval-dataset-management` exploration without requiring real-time evaluation infrastructure.

### Direction D: Thread-level session evaluation
Currently, each RAG request is evaluated in isolation. Extend the observability model to evaluate full sessions (threads): did the assistant collect contact details when requested? Did it maintain consistent answers across turns? Did the contact collection state machine reach a terminal state? This maps directly to the `runs → traces → threads` framework from the webinar and is a distinct capability from per-request quality checks.

## Hard problems

- **Reference-free faithfulness for medical content**: Standard RAG faithfulness checks compare response tokens to retrieved context tokens. But a correct answer sometimes requires synthesising across multiple chunks, and a factually correct answer might use different phrasing than the source. Tuning thresholds to avoid false positives (alerting on correct paraphrases) without missing real hallucinations is genuinely hard in a medical domain.
- **No user feedback signal**: The current frontend has no thumbs-up/thumbs-down mechanism. The "user says that's wrong" online evaluator described in the webinar has no surface to attach to. Detecting dissatisfaction requires inference from behavioural signals (session abandonment, repeated rephrasing of the same question), not explicit ratings.
- **Indirect prompt injection in retrieved content**: The Macular Society scrapes external URLs. A compromised or attacker-controlled page could return content that, when retrieved and inserted into the prompt, redirects the LLM's behaviour. Detecting this requires evaluating the chunk content before it enters the prompt — or flagging post-generation responses that deviate from expected patterns. The prompt-guard service does not currently sit in this path.
- **Alert fatigue**: Online evaluators that fire too broadly will be ignored. Calibrating evaluator thresholds for a charity with a small engineering team (limited capacity to triage alerts) requires careful threshold design and tiered severity.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does LangWatch's built-in RAG faithfulness evaluator work out-of-the-box with the current span shape? | If yes, Direction A is days of work; if no, custom integration needed | Enable on a test project in LangWatch, point at staging traces, check score distribution over 50 traces |
| What is the current false-positive rate on medical paraphrases for reference-free hallucination detection? | A high false-positive rate makes online evaluation noise rather than signal | Run Lynx or LangWatch faithfulness against 20 known-correct production traces (if accessible) and 10 known-bad synthetic ones |
| Does the system currently produce any traces that would score low on faithfulness? | Determines urgency — if production is clean, online eval is preventive; if it's noisy, it's urgent | Manual audit: read 10 recent LangWatch traces in production or staging |
| Can LangWatch webhook alerts reach the team's existing channels (Slack, email)? | Affects whether Direction A is fully configuration-only | Check LangWatch alert integration docs / existing webhook config |
| What is the operational cost of running LLM-as-judge on every production trace? | Could be prohibitive for a charity budget | Estimate: avg 500 token judge prompt × $0.0015/1K = $0.00075 per trace; likely acceptable unless volume is very high |

## Promising direction

**Direction A** — LangWatch online evaluators, configuration-first

LangWatch already has online evaluator templates for RAG faithfulness, prompt injection, and PII detection. The system already emits well-structured spans with retrieval context and generation output. The gap is purely configuration, not engineering — making this the lowest-effort, highest-signal intervention available.

The case for starting here is strong: for users with macular degeneration receiving medical information over a voice channel, undetected hallucinations are the highest-risk failure mode in the system. Direction A can be live within days and immediately surfaces whether the current production behaviour is clean or problematic — which is the single most important unknown across all the evaluation work explored to date.

Direction C (production trace → test dataset) is a natural second step once Direction A has accumulated a scored trace history worth mining.

---

*Sources:*
- [arXiv 2503.21157 — Real-Time Hallucination Detection in RAG](https://arxiv.org/abs/2503.21157)
- [arXiv 2503.22458 — Multi-Turn Conversation Evaluation Survey](https://arxiv.org/abs/2503.22458)
- [LangWatch Evaluations Overview](https://langwatch.ai/docs/evaluations/overview)
- [LangWatch — Open-Sources Evaluation Layer (March 2026)](https://www.marktechpost.com/2026/03/04/langwatch-open-sources-the-missing-evaluation-layer-for-ai-agents-to-enable-end-to-end-tracing-simulation-and-systematic-testing/)
- [Datadog — Hallucination Detection via LLM Observability](https://www.datadoghq.com/blog/llm-observability-hallucination-detection/)
- [Langfuse — Evaluating Multi-Turn Conversations](https://langfuse.com/blog/2025-10-09-evaluating-multi-turn-conversations)
- [LangWatch — Top Tools for Evaluating Voice Agents in 2025](https://langwatch.ai/blog/top-tools-for-evaluating-voice-agents-in-2025)
