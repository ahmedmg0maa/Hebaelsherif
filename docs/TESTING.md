# Testing and quality gates

## Cream and motion design slice — 2026-10-13

`corepack pnpm verify:motion-v3` runs 16 isolated actual-component handler, observer-fallback, artwork and contrast groups without a browser or provider credentials. It is not DOM-rendering or device acceptance. `corepack pnpm test:design-v3` is the separate cross-engine design suite; it requires an already-running review URL and available Playwright browser runtimes, and never starts a server itself. Simulated iPhone/Android/tablet projects do not certify physical hardware.

The 2026-10-13 review environment had no approved browser control, so its historical validation does not establish browser acceptance. The connected 2026-10-17 launch has browser control and explicitly tests the deployed Worker at phone, tablet and desktop widths; evidence is recorded in `LAUNCH_EXECUTION_2026-10-17.md`. Use available approved browser tools and keep source contracts, simulated viewport checks and physical-device acceptance distinct.

`corepack pnpm verify:auth-callback` executes the actual callback and proxy with isolated provider replies. It covers the booking confirmation return path, permitted dashboard/recovery destinations, external/Admin redirect denial, exchange failure and private/no-store Auth/account/Admin responses. `build:launch` additionally compares the actual configured server credentials against every generated `dist` file; credential values are never printed. `tests/sql/connected-launch-smoke.sql` exercises disposable booking fixtures and always ends in ROLLBACK; it sends no email.

## Fast checks during implementation

```powershell
pnpm type-check
pnpm lint
pnpm audit:security
pnpm verify:booking-local
pnpm verify:booking-permissions-local
pnpm verify:fresh-admin-assurance
pnpm audit:cms-local
pnpm verify:permissions
pnpm verify:admin-controls
pnpm verify:media
pnpm verify:commerce
pnpm verify:report-export-local
pnpm verify:home-cms-local
pnpm verify:public-search-local
pnpm verify:start-here-cms-local
pnpm verify:guided-assessment-local
pnpm verify:catalog-publication-local
pnpm verify:program-catalog-local
pnpm verify:media-lifecycle-local
pnpm verify:newsletter-governance-local
pnpm verify:admin-security-center-local
pnpm verify:admin-read-integrity-local
pnpm verify:revision-recovery-local
pnpm verify:admin-operations-ux-local
pnpm verify:contact-governance-local
pnpm verify:testimonial-governance-local
pnpm verify:press-governance-local
pnpm verify:resource-hub-local
pnpm verify:recovery-runner-local
```

`verify:permissions` proves that a disposable role-bearing AAL1 password session cannot invoke permissions or perform administrative writes; it deliberately uses the server secret only for the controlled role/mapping setup. Before release, perform the owner-only browser exercise for two independent TOTP enrollments, an AAL2 challenge, and access to an authorized admin page.

`verify:fresh-admin-assurance` is a no-network source contract for the high-impact step-up rule. It proves that the ten-minute AMR check remains in the server path for payment approval/rejection, refunds, role changes, and operational payment settings, and that `reauth=1` cannot auto-skip a pre-existing AAL2 session. Browser/session-token verification remains a controlled staging exercise.

The booking/CMS local checks never load `.env` or contact Supabase. They cover hold expiry/release, duplicate denial, cancellation/reschedule, Cairo DST, static least-privilege grants/revokes, fixed CMS section types, link validation, revisions and permission boundaries. They do not replace staging persistence/RLS tests.

`verify:report-export-local` proves the source contract for the fixed report datasets, POST/same-origin boundary, fresh-AAL2 step-up, dataset permission, date/row limits, CSV formula neutralization, private response, and fail-closed audit. `verify:home-cms-local` proves the typed homepage registry, structured Admin actions, required-section publication gate, revision/audit integration, safe internal links, public renderer, and preview parity. Both are credential-free source-contract checks; persistence and session behavior still require controlled Staging evidence.

`verify:public-search-local` covers Arabic normalization, published-only sources, bounded results, an accessible public entry and search-page `noindex`. `verify:start-here-cms-local` covers the governed page shell, safe internal links, revision/audit and the formal-assessment handoff. `verify:guided-assessment-local` executes the structured validator and asserts immutable published versions, public-pointer RLS, service-only atomic publish/delete, Admin question/option/result mapping, catalog-root allowlisting, progress/edit accessibility and the deliberate absence of answer persistence or network calls. `verify:catalog-publication-local` covers domain/product publication parity, 046 rights fail-closed behavior, course/book/workshop/service completeness and unavailable checkout denial. `verify:program-catalog-local` covers programme-type-only Admin writes, reset-to-draft edits, service-only atomic publication/composition, published child/plan/resource parity, free-resource checkout denial and the published-only public/search/services consumers. These do not claim Staging persistence, RLS, cron or authenticated browser evidence.

