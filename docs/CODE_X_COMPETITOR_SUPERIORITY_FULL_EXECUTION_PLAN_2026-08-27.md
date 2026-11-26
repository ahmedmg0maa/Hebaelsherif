# Code X — competitor-superiority full execution plan

<!-- Governing owner-approved intake copy. -->

Date: 2026-08-27  
Project: Heba El Sherif platform  
Governing source: `hebaelsherif(2).zip`, reconciled with `ahmedmg0maa/Heba` default head `57820ab09e10d8dda94f7db1bf66ec5bb5a23e15`  
Working branch: `codex/master-merge-2026-08-27`  
Current local head at planning intake: `89ac3e2`  
Competitor benchmark: `https://www.hebaelsawah.com/`

## 1. Mission and definition of “better”

The objective is not to clone the competitor or merely increase page count. The release must be better in five provable ways:

1. **A clearer customer decision:** an Arabic-first visitor can understand Heba's promise, identify the right path, inspect real details, and complete the next action without guessing.
2. **Higher truth and trust:** no `0.00` prices, fake availability, empty collection linked as ready, unverified testimonial, invented clinical claim, or decorative control that does not persist.
3. **A real operating platform:** public content, booking, commerce, delivery, customer dashboard, and Admin all share one authoritative data model and audit trail.
4. **A stronger editorial identity:** warm, spacious, distinctly Heba, RTL-native, and visually varied without becoming a repeated grid of cards.
5. **Release evidence:** Staging must prove Auth, Admin, CMS-to-public publishing, booking/payment/delivery, security, accessibility, performance, SEO, logging, and recovery before any Production or DNS change.

Success is measured by evidence, not by visual opinion or the number of features.

## 2. Governing constraints

- Develop only in the Git-linked MASTER worktree. Comparison archives and the competitor are references, not replacement codebases.
- Preserve the current Arabic/RTL identity, logo, self-hosted fonts, palette, and expressive fictional niqabi reader. Do not imply that the illustration is Heba.
- Do not copy the competitor's text, images, trade dress, testimonials, product names, store data, or personal claims.
- Avoid metallic gold, the competitor's heavy dark treatment, loud gradients, heavy shadows, repetitive rounded-card walls, literal religious motifs, and generic “best version of yourself” copy.
- A new public section is not complete until its source, Admin mutation, permission, preview, scheduling/publication, audit record, public rendering, empty state, and tests all work.
- Production Supabase is `zfbwpubsnuijybxjuidc`; 043 is applied and must not be reapplied. 044–047 remain pending Production and must never be applied there during this program.
- Supabase Staging receives no Production customer data. No Staging Admin exists before schema/RBAC/audit/Auth redirects.
- Cloudflare Workers/vinext is the application host. Namecheap is registrar-only. Vercel configuration is historical and must not return as the target architecture.
- Do not change DNS, nameservers, Production, or the default Git branch before Staging acceptance and an explicit owner gate.
- Never request, print, log, commit, or report secrets. Any previously disclosed Staging credential must be rotated in the provider secret store.
- Migrations are forward-only and sequential. Any new product migration begins after 047 and only after 044–047 pass Staging.

## 3. Competitor audit — what to learn and what to beat

### 3.1 Strengths worth translating into Heba's product

| Competitor strength | Why it works | Heba implementation — stronger, not copied |
|---|---|---|
| Large photographic Hero and immediate authority | The visitor instantly sees a recognizable expert and a clear category | Keep Heba's wide editorial Hero and niqabi reader, strengthen hierarchy, proof, and next-step routing; use owner photography only when supplied and rights-approved |
| Dense social proof | Testimonials lower uncertainty | Publish only consented, verified reviews linked to an order/course/booking where possible; Admin approval, source/type labels, featured ordering and expiry/re-consent |
| Press and public appearances | External authority is visible | Add an Admin-governed press/appearances library with source, outlet, date, link, image rights, excerpt and featured placement |
| Broad resource navigation | Blog, videos, podcasts and assessments create discovery paths | Build one coherent Arabic Resource Hub with types, topics, search, transcripts and related offers; no thin empty pages |
| Product catalogue, bundles and offers | Commercial paths are visible | Use the existing Products/Courses/Books/Workshops domains, real variants/bundles/coupons, and direct checkout; hide anything unavailable |
| Account, cart-like commerce and currency awareness | Users expect continuity | Retain one secure customer dashboard and checkout state; add currency presentation only when the approved payment/manual route supports it correctly |
| Newsletter and chat/contact entry points | Captures visitors not ready to buy | Use the existing consented newsletter/outbox and truthful contact availability; no live-chat promise without staffing and retention rules |
| Related products and content | Extends discovery | Add Admin-controlled related paths based on real tags/audience/topic, never random or hard-coded unrelated links |

### 3.2 Weaknesses that define our opportunity

The live competitor inspection on 2026-08-27 found:

- `1:1 Coaching` shows `LE 0.00` and a disabled `Sold Out` action. This creates commercial uncertainty.
- The Books collection is publicly linked while returning no products.
- The Assessments page sends visitors to a third-party generic test library rather than an owned, brand-safe decision journey.
- Arabic and English are mixed without an intentional language strategy.
- The storefront is a conventional dark Shopify theme with duplicated slideshow/testimonial DOM and a visually generic product flow.
- A long navigation tree creates breadth, but several destinations are thin or disconnected from a clear customer decision.
- Testimonials and claims are prominent, but the visible surface does not expose consent/source/verification governance.

