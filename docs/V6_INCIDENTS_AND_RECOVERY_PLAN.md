# Heba ElSherif V6 — سجل الأخطاء والتصحيحات وخطة الإنقاذ

آخر تحديث: 2026-07-06

## الهدف

هذا الملف يسجل كل الأخطاء التي ظهرت أثناء نقل المشروع إلى Supabase/Vercel، والتصحيحات التي تمت أو يجب تثبيتها داخل المشروع، مع إضافة خطة إنقاذ عاجلة للموقع live بعد ظهور تجربة غير مقبولة بصريًا ووظيفيًا.

---

## 1. Supabase Migration Error — generated column غير immutable

### الخطأ

أثناء تنفيذ:

```bash
supabase db push
```

ظهر:

```txt
ERROR: generation expression is not immutable (SQLSTATE 42P17)
At statement:
alter table public.bookings add column slot_range tstzrange generated always as (tstzrange(start_at, end_at + interval '30 minutes', '[)')) stored
```

### السبب

PostgreSQL لا يسمح باستخدام `generated always as stored` عندما يكون التعبير غير immutable. استخدام `timestamptz` داخل `tstzrange` جعل التعبير غير مقبول كـ generated column.

### الملف المسؤول

```txt
supabase/migrations/0003_booking_commerce_content.sql
```

### التصحيح المعتمد

استبدال generated column بعمود عادي يتم تحديثه عبر trigger:

```sql
alter table public.bookings add column slot_range tstzrange;

create or replace function public.set_booking_slot_range()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.slot_range := tstzrange(new.start_at, new.end_at + interval '30 minutes', '[)');
  return new;
end;
$$;

create trigger trg_bookings_slot_range
before insert or update of start_at, end_at
on public.bookings
for each row
execute function public.set_booking_slot_range();

alter table public.bookings alter column slot_range set not null;

create index bookings_date_status_idx on public.bookings (date, status);
create index bookings_user_idx on public.bookings (user_id, created_at desc);

alter table public.bookings
add constraint bookings_no_overlap
exclude using gist (slot_range with &&)
where (status in ('pending', 'awaiting_payment', 'payment_submitted', 'confirmed', 'reschedule_requested'));
```

### معيار التحقق

```bash
supabase db push
```

يجب أن يتخطى migration رقم `0003`.

---

## 2. Supabase Migration Error — enum payment_status لا يحتوي paid

### الخطأ

ظهر أثناء migration رقم `0009`:

```txt
ERROR: invalid input value for enum payment_status: "paid" (SQLSTATE 22P02)
At statement:
create or replace view public.admin_revenue_report as ...
```

### السبب

القيمة `"paid"` ليست من قيم enum `payment_status`. تم استخدامها داخل comparison مباشرة بدون cast إلى text.

### الملف المسؤول

```txt
supabase/migrations/0009_admin_os_hardening.sql
```

### التصحيح المعتمد

داخل view:

```sql
create or replace view public.admin_revenue_report as
select
  date_trunc('month', coalesce(o.created_at, b.created_at))::date as month,
  count(distinct o.id) as orders_count,
  count(distinct b.id) as bookings_count,
  coalesce(
    sum(
      case
        when o.payment_status::text in ('confirmed', 'submitted')
          or o.status::text in ('paid', 'access_granted', 'fulfilled', 'completed')
        then o.final_amount
        else 0
      end
    ),
    0
  ) as orders_revenue,
  coalesce(
    sum(
      case
        when b.payment_status::text in ('confirmed', 'submitted')
          or b.status::text in ('confirmed', 'completed')
        then b.final_amount
        else 0
      end
    ),
    0
  ) as bookings_revenue
from public.orders o
full outer join public.bookings b on false
group by 1;
```

### معيار التحقق

```bash
supabase db push
```

يجب أن يكمل حتى `0009`.

---

## 3. Vercel Build Error — npm Exit handler never called

### الخطأ

ظهر على Vercel أثناء install:

```txt
npm error Exit handler never called!
Error: Command "npm install" exited with 1
```

