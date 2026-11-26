import type { Metadata } from 'next'
import { PageHero } from '@/components/catalog/PageHero'
import { CTARibbon } from '@/components/catalog/CTARibbon'
import { getPaymentSettings, type PaymentSettings } from '@/lib/data/checkout'
import { getPublishedCmsPage } from '@/lib/data/cms'

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة',
  description: 'إجابات واضحة عن الأسئلة الأكثر تكرارًا حول الدورات والدفع والوصول.',
}

function getPaymentAnswer(settings: PaymentSettings) {
  const methods = [
    settings.instapay && 'إنستاباي',
    settings.wallet && 'محفظة إلكترونية',
    settings.bank && 'تحويل بنكي',
  ].filter(Boolean)

  return methods.length > 0
    ? `تظهر وسائل الدفع المفعّلة (${methods.join('، ')}) في صفحة إتمام الطلب فقط. لا تُعرض أي بيانات دفع قبل تهيئتها من الإدارة.`
    : 'لا توجد وسيلة دفع مفعّلة حاليًا، لذلك لا يمكن إنشاء طلب جديد من صفحة إتمام الطلب.'
}

function getFaqs(settings: PaymentSettings) {
  return [
  {
    group: 'الدفع والوصول',
    items: [
      {
        q: 'ما وسائل الدفع المتاحة؟',
        a: getPaymentAnswer(settings),
      },
      {
        q: 'متى يصلني المحتوى بعد الدفع؟',
        a: 'بعد اعتماد الدفع للخدمة المستحقة، يظهر الوصول داخل حسابك. تُعرض حالة الطلب في لوحة الحساب، ولا نعد بمدة مراجعة ثابتة قبل تهيئة إجراءات التشغيل.',
      },
      {
        q: 'كيف أعود إلى دوراتي بعد الشراء؟',
        a: 'بعد اعتماد الدفع تظهر الدورة داخل «دوراتي» في حسابك. أي مدة أو شروط خاصة بالوصول تظهر بوضوح في صفحة المنتج.',
      },
    ],
  },
  {
    group: 'الدورات والمحتوى',
    items: [
      {
        q: 'هل تناسبني الدورات لو وقتي ضيق؟',
        a: 'توضح صفحة كل دورة المحتوى والمدة وطريقة التعلّم المنشورة لها. لا تُعرض مدة أو وتيرة موحّدة قبل إضافة بيانات الدورة الفعلية.',
      },
      {
        q: 'كيف أعرف أنني أتممت الدورة؟',
        a: 'تسجّل المنصة تقدمك في كل درس وتعرض نسبة الإتمام داخل حسابك. لا تعرض صفحة الدورة وعدًا بشهادة قبل نشر تفاصيلها.',
      },
      {
        q: 'هل يمكن مشاركة حسابي مع صديقة؟',
        a: 'الحساب شخصي ولا تجوز مشاركته. مشاركة الوصول للمحتوى المدفوع تؤدي لإيقاف الحساب وفق الشروط والأحكام.',
      },
    ],
  },
  {
    group: 'الجلسات والورش',
    items: [
      {
        q: 'كيف تُعقد الجلسات الفردية؟',
        a: 'تظهر طريقة الجلسة وشروطها والمواعيد المتاحة عند نشر الخدمة. لا يظهر رابط اجتماع قبل وجود حجز مستحق ومؤكد.',
      },
      {
        q: 'ماذا لو فاتتني الورشة المباشرة؟',
        a: 'ما يتاح من تسجيلات أو مواد مرافقة يحدده وصف الورشة المنشور واستحقاقك لها؛ لا تُضمن التسجيلات افتراضيًا.',
      },
      {
        q: 'هل يمكنني إعادة جدولة جلستي؟',
        a: 'يتبع طلب إعادة الجدولة سياسة الخدمة المنشورة لحجزك. لا يظهر خيار الطلب إلا عندما تسمح حالة الحجز وقواعد التوافر بذلك.',
      },
    ],
  },
  ]
}

type FaqGroup = ReturnType<typeof getFaqs>[number]
function cmsFaqGroups(page: Awaited<ReturnType<typeof getPublishedCmsPage>>): FaqGroup[] {
  if (!page) return []
  return page.sections.flatMap((section) => {
    if (!section.content || typeof section.content !== 'object' || Array.isArray(section.content)) return []
    const value = section.content as Record<string, unknown>
    const group = typeof value.group === 'string' ? value.group.trim() : typeof value.heading === 'string' ? value.heading.trim() : ''
    const items = Array.isArray(value.items) ? value.items.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const row = item as Record<string, unknown>
      return typeof row.q === 'string' && row.q.trim() && typeof row.a === 'string' && row.a.trim() ? [{ q: row.q.trim(), a: row.a.trim() }] : []
    }) : []
    return group && items.length ? [{ group, items }] : []
  })
}

export default async function FAQPage() {
  const [paymentSettings, cmsPage] = await Promise.all([getPaymentSettings(), getPublishedCmsPage('faq')])
  const managedFaqs = cmsFaqGroups(cmsPage)
  const faqs = managedFaqs.length ? managedFaqs : getFaqs(paymentSettings)
  return (
    <main>
      <PageHero compact
        eyebrow="الأسئلة الشائعة"
        title="كل ما تريدين معرفته"
        lead="جمعنا الأسئلة الأكثر تكرارًا وأجبنا عنها بوضوح — ولو بقي سؤال، راسلينا."
      />

      <div className="mx-auto max-w-3xl space-y-12 px-6 py-16">
        {faqs.map((group) => (
          <section key={group.group}>
            <h2 className="mb-5 flex items-center gap-3 text-2xl font-bold text-deep-teal">
              <span className="h-px w-8 bg-antique-gold" aria-hidden />
              {group.group}
            </h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-line bg-surface-raised shadow-card">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-bold text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-antique-gold transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p className="border-t border-line/60 p-5 leading-loose text-text-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <CTARibbon
        title="لم تجدي إجابتك؟"
        lead="اسألي عن تفاصيل الخدمة أو طريقة الحجز قبل اتخاذ قراركِ."
        ctaLabel="تواصلي معنا"
        ctaHref="/contact"
      />
    </main>
  )
}
