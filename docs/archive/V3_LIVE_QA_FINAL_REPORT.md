# Heba ElSherif — V3.3 Live QA Final Report

## Scope

تم تجهيز نسخة V3.3 Premium Launch بناءً على الخريطة المتفق عليها: الهوية، منع الوهميات، تحسين النصوص العامة، الدارك مود، الكورسات والكتب، المحتوى المحمي، الطلبات، الأدمن، النماذج، والتسليم النهائي.

## Brand & Assets

- اعتماد اللوجو الرسمي الأحدث.
- تحديث logo-main / logo-light / logo-dark / logo-symbol.
- تحديث favicon و app icons و OpenGraph assets.
- الحفاظ على مسارات صور هبة المستقبلية داخل `public/images/heba`.

## Public Experience

- إزالة أي محتوى غير حقيقي من الواجهة العامة.
- إزالة النصوص التي تبدو كشرح تقني أو ملاحظات تطوير أمام الزائر.
- تحويل غياب الكورسات والكتب إلى تجربة انتظار هادئة ومناسبة للبراند.
- تحسين صفحات الكورسات والكتب بحيث لا تعرض رسائل تقنية عند عدم وجود محتوى منشور.

## Brand Palette & Dark Mode

تم تثبيت ألوان البراند الأساسية:

```txt
#2F6173
#0F3237
#F5F0E7
#E4D7C7
#B79B60
#6F6A2F
#7A2433
```

تم تحسين تباين النصوص في الدارك مود في الأجزاء المعدلة، مع الاعتماد على ألوان البراند بدل الأسود الصريح.

## Protected Content

- روابط المحتوى النهائي تحفظ في `protected_content`.
- دروس الكورس لا تُقرأ مباشرة للعامة من Firestore.
- API الدروس يعرض بيانات عامة فقط لغير المشترين، ويعرض الروابط الحساسة عند وجود وصول مدفوع صحيح.
- public serializers للكورسات والكتب تمنع تمرير الحقول الخاصة للواجهة.

## Forms & Orders

- نموذج التواصل متصل بـ `/api/contact`.
- Lead Magnet متصل بـ `/api/newsletter`.
- Dashboard Orders يدعم إرسال إثبات الدفع.
- Admin Orders يدعم تأكيد الدفع، فتح الوصول، طلب المراجعة، والإلغاء مع تسجيل الإجراءات.

## Validation

```txt
npm run type-check ✅
npm run lint ✅
npm run audit:launch ✅
npm run route-audit ✅
npm run build ✅
```

## Production checklist reminder

- نشر `firestore.rules`.
- ضبط متغيرات Vercel.
- إضافة الدومينات إلى Firebase Auth.
- تنظيف أي بيانات قديمة في Firestore تحتوي روابط خاصة داخل `courses` أو `books`.
- إجراء Smoke Test على رابط Vercel بعد النشر.

## V3.3.1 readability hotfix

A full contrast/readability correction pass was applied after live screenshots showed weak admin readability. The pass added a separate admin operational design layer, removed the floating assistant from admin, strengthened dark panels across the public site/dashboard/learning/reading surfaces, removed stale V2/English command wording, and revalidated the production build.
