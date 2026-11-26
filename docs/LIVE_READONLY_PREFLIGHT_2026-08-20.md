# Live read-only preflight — 2026-08-20

> Scope: production metadata inspection only. No migration, DDL/DML, booking, payment, Storage object access, secret read, or test data was executed.

## Verified project identity

- **Project ref / ID:** `zfbwpubsnuijybxjuidc`
- **Name:** `HebaElSherif`
- **Region:** `eu-west-1`
- **Status at inspection:** `ACTIVE_HEALTHY`
- **Database:** Postgres 17.6.1.155
- **Evidence surface:** authenticated Supabase CLI management/database metadata APIs, 2026-08-20 (Africa/Cairo). The in-app dashboard session was not signed in; it was not used to change or reveal settings.

## What is applied live

### Migration history

Remote migration history is contiguous from `000` through `043`, inclusive. Local `044_booking_operational_workflow_local_only.sql` is the only local migration not present remotely. Thus **043 is live** and **044 is not live**.

### 043 — protected delivery controls

The following 043 objects were read from the live catalog and match the source contract:

- Tables: `protected_delivery_events`, `delivery_devices`, `video_admission_sessions`, and `protected_upload_inspections`.
- Required check/foreign-key/unique constraints, the five-download index on `book_download_logs`, and all six 043 indexes exist.
- RLS is enabled on all four new tables. `protected_delivery_events` and `protected_upload_inspections` have only the expected `audit.view` read policy; anonymous/authenticated roles have no direct table grants. `delivery_devices` and `video_admission_sessions` have RLS enabled with no client policy.
- `authorize_book_download(uuid,uuid,text)`, `begin_video_admission(uuid,uuid,text,text)`, and `validate_video_admission(uuid,uuid,text)` exist as `SECURITY DEFINER` functions and are executable only by `service_role` (besides `postgres`).
- The required dependencies exist: book files/access/download logs, course lessons/modules/enrollments, and the protected Storage buckets.

Storage has the private buckets `protected-books`, `course-videos`, `course-resources`, and `workshop-recordings`; their object policy gives management access only to `media.manage`. Both `storage.buckets` and `storage.objects` have RLS enabled. The public buckets are limited to `avatars` and `public-media`.

### Existing booking baseline

The pre-044 booking baseline is present: `services`, weekly availability rules/exceptions, `bookings`, booking events/reschedule requests, and the `bookings_no_time_overlap` exclusion constraint. Relevant tables have RLS enabled. Catalog inspection shows the currently estimated row count for `bookings` is zero; no customer rows were selected or counted exactly.

## What is missing before 043

Nothing should be applied for 043: it is already applied live and its database dependencies, RLS, RPC isolation, and private buckets are present.

Two operational facts remain outside the 043 migration itself:

1. Malware scanning is optional in the current application design. This preflight intentionally did not read environment values, so it does **not** assert that a scanner provider is configured. When unconfigured, the supported claim remains local MIME/size/magic-byte validation only; scanner fail-closed behavior applies only after a scanner is configured.
2. Auth redirect URLs are not stored as safely separable catalog fields: `auth.instances` exposes a raw configuration bundle. Reading it could reveal unrelated sensitive configuration, and the dashboard browser session is signed out. Redirect URL configuration is therefore **unverified**, not assumed.

## What is missing before 044

None of the 044 contract is live:

- No `booking_runtime_contract`, policy/slot predicate, public slots/calendar, hold, hold-release, free/paid/package-from-hold, admin-resolution, or admin-update RPCs exist.
- `services` has none of the new payment mode, buffer, notice, booking-window, hold, cancellation/reschedule, or policy-note columns.
- `availability_exceptions` has neither `kind` nor `reason`.
- `booking_holds` and `booking_slot_overrides` do not exist, so their RLS policies and indexes do not exist.

The baseline is structurally compatible with the additive 044 tables/columns: services, availability exceptions, bookings, profiles, audit logs, site settings, subscription credits, and the exclusion constraint all exist. There are two existing unique indexes on `(service_id,date)` for availability exceptions; they are redundant but do not conflict with 044.

