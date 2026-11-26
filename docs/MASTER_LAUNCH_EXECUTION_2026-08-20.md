# Master launch execution — 2026-08-20

Final program status: **LOCAL READY — EXTERNAL SETUP REQUIRED**.

This is the governing local execution ledger for the owner’s master launch instruction. It records only work demonstrated by source and local evidence. It does not authorize or imply staging/production writes, secret access, migration deployment, payments, customer-data mutations, or provider configuration.

## Gap map

| Phase | Requirement | Status | Evidence / next gate |
|---|---|---|---|
| A | Confirm production identity and live 043 state | production-verified | Read-only preflight verified `zfbwpubsnuijybxjuidc`, history 000–043 and protected-delivery contract |
| A | Booking least privilege and bypass removal | local-verified | 045 revokes legacy/browser bypasses; local role-matrix verifier passes |
| A | 044 booking runtime | local-verified | 044 source plus hold/expiry/concurrency/buffer/notice/exception/reschedule/Cairo-DST simulator pass |
| A | Staging, backup/restore and Auth redirects | blocked | Requires isolated staging, a restorable recovery point, exact canonical domain and dashboard verification |
| B | Admin dashboard, inbox signals and quick actions | local-verified | Honest KPI health, reschedule/alert/blocker counters and operational links |
| B | Structured CMS, preview, revisions and scheduling | local-verified | Fixed section registry, server validation, safe links, page creation and source audit pass |
| B | Books/courses/workshops/services/articles CRUD | local-verified | Existing permission-checked catalog/admin actions and local admin/catalog audits pass |
| B | Media library and governance | local-verified | 046 adds rights/caption/credit/folder/focal/processing metadata; upload/update audit path and media audit pass |
| B | Customer 360, payment review and RBAC | local-verified | Existing guarded actions, role boundaries and audit surfaces pass local source audits; persistence needs staging |
| C | Reference inspection and Arabic RTL brand journey | local-verified | Reference inspected without copying; 1440×900 and 390×844 home screenshots reviewed, dark mode/keyboard/overflow pass |
| C | Real owner claims, media rights and public content | blocked | Owner must approve real copy, licensed assets and publishable rows; no synthetic claims are substituted |
| D | Catalog, variants, checkout, idempotency and entitlements | local-verified | Local commerce/catalog audits pass; public controls remain hidden when payment is unconfigured |
| D | Live provider callbacks and entitlement lifecycle | blocked | Requires configured provider and isolated staging write tests, including duplicate/out-of-order events |
| E | FAQ/legal CMS governance | local-verified | FAQ can consume published CMS sections; 047 requires approved status/version/effective date for legal publication |
| E | Sender, newsletter, analytics and consent | blocked | No operational sender/analytics provider or approved consent configuration exists; no sending/tracking claim is made |
| F | Archive, delivery, permissions and failure safety | local-verified | Recursive archive gate, magic bytes, log secrecy, booking permission and security audits pass locally |
| F | Malware scanner and live Storage/RLS failure drills | blocked | Scanner is optional/unconfigured; live Storage, entitlement revocation and provider failures need authorised staging |
| G | Local release gate and public E2E | local-verified | Isolated no-secret build; 39 public tests passed, one intentional desktop-only skip; all local audits pass |
| G | Authenticated Admin→public→Dashboard end-to-end | blocked | Requires 044–047 on isolated staging and controlled disposable accounts |
| H | `/admin/system` readiness dashboard | local-verified | Exact `ready / warning / blocker` classification; Launch Ready remains false with blockers |
| I | Staging/rollback/operations handoff | local-verified | Booking, deployment, testing, security and content runbooks updated for the authoritative ref and forward-only order |

## Local deliverables added in this cycle

- `045_booking_least_privilege_local_only.sql`: forward-only booking privilege correction.
- `046_media_governance_local_only.sql`: media provenance and editorial crop metadata.
- `047_legal_content_governance_local_only.sql`: legal approval, version and effective-date controls.
- isolated build runner that explicitly blanks project/server configuration so local release QA neither reads nor bakes ambient credentials;
- local booking permission, lifecycle, CMS, archive, delivery and UI evidence;
- CMS-controlled legal and FAQ surfaces with truthful fallbacks;
- launch readiness status and owner handoff documentation.

## External handoff — owner action only

1. Approve the canonical domain and verify Namecheap cPanel hosting plus Supabase Auth Site URL/redirect allow-list.
2. Provide or approve an isolated staging project and a verified recovery/restore point.
3. Separately authorize staging application of 044, 045, 046 and 047 in that exact order; 044 and 045 must be one traffic-isolated change window.
4. Approve controlled disposable staging accounts and write tests for Admin→booking→Dashboard, RLS denials, payments/entitlements, Storage delivery and failure recovery.
5. Approve final legal text, media-rights evidence, catalog/pricing/policies and any sender/payment/analytics/scanner provider configuration.

Until those gates are evidenced, the only accurate launch label is **LOCAL READY — EXTERNAL SETUP REQUIRED**.
