'use client'

import {AdminField} from './AdminField'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
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

export function OperationalSettingsForm({ settings }: { settings: OperationalSettings }) {
  const {busy,feedback,run}=useAdminAction()
  return <form className="space-y-6" aria-busy={busy} onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);await run(()=>saveOperationalSettings(data),'حُفظت إعدادات التشغيل وأصبحت صفحة الدفع تستخدمها.')}}>
    <fieldset disabled={busy} className="space-y-6">
    <a className="inline-block text-xs font-bold text-deep-teal underline underline-offset-4" href="/auth/admin/confirm?reauth=1&redirect=/admin/settings">تأكيد أمني حديث قبل تعديل وسائل الدفع</a>
    <AdminField label="مهلة سداد الطلب بالساعات" name="expiry_hours" type="number" min="1" max="168" defaultValue={settings.expiryHours} required/>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">سياسة المواعيد — توقيت القاهرة</legend>
      {[
        ['slot_interval','الفاصل بين المواعيد بالدقائق',settings.booking.slotInterval,5,120],
        ['buffer_before','فاصل قبل الجلسة بالدقائق',settings.booking.bufferBefore,0,180],
        ['buffer_after','فاصل بعد الجلسة بالدقائق',settings.booking.bufferAfter,0,180],
        ['minimum_notice','أقل مهلة للحجز بالدقائق',settings.booking.minimumNotice,0,10080],
        ['horizon_days','مدى فتح التقويم بالأيام',settings.booking.horizonDays,1,30],
        ['max_per_day','أقصى حجوزات للخدمة يوميًا',settings.booking.maxPerDay,1,100],
        ['cancel_notice_hours','مهلة إلغاء العميلة بالساعات',settings.booking.cancelNoticeHours,0,720],
      ].map(([name,label,value,min,max])=><AdminField key={String(name)} label={String(label)} name={String(name)} type="number" min={Number(min)} max={Number(max)} defaultValue={Number(value)} required/>)}
    </fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">InstaPay</legend><AdminField label="العنوان" name="instapay_handle" defaultValue={settings.instapay?.handle ?? ''} dir="ltr"/><AdminField label="اسم صاحبة الحساب" name="instapay_name" defaultValue={settings.instapay?.name ?? ''}/></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">المحفظة الإلكترونية</legend><AdminField label="رقم المحفظة" name="wallet_number" defaultValue={settings.wallet?.number ?? ''} dir="ltr" inputMode="tel"/><AdminField label="مقدم الخدمة" name="wallet_provider" defaultValue={settings.wallet?.provider ?? ''}/></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">التحويل البنكي (اختياري)</legend><AdminField label="اسم البنك" name="bank_name" defaultValue={settings.bank?.bank ?? ''}/><AdminField label="IBAN" name="bank_iban" defaultValue={settings.bank?.iban ?? ''} dir="ltr"/><AdminField label="اسم صاحبة الحساب" name="bank_owner" defaultValue={settings.bank?.name ?? ''}/><p className="text-xs text-text-soft md:col-span-2">اتركي حقول البنك فارغة لإخفاء هذه الوسيلة من صفحة الدفع.</p></fieldset>
    <fieldset className="rounded-2xl border border-line p-4"><legend className="px-2 font-bold text-deep-teal">البريد التشغيلي</legend><label className="flex items-start gap-3 text-sm font-semibold text-deep-teal"><input name="email_enabled" type="checkbox" defaultChecked={settings.emailEnabled} className="mt-1 accent-deep-teal"/><span>تفعيل إرسال ردود Inbox عبر Resend<span className="mt-1 block text-xs font-normal leading-relaxed text-text-soft">لا يمكن الحفظ مفعّلًا قبل اكتمال اسمي RESEND_API_KEY وRESEND_FROM_EMAIL في بيئة الاستضافة. لا تظهر القيم هنا.</span></span></label></fieldset>
    </fieldset><ActionFeedback feedback={feedback}/>
    <Button type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ إعدادات التشغيل'}</Button>
  </form>
}
