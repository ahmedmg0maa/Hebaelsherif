# Product Completion Audit

**تاريخ المراجعة:** 2026-08-19  
**النطاق:** مراجعة محلية لمصدر المشروع فقط؛ لم يُنشأ اتصال بـ Supabase ولم تُقرأ مفاتيح ولم تُدفع ترحيلات.  
**الحالات:** `functional` = مصدر حقيقة ونتيجة صادقة؛ `incomplete` = فجوة تشغيلية أو حوكمة؛ `cosmetic-only` = عرض بلا مصدر حقيقة؛ `blocked-by-real-content` = المسار سليم لكن لا يجوز عرضه قبل نشر محتوى أو تهيئة حقيقية.

## Public

| المسار | هدف المستخدمة | مصدر الحقيقة | الحالة | تحكم الإدارة | الاختبار / الفجوة |
| --- | --- | --- | --- | --- | --- |
| `/` | اكتشاف المنصة | `site_sections` وبيانات الكتالوج المنشورة | blocked-by-real-content | صفحات/تنقل/محتوى منشور | E2E عام؛ يحتاج محتوى منشور |
| `/about` | معرفة صاحبة المنصة | `site_settings` للملف التعريفي | blocked-by-real-content | الإعدادات | لا سيرة أو ادعاءات افتراضية |
| `/start-here` | اختيار نقطة بداية | منطق سؤال محلي فقط | incomplete | لا يوجد | يحتاج مصدر توصيات أو وصف نطاق واضح |
| `/services` | تصفح خدمات وجلسات | `services` و`products` المنشورة | blocked-by-real-content | الخدمات/المنتجات | E2E لحالة الفراغ؛ يحتاج خدمة منشورة |
| `/booking` | حجز موعد | الخدمات، التوافر، والحجز الذري | blocked-by-real-content | الخدمات والحجوزات | E2E للفراغ؛ تحقق حي مؤجل |
| `/books` | تصفح الكتب | `books`/`products` المنشورة | blocked-by-real-content | الكتب | E2E للفراغ؛ يحتاج كتابًا منشورًا |
| `/books/[slug]` | تفاصيل كتاب | كتاب منشور بالـ slug | blocked-by-real-content | الكتب | يحتاج بيانات منشورة |
| `/courses` | تصفح الدورات | `courses`/`products` المنشورة | blocked-by-real-content | الدورات | E2E للفراغ؛ يحتاج دورة منشورة |
| `/courses/[slug]` | تفاصيل دورة | دورة منشورة بالـ slug | blocked-by-real-content | الدورات | يحتاج بيانات منشورة |
| `/workshops` | تصفح الورش | `workshops`/`products` المنشورة | blocked-by-real-content | الورش | E2E للفراغ؛ يحتاج ورشة منشورة |
| `/workshops/[slug]` | تفاصيل ورشة | ورشة منشورة بالـ slug | blocked-by-real-content | الورش | يحتاج بيانات منشورة |
| `/articles` | قراءة المقالات | `articles` المنشورة | blocked-by-real-content | المقالات | يحتاج مقالًا منشورًا |
| `/articles/[slug]` | قراءة مقال | مقال منشور بالـ slug | blocked-by-real-content | المقالات | يحتاج مقالًا منشورًا |
| `/contact` | إرسال رسالة | `contact_messages` | incomplete | البريد الوارد | حالة غير مهيأة واضحة؛ يحتاج تحقق RLS حي |
| `/faq` | فهم الشراء والوصول | إعدادات الدفع الفعلية ونصوص مشروطة | incomplete | إعدادات الدفع؛ بقية الإجابات في الكود | يحتاج CMS للأسئلة المتغيرة |
| `/privacy` | سياسة الخصوصية | نص قانوني في الكود | incomplete | لا يوجد | يحتاج مالك سياسة/مراجعة قانونية أو CMS |
| `/terms` | الشروط | نص قانوني في الكود | incomplete | لا يوجد | يحتاج مالك سياسة/مراجعة قانونية أو CMS |
| `/refund` | سياسة الاسترداد | نص قانوني في الكود | incomplete | لا يوجد | يحتاج مالك سياسة/مراجعة قانونية أو CMS |
| `/disclaimer` | إخلاء المسؤولية | نص قانوني في الكود | incomplete | لا يوجد | يحتاج مالك سياسة/مراجعة قانونية أو CMS |
| `/auth/login` | تسجيل الدخول | Supabase Auth | blocked-by-real-content | إدارة الهوية | E2E للتوجيه بلا تهيئة؛ تحقق حي مؤجل |
| `/auth/admin` | دخول الإدارة | Supabase Auth + الدور | blocked-by-real-content | الأدوار | يحتاج حساب مدير حقيقي |
| `/auth/register` | إنشاء حساب | Supabase Auth | blocked-by-real-content | إعدادات الهوية | تحقق حي مؤجل |
| `/auth/reset-password` | استعادة كلمة المرور | Supabase Auth | blocked-by-real-content | إعدادات الهوية | تحقق حي مؤجل |
| `/preview/[type]/[id]` | معاينة قبل النشر | token موقّع ومحتوى الإدارة | blocked-by-real-content | المحتوى/المعاينة | يحتاج جلسة وإعدادات حقيقية |
| `/unsubscribe/[token]` | إلغاء الاشتراك | token وقائمة النشرات | blocked-by-real-content | النشرات | يحتاج مزود رسائل وبيانات حقيقية |

