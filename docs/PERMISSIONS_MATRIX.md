# Permissions matrix

This document is the authorization contract implemented by migrations 019–020 and `src/lib/auth/permissions.ts`. Database mappings are authoritative; the application constants provide navigation and pre-migration owner fallback behavior.

| Domain | owner | admin | operations | finance | content | marketing | support | editor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Admin accounts and role grants | full | view | — | — | — | — | — | — |
| System/security settings | full | view/edit | — | — | — | — | — | — |
| Orders and payment decisions | full | full | view | full | — | — | view | — |
| Bookings, availability, packages | full | full | full | view | — | — | view | — |
| Catalog, courses, books, workshops | full | full | view | — | full | view | — | view/edit content |
| Pages, articles, menus, brand media | full | full | — | — | full | full | — | edit, no publish/delete |
| Customers, inbox, notifications | full | full | full | view | — | view | full | — |
| Coupons, offers, campaigns | full | full | — | full | — | full | — | — |
| Reports and exports | full | full | operational | financial | content | marketing | support | — |
| Audit logs | full | view | scoped | scoped | scoped | scoped | scoped | scoped |

`full`, `view`, `edit`, and scoped report labels summarize executable keys such as `payments.approve`, `bookings.manage`, `content.publish`, and `roles.manage`. Page boundaries and navigation improve UX, but authorization is enforced again in every privileged server action and through permission-aware RLS.

## Implemented controls

- Eight roles: `owner`, `admin`, `operations`, `finance`, `content`, `marketing`, `support`, and `editor`.
- Owner is the explicit wildcard. Every other role requires a row in `admin_permissions`.
- `has_permission()` is `SECURITY DEFINER`, uses a fixed search path, and is executable only by authenticated/service roles.
- `requirePermission()` verifies the current user through Supabase Auth, reads database roles, and defaults to denial.
- Direct API writes are constrained by migration 020 RLS, independently of UI and server-action checks.
- The owner interface prevents deleting the final owner role and records grants/revocations in the audit log.
- `pnpm verify:permissions` checks the live mapping, owner wildcard, an allowed support action, and a denied support mutation with disposable data cleanup.
