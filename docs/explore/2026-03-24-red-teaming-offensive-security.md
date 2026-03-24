# Exploration: Red Teaming, Offensive Security, and Penetration Testing

> Stage: Explore | Date: 2026-03-24
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Formalise adversarial security testing — red teaming, offensive probing, and structured pentesting — as a repeatable practice for the Macular Society RAG platform, covering both the conventional web/API surface and the AI-specific attack surface introduced by the LLM and RAG pipeline.

---

## Problem interpretations

### Interpretation A: We have known gaps but no structured way to find new ones

The existing `docs/SECURITY_RISK_ASSESMENT.md` documents gaps accurately (CORS wildcard, unauthenticated pipeline endpoints, no query maxLength, prompt logs with PII). Some have been fixed; others deferred. But the document was written by defenders, not attackers. There is no adversarial process — nothing that continuously probes the system as an attacker would, and no mechanism for finding what the defenders didn't think to document.

### Interpretation B: The AI surface is fundamentally different from the API surface

A conventional pentest covers auth, injection, rate limiting, and info disclosure. This system also has a prompt injection surface, a RAG poisoning surface, a contact-collection tool-calling surface, and a vector database surface — none of which are covered by standard OWASP Top 10 methodology. OWASP now publishes a separate LLM Top 10 (2025 edition). Treating these as the same problem leads to audits that miss the most dangerous attack classes.

### Interpretation C: Security assurance is a trust signal to the charity and its users

Macular Society is a UK charity. Its users are vulnerable — low-vision, older adults who trust the platform with health queries and contact details. A breach or a jailbreak-induced hallucination is a reputational catastrophe, not just a technical incident. Security work here is also a governance and trust deliverable, not only an engineering concern.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| End users (macular degeneration) | Submit health queries and personal contact details | None — they trust the system | High (breach impact) |
| Macular Society ops team | Responsible for user data under GDPR | Manual risk review | Medium |
| Developer / on-call | Diagnosing incidents post-breach | Post-hoc log trawl | High |
| Attacker / researcher | Probing a public, unauthenticated chat endpoint | No friction | Low (easy target) |

_Accessibility note: a successful prompt injection that produces harmful or misleading medical content is more dangerous for users with macular degeneration, who may have fewer ways to cross-check information independently._

---

## Why now

- The public chat endpoint (`/api/chat`) is unauthenticated and reachable on Lightsail — the attack surface is live.
- Zitadel auth and admin separation have just shipped. New auth code is the highest-risk surface for a security regression.
- The existing `/pentest` skill exists but has never been run to completion.
- OWASP LLM Top 10 (2025) and OWASP Agentic Top 10 (Dec 2025) have published updated threat models — the threat landscape for RAG systems is now well-documented.
- Prompt injection tooling (Garak, DeepTeam, PyRIT) has matured to the point where automated coverage is feasible without specialist budget.

---

## Existing solutions

**Internal:**
- `docs/SECURITY_RISK_ASSESMENT.md` — one-shot defensive risk review, not adversarial, not regularly updated
- `/pentest` skill — STRIDE-based, reads real code, produces curl-executable test cases for auth, OIDC, prompt injection, rate limiting, and info disclosure; never run to completion
- `projects/prompt-guard/` — standalone prompt injection guard service; integration status unclear
- `AllExceptionsFilter` + `@fastify/rate-limit` — partial defences, configuration gaps known

**External:**
- **Garak** (NVIDIA) — 100+ attack modules for LLM probe, maps to OWASP LLM Top 10, open-source
- **DeepTeam** — open-source, 80+ vulnerability types, runs locally, adversarial simulation framework
- **PyRIT** (Microsoft) — automated multi-turn adversarial dialogue generation
- **Promptfoo** — red team RAG pipelines specifically, supports indirect injection, grounding tests, context poisoning scenarios
- **Burp Suite / OWASP ZAP** — conventional API/web surface; not AI-aware but covers auth, injection, headers, CORS
- **OWASP AI Testing Guide** — published methodology for AI system pentests, free

---

