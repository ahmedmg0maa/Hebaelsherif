export const HERO_FIELDS = [
  ['eyebrow', 'السطر التعريفي', 'eyebrow', 100],
  ['headlineStart', 'بداية العنوان', 'headline_start', 40],
  ['headlineAccent', 'تتمة البداية', 'headline_accent', 40],
  ['headlineMiddle', 'منتصف العنوان', 'headline_middle', 40],
  ['headlinePath', 'كلمة المسار', 'headline_path', 40],
  ['headlineEnd', 'نهاية العنوان', 'headline_end', 40],
  ['headlineAwareness', 'الكلمة العنابية', 'headline_awareness', 40],
  ['lead', 'الوصف الرئيسي', 'lead', 320],
  ['primaryCta', 'زر اكتشاف المسار', 'primary_cta', 40],
  ['secondaryCta', 'زر الحجز المباشر', 'secondary_cta', 40],
  ['imageTitle', 'تعريف الصورة', 'image_title', 80],
  ['imageLead', 'توضيح الصورة', 'image_lead', 160],
] as const
export type HomeCopy = Record<(typeof HERO_FIELDS)[number][0], string>
export const defaultHomeCopy: HomeCopy = {
  eyebrow: 'هبة الشريف · لايف كوتش ومدرّبة وعي بالذات', headlineStart: 'افهمي', headlineAccent: 'نفسكِ…',
  headlineMiddle: 'واختاري', headlinePath: 'حياة', headlineEnd: 'تشبهكِ', headlineAwareness: 'أنتِ',
  lead: 'مساحة هادئة للنساء، نفهم فيها ما يشغلكِ ونختار خطوة قابلة للتطبيق. جلسات فردية، ودورات وكتب ترافق رحلة الوعي على إيقاعكِ.',
  primaryCta: 'استكشفي المسارات', secondaryCta: 'احجزي جلستك', imageTitle: 'معرفة تلامس حياتك', imageLead: 'مساحة للتعلّم والتأمل والخطوة التالية',
}
export function normalizeHomeCopy(value: unknown, fallback = defaultHomeCopy): HomeCopy {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return Object.fromEntries(HERO_FIELDS.map(([key, , , max]) => {
    const candidate = record[key]
    // Migrate the old built-in services label to the now-fixed booking action.
    if (key === 'secondaryCta' && candidate === 'استكشفي المسارات') return [key, defaultHomeCopy.secondaryCta]
    return [key, typeof candidate === 'string' && candidate.trim() && !/[<>\u0000-\u001f\u007f]/u.test(candidate) ? candidate.trim().slice(0, max) : fallback[key]]
  })) as HomeCopy
}

export function heroCopyFromForm(form: FormData): HomeCopy | null {
  const entries = HERO_FIELDS.map(([key, , field, max]) => {
    const value = String(form.get(field) ?? '').trim()
    return [key, value.length >= 2 && value.length <= max && !/[<>\u0000-\u001f\u007f]/u.test(value) ? value : null]
  })
  return entries.some(([, value]) => value === null) ? null : Object.fromEntries(entries) as HomeCopy
}
