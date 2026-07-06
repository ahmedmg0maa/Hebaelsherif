# V7 Patch Roadmap To V8

Current delivered version: V7.0.1
Next recommended patch: V7.0.2

## Versioning Rule

Patch rhythm:

- `.1` implementation patch.
- `.2` integration and polish patch.
- `.3` hardening and QA patch.
- Next `.0` stable milestone.

Do not skip patch releases. Do not label the platform V8 until all V7 acceptance gates pass.

## Current Position

V7.0.1 is the visual foundation patch. It includes:

- V7 palette tokens and Tailwind aliases.
- Backward-compatible legacy color aliases.
- `audit:colors`.
- Color and visual target documentation.
- Package version bump to `7.0.1`.

## Next Sequence

V7.0.2 Product Presentation Patch:

- Upgrade courses/products page.
- Upgrade books listing and detail.
- Upgrade workshops listing and detail.
- Upgrade services/session presentation.
- Add premium product detail sections.
- Add pricing/offer modules.
- Add comparison/benefits sections.

V7.0.3 Public UI Hardening Patch:

- Route audit.
- Mobile polish.
- Header/footer polish.
- Empty states and skeleton loading.
- UX placeholder audit.
- Article cards and testimonials polish.

V7.1.0 Stable Public Experience:

- Freeze V7.0.x public UI.
- Document visual system.
- Run full build/check/deploy audit.
- Prepare dashboard/LMS work.

Later milestones continue in order:

- V7.1.x dashboard and course player.
- V7.2.x unified commerce.
- V7.3.x admin shell and operations.
- V7.4.x offers engine.
- V7.5.x reports.
- V7.6.x security and storage protection.
- V7.7.x controlled CMS.
- V7.8.x editorial brand.
- V7.9.x performance, tests, final hardening.
- V8.0.0 only after all acceptance gates pass.

---

## V7.2.0 LMS Stable Update

Implemented after the V7.0.3 patch cycle:

- V7.1.0 public experience freeze checklist and report.
- V7.1.1 dashboard navigation and learner shell direction.
- V7.1.2 protected course player UI at `/dashboard/courses/[slug]/learn`.
- V7.1.3 authenticated progress API gating.
- V7.2.0 LMS milestone documentation.

Next target: **V7.2.1 — Commerce unification step 1**.
