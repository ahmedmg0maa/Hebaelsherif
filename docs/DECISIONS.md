# DECISIONS (append-only)

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

## 2026-08-27 — Code X source, comparison, and governed-home decisions

- **The missing archive name is resolved by evidence, not assumption.** `hebaelsherif.zip` is the accepted renamed primary because all 413 tracked source files match the pre-owner-commit baseline byte-for-byte. Its environment, Supabase temp, build, test, and log entries remain excluded and are not extracted into the working tree.
- **Comparison code is not merged wholesale.** The two comparison archives use older or incompatible database/hosting abstractions. Only the needs for a report export and a governed session policy were accepted, and both were reimplemented against the current RBAC, audit, CMS, and Cloudflare/Supabase architecture.
- **Administrative report exports are privileged mutations.** Export is POST-only, same-origin, fresh-AAL2 protected, dataset-permission scoped, date/row bounded, formula-neutralized, privately cached, and audited before bytes are returned. Audit failure denies the export.
- **Homepage composition uses a fixed section registry.** Admin can manage structured safe fields, visibility, order, preview, and publication without raw HTML/component injection. Required hero/pathways/final-CTA sections fail publication closed; unknown legacy sections are preserved rather than reinterpreted or deleted.
- **A session policy is not published law by default.** The fallback is explicitly nonbinding and non-indexable; it can become public only through the same owner-approved governed-content state as the other legal pages.

## 2026-08-27 — Guided discovery and catalog publication

- **Search is a published-consumer aggregation, not a privileged index.** The public search reads the same published-only catalog/article functions, normalizes common Arabic variants, requires meaningful terms, bounds results, and is `noindex`. It never uses Admin/service-role search or indexes customer/private delivery data.
- **Journey analytics remain absent until consent is approved.** The governed start journey stores no intimate free text and emits no tracking event. Its interim typed `site_settings` record is revisioned and audited; formal 049 version/event tables remain behind the migration-order gate.
- **Catalog publication is fail-closed.** A publish request validates complete public facts, linked domain/product state, actual learning/delivery/availability data, and 046 rights evidence. A missing 046 contract blocks publication rather than treating an unverified URL as licensed media.
- **Domain and financial publication states are one operation.** Course/book/workshop/service visibility cannot intentionally diverge from its linked product; linked update failure restores the previous state. Public queries independently require both states as defense in depth.
- **Unavailable inventory never reaches checkout.** Ended/full/zero-capacity workshops and services without availability are denied even when a stale published product row exists.

## 2026-08-27 — Admin recovery and operational usability

- **Revision restore never republishes content.** Restoring a page or article creates a checkpoint of the current row, applies only allowlisted fields, returns the entity to draft, and requires a later explicit publish. A restored page section is hidden. Fresh AAL2 and a fail-closed audit-with-rollback boundary protect the mutation; raw revision snapshots are not rendered in the Admin list.
- **Saved operational filters are device-local and PII-minimized.** The booking agenda may store only period and status in versioned local storage. Customer search text, names, email and notes are deliberately omitted, the view is never shareable through a URL, and the UI says it is local to that browser.
- **Publication guidance does not weaken server authority.** Catalog editors show the owner the applicable facts/rights/content/availability checklist, while every actual publish attempt re-runs the database-backed readiness contract server-side and fails closed when 046 rights evidence or domain requirements are absent.
- **Hydration readiness is explicit in cross-runtime keyboard tests.** The start journey exposes a DOM marker set only after its client effect. Worker E2E waits for that marker before keyboard interaction, avoiding a vinext hydration race without retries, sleeps or weakened accessibility assertions.
- **Local Worker parity is not remote Staging acceptance.** A credential-empty vinext build and 52/52 local Worker tests prove runtime compatibility only. The current worktree must still be deployed to the separate protected Worker and exercised against the accepted separate Supabase Staging project before it earns live points.

## 2026-08-27 — Recovery connection boundary

- **A credential disclosed in chat is never used.** The disclosed database password is classified as compromised and must be rotated before any connection attempt. Reports record only the credential name/state, never its value.
- **Recovery uses Supabase Session pooler on IPv4-only execution networks.** The direct project endpoint resolves only to IPv6 here and failed the read-only reachability check. The official Session pooler URL on port 5432 is required for `pg_dump`/restore; transaction mode on 6543 is rejected.
- **The isolated restore target reuses the approved pooler host.** Because it is created in the same region, the runner selects it using the tenant-qualified `postgres.<target-ref>` username and a generated one-process password. It does not guess a pooler host, print a credential or persist the source/target URLs.
- **Production backup sessions are technically forced read-only.** Before any disposable project is created, `psql` must confirm the expected database/schema/migration-history contract under `default_transaction_read_only=on` with bounded statement and lock timeouts. The same source environment is inherited by `pg_dump` and the password-free globals export; an environment claim that is not visible to the executor is treated as absent, never inferred from another terminal or file.
- **Public Contact intake is server-mediated and privacy-minimized.** Migration 048 revokes direct browser inserts and exposes a service-role-only RPC so field validation, explicit consent, durable device/email throttling, message persistence and audit happen under one database transaction. Only derived fingerprints are retained for abuse control; raw IP, user-agent, message and contact details are excluded from audit metadata.
- **Admin Inbox mutations are one permission-checked transaction.** The application checks `inbox.manage` before calling the service layer, and migration 048 checks it again inside the database RPC before locking and updating the message, optional note/outbox entry and privacy-minimized audit. This replaces partially successful multi-write Admin mutations without introducing a parallel Inbox model.
- **Approval alone is not testimonial publication consent.** Migration 049 does not backfill `publication_consent_at` for historical approved reviews. Public/Home queries require a paid, non-revoked entitlement, recorded verification, explicit publication consent and Admin approval; a separate first-name consent controls identity display and otherwise renders a neutral verified-customer label.
- **Testimonial moderation is atomic and evidence-gated.** Approval, rejection, archive/restore, feature/unfeature and owner response use one service-role-only `manage_review` RPC with an in-database `reviews.manage` check, row lock and PII-free audit. Public actions fail unless verification and publication-consent evidence already exists.
- **Press authority is source-classified, never inferred.** Migration 050 requires an original HTTPS link, non-future source date and one of four explicit classifications. Owned channels, partnerships and events remain visibly distinct from independent editorial sources; missing owner evidence produces an empty public state instead of seeded authority claims.
- **Press publication reuses governed media and atomic Admin operations.** A selected image must be public and carry 046 rights status/reference before save, while public reads repeat the rights check. `press.manage` is mapped only to Admin/content/marketing (plus the owner wildcard), and create/update/delete plus audit are database-atomic; published or scheduled rows must be archived before deletion.
- **Resource drafts may be incomplete; public resources may not.** Migration 051 allows an owner to save work-in-progress privately, but scheduled/published articles require substantive body text and audio/video requires a duration, usable HTTPS/public-media source and transcript or captions. A selected medium must satisfy 046 rights, and a related offer must already be published.
- **The Resource Hub links or plays; it does not trust arbitrary embeds.** External media opens its original HTTPS source with new-window disclosure; owned/licensed public-media may use native audio/video controls. This avoids storing arbitrary embed HTML and prevents an unverified or private asset from becoming public through a CMS field.
- **Resource Admin and discovery reuse one governed source.** `resources.manage` belongs to Admin/content/marketing plus owner wildcard; atomic RPCs couple persistence/audit, while public list/detail, Arabic search, sitemap and optional Home section all enforce published/due rows and truthful empty behavior.
- **Restore evidence must preserve Supabase platform fidelity.** The Free account's two active slots are occupied by Production and Staging. Production data is never restored into persistent Staging, and a vanilla local PostgreSQL cluster is not labeled a full Supabase restore because it cannot reproduce platform Auth, Storage and custom-extension contracts. The zero-cost path is for the owner to verify Staging remains empty/disposable, pause it temporarily, use the freed slot for a uniquely identified disposable Supabase restore, delete it, then resume Staging.

## 2026-08-27 — Versioned guided assessment

- **Assessment content has one formal publication path.** Migration 052 supersedes the interim assessment portion of `site_settings`: Settings retains the page shell only, while `/admin/assessments` owns questions, options, weighted result mapping, preview, scheduling and immutable published versions. The public page reads only the version referenced by `published_version_id`.
- **Guidance cannot become diagnosis or an arbitrary redirect.** Every version requires an explicit non-diagnostic disclaimer, bounded structured content and result targets from a fixed public-catalog allowlist. Arbitrary product slugs, external URLs and administrative routes are rejected in both the application validator and the database transaction.
- **Customer answers are intentionally ephemeral.** There is no answer/event table and the interactive component uses in-memory state without network or browser storage. Audit logs record only version, status and aggregate structure counts; no question text, selected answer or customer identity is logged.
- **Published versions are immutable.** Editors change a draft/scheduled version or create a new version from the last saved one. Publication archives the previous public version and switches the pointer in the same permission-checked transaction; scheduled publication follows the same atomic pointer rule.

## 2026-08-27 — Governed bundle, VIP and free-resource programmes