Therefore Heba should not compete by adding more menu items. The advantage is **a truthful guided journey, editorial warmth, real availability, and an Admin that controls the whole experience**.

## 4. Product experience principles

1. **One primary decision per screen.** Secondary exploration remains available but does not compete with the main action.
2. **Progressive disclosure.** Show enough to decide, then reveal curriculum, policies, FAQs, evidence and related paths.
3. **No dead availability.** Unavailable services disappear from transactional surfaces and show an intentional waitlist only when Admin enables it.
4. **No false emptiness.** A source error is never rendered as “zero”; it becomes a truthful unavailable/error state and an Admin system alert.
5. **Editorial rhythm instead of card walls.** Alternate full-width image/text splits, timelines, annotated lists, controlled carousels, comparison tables, pull quotes and quiet negative space.
6. **Arabic by design.** RTL, Cairo time, Arabic numerals/currency rules, meaningful Arabic microcopy and mobile first. English is optional content, not a launch requirement.
7. **Trust before conversion.** Credentials, method boundaries, what coaching is/is not, policies, real delivery format and verified reviews precede the price action.
8. **Every promise has an owner.** Availability, response time, refund terms, access period and delivery method come from Admin/configuration, not code prose.
9. **Accessible motion.** Motion explains hierarchy and state; it is short, transform/opacity-first, keyboard-safe and disabled by reduced-motion preference.
10. **Privacy by default.** No behavioral tracking, newsletter, assessment persistence or marketing attribution without purpose, minimization and consent.

## 5. Information architecture target

### Primary navigation

- ابدئي من هنا
- الجلسات والخدمات
- الدورات
- الكتب
- الورش
- المعرفة (articles + videos + podcasts)
- عن هبة

Persistent utility actions: Search, customer account, booking/checkout state when applicable. Contact, testimonials, press and legal pages live in contextual links/footer unless data shows they deserve primary navigation.

### New governed destinations

- `/resources` — unified articles/videos/podcasts hub.
- `/resources/[slug]` — one detail renderer for public resource types where appropriate.
- `/press` — verified media/appearances.
- `/testimonials` — consented proof with filters and context.
- `/search` — public search over published content/catalog only.

Do not create `/team`, `/culture`, `/gallery`, or English mirrors merely because the competitor has them. Add them only when real owner-supplied content and an operational need exist. Gallery evidence is better embedded in About, Press, Workshops and Resources.

## 6. Public page execution matrix

Every row is a complete vertical slice: UI + source + Admin + permission + audit + preview + publication + responsive/accessibility/SEO tests.

