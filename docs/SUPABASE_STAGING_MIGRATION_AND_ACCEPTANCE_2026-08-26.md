# Supabase Staging Migration and Acceptance — 2026-08-26

## الحكم

**`BLOCKED`**

> تحديث مصدر محلي في 2026-08-28: تطور التسلسل المحلي إلى `000–079` (80 ملفًا). بقيت Production عند `000–043` فقط، ولم تُطبق `044–079` على مزود؛ تُشغّل بالترتيب داخل Staging بعد Recovery Point وschema fingerprint. تجعل 075–079 CMS والإعدادات معاملات محكومة، وما زالت `unverified` حيًا.

لم تبدأ أي عملية Backup أو Restore أو migration أو Auth/Storage/Production write. المانع الخارجي الوحيد هو غياب متغير الاتصال الآمن الخاص بـProduction من بيئة التنفيذ: `HEBA_LAUNCH_PRODUCTION_DATABASE_URL`. لم يُطلب أو يُطبع connection string أو كلمة مرور.

## هوية البيئات

| البيئة | الهوية | الحالة |
| --- | --- | --- |
| Production | `zfbw…jidc` | المرجع المعتمد موجود وحالته `ACTIVE_HEALTHY`؛ لم تُجر عليه كتابة |
| Staging | `uecv…cphp` | مشروع Nano مستقل وفارغ وحالته `ACTIVE_HEALTHY`؛ لا بيانات Production فيه |
| Restore target | غير منشأ | يجب أن يكون مؤقتًا ومعزولًا ويحذف بعد الـdrill |

## Backup / Restore Drill

- النتيجة: **`RESTORE DRILL BLOCKED`**.
- دليل الحجب: فحص الاسم فقط أثبت أن متغير اتصال Production الآمن غير موجود في executor؛ أدوات `pg_dump` و`pg_restore` و`pg_dumpall` و`psql` الرسمية موجودة.
- اختبار fail-closed: تشغيل runner بلا المتغير توقف قبل أي اتصال أو إنشاء target؛ فرق artifacts داخل `.launch-backups` كان صفرًا.
- لا توجد نسخة احتياطية صالحة أو Restore evidence أو Recovery Point جديد نتيجة هذه الجولة.

### تصحيح runner المحلي

تم إصلاح الأدوات قبل أي تشغيل حقيقي كي:

1. تتحقق من Production المعتمد وتستمد organization/region منه بدل قيم ثابتة قديمة.
2. تنشئ target Nano منفصلًا وتتحقق أنه ليس Production أو Staging.
3. تتحقق من archive وglobals والاستعادة المعزولة ووجود جداول/RLS الأساسية.
4. تحذف الـdump والـglobals وRestore Target عند نجاح أو فشل الـdrill، ولا تعرض أسماء اتصال أو أسرار.

## مراجعة migrations

- المصدر يحوي 48 ملفًا متسلسلاً: `000` إلى `047`، بلا prefix مكرر أو مفقود.
- Baseline المطلوب للـStaging الفارغ: `000` → `043` بالترتيب.
- `000_relocate_legacy.sql` ينقل legacy إن وجدت؛ على قاعدة جديدة لا ينسخ أو ينشئ بيانات Production.
- `013_port_legacy_data.sql` يحرس جداول legacy ويصبح no-op لبيانات legacy على قاعدة فارغة، مع defaults/feature flags المصدرية فقط.
- لا توجد `DROP TABLE` أو `TRUNCATE` أو `DROP SCHEMA` أو `DROP TYPE` في chain. يوجد `DROP POLICY` مقصود في `012` لسياسات أنشأتها migrations سابقة، لذا لا يجوز تشغيله خارج الـchain أو خارج transaction runner.
- `pnpm audit:db` نجح.
- verifier المصدر وfixtures أثبتا ترتيب pending الحقيقي: **`044 → 045 → 046 → 047`**، مع 045 التصحيح forward-only لإغلاق bypass الحجز القديم.

## ما لم يُنفذ

| البند | الحالة | السبب |
| --- | --- | --- |
| Baseline 000–043 على Staging | unverified / لم يطبق | يتطلب نجاح Recovery Drill أولًا ووسيلة اتصال Staging آمنة |
| schema parity مع Production 043 | unverified | لا يوجد logical backup أو metadata snapshot جديد من Production |
| recovery point وschema fingerprint لـStaging | unverified | Baseline لم يبدأ |
| 044–047 على Staging | لم يطبق | تتبع baseline وrecovery point وpreflight fingerprint |
| بيانات اختبار صناعية | لم تضف | schema/RLS غير موجودين بعد |
| Auth redirects وAdmin/MFA | لم يطبق | لا Admin قبل schema/RBAC/audit، ولا إعداد تطبيق Staging بعد |
| Cloudflare ↔ Supabase Staging variables | لم تضف | لا تُقرأ مفاتيح أو تُكتب أسرار قبل بوابة Recovery/Migration |
| Booking/Admin/Storage/E2E الحي | unverified | لا توجد قاعدة Staging مهيأة |

## خطة Staging بعد إزالة الحجب

1. وضع `HEBA_LAUNCH_PRODUCTION_DATABASE_URL` في بيئة executor الآمنة فقط، ثم تشغيل الـdrill وتسجيل `RESTORE DRILL PASSED`.
2. إنشاء اتصال Staging آمن، وتأكيد ref قبل كل write، ثم تطبيق 000–043 بالترتيب وتوليد sanitized schema fingerprint.
3. مطابقة metadata Production حتى 043 مع Staging، وتسجيل أي drift قبل المتابعة.
4. إنشاء recovery point منطقي لـStaging، ثم تطبيق 044→045→046→047 في نافذة معزولة، وتشغيل preflight/postflight validators.
5. إدخال بيانات صناعية فقط، ثم تنفيذ RLS/RPC/concurrency/booking/Storage denial tests.
6. إضافة Auth redirect لعنوان Workers.dev فقط، وإعداد Cloudflare Secrets لمشروع Staging فقط.
7. إنشاء Admin Staging بالمسار المعتمد، منحه الدور المصرح وتأكيد MFA/AAL2، ثم E2E الحي الكامل.

## Production deployment وrollback

- لا توجد ترقية Production مصرح بها الآن.
- الشرط الأول: Logical Backup وisolated Restore ناجحان وحديثان.
- الشرط الثاني: Staging Accepted مع fingerprint/parity وRLS/RPC/Auth/booking evidence.
- إن فشل postflight، لا تحذف migration history ولا تستبدل rollback التطبيق باستعادة قاعدة البيانات؛ عطّل surface الجديد ونفذ forward-only corrective migration بعد مراجعة.
- أي restore Production لا يبدأ إلا من Recovery Point موثق ومالك استعادة محدد.
