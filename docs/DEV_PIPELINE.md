# Development Pipeline — Macular Society RAG Platform

Reference for a 5-person team shipping to production. Covers every stage from local commit to live deployment. Organised by priority: **Essential** (required before production), **Important** (add in sprint 1–3), **Nice to have** (evaluate when capacity allows).

---

## Current CI state (baseline)

| Workflow | Trigger | Status |
|---|---|---|
| `lint.yml` | PR | ESLint + TypeScript typecheck (API + frontend) |
| `test-package-install.yml` | package.json change | `npm ci` + `npm run build` on Node 20 + 22 |

Everything below is **missing** from the pipeline.

---

## 1. Branch & repository strategy

### Branch model — trunk-based (recommended for 5 devs)

```
main          ← protected, always deployable, requires PR + 1 review
develop       ← integration branch (current default branch)
feature/xxx   ← short-lived, max 1–2 days
fix/xxx       ← bug fixes
release/x.y   ← release prep if needed
```

Trunk-based reduces merge conflict overhead. Gitflow is heavier than needed for this team size.

### Repository settings to enforce

| Setting | Config |
|---|---|
| Protected branches | `main` + `develop` — no direct push |
| Required reviewers | 1 approving review minimum |
| Require status checks | All CI jobs must pass before merge |
| Dismiss stale reviews | On new commit, previous approval dismissed |
| Linear history | Require rebase or squash merge — no merge commits |
| Branch deletion | Auto-delete head branch after merge |
| CODEOWNERS | Add `.github/CODEOWNERS` mapping ownership per module |

### CODEOWNERS example

```
# .github/CODEOWNERS
projects/api/src/modules/rag/          @backend-lead
projects/frontend/src/                 @frontend-lead
docker/                                @devops-lead
docs/                                  @everyone
```

### Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/) — enforced via `commitlint`.

```
feat(rag): add cosine threshold configurable per request
fix(chat): handle empty stream response gracefully
chore(deps): bump openai to 4.x
docs(adr): record decision on embedding model
```

Enables automated changelogs and semantic versioning later.

---

## 2. Local developer setup (pre-commit)

Run quality checks before code ever reaches GitHub. Catches issues in seconds, not minutes.

### Tools

| Tool | Purpose | Priority |
|---|---|---|
| **Husky** | Git hook runner | Essential |
| **lint-staged** | Run linters only on staged files (fast) | Essential |
| **commitlint** | Enforce conventional commit format | Important |
| **gitleaks** | Secret detection before push | Essential |

### Pre-commit hook (via Husky + lint-staged)

```json
// package.json (root)
{
  "lint-staged": {
    "projects/api/src/**/*.ts": ["eslint --fix", "prettier --write"],
    "projects/frontend/src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### Pre-push hook

```bash
# .husky/pre-push
npm run typecheck --prefix projects/api
npm run typecheck --prefix projects/frontend
```

### Secret scanning — gitleaks

Run locally before push. Also run in CI.

```bash
# Install: brew install gitleaks
gitleaks detect --source . --verbose
```

Add a `.gitleaks.toml` to allowlist expected false positives (test fixtures, etc.).

> **Why this matters:** OpenAI keys, DB credentials, or LangWatch tokens committed to git are an immediate production incident. GitHub secret scanning catches them after the fact; gitleaks stops it before push.

---

## 3. CI pipeline — GitHub Actions

### Workflow structure (recommended)

```
.github/workflows/
├── lint.yml              ← exists: ESLint + typecheck
├── test.yml              ← MISSING: unit + integration tests
├── security.yml          ← MISSING: secret scan + SCA + SAST + container scan
├── build.yml             ← MISSING: Docker image build + push to registry
├── deploy-staging.yml    ← MISSING: deploy on merge to develop
├── deploy-production.yml ← MISSING: deploy on merge to main
└── test-package-install.yml ← exists: build verification on package changes
```

### 3a. Test workflow — `test.yml`

Trigger: PR + push to `develop` / `main`

```yaml
jobs:
  test-api:
    steps:
      - npm ci
      - npm run typecheck          # already in lint.yml, keep here too
      - npm run test               # Vitest unit tests
      - npm run test:integration   # integration tests (needs Postgres)
      - upload coverage artifact

  test-frontend:
    steps:
      - npm ci
      - npm run test               # Vitest unit tests
