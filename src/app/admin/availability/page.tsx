import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "قواعد الحجز",
    description: "تحديد الحد الأدنى والأقصى للحجز، الفاصل بين الجلسات، والمنطقة الزمنية.",
    fields: [
      {key: "timezone", label: "المنطقة الزمنية", type: "text", defaultValue: "Africa/Cairo"},
      {key: "minDaysAhead", label: "أقل عدد أيام قبل الحجز", type: "number", defaultValue: 1},
      {key: "maxDaysAhead", label: "أقصى عدد أيام قبل الحجز", type: "number", defaultValue: 30},
      {key: "bufferMinutes", label: "فاصل بين الجلسات بالدقائق", type: "number", defaultValue: 30},
      {key: "allowReschedule", label: "السماح بطلب تغيير الموعد", type: "toggle", defaultValue: true},
      {key: "requirePaymentBeforeConfirm", label: "اشتراط الدفع قبل التأكيد", type: "toggle", defaultValue: false}
    ],
  },
  {
    title: "أنواع الجلسات",
    description: "اكتبي كل نوع جلسة في سطر: الاسم | المدة | السعر | الوصف.",
    fields: [
      {key: "sessionTypes", label: "أنواع الجلسات", type: "lines", defaultValue: "جلسة كوتشنج 60 دقيقة | 60 | 1200 | مناسبة لسؤال عاطفي محدد\nجلسة كوتشنج عميقة | 90 | 1500 | مناسبة لتفكيك نمط متكرر\nباقة ثلاث جلسات | 60 | 3300 | متابعة هادئة خلال شهر", wide: true},
      {key: "availableTimeSlots", label: "الأوقات المتاحة", type: "lines", defaultValue: "07:00\n07:30\n08:00\n08:30\n09:00\n09:30\n10:00\n10:30\n11:00\n11:30\n12:00\n12:30\n13:00\n13:30\n14:00\n14:30\n15:00\n15:30\n16:00\n16:30\n17:00\n17:30\n18:00\n18:30\n19:00\n19:30\n20:00", wide: true},
      {key: "blockedWeekDays", label: "أيام غير متاحة بالأرقام", type: "text", defaultValue: "5", hint: "0 الأحد، 1 الإثنين، 5 الجمعة حسب JavaScript Date"},
      {key: "blockedDates", label: "تواريخ محظورة", type: "lines", placeholder: "2026-06-01\n2026-06-02", wide: true}
    ],
  },
  {
    title: "رسائل الحجز",
    description: "النصوص التي تظهر للعميلة أثناء رحلة الحجز.",
    fields: [
      {key: "bookingIntro", label: "مقدمة صفحة الحجز", type: "textarea", defaultValue: "اختاري موعدًا هادئًا لجلسة خاصة. ستتم مراجعة الطلب وتأكيده من الإدارة.", wide: true},
      {key: "bookingConfirmationMessage", label: "رسالة التأكيد", type: "textarea", defaultValue: "تم إرسال طلب الحجز بنجاح. سنراجع الموعد ونؤكد التفاصيل قريبًا.", wide: true},
      {key: "reschedulePolicy", label: "سياسة تغيير الموعد", type: "textarea", defaultValue: "يمكن طلب تغيير الموعد قبل 24 ساعة على الأقل من وقت الجلسة.", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="الحجوزات"
      title="إعدادات التوفر والجلسات"
      description="تحكم كامل في أنواع الجلسات، الأوقات، الأيام المحظورة، قواعد الحجز، وسياسة إعادة الجدولة."
    >
      <AdminSettingsConsole
        collectionName="availability_settings"
        documentId="default"
        sections={sections}
      />
    </AdminPageShell>
  )
}
