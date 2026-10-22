# مراجعة وترقية البنية الكاملة — 2026-08-25

النطاق: تنفيذ محلي آمن ومراجعة أدلة سابقة فقط. لا يمثل هذا الملف تفويضًا للكتابة على Supabase أو الاستضافة أو DNS أو WAF أو أي مزود خارجي. المرجع الحي الوحيد الموثق هو `zfbwpubsnuijybxjuidc`، وقد فُحص read-only في 2026-08-20.

## مصفوفة الطبقات

| العنصر | الحالة الحالية المثبتة | الفجوات والمخاطر | التغيير المنفذ | الاختبار/الدليل | الحالة النهائية |
|---|---|---|---|---|---|
| Frontend | واجهة عربية RTL، light/dark، حالات فارغة صادقة، ومسارات عامة محمية من الوعود غير المهيأة. | الرحلات الحقيقية تحتاج مصدر بيانات وaccounts مرحلية. | حُفظت الهوية؛ لا rewrite. صفحات التقارير تعرض خطأ/عدم تهيئة بدل أصفار. | Playwright العام معزول؛ مراجعة المصدر للـRTL/التركيز/overflow. | local-verified |
| Backend | Server Actions محروسة بـpermissions وAAL2؛ منطق الحجز/الدفع ذري في RPCs المصدرية. | webhooks/providers وjobs لا يمكن إثباتها بلا مزود وstaging. | أضيف step-up حديث لعشر دقائق للعمليات النقدية/الأدوار/إعداد الدفع. | `verify:fresh-admin-assurance`، booking/commerce/delivery audits. | local-verified |
| Database | 043 مثبت حيًا؛ 044–047 additive ومحلية فقط، و045 يغلق bypasses القديمة. | لا recovery point/PITR مثبت؛ 044 غائبة حيًا. | لا تعديل migrations الحية ولا تطبيق خارجي؛ ثبتت اختبارات grants/RLS المصدرية. | preflight و`verify:booking-permissions-local`. | blocked |
| API | RPC boundaries وتحقيقات الإدخال والـrate limits موجودة للرحلات الحساسة. | لا sandbox webhook/provider أو RLS مرحلي. | لا API موازية؛ أبقيت الأخطاء fail-closed وfeature/readiness gates. | audits: booking/commerce/catalog/db. | local-verified |
| Authentication | TOTP عاملان، AAL2، HttpOnly admin session، idle/absolute expiry وrevocation. | redirects وMFA الحقيقي يحتاجان dashboard/account تفويضًا. | أصلحت `reauth=1`: لا تعيد استخدام AAL2 قديمة، بل تطلب TOTP جديدًا. | verifier محلي؛ E2E الحقيقي blocked. | local-verified |
| Authorization | permission matrix، RLS، last-owner protection وserver guards موجودة. | إثبات RLS/denial على 044–047 يستلزم staging. | role grants/revokes/permission edits صارت تحتاج fresh AAL2، مع audit regression gate. | `audit:admin` و`verify:fresh-admin-assurance`. | local-verified |
| Admin | CMS، catalog، booking agenda، media، CRM، payments، reviews، settings، readiness موجودة ومقيدة بالصلاحيات. | محتوى/سياسات/أسعار واقعية غير منشورة؛ تقارير متقدمة وCSV مؤجلان. | منع تقرير العمليات من تمثيل عطل المصدر كأصفار؛ أضفت رابط إعادة التأكيد للإجراءات الحساسة. | admin/source audits؛ persistence يحتاج staging. | local-verified |
| Storage | 043 private delivery وvalidation/magic bytes/Signed URLs مصدرية؛ buckets 043 مثبتة read-only. | scanner وlive ownership/expiry drills غير مهيأة. | لا ادعاء scanner؛ حافظت على no-store/no-referrer وحدود 043. | `verify:delivery-local` وpreflight. | local-verified |
| Payment Gateway | دفع يدوي/instructions مع atomic approval/refund وتحقق server-side. | لا provider أو sandbox/webhook مفوض/مهيأ. | اعتماد/رفض/استرداد يتطلب fresh AAL2؛ لا card data أو claim لتكامل حي. | commerce audits وfresh-assurance verifier. | local-verified |
| Hosting | isolated build يحجب كل إعداد Supabase؛ release package recursive-security checked. | provider/runtime/domain/deploy protection غير مفحوصة في لوحة خارجية. | لا تغييرات hosting؛ runbooks تفصل local/staging/production. | build:isolated/archive security/release evidence. | blocked |
| CDN | HTML/account/private routes تمنع التخزين، والأصول محلية. | لا CDN فعلي أو purge/invalidation evidence. | لا ادعاء edge/CDN؛ سياسة cache موثقة ضمن routes/runbooks. | source/header audit فقط. | blocked |
| WAF | rate limits application-level لمسارات حساسة. | WAF provider/rules/log mode غير مهيأ أو مفوض. | لا تغيير DNS/WAF؛ وثقت الحاجة إلى simulate ثم block خارجيًا. | security audit محلي. | blocked |
| Monitoring | readiness dashboard وaudits واضحة، ولا تحويل لأصفار عند فشل التقارير. | لا error-tracker/metrics/alerts provider. | جهزت health/readiness ورفض snapshot عند عدم readiness؛ لا ادعاء تنبيهات حية. | reports/admin source assertions. | local-verified |
| Backups وDR | runbooks تميز rollback code عن restore data؛ preflight يثبت غياب recovery point. | PITR/backup/restore drill يتطلب owner وبيئة معزولة. | لا migration خارجي؛ أبقيت 044 blocked صراحة حتى recovery وrestore owner. | `LIVE_READONLY_PREFLIGHT` و`BOOKING_LAUNCH_RUNBOOK`. | blocked |

