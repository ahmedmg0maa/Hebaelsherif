# VISUAL CUSTOMER EXPERIENCE — INTERACTIVE PREVIEW DELIVERY

Date: 2026-08-28
Scope: public customer Preview only; no Production, DNS, Supabase, payment, email or customer-data write.

## Delivered experience

### Visual identity and motion

- The existing Arabic/RTL identity and labelled niqabi focal illustration remain intact.
- The Home journey now uses cinematic contrast, layered gradients, original editorial artwork, ambient light/orb movement, entrance reveals and interactive surfaces instead of a flat background.
- Motion uses `transform` and `opacity`; `prefers-reduced-motion: reduce` disables the decorative animation while retaining all content and actions.
- Desktop, tablet and 390 px layouts retain readable Arabic typography without horizontal clipping.

### Complete customer demonstrations

| Journey | URL | What can be reviewed | Persistence truth |
| --- | --- | --- | --- |
| Home | `/` | animated identity, primary path, Preview spotlight and original artwork | read-only Preview |
| Booking | `/booking` | service, date, time, details, review, simulated hold, manual proof and receipt | no booking/order/payment/upload is created |
| Course | `/courses/preview-clarity-journey` | three modules, nine complete authored lessons, exercises, reflection and progress | browser-session progress only; no entitlement |
| Book | `/books/preview-listen-inward` | five authored chapters, contents, font size and reading modes | browser-session position only; no purchase/download |

The fixtures are fictional and visibly labelled as Preview material. They activate only when the deployment environment is explicitly `preview` and Supabase public configuration is absent. If Supabase is configured, the fixture path fails closed and the application returns to the real governed provider path.

## Original visual assets

| Project path | Purpose | Optimized size |
| --- | --- | ---: |
| `public/images/experience/journey-landscape.webp` | layered teal/gold customer-journey landscape | 176,574 bytes |
| `public/images/experience/course-clarity-journey.webp` | editorial course cover/path composition | 245,162 bytes |
| `public/images/experience/book-listen-inward.webp` | introspective journal/pool book artwork | 125,906 bytes |

Image-generation direction: original editorial scenes in the project teal/aqua/warm-gold palette, modest feminine silhouette, no face detail, no text, no logos, no competitor assets. The wide landscape uses layered botanical/topographic depth; the course uses a luminous path and reflection motifs; the book uses an inward-looking journal and water-light composition.

## Visual evidence

- `docs/evidence/visual-customer-experience/experience-sprint/home-experience-desktop-1440.png`
- `docs/evidence/visual-customer-experience/experience-sprint/home-experience-mobile-390.png`
- `docs/evidence/visual-customer-experience/experience-sprint/course-experience-desktop-1440.png`
- `docs/evidence/visual-customer-experience/experience-sprint/course-experience-mobile-390.png`
- `docs/evidence/visual-customer-experience/experience-sprint/book-reader-desktop-1440.png`
- `docs/evidence/visual-customer-experience/experience-sprint/booking-preview-complete-desktop-1440.png`

## Acceptance evidence

| Gate | Result |
| --- | --- |
| TypeScript and ESLint | passed |
| Next production build | 69 application pages passed |
| Preview source/security contract | 13/13 passed |
| Interactive local Preview | 5/5 passed |
| Interactive Cloudflare Preview runtime | 5/5 passed |
| Interactive deployed Preview | 5/5 passed on the public Worker URL |
| Standard public browser suite | 68/70 passed before the legacy motion selector correction; corrected Desktop/Mobile contract then passed 2/2 |
| Complete isolated Cloudflare/Vinext public suite | 70/70 passed |
| Route, UX, color and security audits | passed |
| Admin, media, commerce, catalog, booking, database and launch audits | passed |

The Worker dry run contains 148 static assets and 400 attached modules. Its compressed upload is approximately 727 KiB, below the Workers Free compressed-script limit documented in `docs/research/report-source.md`. The generated artwork is far below the per-asset limit.

## Admin and provider truth

Preview fixtures are intentionally not exposed through fake Admin controls. The existing real Admin surfaces remain permission-checked, persisted and audited, but reviewing their mutations requires the isolated Supabase Staging gate and applicable source-only migrations. The public Preview proves presentation and customer interaction only; it does not prove Auth, RLS, persisted booking, payment approval, entitlement, private delivery, Resend or Sentry.

## Release judgment

`PUBLIC INTERACTIVE PREVIEW — LIVE AND ACCEPTED`

This judgment does not mean `STAGING ACCEPTED`, `PRODUCTION READY` or `PRODUCTION LIVE — ACCEPTING CUSTOMERS`. Those judgments still require the external Staging recovery/provider/migration acceptance and later explicit Production/DNS authorization.

## Live deployment evidence

- Source commit: `a2bed6292c00cc399739fe1f09eba1f2ec354e50`
- Worker: `heba-elsherif-platform-public-preview`
- URL: `https://heba-elsherif-platform-public-preview.heba-elsherif-platform.workers.dev`
- Version: `589b48ac-d5d7-445d-89d7-71a313e7c46d`
- Interactive suite: **5/5 passed** against the deployed URL.
- Route smoke: **16/16** Home, public and Preview detail routes returned `200`.
- Headers: CSP, HSTS, frame denial, MIME sniffing denial and referrer policy are present.
- Client exposure scan: HTML plus four emitted JavaScript assets contained **0** high-risk secret/connection patterns; a source-map probe returned `404`.
- Runtime observation: an error-only Worker tail remained empty while Home, Booking, Course and Book requests each returned `200`.

During local Worker acceptance, the brand image initially used the runtime image-optimization redirect. Local HTTP plus the production CSP upgraded that redirect to HTTPS and left the image broken in the emulator. The canonical logo now bypasses that redirect and is served directly as a static Cloudflare asset; the corrected Worker and deployed Preview both pass the explicit loaded-image assertion.