| Route | Customer job | Target experience | Admin/data authority | Acceptance evidence |
|---|---|---|---|---|
| `/` | Understand Heba and choose a next step | Editorial Hero; clear promise; real authority strip; guided start; featured service/content; verified proof; latest resource; one closing CTA | Home copy/settings, page sections/order, media, featured catalog, reviews, offers, press | Admin changes each section and order → preview → publish → public refresh; no empty or fake block; LCP/CLS budget |
| `/start-here` | Decide what suits me | A short, non-diagnostic guided pathway with progress, back/edit, transparent logic, “why this result”, and only published destinations | Governed assessment flow/questions/options/result mapping; publication state and revision | Keyboard/screen-reader completion; no health diagnosis; unpublished destination never recommended; analytics consent boundary |
| `/about` | Decide whether to trust Heba | Human story, practice boundaries, qualifications timeline, working philosophy, audience fit/not-fit, selected appearances and next step | Owner profile, credentials/press/media/page sections with rights evidence | Owner edits and reorders; credential claims link to owner evidence; no inflated or clinical claim |
| `/services` | Compare formats | Visual comparison of 1:1, courses, books, workshops and packages; real price/format/access/availability; contextual FAQ | Services, plans, feature flags, payment readiness and CMS copy | No unavailable action; price/format matches checkout; comparison is readable at 390px |
| `/booking` | Find and reserve a valid appointment | Service → availability → intake → hold countdown → login → free/paid/package confirmation → success/calendar | Services, availability rules/exceptions/overrides, holds, policies, Admin agenda | Parallel slot race, expiry/release, duplicate denial, Cairo DST, free/paid/package, cancellation/reschedule, audit |
| `/courses` | Find the right learning path | Editorial catalogue with topic/outcome/format filters, featured path, honest empty state and related resources | Courses, media, tags/topics, sort, publish/schedule/preview | Filters use published data; no invented counts; Admin publish/unpublish updates list |
| `/courses/[slug]` | Evaluate one course | Outcome, audience fit, prerequisites, curriculum preview, instructor/context, access duration, FAQs, verified reviews and fixed/sticky CTA | Course + modules/lessons/resources/media/reviews/SEO/offer | Checkout amount/access match Admin; preview lesson safe; structured data valid; protected content never leaks |
| `/books` | Browse real books | Editorial bookshelf rather than uniform product cards; format/access labels and excerpts only when authorized | Books, versions/files, media, sort, publication, offer | Empty library does not appear as a ready shop; protected download policy visible before purchase |
| `/books/[slug]` | Evaluate and buy a book | Synopsis, for whom, contents/excerpt, format/version, access terms, review proof, related content | Book/version/file/media/SEO/reviews/entitlement | Price and entitlement atomic; preview cannot expose protected file; download limits stated from config |
| `/workshops` | See upcoming/live/recorded opportunities | Upcoming timeline, availability, capacity/waitlist, recorded library distinction | Workshops, registrations, resources/recordings, capacity, dates | Timezone clear; full/cancelled states accurate; registration races and release work |
| `/workshops/[slug]` | Decide and register | Date/time, delivery, agenda, facilitator, capacity, policy, included resources/recording, CTA | Workshop + registration + media + resources + reviews | Registration/seat/payment/access atomic; no recording promise unless configured |
| `/articles` | Explore Heba's thinking | Topic-led editorial index, featured essay, recent and evergreen paths, search | Articles, tags, media, publication schedule, SEO | Draft/scheduled never public; canonical and Article schema; filter/search accessibility |
| `/articles/[slug]` | Read and continue | Comfortable Arabic reading width, table of contents for long pieces, author/date/update, related content, newsletter CTA | Article revisions/media/tags/SEO/related links | No unsafe HTML; headings/order valid; related links published; consented subscription |
| `/resources` | Discover all knowledge formats | One hub for articles, videos and podcasts with format/topic/duration filters and transcripts | New governed resource entries or a reviewed extension of articles/media; do not create parallel fake sources | Search/filter/deep link, transcript/caption proof, no dead embed, rights and consent |
| `/press` | Verify external authority | Outlet/date/type timeline with verified outbound links and selected media | Press mentions with source URL, outlet, date, excerpt, media rights, featured state | Broken/external-link checks; no self-authored item presented as independent press |
| `/testimonials` | See relevant proof | Verified reviews grouped by service/product, with consent-safe display names and context | Existing reviews plus verification/consent/source metadata if schema requires | Admin approve/feature/remove; only approved consented rows; claim and privacy review |
| `/search` | Find a known item quickly | Arabic-tolerant search over published catalog/content with grouped results and no-results recovery | Published search index; never index Admin, drafts or private delivery | Arabic query relevance, injection/abuse limits, no private result, crawl policy |
| `/faq` | Resolve hesitation | Topic accordion: services, booking, payment, access, cancellation, technical help | CMS FAQ sections and live operational settings | Answer matches configured policy; keyboard accordion; legal answers require approval |
| `/contact` | Ask a legitimate question | Purpose selector, expected response only when configured, privacy note, success state and alternatives | Contact settings, inbox, rate limits, consent/outbox | Spam/rate limit, duplicate handling, Admin inbox/reply state, no false delivery success |
| `/checkout/[productType]/[slug]` | Complete a purchase confidently | Order summary, entitlement/access, coupon, manual/sandbox payment path, proof, retry and final status | Products/prices/variants/bundles/coupons/payment methods/orders/audit | Idempotency, price revalidation, coupon race, proof duplicate denial, approval/rejection/refund |
| `/auth/login` | Return securely | Clear customer login, recovery, safe redirect, helpful error states | Supabase Auth config/session policy | open redirect denial, expiry, locked/invalid states, cookie attributes |
| `/auth/register` | Create a customer account | Minimal fields, consent, verification guidance, no forced marketing | Auth + profile + consent settings | duplicate/rate/validation/redirect tests; no Admin privilege |
| `/auth/reset-password` | Recover access | Safe reset and session revocation guidance | Supabase redirect allow-list | token expiry/reuse and wrong-origin denial |
| `/auth/admin` | Enter protected operations | Separate Admin identity entry, neutral error messages and throttling | Admin roles/throttle/security events | customer cannot enter; lockout; audit; no role-name-only bypass |
| `/auth/admin/mfa` | Satisfy AAL2/fresh assurance | TOTP challenge and fresh step-up for sensitive action | Supabase factors + Admin assurance policy | AAL1 denial, recent AMR, expiry, recovery/session revocation |
| Legal: `/privacy`, `/terms`, `/refund`, `/disclaimer`, `/session-policy` | Understand binding terms | Version/effective date/approval and environment-accurate wording; drafts noindex | Pages + legal review/version/effective date | Approved-only publish; version audit; sitemap/robots; owner/legal sign-off |
| `/preview/[type]/[id]` | Review before publishing | Authenticated, expiring, noindex preview reflecting draft data | Preview tokens/revisions/permissions | unauthorized/expired denial; preview never becomes public cache |
| Error/loading/404 | Recover from failure | Branded, truthful, route-aware recovery with support only when configured | Code + safe settings | no stack/secret leak; keyboard/focus; offline/timeout/source-error states |

## 7. Customer dashboard execution matrix

