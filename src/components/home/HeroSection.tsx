import Image from 'next/image'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-gold/20 bg-cream p-6 shadow-botanical md:p-10 dark:bg-deepTeal">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-gold">Heba ElSherif</p>
          <h1 className="text-4xl font-black leading-tight text-charcoal md:text-6xl dark:text-ivory">رحلة وعي تعيدك إلى ذاتك بهدوء</h1>
          <p className="max-w-2xl text-base font-bold leading-8 text-warm-gray md:text-lg dark:text-cream">مساحة عربية آمنة لفهم العلاقات، الحدود، والأنماط العاطفية بدون ضغط أو وعود علاجية.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/start-here" className="rounded-full bg-gold px-6 py-3 text-sm font-black text-deepTeal shadow-soft">ابدئي من هنا</Link>
            <Link href="/booking" className="rounded-full border border-gold/50 px-6 py-3 text-sm font-black text-petrol dark:text-ivory">حجز جلسة</Link>
          </div>
        </div>
        <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] bg-sand">
          <Image src="/images/heba/heba-hero.jpg" alt="هبة الشريف" fill className="object-cover" priority />
        </div>
      </div>
    </section>
  )
}
