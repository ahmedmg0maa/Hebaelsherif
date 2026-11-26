# MOBILE QA REPORT — V1.7.0

## Method
Live browser pass (Chromium preview) in demo mode. Programmatic horizontal-overflow sweep
(`document.documentElement.scrollWidth > viewport`) across the route matrix at **375 / 768 / 1024 px**,
plus interactive checks (mobile nav, dashboard drawer) and accessibility-tree verification at 375px.

## Route matrix (all pass — no horizontal overflow at any width)
`/`, `/courses`, `/courses/[slug]`, `/books`, `/books/[slug]`, `/workshops`, `/workshops/[slug]`,
`/services`, `/booking`, `/articles`, `/articles/[slug]`, `/about`, `/start-here`, `/faq`, `/contact`,
`/auth/login`, `/auth/register`, `/checkout/course/[slug]`, `/dashboard`, `/dashboard/courses`,
`/dashboard/payments`, `/dashboard/courses/[slug]/learn`, `/admin/overview`, `/admin/payments`,
`/admin/orders`, `/admin/reports` — HTTP 200 everywhere, `scrollWidth == viewport` everywhere.

## What was fixed in this phase
1. **Dashboard/Admin sidebar is now responsive**: fixed right column ≥1024px; below that a deep-teal
   top bar (brand + hamburger) with an RTL slide-over drawer (end-anchored, backdrop dismiss,
   auto-close on navigate). Verified interactively: drawer opens with all 10 nav items and closes.
2. Shell padding tightened on small screens (`px-4` → `sm:px-6` → `lg:px-10`); shells switch
   `flex-col` → `lg:flex-row` so the mobile top bar stacks above content.

## Already-responsive behaviors verified
- Public header collapses to hamburger menu below `lg` with full nav + auth CTAs.
- All admin/customer tables wrap in `overflow-x-auto` containers (scroll inside the card, not the page).
- Checkout stepper hides step labels on narrow screens (dots + numbers remain).
- Hero, service cards, discovery grids, comparison panel, and footer all reflow via responsive grid columns.
- Tap targets: buttons/menu triggers are ≥ 44px (h-11 triggers, py-2.5+ buttons).

## Known limitations
- Visual spot-checks were performed at 375px (dashboard verified via accessibility tree + screenshot);
  a human pass on a physical device is still recommended before launch.
- Comparison panel uses a 3-column grid at all widths — readable at 375px but dense; revisit if
  real-device testing shows strain.

## Commands run
`pnpm check:deploy` — green after changes.