## شريحة التنفيذ في هذه المراجعة

1. **Fresh AAL2:** العمليات التالية لا تقبل جلسة AAL2 قديمة: اعتماد/رفض الدفع، الاسترداد، منح/سحب الأدوار وتعديل مصفوفتها، وإعدادات التشغيل التي تتضمن وسائل الدفع. تتحقق الخوادم من AMR بعد تحقق user/AAL2 الحالي، وتقبل TOTP أو WebAuthn خلال 10 دقائق فقط. صفحة `reauth=1` تطلب رمزًا جديدًا بدل التحويل التلقائي.
2. **صدق التقارير:** `getReports()` يميز `ready` و`unconfigured` و`error`. لا تظهر صفحة التقارير KPIs صفرية عند فشل المصدر، ولا تسمح بحفظ لقطة حين لا تكون البيانات قابلة للقراءة.

## Evidence وقيود الرحلات الرأسية

- الحجز، الشراء/التسليم، المحتوى، والإدارة لها عقود محلية وaudits مصدرية؛ إثباتها المتصل يحتاج staging مفوضًا بعد 044→045 ونقطة recovery.
- لا يوجد نجاح payment webhook أو sender أو scanner أو CDN/WAF/monitoring حي في هذه الدورة، ولا يُستنتج من نجاح build.
- اختبارات public Playwright تغطي 1440 و390 ضمن config عام فارغ عمدًا؛ اختبارات admin/customer المعتمدة على Supabase تظل محجوبة كي لا تكتب على بيانات حية.

## P0 / P1 / P2 المتبقية

- **P0:** staging مع recovery/PITR قابل للاستعادة؛ التحقق من Auth Site URL/redirect allow-list؛ تفويض تطبيق 044–047 بالترتيب؛ محتوى/سياسات/أسعار/حقوق إعلام معتمدة؛ تدوير credential/مالك dashboard MFA حسب runbooks.
- **P1:** provider الدفع/webhooks، sender، analytics/consent، malware scanner، monitoring/WAF/CDN، تقرير CSV/date-range المتقدم وlive failure drills.
- **P2:** image derivatives/external processing بعد اختيار provider؛ تحسينات تقارير غير لازمة لإطلاق عربي آمن.

## OWNER ACTION REQUIRED

1. أنشئي/حددي **staging منفصلًا** ووفري recovery point أو PITR قابلًا للتحقق، وسمّي مسؤولة restore.
2. تحققي من Site URL وredirect allow-list في لوحة Supabase للقيم الدقيقة لـlocal/staging/production، من دون wildcards زائدة.
3. بعد ذلك فقط، فوضي نافذة staging مستقلة لتطبيق `044` ثم `045` ثم `046` ثم `047` مع حسابات اختبار disposable.
4. اعتمدي النصوص القانونية، حقوق الصور، المحتوى والأسعار والسياسات الفعلية، ثم هيئي أي provider دفع/إرسال/مراقبة تريدين تشغيله.

## القرار

**LOCAL READY — EXTERNAL SETUP REQUIRED**
