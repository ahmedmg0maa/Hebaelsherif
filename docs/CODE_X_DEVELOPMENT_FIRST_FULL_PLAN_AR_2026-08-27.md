# خطة Code X الشاملة — التطوير أولًا

التاريخ: 2026-08-27  
المشروع: منصة هبة الشريف  
النسخة الحاكمة: المشروع الأساسي داخل `D:\claude` على الفرع `codex/master-merge-2026-08-27`  
المرجع التنافسي: `https://www.hebaelsawah.com/` للاستلهام التحليلي فقط، وليس للنسخ

## 1. الأمر التنفيذي الحاكم

نفّذ تطوير المنصة كاملًا، ولا تتوقف عند Backup/Restore أو أي بوابة مزود خارجي. بوابة الاستعادة تمنع فقط تطبيق migrations أو قبول Staging، ولا تمنع تنفيذ أو اختبار أو Commit الأعمال المحلية الآتية:

- Frontend وUI/UX.
- Backend وAPI contracts.
- Admin وCMS.
- قاعدة البيانات بصيغة migrations محلية forward-only دون تطبيق خارجي.
- Auth/Authorization/RLS policies والاختبارات المحلية.
- Booking/Commerce/Storage والاختبارات المحلية.
- Accessibility وSEO وPerformance.
- Unit/Integration/Playwright والوثائق.

عند وجود مانع خارجي، سجله `EXTERNAL GATE` واستمر في كل مسار مستقل عنه. لا تستخدم كلمة `BLOCKED` لوصف المشروع كله إلا إذا استُنفدت جميع الأعمال المحلية الآمنة فعلًا مع إظهار مصفوفة dependency تثبت ذلك.

## 2. النتيجة المطلوبة

منصة عربية RTL، دافئة وتحريرية، أقوى من المنافس في:

1. وضوح رحلة العميلة واتخاذ القرار.
2. المصداقية وعدم عرض سعر أو توافر أو نتيجة غير حقيقية.
3. الحجز والشراء والتسليم المحمي.
4. لوحة عميلة مفيدة وليست مجرد أرقام.
5. Admin حقيقي يتحكم في كل سطح عام.
6. الأمان والصلاحيات وسجل التدقيق.
7. سرعة الموبايل وإتاحة الاستخدام وSEO.
8. دليل قبول قابل لإعادة التشغيل قبل النشر.

لا تنسخ نصوص المنافس أو صوره أو هويته الداكنة/الذهبية أو Shopify trade dress. حافظ على هوية هبة الحالية، العربية، RTL، الشعار، الخطوط، الألوان، والصورة التعبيرية للمرأة المنقبة.

## 3. مبادئ المنتج الحاكمة

- قرار أساسي واحد واضح في كل شاشة.
- لا أسعار `0.00` غير مقصودة، ولا أزرار ميتة، ولا مجموعات فارغة معروضة كمنتج جاهز.
- لا Testimonials أو Press أو أرقام إنجاز مختلقة.
- لا تُعرض خدمة غير متاحة؛ يظهر Waitlist فقط إذا كان منفذًا فعليًا.
- لا Card walls؛ استخدم إيقاعًا تحريريًا: مساحات، صور ونصوص، timelines، قوائم، اقتباسات، مقارنات وأقسام ممتدة.
- كل وعد تشغيلي يأتي من إعداد Admin حقيقي: السعر، التوافر، مدة الوصول، سياسة الإلغاء، وقت الرد وطريقة التسليم.
- كل قسم عام له: مصدر بيانات + Admin + Permission + Audit + Preview + Publish/Schedule + Tests.
- لا تغيير Production أو DNS أو Nameservers أو الفرع الافتراضي.
- 043 مطبق Production ولا يُعاد. 044–047 لا تُطبق إلا على Staging بعد بوابة الاستعادة.

## 4. ترتيب التنفيذ الإجباري

ينفذ Code X المسارات التالية بالترتيب، مع Commit صغير ومراجع لكل Vertical Slice. بوابة Backup/Restore تعمل كمسار خارجي موازٍ ولا توقف المراحل 1–11.

### المرحلة 0 — Baseline وإغلاق الغموض

1. افحص branch وremote وHEAD وworking tree.
2. احفظ ملفات المالكة غير المتتبعة ولا تعدلها.
3. شغل الاختبارات الحالية وسجل baseline حقيقيًا.
4. أنشئ مصفوفة: `Implemented / Partial / Missing / Externally blocked`.
5. اربط كل feature مطلوب بملف/route/table/Admin consumer واختباره.

