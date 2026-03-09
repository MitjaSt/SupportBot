# Frontend

Two separate Vite apps built from the same codebase.

## Apps

| App | URL (dev) | Entry | Who uses it |
|-----|-----------|-------|-------------|
| Chat | http://localhost:5173 | `index.html` → `src/main.tsx` | Public users |
| Admin | http://localhost:5174 | `admin.html` → `src/admin.main.tsx` | Authenticated staff |

The chat app is public — no login required. The admin app requires a Zitadel account with the appropriate role.

## Dev

```bash
# Run both simultaneously (two terminals)
npm run dev:chat    # http://localhost:5173
npm run dev:admin   # http://localhost:5174
```

### Admin app setup (first time)

1. Run `docker/setup-zitadel.sh` — note the **Frontend app Client ID** in the output.
2. Create `projects/frontend/.env.local` (see `.env.local.example`):
   ```
   VITE_ZITADEL_ISSUER=http://localhost:8080
   VITE_ZITADEL_CLIENT_ID=<client_id_from_step_1>
   VITE_ZITADEL_REDIRECT_URI=http://localhost:5174/callback
   VITE_ZITADEL_POST_LOGOUT_URI=http://localhost:5174
   ```
3. Start the admin dev server: `npm run dev:admin`
4. Navigate to http://localhost:5174 — login redirects to Zitadel automatically.

> Re-running `setup-zitadel.sh` recreates the Frontend app and generates a new client ID.
> Update `VITE_ZITADEL_CLIENT_ID` in `.env.local` after each re-run.

## Build

```bash
npm run build          # Builds both apps
npm run build:chat     # Chat only  → dist/
npm run build:admin    # Admin only → dist/admin/
```

In production, nginx routes `/admin/*` to `dist/admin/admin.html` and everything else to `dist/index.html`.

## Other commands

```bash
npm run typecheck   # TypeScript check (no emit)
npm run lint        # ESLint
```