`verify:revision-recovery-local` proves that only page/page-section/article allowlisted fields can be restored, always to draft/hidden state, behind fresh AAL2, with a current-state checkpoint and audit rollback. `verify:admin-operations-ux-local` proves the booking saved view omits customer search/PII and the catalog checklist remains subordinate to server-authoritative publication. Both are source contracts; reload persistence and audit rows still require controlled Staging.

`verify:contact-governance-local` executes the real Contact normalization contract and asserts the source boundary: no anonymous/authenticated direct insert, service-role-only RPC execution, durable device/email throttling, explicit consent, PII-minimized submission/Admin audit and an Inbox consumer wired to the atomic permission-checked RPC. It makes no claim about provider persistence, RLS or distributed concurrency until controlled Staging tests run.

`verify:testimonial-governance-local` executes the real review normalization contract and asserts paid-order entitlement verification, separate text-publication/first-name consent, public RLS/query filters, an atomic permission-checked moderation RPC, privacy-minimized audit and both public/Home/Admin consumers. It does not relabel source inspection as live RLS or persistence evidence.

`verify:press-governance-local` executes the real Press input validator and asserts HTTPS/date/classification limits, the `press.manage` role mapping, service-only atomic CRUD, schedule job, 046 media-rights gate, metadata-only audit and public/Admin/Home consumers with preview. It cannot prove provider cron, RLS or Storage delivery until migration 050 is accepted on controlled Staging.

`verify:resource-hub-local` executes the real Resource input validator and covers incomplete-private versus complete-public state, article/media readiness, transcript/captions, 046 media rights, published related offers, `resources.manage`, service-only atomic CRUD/scheduling, content-free audit and public/detail/Admin/Home/search consumers. Live media playback, RLS and cron remain external Staging evidence.

`verify:media-lifecycle-local` asserts migration 054's soft archive/restore and compatible replacement contract, in-database permission recheck, atomic transfer of media usages and Press/Resource references, service-only grants, minimized audit and storage-object preservation. It also prevents regression to the nonexistent `deleted_at` publication query and proves pickers plus public Press/Resource consumers deny archived media. Provider RLS, Storage and concurrent replacement still require controlled Staging evidence.

`verify:newsletter-governance-local` executes the newsletter normalization contract and asserts explicit consent, approved-Privacy/configuration publication gating, browser-direct write revocation, service-only throttled intake, hashed unsubscribe tokens, read-only GET behavior, atomic permission/audit Admin lifecycle and the deliberate absence of Admin resubscribe. It does not claim provider persistence, distributed throttling or outbound-email evidence before controlled Staging.

`verify:admin-security-center-local` asserts that the Security Center cannot render hard-coded live success, cannot convert an unavailable session/event read into an empty result, and never selects request fingerprints or tokens. It verifies migration 056's `system.view` aggregate probes and `admin.access` own-session RPC, including current-session validation, service-only grants and atomic revocation/audit/security-event writes. Actual RLS, Storage, Auth and telemetry status remains unverified until the probe runs on authorized Staging.

`verify:admin-read-integrity-local` proves configured Admin query failures cross a sanitized error boundary, feature flags disable fail-closed, System preserves event/flag read state, and integration readiness examines only required variable names/pairs. It also checks `.env.example` remains value-free and the browser error boundary logs only an opaque digest. A configured badge is not live Resend/Sentry/Supabase evidence.

`verify:resend-outbox-local` proves migration 057's atomic operational-setting write, service-only outbox mutation, dual-permission claim/finalize lifecycle, row lease, bounded retries and privacy-minimized audit. It also asserts the Worker adapter uses the official Resend REST endpoint with a stable idempotency key, a bounded streamed response, timeout, plain text and allowlisted error taxonomy without logging credentials, recipient data or provider bodies. It does not send email; provider acceptance remains controlled Staging evidence.

`verify:customer-360-local` proves migration 058's `users.view`-checked, service-only and explicitly bounded customer directory/detail reads, privacy-minimized PII access audit, direct-write revocation and `users.manage` note/tag transactions. It rejects regression to interpolated PostgREST OR search, swallowed read errors, split mutation/audit, content-bearing audit metadata or fake lifecycle controls. Actual RLS, persisted access audits and concurrent tag behavior require controlled Staging.

`verify:recovery-runner-local` proves that recovery accepts only the Supabase Session pooler on port 5432 with the tenant-qualified Production user, routes the isolated target through the same pooler host, URL-encodes the hidden password, and clears process/unmanaged secret memory. It never opens a database connection. The actual drill is started manually with `powershell -ExecutionPolicy Bypass -File scripts/run-launch-recovery-drill-interactive.ps1` only after a disclosed password has been rotated.

`verify:delivery` requires migration 043. It uses disposable users and content to prove five concurrent book downloads are admitted while the sixth is rate-limited, only two recent devices are admitted, a newer video session revokes the prior session, browser roles cannot call admission RPCs, and workshop delivery/seat/attendance invariants still hold. Do not run it until the target project identity and migration history are confirmed.