| Route | Target experience | Data authority | Acceptance evidence |
|---|---|---|---|
| `/dashboard` | Personalized next action, upcoming booking, learning progress, pending payment and recent notification; no misleading zero KPIs | Current user's profile/orders/bookings/enrollments/subscriptions only | RLS isolation between two customers; truthful unavailable/error states |
| `/dashboard/bookings` | Upcoming/history, hold/payment state, cancellation/reschedule, calendar action | Bookings/events/reschedule requests/policies | owner-only row access; cancellation/refund/credit rules; ICS belongs to caller |
| `/dashboard/orders` | Order state, line items, next action, verified-review entry | Orders/items/reviews | one customer cannot read another; review only after qualifying order |
| `/dashboard/payments` | Proof/review/refund timeline without sensitive internal notes | Payments/proofs/refunds | signed/private proof access; no bank/provider secret in UI/log |
| `/dashboard/courses` | Enrolled programmes and progress | Enrollments/progress | entitlement revocation removes access immediately |
| `/dashboard/courses/[slug]/learn` | Accessible lesson player, progress, notes, resources and resume state | Enrollment, modules, lessons, admission sessions | single concurrent video policy, device limit, signed resource URLs, progress idempotency |
| `/dashboard/books` | Owned books, versions and access state | Book access/versions | 5-per-24h and device policy; watermark/forensic pipeline only if implemented and verified |
| `/dashboard/workshops` | Registrations, upcoming info, attendance resources and recordings | Registrations/delivery/recordings | seat/attendance/entitlement conditions; unavailable recording is not promised |
| `/dashboard/notifications` | Read/unread operational messages and preference-safe marketing distinction | Notifications/outbox preferences | customer isolation; unsubscribe/consent; no silent send claim |
| `/dashboard/profile` | Edit permitted identity/contact fields with re-auth for sensitive changes | Profile/Auth | validation, audit where needed, email change verification |
| `/dashboard/settings` | Security, session, notification and privacy choices | Auth/session/preferences | revoke session, preference persistence, consent audit |

## 8. Dedicated Admin programme — functional, not decorative

### 8.1 Admin acceptance definition

An Admin screen is complete only when an authorized owner can create or update real data, see validation feedback, reload and retain it, preview it, publish/schedule it where relevant, observe its effect on the correct public/customer journey, and find the mutation in the audit log. A disabled button, local-only state or generic form without a proven consumer is not Admin functionality.

### 8.2 Admin route matrix

| Route | Owner capability | Required hardening and proof |
|---|---|---|
| `/admin/overview` | Today view: approvals, bookings, reschedules, alerts, content readiness, revenue and launch blockers | Never show source errors as zero; every quick action resolves; drill into source row; mobile agenda |
| `/admin/pages` | Home/page sections, order, visibility, navigation, SEO, preview, scheduling and legal approval | Add visual section registry and drag/order with server validation; revision diff/restore; public impact proof |
| `/admin/articles` | Draft/edit/tag/media/SEO/preview/schedule/publish/archive articles | Safe rich blocks, revision history, broken-link check, publish permission/fresh assurance where required |
| `/admin/products` | Products, variants, bundles, prices, compare prices, availability and publication | Currency/price invariants, no `0` accidental publish, related items, checkout parity |
| `/admin/courses` | Course metadata, outcome/audience/access period, publication | Curriculum completeness gate, preview lesson, entitlement/product linkage |
| `/admin/courses/[id]/curriculum` | Modules, lessons, videos/resources, preview status and order | Direct protected upload, MIME/magic/size, processing state, leak denial |
| `/admin/books` | Book metadata, version, protected file, excerpt, publication | Version/file integrity, rights, entitlement/download policy and replacement audit |
| `/admin/workshops` | Dates/capacity/delivery/registration/resources/recording | Timezone/capacity/status invariants, waitlist only if truly implemented, attendance/access |
| `/admin/media` | Upload, folder, tags, alt/caption/credit, rights, focal point, usages and archive/replace | 046 required; unverified rights cannot be public; direct upload; orphan/reference warning |
| `/admin/reviews` | Approve/reject/feature, service context, consent and source verification | Add consent/source/verification fields if absent; no public proof before approval |
| `/admin/press` (new) | Source/outlet/date/type/link/excerpt/media/feature/schedule | Outbound URL validation, source uniqueness, rights and truthful “press” classification |
| `/admin/resources` (new) | Video/podcast/resource metadata, embed/media/transcript/topic/related offer | Approved hosts or uploaded media, transcript/captions, broken embed and rights checks |
| `/admin/assessments` (new) | Questions/options/results/mapping/order/publish/preview | Non-diagnostic language gate, deterministic scoring, unpublished-destination denial, versioning |
| `/admin/bookings` | Service, availability, exceptions, overrides, agenda, holds, booking, cancellation/reschedule | 044→045 required; concurrency/permission tests; timezone and policy traceability |
| `/admin/orders` | Filter/view order state and fulfillment; no arbitrary state edits | DB-authoritative transition functions, audit, export minimization |
| `/admin/payments` | Review proof, approve/reject, refund/reconcile | Fresh MFA, idempotency, proof privacy, single entitlement effect, reason/audit |
| `/admin/memberships` | Plans, sessions/credits, duration/capacity/publication and subscriptions | Ledger invariants, expiry/capacity, customer visibility |
| `/admin/users` and `/admin/users/[id]` | Customer 360, tags, internal notes, orders/payments/bookings/subscriptions, controlled notification/entitlement | PII permission, no client-visible internal note, audit, pagination/search/export limits |
| `/admin/inbox` | Contact messages, status, notes, newsletter subscription and governed response workflow | Consent/status/source, PII minimization, no “sent” unless provider confirms |
| `/admin/offers` | Timed offers and targets | Date/target validation; expired hides automatically; price parity |
| `/admin/coupons` | Scope, limits, dates and redemption state | Atomic redemption, usage/cap race, inactive/expired denial |
| `/admin/reports` | Ready/unconfigured/error state, date filters, snapshots and secure CSV | Fresh MFA for export, least privilege, 5,000 rows, formula neutralization, audit-before-delivery |
| `/admin/roles` | Users/roles/permission matrix | AAL2/fresh assurance, owner protection, DB-authoritative permission denial, audit |
| `/admin/audit-logs` | Search/filter actor/action/entity/time and inspect safe metadata | Immutable to browser roles, redaction, pagination/export limits |
| `/admin/security` | Sessions, MFA state, throttles and security events | No secrets/TOTP recovery display; revoke sessions; AAL1 blocked |
| `/admin/settings` | Brand/contact, payment, email/monitoring names, site/SEO/feature settings | Separate public/server secret boundary; fresh MFA for operational payment settings; no raw secrets |
| `/admin/system` | Live readiness gates, migration/runtime contract, external integrations and launch blockers | Each check is ready/warning/blocker with evidence and owner action; Launch Ready impossible with blockers |

