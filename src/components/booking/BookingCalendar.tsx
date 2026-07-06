'use client'

interface BookingCalendarProps {
  value?: string
  min?: string
  max?: string
  onChange?: (date: string) => void
  disabledDates?: string[]
}

export default function BookingCalendar({ value, min, max, onChange, disabledDates = [] }: BookingCalendarProps) {
  const disabled = value ? disabledDates.includes(value) : false
  return (
    <div className="rounded-[1.5rem] border border-sand bg-ivory/80 p-4 shadow-soft dark:border-gold/25 dark:bg-white/10">
      <label className="block text-xs font-black text-petrol dark:text-gold">اختاري تاريخ الجلسة</label>
      <input
        type="date"
        value={value || ''}
        min={min}
        max={max}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-sm font-bold text-charcoal outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 dark:border-gold/30 dark:bg-deepTeal dark:text-ivory"
      />
      {disabled ? <p className="mt-2 text-xs font-bold text-burgundy">هذا اليوم مغلق في جدول التوافر.</p> : null}
    </div>
  )
}
