# Exploration: Zitadel Login Page Branding via API Script

> Stage: Explore | Date: 2026-03-09
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Apply Macular Society brand colours and logo to the Zitadel-hosted login page via an idempotent shell script (matching the `setup-zitadel.sh` pattern), rather than manually configuring branding through the Zitadel admin console.

## Problem interpretations

### Interpretation A: Developer experience / reproducibility

The Zitadel instance is ephemeral (purged and re-run as part of dev setup). Every time `setup-zitadel.sh` is re-run, branding reverts to default. If branding configuration lives only in the console UI it must be redone manually on each reset. The problem is **operational friction and configuration drift** — what runs locally may look different from staging or production.

### Interpretation B: Brand trust for admin staff

Admin users (Macular Society staff) encounter the Zitadel login page when accessing the admin panel at `localhost:5174`. A jarring visual context-switch — from the app's blue MUI theme to Zitadel's default purple/green — could undermine trust or cause confusion, especially for less technical staff. The problem is **perceived inconsistency** making the tool feel unfinished or unofficial.

### Interpretation C: Accessibility continuity

The app is built for users with macular degeneration: high contrast, clear colour choices, screen-reader-friendly layouts. Zitadel's default login page may not share those accessibility properties (contrast ratios, font sizes, semantic structure). Admin staff may themselves have accessibility needs, or the login page may be tested by the same screen-reader users who use the chat. The problem is **accessibility continuity** — the auth flow is outside our control and may fail WCAG standards.

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Developer | Re-runs `setup-zitadel.sh` after DB purge | Manually re-applies branding in Zitadel console | Low–Med |
| Macular Society admin staff | Logs into admin panel for first time | Accepts the visual mismatch | Low |
| DevOps / staging deployment | Sets up a new environment | Manual console step not documented or scripted | Med |
| Screen-reader user (if admin) | Navigates Zitadel login form | Relies on Zitadel's own a11y (unknown quality) | Med–High |

## Why now

- The `setup-zitadel.sh` pattern is already established and working — extending it is low-friction.
- A second environment (staging or prod) is a likely near-term step; scriptable branding prevents manual drift between environments.
- Zitadel's Management API has stable, well-documented label policy endpoints (`PUT /management/v1/policies/label`, `POST /management/v1/policies/label/activate`) — no API instability risk.
- The app's MUI theme colours are already defined (`primary: #1976d2`, `background: #fafafa`) — token extraction is trivial.

## Existing solutions

**Internal:**
- `setup-zitadel.sh` establishes the PAT extraction, `api()` helper, and idempotency pattern already — a branding script would reuse all of it.
- No branding configuration exists anywhere in the codebase yet.

**External:**
- **Zitadel Label Policy API** — `PUT /management/v1/policies/label` accepts `primaryColor`, `backgroundColor`, `fontColor`, `warnColor` (plus dark-mode variants) and `disableWatermark`. Logo/icon upload is a separate multipart `POST`. Must call `POST .../activate` after any change or it stays in preview.
- **Zitadel Custom Login UI** — a full replacement built with Next.js + Zitadel's Session API. Full pixel control but requires a backend, implements all auth flows (password, MFA, passkeys, reset), and carries significant maintenance overhead.
- **Admin console manual config** — works but not scriptable, not reproducible, and undocumented.

## Possible directions

### Direction A: `setup-zitadel-branding.sh` — label policy API script

A standalone, idempotent shell script that mirrors `setup-zitadel.sh`'s structure. Calls `PUT /management/v1/policies/label` with the app's brand colours, optionally uploads a logo via multipart `POST`, then activates with `POST .../activate`. Could be called from `setup-zitadel.sh` directly or run standalone. Scope: ~1–2 hours.

### Direction B: Extend `setup-zitadel.sh` with a branding section

Rather than a separate script, add a "branding" section at the end of the existing setup script. Simpler to maintain (one script, one PAT extraction), but conflates setup concerns. Scope: same as Direction A.

### Direction C: Custom Login UI

Replace Zitadel's hosted login entirely with a Next.js app using Zitadel's Session API. Full control over appearance and accessibility. Requires a backend service, full auth flow implementation (login, register, MFA, password reset), and ongoing maintenance. Scope: 2–4 weeks minimum.

### Direction D: Accept mismatch, document manual step

Do nothing automated. Document the branding steps in `docs/AUTH_ZITADEL.md` as a post-setup checklist item. Zero engineering cost, but fragile across environments and re-setups.

## Hard problems

- **Logo upload is multipart, not JSON** — the `api()` helper in the setup script uses `Content-Type: application/json`. Logo upload requires a separate `curl` invocation with `-F` and the logo file path. Scripting this gracefully (file-not-found handling, skip if no logo) adds a small amount of complexity.
- **Activate step is mandatory and easy to forget** — Zitadel puts all label changes in "preview" until `POST .../activate` is called. If the script exits early or the activate call is skipped, branding silently does not apply.
- **Dark mode variants** — Zitadel supports separate colour sets for light and dark themes. The current MUI app has no dark mode. Providing only light colours means dark-mode Zitadel users see the default dark palette, not a branded one. A non-issue if admin users are unlikely to use OS dark mode, but worth noting.
- **Accessibility of Zitadel's login HTML** — scriptable branding only controls colours and logo, not the DOM structure, ARIA attributes, or font sizes of the Zitadel login page. If the login page has accessibility gaps, they are not solvable via the label policy API.

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Does Zitadel's hosted login meet WCAG 2.1 AA? | Admin staff or testers may have accessibility needs; Interpretation C depends on this | Run axe-core against the Zitadel login page; check Zitadel GitHub for a11y issues |
| What is the Macular Society's exact brand colour palette? | The MUI app uses MUI defaults (`#1976d2`), not necessarily official MS brand colours | Check with client or any existing brand guidelines document |
| Will a logo file be available in the repo or CI? | Logo upload in the script requires a local file path | Confirm with client; decide whether to embed SVG or reference a URL |
| Does branding scope to the org or the whole instance? | If org-scoped, the login page only shows branding when the org scope is passed in the auth request | Test with and without `urn:zitadel:iam:org:domain:primary:` scope in the authorize URL |

## Promising direction

**Direction A** — separate `setup-zitadel-branding.sh` script.

Reusing the existing PAT + `api()` pattern, the branding script is a small, isolated piece of work (1–2 hours) that solves the reproducibility and visual drift problems without coupling branding concerns to the core auth setup. It can be re-run safely after any environment reset. Direction C (custom login UI) is disproportionate for a charity admin tool used by a handful of staff; Direction D leaves an undocumented manual gap. The accessibility unknown (Zitadel's own HTML quality) is the only caveat — if that turns out to be a real gap, it is not solvable by any of these directions short of Direction C.
