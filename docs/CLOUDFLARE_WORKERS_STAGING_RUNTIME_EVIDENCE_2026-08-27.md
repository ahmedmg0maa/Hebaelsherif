# Cloudflare Workers Staging runtime evidence — 2026-08-27

## Decision

`LOCAL WORKER PARITY PASS — REMOTE STAGING CURRENT RELEASE UNVERIFIED`

No Worker was deployed, no GitHub integration was changed, and no DNS, route, nameserver, Cloudflare secret or Production setting was modified in this programme.

## Current source identity

| Item | Evidence |
|---|---|
| Branch | `codex/master-merge-2026-08-27` |
| Baseline HEAD | `57820ab09e10d8dda94f7db1bf66ec5bb5a23e15` |
| Remote | owner repository `ahmedmg0maa/Heba` |
| Current Code X changes | local owner-preserving branch state, not published; therefore no remote deployment can be claimed for it |

## Project-derived Worker contract

| Setting | Actual source value |
|---|---|
| Root Worker name | `heba-elsherif-platform` |
| Staging Worker name | `heba-elsherif-platform-staging` |
| Compatibility date | `2026-08-26` |
| Compatibility flags | `nodejs_compat` |
| Runtime entry | `vinext/server/fetch-handler` |
| Binding | generated static `ASSETS` binding only |
| Build | `pnpm build:cloudflare:isolated` → `vinext build` |
| Local runtime | `pnpm start:vinext` → Wrangler against generated `dist/server/wrangler.json` |
| Full Worker browser gate | `pnpm test:e2e:cloudflare` |

Wrangler `4.126.0` was used. The isolated builder copied source into a disposable directory, excluded `.env*`, build/test/release/cache/archive/backup paths, cleared public/server Supabase values and prepared `dist/` without inheriting a real project.

## Executed evidence

| Check | Result |
|---|---|
| vinext RSC/server/client/SSR build | `PASS-local` |
| Route handlers, Server Components and protected route compilation | `PASS-local`; 62 generated Next pages and corresponding vinext routes |
| Desktop Chromium on Worker runtime | `26/26 PASS` |
| Pixel 7 mobile profile on Worker runtime | `26/26 PASS` |
| Public route, RTL, dark theme, no-overflow, reduced-motion, auth/admin denial, draft legal noindex | `PASS-local` |
| Search and Admin-governed start journey | `PASS-local` |

The first Worker run correctly failed two start-journey keyboard assertions because the test pressed Enter before vinext client hydration completed. The component now exposes a DOM readiness signal set only by its client effect; the test waits for that signal rather than accepting a retry. Type-check, lint, the source contract and the full rebuilt Worker suite then passed **52/52** with retries disabled.

## Remote Staging gaps

- the current branch/worktree is not published by owner instruction;
- the historical protected Worker deployment is not this current source state;
- the separate Supabase Staging project is not connected and no Staging environment values are present in the executor;
- Basic Auth rotation, current deployment ID/commit, GitHub Workers Builds, runtime logs and source-map inspection are unverified for this release;
- live Auth/Admin/dashboard/booking/payment/Storage/email/Sentry journeys cannot be accepted from a credential-empty local Worker.

Therefore no `STAGING ACCEPTED` claim is made.
