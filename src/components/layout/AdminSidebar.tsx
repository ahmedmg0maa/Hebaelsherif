import Link from 'next/link'

const nav = [
  ['لوحة التشغيل', '/admin'],
  ['الحجوزات', '/admin/bookings'],
  ['المدفوعات والطلبات', '/admin/orders'],
  ['العملاء', '/admin/users'],
  ['المحتوى', '/admin/content'],
  ['الكتب', '/admin/books'],
  ['الكورسات', '/admin/courses'],
  ['الرسائل', '/admin/messages'],
  ['التقارير', '/admin/analytics'],
  ['الإعدادات', '/admin/settings'],
  ['السجلات', '/admin/logs'],
]

export default function AdminSidebar() {
  return (
    <aside className="rounded-[2rem] border border-gold/20 bg-deepTeal p-4 text-ivory shadow-botanical">
      <p className="px-3 pb-3 text-xs font-black uppercase tracking-[0.22em] text-gold">Admin OS</p>
      <nav className="grid gap-2">
        {nav.map(([label, href]) => <Link key={href} href={href} className="rounded-2xl px-3 py-2 text-sm font-black text-cream transition hover:bg-white/10 hover:text-gold">{label}</Link>)}
      </nav>
    </aside>
  )
}