- **Programme discovery has one governed public path.** `/programs` and `/programs/[slug]` are the public consumers for bundle, VIP and free-resource products. They repeat the database publication boundary instead of trusting a generic `is_published` flag, while specialized course/book/workshop/session products remain owned by their existing domain routes and Admin screens.
- **Programme edits always return to draft.** The generic product action is restricted to the three programme types and clears publication on every factual change. Publication is a separate service-role-only RPC that rechecks `products.manage`, locks the row, executes readiness and writes a metadata-only audit record atomically; the generic CMS publication action rejects these types.
- **Bundle composition is restricted to deliverable domains.** A public bundle must contain at least one published course, book, workshop or session product and each child must still satisfy its real public-consumer readiness. Composition changes use a permission-checked atomic RPC and cannot leave a published bundle pointing at an unavailable child.
- **VIP price and currency mirror a real public plan.** A VIP programme is publishable only when an active, published, current and non-archived subscription plan of the same product has identical price and currency. This prevents a marketing card from advertising terms that checkout cannot honor.
- **Free resources are delivered directly, not sold for zero.** A free-resource programme requires a published migration-051 Resource Hub item linked to the same product. Its public CTA opens that resource and checkout rejects the type, avoiding invented orders or entitlements for material intentionally published to everyone.

## 2026-08-27 — Recoverable media lifecycle

- **Archive is a reversible state, not a Storage deletion.** Migration 054 keeps the source object and metadata, marks the asset private/archived and excludes it through public RLS and every picker/consumer. An asset with a governed usage or direct Press/Resource reference cannot be archived until a compatible successor is selected.
- **Replacement is one database transaction.** The service-only lifecycle RPC rechecks `media.manage`, locks both assets, requires matching kind/bucket/visibility, updates the allowlisted cover fields, media-usage registry and direct Press/Resource foreign keys, archives the predecessor and writes the minimized audit together. The application supplies the public URL derived from the selected successor; the RPC verifies that it ends in the exact successor bucket/path.
- **A replaced asset is historical evidence, not a second active source.** Plain archived assets may be restored; replaced assets stay archived because their usages have moved and the successor is now the operational reference. No automatic hard delete or irreversible Storage cleanup is part of the owner workflow.
- **Rights and lifecycle are both publication gates.** General catalog readiness now checks 046 rights/reference, 054 archive state and processing state. Public images cannot be uploaded or edited without an owner/license reference, and metadata audit stores only changed-field names and evidence flags rather than the reference, caption or path contents.

## 2026-08-27 — Governed newsletter consent

- **Newsletter consent is separate, explicit and policy-bound.** The optional Home intake renders only with an approved, effective and versioned Privacy page plus secure persistence configuration. A draft policy, preview or absent server configuration cannot present a working subscription promise.
- **The browser never writes subscription rows directly.** Migration 055 revokes anonymous/authenticated mutations and routes subscribe/unsubscribe/Admin lifecycle through service-role-only RPCs. Public intake uses normalized non-reversible device/email fingerprints for bounded throttling, and mutation plus metadata-only audit is atomic.
- **Administration cannot manufacture consent.** Inbox operators may unsubscribe, erase or rotate a single unsubscribe link under `inbox.manage`, but there is intentionally no Admin resubscribe action. Historical rows without recorded consent stay visibly ineligible instead of receiving fabricated consent timestamps.
- **Unsubscribe links are capabilities, not logging material.** Only token hashes are stored; raw tokens are neither audited nor persisted by the application after link creation. A GET request is read-only, while the actual unsubscribe requires explicit confirmation through a Server Action so crawlers and link scanners cannot change customer state.

## 2026-08-27 — Truthful Admin security evidence

- **Configuration is not verification.** `/admin/security` uses distinct live, local, configured, unverified and failed states. A present environment-variable name receives only a configured label; hard-coded green control claims and zero-like fallbacks for failed reads are forbidden.
- **Provider checks are aggregate and permission-scoped.** Migration 056's service-only readiness RPC rechecks `system.view` and returns only RLS counts/missing table names, contract booleans and aggregate session/lockout/event counts. It never returns secret values, session/token hashes, request fingerprints, IP addresses or customer records.
- **Administrators revoke only their own application sessions.** The service-only mutation rechecks `admin.access`, requires the caller's still-active current session and constrains every target by the same actor ID. Revocation, metadata-only audit and privacy-minimized security event commit or fail together.
- **Source proof and live proof remain independent.** Security/price/secret-boundary source audits can be marked locally verified, while Supabase RLS/Storage/Auth and operational telemetry stay unverified until migration 056 runs and its probe succeeds on the authorized Staging environment.

## 2026-08-27 — Admin read integrity and provider-name readiness

- **A failed Admin read is not an empty business collection.** In a configured environment, the shared list reader throws one sanitized boundary error when Supabase returns or throws an error. `/admin/system` retains a structured state because its job is to explain the failure; other Admin consumers stop instead of inviting decisions based on false zeroes.
- **Optional feature flags fail closed.** Absence, an empty source or a query failure cannot enable workshops, VIP or certificates from application defaults. Only successfully read, explicitly enabled database rows can turn optional navigation on.
- **Integration presence is descriptive, not acceptance evidence.** The System Center checks only whether required environment-variable names are present in complete pairs. It never returns their values and labels the result `configured only`; launch readiness remains blocked until a controlled live provider test succeeds.
- **Client error telemetry is privacy-minimized even before Sentry.** The browser boundary reports only an opaque Next digest to the console, never the raw exception message or stack which might contain query, customer or provider context.

## 2026-08-27 — Atomic operational settings and governed Resend outbox

- **Operational settings commit as one permission-checked transaction.** Migration 057 replaces independent upsert/delete loops with a service-role-only RPC that rechecks `settings.manage`, validates the complete booking/payment/email state and couples the mutation with a metadata-only audit record. Fresh AAL2 remains an application precondition for the owner-facing action.
- **Email delivery is a leased state machine, not an Admin table edit.** Direct anonymous/authenticated outbox mutations are revoked. Claim and finalize RPCs require both `inbox.manage` and `notifications.send`, lock the item, cap attempts, observe retry timing, recover stale leases and atomically record minimized delivery evidence. A Contact record changes to `replied` only when provider success is finalized in the same transaction.
- **One outbox item has one provider idempotency identity.** The Resend adapter uses `contact-reply/{outbox-id}` as the stable key, sends plain text, enforces a ten-second deadline and reads at most 16 KB from the provider response stream. It stores only an allowlisted provider ID or safe error category; credentials, provider bodies, raw errors, recipients and reply content never enter application logs, audit metadata or operational events.
- **Configured, enabled and live are three different states.** Resend secrets stay outside the database and repository. A non-secret database setting controls whether replies may be queued, and the Admin action refuses activation when required environment-variable names are absent. Neither presence nor local build success is accepted as evidence of provider delivery.

## 2026-08-27 — Governed Customer 360 and PII access

- **Customer directory and detail reads have an explicit database boundary.** Service-only RPCs recheck `users.view`; free-text search is a SQL parameter rather than a constructed PostgREST OR expression. The directory returns at most 200 recent rows or 50 search results, and Customer 360 returns at most 100 records per business domain plus 20 notifications with total counts exposed to the operator.
- **PII reads are auditable without duplicating PII.** Directory/detail RPCs write access events containing only search presence/length/result count or bounded/PII flags and the opaque customer entity ID. Search text, names, email, phone, notes, notification titles and transaction content never enter audit metadata.
- **Customer notes are recoverable records.** An Admin with `users.manage` can add, archive or restore a note through one service-only transaction that locks the target where needed and couples the state change with content-free audit. Archiving preserves the note and its history; direct browser mutations are revoked.
- **Tags are operational labels, not an unaudited shortcut.** Add/remove actions recheck `users.manage`, normalize and bound input, serialize equivalent concurrent creation with a transaction advisory lock and audit only structural metadata. Tag text is not copied into audit logs.

## 2026-08-27 — Privacy-safe Sentry on Next.js and Cloudflare Workers

- **Worker and browser SDK versions move together.** The application pins the official Cloudflare Worker and browser packages to the same exact version. The Worker entry wraps vinext's fetch handler with `withSentry`; Next server instrumentation awaits capture/flush, and the client initializes only when its public DSN exists.
- **Monitoring receives error structure, not customer or request content.** The shared `beforeSend` contract removes user, request, breadcrumb, extra, context, transaction, fingerprint, module/span and local-variable data. Messages, exception values/types and mechanism names are replaced with fixed generic values; only bounded stack-frame identifiers and allowlisted low-cardinality route/digest tags remain.
- **Initial monitoring is error-only.** Default PII, traces, logs, breadcrumbs and Worker RPC propagation are disabled. Replay/performance packages are not installed. Source maps are not present in the deploy artifact; any future authenticated map upload is a separate CI-only decision and may never put its token in source or output.
- **Ambient credentials are not build inputs.** Isolated type-check, Next build and Worker build explicitly replace every Resend, Sentry and protected-upload secret name with an empty value. Admin readiness evaluates names/completeness only and never treats local build success or a configured DSN as live provider evidence.
- **Provider acceptance remains environmental.** No local test sends a Sentry event. Staging acceptance requires one controlled generic error, confirmation that its stored event contains no PII, and receipt of the configured alert; Production monitoring cannot be claimed before that evidence exists.

