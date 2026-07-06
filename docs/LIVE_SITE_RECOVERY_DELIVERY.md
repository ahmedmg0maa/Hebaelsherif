# Heba ElSherif V6.1 — Live Site Recovery Delivery

## الهدف
إصلاح النشر والواجهة العاجلة بعد ظهور نسخة live بمستوى غير مقبول، مع منع تكرار placeholders أو blank dashboard أو فشل npm على Vercel.

## ما تم تثبيته

- تحويل package manager إلى pnpm.
- ضبط Node على 24.x.
- إضافة `.npmrc` عام.
- تحديث `vercel.json` ليستخدم Corepack و pnpm install.
- إزالة `package-lock.json` من الحزمة النهائية.
- توليد `pnpm-lock.yaml`.
- إزالة الكورسات من public navigation و dashboard navigation لأنها غير جاهزة.
- استبدال صفحة الكورسات العامة بصفحة انتظار محترمة لا تبيع محتوى غير مكتمل.
- تحويل صفحات course slug/learn إلى redirect آمن إلى `/courses` بدل كسر الرحلة.
- إعادة بناء الصفحة الرئيسية كصفحة إنقاذ بصرية بدون placeholder copy.
- إصلاح dashboard غير المسجل ليعرض login state واضح بدل blank/null.
- إضافة صفحة `not-found.tsx` محترمة لأي 404.
- إضافة `audit:ux` لمنع ظهور عبارات placeholder أو غياب lockfile الصحيح.

## أوامر التحقق

```bash
pnpm install
pnpm run type-check
pnpm run lint
pnpm run build
pnpm run audit:v6
pnpm run audit:ux
pnpm run route-audit
```

## قرار المنتج
الكورسات تظل متاحة في admin للتحضير، لكنها لا تظهر في public navigation ولا dashboard navigation حتى يتم تفعيلها كمنتج مكتمل.

## شرط التسليم القادم
لا يتم تسليم أي ZIP إذا ظهر أي مما يلي داخل `src`:

- Visual slot
- Brand image can be added later
- placeholder text
- public route missing
- blank dashboard fallback
- package-lock.json مع pnpm
