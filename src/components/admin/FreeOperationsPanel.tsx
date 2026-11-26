import Link from 'next/link'
import { Card, CardTitle } from '@/components/ui/Card'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { isFreeOperation } from '@/lib/operations/cost-mode'

type MailStatus = { reserved24h: number; reservedMonth: number; pending: number; terminalFailures: number; dailyLimit: number; monthlyLimit: number; lastSentAt: string | null }

export async function FreeOperationsPanel() {
  let status: MailStatus | null = null
  if (hasSupabasePublicConfig() && hasSupabaseServerSecret()) {
    const admin = await requirePermission('system.view')
    if (admin?.userId) {
      const result = await getServiceClient().rpc('free_launch_mail_status', { p_actor: admin.userId })
      const value = result.data as MailStatus | null
      if (!result.error && value && ['reserved24h','reservedMonth','pending','terminalFailures','dailyLimit','monthlyLimit'].every(key => Number.isSafeInteger(value[key as keyof MailStatus]) && Number(value[key as keyof MailStatus]) >= 0)) status = value
    }
  }
  return <Card className="space-y-5 p-6">
    <CardTitle>{isFreeOperation() ? 'متابعة التشغيل المجاني' : 'متابعة البريد والسعة'}</CardTitle>
    <p className="text-sm leading-8 text-text-soft">الرفع المدفوع متوقف في الوضع المجاني. الحدود أدناه مرجع للخطط المجانية وليست قراءة للاستهلاك الفعلي من حساب المزود.</p>
    <dl className="grid gap-4 text-sm sm:grid-cols-3">
      <div className="rounded-xl border border-line p-4"><dt>تخزين الملفات</dt><dd className="mt-2 font-bold text-deep-teal">1 GB إجماليًا</dd><p className="mt-2 text-xs leading-6 text-text-soft">حتى 50 MB للملف؛ الكتب والفيديو والوسائط تشترك في الحصة.</p></div>
      <div className="rounded-xl border border-line p-4"><dt>نقل الملفات</dt><dd className="mt-2 font-bold text-deep-teal">5 GB نقل + 5 GB مخبأ</dd><p className="mt-2 text-xs leading-6 text-text-soft">المشاهدة المتكررة تستهلك النقل. ليس هذا استضافة فيديو غير محدودة.</p></div>
      <div className="rounded-xl border border-line p-4"><dt>رسائل التطبيق</dt><dd className="mt-2 font-bold text-deep-teal">80 محاولة / 24 ساعة</dd><p className="mt-2 text-xs leading-6 text-text-soft">و2400 في الشهر. نحجز جزءًا من حصة المزود لتأكيد الحسابات؛ SMTP والخدمات الأخرى خارج هذا العداد.</p></div>
    </dl>
    {status ? <div className="rounded-xl bg-ivory/60 p-4">
      <p className="text-sm leading-8">محاولات التطبيق آخر 24 ساعة: <strong>{status.reserved24h.toLocaleString('ar-EG')} / {status.dailyLimit}</strong> · هذا الشهر: <strong>{status.reservedMonth.toLocaleString('ar-EG')} / {status.monthlyLimit}</strong></p>
      <p className="mt-2 text-sm leading-8">رسائل الحجز المنتظرة: <strong>{status.pending.toLocaleString('ar-EG')}</strong> · تحتاج متابعة: <strong className={status.terminalFailures ? 'text-burgundy' : ''}>{status.terminalFailures.toLocaleString('ar-EG')}</strong></p>
      <p className="mt-2 text-xs leading-7 text-text-soft">تعالج رسالة واحدة في كل دقيقة عند تفعيل العامل المجدول. يزيد الانتظار عند التراكم أو بلوغ الحصة. آخر إرسال مؤكد: {status.lastSentAt && Number.isFinite(Date.parse(status.lastSentAt)) ? new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(status.lastSentAt)) : 'لا يوجد بعد'}.</p>
      {status.terminalFailures > 0 && <p role="status" className="mt-3 text-sm leading-7 text-burgundy">راجعي سجل العامل المجدول وإعدادات المرسل وحد المزود. تابعي الحجوزات من الحساب؛ لم نعتبر الرسائل المتعذرة مرسلة.</p>}
    </div> : <p role="status" className="rounded-xl border border-line p-4 text-sm leading-7 text-text-soft">تعذر قراءة عداد البريد. تحققي من الاتصال وصلاحية حالة النظام وترحيل 102؛ لا نعرض أصفارًا باعتبارها استهلاكًا فعليًا.</p>}
    <div className="flex flex-wrap gap-4 text-sm"><Link href="/admin/services" className="inline-flex min-h-11 items-center text-burgundy underline">الخدمات والأسعار</Link><Link href="/admin/bookings" className="inline-flex min-h-11 items-center text-burgundy underline">الحجوزات والمواعيد</Link><Link href="/admin/settings" className="inline-flex min-h-11 items-center text-burgundy underline">فتح وإغلاق الاستقبال</Link></div>
  </Card>
}
