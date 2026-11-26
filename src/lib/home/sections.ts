import { selectedArticleSlugs } from './articles'
import { normalizeHomeMedia, type HomeMediaMap, type ResolvedHomeMedia } from './media'
import { defaultHomeCopy, normalizeHomeCopy, type HomeCopy } from './hero'

export const HOME_SECTION_KINDS = [
  'hero',
  'trust',
  'manifesto',
  'pathways',
  'guided_start',
  'editorial_feature',
  'offer',
  'articles',
  'resources',
  'testimonials',
  'press',
  'newsletter',
  'quote',
  'cta',
] as const

export type HomeSectionKind = (typeof HOME_SECTION_KINDS)[number]

export type TrustContent = { items: { title: string; text: string }[] }
export type NarrativeContent = { eyebrow: string; heading: string; body: string }
export type PathwaysContent = {
  eyebrow: string
  heading: string
  lead: string
  items: { title: string; text: string; href: string; cta: string }[]
}
export type GuidedStartContent = {
  eyebrow: string
  heading: string
  lead: string
  steps: { title: string; text: string; href: string; cta: string }[]
  comparisonEyebrow: string
  comparisonHeading: string
  comparisonLead: string
}
export type EditorialFeatureContent = {
  eyebrow: string
  heading: string
  body: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
}
export type ArticlesContent = { eyebrow: string; heading: string; lead: string; ctaLabel: string; selectedSlugs?: string[] }
export type TestimonialsContent = { eyebrow: string; heading: string }
export type PressContent = { eyebrow: string; heading: string; lead: string; ctaLabel: string }
export type NewsletterContent = { eyebrow: string; heading: string; body: string }
export type CtaContent = {
  eyebrow: string
  heading: string
  body: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
}

export type HomeSectionContent = (
  | { [K in keyof HomeCopy]?: never }
  | HomeCopy
  | NarrativeContent
  | TrustContent
  | PathwaysContent
  | GuidedStartContent
  | EditorialFeatureContent
  | { ctaLabel: string }
  | ArticlesContent
  | TestimonialsContent
  | PressContent
  | NewsletterContent
  | CtaContent
) & { media?: HomeMediaMap }

export type HomeSection = {
  id: string
  name: string
  kind: HomeSectionKind
  sort: number
  isVisible: boolean
  content: HomeSectionContent
  media?: Record<string, ResolvedHomeMedia>
}

export const HOME_SECTION_OPTIONS: { kind: HomeSectionKind; label: string; name: string }[] = [
  { kind: 'hero', label: 'الواجهة الرئيسية', name: 'الرسالة الرئيسية' },
  { kind: 'trust', label: 'شريط الثقة', name: 'لماذا تثق الزائرة بالمنصة' },
  { kind: 'manifesto', label: 'رسالة المنهج', name: 'الفهم ثم الاختيار' },
  { kind: 'pathways', label: 'المسارات الأساسية', name: 'الكتب والدورات والجلسات والورش' },
  { kind: 'guided_start', label: 'رحلة البداية', name: 'من السؤال إلى الخطوة' },
  { kind: 'editorial_feature', label: 'المشهد التحريري', name: 'مساحة البداية المصورة' },
  { kind: 'offer', label: 'العرض المنشور', name: 'العرض الحالي' },
  { kind: 'articles', label: 'المقالات المختارة', name: 'أحدث المقالات' },
  { kind: 'resources', label: 'الموارد الحديثة', name: 'أحدث الموارد' },
  { kind: 'testimonials', label: 'الآراء الموثقة', name: 'تجارب معتمدة' },
  { kind: 'press', label: 'الظهور الإعلامي', name: 'مصادر موثقة' },
  { kind: 'newsletter', label: 'النشرة البريدية', name: 'اشتراك بموافقة صريحة' },
  { kind: 'quote', label: 'وقفة تأمل', name: 'مساحة للفكرة' },
  { kind: 'cta', label: 'الدعوة الختامية', name: 'الخطوة التالية' },
]

