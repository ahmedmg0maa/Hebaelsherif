# Admin Guide — Heba ElSherif V6

## Admin philosophy
The admin area is the operating system of the platform. It should let the owner manage bookings, payments, clients, content, settings, roles and reports without editing code.

## Core routes

- `/admin` — operational overview
- `/admin/bookings` — bookings, statuses, payment workflow and session operations
- `/admin/orders` — digital orders and access workflow
- `/admin/users` — client CRM and role actions
- `/admin/messages` — contact center
- `/admin/books` — book management
- `/admin/courses` — course preparation module
- `/admin/content` — protected content controls
- `/admin/analytics` — reports and metrics
- `/admin/settings` — site settings and operational configuration
- `/admin/logs` — audit trail
- `/admin/system-health` — setup and health checks

## Roles

| Role | Purpose |
|---|---|
| owner | Full platform control |
| super_admin | Full operations control except owner identity |
| admin | Daily operations and most settings |
| support | Bookings and messages |
| finance | Payments, orders and financial reports |
| content_manager | Articles, books, media and learning content |
| viewer | Read-only access |

## Required daily checks

1. Review pending payment proofs.
2. Confirm or reject new booking requests.
3. Check messages and follow-ups.
4. Review system health.
5. Monitor revenue and booking reports.

## Booking status flow

`pending_payment → payment_submitted → confirmed → completed`

Exception states:

- `cancelled`
- `rejected`
- `reschedule_requested`
- `no_show`

## Payment workflow

1. Client chooses a payment method.
2. Client uploads proof.
3. Admin reviews the proof.
4. Admin approves or rejects.
5. Approved session/order moves to the next state.

## Content workflow

- Keep courses hidden until ready.
- Books can be published individually.
- Protected files must stay in private storage.
- Access should be granted from orders or admin action only.

## Reports

Use `/admin/analytics` for operational overview. V6 also adds database objects for report snapshots so reports can become faster and exportable as data grows.
