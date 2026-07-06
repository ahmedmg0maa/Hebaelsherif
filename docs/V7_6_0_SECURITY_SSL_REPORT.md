# V7.6.0 Security / SSL Hardening Report

## Covered

- Vercel headers and CSP direction.
- Supabase RLS caution.
- Private storage requirements.
- No service role in client.
- No public coupons or payment proofs.
- Owner role protection requirement.

## Final production checklist

- Run Supabase migrations on staging.
- Confirm private buckets: protected books, payment proofs, course resources.
- Verify Vercel HTTPS and canonical domain.
- Test non-owner cannot modify owner.
- Test public cannot read private content.
