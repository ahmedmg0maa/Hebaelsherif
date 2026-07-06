import { ProgressBar } from '@/components/admin/OperationsUI'

export default function CourseProgress({ value = 0, label = 'تقدمك في الرحلة' }: { value?: number; label?: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
      <div className="mb-2 flex items-center justify-between text-xs font-black text-petrol dark:text-gold">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <ProgressBar value={value} />
    </div>
  )
}
