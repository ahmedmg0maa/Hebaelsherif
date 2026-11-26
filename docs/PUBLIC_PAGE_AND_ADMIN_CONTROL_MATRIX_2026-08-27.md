# Public page and Admin control matrix — 2026-08-27

Status vocabulary: `implemented-local` means code plus credential-free contract/build evidence; `environment-blocked` means the correct Staging schema/provider evidence is still required; `owner-input` means publication depends on factual or legal approval.

| Public/customer surface | Governing Admin surface | Persistence and public boundary | Current status |
|---|---|---|---|
| `/` | `/admin/pages`, typed homepage manager and copy editor | `pages`, `page_sections`, `site_settings.home_copy`; fixed registry, revisions, permission and audit | implemented-local; press block awaits 048 |
| `/start-here` | `/admin/settings` → structured journey editor | `site_settings.start_here_experience`; three fixed questions, deterministic paths, safe links, revision and audit | implemented-local; formal 049 version tables deferred |
| `/search` | catalog/content publication controls | reads only published course/book/workshop/service/article consumers; no private index | implemented-local |
| `/courses`, `/courses/[slug]` | `/admin/courses`, curriculum builder, media | synchronized domain/product publish, curriculum/file-or-text completeness, rights gate, filters, actual cover | implemented-local; persistence/rights proof requires 046 Staging |
| `/books`, `/books/[slug]` | `/admin/books`, protected delivery upload, media | synchronized publish, page/file/rights completeness, Arabic search/sort, protected account delivery | implemented-local; delivery/rights live proof environment-blocked |
| `/workshops`, `/workshops/[slug]` | `/admin/workshops` | future date, capacity, place and rights completeness; ended/full checkout denied | implemented-local; race/registration proof environment-blocked |
| `/services`, `/booking` | `/admin/bookings`, availability and service editor | active service + published product + real availability; 044/045 RPC flow | source complete; Staging 044→045 evidence environment-blocked |
| checkout/manual proof | `/admin/orders`, `/admin/payments`, settings | server-trusted price, protected proof, reviewed approval/rejection, entitlement/audit | source complete; atomic Staging exercise environment-blocked |
| customer dashboard and protected delivery | Admin catalog, orders, bookings, users | RLS, entitlements, signed URLs, rate/device/concurrency controls | source/local contracts complete; two-user/Storage Staging proof environment-blocked |
| `/about` | `/admin/settings` owner profile | governed owner profile; no inferred credential claim | implemented-local; biography/credentials owner-input |
| legal pages including `/session-policy` | `/admin/pages` | legal approval/version/effective date publication gate; fallback noindex | implemented-local; approval owner-input |
| `/resources`, `/press` | planned `/admin/resources`, `/admin/press` | requires reviewed 048 and verified source/rights model | environment-blocked; no decorative substitute created |
| verified testimonials | `/admin/reviews` | approval/feature currently exists; consent/source hardening requires 050 | environment-blocked for final public proof |

## Publication completeness contract

Course, book, workshop, and service publication is now a server decision rather than a visual toggle. It validates linked product publication, title/slug/subtitle/description/price/currency, a public-media asset with approved rights/reference, and domain requirements: course curriculum/content, protected book file, future workshop/capacity/place, or service availability/payment consistency. Domain and product states are synchronized; a linked-update failure restores the prior state.

## Admin operations additions

| Admin capability | Persistence/permission/audit boundary | Consumer/evidence |
|---|---|---|
| Secure report export | POST + same-origin + dataset permission + fresh AAL2; 366-day/5,000-row limit; audit succeeds before private CSV bytes | owner downloads bounded orders/bookings/payments/customer datasets without proof paths or formula execution |
| Revision recovery | allowlisted page/page-section/article snapshots; fresh AAL2; current checkpoint; restore as draft/hidden; audit failure rolls back | restored content returns to the existing preview/editor/publication flow and cannot republish itself |
| Responsive preview | short-lived hashed preview token and noindex; explicit mobile/tablet/desktop window | owner reviews the same governed page/home/article render before publication |
| Booking saved view | browser-local period/status only; query/PII excluded and no public/share URL | owner can reload a task-oriented agenda view without persisting customer text |
| Catalog checklist | visible factual checklist plus database-backed fail-closed publish action | owner receives precise failure feedback; public catalog/checkout remain protected |
