# V7 Database Schema Overview

Native tables use uuid keys; 0008 compat tables use text keys. LMS tables reference the text ids of the 0008 `courses`/`course_lessons` tables.

## Identity & settings

| Table | Notes |
| --- | --- |
| profiles | 1:1 with auth.users, role column drives admin access |
| admin_roles, admin_permissions | role/permission matrix (owner-writable) |
| site_settings | key/value + is_public; key `features` = feature flags |
| audit_logs, admin_activity_logs, system_events | audit trail |

## Booking

| Table | Notes |
| --- | --- |
| services, availability_rules, availability_exceptions | offer + calendar rules |
| bookings | trigger-maintained `slot_range` + GiST exclusion (no overlap, 30-min buffer), status/payment enums |
| booking_events | timeline |
| payment_proofs, payment_methods, payment_attempts | manual payment lifecycle |

RPC: `create_booking_with_lock(payload)` — advisory lock + Cairo date rules.

## Commerce

| Table | Notes |
| --- | --- |
| orders, order_items, invoices, refunds | unified order lifecycle (product_type: book/course/bundle) |
| coupons (+ per_user_limit), coupon_redemptions | private redemption engine |
| offers | public campaign layer: window, countdown_enabled, target_type/ids, optional public_coupon_code |
| content_access | grants (book/course), expiry-aware |
| book_files, book_download_logs | protected files + download telemetry |

## Course LMS (V7)

| Table | Notes |
| --- | --- |
| courses, course_lessons (0008) | catalog + lessons (module_id, video_url, is_free_preview added in 0011) |
| course_modules | ordered curriculum sections |
| lesson_resources | files per lesson (enrolled-only RLS) |
| course_enrollments | unique(user, course), status/source/expiry |
| lesson_progress | unique(user, lesson), completed + seconds_watched |
| course_notes, certificates | notes per lesson; unique certificate per user+course |

## Workshops (V7)

| Table | Notes |
| --- | --- |
| workshops | kind live/recorded/hybrid/webinar/group, capacity, publish_status |
| workshop_registrations | unique(user, workshop), status incl. waitlisted, payment lifecycle |
| workshop_attendance | one row per registration |
| workshop_resources | files/replays (confirmed-only RLS) |
| workshop_access_links | live/replay URLs, RLS: confirmed registrants + admins only |

RPC: `register_workshop_with_lock(workshop_id, payload)` — advisory lock, capacity check → waitlist, free workshops auto-confirm.

## RLS principles

- Users read/write only their own rows (enrollments, progress, registrations, orders, proofs).
- Public reads limited to published content and active offers.
- Coupons, payment proofs, protected files, access links: never public.
- Admin writes scoped by role arrays via `public.is_admin(...)`.