## 2026-08-28 — Governed manual customer notifications

- **A notification and its audit are one database transaction.** Manual delivery uses a service-role-only RPC which rechecks `notifications.send` in PostgreSQL. Browser-role inserts are revoked, and the Server Action no longer performs either the delivery or audit as independent writes.
- **One send intent has one opaque identity.** The client creates a UUID for the submit attempt and retains it across a retry. PostgreSQL serializes that identity and returns the existing delivery for the same actor/customer/content tuple; an identity collision with different inputs fails closed.
- **Notification content is operational data, not audit metadata.** The target notification stores its bounded title/body as required for the customer experience. Audit stores only kind, destination, content lengths and a body-presence flag, with the notification UUID as its entity; title/body and recipient contact data are not duplicated.
- **Destinations are a product allowlist.** Manual notifications may link only to known customer Dashboard areas and may use only the four supported display kinds. Arbitrary internal/external URLs, custom HTML and unbounded text are rejected at both application and database boundaries.
- **Read permission does not imply send permission.** Customer directory/detail pages check `notifications.send` before rendering the action. The RPC repeats the authority check, so hiding the control is truthful UX rather than the security boundary.

## 2026-08-28 — Owner-only atomic role governance

- **Role governance is not an ordinary Admin control.** The page, service-only RPCs and PostgreSQL mutations all require `roles.manage` plus an explicit owner assignment. Other administrators may read only their own role assignment for authorization; the full role and permission matrices are owner-only.
- **The active owner cannot change her own assignments.** Self grant/revoke is denied in PostgreSQL and represented as disabled in the UI. A second authorized owner must make such a change, preventing the active session from altering its own privilege facts or accidentally removing its recovery role.
- **Last-owner preservation is serialized.** Direct browser mutations are revoked, role mutations share one advisory transaction lock, and an owner count is evaluated only after the target row is locked. Mutation and minimized audit either commit together or do not occur.
- **Permission replacement is whole-state validation.** A delegated role's desired permission array is deduplicated and checked against the explicit application registry in PostgreSQL. `admin.access` is mandatory and `roles.manage` is forbidden; the previous rows are replaced and the structural audit is written in the same transaction.
- **PII-bearing governance reads are bounded and audited.** The owner read RPC joins assignment identity once, declares 500/1,000 row bounds and audits only aggregate counts plus the fact that PII was accessed. Email is never copied into role mutation audit metadata.
- **Session authorization is evaluated only at request time.** `/admin/roles` is explicitly dynamic. A credential-empty build must compile the protected route, not execute it and either fail or bake an unauthenticated/empty state into static output.

## 2026-08-28 — Explicit-actor atomic booking and availability administration

- **A Service Role call never impersonates the current administrator.** Admin booking and reschedule RPCs must accept the verified actor UUID explicitly and repeat `bookings.manage` in PostgreSQL. The 044 variants that derived authority from `auth.uid()` are retired for Admin use rather than treated as executable through a service client.
- **Customer-authored booking notes are immutable to Admin.** They remain visible for operations but are not accepted by the Admin mutation contract. Internal notes have their own bounded field and are never copied into event/audit content.
- **Service duration is the booking duration authority.** Admin selects the start time; PostgreSQL derives the end from the governed service duration. Terminal bookings cannot be moved or reopened, and the interface offers only transitions allowed by the same database state machine.
- **Booking decisions are one operational fact.** Booking update or reschedule resolution, event, customer notification and structural audit commit in one transaction after row/advisory locks and availability revalidation. Exact retries after completion do not emit a second decision notification.
- **Availability mutation and evidence cannot diverge.** Windows, exceptions and slot overrides use service-only RPCs that recheck `availability.manage`, validate targets/content, serialize the scope and write metadata-only audit in the same transaction. Browser-direct table mutations are revoked; public availability reads remain supported.
- **061 is additive source, not environmental authority.** It does not alter or reapply 043/044 and remains unapplied until the recovery-controlled Staging gate authorizes the complete migration order and live acceptance tests.

## 2026-08-28 — Evidence-gated manual payment and truthful refund lifecycle

- **Viewing the current proof is an approval precondition.** A short-lived signed URL is created only after a `payments.view` database recheck; successful creation is then confirmed in a content-minimized audit record. Approval requires that same actor and proof within thirty minutes, in addition to fresh MFA and `payments.approve`.
- **Storage paths stay server-side.** Admin queue data exposes only whether a proof row exists. The governed lookup returns a path exclusively to the Server Action, which exchanges it for a ten-minute signed URL; no raw private path is serialized into the page.
- **A refund request is not evidence that money moved.** Initiation records processing and keeps customer access active. Only an explicitly confirmed completion with a bounded external execution reference changes payment/order to refunded and revokes entitlements; failure restores paid state without revocation.
- **Commerce authority is action-specific and repeated in PostgreSQL.** Read, approve, reject, order-update and refund permissions are checked separately before controls render and again inside service-only RPCs. Browser-direct table mutations and direct execution of the superseded Admin RPCs are revoked.
- **Operational reasons are not audit payloads.** Customer-facing reason text remains only in the operational record/notification where required. Audit records retain structural flags, lengths, opaque identifiers and effect counts, never proof paths, evidence references, recipient details or reason content.
- **062 is source-only.** It is not proof of a Staging or Production schema. Its SQL, RLS, Storage access, concurrency, persistence and entitlement behavior stay `unverified` until the recovery-controlled Staging gate.

## 2026-08-28 — Authoritative checkout and inspected direct proof upload

- **The browser chooses identifiers, never money.** Checkout accepts product, variant, coupon code, payment method and a request UUID. PostgreSQL resolves publication/readiness, the winning monetary offer, coupon eligibility and every amount; coupon preview calls the same quote boundary and cannot submit a price.
- **Idempotency represents intent, not elapsed time.** A per-attempt UUID is stable across retries and uniquely bound to the actor and payload. Advisory locking plus a unique index returns the same order for an exact retry and rejects reuse with changed selections; a durable authenticated rate limit bounds deliberate new identities.
- **Free fulfillment is a separate truthful outcome.** A zero-total order does not require configured bank details or a proof. The existing atomic fulfillment trigger grants access and the checkout UI reports the returned paid state; positive totals remain manual-payment-only until a provider is separately configured.
- **Large proof bodies bypass the Worker, authority does not.** The browser uploads directly to private Supabase Storage with a short-lived signed token. PostgreSQL must first issue an order-owned intent, and the server must reauthorize actor/intent/path before reading or deleting the object with Service Role.
- **Extension and declared MIME are not evidence.** Finalization observes a bounded Storage range, total size and response MIME, then validates PNG/JPEG/WebP signatures. Only an exact declared/observed match can bind a proof; invalid, expired or superseded objects remain outside payment state and are removed.
- **063 is source-only.** The private intent ledger, SQL functions, real Storage behavior, RLS and concurrency remain unverified until the recovery-controlled Staging gate applies and exercises the migration.

## 2026-08-28 — Enrollment-bound atomic customer learning state

- **Preview is not an enrollment substitute inside the customer Dashboard.** Public lesson preview may support discovery, but progress, private notes, course resources and the enrolled curriculum require an actual enrollment row.
- **Progress is one transactional fact.** A lesson toggle, full course-percentage recomputation and metadata-only audit execute under one customer/course advisory lock. Browser roles retain own-row reads but cannot write progress tables directly.
- **Private note content stays private operational data.** Only the owning customer can create, update or delete a note through the server boundary, and each note must belong to an enrolled course lesson. Audit stores opaque identifiers and content length, never note text.
- **Learning read failures do not imitate missing content.** A configured database failure crosses an application error boundary. Unenrolled responses serialize no curriculum, resources or notes, and enrolled note/progress reads are limited to the requested course.
- **064 remains source-only.** Live SQL parsing, RLS denial, concurrency and persistence require the recovery-controlled `STAGING EXTERNAL GATE`; local Build or E2E success does not establish those provider facts.

## 2026-08-28 — Governed customer protected-delivery admission

- **Entitlement is decided in PostgreSQL, not inferred by a route.** One service-only RPC binds the actor, resource kind, opaque entity and workshop slug, then repeats the current enrollment or active-registration check before any private path is returned to the server.
- **The Worker mints links but never carries protected bodies.** Course/workshop resources use 60-second Supabase Storage URLs and recordings use 90 seconds. This preserves the direct-delivery architecture and avoids Worker body, CPU and memory limits.
- **Minting is an auditable bounded operation.** Per actor/kind/entity advisory locks enforce 30 daily resource admissions or 60 recording admissions. Evidence contains a hashed request fingerprint and structural reason/remaining count; Storage paths, titles and external destinations are excluded.
- **External learning resources require HTTPS.** Both the database boundary and route URL parser reject plain HTTP and non-web schemes. The redirect response remains private/no-store with a no-referrer policy.
- **065 is source-only.** Local contracts and both 70/70 suites prove source/runtime compatibility, not live SQL, RLS, Storage or concurrency; those remain inside `STAGING EXTERNAL GATE`.

## 2026-08-28 — Customer-owned history survives public withdrawal

