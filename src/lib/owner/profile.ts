export type OwnerCredential = { value: string; label: string; verified: boolean }
export type OwnerProfile = { eyebrow: string; title: string; lead: string; method: string; professionalLine: string; values: { title: string; text: string }[]; credentials: OwnerCredential[] }
export const OWNER_FIELDS = [ ['eyebrow', 'السطر التعريفي', 80], ['title', 'العنوان', 160], ['lead', 'التعريف', 700], ['method', 'المنهج', 500], ['professionalLine', 'التعريف المهني المختصر', 180] ] as const
export const defaultOwnerProfile: OwnerProfile = {
  eyebrow: 'عن هبة', title: 'التغيير الحقيقي يبدأ بالفهم',
  lead: 'أنا هبة الشريف، لايف كوتش ومدرّبة وعي بالذات وكاتبة. أساندكِ في رحلة فهم نفسكِ، واستعادة الوضوح، واختيار خطوة تناسب حياتكِ؛ من خلال جلسات فردية وبرامج تعلّم وأدوات عملية.',
  method: 'نمنح الفكرة مساحة للفهم، ثم نحولها إلى خطوة يمكنكِ تجربتها. على إيقاعكِ، دون ضغط أو حلول جاهزة.', professionalLine: 'هبة الشريف · لايف كوتش ومدرّبة وعي بالذات وكاتبة',
  values: [{ title: 'الوضوح', text: 'نشرح ما نقدمه وحدوده بلغة مباشرة.' }, { title: 'التطبيق', text: 'نحوّل المعرفة إلى خطوات قابلة للتجربة.' }, { title: 'الخصوصية', text: 'نحترم بياناتك ومساحتك الشخصية.' }],
  credentials: [],
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const validText = (value: unknown, max: number, min = 2): value is string => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max && !/[<>\u0000-\u001f\u007f]/u.test(value)
export function normalizeOwnerProfile(value: unknown): OwnerProfile {
  const row = record(value)
  const fields = Object.fromEntries(OWNER_FIELDS.map(([key, , max]) => [key, validText(row[key], max) ? row[key].trim() : defaultOwnerProfile[key]]))
  const values = Array.isArray(row.values) ? row.values.slice(0, 3).map(record).filter(v => validText(v.title, 70) && validText(v.text, 240)).map(v => ({ title: String(v.title), text: String(v.text) })) : []
  const credentials = Array.isArray(row.credentials) ? row.credentials.slice(0, 3).map(record).filter(c => validText(c.value, 40) && validText(c.label, 100)).map(c => ({ value: String(c.value), label: String(c.label), verified: c.verified === true })) : []
  return { ...fields, values: values.length ? values : defaultOwnerProfile.values, credentials } as OwnerProfile
}
export function ownerProfileFromForm(form: FormData): OwnerProfile | null {
  const fields = Object.fromEntries(OWNER_FIELDS.map(([key]) => [key, String(form.get(key) ?? '').trim()]))
  if (OWNER_FIELDS.some(([key, , max]) => !validText(fields[key], max))) return null
  const values = [0, 1, 2].map(i => ({ title: String(form.get(`value_title_${i}`) ?? '').trim(), text: String(form.get(`value_text_${i}`) ?? '').trim() }))
  if (values.some(v => !validText(v.title, 70) || !validText(v.text, 240))) return null
  const credentials = [0, 1, 2].map(i => ({ value: String(form.get(`credential_value_${i}`) ?? '').trim(), label: String(form.get(`credential_label_${i}`) ?? '').trim(), verified: form.get(`credential_verified_${i}`) === 'on' })).filter(c => c.value || c.label || c.verified)
  if (credentials.some(c => !validText(c.value, 40) || !validText(c.label, 100))) return null
  return { ...fields, values, credentials } as OwnerProfile
}