```

**Coverage enforcement:** Set minimum thresholds in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 60,
  }
}
```

Fail the build if coverage drops below threshold. Start low and raise over time.

**Integration tests with Postgres:** Use GitHub Actions services:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    env:
      POSTGRES_PASSWORD: test
    ports:
      - 5432:5432
```

### 3b. Security workflow — `security.yml`

Trigger: PR + push to `main` + weekly schedule

See full breakdown in [Section 4](#4-security-scanning).

### 3c. Build workflow — `build.yml`

Trigger: push to `develop` or `main`, or manual dispatch

```yaml
jobs:
  build-and-push:
    steps:
      - docker buildx build --platform linux/amd64,linux/arm64
      - Push to GHCR (GitHub Container Registry)
      - Tag: sha-<commit> + branch name + latest (on main only)
      - Run Trivy scan on the built image
      - Fail build on CRITICAL/HIGH CVEs
```

**Image tagging strategy:**

```
ghcr.io/org/macular-api:sha-abc1234    ← immutable, used for deployment
ghcr.io/org/macular-api:develop        ← mutable, latest develop build
ghcr.io/org/macular-api:latest         ← mutable, latest main build
```

Always deploy by SHA tag, never `latest`, in production.

---

## 4. Security scanning

### 4a. Secret scanning

| Tool | Where | Cost |
|---|---|---|
| **GitHub Secret Scanning** | GitHub repo settings | Free (GitHub Advanced Security for public repos, paid for private) |
| **gitleaks** | Pre-push hook + CI | Free |
| **TruffleHog** | CI (deeper entropy scan) | Free |

### 4b. Dependency scanning (SCA — Software Composition Analysis)

| Tool | Where | Notes |
|---|---|---|
| **Dependabot** | GitHub repo settings | Free. Auto-PRs for outdated/vulnerable deps. Enable for npm. |
| **`npm audit`** | CI (`test.yml`) | Already possible — add `npm audit --audit-level=high` step |
| **Snyk** | CI + IDE plugin | Free tier (limited scans/month). Better UX than npm audit. Catches transitive deps. |

Recommended: Dependabot (free, automatic) + npm audit in CI. Add Snyk if budget allows.

Dependabot config:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /projects/api
    schedule:
      interval: weekly
    groups:
      dev-dependencies:
        patterns: ["*"]
        dependency-type: development
  - package-ecosystem: npm
    directory: /projects/frontend
    schedule:
      interval: weekly
  - package-ecosystem: docker
    directory: /
    schedule:
      interval: weekly
```

### 4c. Static analysis (SAST)

| Tool | Where | Cost | Notes |
|---|---|---|---|
| **CodeQL** | GitHub Actions | Free for public repos / included with GitHub Advanced Security | Excellent for TypeScript. Catches injection, path traversal, XSS. |
| **Semgrep** | CI + pre-commit | Free tier | Fast, rule-based. Good for custom rules (e.g. enforce LangWatch tracking on every OpenAI call). |
| **SonarCloud** | CI | Free for public repos, paid for private | Code quality metrics + bug detection. Has a good GitHub PR integration. |

Recommended starting point: **CodeQL** (zero cost, deep TypeScript analysis) + **SonarCloud free tier**.

CodeQL workflow:

```yaml
# .github/workflows/codeql.yml
- uses: github/codeql-action/init@v3
  with:
    languages: typescript
- uses: github/codeql-action/analyze@v3
```