- **Unpublishing controls discovery, not an existing customer's receipt.** Products, courses/curriculum, books, workshops and services remain readable only to customers holding the corresponding order, enrollment, access grant, non-cancelled registration or booking. Anonymous/public visibility still requires the original publication or active flag.
- **Dashboard failures are not empty accounts.** No-environment and anonymous states may return neutral fallbacks, but a configured authentication or query error raises one sanitized application error and renders an accessible retry/support boundary.
- **Related histories are explicitly bounded.** Curriculum counts, workshop materials, booking events/reschedules, order items and payment product titles use separate scoped queries rather than unbounded embedded relationships. Customer links are reduced to HTTPS meetings and Dashboard-relative notifications.
- **Pending payment is an authoritative next action.** The Dashboard derives it from an own order row and routes to payments or orders according to persisted state. Missing order metadata fails closed rather than defaulting to a fabricated state.
- **066 changes SELECT continuity only.** It grants no INSERT/UPDATE/DELETE path and remains unapplied until the recovery-controlled `STAGING EXTERNAL GATE` proves RLS isolation and persistence.

## 2026-08-28 — Customer account writes cross one explicit-actor boundary

- **A customer session proves identity; it does not retain broad table UPDATE.** The Server Action verifies the current Auth user and passes only that opaque ID to service-only PostgreSQL functions. Authenticated roles keep their own reads but cannot update arbitrary profile or notification columns.
- **Profile self-service is an allowlist.** The transaction may change only normalized `full_name` and optional `phone`; email, avatar, timestamps and ownership cannot be supplied by the browser. The business row and audit evidence commit together under a per-customer lock.
- **Read state is operational state with a truthful result.** Mark-all-read changes only the actor's unread notifications, returns the durable affected count and writes one count-only audit record. A retry with nothing left is a successful idempotent no-op rather than a duplicate audit.
- **Customer content is excluded from audit.** Profile names, phone numbers, notification titles and bodies never enter audit metadata; evidence records only changed-field booleans or an affected-row count.
- **067 remains source-only.** SQL parsing, RLS denial, concurrent execution and reload persistence stay under the recovery-controlled `STAGING EXTERNAL GATE`.

## 2026-08-28 — Password changes require proof appropriate to their flow

- **An ordinary authenticated session is not recent credential proof.** Dashboard changes submit the current password through Supabase Auth's supported `current_password` field and require a distinct, confirmed new password. Recovery is separate and accepted only from a verified JWT whose AMR contains `recovery`.
- **Email links terminate in one SSR PKCE exchange.** Recovery and signup use `/auth/callback`, which exchanges the one-time code into HttpOnly-cookie session state and redirects only to a fixed internal set. Callback responses are private/no-store and never reflect an arbitrary `next` destination.
- **The provider/database boundary is represented truthfully, not called atomic.** Migration 068 creates a pending, rate-limited, content-free operation before invoking Auth and finalizes it to succeeded/failed afterward. If finalization is unavailable, the durable pending fact remains instead of fabricating a database-confirmed outcome.
- **Successful password changes end the active trust period.** All sessions are closed and the customer signs in again with the new credential. Access-token expiry behavior remains a provider configuration/acceptance fact, not a local guarantee.
- **068 is source-only and redirects are environmental.** SQL execution, real PKCE recovery, SMTP receipt, AMR, session invalidation and the exact Staging/Production redirect allowlists require the controlled `STAGING EXTERNAL GATE`.

## 2026-08-28 — Customer booking writes carry an explicit actor; Cairo wall time is not server local time

- **Ownership is rechecked inside the transaction.** A Server Action verifies the current user, but cancellation and reschedule RPCs still select and lock a booking by both ID and explicit actor. Browser roles cannot execute the replacement functions or write request/event tables directly.
- **Operational reasons and audit metadata have different privacy needs.** The bounded customer reason remains on the customer's booking/request for support. Booking events and central audit contain only presence/length, opaque IDs, times and structural effects—never the reason text.
- **Credit restoration is observed, not promised.** Cancellation triggers the established immutable package-ledger reversal and then reports whether a reverse row exists. The UI mentions restored credit only when PostgreSQL returns that fact.
- **`datetime-local` means Cairo in this product.** The server converts the wall time with the IANA `Africa/Cairo` rules and rejects non-round-tripping dates; it never inherits UTC or another Worker/browser locale. PostgreSQL remains authoritative for whether the resulting slot is actually available.
- **ICS is a private representation of persisted state.** Pending bookings export as `TENTATIVE`, confirmed as `CONFIRMED`; invalid dates or query failure stop generation, and Arabic lines are escaped/folded before a private/no-store download.
- **069 remains source-only.** Database compilation, RLS denial, trigger effects, concurrent retries and calendar-client compatibility require the recovery-controlled `STAGING EXTERNAL GATE`.

## 2026-08-28 — Public registration can create a customer profile, never an administrator

- **The legacy email-based owner auto-grant is retired by migration 070.** It remains visible in historical migration 013 and prior decision history because applied migrations and append-only decisions are not rewritten, but it is no longer the effective trigger after 070.
- **Identity metadata is untrusted input.** The Auth trigger normalizes and bounds full name/email, substitutes an empty display name for invalid provider-side metadata, and protects new/changed profile rows with forward-safe constraints. Existing unknown rows are not destructively rewritten during deployment.
- **Registration evidence excludes identity content.** The profile and registration audit commit in one trigger transaction; audit stores only the opaque user ID and structural booleans, not name, email or raw metadata.
- **Role provisioning is separate from account creation.** Existing owner rows are preserved. New staff roles use migration 060's owner-authorized, fresh-AAL2 transaction; an environment with no owner requires a separately approved first-owner bootstrap after identity verification.
- **070 remains source-only.** Auth trigger execution, existing-row constraint validation, email confirmation and durable audit evidence remain within `STAGING EXTERNAL GATE`.

## 2026-08-28 — Account deletion is a traceable request; approval and completion are different facts

- **The historical contact-only decision is superseded by migration 071.** Prior append-only history remains intact, but Dashboard settings now create and show a durable request instead of promising a seven-day outcome with no operational record.
- **A customer controls the request, not the retention decision.** A signed-in non-Admin identity may request or cancel. Review can identify payment, booking, legal-retention or identity follow-up needs without implying that every record is immediately erasable.
- **Review content stays operational and audit stays minimized.** Customer-facing review notes may be stored on the request and notification; audit contains status transitions and note presence/length only.
- **Approval never means deletion.** Fresh-MFA `users.manage` approval marks the work ready for the separately controlled Auth/data operation. Completion is impossible while the `auth.users` foreign key still exists and requires a bounded external execution reference afterward.
- **071 remains source-only.** PostgreSQL execution, RLS denial, concurrent request/review behavior, notifications and the actual provider deletion/retention procedure require the controlled Staging and owner-approved legal gates.

## 2026-08-28 — Protected upload inspection and content binding are one database fact

- **A signed path is authority only when it has a durable issued intent.** Before Storage signing, migration 072 binds the administrator, target, opaque path hash, declared MIME/size and expiry in a private ledger with metadata-only audit. Exact intent authorization precedes privileged inspection or removal, so a caller cannot substitute an old object path.
- **A validated object is not published by a sequence of best-effort writes.** Migration 072 binds the book/video/resource, finalizes its intent, records the inspection and delivery event, and writes metadata-only audit evidence in one permission-rechecked PostgreSQL transaction. A failure rolls back the entire database fact.
- **The database repeats the trust boundary.** Service-side magic-byte inspection remains mandatory, but the RPC independently validates kind, entity, opaque path shape, a recomputed path hash, extension, MIME and size before mutation. Browser roles cannot mutate the protected delivery tables or execute the replacement RPCs directly.
- **Storage cleanup is an explicit external effect.** Rejected/quarantined objects are removed before rejection evidence records the cleanup result. Replaced video paths are returned only to the Server Action for private deletion; any unconfirmed cleanup produces hash-only System/audit reconciliation evidence, never a raw path in logs.
- **072 remains source-only.** Local contracts prove source ordering and the absence of split application writes. SQL compilation, transactional rollback, role denial, real Storage behavior and persisted evidence require the recovery-controlled `STAGING EXTERNAL GATE`.

## 2026-08-28 — Curriculum deletion preserves protected delivery and customer history

- **Curriculum is a governed aggregate.** Module and lesson create/update/delete now execute under one course-scoped lock with a repeated `learning.manage` check and metadata-only audit in the same transaction.
- **A text field cannot appoint a protected video.** New lessons always start without `video_path`; only the issued-intent and server-inspected protected-upload boundary may attach delivery content.
- **Delete means safely absent, not cascade-and-hope.** A module with lessons cannot be deleted. A lesson with a protected video/resource, customer progress or private notes cannot be deleted; delivery removal and retention decisions must be explicit rather than orphaning Storage or erasing customer history.
- **073 remains source-only.** Local contracts and builds cannot establish SQL parsing, role denial, concurrent ordering or persisted public/Admin behavior; those remain within `STAGING EXTERNAL GATE`.

## 2026-08-28 — Removing protected delivery preserves history and separates Storage truth

