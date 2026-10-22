# Release evidence

## 2026-08-26 Cloudflare Workers compatibility spike

- The active host decision is Cloudflare Workers Free through vinext. Namecheap is registrar-only; no Vercel, cPanel, DNS, account, secret, Supabase, mail, monitoring or Production external action occurred in this spike.
- Official `pnpx vinext check` completed; all detected active Next imports/configuration were compatible. Its initial 90% score reported only retired CommonJS/recovery/release artifacts outside the active application runtime.
- `pnpx vinext init --platform=cloudflare` completed non-destructively on branch `codex/cloudflare-compatibility-spike`, producing vinext/Vite/Wrangler configuration. `pnpm build:cloudflare:isolated` passed from a temporary source mirror that excludes all `.env*` paths and shadows known configuration values.
- Local Wrangler smoke: `/`, `/robots.txt`, and `/_next/image` returned 200; anonymous `/admin` returned 307 to the admin auth entry. A first Worker smoke exposed that `next.config` headers alone did not emit CSP under vinext; security headers were moved to the supported proxy response path and rechecked for CSP, HSTS and `nosniff`.
- `pnpm test:e2e:cloudflare` passed **46/46** public desktop/mobile tests against the locally generated Worker runtime after the direct-upload conversion. The ordinary `pnpm check:deploy` also passed afterward, including isolated type/build, a 60-route Next build, **46/46** public E2E and all source audits. Neither suite is Staging or Production evidence.
- Protected books/course/workshop media, payment proofs and administrative media upload browser → signed Supabase Storage URL before server validation/finalization. No Worker receives those file bodies. This is source/runtime parity evidence only: the actual Storage policies, signed-token behavior and full upload journey remain Staging-unverified.
- Final local source packaging passed with 418 inspected files and no local secret/build/test artifacts; `audit:security` and `audit:launch` passed afterward. This archive is not a Staging or Production deployment.

## 2026-08-26 production launch read-only checkpoint

- Supabase CLI revalidated the production project ref `zfbwpubsnuijybxjuidc` as `ACTIVE_HEALTHY`. Remote migration history remains 000–043, with 044–047 pending.
- `supabase backups list` reported `pitr_enabled: false` and no physical backup; `supabase branches list` returned no staging/preview branch. No external write was attempted.
- HTTPS headers for `hebaelsherif.com` and `www.hebaelsherif.com` show valid HSTS but a CSP different from the current release contract, including production `unsafe-eval`. This proves only that a pre-existing deployment responds; it does not prove this release is deployed or accepted on Namecheap.
- The full evidence boundary and one consolidated owner request are in `docs/PRODUCTION_LAUNCH_CLOSURE_2026-08-26.md`. No production launch claim is made.
- The authorized logical-backup fallback was attempted with `supabase db dump --linked` into a restricted ignored local directory. It failed before dumping data because Docker Desktop's Postgres image runner is unavailable; the output is zero bytes and is not a backup/recovery artifact.
- Final local release gate: `pnpm check:deploy` passed; public Playwright passed **46/46** with **0 skips**; `pnpm package:release` passed after recursively inspecting a 411-file archive; the final `pnpm audit:security` and `pnpm audit:launch` passed. The package explicitly excludes local `.launch-backups` and `.launch-tools` roots. These commands provide local release evidence only, not staged or live evidence.
- Owner continuation authorization was received. A no-data `nano` preview-branch request was rejected by Supabase with `402 entitlement_required` (Pro required); no purchase was made. A free disposable-project route was proven available and its first empty project was deleted before any configuration/data because its transient generated database password was intentionally not persisted.
- The restricted ignored launch-tools directory now contains official PostgreSQL 17.11 client binaries. `scripts/launch-backup-restore.mjs` passed `node --check`; `scripts/run-launch-recovery-drill.ps1` passed PowerShell syntax validation; both fail closed without their secure process-only source connection. The orchestrator creates and deletes the isolated restore target internally. No repository `.env` file was loaded by either runner, no credential value was displayed, and no backup/restore has yet begun.
- Environment-name inspection found no configured mail or monitoring provider setting. No hosting, Auth, DNS, email, monitoring, payment, or Production change was made.
- Following the explicit exclusion of local recovery tooling from ESLint and source packaging, the full `pnpm check:deploy` gate passed again: isolated 60-route build, **46/46** public Playwright with no skips, and all listed source/security/administration/commerce/booking/database/launch audits. This is a local rerun only and does not replace the required external recovery or staging evidence.

## 2026-08-26 superseded Namecheap-hosting record

- This historical local experiment is not an active deployment option. Namecheap is registrar-only under the final decision; no cPanel account was inspected and no Namecheap Hosting action was taken. The temporary standalone/cPanel implementation was removed before the Cloudflare compatibility spike. The retained decision history is append-only in `docs/DECISIONS.md`.

## 2026-08-25 Road-to-100 local remediation gate

