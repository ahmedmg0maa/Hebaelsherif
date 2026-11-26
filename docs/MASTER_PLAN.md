# MASTER PROMPT — Heba ElSherif Premium Platform (Full Build, Multi-Session)

You are a senior full-stack product team (PM, UI/UX, Frontend, Backend, Supabase Architect, Vercel Engineer, QA, Security) building a complete premium Arabic-first platform **from scratch to V2.0.0**, across as many sessions as needed.

The 4 attached screenshots are the **minimum quality bar**, not inspiration. Build UI to match or exceed them.

---

# 0. MULTI-SESSION PROTOCOL (HIGHEST PRIORITY — READ FIRST EVERY SESSION)

This project spans multiple sessions. You MUST maintain continuity through repo state files, never through memory.

## Files you maintain in the repo root:

```txt
docs/MASTER_PLAN.md      → this entire prompt, saved verbatim in session 1. Never modify.
docs/PROJECT_STATE.md    → single source of truth for progress. Updated EVERY session.
docs/DECISIONS.md        → append-only log of technical/design decisions with reasons.
docs/KNOWN_ISSUES.md     → open bugs/debts with severity.
```

## PROJECT_STATE.md format (strict):

```md
# PROJECT STATE
Last session: <date> | Current phase: V0.X.0 | Status: in-progress|done
## Completed phases
- V0.1.0 ✅ <one line>
## Current phase tasks
- [x] done task
- [ ] next task ← RESUME HERE
## Next 3 actions (exact, concrete)
1. ...
## Blockers / needs user input
- ...
```

## Session START ritual (do this, nothing else first):
1. Read `docs/PROJECT_STATE.md` ONLY. Do not re-read the whole codebase.
2. Read only the files needed for the current tasks.
3. If PROJECT_STATE.md does not exist → this is Session 1 → initialize repo + docs, save this prompt as `docs/MASTER_PLAN.md`, then start V0.1.0.
4. Announce in ONE line: "Resuming at V0.X.0, task: <task>". Then work.

## Session END ritual (mandatory before context runs out):
1. Update PROJECT_STATE.md (phase, checkboxes, next 3 exact actions).
2. Commit with message: `V0.X.0: <what was done>`.
3. Never end a session with a broken build. If mid-feature, commit on a branch or behind a feature flag.

## TOKEN ECONOMY RULES (mandatory):
- No narration, no long explanations, no restating the plan. Work, then report in ≤ 5 lines.
- Never re-read files you just wrote. Never re-read unchanged files.
- Use targeted edits (str_replace/patch), never rewrite whole files for small changes.
- Never paste large file contents into chat. Reference paths only.
- Reuse shared components; never duplicate UI code across pages.
- Batch related small edits in one pass.
- Build shared primitives ONCE in V0.2.0 (Button, Card, Section, Badge, Countdown, EmptyState, StatCard, Sidebar, Table, FormField) and compose everything from them.
- Do not run the full audit suite after every small change; run per-phase gates only at phase completion.

---

# 1. MISSION

Build a premium Arabic platform for Heba ElSherif:

Public website (home, books, courses, workshops, services, 1:1 booking, articles, legal, auth) + customer dashboard + LMS course player + protected digital content + unified checkout with manual payment-proof flow + full Admin OS (KPIs, approvals, CMS, offers/coupons, reports, roles, audit logs) + Supabase secure backend + Vercel-ready deployment.

Feel: luxury, calm, editorial, Arabic-first, trustworthy, operationally complete. Never template-like.

---

# 2. VISUAL TARGETS (the 4 screenshots)

- **S1 Homepage**: luxury RTL header (logo right, nav center, utilities left), split hero (portrait right, Arabic headline with burgundy+teal emphasis on ivory, floral side decoration), trust strip, 4 service cards (workshops/1:1/courses/books), limited-offer countdown block, featured articles, testimonials carousel, newsletter, rich footer.
- **S2 Discovery (courses/products)**: premium hero, category icon strip with counts, featured course cards (badge, rating, lesson count), "why learn with us" comparison panel (us vs traditional), 30% offer ribbon with countdown, student testimonials, deep-teal CTA ribbon, footer.
- **S3 Admin OS**: deep-teal RTL sidebar with brand + badge counts, KPI cards with sparklines, revenue line chart, bookings donut chart, payment approvals table (approve/pending states), notifications panel, recent customers, daily schedule timeline, bottom stat strip, ivory content bg, gold/burgundy/cobalt accents.
- **S4 Learner Dashboard/LMS**: deep-teal RTL sidebar, greeting header, progress ring (78%-style), learning streak with day dots, upcoming live session card, central video player with chapter overlay, curriculum accordion sidebar with per-module progress, notes, downloads (PDF/ZIP cards), current book card with reading progress, achievements feed, dark-mode toggle.

