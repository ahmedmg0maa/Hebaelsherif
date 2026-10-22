export type StartHereContent = {
  hero: { eyebrow: string; title: string; lead: string }
  paths: { title: string; text: string; href: string; cta: string }[]
  closing: { title: string; lead: string; ctaLabel: string; ctaHref: string }
}

export const defaultStartHereContent: StartHereContent = {
  hero: {
    eyebrow: 'ابدئي من هنا',
    title: 'بداية تناسبكِ، خطوة بخطوة',
    lead: 'لا تحتاجين أن تعرفي كل شيء الآن. أجيبي عن أسئلة بسيطة، أو انتقلي مباشرة إلى الطريقة التي تفضلينها.',
  },
  paths: [
    { title: 'أحب التعلم بخطوات واضحة', text: 'الدورات تجمع الشرح والتطبيق في مسار منظم. قارني المنهج والوقت المطلوب وطريقة تقديم كل دورة قبل الاختيار.', href: '/courses', cta: 'استكشفي الدورات' },
    { title: 'أريد أن أستكشف فكرة أولًا', text: 'ابدئي بقراءة مقال حول ما يشغلكِ، من دون حجز أو شراء. خذي مساحة للفهم قبل اتخاذ قراركِ.', href: '/articles', cta: 'اقرئي المقالات' },
    { title: 'أفضل القراءة على مهل', text: 'تصفحي الكتب، واقرئي وصف كل كتاب ومحتواه وطريقة الوصول إليه لتختاري قراءة تعودين إليها في وقتكِ.', href: '/books', cta: 'تصفحي الكتب' },
    { title: 'أحتاج مساحة فردية لسؤالي', text: 'تعرّفي على الجلسات ومدتها وأسعارها، ثم اختاري موعدًا متاحًا. يمكنكِ الاطلاع على التفاصيل قبل إنشاء حساب.', href: '/booking', cta: 'استكشفي الجلسات' },
  ],
  closing: { title: 'لديكِ سؤال قبل الاختيار؟', lead: 'اسألي عن طريقة تقديم الخدمة أو تفاصيلها قبل اتخاذ قراركِ.', ctaLabel: 'تواصلي معنا', ctaHref: '/contact' },
}

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown, fallback: string, max = 260) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback
const href = (value: unknown, fallback: string) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && value.length <= 180 ? value : fallback

export function normalizeStartHereContent(value: unknown): StartHereContent {
  const source = object(value)
  const hero = object(source.hero)
  const paths = Array.isArray(source.paths) ? source.paths.map(object) : []
  const closing = object(source.closing)

  return {
    hero: {
      eyebrow: text(hero.eyebrow, defaultStartHereContent.hero.eyebrow, 80),
      title: text(hero.title, defaultStartHereContent.hero.title, 120),
      lead: text(hero.lead, defaultStartHereContent.hero.lead, 300),
    },
    paths: defaultStartHereContent.paths.map((fallback, index) => {
      const row = paths[index] ?? {}
      return { title: text(row.title, fallback.title, 140), text: text(row.text, fallback.text, 300), href: href(row.href, fallback.href), cta: text(row.cta, fallback.cta, 70) }
    }),
    closing: {
      title: text(closing.title, defaultStartHereContent.closing.title, 120),
      lead: text(closing.lead, defaultStartHereContent.closing.lead, 260),
      ctaLabel: text(closing.ctaLabel, defaultStartHereContent.closing.ctaLabel, 70),
      ctaHref: href(closing.ctaHref, defaultStartHereContent.closing.ctaHref),
    },
  }
}
