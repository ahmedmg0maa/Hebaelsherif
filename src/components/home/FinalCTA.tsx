import Link from 'next/link'
export default function FinalCTA() {
  return <section className="rounded-[2rem] bg-gold p-6 text-center shadow-botanical"><h2 className="text-2xl font-black text-deepTeal">ابدئي بخطوة واحدة واضحة</h2><p className="mt-2 text-sm font-bold text-deepTeal/80">اختاري الاختبار الهادئ أو احجزي جلسة مباشرة.</p><Link href="/start-here" className="mt-5 inline-flex rounded-full bg-deepTeal px-6 py-3 text-xs font-black text-ivory">ابدئي من هنا</Link></section>
}
