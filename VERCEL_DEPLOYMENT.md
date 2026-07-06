# Vercel Deployment — Heba ElSherif V7

## 1. GitHub

```bash
git init
git add .
git commit -m "V7 global platform"
git remote add origin <your-repo-url>
git push -u origin main
```

Do not commit `.env*` files (already ignored). Never commit `package-lock.json`.

## 2. Vercel project

1. Import the GitHub repository into Vercel (framework preset: **Next.js**).
2. The install command comes from `vercel.json` and must stay:
   ```txt
   corepack enable && corepack prepare pnpm@10.13.1 --activate && pnpm install --frozen-lockfile
   ```
3. Node version: **24.x** (from `package.json` engines and `.nvmrc`).
4. Region: `fra1` (configured in `vercel.json`).

Historic warning: `npm install` / `npm ci` on Vercel previously failed with `npm error Exit handler never called!` — never switch back to npm.

## 3. Environment variables

Required (Production + Preview):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never NEXT_PUBLIC
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_APP_URL=
ADMIN_SETUP_SECRET=
NEXT_PUBLIC_PAYMENT_INSTAPAY=
NEXT_PUBLIC_PAYMENT_WALLET=
NEXT_PUBLIC_PAYMENT_BANK=
```

Optional: social URLs, GA/Clarity ids, `PAYMENT_WEBHOOK_SECRET`, and feature-flag overrides:

```env
NEXT_PUBLIC_FEATURE_COURSES=false
NEXT_PUBLIC_FEATURE_WORKSHOPS=false
NEXT_PUBLIC_FEATURE_BOOKS=true
NEXT_PUBLIC_FEATURE_BOOKING=true
```

(Flags normally live in the `site_settings.features` row; env vars are emergency overrides.)

## 4. Domain + SSL

1. Add the production domain in Vercel → Domains. Vercel issues SSL automatically.
2. Decision: use the apex (non-www) as canonical and let Vercel redirect `www` → apex (or the reverse — pick one and keep `NEXT_PUBLIC_SITE_URL` matching it).
3. HTTPS redirect is automatic on Vercel. CSP includes `upgrade-insecure-requests`.
4. Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to the final `https://` domain so canonicals/sitemap/OG URLs are correct.

## 5. Pre-deploy gate

```bash
pnpm install --frozen-lockfile
pnpm run check:deploy
```

All steps (type-check, lint, build, ux/routes/security/admin/v6/v7/launch audits) must pass.
