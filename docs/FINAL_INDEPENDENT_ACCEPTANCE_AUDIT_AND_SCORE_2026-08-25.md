# مراجعة القبول النهائية المستقلة والتقييم — 2026-08-25

**نوع الجولة:** قبول مستقل read-only بعد تنفيذ مسار التطوير المحلي.  
**نطاق الكتابة:** هذا التقرير فقط. لم يُعدّل كود التطبيق أو قاعدة البيانات أو أي خدمة خارجية، ولم تُقرأ أسرار أو ملفات بيئة.  
**بيئة الفحص:** شجرة العمل المحلية في `D:\claude`، مع تشغيل محلي معزول لا يحمل إعدادات Supabase أو مفاتيح.  
**تعريف الحالة:** `verified-local` = دليل منفذ محليًا؛ `source-reviewed` = فحص كود/ترحيل؛ `unverified` = لا دليل في البيئة الصحيحة، ولا يمنح نقاط تشغيل حي.

## 1. الحكم التنفيذي

1. التنفيذ المحلي الحالي متماسك ومتقدم: يمر بناء الإنتاج المعزول، وفحص الأنواع وlint، واختبارات الواجهة العامة، وتدقيقات المسارات والأمن والإدارة والبيانات المحلية.
2. لا يثبت ذلك قبولًا إنتاجيًا؛ بيئة الاختبار المتصفح تُفرّغ جميع إعدادات Supabase عمدًا، لذلك لا تختبر حسابًا أو قاعدة بيانات أو دفعًا أو تخزينًا أو SMTP أو CDN/WAF فعليًا.
3. الدليل الإنتاجي المقروء سابقًا بتاريخ 2026-08-20 يثبت أن 043 موجود في مشروع الإنتاج آنذاك، لكنه يثبت كذلك أن 044 غير مطبق، وأن المسارات القديمة للحجز تحتاج التصحيح 045.
4. لا توجد في هذه الجولة أي قراءة جديدة من staging أو production؛ لذا فحالة كل ادعاء خارجي اليوم هي `unverified`، بما في ذلك ما قد يكون تغير بعد 2026-08-20.
5. تسجيل الحجز الجديد، الشراء، إثبات الدفع، الموافقة/الاسترداد، منح/سحب الوصول، والتنزيل/الفيديو محققة في المصدر واختبارات العقد المحلية، لكنها ليست مقبولة E2E في بيئة مربوطة صحيحة.
6. لوحة الإدارة واسعة ومنظمة وتعرض الحالة الصادقة عند غياب التهيئة؛ غير أن تشغيلها بواسطة أدوار حقيقية وMFA حقيقي وبيانات حقيقية لم يثبت.
7. يوجد مانع أمان/تشغيل معروف في خط أساس الحجز الإنتاجي السابق: RPC قديم قابل للتنفيذ من `anon` وإدراج مباشر لحجز pending لمستخدم موثق؛ التصحيح المحلي 045 لا يفيد قبل تطبيقه والتحقق منه في staging ثم الإنتاج بتفويض منفصل.
8. لا يوجد دليل استعادة موثق: تقرير ما قبل الطرح يسجل PITR معطلاً ولا نقطة استرداد أو تجربة restore/rollback.
9. لم تثبت قائمة Auth redirect أو النطاق القانوني، ولا WAF/CDN، ولا المراقبة والتنبيهات، ولا مزود دفع/بريد/فحص برمجيات خبيثة، ولا المحتوى والسياسات القانونية المعتمدة.
10. لذلك لا يجوز استخدام نجاح Local أو `build` أو archive كعبارة `PRODUCTION READY`.
11. **النتيجة الرسمية النهائية: 54/100.** وهي نتيجة قبول حالية لا تقييم لجودة الشفرة فقط.
12. **قرار الإطلاق: `BLOCKED — VERIFICATION REQUIRED`.** يلزم إغلاق P0 وإثبات بوابات staging/production الصحيحة قبل أي إطلاق.

## 2. نطاق المراجعة والحدود