### 8.3 Admin usability upgrade

- A command/search palette for routes and entities, gated by permissions.
- Saved filters and share-free internal views; no filter state in public URLs when it exposes PII.
- Bulk actions only for safe reversible operations; high-impact actions remain explicit and audited.
- Unsaved-change protection, draft autosave where safe, field-level validation and recovery after network failure.
- Side-by-side preview for homepage/page/catalog content at desktop and 390px.
- Publication checklist showing missing image rights, SEO, price, availability, curriculum, legal approval and broken link.
- Arabic labels first; technical identifiers available in secondary copy for support.
- Tables on desktop, task-oriented stacked rows on mobile; do not compress complex Admin operations into unusable card grids.

## 9. Visual and interaction upgrade

### 9.1 Design direction

Build a warm editorial system that is more distinctive than the competitor's dark Shopify template:

- Wide Hero with strong Arabic type, calm image crop, explicit primary/secondary journey and a factual authority cue.
- Use warm ivory, charcoal-teal, muted aqua/champagne and burgundy accents with restrained antique gold—never metallic effects.
- Alternate section geometry: editorial split, anchored timeline, horizontal comparison, controlled testimony rail, large pull quote, image-led chapter divider and asymmetric catalogue shelves.
- Reduce repeated `rounded-2xl/rounded-3xl` containers. Content that belongs to the page should not always sit inside a floating card.
- Keep the niqabi character and still life as the current expressive visual language. Add new imagery only with rights, alt text, focal point and responsive treatment.
- Use animation to reveal hierarchy, not to keep the page moving. Carousels require pause/previous/next, keyboard access and reduced-motion fallbacks.
- Build clear empty, loading, error, success, disabled, sold-out, waitlist and unconfigured states as part of the system.

### 9.2 Page-specific visual benchmark

- Homepage must feel fuller than the competitor while remaining shorter in decision distance: the first meaningful CTA is visible without waiting for a slideshow.
- Product/course/service pages must show real availability and a useful next action where the competitor currently shows zero/sold out.
- Testimonials become contextual proof beside the relevant service, with a full governed proof page—not a giant repeated slider.
- Press becomes a quiet credibility timeline, not a generic blog collection.
- Resources use cover art, format, duration and topic, with excellent Arabic reading/listening ergonomics.
- Mobile navigation exposes the primary journey and search without reproducing the entire desktop menu as a long wall.

## 10. Data and migration strategy

### 10.1 Reuse before creating new domains

Reuse and strengthen existing authoritative tables for pages/sections, navigation, articles/tags, media/usages, reviews, services, products/variants/bundles, courses/curriculum, books/versions/files, workshops, offers/coupons, contact/newsletter/outbox, profiles, orders/payments/refunds, bookings/holds/events, subscriptions/credits, entitlements, notifications, audit and system events.

Do not create a second CMS, cart, Auth system, booking engine, review store, media registry or Admin role model.

### 10.2 Proposed forward-only migrations after Staging proves 044–047

These numbers are reservations, not permission to create/apply SQL before schema review:

- **048 — public authority and resources:** press mentions; governed resource metadata/type/topic/transcript/embed; relation to existing media/articles/offers; RLS and indexes.
- **049 — guided-path governance:** assessment flows, versions, questions/options, deterministic result mappings and optional consented aggregate events; never store intimate free text by default.
- **050 — review consent and verification:** source type/entity, verified-at, consent status/date/reference and public display policy; backfill remains non-public until reviewed.
- **051 — publication integrity/search:** published-content search vectors/indexes, related-content mappings and broken-link/publication-check state if application-only validation is insufficient.

Before accepting each migration: threat model, data-minimization review, downgrade/feature-disable plan, RLS/grant matrix, source contract test and sanitized Staging catalog pre/post fingerprints.

### 10.3 Analytics

Use first-party minimal events only after consent/legitimate-purpose review:

- `start_here_started/completed`
- recommendation type (not private answers unless explicitly justified)
- published item viewed
- booking/checkout step and failure category
- newsletter consent
- search with bounded/redacted query policy

Never record coaching intake, health details, payment proof content, notes, tokens or full URLs containing private identifiers in analytics.

