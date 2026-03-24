# PRD: Electron Desktop App (Thin Shell)

> Status: Draft | Version: 0.2 | Author: via /prd

## Problem

Charity staff, volunteers, and end users benefit from a native desktop presence for the RAG chat platform: OS-level microphone permissions (no browser prompt), native menus and keyboard shortcuts, auto-update without browser cache issues, and a pinned taskbar/dock icon rather than a bookmarked URL. The current browser-only delivery creates friction for low-vision users who rely on OS-level accessibility tools (magnification, screen readers) that integrate better with installed applications than with browser tabs.

## Context

- Always-online assumed — no offline vector search or local inference required.
- The hosted API (`projects/api/`) runs on the server; the Electron app is a client-only artefact.
- Frontend is split into two Vite apps: chat (`index.html`) and admin (`admin.html` with `base: '/admin/'`). Both are already built and served from the same origin.
- All fetch logic is centralised in `projects/frontend/src/api/client.ts` via `apiFetch()` — the API base URL is the only thing that needs to be configurable for distribution.
- Voice pipeline (Whisper STT, Piper TTS) currently uses browser `MediaDevices` for capture; Docker containers handle transcription/synthesis server-side. No change needed.
- Charity context: no large engineering team; operational overhead must stay minimal.

## Assumptions

- The hosted API URL is stable and known at build time. _(High confidence)_
- Target platforms are macOS and Windows; Linux is a stretch goal. _(Med confidence — depends on staff machines)_
- Code signing and notarisation are **not required for the exploration phase**. Unsigned builds are acceptable; install friction (Gatekeeper right-click-open on macOS, SmartScreen warning on Windows) will be addressed before any public distribution. _(High confidence for exploration; signing deferred to production milestone)_
- End users of the chat surface are the primary Electron audience; admin users may continue using the web UI. _(Med confidence — TBD on whether admin shell is bundled)_
- Electron's Chromium renderer provides the same accessibility surface as a browser — existing MUI WCAG 2.1 AA work carries over unchanged. _(High confidence)_

## User Journey

1. User downloads the `.dmg` (macOS) or `.exe` installer (Windows) from GitHub Releases.
2. User installs the app. On macOS, right-click → Open to bypass Gatekeeper on unsigned builds. On Windows, click "More info → Run anyway" to bypass SmartScreen. _(Friction to be resolved with signing before public release.)_
3. App opens a `BrowserWindow` loading the hosted chat URL. The experience is identical to the web app — same React UI, same session history, same streaming responses.
4. On first launch, the OS prompts for microphone permission (native dialog, not browser). User grants it once; it persists across sessions.
5. On subsequent launches, `electron-updater` checks for a new version in the background. If found, it downloads and prompts the user to restart to apply the update.
6. User can access Help → About to see the current app version.

Edge cases:
- If the hosted API is unreachable on launch, the app shows the React app's existing offline/error state — no special Electron handling needed.
- If the update server is unreachable, `electron-updater` silently skips the update check and the app opens normally.
- On macOS arm64 (Apple Silicon), a universal binary (`x64` + `arm64`) avoids Rosetta overhead.

## Goals

**Exploration phase (current focus):**
- [ ] Unsigned, runnable build for macOS and Windows — installable with known friction workarounds.
- [ ] App loads the hosted chat UI; all existing functionality works unchanged.
- [ ] Native microphone permission request replaces browser MediaDevices prompt.
- [ ] No secrets, API keys, or credentials stored in the distributed artefact.

**Production phase (deferred):**
- [ ] Signed + notarized macOS DMG (universal); signed Windows NSIS installer.
- [ ] Auto-update via GitHub Releases — user prompted to restart when a new version is available.
- [ ] CI pipeline builds, signs, notarizes, and publishes releases automatically.

## Non-goals (explicitly out of scope)

- Offline mode or local vector search.
- Bundling the NestJS API into the Electron process.
- Admin shell in the desktop app (admin users use the web UI).
- Linux distribution (deferred — low priority for charity staff machines).
- Custom native menus beyond standard Edit/View/Help stubs.
- In-app settings screen for configuring the API URL (URL is baked into the build).

## Options considered

Evaluation criteria: implementation effort · user impact · operational complexity · architecture fit

### Option A: BrowserWindow loading hosted URL (recommended)
**What:** `BrowserWindow` opens `https://[hosted-domain]` directly. Electron holds no frontend assets — it is a native wrapper around the web app.
**Pros:** Zero changes to the React codebase; no asset path issues; frontend updates deploy instantly without a new Electron release; simplest possible main process.
**Cons:** Slightly slower first paint (network round-trip for all assets); app appears broken if the domain changes without a new release.
**Effort:** Low

