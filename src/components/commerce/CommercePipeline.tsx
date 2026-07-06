import BrandOrnament from '@/components/brand/BrandOrnament'

const steps = [
  { title: 'اختيار', text: 'كتاب، كورس، ورشة، جلسة أو باقة من مصدر موحد.' },
  { title: 'طلب', text: 'إنشاء Order واضح مع السعر والكوبون وطريقة الدفع.' },
  { title: 'مراجعة', text: 'رفع إثبات الدفع ومراجعته داخل الأدمن بسجل تدقيق.' },
  { title: 'وصول', text: 'فتح المحتوى أو تأكيد الحجز بعد الموافقة فقط.' },
]

export default function CommercePipeline() {
  return (
    <section className="rounded-[2.5rem] border border-sand bg-ivory/92 p-6 shadow-soft lg:p-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mini-label mb-2">Commerce OS</p>
          <h2 className="text-3xl font-black text-charcoal">منظومة بيع واحدة لكل التجارب</h2>
        </div>
        <BrandOrnament className="scale-75" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <article key={step.title} className="relative rounded-[1.75rem] border border-sand bg-cream/70 p-5">
            <span className="latin-numerals flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-sm font-black text-gold">{index + 1}</span>
            <h3 className="mt-4 text-xl font-black text-petrol">{step.title}</h3>
            <p className="mt-3 text-sm font-bold leading-7 text-warm-gray">{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