مخرج المرحلة: لا وصف عام؛ قائمة فجوات قابلة للتنفيذ مرتبة P0/P1/P2.

### المرحلة 1 — Design System وتجربة عربية ممتازة

1. توحيد typography والمسافات والألوان والأزرار والحقول والحالات.
2. ضبط RTL الكامل، focus، keyboard، contrast، reduced motion و390px.
3. إنشاء أنماط تحريرية متنوعة بدل المربعات المتكررة.
4. ضبط Header وNavigation وFooter والبحث وحالة الحساب.
5. تصميم حالات loading/error/empty/offline/404 بلا تضليل.
6. الحفاظ على الصورة التعبيرية الحالية وتوضيح أنها ليست صورة شخصية لهبة.

بوابة القبول: Story/preview لجميع الأنماط + axe + keyboard + screenshot regression للموبايل وdesktop.

### المرحلة 2 — الصفحة الرئيسية المحكومة بالكامل

تنفيذ وتحسين:

- Hero: وعد واضح، لمن الموقع، CTA أساسي وCTA ثانوي.
- شريط ثقة حقيقي يعتمد على بيانات موثقة فقط.
- «ابدئي من هنا» كرحلة قرار.
- خدمات مميزة وأسعار/تنسيقات/توافر حقيقي.
- مسار رحلة العميلة أو طريقة العمل.
- كتاب/دورة/ورشة مميزة عند النشر فقط.
- مقالات وموارد حديثة.
- Testimonials معتمدة وموافق عليها.
- Press/ظهور إعلامي موثق.
- Newsletter بموافقة صريحة.
- CTA ختامي واحد.

Admin المطلوب: ترتيب الأقسام، إظهار/إخفاء، النصوص، الصور، الأزرار، العناصر المميزة، Preview، Scheduling، revision وrestore.

بوابة القبول: تغيير Admin → حفظ → reload → preview → publish → ظهور عام مطابق، مع عدم ظهور أي قسم فارغ.

### المرحلة 3 — رحلة «ابدئي من هنا» والبحث العربي

#### `/start-here`

- مسار قصير غير تشخيصي.
- أسئلة وخيارات ونتائج محكومة من Admin.
- progress/back/edit وشرح سبب النتيجة.
- لا توصية بخدمة أو محتوى غير منشور.
- Versioning وPreview وPublish.
- عدم تخزين الإجابات أو تتبعها دون غرض وموافقة.

#### `/search`

- بحث عربي يتحمل اختلاف الهمزات والتاء المربوطة والمسافات.
- نتائج مجمعة: خدمات، كتب، دورات، ورش، مقالات وموارد.
- فهرسة المنشور فقط، ومنع drafts/Admin/private delivery.
- no-results recovery وروابط مقترحة حقيقية.

بوابة القبول: اختبارات relevance عربية + permission leakage + keyboard + published-only.

### المرحلة 4 — صفحات الثقة والهوية

#### `/about`

- قصة إنسانية، فلسفة العمل، المؤهلات، الحدود المهنية، لمن تناسب الخدمة ولمن لا تناسب.
- Timeline مؤهلات وظهور إعلامي بمصادر المالكة.
- عدم اختلاق ادعاء علاجي أو اعتماد.

#### `/testimonials`

- مراجعات موافق عليها ومربوطة بخدمة/طلب/حجز متى أمكن.
- consent/source/verification/display-name controls.
- فلترة حسب النوع دون كشف بيانات العميلة.

#### `/press`

- الجهة، التاريخ، النوع، الرابط الأصلي، مقتطف محدود، حقوق الصورة وحالة النشر.
- منع تقديم محتوى ذاتي كصحافة مستقلة.

#### `/faq`, `/contact`, legal pages

- FAQ محكوم ومتسق مع السياسات الفعلية.
- Contact purpose selector وrate-limit وAdmin inbox.
- Privacy/Terms/Refund/Disclaimer/Session Policy: version، effective date، approval، draft/noindex.

### المرحلة 5 — الكتالوج والمحتوى

#### الخدمات `/services`

- مقارنة واضحة بين الجلسات والدورات والكتب والورش والباقات.
- السعر، المدة، التنسيق، الوصول والتوافر من المصدر الحقيقي.

#### الدورات `/courses` و`/courses/[slug]`

- فلاتر outcome/topic/format.
- audience fit، prerequisites، curriculum preview، مدة الوصول، FAQs، reviews، CTA.
- عدم تسريب lesson أو resource محمي.

#### الكتب `/books` و`/books/[slug]`

- عرض تحريري، النسخة والصيغة والمقتطف المرخص ومدة الوصول وحدود التنزيل.
- عدم عرض مكتبة فارغة كمتجر جاهز.

