# ROUTE QA REPORT — V2.0.0

Every route in the master plan §5 exists and is enforced on every build by `pnpm audit:routes`
against `scripts/expected-routes.json`. HTTP + overflow verification details in
[MOBILE_QA_REPORT.md](MOBILE_QA_REPORT.md).

## Public (22) — all 200
`/`, `/about`, `/start-here`, `/services`, `/booking`, `/books`, `/books/[slug]`, `/courses`,
`/courses/[slug]`, `/workshops`, `/workshops/[slug]`, `/articles`, `/articles/[slug]`, `/contact`,
`/faq`, `/privacy`, `/terms`, `/refund`, `/disclaimer`, `/auth/login`, `/auth/register`,
`/auth/reset-password` + custom `not-found`.

## Customer (11) — all 200, session-guarded by proxy
`/dashboard`, `/dashboard/courses`, `/dashboard/courses/[slug]/learn`, `/dashboard/books`,
`/dashboard/workshops`, `/dashboard/bookings`, `/dashboard/orders`, `/dashboard/payments`,
`/dashboard/profile`, `/dashboard/notifications`, `/dashboard/settings`.

## Admin (23) — all 200, role-guarded (proxy + layout + per-action)
`/admin` (→ overview), `/admin/overview`, `/admin/products`, `/admin/books`, `/admin/courses`,
`/admin/courses/[id]/curriculum`, `/admin/workshops`, `/admin/bookings`, `/admin/orders`,
`/admin/payments`, `/admin/users`, `/admin/coupons`, `/admin/offers`, `/admin/pages`,
`/admin/articles`, `/admin/media`, `/admin/reviews`, `/admin/reports`, `/admin/settings`,
`/admin/roles`, `/admin/audit-logs`, `/admin/security`, `/admin/system`.

## Checkout
`/checkout/[productType]/[slug]` — session-guarded; unknown products 404 on the live DB.

## Guard behavior (verified live)
- Anonymous → `/dashboard/*` or `/checkout/*`: redirect to `/auth/login?redirect=…`.
- Signed-in non-admin → `/admin/*`: redirect to `/dashboard`.
- No-env demo mode: guards pass through; pages render demo/empty states (no 500s).

## Known gaps
None — every §5 route renders with real data or a designed empty state.