ثم ظهر أيضًا مع:

```txt
npm ci --no-audit --no-fund
```

### السبب المرجح

الخطأ يحدث قبل build، أي أثناء install فقط. الاحتمالات:
- bug في npm CLI على Vercel.
- lockfile متولد من registry غير مناسب.
- تعارض package manager.
- استخدام npm مع Next 16/React 19 على بيئة Vercel الحالية أدى إلى crash غامض.

### التصحيحات التي تمت تجربتها

1. توحيد Node إلى `24.x`.
2. إضافة `.npmrc`.
3. إجبار registry العام.
4. استبدال `npm install` بـ `npm ci`.

### النتيجة

نفس الخطأ استمر. لذلك القرار النهائي:

## التحويل إلى pnpm

---

## 4. Package Manager Fix — اعتماد pnpm

### الملفات المطلوبة

```txt
package.json
.npmrc
vercel.json
pnpm-lock.yaml
```

### package.json

يجب أن يكون `packageManager` في root وليس داخل `devDependencies`.

الشكل الصحيح:

```json
{
  "name": "heba-elsherif",
  "version": "6.0.0-supabase-native-hardening",
  "private": true,
  "packageManager": "pnpm@10.13.1",
  "engines": {
    "node": "24.x"
  }
}
```

### خطأ تم اكتشافه

تم وضع:

```json
"packageManager": "pnpm@10.13.1"
```

داخل:

```json
"devDependencies"
```

وهذا خطأ. يجب أن يكون في root.

### .npmrc

```ini
registry=https://registry.npmjs.org/
fund=false
audit=false
engine-strict=false
strict-peer-dependencies=false
auto-install-peers=true
```

### vercel.json

```json
{
  "framework": "nextjs",
  "installCommand": "corepack enable && corepack prepare pnpm@10.13.1 --activate && pnpm install --frozen-lockfile",
  "regions": ["fra1"]
}
```

### أوامر محلية

```powershell
corepack enable
corepack prepare pnpm@10.13.1 --activate

Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue

pnpm install
pnpm run type-check
pnpm run lint
pnpm run build
```

### Git

```powershell
git rm package-lock.json
git add package.json pnpm-lock.yaml vercel.json .npmrc .nvmrc
git commit -m "switch project to pnpm for vercel deployment"
git push
```

---