export const DEFAULT_HOME_CONTENT: Record<HomeSectionKind, HomeSectionContent> = {
  hero: defaultHomeCopy,
  manifesto: { eyebrow: 'الفهم يسبق الاختيار', heading: 'ليس عليكِ أن تعرفي الطريق كله الآن.', body: 'نبدأ من السؤال الذي يشغلكِ، ونمنحه مساحة للفهم. ثم نختار خطوة عملية تناسب وقتكِ واحتياجكِ، من دون استعجال أو أحكام.' },
  quote: { eyebrow: 'وقفة بين الفهم والخطوة', heading: 'ما الخطوة الصغيرة التي تشبهكِ اليوم؟', body: 'خذي وقتكِ في الإجابة. البداية ليست سباقًا، والاختيار يظل لكِ.' },
  trust: {
    items: [
      { title: 'وعي واختيار', text: 'مساحة لفهم النفس واختيار خطوة تناسبكِ' },
      { title: 'تعلّم وتطبيق', text: 'معرفة وأدوات عملية على إيقاعكِ' },
      { title: 'منهج متكامل', text: 'فهم عميق يتحول إلى أدوات وخطوات قابلة للتطبيق' },
      { title: 'خصوصية واحترام', text: 'حدود واضحة وتجربة عربية تراعي إيقاعك واختيارك' },
    ],
  },
  pathways: {
    eyebrow: 'اختاري الباب الأقرب',
    heading: 'مسارات تتقدّمين فيها بطريقتك',
    lead: 'جلسة تخصّك، ومعرفة ترافقك، ومساحة تتسع لإيقاعك.',
    items: [
      { title: 'الجلسات', text: 'مساحة خاصة لفهم سؤالكِ واختيار خطوتكِ التالية.', href: '/booking', cta: 'استكشفي الجلسات' },
      { title: 'الدورات', text: 'تصفّحي البرامج المتاحة ومحتوى كل مسار وطريقة الوصول إليه.', href: '/courses', cta: 'اكتشفي التفاصيل' },
      { title: 'الكتب', text: 'قراءة على إيقاعكِ، تعودين إليها كلما احتجتِ.', href: '/books', cta: 'تصفّحي الكتب' },
    ],
  },
  guided_start: {
    eyebrow: 'رحلة واضحة',
    heading: 'من السؤال إلى خطوة قابلة للتنفيذ',
    lead: 'لا تحتاجين إلى معرفة الطريق كاملًا؛ يكفي أن تختاري الباب الأقرب الآن.',
    steps: [
      { title: 'حددي ما تحتاجينه', text: 'أسئلة البداية تساعدكِ على مقارنة الطرق الأقرب لسؤالكِ ووقتكِ.', href: '/start-here', cta: 'اختاري البداية' },
      { title: 'اختاري الإيقاع المناسب', text: 'جلسة خاصة، قراءة هادئة، أو مسار تعلم منظم داخل حسابك.', href: '/services', cta: 'قارني المسارات' },
      { title: 'تابعي خطوة بخطوة', text: 'تقدمك وطلباتك وحجوزاتك تبقى مجمعة في مساحة واحدة واضحة.', href: '/dashboard', cta: 'استكشفي لوحتك' },
    ],
    comparisonEyebrow: 'لماذا هذه المنصة؟',
    comparisonHeading: 'تجربة عربية مترابطة، لا محتوى متفرق',
    comparisonLead: 'القيمة ليست في كثرة المواد، بل في وضوح الخطوة وما يمكنك تطبيقه بعدها.',
  },
  editorial_feature: {
    eyebrow: 'تعلّم يرتبط بحياتكِ', heading: 'فكرة تفهمينها، وخطوة تختارينها',
    body: 'الفائدة لا تتوقف عند الشرح. جرّبي نموذجًا قصيرًا: افهمي فكرة، طبّقيها على موقف، ثم راجعي الخطوة التي اخترتِها.',
    primaryLabel: 'استكشفي الدورات', primaryHref: '/courses', secondaryLabel: 'اختاري البداية', secondaryHref: '/start-here',
  },
  offer: { ctaLabel: 'استفيدي من العرض الآن' },
  articles: { eyebrow: 'كتب ومقالات', heading: 'اقرئي ما يفتح لكِ بابًا جديدًا', lead: 'مساحات قصيرة للتأمل والفهم والتطبيق.', ctaLabel: 'جميع المقالات' },
  resources: { eyebrow: 'موارد متعددة الصيغ', heading: 'شاهدي أو استمعي أو اقرئي', lead: 'مواد منشورة مع موضوع ومدة ونصوص مفرغة للإتاحة.', ctaLabel: 'كل الموارد' },
  testimonials: { eyebrow: 'قالوا عن التجربة', heading: 'شهادات متعلّماتنا' },
  press: { eyebrow: 'ظهور موثّق', heading: 'من المصادر الأصلية', lead: 'حوارات ومواد وروابط منشورة مع توضيح نوع المصدر.', ctaLabel: 'كل المصادر' },
  newsletter: { eyebrow: 'رسالة هادئة عند وجود جديد', heading: 'اختاري بنفسك ما يصل إلى بريدك', body: 'ملخصات ومواد جديدة فقط عند إعداد الإرسال، بموافقة مستقلة عن أي شراء أو حجز.' },
  cta: {
    eyebrow: 'خطوة واحدة تكفي للبداية',
    heading: 'مكانك هنا',
    body: 'ابدئي بالمسار الأقرب لكِ اليوم. خطوة واحدة تكفي للبداية.',
    primaryLabel: 'احجزي جلسة فردية', primaryHref: '/booking',
    secondaryLabel: 'استكشفي المسارات', secondaryHref: '/services',
  },
}

