# Booking launch runbook

The authoritative production project reference is `zfbwpubsnuijybxjuidc`. The 2026-08-20 read-only preflight verified migration 043 live and migrations 044–047 absent. This runbook does not authorize a database write and never requires credentials in chat or documentation.

## 1. Required owner actions before staging

1. Create or identify an isolated staging project and approve a staging-only change window.
2. Produce a current, restorable backup/recovery point and record the restore procedure. Production currently has no verified recovery point.
3. Approve the exact canonical domain, then configure exact Supabase Auth Site URL and redirect allow-list entries. Keep localhost entries only for local development.
4. Use controlled owner/admin/customer test accounts. Never reuse real customer records.

## 2. Migration order and role contract

Apply to staging only, in this order, in one reviewed change set:

1. `044_booking_operational_workflow_local_only.sql`
2. `045_booking_least_privilege_local_only.sql`
3. `046_media_governance_local_only.sql`
4. `047_legal_content_governance_local_only.sql`

Do not expose an interval between 044 and 045 to traffic. Migration 045 revokes legacy booking creation from browser roles, removes the authenticated direct pending-insert policy, and restricts internal booking helpers to `service_role`.

Acceptance matrix:

- anonymous: read published services and time-only availability only; no holds, bookings, internal policy helper, or legacy creation;
- authenticated customer: own holds/customer workflow RPCs and own rows only; no direct booking insert or legacy bypass;
- permitted admin: administrative actions only through permission-checked server paths/RPC bodies, with audit entries;
- service role: controlled orchestration and internal helper execution.

## 3. Staging verification

Run separately and label evidence accurately:

- automated: migration history, function grants, RLS denials, role matrix, six-client same-slot contention, duplicate-submit, expired-hold release, buffers, minimum notice, booking window, exception/blackout, manual open/close, cancellation/reschedule, Cairo DST, and mobile RTL browser checks;
- click test: owner creates a free service and availability → customer discovers time-only slot → holds and confirms → admin agenda/details show it → customer dashboard shows it → cancellation releases the slot or reschedule moves it exactly once;
- paid/package paths: run only after their actual provider or entitlement prerequisites are configured; test idempotent duplicate/out-of-order callbacks without card data.

Exactly one contender may acquire/convert a slot. Logs and screenshots must be redacted and must not contain tokens, raw Storage paths, personal intake, account details, or credentials.

## 4. Rollback

Code rollback is a deployment rollback. Database rollback is restore/forward-fix only: do not hand-write destructive down migrations on customer data. If 044/045 validation fails, disable booking traffic, retain timeline/audit records, capture redacted diagnostics, and restore the verified staging checkpoint or apply a separately reviewed forward fix.

## 5. Production gate

Production remains blocked until staging evidence is accepted, recovery is tested, Auth redirects are verified, legal and operational policies are approved, and an independently authorised production window names the exact migrations. A production smoke test must be non-destructive unless separate disposable-data authorization is granted.