`pnpm verify:delivery-local` requires no Supabase connection. It executes the finalization validation shared with the server action and covers accepted/rejected PDF magic bytes, observed MIME mismatch, validation-before-bind ordering, and raw-token/storage-path exclusions in delivery log schemas and upload audit metadata. The deferred live `verify:delivery` additionally removes entitlement and proves denial, validates real Storage range responses for good/bad magic bytes, and inspects persisted security rows; its success must not be claimed until actually run.

`pnpm verify:archive-security` builds disposable nested archives locally and proves that forbidden paths and secret-like content are detected recursively. `package:release` excludes source archives/dumps and then inspects the generated TGZ itself; `audit:security` repeats that archive-content gate.

## Phase boundary

```powershell
pnpm check:deploy
pnpm package:release
pnpm audit:security
```

Inspect `release/manifest.json`; the archive must not contain `.env`, `supabase/.temp`, `.next`, dependencies, test evidence, private reports, or credential-like values.

## Browser and functional QA

`pnpm test:e2e:cloudflare` first performs an isolated vinext build, then runs the same public desktop/mobile contract against local Wrangler with retries disabled. Interactive keyboard tests wait for a client-effect hydration marker rather than a fixed delay; this distinguishes rendered server HTML from an actually interactive Worker client.

- Verify desktop and 390px mobile layouts in Arabic RTL, light and dark themes.
- Test keyboard navigation, focus visibility, labels, errors, empty/loading/success states, and horizontal overflow.
- For each admin mutation, verify persistence after reload, permission denial for an unauthorized role, audit-log entry, and clear success/failure feedback.
- Commerce and booking tests must cover retries, duplicate submissions, stale state, overlapping slots, partial failures, and concurrent requests.
- `verify:commerce` exercises simultaneous checkout, proof submission, approval, rejection, and refund calls against disposable live data and proves single audit/access effects plus RPC isolation.
- Run authenticated Playwright projects only against controlled test data; never package reports or saved auth state.

## Privacy-safe Sentry monitoring contract

Run `pnpm verify:sentry-monitoring-local` whenever monitoring, Worker entry, instrumentation, dependency or isolated-build configuration changes. The executable verifier enforces matching pinned official Cloudflare/browser SDKs, the `withSentry` Worker wrapper, awaited Next server capture, optional browser initialization, disabled PII/tracing/log/breadcrumb defaults, an allowlisted event shape, and explicit shadowing of provider secrets during isolated commands. It also passes a deliberately sensitive synthetic event through the real scrubber and fails if customer email, request/token data, breadcrumbs, local variables, raw messages or non-allowlisted tags survive. This is local source/runtime evidence only; a controlled redacted Staging event and alert receipt are still required for provider acceptance.

## Governed Admin notification contract

`pnpm verify:admin-notifications-local` proves migration 059 rechecks `notifications.send` inside its service-only RPC, revokes direct browser delivery, validates the customer, bounds message content, allowlists kind/destination, serializes the request identity, and writes the notification plus content-free audit in one transaction. It also verifies that the Server Action cannot fall back to split table/audit writes and that both customer Admin surfaces render the bounded accessible control only after the real permission query. Database persistence, concurrent duplicate submission and customer RLS visibility still require controlled Staging.

## Atomic Admin role-governance contract

`pnpm verify:admin-role-governance-local` proves migration 060 makes the role matrix owner-only and auditable, narrows role/permission reads, revokes browser-direct mutations, and routes grant/revoke plus full permission replacement through owner-rechecked service-only transactions. It asserts self-role changes are denied, last-owner counting occurs after the shared transaction lock, delegated roles retain `admin.access` and cannot receive `roles.manage`, audit excludes email and full permission arrays, and the Admin page cannot render a partial/fake governance state. Fresh-MFA enforcement remains covered by `verify:fresh-admin-assurance`; concurrency, RLS and durable mutation evidence require controlled Staging.

## Atomic Admin booking and availability contract

`pnpm verify:booking-admin-governance-local` proves migration 061 replaces the 044 `auth.uid()`-derived Admin entry points with explicit-actor service-only transactions, rechecks `bookings.manage`/`availability.manage`, locks booking and availability targets, enforces the booking state machine and repeats slot validation under the advisory lock. It verifies that booking/reschedule/availability changes commit with customer notification where applicable and metadata-only event/audit evidence, customer-authored notes are immutable in Admin, duration comes from the service, invalid transitions are not offered, and no Server Action falls back to split direct table/audit writes. This source contract does not claim PostgreSQL execution: migration parsing/application, denial tests, duplicate/concurrent resolution, RLS and reload persistence require the controlled `STAGING EXTERNAL GATE`.

## Governed manual-payment and refund contract

