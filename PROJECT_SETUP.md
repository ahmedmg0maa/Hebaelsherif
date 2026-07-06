# Heba ElSherif Global Premium Platform — Setup & Launch Guide

هذه النسخة هي نسخة Premium مطورة للمنصة، وتحتوي على تجربة عامة، حجز احترافي، محتوى محمي، لوحة مستخدم، لوحة إدارة، Dark Mode، AI Guide، مقالات، صفحات قانونية، Reviews، Payment workflow، وأماكن جاهزة للصور.

## Quick Start

```bash
npm install
npm run type-check
npm run build
npm run dev
```

## Environment

انسخ `.env.example` إلى `.env.local` وضع مفاتيح Supabase وVercel والدفع.

المتغيرات الأساسية:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
ADMIN_SETUP_SECRET=
NEXT_PUBLIC_APP_URL=
```

## Supabase Checklist

- Enable Authentication: Email/Password + Google.
- Create Supabase data in production mode.
- Publish `supabase/migrations`.
- Add authorized domains: localhost, Vercel domain, custom domain.
- Generate service account key and put its values in env.

## Admin Setup

1. Register a normal user from `/auth/register`.
2. Call `/api/admin/seed-admin` with `x-admin-setup-secret`.
3. Login again and open `/admin`.

## Premium Features Included

- Premium responsive public pages.
- Dark Mode and motion system.
- AI Guide with guided assessment.
- Multi-step booking with unavailable slots.
- Server-side duplicate booking protection.
- Courses with chapters/lessons and Drive links.
- Books with Drive links and metadata.
- Protected paid content pages.
- Manual payment methods and order workflow.
- Reviews with admin approval.
- Admin analytics, reviews, logs placeholders.
- Articles/blog and legal pages.
- Dynamic sitemap and robots.
- Image slots ready for later real assets.

## Image Slots

Place real images later in:

```txt
/public/images/brand/hero-placeholder.svg
/public/images/brand/about-placeholder.svg
/public/images/brand/session-placeholder.svg
/public/images/courses/course-placeholder.svg
/public/images/books/book-placeholder.svg
/public/images/testimonials/avatar-placeholder.svg
/public/images/og/default-og.svg
```

You can also use external image URLs in Admin fields.

## Production Notes

- Do not commit `.env.local`.
- Use Vercel environment variables.
- Add Supabase Admin variables to Vercel.
- Add domain to Supabase Auth authorized domains.
- Replace placeholders with real brand photos and copy before final brand launch.

## Verified

- `npm run type-check` passes.
- `npm run build` passes.
