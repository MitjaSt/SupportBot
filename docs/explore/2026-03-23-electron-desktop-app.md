# Exploration: Electron Desktop App

> Stage: Explore | Date: 2026-03-23
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Package the Macular Society RAG platform as an installable Electron desktop application, deciding which Docker services to keep, drop, or replace, and establishing a secure secrets management strategy.

## Problem interpretations

### Interpretation A: Offline-capable tool for charity staff or volunteers

Staff members who run support sessions or outreach events may need to query the knowledge base without a reliable internet connection. A desktop app could bundle a local vector DB and pre-loaded embeddings, running entirely offline except for LLM calls. Cost: missed support interactions when connectivity drops.

### Interpretation B: Simplified deployment for non-technical administrators

Deploying a Docker Compose stack requires technical confidence the charity may not have in-house. An installable `.dmg` or `.exe` removes that barrier — click to install, click to run. Cost: ongoing ops overhead of maintaining a self-hosted server when there is no sysadmin.

### Interpretation C: Privacy-first distribution for clinical or sensitive use

If the platform expands to handle clinical letters or personal health data, hosting on a shared server creates data governance risk. A desktop app keeps data local, on the user's machine, under their control. Cost: no central analytics, harder to update, harder to audit.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Charity staff / volunteers | Running sessions without reliable Wi-Fi | Use phone hotspot or reschedule | Med |
| IT-averse admin deploying the system | Cannot manage Docker + Postgres + NestJS on a VPS | Delegates to a developer | High |
| End user with macular degeneration | Same as today — still uses the Electron-rendered chat UI | N/A — no change in UX | Low |
| Developer distributing updates | Must re-package and re-distribute with each change | Manual build + release | Med |

_Note: End users interact through the Electron-rendered chat UI (a Chromium webview). For macular degeneration users, Electron does not change accessibility concerns — MUI WCAG compliance still applies and the renderer is the same React app._

## Why now

- The admin separation work (Zitadel PKCE, AdminShell) has just completed, creating a natural boundary between public chat and admin surfaces — an Electron shell could host one or both.
- Docker Desktop is now a paid product for larger organisations, raising friction for deployment.
- The NestJS + React monorepo is already well-structured; the main process/renderer split maps cleanly onto it.

## Existing solutions

**Internal:**
- All services currently run via Docker Compose on a server or local dev machine; no desktop packaging exists.
- No prior exploration of Electron in `docs/explore/`.
- Voice pipeline (Whisper STT, Piper TTS) runs as separate Docker services — a natural candidate for Electron-managed child processes.

**External:**
- Apps like Obsidian, Notion, Linear (desktop) demonstrate Electron at scale with local-first data.
- `nestjs-electron-ipc-transport` allows NestJS to communicate with the Electron renderer via IPC instead of HTTP — eliminates the local HTTP server entirely.
- `electron-builder` / Electron Forge handle cross-platform packaging (DMG, MSI, AppImage).
- Tauri is a lighter-weight alternative to Electron (Rust-based, ~3 MB vs ~150 MB binary) but requires rewriting parts of the native layer.

## Docker services: keep vs drop vs replace

| Service | Verdict | Reasoning |
|---------|---------|-----------|
| **PostgreSQL + pgvector** | Keep (Docker) or replace | The hardest to replace. Options: keep Docker (requires Docker Desktop on the user machine), or swap to SQLite + `sqlite-vss`/`sqlite-vec` for local vector search. |
| **Whisper (STT)** | Keep (Docker) or embed | Can stay as Docker if Docker is already required; alternatively, run as a bundled child process using a pre-built `whisper.cpp` binary — no Docker needed. |
| **Piper (TTS)** | Keep (Docker) or embed | Same as Whisper — Piper has a standalone binary that can be spawned from the Electron main process. |
| **Zitadel** | Drop | Auth is unnecessary for a single-user desktop app. Replace with no auth (personal use) or OS-level user identity. |
| **Prometheus** | Drop | Production monitoring has no place in a desktop install. Local metrics can be logged to a file if needed. |
| **Grafana** | Drop | Same — no operational dashboards for an end-user desktop app. |
| **CloudBeaver** | Drop | DB admin UI for developers only; not shipped to end users. |

Net result: if Docker is acceptable as a dependency, only Postgres + optionally Whisper + Piper survive. If Docker must be eliminated, Postgres must be replaced.

## Secrets management

This is the hardest problem in the Electron context.

**Current secrets:**
- `OPENAI_API_KEY` — the most sensitive; billed per token
- `DATABASE_URL` with credentials
- `ZITADEL_*` tokens — dropped in desktop scenario

