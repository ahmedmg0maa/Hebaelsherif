# Heba ElSherif V6.1 — Emergency Recovery Final Report

## نسخة التسليم
`6.1.0-live-site-recovery`

## سبب النسخة
تم إصدار هذه النسخة كتصحيح عاجل بعد ظهور الموقع live بمستوى غير مقبول، مع مشاكل في Vercel install باستخدام npm، وظهور placeholders/صفحات غير مكتملة و dashboard blank state.

## أهم ما تم تنفيذه

### Vercel / Package Manager
- تحويل المشروع إلى pnpm في `package.json` عبر `packageManager: pnpm@10.13.1`.
- ضبط Node على `24.x`.
- إضافة `.npmrc` للـ registry العام.
- تعديل `vercel.json` ليستخدم Corepack و pnpm بدل npm.
- حذف `package-lock.json` من التسليم.
- إضافة `pnpm-lock.yaml` كملف bootstrap، مع استخدام `pnpm install --no-frozen-lockfile` على Vercel حتى يعيد توليد lock كامل في بيئة الإنترنت.

### Live Site Recovery
- إعادة بناء الصفحة الرئيسية كواجهة إنقاذ نظيفة بدون placeholder copy.
- استبدال الـ hero visual بصورة حقيقية من أصول المشروع.
- إزالة الكورسات من public navigation و dashboard navigation لأنها غير جاهزة.
- إنشاء صفحة كورسات عامة محترمة توضح أنها قيد التجهيز بدل عرض منتجات غير مكتملة.
- تحويل `/courses/[slug]` و `/courses/[slug]/learn` إلى redirect آمن لـ `/courses` بدل تجربة مكسورة.
- إصلاح dashboard غير المسجل ليعرض login state واضح بدل `null`/blank.
- إضافة `src/app/not-found.tsx` لتجربة 404 محترمة.

### Audits
- إضافة `scripts/audit-ux-placeholders.mjs`.
- إضافة `audit:ux` و `check:deploy` في `package.json`.
- إضافة سجل incident كامل داخل `docs/V6_INCIDENTS_AND_RECOVERY_PLAN.md`.
- إضافة `docs/LIVE_SITE_RECOVERY_DELIVERY.md`.

## الفحوصات التي نجحت محليًا

```bash
npm run type-check
npm run lint
npm run audit:ux
npm run audit:v6
npm run audit:launch
npm run route-audit
npm run build
```

## ملاحظة مهمة عن pnpm-lock
البيئة المحلية لا تسمح بجلب pnpm من registry، لذلك تم وضع lock bootstrap مع `--no-frozen-lockfile` في Vercel. عند أول deploy ناجح على Vercel، pnpm سيبني lock كامل من registry العام. بعدها يفضل سحب `pnpm-lock.yaml` الكامل من بيئة محلية فيها إنترنت أو توليده محليًا ورفعه لاحقًا.

## أوامر Vercel المتوقعة

```bash
corepack enable && corepack prepare pnpm@10.13.1 --activate && pnpm install --no-frozen-lockfile
```

## لا يتم الرجوع إلى npm
إذا عاد اللوج إلى `npm install` أو `npm ci` فمعناه أن `vercel.json` أو root directory غير صحيحين.
