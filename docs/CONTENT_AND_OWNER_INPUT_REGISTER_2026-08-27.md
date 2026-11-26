# Content and owner input register — 2026-08-27

No entry below is fabricated or treated as approved merely because a safe fallback exists.

| Input | Used by | State | Owner action before public acceptance |
|---|---|---|---|
| Biography, qualifications, dates and evidence links | About, authority surfaces | owner-input | approve exact factual wording and evidence references |
| Press/appearance sources, outlet, date, URL and excerpt | Home/About/Press | schema + owner-input | after 048 review, provide verified source records and media rights |
| Resource videos/podcasts, host rights, captions/transcripts | Resources and related discovery | schema + owner-input | after 048 review, provide approved sources/transcripts/captions |
| Testimonial consent/source/verification | Home/details/testimonials | schema + owner-input | after 050 review, approve each public record; unreviewed rows remain non-public |
| Course outcome, audience fit, prerequisites, access term and curriculum | course detail/checkout/dashboard | owner-input | complete through governed Admin fields when the reviewed schema supports the fields; do not infer outcomes |
| Book format/file/version/access term | book detail/checkout/delivery | owner-input + Staging proof | upload protected real edition and approve customer-facing access wording |
| Workshop agenda, location/delivery, recording/resource promise | workshop detail/checkout/dashboard | owner-input | publish only promises that match configured delivery records |
| Service scope, fit/not-fit, duration, price, availability and policy | services/booking | owner-input + Staging proof | approve exact service facts, then verify 044/045 journey |
| Legal, booking, cancellation and refund policies | legal/checkout/booking | owner-input | approve governed version and effective date; drafts stay noindex |
| Support identity/channel/SLA | contact, receipts and policies | owner-input/provider | configure real support channel; do not publish an unavailable channel |

## Data rule

Staging uses synthetic/disposable records only. No Production customer, order, booking, proof, testimonial, or private media data may be copied to Staging.