| المسار | ما فُحص فعليًا | حالة الدليل | حد المراجعة |
|---|---|---|---|
| Frontend/RTL/A11y | صفحات ومكونات المصدر، build، Playwright العام ولقطتا 1440×900 و390×844 | `verified-local` | لا قارئ شاشة، ولا 768px، ولا 200% zoom، ولا جلسة عميل حقيقية |
| Backend/API | Server actions، proxy، scripts وعقود المصدر | `source-reviewed` / `verified-local` | لم تنفذ RPCs أو API على قاعدة بيانات مربوطة |
| Database/RLS | الترحيلات 043–047 وعقود التحقق، وتقرير preflight المقروء سابقًا | `source-reviewed`; الإنتاج الحالي `unverified` | لم يجر اتصال أو migration أو query جديد |
| Authentication/Authorization | proxy، MFA/AAL2، فاحص fresh assurance، أدوار وصلاحيات المصدر | `verified-local` | لا TOTP أو إعادة مصادقة أو redirect حي |
| Admin | مسارات الإدارة، server-side actions، audit، قائمة الجاهزية | `source-reviewed` / `verified-local` | لا حسابات إدارية/مصفوفة RBAC حية |
| booking/payment/storage/entitlements | العقود، RLS المقصود، فاحصات محلية | `verified-local` / `source-reviewed` | لا توافر/دفع/Storage/entitlement حقيقي |
| Hosting/CDN/WAF | إعدادات المصدر والوثائق فقط | `unverified` | لا DNS أو dashboard أو headers خارجية فُحصت |
| Monitoring/backups | شاشة حالة النظام، الوثائق، preflight السابق | `source-reviewed`; حي `unverified` | لا alert أو backup/PITR أو restore drill |

**حد الاستقلال:** لم يُستخدم تقرير التنفيذ كدليل كافٍ بذاته؛ تمت مراجعة الكود والاختبارات وإعداداتها. استُخدم `docs/LIVE_READONLY_PREFLIGHT_2026-08-20.md` فقط كدليل تاريخي محدود وموسوم، لا كاستعلام حي اليوم.

## 3. بطاقة النقاط

| المحور | الوزن | نقاط القبول | الدليل والخصم الرئيس |
|---|---:|---:|---|
| الرحلات E2E | 15 | 6 | الصفحات العامة محليًا فقط؛ لا رحلة حجز/شراء/دفع/وصول كاملة في البيئة الصحيحة |
| Frontend وUX وRTL وA11y | 10 | 8 | RTL والسمات وskip-link وعدم overflow في 390 مثبتة محليًا؛ لا فحص قارئ شاشة/200%/768 |
| Backend/API والمنطق | 10 | 8 | actions وعقود منع التزوير/الموافقة راجعت؛ لا تنفيذ على قاعدة حقيقية |
| سلامة/أداء قاعدة البيانات | 10 | 5 | ترحيلات وإجراءات منع التداخل في المصدر؛ 044–047 لم تثبت في staging/الإنتاج |
| Auth/Authz والأمن والخصوصية | 12 | 8 | proxy وAAL2 وfresh step-up في المصدر؛ redirect وTOTP وACL/RLS الحالية غير مثبتة |
| تحكم الإدارة التشغيلي | 12 | 8 | تغطية مصدرية واسعة وإجراءات ذات audit؛ تشغيل حقيقي مع أدوار وبيانات غير مثبت |
| الحجز/الدفع/التخزين/الوصول | 12 | 5 | تصميم وعقود محلية قوية؛ لا دفع/Storage/حجز حي، وخط الأساس السابق للحجز يحتاج تصحيحًا |
| Hosting/CDN/WAF | 6 | 1 | إعدادات/نية فقط؛ لا دليل نطاق أو TLS أو headers أو WAF أو cache حي |
| Monitoring/resilience/backups | 8 | 1 | واجهة حالة نظام مصدرية؛ لا alert ولا PITR/restore موثق |
| الأداء وSEO وجودة الإصدار | 5 | 4 | build وroute/security audits؛ لا Core Web Vitals/Lighthouse أو فحص SEO حي |
| **المجموع** | **100** | **54/100** | لا تُمنح نقاط تشغيل حي غير مثبتة |

## 4. الدرجات الثلاث