## Customer

| المسار | هدف المستخدمة | مصدر الحقيقة | الحالة | تحكم الإدارة | الاختبار / الفجوة |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | ملخص الحساب | المستخدم والاستحقاقات والطلبات | blocked-by-real-content | الطلبات/المدفوعات | وصول غير مصادق محمي؛ حي مؤجل |
| `/dashboard/courses` | الدورات المستحقة | `entitlements` والدورات | blocked-by-real-content | الدورات/المدفوعات | يحتاج استحقاقًا حقيقيًا |
| `/dashboard/courses/[slug]/learn` | التعلّم | الاستحقاق والدروس والتقدم | blocked-by-real-content | المنهج | اختبارات محلية؛ Storage الحي مؤجل |
| `/dashboard/books` | الكتب المستحقة | `entitlements` والكتب | blocked-by-real-content | الكتب/المدفوعات | يحتاج استحقاقًا حقيقيًا |
| `/dashboard/workshops` | الورش المستحقة | `entitlements` والورش | blocked-by-real-content | الورش/المدفوعات | يحتاج استحقاقًا حقيقيًا |
| `/dashboard/bookings` | إدارة الحجز | `bookings` وقواعد التوافر | blocked-by-real-content | الحجوزات | يحتاج خدمة وموعدًا حقيقيين |
| `/dashboard/orders` | متابعة الطلبات | `orders` | blocked-by-real-content | الطلبات | يحتاج طلبًا حقيقيًا |
| `/dashboard/payments` | متابعة المدفوعات | `payments` و`orders` | blocked-by-real-content | المدفوعات | يحتاج طلبًا حقيقيًا |
| `/dashboard/profile` | تعديل الملف الشخصي | ملف المستخدم | blocked-by-real-content | المستخدمون | يحتاج مصادقة حية |
| `/dashboard/notifications` | قراءة الإشعارات | `notifications` | blocked-by-real-content | إجراءات النظام | يحتاج بيانات حقيقية |
| `/dashboard/settings` | إعدادات الحساب | Auth وإعدادات الحساب | incomplete | إعدادات الهوية | لا اشتراكات بريدية أو وعود غير مهيأة |

## Admin