`pnpm verify:commerce-admin-governance-local` proves migration 062 removes browser-direct commerce mutation grants, retires the older service-callable Admin entry points, and exposes explicit-actor transactions that recheck each action permission. It asserts that a payment can be approved only after the same administrator successfully requests and reviews the current customer/order-scoped proof, that queue data does not expose Storage paths, and that approval/rejection/cancellation couple state, notification, entitlement and metadata-only audit effects. It also verifies the truthful refund state machine: processing preserves access, completion requires an execution reference before entitlement revocation, failure restores paid state, and fresh MFA/action-specific permissions guard the UI and Server Actions. Source evidence does not claim provider execution; live SQL parsing, denial/RLS, concurrent retry, signed-URL, persistence and entitlement tests require the controlled `STAGING EXTERNAL GATE`.

## Governed checkout and payment-proof upload contract

`pnpm verify:checkout-upload-governance-local` proves migration 063 calculates price from governed product/variant/offer/coupon rows without a client price, checks public-domain readiness, uses a stable request UUID plus unique index/advisory lock, and rate-limits authenticated checkout attempts. It asserts that configured payment is required only for a positive total and that zero-total fulfillment reports the real paid state. The same verifier covers the private upload-intent ledger, actor/path authorization before privileged Storage access, direct signed upload rather than Worker buffering, exact MIME/size comparison, PNG/JPEG/WebP magic-byte detection, duplicate-proof serialization, rejected/superseded cleanup and retirement of the older browser-callable RPCs. Database compilation, RLS/denial, real Storage range responses, concurrent retries and durable customer visibility require the controlled `STAGING EXTERNAL GATE`.

## Atomic customer learning-state contract

`pnpm verify:customer-learning-governance-local` proves migration 064 revokes authenticated direct mutation of course progress, lesson progress and private notes, and replaces those paths with service-only enrollment-bound RPCs. It asserts per-customer/course serialization, idempotent lesson toggles, atomic aggregate recomputation plus metadata-only audit, content-bounded note create/update/delete, and the absence of note text from audit metadata. The verifier also requires course-scoped bounded reads, no curriculum/resource/note serialization before enrollment, fail-closed configured reads and UI state changes only after durable success. SQL compilation, RLS denial, concurrent calls and reload persistence require the controlled `STAGING EXTERNAL GATE`.

## Governed customer protected-delivery contract

`pnpm verify:customer-protected-delivery-local` proves migration 065 authorizes course resources, workshop resources and published workshop recordings only through a service-only enrollment/registration boundary. It requires slug binding, per-actor/item advisory serialization, explicit 24-hour mint limits, privacy-minimized admission evidence before operational path disclosure and no path/title/external URL in evidence. All three routes must send a hashed request fingerprint, fail closed, preserve 429 feedback, validate UUID/slug input, use HTTPS-only external resources and create only 60/90-second Signed URLs without logging provider data. SQL compilation, entitlement/RLS denial, concurrent counting and real Storage signatures require the controlled `STAGING EXTERNAL GATE`.

## Customer Dashboard read-integrity contract

`pnpm verify:customer-dashboard-read-integrity-local` proves configured authentication/query errors cross the shared customer error boundary rather than returning false empty states. It checks declared bounds on top-level and related reads, retirement of unbounded embedded curriculum/workshop/booking/order/payment relationships, HTTPS meeting URLs, internal-only notification destinations, complete order-state lookup and the authoritative pending-payment next action on `/dashboard`. It also verifies migration 066 contains exactly seven SELECT-only continuity policies for owned product/course/curriculum/book/workshop/service metadata and no business-data mutation. Live RLS, two-customer isolation, truncation behavior and reload persistence require the controlled `STAGING EXTERNAL GATE`.

## Atomic customer account-governance contract

`pnpm verify:customer-account-governance-local` proves migration 067 removes authenticated direct UPDATE access to profiles and notifications, then replaces those paths with service-only RPCs bound to the Server Action's verified user. It checks profile field normalization/bounds, per-customer serialization, idempotent outcomes, read-state ownership and metadata-only audit ordering. The verifier also rejects direct table writes in the account actions and requires matching form bounds plus accessible durable-result handling. SQL compilation, RLS denial, concurrent retry, persisted audit rows and reload behavior require the controlled `STAGING EXTERNAL GATE`.

## Governed customer password-lifecycle contract

`pnpm verify:customer-password-lifecycle-local` proves Dashboard changes pass `current_password` to the installed Supabase Auth contract, recovery completion requires the verified `recovery` AMR, both flows share bounded password/confirmation validation, and success closes all sessions before the customer logs in again. It also verifies the private SSR PKCE code exchange, fixed callback destinations, real recovery/update route, and migration 068's locked five-per-hour two-phase operation evidence without credential, token, email, network or device data. Provider email/code exchange, Auth redirect allowlists, session revocation and live PostgreSQL evidence require controlled Staging.

## Governed customer booking self-service contract