const text = (value: unknown, fallback: string, max = 220) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback
const href = (value: unknown, fallback: string) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\s\u0000-\u001f\u007f]/u.test(value) && !/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value) ? value.slice(0, 180) : fallback
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const rows = (value: unknown) => Array.isArray(value) ? value.map(record) : []

export function isHomeSectionKind(value: string): value is HomeSectionKind {
  return HOME_SECTION_KINDS.includes(value as HomeSectionKind)
}

export function defaultHomeContent(kind: HomeSectionKind) {
  return structuredClone(DEFAULT_HOME_CONTENT[kind])
}

export function normalizeHomeContent(kind: HomeSectionKind, value: unknown): HomeSectionContent {
  const content = normalizeHomeContentBase(kind, value)
  const media = normalizeHomeMedia(record(value).media)
  return Object.keys(media).length ? { ...content, media } : content
}
function normalizeHomeContentBase(kind: HomeSectionKind, value: unknown): HomeSectionContent {
  const source = record(value)
  const fallback = defaultHomeContent(kind)
  if (kind === 'hero') return Object.keys(source).length ? normalizeHomeCopy(source) : {}
  if (kind === 'manifesto' || kind === 'quote') {
    const base = fallback as NarrativeContent
    return { eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 160), body: text(source.body, base.body, 500) }
  }
  if (kind === 'trust') {
    if (source.source === 'owner_profile') return { items: [] }
    const base = fallback as TrustContent
    const items = rows(source.items).slice(0, 4).map((item, index) => ({
      title: text(item.title, base.items[index]?.title ?? '', 70),
      text: text(item.text, base.items[index]?.text ?? '', 150),
    }))
    return { items: items.length === 4 ? items : base.items }
  }
  if (kind === 'pathways') {
    const base = fallback as PathwaysContent
    const items = rows(source.items).slice(0, 4).map((item, index) => ({
      title: text(item.title, base.items[index]?.title ?? '', 70),
      text: text(item.text, base.items[index]?.text ?? '', 180),
      href: href(item.href, base.items[index]?.href ?? '/services'),
      cta: text(item.cta, base.items[index]?.cta ?? 'اكتشفي التفاصيل', 60),
    }))
    return { eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120), lead: text(source.lead, base.lead, 240), items: items.length >= 3 ? items : base.items }
  }
  if (kind === 'guided_start') {
    const base = fallback as GuidedStartContent
    const steps = rows(source.steps).slice(0, 3).map((item, index) => ({
      title: text(item.title, base.steps[index]?.title ?? '', 80),
      text: text(item.text, base.steps[index]?.text ?? '', 200),
      href: href(item.href, base.steps[index]?.href ?? '/start-here'),
      cta: text(item.cta, base.steps[index]?.cta ?? 'ابدئي', 60),
    }))
    return {
      eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120), lead: text(source.lead, base.lead, 240),
      steps: steps.length === 3 ? steps : base.steps,
      comparisonEyebrow: text(source.comparisonEyebrow, base.comparisonEyebrow, 80),
      comparisonHeading: text(source.comparisonHeading, base.comparisonHeading, 120),
      comparisonLead: text(source.comparisonLead, base.comparisonLead, 240),
    }
  }
  if (kind === 'editorial_feature') {
    const base = fallback as EditorialFeatureContent
    return {
      eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120), body: text(source.body, base.body, 320),
      primaryLabel: text(source.primaryLabel, base.primaryLabel, 60), primaryHref: href(source.primaryHref, base.primaryHref),
      secondaryLabel: text(source.secondaryLabel, base.secondaryLabel, 60), secondaryHref: href(source.secondaryHref, base.secondaryHref),
    }
  }
  if (kind === 'offer') return { ctaLabel: text(source.ctaLabel, (fallback as { ctaLabel: string }).ctaLabel, 70) }
  if (kind === 'articles' || kind === 'resources') {
    const base = fallback as ArticlesContent
    return { eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120), lead: text(source.lead, base.lead, 240), ctaLabel: text(source.ctaLabel, base.ctaLabel, 70), ...(kind === 'articles' ? { selectedSlugs: selectedArticleSlugs(source.selectedSlugs) } : {}) }
  }
  if (kind === 'testimonials') {
    const base = fallback as TestimonialsContent
    return { eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120) }
  }
  if (kind === 'press') {
    const base = fallback as PressContent
    return { eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120), lead: text(source.lead, base.lead, 240), ctaLabel: text(source.ctaLabel, base.ctaLabel, 70) }
  }
  if (kind === 'newsletter') {
    const base = fallback as NewsletterContent
    return { eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120), body: text(source.body, base.body, 320) }
  }
  const base = fallback as CtaContent
  return {
    eyebrow: text(source.eyebrow, base.eyebrow, 80), heading: text(source.heading, base.heading, 120), body: text(source.body, base.body, 320),
    primaryLabel: text(source.primaryLabel, base.primaryLabel, 60), primaryHref: href(source.primaryHref, base.primaryHref),
    secondaryLabel: text(source.secondaryLabel, base.secondaryLabel, 60), secondaryHref: href(source.secondaryHref, base.secondaryHref),
  }
}

