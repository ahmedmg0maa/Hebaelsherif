'use client'

import type { FormEvent } from 'react'

interface BookingFormProps {
  name?: string
  email?: string
  phone?: string
  notes?: string
  submitting?: boolean
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

export default function BookingForm({ name, email, phone, notes, submitting, onSubmit }: BookingFormProps) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-[1.75rem] border border-sand bg-ivory/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
      <div className="grid gap-4 md:grid-cols-2">
        <input name="name" defaultValue={name} placeholder="الاسم" className="premium-input" required />
        <input name="phone" defaultValue={phone} placeholder="رقم الهاتف" className="premium-input" required />
      </div>
      <input name="email" type="email" defaultValue={email} placeholder="البريد الإلكتروني" className="premium-input" required />
      <textarea name="notes" defaultValue={notes} placeholder="ملاحظة اختيارية قبل الجلسة" className="premium-input min-h-28" />
      <button type="submit" disabled={submitting} className="rounded-full bg-gold px-6 py-3 text-sm font-black text-deepTeal shadow-soft disabled:opacity-60">
        {submitting ? 'جاري إرسال الطلب…' : 'تأكيد طلب الحجز'}
      </button>
    </form>
  )
}