`pnpm verify:customer-booking-self-service-local` proves migration 069 retires browser-callable customer mutation RPCs and direct request/event writes, then enforces explicit ownership, row/advisory locks, current cancellation/reschedule policy, real slot validation, package-credit/order effects, idempotent pending requests and content-free event/audit ordering. It executes Cairo wall-time conversion across winter/daylight-saving offsets and rejects invalid dates. It also requires bounded accessible UI feedback and a UUID/ownership/error-validating private ICS response with tentative/confirmed status, escaping, UTF-8 octet folding and defensive headers. SQL execution, RLS denial, trigger/concurrency effects, persistence and import into real calendar clients remain controlled Staging evidence.

## Governed customer registration-bootstrap contract

`pnpm verify:customer-registration-bootstrap-local` proves migration 070 replaces the effective Auth trigger with a bounded, normalized, idempotent profile bootstrap, forward-safe row constraints and a metadata-minimized audit in the same trigger transaction. It rejects any Admin-role write or hardcoded owner identity in the effective function, requires execute revocation from browser roles, and verifies matching registration form bounds plus the fixed PKCE callback. Actual Auth trigger execution, confirmation delivery, historical constraint validation, rate limiting and persisted audit require controlled Staging.

## Governed account-deletion request contract

`pnpm verify:account-deletion-governance-local` proves migration 071 denies direct table writes and gives customers service-only, explicit-actor, serialized, rate-limited request/cancel/read operations. It verifies a permissioned and audited 200-row Admin queue, bounded review transitions, customer notifications, fresh-MFA approval/completion paths and the decisive no-fake-completion rule: the Auth foreign key must already be null before an execution reference can close the request. It also rejects review text/PII in audit metadata and requires truthful, accessible customer/Admin controls. Live Auth deletion, SQL/RLS/concurrency, notifications, retention policy and persisted completion evidence remain controlled external acceptance facts.

## Atomic protected-upload binding contract

`pnpm verify:protected-upload-binding-local` proves migration 072 revokes browser-direct protected learning-delivery writes and creates a private service-only intent before any signed upload. Issuance validates and atomically audits the actor/target/kind/path hash/MIME/size declaration; finalization must authorize that exact unexpired intent before privileged Storage inspection or removal. Successful binding places the learning mutation, intent finalization, inspection, delivery event and metadata-only audit in one transaction under repeated contract checks and a per-object lock. Direct upload failure, rejection/quarantine and old-object cleanup failures retain truthful evidence without raw paths. SQL compilation, rollback, denial/RLS, real Storage cleanup and persistence require controlled Staging.

## Atomic course-curriculum contract

`pnpm verify:course-curriculum-governance-local` proves migration 073 revokes browser-direct module/lesson mutation and makes create/update/delete service-only, explicit-actor, permission-rechecked and audit-atomic under a course lock. It requires lesson creation to set `video_path` to null, denies lesson deletion while protected resources, progress or notes exist, and denies module deletion while lessons remain. The verifier rejects split Server Action writes and raw-path form inputs, requires bounded fail-closed Admin reads and checks confirmation, matching field limits and accessible result states. SQL compilation, rollback, RLS denial, concurrency and reload persistence require controlled Staging.

## Governed protected-delivery removal contract

`pnpm verify:protected-delivery-removal-local` proves migration 074 preserves delivery and download history through attributable archival, rechecks `learning.manage`, serializes each binding, revokes lesson-video admissions and denies archived records through both customer RLS and Service Role admission functions. It verifies that Admin controls pass only opaque IDs with confirmation/accessibility, while the Server Action alone validates bucket, path syntax and SHA-256 authority before Storage removal. The post-commit cleanup result is recorded separately as removed, unmanaged or failed; only a hash enters audit/System reconciliation evidence. SQL compilation, rollback, concurrent admission/archive behavior, real Storage deletion and persisted evidence require controlled Staging.

## Atomic CMS page-section contract

`pnpm verify:home-cms-local` includes `verify:cms-page-sections-governance-local` and proves migration 075 revokes browser-direct section/revision mutation, repeats the action-specific permission in a service-only page-locked transaction, bounds the section registry and payload, preserves the prior row as a revision, and commits mutation plus metadata-only audit atomically. It also requires published-home `hero`, `pathways`, and `cta` continuity, immutable unique home kinds, Server Actions without split writes, and Admin controls with matching bounds, destructive confirmation, duplicate-submit protection, and accessible durable feedback. SQL execution/rollback, concurrent ordering, role denial, revision persistence, and Admin-to-public reload require controlled Staging.

## Atomic Navigation contract

`pnpm verify:navigation-governance-local` proves migration 076 denies browser-direct navigation writes, applies future-write label/path/order constraints, and makes create/update/delete one service-only, permission-rechecked, aggregate-locked mutation plus metadata-only audit. It requires bounded item count, fail-closed parent/child behavior, Server Actions without split writes, matching Admin limits/confirmation/accessibility, bounded Admin reload and the public visible-row consumer. SQL execution, legacy-row constraint compatibility, role denial, concurrent ordering and live header/footer reload require controlled Staging.

