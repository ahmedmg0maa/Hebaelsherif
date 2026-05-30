# Heba ElSherif V3.3.2 — Booking Admin Actions Fix

## السبب

كانت أزرار إدارة الحجوزات غير قادرة على تحديث الحالات غير `confirmed` لأن كود التحديث كان يرسل قيمة `undefined` داخل `updateDoc` إلى Firestore:

```ts
paymentStatus: status === 'confirmed' ? 'confirmed' : undefined
```

Firestore لا يقبل `undefined` في بيانات الكتابة افتراضيًا، لذلك كان زر **تأكيد الحجز** يعمل فقط لأنه يرسل قيمة صريحة، بينما أزرار **بانتظار مراجعة الدفع** و **تحديد كمكتملة** و **إلغاء الحجز** تفشل قبل تنفيذ الكتابة.

## الإصلاح

- تم استبدال `undefined` بقيمة دفع صريحة لكل حالة.
- تم ربط كل حالة حجز بحالة دفع مناسبة:
  - `confirmed` و `completed` => `confirmed`
  - `payment_submitted` => `submitted`
  - `cancelled` => `failed`
  - باقي الحالات => `pending`
- تم إضافة رسالة خطأ واضحة داخل صفحة الحجوزات إذا فشل التحديث.
- تم تسجيل التغيير في `admin_logs` كعملية مستقلة لا تمنع نجاح تحديث الحجز إذا تعذر تسجيل اللوج.

## الملف المعدل

```txt
src/app/admin/bookings/page.tsx
```

## التحقق

```txt
npm run type-check ✅
npm run lint ✅
npm run route-audit ✅
npm run audit:launch ✅
```

> ملاحظة: `next build` بدأ ونجح في compilation، لكنه لم يكتمل داخل وقت أداة التشغيل المتاح أثناء توليد الصفحات. لم يتم اعتبار ذلك نجاحًا نهائيًا للـ build في هذا التقرير.