## 5. Environment Variables — Supabase/Vercel

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://azuvwkzpgtyxwxmvedmp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>
```

### Site URLs

```env
NEXT_PUBLIC_SITE_URL=https://www.hebaelsherif.com
NEXT_PUBLIC_APP_URL=https://www.hebaelsherif.com
```

### Admin

```env
ADMIN_SEED_EMAIL=<owner_email>
ADMIN_SETUP_SECRET=<strong_secret>
```

### Payment/Contact

```env
INSTAPAY_PHONE=01037141322
WHATSAPP_PHONE=01037141322
NEXT_PUBLIC_PAYMENT_INSTAPAY=01037141322
NEXT_PUBLIC_PAYMENT_WALLET=01037141322
NEXT_PUBLIC_PAYMENT_BANK=يتم إرسال بيانات التحويل بعد مراجعة الطلب
```

### Social/Analytics Optional

```env
NEXT_PUBLIC_FACEBOOK_URL=
NEXT_PUBLIC_INSTAGRAM_URL=
NEXT_PUBLIC_TIKTOK_URL=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=
NEXT_PUBLIC_CLARITY_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
PAYMENT_WEBHOOK_SECRET=
```

### ممنوع

لا تضف أي Firebase variables في V6.

---

## 6. Live Site Incident — شكل الموقع و404/Blank Pages

### ملاحظات live

تمت ملاحظة أن الموقع المنشور لا يعكس مستوى احترافي مقبول:
- وجود placeholder واضح مثل: `Visual slot. Brand image can be added later.`
- صفحات تحتوي صور مفقودة أو مجرد `Image`.
- صفحة dashboard شبه فارغة.
- الكورسات ظاهرة رغم أنها غير جاهزة.
- بعض الرحلات قد تؤدي إلى 404 أو صفحات ناقصة حسب مسار الرابط أو حالة auth.
- التجربة البصرية تبدو كنسخة انتقالية، لا نسخة production.

### القرار

يجب اعتبار هذا Incident وليس مجرد تحسين بصري.

### أولوية الإصلاح

قبل أي تطوير جديد:
1. وقف نشر الواجهة الحالية كنسخة نهائية.
2. إصلاح routing والصفحات الفارغة.
3. إخفاء الكورسات من الواجهة العامة مؤقتًا.
4. استبدال placeholder visual sections بمكونات حقيقية أو حذفها.
5. إعادة بناء homepage وbooking وservices وauth وdashboard كنسخة إنقاذ أولى.
6. التأكد من عدم وجود أي صفحة تعرض `Image` فقط أو placeholder نصي.
7. إضافة route audit يمنع التسليم إذا ظهرت placeholders أو صفحات أقل من حد أدنى من المحتوى.

---

## 7. ملفات يجب إضافتها إلى المشروع

### مطلوب إضافته

```txt
docs/ERRORS_AND_FIXES_LOG.md
docs/LIVE_SITE_RECOVERY_PLAN.md
docs/VERCEL_PNPM_DEPLOYMENT_FIX.md
docs/SUPABASE_MIGRATION_FIXES.md
```

يمكن دمجهم في ملف واحد إذا أردنا:

```txt
docs/V6_INCIDENTS_AND_RECOVERY_PLAN.md
```

---

## 8. خطة الإنقاذ العاجلة للموقع

### Phase A — إيقاف النزيف

- تثبيت deploy ناجح على Vercel باستخدام pnpm.
- إزالة أي كود يولد 404 غير مقصود.
- إضافة fallback آمن للصفحات المحمية.
- منع blank dashboard.

### Phase B — إصلاح الشكل العام

- إزالة placeholders.
- إضافة صورة/hero حقيقي.
- توحيد الهيدر والفوتر.
- إخفاء الكورسات من navigation إذا لم تكن جاهزة.
- جعل Start Here أداة فعلية أو صفحة بسيطة محترمة.
- جعل Dashboard يعرض login redirect أو empty state واضح.

### Phase C — Route QA

فحص المسارات التالية:

```txt
/
 /services
 /booking
 /books
 /articles
 /about
 /contact
 /faq
 /privacy
 /terms
 /refund
 /disclaimer
 /auth/login
 /auth/register
 /dashboard
 /admin
```

كل route يجب أن يرجع:
- صفحة مفهومة.
- لا placeholders.
- لا 404 غير مقصود.
- لا blank page.

### Phase D — Admin/Data

- التأكد من seed admin.
- admin route protected.
- dashboard user protected.
- لا تسريب بيانات.
- Supabase connected.

---

## 9. شروط عدم التسليم القادمة

لا يتم اعتبار النسخة القادمة جاهزة إذا وجد أي من الآتي:

```txt
Visual slot
Brand image can be added later
Image فقط بدون alt/visual
404 على route أساسي
dashboard blank
courses visible رغم أنها غير جاهزة
Firebase داخل src
package-lock.json مع pnpm
npm install في vercel
ignoreBuildErrors
ملف فارغ داخل src
```

---

## 10. أمر فحص مقترح

إضافة script:

```json
{
  "audit:ux": "node scripts/audit-ux-placeholders.mjs",
  "audit:routes": "node scripts/audit-public-routes.mjs",
  "check:deploy": "pnpm run type-check && pnpm run lint && pnpm run build && pnpm run audit:ux && pnpm run audit:routes"
}
```

---

## 11. الأولوية القادمة

1. توليد `pnpm-lock.yaml` الصحيح.
2. تثبيت نشر Vercel.
3. إصلاح route/dashboard/404.
4. إزالة placeholders.
5. إخفاء الكورسات مؤقتًا.
6. إعادة polish للواجهة public.
7. اختبار شامل live.