#### الورش `/workshops` و`/workshops/[slug]`

- upcoming/live/recorded بوضوح.
- timezone، السعة، المقاعد، الإلغاء، الموارد والتسجيل إن كان موجودًا فعلًا.

#### المقالات `/articles` و`/articles/[slug]`

- فهرس موضوعي، featured/recent/evergreen.
- قراءة عربية مريحة، TOC للمقال الطويل، related content وArticle schema.
- draft/scheduled غير ظاهرين.

#### الموارد `/resources` و`/resources/[slug]`

- مقالات/فيديو/بودكاست في Hub واحد.
- topic/type/duration filters، transcript/captions، rights وrelated offer.
- لا صفحة فارغة ولا embed ميت.

بوابة القبول: Admin CRUD + revision/preview/publish + public parity + structured data + protected-content denial.

### المرحلة 6 — الحجز الكامل

رحلة العميلة:

1. اختيار خدمة قابلة للحجز.
2. عرض مواعيد حقيقية بتوقيت القاهرة.
3. اختيار slot وإنشاء hold مؤقت.
4. countdown واضح.
5. login/register دون فقد الحالة.
6. free/paid/package branching.
7. تأكيد واحد idempotent.
8. ظهور الحجز للعميلة والأدمن.
9. ICS صحيح.
10. cancellation/rescheduling حسب السياسة.

Admin:

- الخدمات القابلة للحجز.
- availability templates/exceptions/overrides.
- الحجز اليدوي المنضبط.
- جدول يوم/أسبوع/قائمة.
- holds وexpiry.
- طلبات الإلغاء وإعادة الجدولة.
- سياسات ورسوم/credits/refunds وسجل التدقيق.

الاختبارات الإلزامية: parallel race، double booking، hold expiry/release، DST/Cairo، duplicate submit، free/paid/package، cancellation/reschedule، permission denial وaudit.

ملاحظة: يمكن كتابة واختبار migrations/RPCs محليًا الآن. تطبيق 044–047 خارجيًا ينتظر بوابة Staging فقط.

### المرحلة 7 — Checkout والتجارة والمدفوعات

- Product/variant/bundle/coupon حقيقي.
- order summary واضح قبل الدفع.
- server-side price revalidation.
- idempotency ومنع duplicate orders/proofs.
- free/manual/sandbox/provider-ready paths حسب المهيأ فعلًا.
- payment proof آمن، review/approve/reject/refund/reconcile.
- entitlement واحد فقط لكل نجاح.
- حالات pending/failed/retry/cancelled/refunded صادقة.
- عدم الادعاء ببوابة دفع حية إذا لم تُهيأ.

Admin: الأسعار، العروض، الكوبونات، الطلبات، المدفوعات، الإثباتات، refunds، exports الآمنة والتقارير.

بوابة القبول: amount parity، coupon race، idempotency، proof privacy، approval/rejection/refund، audit وcustomer visibility.

### المرحلة 8 — لوحة العميلة والتسليم المحمي

صفحات إلزامية:

- `/dashboard`: next action، حجز قادم، تعلم مستمر، دفع معلق، إشعارات.
- `/dashboard/bookings`: القادم/السابق، إلغاء/إعادة جدولة، ICS.
- `/dashboard/orders` و`/dashboard/payments`: الحالة والخطوة التالية دون ملاحظات داخلية.
- `/dashboard/courses` و`/dashboard/courses/[slug]/learn`: progress/resume/resources.
- `/dashboard/books`: النسخ المملوكة والتنزيل الآمن.
- `/dashboard/workshops`: التسجيل والموارد/التسجيلات المصرح بها.
- `/dashboard/notifications`, `/profile`, `/settings`.

الحماية:

- signed URLs قصيرة العمر.
- حدود التنزيل والجهاز والجلسة المنفذة في 043.
- MIME/magic/size verification.
- watermark/forensic pipeline إذا كان منفذًا ومثبتًا فقط.
- entitlement revocation فوري.
- RLS isolation بين عميلتين.

### المرحلة 9 — برنامج Admin مستقل وكامل

الأدمن ليس مرحلة تجميل. كل صفحة يجب أن تثبت persistence، permissions، audit وتأثيرها على المستهلك الصحيح.

#### المحتوى والتسويق