## 11. Execution phases and hard gates

Code X must execute continuously through every locally safe phase. It stops only for a real external login/secret/cost/owner-content/Production gate. A phase is not complete when code exists; its acceptance tests and dated evidence must pass.

### Phase 0 — Baseline and evidence lock

**Work**

- Reconfirm MASTER, Git branch/remote/head/dirty tree and preserve owner changes.
- Read `AGENTS.md`, current state/decisions/issues/testing and all 2026-08-27 intake/merge/Staging/audit documents.
- Inventory routes, tables, actions, permissions, feature flags, provider commands and current public/Staging headers.
- Capture current local desktop/390px baselines when browser tooling is available; store only non-sensitive evidence outside release artifacts.

**Exit:** source tree is clean or user-owned changes are isolated; baseline build/audits are reproducible; no external write.

### Phase 1 — IA, content model and visual tokens

**Work**

- Finalize navigation and footer hierarchy from the target IA.
- Define reusable editorial section registry and content schemas, not arbitrary unsafe JSON.
- Define typography, spacing, image ratios/focal points, section rhythm, focus, states and motion rules.
- Map every public promise to Admin/data/config ownership.

**Exit:** route/content/admin mapping has no orphan public section and no Admin control without a consumer.

### Phase 2 — Homepage superiority slice

**Work**

- Rebuild Home into an editorial sequence: Hero → factual trust → guided start → core paths → selected authority/press → featured offer/content → contextual verified proof → final CTA.
- Make every section/order/copy/media/CTA Admin-controlled with fixed safe variants.
- Remove repetitive card geometry and improve mobile reading/CTA priority.

**Exit:** Admin creates/edits/reorders/previews/schedules/publishes; public reflects it; no unavailable action; visual/regression/accessibility/SEO tests pass.

### Phase 3 — Guided discovery and search

**Work**

- Upgrade `/start-here` from hard-coded questions to versioned, Admin-governed, non-diagnostic flow.
- Implement published-only `/search` and related-path rules.
- Add minimal consent-safe journey metrics only if the analytics boundary is approved.

**Exit:** deterministic results, unpublished target denial, keyboard/screen-reader completion, privacy review, Admin/public/audit proof.

### Phase 4 — Catalog and detail-page quality

**Work**

- Upgrade services, courses, books and workshops indexes/details with real filters, comparison, outcome/audience/access/availability, FAQs, reviews and related resources.
- Enforce publication completeness: price, availability, media rights, SEO, access terms and required curriculum/file/date fields.
- Ensure no empty collection appears as a functioning shop.

**Exit:** each Admin catalog mutation affects the correct public/detail/checkout/dashboard consumer and survives reload.

### Phase 5 — Authority and resource hub

**Work**

- Implement Resources, Press and Testimonials domains using 048/050 only after migration review/Staging prerequisites.
- Add video/podcast transcript/caption paths, topic/format filtering and contextual related services.
- Expand About using real biography, credentials and practice boundaries supplied/approved by Heba.

**Exit:** rights/source/consent verified; no copied competitor material; broken links/embeds pass; Admin preview/publication/audit proven.

### Phase 6 — Booking and customer conversion

**Dependency:** Supabase Staging baseline/parity through 043, recovery point, then 044→045.

**Work**

- Finish mobile-first service/slot/intake/hold/review/confirmation UX.
- Complete free/paid/package flows, expiry/release, duplicate prevention, cancellation/reschedule and calendar.
- Add truthful sold-out/waitlist handling only if capacity and notification delivery are implemented.

**Exit:** live Staging race/RLS/RPC/hold/expiry/free-paid-package/cancel-reschedule/audit journeys pass with synthetic data.

### Phase 7 — Checkout, payment and entitlements

**Work**

- Harden summary, coupon, proof/review, retries, approval/rejection/refund and entitlement visibility.
- Use the owner-approved manual/sandbox path; do not add a payment provider merely for benchmark parity.
- Show currency only when actual settlement/display behavior is defined.

**Exit:** atomic/idempotent Staging journeys; no double grant/refund; protected proof access; Admin/customer/audit convergence.

### Phase 8 — Customer dashboard and protected delivery

**Dependency:** 043 parity and Staging Storage configuration; 046 for full media governance.

**Work**

- Upgrade dashboard overview and each booking/order/payment/course/book/workshop/notification/profile/settings route.
- Prove entitlements, signed delivery, concurrency/device/download limits, resource access, progress and revocation.
- Improve learning UX: resume, accessible player, transcript/captions where supplied, notes/progress and clear unavailable states.

**Exit:** two-user isolation, revocation, range/MIME/magic, device/concurrency, audit/log redaction and mobile learning tests pass.

### Phase 9 — Admin operations programme

**Work**

- Execute every route in the Admin matrix, prioritizing page builder/home, content/catalog, bookings/payments, customer 360, reports, security/system.
- Add command search, saved filters, preview sizes, publication checklist, revision recovery and safe mobile task views.
- Close any control that does not persist or affect a consumer.

**Exit:** permission matrix and fresh-MFA paths pass; every high-impact action is audited; owner can operate without code edits.

### Phase 10 — Supabase recovery, Staging schema and Auth

**Hard order**