| المسار | هدف الإدارة | مصدر الحقيقة | الحالة | تحكم الإدارة | الاختبار / الفجوة |
| --- | --- | --- | --- | --- | --- |
| `/admin` | لوحة الإدارة | ملخصات الجداول الفعلية | blocked-by-real-content | — | الدور محمي؛ يحتاج مديرًا حقيقيًا |
| `/admin/overview` | المؤشرات | إحصاءات فعلية | blocked-by-real-content | — | لا أرقام بديلة |
| `/admin/products` | إدارة المنتجات | `products` | blocked-by-real-content | إنشاء/نشر/تعديل | يحتاج تحقق RLS حي |
| `/admin/books` | إدارة الكتب | `books`/`products` | blocked-by-real-content | إنشاء/نشر/تعديل | يحتاج بيانات |
| `/admin/courses` | إدارة الدورات | `courses`/`products` | blocked-by-real-content | إنشاء/نشر/تعديل | يحتاج بيانات |
| `/admin/courses/[id]/curriculum` | إدارة المنهج | الدروس والوحدات | blocked-by-real-content | المنهج | يحتاج دورة حقيقية |
| `/admin/workshops` | إدارة الورش | `workshops`/`products` | blocked-by-real-content | إنشاء/نشر/تعديل | يحتاج بيانات |
| `/admin/bookings` | إدارة الحجوزات | `bookings` | blocked-by-real-content | اعتماد/إلغاء محمي | يحتاج تحقق الحد الذري حيًا |
| `/admin/memberships` | إدارة العضويات | `memberships` | blocked-by-real-content | CRUD محمي | يحتاج بيانات |
| `/admin/orders` | مراجعة الطلبات | `orders` | blocked-by-real-content | مراجعة/تحديث محمي | يحتاج طلبات حقيقية |
| `/admin/payments` | اعتماد المدفوعات | `payments` و`orders` | blocked-by-real-content | اعتماد محمي ومدقق | يحتاج دفعًا حقيقيًا |
| `/admin/users` | إدارة المستخدمين | Auth/ملفات المستخدمين | blocked-by-real-content | صلاحيات محمية | يحتاج هوية حية |
| `/admin/users/[id]` | تفاصيل مستخدمة | الملف والاستحقاقات | blocked-by-real-content | صلاحيات محمية | يحتاج مستخدمًا حقيقيًا |
| `/admin/inbox` | قراءة الرسائل | `contact_messages` | blocked-by-real-content | تغيير الحالة محمي | مرتبط بتهيئة التواصل |
| `/admin/coupons` | إدارة الكوبونات | `coupons` | blocked-by-real-content | CRUD محمي | يحتاج بيانات |
| `/admin/offers` | إدارة العروض | `offers` والأهداف | blocked-by-real-content | CRUD محمي | لا عرض عام بلا بيانات |
| `/admin/pages` | إدارة الصفحات/الأقسام | `pages`/`site_sections`/التنقل | incomplete | CRUD محمي | الصفحات القانونية لا تستهلك CMS بعد |
| `/admin/articles` | إدارة المقالات | `articles` | blocked-by-real-content | CRUD محمي | يحتاج بيانات |
| `/admin/media` | إدارة الوسائط | `media_assets`/Storage | blocked-by-real-content | رفع/حذف محمي | تحقق Storage الحي مؤجل |
| `/admin/reviews` | إدارة المراجعات | `reviews` | blocked-by-real-content | قبول/نشر محمي | لا مراجعات عامة بلا بيانات |
| `/admin/reports` | التقارير | تجميعات فعلية | blocked-by-real-content | — | لا مقاييس بديلة |
| `/admin/settings` | إعدادات الموقع والدفع | `site_settings` | blocked-by-real-content | تعديل محمي ومدقق | يحتاج إعدادًا حقيقيًا |
| `/admin/roles` | الأدوار والصلاحيات | أدوار المستخدمين | blocked-by-real-content | تعديل محمي ومدقق | يحتاج مديرًا حقيقيًا |
| `/admin/audit-logs` | تدقيق العمليات | `audit_logs` | blocked-by-real-content | قراءة بحسب الدور | يحتاج بيانات حقيقية |
| `/admin/security` | وضع الحماية | إعدادات وإشارات أمنية | incomplete | إعدادات الأمان | يحتاج مؤشرات قابلة للقياس بدل ملخصات ثابتة |
| `/admin/system` | جاهزية النظام | فحوص إعدادات محلية | incomplete | إعدادات النظام | يحتاج قائمة جاهزية محتوى من مصادر البيانات |

## Checkout

| المسار | هدف المستخدمة | مصدر الحقيقة | الحالة | تحكم الإدارة | الاختبار / الفجوة |
| --- | --- | --- | --- | --- | --- |
| `/checkout/[productType]/[slug]` | إنشاء طلب وإرفاق إثبات دفع | منتج منشور، `site_settings`، `orders`/`payments` | blocked-by-real-content | المنتجات ووسائل الدفع والمدفوعات | لا طلب بلا إعداد دفع؛ حي مؤجل |

## إصلاحات هذه المراجعة

- استبدلت `/faq` وسائل الدفع والمدد والمواعيد والتسجيلات وإعادة الجدولة الثابتة بإجابات تعتمد على إعداد الدفع أو شروط المنتج/الحجز المنشورة.
- لا يعرض `/contact` نموذجًا يوحي بإرسال ناجح عند غياب تهيئة Supabase العامة؛ يعرض حالة واضحة ولا يحاول كتابة أي رسالة.
- الصفحات القانونية و«ابدئي من هنا» وقائمة الجاهزية الإدارية ما زالت عناصر مكتملة جزئيًا؛ تُتابع قبل إتاحة الإنتاج.
