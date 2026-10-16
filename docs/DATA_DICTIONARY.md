# Data dictionary

The live schema is migration-driven under `supabase/migrations`. This is the operational index; migrations remain the structural source of truth.

| Domain | Primary records | Purpose / invariants |
|---|---|---|
| Identity | `profiles`, `admin_roles` | One profile per Auth user; privileged access must be explicit and auditable. |
| Catalog | `products`, `product_variants`, `product_bundles`, `courses`, `books`, `workshops`, `services` | Sellable/editorial records use draft/published lifecycle and stable slugs; variants own authoritative prices and bundles own explicit non-nested child composition. |
| Learning | modules, lessons, enrollments, progress, notes, resources | Private delivery requires a valid access grant; progress changes are user-scoped. |
| Commerce | `orders`, order items, `payments`, coupons, offers, redemptions | Server owns prices and totals; migrations 022–024 lock rows and atomically create checkout/proofs, review payments, transition orders, and reconcile access. |
| Booking | `bookings`, availability rules/windows, exceptions, session services | Cairo time is the business timezone; multiple same-day windows are allowed but overlapping windows/active bookings are forbidden. |
| Memberships | plans, `subscriptions`, `subscription_credit_ledger` | Capacity, validity, consume/restore history, idempotency, and remaining credit are ledger-backed; package bookings link the subscription and consume one credit atomically. |
| CMS | pages, articles, revisions, testimonials/reviews, menus/settings | Draft/publish state is explicit; revisions preserve accountability. |
| CRM | contact messages, newsletter subscribers, notifications | Consent/status/history must be retained; sensitive fields are admin-only. |
| Operations | audit logs, report snapshots, analytics events | Mutations record actor, action, entity, and safe before/after context. |

## Conventions

- UUID primary keys; UTC timestamps in storage; business dates displayed in `Africa/Cairo`.
- Money uses fixed numeric values plus an explicit currency; never floating-point client authority.
- Public reads require published/active predicates. Owner-only records must never be exposed through anon policies.
- Deletion policy is domain-specific: use archival/soft deletion when a record has financial, access, or audit history.
- New Phase 1–10 entities must be added here when their migration lands.