- **Removal from customer delivery is archival, not destructive cascade.** Book files and learning/workshop resources retain their opaque records and attribution so download, admission and operational history remain intact. Lesson videos clear the single binding and revoke active admissions under the same database lock.
- **Every customer admission path denies archived content.** RLS protects direct customer reads, while Service Role book/course/workshop authorization repeats the active-record condition because elevated functions cannot rely on RLS.
- **A database commit cannot claim a Storage deletion.** The archive transaction returns the path only to the trusted Server Action. Bucket, safe path shape and SHA-256 authority are verified again before deletion; a separate private cleanup event records `removed`, `not_managed` or `failed` after the provider result.
- **Operational evidence is path-free.** Audit and System reconciliation contain only actor/entity/record IDs, path hashes and structural outcomes. The Admin browser receives opaque IDs and truthful split-phase feedback, never a private path.
- **074 remains source-only.** SQL compilation, rollback, concurrent authorization/archive behavior, RLS/service-role denial, real Storage cleanup and persisted evidence remain within `STAGING EXTERNAL GATE`.

## 2026-08-28 — A CMS section edit includes its recovery point and audit

- **Revision, mutation and audit are one fact.** Page-section update/delete takes the prior snapshot and commits it with the requested mutation and metadata-only audit under one page lock. A partial Service Role call sequence is no longer treated as recoverable governance.
- **The database repeats structural bounds.** It limits a page to 100 sections, names/order/content size and fixed kinds, rejects executable URL/script markers, and distinguishes `content.manage` from `content.delete` even though the Server Action already checked the current Admin.
- **A published homepage keeps a viable public journey.** Visible `hero`, `pathways` and `cta` cannot be hidden or deleted while the page is published. The owner must first move the page to a non-public state rather than accidentally breaking the live journey.
- **The browser gets operational truth, not transaction parts.** Admin sends validated content and opaque IDs to one action, confirms deletion, and receives an accessible durable outcome; revision rows and audit metadata never become browser-controlled writes.
- **075 remains source-only.** SQL parsing/rollback, role denial, concurrent editors, revision persistence and Admin-to-public parity remain within `STAGING EXTERNAL GATE`.

## 2026-08-28 — Navigation is a governed aggregate, not independent links

- **One settings permission protects one atomic fact.** Create, update and delete repeat `settings.manage` inside a service-only transaction and commit a metadata-only audit under the same aggregate lock.
- **Internal destinations stay internal at every boundary.** Database constraints, the RPC, the Server Action and the Admin form bound labels/order and accept only single-slash internal paths without whitespace or backslashes.
- **The hidden hierarchy cannot cascade through a flat editor.** Existing parent links are preserved, but an item cannot move away from its parent's menu and a parent cannot be deleted while children exist. The owner must resolve the visible relationship explicitly.
- **076 remains source-only.** Legacy-row constraint compatibility, SQL rollback, role denial, concurrent ordering and Admin-to-public persistence remain within `STAGING EXTERNAL GATE`.

## 2026-08-28 — A CMS page has one lifecycle authority

- **The page editor, not a generic boolean toggle, controls publication.** Page saves couple prior revision, bounded content/SEO, lifecycle state and metadata-only audit. Scheduled or public states require both content management and publication permission.
- **Legal and Home readiness applies to now and later.** Immediate saves, scheduled saves and the due-content scheduler all deny an unapproved legal page or a Home page missing visible `hero`, `pathways` or `cta`.
- **Owner scheduling is Cairo wall time.** The browser renders stored UTC as `Africa/Cairo`; the Server Action converts the submitted wall time back to an exact UTC instant and rejects nonexistent DST local times or past schedules.
- **Scheduler publication is observable.** Every page or article actually made public by the service-only scheduler receives a metadata-only System audit in the same transaction.
- **077 remains source-only.** SQL compilation/rollback, cron execution, legacy compatibility, role denial, concurrent scheduling and public persistence remain within `STAGING EXTERNAL GATE`.

## 2026-08-28 — Article deletion preserves editorial history

- Article content, managed-cover usage, revision and audit form one transaction; publication additionally requires `content.publish` and rights-backed completeness.
- Scheduled publication repeats readiness. Owner wall time is Cairo, not deployment-runtime local time.
- Delete in the organized editor means audited archival. Hard deletion is not used to erase revisions or editorial evidence.
- **078 remains source-only.** SQL/RLS/concurrency/media and cron persistence remain within `STAGING EXTERNAL GATE`.

## 2026-08-28 — Advanced settings cannot become a secret store

- Only existing non-typed keys may be edited through the advanced JSON surface. Secret-like keys/fields and payloads above 32 KiB fail closed.
- The previous setting value is retained privately, and setting/flag transition plus audit commits atomically.
- **079 remains source-only.** SQL/RLS/concurrency/persistence remain `STAGING EXTERNAL GATE`.

## 2026-08-28 — A public preview is not accepted Staging or Production

- The owner-requested public view is a separate Cloudflare Worker with no Supabase, Resend, Sentry, database or customer-data secrets. It exercises the same isolated Vinext artifact and displays truthful unconfigured states.
- The protected Staging Worker remains unchanged. No DNS, nameserver, canonical domain, provider project or Production migration is changed merely to make the interface publicly inspectable.
- A green public preview proves anonymous Cloudflare runtime, presentation and guard behavior only. Login, persisted Admin, booking, payment, protected delivery, email, monitoring and database security require the independent Staging recovery/migration/provider acceptance gate before any customer-ready judgment.

## 2026-08-28 — Visual delivery is reviewed as an experience, not line count

- Header, Home and Footer form one bounded visual composition. Typography, layout and ornament remain in source, while owner-facing words, section order/visibility and navigation remain attached to the existing CMS/Admin controls.
- The labelled niqabi audience illustration remains the Home focal image; no testimonial, press mention, statistic or customer fact is invented to make an unconfigured preview look populated.
- Visual slices use targeted type/lint/browser checks while iterating. The full deployment and Worker suites run only at a major phase boundary, not after each visual adjustment.
- Competitive visual strength is interpreted as hierarchy, scale, contrast and motion—not copied layout or content. The Home focal composition therefore uses the existing labelled niqabi image, a dark cinematic stage, staggered Arabic type and motion with a complete reduced-motion fallback.

## 2026-08-28 — Public experience fixtures are explicit, disposable and provider-free

- Course, book and booking demonstrations activate only under the server-side `preview` deployment flag and only while Supabase public configuration is absent. A configured provider always disables the fixture path instead of mixing demonstration and real data.
- Every simulated commercial step states that it creates no booking, order, payment, upload, entitlement, review or testimonial. Session-only progress is convenience state, not an operational record.
- Preview fixtures remain code-scoped and read-only. Adding fake Admin mutations would violate operational truth; real Admin-to-public persistence is accepted only against isolated Staging with permissions, audit and the required migrations.
- Original generated artwork may ship as compressed public Preview assets because it contains no customer data, third-party logo, competitor asset or factual claim. Paid/protected media remains in the governed private Storage delivery path.

## 2026-08-28 — Preview Admin access cannot weaken operational Admin

- `/admin` remains the only operational control plane and keeps Supabase identity, AAL2 MFA, RBAC, server validation and audit requirements. A public Preview password is never accepted as an operational administrator identity.
- `/preview-admin` is a separate read-only visual map enabled only when `HEBA_DEPLOYMENT_ENV=preview`. It exposes no customer/provider data and has no mutation controls, so it cannot create a false persistence claim.
- Preview access uses deployment-only email/password secrets, fixed-length digest comparisons for both fields and an eight-hour HMAC-signed HttpOnly/SameSite=Strict cookie. Authentication errors stay generic. Secret values are not source, config, build artifact or evidence.

## 2026-08-28 — Light is the intentional first-visit brand default

- An absent theme preference resolves to light regardless of operating-system preference. Dark mode is still fully supported and persists only after the visitor explicitly chooses it.
- Editorial depth comes from controlled photography, paper texture, soft gradients and restrained motion; it does not require an always-dark canvas or copied competitor composition.
- The visible Home portrait no longer carries a “representative image” badge or defensive copy. Accessibility remains in concise alt text without interrupting the customer journey.

## 2026-08-28 — Worker E2E isolates a confirmed Wrangler local regression

- Project build and deployment remain on the current Wrangler. Only the localhost Playwright Worker server is pinned to Wrangler 4.113.0 and its last supported local compatibility date because 4.114+ can terminate the Miniflare proxy between requests with `Network connection lost`.
- This test-only pin carries disposable bindings and does not change the Cloudflare runtime, application compatibility date or deployment artifact.

## 2026-08-29 — Administrative identity is individual and security history is append-only

- **The historical shared Admin-email decisions are superseded.** Every approved administrator submits her own email/password, receives only a generic failure response, is checked against `admin_roles`, and must complete AAL2. There is no operational `ADMIN_LOGIN_EMAIL` setting.
- **Invitation does not bypass role governance.** Only a freshly verified owner may send an Auth invitation and grant one bounded non-owner role. Failed profile/role provisioning triggers immediate identity cleanup; if provider cleanup itself fails, the UI identifies the role-less account and required manual removal instead of claiming atomic success.
- **Security history is useful without becoming surveillance.** Login, MFA, session and logout records retain opaque identity/session/request references, outcome and a coarse device label. Raw IP, raw user-agent, passwords, MFA secrets and tokens are excluded.
- **Audit tables are append-only from the browser boundary.** Migration 080 removes browser writes to business/security history. Preview-token consumption is one service-only atomic update, so concurrent replay fails closed.
- **Read-only work has explicit roles.** `analyst` and `auditor` receive bounded matrices. Owner-only permission editing, fresh MFA, self-change denial and last-owner protection remain unchanged.
- **080 and 081 remain source-only.** SQL compilation, legacy-row compatibility, Auth invitation delivery, RLS denial, concurrent replay and persisted history require the isolated Staging acceptance gate.