- `/admin/pages`: الصفحة الرئيسية، الأقسام، الترتيب، Navigation، SEO، legal، preview/schedule/revisions.
- `/admin/articles`: المحتوى، tags، media، SEO، related، publish/archive.
- `/admin/reviews`: consent/source/verification/approve/feature/reject.
- `/admin/press`: المصدر والحقوق والتصنيف والنشر.
- `/admin/resources`: النوع، media/embed، transcript، topics، related offer.
- `/admin/assessments`: questions/options/results/mapping/version/publish.
- `/admin/media`: rights/alt/caption/credit/focal point/usages/archive/replace.

#### المنتجات والتعلم

- `/admin/products`: variants/bundles/prices/availability/publication.
- `/admin/courses` وcurriculum: modules/lessons/resources/preview/access.
- `/admin/books`: versions/files/excerpts/access/download policy.
- `/admin/workshops`: dates/capacity/delivery/registration/resources/recordings.

#### التشغيل والتجارة

- `/admin/bookings`: availability/holds/bookings/cancellation/reschedule/calendar.
- `/admin/orders`: transitions وfulfillment دون تعديل عشوائي للحالة.
- `/admin/payments`: proofs/approve/reject/refund/reconcile مع fresh MFA.
- `/admin/memberships`: plans/credits/duration/capacity/subscriptions.
- `/admin/inbox`: contact/conversation/status/assignment/reply evidence.
- `/admin/offers` و`/admin/coupons` و`/admin/reports` وsecure export.

#### العملاء والحوكمة

- `/admin/users` و`/admin/users/[id]`: Customer 360 مع حماية PII.
- `/admin/roles`: permission matrix حقيقية، منع self-escalation وlast-owner removal.
- `/admin/audit`: immutable/searchable/export-controlled.
- `/admin/security`: sessions، MFA، lockouts، events، revocation.
- `/admin/settings` و`/admin/system`: readiness، integrations، feature flags، provider checks دون أسرار.

بوابة القبول: مالكة مخولة تنشئ/تعدل → reload → preview/publish → يظهر الأثر للعميلة → يظهر audit؛ مستخدم بلا صلاحية يُرفض في UI والخادم وRLS.

### المرحلة 10 — Backend وDatabase وAPI محليًا

- راجع كل API route/RPC مقابل permissions وRLS وidempotency.
- منع client-authoritative price/status/role.
- إضافة migrations الجديدة بعد 047 بأرقام متسلسلة فقط.
- إنشاء migration contract tests وrollback-by-forward-fix plan.
- schema fingerprint محلي ومقارنة متوقعة لـStaging.
- rate limiting، validation، safe errors، structured logging وcorrelation IDs.
- no secret/PII/payment proof in logs.
- jobs للـhold expiry، scheduled publishing، notification retry حسب البنية الحالية.

لا يُطبق شيء على Production. عدم توفر اتصال خارجي لا يمنع كتابة واختبار الكود والعقود محليًا.

### المرحلة 11 — الجودة الشاملة والتحسين

شغّل وأصلح:

- TypeScript وESLint.
- Unit وIntegration.
- Database contracts وRLS/RPC permission tests.
- Booking race وhold expiry.
- Commerce/idempotency/refund.
- Admin controls وCMS-to-public.
- Storage/protected delivery.
- Secret scan وdependency/security audit.
- Production build وCloudflare/vinext build.
- Playwright على 390px وdesktop.
- axe/keyboard/focus/reduced-motion/contrast.
- SEO/canonical/sitemap/robots/structured data.
- broken links/dead buttons/error states.
- performance budgets: LCP/CLS/INP، image/font/script budgets.

الاختبارات الناجحة سابقًا لا تعفي feature جديدة من اختبارها. لا تحول اختبارًا خارجيًا إلى PASS باستخدام mock ثم تصفه بأنه حي.

### المرحلة 12 — بوابة المحتوى مع المالكة

أنشئ readiness queue داخل Admin، ولا تخترع المحتوى. المطلوب من المالكة فقط عند الحاجة:

- النصوص النهائية والعروض والأسعار.
- الصور الأصلية وحقوق استخدامها.
- المؤهلات والروابط الصحفية.
- Testimonials مع consent.
- بيانات الكتب والدورات والورش والملفات.
- FAQ والسياسات والقانونيات.
- بيانات الدفع والتواصل المصرح بها.

يمكن إنهاء code paths وAdmin placeholders الآمنة قبل ورود المحتوى، لكن لا تُنشر كبيانات حقيقية.

### المرحلة 13 — Recovery وSupabase Staging كمسار خارجي

هذه المرحلة وحدها تنتظر `HEBA_LAUNCH_PRODUCTION_DATABASE_URL` إن كان الـdrill يتطلبه:

1. Full logical backup قراءة فقط.
2. checksum وmanifest مشفر/محمي دون إدخاله Git.
3. Restore إلى هدف disposable معزول، وليس Staging الدائم.
4. التحقق من RPO/RTO وسلامة schema/data/roles المطلوبة.
5. Baseline Staging بلا Production customer data.
6. parity حتى 043.
7. recovery point + fingerprint.
8. تطبيق 044–047 على Staging فقط.
9. اختبارات RLS/RPC/booking/storage/audit/permissions.

فشل هذه المرحلة يبقي `STAGING EXTERNAL GATE BLOCKED`، لكنه لا يلغي أو يوقف المراحل المحلية السابقة.

### المرحلة 14 — Auth/Admin Staging وCloudflare Staging

بعد اكتمال schema/RBAC/audit:

- Site URL وredirect allow-list لـStaging فقط.
- إنشاء Admin Staging خارج المحادثة وربطه بالدور الحقيقي.
- TOTP/AAL2، منع AAL1، session expiry/revocation/audit.
- Worker مستقل لـStaging ومتغيراته من Cloudflare.
- Supabase Staging فقط.
- workers.dev أولًا، دون DNS.
- runtime logs وE2E حقيقي لكل الرحلات.

### المرحلة 15 — رحلة القبول النهائية

تنفذ حيًا:

Admin ينشئ خدمة/محتوى  
→ Preview/Publish  
→ يظهر عامًا  
→ العميلة تسجل/تدخل  
→ تحجز أو تشتري  
→ free/sandbox/manual path المهيأ يعمل  
→ الطلب/الحجز يظهر للأدمن والعميلة  
→ entitlement/delivery يعمل  
→ الإلغاء/إعادة الجدولة أو refund يعمل  
→ permissions وaudit وlogs تتحدث دون أسرار.

الحكم النهائي فقط:

- `STAGING ACCEPTED — READY FOR OWNER PRODUCTION AUTHORIZATION`
- أو `BLOCKED` مع تحديد البوابة الخارجية وحدها والدليل، لا باعتبار كل التطوير متوقفًا.

## 5. الأولويات

### P0 — قبل قبول Staging

- كل أزرار ومسارات العميلة تعمل ولا توجد بيانات مضللة.
- Home وStart Here وSearch وcatalog/details.
- Booking/checkout/order/payment/entitlement.
- Customer dashboard/protected delivery.
- Admin vertical slices كاملة.
- Auth/RBAC/RLS/AAL2/audit.
- Accessibility/mobile/SEO/security/build/tests.

### P1 — لرفع المستوى فوق المنافس

- Press موثق.
- Resource Hub متكامل.
- Testimonials consent/verification.
- Guided discovery محكوم.
- related content/products ذكي ومحكوم.
- visual editorial refinement وmicro-interactions.
- system readiness/content readiness داخل Admin.

### P2 — لا تعطل الإطلاق

- English mirror.
- multi-currency الحقيقية.
- live chat.
- team/culture/gallery مستقلة.
- integrations غير مهيأة أو غير مطلوبة.

لا تنفذ P2 لمجرد أن المنافس يملكها؛ تُضاف فقط عند وجود حاجة ومحتوى وتشغيل ومزود فعلي.

## 6. بروتوكول عمل Code X

بعد كل مرحلة:

1. اعرض ما تغير سلوكيًا لا عدد الملفات فقط.
2. اربط كل ميزة بالصفحة العامة وAdmin/data/permission/audit.
3. اذكر الملفات المعدلة.
4. شغل targeted tests ثم gate tests.
5. صنف النتائج `PASS / FAIL / EXTERNAL GATE / NOT RUN`.
6. أصلح أي FAIL قبل الانتقال إذا كان داخل نطاق المرحلة.
7. Commit صغير واضح دون Push إلا بتفويض.
8. حدّث `PROJECT_STATE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md` والأدلة.
9. استمر تلقائيًا إلى المرحلة التالية الممكنة.

ممنوع التوقف عند تقرير أو خطة أو Score. المطلوب تنفيذ الكود حتى استنفاد كل الأعمال المحلية، ثم تنفيذ Staging عند توافر بوابته.

## 7. أول رد مطلوب من Code X

لا يُطلب تقرير Backup جديد. الرد الأول يكون:

1. جدول الفجوات التطويرية المتبقية بعد commit الحالي.
2. ما الذي نُفذ فعلًا مقابل ما ورد في هذه الخطة.
3. أول Vertical Slice ناقص سيبدأ تنفيذه الآن.
4. الملفات المتوقعة واختبار القبول.

ثم يبدأ التعديل مباشرة دون انتظار موافقة جديدة، ما لم يحتج secret/provider/cost/Production/DNS.
