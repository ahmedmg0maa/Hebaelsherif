# Deployment

## Active architecture

- **Code and CI/CD:** GitHub Free.
- **Application, DNS, CDN and baseline protection:** Cloudflare Workers Free.
- **Database, Auth and Storage:** separate Supabase Free Production and Staging projects.
- **Mail and monitoring:** Resend Free and Sentry Developer Free after provider setup.
- **Recovery:** full logical backup plus isolated restore drill; no paid PITR purchase.
- **Payments:** reviewed manual payment proofs; the electronic gateway remains post-launch.
- **Domain ownership:** Namecheap registrar only.

The app remains full-stack Next.js. It must not be statically exported or moved to cPanel/MySQL.

## Current release decision

`BLOCKED — CLOUDFLARE OWNER SETUP AND STAGING ACCEPTANCE REQUIRED`

The isolated vinext/Workers compatibility spike is locally positive but is not a deployment. Follow [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md), then the ordered recovery → Staging → Production gates in [PRODUCTION_LAUNCH_CLOSURE_2026-08-26.md](PRODUCTION_LAUNCH_CLOSURE_2026-08-26.md). The only owner-facing setup is [OWNER_CLOUDFLARE_SETUP_ONE_CONSOLIDATED_REQUEST.md](OWNER_CLOUDFLARE_SETUP_ONE_CONSOLIDATED_REQUEST.md).

No secret, `node_modules`, `dist`, `.env`, test result, database dump or log belongs in Git or the release archive.
