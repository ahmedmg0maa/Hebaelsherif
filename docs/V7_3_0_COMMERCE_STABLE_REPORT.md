# V7.3.0 Commerce Stable Report

## Scope

Commerce is now modeled as a unified layer rather than separate isolated flows for books, courses, workshops, sessions, bundles, and VIP programs.

## Implemented

- Shared product model and labels.
- Unified product card component.
- Checkout intent route.
- Commerce pipeline component.
- V8 migration for `products`, `checkout_sessions`, `product_bundles`, and CMS/navigation support.

## Acceptance

- All sellable objects can map into one product layer.
- Checkout uses a unified direction.
- Access is documented as granted after payment approval or admin grant.