## Possible directions

### Direction A: Run the existing `/pentest` skill end-to-end

Execute the existing skill across all four scopes (auth, chat, pipeline, frontend). This produces a prioritised finding list from static analysis + manual test cases in one session. Low effort, no new tooling. Feeds directly into a fix sprint. Gap: does not cover automated LLM-specific probing.

### Direction B: Integrate Garak or DeepTeam for automated LLM red teaming

Add a `make test-redteam` target that runs Garak or DeepTeam against the local RAG endpoint. Covers prompt injection, jailbreaks, PII extraction, hallucination induction, and RAG poisoning scenarios from pre-built attack libraries. Runs in CI on a schedule. Gap: needs test harness wiring, not a one-session task.

### Direction C: Structured purple team exercise (manual, cross-functional)

Run a time-boxed (half-day) exercise with an attacker mindset across all surfaces — conventional API, OIDC flow, LLM, and RAG pipeline. Document as a formal pentest report. Useful as a governance artefact for the charity trustees. Can reference the existing `/pentest` skill methodology but goes deeper with manual creative probing. Gap: requires time and human attention.

### Direction D: Continuous adversarial monitoring in staging

Deploy a scheduled red team agent (using the `/schedule` skill + automated Garak runs) that probes the staging endpoint on a weekly cadence and flags regressions. Long-term approach — ensures new features don't silently regress security posture. Highest maturity but highest setup cost.

---

## Hard problems

- **Indirect RAG poisoning is hard to detect** — a malicious instruction embedded in a retrieved document chunk looks like normal content to the LLM, and the attack only triggers when the right query is asked. Defending requires explicit context boundary markers and output validation — both currently absent.
- **Prompt injection vs. legitimate instruction following** — the model must follow system instructions but resist user instructions that override them. The boundary is genuinely fuzzy. No single guardrail closes this; it requires defence in depth (prompt guard + context markers + output validation).
- **Auth regression risk is high post-Zitadel** — new auth code, new PKCE flow, new JWT validation path. Each is a potential source of bypass. The ZITADEL_ENABLED=false bypass is a known critical path that needs explicit verification.
- **Unauthenticated public surface** — the chat endpoint is public by design. All LLM-specific attacks are therefore unauthenticated. Rate limiting is the only defence layer between the internet and OpenAI.
- **Testing LLM outputs is non-deterministic** — the same prompt injection may succeed 1 in 10 runs. Automated tests need to account for this with repetition and probabilistic pass/fail thresholds.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Is `prompt-guard/` actively integrated? | If not, the primary injection defence is absent | Read `projects/prompt-guard/` + check how it's wired into `rag.service.ts` |
| Does `ZITADEL_ENABLED=false` bypass work in current code? | Critical auth bypass if env var can be set | Read `jwt-auth.guard.ts` + `env.schema.ts` |
| What is the current state of the "Immediate" fixes from `SECURITY_RISK_ASSESMENT.md`? | Several were "before production" — unknown if applied | Run `/pentest auth` + `/pentest chat` |
| How does Garak/DeepTeam integrate with a streaming SSE endpoint? | Most LLM red team tools expect request/response, not SSE | Spike: read Promptfoo RAG red team docs (has SSE support) |
| Are retrieved chunks sanitised for injected content before insertion into the prompt? | Determines whether RAG poisoning is viable today | Read `rag.service.ts` context assembly code |

---

## Promising direction

**Direction A first, then Direction B** — run the existing `/pentest` skill now to get a baseline finding list and close known gaps, then invest in automated LLM-specific tooling (Garak or DeepTeam) as a second phase.

Direction A is low-cost and immediately actionable — the `/pentest` skill already exists, reads real code, and produces reproducible curl test cases. It will surface the conventional surface (auth bypass, CORS, rate limiting, info disclosure) and the AI surface (prompt injection, contact collection bypass). Direction B builds on those findings: once the baseline is clean, automated adversarial coverage in CI makes future regressions visible before they reach production. This two-phase approach matches the charity's operational reality — limited time, but genuinely high stakes.
