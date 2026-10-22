# Cream and motion refinement — 2026-10-13

راجعي [تقرير التصميم والحركة](HEBA_CREAM_MOTION_REVIEW_2026-10-13_AR.md) أولًا. طريقة الفتح والإدارة في START_REVIEWED_AR.md. هذا التسليم يطوّر الخلفية والتفاعل وتجربة النموذج العملي، ولا يحدّث الدومين المنشور تلقائيًا.

---

# Latest refinement — 2026-10-13

ابدئي بـ [دليل فتح النسخة ودخول الإدارة](START_REVIEWED_AR.md)، ثم [مراجعة جميع الصفحات من منظور الزائرة](HEBA_CUSTOMER_REVIEW_2026-10-13_AR.md). دليل التشغيل الكامل السابق في START_HERE_AR.md ما زال يخص إعداد الخدمات والنشر؛ هذا التسليم لا يغيّر الموقع المنشور تلقائيًا.

---

# منصة هبة الشريف — Heba ElSherif Platform

**نسخة التشغيل المجاني 12 أكتوبر 2026:** ابدئي من [START_HERE_AR.md](START_HERE_AR.md) للإعداد والنشر والإدارة. هذه التعليمات تتقدم على تعليمات المراحل القديمة أدناه.


Premium Arabic-first learning platform: public site, customer dashboard, LMS course player, protected digital content, unified checkout with manual payment-proof review, and a full Admin OS.

## Stack

- **Next.js 16** (App Router, RTL root) · **TypeScript** strict · **Tailwind CSS v4** (CSS-first `@theme`)
- **Supabase** — Postgres + RLS, Auth (SSR cookies), Storage (signed URLs for all protected content)
- **pnpm 10.13.1** (pinned via Corepack) · Node **24** · Cloudflare Workers-ready

## Quick start

```bash
corepack enable && corepack prepare pnpm@10.13.1 --activate
pnpm install --frozen-lockfile
cp .env.example .env   # fill from your Supabase project

```

Without Supabase credentials the site runs in **demo mode**: public pages show editorial fallback content, dashboards show empty states, and ordering is disabled with a clear message.

## Environment

See [.env.example](.env.example). `SUPABASE_SERVICE_ROLE_KEY` is server-only — it must never be prefixed with `NEXT_PUBLIC_`.

## Database

Ordered SQL migrations live in `supabase/migrations/` (001 → 010: helpers, users/auth, commerce, LMS, books, booking, workshops, CMS, reports, storage). Setup steps: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Demo seed: `SEED_DEMO=true DATABASE_URL=... pnpm db:seed` (guarded — refuses production).

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js lifecycle |
| `pnpm type-check` / `pnpm lint` | TS + ESLint |
| `pnpm audit:routes` | every route in `scripts/expected-routes.json` exists |
| `pnpm audit:ux` | no placeholders / TODO / lorem / weak coming-soon |
| `pnpm audit:colors` | brand tokens only — no generic Tailwind palette |
| `pnpm audit:security` | no service key in client code, no tracked .env, no package-lock |
| `pnpm audit:admin` | admin tree has a role gate |
| `pnpm audit:db` | migration naming/order sanity |
| `pnpm audit:launch` | required files present |
| `pnpm check:deploy` | type-check + lint + build + all audits (phase gate) |

## Project docs

- [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) — full product spec (do not edit)
- [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) — single source of truth for progress
- [docs/DECISIONS.md](docs/DECISIONS.md) — technical decision log
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — open items with severity
- [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) — backend setup

## Deployment (Cloudflare Workers)

The final hosting path is GitHub Free → Cloudflare Workers Free through vinext; Cloudflare provides DNS/CDN while Supabase remains the database, Auth and Storage provider. Namecheap is the registrar only. Set variables only in Cloudflare Worker/Build Secrets, never in the repository. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/CLOUDFLARE_DEPLOYMENT.md](docs/CLOUDFLARE_DEPLOYMENT.md), and the gated [launch closure](docs/PRODUCTION_LAUNCH_CLOSURE_2026-08-26.md).