### Option B: BrowserWindow loading bundled `dist/`
**What:** `build:chat` output is bundled into the `asar` archive; BrowserWindow loads via `file://`. API calls go to the configured hosted API URL.
**Pros:** Fast load (local assets); frontend works even if the CDN/server is slow.
**Cons:** Every frontend change requires a new Electron release and user update; `vite.config.ts` needs `base: './'` to fix asset paths; `api/client.ts` needs a build-time or runtime API base URL injection.
**Effort:** Medium

### Option C: Load hosted URL with custom protocol / deep-link handling
**What:** Same as A but with a `macular://` custom protocol for deep links (e.g., share a specific conversation).
**Pros:** Native-feeling deep links.
**Cons:** Extra complexity; no known user need for deep links at this stage.
**Effort:** Medium

## Recommended approach

**Choice:** Option A — load hosted URL.

The React app is already deployed and served; Electron becomes a thin wrapper with near-zero changes to the existing codebase. Frontend improvements deploy without requiring users to update the desktop app. The only downside (domain stability) is a non-issue in a charity context where the domain is fixed.

## Failure modes

- **Hosted API goes down:** App loads but shows the React error state. No Electron-specific failure path needed.
- **Code signing certificate expires:** New builds fail to run on macOS/Windows. Apple Developer IDs expire annually; Windows certificates typically last 1–3 years. Must be tracked and renewed in CI secrets.
- **Auto-update server unreachable:** `electron-updater` silently skips — app continues working on current version. No action needed.
- **Microphone permission denied:** Same as browser behaviour — voice input silently unavailable. Existing React UI handles this gracefully (mic button disabled or error shown).

**Detection:** App version metric emitted on launch (`app.getVersion()` logged to the existing observability stack); certificate expiry monitored via CI alert or calendar reminder.

**Fallback:** Users can always fall back to the web app in a browser if the desktop app has a critical bug.

## Users & impact

| User | Current pain | How this helps |
|------|-------------|----------------|
| End user with macular degeneration | Browser tab loses focus; OS accessibility tools integrate poorly with browser apps | Pinned dock/taskbar icon; OS screen reader sees a native app window; native mic permission dialog once instead of every browser session |
| Charity staff / volunteer | Browser bookmark is easy to lose or block by IT policy | Installed application persists; feels official and trustworthy |
| Developer maintaining the app | No desktop delivery mechanism | Automated CI pipeline publishes signed releases to GitHub Releases |

_Note: All UI is rendered in Electron's Chromium, so WCAG 2.1 AA compliance depends on the same MUI codebase. No regression risk, but accessibility must be re-verified in the Electron context (keyboard navigation, screen reader announcements)._

## Risks & dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Apple Developer ID / notarisation cost and process overhead | Med | Med | Budget ~$99/yr Apple Developer Program; automate notarisation in GitHub Actions |
| Windows Authenticode certificate cost | Med | Med | Use a standard OV or EV certificate (~$200–400/yr); EV cert avoids SmartScreen warning |
| Electron Chromium version lags behind browser security patches | Low | High | Pin to latest stable Electron release; subscribe to Electron security advisories |
| `electron-updater` rollout triggers a breaking API mismatch | Low | High | Version the API; use staged rollout (GitHub Releases draft → pre-release → release) |
| App rejected by Apple Gatekeeper if CI secrets misconfigured | Med | Low | Test notarisation on a staging build before the first public release |

## Technical overview