| الدرجة | النتيجة | معناها |
|---|---:|---|
| جودة التنفيذ (Implementation Quality) | **82/100** | تقدير جودة المصدر والعقود والاختبارات المحلية، لا يساوي قبول تشغيل حي |
| جاهزية الإنتاج (Production Readiness) | **38/100** | تشغيل خارجي، بيانات، مزودون، استعادة، ومراقبة؛ معظمها `unverified` أو غير مهيأ |
| **النتيجة الرسمية النهائية** | **54/100** | أقل من أي تقييم تجميلي؛ تخضع لسقف 69 لعدم إثبات الرحلة الأساسية E2E، لكنها أدنى منه أصلًا |

**السقوف المطبقة:** عدم اكتمال حجز/شراء E2E في بيئة صحيحة يضع سقفًا 69. عدم وجود PITR/restore وcritical monitoring مثبتين يضع سقفًا 84. عدم اكتمال staging/migrations/integrations يجعل جاهزية الإنتاج لا تتجاوز 79. لا يُطبق سقف 49 لأن هذه الجولة لم تثبت استغلال تجاوز وصول أفقي أو إداري حي؛ لكنها تسجل مانع P0 تاريخيًا يجب إغلاقه.

## 5. قرار الإطلاق

# `BLOCKED — VERIFICATION REQUIRED`

لا يوجد تفويض، ولا دليل، لتغيير هذا القرار اليوم. نجاح `pnpm check:deploy` المحلي لا يغيره.

## 6. النتائج المفتوحة

### P0 — مانعات الإطلاق

| المعرّف | الطبقة | الدليل | الأثر | إعادة الإنتاج/التحقق الآمن | الإصلاح الآمن |
|---|---|---|---|---|---|
| P0-01 | DB / booking / authorization | preflight 2026-08-20: 044 غائبة؛ `create_booking_order` القديمة executable للـ anon؛ RLS تسمح بإدراج pending ذاتي. المصدر المحلي يحتوي 045 التصحيحي | تجاوز عقد hold/availability/policy للحجز وطرح مسار قديم غير مقبول | في **staging فقط** بعد backup: افحص ACL/RLS، ثم مصفوفة anon/auth/customer/admin ومحاولات insert/RPC مرفوضة | طبّق 044 ثم 045 بصورة forward-only بعد نقطة استعادة، وتحقق catalog وE2E؛ لا تطبق في الإنتاج دون تفويض منفصل |
| P0-02 | backups / resilience | preflight السابق: `pitr_enabled: false` ولا recovery point أو restore owner موثق | لا يمكن إثبات قدرة التعافي من خطأ migration أو حادث بيانات | يثبت المزود PITR/backup حديثًا ثم restore ناجح في بيئة معزولة موثقة | تمكين/توثيق recovery point وrunbook ومالك الاستعادة وتجربة restore قبل أي migration |
| P0-03 | Auth / hosting | قائمة Site URL وredirect allow-list وصحة النطاق لم تفحص؛ `proxy.ts` يعتمد Auth/MFA | احتمال فشل callback/recovery أو إعادة توجيه غير مصرح بها | مراجعة dashboard المالك دون تصدير bundle سري؛ اختبار register/login/reset/MFA على النطاقات المعتمدة | تثبيت canonical domain والـ allow-list الضيقة واختبار كل redirect في staging ثم production |
| P0-04 | التشغيل/المحتوى/القانوني | صفحات الخصوصية والشروط والاسترداد تعلن صراحة أنها مسودات، و`getContentReadiness()` يعيد legal blocked | لا يمكن إطلاق تجاري/جمع بيانات باعتبار السياسات أو الكتالوج أو الدفع مكتملة | اعتماد المالكة والمراجعة القانونية، ثم نشر نسخة وسياسة دفع/استرداد وبيانات خدمة حقيقية | اعتماد نصوص قانونية ومحتوى وسعر وتوافر وقنوات دعم حقيقية، مع مراجعة ما يظهر للعميل |

### P1 — مرتفعة

