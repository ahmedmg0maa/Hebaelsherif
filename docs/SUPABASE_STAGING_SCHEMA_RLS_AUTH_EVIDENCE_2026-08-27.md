# Supabase Staging schema, RLS and Auth evidence — 2026-08-27

## Decision

`ENVIRONMENT-BLOCKED — SUPABASE STAGING NOT ACCEPTED`

This record covers the current Code X worktree only. It does not convert historical Production or Staging notes into current acceptance evidence. The Management API project inventory was read in sanitized form; no database, Auth, Storage, migration or provider setting was written during this programme.

## Environment identity and recovery gate

| Check | Result | Evidence boundary |
|---|---|---|
| Production project | `PASS — management metadata only` | exactly one healthy accessible project matches full authorized ref `zfbwpubsnuijybxjuidc`; URL/account ID/credentials were not emitted |
| Separate Staging project | `STAGING EXTERNAL GATE` | no non-Production project is currently accessible; a new isolated Staging project must be created before provider migrations or live tests |
| Production logical-backup source | `BLOCKED` | `HEBA_LAUNCH_PRODUCTION_DATABASE_URL` is absent from the Process, Windows User and Windows Machine scopes visible to this executor; no connection was attempted |
| Full logical backup | `not-run-by-design` | fail-closed runner must not connect without the secure executor-only source |
| Isolated restore drill | `not-run-by-design` | cannot start before the logical backup source exists |
| Disposable Supabase restore capacity | `AVAILABLE / DEFERRED` | only Production remains active; the owner deferred the drill and no target was created |
| Staging recovery point | `unverified` | no provider or restored target evidence in this execution |

## Source-level migration evidence

| Contract | Result | Command/evidence |
|---|---|---|
| Sequential source migrations 000–060 | `PASS-local` | `pnpm audit:db` |
| Recovery runner read-only/isolation contract | `PASS-local` | `pnpm verify:recovery-runner-local`; Production identity, Session pooler/5432, `default_transaction_read_only=on`, pre-target preflight and generated-target routing are source-asserted |
| Mandatory booking order 044 → 045 → 046 → 047 | `PASS-local` | `pnpm verify:booking-staging-contract` |
| Sanitized pre/post contract fixtures | `PASS-local` | `pnpm verify:booking-staging-contract-fixtures` |
| 043 protected-delivery source contracts | `PASS-local` | `pnpm verify:delivery-local`, database/media/security audits |
| 044/045 hold, expiry, duplicate denial, cancellation/reschedule and Cairo-time contract | `PASS-local` | `pnpm verify:booking-local`, `pnpm verify:booking-permissions-local` |
| 048 Contact validation/consent/throttling/direct-write revocation/Admin atomicity | `PASS-local` | `pnpm verify:contact-governance-local`, `pnpm audit:db`, `pnpm audit:security` |
| 049 Testimonial paid-source verification/publication consent/public RLS/Admin atomicity | `PASS-local` | `pnpm verify:testimonial-governance-local`, `pnpm audit:db`, public E2E |
| 050 Press source classification/rights-aware publish/schedule/permissioned atomic CRUD | `PASS-local` | `pnpm verify:press-governance-local`, `pnpm verify:home-cms-local`, public E2E |
| 051 Resource Hub accessible media/rights/published-related gates/schedule/atomic CRUD | `PASS-local` | `pnpm verify:resource-hub-local`, `pnpm verify:public-search-local`, public E2E |
| 052 Guided assessment immutable versions/safe mapping/atomic publication/answer non-persistence | `PASS-local` | `pnpm verify:guided-assessment-local`, `pnpm verify:start-here-cms-local`, public E2E |
| 053 Programme readiness/bundle composition/VIP-plan parity/free-resource consumer/atomic publication | `PASS-local` | `pnpm verify:program-catalog-local`, `pnpm verify:catalog-publication-local`, public E2E |
| 054 Media archive/restore/compatible replacement/public denial/atomic permission and audit | `PASS-local` | `pnpm verify:media-lifecycle-local`, `pnpm audit:media`, `pnpm verify:catalog-publication-local` |
| 055 Newsletter explicit consent/throttled service intake/hashed unsubscribe/Admin lifecycle atomicity | `PASS-local` | `pnpm verify:newsletter-governance-local`, `pnpm audit:db`, public E2E |
| 056 Admin security live/local evidence separation/aggregate provider probes/atomic own-session revocation | `PASS-local` | `pnpm verify:admin-security-center-local`, `pnpm audit:admin`, `pnpm audit:security` |
| 057 Atomic operational settings/governed outbox claim-finalize/Worker-safe idempotent Resend adapter | `PASS-local` | `pnpm verify:resend-outbox-local`, `pnpm audit:db`, `pnpm audit:security`, Worker E2E |
| 058 Bounded/audited Customer 360 reads and atomic recoverable note/tag lifecycle | `PASS-local` | `pnpm verify:customer-360-local`, `pnpm audit:db`, `pnpm audit:admin`, Worker E2E |
| 059 Atomic permission-scoped/idempotent Admin notification delivery and content-free audit | `PASS-local` | `pnpm verify:admin-notifications-local`, `pnpm audit:db`, `pnpm audit:admin`, Worker E2E |
| 060 Owner-only bounded role reads and atomic race-safe role/permission governance | `PASS-local` | `pnpm verify:admin-role-governance-local`, `pnpm verify:fresh-admin-assurance`, `pnpm audit:db`, `pnpm audit:admin`, Worker E2E |

Fixture success is not a live schema fingerprint. It proves the validator rejects the wrong grants/policies/order; it does not prove that the provider schema matches those fixtures.

## Required Staging probes not yet run

- fresh pre-043 and post-043 schema fingerprints against the separate Staging target;
- recovery checksum, restore integrity, RPO/RTO and named restore owner;
- 044 → 045 → 046 → 047 application on Staging only;
- real anonymous/authenticated/customer/Admin RLS matrix and RPC grant-denial probes;
- two disposable users for row isolation, booking race, checkout idempotency, proof review and entitlement revocation;
- private Storage upload/finalize/MIME/magic/range/signed-URL/device/concurrency tests;
- Staging Site URL and exact redirect allow-list;
- disposable Admin enrollment outside chat, AAL1 denial, TOTP AAL2/fresh assurance, session expiry and audit.

## Safety conclusion

Production remains untouched and 043 must not be reapplied. Migrations 044–047 remain unapplied in this execution. Migrations 048–060 are additive development-first Contact, Testimonials, Press, Resource Hub, guided-assessment, governed-programme, media-lifecycle, newsletter-consent, Admin-security, operational-email, Customer-360, governed-notification and atomic role-governance contracts authored locally after 047 and are also unapplied; any provider application must preserve the full 044→060 order and requires the ordered Staging gate. Later local migrations do not authorize provider writes.

## Exact unblock

`STAGING EXTERNAL GATE`: when resumed, collect the rotated **Session pooler** password only through the hidden runner, prove the Production session is read-only, create/delete a uniquely identified disposable restore target, then create a new separate Staging project with no copied customer data before baseline fingerprinting or 044–047 application. This gate is intentionally deferred and does not stop local product development.
