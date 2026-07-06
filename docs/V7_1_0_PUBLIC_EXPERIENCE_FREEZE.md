# V7.1.0 Public Experience Freeze

Current completed version: **7.1.0**  
Next version target after this checkpoint: **7.1.1**

This release is intentionally **not** a version-only bump. It is a public experience freeze and verification gate before moving into the learner dashboard and LMS patch series.

## Public Route QA

| Route | Required behavior | Status |
|---|---|---|
| `/` | Premium homepage, no placeholders, CTA paths visible | Verified by route audit |
| `/about` | Brand/about page exists | Verified by route audit |
| `/start-here` | Guided start route exists | Verified by route audit |
| `/services` | Session/services discovery exists | Verified by route audit |
| `/booking` | Booking route exists | Verified by route audit |
| `/books` | Books discovery exists | Verified by route audit |
| `/courses` | Polished waitlist/discovery route, no fake active products | Verified by route audit |
| `/workshops` | Workshops route exists | Verified by route audit |
| `/articles` | Articles index exists | Verified by route audit |
| `/contact` | Contact route exists | Verified by route audit |
| `/faq` | FAQ route exists | Verified by route audit |
| `/privacy` | Privacy route exists | Verified by route audit |
| `/terms` | Terms route exists | Verified by route audit |
| `/refund` | Refund route exists | Verified by route audit |
| `/disclaimer` | Disclaimer route exists | Verified by route audit |
| `/auth/login` | Login route exists | Verified by route audit |
| `/auth/register` | Register route exists | Verified by route audit |
| `/dashboard` | Protected route with premium login-required state | Verified by route audit + layout behavior |
| `/admin` | Protected/admin shell route exists | Verified by route audit |
| `/not-found` | Not-found component exists | Verified by route audit |

## Manual Screenshot QA Checklist

Use Vercel Preview or local `pnpm dev` and capture desktop + mobile screenshots for:

- Homepage hero and footer.
- Courses/waitlist page.
- Books discovery.
- Booking flow entry.
- Login/register pages.
- Dashboard unauthenticated state.
- Admin entry/protected state.
- 404 page.

## Mobile QA Checklist

- Header: no overlap, nav usable, CTA visible.
- Footer: columns collapse correctly.
- Hero: portrait/card sections do not crop badly.
- CTA buttons: full width or tappable.
- Cards: no overflow.
- Courses waitlist: still premium, no active fake products.
- Dashboard login-required state: readable and centered.
- Forms: inputs readable and tappable.
- Spacing: no cramped sections.
- Typography: Arabic remains legible.

## Visual QA Against Targets

- Homepage follows V7.0.1 target direction: split hero, ivory base, teal CTA, burgundy emphasis, gold details.
- Product/discovery surfaces follow V7.0.2 direction: category structure, benefits/comparison, offer banner.
- Color distribution follows textile reference: ivory majority, sand/taupe layers, teal anchors, burgundy/blue accents only.
- No excessive decoration behind important text.
- No random colors outside design tokens.
- No placeholder production text.

## Vercel Preview Readiness

- `packageManager` uses pnpm.
- `vercel.json` uses Corepack + pnpm frozen install.
- `package-lock.json` must not exist.
- `.env.example` documents Supabase variables.
- Build gate must be green before deploy.

## Supabase Staging Checklist

- Run migrations on staging before production:

```bash
supabase db push
```

- Verify migrations 0003 and 0009 do not reintroduce previous bugs.
- Confirm storage buckets are documented in `SUPABASE_SETUP.md` and `SUPABASE_MIGRATIONS.md`.
- Confirm RLS policies protect bookings, orders, content access, payment proofs, and admin-only data.

## Gate

Required before leaving V7.1.0:

```bash
pnpm install --frozen-lockfile
pnpm run check:deploy
```

If local pnpm is unavailable in the execution environment, run the individual npm script equivalents for type-check, lint, build, and audits, and document the limitation honestly.
