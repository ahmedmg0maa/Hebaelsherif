# V7 Incidents Ledger — Historical Failures and Their Permanent Guards

Every incident below actually happened. Each has a permanent guard so it cannot silently return.

## 1. Migration 0003 — non-immutable generated column

```txt
ERROR: generation expression is not immutable (SQLSTATE 42P17)
```

- **Cause**: `slot_range tstzrange generated always as (tstzrange(start_at, end_at + interval '30 minutes','[)')) stored` — `tstzrange(timestamptz,...)` is not immutable.
- **Fix (shipped in 0003)**: plain `slot_range` column + `set_booking_slot_range()` trigger; GiST exclusion constraint unchanged, so double-booking prevention stays at DB level.
- **Guard**: `audit:security` fails on any `generated always as (tstzrange` in migrations and requires the trigger to exist.

## 2. Migration 0009 — invalid enum literal

```txt
ERROR: invalid input value for enum payment_status: "paid"
```

- **Cause**: report view compared `payment_status` (enum without `'paid'`) against `'paid'`.
- **Fix (shipped in 0009)**: all enum comparisons in report views cast `::text`.
- **Guard**: `audit:v7` requires `payment_status::text` in 0009.

## 3. Vercel npm failure

```txt
npm error Exit handler never called!
```

- **Fix**: pnpm 10.13.1 via corepack, `--frozen-lockfile`, no `package-lock.json`, Node 24.x.
- **Guard**: `audit:security` + `audit:ux` fail on package-lock.json, npm install commands, or a missing pnpm lockfile.

## 4. Firebase remnants

- **Fix**: all Firebase imports/env checks removed from `src`; system-health checks Supabase env vars.
- **Guard**: `audit:security` fails on `from 'firebase'` or `FIREBASE_` in src.
- **Note**: a Firestore-*style* compat adapter remains (`db.collection(...)`) — it is Supabase-native under the hood; migration to idiomatic supabase-js proceeds per route group (V7 modules already use supabase-js directly).

## 5. Placeholder UI on the live site

- **Fix**: ImageSlot fallback is purely decorative (no "مساحة الصورة"/"Visual slot" copy); all placeholder props removed.
- **Guard**: `audit:ux` scans src for forbidden Arabic/English placeholder phrases with no allowlist for components.

## 6. Courses visible while not ready

- **Fix**: `courses_enabled=false` feature flag; `/courses` is a polished waiting page; detail routes redirect; not in public nav.
- **Guard**: `audit:v7` requires `courses_enabled: false` default in the flags lib. Same pattern applied to workshops (`workshops_enabled=false` until content exists).

## 7. Enum-add-value transaction trap (prevented proactively)

`alter type ... add value` cannot be referenced in the same transaction. V7 therefore splits role additions (0010) from their usage (0011).

## 8. Owner-role escalation (found in V7 review)

Two admin endpoints allowed non-owner admins to grant or strip the `owner` role.

- **Fix**: owner-only checks in `users/[id]/role` and the `user_role_changed` action.
- **Guard**: `audit:security` requires both protections to exist.
