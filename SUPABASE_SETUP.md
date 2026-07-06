# Supabase Setup — Heba ElSherif V6

## 1. Create the project
Create a Supabase project for staging first, then production. Use the same region strategy as the app deployment.

## 2. Environment variables
Copy `.env.example` to `.env.local` and fill:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
ADMIN_SEED_EMAIL=
INSTAPAY_PHONE=01037141322
WHATSAPP_PHONE=01037141322
```

## 3. Apply database migrations
Run the migrations in order from `supabase/migrations`.

Required V6 migration chain:

1. `0001_extensions_and_enums.sql`
2. `0002_profiles_roles_settings.sql`
3. `0003_booking_commerce_content.sql`
4. `0004_content_access_and_audit.sql`
5. `0005_booking_functions.sql`
6. `0006_rls_policies.sql`
7. `0007_storage_and_seed.sql`
8. `0008_legacy_compatibility_tables.sql`
9. `0009_admin_os_hardening.sql`

## 4. Storage buckets
Confirm these buckets exist:

- `public-media`
- `protected-books`
- `payment-proofs`
- `avatars`

`protected-books` and `payment-proofs` must never be public.

## 5. Owner admin
Create the first user in Supabase Auth, then insert/update `profiles` and `admin_roles` so the first owner has full access.

Recommended roles:

- `owner`
- `super_admin`
- `admin`
- `support`
- `finance`
- `content_manager`
- `viewer`

## 6. Production check
Before connecting the live domain, run:

```bash
npm run check
```

Then test the full journey on staging: register, book, submit payment proof, approve from admin, view the confirmed session in dashboard.