1. Secure logical backup + isolated restore drill in a temporary target; record checksum/RPO/RTO/integrity, then clean target/artifacts.
2. Confirm distinct empty Staging; apply 000–043; create schema fingerprint and compare with Production-043 metadata.
3. Create Staging recovery point; apply 044→045→046→047; run sanitized pre/post contracts.
4. Review/apply accepted 048+ migrations only after their own threat/RLS/data reviews.
5. Configure Staging Site URL/redirect allow-list.
6. Create real Staging Admin outside chat, attach approved role, enroll MFA/AAL2 and test AAL1 denial/session expiry/audit.

**Exit:** `SUPABASE STAGING ACCEPTED` evidence exists. No Production migration.

### Phase 11 — Cloudflare Workers Staging

**Work**

- Rotate disclosed Staging Basic Auth secret.
- Connect the approved GitHub branch to Cloudflare Workers Builds.
- Use project-derived commands: isolated Staging vinext build, generated Wrangler config, separate Worker, Staging Supabase variables/secrets only.
- Deploy to workers.dev first; keep DNS/nameservers untouched.
- Verify bindings, no source maps, headers, cache rules, logs and runtime errors.

**Exit:** current commit/deployment ID is recorded and full public/Auth/Admin/dashboard journeys run on the Workers.dev URL.

### Phase 12 — Quality, security and launch rehearsal

Run the complete matrix in section 12. Fix root causes, rerun affected suites, then rerun the full gate. No waived P0/P1 failure and no skipped critical journey.

**Exit:** desktop/390px acceptance, WCAG 2.2 AA, performance budgets, security/secret/dependency/headers/RLS/RPC/Storage tests, broken links, SEO crawl and Worker logs all pass.

### Phase 13 — Owner content and operational acceptance

**Owner-controlled inputs**

- Real biography/credentials and permitted claims.
- Current services/prices/durations/availability/cancellation/refund/access terms.
- Product/course/book/workshop content and media rights.
- Testimonials with consent/source and press links.
- Legal text approval/version/effective date.
- Payment, support, sender and monitoring choices.

**Exit:** content readiness has no blocker; owner completes a documented Admin rehearsal and approves Staging visually/functionally.

### Phase 14 — Production change proposal

Prepare, but do not execute without a new explicit authorization:

- exact commit and immutable release artifact;
- fresh backup/recovery proof and rollback/forward-fix owner;
- migration diff/order and maintenance/traffic plan;
- Cloudflare Production variables/secrets/bindings and DNS change list;
- smoke/canary/monitoring plan and abort thresholds.

### Phase 15 — Production rollout and closure

Only after explicit approval: deploy immutable build, apply separately authorized Production migrations in the reviewed order, verify canary/smoke/logs, then route DNS. Record exact evidence. Never force-push or rewrite migration/Git history.

## 12. Mandatory verification matrix

### Code and build

- TypeScript route generation/type-check.
- ESLint with zero errors.
- Isolated Next production build without `.env` inheritance.
- Isolated generic and Staging vinext/Workers builds.
- Lockfile/supply-chain and recursive release-archive inspection.
- Secret scan over tracked/untracked candidate files, generated Worker output and release archive.

### Database and backend

- Migration prefix/order/hash and schema fingerprint.
- RLS catalog and real anon/auth/admin permission probes.
- RPC grants/denials and direct-table bypass checks.
- Booking parallel requests, holds, expiry/release, Cairo DST, cancel/reschedule, free/paid/package.
- Checkout concurrency/idempotency/coupon/redemption/proof/approval/rejection/refund/entitlement.
- Storage upload/finalize magic/MIME/size, rights, range, signed URL, download/device/video concurrency and revocation.
- Audit fail-closed for sensitive export/mutations; metadata redaction.

### Browser journeys

- Desktop Chromium and 390px mobile for all primary public routes.
- Tablet/large desktop geometry and no horizontal overflow.
- Light/dark only where the product deliberately supports both.
- Keyboard-only, focus visibility/order, skip link, labels, errors and modal/menu escape.
- Reduced motion, zoom 200%, Arabic text expansion and long real content.
- Anonymous/customer/Admin separation; AAL1 denial and fresh AAL2 success.
- Full journey: Admin creates/publishes service or content → public discovery → customer register/login → booking/purchase → free/manual/sandbox result → Admin sees it → customer dashboard sees it → cancellation/reschedule/refund/entitlement → audit updates.
- Broken buttons/links/forms, 404s, external links and embed failures.

### Accessibility

- Automated axe with zero serious/critical violations.
- WCAG 2.2 AA manual keyboard and screen-reader spot checks.
- Correct landmarks/headings/names, form instructions/errors, contrast, touch targets, focus restoration and carousel controls.
- Captions/transcripts for published audio/video when required; images have useful or empty alt.

### Performance

- Staging mobile Lighthouse target ≥90 for Performance/Accessibility/Best Practices/SEO, treated as a diagnostic not a guarantee.
- Field-oriented budgets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75 target after Production observation.
- Per-route JS/image/font budgets; no new heavy UI library without measured need.
- Responsive images, self-hosted fonts, cache rules, streaming/loading states and query/index review.

### SEO and content integrity

