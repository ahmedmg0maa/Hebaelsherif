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
- A separate hidden-before-commit disposable offering produced a confirmed booking visible in the test customer's browser. Browser cancellation then changed it to cancelled. The deployed Worker cron sent both confirmation and cancellation emails in one attempt each. Public visitors never saw that test offering.
- Resend accepted the direct email test; the human confirmed delivery to the owner's inbox. Auth SMTP request was accepted for a disposable alias. Booking-email and Auth-message individual mailbox delivery are separate from that direct-message confirmation.

Cloudflare preflight confirmed the intended account/active Free Website zone, no existing production Worker/custom domains, an older Vercel site at the apex and an obsolete wildcard route to the staging Worker. The new Worker was first tested on workers.dev before domain cutover; no plan or paid service was enabled. Billing API reads are outside the OAuth token's scopes, so this report does not claim a separate billing-subscription audit.

## Production source and domain cutover

- Before cutover, the apex served Vercel Production deployment 5330167721, commit `7c6547b02abf6813d73c574c064ee9a770c35284` from `main`, successful at 2026-07-06 13:41:15 UTC (16:41:15 Cairo). Branch deployments were previews. Response headers, GitHub deployment metadata and source assets were inspected; the old `public/images/heba/heba-hero.jpg` was actually a logo panel.
- Both apex and www now route to the production Cloudflare Worker `heba-elsherif-platform`. Custom Domains rejected the externally managed existing DNS records (100117); explicit zone routes were deployed without replacing DNS. The obsolete staging wildcard route was backed up and removed so it could not intercept www. Existing unrelated routes remain intact.
- Each configured build publishes `/.well-known/heba-release.json` with commit, branch, source-dirty flag and build time. Both hosts returned the same clean `prepare-cream-motion` artifact. Hero implementation commit: `c0f6414502a1d784b3f6247a5b4b4f88d55b8910`; its Worker version `f1f6d49e-9c5e-457b-a78c-4ec032269eb7` was created at 2026-10-17 05:18:42 UTC (08:18:42 Cairo). A final evidence/cleanup commit is redeployed using the same build path; the public release metadata identifies that exact final source without a self-referential commit hash in this document.
- Production-host HTTP smoke passed 27 probes on each host: public routes, missing route, internal callback failure redirect, anonymous customer/Admin denial, CSP/nosniff and private/no-store protected responses. The final-domain disposable customer logged in, survived reload and was denied Admin access.

## Responsive hero acceptance on the published site

The intended image is `/images/learning/learning-desk.webp`, 1536×1024: desk, books, laptop and writing hand. It uses cover cropping at a centered focal point, with responsive height rather than a forced tall mobile crop. Logo bytes are unchanged and the logo stays in the header.

The title retains three deliberate Arabic lines, with smaller responsive type and reduced copy/CTA/profile spacing. The existing cream, teal and gold palette, v4 native SVG ornament and automatic motion remain in place.

| CSS viewport width | Computed title size | Title height | Photo box |
| --- | --- | --- | --- |
| 390 | 32 px | 139 px | 380×260 px |
| 768 | 36.864 px | 160 px | 758×461 px |
| 1024 | 34 px | 148 px | 519×548 px |
| 1440 | 45.36 px | 197 px | 732×640 px |

All four widths were checked on the live host: one H1, each title chunk on one line, title above lead, no overlap or horizontal overflow, correct loaded raster and object-fit. Screenshots were recaptured after viewport changes settled; an early screenshot could be clipped by the preview renderer and was not used as final evidence. Full-screen native Chrome at 1920 px independently showed the updated title, complete hero and correct photo outside the side preview. This is Chromium acceptance, not a claim of physical-device or cross-engine coverage.

Private local evidence: `.launch-backups/hero-after-{390,768,1024,1440}.png`, `hero-after.json`, host HTTP reports, GitHub deployment metadata and Worker deployment logs. The public report contains no credentials or customer identities.

## Cleanup and remaining acceptance

- Disposable booking, availability, service/product, customer and support identities were removed. Final connected counts: one original Auth user, zero services, zero published products, zero bookings, zero booking-email outbox rows, 103 migration entries. Real provider-attempt budget records remain counted because those emails were sent.
- The permission smoke script previously ignored a failed identity cleanup. It now removes the disposable role, retains audit records with a null actor reference and checks every cleanup result. The actual live least-privilege smoke was rerun successfully; final identities match the preflight baseline exactly.
- Owner password/session verification remains pending: the user chose local masked entry, but no encrypted input file had been supplied at the final checkpoint. No password was reset or guessed. Owner enrollment/readiness and staff MFA/AAL1 denial checks passed; those do not establish owner browser login.
- Owner-approved service description, duration, price/currency, Cairo availability, meeting method and cancellation policy are still missing. The user elected to provide them. Public booking must remain without invented offers until that input arrives.
- The direct test email was confirmed in the owner's inbox. Booking confirmation/cancellation provider acceptance was exercised through the real cron; individual inbox receipt for those two fixture messages and the Auth confirmation message was not separately confirmed.
- Full aggregate historical Playwright/cross-engine suites, real paid checkout and content publishing acceptance were not run. No paid services were enabled; free mode remains required.
