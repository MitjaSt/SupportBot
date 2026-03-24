# Exploration: Centralised Log Aggregation — Coralogix and Alternatives

> Stage: Explore | Date: 2026-03-24
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Add a centralised log aggregation and search platform to the stack — evaluating Coralogix against competitors — to replace the current situation where application logs exist only in container stdout and are lost on restart.

## Problem interpretations

### Interpretation A: No log search in production
When something breaks in production, the only way to see logs is to exec into a running container or read Docker stdout. There is no search, no retention, and no correlation across services. Debugging a user-reported issue is manual and slow.

### Interpretation B: No proactive alerting on log patterns
Prometheus tracks metrics, but errors that do not surface as metrics (e.g. a NestJS exception, a failed RAG tool call, an unexpected null) go undetected until a user reports them. A log platform with alerting rules would surface these automatically.

### Interpretation C: Compliance and audit trail fragility
ADR-003 mandates structured logs with trace IDs for audit purposes. Currently those logs live only in transient container memory. If the container restarts or is replaced, the audit trail is gone — a potential compliance gap given the charity handles contact information and medical queries.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer / on-call | Debugging a production error | `docker logs <container>` or SSH | High |
| Developer | Investigating a specific user session by traceId | Grep through raw JSON stdout | High |
| Charity ops | Demonstrating audit trail for GDPR compliance | No clear answer | Med |
| Developer | Getting alerted to a spike in RAG errors | Manual Grafana check | Med |

## Why now

- The system is approaching production (Zitadel auth is live, admin panel shipped). Log retention was deferred during dev but is a gap before serious use.
- LangWatch already uses OTEL — a log platform that accepts OTEL would slot into the existing instrumentation path.
- We already run Grafana locally; Loki would require zero new UI tooling.

## Existing solutions

**Internal:**
- Prometheus + Grafana: metrics only — no log ingestion, no full-text search.
- LangWatch: LLM-specific traces and evals only, not general application logs.
- ADR-003: structured JSON logs are emitted but not shipped anywhere.

**External landscape:**

| Tool | Type | Strength | Weakness |
|------|------|----------|----------|
| **Coralogix** | SaaS | Tiered storage (hot/warm/cold), OTEL-native, cost-effective at scale | Opaque unit pricing, no known charity tier, data leaves UK unless EU region configured |
| **Grafana Loki** | OSS / self-hosted | Free, already integrates with our Grafana, label-based indexing is lean | Full-text search is slower, more ops overhead to self-host, alerting is fiddly |
| **Datadog** | SaaS | Best-in-class UX, 400+ integrations, per-host correlations | Very expensive at scale, per-feature pricing model is complex |
| **Better Stack (Logtail)** | SaaS | Cheap, simple, good small-team DX, generous free tier | Less feature-rich, smaller ecosystem |
| **SigNoz** | OSS / SaaS | OpenTelemetry-native, open source, self-hostable | Younger product, smaller community |
| **Elastic Cloud** | SaaS | Powerful full-text search, mature | Expensive, operationally heavy, overkill for current scale |

## Possible directions

### Direction A: Grafana Loki (self-hosted, add to existing stack)
Add Loki + Promtail to the existing `docker-compose` stack. Ship NestJS logs via pino → Promtail → Loki. Grafana already runs — add a log panel to the existing dashboard. Zero new vendor, zero extra cost, uses existing bind-mount storage convention.

### Direction B: Coralogix SaaS
Ship logs via OTEL collector → Coralogix. Use the freemium/starter tier while volume is low. Coralogix's tiered storage model suits a system where most logs are low-value debug output and only errors/traces need fast search. Managed service — no ops overhead.

### Direction C: Better Stack (Logtail)
Simple SaaS log drain. Ship via pino transport or HTTP sink. Generous free tier (1 GB/month retained for 3 days, more on paid). Very low setup cost. Good fit for small-team, low-traffic charity deployment.

### Direction D: Keep self-hosted, solve retention only
Add a Loki-less solution: pipe logs to a Postgres table (time-series) or use `docker logging driver → local file rotation`. Cheap and simple but no real search UX.

## Hard problems

- **UK/EU data residency**: User interactions are medical-adjacent and involve contact information. Logs must not leave the EU. Coralogix has EU regions (Dublin, Frankfurt) but this must be verified and documented. Loki self-hosted trivially satisfies this.
- **PII in logs**: ADR-003 says never log PII. But in practice, if a bug causes a trace to include a message fragment, a SaaS platform would receive it. Requires log scrubbing at the shipper level regardless of platform.
- **Volume estimation**: We have no baseline yet. Loki sizing, Coralogix tier selection, and Better Stack plan choice all depend on GB/day — which is unknown until production traffic is measured.
- **OTEL log signal maturity**: LangWatch uses OTEL traces. Adding OTEL logs means the same collector can ship both — but OTEL logging is still less mature than tracing. NestJS + pino-otel has known friction points.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Log volume in GB/day at production load | Determines cost tier for any SaaS option | Run load test or estimate from message count × avg log line size |
| Coralogix EU region data residency guarantee | GDPR / charity trust obligation | Check Coralogix DPA and SOC 2 docs; ask sales for UK charity pricing |
| Coralogix freemium actual limits | Dictates if free tier is viable | Sign up and test; check unit calculator |
| Loki operational overhead in practice | Whether self-hosting is genuinely low-friction | Spike: add Loki + Promtail to docker-compose and verify Grafana integration in < 1 day |
| pino → OTEL log correlation with LangWatch traces | Unified trace+log view requires log records to carry the same traceId | Spike: instrument one NestJS module and verify traceId appears in both LangWatch and log platform |

## Promising direction

**Direction A (Grafana Loki)** — lowest friction given the existing stack, no new vendor, and satisfies data residency by default.

We already run Grafana and use bind-mount storage. Adding Loki + Promtail to `docker-compose` is a one-day spike. Logs would appear in the existing Grafana dashboard alongside existing metrics panels. If volume grows and Loki self-hosting becomes a burden, migrating to Coralogix or Better Stack later is straightforward — the pino log format stays the same, only the shipper changes.

Coralogix is worth a closer look if the team wants managed infrastructure and the EU region data residency question is answered satisfactorily. Its tiered storage model is a genuine differentiator if log volume grows. But at current scale (charity, single deployment), it is likely overkill for the free tier to matter.
