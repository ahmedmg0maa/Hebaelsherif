# OWNER CLOUDFLARE SETUP — ONE CONSOLIDATED REQUEST

Please complete these items once the local Cloudflare compatibility gate is accepted. Do not send passwords, API tokens, secret values or screenshots containing them in chat.

1. Create or sign in to a Cloudflare Free account.
2. Connect the GitHub repository in Cloudflare Workers Builds, selecting `main` for Production and an approved `staging` branch/preview for Staging.
3. Add `hebaelsherif.com` to Cloudflare, then change its Namecheap nameservers to the exact pair Cloudflare displays. Namecheap remains the registrar only.
4. In Cloudflare, add the documented Production/Staging Worker and build variables/secrets directly in the dashboard. Use separate Supabase projects; never add a value to Git or chat.
5. Create/configure the Resend Free sender/domain and the Sentry Developer Free project with the intended alert recipient. Add only their resulting integration values in Cloudflare Secrets.
6. Approve [OWNER_CONTENT_AND_LEGAL_APPROVAL_PACK_2026-08-26.md](OWNER_CONTENT_AND_LEGAL_APPROVAL_PACK_2026-08-26.md), including legal text, booking/cancellation/refund terms, services/prices/availability, support data and any launch-blocking content.

After these actions are complete, report only: Cloudflare account ready, GitHub connected, domain/nameservers complete, Production and Staging secrets entered, Resend ready/not-ready, Sentry ready/not-ready, and content/legal approved/not-approved. No credential is needed in this conversation.