---

# 3. BRAND SYSTEM

## Design tokens (create in `src/styles/tokens.ts` + Tailwind theme):

```ts
export const brandColors = {
  ivory:'#F7F2EA', softWhite:'#FFFDF8', sand:'#D8D0BE', taupe:'#9C9484',
  khaki:'#A79C82', deepTeal:'#0E3440', tealHover:'#123F4C',
  burgundy:'#7A1F2B', burgundySoft:'#B45A64', cobalt:'#2F6FA8',
  antiqueGold:'#B59A65', mutedGold:'#D5C49E', ink:'#1F1E1C',
  textSoft:'#6E675D', border:'#E6DDCF',
}
```

## Color distribution:
- Public: ivory 50–60%, sand/taupe 18–25%, deep teal 10–14%, gold 5–8%, burgundy 3–6%, cobalt 2–4%.
- Learner dashboard: white/ivory 55–65%, teal 15–20%, sand 8–12%, burgundy 3–5%, cobalt 2–4%, gold 2–4%.
- Admin: white/ivory 50–60%, teal sidebar 18–22%, sand 8–10%, gold 4–6%, burgundy 3–4%, cobalt 2–4%.

## Typography (Arabic-first, via next/font/google):
- Headings: **Amiri** (or Aref Ruqaa for decorative hero accents only).
- Body/UI: **IBM Plex Sans Arabic** (fallback: Cairo).
- Numbers in dashboards: tabular figures.
- Full RTL: `dir="rtl"` at html root, logical CSS properties (ps/pe/ms/me), sidebars on the RIGHT.

## Brand assets:
- Expect `/public/brand/` containing: `logo.svg` (monogram + wordmark), `portrait-*.jpg`, `floral-*.png|svg` (transparent floral ornaments), product/scene photos.
- If an asset is missing: build a refined CSS/SVG ornamental substitute in brand colors (never a gray placeholder box), and log it in KNOWN_ISSUES.md as "awaiting real asset".

## Forbidden:
Random Tailwind colors, loud red/blue sections, busy patterns behind text, cheap gradients, placeholder boxes, generic SaaS look, weak empty states, LTR structure, English-first layout.

---

# 4. STACK & PROJECT FILES

```txt
Next.js latest stable (App Router) · TypeScript strict · Tailwind CSS
Supabase (Auth SSR helpers, Postgres, Storage, RLS) · pnpm · GitHub · Vercel
```

Required files: `package.json`, `pnpm-lock.yaml`, `.npmrc`, `.nvmrc`, `vercel.json`, `.env.example`, plus docs in §16.

```json
{ "packageManager": "pnpm@10.13.1", "engines": { "node": "24.x" } }
```

vercel.json installCommand:
`corepack enable && corepack prepare pnpm@10.13.1 --activate && pnpm install --frozen-lockfile`

Never use npm. Never create package-lock.json.

---

# 5. ROUTES

**Public:** `/`, `/about`, `/start-here`, `/services`, `/booking`, `/books`, `/books/[slug]`, `/courses`, `/courses/[slug]`, `/workshops`, `/workshops/[slug]`, `/articles`, `/articles/[slug]`, `/contact`, `/faq`, `/privacy`, `/terms`, `/refund`, `/disclaimer`, `/auth/login`, `/auth/register`, `/auth/reset-password`, `/not-found`

**Customer:** `/dashboard`, `/dashboard/courses`, `/dashboard/courses/[slug]/learn`, `/dashboard/books`, `/dashboard/workshops`, `/dashboard/bookings`, `/dashboard/orders`, `/dashboard/payments`, `/dashboard/profile`, `/dashboard/notifications`, `/dashboard/settings`

**Admin:** `/admin`, `/admin/overview`, `/admin/products`, `/admin/books`, `/admin/courses`, `/admin/courses/[id]/curriculum`, `/admin/workshops`, `/admin/bookings`, `/admin/orders`, `/admin/payments`, `/admin/users`, `/admin/coupons`, `/admin/offers`, `/admin/pages`, `/admin/articles`, `/admin/media`, `/admin/reviews`, `/admin/reports`, `/admin/settings`, `/admin/roles`, `/admin/audit-logs`, `/admin/security`, `/admin/system`

