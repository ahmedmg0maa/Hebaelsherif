'use client'

interface TimeSlotPickerProps {
  slots: string[]
  value?: string
  onChange?: (slot: string) => void
  disabled?: boolean
}

export default function TimeSlotPicker({ slots, value, onChange, disabled }: TimeSlotPickerProps) {
  if (!slots.length) {
    return <div className="rounded-2xl border border-dashed border-gold/35 bg-cream/60 p-4 text-sm font-bold text-warm-gray">لا توجد مواعيد متاحة لهذا اليوم.</div>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(slot)}
          className={`rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${value === slot ? 'border-gold bg-gold text-deepTeal shadow-soft' : 'border-sand bg-ivory text-charcoal hover:border-gold/60 dark:border-gold/25 dark:bg-white/10 dark:text-ivory'}`}
        >
          {slot}
        </button>
      ))}
    </div>
  )
}