## 2026-08-29 — Source release means reproducible, inspected content—not a copied workspace

- `.env*` except `.env.example`, `supabase/.temp`, build output, caches, private reports, dumps and nested archives never enter the source artifact.
- Both ZIP and TGZ are recursively inspected after creation. The manifest records path, byte count and SHA-256 for every staged file.
- A passing source build is separate from Production acceptance. The release report lists unapplied migrations, provider configuration, secret rotation, live RLS/concurrency, browser runtime and owner/legal approvals as explicit external gates.

## 2026-09-05 — Master V2 preserves the journey and replaces decoration with architecture

- The approved visual identity is the long Arabic journey built from doors, arches, light, books and alternating ivory/deep-teal spaces. It is refined as one system; it is not replaced with a generic corporate hero or a hotel-like lobby composition.
- Burgundy is a scarce emotional emphasis, not teal under another token name and not a dominant surface. Champagne lines, fluted-light geometry, paper and controlled shadows replace botanical decoration.
- Discovery and conversion remain distinct: «ابدئي من هنا» leads to the guided path, while booking remains an explicit separate action. Motion directs attention and must preserve an equivalent reduced-motion experience.
- Professional credentials may be shown as bounded evidence, but customer counts, outcomes, press or publication claims are never invented to increase visual density.
- Newly disclosed vulnerable transitive dependencies are treated as release blockers even when unrelated to the current visual slice. The package override pins `browserslist` to its patched line while preserving the existing framework and lockfile.

## 2026-09-05 — Master V2 checkpoint 2: canonical content and honest acceptance

- The recovered implementation plan sets burgundy to #7A2433, not the Phase 1 value, and places the mobile Hero message before its portrait. Those concrete corrections supersede the earlier checkpoint.
- Page-section content is the canonical Hero editor. The old setting is a read-only compatibility fallback, and its legacy write endpoint is retired. Migration 082 is additive; 080/081 must not be overwritten to follow stale numbering in the plan.
- Guided answers stay ephemeral. Home and Start Here consume the same published version; one-question navigation is explicit, editing keeps choices, reset is separate, and published result order breaks scoring ties.
- Article covers come from the governed record instead of decorative index-based substitutes. Missing covers and missing publications remain honest empty states.
- Request CSP is passed to the renderer and the root is explicitly dynamic because nonce-bearing HTML must be fresh. Production script policy is not relaxed to compensate for blocked preview modules.
- Local build/source/logic checks are not browser, database, performance or launch acceptance. The browser client blocked the main module in this session; remaining external gates and missing exact visual references are documented, not marked complete.


## 2026-09-05 — Master V2 continuation decisions
- Keep legacy owner content on read while normalizing it to a bounded typed profile. Publish only credentials with explicit owner confirmation; old hardcoded credentials are not treated as a verification record. The homepage trust-section editor controls placement while the owner profile controls credential values.
- A Home image stores only an internal media asset ID, Arabic alt and bounded focal coordinates. URLs are resolved server-side against active public images with rights evidence; missing/unavailable assets use the retained original section art. Usage rows are synchronized within the page-section transaction and replacement repeats content permission and preserves a section revision.
- Featured article choices use ordered slugs and current published state. Removed/renamed/archived choices are not substituted silently; the owner can select a replacement. An empty list explicitly means latest published articles.
- Keep checkout's existing request ID across a transport retry; add an in-flight lock and finally cleanup without changing order/payment/hold schema. The request-lock UI supplements server idempotency rather than replacing it.
- Report summaries refuse truncated rowsets using exact counts. Paid-order period controls do not silently narrow all-time enrolment/membership counters. These are operational gross-order values, not net profit or refund settlement.
- Runtime pnpm 11 rejected the imported browserslist 4.28.9 due to release-age policy. Resolve only that dependency to policy-eligible 4.28.8 using registry version/integrity/ranges. Preserve the security lower bound and all other locked packages; mirror overrides and existing build approvals in pnpm-workspace.yaml for pnpm 10/11 compatibility. No supply-chain policy was relaxed.
- Existing optimized local assets and public-media URLs continue using unoptimized image delivery because this dual Next/Vinext Worker project has no accepted image-transform runtime. Source dimensions/aspect ratios and sizes are reserved; dynamic AVIF/srcset generation and field LCP acceptance remain open.
- The same preview module was explicitly blocked by the cloud browser. Do not bypass client protections or infer interactive acceptance from a rendered document.


## 2026-09-06 — Master V2 Admin workflow continuation

- Keep the existing RPC/permission/publication boundaries. Reuse a common client action runner for bounded Admin controls instead of independent unhandled promises. The lock is per mounted control only; no automatic retry, provider exception detail, cross-tab idempotency claim or credential persistence.
- Capture event.currentTarget/FormData before await. Successful creates reset once; failed requests retain fields. Native editor dialogs keep visited children mounted after close to preserve unsaved local drafts; navigation/reload does not persist those drafts.
- Admin wall-time input uses Africa/Cairo in both directions, including workshop and booking edits, subscription-plan dates and press/resource/marketing schedules. Server validation rejects invalid ranges before writes where amended. Existing records are not rewritten or time-shifted in bulk.
- Payment proof delivery offers an ordinary expiring link after permission-checked preparation. No asynchronous popup, no client replacement of server proof-review/AAL2 checks.
- FormField/FormTextarea/FormSelect are small client boundaries using React useId so repeated editor field names cannot duplicate label/help targets. An explicit caller ID remains authoritative. React server markup testing verifies ID relationships, not browser interaction.
- Existing legacy catalog, subscription-plan and marketing actions still contain multiple database statements. The new client guard and early date validation do not make those transactions atomic. Their failure/concurrency acceptance and any additive transactional conversion remain separate work before release approval.
- No additional dependency or migration was introduced. Full local source checks and both isolated builds do not satisfy the outstanding reference, browser, Staging/RLS or production gates.

## 2026-09-17 — Atomic specialized catalog and honest local database evidence

- Add migration 086; never rewrite earlier migrations. Use a service-only action RPC with explicit allowlisted kinds/actions, in-transaction permission/readiness checks, domain/product locks and transactional media/revision/audit writes. A generic product-table toggle must not publish bundle/VIP/free-resource programmes.
- Preserve protected delivery bindings and bundle/customer history on catalog deletion; use unpublish when linked. No implicit storage deletion or claim of database idempotency.
- Use separate ephemeral PGlite 0.5.8 tooling to execute the actual migration SQL against extracted core DDL plus synthetic permission/history fixtures. Keep it outside application dependencies; document its explicit invocation. This adds local transaction evidence, not Supabase/Auth/RLS/concurrent acceptance.
- Continue the shared request/feedback controller for curriculum and Inbox. Treat server delivery notice as authoritative and separate clipboard availability from link creation. Never automatically retry a lost mutation response.
- Upgrade confirmed vulnerable dependencies to the vendor's patched versions; keep pnpm 10 and 11 override declarations aligned and regenerate the lockfile. Rebuild both supported targets and rerun the production audit before accepting the update.

- Next 16.3.3 introduced a navigation lint rule on three existing Admin sign-out redirects. Keep full document navigation to discard client-side Admin caches after session invalidation; document narrow line exceptions rather than replace the security boundary with client-router navigation. No logout behavior changed.

## 2026-09-17 — Checkpoint 6 admin scope and transaction boundaries

- Full administration means the primary owner can operate every domain, with explicit delegated staff permissions. No bypass of AAL2, last-owner safety or server permission checks. Effective database permissions now drive Admin navigation too.
- Programme/variant/plan/marketing writes become service-only aggregate RPCs. Used financial/customer history stays immutable or archived; deletion of unused records is available. Retired direct booking RPC grants remain revoked when their implementations are replaced.
- Subscription eligibility is frozen with plan snapshots. Backfill captures current eligibility at migration time, not an invented historical entitlement. Existing pending purchases block changes to their linked plan until resolved.
- Site switches stop new intake, not historical fulfillment, account access, cancellation or unsubscribe. Booking and checkout switches both affect paid/package booking creation. DB row locks synchronize opening/closing with intake; real multi-session acceptance remains external.
- Offer targets keep the existing product-ID OR product-type semantics. Legacy category labels are retained but are not a new targeting taxonomy. Capacity counts unexpired pending/review orders plus paid/refunded orders. Cancelled/expired reservations release capacity. Concurrency must be proved on Staging.

- Final archive verification found an imported root RELEASE_MANIFEST.json being hashed as payload and overwritten by the packager. Exclude that generated input before copying; hash every final payload entry and verify it against the ZIP before delivery. This fixes source archive integrity without changing application runtime.