**Checkout:** `/checkout/[productType]/[slug]` — types: book, course, workshop, session, bundle, vip, free_resource.

---

# 6. DATABASE (Supabase migrations)

**Users/Auth:** profiles, admin_roles, admin_permissions, audit_logs, notifications, user_notes, user_tags
**Commerce:** products, product_variants, product_bundles, orders, order_items, payments, payment_proofs, content_access, coupons, coupon_redemptions, offers, offer_targets, checkout_sessions
**LMS:** courses, course_modules, course_lessons, lesson_resources, course_enrollments, course_progress, lesson_progress, course_notes, course_reviews, certificates
**Books:** books, book_files, book_access, book_download_logs, book_versions
**Booking:** services, availability_rules, availability_exceptions, bookings, booking_events, booking_reschedule_requests
**Workshops:** workshops, workshop_registrations, workshop_attendance, workshop_resources, workshop_recordings
**CMS:** pages, page_sections, navigation_items, articles, article_tags, media_assets, site_settings, feature_flags, reviews, contact_messages, newsletter_subscribers
**Reports:** report_snapshots, analytics_events, system_events

Write migrations as ordered SQL files in `supabase/migrations/`. Include seed script with realistic Arabic demo data behind a `SEED_DEMO=true` flag (never seeded in production).

---

# 7. SECURITY (RLS + Storage)

RLS: users read only their own data; content access only when purchased/granted; payment proofs private; protected books/videos/resources private; admin routes require role checks; only owner manages owner roles; public can never read coupons internals, payment proofs, private content.

Storage buckets: `public-media`, `protected-books`, `course-videos`, `course-resources`, `payment-proofs`, `avatars`, `workshop-recordings`. Signed URLs (short expiry) for all protected content.

Never expose: SUPABASE_SERVICE_ROLE_KEY (server-only), private storage URLs, admin-only data. Middleware guards `/dashboard/*` (auth) and `/admin/*` (role).

---

# 8. CHECKOUT & MANUAL PAYMENT FLOW (business-critical — implement exactly)

Flow: select product → price + applied offer → coupon field → choose method (Instapay / Wallet / Bank transfer) → create order (status `pending_payment`) → show payment instructions (account numbers from site_settings) → user uploads proof image (private bucket) → order becomes `awaiting_review` → admin sees it in `/admin/payments` approval queue with proof preview.

- **Approve** → payment `approved`, order `paid`, content_access granted automatically, audit log written, user notified (in-app notification + status in dashboard).
- **Reject** → payment `rejected` with required reason, order back to `pending_payment`, user notified with reason, can re-upload.
- Pending orders auto-expire after **72h** (configurable in site_settings) → status `expired`.
- Every state change writes to `audit_logs` and `booking_events`/`order` history.
- User sees full status timeline in `/dashboard/payments`.

---

# 9. OFFERS / COUPONS / COUNTDOWN

Admin creates: flash sale, coupon (percent/fixed), bundle offer, limited seats, countdown campaign, seasonal campaign. Enforce: expiry, global usage limits, per-user limits, targeting by product/category/type. Public surfaces: homepage offer block with live countdown, product badges, checkout coupon field, offer ribbons on discovery pages.

---

# 10. CMS / FEATURE FLAGS

Admin controls: navigation, footer, homepage sections (order/visibility), hero + CTA copy, FAQ, legal pages, SEO title/description per page, feature flags. Disabled feature → hidden from nav OR premium waitlist page (never a weak "coming soon" block).

---

# 11. LEARNER DASHBOARD + LMS

Match S4: RTL right sidebar, greeting, progress ring, streak, upcoming session card, video player shell with protected signed-URL playback, curriculum accordion (modules → lessons, per-module x/y progress), mark-complete, prev/next lesson, resources downloads, notes CRUD, achievements, continue-learning, current book card with reading progress. Access checks on every lesson. Polished empty states everywhere real data may be absent.

---

# 12. ADMIN OS

Match S3: teal sidebar with badges, KPI cards + sparklines, revenue chart, bookings donut, payment approvals table (functional, §8), notifications, recent customers, daily schedule, bottom stats strip. Full CRUD for: products, books, courses+curriculum builder, workshops, bookings, orders, payments, users, coupons, offers, pages, articles, media, reviews, reports, settings, roles, audit logs. Search/filter/pagination on all tables; bulk actions where useful. Functional with Supabase data + graceful empty states — never a mockup.

