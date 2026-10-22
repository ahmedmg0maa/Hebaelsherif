# Cloudflare Workers compatibility spike — 2026-08-26

## Scope and isolation

This spike runs only on branch `codex/cloudflare-compatibility-spike`; it does not deploy, authenticate to Cloudflare, change DNS, connect a repository, read secrets, or alter Supabase/Namecheap/Production.

## Evidence

- Runtime source: Next 16.2.10 with App Router, React Server Components, Server Actions, route handlers, `src/proxy.ts`, Supabase SSR cookies, private signed redirects and local `next/image` use.
- Official `pnpx vinext check` found all detected application imports/configuration compatible. Its initial 90% score counted retired CommonJS and ignored recovery/release artifacts; the active Next source had no application-level unsupported import.
- `pnpx vinext init --platform=cloudflare` completed non-destructively on this branch. It added vinext beta, Vite, Wrangler, a Vite config and `wrangler.jsonc`; ordinary Next development/build paths remain available.
- `pnpm build:cloudflare:isolated` passed. The builder excludes all `.env*` paths, uses inert configuration values, and builds all Workers client/RSC/SSR outputs.
- Wrangler local Worker smoke requests returned 200 for `/`, `/robots.txt` and `/_next/image`; anonymous `/admin` returned 307 to the protected admin entry. CSP, HSTS and `nosniff` are emitted from the Worker proxy after a vinext runtime check showed that relying on `next.config` headers alone was insufficient.

## Compatibility assessment

| Capability | Result | Notes |
| --- | --- | --- |
| RSC, SSR, Server Actions, route handlers, proxy | locally compatible | vinext build emits the Workers RSC/SSR runtime and protected redirects work locally. |
| Cookies/HttpOnly Supabase SSR/Auth/MFA/RBAC | source-compatible, live-unverified | Web-standard cookies and proxy code build; controlled Staging is required for real Auth/AAL2/RBAC evidence. |
| Security headers/CSP | locally compatible | enforced in `src/proxy.ts` and smoke-checked in Wrangler. |
| Signed URLs, private PDF/video delivery, response streaming | source-compatible, live-unverified | Delivery sends short-lived Supabase signed redirects, rather than proxying file bodies through the Worker. |
| Image optimization | locally compatible | local `/_next/image` returned a PNG; Cloudflare image transformation behavior remains a Staging check. |
| Node APIs/native binaries | compatible for current application source | no active application dependency on filesystem, subprocesses, native modules or a Node server. Workers Node compatibility is enabled by the configured runtime compatibility date/flag. |
| Multipart/file uploads | locally compatible, live-unverified | protected delivery, payment proofs and administrative media now upload browser → signed Supabase URL, then call a separately authorized server-side finalization step for validation/audit/indexing. The Worker never receives those file bodies. Controlled Staging must exercise the live Storage policies and signed tokens. |

## OpenNext fallback

OpenNext is not selected now because vinext built the active Next 16 application and Cloudflare documents vinext as the recommended new path. If a Staging-only vinext regression appears, evaluate the official OpenNext adapter with `nodejs_compat`; it documents support for App Router, RSC, Server Actions, route handlers, middleware, ISR, streaming and image optimization. No static export fallback is permitted.

## Decision

**Conditional local compatibility established; Staging remains required.** The remaining external gates are backup/restore proof, a separate Supabase Staging project, controlled Auth/RLS/booking/payment/provider tests, legal/content approval, and the single consolidated Cloudflare setup action.