| المعرّف | الطبقة | الدليل | الأثر | التحقق الآمن | الإصلاح الآمن |
|---|---|---|---|---|---|
| P1-01 | payment / entitlements | فاحصات commerce موجودة لكن مهيأة لاستخدام بيئة وبيانات disposable؛ لا نتيجة sandbox/provider | لا إثبات webhook/idempotency/reconciliation أو refund فعلي | sandbox مع معاملات اختبار وبطاقات/مراجع اختبار فقط | تنفيذ حالة الدفع والويبهوك والتسوية والـ refund ثم اختبار الازدواج والانقطاع |
| P1-02 | monitoring / incidents | `admin/system` يعرض أحداثًا من `system_events`؛ لا دليل Sentry/log sink/alerts/on-call | قد تمر أعطال أو محاولات أمنية بلا تنبيه أو زمن استجابة | حقق تنبيه اختبار غير مدمر لكل قناة حرجة | فعّل error/uptime/security/payment alerts وrunbook ومالك مناوبة |
| P1-03 | CDN / WAF / TLS | لا فحص dashboard أو DNS أو response headers | لا إثبات HTTPS/HSTS/cache/WAF/rate limiting خارجي | فحص read-only للنطاق النهائي وdashboards بعد تفويض البيئة | ضبط CDN/WAF وCSP/headers وrate-limit rules ثم فحص مستقل |
| P1-04 | storage / delivery / notifications | التحميل يحوي validation محليًا؛ scanner اختياري، والبريد outbox آمن افتراضيًا؛ لا provider proof | لا إثبات كشف ملفات أو إرسال/ارتداد أو private-object delivery حقيقي | staging: ملفات سليمة/مرفوضة، signed URLs، revoke entitlement، رسائل اختبار | وصل scanner وmail provider fail-closed/observed، واختبر audit وعدم تسرب tokens |
| P1-05 | E2E / RBAC | Playwright العام متعمد بلا Supabase؛ لا customer/admin حقيقيان | لا إثبات شراء أو حجز أو MFA أو صلاحيات أو recovery أو حالات فشل | staging disposable identities: customer وstaff وowner، مع مسارات denial | أضف/نفذ suite E2E محكومة وامسح بياناتها بعد اكتمالها |
| P1-06 | reporting / data export | reports تعرض حالة unconfigured/error بصدق، لكن لا تحقق CSV أو range/timezone أو reconciliation ببيانات فعلية | قرارات تشغيلية أو تصدير قد لا يتطابقان مع المصدر | بيانات staging معروفة وحساب totals/ranges يدويًا | اختبار التقارير والتصدير والصلاحيات وعدم ظهور الصفر الكاذب |

### P2 — تحسينات قبول وجودة

| المعرّف | الطبقة | الدليل | الأثر | التحقق/الإصلاح |
|---|---|---|---|---|
| P2-01 | accessibility / responsive | الاختبار يغطي 390 وdesktop وskip-link فقط | لا برهان عند 768px أو 200% أو قارئ شاشة أو reduced motion | اختبر لوحة المفاتيح، NVDA/VoiceOver، 200%، 768px، تباين ومحتوى طويل |
| P2-02 | SEO / legal | `src/app/sitemap.ts` يدرج `/privacy` و`/terms` و`/refund` و`/disclaimer`، رغم أن ثلاثة منها مسودات قانونية غير معتمدة | قد تفهرس محركات البحث مسودات لا ينبغي اعتبارها سياسة نهائية | قرر قبل الإطلاق: `noindex`/إخراج من sitemap حتى الاعتماد أو نشر النص المعتمد |
| P2-03 | performance | لا Lighthouse أو Web Vitals أو قياس cache/image payload على رابط نهائي | لا أرقام LCP/INP/CLS أو budget فعلي | اجمع قياسات production-like بعد CDN والنطاق، ثم عالج أكبر payload/CLS إن ظهر |

## 7. ما يعمل بصورة صحيحة ضمن الدليل المتاح

