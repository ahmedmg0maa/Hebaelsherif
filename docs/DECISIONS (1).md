# DECISIONS (append-only)

> نسخة تاريخية غير مكتملة توقفت قبل قرارات 2026-08-29. المرجع الحالي هو `DECISIONS.md`، وقد ألغى قرار الهوية الفردية استخدام `ADMIN_LOGIN_EMAIL`.

## 2026-08-25 — Fresh step-up for high-impact administration
- **AAL2 alone is not sufficient for irreversible high-impact mutations.** Payment approval/rejection, refunds, role grants/revocations/permission edits, and operational payment settings now require a TOTP or WebAuthn AMR event no older than ten minutes after the normal server-side user, AAL2, application-session, and permission checks succeed.
- **Step-up proof stays in the validated Auth session; no new secret or OTP is persisted.** The server inspects the AMR timestamp only after `requirePermission()` has validated the current session. The `reauth=1` MFA route deliberately does not auto-forward an existing AAL2 session and establishes the admin session only after a new successful factor verification.
- **Unknown reports are not zero reports.** Report reads now carry explicit `ready`, `unconfigured`, or `error` state. The UI and report-snapshot action deny misleading output when the source is not readable; this is an operations-safety rule, not a substitute for monitoring.

## 2026-08-16 — Launch security roadmap reset
- **Security gates preempt the prior reports phase.** The owner-approved August roadmap makes credential replacement, administrative MFA, private-delivery controls, and restore evidence the immediate sequence before new reporting or cosmetic scope.
- **New Supabase secret keys are the target, not a rotated legacy JWT.** Server code now accepts `SUPABASE_SECRET_KEY` first and retains the old service-role name only as a temporary cutover fallback; the old key must be deleted after the new deployment is verified.
- **A restore test must be isolated.** Production restore creates downtime and is not used as a health check. Evidence must come from a controlled branch/duplicate/rehearsal, and Storage preservation is checked independently of database backup.

## 2026-08-15 — Master Phase 8 CRM and verified trust
- **Review submission has one purchase-verified boundary.** Legacy browser insert policies were removed; authenticated customers call a narrowly scoped RPC that proves a current entitlement and records the originating order, while all moderation stays server-side and audit-logged.
- **Review moderation is recoverable.** Rejection and archival retain the review and internal reason; restoring returns it to pending rather than silently republishing it. A customer must explicitly consent before a profile display name is attached.
- **CRM links messages without exposing profiles.** A security-definer trigger matches normalized contact email to an internal customer id, while anonymous senders retain no read path to that relation.
- **Outbound email is fail-closed by configuration.** Replies always create an auditable outbox record; without an enabled provider the record is `disabled` and no message leaves the platform.

## 2026-07-12 — Master rebuild Phase 0
- **Local secrets and Supabase link metadata are never release inputs.** `.env*` remains ignored except the value-free `.env.example`; `supabase/.temp` was removed from Git tracking and is ignored. The clean packager uses explicit root exclusions and scans its staged files before creating an archive.
- **Previously supplied privileged credentials are compromised by definition.** Production launch is blocked on rotating the Supabase service-role/secret credential and the bootstrap admin password. Status UIs may reveal only configured/missing state.
- **Security auditing scans tracked source and the generated release manifest.** It fails on tracked local-secret paths, secret-looking server credentials/private keys, client-side service-role references, missing ignore rules, or forbidden release paths.
- **The current dirty worktree is preserved.** Phase work will not reset, overwrite, or bundle unrelated local artifacts. Coherent commits are deferred when they would accidentally capture pre-existing uncommitted work; phase evidence lives in `docs/PROJECT_STATE.md` and quality outputs.
- **Authorization target is granular permission keys, not role-name UI checks.** Phase 1 will preserve owner access while centralizing server-side permission enforcement and auditability.

## 2026-07-12 — Master rebuild Phase 1
- **Database permission mappings are authoritative.** `owner` is an explicit wildcard; `admin`, `operations`, `finance`, `content`, `marketing`, `support`, and `editor` require named mappings. Application constants mirror them for navigation and safe migration fallback.
- **Authorization is enforced in three layers.** Admin navigation hides inaccessible areas, nested layouts deny direct page access, and every privileged server action calls centralized `requirePermission()` before any service-role operation. Migration 020 independently constrains direct authenticated API writes through RLS.
- **Multiple roles compose.** Effective permissions are the union of all roles assigned to an account, with owner taking precedence in display and authorization.
- **Owner recovery cannot be removed accidentally.** The role action refuses to revoke the final owner and audit-logs all grants/revocations.
- **Permission verification is live and disposable.** `verify:permissions` checks all owner keys and creates a temporary support account to prove one allowed and one denied RLS operation, then removes all test data.

## 2026-07-12 — Master rebuild Phase 2
- **Media visibility is row-level, not inferred by UI.** Only `visibility='public'` metadata is anonymous-readable; private asset paths require `media.view`, and private Storage content remains signed/guarded.
- **Usage is an explicit relation.** `media_usages` records entity/field references and uses `ON DELETE RESTRICT`; legacy cover URL checks protect records created before the registry existed.
- **The picker stores both URL and asset identity.** Existing public rendering remains compatible with URL columns while `cover_asset_id` form data synchronizes the usage registry for safe replacement/deletion.
- **Uploads are bucket-specific.** MIME allow-lists, size ceilings, randomized paths, public-image alt text, tags, original name, and visibility are validated server-side before registry insertion.

## 2026-07-12 — Master rebuild Phase 3
- **Financial state transitions live in PostgreSQL transactions.** Checkout, proof submission, payment approval/rejection, and order cancel/refund/expiry use row locks and return explicit created/existing/already outcomes.
- **Service-role RPCs are non-public.** Review and order-transition functions are executable only by `service_role` after application permission checks; customer checkout/proof functions derive identity from `auth.uid()` and are authenticated-only.
- **Retries do not duplicate effects.** Advisory locks and row locks collapse concurrent checkout/proof/review/refund requests into one order, payment, notification, audit event, and access mutation.
- **Refund reconciles domain access.** Generic access, book ownership, workshop registration, and course enrollment are revoked transactionally while preserving course access backed by another active grant.
- **Uploaded proof cleanup is compensating, not silent.** If the database transaction rejects a newly uploaded object or reports an existing proof, the server action removes the unreferenced Storage object.

## 2026-07-12 — Master rebuild Phase 4
- **Variants are first-class checkout inputs.** Active variants appear to customers; their database price, not the browser display, is locked into the atomic order item.
- **Bundles are explicit and non-nested.** The owner chooses child products, nested bundles/self-reference are rejected, and approval expands child access transactionally.
- **Critical operational settings are typed.** Payment methods and expiry hours use validated Arabic forms; empty methods are removed and therefore hidden from checkout. Raw JSON remains only for advanced non-critical keys.

## 2026-07-06 — V0.1.0
- **Next.js 16.2.10 (App Router) + React 19 + Tailwind CSS v4.** Latest stable at build time. Tailwind v4 uses CSS-first `@theme` in `src/app/globals.css`; `src/styles/tokens.ts` mirrors the palette for JS consumers (charts, inline styles). Reason: single source kept in two synced forms — CSS vars for utilities, TS for runtime.
- **pnpm 10.13.1 pinned via `packageManager` + corepack**, Node 24 (`engines`, `.nvmrc`). Per master plan §4.
- **Fonts via `next/font/google`:** Amiri (headings), Aref Ruqaa (decorative accents), IBM Plex Sans Arabic (body) with Cairo fallback. Exposed as CSS variables consumed by `--font-heading/--font-decorative/--font-body`.
- **RTL at the root:** `<html lang="ar" dir="rtl">`; all spacing uses logical utilities (ps/pe/ms/me, start/end).
- **Audit scripts are manifest-driven:** `scripts/expected-routes.json` lists routes that must exist; it grows each phase so `audit:routes` can gate every phase without failing on not-yet-built routes.
- **`--color-line` (not `--color-border`)** for the brand border token — Tailwind v4 reserves sensible defaults for `border-*` utilities and `line` avoids collision with `border-border` ambiguity.
- **Brand assets not yet provided** (logo, portrait, florals). Building refined CSS/SVG ornament substitutes per §3; tracked in KNOWN_ISSUES.md.

