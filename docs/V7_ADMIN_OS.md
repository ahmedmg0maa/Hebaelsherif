# V7 Admin Operating System

## Structure

Grouped sidebar (see `src/app/admin/layout.tsx`):

```txt
التشغيل اليومي   /admin  /admin/action-queue  /admin/orders  /admin/bookings  /admin/messages  /admin/tasks
المنتجات والحماية /admin/courses  /admin/books  /admin/workshops  /admin/content
العملاء والثقة    /admin/users  /admin/reviews  /admin/coupons  /admin/offers  /admin/analytics  /admin/campaigns
النظام           /admin/system-health  /admin/notifications  /admin/templates  /admin/exports  /admin/logs  /admin/settings
```

Sections not yet promoted to dedicated pages render the consistent `[section]` deferred shell (never blank, never 404).

## V7 additions

### /admin/workshops
Create workshops (draft-first), publish/hide, open/close registration, view registrations with confirm/attend/reject actions, save live/replay links (delivered only to confirmed registrants via RLS).

### /admin/coupons
Create/toggle/delete coupon codes (percentage/fixed, scope, min amount, usage limit, expiry). Coupons are never public-readable; expired/inactive codes are rejected by `validate_coupon`.

### /admin/offers
Countdown campaigns: discount type/value, target type, time window, countdown toggle, badge/CTA text, optional public coupon code. Draft → active → expired/archived lifecycle. Active offers appear automatically on the homepage banner and expire automatically.

## Server-side enforcement

- Every admin API validates the JWT and role via `requireAdminSession` (or `requireAdmin`) — hiding buttons is not security.
- V7 CRUD APIs (`/api/admin/v7/*`) validate payloads with Zod and audit every mutation via `writeAdminLog`.
- Owner protection: the `owner` role can only be granted/modified by an owner (enforced in both role routes and the actions route).
- Payment approval/rejection flows write audit logs and customer notifications.

## Roles

DB enum: `owner, super_admin, admin, operations, finance, content_manager, course_manager, support, viewer` (0010 adds the last two new ones). Current API role arrays use the operational core (owner/super_admin/admin/finance/content_manager/support/viewer); `operations`/`course_manager` are wired into V7 RLS policies and can be adopted by APIs as staffing grows.

## Audit trail

`admin_logs` (compat → audit_logs) records actor, action, target, before/after for: orders, bookings, products, protected content, users/roles, tasks, coupons, offers, workshops, registrations, access links.