| المجال | النتيجة الفعلية |
|---|---|
| بوابة الإصدار المحلية | `pnpm check:deploy` اكتمل بنجاح: type-check، lint، archive/delivery/booking/permissions/fresh-assurance/cms checks، build معزول، Playwright، وكل audits النهائية |
| الواجهة العامة | 39 اختبارًا ناجحًا وواحد متخطى عمدًا؛ الصفحات العامة لا تعطي 5xx أو ترميزًا تالفًا في الاختبار، وتدعم RTL/الوضع الداكن وskip-link |
| الحماية عند غياب التهيئة | اختبارات المتصفح تثبت redirect مجهول الهوية من `/dashboard` و`/admin/overview`، وتثبت رسائل حالة صادقة بدل وعود دفع/اتصال غير مهيأة |
| AAL2 الحساس | فاحص العقد المحلي يثبت فرض حداثة TOTP لعشر دقائق على الموافقات/الرفض/الاسترداد وتغيير الدور وإعداد الدفع، ويمنع `reauth=1` من تجاوز جلسة AAL2 قديمة |
| الحجز المصدرى | فاحصا booking المحليان يغطيان hold/expiry/duplicate/cancel/reschedule ورفض المسار القديم/المباشر بحسب عقد 045 في المصدر |
| المحتوى والإدارة | تدقيق CMS المحلي يثبت registry/validation/permissions/revisions؛ تدقيق الإدارة يثبت وجود حماية المسارات وإجراءاتها المطلوبة في المصدر |
| صراحة التشغيل | لوحة حالة النظام وطبقة reports تتجنبان عرض بيانات غير مهيأة كأصفار تشغيلية؛ صفحات legal تصف نفسها كمسودات بدل ادعاء التزام قانوني |
| أمان release artifact | فاحص archive يمنع أسرارًا ومسارات محرمة حتى داخل archive متداخل؛ تدقيق الأمن المحلي يمر |

## 8. منفذ لكنه غير مثبت في البيئة الصحيحة

| القدرة | الحالة |
|---|---|
| migrations 044–047، RLS، ACL، indexes وRPCs الجديدة | `source-reviewed`، `unverified` على staging/production |
| حجز مجاني/مدفوع/باقة، التوافر، holds، buffers، exceptions، cancellation/reschedule | `verified-local` contract فقط؛ `unverified` E2E |
| checkout، proof، approval/rejection/refund، reconciliation، entitlements | `source-reviewed` / فاحصات مخصصة موجودة؛ `unverified` sandbox/provider |
| تنزيل الكتب، الفيديو، workshop delivery، revocation وStorage policy | 043 تاريخيًا قُرئ في الإنتاج؛ الحالة الحالية وruntime `unverified` |
| MFA/TOTP، password reset، redirect، role/permission denial/allow | المصدر موجود؛ `unverified` على هوية حقيقية |
| إدارة الصفحات/الأقسام والكتالوج والوسائط والتقارير | واجهات وإجراءات مصدرية موجودة؛ `unverified` مع بيانات وأدوار تشغيلية |
| البريد، scanner، analytics/telemetry، alerting، backups | adapters/نوايا أو واجهة حالة فقط؛ `unverified` أو غير مهيأ |

## 9. مصفوفة اكتمال الإدارة

| مجال المالك/الفريق | CRUD/تشغيل في المصدر | صلاحية خادمية وتدقيق | قبول حي |
|---|---|---|---|
| الصفحات، الأقسام، hero/navigation والنسخ | نعم، مع revisions/publish controls | نعم بحسب actions/audit المحلية | `unverified` |
| الصور والوسائط والبدائل والنشر | نعم | نعم، مع فحوص metadata/usage محلية | `unverified` للـ Storage/scanner |
| الخدمات والأسعار والتوافر والمواعيد | نعم | نعم، عقد booking server/RPC | `unverified` |
| الحجوزات وإعادة الجدولة والإلغاء | نعم | نعم في المصدر | `unverified`، وP0-01 مفتوح |
| المنتجات والكتب والدورات والورش والمقالات | نعم | نعم وفق CMS/catalog audits | `unverified` ببيانات حقيقية |
| الطلبات وإثباتات الدفع والموافقات والاستردادات | نعم | نعم مع fresh AAL2 للعالي الأثر | `unverified` مع payment provider |
| العملاء، الرسائل، الملاحظات والمراجعات | نعم | نعم في المصدر/CRM script | `unverified` |
| الفريق والأدوار والصلاحيات | نعم | role/permission/fresh-assurance source contracts | `unverified` مع MFA وأدوار حية |
| التقارير وحالة النظام وإعدادات التشغيل | نعم، مع عدم عرض أصفار مضللة | نعم بحسب source review | `unverified` للبيانات والتصدير |

**نتيجة المصفوفة:** لا يوجد دليل على «زر تجميلي» في المسارات المفحوصة؛ لكن عبارة تحكم تشغيلي كامل لا تُقبل قبل تشغيل المصفوفة أعلاه بحسابات وأدوار وبيانات واقعية في staging.