### What changes
- **New project:** `projects/electron/` — Electron main process, preload script, `electron-builder.json`, update logic. Does not modify `projects/api/` or `projects/frontend/`.
- **Frontend:** No code changes. `api/client.ts` `BASE_URL` already uses `VITE_API_URL` (confirm and document); no new env vars needed for Option A.
- **Infrastructure:** For the exploration phase, `electron-builder` runs locally — no CI secrets required. For production, a `build-electron.yml` GitHub Actions workflow will be added with signing secrets: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK` (base64 `.p12`), `CSC_KEY_PASSWORD`, `GH_TOKEN`.
- **Data:** No schema changes. No new storage.

### Key decisions needed before implementation
- Which GitHub repository hosts releases — existing monorepo or a separate `macular-society-desktop` repo? (Affects auto-update URL and access control. Not blocking for exploration.)
- Is the admin shell included in the desktop app or web-only? (Non-goal in this PRD but worth confirming with stakeholders.)
- Who owns the Apple Developer account? (Blocks M3 only — not needed for exploration phase M1/M2.)

### Security considerations

- **Context isolation enabled:** `contextIsolation: true`, `nodeIntegration: false` in all `BrowserWindow` `webPreferences`. Renderer process has no access to Node.js APIs.
- **No secrets in the bundle:** Hosted API URL is the only configuration. `OPENAI_API_KEY` and all other secrets remain server-side. The `asar` archive contains no credentials.
- **Remote URL restriction:** `webContents.setWindowOpenHandler` returns `{ action: 'deny' }` for all external URLs except the known hosted domain, preventing open-redirect abuse.
- **CSP header from server:** The existing server-side CSP applies since we are loading a hosted URL — no additional renderer-process CSP needed.
- **DevTools disabled in production:** `BrowserWindow` created with `devTools: false` in non-dev environments.

### Observability

- App version logged to existing API observability on first chat message (add `X-App-Version` header in `apiFetch()` only when running in Electron, detectable via `navigator.userAgent` or `window.electronVersion` exposed via `contextBridge`).
- No new Prometheus metrics — desktop-specific telemetry is out of scope for this release.

## Success metrics

### User metrics
- Adoption: number of GitHub Release downloads tracked via GitHub's built-in download counter.
- Zero reported crashes on launch within 30 days of first release.

### System metrics
- [ ] Unsigned macOS DMG and Windows installer build successfully from `projects/electron/`.
- [ ] (Production) CI pipeline produces signed artefacts in under 15 minutes.
- [ ] (Production) Auto-update check completes in background without blocking app launch.

### Business metrics
- Reduced support queries about "how do I access the tool" from non-technical volunteers.

## Milestones

| # | Milestone | Scope | Phase |
|---|-----------|-------|-------|
| M1 | Working dev build | `electron/main.ts` opens BrowserWindow loading hosted URL; runs locally via `npm run dev:electron` | Exploration |
| M2 | Unsigned distributable | `electron-builder` produces unsigned `.dmg` and `.exe`; installable via right-click-open / SmartScreen bypass | Exploration |
| M3 | Signed + notarized builds | Apple Developer ID + notarisation; Windows Authenticode; Gatekeeper/SmartScreen clears automatically | Production |
| M4 | Auto-update + CI pipeline | `electron-updater` wired to GitHub Releases; automated CI build/sign/publish | Production |
| M5 | Public release | Release notes, download page, version header in API requests | Production |

**Rollback plan:** The app is additive — the web app continues to work unchanged. If the desktop app has a critical bug, users are directed back to the browser URL. No server-side changes to revert.

## Rejected ideas

- **Tauri instead of Electron** — rejected because the team has no Rust experience, and the binary size saving is not a meaningful constraint for a charity desktop tool distributed once to a small audience.
- **Bundled frontend (Option B)** — rejected in favour of Option A; it adds build complexity and couples desktop releases to frontend releases with no meaningful benefit given always-online assumption.
- **Embedded NestJS / Docker (Direction B/C from exploration)** — rejected because always-online is confirmed; no local data services needed.

## Open questions

1. Who owns the Apple Developer Program account? (Blocks M3 — not needed for exploration.)
2. Should the desktop app eventually bundle the admin shell, or is web-only admin a permanent decision?
3. Is GitHub Releases the right distribution channel, or does the charity need a branded download page?

## References

- Explore doc: `docs/explore/2026-03-23-electron-desktop-app.md`
- Frontend ADR: `docs/adr/006-frontend.md`
- Frontend entry points: `projects/frontend/src/main.tsx`, `projects/frontend/src/api/client.ts`
- Vite configs: `projects/frontend/vite.config.ts`, `projects/frontend/vite.config.admin.ts`
- [electron-builder auto-update](https://www.electron.build/auto-update.html)
- [Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [electron-vite tooling](https://electron-vite.org/)

---

## PRD self-critique

- **Riskiest assumption:** That the Apple Developer certificate and notarisation process is straightforward and cheap. In practice, getting a charity's Developer ID set up, managing team accounts, and automating notarisation in CI has caught teams off-guard. If the charity doesn't have an Apple Developer account, M2 blocks until they do.
- **Most fragile part of the design:** Auto-update. `electron-updater` with GitHub Releases works well in theory, but the first end-to-end test (download → install → update → re-install) always surfaces edge cases around file permissions on Windows and macOS quarantine attributes. This should be the first thing tested in M3, not the last.
- **Highest long-term impact decision:** Whether the hosted URL is hardcoded or user-configurable. Hardcoding is simpler now but means every domain change (staging → prod, migration) requires a new release. A hidden developer settings screen (accessible via keyboard shortcut) could allow URL override without exposing it to regular users.
- **What's missing:** No decision yet on whether the desktop app targets charity staff only or is distributed publicly to people with macular degeneration. Public distribution changes the signing, privacy policy, and accessibility audit requirements significantly.