The 2026-08-28 navigation phase gate passed `pnpm check:deploy`, including the 69-page Next build, every local contract/audit and **70/70** public desktop/mobile tests. The isolated vinext/Workers artifact then passed the same **70/70** suite serially under `playwright.cloudflare.config.ts`; deployed Worker smoke/tail and provider-backed behavior remain separate acceptance evidence.

## Atomic CMS page-lifecycle contract

`pnpm verify:cms-page-lifecycle-local` proves migration 077 revokes browser-direct page writes, distinguishes `content.manage` from public-state `content.publish`, locks updates, bounds page count/copy/SEO/HTTPS URLs and commits prior revision, mutation and metadata-only audit atomically. It requires legal/Home readiness for immediate and scheduled publication, removes the generic publish bypass, proves Cairo wall-time conversion in winter and summer, and verifies the scheduler repeats readiness and audits each actual page/article publication. SQL execution/rollback, cron, legacy-row compatibility, role denial, concurrency and live public reload require controlled Staging.

The 2026-08-28 page-lifecycle phase gate passed `pnpm check:deploy`, including the 69-page Next build, every local contract/audit and **70/70** public desktop/mobile tests. The isolated vinext/Workers artifact then passed the same **70/70** suite serially; provider SQL/cron and deployed Worker smoke/tail remain separate acceptance evidence.

## Atomic article-lifecycle contract

`pnpm verify:article-lifecycle-local` proves migration 078 makes content, managed-cover usage, revision, lifecycle and audit one action-permissioned transaction. It requires rights-backed publication completeness, Cairo scheduling, scheduler revalidation, removal of the generic publish bypass, matching bounded Admin controls and history-preserving archival. SQL/RLS/concurrency/media/cron persistence require controlled Staging.

## Governed advanced-settings and flags contract

`pnpm verify:settings-flags-governance-local` proves migration 079 denies browser writes and arbitrary/typed/secret-like advanced keys, bounds JSON, privately checkpoints the previous setting and commits setting or existing-flag mutation with permission-rechecked audit. Live SQL/RLS/concurrency/persistence require controlled Staging.

The consolidated 2026-08-28 local release gate passed the 69-page Next build, every registered contract/audit and public E2E **70/70**. The isolated vinext/Workers artifact passed the same **70/70** suite serially. These results authorize a provider-unconfigured public preview, not provider SQL or Production readiness.

The 2026-08-28 phase gate passed `pnpm check:deploy` including the 69-page Next build and **70/70** public desktop/mobile tests. The same isolated Worker artifact passed **70/70** under `playwright.cloudflare.config.ts --workers=1`. A preceding two-worker run passed 42 tests before Wrangler 4.126.0 reported `Network connection lost`; the remaining failures were only `ERR_CONNECTION_REFUSED`. No source assertion failed, and the unchanged artifact completed serially. Treat this as transparent local Proxy stability evidence; a deployed Worker smoke/tail remains required before public acceptance.


## Master V2 continuation gate — 2026-09-05
`pnpm verify:master-v2-continuation-local` executes owner/credential validation, media reference/crop bounds, article ordering/duplicates and partial-report denial. SQL trigger/RPC/source checks are explicitly source contracts. Migrations 083–085, their rights/permission denial, asset replacement, revisions/audit rollback and report data reads require authorized Staging. The current cloud browser blocks the Vite RSC entry module; HTML rendering and test discovery do not satisfy E2E acceptance. See `MASTER_V2_VALIDATION_3.json`.


## Master V2 Admin workflows — 2026-09-06

`pnpm verify:master-v2-admin-workflows-local` executes the real request runner under overlapping calls, server denial, thrown exceptions and subsequent retry. It verifies sanitized lost-response feedback and Cairo roundtrips in winter/summer, then renders the actual shared form components with React SSR to validate unique field/help IDs, explicit ID preservation and label associations. It also checks editor integration and validation-before-write source contracts. It does not execute a browser, database, proof review or mutation on a provider.

Article/booking feedback assertions now follow their shared ActionFeedback implementation, preserving status-versus-alert checks. The catalog guidance assertion still checks media-rights enforcement in source without requiring migration numbers in user-facing copy.

Required external cases: open/close/Escape/focus-return and 200% zoom for editor dialogs; edit/save/reopen/reload; denied and ambiguous results; two tabs; payment proof expiry and approval; Cairo scheduling; actual audit/revision and rollback evidence. Final ledger is MASTER_V2_VALIDATION_4.json.

## Checkpoint 5 — atomic catalog runtime test

`pnpm verify:catalog-atomic-local` executes the actual form validator (bounds, strict numbers, Cairo dates, IDs, URL scheme, file-field rejection) and asserts the single-RPC server boundary. It is in the default deployment checks.

`pnpm verify:catalog-sql-local` requires separate test tooling: install `@electric-sql/pglite@0.5.8` in a disposable tooling directory and set `HEBA_TEST_PGLITE_PATH` to its absolute `node_modules/@electric-sql/pglite/dist/index.js`. Run from the project root. It fails clearly if the engine path is missing; no success/skip is fabricated and no credentials or network database are loaded.

