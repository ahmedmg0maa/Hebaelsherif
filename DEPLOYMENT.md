# Deployment Guide — Heba ElSherif Platform

## Requirements

- Node `24.x`
- pnpm `10.13.1` (via corepack)
- No `package-lock.json` — the project uses `pnpm-lock.yaml` only.

## Vercel

`vercel.json` is already configured:

```json
"installCommand": "corepack enable && corepack prepare pnpm@10.13.1 --activate && pnpm install --frozen-lockfile"
```

Notes:

- The lockfile is complete and verified with `pnpm install --frozen-lockfile` locally, so the previous `--no-frozen-lockfile` recovery step is no longer needed.
- Never switch the install command back to `npm install` / `npm ci` (historic `npm error Exit handler never called!` failure).
- Framework preset: Next.js. Region: `fra1`.

## Environment variables (Vercel → Project Settings)

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Admin API routes (never expose to browser) |
| `NEXT_PUBLIC_APP_URL` | client + server | Canonical site URL |
| `ADMIN_SETUP_SECRET` | server only | One-time admin seeding via `/api/admin/seed-admin` |
| `NEXT_PUBLIC_PAYMENT_INSTAPAY` / `NEXT_PUBLIC_PAYMENT_WALLET` / `NEXT_PUBLIC_PAYMENT_BANK` | client | Payment display info |

## Pre-deploy verification

```bash
pnpm install --frozen-lockfile
pnpm run check:deploy
```

`check:deploy` runs: type-check → lint → build → audit:ux → audit:routes → audit:v6 → audit:launch. All must pass before deploying.

## Supabase migrations

Apply migrations in order (`supabase/migrations/0001` → `0009`) with `supabase migration up` or `supabase db push`. Two historic failure modes are fixed in the shipped files:

1. `0003`: `slot_range` is trigger-maintained (not a generated column) because `tstzrange(timestamptz, ...)` is not immutable.
2. `0009`: enum columns are compared as `::text` in the revenue report view because `payment_status` has no `'paid'` value.

See `SUPABASE_SETUP.md` and `docs/V6_INCIDENTS_AND_RECOVERY_PLAN.md` for details.

## Admin bootstrap

1. Register the owner account through `/auth/register`.
2. Call `POST /api/admin/seed-admin` with header `x-admin-setup-secret: <ADMIN_SETUP_SECRET>` and body `{ "email": "<owner email>" }`.
3. Remove or rotate `ADMIN_SETUP_SECRET` after seeding.