## 2026-09-17 — Checkpoint 7: review decisions, notification retries, protected cleanup

- Review authorship, rating and publication/name consent remain customer-owned. Administrators approve/reject/feature/respond/archive/restore and may permanently delete an archived review. A row version changes on every update, including customer resubmission, and stale moderation is refused. Only the response operation changes the saved owner reply; reject/archive/restore hide its publication. Audit and mutation commit together.
- In-app notification sends retain the existing 059 idempotent transaction. The editor freezes payload and request UUID on uncertain results; receipt lookup and retry preserve that identity. A definite SQL denial or local validation rejection unlocks the same draft. Authorized history is paginated and does not claim email delivery. Customer read receipts keep the audited 067 RPC; no browser write grant is reopened.
- Physical object deletion is never compensation for a binding error. Such an error can follow a committed transaction. The same upload intent resolves an uncertain result. Rejection/expiry, replacement and archival enqueue cleanup in the database transaction; no caller-supplied Storage path authorizes cleanup.
- Cleanup uses private jobs, a 10-minute lease with a fencing token, active-reference checks and permanent path tombstones. New bindings cannot reuse a retired path. Jobs wait at least 24 hours after intent expiry as a conservative local quarantine policy; this is not a claim that a real provider TTL/late-upload race was accepted. Failures wait 5 minutes before retry. Cleanup is explicitly manual through /admin/delivery; no cron or external runner was configured.
- Unmanaged legacy paths are retained for separate reconciliation. The migration backfills known terminal upload intents and archived bindings; it cannot reconstruct an old orphan whose only remaining evidence is a hash. Replaced video admission sessions are revoked atomically. Removal of a video requires the hash of the version displayed to the administrator.
- PostgreSQL ARE rejects the old `{0,1023}` repetition bound; retain the independent 1–1024 character length guard and use an unbounded allowed-character expression. Fix is additive in 091; historical migrations remain unchanged.
- Evidence is actual 090/091 SQL over extracted schema and synthetic dependencies in PGlite, and actual server-action execution with injected provider responses. Neither proves concurrent sessions, the full migration history, browser interaction, Supabase Auth/RLS or Storage behavior. These remain separate Staging gates.


## 2026-09-17 — Checkpoint 8: customer transaction recovery and consistent fulfillment

- A converted hold has a private request fingerprint and booking receipt in the same transaction. Retry resolves current state before checking an expired lease. Only matching own-user input can replay; helpers without the receipt boundary have no API grants. Contact text is not copied into the receipt table. Pre-migration converted holds have no fabricated receipt.
- Booking state follows actual paid order state. Package and zero-total orders confirm their bookings; cancelled or elapsed pending bookings require review before payment approval. Self-service cancellation does not race a pending payment/refund review. Refunding a future single session cancels its appointment; completing a package refund requires resolving future credit bookings first. Money transfer remains external, recorded through the existing governed refund contract.
- Use the returned subscription UUID, never a newest-row query, to bind purchase fulfillment. Outstanding bundle orders freeze bundle composition. Checkout stores normalized requested coupon identity; historical backfill only reflects available migration-time data.
- Network ambiguity preserves payment evidence. Missing Storage inspection is retryable, not evidence of invalid bytes. Each mounted uploader preserves request identity and a file-content fingerprint; it reconciles finalization before another same-path, non-overwriting upload. Tokens/files remain in memory. Closed tabs use account history; no cross-tab/file-persistence guarantee is made.
- Only committed terminal proof outcomes can authorize removal of unbound objects. Storage failure and orphan reconciliation require provider testing; the learning-content cleanup queue 091 is not silently repurposed for financial evidence.
- Customer UI shows current receipt state and recorded price, freezes unresolved checkout/booking payloads, and permits exact recovery after local timers expire. A Cairo civil-date anchor replaces a moving 12-hour offset. Credit-read errors fail visibly, rather than defaulting the user to cash payment.
- Acceptance remains layered: local transaction fixtures and injected action tests are distinct from full migration rehearsal, Auth/RLS/MFA, multiple connections, actual Storage, browser, accessibility and performance. Original plan contains 19 phases; checkpoint number is not a count of closed phases.

## 2026-09-22 — Original phases 9–11 unified account/admin/catalog batch

- Continue the exact retained Checkpoint 8 source after workspace maintenance. Version numbering of delivery archives is independent of original plan phase numbering.
- Resume an existing owned order at its immutable order ID, price, currency and requested payment method; no replacement checkout on reload. Ambiguous proof attempts retain identity/file in memory; first/renewed receipt controls share the established uploader.
- Customer subscription projection accepts no user ID, derives auth.uid(), sums the complete ledger and exposes only purchased contract/display fields. Paginated account list counts come from exact head queries, not truncated lists.
- Admin Shell and command search share one effective-permission registry. Server customer search separately checks users/orders/payments read permissions. Services gain a dedicated catalog-authorized route.
- Catalog archive/restore is additive 095 and transactional with revisions/audit. It preserves purchases and protected-delivery bindings; restoration remains unpublished, and legacy saves/publication cannot reactivate archived products. Permanent deletion keeps existing history guards.
- Catalog previews identify their scope as saved card data. Browser/ref-image/provider and full Auth/RLS acceptance are not inferred from compilation, SSR or single-connection SQL fixtures.

## 2026-09-23 — launch request supersedes the long phase queue

- Execute the owner's short launch scope against the exact phases 9–11 source, preserving the existing data model. No new external repository, production migration, account grant, message or deployment was performed.
- Enrolled owner may use a password-only sign-in form. Supabase remains the identity provider; SQL requires the explicit owner enrollment, password AMR and matching unrevoked operational session. Other staff retain MFA. Sensitive owner actions require a password verified within ten minutes. The v2 session-cookie name prevents legacy `/admin` cookies shadowing the new root-scoped cookie. Account-wide atomic throttling supplements the previous request fingerprint throttle.
- A single coach owns one shared calendar across services. 097 uses a GiST reservation ledger including buffers and active holds, plus a global booking exclusion. Conflicting existing rows abort migration without silent deletion. Integer slot enumeration fixes midnight rollover; nonexistent Cairo times and cross-midnight appointments are rejected.
- Booking questions/notes are removed from the wizard. Identity stays inline; sessionStorage contains only selected service/date/time/time-of-save. Manual proof review is the configured payment path, not an implied card gateway.
- New booking email snapshots/leases use Workers Cron and Resend idempotency. No provider success is inferred from UI submission. Supabase Auth SMTP is configured separately.
- Small protected uploads cap at 50,000,000 bytes. Optional paid Stream uses TUS and a private signed player after entitlement/admission checks. It does not replace Storage for books/resources. Issued Stream tokens live up to four hours and cannot be revoked by the application mid-token; orphan/removed Stream videos require provider cleanup. No DRM claim.
- The approved learning direction becomes the fallback home and an explicit audited admin preset. Existing published CMS layouts are not overwritten by a migration; the owner applies the preset deliberately and prior sections remain recoverable. Published books/articles remain governed data, with honest empty states.
- Source release contains operational instructions, not credentials, build output, uploaded customer files or fabricated acceptance. Live Supabase migration rehearsal, multi-connection races, delivery, SMTP, domain and Worker acceptance remain external.

- Every sensitive-action reauthentication link now uses `/auth/admin/confirm`. The server resolves enrolled owner password entry versus staff MFA; old payment/role/export/restore links cannot accidentally demand MFA from the password-enrolled owner. External return destinations are rejected.


## 2026-10-12 — Free launch scope and transparent dependency mitigation
- HEBA_COST_MODE defaults to free; paid Stream cannot run without explicit allow-paid. deploy:free refuses paid video credentials and never upgrades provider plans. Existing provider subscription state is outside source verification.
- Keep Supabase/Workers/Resend rather than replacing the functioning backend. Free tiers limit CPU, storage, traffic and email; no unlimited video guarantee.
- 102 reserves email attempts atomically across booking/inbox (80 rolling 24h, 2400 UTC month), leaves Auth allowance, exposes only permissioned counters, and does not count Auth/other apps. One booking email per minute with stable idempotency and no PII logs.
- Do not overwrite published CMS content through migration: owner applies the existing versioned home preset explicitly; previous sections/revisions remain recoverable. Defaults use established professional identity without asserting ACC or fabricated years.
- Upgrade officially patched libraries, retain one pinned native pnpm braces mitigation because upstream has no fixed release, and preserve the raw advisory in the report. The audit gate verifies the installed patch and fails any other finding; no global ignored-advisory configuration.


## 2026-10-12 — Detailed readiness review and corrective delivery
- Separate source/browser validation from the different public-domain experience and from live commercial acceptance. No fabricated readiness percentage or guarantee of zero defects.
- Serialize video admission calls because they write an access cookie; guard mutations synchronously, keep unsaved notes by lesson in component memory, and preserve truthful uncertainty after a lost response.
- Runtime revision is a service-role-only RPC. Read it only after `system.view`, never via the public/user client, and leave backup/SMTP acceptance unknown rather than inferred from environment names.
- Use real available slots for booking readiness, normalize historic payment JSON before offering a method, and use exact counts rather than a 20-row sample. Recent system alerts explicitly mean the last 24 hours.
- Remove the redundant learning-journey block and reduce large burgundy surfaces within the selected direction. Use the approved photographic family for PageHero rather than older botanical illustrations.
- Preserve all migrations and production data. Financial charts use an explicit EGP scope and exact-count completeness guard; large-data aggregation/multiple currencies remain open. Finite free storage/egress does not support an unlimited long-video promise.