The SQL runner extracts real core table DDL and relevant additive columns, creates minimal synthetic history/permission fixtures, and executes the actual migration 086 in memory. It tests all four drafts, invalid input/permissions, incomplete and complete publication, rights, media preservation, duplicate slug, reserved seats, customer/delivery deletion guards, failure of audit after mutation, and revoked browser-role RPC/direct-write grants. Snapshot equality verifies product/domain/media/revision/audit rollback. PGlite has one exclusive connection; this does not exercise simultaneous PostgreSQL sessions, Supabase JWT/AAL2/RLS, all historical triggers, Storage or the real migration chain.

Curriculum and Inbox use shared feedback; source contracts track that controller instead of requiring obsolete inline strings. Keyboard, modal focus, clipboard permissions and mobile/dark browser QA remain separate gates.

## Checkpoint 6 — commerce administration and operating controls

`pnpm verify:commerce-administration-local` executes the actual strict editor normalization and checks single-RPC boundaries. It is part of check:deploy.

`pnpm verify:commerce-administration-sql-local` uses the same external PGlite 0.5.8 tooling and HEBA_TEST_PGLITE_PATH as Checkpoint 5. It executes actual local 087–089 SQL over extracted core schema plus minimal synthetic dependency/permission/history fixtures, not the full Supabase chain. It tests programme/variant/plan/marketing actions, limits, subscription contracts, archive/restore/delete, effective grants, closed intake and injected audit-failure rollback. Quote capacity tests stub product readiness only; Checkpoint 5 owns its publication tests. The single connection does not prove concurrent reservation or JWT/RLS/provider acceptance.

Required external tests: apply 080–089 to a restored isolated Staging copy; legacy-category and existing plan snapshot backfill review; DB-overridden staff permissions/navigation; owner MFA and last-owner denial; two concurrent offer reservations and intake-close races; pending plan orders and payment fulfillment; existing customer access while site closed; mobile/keyboard/RTL/dark editor flows and full browser/provider suite. No live messages, payments, migrations or deployments are performed by these local tests.

## Checkpoint 7 — reviews, notifications and protected cleanup

`pnpm verify:phase7-workflows-local` runs the real server actions with injected dependencies: lost binding responses, same-intent recovery, observation failure, cancellation, permission/size/path denial, claimed-path verification, provider removal exceptions, atomic archival and notification receipt/definite-denial handling. It also checks the shared accessible editor integration. It is included in `check:deploy`; no provider is contacted.

`pnpm verify:phase7-sql-local` uses `HEBA_TEST_PGLITE_PATH` as described for Checkpoint 5. It executes actual 090/091, 059/072 and the governed archive function over extracted core DDL and synthetic permissions/history. PostgreSQL's built-in SHA-256 backs the fixture extensions.digest adapter. It checks review versioning/consent/reply preservation/archive/delete, notification collision/retry/history, all five upload kinds, cancellation after binding, audit failure rollback, replacement/admission revocation, stale video removal, shared paths, cleanup leases/fencing/retries, legacy retention and expiry. No credentials or live database are loaded.

Old source contracts were updated to follow the new single RPC, shared ActionFeedback, explicit confirmation and durable cleanup queue. They no longer require unsafe inline Storage deletion. The retired deleteReview boundary is absent; catalog publication tests end at the next current action rather than an obsolete function name.

Required external acceptance: restore an isolated Staging copy; apply the full pending migration chain through 091, including backfill review; test actual AAL2/permission denial, customer RLS/read receipts, two-tab moderation, concurrent video uploads/removal, duplicate notification requests with interrupted responses, shared-object cleanup, late uploads after token expiry, provider removal/recording failures, optional scanner unavailable/quarantine, oversized and mislabeled files, and all five delivery formats. Verify live upload limits, large-video network behavior and actual signed-token TTL before using physical cleanup. Test RTL/mobile/dark mode, dialogs, focus return, keyboard controls, history pagination and feedback in the browser. No full check:deploy/browser/provider success is claimed by local checkpoints.


## Checkpoint 8 customer journey gates

- `corepack pnpm verify:phase8-workflows-local`: 13 groups executing actual server actions, direct-upload controller and Cairo calendar with injected external responses. Covers lost responses, preserved objects/intent identity, overlap, definitive rejection, free/paid/closed state parsing and civil-date/DST boundaries.
- `HEBA_TEST_PGLITE_PATH=/absolute/path/to/@electric-sql/pglite/dist/index.js corepack pnpm verify:phase8-sql-local`: 18 groups using separately installed PGlite 0.5.8. Runs real 092–093, actual 063 proof/checkout contracts and extracted legacy functions/tables. Permission context/history are synthetic and only one database connection is used. No full Supabase migration, concurrency, RLS or provider acceptance is implied.
- SQL cases: hold reuse without extension, other-user denial, expired replay, fingerprint conflict, audit rollback, free booking, proof replay, review/cancel rules, governed approval, cancelled booking refusal, package consume/reverse once, coupon identity, bundle preservation, exact subscription binding, refund/access preservation, zero-total confirmation and future package booking refund guard.
- Required external follow-up: full 000–093 rehearsal and recovery; simultaneous hold/approval/cancel/refund operations; real Auth/RLS/MFA; direct Storage upload/lost response/expiry/terminal cleanup; refreshed/two-tab account recovery; desktop/mobile RTL, keyboard/screen reader, visual references, WCAG and real Core Web Vitals. Chromium setup timed out in this execution environment, so browser acceptance is open.
- Do not run provider-facing `verify:commerce`, booking-credit, database or deployment scripts without their authorized Staging context. The local tests create no real payment, email, notification, account grant or protected file.