## 10. مصفوفة الرحلات E2E

| الرحلة | الحالة | الدليل الحالي | شرط القبول الناقص |
|---|---|---|---|
| زائر → محتوى/خدمة/حجز | جزئي | صفحات عامة وtruthful empty state محليًا | توافر منشور حقيقي وcalendar/slot وhold في staging |
| عميل → تسجيل/تحقق/استعادة | غير مثبت | صفحات/proxy المصدرية | بريد وredirect وsession حقيقيان |
| عميل → checkout → دفع → وصول | غير مثبت | contracts/actions محلية | sandbox payment/webhook/idempotency وentitlement/end-user delivery |
| عميل → حجز مدفوع/باقة → تأكيد/إلغاء/إعادة جدولة | غير مثبت | فاحص booking محلي | 044+045 مطبقتان وconcurrency/notifications في staging |
| مشرف → MFA → إدارة محتوى/أسعار/توافر | غير مثبت | source + fresh-assurance verifier | TOTP حقيقي ودور محدود/غير مخول ومراجعة audit rows |
| مشرف → موافقة/رفض/استرداد → تقارير | غير مثبت | source contract | provider reconciliation وaudit وبيانات أصلية/اختبارية |
| مالك → فريق/roles → revoke | غير مثبت | permission/AAL2 source contracts | users حقيقيون وallow/deny/revoke في staging |
| فشل خدمة/دفع/Storage/بريد → تنبيه وتعافٍ | غير مثبت | حالة نظام مصدرية فقط | fault injection آمن، alert، runbook، restore drill |

## 11. الأمن والخصوصية

| التحكم | الحكم |
|---|---|
| عدم طباعة الأسرار | ملتزم في هذه الجولة؛ لم تُقرأ `.env` أو `supabase/.temp` |
| حماية dashboard/admin للمجهول | `verified-local` عبر Playwright و`proxy.ts` |
| MFA وAAL2 وحداثة إعادة المصادقة | `source-reviewed` و`verified-local` contract؛ runtime `unverified` |
| authorization/RLS/RPC privilege | 043 لديه دليل catalog تاريخي جيد؛ 044–047 والحالة الحالية `unverified`، وP0-01 مفتوح |
| private delivery/token hygiene | local validation/schema checks جيدة؛ Storage/runtime `unverified` |
| Privacy/legal | لا تدعي الصفحات أن المسودات قانون نافذ، وهذه نقطة إيجابية؛ الاعتماد والنشر والـ noindex قبل الاعتماد ما زالان مفتوحين |
| security scanning | audit مصدر محلي ناجح؛ لا فحص dependency advisory أو penetration test أو WAF runtime في هذه الجولة |

## 12. الأداء وإتاحة الوصول وSEO

| المجال | قياس/دليل فعلي | الحكم |
|---|---|---|
| build | build معزول نجح وأنتج 60 route في سجل البوابة | `verified-local`، ليس قياس سرعة حي |
| المتصفح | 39 passed / 1 skipped، Playwright Chromium desktop وPixel 7 | `verified-local` |
| responsive | لقطتا 1440×900 و390×844، وفحص no-horizontal-overflow للجوال على `/` و`/booking` و`/courses` | `verified-local` ومحدود |
| accessibility | skip-link، keyboard focus، dark-theme persistence، وعدم ترميز Arabic تالف | جزئي؛ قارئ الشاشة و200% و768 وreduced-motion `unverified` |
| performance | لا LCP/INP/CLS/TBT/transfer-size أو Lighthouse مسجل | `unverified`؛ لا نقاط قياس حي |
| SEO | `sitemap.ts` وmetadata موجودان في المصدر؛ الصفحات القانونية المسودة في sitemap | جزئي؛ لا crawl/index/canonical/robots حي |

## 13. جاهزية البنية التحتية