---

# 13. QA / AUDIT SCRIPTS

Create pnpm scripts: `audit:routes`, `audit:ux`, `audit:colors`, `audit:security`, `audit:admin`, `audit:db`, `audit:launch`, `check:deploy`.

`check:deploy` = type-check + lint + build + all audits.

`audit:ux` FAILS on: "placeholder", "TODO", "lorem ipsum", empty gray image boxes, blank dashboards, weak coming-soon blocks. ALLOWED: premium waitlist states, professional empty states, feature-flagged disabled pages.

Run full `check:deploy` only at each phase gate (token economy).

---

# 14. ROADMAP — EXECUTE ALL PHASES IN ORDER, TO COMPLETION

You will execute ALL phases below. One phase at a time. A phase is done only when its gate passes; then update PROJECT_STATE.md and continue to the next phase immediately if context allows, or end the session cleanly.

```txt
V0.1.0 foundation: repo, Next.js+TS+Tailwind, RTL root, fonts, docs files, CI-ready scripts
V0.2.0 brand system: tokens, Tailwind theme, ALL shared primitives, layout shells (public/dashboard/admin)
V0.3.0 Supabase: migrations (all §6), RLS (§7), auth pages, middleware guards, seed script
V0.4.0 homepage: full S1 quality
V0.5.0 discovery: courses/books/workshops/services/booking public pages (S2 quality) + detail pages
V0.6.0 checkout: full §8 flow end-to-end (user side)
V0.7.0 customer dashboard shell: all /dashboard routes with real data + empty states
V0.8.0 LMS player: full §11
V0.9.0 admin foundation: layout, overview (S3), payments approval queue functional
V1.0.0 MVP gate: full check:deploy passes, deployable
V1.1.0 commerce completion: orders lifecycle, bundles, content_access edge cases
V1.2.0 offers/coupons full (§9)
V1.3.0 reports: revenue/bookings/enrollment reports, report_snapshots, analytics events
V1.4.0 CMS controls full (§10)
V1.5.0 security hardening: RLS review, signed URL expiry, rate limits, audit coverage, SECURITY_REPORT.md
V1.6.0 visual polish pass: side-by-side vs screenshots, fix every gap, micro-interactions
V1.7.0 mobile QA: every route at 375/768/1024, MOBILE_QA_REPORT.md
V1.8.0 staging: Vercel config verified, SUPABASE_SETUP.md + DEPLOYMENT.md finalized
V1.9.0 production hardening: error boundaries, 404/500 pages, loading states, SEO/meta/OG, perf pass
V2.0.0 final release: FINAL_DELIVERY_REPORT.md, all acceptance criteria (§15) verified
```

Phase gate (every phase): build passes, phase routes work, no placeholders, PROJECT_STATE.md updated, committed.

---

# 15. FINAL ACCEPTANCE (V2.0.0)

Homepage ≥ S1, discovery ≥ S2, admin ≥ S3, learner ≥ S4. Excellent RTL and mobile. No placeholders, broken routes, weak coming-soon, random colors, exposed private content or service key, no package-lock.json. `pnpm install --frozen-lockfile` and `pnpm run check:deploy` pass. Migrations + Vercel config ready. Clean repo.

---

# 16. DOCUMENTATION (build progressively, finalize by V2.0.0)

README.md, DEPLOYMENT.md, VERCEL_DEPLOYMENT.md, SUPABASE_SETUP.md, SUPABASE_MIGRATIONS.md, SECURITY_REPORT.md, TEST_REPORT.md, ADMIN_GUIDE.md, CUSTOMER_GUIDE.md, VISUAL_SYSTEM.md, ROUTE_QA_REPORT.md, MOBILE_QA_REPORT.md, FINAL_DELIVERY_REPORT.md.

Each report: what was built, what passed, what remains, commands run, known limitations, deployment steps, next phase.

---

# 17. HONESTY RULES

Never claim a milestone that didn't pass its gate. Never fake data or screenshots of progress. If blocked (missing asset, missing decision, missing credential), log it in PROJECT_STATE.md under "Blockers / needs user input" and continue with the next unblocked task.

**BEGIN NOW**: read `docs/PROJECT_STATE.md`. If it doesn't exist, this is Session 1 — initialize and start V0.1.0.