- `pnpm check:deploy`: passed after TypeScript, ESLint, recursive archive verification, local protected-delivery and booking contracts, the new sanitized staging migration-contract source/fixture checks, fresh AAL2 contract, CMS/remediation audits, isolated build, public Playwright, and all source audits.
- Isolated Next production build passed with 60 routes. It continued to shadow public/server Supabase configuration and did not contact a project.
- Public Playwright: **46 passed, 0 skipped**. New local coverage exercises 390px/768px/1440px geometry, reduced-motion visibility, and noindex/sitemap exclusion of legal drafts, alongside existing Arabic/RTL, keyboard, theme, honest-unconfigured and anonymous-route checks.
- `pnpm package:release`: passed with a recursively inspected **406-file** archive; the final `pnpm audit:security` passed. File count is evidence only, not readiness or a release target.
- No staging/production migration, external configuration, data mutation, secret read, provider call, or live test occurred. Gate 1 recovery/PITR and staging authorization remain `awaiting-owner`.

## 2026-08-25 full-stack local review gate

- `pnpm check:deploy`: passed after TypeScript, ESLint, recursive archive verification, booking hold/permission contracts, fresh-AAL2 source contract, CMS audit, isolated production build, public Playwright, and all route/UX/color/security/admin/media/commerce/catalog/booking/database/launch audits.
- Isolated Next production build passed: 60 routes generated; the runner explicitly shadows public/server Supabase settings before build and does not use a project connection as release evidence.
- Public Playwright: **39 passed, 1 skipped** (the overflow geometry assertion is intentionally mobile-only; its desktop counterpart is skipped with that explicit condition). It captured and visually reviewed the truthful public home at 1440px and 390px: Arabic RTL hierarchy, mobile CTA visibility, theme/navigation, and no mobile horizontal overflow.
- `pnpm package:release`: passed with **399 files** after recursive inspection; `pnpm audit:security` passed after packaging. File count is evidence only, not an acceptance target.
- No staging/production migration, Supabase data/Storage/Auth/payment write, provider configuration, or secret read occurred.

### Screenshots

- Local public desktop: `test-results/public-public-experience-c-cc300--local-states-for-visual-QA-desktop-chromium/launch-home-desktop-1440.png`.
- Local public mobile: `test-results/public-public-experience-c-cc300--local-states-for-visual-QA-mobile-chromium/launch-home-mobile-390.png`.
- Authenticated customer/admin screenshots are deliberately absent: obtaining them requires controlled authenticated data and staging authorization. The public suite proves anonymous dashboard/admin access is redirected, but that is not substituted for a configured end-to-end admin/customer journey.

## 2026-08-20 local evidence

- Release packaging is recursive-content inspected and excludes local configuration, `supabase/.temp`, dependencies, build output, test output, dumps, archives, and secret-like content.
- The latest local Phase 2 package check passed with 386 files. File count is evidence only, never an acceptance target.
- Local TypeScript, ESLint, production build, public Playwright (39 passed, one intentional desktop-only skip), booking contract, delivery-local, and source audits passed at the prior checkpoint.
- The 2026-08-20 full local gate repeated those checks after hold-aware booking, runtime readiness, release exclusions, Admin health, and motion corrections. The final package contains 388 files after recursive inspection; file count remains evidence, not an acceptance target.
- No Supabase project was contacted, no migration was pushed, no payment was attempted, and no live booking/delivery/RLS claim is made.

## Evidence still required after owner authorization

1. Project identity/migration/schema/RLS/RPC read-only evidence for the one confirmed ref.
2. Staging then production records for 043 and 044, with backup/rollback authorization.
3. Booking concurrency, hold/payment, cancellation/reschedule, and responsive browser evidence using controlled accounts.
4. Delivery entitlement revocation, real Storage magic-byte, token/path secrecy, and device/session evidence.
5. Owner-approved legal content, payment/provider configuration, and operational sender/scanner evidence where applicable.

## 2026-08-20 master launch local gate

- `pnpm check:deploy`: passed using an isolated build that explicitly shadows Supabase public/server configuration with empty values and never reads credential files.
- Public Playwright: 39 passed, one intentional desktop-only skip; desktop 1440×900 and mobile 390×844 landing screenshots were visually inspected, including RTL order, portrait eye framing, navigation, CTA visibility, dark-theme persistence and overflow.
- Local contract/security checks: recursive nested-archive rejection, protected-delivery magic bytes and log secrecy, booking hold/expiry/duplicate/concurrency/buffer/notice/exception/cancellation/reschedule/Cairo DST, booking role matrix, structured CMS validation, and all source audits passed.
- `pnpm package:release`: passed with 397 files after recursive archive inspection. Count is evidence only, not a target.
- Archive: `release/hebaelsherif-source.tgz`; record its SHA-256 alongside the delivered artifact rather than embedding a self-referential hash inside the archive.
- Final `pnpm audit:security`: passed after packaging.
- No staging/production migration, database/storage/auth/payment/provider write, secret read, or customer-data mutation was performed. Final label: `LOCAL READY — EXTERNAL SETUP REQUIRED`.
