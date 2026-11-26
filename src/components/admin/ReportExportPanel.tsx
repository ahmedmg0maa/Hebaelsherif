
import {AdminSelect,AdminField} from './AdminField'
/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation intentionally refreshes the private Auth document. */
export function ReportExportPanel({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
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
        <AdminSelect  label={`نوع البيانات`} name="dataset" defaultValue="orders">
            <option value="orders">الطلبات — دون بيانات شخصية</option>
            <option value="payments">المدفوعات — دون إثباتات</option>
            <option value="bookings">الحجوزات — دون ملاحظات أو روابط</option>
            <option value="customers">العميلات — يتطلب users.view</option>
          </AdminSelect>
        <AdminField  label={`من تاريخ`} name="start" type="date" required defaultValue={defaultStart}/>
        <AdminField  label={`إلى تاريخ`} name="end" type="date" required defaultValue={defaultEnd}/>
        <button type="submit" className="mt-auto min-h-11 rounded-xl bg-deep-teal px-5 text-sm font-bold text-on-dark transition-colors hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-teal">
          تنزيل CSV
        </button>
      </form>
    </section>
  )
}