### 4d. Container scanning

| Tool | Notes | Cost |
|---|---|---|
| **Trivy** | Scans image layers for CVEs, misconfigs, secrets. Fast, easy to integrate. | Free |
| **Grype** | Alternative to Trivy. Good SBOM integration. | Free |
| **Docker Scout** | Built into Docker Hub. Less feature-rich than Trivy for CI use. | Free tier |
| **Snyk Container** | Good for teams already using Snyk. | Free tier |

Recommended: **Trivy** in CI after every Docker build.

```yaml
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/org/macular-api:sha-${{ github.sha }}
    format: sarif
    severity: CRITICAL,HIGH
    exit-code: 1   # fail on HIGH+
```

### 4e. Dynamic analysis (DAST)

Run against staging after deployment — not in the build pipeline.

| Tool | Notes |
|---|---|
| **OWASP ZAP** | Free. Can run as a GitHub Action against staging URL. Good baseline scan. |
| **Nuclei** | Template-based scanner. Good for known CVE checks. |

```yaml
# deploy-staging.yml (after deploy step)
- name: ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.10.0
  with:
    target: https://staging.macularsociety.org
```

### 4f. IaC scanning

Docker Compose files and any future Terraform/Helm should be scanned.

| Tool | Notes |
|---|---|
| **Trivy** | Also scans Docker Compose / Dockerfile misconfigurations |
| **Checkov** | Broader IaC support (Terraform, K8s, Docker) |

```bash
trivy config docker/   # scans Dockerfile + compose files
```

### 4g. License compliance

Charity context: ensure no GPL-licensed dependencies create obligations.

| Tool | Notes |
|---|---|
| **`license-checker`** | npm package. Run in CI, fail on disallowed licenses. |
| **FOSSA** | Full SCA + license management platform. Free tier. |

```bash
npx license-checker --onlyAllow 'MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause' --excludePrivatePackages
```

### 4h. SBOM (Software Bill of Materials)

Required for supply chain transparency. Increasingly expected in public sector/charity context.

| Tool | Notes |
|---|---|
| **Syft** | Generates CycloneDX or SPDX SBOM from Docker image or directory |
| **Trivy** | Also generates SBOM |

```bash
syft ghcr.io/org/macular-api:sha-abc1234 -o cyclonedx-json > sbom.json
```

Attach as a GitHub release artifact.

---

## 5. Testing pipeline

### Test types and ownership

| Type | Tool | Trigger | Who owns |
|---|---|---|---|
| Unit tests | Vitest | PR + push | Dev writing the code |
| Integration tests | Vitest + real Postgres | PR + push | Feature dev |
| E2E tests | Playwright | Staging deploy | QA / full team |
| Accessibility audit | axe-core (automated) | PR (frontend changes) | Frontend dev |
| LLM eval / RAG quality | Vitest + LangWatch Scenario | Weekly scheduled + manual | AI/ML lead |
| Performance / load | k6 or Artillery | Pre-release | DevOps |
| Visual regression | Playwright or Chromatic | Optional | Frontend |

### E2E testing with Playwright — currently missing

Playwright tests should cover critical user journeys:
- Submit a query and receive a streamed response
- Voice input (mock Whisper)
- Session persistence across page reload
- Keyboard-only navigation (accessibility)
- Screen reader interaction (critical for this product)

```bash
cd projects/frontend && npx playwright install
npx playwright test
```

Run E2E against staging, not the PR build (too slow).

### Accessibility testing in CI — currently missing

Use `axe-playwright` in Playwright tests:

```typescript
import { checkA11y } from 'axe-playwright';

test('chat view has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await checkA11y(page, null, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
});
```

Also run the `/audit-a11y` skill before any release.

### LLM eval tests — gated (correct)

Current approach (eval tests blocked from auto-run) is correct. Add a weekly scheduled CI job:

