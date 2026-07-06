# V7.9.0 Production Hardening Report

## Required gates

- `pnpm install --frozen-lockfile`
- `pnpm run type-check`
- `pnpm run lint`
- `pnpm run build`
- `pnpm run check:deploy`
- `supabase db push` on staging

## Hardening rules

- No package-lock.json.
- No active Firebase code.
- No placeholders.
- No blank dashboard.
- No public private files.
- No unprotected admin mutations.
