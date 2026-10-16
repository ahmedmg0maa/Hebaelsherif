# Staging booking change runbook — 2026-08-25

**Status:** `awaiting-owner`. This is a preparation document, not authorization to access or change any external environment.

## Scope and fixed order

The current local source migration sequence is:

1. `044_booking_operational_workflow_local_only.sql` — hold-aware booking contract.
2. `045_booking_least_privilege_local_only.sql` — forward-only removal of legacy/direct browser booking bypasses.
3. `046_media_governance_local_only.sql` — media-governance columns/indexes required by the current admin surface.
4. `047_legal_content_governance_local_only.sql` — legal approval/version/effective-date governance required by the current legal publishing model.

`045` is a companion correction and must follow `044` in the same traffic-isolated staging window. It does not edit historical migration 044 and does not use destructive rollback. 046 and 047 are additive and independent of booking SQL, but both are pending source schema required for a staging environment to represent the current application release; do not silently omit them.

## Required owner authorization before any staging write

| Field | Required value |
|---|---|
| Operation | Create/verify recovery point, restore drill, then apply pending migrations 044 → 045 → 046 → 047 to a separately identified staging project |
| Environment | Explicit staging project ref, never inferred from local configuration; it must not be the production ref `zfbwpubsnuijybxjuidc` |
| Risk | Schema compatibility, temporary booking unavailability during grant/policy transition, and inability to recover if no verified restore exists |
| Recovery point | Fresh provider recovery point/PITR or physical backup, named restore owner, and successful restore drill to an isolated target |
| Acceptance | Preflight and postflight catalog snapshots pass; controlled role matrix and booking concurrency suite pass; test identities/data are cleaned |

## Read-only snapshot contract

Before and after the authorized change, collect a **sanitized metadata-only** JSON snapshot. It must not contain credentials, signed URLs, raw Auth configuration, PII, or business rows. Required shape:

```json
{
  "productionProjectRef": "zfbwpubsnuijybxjuidc",
  "projectRef": "separately-provisioned-staging-ref",
  "environment": "staging",
  "containsCustomerData": false,
  "containsCredentials": false,
  "recovery": { "verified": true, "restoreDrillAt": "2026-08-25T00:00:00Z" },
  "migrationIds": ["000", "...", "043"],
  "tables": ["booking_holds", "booking_slot_overrides"],
  "rls": { "booking_holds": true, "booking_slot_overrides": true },
  "functionGrants": {
    "create_booking_order(uuid,date,time,text,text,text)": ["service_role"]
  },
  "policies": { "bookings": [] }
}
```

Run, only after an authorized read-only snapshot exists:

```powershell
node scripts/verify-booking-staging-contract.mjs --mode=preflight --snapshot=<sanitized-preflight.json>
node scripts/verify-booking-staging-contract.mjs --mode=postflight --snapshot=<sanitized-postflight.json>
```

The preflight deliberately expects 044–047 to be pending on clean staging. The postflight fails if the legacy RPCs remain browser-executable, if the direct `bookings: own create pending` policy remains, if required tables lack RLS, or if the explicit hold-aware/public-discovery grants are missing.

## Decision tree and rollback boundary

```text
Verified recovery point + successful isolated restore?
  no  → STOP. Do not apply a migration; record P0-02 awaiting-owner.
  yes → Clean staging preflight passes?
           no  → STOP. Resolve schema drift or wrong environment read-only.
           yes → Authorized migration window?
                    no  → STOP. Keep prepared-local; do not touch staging.
                    yes → Apply 044 → 045 → 046 → 047 once.
                              ↓
                         Postflight and controlled E2E pass?
                           no  → Disable the new booking UI/runtime feature; use a new forward-only corrective migration only after review. Do not delete migration history or blindly restore production.
                           yes → Record staging evidence and proceed to the separately authorized Gate 2 tests.
```

For an actual data-loss or schema-integrity incident, the provider restore runbook and named restore owner decide recovery. Application rollback is not a substitute for a backup restore.