export function defaultHomeSections(): HomeSection[] {
  // Managed rows keep their own visibility/order. Only the empty-source fallback
  // uses the focused Master V2 journey; optional sections remain in the editor.
  const core: HomeSectionKind[] = ['hero', 'trust', 'pathways', 'editorial_feature', 'articles', 'cta']
  return core.map((kind, index) => ({ id: `default-${kind}`, name: HOME_SECTION_OPTIONS.find((item) => item.kind === kind)!.name, kind, sort: index * 10, isVisible: true, content: defaultHomeContent(kind) }))
}

export function normalizeHomeSections(rowsInput: { id: string; name?: string; kind: string; sort: number; is_visible?: boolean; content: unknown }[], fallbackWhenInvalid = true) {
  const normalized = rowsInput
    .filter((row) => isHomeSectionKind(row.kind) && row.is_visible !== false)
    .map((row) => ({ id: row.id, name: row.name ?? row.kind, kind: row.kind as HomeSectionKind, sort: Number(row.sort), isVisible: row.is_visible !== false, content: normalizeHomeContent(row.kind as HomeSectionKind, row.content) }))
    .sort((a, b) => a.sort - b.sort)
  const required = new Set(normalized.map((section) => section.kind))
  return normalized.length && (!fallbackWhenInvalid || (required.has('hero') && required.has('pathways') && required.has('cta'))) ? normalized : defaultHomeSections()
}