## 2026-07-06 — V0.2.0
- **Zero extra UI deps:** primitives use a 6-line `cn()` join instead of clsx/cva; sparklines and ornaments are inline SVG. Keeps bundle lean and audit surface small.
- **`Button` renders `next/link` when `href` is passed** — one API for actions and navigation.
- **Sidebar is one shared client component** parameterized by sections/badges; `DashboardShell` and `AdminShell` are thin config wrappers (no duplicated sidebar code, per token economy).
- **audit:ux placeholder rule refined:** `placeholder=` attr, `placeholder:` Tailwind variant, and `::placeholder` are allowed; the word as content/naming still fails.
- **Countdown first tick deferred to a macrotask** — avoids hydration mismatch and satisfies react-hooks/set-state-in-effect.

## 2026-07-06 — V0.3.0
- **RLS lives inline with each domain migration** (table + its policies in one file) instead of a trailing mega-file — easier review and per-domain evolution.
- **`is_admin()` / `has_role()` / `is_enrolled()` are SECURITY DEFINER SQL functions** so policies avoid recursive RLS lookups on admin_roles.
- **Coupons have no public SELECT at all** — validation happens server-side; public surfaces only ever see the result of applying a code.
- **Lesson/curriculum metadata is public for published courses** (needed for discovery/curriculum preview); `video_path` rows are harmless without a signed URL since buckets are private. Playback is gated server-side via `content_access` + signed URLs.
- **site_settings has an `is_public` flag** — payment account details are public-readable (shown at checkout); everything else admin-only.
- **Supabase clients:** browser client created lazily inside handlers (never module scope) so builds don't need env vars; middleware refreshes sessions and guards /dashboard (auth) + /admin (admin_roles lookup); service-role client only in `getServiceClient()` for post-access-check signed URLs and grants.
- **Seeder is triple-guarded:** SEED_DEMO=true required, DATABASE_URL required, remote supabase.co URLs blocked without SEED_ALLOW_REMOTE=true.

