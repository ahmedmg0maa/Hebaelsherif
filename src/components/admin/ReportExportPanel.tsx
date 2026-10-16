export function ReportExportPanel({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
  const input = 'min-h-11 rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink'
  return (
    <section className="rounded-2xl border border-antique-gold/30 bg-surface-raised p-5" aria-labelledby="report-export-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="report-export-title" className="text-xl font-bold text-deep-teal">تصدير آمن</h2>
          <p className="mt-1 max-w-2xl text-sm leading-loose text-text-soft">
            ملف CSV محدود زمنيًا وبحد أقصى ٥٬٠٠٠ صف. يلزم تأكيد MFA حديث، وتُسجّل العملية قبل تسليم الملف.
          </p>
        </div>
        <a href="/auth/admin/confirm?reauth=1&redirect=/admin/reports" className="text-sm font-bold text-burgundy underline underline-offset-4">
          تأكيد MFA الآن
        </a>
      </div>
      <form action="/admin/reports/export" method="post" className="mt-5 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="grid gap-1 text-xs font-semibold text-deep-teal">
          نوع البيانات
          <select name="dataset" className={input} defaultValue="orders">
            <option value="orders">الطلبات — دون بيانات شخصية</option>
            <option value="payments">المدفوعات — دون إثباتات</option>
            <option value="bookings">الحجوزات — دون ملاحظات أو روابط</option>
            <option value="customers">العميلات — يتطلب users.view</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-deep-teal">
          من تاريخ
          <input name="start" type="date" required defaultValue={defaultStart} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-deep-teal">
          إلى تاريخ
          <input name="end" type="date" required defaultValue={defaultEnd} className={input} />
        </label>
        <button type="submit" className="mt-auto min-h-11 rounded-xl bg-deep-teal px-5 text-sm font-bold text-on-dark transition-colors hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-teal">
          تنزيل CSV
        </button>
      </form>
    </section>
  )
}
