# Supabase Migrations — Heba ElSherif V7

## Order

Apply in strict order (each file is one transaction):

| # | File | Purpose |
| --- | --- | --- |
| 0001 | extensions_and_enums | pgcrypto, btree_gist, enums |
| 0002 | profiles_roles_settings | profiles, admin_roles, site_settings, auth trigger |
| 0003 | booking_commerce_content | services, coupons, bookings (**trigger-based slot_range** + GiST no-overlap), orders, articles |
| 0004 | content_access_and_audit | books, book_files, content_access, reviews, audit_logs |
| 0005 | booking_functions | validate_coupon, create_booking_with_lock (advisory lock) |
| 0006 | rls_policies | RLS for all core tables |
| 0007 | storage_and_seed | buckets (public-media, protected-books, payment-proofs, avatars) + seeds |
| 0008 | legacy_compatibility_tables | compat tables/columns for admin modules |
| 0009 | admin_os_hardening | permissions, activity logs, payment methods, report views (**enum ::text**) |
| 0010 | v7_roles | adds `operations`, `course_manager` roles (own file: enum values must commit before use) |
| 0011 | v7_platform_foundation | feature flags seed, course LMS, workshops (+capacity RPC), offers, refunds, download logs, RLS |
| 0012 | v7_storage | course-videos, course-resources, workshop-recordings buckets + policies |

## How to apply

CLI (recommended):

```bash
supabase link --project-ref <ref>
supabase db push          # or: supabase migration up
```

Dashboard fallback: run each file's SQL in order in the SQL editor.

## Incident guards baked into the files

1. **0003**: `slot_range` is a plain column maintained by `trg_bookings_slot_range` — a generated column with `tstzrange(timestamptz,...)` fails with `generation expression is not immutable` (SQLSTATE 42P17).
2. **0009**: report views compare enum columns as `::text` because `payment_status` has no `'paid'` value — direct enum literals abort the migration.
3. **0010** is intentionally tiny: `alter type ... add value` cannot be used in the same transaction that references the new value, so usage starts in 0011.

## After applying

1. Verify RLS: `select tablename from pg_tables where schemaname='public'` and spot-check policies on coupons, payment_proofs, workshops, offers.
2. Seed the owner (see `DEPLOYMENT.md` → Admin bootstrap).
3. Feature flags live in `site_settings` key `features` (public row): toggle `courses_enabled` / `workshops_enabled` when content is ready.
4. Optional: regenerate types — `pnpm run db:types`.

## V8 migration

Apply after the previous V7 migrations:

```bash
supabase db push
```

New migration:

```txt
0013_v8_unified_platform.sql
```

It adds the unified product/checkout/CMS/reporting foundation:

- `products`
- `product_bundles`
- `checkout_sessions`
- `page_sections`
- `navigation_items`
- `learning_snapshots`
- `offer_targets`

Staging is required before production because these tables connect public product discovery, protected access, checkout, and admin CMS controls.
