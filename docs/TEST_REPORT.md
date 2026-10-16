# TEST REPORT — V2.5.0

## Automated (every build, `pnpm check:deploy`)
| Check | Result |
|---|---|
| `tsc --noEmit` (strict) | ✅ |
| ESLint (incl. React compiler purity rules) | ✅ |
| `next build` (Turbopack) | ✅ |
| audit:routes — all 56 §5 routes exist | ✅ |
| audit:ux — no placeholders/TODO/lorem/weak coming-soon | ✅ |
| audit:colors — brand tokens only | ✅ |
| audit:security — no service key in client, no tracked .env, no JWT literals, no package-lock | ✅ |
| audit:admin — role gate present in admin tree | ✅ |
| audit:db — migration naming/order | ✅ |
| audit:launch — required files present | ✅ |
| `pnpm install --frozen-lockfile` | ✅ |

## Live integration tests (against the real Supabase project, 2026-07-10)
| Test | Result |
|---|---|
| Auth health + REST reachability | ✅ |
| All 19 migrations applied via CLI (000–018) | ✅ |
| Atomic booking/order RPC + GiST overlap guard applied live | ✅ |
| Durable PostgreSQL rate limiter RPC/table applied live | ✅ |
| `pnpm verify:booking`: real authenticated RPC → linked order/booking + durable limiter + complete cleanup | ✅ |
| Storage: 7 buckets exist with correct visibility | ✅ |
| `handle_new_user` trigger creates profile on signup | ✅ |
| RLS: user inserts valid order (totals consistent) | ✅ |
| RLS: tampered order total rejected (42501) | ✅ (migration 012) |
| RLS: coupons invisible to customers | ✅ |
| Real data ported: 2 sessions (١٬٢٠٠/١٬٥٠٠ ج.م) on /booking + checkout | ✅ |
| Unconfigured bank method hidden at checkout | ✅ |
| Empty catalog → honest empty states (no demo leakage) | ✅ |
| pg_cron `expire-stale-orders` scheduled hourly | ✅ |
| Test user + order cleaned up after validation | ✅ |

## Browser verification
- Desktop (1440px) + mobile (375px) passes on home, courses, dashboard, learn player, admin overview.
- Mobile drawer, testimonial carousel, countdown, accordions verified interactively.
- Overflow sweep: 26 routes × {375, 768, 1024} → zero horizontal overflow.
- Playwright: 31 passed, 3 intentional skips across desktop/mobile; covers 9 public routes, encoding, dark persistence, five-step booking, auth chrome isolation, anonymous guards, mobile overflow, password-only admin login, live admin availability, and learner workspace. Temporary QA users are deleted in teardown.
- In-app browser composition QA: 1440px + 390px, light + dark, homepage, booking, admin availability, learner shell, and generated no-person asset.

## Not covered (post-launch recommendations)
- Human pass on physical devices and screen readers recommended.
- Payment approval flow tested at API/RLS level; full human walkthrough (real receipt image → approve → access) is a launch-checklist item in DEPLOYMENT.md.
