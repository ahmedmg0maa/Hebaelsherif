# Heba ElSherif — Launch Development Roadmap (August 2026)

## Product outcome

Launch one Arabic-first platform that communicates Heba's real methodology, lets the owner operate the business without developer intervention, protects paid access and customer data, and remains observable and recoverable in production. Security protects access and deters leakage; it cannot prevent a customer from recording a screen.

## Operating rules

- Production contains no fabricated products, proof, urgency, reviews, metrics, payment accounts, or qualifications.
- A public action is backed by a permission-checked server action, validation, audit event, and clear user feedback.
- Migrations are additive and forward-only. Every P0/P1 migration documents indexes, RLS, compatibility, and rollback guidance.
- The approved teal/aqua/ivory/sand palette is authoritative. Do not substitute an unrelated portrait for Heba.
- Completion evidence is a passing command or controlled live verification, never a historical report alone.

## Delivery sequence

| Cycle | Priority | Outcome and exit evidence |
| --- | --- | --- |
| 0. Security reset | P0 | Replace leaked legacy server credential with a revocable `sb_secret` key; expire old admin sessions; enable two dashboard TOTP factors; verify clean release scan and a recoverable backup. |
| 1. Admin assurance | P0 | Password-first `/auth/admin`, TOTP enrollment/challenge, AAL2 enforcement at UI/server/RLS, rate limiting, session inventory/revocation, reauthentication for destructive/high-value actions. |
| 2. Protected delivery | P0/P1 | Private books/resources, 60–120 second on-demand URLs, no-store responses, revocation/download logging and limits, upload validation, signed video playback with session/device controls. |
| 3. Business truth | P1 | Cairo-timezone reports with health states, reconciliation, permissioned CSV/XLSX exports, coupon/offer profitability and consent-safe events. |
| 4. Brand and public journey | P1 | Refined approved logo system and palette; home journey from recognition to safe next step; factual catalog, accessible mobile navigation, real search and conversion states. |
| 5. Owner operating system | P1 | Today queue, quick actions, searchable selections, drafts/revisions/preview, saved filters and safe bulk workflows; least-privilege role reviews. |
| 6. Commerce and booking review | P1 | Repeat checkout/coupon/approval/refund/booking races, reconciliation report, policy consistency and failure-safe payment configuration. |
| 7. CRM/privacy completion | P1 | Scanner-safe unsubscribe lifecycle, retention/deletion procedure, consent logs, idempotent outbox/templates and bounce handling when a provider is configured. |
| 8. Discoverability and quality | P1 | Structured SEO, truthful sitemap/metadata, performance budgets, WCAG AA and keyboard/axe coverage. |
| 9. Launch operations | P0 launch gate | Monitoring/alerts, incident and restore rehearsal, deployment rollback, full desktop/mobile E2E and a clean immutable release archive. |

## Cycle 0 — immediate security reset

### Repository actions

- Prefer `SUPABASE_SECRET_KEY` for all server-only work, retaining `SUPABASE_SERVICE_ROLE_KEY` only as a temporary local compatibility fallback during cutover.
- Keep `.env*` and `supabase/.temp` excluded from tracking and release archives; scan both source and the generated archive.
- Disable public production source maps and apply CSP, HSTS, frame, MIME, referrer, and permissions headers.
- Record only configured/missing secret state, never a value, fingerprint, length, or project connection string.

### Dashboard and hosting runbook

1. In Supabase **Settings → API Keys**, create a named `sb_secret` key for the Production Worker. Add it only to the protected Cloudflare Production Worker Secret, then deploy and run live privileged verification.
2. Confirm every server runtime uses the new key. Delete the compromised legacy `service_role` key only after successful verification; remove its Cloudflare/local environment entry.
3. Change the owner/admin password, revoke active Auth sessions, and enable two independent TOTP factors on the Supabase account. These are dashboard-account controls, distinct from application-user MFA.
4. In **Database → Backups**, retain or enable daily physical backups and produce a documented restore rehearsal in an isolated duplicate/branch. Storage objects require a separate preservation check because database restoration does not recreate deleted Storage objects.

### Exit criteria

- `pnpm audit:security`, `pnpm package:release`, and the generated archive scan pass.
- A newly issued server secret works in deployment; the compromised legacy key is deleted; no client bundle references either elevated variable.
- A restoration rehearsal is timestamped in the restricted operational record; no production restore is attempted merely as a test.

## Cycle 1 — admin MFA and sessions

- Build Supabase TOTP enrollment, two-factor challenge, and factor management at `/auth/admin/mfa`.
- Require AAL2 for every privileged route, server action, and restrictive RLS policy; provide a redirect to challenge rather than silently downgrading access.
- Add 30-minute idle and 8-hour absolute admin-session limits, an expiry warning, device/session inventory, remote revoke, revoke-all, and generic login errors.
- Rate-limit account/IP attempts with progressive cooldown and audit only privacy-minimized device/network fingerprints.
- Require a fresh AAL2 confirmation for payment settings, owner grant, customer export, material refund, password/email change, and destructive operations.

## Cycle 2 — content and upload protection

- Enforce private buckets for paid books, course assets, and workshop delivery. Generate download/playback URLs only at the click boundary after entitlement/revocation/expiry checks.
- Store download/watch security events with a short-lived opaque session identifier and privacy-minimized network/device data; add account suspension and immediate session revocation.
- Limit book downloads and add an owner-approved, traceable PDF watermark pipeline before making watermark claims. HLS tokenization, one concurrent watching session, and a two-device ceiling precede any DRM evaluation.
- Verify binary signature/MIME, extension allowlists, UUID names, size limits, quarantine/scan hooks, and no executable public-upload path.

## Cycles 3–9 — detailed acceptance slices

### Business truth and marketing

Use one Cairo-timezone reporting query layer. Separate gross collected, pending review, refunds, and net; show a system-health error instead of zero on query failure. Exports must enforce `reports.export`, log actor/filters/time, neutralize spreadsheet formulas, omit private notes, and support CSV then XLSX. Coupon redemption stays atomic at successful payment approval; reports expose scope, usage, discount cost, and net effect. Record only consent-safe UTM and funnel events.

### Brand, public experience, and owner operation

Preserve the seed mark and move all visual roles to `#2F6173`, `#5CB7B4`, `#D8C3A5`, and `#F5F0E7`, with accessible ink and a separate danger role. Each public screen has one clear visual concept, reduced motion, actual content/empty/error states, keyboard access, and no newsletter promise while outbound email is disabled. The admin overview prioritizes today’s work; forms use names rather than IDs, media pickers rather than paths, revisions/preview, filtering, and permission-scoped bulk actions.

### Commerce, CRM, SEO, and launch

Run recurring controlled race tests for checkout, coupon, proof approval, refunds, seat capacity, and credits. Complete privacy retention/erasure procedures and provider adapter retries before enabling email. Finish canonical metadata, JSON-LD only for real entities, sitemap/redirects, LCP/CLS/INP budgets, axe smoke tests, monitoring alerts, rollback drill, and release rehearsal.

## Deferred intentionally

DRM, risk-based authentication, anomaly scoring, advanced segmentation, A/B testing, and marketing automation remain P2 until production evidence justifies their cost and operational burden.
