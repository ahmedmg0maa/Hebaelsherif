# SUPABASE SETUP

> **Status (2026-08-29):** migration 043 is the last production-confirmed boundary recorded by this source.
> A read-only preflight previously verified migrations 000–043. Migrations 044–081 are local-only and
> require an authorised staging window, recovery evidence and the order documented in
> `BOOKING_LAUNCH_RUNBOOK.md`. This file does not authorize a database change.
>
> **Legacy schema note:** the project contained an earlier schema attempt with real rows.
> Migration `000_relocate_legacy.sql` moved it untouched into the `legacy` schema and
> `013_port_legacy_data.sql` ported the real data (services, payment/brand settings) into the
> current schema. Drop the `legacy` schema only when certain it is no longer needed.
>
> **Owner bootstrap:** every administrator uses her own Supabase Auth email/password and AAL2 MFA.
> `public.admin_roles` is authoritative; no shared `ADMIN_LOGIN_EMAIL` exists. §5 is the separately
> authorized first-owner recovery/bootstrap procedure.

## 1. Create the project
1. Create a project at https://supabase.com/dashboard (region close to Egypt, e.g. `eu-central-1`).
2. Copy from Project Settings → API: `Project URL`, `publishable` key, `anon` key, and `service_role` key.
3. Fill `.env.local` from `.env.example` (service role key stays server-only, never `NEXT_PUBLIC_`).

## 2. Apply migrations
For a newly authorised isolated environment only:
```bash
supabase login            # once per machine
supabase link --project-ref <ref>
supabase db push          # only after reviewing the exact pending set for that environment
```
Do not use this generic procedure for production. Production changes must name the exact forward migrations and have a separate approval, backup/recovery evidence, staging verification and rollback plan.

## 3. Storage
Migration `010_storage.sql` creates the buckets (`public-media`, `avatars`, `protected-books`,
`course-videos`, `course-resources`, `payment-proofs`, `workshop-recordings`) and their policies.
Protected buckets are served exclusively through short-lived signed URLs generated server-side
after a `content_access` check.

## 4. Auth
- Email/password is used. Enable "Confirm email" in Auth → Providers → Email.
- Set Site URL (Auth → URL Configuration) to the deployed domain; add `http://localhost:3000` to redirect allow-list.
- Migration 070 makes `handle_new_user` auto-create only a bounded customer `profiles` row plus minimized audit evidence. It never grants an Admin role; live trigger evidence remains a Staging acceptance test until that source-only migration is authorized and applied there.

## 5. First admin (owner)
This is a separately authorized environment bootstrap—not part of public signup. After verifying the first owner's confirmed Auth identity, an operator with direct database authority may run in SQL editor:
```sql
insert into public.admin_roles (user_id, role)
select id, 'owner' from auth.users where email = 'OWNER_EMAIL_HERE';
```

## 6. Demo data (never in production)
```bash
SEED_DEMO=true DATABASE_URL="postgres://..." pnpm db:seed
```
The seeder refuses to run without `SEED_DEMO=true` and blocks remote URLs unless `SEED_ALLOW_REMOTE=true`.
