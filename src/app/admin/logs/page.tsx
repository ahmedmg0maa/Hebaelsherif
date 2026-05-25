export const dynamic = 'force-dynamic'
export default function AdminLogsPage() {
  const plannedLogs = [
    'تغيير حالة الطلب',
    'تأكيد حجز جلسة',
    'نشر كورس أو كتاب',
    'تعديل رابط محتوى محمي',
    'نشر أو إخفاء تقييم',
  ]

  return (
    <div>
      <div className="mb-8">
        <p className="mini-label">Audit Logs</p>
        <h2 className="mt-3 text-3xl font-black text-charcoal">سجل إجراءات الإدارة</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">مكان جاهز لتسجيل كل إجراء إداري مهم عند ربط audit logging الكامل.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {plannedLogs.map((item) => (
          <div key={item} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
            <p className="text-sm font-black text-charcoal">{item}</p>
            <p className="mt-2 text-xs leading-6 text-warm-gray">سيتم تخزين: adminId، نوع الإجراء، العنصر المستهدف، قبل/بعد، ووقت التنفيذ.</p>
          </div>
        ))}
      </div>
    </div>
  )
}