| العنصر | الحالة | دليل/مانع |
|---|---|---|
| Hosting وDNS والنطاق الأساسي | `unverified` | لا dashboard/DNS أو تفويض قراءة خارجي في الجولة |
| TLS/HSTS/security headers | `unverified` | لا response-header فحص للنطاق النهائي |
| CDN/cache/image delivery | `unverified` | لا قياس edge/cache أو invalidation |
| WAF/rate limiting/DDoS | `unverified` | لا rule/firewall logs أو probe آمن |
| Supabase project identity ومخطط الإنتاج الحالي | `unverified` اليوم | preflight التاريخي فقط، ولا قراءة جديدة |
| migrations 044–047 | غير مطبقة وفق preflight السابق؛ الحالية `unverified` | P0-01 |
| backup/PITR/restore | مانع | preflight السابق سجّل PITR معطلًا ولا restore evidence |
| monitoring/uptime/error/payment alerts | `unverified` | لا إثبات channel أو owner أو test alert |

## 14. مسار الوصول إلى 100/100

**الحساب:** البداية 54. البنود أدناه تستعيد نقاطًا فريدة غير متداخلة مجموعها 46، فتصل إلى 100 فقط إذا نجحت اختبارات القبول المحددة. ليس ترتيبًا لتطبيق تغييرات خارجية تلقائيًا.

| البوابة | الأولوية/المعرّف | المهمة | السبب/الطبقات | الجهد | الخطر | التبعيات | اختبار القبول | المالك | نقاط مستعادة |
|---|---|---|---|---|---|---|---|---|---:|
| 1: أمان P0 | P0-02 | إثبات backup/PITR وrestore/rollback drill | DB, resilience | M | عالٍ | مزود Supabase ومالك الاستعادة | recovery point حديث + restore ناجح موثق | Owner + Provider | 5 |
| 1: أمان P0 | P0-01 | staging: تطبيق 044 ثم 045 forward-only والتحقق من ACL/RLS | DB, booking, authz | M | عالٍ | backup، نافذة تغيير، موافقة صريحة | catalog + anon/auth/admin denial/allow + concurrent holds | Developer + Owner | 5 |
| 1: أمان P0 | P0-03 | تثبيت Site URL/redirect allow-list واختبار auth | auth, hosting | S | عالٍ | canonical domain | register/login/reset/MFA redirects على النطاق المعتمد | Owner + Provider | 2 |
| 1: أمان P0 | P0-04 | اعتماد القانوني والمحتوى التجاري والتوافر | privacy, content, booking, payment | M | عالٍ | مالكة/مراجعة قانونية | نشر نصوص معتمدة وكتالوج/سعر/دعم حقيقي | Owner | 3 |
| 2: اكتمال المنتج | P1-05 | تنفيذ E2E محكوم بهويات وبيانات disposable | E2E, auth, admin | M | متوسط | staging + mail/auth | عميل/موظف/مالك؛ allow/deny/revoke/failure | Developer | 8 |
| 2: اكتمال المنتج | P1-01 | اعتماد sandbox payment ثم webhooks والتسوية | payment, entitlements | L | عالٍ | حساب مزود الدفع | duplicate/retry/reject/refund/reconcile بلا منح مضاعف | Owner + Developer + Provider | 5 |
| 2: اكتمال المنتج | P1-04 | اختبار storage delivery، scanner، البريد | storage, notifications | M | متوسط | مزودا scanner/mail | good/bad file، signed access/revoke، delivery/bounce | Developer + Provider | 3 |
| 2: اكتمال المنتج | P1-06 | تحقق تقارير وتصدير بتواريخ Cairo مع بيانات معروفة | admin, reporting | S | متوسط | staging data | totals/ranges/CSV/RBAC تطابق مصدر الحقيقة | Developer | 3 |
| 3: تشغيل الإنتاج | P1-02 | فعّل المراقبة والتنبيهات وrunbooks | monitoring, incidents | M | عالٍ | مزود المراقبة وon-call | test alerts للخطأ/uptime/payment/security واستجابة موثقة | Owner + Provider | 4 |
| 3: تشغيل الإنتاج | P1-03 | تحقق CDN/WAF/TLS/headers وrate limits | hosting, CDN, WAF | M | عالٍ | provider/domain | فحص مستقل للـ headers/cache/WAF rules ورفض traffic آمن | Owner + Provider | 5 |
| 4: التميز | P2-01 | إتاحة وصول شاملة وresponsive إضافي | frontend, A11y | M | منخفض | build staging | keyboard/SR/200%/768/reduced motion/contrast | Developer | 2 |
| 4: التميز | P2-02/P2-03 | SEO/perf على رابط نهائي | SEO, performance | M | منخفض | CDN/domain/content approved | noindex أو نص قانوني معتمد؛ Lighthouse/Web Vitals budgets ناجحة | Developer + Owner | 1 |

