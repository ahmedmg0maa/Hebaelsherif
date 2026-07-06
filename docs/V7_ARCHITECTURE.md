# V7 Architecture — Heba ElSherif Global Platform

## Stack

```txt
Next.js 16 (App Router) • React 19 • TypeScript • Tailwind CSS • Zod
Supabase: Auth + Postgres (RLS) + Storage
pnpm 10.13.1 • Node 24.x • Vercel (fra1)
```

## Layers

```txt
┌─ Public site (Arabic-first RTL, mostly client pages + new V7 server pages)
│    /, /services, /booking, /books, /workshops, /articles, legal pages
│    Feature flags decide courses/workshops visibility (src/lib/flags.ts)
├─ Customer dashboard (/dashboard/*) — auth-guarded client pages
├─ Admin OS (/admin/*) — role-guarded client pages + [section] deferred shell
├─ API routes (route handlers)
│    • user-scoped: bearer token → anon client + RLS → RPC (bookings, workshop registration)
│    • admin: requireAdminSession → service-role client + writeAdminLog (audit)
└─ Supabase
     • RPCs with advisory locks: create_booking_with_lock, register_workshop_with_lock
     • RLS on every sensitive table • storage buckets private-by-default
```

## Data-access patterns

1. **Public reads** — anon client, RLS exposes only published/public rows (books, workshops, offers, site_settings public keys).
2. **User writes** — API route forwards the user's JWT to a scoped client; DB RPC enforces business rules atomically (no client-trusted pricing/slots).
3. **Admin operations** — `requireAdminSession` verifies JWT + role from profiles, then a service-role client performs the mutation; every mutation writes `admin_logs`/`audit_logs`.
4. **Compat layer** — older admin/dashboard modules use a Firestore-style adapter (`db.collection(...)`) that maps to Supabase tables with column whitelists. It is Supabase-native under the hood. New V7 modules (workshops, offers, coupons admin) use idiomatic supabase-js; migrate remaining routes gradually.

## Feature flags

`site_settings` key `features` (public row):

```json
{ "courses_enabled": false, "workshops_enabled": false, "books_enabled": true, "booking_enabled": true, "maintenance_mode": false }
```

Server pages read via `getFeatureFlags()` (safe defaults, env override `NEXT_PUBLIC_FEATURE_*`). Courses and workshops render polished waitlist states when disabled — never fake products.

## Unified commerce direction

Orders (`orders` + `product_type`) already unify books/courses payments; bookings and workshop registrations carry their own payment lifecycle but share: manual payment methods, payment proofs, coupon engine, notifications, audit logs, and admin review queues. `offers` sits above all product types as the campaign layer (countdown + public coupon code), while `coupons` remains the private redemption engine.

## Protected content delivery

- `protected-books`, `course-videos`, `course-resources`, `workshop-recordings`, `payment-proofs`: private buckets.
- Access checks (content_access / course_enrollments / workshop_registrations) happen in server routes; delivery via short-lived signed URLs.
- Workshop live/replay links live in `workshop_access_links` (separate table) so workshop rows stay public-readable without leaking links; RLS grants SELECT only to confirmed registrants and admins.