```yaml
# .github/workflows/evals.yml
on:
  schedule:
    - cron: '0 6 * * 1'  # Monday 6am
  workflow_dispatch:      # manual trigger
```

Track eval scores over time in LangWatch dashboard. Fail on regression beyond threshold.

---

## 6. Build and artifact management

### Docker image strategy

- Multi-stage builds: separate `builder` and `runtime` stages — keep runtime image minimal
- Pin base image versions: `node:20.19-alpine3.21` not `node:20-alpine`
- Non-root user in container: `USER node`
- `.dockerignore` must exclude `node_modules`, `.env*`, `*.local`, `coverage/`

### Registry

Use **GitHub Container Registry (GHCR)** — already integrated with the repo, free for public packages.

```
ghcr.io/macular-society/api
ghcr.io/macular-society/frontend
```

### Build caching

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

GitHub Actions cache for Docker layers cuts build time significantly.

---

## 7. Deployment pipeline (CD)

### Environment model

```
Local (Docker Compose) → Staging (auto-deploy from develop) → Production (manual gate from main)
```

### Staging deployment — `deploy-staging.yml`

Trigger: push to `develop` (after CI passes)

Steps:
1. Pull image by SHA tag
2. Run DB migrations (`npm run db:migrate`)
3. Deploy (docker compose pull + up, or k8s rollout)
4. Smoke test — hit `/api/health`, verify 200
5. Run ZAP DAST baseline
6. Notify Slack/Teams channel

### Production deployment — `deploy-production.yml`

Trigger: **manual workflow dispatch** after staging sign-off (not automatic)

Steps:
1. Confirm: who triggered, which SHA, link to staging verification
2. Create GitHub release + tag
3. Pull image by SHA tag (same image that ran in staging — never rebuild)
4. Run DB migrations
5. Deploy with zero-downtime strategy (rolling update)
6. Smoke test
7. Notify team

> **Same image principle:** The image built in CI is the image that runs in staging and then production. Never rebuild at deploy time. This ensures what you tested is what you ship.

### Database migrations

- Drizzle migrations run automatically on startup in staging
- In production: run migrations as a pre-deploy step, with a rollback script ready
- Migration PRs require a second reviewer

### Rollback

- Keep previous 3 image SHAs tagged in registry
- Document rollback runbook: pull previous SHA, re-deploy, check health
- DB rollback is harder — prefer additive schema changes (never drop columns in the same release)

---

## 8. Release management

### Versioning — Semantic Versioning (SemVer)

```
MAJOR.MINOR.PATCH
  1.0.0 → 1.0.1  (patch: bug fix)
  1.0.0 → 1.1.0  (minor: new feature, backwards compatible)
  1.0.0 → 2.0.0  (major: breaking change)
```

### Changelog generation

Use `conventional-changelog` or `semantic-release` to auto-generate changelogs from commit history.

```bash
npx conventional-changelog-cli -p angular -i CHANGELOG.md -s
```

Or fully automated with `semantic-release`:

```json
// .releaserc
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/github"
  ]
}
```

### GitHub Releases

Create a GitHub Release for each production deploy:
- Tag: `v1.2.3`
- Attach: CHANGELOG excerpt, SBOM artifact, Docker image SHA
- Link to staging smoke test results

---

## 9. Code quality

### SonarCloud / SonarQube

- SonarCloud free tier for public repos — good starting point
- Integrates with GitHub PRs (inline comments on issues)
- Track: code smells, duplication, complexity, coverage trend

Key metrics to watch:
- Cognitive complexity per function: keep below 15
- Duplication: below 3%
- Coverage: trending up over time

### PR standards (enforce via GitHub settings + CODEOWNERS)

| Rule | Rationale |
|---|---|
| Max PR size: 400 lines changed | Larger PRs are harder to review safely |
| Require linked issue/ticket | Every PR should reference a ticket |
| No `console.log` in production code | Caught by ESLint rule `no-console` |
| No `any` in TypeScript | Enforce `@typescript-eslint/no-explicit-any` |
| No raw `fetch` in components | Enforced by code review + ESLint custom rule |

