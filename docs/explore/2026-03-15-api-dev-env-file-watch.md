# Exploration: API start:dev auto-refresh on .env.secrets / .env.config change

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Make `npm run start:dev` in `projects/api` automatically restart the NestJS process when `.env.config` or `.env.secrets` changes, without requiring a manual `Ctrl+C` and restart.

---

## Problem interpretations

### Interpretation A: Developer friction during config iteration
When tuning env vars — adjusting RAG thresholds, toggling feature flags (`AUTH_ENABLED`, `PROMPT_GUARD_ENABLE`, `FOLLOWUP_SUGGESTIONS_ENABLED`), or updating API keys — the developer edits `.env.config` or `.env.secrets` and then has to manually kill and restart the dev server. This is a small but constant interrupt that breaks flow, especially when iterating on infrastructure config (Zitadel settings, LangWatch keys, model names).

### Interpretation B: Silent stale config bug
The developer edits `.env.secrets` (e.g. rotates `OPENAI_API_KEY`) and forgets to restart. The old key stays in `process.env` for the rest of the session. Requests fail in unexpected ways. This is easy to miss because there is no warning and no visible indicator that config is stale.

### Interpretation C: Env file structure complexity
The env files live at the project root (`../../` relative to `projects/api`), two levels above the NestJS source. The default `nest start --watch` watcher only covers `src/` within `projects/api/`. This structural mismatch means any watcher solution must explicitly reach outside the standard source root.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer (API) | Editing feature flags or API keys during a dev session | Manual `Ctrl+C` + `npm run start:dev` | Medium |
| Developer (API) | Rotating secrets (OPENAI_API_KEY, Zitadel audience) | Same — easy to forget | High (silent failures) |
| New contributor | Setting up env for the first time | Same | Low (one-off) |

---

## Why now

- Active development involves frequent env changes: Zitadel IDs change on every DB purge, model names are being evaluated, RAG thresholds are being tuned.
- The split env-file convention (`.env.config` committed, `.env.secrets` gitignored) adds a second file to watch compared to a single `.env`.
- The root-level location (outside `projects/api/`) means the issue will persist even if NestJS eventually adds better watch support for non-TS assets.

---

## Existing solutions

**Internal:**
- None. `nest-cli.json` has no `watchOptions`, no nodemon config exists, no chokidar usage. Config is loaded at process startup via top-level `dotenv.config()` calls in `config.service.ts`, `instrument.ts`, and `migrate.ts` — baked into `process.env` and never re-read.

**External:**
- **nodemon** — wraps the process, watches specified paths including non-TS files. Has a known bug with dotfiles (files named `.env` with no prefix): requires explicit `ext` config like `env` in the `ext` array and explicit `--watch` paths. Works well once configured but adds a dev dependency.
- **nest-cli.json `watchAssets`** — NestJS CLI supports a `watchAssets` flag and `assets` array, but this copies files into `dist/`, it does not trigger process restarts on arbitrary file changes outside `src/`.
- **chokidar-cli** — a thin CLI wrapper around chokidar; can watch files and execute commands. Could be used to run a restart signal alongside the NestJS process but requires process orchestration.
- **`fs.watch` in `main.ts`** — the app watches its own env files and calls `process.exit(0)` on change; relies on the surrounding dev runner to restart. Simple but couples the app code to dev tooling.
- **Makefile shell wrapper** — a `make api` target that uses a loop or `watchman`/`entr` to restart `nest start`. Zero new dependencies if `entr` is already installed; non-portable otherwise.

---

## Possible directions

### Direction A: nodemon wrapper
Add `nodemon.json` at `projects/api/` root. Configure it to watch `src/` for TS changes and `../../.env.config`, `../../.env.secrets` for env changes. Replace `start:dev` script with `nodemon`. Requires `nodemon` as a dev dependency and careful `ext` config to handle dotfiles.

### Direction B: nest-cli.json `watchOptions` + extraWatch
NestJS CLI `compilerOptions` supports a `plugins` and `assets` config but not arbitrary file watching. However, `nest start --watch` uses the TypeScript compiler watcher. An alternative: add a `chokidar-cli` side-process in the `start:dev` script using `&` and `wait` to run both watchers in parallel, sending `SIGUSR2` or restarting on env change. More complex orchestration.

### Direction C: Makefile `make api` with `entr`
Rewrite the `make api` target to use `entr` (or `watchman`) to watch the two env files and restart `nest start --watch`. Zero new npm dependencies. `entr` is available via Homebrew but is not cross-platform without extra setup.

### Direction D: Self-watching main.ts (fs.watch)
In `main.ts`, after bootstrap, add a `fs.watch` on both env files that calls `process.exit(0)`. The NestJS dev runner (webpack watcher) sees the process exit and restarts it. No new dependencies; however, it ties production-adjacent bootstrap code to dev behaviour (mitigated by a `NODE_ENV` guard).

---

## Hard problems

- **Dotfile watching quirk**: nodemon and some fs watchers do not watch files named `.env` (dotfiles with no extension) by default. Requires explicit `ext: ['env']` or `--ext env` — easy to misconfigure and silently not work.
- **Root-level path**: env files are two levels above `projects/api/`. Relative paths in nodemon/chokidar configs must be tested carefully; absolute paths are fragile across machines.
- **Double watcher interaction**: Running nodemon *around* `nest start --watch` (which already has its own TypeScript watcher) can cause conflicts — nodemon restarts the whole process while the inner tsc watcher is mid-compile. Need to either replace `--watch` with a plain `nest start` inside nodemon, or use nodemon only for env files and let NestJS handle TS watching.
- **Config re-read on restart**: The current architecture reads env at module import time (top-level `config()` calls). A full process restart is required — no hot reload of env is possible. This is fine for a full restart but means partial solutions (e.g. re-calling `config()` without restart) will not work.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does `nest start --watch` restart cleanly when the outer process exits? | Direction D relies on the tsc watcher surviving a clean `process.exit(0)` and relaunching | Test locally: exit main.ts manually and observe behaviour |
| Does nodemon handle `../../.env.secrets` (relative upward paths) reliably on macOS? | Direction A depends on this | Write a minimal `nodemon.json` and test with a real file change |
| Will running nodemon *around* `nest start --watch` cause double-restart loops? | A restart from nodemon could also trigger the TS watcher | Test: introduce a nodemon config that runs `nest start` (not `--watch`) and confirm single restart |
| Is `entr` available in the team's dev environment? | Determines viability of Direction C | Check Brewfile / onboarding docs |

---

## Promising direction

**Direction A (nodemon)** — low friction, well-understood tooling, solves both the dotfile path and the double-watcher problem cleanly if configured to run `nest start` (without `--watch`) inside nodemon.

nodemon is already widely used with NestJS dev stacks, handles dotfile watching once `ext` is configured, and keeps the solution inside `projects/api/` without touching `main.ts` or the Makefile. The main risk — double-watcher interaction — is avoided by running `nest start` (no `--watch` flag) inside nodemon, letting nodemon own the restart loop entirely.
