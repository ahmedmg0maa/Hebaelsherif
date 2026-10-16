'use client'

import { useState } from 'react'
import { saveOperationalSettings } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'

export type OperationalSettings = {
  expiryHours: number
  booking: { slotInterval: number; bufferBefore: number; bufferAfter: number; minimumNotice: number; horizonDays: number; maxPerDay: number; cancelNoticeHours: number }
  instapay: { handle: string; name: string } | null
  wallet: { number: string; provider: string } | null
  bank: { bank: string; iban: string; name: string } | null
  emailEnabled: boolean
}
const input = 'mt-1 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-4 py-2 text-sm text-ink'

export function OperationalSettingsForm({ settings }: { settings: OperationalSettings }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  return <form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); setBusy(true); const result = await saveOperationalSettings(new FormData(event.currentTarget)); setMessage(result.ok ? 'حُفظت إعدادات التشغيل وأصبحت صفحة الدفع تستخدمها.' : result.error); setBusy(false) }}>
    <a className="inline-block text-xs font-bold text-deep-teal underline underline-offset-4" href="/auth/admin/confirm?reauth=1&redirect=/admin/settings">تأكيد أمني حديث قبل تعديل وسائل الدفع</a>
    <label className="block text-sm font-bold text-deep-teal">مهلة سداد الطلب بالساعات<input name="expiry_hours" type="number" min="1" max="168" defaultValue={settings.expiryHours} className={input} required /></label>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">سياسة المواعيد — توقيت القاهرة</legend>
      {[
        ['slot_interval','الفاصل بين المواعيد بالدقائق',settings.booking.slotInterval,5,120],
        ['buffer_before','فاصل قبل الجلسة بالدقائق',settings.booking.bufferBefore,0,180],
        ['buffer_after','فاصل بعد الجلسة بالدقائق',settings.booking.bufferAfter,0,180],
        ['minimum_notice','أقل مهلة للحجز بالدقائق',settings.booking.minimumNotice,0,10080],
        ['horizon_days','مدى فتح التقويم بالأيام',settings.booking.horizonDays,1,30],
        ['max_per_day','أقصى حجوزات للخدمة يوميًا',settings.booking.maxPerDay,1,100],
        ['cancel_notice_hours','مهلة إلغاء العميلة بالساعات',settings.booking.cancelNoticeHours,0,720],
      ].map(([name,label,value,min,max])=><label key={String(name)} className="text-sm font-semibold text-deep-teal">{label}<input name={String(name)} type="number" min={Number(min)} max={Number(max)} defaultValue={Number(value)} className={input} required /></label>)}
    </fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">InstaPay</legend><label className="text-sm font-semibold text-deep-teal">العنوان<input name="instapay_handle" defaultValue={settings.instapay?.handle ?? ''} className={input} dir="ltr" placeholder="name@instapay" /></label><label className="text-sm font-semibold text-deep-teal">اسم صاحبة الحساب<input name="instapay_name" defaultValue={settings.instapay?.name ?? ''} className={input} /></label></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">المحفظة الإلكترونية</legend><label className="text-sm font-semibold text-deep-teal">رقم المحفظة<input name="wallet_number" defaultValue={settings.wallet?.number ?? ''} className={input} dir="ltr" inputMode="tel" /></label><label className="text-sm font-semibold text-deep-teal">مقدم الخدمة<input name="wallet_provider" defaultValue={settings.wallet?.provider ?? ''} className={input} placeholder="فودافون كاش" /></label></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">التحويل البنكي (اختياري)</legend><label className="text-sm font-semibold text-deep-teal">اسم البنك<input name="bank_name" defaultValue={settings.bank?.bank ?? ''} className={input} /></label><label className="text-sm font-semibold text-deep-teal">IBAN<input name="bank_iban" defaultValue={settings.bank?.iban ?? ''} className={input} dir="ltr" /></label><label className="text-sm font-semibold text-deep-teal md:col-span-2">اسم صاحبة الحساب<input name="bank_owner" defaultValue={settings.bank?.name ?? ''} className={input} /></label><p className="text-xs text-text-soft md:col-span-2">اتركي حقول البنك فارغة لإخفاء هذه الوسيلة من صفحة الدفع.</p></fieldset>
    <fieldset className="rounded-2xl border border-line p-4"><legend className="px-2 font-bold text-deep-teal">البريد التشغيلي</legend><label className="flex items-start gap-3 text-sm font-semibold text-deep-teal"><input name="email_enabled" type="checkbox" defaultChecked={settings.emailEnabled} className="mt-1 accent-deep-teal"/><span>تفعيل إرسال ردود Inbox عبر Resend<span className="mt-1 block text-xs font-normal leading-relaxed text-text-soft">لا يمكن الحفظ مفعّلًا قبل اكتمال اسمي RESEND_API_KEY وRESEND_FROM_EMAIL في بيئة الاستضافة. لا تظهر القيم هنا.</span></span></label></fieldset>
    {message && <p role="status" className="rounded-xl bg-aqua/10 px-4 py-3 text-sm font-semibold text-deep-teal">{message}</p>}
    <Button type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ إعدادات التشغيل'}</Button>
  </form>
}