### Definition of Done (DoD)

Every ticket is done when:

- [ ] Feature works against acceptance criteria
- [ ] Unit tests written and passing
- [ ] Integration test written if touching DB or external service
- [ ] TypeScript passes with no errors
- [ ] ESLint passes with no warnings
- [ ] Accessibility: no new axe-core violations
- [ ] PR reviewed by 1+ team member
- [ ] Staging deployed and smoke tested
- [ ] Security: no new HIGH/CRITICAL CVEs introduced
- [ ] Docs updated if behaviour changes

---

## 10. Observability (post-deploy)

### Current

- Prometheus (port 3060) + Grafana (port 3070) — metrics
- LangWatch — LLM traces + RAG evaluation

### Missing

| Tool | Purpose | Priority |
|---|---|---|
| **Sentry** | Runtime error tracking + stack traces | Essential |
| **Grafana Alerting** | Alert on metric thresholds (error rate, latency) | Essential |
| **Loki** | Structured log aggregation (pairs with existing Grafana) | Important |
| **Uptime monitoring** | UptimeRobot or Better Uptime (free tiers) | Essential |

### Key alerts to configure in Grafana

| Alert | Threshold | Action |
|---|---|---|
| API error rate | > 5% over 5 min | Page on-call |
| P95 response time | > 5s | Warn |
| OpenAI token spend | > daily cap | Alert + throttle |
| DB connection pool exhausted | Pool size = 0 | Page on-call |
| Disk usage (Postgres / vector store) | > 80% | Warn |

### Sentry integration

```typescript
// projects/api/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_SHA,
  tracesSampleRate: 0.1,
});
```

---

## 11. AI-specific pipeline concerns

This is not a standard web app — the LLM pipeline needs its own quality gates.

### RAG quality regression testing

Track these metrics across every release in LangWatch:
- Answer faithfulness (grounded in retrieved context)
- Answer relevancy (relevant to user query)
- Context recall (right chunks retrieved)
- Hallucination rate

Set thresholds; fail the weekly eval CI job if any drop below baseline.

### Prompt versioning

- System prompts are version-controlled in code (per security assessment)
- Any prompt change triggers the full eval workflow
- Log prompt version alongside each LangWatch trace

### LLM cost tracking in CI

Run a budget check in the weekly eval job:

```bash
# Fail if projected monthly cost exceeds budget
# Pull from LangWatch or Prometheus token counters
```

### Model version pinning

Pin the OpenAI model version explicitly: `gpt-4o-2024-08-06` not `gpt-4o`. OpenAI can change model behaviour on minor updates without notice.

---

## 12. Developer experience

### Onboarding checklist (new team member)

- [ ] Clone repo + `make docker-start` — should work without manual config
- [ ] Copy `.env.example` → `.env.local`, fill in secrets
- [ ] `make api` → API starts, health endpoint returns 200
- [ ] Run `make test` — all tests green
- [ ] Read: `CLAUDE.md`, `docs/CODING_STANDARDS.md`, `docs/TESTING_STRATEGY.md`, `docs/adr/`
- [ ] First PR: pair with a team member

### Makefile targets to add

```makefile
make setup          # Install all deps + husky hooks
make lint           # ESLint all projects
make typecheck      # TypeScript check all projects
make test           # Unit + integration
make test-e2e       # Playwright E2E
make build          # Docker image build (local)
make migrate        # Run DB migrations
make migrate-gen    # Generate new migration from schema change
make security-scan  # Run Trivy + gitleaks locally
make release-dry    # Dry-run semantic-release
```

### Local secret management

- Use `.env.local` (gitignored) for local secrets
- Provide a `.env.example` with all required keys listed but values blank
- CI secrets go in GitHub Actions secrets — never in workflow YAML files

