# Road to 100 remediation execution — 2026-08-25

**Authority boundary:** local-safe implementation only. No environment file was read, and no staging/production/provider/DNS/Auth/payment/monitoring/backup write has been performed. The acceptance audit remains the scoring authority.

## Gate 0 current truth

- Local history contains 000–047. The last fresh external evidence is historical (2026-08-20) and cannot be treated as current; no newly authorized read-only connection is available in this cycle.
- Source order is determined as `044 → 045 → 046 → 047`. 045 is the booking privilege correction that must immediately follow 044; 046 and 047 are additive current-release schema requirements.
- Local preflight/postflight contract and change runbook are prepared in `scripts/verify-booking-staging-contract.mjs` and `docs/STAGING_BOOKING_CHANGE_RUNBOOK_2026-08-25.md`.

| Finding | الحالة الأصلية | الإجراء | البيئة | التفويض | اختبار القبول | الدليل | النقاط الممكن استعادتها | الحالة |
|---|---|---|---|---|---|---|---:|---|
| P0-01 | legacy booking bypass / 044–045 absent historically | prepare ordered migration, catalog assertions, role/concurrency E2E runbook | local → staging | staging write required | postflight ACL/RLS/RPC + role matrix + holds | source verifier + runbook | 5 | prepared-local |
| P0-02 | no current recovery/PITR restore evidence | recovery decision record and restore acceptance preparation | staging provider | owner/provider required | fresh recovery point + isolated restore + named owner | runbook | 5 | awaiting-owner |
| P0-03 | Auth canonical URL/allow-list unverified | allow-list and disposable MFA test matrix prepared | staging Auth/hosting | owner/provider required | callback/deny/MFA matrix | runbook | 2 | awaiting-owner |
| P0-04 | legal/content/commerce readiness blocked | draft legal pages noindexed and removed from sitemap; owner checklist prepared | local → staging | owner approval required | no readiness blockers with approved admin content | source/tests | 3 | prepared-local |
| P1-05 | authenticated E2E unverified | disposable identity/role/cleanup matrix prepared | staging | staging write required | customer/staff/owner allow-deny E2E | runbook | 8 | prepared-local |
| P1-01 | payment sandbox unverified | provider decision and financial acceptance matrix prepared | sandbox/staging | owner/provider required | signed webhook/retry/refund/reconcile | audit/runbook | 5 | awaiting-owner |
| P1-02 | monitoring/incident response unverified | alert/runbook acceptance matrix prepared | staging/provider | owner/provider required | alert → triage → resolution evidence | runbook | 4 | awaiting-owner |
| P1-03 | hosting/TLS/CDN/WAF unverified | read-only header/cache/WAF checklist prepared | staging/provider | owner/provider required | safe header/cache/WAF test | runbook | 5 | awaiting-owner |
| P1-04 | delivery/scanner/mail unverified | local validation retained; provider test matrix prepared | staging | staging/provider required | cross-user, expiry/revoke, good/bad file, mail sink | source/tests | 3 | awaiting-owner |
| P1-06 | reports/exports unverified | known-data/Cairo/CSV/RBAC matrix prepared | staging | staging write required | manual reconciliation + safe export | source/tests | 3 | prepared-local |
| P2-01 | responsive/A11y evidence incomplete | add tablet/touch/reduced-motion/local overflow coverage | local | not required | 390/768/1440 and reduced-motion local suite | Playwright | 2 | prepared-local |
| P2-02 | draft legal URLs indexable | remove drafts from sitemap and apply `noindex`; add regression test | local | not required | sitemap/metadata assertions | source/tests | 1 | prepared-local |
| P2-03 | no performance metrics | production-like measurement protocol prepared | staging/production | owner/provider required | documented median/range budgets | runbook | 1 | awaiting-owner |

## OWNER ACTION REQUIRED — GATE 1

| الإجراء الخارجي المحدد | مكانه | القرار/القيمة العامة المطلوبة | أثر عدم التنفيذ | إثبات النجاح |
|---|---|---|---|---|
| توفير نقطة استعادة حديثة وتنفيذ restore drill معزول قبل أي migration | لوحة مزود Supabase للمشروع **staging المنفصل** | اسم مشروع staging، RPO/RTO، اسم مالك الاستعادة، ووقت نافذة التغيير؛ لا أسرار | تبقى P0-02 وP0-01 محجوبتين، ولا يجوز تطبيق 044–047 | recovery point حديث + سجل restore ناجح + snapshot metadata يمرر preflight |

## Prepared local acceptance matrices

### Auth/MFA

Disposable customer, staff, finance/operations, and owner identities only. Verify canonical callback, forbidden redirect denial, register/verify/login/logout/reset, AAL1 denial, AAL2 fresh-step-up success, session revoke, audit record, then cleanup. No address, token, or account secret belongs in source control or evidence.

### Product/data/E2E

Seed only known staging data: one free service, one paid service, one package/credit, one blackout, one manual override, and approved test content. Prove free/paid/package booking, concurrency/expiry, cancel/reschedule/ICS, direct-insert/RPC denial, customer isolation, owner last-role protection, and audit rows. Delete disposable records under the authorized cleanup plan.

### Payment/delivery/reports

Use provider sandbox and mail sink only. Cover signed webhook success/failure/retry/replay/out-of-order, refund/reconcile, entitlement duplication/revocation, good/bad MIME/magic/size file, signed expiry, cross-user denial, no token/path in logs, Cairo dates, Arabic CSV encoding, RBAC, and failure-not-zero UI.

## Gate 0 local evidence — completed

- `pnpm verify:booking-staging-contract` passed the source order and 045 least-privilege closure.
- `pnpm verify:booking-staging-contract-fixtures` passed sanitized preflight and postflight fixtures; this tests the validator, **not** a provider catalog.
- `pnpm check:deploy` passed with TypeScript, ESLint, archive/delivery/booking/AAL2/CMS/remediation checks, an isolated 60-route production build, **46/46** public Playwright tests without skips, and all source audits.
- `pnpm package:release` passed with 406 files and `pnpm audit:security` passed afterward. This is local release-artifact evidence only.
- P2-02 is closed at the source level (draft legal fallbacks are noindex and absent from sitemap). P2-01 is improved locally with 390/768/1440 and reduced-motion coverage but remains open for physical-device/screen-reader and live performance evidence. No P0/P1 acceptance point is restored by these local-only results.
