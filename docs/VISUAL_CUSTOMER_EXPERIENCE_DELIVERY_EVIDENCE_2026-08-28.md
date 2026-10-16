# VISUAL CUSTOMER EXPERIENCE DELIVERY — EVIDENCE

Date: 2026-08-28
Scope: public Preview only; no Supabase write, Production migration, DNS or nameserver change.

## Owner-reported defects and closure

| Reported defect | Implemented closure | Evidence |
|---|---|---|
| Hero text overlaps | The six CMS-controlled fragments now flow inside one balanced heading with a bounded fluid size and normal line height. A browser geometry assertion proves the heading ends before its lead begins. | `tests/preview/visual-polish.spec.ts` |
| Upper strip is misplaced | The separate utility strip was removed. The public header is now one compact, responsive layer with primary navigation, search, account, theme and booking. | Desktop/mobile After captures below |
| Unprofessional image labels/copy | The visible “صورة تعبيرية” and “لستِ مطالبة بمعرفة كل الإجابات” copy was removed. The portrait has a concise accessible alt and one factual value line. | Automated absence assertions |
| Flat backgrounds and missing images | A new original editorial image was generated and self-hosted. Internal PageHero, pathways, article/resource treatments and the final CTA now use varied editorial imagery, gradients, texture and depth. | Seven-route image-load contract |
| Dark mode does not change colors and opens first | A first visit now always starts light. Only an explicit saved choice starts dark. The switch changes computed page colors and persists after navigation. | Theme E2E contract |
| Admin cannot be reviewed | `/preview-admin` is an email-and-password-protected, noindex, read-only visual operations map with an HMAC-signed HttpOnly/SameSite=Strict session. It does not expose customer data or fake mutations. Real `/admin` remains behind Supabase, AAL2 MFA, RBAC and server authorization. | Admin credential/session E2E contract |

## Visual evidence

- Owner-annotated Before: `docs/evidence/visual-customer-experience/light-editorial-rebuild/before-owner-annotated.webp`
- Home After — 1440px: `docs/evidence/visual-customer-experience/light-editorial-rebuild/home-after-desktop-1440.png`
- Home After — 390px: `docs/evidence/visual-customer-experience/light-editorial-rebuild/home-after-mobile-390.png`
- Admin Preview After — 1440px: `docs/evidence/visual-customer-experience/light-editorial-rebuild/admin-preview-after-desktop-1440.png`

The new artwork is `public/images/experience/editorial-reflection-studio.webp` (1600px wide, 104 KB). It contains no competitor asset, logo, text, customer data or factual testimonial.

## Acceptance evidence

- TypeScript: passed.
- ESLint on every changed source/test boundary: passed.
- Next.js 16.2.10 Preview production build: passed; 70 routes generated/classified.
- Vinext/Cloudflare Worker Preview build: passed.
- Local visual/customer Preview E2E: 9/9 passed.
- Local Cloudflare Worker E2E: 9/9 passed.
- Public desktop/mobile regression suite: 68 passed in the phase run; the two reduced-motion cases initially referenced the removed legacy animation class. The assertion was corrected to the actual H1 boundary and both desktop/mobile cases then passed in the targeted rerun. No application behavior was changed between those results.
- `audit:security`, archive/source security, UX and color audits: passed.
- Mobile overflow at 390px: absent on Home, booking, course and the routed public checks.

### Wrangler local-runtime incident

The first Worker E2E run was interrupted after one passing test because Wrangler 4.126.0 terminated its local proxy with `Network connection lost`. The signature matches the open Cloudflare Workers SDK regression introduced after Wrangler 4.113.0. Local Worker testing is therefore pinned to 4.113.0 with its last supported compatibility date only inside the Playwright config; project build/deploy remain on the current project Wrangler. The repeated Worker run passed 9/9. This workaround does not alter the deployed Worker runtime.

## Security boundary

- The Preview Admin email, password and session signing key exist only as Cloudflare Preview secrets; no value is committed, logged or included in the build artifact. The live contract rejects an incorrect identity before accepting the owner-supplied credential pair.
- The Preview Admin surface is deliberately read-only. Adding non-persistent edit controls would violate the repository’s no-fake-admin rule.
- `/admin` remains the operational control plane and is not weakened by this Preview route.
- Production, DNS, Supabase, Resend and Sentry were not changed by this sprint.

## Deployment record

- Worker: `heba-elsherif-platform-public-preview`
- URL: `https://heba-elsherif-platform-public-preview.heba-elsherif-platform.workers.dev`
- Deployment version: `dd8a6fb4-2be9-41d6-81a5-7ed8f5b0d32a`.
- Remote acceptance: Live Preview E2E 9/9 passed. Home returned 200; four emitted JavaScript assets contained zero high-risk secret-pattern matches; source-map probes exposed zero maps; CSP, HSTS and frame denial are present; rejected copy is absent.
- Judgment: `PUBLIC PREVIEW ACCEPTED — SAFE FOR OWNER VISUAL REVIEW`.
