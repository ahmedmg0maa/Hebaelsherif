# Production launch closure — 2026-08-26

**Current decision:** `BLOCKED — CLOUDFLARE OWNER SETUP AND STAGING ACCEPTANCE REQUIRED`  
**Only successful final decision:** `PRODUCTION LIVE — ACCEPTING CUSTOMERS`

## Governing architecture

| Layer | Approved launch choice |
|---|---|
| Source/release control | GitHub Free |
| Next.js host | Cloudflare Workers Free through vinext |
| Production domain | `https://hebaelsherif.com` |
| Canonical behavior | permanent `www.hebaelsherif.com` → apex redirect |
| Staging host | protected `workers.dev` preview or `https://staging.hebaelsherif.com`, noindex |
| Database/Auth/Storage | separate Supabase Free Production and Staging projects |
| Transactional email | Resend Free once owner account/domain is ready |
| Error monitoring | Sentry Developer Free once owner account/recipient is ready |
| Recovery | full logical backup + isolated restore drill |
| Payments | manual proof, pending review, fresh-AAL2 decision, audit, duplicate-proof protection |

No paid hosting, paid backup feature, electronic gateway, CDN/WAF upgrade, Vercel or Namecheap Hosting/cPanel is authorized as a launch prerequisite. Such improvements belong to the post-launch backlog unless a separate owner decision makes one mandatory.

## Current evidence and boundaries

| Item | Current evidence |
|---|---|
| Production Supabase | `zfbwpubsnuijybxjuidc` is active; remote history is 000–043 and 044–047 remain pending. |
| Recovery | PITR is disabled and no physical backup was listed. Portable PostgreSQL tools plus fail-closed logical-backup/restore scripts are prepared, but no secure executor-only production connection has been configured, so no dump or restore has started. |
| Staging | paid preview branching was rejected; a separate Free project route was proven, then the empty temporary project was deleted. A clean staging project will be created just-in-time after recovery evidence. |
| Local release candidate | `pnpm check:deploy` passed; public Playwright passed 46/46 with no skips; `pnpm package:release`, `audit:security` and `audit:launch` passed at the preceding checkpoint. This is not host, staging or production evidence. |
| Hosting | local vinext Worker build and Wrangler smoke evidence exist on the isolated Cloudflare spike branch; no Cloudflare account, Workers Build, DNS, route or deployment has been configured. |
| Content/legal | owner approval is still required; drafts remain unpublished/non-binding. |
| Mail/monitoring | no existing provider configuration was detected by variable-name inspection only. |

## Gates — execute in this order

1. **C0 Cloudflare compatibility:** complete the isolated vinext Worker build, Wrangler smoke evidence and Cloudflare-runtime public E2E. Do not merge the spike until functional/security parity is recorded.
2. **R1 recovery:** configure `HEBA_LAUNCH_PRODUCTION_DATABASE_URL` only in the secure executor, run full logical backup and isolated restore drill, and record artifact checksum/RPO/RTO/restore result without values.
3. **S1 staging foundation:** create a fresh separate Supabase Free Staging project with disposable accounts/data only; create a protected/noindex Cloudflare Staging deployment with Cloudflare-only Worker and build secrets.
4. **S2 schema/security:** verify migration history and apply only pending `044 → 045 → 046 → 047` on Staging. Run migration pre/postflight, RLS/RPC, Auth redirects, MFA and RBAC proof.
5. **S3 journeys:** prove Booking E2E, manual payment proof → pending review → AAL2 approve/reject → entitlement, duplicate-proof denial, Storage, Admin persistence/audit, Resend delivery and Sentry non-destructive alert using disposable data.
6. **S4 acceptance:** record `STAGING ACCEPTED FOR PRODUCTION RELEASE` only when all preceding checks pass and resource/headers/canonical/staging protection evidence is complete.
7. **O1 content/legal:** owner approves [OWNER_CONTENT_AND_LEGAL_APPROVAL_PACK_2026-08-26.md](OWNER_CONTENT_AND_LEGAL_APPROVAL_PACK_2026-08-26.md); publish only approved governing CMS records and real service/support/payment details.
8. **P1 production:** take a fresh logical backup; recheck ref/history; apply only still-pending reviewed migrations; deploy the identical accepted `main` commit to the Production Worker; set production Auth redirects only after the exact host responds.
9. **P2 launch:** run non-destructive smoke tests for homepage, canonical redirect, registration/login/reset email, customer/admin boundaries, AAL2, booking availability, proof submission, approved manual-payment entitlement, storage access and error capture. Monitor the agreed launch window.

## External actions still needed

All account/DNS/secret/provider/content actions are consolidated in [OWNER_CLOUDFLARE_SETUP_ONE_CONSOLIDATED_REQUEST.md](OWNER_CLOUDFLARE_SETUP_ONE_CONSOLIDATED_REQUEST.md). At R1, place the Production database connection only in the secure executor as `HEBA_LAUNCH_PRODUCTION_DATABASE_URL`, then let the prepared runner create/delete its isolated restore target.

## Rollback contract

- **Before Production writes:** no deployment or migration occurs without a fresh successful recovery drill.
- **Application:** retain the previous verified Worker deployment/version and source commit. If the new release fails smoke tests, restore the prior Worker deployment/version; then verify public headers/canonical routing.
- **Database:** migrations are forward-only. Restore only from the documented logical backup into the approved target, or use a reviewed forward correction. Application rollback does not reverse schema/data.
- **Launch verdict:** local build, source tests, a host restart, or a staging pass alone may never be called `PRODUCTION READY` or `PRODUCTION LIVE`.
