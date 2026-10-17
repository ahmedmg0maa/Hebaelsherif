# Connected launch execution — 2026-10-17

Target repository: `ahmedmg0maa/Hebaelsherif`, branch `prepare-cream-motion`.
Target database: `zfbwpubsnuijybxjuidc`. Cost mode must remain `free`.

## Verified before changes

- Git remote and active GitHub identity match the requested account; push dry-run succeeded. Existing uncommitted `scripts/setup-owner.mjs` is preserved.
- Dependencies copied into this checkout were unusable. Restore them with Corepack pnpm and the existing frozen lockfile; do not upgrade packages.
- Production/free flags and the expected verified Resend sender are configured locally. Values and credentials are excluded from this report and Git.
- Supabase is healthy. Migration history contains exactly 000–043; 096 was applied manually without its history entry. All seven 096 function bodies match source, including the owner exception and staff MFA enforcement.
- The prior schema review has incorrectly decoded Arabic strings in eight function definitions and the books author default. The current baseline was reviewed against those differences; do not use the old file hash as evidence that the live schema is identical.
- Auth still pointed at localhost, redirect allow-list was empty, and custom SMTP was absent at preflight. These require connected production configuration.
- There were no bookings, orders, services, or Storage objects. Auth contained the existing owner account. No operational offering or availability may be fabricated to make launch appear complete.
- The domain served an older site. A browser visit does not establish that this branch is deployed.

## Recovery and migration evidence

Private recovery material is in the ignored `.launch-backups/preflight-2026-10-17/` directory. It includes a consistent JSON data snapshot of 119 tables, catalog definitions, Auth configuration, role metadata, and a PostgreSQL custom-format dump for public, auth, storage, and migration history. There were no Storage object bytes to export.

- Dump SHA-256: `a967568fe1fee0ca90066460d51c1f355efc6caa15ec261dfb8b4d9818cbeb91`.
- A real production transactional rehearsal of the 58 unapplied migrations succeeded and rolled back. Catalog definitions and migration history remained identical afterwards.
- Reconciliation must skip executing 096, retain its source in migration-history metadata only, and restore the 096 readiness function after 056. Changes and history entries must commit atomically after the restore drill passes.
- Full restore passed in isolated PostgreSQL 17; all 119 table counts matched (340 rows). The restored real data then upgraded successfully locally.
- Production reconciliation committed atomically. History now contains 000–102, including the metadata-only 096 entry. The manually applied 096 DDL was not repeated.
- Read-only `launch:check` and `admin:check` now pass. Production Auth URLs and exact callback destinations are configured; Resend TLS SMTP is saved and was exercised using a disposable mailbox alias.

## Local execution fixes

Launch and admin scripts now load the actual `.env.local`, matching this checkout and Next/Vite conventions. The lockfile is unchanged. An optional local PowerShell password input helper stores only a temporary Windows DPAPI-encrypted value under ignored `.launch-tools`; it never prints or resets the owner's password.

- Fixed the booking signup callback: `/booking` is explicitly allowed after email confirmation and in the provider redirect allow-list. Arbitrary external and Admin redirects remain denied.
- Prevented Cloudflare's Vite plugin from copying `.env.local` into `dist/server/.dev.vars`. The configured build now checks actual secret values against every output file and fails if any are present.
- Added private/no-store/no-cache headers to Auth, customer/Admin responses and protected login redirects after the deployed HTTP smoke test exposed missing explicit cache controls.
- Fixed the Windows dependency-audit invocation to use the invoking pinned pnpm entry, preserving the existing advisory-specific mitigation. No dependency versions changed.
- Corrected the stale hardening test to inspect the extracted login form, staff identity and server-bound enrolled-owner path.
- Stopped tracking generated `next-env.d.ts`, already ignored by Git; Next/Vinext regenerate it for their own route/type outputs.

## Executed validation

- TypeScript and full ESLint passed. All 68 source/release/audit gates passed after correcting and rerunning the one stale login-form assertion. The separate actual-component motion groups (16 plus 6 pointer/preference lifecycle groups) and eight launch-adapter/configuration groups passed.
- The dependency registry reported the known upstream braces advisory; its pinned local mitigation passed actual installed-module adversarial tests. Zero unmitigated findings; this is not a claim that the upstream version has no advisory.
- Configured Vinext Worker build and Wrangler dry-run passed. All three configured server credentials were absent from every `dist` file after the build fix.
- Live disposable support account: AAL1 administrative permissions and writes were denied, then the account was removed. Existing owner enrollment and staff MFA semantics remained intact.
- Live booking rollback integration: hold retries, cross-service conflicts, free confirmation, confirmation retries, calendar reservation, email queue snapshot, cancellation/slot release, and internal grant denial passed with no retained fixtures.
- Actual browser on the configured Worker: phone (390), tablet (768), desktop (1280) layouts had no horizontal overflow; practice inputs/review and mobile navigation worked. Customer password login, session persistence after reload and Admin denial passed using a disposable account.
- A separate hidden-before-commit disposable offering produced a confirmed booking visible in the test customer's browser. The deployed Worker cron sent its booking email in one attempt. Public visitors never saw that test offering.
- Resend accepted the direct email test; the human confirmed delivery to the owner's inbox. Auth SMTP request was accepted for a disposable alias. Booking-email and Auth-message individual mailbox delivery are separate from that direct-message confirmation.

Cloudflare preflight confirmed the intended account/active Free Website zone, no existing production Worker/custom domains, an older Vercel site at the apex and an obsolete wildcard route to the staging Worker. The new Worker was first tested on workers.dev before domain cutover; no plan or paid service was enabled. Billing API reads are outside the OAuth token's scopes, so this report does not claim a separate billing-subscription audit.

## Outstanding acceptance

Complete domain cutover, production-host HTTP/browser checks, owner password/session verification after local hidden input, disposable customer/booking cleanup and final Git push. Actual owner-approved service/pricing/availability data are still required before public booking can open; the user elected to supply them. Build success is not operational acceptance.
