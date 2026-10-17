# أدلة تقرير الحالة الحالية

أُعدت هذه الحزمة للقراءة والتسليم في 17 أكتوبر 2026. التقرير الرئيسي: [ADMIN_CURRENT_STATE_REVIEW_AR.md](../ADMIN_CURRENT_STATE_REVIEW_AR.md).

- [database-and-release.json](database-and-release.json): لقطة SELECT من الإنتاج عند 13:04 القاهرة، الأعداد المجمعة والسياسات وساعات العمل والأدوار والامتيازات ومقارنة أجسام الدوال؛ لا صفوف عميلات أو بيانات دخول.
- [deployments.json](deployments.json): آخر عمليات النشر منقحة إلى معرف/وقت/مصدر/نسخة ونسبة فقط. الأخير عند 12:24:48 القاهرة. لا بريد ناشر أو رموز وصول.
- [ui-current.json](ui-current.json): نتيجة قراءة أقسام الإدارة الثلاثين، دون تصدير محتواها الخاص. لا تعني اختبار جميع CRUD.
- [test-summary.json](test-summary.json): الفحوص الجديدة وحدودها، وفهرس نتائج المصدر السابقة بعد إزالة المخرجات التفصيلية.
- [images.json](images.json): أبعاد الصور ومناطق إخفاء البيانات. الصور في [images/](images/).

التصوير من الموقع المنشور بعد دخول المالكة بنفسها. فُتحت النماذج دون حفظ/حذف/إرسال. الأسماء في الحجز محجوبة بمستطيلات معتمة، وبقية اللقطات تخلو من بيانات عميلات. الصور طويلة الصفحة قد تظهر حدود التقاط المعاينة الجانبية عند العناصر الثابتة؛ لا تعني اختبار نافذة Chrome خارج المعاينة. لم تُرفع ملفات صور أو بيانات إلى خدمة خارجية لمعالجتها.

| الواجهة | الصورة |
|---|---|
| النظرة العامة | [01](images/01-admin-overview.jpg) |
| التقويم والقائمة | [02](images/02-calendar.jpg)، [03](images/03-bookings-list.jpg) |
| الجلسة | [04](images/04-session-edit.jpg) |
| الكورس والمنهج والدرس | [05](images/05-course-edit.jpg)، [06](images/06-curriculum.jpg)، [07](images/07-lesson-edit.jpg)، [16 كامل](images/16-curriculum-full.jpg) |
| رفع الكتاب | [08](images/08-protected-upload.jpg) |
| العروض | [09](images/09-offers.jpg) |
| إدارة الرئيسية الحالية | [10](images/10-home-management-empty.jpg) |
| الهاتف والتابلت | [11](images/11-schedule-phone-390.jpg)، [12](images/12-bookings-phone-390.jpg)، [13](images/13-schedule-tablet-768.jpg) |
| الرئيسية المنشورة | [14 كمبيوتر](images/14-public-home-desktop-1280.jpg)، [15 هاتف](images/15-public-home-phone-390.jpg) |

![إدارة الرئيسية: شاشة الصفحات الحالية دون سجل home](images/10-home-management-empty.jpg)

الأدلة التاريخية الأصلية التي استُخدمت في التقرير بقيت محليًا في `.launch-backups/`؛ لا تشارك هذا المجلد كاملًا لأنه يحتوي نسخًا احتياطية خاصة. الحزمة الحالية لا تحتوي dump أو نسخة بيئة أو روابط معاينة خاصة أو صور جلسة دخول.
