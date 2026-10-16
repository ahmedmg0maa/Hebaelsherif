# Visual customer experience research source

Date: 2026-08-28
Scope: the public customer journey, booking, course preview, book preview, motion, accessibility, and Cloudflare/Supabase delivery constraints.

## Decision summary

The current application already has real database-backed booking, commerce, learning, protected delivery, Admin governance, and customer dashboards. The safest way to make the public preview fully reviewable without misrepresenting provider readiness is to add a strictly labelled, non-persistent preview experience that is available only when an explicit preview flag is enabled and Supabase is not configured. Production and Staging continue to use the existing governed paths.

The visual system should use layered gradients, original editorial artwork, subtle texture, entrance reveals, ambient movement, and interactive feedback. Motion must remain optional and should primarily animate `transform` and `opacity`, not layout properties.

## Evidence and resulting requirements

| Evidence | Product requirement |
| --- | --- |
| WCAG 2.2 requires information entered earlier in a multi-step process to be reused instead of requested again. [W3C — Redundant Entry](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) | The booking review step must carry forward service, date, time, name, and phone, and let the customer return to edit without losing them. |
| Repeated help must stay in a predictable place, and repeated actions must be identified consistently. [W3C — WCAG 2.2 additions](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) and [W3C — Consistent Identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification) | Keep the same labels for Continue, Back, booking support, purchase status, and account entry throughout the journey. |
| Labels and format instructions reduce failed form submissions. [W3C — Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions) | Every required field and upload input must include visible requirements, error recovery, and an accessible alert. |
| `prefers-reduced-motion` is the platform mechanism for users who need less motion. [web.dev — prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) | Decorative animation must be disabled or reduced without hiding content or feedback. |
| High-performance animation should favor `transform` and `opacity`; animating positional layout properties causes additional rendering work. [web.dev — animation performance](https://web.dev/articles/animations-guide) | Ambient backgrounds, entrances, cards, and progress feedback use transform/opacity; no scroll-jacking or mandatory parallax. |
| Workers Free currently documents 100,000 requests/day, 10 ms CPU per request, 128 MB per isolate, 50 subrequests, a 3 MB compressed Worker, 20,000 static assets, 25 MiB per static asset, and a 100 MB request body for Free accounts. [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) | Do not buffer large media or protected files in the Worker. Keep generated web artwork compressed and below static-asset limits. |
| Cloudflare recommends streaming rather than buffering large request/response bodies. [Cloudflare Streams API](https://developers.cloudflare.com/workers/runtime-apis/streams/) | Existing protected downloads should preserve streaming. Customer uploads should go directly to Storage after server authorization. |
| Supabase recommends resumable TUS upload for files above 6 MB or unreliable connections and supports signed upload tokens. [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) | Future large course/video uploads use direct signed/resumable Storage upload; the Worker issues authorization metadata but does not proxy the file body. |
| Private Storage can be served with authenticated requests or short-lived signed URLs. [Supabase serving assets](https://supabase.com/docs/guides/storage/serving/downloads) | Paid books, videos, and resources remain private and entitlement-gated; a public demo contains only authored preview copy and artwork. |

## Competitive reference findings

`hebaelsawah.com` is used only as a visual benchmark. The useful patterns are the decisive hero scale, full-bleed image treatment, strong contrast, visual rhythm, and immediate primary action. This is an inference from the visible public experience, not a source for copy, brand assets, layouts, or identity. The implementation must stay original to Heba El Sherif, Arabic-first, and centred on the existing niqabi illustrative identity.

## Gap matrix

| Area | Existing governed capability | Visible gap | Implementation decision |
| --- | --- | --- | --- |
| Booking | Six-step wizard, availability contract, temporary holds, manual-payment proof, packages, Dashboard follow-up | Provider-unconfigured Preview shows no journey | Add explicit Preview runtime with local-only dates, hold simulation, manual-payment simulation, and an unmistakable “no booking/payment was created” receipt. |
| Course | Published catalogue, curriculum, entitlement, protected video/resources, progress | No rich experience is visible without Staging data | Add one original Preview course with three modules, interactive lessons, reflection exercise, and session-only progress. It is not purchasable and creates no entitlement. |
| Book | Published catalogue, protected files, entitlement download | No readable sample without Staging data | Add one original Preview book with a styled reader, table of contents, typography controls, and authored sample chapters. It is not presented as a real paid publication. |
| Home/public pages | Cinematic hero, modern Header/Footer, responsive navigation | Long pages still need richer section backgrounds and connective movement | Add reusable layered background primitives, original artwork, section reveals, and featured Preview journeys. |
| Admin | Real permission-checked persisted controls exist | Preview fixtures cannot be safely edited through fake Admin controls | Keep Preview fixtures code-scoped and read-only. Admin remains truthful and becomes demonstrable only against isolated Staging with migrations applied. |
| Uploads | Governed direct upload and protected-delivery contracts exist | Large uploads are unsuitable through Worker memory | Preserve/extend signed direct Storage flows; no file body proxy in the public Preview. |

## Acceptance rules

1. Preview fixtures activate only under an explicit server-side Preview flag and only when Supabase public configuration is absent.
2. Every Preview transaction says that it is simulated, non-persistent, and does not create a booking, order, payment, entitlement, review, or testimonial.
3. Production/Staging provider code paths remain unchanged and continue to enforce Auth, RLS, server permissions, audit, and migrations.
4. Desktop and 390 px views must have no horizontal overflow or overlapping Arabic copy.
5. Reduced-motion mode must leave all content visible and interactive.
6. The final Cloudflare deployment is a separate public Preview Worker. Production, DNS, nameservers, and Production migrations remain untouched until their external acceptance gates are satisfied.