---

## 13. Compliance (GDPR + charity context)

### GDPR requirements in the pipeline

- [ ] PII must never appear in logs — enforced by log redaction (see security assessment)
- [ ] Data retention: implement automated cleanup job (30-day sessions)
- [ ] GDPR purge endpoint: `DELETE /api/gdpr/sessions/:id` (see security assessment)
- [ ] Cookie consent if analytics cookies are added
- [ ] Privacy notice linked from the UI

### ICO registration

As a UK charity processing personal data (health-adjacent queries): confirm ICO registration is current.

### Data flow documentation

Maintain `docs/DATA_FLOW.md` describing:
- What data is collected
- Where it is stored (Postgres, logs, LangWatch)
- Retention periods
- Deletion procedure

---

## 14. Sprint / project tooling

### Ticket management

Use **GitHub Issues** (already have issue templates) or integrate with **Linear** / **Jira** depending on team preference.

Labels to standardise:

```
priority: critical / high / medium / low
type: bug / feature / chore / security / accessibility / infra
area: api / frontend / rag / voice / pipeline / docs
status: in-progress / blocked / review / ready-to-merge
```

### Sprint ceremonies

| Ceremony | Cadence | Duration |
|---|---|---|
| Sprint planning | 2 weeks | 2h |
| Daily standup | Daily | 15 min |
| Sprint review | 2 weeks | 1h |
| Retrospective | 2 weeks | 1h |
| Security review | Monthly | 1h |
| Eval/quality review | Monthly | 1h |

---

## Priority summary

### Before production (must have)

1. Unit + integration tests in CI (`test.yml`)
2. Docker build + push to GHCR (`build.yml`)
3. Trivy container scan (fail on HIGH/CRITICAL)
4. gitleaks secret scanning (pre-commit + CI)
5. Dependabot enabled for npm + Docker
6. `npm audit` step in CI
7. Sentry error tracking
8. Staging environment + smoke tests
9. Grafana alerting configured
10. Uptime monitoring
11. Rate limiting implemented (per security assessment)
12. CORS locked to production origin (per security assessment)

### Sprint 1–3 (important)

- CodeQL SAST
- SonarCloud integration
- Playwright E2E tests (critical journeys)
- Playwright + axe-core accessibility tests
- Semantic versioning + changelog
- SBOM generation on release
- OWASP ZAP on staging
- License compliance check
- Husky pre-commit hooks
- Conventional commits + commitlint
- GDPR purge endpoint

### Evaluate when capacity allows

- Semgrep custom rules
- Chromatic visual regression
- k6/Artillery performance tests
- FOSSA license management
- Checkov IaC scanning
- TruffleHog (if gitleaks proves insufficient)
- Snyk (if Dependabot + npm audit prove insufficient)

---

## Tool decision matrix

| Category | Recommended | Alternative | Why chosen |
|---|---|---|---|
| Secret scanning | gitleaks + GitHub Secret Scanning | TruffleHog | Free, easy CI integration |
| SCA | Dependabot + npm audit | Snyk | Free, native GitHub integration |
| SAST | CodeQL | Semgrep, SonarCloud | Free on GitHub, deep TypeScript support |
| Container scanning | Trivy | Grype, Snyk Container | Free, fast, CI-native, also scans IaC |
| DAST | OWASP ZAP | Nuclei | Free, well-established, GitHub Action available |
| Error tracking | Sentry | Datadog | Generous free tier, good NestJS support |
| E2E | Playwright | Cypress | Better for accessibility testing, free |
| Release automation | semantic-release | conventional-changelog | Fully automated, integrates with GitHub |
| Registry | GHCR | Docker Hub | Already integrated, free with GitHub |
| Log aggregation | Loki (Grafana stack) | ELK, Datadog | Already running Grafana; avoids new tool |

---

*Last updated: 2026-03-07. Review this document at each quarterly planning session.*