**Approaches:**

| Approach | How it works | Risk |
|----------|-------------|------|
| OS Keychain via `safeStorage` | Encrypt and store keys in macOS Keychain / Windows Credential Store / libsecret. Prompt user once on first launch. | No risk from disk theft; still exposed to processes running as the same user. |
| User-supplied key at runtime | User pastes their own OpenAI API key into a settings screen; stored via `safeStorage`. | Key is the user's own — no shared organisational key risk. Suitable for personal use. |
| Org-managed key baked into build | Key embedded at build time via CI env vars, extracted via `electron.vault` or encrypted config. | Single key used by all installs — if leaked, all calls are billed to the org. Not suitable for wide distribution. |
| Proxy-only mode | Electron app calls the organisation's hosted API (no key locally); Electron is a thin shell over the web app. | Requires internet; key never leaves the server. Simplest security model. |

**Critical:** Never ship `OPENAI_API_KEY` in the packaged bundle's source or `asar` archive — it is trivially extractable with `asar extract`.

## Possible directions

### Direction A: Thin Electron shell over hosted API

Electron wraps the existing React frontend in a `BrowserWindow` pointing at the hosted API. No Docker required. Secrets stay on the server. Electron adds: offline detection, native menus, OS-level accessibility hooks, voice device access, auto-update.

Scope: small. Mostly packaging work. No architectural change.

### Direction B: Embedded NestJS with Docker for data services

NestJS runs in the Electron main process (or a Node.js child process it spawns). Postgres + pgvector runs in a Docker container managed by the app. Whisper and Piper run as pre-built binaries. OpenAI key stored in OS Keychain.

Scope: medium. Requires Docker on the user's machine. Works well for technical users or internal charity deployments.

### Direction C: Fully self-contained — no Docker dependency

NestJS embedded in main process. SQLite + `sqlite-vec` replaces pgvector. Whisper.cpp and Piper run as bundled native binaries. OpenAI key in OS Keychain. No external dependencies beyond the `.dmg`/`.exe`.

Scope: large. Requires replacing the vector DB layer. SQLite-vec has limited maturity vs pgvector. Significant migration risk.

### Direction D: Tauri instead of Electron

Rust shell + WebView, much smaller binary, built-in secure storage (`tauri-plugin-store`). Backend still runs as an embedded Node.js/NestJS process or via sidecar. Requires learning Tauri's plugin ecosystem.

Scope: large. High unknowns. Probably only worth it if binary size is a hard constraint.

## Hard problems

- **Vector search portability:** pgvector is a PostgreSQL extension — it does not run without Postgres. SQLite-vec is an emerging alternative but less battle-tested. This is the single biggest blocker for a Docker-free distribution.
- **OpenAI key economics:** A charity distributing a desktop app to volunteers cannot share one API key across hundreds of installs without runaway costs. Either each user supplies their own key, or the app must proxy through a hosted endpoint.
- **Auto-update with embedded data:** If the knowledge base is bundled locally, updates to Macular Society content require re-distribution of the app or a separate sync mechanism.
- **Cross-platform native binaries:** Whisper.cpp and Piper have platform-specific builds. CI must produce separate artefacts for macOS (x64 + arm64), Windows, and Linux.
- **asar security:** Electron packages source into an `asar` archive that is trivially unpacked. Any secret or key embedded at build time is effectively public.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does the charity have Docker Desktop available on target machines? | Determines whether Direction B is viable without user friction | Survey the deployment target (staff laptops vs servers) |
| Is offline operation genuinely required? | Drives the whole architecture — if always-online, Direction A is sufficient | User research / ops team interview |
| What is the expected distribution scale — 1 install, 10, 100+? | Determines whether a shared OpenAI key is safe or each user needs their own | Product decision with charity stakeholders |
| SQLite-vec maturity for 1536-dim embeddings at this scale? | Could block Direction C entirely | Spike: run existing embeddings through sqlite-vec, compare recall vs pgvector |
| macOS notarisation and Windows code-signing overhead? | Distribution to end users requires signed binaries — has cost and process overhead | Research Apple Developer / Microsoft signing requirements |

## Promising direction

**Direction A** (thin Electron shell over hosted API) — lowest risk, fastest to ship, zero change to the backend.

If the charity genuinely needs offline capability or simpler server-side deployment, **Direction B** (embedded NestJS + Docker) is the pragmatic next step — it reuses the existing stack and only adds an Electron wrapper and Docker lifecycle management. Direction C is worth a spike only once SQLite-vec proves viable for pgvector-equivalent recall at 1536 dimensions.