- Unique title/description/canonical and one H1 per public indexable route.
- Sitemap/robots/noindex for draft/preview/Auth/Admin/dashboard/checkout as appropriate.
- Organization/Person, Article, Course, Book, Product/Offer, Event, FAQ and Breadcrumb structured data only when the page has complete factual fields.
- Arabic Open Graph/Twitter assets, share previews, redirects, pagination/filter canonicals and no duplicate thin pages.
- No unapproved legal, therapeutic, bestseller, certification, outcome or response-time claim.

### Cloudflare and operations

- CSP/HSTS/nosniff/referrer/permissions/frame headers and no source maps.
- Cache bypass for Auth/Admin/dashboard/checkout/signed delivery; correct caching for public ISR/assets.
- Basic Auth/noindex on Staging, rotated secrets, separate Worker and Supabase ref.
- WAF/rate-limit rules inventory and safe tests; avoid claiming WAF readiness from headers alone.
- Worker logs/error window, alert delivery/redaction, health check and rollback/feature-disable rehearsal.
- Backup archive checksum, isolated restore integrity, RPO/RTO and named restore owner.

## 13. Priority order

### P0 — required for a safe publishable platform

- Recovery/restore, Staging schema/RBAC/Auth and Cloudflare current-build deployment.
- Working Admin login/AAL2 and real CMS-to-public, booking, checkout/payment, dashboard, delivery and audit journeys.
- Homepage/services/start-here/catalog detail truth; no dead/zero/sold-out mismatch.
- Legal/content approval, secrets/headers/RLS/RPC/Storage, browser/accessibility/SEO/performance launch gates.

### P1 — creates clear superiority over the competitor

- Editorial homepage/page redesign and reduced card repetition.
- Governed Press, Resources and contextual Testimonials.
- Admin-governed guided assessment, public search and related-content system.
- Publication checklist, revision recovery, responsive Admin preview and improved customer learning dashboard.

### P2 — only after evidence of need

- English localization.
- Multi-currency settlement/display.
- Live chat.
- Team/Culture/Gallery standalone pages.
- Advanced personalization, recommendation ML, community features or marketing automation.

P2 omissions must not lower launch readiness when a clear truthful alternative exists.

## 14. Code X working protocol

1. Read the governing files before editing: `AGENTS.md`, `PROJECT_STATE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `TESTING.md`, all 2026-08-27 intake/merge/Staging/audit documents, then this plan.
2. Confirm branch, remote, head, dirty tree and owner changes. Never use force push, destructive reset or history rewrite.
3. Work in small vertical slices. Each slice names customer outcome, Admin source, schema/API/Auth/RLS impact, failure states, tests and evidence.
4. Prefer the smallest safe reuse of current components/tables/actions. Do not replace Auth/Admin/Booking/Storage/Checkout wholesale.
5. Use a fixed validated CMS section registry. Do not allow arbitrary component names, raw script or unsafe HTML from Admin.
6. Make source errors explicit. Never substitute demo/fake content in an environment represented as real.
7. New migrations are additive/forward-only, reviewed and unapplied to Production until separately authorized.
8. After each phase: run targeted checks, update source contracts, then run the phase gate. Update state/decisions/issues and commit with a narrow message.
9. Do not package screenshots, traces, auth state, `.env*`, Supabase temp metadata, dumps, dependencies or build/test output.
10. Continue automatically through locally safe phases. Pause only when an exact external action is unavoidable, and request one consolidated owner action with no secret in chat.
11. Do not call a feature complete until Admin persistence, public/customer consumption, denial paths and audit are proven.
12. Do not award 100/100 without live Staging/Production evidence appropriate to the claim.

## 15. Required evidence documents

Update continuously:

- `docs/PROJECT_STATE.md`
- `docs/DECISIONS.md` — append only
- `docs/KNOWN_ISSUES.md`
- `docs/TESTING.md`

Create per executed programme:

- `docs/COMPETITOR_BENCHMARK_AND_DESIGN_ACCEPTANCE_2026-08-27.md`
- `docs/PUBLIC_PAGE_AND_ADMIN_CONTROL_MATRIX_2026-08-27.md`
- `docs/CONTENT_AND_OWNER_INPUT_REGISTER_2026-08-27.md`
- `docs/SUPABASE_STAGING_SCHEMA_RLS_AUTH_EVIDENCE_2026-08-27.md`
- `docs/CLOUDFLARE_WORKERS_STAGING_RUNTIME_EVIDENCE_2026-08-27.md`
- `docs/END_TO_END_CUSTOMER_AND_ADMIN_ACCEPTANCE_2026-08-27.md`
- `docs/FINAL_PREPRODUCTION_AUDIT_AND_SCORE_2026-08-27.md`

Each evidence document separates: executed PASS, failed, environment-blocked, owner/provider-required and not-run-by-design. Historical claims are not current evidence.

## 16. Final release decision rule

Return exactly one of:

- **`STAGING ACCEPTED — READY FOR OWNER PRODUCTION AUTHORIZATION`** only when the current commit is deployed to the separate Worker, the separate Supabase Staging schema/Auth/Admin is accepted, the full Admin→public→customer→operations journey passes, and all P0 gates have evidence.
- **`BLOCKED`** with the exact failed/missing gate and the single next owner/provider action.

Local build success, a protected 401 Staging endpoint, an attractive screenshot, an Admin route list, or a report saying “passed” cannot substitute for this rule.
