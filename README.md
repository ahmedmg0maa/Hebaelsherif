# Heba ElSherif — V3.3 Premium Launch

منصة عربية فاخرة لهبة الشريف مبنية بـ Next.js وFirebase، جاهزة للنشر على Vercel مع تجربة RTL كاملة، هوية بصرية رسمية، حجز، طلبات، محتوى محمي، لوحة مستخدم، ولوحة إدارة.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore
- Firebase Admin SDK
- Vercel

## V3.3 Highlights

- اعتماد اللوجو الرسمي الجديد في كل الأصول والواجهات.
- إزالة المحتوى الوهمي والنصوص الداخلية من الواجهة العامة.
- تحويل حالات غياب الكورسات والكتب إلى تجربة انتظار راقية.
- تثبيت لوحة ألوان البراند: Teal, Deep Teal, Ivory, Warm Beige, Gold, Olive, Burgundy.
- تحسين تباين الدارك مود دون الاعتماد على الأسود الصريح.
- ربط نموذج التواصل والـ Lead Magnet بواجهات API.
- إضافة مسار إثبات الدفع داخل لوحة المستخدم.
- تحسين إدارة الطلبات في الأدمن مع تسجيل Admin Logs.
- تشديد عرض الدروس والروابط المحمية عبر API بدل Firestore العام.

## Quick Start

```bash
npm install
npm run type-check
npm run lint
npm run build
npm run dev
```

## Required Environment

راجع `.env.example` و `PROJECT_SETUP.md` قبل النشر.

## Validation

آخر فحص تم على نسخة V3.3:

```txt
npm run type-check ✅
npm run lint ✅
npm run audit:launch ✅
npm run route-audit ✅
npm run build ✅
```

## Production Notes

- لا ترفع `.env.local` أو `service-account.json` إلى GitHub أو Vercel repo.
- انشر `firestore.rules` بعد ضبط Firebase.
- أضف دومين Vercel والدومين النهائي في Firebase Auth authorized domains.
- المحتوى المدفوع يجب أن يبقى داخل `protected_content` وليس داخل `courses` أو `books` العامة.
- راجع `V3_3_PREMIUM_LAUNCH_REPORT.md` و `LAUNCH_CHECKLIST.md` قبل الإطلاق.
