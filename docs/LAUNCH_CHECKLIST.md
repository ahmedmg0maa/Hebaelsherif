# Launch checklist

## Security and access

- [ ] Rotate the previously exposed Supabase service-role/secret credential and invalidate the old one.
- [ ] Replace the bootstrap admin password with a unique strong password.
- [ ] Confirm production environment variables are encrypted and server-only values have no `NEXT_PUBLIC_` prefix.
- [ ] Verify granular roles and least-privilege assignments; retain at least one tested owner recovery path.
- [ ] Review Auth Site URL, redirect allow-list, RLS policies, storage policies, and recent audit logs.

## Data and operations

- [ ] Back up the database and verify a restore procedure.
- [ ] Apply all migrations to staging, then production, and confirm migration history.
- [ ] Configure real payment instructions, currencies, prices, booking timezone, availability, cancellation policy, and notification sender settings.
- [ ] Validate catalog/CMS content, Arabic copy, SEO metadata, media alt text, and legal/contact details.

## Quality and release

- [ ] `pnpm check:deploy` passes on the release revision.
- [ ] Critical Playwright flows pass for owner, staff, and customer roles.
- [ ] `pnpm package:release` succeeds and its manifest contains no forbidden files.
- [ ] Desktop/mobile, RTL, light/dark, accessibility, error, empty, and slow-network states are approved.
- [ ] Monitoring, support ownership, rollback steps, and post-launch smoke-test responsibility are assigned.
