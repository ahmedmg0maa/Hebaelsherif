# Heba ElSherif — V7 Global Premium Platform

منصة عربية فاخرة لهبة الشريف: كتب رقمية، كورسات (مغلقة بخاصية تفعيل حتى الجاهزية)، حجز جلسات فردية، ورش عمل بمقاعد محدودة، مدفوعات يدوية موثقة، لوحة عميلة كاملة، ونظام تشغيل إداري مُدقق بالصلاحيات والسجلات — مبنية بـ Next.js وSupabase وجاهزة للنشر على Vercel.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS (RTL-first premium design system)
- Supabase: Auth + Postgres (RLS) + Storage
- Zod • pnpm 10.13.1 • Node 24.x • Vercel

## V7 Highlights

- نظام ورش كامل: نشر، مقاعد وقائمة انتظار بقفل قاعدة بيانات، تأكيد حضور، روابط بث محمية بالـ RLS.
- عروض وحملات بعداد تنازلي تُدار من الأدمن وتظهر وتنتهي تلقائيًا.
- إدارة كوبونات حقيقية (نطاق، حدود استخدام، صلاحية) — غير مقروءة للعامة.
- أساس LMS كامل في قاعدة البيانات: وحدات، دروس، اشتراكات، تقدم، شهادات.
- أعلام خصائص من `site_settings`: الكورسات/الورش لا تظهر إلا عند التفعيل.
- حجز الجلسات محمي من التعارض بقفل استشاري + قيد GiST (لا حجز مزدوج).
- حماية دور المالك: لا يُمنح أو يُعدل إلا من مالك.
- سلسلة فحوص نشر من 10 خطوات: `pnpm run check:deploy`.

## Quick Start

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local   # fill Supabase keys
pnpm run dev
```

## Verification

```bash
pnpm run check:deploy
# type-check → lint → build → audit:ux → audit:routes → audit:security
# → audit:admin → audit:v6 → audit:v7 → audit:launch
```

## Documentation

| Topic | File |
| --- | --- |
| Deploy (Vercel + GitHub) | `VERCEL_DEPLOYMENT.md`, `DEPLOYMENT.md` |
| Supabase setup + migrations | `SUPABASE_SETUP.md`, `SUPABASE_MIGRATIONS.md` |
| Architecture / schema / admin | `docs/V7_ARCHITECTURE.md`, `docs/V7_DATABASE_SCHEMA.md`, `docs/V7_ADMIN_OS.md` |
| Incident ledger + guards | `docs/V7_INCIDENTS_AND_FIXES.md` |
| Admin & customer guides | `ADMIN_GUIDE.md`, `CUSTOMER_GUIDE.md` |
| Delivery reports | `V7_IMPLEMENTATION_REPORT.md`, `V7_FINAL_DELIVERY_REPORT.md` |

## Rules that keep production safe

- pnpm فقط — لا `package-lock.json` ولا `npm install` على Vercel.
- لا أسرار في المتصفح — مفتاح service-role للخادم فقط.
- كل إجراء إداري مؤثر يُسجل في سجل التدقيق.
- لا محتوى وهمي أو Placeholder في الواجهة العامة (يفشل الفحص تلقائيًا).