**ترتيب التنفيذ الملزم:** لا تبدأ Gate 2 أو production rollout قبل نجاح Gate 1. Gate 3 لا يمنح جاهزية دون Gate 2. Gate 4 يحسن الدرجة لكنه لا يعالج مانع P0.

## 15. المطلوب من المالكة

1. تفويض مستقل ومحدد للبيئة قبل أي staging migration أو اختبار كتابة: project ref، النافذة، البيانات المسموح بها، ومالك rollback.
2. توفير/تأكيد نقطة PITR أو backup واسم مسؤول restore وإقرار تجربة الاستعادة.
3. اعتماد النطاق الأساسي وقائمة redirect URLs في لوحة المزود، من دون إرسال أو طباعة أسرار.
4. اعتماد النصوص القانونية النهائية، وسياسة الاسترداد، وبيانات الدعم، والمحتوى والأسعار والتوافر الفعلية قبل نشرها.
5. تفويض وربط sandbox لمزود الدفع والبريد/scanner والمراقبة، وتسمية مالك التنبيهات.
6. بعد إثبات staging، تفويض منفصل جديد فقط لقراءة/كتابة production وفق runbook مع backup fresh وchange window.

## 16. فهرس الأدلة

| المعرّف | الدليل | النوع |
|---|---|---|
| E-01 | `pnpm check:deploy` في 2026-08-25 | تنفيذ محلي ناجح؛ يشمل type-check/lint/build/audits |
| E-02 | `tests/e2e/public.spec.ts` | 39 passed، 1 skipped، Chromium desktop وPixel 7، مع إعدادات Supabase فارغة عمدًا في `playwright.config.ts` |
| E-03 | `scripts/verify-booking-local.mjs`, `scripts/verify-booking-permissions-local.mjs` | عقد حجز محلي وفحص source policy |
| E-04 | `scripts/verify-fresh-admin-assurance.mjs`, `src/lib/auth/permissions.ts` | عقد fresh AAL2 محلي |
| E-05 | `scripts/audit-{routes,ux,colors,security,admin,media,commerce,catalog,booking,db,launch}.mjs` | تدقيقات مصدرية/محلية ناجحة ضمن E-01 |
| E-06 | `src/app/admin/system/page.tsx`, `src/lib/data/cms.ts`, `src/lib/data/reports.ts` | سلوك جاهزية صادق عند غياب التهيئة |
| E-07 | `src/proxy.ts` وواجهات auth/admin | مراجعة source للحماية؛ لا اختبار هوية حية |
| E-08 | `supabase/migrations/044_booking_operational_workflow_local_only.sql` وما يليها، و045 التصحيحي | موجود محليًا فقط؛ لا استنتاج تطبيق خارجي |
| E-09 | `docs/LIVE_READONLY_PREFLIGHT_2026-08-20.md` | دليل إنتاجي تاريخي read-only: 043 موجود، 044 غائب، ومخاطر booking/recovery/redirect معلنة |
| E-10 | `src/app/(public)/{privacy,terms,refund,disclaimer}/page.tsx` و`src/app/sitemap.ts` | مسودات قانونية صريحة وملاحظة sitemap |
| E-11 | `test-results/public-public-experience-c-cc300--local-states-for-visual-QA-desktop-chromium/launch-home-desktop-1440.png` و`test-results/public-public-experience-c-cc300--local-states-for-visual-QA-mobile-chromium/launch-home-mobile-390.png` | فحص بصري محلي محدود |

## الخلاصة القابلة للتدقيق

المنصة **ليست مخفقة محليًا**؛ بالعكس، السطح البرمجي والاختبارات المحلية قويان. لكنها **غير مقبولة للإنتاج الآن** لأن الأدلة الحية للبيانات، والحجز المصحح، والدفع، وAuth، والاستعادة، والمراقبة والبنية الخارجية غير موجودة أو غير مسموح بفحصها ضمن هذه الجولة. أي ادعاء أعلى من `BLOCKED — VERIFICATION REQUIRED` سيكون غير مدعوم بالأدلة.