## Original phases 9–11 (2026-09-22)

`pnpm verify:phases9-11-workflows-local` executes order/subscription state logic, Arabic navigation filtering, actual account readers and lifecycle action guards with injected provider responses. It covers ownership/absence/failure, exact count semantics, currency and frozen archive version. It is included in `check:deploy`.

`HEBA_TEST_PGLITE_PATH=/absolute/path/to/pglite/dist/index.js pnpm verify:phases9-11-sql-local` executes actual 094/095 SQL in synthetic fixtures: 19 groups. `HEBA_TEST_ACCOUNT_CATALOG=1` adds 094/095 to `scripts/verify-phase8-sql-local.mjs` so its 18 customer-journey groups run against the new additions as well. PGlite is a separate test tool, not an application dependency. These tests do not claim full migrations, Supabase Auth/RLS, provider Storage or multi-connection concurrency.

See MASTER_V2_PHASES_9_11_AR.md for the content lifecycle matrix and mandatory Staging/browser scenarios; MASTER_V2_VALIDATION_9_11.json records the actual run results and limitations.


## Unified launch — 2026-09-23

- `verify:launch-sql` uses the same isolated PGlite tooling path as previous SQL runners. Actual 096–101 over synthetic dependencies: 16 groups, including global overlap/buffers, hold conversion, bounded calendar iteration, owner/session/role denial, pre-auth attempt limits, email leases, Stream binding, long admission revocation, and preserved home revisions. Single connection, not live Supabase or full migration-chain acceptance. The readiness function from 096 is not executed in this fixture.
- `verify:launch-adapters`: actual TUS uploader, booking-mail worker and production config validator with injected network replies. No live mail or video request.
- `verify:launch-browser`: actual built Next app, 1440/390, homepage/tour, owner password-only UI and complete provider-free booking simulation. Set HEBA_TEST_CHROMIUM_PATH only when an external Chromium executable is required. Run after the Next build and do not rebuild `.next` while its server is running.
- Public Playwright suite still covers all public routes, keyboard, theme, empty states, contact/assessment, and protected route redirects. It now tests the selected home tour instead of assuming an optional quiz is installed on the homepage.
- Staff AAL1 denial remains required. Enrolled owner password access is an explicit approved exception, tested with password AMR plus an active matching admin session. Sensitive owner actions require fresh password confirmation; staff still require fresh MFA. Historical TOTP-only wording above describes the prior checkpoints, not the new owner entry flow.
- External acceptance: exact deployed artifact; missing 000–101 migration chain rehearsal; two independent PostgreSQL sessions racing services/holds; actual owner login/recovery and staff denial; SMTP confirmation; proof upload/review; one correct booking email; optional Stream upload/resume/processing/seek/entitlement denial; content operations followed by reload. Never treat local fixture success as this acceptance.


## 2026-10-12 free launch additions
- corepack pnpm verify:launch-adapters — real adapter/config functions with injected provider responses.
- corepack pnpm verify:free-launch-sql — actual 098/102 plus legacy 057 claim on isolated single-connection PGlite fixtures; HEBA_TEST_PGLITE_PATH points to separately installed test tooling.
- corepack pnpm verify:booking-identity — actual component browser test with injected Auth; HEBA_TEST_CHROMIUM_PATH optional.
- corepack pnpm verify:free-worker — compiled local workerd headers/guard/tour at desktop/mobile; no live Free CPU guarantee.
- corepack pnpm verify:braces-guard and audit:dependencies — installed native patch verification and transparent one-advisory mitigation gate. Ordinary pnpm audit still reports braces.
- prepare:video was exercised with single-part and >300-second two-part synthetic MP4; no real lesson uploaded.


## 2026-10-12 corrective review checks
`pnpm verify:review` runs actual readiness/payment normalization, exact overview-count and incomplete aggregate behavior, and the real LearnClient browser harness. Install ordinary Playwright Chromium first; HEBA_TEST_CHROMIUM_PATH is an optional test-runner executable override, not a deployment setting. Replies/frames are injected: these tests do not accept live RLS, persistence, delivery, email or payment. Re-run this bounded gate when editing these workflows, alongside the appropriate existing source/build gates. Detailed scope: docs/REVIEW_VALIDATION_2026-10-12.json.