## Permission and compatibility risks

### Blocking issues to resolve before staging 044

1. **Legacy anonymous booking RPC remains executable.** Live `create_booking_order(...)` is `SECURITY DEFINER` and executable by `anon`, `authenticated`, and `service_role`; the Supabase security advisor reports it as anonymously executable. It checks `auth.uid()` and rejects an anonymous request at runtime, but it must not remain publicly executable. The local 044 source revokes execution from `authenticated` only, leaving the live `anon` grant intact. A forward-only corrective migration must revoke `PUBLIC`, `anon`, and `authenticated` from the legacy RPC (then grant only the deliberate service/internal role).
2. **Authenticated users can directly insert pending bookings.** Live table grants are broad as normal for PostgREST, and the `bookings: own create pending` RLS policy lets an authenticated customer insert a self-owned `pending` booking. That route bypasses the 044 hold/availability/policy RPC contract (though the exclusion constraint still prevents overlapping pending/confirmed ranges). Before exposing 044, replace or narrow this direct-insert policy and confirm all legitimate creation paths use the intended `SECURITY DEFINER` RPCs.
3. **044 internal helper exposure must be explicit.** The intended new `booking_service_policy` and `booking_slot_is_available` helpers are `SECURITY DEFINER`, but 044 does not give them explicit `REVOKE`/`GRANT` statements. Add an explicit privilege posture: no direct anon/authenticated execution of internal helpers; only `available_booking_slots`, `available_booking_calendar`, and the non-sensitive runtime contract are public by design.
4. **No recovery point is available.** The management API reports physical-backup support enabled, `pitr_enabled: false`, and no listed backup/recovery point. Do not stage or deploy a schema change until a verified backup/PITR recovery point and restore owner/runbook exist.
5. **Auth redirects are unverified.** Confirm the Site URL and redirect allow-list through a signed-in owner dashboard session without exporting the raw auth configuration bundle.

### Non-blocking observations

- 043’s service-only delivery RPC privilege isolation is correct.
- Storage table grants to API roles are broad, but RLS object policies restrict the private delivery buckets to `media.manage`; this is the expected Supabase pattern.
- The security advisor also reports existing mutable-search-path functions, `btree_gist` in `public`, and several pre-existing executable `SECURITY DEFINER` functions. They are not introduced by 043/044, but remain a separate security-debt review.

## Staging, backup, and rollback plan

1. Create/choose a non-production Supabase project and link it explicitly by ref; never infer it from local configuration.
2. Before any migration, obtain and record a successful physical backup or an enabled PITR recovery point, plus a tested restore owner and target. Export only schema/metadata required by the approved runbook; do not expose secrets.
3. Prepare an additive corrective migration after 044 that closes the two legacy booking bypasses and gives internal 044 helpers explicit grants. Review it and the 044 source together before staging.
4. Apply 044 plus the corrective migration to staging only. Verify migration history, columns, constraints, RLS policies, function ACLs, and Storage/Auth redirect settings by read-only catalog queries.
5. Run isolated staging writes only after separate authorization: anonymous/authenticated/admin denial/allow matrices; concurrent holds; free/paid/package paths; buffers/notices/exceptions; cancellation/reschedule; delivery entitlement revocation; accepted/rejected Storage magic bytes; and token/path-free logs.
6. Production rollout requires a fresh backup/PITR checkpoint, a change window, a rollback owner, and the same post-apply catalog checks. Rollback is forward-only: disable the new booking UI/runtime feature flag or revert grants/policies with a new migration; do not delete migration history or restore production blindly.

## Decision

**`blocked`** — Do not stage or deploy 044 yet. 043 is verified live, but 044 is absent and its release gate must first close the legacy anonymous RPC grant, direct authenticated booking insert path, implicit internal-helper grants, missing verified recovery point, and unverified Auth redirect configuration. This report creates no deployment authorization.