## 2026-10-13 — Customer refinement and admin availability

- Keep source-only delivery on the current provider stack. Do not create a second hosted Site or mutate live accounts to repair a local ZIP.
- Preserve the original logo bytes; fix containment and scale instead of recreating calligraphy. Treat the generated books still life as category decoration, never an actual product cover.
- Return every highest-scoring Start Here path. Preserve the legacy single-result helper for existing consumers, but the public quiz shows all ties and makes no diagnostic claim. Answers remain ephemeral.
- Resolve blank/whitespace modern keys to the legacy key through existing shared configuration boundaries. Browser components receive no server key, email or user identity from the new admin availability page; only booleans.
- Keep password owner enrollment, delegated roles, MFA, throttling, active sessions and sensitive-operation confirmation intact. Read-only diagnostics report missing prerequisites; they neither grant roles nor reset existing passwords.
- Publish no invented prices, credentials, policies, testimonials or live-readiness claims. Retain database-managed content as authoritative over fallback copy.


## 2026-10-13 — Meaningful atmosphere and motion

- Keep one coherent warm editorial brand; use Carbon's productive/expressive distinction for motion, Apple touch/usability guidance, and W3C/web.dev/MDN for accessibility and rendering behavior. No new animation dependency or paid service.
- Draw the ornament as native SVG, composited in one 5% group. Use filled road geometry and appropriate light/dark ink so it is perceptible without multiplying opacity or baking text into imagery.
- Motion is progressive: no-JS content stays readable, above-fold content is never hidden by the observer, tall sections use zero threshold, unsupported observers fail open, and focus/manual/system reduction reveals pending content. Respect preferences across public/auth/account/admin surfaces.
- The learning sample is a real local state interaction, not a simulated purchase or logged-in learner. No transmission, saved account note, fabricated completion metric or unprovided course claim. Preserve custom managed copy/destinations.
- Rotate testimonials only after explicit play; allow stopping and stop for focus/reduced motion. Never invent testimonials to populate the interaction.
- Author cross-engine/viewport acceptance separately. Build, source contracts and raster inspection of the native ornament do not certify browser or device rendering. No new browser screenshot was created or included.

- Package exactly the manifest inventory plus its manifest instead of recursively archiving staged directories. This resolves the observed tar directory-metadata race and prevents unhashed files entering the archive. Verify both ZIP and TGZ entry sets, sizes and SHA-256 values before delivery.
- The UX scanner must allow real CSS `::placeholder` styling, as its existing comment requires; continue rejecting placeholder content/naming. Do not remove useful field guidance to work around a scanner false positive.
- Exclude historical docs/evidence screenshot/video QA from release archives while preserving the originals in the working source. Public brand/content assets remain intact; old QA images must not be mistaken for current device acceptance.

## 2026-10-16 — Reference-led atmosphere and direct VS Code patch

- Follow the provided course-banner reference through an abstract profile, curved rising steps, an opening and gold curves. Keep the ornament as native SVG at 5%; remove the former circular/rayed motif from runtime references. Do not repaint the original logo, photographs or product covers.
- Remove the page-motion preference UI from every shell. Run motion automatically while respecting the device accessibility setting; clear only the retired heba-motion value. Theme and unrelated browser data are preserved.
- Bound pointer work to one hero and one animation frame, disable it on coarse/reduced-motion devices, and cancel frames/listeners on scroll, exit and unmount. Slow background light and finite transitions use transform/opacity without changing document layout.
- Deliver an auditable built-in Node/Git patch with exact-input checks, external backups and undo. Do not require another project ZIP, overwrite unrelated edits or insert authentication credentials into instructions.
- The connected remote main uses a materially different legacy schema. Source transfer is not database migration approval; review history and compatibility before real Admin/booking acceptance or schema changes.

## 2026-10-17 — Connected production reconciliation and launch

- Reconcile only reviewed missing 044–102 migrations after a real logical dump, isolated full restore/count verification, restored-data upgrade and live rollback rehearsal. Record manually applied 096 without replaying its DDL; restore its readiness definition after 056 in the same commit transaction.
- Keep owner password entry narrowly enrolled and session-bound; staff retain MFA. Use disposable identities and rollback-only fixtures for integration tests; hide the temporary persisted email fixture offering before its transaction commits.
- Load .env.local for launch commands, prevent Vite's dotenv-to-.dev.vars copy, and fail configured builds if actual server secret values appear anywhere in dist. Worker credentials remain runtime bindings.
- Allow the explicit booking callback destination and make Auth/customer/Admin responses and redirects private/no-store. Preserve the existing cream/teal/gold artwork, motion, managed content and lockfile.
- Keep free cost mode. Do not invent offerings, prices, policies or availability. The owner will supply approved operational content; technical deployment is distinct from opening public booking.

## 2026-10-17 — Production routing, provenance and responsive hero

- Resolve the observed old-site mismatch before changing design: GitHub/Vercel Production metadata identifies the old main deployment; new branch previews do not establish apex production. Publish the actual Git source/build metadata as a static well-known artifact on both hosts.
- Use explicit apex/www zone routes when Custom Domains rejects externally managed DNS. Back up and remove only the obsolete conflicting staging wildcard; preserve DNS and unrelated routes. Keep runtime secrets out of build assets and Git.
- Keep the intended desk photo and original brand assets. Reduce responsive title/copy spacing and photo height while retaining deliberate Arabic line chunks, cover cropping, palette, ornament and automatic motion. Check real viewport dimensions and stable screenshots; the sidebar width is not desktop acceptance. Confirm separately in full-screen Chrome.
- Preserve disposable-test audit records with null actor references when cleaning their Auth identities. Check cleanup errors rather than silently leaving a support account. Final live identity counts must match the preflight baseline.

## 2026-10-17 — Local owner password test input

- Load the security module from the running PowerShell host's PSHOME, not an inherited module search path. Keep existing Windows DPAPI ciphertext compatibility across console/dialog producers and the actual Node reader.
- Keep decrypted input in a captured local pipe and memory only. Do not include it in argv, environment, plaintext files, console output, process exception logs or Git. Remove ciphertext by default after reading and clear captured byte buffers.
- Distinguish input transport, actual Supabase password authentication and application session acceptance. A confirmed/enrolled owner account or successful encryption round-trip certifies neither login nor session creation. Retain staff MFA, throttling and permissions while diagnosing rejected credentials.
# 2026-10-17 — Admin schedule and publishing continuation

- Keep the single-coach GiST exclusion and add a shared transaction lock across reservation and schedule edits. Apply Cairo weekly hours to the complete occupied range, including buffers. Reject changes that invalidate active appointments/holds; never cancel them implicitly. Refresh occupied reservations when service/default buffers change.
- Preserve governed catalog/commerce actions and their permission/audit boundaries. Add bounded scheduled publication jobs with a recorded actor, due-time permission/completeness checks, explicit failed state and no entitlement removal on hide/archive. Use the existing free Worker cron; enable no paid video service.
- Separate offer activation from homepage placement. Default new offers to an inactive draft, retain real start/end dates and capacity, use the same checkout discount algorithm, and expose the existing per-coupon stacking rule accurately.
- Make media registration idempotent and atomic with its audit. Never remove an object after an ambiguous metadata-insert response. Keep file bytes/temporary signatures out of audit and Git.
- Owner approved two session prices (60 min/1200 EGP; 90 min/1800 EGP) and 30-minute start choices. Save initial descriptions/policies as hidden editable drafts rather than opening intake before cover/policy/payment review.

## 2026-10-17 — Managed prose pages and browser-discovered calendar relation

- Normal page editors use structured prose fields and preserve existing unknown content keys. Public custom-slug pages and private previews share escaped prose normalization; public readers explicitly exclude hidden sections even for an authenticated owner. Legal approval and token permissions remain authoritative.
- Booking customer names are resolved separately by user_id through the authenticated RLS client. Do not add a foreign key to auth-owned data merely to satisfy an invalid PostgREST embed. Fail closed on actual query errors and truncated calendar periods.
- Retain intentional full Auth-document navigation in fresh-assurance links. A lint rule triggered by the new dynamic public route is not a reason to alter authentication behavior.

# 2026-10-17 — Connect priced appointment requests and starter content

The owner explicitly requested public, integrated operation and authorized initial editable content. A service can now opt into reviewable appointment requests while retaining its real EGP price and existing payment_required classification. A request is pending, creates no financial order/payment, carries a price/currency snapshot, holds the shared calendar, and expires after 24 hours if unreviewed. Existing governed Admin confirmation/cancellation and booking mail snapshots remain authoritative; no staff MFA policy is relaxed. Free course/book checkout remains an actual entitlement-granting zero-total order and no longer depends on configured payout accounts. Initial learning content and original artwork are persisted through the same audited catalog/media/curriculum/article governance as later Admin edits. Do not invent bank details, testimonials, workshop dates or paid subscriptions to populate the public site.