## 2026-07-06 — V0.4.0
- **Homepage data layer (`src/lib/data/home.ts`) returns editorial Arabic fallbacks** when Supabase env is missing or a query fails — the page is never blank and never shows an error to visitors. Fallback shapes mirror seeded rows so swapping to live data is a no-op.
- **Rolling 7-day countdown for the fallback offer is computed in the data layer**, not in component render (React compiler forbids impure calls like Date.now during render).
- **Portrait/floral are branded inline-SVG compositions** (arched frame + silhouette + gold leaves), not gray boxes — swap targets for real assets (KNOWN_ISSUES #1).
- **`revalidate = 300` on the homepage** — ISR keeps offers/testimonials fresh without per-request DB reads.

## 2026-07-06 — V0.5.0
- **One catalog data layer** (`src/lib/data/catalog.ts`) with typed mappers + Arabic editorial fallbacks mirroring seed.sql — every discovery/detail page works with or without Supabase env.
- **Curriculum/FAQ accordions use native `<details>/<summary>`** — zero JS, accessible, RTL-correct.
- **Product covers are branded gradient+glyph compositions** per kind (course/book/workshop/session) via one `ProductCard`; book detail renders a typographic cover. All swap targets for real photography.
- **Legal pages share `ProsePage`**; contact form inserts into `contact_messages` under the anon insert policy.
- **`/checkout/:path*` added to middleware matcher** — checkout requires login (order rows are user-owned under RLS).

## 2026-07-06 — V0.6.0
- **Checkout is one client stepper (summary/coupon/method → instructions/proof → confirmation)** backed by three server actions in `src/lib/actions/checkout.ts`. Prices and coupon math are always recomputed server-side; client totals are display-only.
- **Coupon validation uses the service client** (coupons have no public SELECT) after an auth check; enforces active/window/global-limit/per-user-limit.
- **`submitPaymentProof` verifies ownership + `pending_payment` + expiry under the user's RLS context first**, then uses the service client only for the storage upload and the `awaiting_review` transition (status changes are admin-gated under RLS by design). File constraints: image types only, ≤5MB, stored at `payment-proofs/<uid>/<orderId>/`.
- **Order expiry is enforced at read/submit time** (expired orders reject proof uploads and display as منتهي). A scheduled job to flip DB status comes in V1.1.0 — tracked in KNOWN_ISSUES #3.
- **Format helpers moved to client-safe `src/lib/format.ts`** — data-layer modules import server-only APIs and must never be imported by client components.

## 2026-07-07 — V0.7.0
- **`withUser()` wrapper in dashboard data layer** — one place handles env-missing/unauthenticated/query-error fallbacks for all customer queries.
- **`isPast`/`isFuture` helpers in `src/lib/format.ts`** — React compiler forbids `Date.now()` in component bodies; time comparisons live outside render.
- **Account server actions use the user's RLS context only** (no service client): profiles update + notifications mark-read + `auth.updateUser` password change are all self-scoped operations.
- **Email change and account deletion are deliberately manual** (contact-based) until a verified-email-change flow lands post-MVP.

## 2026-07-07 — V0.8.0
- **Lesson access is checked server-side per request** (`checkLessonAccess`): preview lessons open to any signed-in user; others require a `course_enrollments` row. Signed URLs: 1h for videos, 10min for resources.
- **Course percent recomputed from scratch on every toggle** (completed count / total) rather than incremental — idempotent under retries and immune to drift.
- **Player works in demo mode** (no env): curriculum from catalog fallbacks, local-only completion/notes, clear "وضع العرض" badge — never a broken screen.
- **Dark-mode toggle (S4) deferred to V1.6.0 polish** — needs a theme strategy across all three shells at once.

## 2026-07-07 — V0.9.0
- **Defense in depth for /admin:** middleware role lookup + `requireAdmin()` in the layout + per-action `requireAdminUser()` inside every admin server action (client can never be trusted).
- **Approve flow grants domain access rows** (course_enrollments / book_access / workshop_registrations) in addition to `content_access` — the LMS and library read their own tables, not the generic grant.
- **Reject requires a reason (min 3 chars)** — it is shown verbatim to the customer in her notification and payment timeline (§8).
- **Charts are hand-rolled SVG** (line+area, donut, sparkline) in brand tokens; donut segments precomputed via reduce (React compiler forbids render-time mutation).
- **Admin demo mode:** without env, requireAdmin lets the UI render with zeroed KPIs and honest empty states — no fake numbers, per honesty rules (§17).

## 2026-07-07 — V1.1.0
- **`expire_stale_orders()` is a SECURITY DEFINER SQL function** (migration 011) with pg_cron scheduling instructions in the file — expiry now flips DB rows and writes audit logs, closing KNOWN_ISSUES #3.
- **Bundle grants expand at approval time**: approvePayment walks product_bundles children so each child grants its own domain row (enrollment/book_access/registration).
- **Refund revokes `content_access` by order_id**; domain rows (enrollments, book_access) are left for manual review — revoking a half-finished course automatically felt wrong for a human-scale operation.
- **Rejected payments offer re-upload inline** on /dashboard/payments (order returns to pending_payment per §8), gated by the order's expiry window.

## 2026-07-07 — V1.2.0
- **Offer resolution is one shared server helper** (`resolveActiveOffer` + `applyOffer`): checkout page display and `createOrder` both call it, so the client can never present a price the server wouldn't recompute. Best offer = largest percent, then largest fixed; untargeted offers apply to everything.
- **Coupon redemptions are recorded at payment approval, not order creation** — an unpaid abandoned order never burns a use.
- **Order rows now separate list price (`subtotal`) from combined offer+coupon `discount`** for accurate revenue reporting.
- **Coupon/offer admin CRUD uses the service client after a per-action admin check** (coupons/offers writes are admin-gated under RLS; forms are Arabic-first with datetime-local windows).

## 2026-07-07 — V1.3.0
- **Reports aggregate in the app layer** (12-month window, paid orders only) instead of SQL views — datasets are human-scale; revisit with materialized views if volume demands.
- **Snapshots store the full aggregate JSON** in report_snapshots so historical numbers survive later schema changes.
- **`track()` is fire-and-forget** with a sessionStorage session id; RLS allows anon INSERT and admin-only SELECT. It must never throw or block UI.

## 2026-07-07 — V1.4.0
- **One whitelisted `adminSetField` action** covers all publish/approve toggles — (table, field) pairs are hard-coded; no generic table access from the client, ever.
- **`adminList()` generic reader** collapsed 15 admin list pages into thin declarative tables (read-side only; RLS still applies on top).
- **Feature flags flow server→client**: (public) layout fetches flags and passes to PublicHeader; nav items with an off flag disappear (§10). vip_program stays off until the program page exists.
- **Roles are owner-gated twice** (action checks `role === 'owner'`; RLS "owner manages" policy backs it).
- **Curriculum builder is append-based** (auto sort = count+1); drag-reorder deferred to post-V2 backlog.

## 2026-07-07 — V1.5.0
- **Rate limiting is in-memory sliding-window** (per instance) — right-sized for a human-scale platform; documented upgrade path (Upstash/pg) in SECURITY_REPORT.md.
- **`payments.amount` must equal `orders.total` at INSERT (RLS subquery)** — the admin approval queue displays payments.amount, so a falsified amount was the one real integrity gap found in review.
- **Notification content is trigger-guarded** — users may only flip `read_at`; RLS can't restrict columns so a BEFORE UPDATE trigger raises on any other change.

## 2026-07-07 — V1.6.0
- **Middleware passes through when Supabase env is missing** — demo mode was returning 500 on every guarded route (caught in the browser pass); pages already handle their own demo/empty states.
- **`lessonsLabel()` handles Arabic count grammar** (درس واحد/درسان/دروس/درسًا) — applied on discovery, detail, and dashboard.
- **Countdown digits now Arabic-Indic** via toLocaleString(minimumIntegerDigits) for numeral consistency with the rest of the UI.
- **Streak = consecutive active days from lesson_progress.completed_at** (30-day lookback, today-or-yesterday anchored); achievements derive from certificates + course_progress thresholds (50%/100%).

## 2026-07-10 — V1.7.0
- **One Sidebar, three renderings:** desktop sticky column, mobile top bar, RTL end-anchored slide-over drawer (backdrop dismiss, closes on navigate) — shells stayed thin wrappers.
- **Mobile QA is programmatic where possible:** scrollWidth sweep across 26 routes × 3 widths beats screenshot eyeballing for regressions; visual checks reserved for composition.

## 2026-07-10 — V1.8.0 (live Supabase integration)
- **User connected the real project** (`azuvwkzpgtyxwxmvedmp`); the provided URL was the dashboard URL — corrected to the API URL in .env.
- **Pre-existing schema preserved, never dropped:** earlier attempt (remote migrations 0001–0009) held real business rows. Migration 000 relocates all public tables+functions to a `legacy` schema (extension functions excluded — ownership), drops legacy auth triggers and storage policies; 013 ports the real data (services 1200/1500 ج.م, Instapay number, brand/booking settings) reading from `legacy.*` so values never live hardcoded in the repo.
- **Owner auto-grant:** handle_new_user now grants `owner` to heba0elsherif@gmail.com on signup — no manual SQL step for the platform owner.
- **`check_function_bodies = off` in 001** — `language sql` helpers reference tables created by later migrations.
- **Live vs demo semantics separated:** editorial fallbacks now trigger ONLY on missing env or query error. A live-but-empty catalog shows honest empty states; unknown checkout products 404; payment methods without configured accounts are hidden (bank hidden until `payment_bank` is set); hero's invented stats replaced with factual descriptors.
- **Live RLS validated end-to-end** with a throwaway user: profile trigger, order-total integrity (tampered insert → 42501), coupon invisibility — then cleaned up.
- **pg_cron scheduled via migration 014** (idempotent re-schedule) — order expiry now runs hourly on the live DB.

## 2026-07-10 — V1.9.0
- **Two-tier error boundaries:** branded `error.tsx` (with digest + retry) inside the layout, self-contained inline-styled `global-error.tsx` as last resort (it replaces the root layout so it can't rely on Tailwind).
- **One PageSpinner drives all three route-group loading.tsx files.**
- **robots.ts blocks /dashboard, /admin, /checkout, /auth; sitemap.ts includes live catalog slugs** and degrades to static routes without env.
- **middleware.ts → proxy.ts (default export `proxy`)** — Next 16 convention; deprecation warning gone (KNOWN_ISSUES #4 closed).

## 2026-07-10 — V2.1.0 (mobile UX pass, user-requested)
- **App-style bottom tab bar** (`BottomNav`, 5 tabs) on the customer dashboard below `lg` — the sidebar drawer remains for the full menu; admin keeps drawer-only (too many sections for tabs).
- **Sticky MobileBuyBar** on course/book/workshop detail pages: price + CTA fixed at the bottom with a spacer so content/footer never hide behind it; hidden when sold out.
- **iOS/Android polish:** `viewport-fit=cover` + `.pb-safe` safe-area utilities (notch/home-indicator), themeColor light/dark, `appleWebApp` meta, installable manifest + maskable-safe SVG icon (`app/icon.svg` doubles as favicon).
- **Touch ergonomics:** buttons get min-heights (40–48px) + `active:scale` + `touch-manipulation`; tap-highlight removed; carousel dots wrapped in 40px hit areas; drawer/backdrop animated (reduced-motion respected).
- **Orders list is cards on phones, table ≥md** — first application of the stacked-card pattern for data tables.
- **Verified live on 375×812:** browser login with a temp user → dashboard with bottom nav ✓, profile form round-trips Arabic correctly ✓ (an earlier "??????" was my shell's curl encoding, not the app), checkout shows real session with only configured methods ✓. Temp user deleted.

## 2026-07-11 — V2.2.0 (brand + luxury + admin elevation, user-requested)
- **Official logo «بذرة نقية» recreated as hand-built SVG** (SeedMark/SeedMarkLight): teal-gradient marquise seed + gold sprout slit with ivory light edge — used in header/footer/sidebars lockup, hero eyebrow + corner watermark, and the app icon (ivory tile). Logo hues added to the palette as `aqua`/`aqua-deep`.
- **Easier sign-in:** magic-link (signInWithOtp) is now the default tab — enter email, click the emailed link, land signed-in via the new `/auth/confirm` verifyOtp route handler (internal-redirect-only `next`). Password tab keeps classic flow with a show/hide eye toggle (PasswordField).
- **Admin elevation:** command-style global search in a new AdminTopbar (debounced server action over customers→orders→pending payments, role re-checked server-side) + quick links; /admin/users gained search-by-name/email and a per-customer "send in-app notification" support tool (audit-logged); /admin/payments header shows count + total pending amount.
- **Luxury motion system:** scroll-reveal via one `<Reveal>` IntersectionObserver wrapper (homepage sections), hero staggered fade-up entrance + floating ornament/portrait, gold shimmer sweep on primary CTAs, gold hairline + aqua glow on CTARibbon, gold border accent on card hover, branded thin scrollbar — all disabled under prefers-reduced-motion.
- **Verified in browser:** seed logo across surfaces, login tabs + eye toggle (type flips), console clean (earlier refresh-token noise was a stale cookie for a deleted test user — expected Supabase behavior, handled gracefully).

## 2026-07-11 — V2.3.0 (booking, theme, and authentication upgrade)
- **Booking is one five-step domain flow, not a link to generic checkout:** service → Cairo date → conflict-filtered time → contact data → configured payment method + proof. The server recomputes service availability and pricing before creating the linked booking/order pair.
- **Double-booking is guarded twice:** the UI hides overlaps and the server rechecks them; migration 015 adds a GiST exclusion constraint as the final concurrent-write guard. Expired/cancelled unpaid orders release pending appointments.
- **Unconfigured active services receive a conservative default schedule** (10:00–20:00 Africa/Cairo, Friday closed). Explicit availability rules and exceptions always override it.
- **Theme is class-based and persisted before hydration:** system preference is the first default, then the user's local choice wins across public, customer, and admin surfaces.
- **Magic-link entry was removed by owner request.** Customer login is email + password; `/admin` redirects to a dedicated password-only portal which verifies `admin_roles` after authentication and signs out non-admin accounts.
- **Reference-site features were adapted, not visually cloned:** the start-here decision quiz and library search/sorting reuse this project's brand system and data model.

## 2026-07-11 — V2.3.1 (human-free hero artwork)
- **The portrait substitute is no longer a silhouette or temporary person graphic.** Homepage and About now share an abstract brand composition built from the seed mark, architectural arches, orbital lines, and restrained botanical geometry. This removes the dependency on personal photography while preserving the layout's editorial weight.

## 2026-07-11 — V2.4.0 (reference-led visual overhaul)
- **The V2.3.1 hero artwork was removed completely at owner request.** The hero is now a full-width typographic editorial statement; no portrait, silhouette, character, or dominant replacement panel remains.
- **The four supplied references were translated into system-level rules, not copied assets:** two-tier navigation, compact vertical rhythm, warm ivory paper, fine gold borders, deep-teal operational surfaces, burgundy accents, dense but calm information grouping, and botanical edge filigree.
- **Botanical decoration is original code-native SVG** (`BotanicalSpray`) so it scales cleanly, supports dark mode, and avoids third-party artwork/licensing issues.
- **Luxury is carried by hierarchy and detail rather than large imagery:** smaller-radius cards, hairline borders, restrained shadows, central Arabic typography, and repeated ornamental rails now connect public, admin, and learner surfaces.
- **Reveal effects are enhancement-only:** content renders visible by default after browser QA caught a state where IntersectionObserver could leave whole sections transparent.

## 2026-07-11 — V2.5.0 (production completion)
- **Dark color roles are semantic:** `surface`, `surface-raised`, and `on-dark` are distinct tokens. The former `soft-white` dual use could turn white text dark on deep-teal panels; all component classes now use the role they mean.
- **Booking is database-atomic:** migration 016 validates identity, service, Cairo window, rules/exceptions, overlap and best active offer under one advisory-locked transaction, then creates order/item/booking/events together. Migration 015 remains the final GiST exclusion guard.
- **Rate limits moved from instance memory to PostgreSQL:** migration 017 exposes only an authenticated SECURITY DEFINER consume function; the bucket table has RLS and no API policies. This is shared across cold starts and regions.
- **Admin entry is password-only at the browser boundary:** `/auth/admin` submits one password to a server action; the account email comes from server-only `ADMIN_LOGIN_EMAIL`, then the role is checked before the session is accepted.
- **Magic-link login is removed end-to-end:** no `signInWithOtp` UI and no legacy `/auth/confirm` route remain. Registration and reset use Supabase's normal email-confirmation/password flows only.
- **One original no-person photograph is a system, not decoration:** the optimized panoramic WebP is used as a full editorial feature and cropped by semantic product kind. This creates catalog richness without returning to portraits, silhouettes, unrelated stock, or generated text.
- **Playwright is a release gate:** production-server tests use a dedicated port and disposable Supabase users, covering public routes, theme persistence, booking structure, auth isolation/guards, mobile overflow, password-only admin access, availability management and the learner shell.

## 2026-07-11 — V2.5.1 (public-page refinement)
- **The public header is one intentional navigation row.** The sparse utility strip was removed because it added height without useful hierarchy; contact and FAQ remain available in the footer and their dedicated routes.
- **Hero ornament is structural, not illustrative.** Oversized botanical sprays and the duplicated three-item claim row were removed from the homepage. Restrained corner rules, stronger type scale, and one four-point trust panel now carry the composition.
- **Public page intros share one system.** About, booking, catalog, workshops, articles, FAQ, contact, and Start Here now use the same `PageHero` geometry and spacing; authentication uses the same quiet corner language without public navigation.
- **Mobile trust content is a 2×2 panel.** It keeps all four factual benefits visible above the fold without creating a long stacked rail or horizontal overflow.

## 2026-07-11 — V2.6.0 (live Supabase + owner brand refresh)
- **The linked database is authoritative.** Supabase CLI confirms local and remote migrations 000–017 are identical; no duplicate schema or destructive replay was performed.
- **Modern publishable keys are first-class.** Browser, SSR, and proxy clients prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, while the anon JWT remains a compatibility fallback. The service-role key stays server-only.
- **Admin identity has no source-code fallback.** The password-only portal now requires the server-held `ADMIN_LOGIN_EMAIL`; the provisioned Auth user is confirmed and has the `owner` role in `admin_roles`.
- **The supplied raster logo is canonical.** It is copied unchanged into `public/brand/main-logo.png` and used in public chrome, authentication, workspaces, metadata, and the web manifest. The small code-native seed remains a supporting motif only.
- **Warmth comes from material and imagery.** Light surfaces moved from white toward layered ivory, cards became softly translucent, and the homepage hero now pairs the core message with the existing original no-person still life. No portrait or character was introduced.

## 2026-07-12 — V2.7.0 (full admin control center)
- **Admin CRUD is domain-aware, not generic table mutation.** Courses, books, workshops, sessions and products have validated server actions that keep their `products` row and domain row synchronized; creation cleanup and update rollback prevent half-created catalog items.
- **Historical commerce records win over destructive convenience.** Deletes surface foreign-key errors when an item has orders. Used coupons cannot be deleted and must be deactivated, preserving revenue and redemption reports.
- **Availability is per weekday and exception-driven.** Migration 018 enforces one rule per service/day and one exception per service/date. The admin can set different hours per weekday, close dates, add custom date hours, and remove exceptions.
- **Memberships are a real domain.** `subscription_plans` and `subscriptions` model cadence, duration, included sessions, capacity, sale window, lifecycle status and admin notes with RLS and reporting.
- **Recoverability is separate from auditability.** `audit_logs` records actor/action; `content_revisions` stores pre-edit snapshots for products, catalog items, articles, plans and homepage copy.
- **Operational inbox and media are first-class.** Contact/newsletter lifecycle and Supabase Storage upload/delete are guarded server actions rather than dashboard-only lists.

## 2026-07-12 — Master Phase 5 integrity closure
- **Credit history is append-only accounting data.** Ledger rows reject update/delete, subscription deletion is restricted, and the admin archives subscriptions and plans instead of destroying history.
- **Idempotency is scoped and fingerprinted.** A repeated key returns the original result only for the exact same operation; changed delta, subscription, booking, source, or reason raises `idempotency_conflict`, while different users can safely use the same textual key.
- **Plan terms are snapshotted at subscription creation.** Later plan edits increment a version and do not change previously sold session limits or billing terms.
- **Activation is the grant boundary.** Pending subscriptions receive no credits; the atomic status RPC locks the plan, enforces capacity, and grants opening credits exactly once on activation.
- **Package credits are service-specific.** Admin-selected plan/service mappings are validated inside package checkout, never only in the browser.
- **Cancellation restoration is database-owned.** The booking status transition appends one reversal linked to the original consume entry; retries cannot restore twice.
- **Booking policy is typed and enforced in PostgreSQL.** Cairo timezone, slot interval, buffers, notice, horizon, daily capacity, and cancellation notice are saved from the admin and applied to customer and admin schedule writes.

## 2026-07-12 — Pre-Phase 6 P0 closure
- **Delivered source must audit without Git metadata.** `audit:security` falls back to a release-relevant filesystem scan, and `pnpm deliver` is the only documented archive path.
- **Authorization fails closed.** Supabase config detection is centralized, database permission RPC failures never fall back to TypeScript role maps, and authenticated permission checks cannot inspect another user id.
- **Entitlements are event records, not one mutable access row.** Every paid/free/bundle order creates its own grant; refund revokes that order's grant and removes the projection only when no other active grant remains.
- **Workshop seats are financial inventory.** Approval locks the workshop, reserves atomically, and refund releases exactly one seat; meeting links moved to registered-only delivery storage.
- **Refunds are durable records.** Order transitions append `payment_refunds`, close pending payments, revoke grants, cancel linked delivery, and retain audit history.
- **Zero-value orders are fulfilled without fake payment proofs.** The first authoritative order item triggers paid state and access grant in the same transaction.

## 2026-07-12 — Master Phase 6 secure delivery
- **Protected files upload browser-to-Storage.** The server issues a scoped signed upload token, the browser streams the file directly, and a second authorized action binds only the expected path to the domain row. Failed binding removes the uploaded object.
- **Downloads are authorization events.** Book, workshop-resource, and recording routes verify current ownership/registration, issue short-lived signed URLs, and never expose permanent protected paths.
- **Workshop meeting links are private delivery data.** They are captured after the workshop row exists and removed from the public workshop record; only registered users and permitted staff can read them.
- **Workshop operations share the seat invariant.** Admin registration changes use the same locked capacity counter as payment approval; cancellation releases a seat, and attendance is one idempotent row per registration.
- **Curriculum is operationally editable.** Modules and lessons support edit, ordering, preview state, guarded deletion, direct video upload, and attached resources with audit events.

## 2026-07-12 — Master Phase 7 CMS and brand
- **Publishing state is explicit.** Pages and articles move through draft, scheduled, published, and archived states; due content is released by a five-minute database schedule.
- **Preview access is a short-lived capability.** Only content managers can create a token; only its SHA-256 hash is stored, and the preview bypass is limited to one entity and 30 minutes.
- **Page sections remain structured JSON.** Each ordered section has kind, name, visibility, revision, and a recoverable pre-edit snapshot rather than one opaque page blob.
- **Navigation is content.** Header and footer consume visible database items, with hardcoded navigation retained only as the no-data/demo fallback.
- **Owner claims are owner-authored.** The About page reads a typed public profile setting; defaults use neutral factual language and avoid fabricated qualifications or outcomes.
- **Legacy color class names are compatibility aliases, not visual direction.** Burgundy/cobalt tokens now resolve to the approved teal/aqua palette while components migrate without a breaking rewrite.

## 2026-08-16 — Admin AAL2 enforcement
- **AAL2 is a database authorization boundary, not only a route guard.** Migrations 039–040 require AAL2 in `is_admin`, `has_role`, and `has_permission` for user-derived calls, and add a restrictive AAL2 policy to administrative role assignments. This protects existing RLS policies that call those helpers.
- **The password-first role check is deliberately narrow and server-only.** Before TOTP completion, the login action uses the elevated server client solely to establish that the successfully authenticated account has an administrative role. All subsequent browser-derived authorization remains fail-closed at AAL2.
- **Two independent TOTP factors are required for the application admin flow.** The app records only hashed request fingerprints and event metadata; it never persists OTP secrets, raw IP addresses, user-agent strings, or tokens.

## 2026-08-16 — Bounded administrative sessions and throttling
- **Administrative session lifetime is enforced by an opaque, HttpOnly application session.** It is bound to the authenticated AAL2 user by a server-stored SHA-256 token hash, expires after 30 minutes of inactivity or eight hours absolutely, and can be revoked from the security screen without storing a raw session token.
- **Login cooldown is serialized in PostgreSQL.** A server-only function locks a privacy-minimized fingerprint after five failed attempts for five minutes and after ten for 30 minutes; a successful outcome cannot bypass an active cooldown.
- **Session inventory is deliberately coarse.** It retains an inferred browser/platform label, timestamps, and a hashed network/device fingerprint—not raw IP or user-agent strings—and limits each administrator to their own application-admin sessions.

## 2026-08-16 — Development CSP compatibility
- **`unsafe-eval` is development-only.** React's development runtime uses it for debugging/call-stack reconstruction, so the CSP enables it only when `NODE_ENV` is not production. The production policy remains without `unsafe-eval` and was verified from an actual production response.
- **Client code reaches server-only MFA/session logic through a server action.** Browser components must never import modules depending on `next/headers` or elevated server clients; the explicit action boundary keeps the production bundle valid and preserves the server-only security boundary.

## 2026-08-18 — Protected delivery admission and upload verification
- **Storage URLs are minted only at a final authenticated route boundary.** Application actions return internal video/resource routes; those routes re-check the user and admission state, issue 60–120 second Storage capabilities, and return private no-store/no-referrer redirects. Permanent protected paths and signed tokens are not written to UI state or audit metadata.
- **Book limits and video concurrency are database-owned invariants.** Migration 043 serializes book admission per user/book, permits five downloads in 24 hours, records the authorization event atomically, limits video access to two recently active devices, and replaces any prior active viewing session. Browser roles cannot execute these admission RPCs directly.
- **Direct upload remains scalable but finalization distrusts browser metadata.** Object names are opaque UUIDs; the server performs a bounded range read to verify observed size, Storage MIME, extension policy, and magic bytes before binding. Inspection logs store only a path hash. When an external scanner endpoint is configured it fails closed; without one, the system records only signature validation and makes no antivirus claim.
- **Ambiguous production identity blocks mutation.** A document-supplied project ref does not override the locally linked historical ref. No migration or disposable live verification may run until project identity, migration history, schema compatibility, a management access token, and a revocable server secret all match.

## 2026-08-18 — Read-only correction of Cycle 2 evidence
- **“Fail-closed scanner” applies only after a scanner is configured.** With no `PROTECTED_UPLOAD_SCAN_URL`, `externalScanVerdict()` returns `not_configured` and finalization may bind after extension, MIME, size, and magic-byte checks. This is local binary validation, not malware scanning. A configured scanner fails closed on unavailability or any verdict other than `clean`.
- **Manifest comparisons require an actual preserved manifest.** The available earlier manifest has 365 files. Relative to the current 368-file manifest, `hebaelsherif I.zip` was removed and four protected-delivery files were added. No 369-file manifest exists in the inspected workspace; 369 can only be reconstructed as the interim count before removal of that obsolete nested archive.
- **Nested archives are release inputs unless explicitly excluded.** `package-release.mjs` skips content inspection for ZIP binaries and currently includes root `hebaelsherif.zip`; that nested archive contains `.env` and `supabase/.temp` path entries. A passing outer manifest scan is therefore insufficient evidence of a clean release while nested archives remain included.
- **Test coverage claims stop at executed assertions.** Current delivery verification proves entitlement isolation, atomic download admission, session/device limits, and RPC isolation. Revocation-after-removal, valid/invalid finalization magic bytes, and absence of raw token/path in persisted logs remain untested and must not be presented as verified.
- **Migration 043 remains local.** Exactly one local file exists: `supabase/migrations/043_protected_delivery_controls.sql`. No live status is claimed. The only external decision blocker is the owner's confirmation of the production project ref: `azuvwkzpgtyxwxmvedmp` or `zfbwpubsnuijybxjuidc`; no key change is requested now.

## 2026-08-18 — Recursive release-archive gate and deferred delivery evidence
- **User-owned archives are preserved but never nested in source releases.** Release staging excludes archive and dump formats without deleting their workspace originals. This removes stale source bundles such as `hebaelsherif.zip` from deliverables while retaining them for the owner.
- **Release safety is content-recursive, not extension-only.** The packager and security audit share one gate that detects supported archive signatures, validates member paths before extraction, inspects nested archives and secret-like text, rejects unsafe/secret/Git/dump/test paths and symlinks, and fails unsupported archive formats rather than assuming they are safe. The final TGZ is inspected after creation.
- **Local finalization evidence and live Storage evidence are distinct.** A shared validation module is the single implementation used by admin finalization, the local valid/invalid magic-byte test, and the deferred live Storage test. Local assertions may be reported now; entitlement revocation, Storage range behavior, and persisted live log secrecy remain deferred until the authoritative project is confirmed and must not be described as executed.
- **Malware scanning remains optional and unconfigured.** Extension, MIME, observed size, and magic bytes are not antivirus. Fail-closed scanner behavior begins only when `PROTECTED_UPLOAD_SCAN_URL` is configured; scanner unavailability or any verdict other than `clean` then blocks binding.

## 2026-08-18 — Cycle 4 brand and public journey
- **The homepage portrait represents the audience, not the owner.** The project self-hosts one newly generated, fictional adult Arab niqabi reader in a warm library. Only her eyes are visible; the UI labels the image as representative and neither the prompt nor the presentation asserts a likeness to Heba ElSherif or another real person.
- **Public fallback content may provide navigation copy, never social or commercial proof.** The no-environment state may explain the four product paths, but offers, articles, testimonials, countdowns, qualifications, and outcome claims appear only from active/published/approved records. The homepage no longer invents those rows when Supabase is unavailable or empty.
- **Responsive order is a content decision.** The desktop hero uses still-life / message / portrait as three physical columns, while source order keeps the message before the portrait on small screens. The decorative still-life is hidden on mobile so the copy, two actions, and uncropped eyes remain the first journey.
- **The public header stays operationally narrow.** It contains the canonical mark and name, six real navigation destinations, the persisted theme control, and one login action. Version labels, duplicate booking actions, and decorative icons without behavior do not belong in the public header.

## 2026-08-18 — Truthful absent-data states and local access boundaries
- **Absent configuration is not a demonstration mode.** Catalog, booking, checkout, learning, and admin data functions return no commercial/editorial/learning records when their authoritative source is unavailable. The UI uses a clear empty or not-found state rather than fabricated products, payments, progress, or outcomes.
- **Protected routes fail closed before rendering a shell.** When no public Supabase configuration exists, or when the identity lookup fails, the proxy redirects dashboard and administration routes to their corresponding authentication entry point. The server-side administration guard likewise has no demonstration bypass.
- **Outbound-email promises remain disabled until an operational provider exists.** The unused public newsletter signup was removed and account settings state the present limitation plainly. Existing administrative list/outbox records remain operational data; they are not presented as a public sending service.
- **Availability-aware tests reflect the real state.** The booking E2E assertion verifies the guided flow only when a service exists; otherwise it verifies the explicit empty state and its real navigation action. This prevents a local empty catalog from being misrepresented as a configured booking flow.

## 2026-08-18 — Self-hosted Arabic font delivery
- **Typography is part of release reliability.** The application now self-hosts the Arabic subsets it actually uses: Amiri 400/700 for headings and IBM Plex Sans Arabic 300–700 for interface text. This preserves the existing visual system while eliminating `next/font/google` network fetches during production builds and initial rendering.
- **Only necessary families are shipped.** Aref Ruqaa was not used by an active component and Cairo was only a fallback behind IBM Plex Arabic, so neither is retained as a runtime dependency. Attribution for the SIL OFL 1.1 font files is stored with the assets in `public/fonts/README.md`.

## 2026-08-18 — Keyboard entry point for public pages
- **The public frame owns the skip target.** A keyboard-visible “تخطّي إلى المحتوى” link precedes the public header and focuses a stable `#main-content` wrapper. Individual page components retain their semantic `<main>` landmarks, avoiding nested main elements while providing one consistent bypass for navigation and footer chrome.

## 2026-08-18 — Release-gate browser coverage without live data
- **Public E2E is safe to run on every local release gate.** `test:e2e:public` launches the production server with public Supabase settings explicitly blank and verifies only anonymous, empty-state, responsive, theme, keyboard, and redirect behavior. It is included in `check:deploy`.
- **Authenticated E2E remains an explicit controlled operation.** That suite creates and removes users with a service role, so it must not be silently folded into a general release command or run while the production project reference remains unconfirmed.

## 2026-08-19 — Product completion: truth before availability

- **Public actions are gated by their operational prerequisite.** Product and workshop purchase controls render only when at least one payment method is configured; contact renders an explicit no-send state without public Supabase configuration. A missing prerequisite is status, not a recoverable-looking form or CTA.
- **Bookable availability has no synthetic fallback.** An active service with no `availability_rules` is omitted from the booking experience. The client may calculate slots from published rules, but must not invent recurring weekday or time windows.
- **Unapproved legal copy is a draft, not a policy.** Terms, refund, and privacy pages explicitly state their non-production status until the owner approves a legally reviewed version. Precise eligibility, response-time, data-processing, or refund claims may not be presented as binding based solely on source literals.
- **Readiness is a protected, read-only measurement.** The system page assesses configuration and counts of published operational records, reports query failure or unconfigured state distinctly, and links to the administrative action. It never displays payment values, secrets, or local fallback content as evidence that launch content exists.

## 2026-08-19 — Booking operations remain database-authoritative

- **A booking hold is a separate, short-lived record.** `booking_holds` reserves a service/time under the authenticated customer, expires or releases without mutating an appointment, and is converted atomically for an explicitly free service. Its identifier is not written to event or audit metadata.
- **The public calendar exposes only time values.** Availability RPCs return slots, not booking, hold, customer, note, meeting, or audit data. Every final booking/reschedule/admin update repeats the slot predicate under an advisory lock; the client calendar is discovery, never authorization.
- **Payment absence blocks paid services only.** A service must explicitly opt into `free` booking. It can then confirm without payment configuration; a paid service has no fake local payment fallback. Package credit remains on its existing atomic path.
- **Migration 044 is source-only until the owner confirms production identity and authorizes a deployment.** Local contract coverage proves the intended invariants but does not prove migration compatibility, RLS, or browser behavior against Supabase.

## 2026-08-20 — Full-upgrade readiness and hold-only booking entry

- **A runtime contract must precede availability.** The 044 `booking_runtime_contract()` RPC is intentionally non-sensitive and allows the source to distinguish an unavailable booking schema from a genuinely empty service catalog. The public page does not expose technical details; the protected system page does.
- **Every new paid/package path starts with a hold.** Browser roles use `create_booking_order_from_hold` or `create_package_booking_from_hold`; the former direct booking RPC is no longer granted to `authenticated`. Existing SECURITY DEFINER package internals can still use the legacy implementation until a future migration replaces it.
- **Launch documents are operational controls, not deployment authorization.** The runbooks state exact owner actions and evidence boundaries but neither imply a project selection nor permit a credential, migration, payment, legal, sender, or scanner operation.

## 2026-08-20 — Hold is visible and recoverable

- **The review step owns the hold countdown.** A hold is acquired only after valid intake, displayed with its actual server expiry, and released when the customer deliberately returns to a pre-review choice. Expiry remains database-owned; a browser timer is only presentation.
- **Calendar export is customer-scoped and non-cacheable.** The ICS endpoint authenticates and filters by booking owner and active status, exports no meeting link/customer note/admin note, and sends `private, no-store` headers.

## 2026-08-20 — Truthful operations health

- **An unavailable operations query is not a zero.** The overview has an explicit unconfigured/unknown health state and keeps KPI/charts hidden until a source read succeeds. This avoids an apparently empty business dashboard becoming an operational assertion.
- **Editorial components require no fabricated rows.** The connected public decision journey uses real route destinations and neutral guidance; offer, article, and review sections remain data-only and hidden without published rows.

## 2026-08-20 — Production read-only preflight and staging gate

- **The authoritative production project is `zfbwpubsnuijybxjuidc`.** The owner confirmed this ref, and authenticated CLI metadata verified the active HebaElSherif project. This confirmation authorizes only the completed read-only inspection; it does not authorize migrations, write tests, payment/booking actions, secret reads, or deployment.
- **043 is live; 044 is not.** Remote history is contiguous through 043, and catalog inspection verified 043’s protected-delivery contract. 044’s schema/RPC/RLS contract is entirely absent and remains local source only.
- **044 cannot stage until its legacy bypasses are closed forward-only.** The live legacy booking RPC is anonymously executable and the current booking RLS permits an authenticated direct pending insert. A reviewed additive corrective migration must revoke the legacy public roles, narrow direct booking creation, and make internal 044 helper grants explicit before any staging deployment.
- **Recovery and Auth configuration are deployment gates.** No backup/PITR recovery point was available in management metadata, and Auth redirect configuration was not read because it is bundled with raw sensitive configuration and the dashboard session is signed out. A verified recovery plan and an owner dashboard redirect check are required before staging.

## 2026-08-20 — Master launch local completion

- **Booking correction is a forward-only companion, not an edit to 044 history.** Migration 045 revokes legacy anonymous/authenticated booking entry, removes the direct pending-insert policy and makes internal-helper execution service-only. Staging must apply 044 then 045 in one traffic-isolated change window.
- **Release QA is credential-isolated by construction.** The local release gate explicitly shadows all Supabase public and server variable names with empty values before `next build`; it never loads credentials itself. Browser tests therefore exercise honest unconfigured states and cannot bake an ambient project identity into client assets.
- **Public media requires declared provenance.** Migration 046 records rights state/reference, caption, credit, folder and focal point. Public images cannot be uploaded or retained through the admin metadata path with an `unverified` rights state; the application does not infer ownership or licence.
- **Legal publication is an approval state, not a boolean toggle.** Migration 047 adds review status, public version and effective date. Privacy, terms, refund and disclaimer CMS rows are not rendered as published policies unless all three approval fields are present; otherwise the explicit non-binding fallback remains.
- **Readiness uses only three launch severities.** `/admin/system` maps internal health detail to `ready`, `warning` or `blocker`. Any blocker makes the Launch Ready badge false; local build success cannot override environment, legal, recovery, content or provider blockers.
- **The external design reference is inspiration only.** The public site was inspected for information hierarchy and commerce patterns. No copy, testimonial, product claim, asset or personal identity was imported; the current Arabic RTL identity and fictional audience portrait remain authoritative.

## 2026-08-25 — Road-to-100 staging and mobile-readiness boundaries

- **The migration unit is 044 → 045 → 046 → 047.** 045 is not a rewrite of 044: it is an additive, forward-only least-privilege correction and must immediately follow 044 in one traffic-isolated staging window. 046 and 047 are independent of booking SQL but remain pending current-release schema requirements; they may not be silently omitted from a staging environment that represents this release.
- **A catalog snapshot is metadata-only and validates, never authorizes.** The local validator accepts a sanitized, read-only staging snapshot only after it names the known production ref separately, identifies a distinct staging ref, confirms a recovery/restore drill, and excludes credentials/customer data. It fails on remaining legacy browser grants, direct pending-booking policy, missing RLS, or missing hold-aware grants. Running it cannot touch a provider.
- **Legal draft discoverability is fail-closed.** Until owner approval is represented through governed content, local fallback legal pages are explicitly `noindex,nofollow` and absent from the sitemap. This avoids implying a binding published policy; it does not replace legal approval.
- **Mobile resilience remains additive.** The iOS/Android adjustments preserve the existing Arabic RTL visual system while requesting keyboard content resize, normalizing text-size adjustment, avoiding fixed-background mobile jank, and retaining safe-area controls. Local responsive evidence is not a substitute for device/accessibility or production performance evidence.

## 2026-08-26 — Customer-launch recovery and deployment boundary

- **Production writes remain fail-closed until a recovery drill succeeds.** Fresh read-only evidence shows the owner-confirmed production ref is healthy but has migrations 044–047 pending, no physical backup and PITR disabled. A logical backup/isolated restore is an accepted alternative only when its integrity, RPO/RTO, artifact validation and rollback owner are recorded; it cannot be replaced by a code rollback.
- **The existing public domain is not assumed to run this release.** HTTPS/Vercel headers are alive, but their CSP differs materially from the current source release. A provider-authenticated staging deployment and same-contract production release are required before the public endpoint is described as this application.
- **External commercial/legal choices are explicit owner inputs.** A payment provider/manual route, sending service, monitoring recipient, canonical URLs, legal policies and real catalog/support facts are not inferred from source or placeholder settings. They are grouped once in the closure record so external authority does not expand one setting at a time.

## 2026-08-26 — Backup tooling and disposable-stage boundary

- **A free standalone stage is an acceptable temporary substitute for unavailable preview branching.** The provider returned `402 entitlement_required` for a no-data preview branch, so no plan was upgraded. A separate project may be used only with disposable data, separate credentials, a noindex/protected deployment, and no Production Storage, webhook, or data connection.
- **A generated staging database password is not retained merely to keep an empty project alive.** The first empty free project was verified and deleted before configuration. The replacement is created just-in-time with a transient secure credential when the recovery gate can proceed; this prevents an orphaned externally reachable environment or an ungoverned locally persisted secret.
- **Logical recovery is fail-closed and credential-isolated.** The launch script accepts only secure-process source/restore URLs, does not load repository environment files, never prints a connection value, and requires a custom archive, globals attempt without passwords, archive listing, isolated restore, and schema/RLS integrity contract before migrations.

## 2026-08-26 — Final hosting decision: Namecheap cPanel Node only

- **The final launch host is Namecheap Shared Hosting through cPanel Setup Node.js App.** GitHub Free holds source/releases; Supabase remains the separate Production/Staging database, Auth and Storage authority. No static-export substitute and no cPanel MySQL path is acceptable because the product requires Next server behavior, authenticated administration, booking, reviewed manual payments and protected delivery.
- **The prior hosting path is retired from operational runbooks.** No provider login, paid plan, configuration, deployment or purchase is authorized for it. The active implementation uses Next standalone output, a cPanel Passenger startup file, cPanel-only environment variables, distinct application roots, a protected/noindex staging application and a permanent `www` to apex redirect.
- **Namecheap capability is a fail-closed launch gate.** The repository requires Node 24.x and pnpm 10.13.1. Until the actual account exposes Setup Node.js App and Node 24.x, no remote deployment is attempted; a static downgrade is forbidden. If unavailable, document the exact constraint and only then recommend one free commercial-capable Node host without creating an account or buying an upgrade.

## 2026-08-26 — Final hosting supersession: Cloudflare Workers Free

- **Namecheap is registrar-only.** The owner confirmed that no Namecheap Hosting/cPanel product exists. The preceding cPanel decision is historical and superseded; no Vercel return, paid plan, static export or cPanel/MySQL substitute is permitted.
- **Cloudflare Workers is the application host.** GitHub Free remains source/CI, Cloudflare Workers Free plus Cloudflare DNS/CDN supplies the full-stack Next runtime and edge layer, and separate Supabase Free Production/Staging projects remain database/Auth/Storage authorities. Resend Free, Sentry Developer Free, full logical backup plus restore drill, and reviewed manual payments are launch choices.
- **vinext is accepted only behind a parity gate.** The official compatibility check and a non-destructive vinext setup run on `codex/cloudflare-compatibility-spike`. It must pass isolated Worker build, local Wrangler runtime, security-header and full regression evidence before it can replace the ordinary Next path. OpenNext is the official fallback if a Staging-only vinext gap appears; static fallback is forbidden.
- **Uploads stay off the Worker body for large files.** The existing protected-delivery flow already performs browser-to-Supabase signed uploads then server-side authorization/validation/finalization. Remaining generic media/payment-proof actions that buffer file bytes require the same signed-upload/finalize model before Staging acceptance, preserving authorization, auditing and duplicate-proof controls.

## 2026-08-26 — Staging Worker isolation and deterministic Worker tests

- **Staging has a distinct Worker identity.** `env.staging` resolves to `heba-elsherif-platform-staging` and carries only the non-secret `HEBA_DEPLOYMENT_ENV=staging` variable. The source deployment command builds that environment in an isolated temporary mirror, then deploys its generated config with `--keep-vars`; it never targets the root Production Worker name.
- **Staging is fail-closed before credentials exist.** The staging proxy requires both Cloudflare-held Basic Auth secrets. Until they and a separate Staging Supabase project are configured, the public worker returns 401/noindex rather than accepting writes or accidentally connecting to Production.
- **Worker E2E starts its own neutral runtime.** The Cloudflare Playwright suite now rebuilds a credential-free generic Worker and starts Wrangler itself. This prevents stale port reuse and prevents a staging-only Basic Auth configuration from masquerading as an application regression.

## 2026-08-26 — Empty disposable Supabase Staging project

- **Staging is a separate empty Nano project.** It was created in the authorized organization/region with no Production data copied and no paid size selected. Its generated database password was used only for the create operation and was not printed, committed or retained as a workspace setting.
- **No fake Admin identity precedes schema and RBAC.** A real owner-controlled email may be used only after the isolated recovery, migration, Auth redirect and application-configuration gates succeed. Creating an Auth record before its server-side role, audit and permission model exists would not constitute an operational administration account.

## 2026-08-26 — Recovery-drill hardening before Staging writes

- **Logical recovery is a hard gate.** An absent executor-only Production connection prevents the runner from creating a backup, target or artifact. This is a correct `RESTORE DRILL BLOCKED` result, not a permission to approximate a backup from source migrations.
- **Restore targets and artifacts are temporary.** The runner derives organization/region from the authoritative healthy Production project, creates a distinct Nano target, and deletes the target plus its custom dump/globals artifacts after the drill. It never uses the persistent Staging project as a restore target.
- **Baseline is not parity evidence by itself.** Applying 000–043 to a blank project must follow a successful drill and be compared read-only to the Production-043 metadata before 044–047, Auth identities, or application writes are allowed.

## 2026-08-27 — Master intake, comparison and safe merge boundary

- **The uploaded MASTER is authoritative, but owner Git work is preserved.** `hebaelsherif(2).zip` governs the release content. Its tracked source is reconciled with the GitHub default head `57820ab`; the newer `CNAME` is retained, ignored/generated/secret-bearing archive material is excluded, and execution occurs only on `codex/master-merge-2026-08-27`.
- **Comparison archives are evidence, never alternate bases.** `Hebaelsherif-2.zip` is an incompatible older Supabase/Vercel line and `hebaelsherif.com-3.zip` is a Firebase/Vercel line. Their migrations, Auth, role checks, generic APIs, payment callbacks, Storage paths, UI systems and hosting files are rejected. A comparison feature is merged only when its current need is independently proven and it is rewritten inside MASTER controls.
- **Sensitive report export is a fresh-assurance operation.** CSV export is POST-only, limited to named datasets, 5,000 rows and 366 Cairo calendar days; it requires `reports.export`, requires `users.view` for customer data, neutralizes spreadsheet formulas, excludes notes/meeting links/storage paths, records a successful audit before delivery, and uses private/no-store headers. Audit failure withholds the file.
- **Session policy is governed content, not an imported promise.** `/session-policy` uses the existing CMS/legal approval gate and a noindex, non-binding fallback. No wording, fee, cancellation right or response-time promise from a comparison archive is treated as approved policy.
- **Local build success cannot advance the external migration gate.** The 2026-08-27 source/build gates pass, but the recovery credential, provider sessions, Staging schema/RBAC/Auth and current Worker deployment evidence are absent. Therefore no 044–047 migration, Admin creation, Cloudflare deployment, Production write or DNS action is authorized.
- **A credential disclosed in conversation is no longer acceptable for acceptance evidence.** The Staging Basic Auth secret must be rotated only in Cloudflare's protected secret store before any authenticated live test. It must not be reused, committed, printed or placed in a command/log.

## 2026-08-27 — Competitor-superiority product direction

- **The competitor is a benchmark, not a template.** Heba's platform adopts the product value of visible authority, press, rich resources, verified proof, catalogue clarity and related discovery, while rejecting copied content/trade dress and the competitor's dark generic Shopify form, mixed-language drift, zero/sold-out transaction state, empty public collection and external thin assessment.
- **Superiority is defined by a shorter truthful decision journey and an operating Admin.** More pages do not count as progress if they are thin, empty, hard-coded or disconnected. Every new public surface requires an authoritative source, permissioned Admin persistence, preview/publication, audit, consumer effect and tests.
- **Owned guided discovery replaces generic external assessment linking.** Any assessment is non-diagnostic, deterministic, versioned, Admin-governed, privacy-minimized and limited to recommending actually published platform paths.
- **New content domains follow the pending schema chain.** Press/resources/assessment/review-consent/search migrations may be designed after current-source review but are numbered only after 047 and cannot be applied before Staging recovery, 000–043 parity and 044→045→046→047 acceptance.
- **Optional breadth is evidence-led.** English, multi-currency, live chat, standalone Team/Culture/Gallery and advanced personalization remain P2; their intentional absence cannot block launch while a clear truthful alternative exists.
