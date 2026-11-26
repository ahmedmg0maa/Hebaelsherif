# Cloudflare Workers deployment

## Final active architecture

GitHub Free supplies source control and CI/CD. Cloudflare Workers Free hosts the full Next.js application through vinext; Cloudflare DNS/CDN supplies DNS, TLS and the included baseline protection. Supabase remains the only Postgres, Auth and Storage provider, with separate Free Production and Staging projects. Resend Free and Sentry Developer Free are provider integrations. Namecheap is the registrar for `hebaelsherif.com` only.

This is not a static export. App Router, React Server Components, Server Actions, route handlers, Supabase SSR cookies, AAL2 administration, bookings and protected delivery stay enabled.

## Local Worker contract

- Use Node 24.x and the pinned pnpm 10.13.1 for local/CI builds. The production runtime is Workers, not a Node server.
- `pnpm build:cloudflare:isolated` copies a temporary source mirror with every `.env*` excluded, shadows application configuration with inert values, runs `vinext build`, and produces ignored `dist/` output.
- `pnpm start:vinext` runs the generated Worker locally through Wrangler. `pnpm test:e2e:cloudflare` exercises the public desktop/mobile suite against that runtime.
- `wrangler.jsonc` has no secret values. Add production/staging values only as Cloudflare Worker Secrets and the matching Workers Builds secrets; `NEXT_PUBLIC_*` values required at build time belong in the corresponding protected build variables.
- Do not run `deploy:vinext` until the Staging gate and the consolidated owner setup request are complete.

## Environments and deployment

1. GitHub `main` is the only Production source. Use a protected `staging` branch or an approved preview deployment for Staging.
2. Build the exact commit in Workers Builds with Node 24.x. Run `pnpm build:vinext`; deploy the generated Worker, never `dist/`, `node_modules`, `.env`, logs, browser evidence, dumps or release archives from Git.
3. Staging uses a separate Supabase project and a temporary `workers.dev` URL or `staging.hebaelsherif.com`. Set `HEBA_DEPLOYMENT_ENV=staging` and both staging access secrets. The proxy then fails closed with HTTP Basic Auth and `X-Robots-Tag: noindex, nofollow`; `robots.txt` also disallows all crawling.
4. After controlled Staging acceptance, bind `hebaelsherif.com` to Production. Cloudflare redirects `www.hebaelsherif.com` permanently to the apex. Set the exact Production/Staging origins in Supabase Auth redirect allow-lists only after each origin responds over HTTPS.

## Workers Free constraints

Workers Free currently allows 100,000 requests/day, 10 ms CPU/request, 128 MB memory, 50 external subrequests/request, 64 variables of up to 5 KB, a 3 MB Worker bundle and a 100 MB inbound request body on the Cloudflare Free plan. Treat the daily limit as fail-closed for the authenticated application. Keep each request well below 50 Supabase/other external calls and move long/background work to Supabase-side scheduling where possible.

Files do not transit the Worker when they are large or costly to inspect. Protected books, course media, workshop files, payment proofs and administrative media use a server-authorized Supabase signed upload followed by a separately authorized server-side validation/finalization step. This preserves validation, audit, idempotency and private buckets while avoiding a Worker upload bottleneck. Staging must verify the actual Storage policies and end-to-end upload paths.

## Recovery and release gates

Take and verify a full logical Supabase backup plus isolated restore drill before any migration. Apply only the reviewed pending 044 → 047 migrations to the disposable Staging project, perform the database/Auth/RLS/RPC/booking/manual-payment/storage/admin/email/monitoring acceptance tests, then use the same accepted commit for Production after a fresh backup. Migrations are forward-only; source rollback does not replace a database recovery point.

External account, DNS, secret and provider actions are consolidated in [OWNER_CLOUDFLARE_SETUP_ONE_CONSOLIDATED_REQUEST.md](OWNER_CLOUDFLARE_SETUP_ONE_CONSOLIDATED_REQUEST.md).
